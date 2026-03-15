# Search Mode Decision Redesign — Design Document

> **Date**: 2026-03-12
> **Branch**: `search-tool-skills-v2`
> **Status**: Draft

---

## Problem Statement

Three interconnected bugs in the paper workflow's web search integration:

1. **Deadlock** — Model promises search ("Mohon tunggu"), but search requires a new user message. User waits forever.
2. **Regex Fragility** — 60+ hardcoded regex patterns decide search mode for ACTIVE stages. Miss one AI phrasing → wrong decision → deadlock or missed search.
3. **Raw JSON Tool Output** — Compose phase runs `streamText` without `tools`, so model outputs `tool_code`/`tool_code_args` as text instead of actual tool calls.

These three are causally linked: (1) is caused by (2), and (3) is an independent but related architectural gap.

## Current Architecture

### Two Paths for Search Decisions

```
ACTIVE stages (6):  gagasan, topik, pendahuluan, tinjauan_literatur, metodologi, diskusi
  → Deterministic regex-based 3-layer protection (route.ts:1896-1958)
  → Uses: isStageResearchIncomplete, aiIndicatedSearchIntent, aiIndicatedSaveIntent,
          isUserConfirmation, isExplicitMoreSearchRequest, isExplicitSaveSubmitRequest

PASSIVE stages (8): outline, abstrak, hasil, kesimpulan, pembaruan_abstrak, daftar_pustaka, lampiran, judul
  → LLM router: decideWebSearchMode (route.ts:1041-1176)
  → Uses: generateText + Output.object + Zod schema
```

### Why the Regex Path Fails

The 3-layer priority ordering has a structural bug:

```
Priority 3b: userConfirms && !aiPromisedSearch → DISABLE search
Priority 4:  aiPromisedSearch                  → ENABLE search
```

If `aiIndicatedSearchIntent()` misses the AI's phrasing (e.g., "Apakah kamu setuju jika aku melakukan pencarian literatur..."), it returns `false`. Then `isUserConfirmation("ya")` returns `true` → Priority 3b fires → search disabled → deadlock.

This is **unfixable by adding more regex**. The problem is structural: regex cannot understand intent from arbitrary natural language.

### Compose Phase Gap

```
route.ts: enableWebSearch=true → executeWebSearch()
  → Phase 1: retriever searches (Perplexity/Google Grounding)
  → Phase 2: streamText WITHOUT tools (orchestrator.ts:217-221)
    → Model receives paper-mode-prompt.ts listing tool names
    → Model receives COMPOSE_PHASE_DIRECTIVE saying "no tools available"
    → Model WANTS to call tools → outputs JSON as text (fallback behavior)
```

## Proposed Architecture

### Core Change: Unified LLM Router for ALL Stages

Replace the dual-path architecture with a single LLM router for all stages:

```
ALL stages (ACTIVE + PASSIVE + chat):
  → Pre-LLM guardrails (data-based, structural)
  → LLM router: decideWebSearchMode
  → Post-decision: system note injection
```

### Why LLM Router Over Regex

| Criterion | Regex (current) | LLM Router (proposed) |
|-----------|----------------|----------------------|
| Language coverage | Fixed patterns, misses novel phrasing | Understands ANY phrasing |
| Maintenance | Add regex per new phrase | Zero maintenance |
| Architecture alignment | Violates "LLMs reason > hardcoded pipelines" | Aligned with architecture-constraints.md |
| Code complexity | 60+ regex, 8 functions, 70-line decision tree | Single function call |
| Proven | ACTIVE stages only (broken) | PASSIVE + chat (working) |

### Guardrails Retained (Pre-LLM)

These run BEFORE the LLM router. They are data-based or structural checks, not intent parsing:

| Guardrail | Type | Behavior |
|-----------|------|----------|
| `compileDaftarPustakaIntent` | Structural | Explicit tool name → force function tools |
| `forcePaperToolsMode` | Structural | No paper session → force function tools |
| `explicitSyncRequest` | Structural | Sync keywords → force function tools |

### Guardrails Moved to LLM Router Context

These become context passed to the router prompt, not hard gates:

| Signal | How it's passed |
|--------|----------------|
| `searchAlreadyDone` | Context line: "Previous search results exist for this stage" |
| `isStageResearchIncomplete` | Context line: "Stage needs N more references for field X" |
| `stagePolicy` | Context line: "Stage policy: ACTIVE (search encouraged) / PASSIVE (user must request)" |

### Guardrails Removed

| Function | Reason |
|----------|--------|
| `aiIndicatedSearchIntent` (11 regex) | LLM router understands intent natively |
| `aiIndicatedSaveIntent` (7 regex) | LLM router understands intent natively |
| `isExplicitSaveSubmitRequest` (8 regex) | LLM router understands intent natively |
| `isExplicitMoreSearchRequest` (11 regex) | LLM router understands intent natively |

### Functions Kept (Non-Search Uses)

**From `paper-search-helpers.ts`:**

| Function | Kept For | Notes |
|----------|----------|-------|
| `isUserConfirmation` | UI/UX flow detection | Not used for search routing. Currently only called in ACTIVE block being deleted — becomes unused in route.ts but kept in helpers for potential UI/UX use. |
| `isCompileDaftarPustakaIntent` | Pre-router guardrail | Explicit tool name detection |
| `getLastAssistantMessage` | General utility | After ACTIVE block removal, check if still used in route.ts. Remove import if dead code. |
| `STAGE_RESEARCH_REQUIREMENTS` | Data source for `isStageResearchIncomplete` | Not a hard gate |
| `isStageResearchIncomplete` | LLM router context | Passed as context signal, not hard gate |

