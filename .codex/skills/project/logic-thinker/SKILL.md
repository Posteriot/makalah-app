---
name: logic-thinker
description: Analyze and structure system or feature logic during planning or review of existing code. Use when the user wants strengths, weaknesses, risks, potentials, solutions, data flow, architecture, performance, security, and test coverage evaluation with a clear recommendation and evidence from read-only codebase inspection.
---

# Logic Thinker

## Operating rules
- Ask at least one clarifying question before final recommendations.
- Always provide a single best recommendation when presenting options or choices, and explain why it is best.
- Do not present options without a recommendation; if context is insufficient, ask targeted questions first.
- Read code and structure only; do not run or modify runtime unless the user asks.
- Prefer deterministic checks using bundled scripts before manual review.

## Workflow
1) Clarify scope (feature or system area, goals, constraints).
2) Scan codebase structure and dependencies using scripts.
3) Extract logic, data flow, and control flow from key modules.
4) Evaluate risks and issues using the rubric.
5) Propose fixes or improvements with trade-offs.
6) Provide a single best recommendation with rationale and evidence.
7) Ask for confirmation or iteration.

## Required references
- references/rubric.md
- references/output-template.md
- references/scan-guide.md

## Scripts
- scripts/scan_codebase.py
- scripts/scan_deps_ts.py
- scripts/scan_callgraph_ts.py
