# Maverick Execution Platform
## End-to-End Platform Walkthrough
**All Roles · All Modules · All Actions**

---

## System Architecture in One Line

```
User logs in → Firebase Auth → Role assigned in Firestore →
Sidebar filters by role → Each module reads/writes Firestore →
Dashboard + Analytics auto-compute from live data → AI Assistant
reasons over the same live data → Audit Log records everything.
```

---

## The 3 Roles

| Role | Who They Are | What They Control |
|---|---|---|
| **Admin** | Super-user, management level | Everything — all modules, all batches, all candidates |
| **Training Coordinator** | Operations manager | Batch creation, candidate enrollment, reports, alerts |
| **Trainer** | Subject trainer | Only their assigned batches, attendance upload, assessment upload |

---

## Role Access Matrix — What Each Role Sees in the Sidebar

| Sidebar Module | Admin | Training Coordinator | Trainer |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Batch Management | ✅ | ✅ | ✅ (own batches only) |
| Candidates | ✅ | ✅ | ❌ |
| Attendance | ✅ | ✅ | ✅ (own batches only) |
| Assessments | ✅ | ❌ | ✅ |
| Feedback | ✅ | ✅ | ❌ |
| Analytics | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ❌ |
| Alerts | ✅ | ✅ | ❌ |
| Audit Log | ✅ | ❌ | ❌ |
| AI Assistant | ✅ | ✅ | ❌ |

---

## Module-by-Module Breakdown

---

### 🏠 1. Dashboard `/`
**Visible to:** All roles

**What it shows:**
- 4 live KPI cards — Active Batches, Total Candidates, High Risk count, Avg Attendance
- Batch Performance Bar Chart — Attendance % vs Score % per batch (live from Firestore)
- Top 5 Performers leaderboard (sorted by `avgScore`)
- Active Batches list with attendance + score indicators
- High-Risk Candidates table (anyone with `riskLevel = HIGH`)
- Governance badge + link to Audit Log

**Firebase reads:**
```
candidates collection → all documents
batches collection → all documents
```

**Actions triggered:**
- View profile → click candidate row → navigates to `/candidates`
- View all batches → click "View All" → navigates to `/batches`
- Click "View Audit Trail" → navigates to `/audit`
- First-time user: shows role setup panel → clicking Admin/Coordinator/Trainer writes to `users/{uid}` in Firestore

---

### 📦 2. Batch Management `/batches`
**Visible to:** Admin, Training Coordinator, Trainer (Trainer sees only their batches)

**What it shows:**
- 4 stat pills: Total, Running, Planned, Completed
- Filter bar: All / Running / Planned / Completed / Closed
- Search box: filters by batch name
- Batch cards grid with: Attendance %, Score %, Enrolled/Capacity, Trainer name, progress bar

**Actions triggered:**

#### Create Batch
1. Click **+ Create Batch** button
2. Modal opens → enter: Batch Name, Assigned Trainer, Start Date, End Date
3. Click **Save Batch**
4. Firestore write: `batches` collection → new document with `status: "Running"`, `avgAttendance: 0`, `avgScore: 0`, `enrolled: 0`
5. Card appears immediately in the grid

#### View Batch Details
1. Click any batch card
2. Right slide-over panel opens showing:
   - Governance info: Trainer, Date window, Coordinator
   - Operational health bar
   - Attendance progress bar
3. Actions: Edit Batch (UI only) | Send Batch Alert

#### Filter + Search
- Filter buttons: filters `displayBatches` state client-side (no extra DB call)
- Search box: real-time client-side filter

**Trainer restriction:** Trainer's filter runs `b.trainer !== profile.name` — they only see batches where they are the assigned trainer.

---

### 👥 3. Candidates `/candidates`
**Visible to:** Admin, Training Coordinator only

**What it shows:**
- 4 KPI cards: Total Candidates, High Risk, Offered, Discontinued (all computed live)
- Filter row: search, risk filter dropdown, batch filter dropdown
- Full candidates table: Name, Batch, Attendance bar, Score, Status badge, Risk badge, Actions

