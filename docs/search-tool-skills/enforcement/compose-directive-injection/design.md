# Design: Compose Directive Injection

> Fix compose model "hanging" behavior — model generates search promises instead of synthesizing results.

## Problem Statement

In the two-pass web search architecture (Phase 1: silent search → Phase 2: compose with results), the compose model (Gemini) sometimes generates text like *"Beri aku waktu sebentar ya untuk melakukan pencarian"* instead of synthesizing the search results already provided in its context.

The user sees:
1. AI says "let me search for you"
2. UI shows "MENEMUKAN 16 RUJUKAN" (search done, 16 sources attached)
3. **No synthesis content** — response ends with empty promise

This is NOT a code/pipeline bug. Phase 1 works perfectly (sources retrieved, normalized, injected). The problem is that the compose model doesn't know it's in a compose-only phase and should present results immediately.

## Root Cause Analysis

### RC-1: No compose-only directive (CRITICAL — 70%)

The compose phase receives `searchResultsContext` with passive language:

```
## SEARCH RESULTS
You have the following sources from web search.
Use ONLY these sources for citations.
```

No message says: "Search is complete. Present results NOW. Do NOT promise to search."

The model has no signal that it's in a post-search compose phase. It treats the search results as background context, not as the primary material to synthesize.

### RC-2: Tool references without tools (CRITICAL — 25%)

The orchestrator passes `paperModePrompt` unfiltered to compose phase. This prompt references:
- `startPaperSession`, `updateStageData`, `submitStageForValidation`, `createArtifact`
- "web search mandatory for research stages"
- Dialog-first principles ("tanya dulu sebelum generate")

But compose phase calls `streamText()` **without tools**:

```typescript
const composeResult = streamText({
    model: config.composeModel,
    messages: composeMessages,
    ...config.samplingOptions,
    // NO tools parameter
})
```

Model receives instructions to use tools that don't exist → falls back to narrating what it *would* do → "Beri aku waktu sebentar ya untuk melakukan pencarian."

### RC-3: Conversation pattern continuation (MEDIUM — 5%)

`composeMessages` includes conversation history where previous turns may have established "I'll search" → results patterns. Compose model continues this pattern instead of switching to synthesis mode. This is minor if RC-1 and RC-2 are fixed (explicit directive overrides pattern continuation).

## Solution: Approach A — Compose Directive Injection

### Design Principle

Follow the project's architecture constraint: **Skills/instructions provide intelligence, not code.** The fix is an instruction-layer change in the orchestrator's compose context assembly — not a regex filter, not a code pipeline step.

### Component 1: Compose Phase Directive

A new system message injected by the orchestrator **immediately before** `searchResultsContext`. This is the PRIMARY fix.

**Purpose:** Tell the compose model exactly what phase it's in and what's expected.

**Content requirements:**
- State explicitly: search is DONE, results are below
- State explicitly: DO NOT promise to search, DO NOT announce searching
- State explicitly: synthesize and present results NOW
- State explicitly: tools are NOT available in this phase — do not reference them
- Must be in English (per architecture constraint: model instructions in English, Indonesian for user-facing output only)
- Must be concise — this is mode awareness, not domain knowledge
- Must not duplicate SKILL.md content (SKILL.md handles HOW to compose; this handles WHEN/WHAT phase)

**Injection point in orchestrator.ts:**

```typescript
// CURRENT (broken):
const composeSystemMessages = [
    { role: "system", content: config.systemPrompt },
    ...(config.paperModePrompt ? [{ role: "system", content: config.paperModePrompt }] : []),
    ...(config.paperWorkflowReminder ? [{ role: "system", content: config.paperWorkflowReminder }] : []),
    ...(skillInstructions ? [{ role: "system", content: skillInstructions }] : []),
    { role: "system", content: searchResultsContext },
    ...(config.fileContext ? [{ role: "system", content: `File Context:\n\n${config.fileContext}` }] : []),
]

// AFTER (fixed):
const composeSystemMessages = [
    { role: "system", content: config.systemPrompt },
    ...(composePaperModePrompt ? [{ role: "system", content: composePaperModePrompt }] : []),
    // paperWorkflowReminder EXCLUDED from compose (it says "call startPaperSession" — irrelevant)
    ...(skillInstructions ? [{ role: "system", content: skillInstructions }] : []),
    { role: "system", content: COMPOSE_PHASE_DIRECTIVE },  // ← NEW
    { role: "system", content: searchResultsContext },
    ...(config.fileContext ? [{ role: "system", content: `File Context:\n\n${config.fileContext}` }] : []),
]
```

