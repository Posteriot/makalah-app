# Regex Elimination & Instruction Strengthening — Design Document

> **Date**: 2026-03-12
> **Branch**: `search-tool-skills-v2`
> **Status**: Draft
> **Prerequisite**: Search Mode Decision Redesign (Phase 1) — completed

---

## Problem Statement

Phase 1 (Search Mode Decision Redesign) unified search decisions under a single LLM router, removing 60+ regex patterns for ACTIVE stage intent detection. However, **34 regex patterns remain** across 4 functions:

| Function | Location | Patterns | Current Use |
|----------|----------|----------|-------------|
| `isExplicitSearchRequest` | `route.ts:420` (local) | 14 | Router-failure fallback + PASSIVE stage OR-gate |
| `isExplicitSyncRequest` | `route.ts:441` (local) | 6 | Pre-router guardrail (force disable search) |
| `isCompileDaftarPustakaIntent` | `paper-search-helpers.ts:95` | 5 | Pre-router guardrail (force disable search) |
| `isExplicitSaveSubmitRequest` | `paper-search-helpers.ts:75` | 9 | Submit validation gate (downstream, not search decision) |

Additionally, `hasPreviousSearchResults` (route.ts:950-1006) contains **3 weak-signal regex** for detecting search-done phrases in Indonesian (`/berdasarkan hasil pencarian/`, `/saya telah melakukan pencarian/`, `/rangkuman temuan/`). These appear in two code paths (ACTIVE and PASSIVE stage checks).

**Total: 40 regex patterns** that should be eliminated per the principle:

> "AI works better when you give tools and freedom instead of forcing them into rigid, hand-designed workflows — because general learning systems scale better." — Boris Cherny (Anthropic)

### Why Regex Must Go

1. **Regex can't anticipate LLM language variants.** Models generate infinite phrasings. Every missed pattern is a potential deadlock or wrong decision.
2. **Regex are shadow instructions.** They encode assumptions about what the model will say. If instructions are strong, regex are redundant. If instructions are weak, regex can't save you.
3. **Architecture violation.** CLAUDE.md: "LLMs reason better than hardcoded pipelines." README.md line 58-59 explicitly marks `PAPER_TOOLS_ONLY_NOTE` and `isStageResearchIncomplete` as anti-patterns.

## Proposed Architecture

### Core Principle: Instructions Shape Output, Router Reads Intent

```
Layer 1: Strong instructions → Model outputs clear, predictable intent signals
Layer 2: LLM router reads conversation → Understands intent without regex
Layer 3: Safe defaults on router failure → No regex fallback needed
```

### Per-Function Disposition

#### 1. `isExplicitSearchRequest` (14 regex) → REMOVE

**Current usage (route.ts:1881-1900):**
```typescript
const routerFailed = ["router_invalid_json_shape", "router_json_parse_failed"].includes(webSearchDecision.reason)
const explicitSearchRequest = lastUserContent ? isExplicitSearchRequest(lastUserContent) : false
const explicitSearchFallback = routerFailed && explicitSearchRequest

// PASSIVE stage gate:
stagePolicy === "passive" ? explicitSearchRequest || webSearchDecision.enableWebSearch : ...

// Final decision:
searchRequestedByPolicy = stagePolicyAllowsSearch
    && (webSearchDecision.enableWebSearch || explicitSearchFallback || explicitSearchRequest)
```

**Problem:** Used as (a) router-failure fallback and (b) PASSIVE stage OR-gate. Both uses assume regex can detect search intent better than the LLM router — contradicts the whole Phase 1 redesign.

**Replacement:**
- **Router failure fallback:** Default to `enableWebSearch=true` on router failure. Rationale: search is never harmful (compose phase synthesizes results; if no results found, compose says so). A false-positive search is far less harmful than a false-negative deadlock.
- **PASSIVE stage gate:** Trust the router. The router prompt already says `"PASSIVE policy: enable search ONLY if the user EXPLICITLY requests it."` Temperature 0.2 makes this conservative. No regex backup needed.
- **Instruction strengthening:** Router prompt enhanced with explicit examples of search vs non-search requests. Stage skills reinforced with clear "when to request search" guidance.

#### 2. `isExplicitSyncRequest` (6 regex) → MOVE TO ROUTER

**Current usage (route.ts:1830-1831):**
```typescript
const explicitSyncRequest = !!paperModePrompt && isExplicitSyncRequest(lastUserContent)
```
Pre-router guardrail that short-circuits to disable search and force sync tool.

**Problem:** Indonesian sync patterns ("sinkronkan", "cek state", "status sesi") are finite and user-generated (not model-generated), which makes regex slightly more defensible here. But the LLM router can handle this trivially.

**Replacement:**
- **Extend router schema** to include `mode: "search" | "tools" | "sync"` (or add sync detection to the router prompt context).
- **Router prompt addition:** `"If user requests session sync (e.g., 'sinkronkan', 'cek state', 'status sesi'), output enableWebSearch=false with reason='sync_request'."`
- **Route.ts:** After router returns, check `reason.includes("sync")` to set `shouldForceGetCurrentPaperState`.

