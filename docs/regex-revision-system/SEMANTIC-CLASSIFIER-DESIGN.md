# Semantic Classifier Design

## 1. Purpose

### Problem

The chat + paper session runtime uses regex patterns to read natural language — user messages and model prose — to make runtime decisions. These regex heuristics determine:

- Whether a completed session should short-circuit, allow normal AI, or recall an artifact
- Whether a user message is asking for exact source details vs summary
- Whether a search response should be presented as synthesis vs reference inventory
- Whether leading sentences in model output are internal thought vs public answer
- Whether a user has revision intent when the model failed to call tools

These regex patterns are brittle. They break when:

- Users phrase intent differently ("buat yang lebih baik" vs "revisi")
- Model output wording changes across versions
- New Indonesian phrasing isn't covered by the pattern list
- Ambiguous short prompts ("yang tadi", "ok") get misclassified

The consequences are concrete: wrong `handling` means users get short-circuited when they wanted to continue, or see closing messages when they asked to recall an artifact. Wrong source resolution means the wrong document gets inspected. Wrong response mode means users get a reference list when they wanted synthesis.

### Objective

Replace these regex-based language heuristics with structured semantic classifiers that:

1. Use `generateObject()` with Zod schemas to produce enum-constrained, type-safe decisions
2. Default to safe outcomes (`clarify`, `allow_normal_ai`) when ambiguous
3. Preserve all deterministic parser/sanitizer/security regex untouched
4. Can be tested, audited, and compared against the old regex behavior during migration

### What This Is Not

This is not a general AI system redesign. The scope is narrow: replace the specific regex patterns identified in FILE-INVENTORY.md that read natural language to make runtime decisions. Everything else stays.

---

## 2. Scope Boundary

### In-Scope

| Area | Files | Action |
|------|-------|--------|
| Completed session handling | `completed-session.ts` | Replace 7 regex patterns + resolveRecallTargetStage() |
| Route-level revision intent | `route.ts` (line ~3059) | Replace post-stream revision detection regex |
| Exact source follow-up | `exact-source-followup.ts` | Replace 25 language patterns (exact, summary, continuation) |
| Search response mode | `reference-presentation.ts` | Replace `inferSearchResponseMode()` 14 patterns |
| Internal thought separation | `internal-thought-separator.ts` | Replace 6 internal-thought patterns |
| Paper intent detection | `paper-intent-detector.ts` | Evaluate for P3; defer if stable |
| Curated trace classification | `curated-trace.ts` | Evaluate for P3; defer if stable |

### Out-of-Scope

| Area | Files | Reason |
|------|-------|--------|
| Markdown rendering | `MarkdownRenderer.tsx` | Deterministic parser — P4 preserve |
| Convex ID validation | `ChatWindow.tsx`, `ChatContainer.tsx` | Format validator — P4 preserve |
| Bibliography compilation | `daftarPustakaCompiler.ts` | Deterministic parser — P4 preserve |
| Stage data coercion | `stageDataWhitelist.ts` | Deterministic parser — P4 preserve |
| Citation parsing | `paperSessions.ts` | Deterministic parser — P4 preserve |
| Stage skill validation | `stage-skill-validator.ts` | Technical validator — P3 review only |

### Preserve Categories (Must Not Be Touched)

1. **Security sanitizers**: `FORBIDDEN_REASONING_PATTERNS` (12 patterns), `sanitizeReasoningText()` fence/code stripping — prevent credential/prompt leakage in reasoning traces
2. **Technical format parsers**: fence stripping (` ```json `, ` ```yaml-spec `), whitespace collapse (`\s+`, `\n{3,}`), tool name sanitization (`[^a-zA-Z0-9:_-]`)
3. **URL/DOI normalizers**: tracking param removal (`^utm_`), DOI prefix stripping, canonical URL generation
4. **Format validators**: Convex ID (`^[a-z0-9]{32}$`), numeric range coercion, year extraction
5. **Rendering helpers**: citation markers, table separators, bare URL detection, inline markdown stripping

### Carve-Out: Route-Level Observability Guards

The following regex patterns in `route.ts` are observability-only (log warnings, do not alter behavior or content):

- `panel validasi|approve|revisi` — false validation claim detection
- `aku akan menyusun|draf ini akan|berikut adalah draf` — prose leakage detection
- `kesalahan teknis|maafkan aku|saya akan coba|memperbaiki|...` — error leakage detection

