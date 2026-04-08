# Semantic Classifier Implementation Plan

## 1. Planning Principles

### Boundary Control
- Each subtask has explicit file scope. No subtask touches files outside its declared scope.
- Preserve-category regex must never be modified, moved, or deleted.
- Security sanitizers are explicitly excluded from every subtask scope.

### Preserve-First Mindset
- Default assumption: every regex stays until proven replaceable.
- Replacement requires parity evidence — classifier must produce equivalent or better results on representative inputs before the regex is removed.
- "Better" means fewer false positives AND fewer false negatives on the same test set.

### No Mixed Cleanup + Redesign Without Checkpoint
- Each subtask does ONE thing: either build, wire, test, or delete.
- Never combine "build classifier" with "delete old regex" in the same subtask.
- A review checkpoint (Codex audit) is required between "wire classifier" and "delete regex."

### Test/Evidence Before Deletion
- Old regex is deleted ONLY after parity testing proves the classifier matches or exceeds regex behavior.
- Parity test = run both paths on same inputs, compare outputs, document discrepancies.
- Deletion requires explicit sign-off at a review gate.

---

## 2. Phase Breakdown

### Phase 0: Foundation Confirmation
Confirm design document, schema, and approach are approved before any code is written.

### Phase 1: Classifier Infrastructure
Create shared Zod schemas, classifier utility module, and test harness.

### Phase 2: P1A — Completed Session Classifier
Build, wire, and verify the completed-session semantic classifier in `completed-session.ts`.

### Phase 3: P1B — Route-Level Revision Intent
Build, wire, and verify the route-level revision intent classifier in `route.ts`.

### Phase 4: P1 Parity Verification
Full regression verification of P1 changes before any regex deletion.

### Phase 5: P2 — Follow-Up and Mode Classifiers
Build, wire, and verify classifiers for exact-source, search response mode, and internal thought.

### Phase 6: P3 — Review and Defer
Evaluate paper-intent-detector and curated-trace for classifier migration. Decide keep/defer/replace.

### Phase 7: Cleanup and Final Verification
Remove old regex after parity evidence, update documentation, final audit.

---

## 3. Subtasks

---

### ST-0.1: Design Review Checkpoint

**Objective**: Get SEMANTIC-CLASSIFIER-DESIGN.md approved by Codex before implementation starts.

**Why this subtask exists**: Prevents wasted implementation effort on a design that has fundamental flaws.

**Files in scope**: `docs/regex-revision-system/SEMANTIC-CLASSIFIER-DESIGN.md` (read-only for review)

**Files explicitly out of scope**: All runtime files

**Inputs / dependencies**: Design document completed (this document)

**Exact behavior target**: Codex reviews and approves (or requests changes to) the design document.

**Regex/patterns expected to be replaced**: None (planning only)

**Regex/patterns explicitly preserved**: All

**Risks**: Design flaws not caught lead to rework later.

**Required tests / validation**: Codex audit verdict

**Verification steps**:
1. Codex reads SEMANTIC-CLASSIFIER-DESIGN.md
2. Codex verifies schema against codebase types
3. Codex verifies scope boundary against SCOPE.md
4. Codex provides verdict: approved / changes requested

**Exit criteria**: Codex approves design document.

**Review checkpoint notes**: This IS the review checkpoint. No code until approved.

---

### ST-1.1: Create Classifier Zod Schemas

**Objective**: Define all Zod schemas for classifier outputs in a dedicated schemas file.

**Why this subtask exists**: Schemas must exist before any classifier function can be implemented. Centralizing them ensures consistency.

**Files in scope**:
- CREATE: `src/lib/ai/classifiers/schemas.ts`

**Files explicitly out of scope**: All existing runtime files, all preserve-category files

**Inputs / dependencies**: Approved design document (ST-0.1)

**Exact behavior target**: File exports 4 Zod schemas:
- `CompletedSessionClassifierSchema`
- `ExactSourceClassifierSchema`
- `SearchResponseModeSchema`
- `RevisionIntentSchema`

Each schema must match the design document exactly. All fields must have `.describe()` annotations for model instruction.

**Regex/patterns expected to be replaced**: None (building new)

**Regex/patterns explicitly preserved**: N/A

**Risks**: Schema doesn't match downstream consumption types. Mitigated by writing TypeScript type assertions against existing types.

**Required tests / validation**:
- TypeScript compilation passes
- Schema `z.infer<>` types are compatible with existing decision types (`CompletedSessionDecision`, `ExactSourceFollowupResolution`, `SearchResponseMode`)

