export type BatchStatus = "Planned" | "Running" | "Completed" | "Closed";
export type CandidateStatus = "Active" | "Discontinued" | "Not Cleared" | "Offered";
export type UserRole = "Admin" | "Training Coordinator" | "Trainer";

export interface Batch {
  id: string;
  name: string;
  status: BatchStatus;
  trainer: string;
  coordinator: string;
  startDate: string;
  endDate: string;
  capacity: number;
  enrolled: number;
  avgAttendance: number;
  avgScore: number;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  batchId: string;
  batchName: string;
  status: CandidateStatus;
  attendance: number;
  avgScore: number;
  riskLevel: "Low" | "Medium" | "High";
}

export interface AttendanceRecord {
  date: string;
  present: number;
  absent: number;
  percentage: number;
}

export interface AssessmentScore {
  candidateId: string;
  candidateName: string;
  coding: number;
  api: number;
  project: number;
  total: number;
}

export interface Alert {
  id: string;
  type: "attendance" | "risk" | "assessment" | "feedback";
  severity: "low" | "medium" | "high";
  message: string;
  timestamp: string;
  batchId?: string;
}

export const currentUser = {
  name: "Priya Sharma",
  role: "Training Coordinator" as UserRole,
  avatar: "PS",
};

export const batches: Batch[] = [
  { id: "B001", name: "Java Full Stack - Batch 12", status: "Running", trainer: "Arjun Mehta", coordinator: "Priya Sharma", startDate: "2026-04-01", endDate: "2026-06-30", capacity: 30, enrolled: 28, avgAttendance: 87, avgScore: 74 },
  { id: "B002", name: "React & Node - Batch 7", status: "Running", trainer: "Sneha Rao", coordinator: "Priya Sharma", startDate: "2026-04-15", endDate: "2026-07-15", capacity: 25, enrolled: 24, avgAttendance: 92, avgScore: 81 },
  { id: "B003", name: "Python ML - Batch 4", status: "Running", trainer: "Vikram Nair", coordinator: "Deepak Joshi", startDate: "2026-03-01", endDate: "2026-05-31", capacity: 20, enrolled: 18, avgAttendance: 61, avgScore: 55 },
  { id: "B004", name: "DevOps Fundamentals - Batch 3", status: "Planned", trainer: "Kavya Reddy", coordinator: "Priya Sharma", startDate: "2026-06-01", endDate: "2026-08-01", capacity: 20, enrolled: 12, avgAttendance: 0, avgScore: 0 },
  { id: "B005", name: "Data Engineering - Batch 2", status: "Completed", trainer: "Rohan Das", coordinator: "Deepak Joshi", startDate: "2026-01-01", endDate: "2026-03-31", capacity: 22, enrolled: 22, avgAttendance: 90, avgScore: 78 },
  { id: "B006", name: "Cloud Architecture - Batch 1", status: "Closed", trainer: "Meena Iyer", coordinator: "Priya Sharma", startDate: "2025-10-01", endDate: "2025-12-31", capacity: 15, enrolled: 15, avgAttendance: 94, avgScore: 88 },
];

export const candidates: Candidate[] = [
  { id: "C001", name: "Aarav Patel", email: "aarav@example.com", batchId: "B001", batchName: "Java Full Stack - Batch 12", status: "Active", attendance: 95, avgScore: 82, riskLevel: "Low" },
  { id: "C002", name: "Diya Sharma", email: "diya@example.com", batchId: "B001", batchName: "Java Full Stack - Batch 12", status: "Active", attendance: 55, avgScore: 45, riskLevel: "High" },
  { id: "C003", name: "Karan Singh", email: "karan@example.com", batchId: "B001", batchName: "Java Full Stack - Batch 12", status: "Active", attendance: 78, avgScore: 70, riskLevel: "Medium" },
  { id: "C004", name: "Nisha Gupta", email: "nisha@example.com", batchId: "B002", batchName: "React & Node - Batch 7", status: "Active", attendance: 96, avgScore: 89, riskLevel: "Low" },
  { id: "C005", name: "Rohit Kumar", email: "rohit@example.com", batchId: "B002", batchName: "React & Node - Batch 7", status: "Offered", attendance: 100, avgScore: 94, riskLevel: "Low" },
  { id: "C006", name: "Priya Das", email: "priya.d@example.com", batchId: "B003", batchName: "Python ML - Batch 4", status: "Active", attendance: 50, avgScore: 42, riskLevel: "High" },
  { id: "C007", name: "Suresh Nair", email: "suresh@example.com", batchId: "B003", batchName: "Python ML - Batch 4", status: "Discontinued", attendance: 30, avgScore: 28, riskLevel: "High" },
  { id: "C008", name: "Anita Joshi", email: "anita@example.com", batchId: "B001", batchName: "Java Full Stack - Batch 12", status: "Active", attendance: 88, avgScore: 76, riskLevel: "Low" },
  { id: "C009", name: "Vikram Reddy", email: "vikram.r@example.com", batchId: "B002", batchName: "React & Node - Batch 7", status: "Active", attendance: 85, avgScore: 77, riskLevel: "Low" },
  { id: "C010", name: "Meena Pillai", email: "meena@example.com", batchId: "B003", batchName: "Python ML - Batch 4", status: "Not Cleared", attendance: 65, avgScore: 38, riskLevel: "High" },
];

