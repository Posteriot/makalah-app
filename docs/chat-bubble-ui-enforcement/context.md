# Chat Bubble UI Enforcement Context

## Objective

Prepare an isolated worktree for the `chat-bubble-ui-enforcement` branch so implementation can proceed without touching the main checkout.

## Requested Setup

1. Create a new worktree under `.worktrees/chat-bubble-ui-enforcement`.
2. Start the branch from the current local `main`.
3. Copy `.env.local`, `CLAUDE.md`, and `AGENTS.md` into the new worktree.
4. Install project dependencies with `npm install`.
5. Create a `screenshots` directory and ensure it is ignored by git.
6. Create a dedicated process-docs directory at `docs/chat-bubble-ui-enforcement`.

## Current Notes

- The source repository `main` was clean and in sync with `origin/main` before the worktree was created.
- `.worktrees/` was already ignored by the repository-level `.gitignore`.
- `screenshots` ignore rules existed already in `.gitignore`; this branch normalizes them to a single canonical entry.
