---
name: branch-scope
description: "Use at session start, when switching worktrees/branches, when the user asks 'what's the scope of this branch', 'apa tugasku di sini', 'cek SCOPE.md', or whenever you need to verify your work boundaries before acting. Reads SCOPE.md at git root plus the active branch + HEAD commit to ground your understanding of what is and is NOT in scope for the current branch."
---

# Branch Scope

Per CLAUDE.md feedback memory `feedback_branch_scope.md`: **branch scope is user-defined.** Do not self-restrict work scope based on branch/worktree name alone — the user's `SCOPE.md` is authoritative.

This skill is the fast path to: **what is this branch for?** Read it BEFORE you assume anything about the task at hand.

## When this skill fires

- At session start (the SessionStart hook injects the scope automatically; this skill is the on-demand companion).
- When the user asks "scope-nya apa?", "apa tugas di branch ini?", "cek SCOPE.md", "what's this branch for?".
- When you switched worktrees mid-session and need to re-orient.
- Before scoping ANY work (creating a plan, designing changes) — verify scope first.
- When you suspect work is drifting outside the user's intended boundaries.

## Procedure

### Step 1: Resolve repo + branch context

```bash
ROOT=$(git rev-parse --show-toplevel)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
HEAD_COMMIT=$(git rev-parse --short HEAD)
```

### Step 2: Read SCOPE.md if present

```bash
if [[ -f "$ROOT/SCOPE.md" ]]; then
  cat "$ROOT/SCOPE.md"
fi
```

If `SCOPE.md` is absent:
- For `main` branch, that's expected — main has no narrow scope, default to "any work the user requests, with full caution."
- For a feature/work branch, treat the absence as an information gap — ask the user what the scope is before substantive work. Do not infer scope from branch name alone (per `feedback_branch_scope.md`).

### Step 3: Cross-reference recent commits on this branch

```bash
# What has been done on this branch since it diverged from main?
git log main..HEAD --oneline
```

Recent commits + SCOPE.md = full picture of where work is and where it should go.

### Step 4: State your understanding back to the user

Briefly summarize:
- Branch name + HEAD commit.
- SCOPE.md content (if present).
- What's been done on this branch (commits since main).
- What the next step should be IF you can determine it from scope.

If scope is ambiguous, ask one specific question — do not guess.

## Anti-patterns

- ❌ Inferring scope from branch name (`durable-agent-harness` → "I'll work on the harness wherever I find it"). Branch name is a label; SCOPE.md is the contract.
- ❌ Doing work outside SCOPE.md without flagging it. If user asks for X but SCOPE.md says Y, raise the conflict before complying.
- ❌ Treating absent SCOPE.md as "no constraints." Absent SCOPE.md on a feature branch is a gap to fill, not freedom to expand.
- ❌ Reading SCOPE.md once at session start and forgetting. Re-read if you've been working long enough that drift is possible.

## Relationship to other skills

- **Whitebook (`makalah-whitebook`)**: tells you WHAT the system is. Branch-scope tells you WHAT to work on right now. Both should fire at the start of any Makalah session.
- **Anti-sycophancy (`debater-anti-sycophancy`)**: when user asks for work outside SCOPE.md, do not silently comply. Verify the scope conflict and raise it.

## Output expectation

When invoking this skill, your response should include the literal SCOPE.md content (or "no SCOPE.md found") and a one-line summary of branch state. Cite the source: "From `SCOPE.md` at `$ROOT/SCOPE.md`: …".