**Verification steps**:
1. File compiles without errors
2. Inferred types checked against existing types
3. All `.describe()` strings are in English (per CLAUDE.md MODEL INSTRUCTION LANGUAGE POLICY)

**Exit criteria**: Schemas file compiles, types align with existing interfaces.

**Review checkpoint notes**: Quick review — schema shape is the foundation for everything.

---

### ST-1.2: Create Classifier Utility Module

**Objective**: Build a thin wrapper around `generateObject()` / `Output.object()` that all domain classifiers will use.

**Why this subtask exists**: Centralizes model invocation, error handling, timeout, and fallback logic. Prevents each domain from reimplementing boilerplate.

**Files in scope**:
- CREATE: `src/lib/ai/classifiers/classify.ts`

**Files explicitly out of scope**: All existing runtime files

**Inputs / dependencies**: Schemas (ST-1.1), existing `generateText` + `Output.object()` pattern in `src/app/api/refrasa/route.ts`

**Exact behavior target**: Export a generic function:
```
classifyIntent<T>(options: { schema, systemPrompt, userMessage, context?, model }): Promise<ClassifierResult<T> | null>
```
Where `ClassifierResult<T>` is `{ output: T, metadata: { classifierVersion: string } }`.
- On success: returns `{ output, metadata }` — caller accesses `result.output` for classification, `result.metadata.classifierVersion` for audit tracking
- On error/timeout: returns `null` (caller uses safe default)
- Metadata attachment is via the wrapper return object, not by modifying the schema payload — schema stays clean for model output

**Regex/patterns expected to be replaced**: None

**Regex/patterns explicitly preserved**: N/A

**Risks**: Latency overhead from LLM call. Mitigated by: classifier only fires in fallback paths (rare), can use faster/smaller model.

**Required tests / validation**:
- Unit test with mocked model response
- Unit test for error/timeout fallback returning null
- TypeScript compilation

**Verification steps**:
1. Function compiles
2. Mock test passes for success and error paths
3. Return type matches schema inference

**Exit criteria**: Utility module compiles, tests pass, handles errors gracefully.

**Review checkpoint notes**: None — straightforward utility.

---

### ST-2.1: Implement Completed Session Classifier

**Objective**: Create `classifyCompletedSessionIntent()` function that replaces the regex fallback in `resolveCompletedSessionHandling()`.

**Why this subtask exists**: This is the first domain classifier. It replaces 7 regex patterns + resolveRecallTargetStage() in the completed-session fallback path.

**Files in scope**:
- CREATE: `src/lib/ai/classifiers/completed-session-classifier.ts`
- READ (reference only): `src/lib/ai/completed-session.ts`

**Files explicitly out of scope**: `route.ts`, all P2/P3/P4 files, all preserve-category files

**Inputs / dependencies**: Schemas (ST-1.1), utility module (ST-1.2)

**Exact behavior target**: Export function:
```
classifyCompletedSessionIntent(options: {
  lastUserContent: string,
  routerReason?: string,
  validStageIds: string[],
  model: LanguageModel,
}): Promise<CompletedSessionClassifierOutput | null>
```

System prompt instructs model to classify user message in context of a completed paper session. Model must choose `intent`, `handling`, `targetStage` (from provided valid stage IDs), with `confidence` and `reason`.

**Regex/patterns expected to be replaced** (by this classifier, not yet deleted):
- `REVISION_VERB_PATTERN`
- `INFORMATIONAL_PATTERN`
- `CONTINUE_LIKE_PATTERN`
- `RECALL_DISPLAY_VERB` + `RECALL_ARTIFACT_TARGET`
- `RECALL_QUESTION_EXCLUSION`
- `REASON_ARTIFACT_PATTERN` + `REASON_RETRIEVAL_PATTERN`
- `resolveRecallTargetStage()` keyword matching

**Regex/patterns explicitly preserved**: All security sanitizers, all technical parsers

**Risks**:
- Classifier too slow for real-time decision (mitigate: fast model, timeout with null fallback)
- Classifier hallucinates invalid stage IDs (mitigate: constrain valid IDs in prompt + validate output)
- System prompt language override (mitigate: all instructions in English per CLAUDE.md policy)

