# Handoff: Deferred Issues Investigation — Stage 1 Gagasan

**Branch:** `agent-harness`
**HEAD:** Run `git log --oneline -5` to verify
**Date:** 2026-04-19
**Session scope:** Investigation only — hypotheses ready for next session implementation

---

## Completed in this session (5 commits)

| Commit | Fix |
|--------|-----|
| `bbbe4e27` | Block "ambil.ide" autolink + prevent duplicate createArtifact (TOCTOU race) |
| `1b708514` | Filter invalidated artifacts from list queries (ghost artifact + version collision) |
| `c1ddde00` | Trigger naskah rebuild saat cancel |
| `3761fb87` | Preserve search references across cancelChoiceDecision |
| `ec4fb430` | Block phantom auto-approve after cancel-approval |

---

## Deferred Issue 2: Google Grounding 0 Citations

### Root Cause (verified)
Gemini model **does not consistently call** the `google_search` tool. When it doesn't, `groundingMetadata` is empty → 0 citations → orchestrator treats as failure → fallback to Perplexity.

### Key Code Locations
| Component | File | Lines | Finding |
|-----------|------|-------|---------|
| Tool config | `src/lib/ai/web-search/retrievers/google-grounding.ts` | 85-89 | `google.tools.googleSearch({})` — empty config, no enforcement |
| Chain builder | `src/lib/ai/web-search/config-builder.ts` | 28-66 | Priority-sorted chain from DB config |
| 0-citation logic | `src/lib/ai/web-search/orchestrator.ts` | 379-381 | Treats 0 sources as failure |
| Metadata parser | `src/lib/citations/normalizer.ts` | 138-211 | Expects `groundingChunks` + `groundingSupports` |
| Existing doc | `docs/search-fetch-rag-jsonRenderer-reinforcement/stream-delivery-gap/handoff-nlp5-nlp7.md` | 50-70 | Previously documented as NLP-7 |

### Hypothesis: 3-part fix

**H1: Swap chain order** (immediate, DB config change)
- Move Perplexity to priority=1, Google Grounding to priority=2
- Pro: eliminates 2s waste on every search turn
- Con: Perplexity becomes the default (different cost profile)
- Implementation: update `webSearchRetrievers` array in Convex DB config

**H2: Early fail detection** (code change)
- After 3s of streaming without grounding metadata, fail the retriever early
- Save 4-7s per failed attempt
- Location: `orchestrator.ts` probe logic around line 321-332

**H3: Investigate grounding enforcement** (research)
- Check if `@ai-sdk/google` supports `forceGrounding` or `toolChoice: required`
- Try passing parameters to `googleSearch({})` to force tool invocation
- Check Gemini API docs for grounding-specific flags

### Recommendation for next session
Start with H1 (swap chain in DB), measure. If Google Grounding still needed, implement H2 (early fail). H3 is research-dependent on SDK capabilities.

---

## Deferred Issue 3: FetchWeb Timeout for .ac.id Journals

### Root Cause (verified)
Primary fetch uses Node.js `fetch()` with 5s timeout. Indonesian academic domains (.ac.id) consistently timeout due to network routing from deployment region (likely US Vercel) to Indonesian servers. Tavily fallback succeeds because its API servers have different routing.

### Key Code Locations
| Component | File | Lines | Finding |
|-----------|------|-------|---------|
| Timeout constants | `src/lib/ai/web-search/content-fetcher.ts` | 54-60 | `HTML_STANDARD_TIMEOUT_MS = 5000` |
| Route classification | `src/lib/ai/web-search/content-fetcher.ts` | 891-923 | `.ac.id` NOT in `isAcademicWallHost()` → defaults to `html_standard` |
| Timeout application | `src/lib/ai/web-search/content-fetcher.ts` | 331-342 | `getRouteTimeoutMs()` switch |
| Orchestrator call | `src/lib/ai/web-search/orchestrator.ts` | 564 | Passes `timeoutMs: 5_000` |
| Tavily fallback | `src/lib/ai/web-search/content-fetcher.ts` | 671-690 | `client.extract(urls)` — no local timeout constraint |
| Headers | `src/lib/ai/web-search/content-fetcher.ts` | 62-67 | User-Agent mimics Chrome browser |

### Hypothesis: 2 options

**H1: Route .ac.id directly to Tavily** (recommended)
- Add `isIndonesianAcademicDomain()` check
- Skip primary fetch for `.ac.id` domains, go straight to Tavily
- Saves 5s per .ac.id URL that would timeout
- Location: `content-fetcher.ts`, add domain detection + routing
- Con: uses Tavily credits, but these domains ALWAYS need Tavily anyway

**H2: Increase timeout to 10s for .ac.id** (alternative)
- Add .ac.id to a new route category with higher timeout
- Pro: gives slow networks time
- Con: still blocks 10s on failure before Tavily kicks in

### Why Tavily succeeds
Tavily API servers fetch from their own infrastructure (different IP, likely US/EU-based with better peering to Indonesian ISPs). They also handle their own timeouts (30-60s) and may have whitelisted IPs.

### Recommendation for next session
Implement H1: route .ac.id directly to Tavily. One function + routing change in `content-fetcher.ts`.

---

## Deferred Issue 4: Latency & Robustness (7 items)

### Item 1: Query/result delivery latency 20-53s

**Root cause:** Sequential pipeline — Phase 1 (retriever, 7-26s) → Phase 1.5 (fetch, 5-6s) → Phase 2 (compose, 3-8s). User sees nothing until Phase 2 starts streaming.