**From `route.ts` (local functions):**

| Function | Kept For | Notes |
|----------|----------|-------|
| `isExplicitSearchRequest` | Router-failure fallback + PASSIVE policy gate | Lightweight regex fallback when LLM router fails. Also guards `isExplicitSyncRequest` and `isUserConfirmationMessage`. |
| `isExplicitSyncRequest` | Pre-router guardrail | Structural check for sync keywords |
| `isUserConfirmationMessage` | TBD | After removing `isUserConfirmation` param from router, check if still used elsewhere. Remove if dead code. |

### System Notes Disposition

| Note | Disposition |
|------|------------|
| `PAPER_TOOLS_ONLY_NOTE` | Keep for now — still injected when search disabled. Future migration candidate: move content to paper workflow SKILL.md when that skill exists (per handoff recommendation). |
| `getResearchIncompleteNote` | Keep — still injected when research incomplete |
| `getFunctionToolsModeNote` | Keep — still injected after search completed |

### Compose Phase Fix (Masalah 3)

**Decision: Option A — No tools in compose phase. Model saves on next turn.**

Rationale:
- Compose phase's job is to synthesize search results into response text
- Adding tools to compose would let model skip presenting results to user (violates "discuss first")
- Next turn: `searchAlreadyDone=true` → function tools mode → model has access to save tools
- This is already the natural flow; the bug is that model's prompt misleads it into attempting tool calls

Fix: Strengthen `COMPOSE_PHASE_DIRECTIVE` to explicitly say "present results to user, saving happens in a subsequent turn."

## LLM Router Prompt Changes

### Current prompt (PASSIVE stages only)

```
Stage policy rules:
- If policy = PASSIVE: enableWebSearch = true ONLY if user EXPLICITLY requests search.
- If policy = ACTIVE: enableWebSearch may be true if user needs factual data.
```

### Enhanced prompt (ALL stages)

Additional context lines when in paper mode:

```
STAGE CONTEXT:
- Research status: [incomplete/complete] — [requirement details if incomplete]
- Previous search: [done/not done] — [source count if done]
- Last AI message intent: [provided as recent message, LLM infers naturally]

Stage policy rules:
- ACTIVE: enable search if user requests OR if conversation needs factual data/references.
  Even if user sends a short confirmation, consider what the AI previously proposed.
- PASSIVE: enable search ONLY if user EXPLICITLY requests search.
- In both cases: if previous search exists AND research is complete, prefer false
  unless user explicitly asks for MORE search.
```

### Hard Guardrails in `decideWebSearchMode` — Changes

**Remove:**
- `isUserConfirmation && isPaperMode → false` — This is the ROOT CAUSE of the deadlock.
  When AI says "Shall I search?" and user says "ya", this guardrail kills the search.

**Keep:**
- None of the current hard guardrails should remain. All context should flow to the LLM.

**New behavior:** `searchAlreadyDone` becomes a context line in the prompt, not a hard return.

## Behavioral Changes (vs Current)

### ACTIVE stages — Major change
- **Before**: Regex-based 3-layer decision tree. Priority ordering bugs cause deadlocks.
- **After**: LLM router decides. Research status and search history passed as context. No hard gates except structural guardrails.

### PASSIVE stages — Minor relaxation
- **Before**: LLM router decides, BUT `isUserConfirmation` hard-returns `false` before router runs, AND `searchAlreadyDone` hard-returns `false` before router runs. PASSIVE also hard-gated by `explicitSearchRequest` regex after router.
- **After**: Both hard returns removed. Router decides with enriched context prompt that says "PASSIVE: ONLY if user EXPLICITLY requests." `isExplicitSearchRequest` regex kept as fallback when router fails.
- **Why this is safe**: Router prompt at temperature 0.2 is conservative. The instruction to only enable for explicit requests is strong. The regex fallback catches router failures.

### Chat mode (non-paper) — No change
- Was: LLM router with hard guardrails.
- Now: LLM router without hard guardrails. But chat mode never had `isUserConfirmation` or `searchAlreadyDone` guardrails anyway (those were `isPaperMode`-gated).

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| LLM router returns wrong decision | Temperature 0.2 + structured output + retry. Already proven for 8 PASSIVE stages. |
| Latency from extra LLM call for ACTIVE stages | Router call is fast (~200-500ms). Better than deadlock. |
| `searchAlreadyDone` no longer hard-blocks | Passed as strong context signal. LLM respects "prefer false" instruction. |
| Regression in PASSIVE stage behavior | PASSIVE stages now trust the LLM router decision (previously hard-gated by `explicitSearchRequest` regex). The router prompt explicitly says "PASSIVE: ONLY if user EXPLICITLY requests." Temperature 0.2 ensures conservative behavior. `isExplicitSearchRequest` remains as a fallback if router fails. |

## File Change Summary

| File | Change Type | Scope |
|------|------------|-------|
| `paper-mode-prompt.ts` | Fix | Replace deadlock instruction at line 210 |
| `route.ts` | Refactor | Remove ACTIVE stage override block (lines 1886-1958), enhance `decideWebSearchMode` prompt, remove hard guardrails inside router |
| `paper-search-helpers.ts` | Cleanup | Remove 4 unused regex functions, keep utils + system notes |
| `orchestrator.ts` | Fix | Strengthen COMPOSE_PHASE_DIRECTIVE |
| `__tests__/` | Add | Tests for unified router, regression tests |
