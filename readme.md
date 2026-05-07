# Maverick Execution Platform (TMS)

## Overview
Maverick Execution Platform is a centralized, AI-powered Training Management System (TMS) built to streamline and automate the full training lifecycle.

The goal is to replace manual Excel-based operations with a structured, real-time, and intelligent platform that supports execution, monitoring, analytics, and decision-making across training programs.

## Why This Platform Is Needed
Training operations are often handled through spreadsheets and disconnected tools. That causes:

- No real-time visibility into batch progress and candidate performance
- Manual follow-ups for attendance, assessments, feedback, and reports
- Data inconsistency, duplicate updates, and human errors
- Slow decisions for trainers, coordinators, and administrators

These gaps reduce operational efficiency and make it difficult to identify risk early.

## What The Platform Solves
The platform provides one system for:

- Batch management and lifecycle tracking
- Candidate onboarding and status management
- Attendance, assessment, and feedback tracking
- Dashboards, alerts, and downloadable reports
- GenAI-powered assistance and intelligent recommendations

## Core Modules

### 1. Batch Management
This module manages the end-to-end batch lifecycle.

Features:

- Create, update, and close batches
- Assign trainers and coordinators
- Track lifecycle stages such as Planned, Running, Completed, and Closed
- Monitor batch capacity, schedule, and progress

### 2. Candidate Management
This module handles candidate onboarding and tracking.

Features:

- Upload candidate data through Excel
- Map candidates to batches
- Maintain candidate status such as Active, Discontinued, Not Cleared, and Offered
- Track attendance and assessment history for each candidate

### 3. Attendance Management
This module manages daily attendance collection and validation.

Features:

- Upload attendance manually or through Excel
- Enforce cutoff rules such as 10 AM submission deadlines
- Identify missing attendance automatically
- Track 3-day absence patterns
- Trigger alerts for absenteeism

### 4. Assessment Tracking
This module stores and validates performance scores.

Features:

- Upload coding, API, and project assessment scores
- Prevent duplicate score entries
- Validate score ranges and candidate mapping
- Track progress over time

### 5. Feedback System
This module collects and analyzes feedback from training activities.

Features:

- Trigger feedback collection after sessions or milestones
- Collect trainer and content feedback
- Identify strengths, gaps, and improvement areas
- Support qualitative analysis through AI summarization

### 6. Dashboards and Analytics
This module provides live visibility into training execution.

Features:

- View total candidates, attendance percentage, and performance trends
- Compare batch-wise and trainer-wise metrics
- Identify underperforming batches early
- Support operational and strategic decision-making

### 7. Reports and Downloads
This module generates downloadable output for stakeholders.

Features:

- Attendance reports
- Assessment reports
- Topper lists
- Consolidated batch reports
- Export to Excel and PDF

### 8. Notifications and Alerts
This module keeps users informed in real time.

Features:

- Attendance reminders
- Absentee alerts
- Assessment reminders
- Feedback notifications

### 9. Audit and Logging
This module provides traceability for all system actions.

Features:

- Track attendance uploads
- Track score changes
- Track batch updates
- Maintain full audit history

## Roles In The System
The platform is designed around 3 primary roles.

### 1. Admin
The Admin is the super-user of the platform and manages governance, access, and visibility.

What the Admin should have:

- User and role management
- System rule configuration
- Access to all batches and reports
- Monitoring of activity logs and audit trails
- Organization-level dashboards and analytics
- Approval or oversight of sensitive operations

Typical actions:

- Create and manage users
- Configure cutoff rules and business policies
- Review execution health across batches
- Monitor alerts, exceptions, and audit events

### 2. Training Coordinator
The Training Coordinator manages operational execution across batches and candidates.

What the Training Coordinator should have:

- Batch creation and updates
- Candidate upload and mapping
- Batch allocation and trainer assignment
- Attendance monitoring and alert handling
- Feedback triggering and report generation
- Access to batch-level analytics

Typical actions:

- Onboard candidates into batches
- Check attendance compliance
- Follow up on absenteeism or missing data
- Generate batch reports and performance summaries
- Track progress and readiness of each batch

### 3. Trainer
The Trainer manages session-level execution and evaluation inputs.

What the Trainer should have:

- Ability to upload attendance
- Ability to upload assessment scores
- Access to assigned batches only
- Visibility into candidate performance for their batches
- Evaluation and feedback submission support

Typical actions:

