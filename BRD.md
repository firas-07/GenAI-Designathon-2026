# Business Requirements Document (BRD)
## Application Name: Maverick Execution Platform
### Training Management System (TMS)
**Version:** 1.0

---

## 1. Purpose
The purpose of this document is to define the business, functional, and non-functional requirements for the Maverick Execution Platform – Training Management System (TMS). The system serves as a centralized execution and governance platform for managing the complete training lifecycle.

## 2. Business Objectives
*   Centralize training batch, candidate, and trainer management.
*   Replace manual spreadsheets with system-driven execution.
*   Automate attendance and assessment tracking.
*   Enforce operational discipline through alerts, reminders, and cut-offs.
*   Provide real-time visibility into training execution and outcomes.
*   Enable data-driven decisions through dashboards and reports.

## 3. Scope
### 3.1 In-Scope
*   Training batch lifecycle management.
*   Candidate onboarding and batch assignment.
*   Daily attendance tracking and monitoring.
*   Assessment score management (Excel-based uploads).
*   Trainer and Training Coordinator role management.
*   Notification and reminder automation.
*   Dashboards and analytical metrics.
*   Feedback initiation, collection, and reporting.
*   Topper identification and reporting.

---

## 4. User Roles & Responsibilities
### 4.1 Trainer
*   Upload daily attendance (Manual or Excel).
*   Upload assessment scores (Sprint, API, Coding, Project).
*   Access restricted to **assigned batches only**.

### 4.2 Training Coordinator
*   Create, update, and close training batches.
*   Upload candidate master data via Excel.
*   Monitor performance via dashboards.
*   Trigger feedback emails.
*   Download all reports (Attendance, Scores, Toppers).

### 4.3 Admin
*   Manage users and roles (RBAC).
*   Configure system-level settings (Cutoffs, Thresholds).
*   Configure topper criteria.

---

## 5. Functional Requirements
### 5.1 Batch Management
*   Status: **Planned, Running, Completed, Closed**.
*   Auditable status transitions.

### 5.2 Attendance Tracker
*   **Cutoff Time:** 10:00 AM (Configurable).
*   **Alert Rules:** 
    *   Missed 10 AM upload -> Alert Coordinator.
    *   3-day consecutive absence -> Alert Coordinator.

### 5.3 Assessment Score Tracker
*   Supports Sprint Review, API, Coding, and Project scores.
*   Excel-based mapping to candidates.

### 5.4 Notifications & Alerts
*   Automated Email channel.
*   Logs with timestamps and recipients.

### 5.5 Feedback Management
*   Trigger collection for specific batches.
*   Reporting on content quality and trainer effectiveness.

### 5.8 Topper Identification
*   Automatic identification based on configurable criteria.
*   Weightages configurable by Admin.

---

## 6. Non-Functional Requirements
*   **Security:** Role-Based Access Control (RBAC).
*   **Performance:** Support Excel uploads up to 20,000 records.
*   **Audit:** Log all uploads, modifications, and notifications.
