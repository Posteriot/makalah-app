# Compliance Rules (High-Level Docs)

Use these rules to judge and revise Markdown documentation against the codebase.

## Structure and formatting
- Require exactly one H1 per file.
- Enforce ordered heading levels (no level jumps).
- Keep headings descriptive and non-empty.
- Use lists and tables consistently for repetitive content.

## Terminology consistency
- Match naming with code identifiers (features, modules, routes, and services).
- Avoid ambiguous synonyms unless explicitly defined.
- Maintain consistent casing and spelling for domain terms.

## Codebase alignment
- Verify all referenced paths, modules, and routes exist.
- Align described workflows with actual data flow.
- Reflect current configuration, flags, and environment variables.
- Remove or label outdated behavior and deprecated paths.

## API accuracy
- Verify endpoints, inputs, outputs, and error cases.
- Ensure request/response examples are consistent with code.
- Note authentication and authorization requirements.

## Platform and backend specifics
- Capture database/platform constraints and operational limits.
- Document background jobs, webhooks, or queues if used.

## Risk and compliance
- Highlight security-sensitive areas (auth, secrets, PII).
- Note compliance or regulatory constraints if referenced.
- Flag cost or resource dependencies implied by the docs.

## Output expectations
- Provide a clear remediation list with priority order.
- Provide a single best recommendation with rationale.
