import { AzureOpenAI } from "openai";
import { NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, addDoc, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Use a dedicated server-side DB instance to avoid gRPC issues
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
const apiKey = process.env.AZURE_OPENAI_API_KEY || "";
const deployment = process.env.AZURE_OPENAI_MODEL_NAME || "";
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";

const client = new AzureOpenAI({
  endpoint,
  apiKey,
  deployment,
  apiVersion,
});

// Tool Definitions
const tools = [
  {
    type: "function",
    function: {
      name: "get_system_stats",
      description: "Get high-level system metrics like total candidates, batches, and active high-risk alerts.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_batch_performance",
      description: "Analyze the performance and attendance of a specific batch.",
      parameters: {
        type: "object",
        properties: {
          batchName: { type: "string", description: "The name of the batch (e.g., 'GenAI-01')" }
        },
        required: ["batchName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "trigger_governance_alert",
      description: "Create a new governance alert in the system.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Alert title" },
          severity: { type: "string", enum: ["Low", "Medium", "High", "Critical"] },
          description: { type: "string", description: "Detailed description of the issue" }
        },
        required: ["title", "severity", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "explain_ui_feature",
      description: "Explain what a specific tab or page does in the Maverick platform.",
      parameters: {
        type: "object",
        properties: {
          pagePath: { type: "string", description: "The path of the page (e.g., '/attendance')" }
        },
        required: ["pagePath"]
      }
    }
  }
];

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Helper to fetch Firestore via REST (bypasses gRPC issues)
async function fetchDocs(collection: string) {
  try {
    const res = await fetch(`${BASE_URL}/${collection}?pageSize=100`, { cache: 'no-store' });
    const data = await res.json();
    return data.documents ? data.documents.map((doc: any) => {
      const fields = doc.fields;
      const obj: any = {};
      for (const key in fields) {
        // Simple Firestore REST value mapper
        const val = fields[key];
        obj[key] = val.stringValue || val.integerValue || val.doubleValue || val.booleanValue || null;
      }
      return obj;
    }) : [];
  } catch (e) {
    console.error(`REST Fetch Error for ${collection}:`, e);
    return [];
  }
}

// Tool Implementations
const toolHandlers: Record<string, Function> = {
  get_system_stats: async () => {
    console.log("AI Tool: Fetching stats via REST...");
    const cands = await fetchDocs("candidates");
    const batches = await fetchDocs("batches");
    
    const highRisk = cands.filter((c: any) => c.risk === "HIGH" || c.status === "AT RISK");
    console.log(`AI REST Results: ${cands.length} candidates, ${highRisk.length} high risk.`);

    return {
      totalCandidates: cands.length,
      totalBatches: batches.length,
      highRiskCount: highRisk.length,
      highRiskNames: highRisk.map((c: any) => c.name).join(", ")
    };
  },
  get_batch_performance: async ({ batchName }: { batchName: string }) => {
    const cands = await fetchDocs("candidates");
    const data = cands.filter((c: any) => c.batch === batchName);
    
    if (data.length === 0) return { error: "Batch not found or empty." };
    
    const avgAttendance = data.reduce((s: number, c: any) => s + (parseInt(c.attendance) || 0), 0) / data.length;
    return {
      batchName,
      studentCount: data.length,
      averageAttendance: Math.round(avgAttendance),
      status: avgAttendance < 75 ? "At Risk" : "On Track"
    };
  },
  trigger_governance_alert: async (params: any) => {
    console.log("AI Tool: Triggering alert via REST...");

    // Check if alerts are enabled in settings
    try {
      const settingsRes = await fetch(`${BASE_URL}/settings/governance`);
      const settingsData = await settingsRes.json();
      const riskAlertsEnabled = settingsData.fields?.riskAlerts?.booleanValue ?? true;

      if (!riskAlertsEnabled) {
        return { success: false, message: "Governance alerts are currently disabled in System Settings." };
      }
    } catch (e) {
      console.warn("Could not fetch settings, defaulting to enabled alerts.");
    }

    const alertData = {
      fields: {
        title: { stringValue: params.title },
        severity: { stringValue: params.severity.toLowerCase() },
        message: { stringValue: params.description },
        type: { stringValue: "risk" },
        status: { stringValue: "Active" },
        timestamp: { timestampValue: new Date().toISOString() }
      }
    };

    try {
        const alertRes = await fetch(`${BASE_URL}/system_alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertData)
        });
        
        // 2. Log Email Simulation to Audit (BRD 5.4)
        const emailLogData = {
          fields: {
            action: { stringValue: "Automated Notification" },
            category: { stringValue: "Communication" },
            details: { stringValue: `[EMAIL SENT] Alert dispatched regarding ${params.title}. Status: Delivered.` },
            user: { stringValue: "Maverick AI Sentry" },
            timestamp: { timestampValue: new Date().toISOString() }
          }
        };
        await fetch(`${BASE_URL}/audit_logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailLogData)
        });

        if (alertRes.ok) {
          return { success: true, message: `Alert '${params.title}' triggered. Email simulation logged in Audit Ledger.` };
        } else {
          return { error: "Failed to trigger alert." };
        }
    } catch (e) {
      console.error("Alert REST Network Error:", e);
      return { error: "Network error while triggering alert." };
    }
  },
  explain_ui_feature: async ({ pagePath }: { pagePath: string }) => {
    const guides: Record<string, string> = {
      "/": "The Home Dashboard. Shows high-level statistics, real-time risk alerts, and batch performance overviews.",
      "/attendance": "Attendance Management. Allows trainers to upload attendance logs (CSV/Excel) and track daily presence. Enforces a 10:00 AM cutoff for data integrity.",
      "/feedback": "Feedback Analysis. Displays student feedback for trainers and scoring trends. Helps identify underperforming modules.",
      "/analytics": "Advanced Analytics. Provides deep-dives into candidate risk profiles, dropout predictions, and long-term performance trends.",
      "/audit": "Governance Audit Trail. A log of all data ingestions and system changes for compliance monitoring.",
      "/ai-assistant": "Full-screen AI Assistant. A dedicated space for deep data analysis and platform automation.",
      "/assessments": "Assessments Dashboard. Track candidate progress through technical evaluations, review scores, and identify students who are falling behind in their coding modules.",
      "/candidates": "Candidate Directory. The central database for all enrolled talent. View individual profiles, contact info, and their holistic risk-score calculated by Maverick AI.",
      "/batches": "Batch Management. Create and organize cohorts, assign trainers, and set start/end dates for training cycles.",
      "/alerts": "System Alerts & Notifications. View all high-risk triggers, late submissions, and critical absenteeism flags generated by the governance engine.",
      "/reports": "Reporting Engine. Generate and download detailed CSV or PDF reports for attendance, performance, and operational compliance.",
      "/settings": "System Configuration. Manage governance thresholds (like the 10 AM cutoff), API integrations, and platform-wide rules.",
      "/users": "User Management. Admin tool to manage access for Trainers, Coordinators, and other staff members.",
      "/files": "File Repository. A central place to manage and review all uploaded documents, CSVs, and training materials."
    };
    return { description: guides[pagePath] || "I don't have a specific guide for this page yet, but it's part of the Maverick ecosystem." };
  }
};

