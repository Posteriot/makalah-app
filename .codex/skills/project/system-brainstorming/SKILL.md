---
name: system-brainstorming
description: Cross-repo feature and system brainstorming with codebase exploration (frontend and backend), qualitative feasibility and risk analysis, and web research that must include at least one GitHub source. Use when the user wants feature ideas, innovation, system strengthening, risk assessment (security, performance, compliance, cost, resource dependencies), implementation difficulty estimates, or logical reasoning based on reading code and repo structure.
---

# System Brainstorming

## Operating rules
- Always ask at least one clarifying question before final recommendations.
- Always provide a single best recommendation when presenting options or choices, and explain why it is best.
- Do not present options without a recommendation; if context is insufficient, ask targeted questions first.
- Read code and structure only; do not run or modify runtime unless the user asks.
- Always include at least one GitHub source in web research.

## Workflow
1) Clarify goal, target users, constraints, and timeline.
2) Map repo scope (frontend, backend, infra, data, integrations).
3) Inspect entrypoints, routing, data flow, and critical modules.
4) Extract constraints and dependencies from code and config.
5) Perform web research with at least one GitHub source and other references as needed.
6) Generate 3-7 ideas.
7) Score each idea using the rubric.
8) Recommend a single best option with rationale, qualitative effort, and risk summary.
9) Ask for confirmation or iteration.

## Required references
- references/rubric.md
- references/output-template.md
- references/codebase-discovery.md
