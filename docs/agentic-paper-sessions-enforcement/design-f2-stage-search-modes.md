# Design — F2: Stage Search Modes

> Branch: `feature/paper-sessions-enforcement`
> Date: 2026-04-03
> Depends on: F1 (completed)
> Source: findings.md § F2, handoff-f2-gagasan-hub.md

---

## Problem

Two intertwined failures:

1. **Stage search allocation is undifferentiated.** All 14 stages have identical search behavior. Gagasan (the research hub) is passive when it should be proactive. Topik, pendahuluan, metodologi, diskusi have active search when all material should already be available. Tinjauan literatur has the same generic search pattern as every other stage.

2. **Completed search turns can produce transitional responses.** Even when search executes successfully and sources are persisted, the model's final response can still say "Mohon tunggu sebentar ya, aku akan mencari data pendukung" — a pre-search transition instead of actual findings. This is a proven UI bug (screenshot evidence: `screenshots/Screen Shot 2026-04-03 at 03.32.16.png`).

These are connected: fixing stage modes without fixing search-turn response quality leaves the most visible bug intact.

## Solution: 4 Stage Modes + Search-Turn Contract

| Mode | Stages | Search behavior |
|------|--------|-----------------|
| **Mode 1: Discussion + Dual Search** | gagasan | Proactive unified search — academic (journals, papers) + non-academic (news, data, policy) |
| **Mode 2: Derivation** | topik | No search. Derive from approved gagasan material |
| **Mode 3: Review** | abstrak, outline, pendahuluan, metodologi, hasil, diskusi, kesimpulan, all finalization | No search. Generate from existing approved material |
| **Mode 4: Deep Academic Search** | tinjauan_literatur | Proactive academic search — journals, empirical studies, theoretical frameworks |

Plus: a search-turn response contract that guarantees completed search turns produce actual findings.

---

## Changes — 4 Layers

### Layer 1: Code — Search stage classification

Two files contain the stage classification. Both must be updated together.

**File 1:** `src/lib/ai/stage-skill-contracts.ts`

Current:
```typescript
ACTIVE_SEARCH_STAGES = ["gagasan", "topik", "pendahuluan", "tinjauan_literatur", "metodologi", "diskusi"]
PASSIVE_SEARCH_STAGES = ["outline", "abstrak", "hasil", "kesimpulan", "pembaruan_abstrak", "daftar_pustaka", "lampiran", "judul"]
```

Target:
```typescript
ACTIVE_SEARCH_STAGES = ["gagasan", "tinjauan_literatur"]
PASSIVE_SEARCH_STAGES = ["topik", "outline", "abstrak", "pendahuluan", "metodologi", "hasil", "diskusi", "kesimpulan", "pembaruan_abstrak", "daftar_pustaka", "lampiran", "judul"]
```

**File 2:** `src/lib/ai/stage-skill-validator.ts:15-22`

This file has its own duplicate `ACTIVE_SEARCH_STAGES` array used by `getExpectedSearchPolicy()` (line 100-102) to validate skill content. If only contracts.ts is updated, the validator will flag new topik/pendahuluan/diskusi skills as "search_policy_mismatch" (line 174-178).

Target: Same change — remove topik, pendahuluan, metodologi, diskusi from ACTIVE_SEARCH_STAGES.

**Dedup consideration:** Both files define the same array independently. Ideally validator.ts should import from contracts.ts. However, refactoring the import is optional for F2 — the critical requirement is that both arrays are consistent. If dedup is done, it must not break the validator's existing import chain.

**Why this matters:** `getStageSearchPolicy()` in route.ts:450-454 reads the contracts.ts arrays. The LLM search router prompt says "ACTIVE policy: enable search if conversation needs factual data" vs "PASSIVE policy: enable search ONLY if user EXPLICITLY requests it." The validator uses its own copy to validate skill definitions. Both must agree.

### Layer 2: Code — Research requirements and evidence readers

**File:** `src/lib/ai/paper-search-helpers.ts`

