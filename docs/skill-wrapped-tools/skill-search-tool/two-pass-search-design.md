# Two-Pass Search Architecture Design

**Goal:** Make skill instructions actually work by separating search (Perplexity) from composition (Gemini). Perplexity finds sources silently; Gemini composes the response with skill-guided research methodology.

**Architecture:** Silent two-pass — Phase 1 (Perplexity searches, user sees loading state), Phase 2 (Gemini composes with skill instructions, streams to user). Single response, clean UX.

**Motivation:** Skill instructions (research methodology, source integration, narrative building) were injected into Perplexity Sonar, which ignores custom instructions. Moving them to Gemini's path only worked for follow-up turns — the primary search response was still 100% Perplexity. Two-pass ensures Gemini always composes the final response with skill guidance.

---

## Section 1: Data Flow

```
User message
    │
    ▼
Route decides: enableWebSearch = true
    │
    ▼
Phase 1: SEARCH (silent)
    ├─ UI shows "Mencari sumber..."
    ├─ Perplexity Sonar called (NO streaming to user)
    ├─ Wait for completion (await .text + .sources)
    ├─ Extract sources from perplexityResult.sources
    ├─ normalizeCitations() + validateWithScores()
    ├─ enrichSourcesWithFetchedTitles()
    ├─ Deduplicate
    └─ Result: ScoredSource[] (clean, validated)
    │
    ▼
Phase 2: COMPOSE (streamed)
    ├─ UI switches to "Menyusun jawaban..."
    ├─ Build messages:
    │   ├─ System prompt
    │   ├─ composeSkillInstructions(context)  ← SKILLS HERE
    │   ├─ Paper mode prompt (if applicable)
    │   ├─ SEARCH_RESULTS context (sources + raw text summary)
    │   └─ User messages
    ├─ Gemini streamText() → stream to user
    ├─ Gemini cites from provided sources
    └─ Citations written as data-cited-text / data-cited-sources
    │
    ▼
Phase 3: PERSIST
    ├─ Save message + sources to DB
    └─ Paper session: append references
```

Perplexity output text is NOT sent to user. Only its sources are forwarded to Gemini as context. Gemini composes from scratch using skill instructions.

---

## Section 2: Route.ts Changes

### What Changes

The web search path (currently line ~2248-2640) replaces direct Perplexity streaming with two-phase:

```typescript
// Phase 1: Silent search
const perplexityResult = streamText({ model: webSearchModel, messages: sanitizedMessages })
const fullText = await perplexityResult.text
const rawSources = await perplexityResult.sources

// Process sources (same pipeline as current)
const normalizedCitations = normalizeCitations(rawSources, 'perplexity')
const qualityResult = validateWithScores({ sources: ... })
const enrichedSources = await enrichSourcesWithFetchedTitles(...)
const deduped = deduplicateSources(enrichedSources)

// Phase 2: Gemini compose with skills
const skillContext = { isPaperMode, currentStage, hasRecentSources: true, availableSources: deduped }
const composeMessages = [
    { role: "system", content: systemPrompt },
    ...(paperModePrompt ? [...] : []),
    { role: "system", content: composeSkillInstructions(skillContext) },
    { role: "system", content: buildSearchResultsContext(deduped, fullText) },
    ...trimmedModelMessages,
]
const geminiResult = streamText({ model: primaryModel, messages: composeMessages })
// Stream Gemini to user
```

### What Does NOT Change

- Source extraction pipeline (normalizeCitations, validateWithScores, enrichment, dedup)
- Source persistence (saveAssistantMessage, appendSearchReferences)
- Fallback path (Grok) — same treatment: silent search → Gemini compose
- Normal mode (enableWebSearch = false) — unaffected

### New Function

`buildSearchResultsContext(sources, rawText)` — formats sources + summary as context for Gemini:

```
## SEARCH RESULTS
You have access to the following sources from web search.
Use ONLY these sources for citations. Do not fabricate URLs.

Sources:
1. [title] - url (tier: academic)
2. [title] - url (tier: institutional)
...

Raw search summary (for context, do not copy verbatim):
[Perplexity's raw text — as reference, not for copying]
```

---

## Section 3: UI Loading States

Extend existing `data-search` status event:

```
Phase 1 start:  { type: "data-search", data: { status: "searching" } }
Phase 1 done:   { type: "data-search", data: { status: "composing", sourceCount: N } }
Phase 2 start:  Gemini streaming begins (text-delta chunks)
Phase 2 done:   data-cited-text + data-cited-sources (same as current)
```

One new status: `"composing"` — frontend handles this string in the search status component.

User experience:
1. "Mencari sumber..." (spinner) — during Perplexity silent search
2. "Menyusun jawaban dari N sumber..." — brief transition before Gemini streams
3. Text streaming from Gemini — like normal chat
4. Citations appear at end — same as current

Minimal frontend change — handle one new status string.

---

## Section 4: Error Handling & Fallback

| Failure | Handling |
|---------|----------|
| Perplexity fails (Phase 1) | Fallback to Grok silent search. If Grok also fails → Gemini responds without sources (same as current normal mode) |
| Sources empty (Phase 1 succeeds but 0 usable sources) | Gemini composes without search context, still with skill instructions. Gemini can say "sources not found" |
| Gemini fails (Phase 2) | Fallback to OpenRouter model compose. If that also fails → return error response |

**Principle:** Graceful degradation. Worst case = normal mode without sources. User never sees blank screen.

**Timeouts:**
- Perplexity silent search: max 15 seconds (same as current)
- Source enrichment: max 2.5 seconds per URL (already exists)
- Gemini compose: standard streaming timeout

No retry logic needed — fallback chain is sufficient: Perplexity → Grok → Gemini without sources.
