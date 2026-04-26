# Security

This document tracks the security posture of Makalah AI: how vulnerabilities are triaged, what is deferred, and why.

## Audit Cycle

- Run `npm audit` after every dependency change and at least once per release cycle.
- Apply non-breaking fixes via `npm audit fix` immediately.
- Breaking-change fixes (`npm audit fix --force`, major upstream bumps) go through a dedicated security PR with smoke tests — never bundled into a feature branch.
- Each deferred advisory MUST be documented below with: severity, dependency chain, exploitability analysis, and tracking link.

## Deferred Advisories

### uuid <14.0.0 — moderate (4 paths)

- **Advisory:** [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) — "Missing buffer bounds check in v3/v5/v6 when buf is provided"
- **Severity:** moderate
- **First deferred:** 2026-04-26 (branch `durable-agent-harness`)
- **Affected paths in our tree:**
  - `mermaid@11.14.0 → uuid@11.1.0`
  - `svix@1.90.0 → uuid@10.0.0` (also via `resend → svix`)
  - `@sentry/webpack-plugin → uuid@<14`
- **Why deferred:** the bug requires a caller-controlled `buf` argument passed to `uuid.v3/v5/v6()` with a buffer smaller than 16 bytes. Mermaid, svix, resend, and @sentry/webpack-plugin all use `uuid()` internally and never expose the `buf` parameter to user-controlled input. The vulnerable code path is unreachable in this codebase.
- **Why not auto-fix:** `npm audit fix --force` would downgrade `mermaid 11.14.0 → 9.1.7` (a 2-year-old release missing modern diagram features). A manual `uuid: ^14` global override risks breaking mermaid and svix internals because uuid v14 changed the export shape.
- **Tracking upstream:**
  - mermaid: https://github.com/mermaid-js/mermaid/issues
  - svix: https://github.com/svix/svix-libs
- **Re-evaluate:** every 3 months, or when mermaid / svix release a version that bumps `uuid` to ≥14.

## Reporting a Vulnerability

If you discover a security issue in Makalah AI, do **not** open a public GitHub issue. Email `makalah.app@gmail.com` with reproduction steps and impact assessment.
