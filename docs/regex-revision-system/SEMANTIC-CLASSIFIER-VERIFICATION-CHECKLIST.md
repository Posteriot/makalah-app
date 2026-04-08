# Semantic Classifier Verification Checklist

## 1. Pre-Implementation Checklist

Complete ALL items before any implementation code is written.

- [ ] SEMANTIC-CLASSIFIER-DESIGN.md reviewed and approved by Codex
- [ ] Scope boundary confirmed: in-scope files match SCOPE.md
- [ ] Preserve regex categories identified and listed in design doc section 7
- [ ] No unintended file expansion: design does not add files beyond SCOPE.md
- [ ] Schema shapes agreed: all Zod schemas reviewed against existing TypeScript types
- [ ] Ambiguity policy defined: safe defaults documented for every domain
- [ ] Decision source hierarchy documented: when classifier vs router vs runtime guard vs tool state takes precedence
- [ ] Security sanitizer carve-out explicitly documented: FORBIDDEN_REASONING_PATTERNS, sanitizeReasoningText() preserved
- [ ] Model instruction language confirmed: all classifier prompts in English (per CLAUDE.md)
- [ ] Existing `generateText` + `Output.object()` pattern reviewed (refrasa/route.ts) as implementation reference

---

## 2. Per-Subtask Verification Checklist Template

Use this checklist for EVERY subtask. Copy and fill in per subtask.

### Subtask: [ST-X.Y] [Title]

**Scope verification:**
- [ ] Files changed are within declared scope
- [ ] No files outside scope were modified (verify with `git diff --name-only`)
- [ ] No preserve-category regex was removed, modified, or moved
- [ ] No security sanitizer was touched

**Behavior verification:**
- [ ] Exact behavior target from implementation plan is met
- [ ] All existing tests pass (no regression)
- [ ] New tests added for new functionality
- [ ] No unrelated refactoring included in the change

**Quality verification:**
- [ ] TypeScript compiles without errors
- [ ] No unused imports or exports introduced
- [ ] Classifier prompts are English-only
- [ ] Zod `.describe()` strings are clear and actionable
- [ ] Error/timeout fallback returns safe default (never short-circuit on error)

**Documentation verification:**
- [ ] Commit message follows convention: `feat(classifier): [ST-X.Y] <description>`
- [ ] Changes are isolated to one commit per subtask
- [ ] No regex deletion in same commit as classifier creation

**Exit criteria:**
- [ ] All exit criteria from implementation plan are met
- [ ] Ready for review (if review gate applies)

---

## 3. P1-Specific Verification

### 3.1 Completed Session Handling Parity (ST-2.3)

**Decision parity:**
- [ ] Revision intent: classifier agrees with REVISION_VERB_PATTERN on representative inputs
- [ ] Informational intent: classifier agrees with INFORMATIONAL_PATTERN on representative inputs
- [ ] Continuation intent: classifier agrees with CONTINUE_LIKE_PATTERN on representative inputs
- [ ] Artifact recall: classifier agrees with RECALL_DISPLAY_VERB + RECALL_ARTIFACT_TARGET on representative inputs
- [ ] Question exclusion: classifier correctly excludes question-form inputs from recall

**Safety checks:**
- [ ] No accidental default to `short_circuit_closing` — verify classifier defaults to `allow_normal_ai` or `clarify` when ambiguous
- [ ] Empty message → `short_circuit_closing` (deterministic, not classifier)
- [ ] `hasChoiceInteractionEvent` → `short_circuit_closing` (deterministic, not classifier)
- [ ] Classifier error/timeout → `allow_normal_ai` (never short-circuit on error)
- [ ] Confidence < 0.6 → `clarify` or `allow_normal_ai` (never act on low confidence)

**Artifact recall safety:**
- [ ] `targetStage` is always a valid PaperStageId or null
- [ ] `targetStage` is null when intent is not artifact_recall
- [ ] If `targetStage` artifact doesn't exist in Convex → `clarify` (not crash)
- [ ] If `targetStage` is null but handling is artifact_recall → `clarify` (ask which stage)