- Mark attendance
- Upload coding, API, and project scores
- Review candidate progress
- Respond to feedback or corrective actions

## Where AI Agents Will Be Used
Agents will be used where the system needs to understand data, reason over context, and return actionable insights instead of just storing records.

### 1. AI Assistant / Copilot
This is the conversational layer for the platform.

Use cases:

- Ask which batch is underperforming
- Ask which candidates are high risk
- Ask for attendance anomalies
- Ask for batch summaries or trends

Why agents are useful here:

- The user query may need context from multiple modules
- The answer may require filtering, summarization, and reasoning
- The response should be natural language with data-backed insight

### 2. Performance Insight Agent
This agent analyzes batch and candidate trends.

Use cases:

- Detect underperforming batches
- Identify likely root causes
- Summarize attendance and score patterns
- Compare batches and trainers

### 3. Dropout Risk Agent
This agent identifies candidates at risk of dropping out or failing.

Use cases:

- Predict high-risk candidates using attendance, scores, and feedback
- Highlight candidates who need intervention
- Recommend follow-up actions

### 4. Feedback Summarization Agent
This agent processes raw feedback and extracts actionable meaning.

Use cases:

- Summarize long feedback responses
- Group issues into themes
- Generate improvement suggestions

### 5. Report Generation Agent
This agent creates readable summaries from structured data.

Use cases:

- Weekly batch summaries
- Executive-level status reports
- Auto-generated progress notes
- Recommendations for coordinators and admins

### 6. Alert Explanation Agent
This agent explains why an alert was triggered.

Use cases:

- Why attendance is marked as critical
- Why a candidate is flagged as at risk
- Why a batch is being labeled underperforming

## Agent Framework
The platform will use **LangChain** as the agent framework.

Why LangChain:

- Supports structured agent workflows
- Helps connect prompts, tools, memory, and retrieval
- Makes it easier to orchestrate LLM-based reasoning over application data
- Works well for summarization, Q&A, retrieval, and action-based agents

### How LangChain Will Be Used
- Connect the assistant to training data, batch data, and reports
- Retrieve relevant context before answering user questions
- Route tasks to the correct agent based on intent
- Chain steps like search, summarize, validate, and respond

## AI Model And Platform
The LLM layer will use **Azure AI Foundry**.

Planned usage:

- Use Azure-hosted models for inference
- Use enterprise-grade model management and deployment
- Support secure model access through Azure services
- Keep the AI layer aligned with a scalable enterprise architecture

### Why Azure AI Foundry
- Better enterprise governance
- Easier integration with Azure ecosystem services
- Secure model deployment and runtime management
- Suitable for production-grade agent applications

## Technology Stack

### Frontend
- React.js
- Tailwind CSS

### Backend
- FastAPI
- Python

### Data Layer
- PostgreSQL for relational data
- Redis for caching and background jobs

### AI Layer
- LangChain for agent orchestration
- Azure AI Foundry for model hosting and inference
- RAG for contextual retrieval
- Embeddings for semantic search and knowledge grounding

### Cloud And Storage
- Azure or AWS
- Blob Storage or S3 for documents and exports

### Background And DevOps
- Celery for background processing
- Docker for containerization
- GitHub Actions for CI/CD

## System Architecture

```text
Users
	↓
React Frontend
	↓
FastAPI Backend
	↓
PostgreSQL / Redis
	↓
LangChain Agent Layer
	↓
Azure AI Foundry Model Layer
	↓
RAG / Document Store / Blob Storage
```

## Security
- Role-based access control (RBAC)
- JWT-based authentication
- Restricted access by role and batch scope
- Audit logging for critical actions

## Business Impact
- Eliminates manual Excel tracking
- Improves training efficiency
- Enables real-time monitoring
- Reduces dropout rates
- Supports data-driven decisions

## Future Enhancements
- Candidate learning assistant
- Predictive performance analytics
- Mobile application
- Advanced analytics dashboards

## Conclusion
The Maverick Execution Platform transforms traditional training operations into a scalable, intelligent, and automated system.

It improves visibility, accountability, and outcomes while introducing AI agents for conversational support, prediction, summarization, and automated reporting.

## Links
- Demo: Add link here
- GitHub Repo: Add link here
- Presentation: Add link here

## Getting Started
This repository currently contains the project structure for the client and server applications.

Once implementation is added, document the exact setup here:

- Environment variables
- Install commands
- Run commands for client and server
- AI configuration for LangChain and Azure AI Foundry