#### 3. `isCompileDaftarPustakaIntent` (5 regex) → MOVE TO ROUTER

**Current usage (route.ts:1836, 1847-1851):**
```typescript
const compileDaftarPustakaIntent = isCompileDaftarPustakaIntent(lastUserContent)
if (compileDaftarPustakaIntent && !!paperModePrompt) {
    searchRequestedByPolicy = false
    activeStageSearchReason = "compile_daftar_pustaka_intent"
    ...
}
```
Pre-router guardrail that forces function-tools mode when user wants to compile bibliography.

**Problem:** Detects a specific tool name ("compileDaftarPustaka") — more structural than linguistic. However, the user might express this in many ways ("buat daftar pustaka", "compile bibliography", "finalize references", etc.).

**Replacement:**
- **Router prompt addition:** `"If the user wants to compile/preview bibliography (daftar pustaka), output enableWebSearch=false with reason='compile_daftar_pustaka'. This intent means the user wants to use the compileDaftarPustaka tool, not web search."`
- **Route.ts:** After router returns, check `reason.includes("compile_daftar_pustaka")` to set the compile-specific note.

#### 4. `isExplicitSaveSubmitRequest` (9 regex) → MOVE TO ROUTER

**Current usage (route.ts:1986, 1996):**
```typescript
shouldForceSubmitValidation = !enableWebSearch && !!paperModePrompt
    && !shouldForceGetCurrentPaperState
    && isExplicitSaveSubmitRequest(lastUserContent)
    && paperSession?.stageStatus === "drafting"
    && hasStageRingkasan(paperSession) && hasStageArtifact(paperSession)

missingArtifactNote = ... && isExplicitSaveSubmitRequest(lastUserContent) ? ... : ""
```

**Problem:** Save/submit patterns are user-generated ("simpan", "submit", "approve") — finite set. But the router already sees the full conversation and can detect save intent.

**Replacement:**
- **Router prompt addition:** `"If the user wants to save/submit/approve the current draft, output enableWebSearch=false with reason containing 'save_submit'. Save/submit signals: 'simpan', 'save', 'submit', 'approve', 'disetujui', 'selesaikan tahap'."`
- **Route.ts:** After router returns, check `reason.includes("save_submit")` + data guards (`stageStatus === "drafting"`, `hasStageRingkasan`, `hasStageArtifact`) to set `shouldForceSubmitValidation`.
- **Data guards remain** — they are structural checks (does the stage have enough data to submit?), not intent detection.

#### 5. `hasPreviousSearchResults` weak-signal regex (3 patterns) → REMOVE

**Current usage (route.ts:979-1003):**
```typescript
if (/berdasarkan hasil pencarian/i.test(content)) return true
if (/saya telah melakukan pencarian/i.test(content)) return true
if (/rangkuman temuan/i.test(content)) return true
```
Weak signal fallback when `sources` field is absent. Used in both ACTIVE and PASSIVE code paths.

**Problem:** These detect Indonesian phrases that the model might or might not use. The primary signal (`hasSources` — checking the `sources` array) is authoritative and data-based. These regex are a fragile fallback for edge cases.

**Replacement:**
- **Remove all 3 regex lines.** The `sources` field check is the authoritative signal.
- **Strengthen compose phase instructions** to ensure the `sources` field is always populated when search was performed. If `sources` is empty, it means search genuinely returned nothing.
- **Accept the edge case:** If compose phase produced text but `sources` was lost somehow, `searchAlreadyDone` returns false → router decides → worst case: one extra search. This is acceptable — better than false positives from phrase matching.

### Router Prompt Enhancement

Current router prompt handles basic search vs no-search decisions. Enhanced prompt adds:

```
INTENT CLASSIFICATION — in addition to search vs no-search, identify these specific intents:

1. SYNC REQUEST: User wants to sync/check session state (e.g., "sinkronkan", "cek state",
   "status sesi", "lanjut dari state"). Output: enableWebSearch=false, reason must contain "sync_request".

2. COMPILE BIBLIOGRAPHY: User wants to compile/preview daftar pustaka (bibliography).
   Output: enableWebSearch=false, reason must contain "compile_daftar_pustaka".

3. SAVE/SUBMIT: User wants to save, submit, or approve the current draft (e.g., "simpan",
   "save", "submit", "approve", "disetujui", "selesaikan tahap").
   Output: enableWebSearch=false, reason must contain "save_submit".

4. SEARCH: User requests search, references, or factual data. Or AI needs factual data
   for its response. Output: enableWebSearch=true, reason explains what data is needed.

5. DISCUSSION: Pure discussion, opinion, or workflow action that doesn't need search.
   Output: enableWebSearch=false, reason explains why no search needed.

Priority: sync_request > compile_daftar_pustaka > save_submit > search > discussion
```

### Instruction Strengthening Plan

**Where to strengthen:**

1. **Router prompt** (`decideWebSearchMode` in route.ts) — Add intent classification guidance above.

2. **Paper mode prompt** (`paper-mode-prompt.ts`) — Already fixed in Phase 1. No further changes needed.