Current `STAGE_RESEARCH_REQUIREMENTS`:
```typescript
gagasan:             { requiredField: "referensiAwal",     minCount: 2 }  // Keep
topik:               { requiredField: "referensiPendukung", minCount: 3 }  // REMOVE
tinjauan_literatur:  { requiredField: "referensi",          minCount: 5 }  // Keep
pendahuluan:         { requiredField: "sitasiAPA",          minCount: 2 }  // REMOVE
diskusi:             { requiredField: "sitasiTambahan",      minCount: 2 }  // REMOVE
```

Target: Remove topik, pendahuluan, diskusi entries. Keep gagasan and tinjauan_literatur only.

**Why this matters:** When a stage has a research requirement and the data is incomplete, `isStageResearchIncomplete()` returns true. The router then injects `getResearchIncompleteNote()` — a system message that says "IF YOU SKIP THE SEARCH, YOU ARE VIOLATING THE PAPER WORKFLOW PROTOCOL." This overrides any instruction that says "no search."

**Evidence reader cleanup (route.ts:886-911):** The `getSearchEvidenceFromStageData()` function has hardcoded per-stage evidence checks that read from stageData fields (referensiPendukung for topik, sitasiAPA for pendahuluan, sitasiTambahan for diskusi). After removing research requirements, these evidence checks become dead paths. They must be reviewed as part of the same change:
- Remove or guard the topik/pendahuluan/diskusi branches so they don't contribute stale "search done" signals
- Keep gagasan and tinjauan_literatur branches intact

**PAPER_TOOLS_ONLY_NOTE wording (paper-search-helpers.ts:77-91):** This note is injected when search is disabled in paper mode. Current wording: "Ask user to explicitly request a search." For review-mode stages, this language is misleading — it still directs the model toward search. Update to be mode-aware:
- For active stages (gagasan, tinjauan_literatur): keep current wording (search is appropriate but unavailable this turn)
- For passive/review stages: change to "This stage does not require new search. Use approved material from previous stages."

### Layer 3: Instructions — Per-stage search blocks

All changes below are natural language rewrites inside template literal strings. No TypeScript logic changes.

#### 3a. `src/lib/ai/paper-stages/foundation.ts` — gagasan (Mode 1)

**CORE PRINCIPLES section 2 (lines 29-36):**
- Add: gagasan is the PRIMARY research hub — proactively gather evidence here. Use dual search intent: academic + non-academic.

**EXPECTED FLOW (line 78):**
- Current: `If needed (recent data / user explicitly requests), request a web search for literature exploration`
- Target: `If research is incomplete, proactively request web search covering both academic sources (journals, studies) and non-academic sources (news, data, policy, field context)`

**WEB SEARCH block (lines 103-108):**
- Current: Generic "HOW TO TRIGGER" with "you may recommend a search and ask for confirmation first"
- Target: "PROACTIVE DUAL SEARCH MODE" — proactively search when research is incomplete, covering both academic and non-academic evidence. Present findings in the same turn.

#### 3b. `src/lib/ai/paper-stages/foundation.ts` — topik (Mode 2)

**CORE PRINCIPLES section 2 (lines 161-167):**
- Current: "Request a web search BEFORE composing drafts... Focus on literature that supports..."
- Target: "Topik is a DERIVATION stage, not a research stage. Use approved gagasan material as the evidence base. Do NOT initiate new web search."

**EXPECTED FLOW (line 207):**
- Current: `If needed... request a web search for more specific literature`
- Target: `Derive topic options from existing gagasan material and references`

**OUTPUT fields (line 227):**
- Current: `referensiPendukung: Additional literature supporting the argument (from web search)`
- Target: `referensiPendukung: Supporting literature carried forward or curated from gagasan material`

**WEB SEARCH block (lines 232-237):**
- Current: Generic "HOW TO TRIGGER" block
- Target: "DERIVATION MODE: Do NOT initiate new web search. Use approved gagasan material. If user explicitly asks for more search at topik, redirect to gagasan or tinjauan_literatur."

**HARD PROHIBITIONS (line 259):**
- Current: `Do NOT compose a draft with references/factual data before requesting a web search`
- Target: `Do NOT initiate a fresh search from topik; derive from gagasan material instead`

#### 3c. `src/lib/ai/paper-stages/core.ts` — pendahuluan (Mode 3)