**Location:** `src/lib/ai/web-search/orchestrator.ts` lines 243-1091

**Hypothesis:** Latency is inherent to the pipeline architecture. Fix options:
- Streaming status indicators to user during Phase 1/1.5 (UX, not speed)
- Parallel Phase 1 + Phase 1.5 (fetch starts before retriever completes) — complex
- Reduce retriever chain failures (see Issue 2 — Google Grounding wastes 2s)

**Fixability:** Medium — mostly UX improvement, true speed gains require architectural changes.

### Item 2: Stream gap 16.7s (reasoning between)

**Root cause:** Post-tool model thinking time. After createArtifact completes, model thinks 2-16s before emitting text.

**Location:** `src/lib/chat-harness/executor/build-step-stream.ts` lines 984-989

**Hypothesis:** Inherent model behavior. The gap is legitimate reasoning time (model deciding next step after tool execution). Not fixable without changing model behavior.

**Fixability:** Not fixable (model behavior).

### Item 3: submitStageForValidation before artifact ready

**Root cause:** Model calls submitStageForValidation before createArtifact completes. Auto-rescue handles it but wastes a round-trip.

**Location:** `src/lib/chat-harness/shared/auto-rescue-policy.ts` lines 14-53

**Hypothesis:** Already handled by auto-rescue. Could be reduced by:
- Adding tool dependency hints in the tool schema
- Softening the "call NOW" instruction (partially done in commit `bbbe4e27`)

**Fixability:** Low priority — auto-rescue works correctly.

### Item 4: Recovery leakage ("Maaf, ada kendala teknis")

**Root cause:** Model emits error narration before artifact succeeds. Guard already in place.

**Location:** `src/lib/chat/choice-outcome-guard.ts` line 23 + `build-step-stream.ts` lines 1013-1029

**Hypothesis:** Already fixed. The `sanitizeChoiceOutcome()` strips recovery paragraphs and replaces with artifact-ready confirmation via `streamContentOverrideRef`. Monitor for false positives.

**Fixability:** Already fixed.

### Item 5: Artifact ordering verdict=reversed (~2.5s gap)

**Root cause:** Artifact tool completes BEFORE final text stream closes. Model emits commentary text AFTER artifact signals. Consistent ~2.5s gap = post-tool thinking time.

**Location:** `src/lib/chat-harness/executor/build-step-stream.ts` lines 205-265

**Hypothesis:** Structural issue. Fix options:
- Client-side reordering (detect reversed verdict, delay artifact panel reveal until text settles) — Medium
- Instruction: "emit all text BEFORE calling tools" — probabilistic, not reliable
- Current: verdict is logged but NOT acted upon by UI

**Fixability:** Medium — needs client-side compensation logic.

### Item 6: UI skeleton flicker after settled state

**Root cause:** `isAwaitingAssistantStart` not reset on message arrival, only on `status="submitted"`. Convex reactive query re-fetch between response end and status settle causes skeleton to briefly reappear.

**Location:** `src/components/chat/ChatWindow.tsx` lines 1478-1480, 2970-2992

**Hypothesis:** Consolidate skeleton logic to single source of truth:
```tsx
// Instead of three-way condition:
if (isHistoryLoading || isConversationLoading || isAwaitingAssistantStart) && messages.length === 0
// Use:
if (messages.length === 0 && !hasEverReceivedMessages)
```

**Fixability:** Low-Medium — state management cleanup.

### Item 7: Plan task count shift (1/2 → 3/4 → 5/5)

**Root cause:** Model refines plan mid-turn. Each `plan-spec` block replaces the previous one. Last-seen plan wins (correct behavior).

**Location:** `src/lib/ai/harness/plan-spec.ts` lines 26-29, `build-step-stream.ts` line 740

**Hypothesis:** Expected model behavior. Model discovers more tasks as it executes. Not a bug unless:
- Conflicting task labels between plan blocks (not observed)
- Final saved plan doesn't match last emitted block (not observed)

**Fixability:** Not a bug — model behavior.

---

## Priority Ranking for Next Session

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Google Grounding chain swap (Issue 2, H1) | DB config change | Saves 2s per search turn |
| 2 | .ac.id → Tavily direct routing (Issue 3, H1) | 1 function + routing | Saves 5s per .ac.id URL |
| 3 | Skeleton flicker (Issue 4, Item 6) | State cleanup | UX polish |
| 4 | Artifact ordering compensation (Issue 4, Item 5) | Client logic | UX polish |
| 5 | Early fail for Google Grounding (Issue 2, H2) | Orchestrator change | Saves 4-7s when GG fails |
| 6 | Latency UX indicators (Issue 4, Item 1) | UI components | Perceived speed |

Items NOT to fix (inherent model behavior):
- Stream gap 16.7s (Item 2)
- Plan task count shift (Item 7)

Items already fixed:
- Recovery leakage (Item 4)
- submitStageForValidation early (Item 3) — auto-rescue handles it

---

## How to Start Next Session

1. Read this handoff first
2. Run `git log --oneline -10` to verify HEAD
3. Deep research & verification with dispatch mutiagents:
- Start with Priority 1 (Google Grounding chain swap) — it's a DB config change, instant win
- Then Priority 2 (.ac.id routing) — one file change
- Priorities 3-6 are UI/client work, can be batched
4. Validation to user before make an implementation plan.