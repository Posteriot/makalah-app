---
name: makalah-whitebook
description: "Use BEFORE reading source code or answering any question about the Makalah AI codebase — architecture, harness, workflow stages, artifacts, naskah, refrasa, prompts, payment, security, compliance, or any product feature. Provides the canonical reading order through the White Book at docs/what-is-makalah/, mapping question topics to specific docs so you consult the single source of truth instead of guessing or grepping code blindly."
---

# Makalah White Book Navigator

The Makalah AI codebase has a forensically-audited documentation set called the **White Book** at `docs/what-is-makalah/`. It is the **Single Source of Truth** for architecture, user flows, AI orchestration, and compliance. CLAUDE.md mandates consulting it before guessing features.

This skill is the shortcut: **what to read, in what order, for what question.** It does NOT duplicate the docs — it points to them. The docs themselves live in git, are versioned, and are updated via PR. Always read the live files; do not rely on memory of doc content from prior sessions.

## When this skill fires

Invoke this skill BEFORE doing any of the following:

- Reading Makalah source code (in `src/` or `convex/`) to understand a feature.
- Answering a user question about Makalah AI architecture, behavior, or capabilities.
- Designing/changing a feature in Makalah AI.
- Writing tests against Makalah behavior.
- Debugging a Makalah bug whose context spans multiple modules.
- Auditing or reviewing PRs that touch core systems (harness, stage logic, artifacts, payments, security).

Trigger keywords (any language) that should make you think "consult White Book first":
**makalah, harness, orchestrator, stage (1-14), artifact, naskah, refrasa, choice card, validation panel, progress timeline, search orchestrator, instruction stack, runtime enforcer, system prompt, stage skill, convex schema, workflow lifecycle, paper session, compaction, memory digest, RBAC, route protection, 2FA, webhook security, rate limiting, subscription, quota, xendit payment, AI gateway, openrouter, tavily, file extraction, compliance, copyright fencing, AI detector, etika AI, sentry**.

If the user is asking about ANY of these and you are about to grep code or open `src/` first — STOP and consult the White Book first.

## Step 1: Locate the White Book

The docs live at `docs/what-is-makalah/` relative to git root. To resolve the absolute path in any worktree:

```bash
ROOT=$(git rev-parse --show-toplevel)
WHITEBOOK="$ROOT/docs/what-is-makalah"
```

Files referenced below are paths relative to `$WHITEBOOK`.

## Step 2: Always start here (in this order)

1. `README.md` — entry point and AI-system instructions.
2. `index.md` — full directory tree and category navigation.
3. `glossary.md` — Makalah-specific terminology (stage, artifact, naskah, refrasa, choice card, etc.). **Critical** — terms in this codebase have specific meanings that differ from generic usage.

These three are cheap to read and orient you. Do this every session that touches Makalah, even if you "remember" — docs evolve.

## Step 3: Topic → file lookup

Use this table to jump straight to the right doc. Always read the category `index.md` first, then drill into specific files.