**CORE PRINCIPLES section 3 (lines 164-167):**
- Current: `WEB SEARCH (OPTIONAL) — Request a web search if you need recent data/facts`
- Target: `REVIEW MODE — Generate from approved gagasan, topik, and saved references. Do NOT initiate new search by default.`

**EXPECTED FLOW (line 204):**
- Remove: `Request a web search if additional supporting data is needed`

**WEB SEARCH block (lines 229-234):**
- Current: Generic "HOW TO TRIGGER"
- Target: "REVIEW MODE: Do NOT proactively search. Only search if user explicitly requests."

#### 3d. `src/lib/ai/paper-stages/core.ts` — tinjauan_literatur (Mode 4)

**CORE PRINCIPLES section 1 (lines 276-278):**
- Current: `DEEPENING, NOT NEW EXPLORATION... Optionally request a web search`
- Target: `DEEP ACADEMIC SEARCH HUB — Proactively initiate deeper academic search. Focus on journals, empirical studies, theoretical frameworks, state-of-the-art.`

**EXPECTED FLOW (line 338):**
- Current: `Request a web search for deeper literature exploration`
- Target: `Proactively request deep academic search when literature is still incomplete`

**WEB SEARCH block (lines 361-367):**
- Current: Generic "HOW TO TRIGGER"
- Target: "DEEP ACADEMIC SEARCH MODE: Proactively trigger search. Prefer journals, studies, theoretical frameworks. Present findings in the same turn."

#### 3e. `src/lib/ai/paper-stages/core.ts` — metodologi (Mode 3)

**CORE PRINCIPLES section 2 (line 416):**
- Current: `Optionally request a web search (1-2 times) if you need examples`
- Target: `REVIEW MODE: derive methodology from approved research direction, not from fresh search`

**WEB SEARCH block (lines 483-488):**
- Current: Generic "HOW TO TRIGGER"
- Target: "REVIEW MODE: Do NOT proactively search. Only search if user explicitly requests."

#### 3f. `src/lib/ai/paper-stages/results.ts` — diskusi (Mode 3)

**CORE PRINCIPLES section 1 (line 153):**
- Current: `If you need new references for comparison, request a web search FIRST`
- Target: `Use references from tinjauan_literatur and Phase 1 for comparison. Do NOT initiate new search.`

**WEB SEARCH block (lines 230-235):**
- Current: Generic "HOW TO TRIGGER" (active pattern)
- Target: "REVIEW MODE: Do NOT proactively search. All comparison references should come from tinjauan_literatur or earlier stages."

#### 3g. Already-passive stages — explicit review-mode framing

The following stages already have "PASSIVE MODE" WEB SEARCH blocks but lack explicit review-mode framing. Add a single line to each WEB SEARCH block for consistency with the 4-mode framework:

- Add: `This is REVIEW MODE: generate from existing approved material first, not from new search.`

**`src/lib/ai/paper-stages/core.ts`:** abstrak (line 100)
**`src/lib/ai/paper-stages/results.ts`:** hasil (line 101), kesimpulan (line 347)
**`src/lib/ai/paper-stages/finalization.ts`:** pembaruan_abstrak, daftar_pustaka, lampiran, judul, outline

#### 3h. `src/lib/ai/paper-mode-prompt.ts` — General rules (line 284)

**Current:**
```
- DISCUSS FIRST before drafting — do not immediately generate full output
```

**Target:**
```
- STAGE MODES:
  - gagasan = discussion hub + proactive dual search (academic + non-academic)
  - topik = derivation only from gagasan material; do NOT initiate new search
  - tinjauan_literatur = proactive deep academic search + synthesis
  - all other stages = review mode; generate from approved material, no new search
- DISCUSS FIRST only for gagasan and topik. In review-mode stages, draft directly from existing material and present for review.
```

**Search-turn contract (add after existing web search rules, around line 289):**
```
- SEARCH TURN CONTRACT:
  - If web search runs in THIS turn and sources are available, your final response MUST present actual findings from those results in the same turn.
  - If web search runs in THIS turn, do NOT end with transition text such as saying you will search, you are searching, or asking the user to wait.
  - Treat AVAILABLE_WEB_SOURCES and fresh search citations as proof that search has already completed for this turn.
```