**Key positioning:** Directive comes AFTER skill instructions (so model knows HOW to compose from SKILL.md) and BEFORE search results (so model reads results in the right mindset).

### Component 2: Paper Mode Prompt Filtering for Compose

The orchestrator filters `config.paperModePrompt` before injecting into compose context. This is NOT a change to `getPaperModeSystemPrompt()` — the original function stays intact for non-compose contexts.

**What to strip:**
- Tool reference sections (tool names, "tools tersedia" blocks)
- "Web search mandatory" instructions
- `paperWorkflowReminder` entirely (it says "call startPaperSession IMMEDIATELY" — wrong for compose)

**What to keep:**
- Stage label and status context
- APA citation format rules
- Stage-specific content guidance (structure expectations, depth requirements)
- Memory digest
- Stage data context (formatted by `formatStageData`)
- Artifact summaries

**Implementation approach:** String-based section filtering in orchestrator. `paperModePrompt` is a structured string with clear section markers. The orchestrator can strip sections containing tool references while preserving knowledge sections.

**Alternative considered and rejected:** Adding a `context: "compose"` parameter to `getPaperModeSystemPrompt()` — rejected because it adds complexity to an already 254-line function, creates coupling between orchestrator and prompt internals, and the filtering is simple enough to do at the orchestrator level.

### Component 3: Strengthened Search Results Context

Modify `buildSearchResultsContext()` in `search-results-context.ts` to use imperative language.

**Current (passive):**
```
## SEARCH RESULTS
You have the following sources from web search.
Use ONLY these sources for citations. Do not fabricate or guess URLs.
```

**After (imperative):**
```
## SEARCH RESULTS (COMPLETED)
Web search has been executed. The following sources were retrieved.
You MUST synthesize these sources in your response. Do not fabricate or guess URLs.
```

This is a minor reinforcement — the compose directive (Component 1) is the primary fix. But strengthening this language costs nothing and adds defense-in-depth.

## What Does NOT Change

| Component | Reason |
|-----------|--------|
| `getPaperModeSystemPrompt()` | Works correctly for its designed context. Filtering happens in orchestrator. |
| `SKILL.md` (web-search-quality) | Already has good RESPONSE COMPOSITION instructions. Compose directive handles mode awareness. |
| System prompt (database) | General persona prompt — not the place for compose-specific instructions. |
| `paper-search-helpers.ts` | Search decision helpers — orthogonal to compose behavior. |
| `search-execution-mode.ts` | Mode resolution — orthogonal. |
| Retriever implementations | Simple executors — not involved in compose. |
| Citation normalizer | Data transform — not involved in compose behavior. |
| Client-side components | Search status UI works correctly. Problem is server-side compose content. |

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/ai/web-search/orchestrator.ts` | MODIFY | Add compose directive injection, filter paperModePrompt, exclude paperWorkflowReminder |
| `src/lib/ai/search-results-context.ts` | MODIFY | Strengthen language from passive to imperative |

**Total: 2 files modified. Zero new files.**

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Compose directive too aggressive — model ignores SKILL.md guidance | Low | Directive is about mode awareness only, not composition style. SKILL.md handles style. |
| paperModePrompt filtering strips too much | Medium | Filter by known tool-reference patterns. Keep all non-tool sections. Test with paper mode active. |
| Fix works for paper mode but not chat mode | Low | Compose directive is mode-agnostic. searchResultsContext strengthening applies to all search responses. |
| Model still occasionally generates search promises | Low | Multiple layers of defense: directive + filtered prompt + strengthened context. If still happens, strengthen directive wording. |

## Success Criteria

1. Compose model NEVER generates "akan mencari" / "beri waktu untuk pencarian" / search promise text when search results are already in context
2. Compose model synthesizes ALL provided sources into a coherent response
3. Paper mode APA citation rules still respected (not stripped by filtering)
4. Stage-specific guidance still respected (not stripped by filtering)
5. Non-paper-mode (chat) search responses also improved (compose directive applies universally)
6. SKILL.md RESPONSE COMPOSITION instructions still followed (not overridden by directive)