3. **Stage skills (DB)** — Each stage skill should include clear guidance on:
   - When search is needed for this stage
   - How to request search (consistent format)
   - When to save/submit
   - This shapes model output → makes router's job easier

4. **System notes** (`PAPER_TOOLS_ONLY_NOTE`, `getResearchIncompleteNote`) — These remain as runtime context injection. They tell the model what's available NOW, not what to say. This is appropriate — it's state information, not behavior shaping.

### What Does NOT Change

| Component | Why it stays |
|-----------|-------------|
| `STAGE_RESEARCH_REQUIREMENTS` | Data definition, not regex. Describes what fields each stage needs. |
| `isStageResearchIncomplete` | Data-based check using `STAGE_RESEARCH_REQUIREMENTS`. Passes result as router context. |
| `hasPreviousSearchResults` (sources field check) | Data-based: checks if `sources` array exists in messages. Not regex. |
| `getStageSearchPolicy` | Structural: maps stage ID to policy string. Not regex. |
| `searchAlreadyDone` (stageData evidence) | Data-based: checks stageData fields for search evidence. Not regex. |
| System notes (`PAPER_TOOLS_ONLY_NOTE`, etc.) | Runtime state injection, not intent detection. Future migration to SKILL.md is separate concern. |
| Data guards (`hasStageRingkasan`, `hasStageArtifact`, `stageStatus === "drafting"`) | Structural/data checks for submit validation. |

### Router Failure Strategy

**Current:** Router fails → regex fallback (`isExplicitSearchRequest`).

**Proposed:** Router fails → safe default.

The router has 3 layers of resilience:
1. Structured output with `Output.object({ schema })` (attempt 1)
2. Retry (attempt 2)
3. Freeform `generateText` + JSON parse (attempt 3)

All three must fail for router failure. In that case:

```typescript
// Router triple failure → safe default
return {
    enableWebSearch: true,  // search is never harmful
    confidence: 0,
    reason: "router_failure_safe_default"
}
```

**Why `enableWebSearch=true`:**
- Search is never harmful — compose phase synthesizes results, user sees response
- False-positive search: user sees search results they didn't need (minor UX cost, ~2-3s latency)
- False-negative search: model hallucinates references or deadlocks (critical bug)
- The asymmetry strongly favors defaulting to search

**Exception:** If `paperModePrompt` exists and stagePolicy is "none" (completed), default to `false` instead. A completed paper doesn't need search.

## Behavioral Changes

### Before (Phase 1 state)

```
Pre-router guardrails:
  compileDaftarPustakaIntent (5 regex) → force tools
  forcePaperToolsMode (structural) → force tools
  explicitSyncRequest (6 regex) → force tools

Router:
  LLM router decides search/no-search

Post-router:
  routerFailed + isExplicitSearchRequest (14 regex) → fallback enable search
  PASSIVE gate: isExplicitSearchRequest OR router → enable search

Downstream:
  isExplicitSaveSubmitRequest (9 regex) → force submit validation

searchAlreadyDone:
  sources field (data) + 3 weak-signal regex → boolean
```

### After (Phase 2)

```
Router:
  LLM router decides search/tools/sync/compile/save_submit
  Router failure → safe default (enableWebSearch=true)

Post-router:
  forcePaperToolsMode (structural) → force tools [kept — no regex]
  reason contains "sync_request" → force sync
  reason contains "compile_daftar_pustaka" → force compile tools mode
  reason contains "save_submit" + data guards → force submit validation

searchAlreadyDone:
  sources field (data) only — no weak-signal regex
```

**Key simplification:** Pre-router guardrails collapse into the router itself. Post-router logic reads the router's `reason` field instead of running separate regex.

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Router misclassifies sync as discussion | Medium | Router prompt includes explicit sync examples. Temperature 0.2. Safe: worst case user retries. |
| Router misclassifies compile intent | Low | compileDaftarPustaka is a distinctive phrase. Router will easily recognize it. |
| Router misclassifies save as search | Medium | Router prompt includes save examples. Data guards (`hasStageRingkasan`, etc.) provide secondary protection. |
| Router triple failure | Very low | Three resilience layers. If all fail, safe default to search. |
| `searchAlreadyDone` false negative (sources lost) | Low | Authoritative `sources` field check remains. Only weak regex removed. Worst case: one extra search. |
| Stage skills not yet strengthened | Medium | Router prompt handles intent classification independently. Skill strengthening is additive improvement, not blocker. |

## File Change Summary

| File | Change Type | Scope |
|------|------------|-------|
| `route.ts` | Refactor | Remove `isExplicitSearchRequest`, `isExplicitSyncRequest` local functions. Remove regex fallback logic. Enhance router prompt with intent classification. Refactor post-router logic to read `reason` field. Remove weak-signal regex from `hasPreviousSearchResults`. |
| `paper-search-helpers.ts` | Cleanup | Remove `isCompileDaftarPustakaIntent`, `isExplicitSaveSubmitRequest`. Update file header. |
| `__tests__/search-mode-decision.test.ts` | Update | Remove tests for deleted functions. Add tests for router reason-based intent routing. |
| `architecture-constraints.md` | Update | Reflect full regex elimination. |