export const attendanceTrend: AttendanceRecord[] = [
  { date: "Apr 28", present: 24, absent: 4, percentage: 86 },
  { date: "Apr 29", present: 26, absent: 2, percentage: 93 },
  { date: "Apr 30", present: 22, absent: 6, percentage: 79 },
  { date: "May 01", present: 25, absent: 3, percentage: 89 },
  { date: "May 02", present: 27, absent: 1, percentage: 96 },
  { date: "May 05", present: 23, absent: 5, percentage: 82 },
  { date: "May 06", present: 24, absent: 4, percentage: 86 },
  { date: "May 07", present: 26, absent: 2, percentage: 93 },
];

export const assessmentScores: AssessmentScore[] = [
  { candidateId: "C001", candidateName: "Aarav Patel", coding: 85, api: 80, project: 82, total: 82 },
  { candidateId: "C002", candidateName: "Diya Sharma", coding: 40, api: 48, project: 47, total: 45 },
  { candidateId: "C003", candidateName: "Karan Singh", coding: 72, api: 68, project: 70, total: 70 },
  { candidateId: "C004", candidateName: "Nisha Gupta", coding: 90, api: 88, project: 89, total: 89 },
  { candidateId: "C005", candidateName: "Rohit Kumar", coding: 95, api: 93, project: 94, total: 94 },
  { candidateId: "C006", candidateName: "Priya Das", coding: 38, api: 44, project: 44, total: 42 },
];

export const alerts: Alert[] = [
  { id: "A001", type: "attendance", severity: "high", message: "Python ML - Batch 4 attendance dropped below 65%. Immediate action required.", timestamp: "2026-05-08T09:15:00", batchId: "B003" },
  { id: "A002", type: "risk", severity: "high", message: "3 candidates in Batch B001 missed attendance for 3 consecutive days.", timestamp: "2026-05-08T08:30:00", batchId: "B001" },
  { id: "A003", type: "assessment", severity: "medium", message: "Assessment scores not uploaded for Python ML - Batch 4 (Week 6).", timestamp: "2026-05-07T17:00:00", batchId: "B003" },
  { id: "A004", type: "feedback", severity: "low", message: "Feedback collection pending for React & Node - Batch 7 (Module 3 completion).", timestamp: "2026-05-07T14:00:00", batchId: "B002" },
  { id: "A005", type: "attendance", severity: "medium", message: "Attendance cutoff (10 AM) missed for Java Full Stack - Batch 12 on May 6.", timestamp: "2026-05-06T10:05:00", batchId: "B001" },
];

export const batchPerformanceData = [
  { name: "Java B12", attendance: 87, score: 74 },
  { name: "React B7", attendance: 92, score: 81 },
  { name: "Python B4", attendance: 61, score: 55 },
  { name: "Data Eng B2", attendance: 90, score: 78 },
  { name: "Cloud B1", attendance: 94, score: 88 },
];

export const weeklyProgressData = [
  { week: "W1", java: 65, react: 70, python: 60 },
  { week: "W2", java: 68, react: 74, python: 55 },
  { week: "W3", java: 72, react: 78, python: 52 },
  { week: "W4", java: 74, react: 81, python: 55 },
  { week: "W5", java: 74, react: 81, python: 55 },
];
