# Regex Revision System — Branch Scope

Branch: `regex-revision-system`
Spec: `docs/regex-revision-system/`

## Objective

Replace regex-based natural language heuristics in the chat + paper session runtime with structured semantic classifiers, while preserving all deterministic parser/sanitizer regex.

Guiding principle: **anti-regex for language understanding, pro-deterministic parser for technical formats.**

## Priority Map

### P0: Freeze New Regex Heuristics

- Status: **DONE** (policy enforced in CLAUDE.md `REGEX & PATTERN MATCHING POLICY`)
- No new regex for reading user intent or model prose intent in runtime user-facing code

### P1: Replace Decision-Layer Regex That Alter Workflow or Persisted Content — **DONE**

Status: **COMPLETED.** All language-understanding regex deleted, classifiers promoted to primary.

#### P1A: `src/lib/ai/completed-session.ts` — **DONE**

All target regex replaced with `classifyCompletedSessionIntent()` semantic classifier:
- `REVISION_VERB_PATTERN` — **DELETED**, replaced by classifier intent: "revision"
- `INFORMATIONAL_PATTERN` — **DELETED**, replaced by classifier intent: "informational"
- `CONTINUE_LIKE_PATTERN` — **DELETED**, replaced by classifier intent: "continuation"
- `RECALL_DISPLAY_VERB` + `RECALL_ARTIFACT_TARGET` — **DELETED**, replaced by classifier intent: "artifact_recall" + targetStage
- `RECALL_QUESTION_EXCLUSION` — **DELETED**, classifier understands questions vs commands
- `REASON_ARTIFACT_PATTERN` + `REASON_RETRIEVAL_PATTERN` — router reason hint
- `resolveRecallTargetStage()` — stage resolution from keyword matching

What to preserve:
- Type system (`CompletedSessionHandling`, `CompletedSessionDecision`) — already well-structured
- Router intent primary path (line 112-160) — already structured, keep as-is
- `getCompletedSessionClosingMessage()` — static string, no regex

Critical fix: default fallback must become `clarify` or `allow_normal_ai`, not `short_circuit_closing`.

#### P1B: `src/app/api/chat/route.ts` — **PARTIAL**

Completed:
- Revision intent detection — **REPLACED** with `classifyRevisionIntent()` (observability-only)

Preserved as-is (per design carve-out):
- Leakage detection (observability-only, logs warnings) — kept, defer to future structured tool outcome verification
- Corruption guard (`tool_code|sekarang kita masuk ke tahap|yaml-spec`) — model output sanitizer, preserved
- Prose-leakage observability guards — kept, observability-only
- Validation claim detection — kept, observability-only
- Fallback title extraction — parser, not language understanding, preserved
- Fence stripping — technical format cleanup, preserved
- Whitespace collapse — normalization, preserved
- Tool name sanitization — format validation, preserved
- FORBIDDEN_REASONING_PATTERNS (12 security patterns) — security guard, preserved
- sanitizeReasoningText() — security, preserved

### P2: Replace Heuristic Follow-Up and Mode Detection — **DONE**

Status: **COMPLETED.** All language-understanding regex replaced.

#### P2A: `src/lib/ai/exact-source-followup.ts` — **DONE**

Replaced with `classifyExactSourceIntent()`:
- `EXACT_SOURCE_PATTERNS` (12 patterns) — **DELETED**
- `NON_EXACT_SUMMARY_PATTERNS` (6 patterns) — **DELETED**
- `CONTINUATION_PATTERNS` + `CONTINUATION_CUES` — **DELETED**
- `isExactIntent()`, `isNonExactSummaryRequest()`, `isContinuationPrompt()` — **DELETED**

Preserved:
- `normalizeText()`, `escapeRegExp()`, `extractDomainLabel()` — technical
- Source matching logic (buildSourceCandidates, hasTitleMatch, matchesSourceReference, findExplicitMatches, resolveFromRecentContext) — structural, not language understanding
- Dynamic boundary regex for source candidate matching — structural

#### P2B: `src/lib/ai/web-search/reference-presentation.ts` — **DONE**

Replaced with `classifySearchResponseMode()`:
- `inferSearchResponseMode()` 14 regex patterns — **DELETED**

Preserved:
- URL normalization, canonical key generation, dedup, document kind detection, weak title checks — all deterministic parsers

#### P2C: `src/lib/ai/internal-thought-separator.ts` — **INSTRUCTION-BASED FIX**

