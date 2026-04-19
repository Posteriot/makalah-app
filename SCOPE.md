# Scope

This branch uses an explicitly broad execution scope.

## Active Scope
- The active scope covers the full repository, not a single feature folder.
- Any file may be inspected or edited when it has a direct or indirect dependency on the requested work.
- Scope includes application code, shared libraries, Convex functions, prompts, skills, scripts, tests, docs, configuration, build tooling, and verification artifacts.
- Cross-cutting changes are in scope when needed for correctness, consistency, safety, or completion.

## Boundary Rules
- User instructions can narrow or expand scope for a specific task.
- In the absence of a narrower instruction, assume end-to-end ownership across all affected layers.
- Do not stop at artificial boundaries such as page-only, component-only, backend-only, or docs-only if the task requires linked updates elsewhere.

## Current Session Focus (2026-04-14)

**Harness plan system: model-driven task tracking**