| If the question / task touches… | Read first | Then |
|---|---|---|
| **Product vision / philosophy / "what is Makalah"** | `01-identitas-manifesto/index.md` | `02-manifesto-filosofi.md` |
| **Workflow 14-stage, stage transitions, lifecycle** | `02-fitur-kapabilitas/01-workflow-14-stage.md` | `05-user-flow/03-lifecycle-states.md`, `04-cross-stage-logic.md` |
| **Artifact system (create/update/render)** | `02-fitur-kapabilitas/06-artifact.md` | Check `06-agent-harness/03-tool-inventory-capabilities.md` for tool contracts |
| **Naskah feature (paper composition)** | `02-fitur-kapabilitas/03-naskah.md` | `05-user-flow/06-writing-stages.md` |
| **Refrasa (rephrasing)** | `02-fitur-kapabilitas/05-refrasa.md` | — |
| **Choice cards** | `02-fitur-kapabilitas/07-choice-card.md` | `07-chat-ui/03-interactive-elements.md` |
| **Validation panel** | `02-fitur-kapabilitas/09-validation-panel.md` | `04-prompt-skills/05-runtime-enforcers.md` |
| **Progress timeline** | `02-fitur-kapabilitas/04-progress-timeline.md` | — |
| **Search orchestrator / web search / Tavily** | `02-fitur-kapabilitas/02-search-orchestrator.md` | `03-technology-stack/09-tavily.md`, `10-search-orchestration.md` |
| **Unified process card** | `02-fitur-kapabilitas/08-unified-process-card.md` | — |
| **Tech stack overview** | `03-technology-stack/index.md` | drill into specific tech file |
| **Convex schema, queries, mutations** | `03-technology-stack/02-convex.md` | `06-agent-harness/06-persistence-observability.md` |
| **Next.js App Router, RSC, routing** | `03-technology-stack/01-nextjs.md` | — |
| **AI SDK (Vercel AI SDK), streamText, tools** | `03-technology-stack/06-ai-sdk.md` | `07-ai-gateway.md`, `08-openrouter.md` |
| **Auth (Better Auth, sessions, login)** | `03-technology-stack/03-better-auth.md` | `09-keamanan-privasi/02-auth-architecture.md` |
| **File extraction / PDF / DOCX ingest** | `03-technology-stack/11-file-extraction.md` | — |
| **Payment / Xendit / billing** | `03-technology-stack/12-xendit.md` | `08-langganan-pembayaran/01-payment-integration.md` |
| **Email / Resend** | `03-technology-stack/14-resend.md` | — |
| **Sentry / observability** | `03-technology-stack/15-sentry.md` | `06-agent-harness/06-persistence-observability.md` |
| **Turnstile / bot protection** | `03-technology-stack/13-cloudflare-turnstile.md` | — |
| **System prompts, prompt orchestration** | `04-prompt-skills/02-system-prompts.md` | `01-orchestration.md` |
| **Stage-specific skills / instructions** | `04-prompt-skills/03-stage-skills.md` | — |
| **Hardcoded prompts (vs DB-driven)** | `04-prompt-skills/04-hardcoded-prompts.md` | — |
| **Runtime enforcers (toolChoice manipulation)** | `04-prompt-skills/05-runtime-enforcers.md` | `06-agent-harness/05-tool-safety-enforcement.md` |
| **User flow / mekanisme inti / cross-stage logic** | `05-user-flow/02-core-mechanisms.md` | `04-cross-stage-logic.md`, `03-lifecycle-states.md` |
| **Visual flow diagram** | `05-user-flow/01-visual-flow.md` | — |
| **Preparatory / writing / finalization stages** | `05-user-flow/05-preparatory-stages.md` | `06-writing-stages.md`, `07-finalization-stages.md` |
| **Output & export** | `05-user-flow/08-output-and-export.md` | — |
| **Agent harness overview** | `06-agent-harness/index.md` | category-specific drill-down |
| **Orchestration loop, TAO cycle, 13-step engine** | `06-agent-harness/02-orchestration-loop.md` | — |
| **Tool inventory, tool capabilities** | `06-agent-harness/03-tool-inventory-capabilities.md` | — |
| **Context management, instruction stack 13-layer, compaction** | `06-agent-harness/04-context-management.md` | `04-prompt-skills/01-orchestration.md` |
| **Tool safety, Convex guards, runtime enforcers** | `06-agent-harness/05-tool-safety-enforcement.md` | `04-prompt-skills/05-runtime-enforcers.md` |
| **Persistence, run/step/event tables, resume, observability** | `06-agent-harness/06-persistence-observability.md` | `03-technology-stack/02-convex.md` |
| **Chat UI shell / layout** | `07-chat-ui/01-shell-layout.md` | `02-message-components.md` |
| **Message rendering / interactive elements** | `07-chat-ui/02-message-components.md` | `03-interactive-elements.md` |
| **Error states / UI inventory** | `07-chat-ui/04-error-states.md` | `05-ui-inventory.md` |
| **Subscription plans, quota, admin controls** | `08-langganan-pembayaran/02-subscription-plans.md` | `03-quota-logic.md`, `04-admin-controls.md` |
| **Route protection / middleware** | `09-keamanan-privasi/01-route-protection.md` | — |
| **2FA / TOTP** | `09-keamanan-privasi/03-two-factor-auth.md` | — |
| **RBAC / authorization** | `09-keamanan-privasi/04-rbac-authorization.md` | — |
| **Webhook security (signature verify)** | `09-keamanan-privasi/05-webhook-security.md` | — |
| **Rate limiting** | `09-keamanan-privasi/06-rate-limiting.md` | — |
| **Compliance — privacy, ToS, data security, AI ethics** | `11-compliance-ethics/index.md` | drill into specific policy |
| **Copyright fencing, plagiarism, AI detector policy, IP** | `11-compliance-ethics/04-etika-ai.md` | `02-ketentuan-layanan.md` |
| **Company profile / contact** | `10-perusahaan-kontak/01-profil-perusahaan.md` | — |

If the topic does not match any row above:
1. Read `index.md` (root) and skim categories.
2. Read the most likely category's `index.md`.
3. Read `glossary.md` to check for term confusion.

## Step 4: Cross-reference with code (only AFTER docs)

After reading the relevant docs, you may inspect `src/` or `convex/` to verify the code matches. The docs claim "forensically audited against production codebase" but reality drifts — verify before asserting code behavior.

When you find code/docs divergence:
- Trust the **code** for current behavior.
- Flag the doc divergence to the user explicitly: "doc X says Y but code at `path:line` does Z."
- Suggest updating the doc as a follow-up (don't auto-edit; this is a forensically-audited doc set, edits need explicit user approval).

## Step 5: References folder (advanced)

For low-level technical specifications, `docs/what-is-makalah/references/` contains "raw" technical references including the agent-harness anatomy, control-plane mapping, and programmatic-tool-calling research. Read these only when:
- Designing harness-level changes.
- Working on durability / reliability / state architecture.
- The main category docs reference them explicitly.

Specifically for harness work:
- `references/agent-harness/anatomy/anatomy-agent-harness.md` — 12-component production harness anatomy.
- `references/agent-harness/harness-engineering-guid.md` — REST framework, Control/Data Plane.
- `references/agent-harness/control-plane-domain-action.md` — Makalah-specific Control Plane vs Domain Actions mapping.
- `references/programatic-tools-calling/programmatic-tool-calling.md` — Anthropic research justifying thin pipelines.

## Anti-patterns (do not do)

- ❌ Grep `src/` for a feature name without first checking the White Book — wastes context window on code when docs would answer in one read.
- ❌ Quote doc content from memory (last session, prior conversation) — docs evolve. Read live.
- ❌ Treat doc as authoritative when code disagrees — code wins for current behavior; flag the divergence.
- ❌ Edit White Book files casually. Forensic audit means structural changes need user approval.
- ❌ Skip `glossary.md` — Makalah terms (stage, artifact, naskah, refrasa) have specific meanings that differ from generic usage.

## Output expectation

When you consult the White Book, briefly state to the user which doc you read and where you found the answer, e.g., "From `docs/what-is-makalah/06-agent-harness/02-orchestration-loop.md`: …". This makes your reasoning auditable and lets the user push back if they know the doc is stale.
