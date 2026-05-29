```markdown
# GenAI-Designathon-2026 Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches you the core development patterns, coding conventions, and collaborative workflows used in the GenAI-Designathon-2026 repository. The project is a Next.js dashboard application written in TypeScript, following modern conventions for modularity, shared UI, and API integration. You'll learn how to structure new features, update shared components, manage API endpoints, and adhere to the repository's code style.

## Coding Conventions

- **File Naming:**  
  Use `camelCase` for file and folder names.  
  _Example:_  
  ```
  src/components/layoutWrapper.tsx
  src/context/authContext.tsx
  ```

- **Import Style:**  
  Use alias imports for internal modules.  
  _Example:_  
  ```typescript
  import Sidebar from '@/components/Sidebar'
  import { AuthProvider } from '@/context/AuthContext'
  ```

- **Export Style:**  
  Use default exports for components and modules.  
  _Example:_  
  ```typescript
  // src/components/Header.tsx
  export default function Header() {
    return <header>...</header>
  }
  ```

- **Commit Messages:**  
  - Use prefixes like `feat` (for features) and `chore` (for maintenance).
  - Average commit message length: ~88 characters.
  _Example:_  
  ```
  feat: add batch management module to dashboard sidebar
  chore: update layoutWrapper for new theme support
  ```

## Workflows

### Add or Update Dashboard Module
**Trigger:** When introducing a new dashboard feature or updating an existing module  
**Command:** `/add-dashboard-module`

1. Create or update the module page at `src/app/[module]/page.tsx`.
2. If backend logic is needed, add or update the API route at `src/app/api/[module]/route.ts`.
3. Update navigation in `src/components/Sidebar.tsx` and/or `src/components/LayoutWrapper.tsx`.
4. Update global styles or context providers if necessary.

_Example:_
```typescript
// src/app/batches/page.tsx
export default function BatchesPage() {
  return <div>Batches Dashboard</div>
}

// src/app/api/batches/route.ts
export default function handler(req, res) {
  // API logic here
}
```

### Feature Development with Shared UI
**Trigger:** When implementing or updating a feature across multiple modules and shared components  
**Command:** `/feature-update-shared-ui`

1. Update relevant `src/app/[module]/page.tsx` files to implement the feature.
2. Update shared components in `src/components` (e.g., `Sidebar.tsx`, `LayoutWrapper.tsx`, `Header.tsx`).
3. Update context providers in `src/context` if needed.
4. Update global styles in `src/app/globals.css` if the feature affects UI.

_Example:_
```typescript
// src/components/Header.tsx
export default function Header() {
  return <header>New Feature Banner</header>
}
```

### API Endpoint Creation or Update
**Trigger:** When exposing new backend functionality or updating an existing API  
**Command:** `/new-api-endpoint`

1. Create or update the API route at `src/app/api/[endpoint]/route.ts`.
2. Update the related module UI in `src/app/[module]/page.tsx`.
3. Optionally update documentation or markdown files.

_Example:_
```typescript
// src/app/api/assessments/route.ts
export default function handler(req, res) {
  // New or updated API logic
}
```

### Shared Component & Style Update
**Trigger:** When changing the look, feel, or structure of shared UI elements  
**Command:** `/update-shared-ui`

1. Update one or more files in `src/components` (e.g., `Sidebar.tsx`, `Header.tsx`, `LayoutWrapper.tsx`).
2. Update global styles in `src/app/globals.css`.
3. Update layout in `src/app/layout.tsx` if needed.

_Example:_
```css
/* src/app/globals.css */
:root {
  --primary-color: #4f46e5;
}
```

## Testing Patterns

- **Test File Pattern:**  
  Test files are named with the pattern `*.test.*` (e.g., `component.test.tsx`).
- **Testing Framework:**  
  The specific framework is not detected, but standard Next.js/TypeScript projects often use Jest or React Testing Library.
- **Example:**  
  ```typescript
  // src/components/Sidebar.test.tsx
  import { render } from '@testing-library/react'
  import Sidebar from './Sidebar'

  test('renders sidebar', () => {
    render(<Sidebar />)
    // assertions here
  })
  ```

## Commands

| Command                 | Purpose                                                      |
|-------------------------|--------------------------------------------------------------|
| /add-dashboard-module   | Add or update a dashboard module and integrate with sidebar  |
| /feature-update-shared-ui | Implement or update a feature across multiple modules/shared UI |
| /new-api-endpoint       | Add or update an API endpoint for dashboard functionality    |
| /update-shared-ui       | Update shared UI components and global styles                |
```