### Layer 4: Post-search response enforcement

**Problem:** The compose phase in orchestrator.ts already has `COMPOSE_PHASE_DIRECTIVE` (line 59-102) that says "Present your analysis and findings IMMEDIATELY" and "DO NOT: Promise to search." Despite this, the model still produces transitional responses (screenshot evidence). The directive is instruction-only — no runtime validation exists after compose finishes.

**File:** `src/lib/ai/web-search/orchestrator.ts`

**Streaming constraint:** Text chunks are forwarded to the user in real-time via `writer.write(chunk)` at orchestrator.ts:962. By the time the `finish` handler runs (line 768) and `composedText` is fully accumulated, the text is **already delivered to the user**. This means:
- Cannot intercept and replace the response after compose — text is already streamed
- Cannot buffer all text before streaming — would kill streaming UX entirely
- Cannot validate before streaming starts — streaming is per-chunk, content unknown until accumulated

**Design approach: corrective append (not replace).**

Since the transitional text is already streamed, the only viable runtime option is to **append a corrective findings block** after the transitional text, before the finish event.

After compose finishes and `composedText` is fully accumulated in the `finish` handler:

1. Run a deterministic length check on `composedText`:
   - `composedText` is accumulated from text-delta chunks AFTER `pipeYamlRender` — YAML choice cards are already extracted into separate SPEC_DATA_PART_TYPE chunks and do not inflate `composedText`
   - Check raw `composedText.trim().length` against a minimum threshold (e.g., 200 chars)
   - No regex stripping needed — the pipeline already separates formatting from narrative
   - If sources exist (sourceCount > 0) but text is below threshold → output is likely transitional

2. If check fails and sources are available:
   - Emit a `data-corrective-findings` structured data event with source titles, URLs, and excerpts
   - Frontend renders this as a card/list component — no hardcoded language in backend
   - Follows the existing orchestrator event pattern (`data-cited-sources`, `data-reference-inventory`)
   - This does not require a second LLM call — it uses source data already fetched in Phase 1

3. If check passes: continue normal flow (no change)

4. If sourceCount === 0: skip validation entirely. If search found nothing, transitional response is acceptable.

**UX tradeoff:** The user sees the transitional text, then a corrective findings card rendered by frontend. Not ideal — but structured source data after a transitional response is strictly better than "mohon tunggu" with nothing following.

**Why structured data, not text-delta:** Injecting hardcoded prose via `text-delta` violates the language policy (no hardcoded Indonesian in backend code) and is inconsistent with the orchestrator's existing event-based architecture. Structured data lets the frontend control rendering, language, and styling.

**Why not intercept-and-replace:** Text chunks are streamed in real-time (orchestrator.ts:962). By the time validation can run, the text is already delivered. Buffering all text would require disabling streaming entirely — unacceptable UX regression.

**Why not instruction-only:** The `COMPOSE_PHASE_DIRECTIVE` already contains strong instructions against transitional responses. The model still violates them. Adding more instruction text (Layer 3 search-turn contract in paper-mode-prompt.ts) helps but cannot guarantee compliance. The runtime corrective append is the last line of defense.

**Why not regex:** The validator checks structural properties (narrative length, source presence) not forbidden phrases. No regex pattern matching against response content.

---

## Files changed — summary

| File | Type | Changes |
|------|------|---------|
| `src/lib/ai/stage-skill-contracts.ts` | **Code** | Move topik, pendahuluan, metodologi, diskusi from ACTIVE to PASSIVE |
| `src/lib/ai/stage-skill-validator.ts` | **Code** | Same change to duplicated ACTIVE_SEARCH_STAGES array |
| `src/lib/ai/paper-search-helpers.ts` | **Code** | Remove research requirements for topik, pendahuluan, diskusi. Update PAPER_TOOLS_ONLY_NOTE to be mode-aware. |
| `src/app/api/chat/route.ts` | **Code** | Clean up evidence reader branches for removed stages (886-911) |
| `src/lib/ai/web-search/orchestrator.ts` | **Code** | Add post-compose validator + emit `data-corrective-findings` event |
| `src/components/chat/MessageBubble.tsx` | **Code** | Render `data-corrective-findings` event as source card/list |
| `src/lib/ai/paper-mode-prompt.ts` | Instruction | Add STAGE MODES lookup + SEARCH TURN CONTRACT to general rules |
| `src/lib/ai/paper-stages/foundation.ts` | Instruction | gagasan: proactive dual search; topik: derivation mode |
| `src/lib/ai/paper-stages/core.ts` | Instruction | pendahuluan/metodologi: review mode; tinjauan_literatur: deep academic; abstrak: add review-mode line |
| `src/lib/ai/paper-stages/results.ts` | Instruction | diskusi: review mode; hasil/kesimpulan: add review-mode line |
| `src/lib/ai/paper-stages/finalization.ts` | Instruction | Add explicit review-mode line to all finalization WEB SEARCH blocks |

