# Chat Bubble UI Enforcement Design Doc

## Goal

Establish a ready-to-work branch workspace for the `chat-bubble-ui-enforcement` effort with local environment parity, dependency installation, and documentation scaffolding.

## Design

- Use a git worktree rooted at `.worktrees/chat-bubble-ui-enforcement` to isolate branch-specific changes.
- Keep local-only files (`.env.local`, `screenshots/`) available in the worktree without tracking them in git.
- Store all process documentation for this effort under `docs/chat-bubble-ui-enforcement/`.
- Keep setup changes minimal so the branch can immediately move into UI implementation work.

## Deliverables

- New branch and worktree created from local `main`
- Required local files copied into the worktree
- Dependencies installed in the worktree
- `screenshots/` directory present and ignored
- Dedicated documentation folder with setup records