**Route-level persisted content safety:**
- [ ] Classifier NEVER directly modifies persisted content
- [ ] Classifier only determines routing — content persistence follows existing paths
- [ ] Corruption guard (`tool_code|sekarang kita masuk ke tahap`) is PRESERVED and active
- [ ] Fallback title extraction is PRESERVED and active
- [ ] FORBIDDEN_REASONING_PATTERNS are PRESERVED and active

**No lifecycle derived from prose:**
- [ ] Classifier does not read model output text to determine session handling
- [ ] `paperSession.currentStage` (Convex state) is the sole trigger for completed-session path
- [ ] Tool tracker flags (tool call success) are ground truth, not overridden by classifier
- [ ] `routerIntent` determines primary routing (save_submit/sync_request/search/compile_daftar_pustaka are deterministic)
- [ ] `routerIntent === "discussion"` triggers classifier for artifact recall refinement (replaces regex helpers)
- [ ] `routerIntent` undefined triggers classifier for full fallback classification
- [ ] `isArtifactRecallRequest()` deleted — replaced by classifier in both paths
- [ ] `isArtifactRecallReason()` deleted — replaced by classifier using routerReason as context
- [ ] No regex-based recall helper remains in any decision path

**Specific regression scenarios to test:**

| Input | Expected handling | Verify |
|-------|------------------|--------|
| "" (empty) | short_circuit_closing | [ ] |
| "ok" | short_circuit_closing | [ ] |
| "lanjut" | short_circuit_closing | [ ] |
| "gas" | short_circuit_closing | [ ] |
| "revisi abstrak" | allow_normal_ai | [ ] |
| "ubah judul" | allow_normal_ai | [ ] |
| "lihat abstrak" | server_owned_artifact_recall (targetStage: abstrak) | [ ] |
| "tampilkan outline" | server_owned_artifact_recall (targetStage: outline) | [ ] |
| "tampilkan tinjauan literatur" | server_owned_artifact_recall (targetStage: tinjauan_literatur) | [ ] |
| "di mana daftar pustaka?" | allow_normal_ai (question, not recall) | [ ] |
| "apakah ada abstrak?" | allow_normal_ai (question, not recall) | [ ] |
| "bagaimana cara export?" | allow_normal_ai | [ ] |
| "yang tadi" | clarify (ambiguous) | [ ] |
| "buat yang lebih baik" | allow_normal_ai (revision intent, no explicit verb) | [ ] |
| Choice interaction event | short_circuit_closing (deterministic) | [ ] |

### 3.2 Route-Level Revision Intent Verification (ST-3.2)