## Enforcement chain

The 4 layers work together:

```
User message arrives
      ↓
route.ts: getStageSearchPolicy(currentStage)
      → reads ACTIVE_SEARCH_STAGES / PASSIVE_SEARCH_STAGES  [Layer 1]
      → returns "active" or "passive"
      ↓
route.ts: isStageResearchIncomplete(stageData, stage)
      → reads STAGE_RESEARCH_REQUIREMENTS  [Layer 2]
      → if incomplete + active → injects "RESEARCH INCOMPLETE" system note
      → if no requirement → no injection
      ↓
route.ts: decideWebSearchMode() — LLM router
      → receives policy ("active"/"passive") + research status
      → ACTIVE: "enable search if conversation needs factual data"
      → PASSIVE: "enable search ONLY if user EXPLICITLY requests"
      → decides enableWebSearch = true/false
      ↓
If enableWebSearch = false:
      → injects mode-aware note  [Layer 2 — updated PAPER_TOOLS_ONLY_NOTE]
      → model reads per-stage instructions  [Layer 3]
      → instructions reinforce "no search" / "derivation mode" / "review mode"
      ↓
If enableWebSearch = true:
      → web search executes via orchestrator
      → compose phase runs with COMPOSE_PHASE_DIRECTIVE
      → model produces composedText
      ↓
Post-compose corrective append  [Layer 4]
      → text already streamed to user (real-time via writer.write at line 962)
      → finish handler: structural check on accumulated composedText
      → if substantive → no action, forward finish event
      → if transitional + sources available → emit data-corrective-findings structured event, then forward finish
      → if transitional + no sources → no action (search found nothing, transitional is acceptable)
```

All 4 layers must agree. Code (Layers 1-2) enforces the gate. Instructions (Layer 3) guide behavior. Runtime validator (Layer 4) catches compose failures.

## Not in scope

- F3 (agentic flow) — depends on F2 stage modes but is separate work
- F4 (artifact as workspace) — depends on F3
- Search router LLM prompt changes — the existing "ACTIVE"/"PASSIVE" policy wording in decideWebSearchMode() is sufficient for the routing decision
- Dedup of ACTIVE_SEARCH_STAGES between contracts.ts and validator.ts — desirable but optional for F2; the critical requirement is consistency

## Risk

1. **Layer 4 false positives:** Validator threshold too aggressive could append corrective blocks to valid short responses. Mitigation: only trigger when sources exist AND narrative body is below threshold. Short responses with no sources pass through.
2. **Layer 4 append UX:** User sees transitional text first, then corrective findings appended. Visually awkward but functionally correct — real findings follow the transitional text instead of nothing. Template-based block from source data will be less polished than LLM-composed text. Acceptable as safety net.
3. **Model compliance within Mode 1/4:** Even with proactive instructions, model may still ask "shall I search?" instead of requesting search. Mitigation: strong instruction wording.
4. **Existing sessions:** Sessions already in progress at topik/pendahuluan/diskusi will lose active search. Acceptable — they can still search if user explicitly requests.
5. **Test coverage:** stage-skill-contracts.ts and stage-skill-validator.ts changes may break existing tests that assert ACTIVE_SEARCH_STAGES membership. Must check.
6. **Evidence reader dead paths:** After removing research requirements, route.ts:886-911 branches for topik/pendahuluan/diskusi become dead code. Must clean up to avoid stale "search done" signals.
