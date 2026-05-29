---
name: feature-development-with-shared-ui
description: Workflow command scaffold for feature-development-with-shared-ui in GenAI-Designathon-2026.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-development-with-shared-ui

Use this workflow when working on **feature-development-with-shared-ui** in `GenAI-Designathon-2026`.

## Goal

Implements or updates a feature across multiple dashboard modules, often involving shared UI components and context providers.

## Common Files

- `src/app/[module]/page.tsx`
- `src/components/Sidebar.tsx`
- `src/components/LayoutWrapper.tsx`
- `src/components/Header.tsx`
- `src/context/AuthContext.tsx`
- `src/app/globals.css`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Update multiple src/app/[module]/page.tsx files to implement the feature
- Update shared components in src/components (e.g., Sidebar.tsx, LayoutWrapper.tsx, Header.tsx)
- Update context providers in src/context if needed
- Update global styles in src/app/globals.css if the feature has a UI impact

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.