These are low-risk and can be kept during P1, then replaced with structured tool outcome verification in a later phase. They do not alter persisted content or user-facing behavior.

### Carve-Out: Post-Stream Content Guards

- **Corruption guard** (`tool_code|sekarang kita masuk ke tahap|yaml-spec`): Detects model output artifacts and replaces persisted content. This detects technical format violations in model output, not user language. Classify as "model output sanitizer" — preserve during P1, evaluate structured replacement in P2+.
- **Fallback title extraction** (`judulTerpilih["\s:]*"([^"]+)"`): Parses semi-structured model output when tool call failed. This is a parser, not language understanding. Preserve as technical fallback.

---

## 3. Decision Domains

The classifier system covers 5 active domains (P1+P2) and 2 deferred domains (P3).

### Domain 1: Completed Session Handling

**When**: User sends a message while `paperSession.currentStage === "completed"`
**Currently**: `resolveCompletedSessionHandling()` in `completed-session.ts`
**Regex patterns**: REVISION_VERB_PATTERN, INFORMATIONAL_PATTERN, CONTINUE_LIKE_PATTERN, RECALL_DISPLAY_VERB, RECALL_ARTIFACT_TARGET, RECALL_QUESTION_EXCLUSION, REASON_ARTIFACT_PATTERN, REASON_RETRIEVAL_PATTERN, resolveRecallTargetStage()
**Outcomes**: `short_circuit_closing` | `allow_normal_ai` | `server_owned_artifact_recall` | `clarify`

### Domain 2: Artifact Recall Target Resolution

**When**: Completed session handling decides `server_owned_artifact_recall`
**Currently**: `resolveRecallTargetStage()` in `completed-session.ts`
**Regex patterns**: compound stage name patterns (`tinjauan.?literatur`, `pembaruan.?abstrak`, `daftar.?pustaka`) + dynamic `new RegExp(\`\\b${keyword}\\b\`)`
**Outcomes**: `PaperStageId | null`

### Domain 3: Route-Level Revision Intent (Post-Stream)

**When**: Model streamed response but didn't call revision tools, and user message had revision-like intent
**Currently**: Inline regex in `route.ts` line ~3059
**Regex patterns**: `\b(revisi|edit|ubah|ganti|perbaiki|...)\b`
**Outcomes**: Boolean flag triggering observability warning + potential fallback behavior

### Domain 4: Exact Source Follow-Up

**When**: User sends a message during a conversation with available web search sources
**Currently**: `resolveExactSourceFollowup()` in `exact-source-followup.ts`
**Regex patterns**: EXACT_SOURCE_PATTERNS (12), NON_EXACT_SUMMARY_PATTERNS (6), CONTINUATION_PATTERNS (7) + CONTINUATION_CUES
**Outcomes**: `"none"` | `"clarify"` | `"force-inspect"` with matched source

### Domain 5: Search Response Mode

**When**: Determining how to present web search results to user
**Currently**: `inferSearchResponseMode()` in `reference-presentation.ts`
**Regex patterns**: 14 reference inventory patterns
**Outcomes**: `"synthesis"` | `"reference_inventory"`

### Domain 6: Internal Thought Separation (Deferred — Instruction-Based)

**When**: Processing model output that may contain internal thought preambles
**Currently**: `splitInternalThought()` in `internal-thought-separator.ts`
**Regex patterns**: INTERNAL_THOUGHT_PATTERNS (6)
**Outcomes**: `{ publicContent, internalThoughtContent }`
**Note**: This domain operates on model output, not user input. The preferred solution is instructing the model to use structured output channels, not adding another classifier. Regex can remain as non-destructive fallback during transition.

### Domain 7: Paper Intent Detection (P3 — Deferred)

**When**: User sends first message or non-paper-mode message
**Currently**: `detectPaperIntent()` / `hasPaperWritingIntent()` in `paper-intent-detector.ts`
**Mechanism**: Keyword-based `.includes()`, not regex
**Outcomes**: Boolean + matched keywords
**Note**: Early gate, not runtime decision. Blast radius is limited (UI hint + system prompt injection). Defer to P3.

### Domain 8: Curated Trace Classification (P3 — Deferred)

**When**: Processing model reasoning text for UI trace display
**Currently**: `segmentReasoning()` in `curated-trace.ts`
**Mechanism**: Keyword bucket scoring with 43 regex patterns
**Outcomes**: 6-bucket step classification
**Note**: Informational UI only, no workflow impact. Defer to P3 or keep as-is.

