# Handoff Prompt: ChatPage Mockup Implementation

You are working in this worktree:
`/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2`

## Goal

Start and complete the **ChatPage mockup** under `docs/frontend-marketing-resign-v2/mockup/`.

The next session must focus entirely on:
1. **Chat mockup implementation and styling**
2. **Visible-state styling for all important chat UI states**
3. **Static mockup coverage for hidden and error UI states by forcing them visible through mockup state controls**

**Important Context:**
- The primary visual reference for chat should be taken directly from the main app chat experience under `src/`.
- That reference should then be adapted and polished so it is compatible with the current mockup runtime, mockup CSS system, and the **Shell Layout Style**.
- The work must be implemented **only** inside `docs/frontend-marketing-resign-v2/mockup/`.
- Do **not** edit the production app under `src/`. `src/` is strictly read-only for visual/code reference.

## Current Git Context

Recent relevant commits:
```text
551c92c7 docs(mockup): define layout styles in design system reference
0c86eda0 Refine sidebar modes and shell data visuals
2b81cff1 Implement dynamic main content states for chat mockup
26c830a6 Restore Chat link to global header navigation
92ad80d1 Implement chat mockup mobile shell layout
f80348c6 Add ChatPage tasks and mark Task 1-3 as completed
```

## Primary Planning Docs

Read these first to understand the boundaries and design rules:
1. `docs/frontend-marketing-resign-v2/mockup/design_system_reference.md` (MUST read - defines the 5 layout styles including the Shell Style you will use).
2. Use your `mockup-frontend-designer` skill. This skill has been specifically configured to guide you through building static UMD + Babel pages without bundlers.

## Strict Scope & Runtime Constraints

- Only edit files under `docs/frontend-marketing-resign-v2/mockup/`.
- Do not edit `src/`.
- Do not introduce bundlers, ES module imports, TypeScript, Next.js APIs, Convex queries, or `fetch`.
- The mockup remains static React UMD + Babel.
- Register new components using `Object.assign(window, { ComponentName })` and include them in `MakalahAI.html`.
- Do not start a Next.js dev server. Preview via `MakalahAI.html`.

## Required Implementation Method

1. Create `ChatPage.jsx` and register the `#/chat` route.
2. Style the page with all standard visible UI included using the **Shell Layout Style**.
3. Style UI that is normally hidden by creating mockup state controls that make it visible.
4. Style error UI that normally appears only during failure states by creating mockup state controls that force those error states visible for review.

The purpose is the reviewability of the full surface, not strict runtime realism. You must expose the normal/default UI, hidden/conditional UI, and error UI so they can be reviewed visually.

## Immediate Starting Point

1. Invoke your `mockup-frontend-designer` skill to ensure your workflow is locked to the correct constraints.
2. Read `design_system_reference.md` to understand the **Shell Style**.
3. Read `MockRouter.jsx` and `MakalahAI.html` to understand how to register the new page.
4. Peek into `src/app` and `src/components` to study the production chat design.
5. Plan the implementation of `ChatPage.jsx` using forced-visibility mockup states and present it before execution.