**Required tests / validation**:
- Unit tests with representative inputs covering:
  - Revision intent: "revisi abstrak", "ubah yang tadi", "buat ulang outline"
  - Informational: "bagaimana cara export?", "di mana daftar pustaka?"
  - Continuation: "ok", "lanjut", "gas", "sip"
  - Artifact recall: "lihat abstrak", "tampilkan outline", "buka hasil"
  - Ambiguous: "yang tadi", "itu", "hmm"
  - Question-form that looks like recall: "apakah ada abstrak?", "di mana outline?"

**Verification steps**:
1. Function compiles
2. All unit tests pass
3. System prompt is English-only
4. Output conforms to schema
5. Invalid stage IDs are rejected

**Exit criteria**: Classifier function works standalone with correct outputs for all test cases.

**Review checkpoint notes**: Codex review after this subtask — validate classifier quality before wiring.

---

### ST-2.2: Wire Classifier into Completed Session (Both Paths)

**Objective**: Integrate the classifier into `resolveCompletedSessionHandling()` as a replacement for regex in BOTH the fallback path (routerIntent undefined) AND the router refinement path (routerIntent === "discussion" artifact recall detection). Run dual-write for parity comparison.

**Why this subtask exists**: Wiring is separate from building to isolate integration risk. Dual-write mode enables parity testing before committing to the classifier. The classifier must cover both paths because artifact recall regex (`isArtifactRecallRequest`, `isArtifactRecallReason`, `RECALL_QUESTION_EXCLUSION`) is used in the router-intent path as well, not just the fallback.

**Files in scope**:
- MODIFY: `src/lib/ai/completed-session.ts`
- READ: `src/lib/ai/classifiers/completed-session-classifier.ts`

**Files explicitly out of scope**: `route.ts` (wiring happens in completed-session.ts only), all P2/P3/P4 files

**Inputs / dependencies**: Classifier (ST-2.1)

**Exact behavior target**:
1. Add classifier call in the fallback path (where `routerIntent` is undefined)
2. Add classifier call in the router refinement path (where `routerIntent === "discussion"`, replacing `isArtifactRecallRequest()`, `isArtifactRecallReason()`, `RECALL_QUESTION_EXCLUSION`, `RECALL_ARTIFACT_TARGET` at lines 129-146)
3. Run BOTH regex path AND classifier in both locations
4. Compare results — log discrepancies as observability events
5. Use REGEX result for actual behavior (classifier is shadow mode)
6. Add feature flag or env var to switch to classifier-primary mode

**Regex/patterns expected to be replaced**: None yet — dual-write mode, regex still active

**Regex/patterns explicitly preserved**: ALL (regex is still the primary decision maker)