---

## 4. Proposed Semantic Output Schema

### Design Principles

1. **Per-domain schemas**, not one unified mega-schema — domains run at different pipeline stages with different inputs
2. **Shared conventions**: all schemas include `confidence`, `reason`, enum-constrained outputs
3. **Zod-first**: all schemas defined as Zod objects for `generateObject()` / `Output.object()` compatibility
4. **classifierVersion**: string field for tracking schema evolution across deploys

### 4.1 Completed Session Classifier Output

```typescript
const CompletedSessionClassifierSchema = z.object({
  intent: z.enum([
    "revision",           // user wants to modify existing content
    "informational",      // user is asking a question about the paper/process
    "continuation",       // short confirmation or "continue" signal
    "artifact_recall",    // user wants to see a previously generated artifact
    "other",              // none of the above — needs further processing
  ]).describe("Primary intent of user message in a completed paper session"),

  handling: z.enum([
    "short_circuit_closing",        // end session with closing message
    "allow_normal_ai",              // let AI process normally
    "server_owned_artifact_recall", // fetch and display artifact from stage data
    "clarify",                      // ask user to clarify ambiguous request
  ]).describe("Recommended handling action for this message"),

  targetStage: z.string().nullable()
    .describe("Paper stage ID if artifact_recall (e.g. 'abstrak', 'tinjauan_literatur'). Null otherwise."),

  needsClarification: z.boolean()
    .describe("True if intent is ambiguous and system should ask for clarification"),

  confidence: z.number().min(0).max(1)
    .describe("Classifier confidence. Below 0.6 should trigger clarify behavior."),

  reason: z.string()
    .describe("Brief explanation of why this classification was chosen"),
})
```

**Field justification:**

| Field | Why it exists | Mandatory? |
|-------|--------------|------------|
| `intent` | Replaces REVISION_VERB, INFORMATIONAL, CONTINUE_LIKE, RECALL regex | Yes |
| `handling` | Direct replacement for `CompletedSessionDecision.handling` | Yes |
| `targetStage` | Replaces `resolveRecallTargetStage()` regex | Yes (nullable) |
| `needsClarification` | Explicit signal for ambiguity — replaces implicit regex fallthrough | Yes |
| `confidence` | Enables graduated response: high → act, low → clarify | Yes |
| `reason` | Observability — replaces opaque regex match/no-match | Yes |

**Fields from Codex's list NOT included and why:**

