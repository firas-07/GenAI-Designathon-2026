import { db } from "./firebase";
import { 
  collection, doc, setDoc, deleteDoc, getDocs, writeBatch, query 
} from "firebase/firestore";

export const SEED_BATCHES = [
  { id: "B26-001", name: "Java Full Stack - B12", trainer: "Arjun Mehta", status: "Running", enrolled: 28, capacity: 30, avgAttendance: 87, avgScore: 74, startDate: "2026-04-01", endDate: "2026-06-30" },
  { id: "B26-002", name: "React & Node - B7", trainer: "Sneha Rao", status: "Running", enrolled: 24, capacity: 25, avgAttendance: 92, avgScore: 81, startDate: "2026-04-15", endDate: "2026-07-15" },
  { id: "B26-003", name: "Python ML - B4", trainer: "Vikram Nair", status: "Running", enrolled: 18, capacity: 20, avgAttendance: 61, avgScore: 55, startDate: "2026-03-01", endDate: "2026-05-31" }
];

export const SEED_CANDIDATES = [
  { name: "Aarav Patel", email: "aarav@example.com", batch: "Java Full Stack - B12", attendance: 95, avgScore: 82, codingScore: 85, apiScore: 78, projectScore: 83 },
  { name: "Diya Sharma", email: "diya@example.com", batch: "Java Full Stack - B12", attendance: 55, avgScore: 45, codingScore: 40, apiScore: 42, projectScore: 53 },
  { name: "Nisha Gupta", email: "react-node-b7", batch: "React & Node - B7", attendance: 96, avgScore: 89, codingScore: 92, apiScore: 85, projectScore: 90 },
  { name: "Priya Das", email: "priya.d@example.com", batch: "Python ML - B4", attendance: 50, avgScore: 42, codingScore: 35, apiScore: 45, projectScore: 46 },
  { name: "Rohan Varma", email: "rohan@example.com", batch: "React & Node - B7", attendance: 88, avgScore: 72, codingScore: 70, apiScore: 75, projectScore: 71 }
];

export async function seedSystem() {
  const batch = writeBatch(db);

  // 1. Seed Governance Settings
  const settingsRef = doc(db, "settings", "governance");
  batch.set(settingsRef, {
    attendanceCutoff: "10:00",
    performanceThreshold: 70,
    lastUpdated: new Date().toISOString(),
    updatedBy: "System Initializer"
  });

  // 2. Seed Batches
  for (const b of SEED_BATCHES) {
    const bRef = doc(collection(db, "batches"));
    batch.set(bRef, { ...b, createdAt: new Date().toISOString() });
  }

  // 3. Seed Candidates
  for (const c of SEED_CANDIDATES) {
    const cRef = doc(collection(db, "candidates"));
    batch.set(cRef, { ...c, status: "Active", riskLevel: c.attendance < 60 ? "High" : "Low", createdAt: new Date().toISOString() });
  }

  // 4. Seed Historical Attendance Logs (Last 7 days)
  const today = new Date();
  for (let i = 7; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const attnRef = doc(collection(db, "attendance_logs"));
    batch.set(attnRef, {
      batch: "Java Full Stack - B12",
      date: dateStr,
      presentCount: 25 + Math.floor(Math.random() * 3),
      absentCount: 2 + Math.floor(Math.random() * 2),
      status: "On-Time",
      uploadedBy: "Arjun Mehta",
      createdAt: date.toISOString()
    });
  }

  // 5. Seed Historical Assessment Logs
  const assessmentRef = doc(collection(db, "assessment_logs"));
  batch.set(assessmentRef, {
    batch: "Java Full Stack - B12",
    type: "Coding Assessment",
    module: "Week 4 - Core Java",
    uploadedBy: "Arjun Mehta",
    createdAt: new Date(today.getTime() - 86400000 * 3).toISOString()
  });

  await batch.commit();

  // Log the activity
  await logActivity({
    action: "System Seeded",
    user: "System Admin",
    details: "Full production-ready data environment initialized with historical logs.",
    category: "Data"
  });
}

export async function resetSystem() {
  const collections = ["batches", "candidates", "attendance_logs", "assessment_logs", "system_alerts"];
  
  for (const collName of collections) {
    const q = query(collection(db, collName));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function logActivity(activity: {
  action: string;
  user: string;
  details: string;
  category: 'Security' | 'Governance' | 'Data' | 'User';
}) {
  const logRef = doc(collection(db, "audit_logs"));
  await setDoc(logRef, {
    ...activity,
    timestamp: new Date().toISOString()
  });
}

export async function triggerSystemAlert(alert: {
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  type?: 'attendance' | 'risk' | 'assessment' | 'feedback' | 'system';
  link?: string;
}) {
  try {
    const alertRef = doc(collection(db, "system_alerts"));
    await setDoc(alertRef, {
      ...alert,
      status: "Active",
      timestamp: new Date().toISOString()
    });

    // Also log this as a governance activity
    await logActivity({
      action: "System Alert Triggered",
      user: "System Engine",
      details: `${alert.title}: ${alert.description}`,
      category: "Governance"
    });
  } catch (error) {
    console.error("Error triggering system alert:", error);
  }
}

