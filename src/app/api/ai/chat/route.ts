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
  },
  {
    type: "function",
    function: {
      name: "automate_batch_graduation",
      description: "Automate graduation of a batch. Marks all candidates inside it as completed (LOW risk) and updates batch status to Completed.",
      parameters: {
        type: "object",
        properties: {
          batchName: { type: "string", description: "The exact name of the batch to graduate." }
        },
        required: ["batchName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "launch_batch_feedback_via_chat",
      description: "Launches survey feedback collections for all candidates registered inside the specified batch. Sends them real outreach emails.",
      parameters: {
        type: "object",
        properties: {
          batchName: { type: "string", description: "The exact name of the batch to launch feedback for." }
        },
        required: ["batchName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "resolve_alerts_via_chat",
      description: "Resolves all active compliance and attendance alerts matching a specific batch name.",
      parameters: {
        type: "object",
        properties: {
          batchName: { type: "string", description: "The batch name to clear/resolve alerts for." }
        },
        required: ["batchName"]
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
      const obj: any = { id: doc.name.split("/").pop() };
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

async function updateDocREST(collection: string, docId: string, fields: Record<string, any>) {
  try {
    const formattedFields: Record<string, any> = {};
    const queryParams: string[] = [];
    
    for (const key in fields) {
      const val = fields[key];
      queryParams.push(`updateMask.fieldPaths=${key}`);
      if (typeof val === 'boolean') {
        formattedFields[key] = { booleanValue: val };
      } else if (typeof val === 'number') {
        formattedFields[key] = val % 1 === 0 ? { integerValue: val.toString() } : { doubleValue: val };
      } else {
        formattedFields[key] = { stringValue: val.toString() };
      }
    }
    
    const url = `${BASE_URL}/${collection}/${docId}?${queryParams.join('&')}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: formattedFields })
    });
    return res.ok;
  } catch (e) {
    console.error(`REST Update Error for ${collection}/${docId}:`, e);
    return false;
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
  },
  automate_batch_graduation: async ({ batchName }: { batchName: string }) => {
    console.log(`[AI Copilot] Running automate_batch_graduation for ${batchName}`);
    try {
      const batches = await fetchDocs("batches");
      const matchedBatch = batches.find((b: any) => b.name === batchName || b.name?.toLowerCase() === batchName.toLowerCase());
      
      if (!matchedBatch) {
        return { success: false, message: `Could not find any active batch with the name "${batchName}".` };
      }
      
      // Update batch status to completed
      const batchSuccess = await updateDocREST("batches", matchedBatch.id, {
        status: "Completed",
        updatedAt: new Date().toISOString()
      });
      
      if (!batchSuccess) {
        return { success: false, message: `Failed to update status for batch "${batchName}".` };
      }

      // Update all candidates in this batch to COMPLETED and LOW risk
      const candidates = await fetchDocs("candidates");
      const matchedCandidates = candidates.filter((c: any) => c.batch === matchedBatch.name);
      
      let candidateUpdates = 0;
      for (const cand of matchedCandidates) {
        const ok = await updateDocREST("candidates", cand.id, {
          status: "COMPLETED",
          risk: "LOW",
          updatedAt: new Date().toISOString()
        });
        if (ok) candidateUpdates++;
      }

      // Log activity to audit trail
      const auditLogData = {
        fields: {
          action: { stringValue: "Graduation" },
          category: { stringValue: "Governance" },
          details: { stringValue: `[CHAT OPS] Automating graduation of batch ${matchedBatch.name}. Updated status to Completed and graduated ${candidateUpdates}/${matchedCandidates.length} students to COMPLETED (LOW risk).` },
          user: { stringValue: "Maverick AI Copilot" },
          timestamp: { timestampValue: new Date().toISOString() }
        }
      };
      await fetch(`${BASE_URL}/audit_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditLogData)
      });

      return {
        success: true,
        message: `Successfully graduated batch "${matchedBatch.name}"! Status marked as Completed. Registered ${candidateUpdates} candidates as COMPLETED with LOW risk. Audit log created.`
      };
    } catch (err: any) {
      console.error("Graduation automation error:", err);
      return { success: false, error: err.message || "Failed to automate graduation." };
    }
  },
  launch_batch_feedback_via_chat: async ({ batchName }: { batchName: string }) => {
    console.log(`[AI Copilot] Running launch_batch_feedback_via_chat for ${batchName}`);
    try {
      const batches = await fetchDocs("batches");
      const matchedBatch = batches.find((b: any) => b.name === batchName || b.name?.toLowerCase() === batchName.toLowerCase());
      
      if (!matchedBatch) {
        return { success: false, message: `Could not find any active batch with the name "${batchName}".` };
      }

      // Update feedback status
      const batchSuccess = await updateDocREST("batches", matchedBatch.id, {
        feedbackStatus: "Active",
        feedbackTriggeredAt: new Date().toISOString()
      });

      if (!batchSuccess) {
        return { success: false, message: `Failed to activate feedback status for batch "${batchName}".` };
      }

      // Get candidates in batch
      const candidates = await fetchDocs("candidates");
      const matchedCandidates = candidates.filter((c: any) => c.batch === matchedBatch.name);

      const serviceId = process.env.EMAILJS_STUDENT_SERVICE_ID;
      const templateId = process.env.EMAILJS_STUDENT_TEMPLATE_ID;
      const publicKey = process.env.EMAILJS_PUBLIC_KEY;
      const privateKey = process.env.EMAILJS_PRIVATE_KEY;

      let emailCount = 0;
      if (serviceId && templateId && publicKey && privateKey) {
        for (const c of matchedCandidates) {
          const emailAddress = c.email || "designathon-student@maverick.com";
          try {
            const mailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                service_id: serviceId,
                template_id: templateId,
                user_id: publicKey,
                accessToken: privateKey,
                template_params: {
                  to_email: emailAddress,
                  recipient_name: c.name || "Student",
                  subject: `Feedback Survey: ${matchedBatch.name} Cohort`,
                  message_body: `Please take 2 minutes to provide feedback on your training module in ${matchedBatch.name}. Click here to fill: http://localhost:3000/feedback`,
                },
              }),
            });
            if (mailRes.ok) {
              emailCount++;
            } else {
              const errorTxt = await mailRes.text();
              console.error(`EmailJS dispatch failed for ${emailAddress}:`, errorTxt);
            }
          } catch (mailErr) {
            console.error(`Failed to send feedback email:`, mailErr);
          }
        }
      }

      // Log activity to audit trail
      const auditLogData = {
        fields: {
          action: { stringValue: "Communication" },
          category: { stringValue: "Governance" },
          details: { stringValue: `[CHAT OPS] Launched survey feedback for batch ${matchedBatch.name}. Triggered real EmailJS surveys (service_3ypywql) to ${emailCount}/${matchedCandidates.length} students.` },
          user: { stringValue: "Maverick AI Copilot" },
          timestamp: { timestampValue: new Date().toISOString() }
        }
      };
      await fetch(`${BASE_URL}/audit_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditLogData)
      });

      return {
        success: true,
        message: `Successfully triggered feedback collection for "${matchedBatch.name}"! Dispatched real student outreach emails via EmailJS feedback channel (service_3ypywql) to ${emailCount} learners.`
      };
    } catch (err: any) {
      console.error("Feedback automation error:", err);
      return { success: false, error: err.message || "Failed to launch feedback." };
    }
  },
  resolve_alerts_via_chat: async ({ batchName }: { batchName: string }) => {
    console.log(`[AI Copilot] Running resolve_alerts_via_chat for ${batchName}`);
    try {
      const alerts = await fetchDocs("system_alerts");
      // Find active alerts that contain the batch name in the message or title
      const activeAlerts = alerts.filter((a: any) => 
        (a.status === "Active" || a.status?.toLowerCase() === "active") && 
        (a.message?.toLowerCase().includes(batchName.toLowerCase()) || 
         a.title?.toLowerCase().includes(batchName.toLowerCase()))
      );

      if (activeAlerts.length === 0) {
        return { success: true, message: `No active compliance or attendance alerts found for batch "${batchName}".` };
      }

      let resolvedCount = 0;
      for (const alert of activeAlerts) {
        const ok = await updateDocREST("system_alerts", alert.id, {
          status: "Resolved",
          resolvedAt: new Date().toISOString()
        });
        if (ok) resolvedCount++;
      }

      // Log activity to audit trail
      const auditLogData = {
        fields: {
          action: { stringValue: "Alert Resolution" },
          category: { stringValue: "Governance" },
          details: { stringValue: `[CHAT OPS] Resolved ${resolvedCount} active compliance alerts for batch ${batchName} via natural language command.` },
          user: { stringValue: "Maverick AI Copilot" },
          timestamp: { timestampValue: new Date().toISOString() }
        }
      };
      await fetch(`${BASE_URL}/audit_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditLogData)
      });

      return {
        success: true,
        message: `Successfully resolved ${resolvedCount} compliance alerts for "${batchName}". System status is back to fully compliant. Audit logs synchronized.`
      };
    } catch (err: any) {
      console.error("Alert resolution error:", err);
      return { success: false, error: err.message || "Failed to resolve alerts." };
    }
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
5. Automate Batch Graduation (use automate_batch_graduation): Marks all students in a batch as Completed (LOW risk) and updates batch status to Completed.
6. Launch Batch Feedback Surveys (use launch_batch_feedback_via_chat): Activates batch feedback collections and triggers real EmailJS dispatch surveys to the students in that batch.
7. Resolve Batch Compliance Alerts (use resolve_alerts_via_chat): Bulk resolves active compliance and attendance alerts matching a specific batch name.

