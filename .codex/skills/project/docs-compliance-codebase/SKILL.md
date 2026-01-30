---
name: docs-compliance-codebase
description: Audit, revise, and ensure high-level Markdown documentation is compliant with the actual codebase for any repo. Use when the user needs documentation structure and terminology consistency, accurate API references, alignment with code paths and configuration, and compliance checks against backend/platform specifics. Includes read-only codebase scanning and Markdown linting with clear remediation steps.
---

# Docs Compliance Codebase

## Operating rules
- Ask at least one clarifying question before final recommendations.
- Always provide a single best recommendation when presenting options or choices, and explain why it is best.
- Do not present options without a recommendation; if context is insufficient, ask targeted questions first.
- Read code and structure only; do not run or modify runtime unless the user asks.
- Prefer deterministic checks using bundled scripts before manual review.

## Workflow
1) Clarify scope (docs targets, audience, and coverage expectations).
2) Scan codebase structure using the script to map relevant areas.
3) Run Markdown linting against the target docs.
4) Review documentation against the compliance rubric.
5) Draft fixes and align wording with codebase reality.
6) Provide a single best recommendation and a revised outline or patch plan.
7) Ask for confirmation or iteration.

## Required references
- references/compliance-rules.md
- references/output-template.md
- references/scan-guide.md

## Scripts
- scripts/scan_codebase.py
- scripts/lint_markdown.py