**Behavior verification:**
- [ ] Classifier only fires in post-stream fallback path (model didn't call revision tools)
- [ ] If `paperToolTracker.sawRequestRevisionSuccess` → classifier not called
- [ ] If `paperToolTracker.sawUpdateArtifactSuccess` → classifier not called
- [ ] Classifier result is observability-only (log warning, never alter content)
- [ ] Classifier failure → no action (same as regex no-match)

**Preserve verification:**
- [ ] FORBIDDEN_REASONING_PATTERNS (12 patterns): UNTOUCHED
- [ ] sanitizeReasoningText(): UNTOUCHED
- [ ] Fence stripping (```json, ```yaml-spec): UNTOUCHED
- [ ] Whitespace collapse: UNTOUCHED
- [ ] Tool name sanitization: UNTOUCHED
- [ ] Corruption guard: UNTOUCHED
- [ ] Fallback title extraction: UNTOUCHED
- [ ] Observability guards (leakage, validation, error): UNTOUCHED

---

## 4. P2-Specific Verification

### 4.1 Exact Source Resolution Safety (ST-5.2)

- [ ] Classifier determines INTENT only — source matching logic is UNCHANGED
- [ ] `normalizeText()`: PRESERVED
- [ ] `escapeRegExp()`: PRESERVED
- [ ] `extractDomainLabel()`: PRESERVED
- [ ] `matchesSourceReference()`: PRESERVED
- [ ] `findExplicitMatches()`: PRESERVED
- [ ] `resolveFromRecentContext()`: PRESERVED
- [ ] `hasTitleMatch()`: PRESERVED
- [ ] `buildSourceCandidates()`: PRESERVED
- [ ] Dynamic boundary regex (` new RegExp(\`\\b${...}\\b\`, "u") `): PRESERVED
- [ ] Classifier mode `force_inspect` + no source match → `clarify` (not crash)
- [ ] Classifier mode `continuation` + no recent context → `mode: "none"` (safe)
- [ ] Classifier confidence < 0.6 → `mode: "none"` (don't inspect on weak signal)
- [ ] Multiple source matches → `clarify` (disambiguation)
- [ ] Empty message → `mode: "none"` (deterministic, no classifier needed)

### 4.2 Response Mode Routing Safety (ST-5.3)

- [ ] Only `inferSearchResponseMode()` body is replaced — function signature unchanged
- [ ] Tracking param removal (`^utm_`): PRESERVED
- [ ] PDF detection: PRESERVED
- [ ] Weak title checks: PRESERVED
- [ ] URL normalization functions: PRESERVED
- [ ] `buildReferencePresentationSources()`: PRESERVED
- [ ] `buildStoredReferenceInventoryItems()`: PRESERVED
- [ ] Classifier failure → `"synthesis"` (safe default)
- [ ] Classifier confidence < 0.6 → `"synthesis"` (safe default)
- [ ] Never default to `"reference_inventory"` on ambiguity

### 4.3 Internal Thought Separation Safety (ST-5.4)

- [ ] INTERNAL_THOUGHT_PATTERNS (6 patterns): KEPT AS FALLBACK (not deleted)
- [ ] `stripEmptyReferenceLines()`: PRESERVED
- [ ] `findLeadingSentenceBoundary()`: PRESERVED
- [ ] `buildUserFacingSearchPayload()`: PRESERVED
- [ ] Line split (`\r?\n`): PRESERVED
- [ ] Sentence boundary helpers: PRESERVED
- [ ] System prompt update is instruction-based (probabilistic) — noted explicitly
- [ ] Observability logging added to track regex match frequency
- [ ] No behavioral change until instruction compliance verified

### 4.4 Clarify Behavior for Ambiguity

- [ ] Exact source: ambiguous intent with single source → `clarify` (don't auto-inspect)
- [ ] Exact source: ambiguous intent with multiple sources → `clarify` (disambiguation)
- [ ] Search mode: ambiguous → `"synthesis"` (never default to inventory)
- [ ] Internal thought: ambiguous → keep full text (show everything rather than strip incorrectly)

---

## 5. Preserve Regex Checklist

Verify these categories are NEVER modified during any implementation subtask.

### 5.1 Security Sanitizers

- [ ] `FORBIDDEN_REASONING_PATTERNS` — 12 patterns in route.ts
  - `system\s+prompt`
  - `developer\s+prompt`
  - `chain[-\s]?of[-\s]?thought`
  - `\bcot\b`
  - `api[\s_-]?key`
  - `bearer\s+[a-z0-9._-]+`
  - `\btoken\b`
  - `\bsecret\b`
  - `\bpassword\b`
  - `\bcredential\b`
  - `internal\s+policy`
  - `tool\s+schema`
- [ ] `sanitizeReasoningText()` — fence stripping (` ```[\s\S]*?``` `) + inline code stripping (`` `([^`]+)` ``)

### 5.2 Deterministic Parser / Sanitizer

- [ ] Fence stripping output: ` ```json `, ` ``` `, ` ```yaml-spec `
- [ ] Whitespace collapse: `\s+`, `\n{3,}`
- [ ] Tool name sanitization: `[^a-zA-Z0-9:_-]`
- [ ] Text normalization: `[\u0300-\u036f]`, `https?:\/\/`, `www\.`, `[^\p{L}\p{N}\s./-]+`
- [ ] Line split: `\r?\n`

### 5.3 ID / Token / URL / DOI Validation and Normalization

- [ ] Convex ID: `^[a-z0-9]{32}$` (ChatWindow.tsx, ChatContainer.tsx)
- [ ] Tracking params: `^utm_` (reference-presentation.ts, paperSessions.ts, daftarPustakaCompiler.ts)
- [ ] DOI normalization: `^https?:\/\/doi\.org\/`, `^doi:\s*`
- [ ] URL extraction: `https?:\/\/[^\s]+`
- [ ] PDF detection: `\.pdf(?:$|[?#])`
- [ ] Weak title: `^source-\d+$`, `^https?:\/\/`, `^www\.`

### 5.4 Markdown / Rendering Regex

- [ ] Strip inline markdown (6 patterns in MarkdownRenderer.tsx)
- [ ] Table row cleanup, table separator
- [ ] Bare URL regex
- [ ] Citation marker detection
- [ ] Line ending normalization
- [ ] Blockquote trim

### 5.5 Stage Data Coercion / Technical Parsing

- [ ] Numeric range coercion: `^(\d+)\s*[-–]\s*(\d+)$` (stageDataWhitelist.ts)
- [ ] Citation parsing patterns (paperSessions.ts)
- [ ] Year extraction: `\b(19|20)\d{2}\b`
- [ ] Draft prefix cleanup: `^draf(?:t)?\b`
- [ ] Key normalization: `[\p{P}\p{S}]+`
- [ ] Weak citation/reference detection (daftarPustakaCompiler.ts)

### 5.6 Post-Stream Guards (Preserve During P1)

- [ ] Corruption guard: `tool_code|sekarang kita masuk ke tahap|yaml-spec|```yaml`
- [ ] Fallback title extraction: `judulTerpilih["\s:]*"([^"]+)"` and related patterns
- [ ] Observability guards: `panel validasi|approve|revisi`, `aku akan menyusun|draf ini akan|berikut adalah draf`, `kesalahan teknis|maafkan aku|...`

### 5.7 Source Matching Logic (Preserve in P2)

- [ ] Dynamic boundary regex: `new RegExp(\`\\b${escapeRegExp(candidate)}\\b\`, "u")`
- [ ] `escapeRegExp()` utility
- [ ] Domain extraction: `extractDomainLabel()` internals
- [ ] `stripEmptyReferenceLines()`: `^\s*(link|url):\s*$`
- [ ] Sentence boundary: `\s`, `[A-Z0-9]`

---

## 6. Regression Checklist

### 6.1 Completed Session Regression

- [ ] User in completed session sends continuation → gets closing message (not AI response)
- [ ] User in completed session asks question → gets AI response (not closing)
- [ ] User in completed session requests artifact → gets artifact (not closing or AI)
- [ ] User in completed session sends ambiguous prompt → gets clarification (not wrong action)
- [ ] User in completed session with choice interaction → gets closing (deterministic)
- [ ] Router intent defined → router path used (not classifier/regex)
- [ ] Router intent undefined → classifier path used (not regex)
- [ ] Classifier error → `allow_normal_ai` (not short-circuit)

### 6.2 Route Fallback Regression

- [ ] Model calls revision tools → no post-stream revision check needed
- [ ] Model doesn't call revision tools + user had revision intent → observability warning logged
- [ ] Model doesn't call revision tools + user had no revision intent → no warning
- [ ] FORBIDDEN_REASONING_PATTERNS still active and catching sensitive terms
- [ ] Corruption guard still replacing corrupt model output in completed sessions
- [ ] Fallback title extraction still working for failed tool call scenarios
- [ ] All observability guards still logging correctly

### 6.3 Source Follow-Up Regression

- [ ] User asks for exact source detail → correct source inspected
- [ ] User asks for summary → normal response (not inspection)
- [ ] User sends continuation cue → resolved from recent context
- [ ] User mentions source by title → correct source matched
- [ ] Multiple sources match → clarification requested
- [ ] No source matches → `mode: "none"` (normal response)
- [ ] Source matching functions produce same results as before

### 6.4 Search Presentation Regression

- [ ] User asks for "sumbernya" / "daftar sumber" → reference_inventory mode
- [ ] User asks normal question → synthesis mode
- [ ] URL normalization still strips tracking params
- [ ] PDF documents still detected correctly
- [ ] Weak titles still replaced with fetched titles
- [ ] Source deduplication still works

### 6.5 Trace / Observability Regression

- [ ] Curated trace still classifies reasoning sentences (unchanged)
- [ ] Paper intent detector still detects paper writing intent (unchanged)
- [ ] Stage skill validator still validates skill content (unchanged)
- [ ] Internal thought preambles still stripped from public content (regex fallback active)

### 6.6 Persisted Content Corruption Regression

- [ ] Model output in completed session with `tool_code` → replaced with closing message
- [ ] Model output in completed session with `yaml-spec` → replaced with closing message
- [ ] Normal model output in completed session → NOT replaced
- [ ] Reasoning trace with sensitive terms → sanitized by FORBIDDEN_REASONING_PATTERNS
- [ ] Reasoning trace without sensitive terms → passed through unchanged
- [ ] Persisted message content matches what user should see

---

## 7. Final Readiness Checklist

Complete ALL items before implementation is considered ready to merge.

### Subtask Completion

- [ ] ST-0.1: Design review — APPROVED
- [ ] ST-1.1: Schemas created — DONE
- [ ] ST-1.2: Utility module created — DONE
- [ ] ST-2.1: Completed session classifier — DONE
- [ ] ST-2.2: Dual-write wiring — DONE
- [ ] ST-2.3: Parity test — PASSED
- [ ] ST-2.4: Regex deletion — DONE
- [ ] ST-3.1: Revision intent classifier — DONE
- [ ] ST-3.2: Route wiring — DONE
- [ ] ST-3.3: P1 regression — PASSED
- [ ] ST-5.1: Exact source classifier — DONE
- [ ] ST-5.2: Exact source wiring — DONE
- [ ] ST-5.3: Search mode classifier — DONE
- [ ] ST-5.4: Internal thought instruction — DONE
- [ ] ST-5.5: P2 parity + cleanup — DONE
- [ ] ST-6.1: Paper intent evaluation — DONE
- [ ] ST-6.2: Curated trace evaluation — DONE
- [ ] ST-7.1: Final docs — DONE

### Audit Checkpoints

- [ ] Gate 1 (Design): PASSED
- [ ] Gate 2 (Classifier Quality): PASSED
- [ ] Gate 3 (Route Safety): PASSED
- [ ] Gate 4 (P1 Regression): PASSED
- [ ] Gate 5 (P2 Cleanup): PASSED
- [ ] Gate 6 (Final Merge): PASSED

### Documentation

- [ ] FILE-INVENTORY.md updated to reflect classifier replacements
- [ ] REGEX-CLEANUP-PRIORITIES.md updated with completion status
- [ ] SCOPE.md updated with phase completion status
- [ ] SEMANTIC-CLASSIFIER-DESIGN.md reflects any design changes made during implementation

### Preserve Verification

- [ ] ALL security sanitizers confirmed present and functional (section 5.1)
- [ ] ALL deterministic parsers confirmed present and functional (section 5.2-5.5)
- [ ] ALL post-stream guards confirmed present and functional (section 5.6)
- [ ] ALL source matching logic confirmed present and functional (section 5.7)
- [ ] No P4 file modified at any point during implementation

### Regex Accounting

- [ ] Every replaced regex is documented: which classifier replaced it, in which subtask
- [ ] Every preserved regex is confirmed present: grep against preserve checklist
- [ ] No orphaned references: grep for deleted pattern names returns zero results
- [ ] No unreplaced language heuristic regex remains in P1/P2 files (except explicit deferrals)

### Open Issues

- [ ] No critical ambiguity unresolved
- [ ] No known false positive/negative regressions
- [ ] All deferred items documented (P3 evaluations, observability guard replacement)
- [ ] Instruction-based fixes labeled as probabilistic
