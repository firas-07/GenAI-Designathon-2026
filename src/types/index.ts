export type BatchStatus = "Planned" | "Running" | "Completed" | "Closed";
export type CandidateStatus = "Active" | "Discontinued" | "Not Cleared" | "Offered";
export type UserRole = "Admin" | "Training Coordinator" | "Trainer";

export interface Batch {
  id: string;
  batchId?: string;
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
  createdAt?: string;
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
