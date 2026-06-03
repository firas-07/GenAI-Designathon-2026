---
name: add-or-update-dashboard-module
description: Workflow command scaffold for add-or-update-dashboard-module in GenAI-Designathon-2026.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-or-update-dashboard-module

Use this workflow when working on **add-or-update-dashboard-module** in `GenAI-Designathon-2026`.

## Goal

Adds or updates a dashboard module (e.g., batches, candidates, assessments) including its UI page, related API routes, and integration with sidebar/layout components.

## Common Files

- `src/app/[module]/page.tsx`
- `src/app/api/[module]/route.ts`
- `src/components/Sidebar.tsx`
- `src/components/LayoutWrapper.tsx`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update the module page in src/app/[module]/page.tsx
- If needed, add or update related API route in src/app/api/[module]/route.ts
- Update src/components/Sidebar.tsx and/or src/components/LayoutWrapper.tsx to reflect navigation changes
- Update global styles or context providers if necessary

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.