**Risks**:
- Dual-write adds latency (mitigate: classifier runs in parallel with regex, doesn't block)
- Discrepancy noise overwhelms logs (mitigate: structured logging with domain/field granularity)

**Required tests / validation**:
- Integration test: resolveCompletedSessionHandling() still returns same results as before
- Verify dual-write logging works
- Verify classifier failures don't break the regex path

**Verification steps**:
1. All existing tests pass (no regression)
2. Dual-write logging captures discrepancies
3. Feature flag switches decision source without code change
4. Classifier timeout/error falls through to regex gracefully

**Exit criteria**: Dual-write mode active, regex still primary, classifier running in shadow, discrepancies logged.

**Review checkpoint notes**: Codex review — verify no behavioral change, dual-write is clean.

---

### ST-2.3: Parity Test Completed Session Classifier

**Objective**: Analyze dual-write discrepancy data and determine if classifier is ready to become primary.

**Why this subtask exists**: Deletion of regex requires evidence that the classifier produces equivalent or better results. This subtask provides that evidence.

**Files in scope**:
- READ: Dual-write logs / test results
- MODIFY: Test files (if new test cases needed)

**Files explicitly out of scope**: Runtime files (no behavior changes)

**Inputs / dependencies**: Dual-write data from ST-2.2

**Exact behavior target**:
- Document all discrepancies between regex and classifier
- For each discrepancy: determine which is correct (regex or classifier)
- Calculate parity rate: % of inputs where both agree
- Determine if classifier meets quality bar for primary

**Regex/patterns expected to be replaced**: Assessment only — no deletion yet

**Regex/patterns explicitly preserved**: All

**Risks**: Insufficient test data leads to premature promotion. Mitigate: define minimum sample size before starting.

**Required tests / validation**:
- Minimum 30 representative inputs tested
- Discrepancy analysis documented
- Parity rate ≥ 95% AND all discrepancies are classifier-correct or equivalent

**Verification steps**:
1. Discrepancy report produced
2. Each discrepancy explained
3. Parity rate calculated and documented
4. Recommendation made: promote / tune / defer

**Exit criteria**: Parity report shows classifier is ready (or documents needed tuning).

**Review checkpoint notes**: MANDATORY Codex review gate. Classifier cannot become primary without Codex approval.

---

### ST-2.4: Promote Classifier and Remove Completed Session Regex

**Objective**: Switch classifier to primary, remove regex patterns from completed-session.ts.

**Why this subtask exists**: Final step of P1A — removes the language heuristic regex after parity evidence.

**Files in scope**:
- MODIFY: `src/lib/ai/completed-session.ts`

**Files explicitly out of scope**: `route.ts`, all P2/P3/P4 files, all preserve files

**Inputs / dependencies**: Parity approval (ST-2.3), Codex review gate passed

**Exact behavior target**:
1. Remove feature flag — classifier is now primary for BOTH paths (fallback AND router refinement)
2. Delete ALL language heuristic regex patterns: REVISION_VERB_PATTERN, INFORMATIONAL_PATTERN, CONTINUE_LIKE_PATTERN, RECALL_DISPLAY_VERB, RECALL_ARTIFACT_TARGET, RECALL_QUESTION_EXCLUSION, REASON_ARTIFACT_PATTERN, REASON_RETRIEVAL_PATTERN
3. Delete `isArtifactRecallRequest()` function — regex-based, replaced by classifier in both router and fallback paths
4. Delete `isArtifactRecallReason()` function — regex-based, replaced by classifier using routerReason as context input
5. Delete `resolveRecallTargetStage()` function — keyword matching, replaced by classifier `targetStage` field
6. Update `resolveCompletedSessionHandling()` to use classifier output directly in both router refinement (discussion intent) and fallback paths
7. Update `CompletedSessionDecision.source` to reflect `"classifier"` instead of `"fallback_heuristic"`

**Regex/patterns expected to be replaced**: All 8 regex patterns + 3 helper functions (isArtifactRecallRequest, isArtifactRecallReason, resolveRecallTargetStage)

**Regex/patterns explicitly preserved**:
- All security sanitizers (in route.ts, not in this file)
- All technical parsers (in route.ts, not in this file)
- `getCompletedSessionClosingMessage()` — static string, no regex

**Risks**:
- Edge case not covered by parity test (mitigate: comprehensive test set in ST-2.3)
- Rollback needed (mitigate: git revert of this single commit)

**Required tests / validation**:
- All existing tests pass
- New classifier-specific tests pass
- No reference to deleted patterns in codebase

**Verification steps**:
1. Deleted patterns no longer exist in file
2. All tests pass
3. `resolveCompletedSessionHandling()` returns correct results
4. No import errors or undefined references
5. grep confirms no orphaned references to deleted patterns

**Exit criteria**: Regex deleted, classifier primary, all tests pass, Codex approved.

**Review checkpoint notes**: Post-deletion Codex review — verify clean removal.

---

### ST-3.1: Implement Route-Level Revision Intent Classifier

**Objective**: Create a classifier that detects revision intent in user messages, replacing the post-stream regex in route.ts.

**Why this subtask exists**: The route.ts revision regex reads user language to determine if the model missed a revision tool call. A classifier does this better.

**Files in scope**:
- CREATE: `src/lib/ai/classifiers/revision-intent-classifier.ts`
- READ (reference): `src/app/api/chat/route.ts` (line ~3059 area)

**Files explicitly out of scope**: `completed-session.ts` (already handled), all P2/P3/P4 files

**Inputs / dependencies**: Utility module (ST-1.2), schemas (ST-1.1)

**Exact behavior target**: Export function:
```
classifyRevisionIntent(options: {
  lastUserContent: string,
  model: LanguageModel,
}): Promise<RevisionIntentOutput | null>
```

**Regex/patterns expected to be replaced** (by this classifier, not yet deleted):
- `\b(revisi|edit|ubah|ganti|perbaiki|resend|generate ulang|tulis ulang|koreksi|buat ulang|ulangi|dari awal)\b`

**Regex/patterns explicitly preserved**: ALL security sanitizers, ALL observability guards, ALL fallback title extraction, corruption guard

**Risks**: Over-detection of revision intent triggers unnecessary warnings. Mitigate: this is observability-only, not behavior-altering.

**Required tests / validation**:
- Unit tests covering revision and non-revision messages
- Parity comparison against regex on representative inputs

**Verification steps**:
1. Function compiles
2. Tests pass
3. Classifier output conforms to RevisionIntentSchema

**Exit criteria**: Classifier works standalone, tests pass.

**Review checkpoint notes**: None — straightforward, observability-only impact.

---

### ST-3.2: Wire and Verify Route-Level Revision Classifier

**Objective**: Replace the revision intent regex in route.ts with the classifier. Run dual-write, then promote.

**Why this subtask exists**: Integrates the revision classifier into the post-stream flow.

**Files in scope**:
- MODIFY: `src/app/api/chat/route.ts` (line ~3059 area only)
- READ: `src/lib/ai/classifiers/revision-intent-classifier.ts`

**Files explicitly out of scope**: `completed-session.ts`, all P2/P3/P4 files, ALL preserve regex in route.ts

**Inputs / dependencies**: Revision classifier (ST-3.1)

**Exact behavior target**:
1. Replace inline regex test with classifier call
2. Classifier failure → no action (same as regex no-match)
3. Classifier low confidence → log but don't act
4. Result is still observability-only (log warning, don't alter content)

**Regex/patterns expected to be replaced**: Revision intent regex (line ~3059)

**Regex/patterns explicitly preserved**:
- FORBIDDEN_REASONING_PATTERNS (12 security patterns)
- sanitizeReasoningText() fence/code stripping
- Fence stripping output (```json, ```yaml-spec)
- Whitespace collapse
- Tool name sanitization
- Corruption guard
- Fallback title extraction
- ALL observability guards (leakage, validation claim, error leakage)

**Risks**: Touching route.ts is high-risk. Mitigate: change is surgical (one regex → one classifier call), preserves ALL other regex.

**Required tests / validation**:
- Existing route tests pass
- Parity test on representative revision/non-revision inputs

**Verification steps**:
1. Only the revision regex is changed
2. All preserve regex confirmed untouched (diff check)
3. All tests pass
4. Observability logging works correctly

**Exit criteria**: Revision regex replaced with classifier, all other route.ts regex untouched, tests pass.

**Review checkpoint notes**: MANDATORY Codex review — route.ts is the most sensitive file.

---

### ST-3.3: P1 Regression Verification

**Objective**: Full regression check of all P1 changes (completed-session + route revision).

**Why this subtask exists**: P1 files are highest-risk. Before moving to P2, verify no regressions.

**Files in scope**: All P1 files (read-only for verification)

**Files explicitly out of scope**: P2/P3/P4 files

**Inputs / dependencies**: ST-2.4, ST-3.2

**Exact behavior target**: All P1 behavioral paths work correctly with classifier-based decisions.

**Required tests / validation**:
- Full test suite passes
- Manual verification of key scenarios
- Preserve regex audit (confirm none were removed)

**Exit criteria**: All tests pass, no regressions, Codex approved.

**Review checkpoint notes**: MANDATORY review gate. P2 work cannot start until P1 is verified.

---

### ST-5.1: Implement Exact Source Follow-Up Classifier

**Objective**: Create classifier that replaces language-understanding regex in exact-source-followup.ts.

**Why this subtask exists**: 25 regex patterns in exact-source-followup.ts read user language. The classifier handles this better, especially for ambiguous short prompts.

**Files in scope**:
- CREATE: `src/lib/ai/classifiers/exact-source-classifier.ts`
- READ (reference): `src/lib/ai/exact-source-followup.ts`

**Files explicitly out of scope**: route.ts, completed-session.ts, all P4 files

**Inputs / dependencies**: Utility module (ST-1.2), schemas (ST-1.1), P1 verified (ST-3.3)

**Exact behavior target**: Export function:
```
classifyExactSourceIntent(options: {
  lastUserMessage: string,
  availableSourceTitles: string[],
  model: LanguageModel,
}): Promise<ExactSourceClassifierOutput | null>
```

**Regex/patterns expected to be replaced**:
- EXACT_SOURCE_PATTERNS (12)
- NON_EXACT_SUMMARY_PATTERNS (6)
- CONTINUATION_PATTERNS (7)
- CONTINUATION_CUES string matches

**Regex/patterns explicitly preserved**:
- `normalizeText()` — text normalization
- `escapeRegExp()` — utility
- `extractDomainLabel()` — URL parsing
- Source matching functions (`matchesSourceReference`, `findExplicitMatches`, `resolveFromRecentContext`, `hasTitleMatch`, `buildSourceCandidates`)
- Dynamic boundary regex for source matching

**Risks**: Source resolution depends on both intent classification AND source matching. Classifier replaces intent only; matching logic stays. Must verify the interface between them works.

**Required tests / validation**:
- Unit tests for exact, summary, continuation, and none intents
- Parity comparison against regex
- Verify `mentionedSourceHint` is useful for source matcher

**Verification steps**:
1. Function compiles
2. Tests pass
3. Intent classification is independent from source matching

**Exit criteria**: Classifier works standalone, correctly identifies intent types.

**Review checkpoint notes**: Review before wiring into runtime.

---

### ST-5.2: Wire Exact Source Classifier and Verify

**Objective**: Integrate classifier into `resolveExactSourceFollowup()`, replacing regex intent detection while keeping source matching intact.

**Why this subtask exists**: Wiring and verification of the exact-source classifier.

**Files in scope**:
- MODIFY: `src/lib/ai/exact-source-followup.ts`

**Files explicitly out of scope**: route.ts, completed-session.ts, reference-presentation.ts

**Inputs / dependencies**: Exact source classifier (ST-5.1)

**Exact behavior target**:
1. Replace `isExactIntent()`, `isNonExactSummaryRequest()`, `isContinuationPrompt()` with classifier
2. Keep all source matching functions unchanged
3. Classifier output `mentionedSourceHint` feeds into existing `findExplicitMatches()` or `resolveFromRecentContext()`
4. Dual-write initially, then promote after parity

**Regex/patterns expected to be replaced**: 25 language patterns (exact, summary, continuation)

**Regex/patterns explicitly preserved**: normalizeText(), escapeRegExp(), extractDomainLabel(), all source matching logic, dynamic boundary regex

**Exit criteria**: Intent detection uses classifier, source matching unchanged, all tests pass.

**Review checkpoint notes**: Codex review.

---

### ST-5.3: Implement and Wire Search Response Mode Classifier

**Objective**: Replace `inferSearchResponseMode()` regex with classifier.

**Why this subtask exists**: 14 regex patterns determine synthesis vs reference_inventory mode.

**Files in scope**:
- CREATE: `src/lib/ai/classifiers/search-response-mode-classifier.ts`
- MODIFY: `src/lib/ai/web-search/reference-presentation.ts` (only `inferSearchResponseMode()`)

**Files explicitly out of scope**: All URL/title normalization functions, buildReferencePresentationSources(), all P4 files

**Inputs / dependencies**: Utility module (ST-1.2), schemas (ST-1.1)

**Exact behavior target**: Replace `inferSearchResponseMode()` body with classifier call. Default to `"synthesis"` on failure.

**Regex/patterns expected to be replaced**: 14 referenceInventoryPatterns

**Regex/patterns explicitly preserved**: tracking param removal (`^utm_`), PDF detection, weak title checks, all URL normalization, all source building functions

**Exit criteria**: Mode determination uses classifier, all preserve regex untouched, tests pass.

**Review checkpoint notes**: Review to verify preserve regex not touched.

---

### ST-5.4: Address Internal Thought Separation

**Objective**: Implement instruction-based fix for internal thought preambles; keep regex as non-destructive fallback.

**Why this subtask exists**: Internal thought patterns are language heuristics, but the replacement is instruction-based (not classifier-based).

**Files in scope**:
- MODIFY: `src/lib/ai/internal-thought-separator.ts` (add deprecation comments to INTERNAL_THOUGHT_PATTERNS)
- MODIFY: Search model system prompt (if accessible in code) to instruct against emitting internal thought preambles

**Files explicitly out of scope**: route.ts, completed-session.ts, reference-presentation.ts

**Inputs / dependencies**: P1 verified (ST-3.3)

**Exact behavior target**:
1. Update search model system prompt to instruct: "Do not emit internal thought or search acknowledgment preambles. Start directly with the answer."
2. Keep INTERNAL_THOUGHT_PATTERNS regex active as non-destructive fallback
3. Add observability: log when regex catches internal thought (to monitor instruction compliance)
4. Add deprecation comments noting regex will be removed when instruction compliance is verified

**Regex/patterns expected to be replaced**: None (kept as fallback)

**Regex/patterns explicitly preserved**: ALL — INTERNAL_THOUGHT_PATTERNS stays active, stripEmptyReferenceLines() stays, sentence boundary helpers stay

**Risks**: Instruction fix is probabilistic — model may still emit internal thought. Regex fallback catches this.

**Exit criteria**: System prompt updated, regex still active as fallback, observability logging added.

**Review checkpoint notes**: This is an instruction-based fix (probabilistic). Note this clearly.

---

### ST-5.5: P2 Parity Verification and Regex Cleanup

**Objective**: Verify P2 changes and remove replaced regex patterns after parity evidence.

**Files in scope**:
- MODIFY: `src/lib/ai/exact-source-followup.ts` (delete replaced regex)
- MODIFY: `src/lib/ai/web-search/reference-presentation.ts` (delete replaced regex)
- READ: `src/lib/ai/internal-thought-separator.ts` (regex stays — no deletion)

**Inputs / dependencies**: ST-5.2, ST-5.3, ST-5.4

**Exact behavior target**: Delete regex patterns that have been replaced by classifiers. Keep all preserve-category regex.

**Exit criteria**: Replaced regex deleted, preserve regex confirmed intact, all tests pass.

**Review checkpoint notes**: MANDATORY Codex review before P2 regex deletion.

---

### ST-6.1: P3 Evaluation — Paper Intent Detector

**Objective**: Evaluate whether paper-intent-detector.ts should be migrated to semantic classifier.

**Files in scope**: `src/lib/ai/paper-intent-detector.ts` (READ only)

**Exact behavior target**: Produce written recommendation: replace / optimize / defer / keep as-is. Include rationale.

**Exit criteria**: Decision documented.

---

### ST-6.2: P3 Evaluation — Curated Trace

**Objective**: Evaluate whether curated-trace.ts keyword bucket scoring should be improved.

**Files in scope**: `src/lib/ai/curated-trace.ts` (READ only)

**Exact behavior target**: Produce written recommendation: replace / optimize / defer / keep as-is.

**Exit criteria**: Decision documented.

---

### ST-7.1: Final Documentation Update and Cleanup

**Objective**: Update all spec documents to reflect completed work.

**Files in scope**:
- MODIFY: `docs/regex-revision-system/FILE-INVENTORY.md`
- MODIFY: `docs/regex-revision-system/REGEX-CLEANUP-PRIORITIES.md`
- MODIFY: `SCOPE.md` (root)

**Exact behavior target**: Update status of each priority item. Mark completed items. Note deferred items. Update preserve matrix.

**Exit criteria**: All docs reflect final state, Codex approved.

---

## 4. Recommended Execution Order

```
ST-0.1 (design review)
  │
  ▼
ST-1.1 (schemas) ──► ST-1.2 (utility module)
                         │
                         ▼
                    ST-2.1 (completed-session classifier)
                         │
                         ▼
                    ST-2.2 (wire dual-write)
                         │
                         ▼
                    ST-2.3 (parity test) ── REVIEW GATE ──
                         │
                         ▼
                    ST-2.4 (promote + delete regex)
                         │
                         ▼
                    ST-3.1 (revision intent classifier)
                         │
                         ▼
                    ST-3.2 (wire into route.ts) ── REVIEW GATE ──
                         │
                         ▼
                    ST-3.3 (P1 regression) ── REVIEW GATE ──
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
          ST-5.1     ST-5.3     ST-5.4
    (exact-source) (search-mode) (internal-thought)
              │          │          │
              ▼          ▼          │
          ST-5.2     (merged)      │
              │          │          │
              └──────────┼──────────┘
                         ▼
                    ST-5.5 (P2 parity + cleanup) ── REVIEW GATE ──
                         │
                    ┌────┴────┐
                    ▼         ▼
                ST-6.1    ST-6.2
              (paper)    (trace)
                    │         │
                    └────┬────┘
                         ▼
                    ST-7.1 (final docs) ── REVIEW GATE ──
```

### Dependency Summary

| Subtask | Blocked By | Blocks |
|---------|-----------|--------|
| ST-0.1 | None | ST-1.1 |
| ST-1.1 | ST-0.1 | ST-1.2 |
| ST-1.2 | ST-1.1 | ST-2.1, ST-3.1, ST-5.1, ST-5.3 |
| ST-2.1 | ST-1.2 | ST-2.2 |
| ST-2.2 | ST-2.1 | ST-2.3 |
| ST-2.3 | ST-2.2 | ST-2.4 |
| ST-2.4 | ST-2.3 + Codex approval | ST-3.1 |
| ST-3.1 | ST-2.4 | ST-3.2 |
| ST-3.2 | ST-3.1 | ST-3.3 |
| ST-3.3 | ST-3.2 + Codex approval | ST-5.1, ST-5.3, ST-5.4 |
| ST-5.1 | ST-3.3 | ST-5.2 |
| ST-5.2 | ST-5.1 | ST-5.5 |
| ST-5.3 | ST-3.3 | ST-5.5 |
| ST-5.4 | ST-3.3 | ST-5.5 |
| ST-5.5 | ST-5.2, ST-5.3, ST-5.4 + Codex approval | ST-6.1, ST-6.2 |
| ST-6.1 | ST-5.5 | ST-7.1 |
| ST-6.2 | ST-5.5 | ST-7.1 |
| ST-7.1 | ST-6.1, ST-6.2 | None |

### Parallelizable Work

- ST-5.1, ST-5.3, ST-5.4 can run in parallel after ST-3.3 approval
- ST-6.1 and ST-6.2 can run in parallel

---

## 5. Commit Strategy

### Isolation Rules

| Rule | Rationale |
|------|-----------|
| One commit per subtask | Each subtask is independently reviewable and revertable |
| Schema changes in separate commit from runtime wiring | Schema is foundation — must be stable before wiring |
| Regex deletion NEVER in same commit as classifier creation | Ensures clean rollback: revert deletion without losing classifier |
| Doc updates in separate commit from code changes | Prevents documentation noise in code review |
| Preserve-category files never modified in classifier commits | Prevents accidental preserve regex changes |

### Commit Message Convention

```
feat(classifier): [ST-X.Y] <description>

<detailed explanation of what changed and why>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

### When Regex Deletion Is Allowed

1. ONLY after parity evidence exists (documented in parity report)
2. ONLY after Codex approval at review gate
3. ONLY for patterns explicitly listed in the subtask's "expected to be replaced" section
4. NEVER for patterns in the "explicitly preserved" section

### When Doc Update Is Required

- After every review gate checkpoint
- After regex deletion
- After P3 evaluation decisions
- At final cleanup (ST-7.1)

---

## 6. Review Gates

| Gate | After Subtask | What Codex Reviews | Blocker For |
|------|--------------|-------------------|-------------|
| **Gate 1: Design Approval** | ST-0.1 | Design doc, schema shapes, scope boundary | All implementation |
| **Gate 2: Classifier Quality** | ST-2.3 | Parity report, discrepancy analysis | Regex deletion (ST-2.4) |
| **Gate 3: Route Safety** | ST-3.2 | Route.ts diff, preserve regex audit | P1 regression (ST-3.3) |
| **Gate 4: P1 Regression** | ST-3.3 | Full P1 test results, no regressions | P2 work |
| **Gate 5: P2 Cleanup** | ST-5.5 | P2 parity evidence, preserve regex audit | P3 evaluation |
| **Gate 6: Final Merge** | ST-7.1 | All docs updated, all tests pass, scope respected | Branch merge to main |

---

## 7. Explicit Non-Goals

The following are NOT part of this implementation plan:

1. **Rearchitecting the AI router** — The existing `decideWebSearchMode()` LLM router stays as-is. We add classifiers for FALLBACK paths only.

2. **Deleting deterministic parsers** — No parser, sanitizer, validator, or renderer regex will be replaced with model intelligence. They are efficient, deterministic, and correct.

3. **Building a unified mega-classifier** — Each domain gets its own classifier with its own schema. No monolithic intent service.

4. **Removing security sanitizers** — FORBIDDEN_REASONING_PATTERNS and sanitizeReasoningText() are permanently preserved.

5. **Touching P4 preserve files** — MarkdownRenderer.tsx, ChatWindow.tsx, ChatContainer.tsx, daftarPustakaCompiler.ts, stageDataWhitelist.ts, paperSessions.ts — all stay unchanged.

6. **Modifying the model provider or model selection** — Classifiers use whatever model is available. No model migration.

7. **Adding user-facing features** — This is infrastructure work. No new UI, no new user-facing behavior.

8. **Optimizing observability guards** — Route-level observability regex (leakage, validation claim detection) stays during this phase. Can be replaced with structured tool outcome verification in a future phase.

9. **Modifying Convex schemas or mutations** — Backend data model stays unchanged.

10. **Converting the corruption guard to classifier** — `tool_code|sekarang kita masuk ke tahap|yaml-spec` detects model output artifacts. This is a model output sanitizer, not a language heuristic. Preserved.

11. **Converting fallback title extraction to classifier** — This parses semi-structured model output. It's a parser, not language understanding. Preserved.
