# Regex Revision System — Branch Scope

Branch: `regex-revision-system`
Spec: `docs/regex-revision-system/`

## Objective

Replace regex-based natural language heuristics in the chat + paper session runtime with structured semantic classifiers, while preserving all deterministic parser/sanitizer regex.

Guiding principle: **anti-regex for language understanding, pro-deterministic parser for technical formats.**

## Priority Map

### P0: Freeze New Regex Heuristics

- Status: DONE (policy enforced in CLAUDE.md `REGEX & PATTERN MATCHING POLICY`)
- No new regex for reading user intent or model prose intent in runtime user-facing code

### P1: Replace Decision-Layer Regex That Alter Workflow or Persisted Content

These are the highest-risk files where regex directly changes user-facing behavior or stored data.

#### P1A: `src/lib/ai/completed-session.ts`

Target regex to replace:
- `REVISION_VERB_PATTERN` — revision verb detection
- `INFORMATIONAL_PATTERN` — informational question detection
- `CONTINUE_LIKE_PATTERN` — short closing prompt detection
- `RECALL_DISPLAY_VERB` + `RECALL_ARTIFACT_TARGET` — artifact recall detection
- `RECALL_QUESTION_EXCLUSION` — question-form exclusion
- `REASON_ARTIFACT_PATTERN` + `REASON_RETRIEVAL_PATTERN` — router reason hint
- `resolveRecallTargetStage()` — stage resolution from keyword matching

What to preserve:
- Type system (`CompletedSessionHandling`, `CompletedSessionDecision`) — already well-structured
- Router intent primary path (line 112-160) — already structured, keep as-is
- `getCompletedSessionClosingMessage()` — static string, no regex

Critical fix: default fallback must become `clarify` or `allow_normal_ai`, not `short_circuit_closing`.

#### P1B: `src/app/api/chat/route.ts`

Target regex to replace:
- Leakage detection that **replaces persistedContent**: `kesalahan teknis|maafkan aku|saya akan coba|memperbaiki|mohon tunggu|coba lagi|ada kendala`
- Completed-session corruption guard: `tool_code|sekarang kita masuk ke tahap|yaml-spec`
- Prose-leakage observability guards: `aku akan menyusun|draf ini akan|berikut adalah draf`
- Validation claim detection: `panel validasi|approve|revisi`
- Revision intent detection: `\b(revisi|edit|ubah|ganti|...)\b`
- Fallback title extraction: `judulTerpilih["\s:]*"([^"]+)"` and friends

What to preserve:
- Fence stripping (```` ```json ````, ```` ```yaml-spec ```` ) — technical format cleanup
- Whitespace collapse (`\s+`, `\n{3,}`) — normalization
- Tool name sanitization (`[^a-zA-Z0-9:_-]`) — format validation

Note: many regex blocks are **duplicated** (think-model vs non-think-model paths). Deduplication is in scope if it naturally falls out of the refactor, but not a standalone goal.

### P2: Replace Heuristic Follow-Up and Mode Detection

#### P2A: `src/lib/ai/exact-source-followup.ts`

Replace entire language-understanding layer:
- `EXACT_SOURCE_PATTERNS` (12 patterns)
- `NON_EXACT_SUMMARY_PATTERNS` (6 patterns)
- `CONTINUATION_PATTERNS` + `CONTINUATION_CUES`
- Dynamic source boundary matching

Preserve:
- `normalizeText()` — text normalization (technical)
- `escapeRegExp()` — utility
- `extractDomainLabel()` — URL parsing
- Type definitions

#### P2B: `src/lib/ai/web-search/reference-presentation.ts`

Replace only:
- `inferSearchResponseMode()` (line 208-235) — 13 regex patterns reading natural language to determine response mode

Preserve everything else:
- URL normalization, canonical key generation, dedup, document kind detection, weak title checks — all deterministic parsers

#### P2C: `src/lib/ai/internal-thought-separator.ts`

Replace:
- `INTERNAL_THOUGHT_PATTERNS` (6 patterns) — detecting internal thoughts from wording

Preserve:
- `stripEmptyReferenceLines()` — technical cleanup
- `findLeadingSentenceBoundary()` — text utility
- `buildUserFacingSearchPayload()` — composition logic

### P3: Review Non-Critical Heuristics (Lower Priority)

#### P3A: `src/lib/ai/paper-intent-detector.ts`

- Keyword-based (`string.includes()`) paper intent detection
- Not regex, but still language heuristic
- Lower priority — early gate, not runtime decision
- Target: migrate to semantic router when P1+P2 are stable

#### P3B: `src/lib/ai/curated-trace.ts`

- `STEP_KEYWORDS` bucket scoring for UI trace classification
- Does not affect workflow or persisted data
- Target: replace with model-emitted step metadata (future)

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

## Implementation Strategy

### Phase 1: Build Semantic Classifier

Create a unified semantic classifier that covers P1 + P2 concerns:
- Structured JSON output with enum-constrained fields
- Covers: completed session handling, artifact recall, exact-source follow-up, response mode, internal thought separation
- Default ambiguous outcome: `clarify` or `allow_normal_ai`, never silent short-circuit

### Phase 2: Rewire Runtime Call Paths

- Replace regex decision paths in `completed-session.ts` and `route.ts` with classifier output
- Replace `inferSearchResponseMode()` with classifier output
- Replace exact-source follow-up regex with classifier output
- Replace internal-thought detection with classifier output or structured channel

### Phase 3: Remove Old Regex Heuristics

- Delete replaced regex patterns after parity verification
- Keep observability, but read from structured decision output, not phrase matching

### Phase 4: Audit Semi-Structured Parsers

- Review citation parsing in `paperSessions.ts`
- Optimize if needed, do not replace with model intelligence

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
