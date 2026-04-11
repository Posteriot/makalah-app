# Handoff: tools-features-ui-ai-awarness

Date: 2026-04-09
Session: 1 (context window full, continuing in session 2)

---

## Branch Purpose

Detect, analyze, verify, audit, and fix the MOKA model's awareness of all tools, features, UI components, and functions available in its runtime environment. Close blind spots where the model does not know about capabilities it has or UI elements the user can see.

## What Was Done

### Research & Planning (Codex-approved)
- `01-research-report.md` — awareness mapping across 6 categories, gap analysis
- `02-design-implementation-plan.md` — distributed per-layer injection approach, 7 phases

### Implementation (Codex-approved)
- `03-implementation-review-gate.md` — all phases executed, 3 deviations documented

**Instruction layer patches (deployed to dev DB wary-ferret-59):**
- `system-prompt.md` — added USER INTERFACE AWARENESS section (artifact panel, source panel, processing indicators)
- 14 skill files — added `readArtifact` to all, exact source tools to 5 (01, 05, 06, 09, 12)
- 5 skill files — added `compileDaftarPustaka` preview guidance (06, 08, 09, 11)
- 5 skill files — added 5 evidence discipline guardrails (EVIDENCE BREADTH, EVIDENCE BREADTH HONESTY, OPENING SENTENCE FRAMING, EXACT METADATA DISCIPLINE, RESTATEMENT SCOPE PRESERVATION)
- `paper-mode-prompt.ts` — added PaperValidationPanel awareness
- `choice-yaml-prompt.ts` — added ChoiceTextarea custom input awareness

**Code layer patches:**
- `route.ts` — readArtifact description translated to English (language policy), force-inspect pre-router guardrail added (blocks search when exact source matched), exactSourceResolution observability logging added
- `paper-tools.ts` — [EXACT-SOURCE] observability logging for inspectSourceDocument, quoteFromSource, searchAcrossSources
- `orchestrator.ts` — fixed unhandled rejection leak in search fallback probe handling
- `deploy-skills-dev.py` — updated SRC_DIR/CHANGE_NOTE, added dev-only safety guard

### Bug Fixes Found During Testing
- `05-search-fallback-unhandled-rejection-fix.md` — probe .catch() re-throw → return status object
- `06-exact-source-tools-observability.md` — [EXACT-SOURCE] logging for 3 tools
- `07-search-across-sources-overclaim-fix.md` — 5-layer evidence discipline (v4)
- `08-exact-source-sourceid-matching-audit.md` — force-inspect pre-router guardrail

### Commits
1. `c81aa110` — feat: AI model awareness patches (main implementation)
2. `7bb20ea2` — fix: block search when exact source already matched, add evidence discipline guardrails

## Current State

### Dev DB (wary-ferret-59) versions
| Item | Version |
|------|---------|
| System prompt | v15 |
| gagasan-skill | v14 |
| topik-skill | v14 |
| outline-skill | v15 |
| abstrak-skill | v14 |
| pendahuluan-skill | v14 |
| tinjauan-literatur-skill | v13 |
| metodologi-skill | v13 |
| hasil-skill | v14 |
| diskusi-skill | v15 |
| kesimpulan-skill | v15 |
| pembaruan-abstrak-skill | v15 |
| daftar-pustaka-skill | v14 |
| lampiran-skill | v13 |
| judul-skill | v14 |

Dry-run: 14/14 passed.

### Pending Codex Review
Commit `7bb20ea2` is awaiting Codex review. The review prompt has been written (last message in session 1). Codex needs to check:
1. force-inspect guardrail placement safety
2. Regression risk from blocking search on force-inspect
3. Instruction layer 5-layer consistency
4. Residual limitation acceptability (same-turn sources)
5. Report 08 accuracy

### What Has NOT Been Done Yet
- **Prod deploy** — instruction layer not yet deployed to prod DB (basic-oriole-337)
- **UI retest after commit 7bb20ea2** — force-inspect guardrail + evidence discipline guardrails need user testing
- **Final commit** — may need additional commits based on Codex review and UI test results
- **Branch merge/PR** — not yet created

## Key Files

### Scope & Config
- `SCOPE.md` — full awareness mapping and implementation strategy
- `CLAUDE.md` — ACTIVE BRANCH SCOPE + IMPLEMENTATOR MANDATE
- `AGENTS.md` — AUDITOR & REVIEWER MANDATE (for Codex)

### Reference Files (deploy source)
- `.references/system-prompt-skills-active/updated-4/` — system prompt + 14 skill files

### Documentation
- `docs/tools-features-ui-ai-awarness/01-research-report.md` through `08-exact-source-sourceid-matching-audit.md`

### Deploy Script
- `scripts/deploy-skills-dev.py` — points to updated-4, has dev safety guard
- `scripts/deploy-skills-prod.py` — exists but NOT yet updated for this branch

### Verification Script
- `scripts/verify-probe-fix.mjs` — unhandled rejection reproduction test

## Process Notes
- Codex (OpenAI) acts as auditor/reviewer. All patches go through Codex review before being considered approved.
- User (Erik) runs UI tests manually. Claude does not claim UI behavior fixed — only patches instruction/code layer.
- Deploy flow: edit reference files → run deploy-skills-dev.py → Codex review → user UI test → iterate → when approved, deploy to prod.
- All instruction-layer fixes are probabilistic (model behavior, not deterministic code). Always state this upfront.