| Field | Why excluded |
|-------|-------------|
| `subIntent` | Redundant with `intent` — the enum already captures sub-categories |
| `targetSourceId` | Not applicable to this domain (that's exact-source) |
| `responseMode` | Not applicable to this domain (that's search response) |
| `classifierVersion` | Attached at runtime by the caller, not emitted by the model |
| `decisionSource` | Determined by the caller (classifier vs router_intent vs runtime_guard), not by the model |
| `preserveReason` | Documentation field, not a classifier output |

### 4.2 Exact Source Follow-Up Classifier Output

```typescript
const ExactSourceClassifierSchema = z.object({
  mode: z.enum([
    "force_inspect",  // user wants exact details from a specific source
    "clarify",        // ambiguous — ask which source
    "none",           // not an exact-source request
  ]).describe("Follow-up mode for source inspection"),

  sourceIntent: z.enum([
    "exact_detail",    // title, author, date, verbatim quote
    "summary",         // ringkas, rangkum, simpulkan
    "continuation",    // follow-up on previously discussed source
    "none",            // no source-related intent
  ]).describe("Type of source-related intent"),

  mentionedSourceHint: z.string().nullable()
    .describe("Source identifier mentioned by user (title fragment, domain, author name). Null if none."),

  needsClarification: z.boolean()
    .describe("True if multiple sources could match or intent is ambiguous"),

  confidence: z.number().min(0).max(1)
    .describe("Classifier confidence"),

  reason: z.string()
    .describe("Brief explanation of classification"),
})
```

**Note**: The classifier does NOT replace source matching logic. `mentionedSourceHint` is a hint for the existing `matchesSourceReference()` / `findExplicitMatches()` functions. The classifier determines INTENT; the matcher determines WHICH SOURCE.

### 4.3 Search Response Mode Classifier Output

```typescript
const SearchResponseModeSchema = z.object({
  responseMode: z.enum([
    "synthesis",            // integrate sources into narrative answer
    "reference_inventory",  // present sources as structured list
  ]).describe("How search results should be presented to user"),

  confidence: z.number().min(0).max(1)
    .describe("Classifier confidence"),

  reason: z.string()
    .describe("Brief explanation"),
})
```

### 4.4 Route-Level Revision Intent (Post-Stream)

```typescript
const RevisionIntentSchema = z.object({
  hasRevisionIntent: z.boolean()
    .describe("True if user message expresses intent to modify/revise existing content"),

  confidence: z.number().min(0).max(1)
    .describe("Classifier confidence"),

  reason: z.string()
    .describe("Brief explanation"),
})
```

**Note**: This schema is intentionally simple. It replaces a single regex pattern. The classifier only fires in the post-stream fallback path when the model failed to call revision tools.

### 4.5 Internal Thought Separation (Future — Instruction-Based)

No classifier schema proposed. The replacement strategy for this domain is:

1. **Instruction-based**: Update search model system prompt to emit structured channels (internal vs public) rather than mixing them in prose
2. **Preserve regex as fallback**: Keep `INTERNAL_THOUGHT_PATTERNS` as non-destructive cleanup during transition
3. **Long-term**: Use AI SDK data parts or structured output channels to separate content at the model level

This is an **instruction fix (probabilistic)**, not a deterministic code fix.

---

## 5. Domain-by-Domain Decision Contract

### Domain 1: Completed Session Handling

**Input available:**

| Data | Type | Source | Reliability |
|------|------|--------|-------------|
| `routerIntent` | `string \| undefined` | LLM router (`decideWebSearchMode`) | High — structured classification |
| `routerReason` | `string \| undefined` | LLM router output | Medium — free-text explanation |
| `lastUserContent` | `string` | User message, trimmed | High — direct user input |
| `hasChoiceInteractionEvent` | `boolean` | Parsed from request body | High — structural signal |
| `paperSession.currentStage` | `"completed"` | Convex state | High — ground truth |

**Source of truth hierarchy:**
1. `hasChoiceInteractionEvent` → if true, user made a structured UI choice → `short_circuit_closing`
2. `routerIntent` → if defined, determines primary routing (save_submit/sync_request → short_circuit, discussion/search → allow_normal_ai)
3. **Semantic classifier** → fires in TWO paths:
   - **Fallback path**: when `routerIntent` is undefined (replaces all regex heuristics)
   - **Router refinement path**: when `routerIntent === "discussion"`, replaces regex-based artifact recall detection within the router path (replaces `isArtifactRecallRequest()`, `isArtifactRecallReason()`, `RECALL_QUESTION_EXCLUSION`, `RECALL_ARTIFACT_TARGET` at lines 129-146)
4. Runtime guard → `clarify` if confidence < 0.6

**Important**: The classifier replaces regex in BOTH paths. The router determines the *category* (discussion/search/save_submit), but the *refinement within discussion* (is this an artifact recall?) currently uses regex. That refinement must also move to the classifier.

**Output:** `CompletedSessionClassifierSchema`

**Ambiguity handling:**
- Classifier confidence < 0.6 → `handling: "clarify"`
- Empty or whitespace-only message → `handling: "short_circuit_closing"` (deterministic, no classifier needed)
- Message is ≤ 3 words and confidence < 0.7 → `handling: "clarify"` (short prompts are inherently ambiguous)

**Fallback strategy:**
- If classifier call fails (timeout, error) → `handling: "allow_normal_ai"` (safe default — let AI process)
- Never fall back to `short_circuit_closing` on error — this was the old regex default and caused silent failures

**When runtime guard overrides classifier:**
- `hasChoiceInteractionEvent === true` → always `short_circuit_closing` (structural signal trumps semantic)
- `routerIntent` is `save_submit` or `sync_request` → always `short_circuit_closing` (deterministic, classifier not needed)
- `routerIntent` is `search` or `compile_daftar_pustaka` → always `allow_normal_ai` (deterministic, classifier not needed)
- `routerIntent` is `discussion` → classifier fires for artifact recall refinement (replaces regex helpers)

**When tool/Convex state overrides classifier:**
- If classifier says `server_owned_artifact_recall` but `targetStage` artifact doesn't exist in Convex → fall back to `clarify` with "artifact not found" message
- If classifier says `revision` but session is truly completed with no revisable stage → `clarify`

### Domain 2: Artifact Recall Target Resolution

**Input available:**
- `lastUserContent` (string)
- Valid `PaperStageId` enum values (known set)

**Source of truth:** Classifier output `targetStage` field from Domain 1

**Ambiguity handling:**
- If classifier provides `targetStage` with high confidence → use directly
- If `targetStage` is null but `handling` is `server_owned_artifact_recall` → `clarify` (ask which stage)
- If `targetStage` doesn't match any valid PaperStageId → `clarify`

**Fallback:** Ask user to specify which artifact they want to see.

### Domain 3: Route-Level Revision Intent (Post-Stream)

**Input available:**
- `lastUserContent` (string — the original user message)
- `paperToolTracker` state (boolean flags for tool call outcomes)
- `normalizedText` (model output text)

**Source of truth hierarchy:**
1. `paperToolTracker.sawRequestRevisionSuccess` → if true, revision happened (no regex/classifier needed)
2. `paperToolTracker.sawUpdateArtifactSuccess` → if true, update happened (no regex/classifier needed)
3. **Semantic classifier** → fires ONLY when no revision/update tools were called AND model produced text output

**Output:** `RevisionIntentSchema`

**Ambiguity handling:**
- If classifier says revision intent but tools succeeded → ignore (tool state is ground truth)
- If classifier says no revision intent → no action (model handled it differently)
- If classifier confidence < 0.6 → log observability warning but don't alter behavior

**Fallback:** Log warning only. Do not alter persisted content based on this classifier alone.

### Domain 4: Exact Source Follow-Up

**Input available:**
- `lastUserMessage` (string)
- `recentMessages` (conversation history array)
- `availableExactSources` (source summaries from Convex)

**Source of truth hierarchy:**
1. Source existence in Convex → if source doesn't exist, can't force-inspect it
2. **Semantic classifier** → determines intent (exact detail, summary, continuation, none)
3. **Source matcher** → existing `matchesSourceReference()` / `findExplicitMatches()` logic determines WHICH source

**Output:** `ExactSourceClassifierSchema`

**Ambiguity handling:**
- Classifier says `force_inspect` but no source matches `mentionedSourceHint` → `clarify`
- Classifier says `continuation` but no recent source context found → `mode: "none"`
- Multiple sources match → `clarify` with disambiguation prompt
- Classifier confidence < 0.6 → `mode: "none"` (don't trigger inspection on weak signal)

**Fallback:** `mode: "none"` — do not trigger exact-source inspection. Let normal response generation handle it.

**What the classifier replaces vs what stays:**
- **Replaces**: `isExactIntent()`, `isNonExactSummaryRequest()`, `isContinuationPrompt()` — all language heuristics
- **Stays**: `normalizeText()`, `escapeRegExp()`, `extractDomainLabel()`, `matchesSourceReference()`, `findExplicitMatches()`, `resolveFromRecentContext()`, `hasTitleMatch()`, `buildSourceCandidates()` — all structural/matching logic

### Domain 5: Search Response Mode

**Input available:**
- `lastUserMessage` (string)

**Source of truth:** Classifier output only (no other state to check)

**Output:** `SearchResponseModeSchema`

**Ambiguity handling:**
- Classifier confidence < 0.6 → default to `"synthesis"` (safer — user gets a narrative answer)
- Never default to `"reference_inventory"` on ambiguity — it's a more specialized mode

**Fallback:** `"synthesis"` — always safe.

### Domain 6: Internal Thought Separation

**Strategy:** Instruction-based, not classifier-based.

**Current behavior preserved as fallback:** `INTERNAL_THOUGHT_PATTERNS` regex stays active during transition period. It only affects presentation (strips leading internal-thought sentences), not persisted content or workflow.

**Transition plan:**
1. Update search model system prompt to avoid emitting internal-thought preambles
2. If model still emits them → regex catches and strips (non-destructive)
3. Monitor frequency of regex matches over time
4. When match rate drops below threshold → remove regex

---

## 6. Ambiguity Policy

### Core Principle

When in doubt, ask — never silently short-circuit.

### Decision Matrix

| Condition | Action | Rationale |
|-----------|--------|-----------|
| Confidence ≥ 0.8 | Act on classifier decision | High-confidence signal |
| Confidence 0.6–0.8 | Act, but with observability flag | Moderate confidence — log for monitoring |
| Confidence < 0.6 | Trigger `clarify` or safe default | Ambiguous — don't guess |
| Classifier error/timeout | Use safe default (`allow_normal_ai` or `"none"`) | Never short-circuit on error |
| Empty/whitespace message | `short_circuit_closing` (deterministic) | No semantic content to classify |
| `hasChoiceInteractionEvent` | `short_circuit_closing` (deterministic) | Structural signal, no ambiguity |

### Per-Domain Safe Defaults

| Domain | Safe Default | Why |
|--------|-------------|-----|
| Completed session | `allow_normal_ai` | Let AI handle — user can still interact |
| Artifact recall target | `clarify` | Ask which artifact — don't guess |
| Revision intent | No action (log only) | Don't alter behavior on weak signal |
| Exact source follow-up | `mode: "none"` | Don't trigger inspection — normal response |
| Search response mode | `"synthesis"` | Narrative answer is always acceptable |
| Internal thought | Keep full text | Showing internal thought is annoying but not harmful |

### When `clarify` Is Mandatory

1. Completed session with ambiguous short prompt (≤ 3 words, confidence < 0.7)
2. Artifact recall requested but `targetStage` is null
3. Exact source inspection requested but multiple sources match
4. Any domain where classifier confidence < 0.6

### When `clarify` Must NOT Be Used

1. `hasChoiceInteractionEvent` is true — user already made a clear choice
2. `routerIntent` is defined with high confidence — router already decided
3. Message is empty/whitespace — deterministic short-circuit, no need to ask
4. Tool state provides ground truth (e.g., revision tool succeeded)

---

## 7. Replace vs Preserve Matrix

### Replace — Language Heuristic Regex

| Pattern | File | Line(s) | Domain | Risk | Replacement |
|---------|------|---------|--------|------|-------------|
| `REVISION_VERB_PATTERN` | completed-session.ts | 14 | Completed session | High | Classifier `intent: "revision"` |
| `INFORMATIONAL_PATTERN` | completed-session.ts | 17 | Completed session | High | Classifier `intent: "informational"` |
| `CONTINUE_LIKE_PATTERN` | completed-session.ts | 20 | Completed session | High | Classifier `intent: "continuation"` |
| `RECALL_DISPLAY_VERB` | completed-session.ts | 24 | Completed session | High | Classifier `intent: "artifact_recall"` |
| `RECALL_ARTIFACT_TARGET` | completed-session.ts | 25 | Completed session | High | Classifier `intent: "artifact_recall"` + `targetStage` |
| `RECALL_QUESTION_EXCLUSION` | completed-session.ts | 27 | Completed session | High | Classifier distinguishes questions from commands |
| `REASON_ARTIFACT_PATTERN` | completed-session.ts | 44 | Completed session | Medium | Classifier uses routerReason as context |
| `REASON_RETRIEVAL_PATTERN` | completed-session.ts | 45 | Completed session | Medium | Classifier uses routerReason as context |
| `resolveRecallTargetStage()` | completed-session.ts | 62-92 | Recall target | High | Classifier `targetStage` field |
| Revision intent regex | route.ts | ~3059 | Route revision | High | RevisionIntentSchema classifier |
| `EXACT_SOURCE_PATTERNS` (12) | exact-source-followup.ts | 27-39 | Exact source | Medium-High | ExactSourceClassifierSchema `sourceIntent` |
| `NON_EXACT_SUMMARY_PATTERNS` (6) | exact-source-followup.ts | 42-48 | Exact source | Medium | ExactSourceClassifierSchema `sourceIntent: "summary"` |
| `CONTINUATION_PATTERNS` (7) | exact-source-followup.ts | 51-58 | Exact source | Medium | ExactSourceClassifierSchema `sourceIntent: "continuation"` |
| `CONTINUATION_CUES` | exact-source-followup.ts | ~106-108 | Exact source | Medium | ExactSourceClassifierSchema `sourceIntent: "continuation"` |
| `referenceInventoryPatterns` (14) | reference-presentation.ts | 213-227 | Search mode | Medium | SearchResponseModeSchema classifier |
| `INTERNAL_THOUGHT_PATTERNS` (6) | internal-thought-separator.ts | 22-27 | Internal thought | Medium | Instruction-based + regex fallback |

### Preserve — Deterministic Parser / Security Guard

| Pattern | File | Category | Why Preserved |
|---------|------|----------|---------------|
| `FORBIDDEN_REASONING_PATTERNS` (12) | route.ts | Security | Prevents credential/prompt leakage |
| `sanitizeReasoningText()` fence/code stripping | route.ts | Security | Reasoning trace sanitization |
| Fence stripping (` ```json `, ` ```yaml-spec `) | route.ts | Technical format | Removes code fences from model output |
| Whitespace collapse (`\s+`, `\n{3,}`) | route.ts | Technical format | Normalizes whitespace |
| Tool name sanitization (`[^a-zA-Z0-9:_-]`) | route.ts | Technical format | Ensures valid tool names |
| Corruption guard (`tool_code\|sekarang kita masuk ke tahap\|yaml-spec`) | route.ts | Model output sanitizer | Detects model output artifacts |
| Fallback title extraction (`judulTerpilih...`) | route.ts | Parser fallback | Parses semi-structured model output |
| `normalizeText()` | exact-source-followup.ts | Text normalization | NFKD decomposition, URL stripping |
| `escapeRegExp()` | exact-source-followup.ts | Utility | Escapes for regex construction |
| `extractDomainLabel()` | exact-source-followup.ts | URL parsing | Hostname extraction |
| Source matching (dynamic boundary regex) | exact-source-followup.ts | Structural matching | Word-boundary matching for source candidates |
| Tracking param removal (`^utm_`) | reference-presentation.ts | URL normalization | Strips tracking params |
| PDF detection (`\.pdf(?:$\|[?#])`) | reference-presentation.ts | Format detection | Document kind classification |
| Weak title checks (`^source-\d+$`, etc.) | reference-presentation.ts | Quality filter | Detects placeholder titles |
| `stripEmptyReferenceLines()` | internal-thought-separator.ts | Technical cleanup | Removes orphaned `link:/url:` lines |
| Sentence boundary helpers (`\s`, `[A-Z0-9]`) | internal-thought-separator.ts | Text utility | Character class tests |
| Line split (`\r?\n`) | internal-thought-separator.ts | Technical format | Line ending normalization |
| All P4 file regex | paperSessions.ts, daftarPustakaCompiler.ts, stageDataWhitelist.ts, MarkdownRenderer.tsx, ChatWindow.tsx, ChatContainer.tsx | P4 preserve | Deterministic parsers/validators |

### Optimize Only (No Classifier Replacement)

| Pattern | File | Action |
|---------|------|--------|
| Observability guards (leakage, validation claim) | route.ts | Keep as-is during P1; later replace with structured tool outcome checks |
| Keyword buckets (STEP_KEYWORDS) | curated-trace.ts | P3 review; may improve or keep |
| Paper intent keywords | paper-intent-detector.ts | P3 review; may replace with classifier |

---

## 8. Runtime Guard Strategy

### Guards That Remain Deterministic

| Guard | Location | Trigger | Action | Why Deterministic |
|-------|----------|---------|--------|-------------------|
| `hasChoiceInteractionEvent` | route.ts → completed-session | User made UI choice | `short_circuit_closing` | Structural signal — no language parsing |
| Empty message check | completed-session.ts | `lastUserContent.trim() === ""` | `short_circuit_closing` | Deterministic emptiness check |
| `paperSession.currentStage` | route.ts | Stage is "completed" | Enter completed-session path | Convex state — ground truth |
| Tool tracker flags | route.ts | `sawCreateArtifactSuccess`, etc. | Override post-stream checks | Tool execution result — ground truth |
| Source existence | route.ts | Artifact in stageData? | Override recall with "not found" | Convex state — ground truth |

### Guards That Must Not Move to Model

| Guard | Why |
|-------|-----|
| Convex ID validation | Binary format check — model has no advantage |
| FORBIDDEN_REASONING_PATTERNS | Security — must be deterministic and fast |
| Fence stripping | Technical format — model has no advantage |
| Tool name sanitization | Format constraint — must be deterministic |
| Numeric range coercion | Parser — model has no advantage |

### Persisted-Content Safety

| Risk | Mitigation |
|------|-----------|
| Classifier alters what gets persisted | Classifier only determines ROUTING, never directly modifies content |
| Corruption guard removed prematurely | Corruption guard is PRESERVE — stays active |
| Wrong handling causes wrong content to persist | `clarify` default means no content persisted on ambiguity — user must re-engage |
| Classifier error leads to data loss | Fallback is `allow_normal_ai` — AI processes normally, content persists normally |

### Reasoning Trace Safety

| Component | Status |
|-----------|--------|
| `FORBIDDEN_REASONING_PATTERNS` | PRESERVE — no change |
| `sanitizeReasoningText()` | PRESERVE — no change |
| Fence stripping in reasoning | PRESERVE — no change |
| Inline code stripping in reasoning | PRESERVE — no change |

---

## 9. Risks and Failure Modes

### False Positive Risks

| Risk | Domain | Consequence | Mitigation |
|------|--------|-------------|-----------|
| Classifies normal question as artifact_recall | Completed session | User sees artifact instead of AI answer | Confidence threshold; `clarify` on ambiguity |
| Classifies casual message as revision intent | Route revision | Unnecessary observability warning | Warning only, no behavior change |
| Classifies summary request as exact-source | Exact source | Wrong inspection mode triggered | `sourceIntent` enum distinguishes summary from exact |
| Classifies synthesis request as reference_inventory | Search mode | User gets source list instead of narrative | Default to synthesis on low confidence |
| Classifies public answer as internal thought | Internal thought | User-facing content stripped | Instruction-based fix; regex kept as non-destructive fallback |

### False Negative Risks

| Risk | Domain | Consequence | Mitigation |
|------|--------|-------------|-----------|
| Misses revision intent | Completed session | User gets closing message instead of revision flow | `allow_normal_ai` default means AI can still process |
| Misses artifact recall intent | Completed session | User gets AI response instead of artifact | AI can still answer about the artifact |
| Misses exact-source intent | Exact source | Normal response instead of source inspection | User can rephrase; system doesn't break |
| Misses reference inventory request | Search mode | Synthesis instead of source list | User can ask again; synthesis is always acceptable |

### Systemic Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Over-routing to `clarify` | Medium | Monitor clarify rate; tune confidence thresholds |
| Under-routing to `clarify` | Medium | Start conservative (lower thresholds), loosen based on evidence |
| Classifier latency adds to response time | Medium | Classifier only fires in fallback path (rare); cache results |
| Persisted content corruption during migration | High | Parity testing: run both regex and classifier, compare results before switching |
| Regression in completed session | High | Dedicated regression test suite; review gate before regex deletion |
| Exact-source mis-resolution | Medium | Classifier determines intent only; matching logic unchanged |
| Search mode misclassification | Low | Default is synthesis; reference_inventory is additive |
| Internal thought leakage | Low | Regex fallback remains active; instruction fix is probabilistic |
| Scope creep | Medium | Hard scope boundary in SCOPE.md; review gates enforce |

---

## 10. Recommended First Implementation Slice

### Best First Target: Domain 1 — Completed Session Handling

**Why this domain first:**

1. **Highest risk, highest value**: This domain directly determines whether users get short-circuited, allowed to continue, or see artifacts. Getting this right has the biggest impact on user experience.

2. **Already has structured types**: `CompletedSessionDecision` with `handling`/`source`/`reason` is already well-defined. The classifier output maps directly to this existing type — minimal wiring needed.

3. **Router is already primary**: The LLM router handles most cases. The classifier only replaces the FALLBACK path (when `routerIntent` is undefined). This means the blast radius of a bad classifier is limited to the rare fallback path.

4. **Contained scope**: Single file (`completed-session.ts`) with one call site in `route.ts`. No cross-file dependencies within P1A.

5. **Clear parity test**: Run both regex and classifier on the same inputs, compare outputs. The existing regex provides an exact baseline for comparison.

6. **Safe fallback default**: If the classifier fails or gives low confidence, `allow_normal_ai` is always safe — it lets the AI process the message normally.

**Why NOT start with other domains:**

- **Route-level revision intent (Domain 3)**: Depends on understanding how completed-session changes interact with post-stream flow. Do P1A first, then P1B.
- **Exact source (Domain 4)**: More complex input surface (recent messages, source list). Save for P2 after P1 patterns are proven.
- **Search response mode (Domain 5)**: Lower risk. Can wait.
- **Internal thought (Domain 6)**: Instruction-based fix, not classifier. Different approach entirely.

### First Subtask

`ST-2.1`: Create the `CompletedSessionClassifierSchema` Zod schema and the `classifyCompletedSessionIntent()` function in a new file `src/lib/ai/classifiers/completed-session-classifier.ts`. Do not wire it into the runtime yet. Write parity tests comparing classifier output to regex output on a set of representative inputs.