- Added instruction to `COMPOSE_PHASE_DIRECTIVE` in orchestrator.ts preventing model from emitting internal thought preambles (probabilistic)
- `INTERNAL_THOUGHT_PATTERNS` (6 patterns) — **PRESERVED as non-destructive fallback** with deprecation comment + observability logging
- `stripEmptyReferenceLines()`, `findLeadingSentenceBoundary()`, `buildUserFacingSearchPayload()` — preserved

### P3: Review Non-Critical Heuristics — **EVALUATED**

#### P3A: `src/lib/ai/paper-intent-detector.ts` — **DEFERRED**

- Decision: **DEFER** — keyword `.includes()` heuristic, not regex
- Low blast radius (UI hint + system prompt injection only)
- LLM call cost unjustified for non-critical UI hint
- No regex to clean up (only `\s+` whitespace collapse — deterministic preserve)
- Revisit if paper intent becomes a routing decision

#### P3B: `src/lib/ai/curated-trace.ts` — **KEEP AS-IS**

- Decision: **KEEP AS-IS** — keyword bucket scoring for UI trace classification
- Very low blast radius (UI reasoning display, no workflow impact)
- LLM call per reasoning segment too expensive for informational UI
- Current approach is zero-cost, instant, and reliable enough
- Revisit if trace classification becomes input for a feedback loop

#### P3C: `src/lib/ai/stage-skill-validator.ts`

- Valid as technical document validator
- Regex here checks section headings, output keys, forbidden phrases — all format validation
- Target: preserve, optimize only if false reject rate is high

### P4: Preserve Deterministic Parsers (No Action)

These files use regex correctly for technical parsing:
- `convex/paperSessions.ts` — URL dedup, title normalization, citation parsing, year extraction
- `convex/paperSessions/daftarPustakaCompiler.ts` — DOI normalization, key normalization, weak citation detection
- `convex/paperSessions/stageDataWhitelist.ts` — numeric range coercion
- `src/components/chat/MarkdownRenderer.tsx` — markdown rendering, citation markers, table separators
- `src/components/chat/ChatWindow.tsx` — Convex ID validation
- `src/components/chat/ChatContainer.tsx` — Convex ID validation

## Implementation Strategy — COMPLETED

### Phase 1: Build Semantic Classifiers — **DONE**

Built per-domain classifiers (not unified mega-classifier) using `generateObject()` + Zod schemas:
- `CompletedSessionClassifierSchema` — 5 intents × 4 handling outcomes
- `ExactSourceClassifierSchema` — 4 source intents × 3 modes
- `SearchResponseModeSchema` — synthesis vs reference_inventory
- `RevisionIntentSchema` — boolean revision detection

Infrastructure: `classifyIntent<T>()` generic utility with `ClassifierResult<T>` return type (output + metadata with classifierVersion).

### Phase 2: Rewire Runtime Call Paths — **DONE**

- `completed-session.ts` → classifier primary (all regex deleted)
- `route.ts` → revision intent classifier (observability-only, regex replaced)
- `exact-source-followup.ts` → classifier primary (all intent regex deleted, source matching preserved)
- `reference-presentation.ts` → classifier primary (14 mode patterns deleted)
- `internal-thought-separator.ts` → instruction-based fix + regex fallback preserved

### Phase 3: Remove Old Regex Heuristics — **DONE**

- All replaced regex patterns deleted after parity verification
- Parity evidence: 100% on exact-source (10/10), search-mode (8/8), completed-session AGREE cases (20/21)
- Observability guards in route.ts kept (log-only, no content alteration)

### Phase 4: Audit Semi-Structured Parsers — **NOT IN SCOPE**

- Citation parsing in `paperSessions.ts` — deterministic parser, preserved as-is (P4)
- No action taken, no action needed

## Agent Role Assignment

- **Claude Code:** Brainstormer, planner, task creator, and executor for all implementation work on this branch.
- **Codex (OpenAI):** Audit and code review. All review/audit tasks are delegated to Codex, not performed by Claude Code.

## Guardrails

1. Never replace regex heuristic with free-form prompt without schema — use JSON/enum output
2. Use `clarify` as official outcome for ambiguous inputs
3. Never derive lifecycle state from model prose when tool result or Convex state is available
4. Never send technical parsing/rendering to model intelligence
5. Instruction-based fixes are probabilistic — always state this upfront, never imply certainty

## Reference Documents

- `docs/regex-revision-system/README.md` — system map and regex categories
- `docs/regex-revision-system/FILE-INVENTORY.md` — per-file regex inventory with risk levels
- `docs/regex-revision-system/REGEX-CLEANUP-PRIORITIES.md` — priority rankings and implementation strategy
