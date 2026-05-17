# 🤖 Maverick AI Chatbot: Tool Calling Capabilities

This document outlines the **7 active Autonomous Tools** currently integrated into the Maverick AI Chatbot. 

Because we use **LLM Function Calling**, the AI doesn't just "talk"—it actively reads your Firestore database, executes logic, sends real EmailJS emails, and logs compliance records into the Audit Ledger.

Here is the documentation for your team to test and explore various scenarios.

---

## 1. System Health Overview (`get_system_stats`)
**What it does:** The AI autonomously queries the `candidates` and `batches` Firestore collections to calculate real-time platform health, counting total users and identifying exactly how many candidates are currently "High Risk".
* **Example Prompt:** *"Give me a high-level overview of the system today."*
* **Expected Outcome:** The AI will reply in chat with exact numbers: "We currently have 12 total candidates enrolled across 1 active batch. There are currently 4 candidates flagged as high risk (e.g., Aro, Rohan Gupta)."

## 2. Deep Batch Analysis (`get_batch_performance`)
**What it does:** The AI filters the database for a specific batch name and mathematically calculates their overall average attendance and whether the cohort is "On Track" or "At Risk".
* **Example Prompt:** *"Analyze the performance for the AWS WorkShop batch."*
* **Expected Outcome:** The AI will calculate the math in the background and reply: "The AWS WorkShop batch has 12 students. Their average attendance is 75%, meaning the cohort is currently On Track."

## 3. Feedback Survey Automation (`launch_batch_feedback_via_chat`)
**What it does:** The AI updates the batch's feedback status in the database to "Active", pulls all candidate email addresses for that batch, and executes a loop to send real EmailJS surveys to every student.
* **Example Prompt:** *"Please launch the feedback surveys for the AWS WorkShop batch."*
* **Expected Outcome:** 
  1. The AI replies: "Successfully triggered feedback collection for AWS WorkShop... Dispatched to 12 learners."
  2. The students will receive a real email in their Gmail inbox.
  3. **Check the Audit Ledger:** A new cryptographic log will appear stating `[CHAT OPS] Launched survey feedback for batch AWS WorkShop. Triggered real EmailJS surveys (service_3ypywql) to 12/12 students.`

## 4. Bulk Graduation Automation (`automate_batch_graduation`)
**What it does:** An operational time-saver. The AI updates the batch status to "Completed", iterates through every candidate in that batch, and forces their status to "COMPLETED" and their risk level to "LOW".
* **Example Prompt:** *"Graduate the AWS WorkShop batch."*
* **Expected Outcome:** 
  1. The AI replies: "Successfully graduated batch AWS WorkShop! Registered 12 candidates as COMPLETED."
  2. If you go to the **Candidates Page**, every student in that batch will now have a green "COMPLETED" status and "LOW" risk.
  3. **Check the Audit Ledger:** A new log appears: `[CHAT OPS] Automating graduation... graduated 12/12 students to COMPLETED.`

## 5. Bulk Alert Resolution (`resolve_alerts_via_chat`)
**What it does:** The AI queries the `system_alerts` collection for any active alerts (Late Attendance, High Risk warnings, etc.) containing a specific batch name, and changes their status to "Resolved".
* **Example Prompt:** *"Resolve all active alerts for the AWS WorkShop batch."*
* **Expected Outcome:** 
  1. The AI replies: "Successfully resolved 4 compliance alerts for AWS WorkShop."
  2. If you go to the **Dashboard**, those 4 alerts will instantly disappear from the "Recent Alerts" box.
  3. **Check the Audit Ledger:** A new log appears: `[CHAT OPS] Resolved 4 active compliance alerts for batch AWS WorkShop via natural language command.`

## 6. Manual Governance Triggers (`trigger_governance_alert`)
**What it does:** Allows operational staff to manually inject Critical/High alerts directly into the Governance Engine via natural language.
* **Example Prompt:** *"Trigger a Critical governance alert titled 'Network Failure' stating that the main DB went offline."*
* **Expected Outcome:** 
  1. The AI replies confirming the alert was triggered.
  2. If you go to the **Dashboard**, a brand new, highly visible "Critical Governance Alert: Network Failure" will appear in the UI.
  3. **Check the Audit Ledger:** A new log appears recording the exact manual trigger for compliance monitoring.

## 7. Platform Navigation Guide (`explain_ui_feature`)
**What it does:** Acts as an onboarding assistant for new staff. The AI maps natural language questions about the platform to a dictionary of page functions and explains how to use the Maverick UI.
* **Example Prompt:** *"Explain how I should use the Attendance Management page."*
* **Expected Outcome:** The AI will reply with a helpful onboarding message: "The Attendance Management page allows trainers to upload attendance logs (CSV/Excel) and track daily presence. It enforces a 10:00 AM cutoff for data integrity."