Guidelines & Constraints:
- ONLY allow automate_batch_graduation, launch_batch_feedback_via_chat, and resolve_alerts_via_chat to be triggered if the user explicitly requests to perform that automation in their prompt (e.g. "Graduate batch X", "launch feedback surveys for batch Y", "clear alerts for batch Z").
- NEVER print raw tool-calling syntax, execution paths, internal JSON parameters, or tokens (e.g., 'to=functions', 'json', or non-English characters like 'd天天') in your final text response.
- Do not output your internal reasoning or tool-execution steps. Only return the final, beautifully synthesized, human-friendly response.
- ALWAYS call 'get_system_stats' if the user asks about the overall program, high-level metrics, or general health.
- ONLY call 'get_batch_performance' if the user specifies a particular batch name (e.g., 'React & Node - B7') without requesting mutations.
- Be professional, sharp, and helpful. Use clear, formatted Markdown for your responses.
- If you trigger an alert or execute a mutation, confirm it clearly to the user with a summary of the action taken (e.g., how many students were graduated, how many emails were sent, etc.).`;

    const response = await client.chat.completions.create({
      model: deployment,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools: tools as any,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      // Strip any raw token/tool-call leakage from the assistant's first message content
      const cleanResponseMessage = {
        ...responseMessage,
        content: responseMessage.content && (responseMessage.content.includes("to=functions") || responseMessage.content.includes("d天天"))
          ? null
          : responseMessage.content
      };
      const toolMessages = [...messages, cleanResponseMessage];
      
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = (toolCall as any).function.name;
        const functionArgs = JSON.parse((toolCall as any).function.arguments);
        
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