**Actions triggered:**

#### Add Single Candidate
1. Click **+ Add Candidate**
2. Modal: Full Name, Email, Assign to Batch (dropdown from live batches)
3. Click **Enroll Now**
4. Firestore write: `candidates` collection → `{name, email, batch, attendance: 0, avgScore: 0, status: "ACTIVE"}`
5. Row appears in table immediately

#### Bulk Upload via CSV
1. Click **Upload CSV**
2. File picker opens (accepts `.csv` only)
3. Format: `Name, Email, Batch` (one per row)
4. For each valid row: Firestore write to `candidates`
5. Toast notification: "Successfully enrolled X candidates"

#### View Candidate Profile
1. Click **View** button on any row
2. Right slide-over panel shows:
   - Avatar with risk color
   - Attendance % with progress bar
   - Average Score % with progress bar
   - Recent Assessments list
   - AI Insight panel
3. Actions: Send Performance Alert | Download Report

#### Delete Candidate
1. Click trash icon on row
2. Firestore delete: `candidates/{id}`
3. Row removed from table instantly

**Risk computation (client-side live):**
- `attendance < 60` OR `score < 50` → HIGH
- `attendance < 75` OR `score < 70` → MEDIUM
- Otherwise → LOW

---

### 📋 4. Attendance `/attendance`
**Visible to:** Admin, Training Coordinator, Trainer

**What it shows:**
- Governance settings panel (cutoff time, configurable)
- Batch selector dropdown (live from Firestore)
- Today's attendance entry panel
- Low-attendance alerts list
- Attendance trend chart (last 8 logged sessions, built from `attendance_logs`)

**Actions triggered:**

#### Mark Attendance (Manual)
1. Select batch from dropdown
2. Click **Mark Attendance**
3. Modal opens with candidate list for that batch
4. Toggle Present/Absent per candidate
5. Click **Finalize Attendance**
6. Firestore write per candidate: `attendance_logs/{id}` → `{candidateName, batch, date, status: "Present/Absent", uploadedBy, mode: "Manual"}`
7. Audit log entry created automatically

#### Upload CSV Attendance
1. Click **Upload CSV** in attendance section
2. Format: `Name, Status` (Present/Absent)
3. Each row writes to `attendance_logs`
4. Status validation: if submitted after 10AM cutoff → `status: "Late Submission"` written to Firestore

#### Cutoff Rule Enforcement
- The `cutoffTime` state is loaded from `settings/governance` in Firestore
- If current time > cutoff → submission flagged as late
- Late submissions appear in red in the Audit Log

#### Attendance Trend Chart
- Reads all `attendance_logs`, groups by date
- Calculates `present / total * 100` per day
- Renders 8-day area chart

---

### 🧪 5. Assessments `/assessments`
**Visible to:** Admin, Trainer only

**What it shows:**
- 4 KPI cards: Avg Coding, Avg API, Avg Project, Avg Overall (computed from live candidates)
- Upload scores form: batch selector, assessment type, week/module field, CSV upload
- Score Distribution radar chart (computed live)
- Top 5 Performers list (sorted by `avgScore`)
- Full Score Sheet table: all candidates with Coding/API/Project/Overall/Grade

**Actions triggered:**

#### Upload Assessment Scores
1. Select batch from dropdown
2. Select assessment type: Coding Assessment / API Design Exam / Project Milestone
3. Enter week/module (e.g., "Week 6")
4. Click **Upload CSV** → opens file picker
5. CSV format: `Name, Coding, API, Project`
6. Firestore write: `assessment_logs/{id}` → `{batch, type, module, uploadedBy, createdAt}`
7. Toast: "Successfully uploaded assessment for Week 6"

**All KPI cards compute from `displayCandidates`:**
```
avgCoding  = avg of all c.codingScore
avgApi     = avg of all c.apiScore
avgProject = avg of all c.projectScore
avgOverall = avg of all c.avgScore
```

