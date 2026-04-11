# Chat Bubble UI Enforcement Implementation Plan

## Phase 1: Workspace Setup

1. Create the `chat-bubble-ui-enforcement` worktree from local `main`.
2. Copy `.env.local`, `CLAUDE.md`, and `AGENTS.md` into the worktree.
3. Run `npm install` in the worktree and verify it completes successfully.

## Phase 2: Local Workspace Conveniences

1. Create the `screenshots/` directory for local captures and QA artifacts.
2. Keep `screenshots/` ignored by git with a single canonical `.gitignore` entry.

## Phase 3: Process Documentation

1. Create `docs/chat-bubble-ui-enforcement/`.
2. Add context, design, implementation plan, and verification docs for this branch.
3. Record verification evidence after setup completes.