export async function POST(req: Request) {
  try {
    const { messages, userRole, currentPath } = await req.json();

    const systemPrompt = `You are the Maverick AI Co-Pilot, a specialist assistant for the Maverick Execution Platform.
Your goal is to guide users through the platform and perform database actions autonomously.

Current Context:
- User Role: ${userRole}
- Current Page: ${currentPath}

Capabilities:
1. Explain any part of the UI (use explain_ui_feature).
2. Fetch live stats (use get_system_stats).
3. Analyze batch data (use get_batch_performance).
4. Trigger alerts (use trigger_governance_alert).

Guidelines:
- Be professional, sharp, and helpful.
- If a user doesn't know what to do, offer a guide.
- Always use tools when data or actions are requested.
- Format responses using Markdown.
- If you trigger an alert, confirm it to the user.`;

    const response = await client.chat.completions.create({
      model: deployment,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools: tools as any,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      const toolMessages = [...messages, responseMessage];
      
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`Executing tool: ${functionName}`, functionArgs);
        const functionResponse = await toolHandlers[functionName](functionArgs);
        
        toolMessages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(functionResponse),
        });
      }

      const secondResponse = await client.chat.completions.create({
        model: deployment,
        messages: [{ role: "system", content: systemPrompt }, ...toolMessages],
      });

      return NextResponse.json(secondResponse.choices[0].message);
    }

    return NextResponse.json(responseMessage);
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