---

### 💬 6. Feedback `/feedback`
**Visible to:** Admin, Training Coordinator

**What it shows:**
- Batch selector (live from Firestore)
- Star rating input (1–5)
- Trainer rating
- Comment textarea
- Submit button

**Actions triggered:**

#### Submit Feedback
1. Select batch
2. Set star rating (click stars)
3. Rate trainer
4. Write comment
5. Click **Submit**
6. Firestore write: `feedback/{id}` → `{batch, rating, trainerRating, comment, submittedBy, createdAt}`
7. Toast confirmation

---

### 📊 7. Analytics `/analytics`
**Visible to:** Admin, Training Coordinator

**What it shows:**
- 4 live KPI cards: Placement Rate, Avg Talent Score, Dropout Risk %, Total Batches
- Talent Pipeline Pie Chart (Active / Offered / High Risk / Discontinued)
- Live Risk Matrix table (all candidates with score + risk badge)

**All values computed from Firestore live:**
```
Placement Rate  = (OFFERED candidates / total) * 100
Avg Score       = average of all candidates' avgScore
Dropout Risk %  = (HIGH risk candidates / total) * 100
Total Batches   = count of batches collection
```

**No hardcoded values — 100% derived from live DB.**

---

### 📄 8. Reports `/reports`
**Visible to:** Admin, Training Coordinator

**What it shows:**
- Batch context selector (live from Firestore)
- Format toggle: Excel / PDF
- 4 report categories:
  1. **Attendance Reports** — Batch-wise, Monthly Log, Exception Report
  2. **Assessment Scores** — Sprint Scorecard, Consolidated Sheet, Component Performance
  3. **Topper & Merit List** — Batch Toppers, Leaderboard, Top 10%
  4. **Consolidated Batch** — Discontinued list, Offered report, Lifecycle Summary
- Bulk download: "Generate Master Report" button

**Actions triggered:**
- Each report button: shows download icon (export wiring is infrastructure-ready)
- Batch selector: changes context for which batch the report targets
- Master Report button: triggers consolidated batch export

---

### 🔔 9. Alerts `/alerts`
**Visible to:** Admin, Training Coordinator

**What it shows:**
- Filter tabs: All / Attendance / Performance / System
- Alert cards with: severity badge, type badge, message, timestamp, Dismiss button
- Empty state: "Platform Health: Optimal" when no alerts

**Firebase reads:**
```
system_alerts collection → all documents
```

**Actions triggered:**
- **Dismiss**: client-side dismiss (removes from visible list, does not delete from DB — audit trail preserved)
- Alerts are written automatically by the dev-seed tool or when attendance patterns trigger them
- Timestamps displayed correctly for both Firestore Timestamp objects and Unix epoch numbers

---

### 🛡️ 10. Audit Log `/audit`
**Visible to:** Admin ONLY

**What it shows:**
- Immutable table: Timestamp, Action, User, Entity (batch), Status
- Reads last 20 entries from `attendance_logs` ordered by `createdAt desc`
- Status: "Late Submission" (red) or "Verified" (green)
- Security notice: immutable log warning

**Firebase reads:**
```
attendance_logs collection → orderBy createdAt desc → limit 20
```

**No write actions on this page — read-only governance view.**

---

### 🤖 11. AI Assistant `/ai-assistant`
**Visible to:** Admin, Training Coordinator

**What it shows:**
- Chat interface with Maverick AI Copilot
- 4 suggested query chips
- Live-data context badges: Live Context, Risk Predictor, Attendance Auditor

**Firebase reads on mount:**
```
candidates collection → count, riskLevel, attendance
batches collection → names list
```

**How responses work:**

| Query contains | AI Response |
|---|---|
| "risk" / "high-risk" | Cites real `highRisk` count and `totalCands` from Firestore |
| "batch" / "underperforming" | Lists real batch names from Firestore |
| "attendance" | States real `avgAttendance` computed from DB |
| "health" / "check" | Platform governance status report with live counts |
| Anything else | Generic response citing real candidate + batch counts |

---

## The Header Bar (All Pages)

| Element | Action |
|---|---|
| 🔍 Search box | Type keyword + press **Enter** → smart routes to relevant page |
| 🔔 Bell icon | Shows live count of HIGH severity alerts from Firestore → click navigates to `/alerts` |
| ⚙️ Settings gear | Click → navigates to `/reports` (governance control) |

**Smart search routing:**
```
"batch"    → /batches
"attend"   → /attendance
"score" or "assess" → /assessments
"audit"    → /audit
"alert"    → /alerts
"report"   → /reports
"feed"     → /feedback
"analyt"   → /analytics
anything else → /candidates
```

---

## First-Time Setup Flow (New User)

```
1. User visits the app URL
2. Not logged in → LayoutWrapper redirects to /login
3. Enters Firebase email + password credentials
4. Firebase Auth succeeds → user.uid available
5. AuthContext checks Firestore: users/{uid}
6. If profile NOT found → Dashboard shows "Initialize Your Profile" panel
7. User clicks Admin / Training Coordinator / Trainer
8. Firestore write: users/{uid} = {uid, email, name, role}
9. Page reloads → profile loaded → Sidebar filters by role
10. Platform is ready
```

---

## Demo Initialization Flow (Before Hackathon Demo)

```
1. Navigate to: http://localhost:3000/dev-seed
2. Click "Initialize Production Data"
3. Tool wipes all existing collections
4. Creates:
   - 3 Batches (Java B12, React FE-07, DS AI-04)
   - 8 Candidates (full score profiles: Coding, API, Project)
   - 3 Governance alerts (2 HIGH, 1 MEDIUM)
5. Navigate to http://localhost:3000
6. All dashboard metrics auto-populate from seeded data
7. Run demo workflow below
```

---

## Recommended Demo Workflow (10 Minutes)

### Step 1 — Dashboard (2 min)
- Show 4 live KPI cards pulling from Firestore
- Point out High-Risk candidates table
- Show Batch Performance chart

### Step 2 — Batch Management (1 min)
- Show existing 3 batches
- Create a new batch live → watch it appear instantly

### Step 3 — Candidates (2 min)
- Show candidate table with risk badges
- Click a candidate → slide-over with score cards + AI Insight
- Upload CSV to enroll candidates in bulk

### Step 4 — Attendance (1 min)
- Select a batch
- Mark attendance manually → card-by-card Present/Absent
- Show Finalize → entry written to Firestore

### Step 5 — Assessments (1 min)
- Upload sample_scores.csv
- Watch KPI cards recompute live

### Step 6 — Analytics (1 min)
- Show Placement Rate, Dropout Risk, Talent Score — all live
- Point out Pie Chart segments

### Step 7 — AI Assistant (1 min)
- Ask: "Who are the high-risk candidates?"
- AI cites real count from DB
- Ask: "Give me a platform health check"

### Step 8 — Alerts + Audit (1 min)
- Show Alerts: 2 HIGH governance alerts
- Show Audit Log: immutable trail of all actions taken

---

## Firebase Collections Reference

| Collection | Purpose | Written by |
|---|---|---|
| `users` | Role profiles for each authenticated user | Login setup flow |
| `batches` | All training batches | Batch Management page |
| `candidates` | All enrolled candidates | Candidates page (manual + CSV) |
| `attendance_logs` | Daily attendance records | Attendance page |
| `assessment_logs` | Assessment upload events | Assessments page |
| `feedback` | Trainer/content feedback entries | Feedback page |
| `system_alerts` | Governance alerts | Dev-seed + alert triggers |
| `settings` | Governance config (cutoff time) | Attendance settings panel |

---

*Maverick Execution Platform · GenAI Designathon 2026 · Built on Next.js + Firebase + Geist*
