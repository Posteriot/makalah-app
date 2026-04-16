# Agent Harness V1 — Task Breakdown

> Companion to `2026-04-16-agent-harness-v1-repo-implementation-plan.md`.
> Tasks are written just-in-time per phase. Each phase is appended after user validates the previous one.

---

## Phase 1: Extract Chat Entry and Run Ownership Boundary

**Scope:** Lines 93–522 of `src/app/api/chat/route.ts` (plus lines 587–593 for attachment awareness instruction) — everything from `POST()` entry through choice interaction resolution, before prompt/context assembly begins. Note: `paperSession` fetch (lines 369–456) stays in `route.ts` for Phase 3, but choice validation (lines 460–522) depends on it and is wired accordingly in Task 1.8.

**Goal:** Make `route.ts` call a small set of entry functions that return typed results instead of doing auth, parsing, conversation resolution, billing, message persistence, and choice validation inline.

**Runtime namespace:** `src/lib/chat-harness/entry/`

---

### Task 1.1: Define harness runtime types

**Create:** `src/lib/chat-harness/types/runtime.ts`

**What to define:**
- `AcceptedChatRequest` — the typed result of a successful chat entry acceptance. Fields:
  - `requestId: string`
  - `userId: Id<"users">`
  - `convexToken: string`
  - `messages: UIMessage[]` (raw AI SDK messages, not re-parsed)
  - `lastUserContent: string` (last user message content, extracted for quota check — maps to `lastUserContentForQuota` in route.ts:191-196)
  - `firstUserContent: string`
  - `requestStartedAt: number | undefined`
  - `billingContext: { userId: Id<"users">; quotaWarning: string | undefined; operationType: OperationType }`
  - `choiceInteractionEvent: ParsedChoiceInteractionEvent | null` (from `choice-request.ts` Zod parser, NOT `ChoiceInteractionEvent` from `choice-submit.ts`)
  - `fetchQueryWithToken: ConvexFetchQuery`
  - `fetchMutationWithToken: ConvexFetchMutation`
  - `conversationId: Id<"conversations"> | undefined` (raw from request body — may be undefined for new conversations)
  - `requestFileIds: unknown[]` (raw from request body, validated downstream)
  - `requestedAttachmentMode: unknown` (raw from request body)
  - `replaceAttachmentContext: boolean | undefined`
  - `inheritAttachmentContext: boolean | undefined`
  - `clearAttachmentContext: boolean | undefined`
- `ConvexFetchQuery` and `ConvexFetchMutation` — typed wrappers for the token-bound Convex fetch helpers. Use `(ref: any, args: any) => Promise<any>` initially (matching the existing `eslint-disable` pattern at `route.ts:127-130`). These can be tightened later, but the priority is extraction parity, not type strictness. Do NOT attempt to type them against Convex generics in this phase.
- `RunLane` — identity for the execution attempt:
  - `requestId: string`
  - `conversationId: Id<"conversations">`
  - `mode: RunStartMode`
- `RunStartMode` — `"start" | "resume_candidate"`

**Forward-compatibility constraint (from plan):** `RunLane` fields must not use request-only ephemeral values as IDs that cannot later be backed by a persisted run row. `requestId` serves as the provisional run identity. The interface must avoid closures or non-serializable values — keep `RunLane` a plain data object.

**Acceptance criteria:**
- Types compile without error
- No runtime code — types only
- `RunLane` is a plain serializable data type (no functions, no closures)
- Exported from barrel `src/lib/chat-harness/types/index.ts`

**Test:** `npx tsc --noEmit`

---

### Task 1.2: Extract request acceptance function

**Create:** `src/lib/chat-harness/entry/accept-chat-request.ts`

**What to extract from `route.ts`:**
- Auth check (lines 95–98)
- Convex token acquisition with retry (lines 101–126)
- Token-bound fetch helper creation (lines 127–130)
- Request body parsing (lines 132–154)
- User input observability log (lines 156–168)
- Convex user ID fetch (lines 170–177)
- First user content extraction (lines 183–186) — this is physically interleaved with conversation ID init at lines 179–181, but `firstUserContent` is a pure derivation from `messages` and belongs in request acceptance. The `currentConversationId` and `isNewConversation` variables at lines 179–181 are NOT extracted here — they belong to Task 1.3 (`resolveConversation`).
- Billing pre-flight quota check (lines 190–224)

**Boundary note:** This function stops at line 224. Lines 179–181 (`currentConversationId`, `isNewConversation`) stay in `route.ts` as inputs to `resolveConversation` (Task 1.3).

**Function signature:**
```typescript
export async function acceptChatRequest(req: Request): Promise<AcceptedChatRequest | Response>
```

Returns `Response` directly on auth failure (401) or quota exceeded. Caller checks `instanceof Response`.

**Acceptance criteria:**
- Auth failure returns 401 Response
- Token retry logic preserved exactly (3 attempts, 150ms increments)
- Billing quota check preserved exactly
- `requestId` generation preserved
- `firstUserContent` extracted from messages (lines 183–186)
- `lastUserContent` extracted from last message (lines 191–196, maps to `lastUserContentForQuota` in original)
- Body fields forwarded: `conversationId`, `requestFileIds`, `requestedAttachmentMode`, `replaceAttachmentContext`, `inheritAttachmentContext`, `clearAttachmentContext`
- `choiceInteractionEvent` typed as `ParsedChoiceInteractionEvent | null` (from `parseOptionalChoiceInteractionEvent`)
- Observability log preserved
- No behavior change

**Test:** `npx tsc --noEmit` + existing test baseline still passes

---

### Task 1.3: Extract conversation resolution

**Create:** `src/lib/chat-harness/entry/resolve-conversation.ts`

**What to extract from `route.ts`:**
- Conversation creation if no ID provided (lines 227–239)
- Background title generation fire-and-forget (lines 282–293)
- `maybeUpdateTitleFromAI` helper closure (lines 296–333)

**Function signature:**
```typescript
export async function resolveConversation(params: {
  conversationId: Id<"conversations"> | undefined;
  userId: Id<"users">;
  firstUserContent: string;
  fetchQueryWithToken: ConvexFetchQuery;
  fetchMutationWithToken: ConvexFetchMutation;
}): Promise<{
  conversationId: Id<"conversations">;
  isNewConversation: boolean;
  maybeUpdateTitleFromAI: (opts: { assistantText: string; minPairsForFinalTitle: number }) => Promise<void>;
}>
```

**Acceptance criteria:**
- Conversation creation logic preserved exactly
- Title generation still fire-and-forget (no await on the happy path)
- `maybeUpdateTitleFromAI` closure still works with conversation-scoped state
- Placeholder title "Percakapan baru" unchanged

**Test:** `npx tsc --noEmit` + baseline

---

### Task 1.4: Extract attachment resolution

**Create:** `src/lib/chat-harness/entry/resolve-attachments.ts`

**What to extract from `route.ts`:**
- Attachment context fetch (lines 241–246)
- Effective file ID resolution (lines 248–256)
- Attachment mode normalization (lines 257–263)
- Attachment context clear/upsert mutations (lines 265–280)
- Attachment awareness instruction generation (lines 587–593)

**Scope note:** The attachment awareness instruction at lines 587–593 uses `userMessageCount`, which in the current code is computed at line 578 (after the Phase 1 boundary). This function must receive `messages` and compute `userMessageCount` internally (`messages.filter(m => m.role === "user").length`), rather than taking it as a parameter. This avoids reaching past the Phase 1 extraction boundary.

**Function signature:**
```typescript
export async function resolveAttachments(params: {
  conversationId: Id<"conversations">;
  messages: UIMessage[];
  requestFileIds: unknown[];
  requestedAttachmentMode: unknown;
  replaceAttachmentContext: boolean | undefined;
  inheritAttachmentContext: boolean | undefined;
  clearAttachmentContext: boolean | undefined;
  fetchQueryWithToken: ConvexFetchQuery;
  fetchMutationWithToken: ConvexFetchMutation;
}): Promise<{
  effectiveFileIds: Id<"files">[];
  attachmentResolution: EffectiveFileIdResult;
  attachmentMode: string;
  hasAttachmentSignal: boolean;
  attachmentAwarenessInstruction: string;
}>
```

**Acceptance criteria:**
- Attachment resolution logic preserved exactly
- Attachment awareness directive text unchanged (both first-turn and subsequent-turn variants)
- `userMessageCount` computed internally from `messages`, not taken as external param
- Context clear/upsert mutations fire in same conditions

**Test:** `npx tsc --noEmit` + baseline

---

### Task 1.5: Extract user message persistence

**Create:** `src/lib/chat-harness/entry/persist-user-message.ts`

**What to extract from `route.ts`:**
- User message content extraction (lines 335–343)
- Empty-content-with-attachment guard (lines 345–347)
- Message creation mutation (lines 349–365)

**Function signature:**
```typescript
export async function persistUserMessage(params: {
  messages: UIMessage[];
  conversationId: Id<"conversations">;
  effectiveFileIds: Id<"files">[];
  requestedAttachmentMode: unknown;
  attachmentResolution: EffectiveFileIdResult;
  fetchMutationWithToken: ConvexFetchMutation;
}): Promise<void | Response>
```

Returns `Response` (400) if empty content with attachment. Otherwise void.

**Acceptance criteria:**
- Empty-content guard still returns 400 with same message
- Message persisted with same fields (content, fileIds, attachmentMode, uiMessageId)
- No change in when/what gets persisted

**Test:** `npx tsc --noEmit` + baseline

---

### Task 1.6: Extract choice interaction validation

**Create:** `src/lib/chat-harness/entry/validate-choice-interaction.ts`

**What to extract from `route.ts`:**
- Choice validation with stale-state 409 response (lines 460–484)
- Choice workflow resolution (lines 485–509)
- Choice context note build (lines 499–502)
- Choice observability logs (lines 504–522)

Note: choice event parsing (`parseOptionalChoiceInteractionEvent`) already lives in `src/lib/chat/choice-request.ts`. This task extracts the validation/resolution orchestration from route.ts, not the parsing logic.

**Function signature:**
```typescript
export async function validateChoiceInteraction(params: {
  choiceInteractionEvent: ParsedChoiceInteractionEvent | null;
  conversationId: Id<"conversations">;
  paperSession: PaperSession | null;
  paperStageScope: PaperStageId | undefined;
  paperModePrompt: string | null;
}): Promise<{
  resolvedWorkflow: ResolvedChoiceWorkflow | undefined;
  choiceContextNote: string | undefined;
} | Response>
```

Returns `Response` (409) on stale-state rejection. Caller checks `instanceof Response`.

**Acceptance criteria:**
- Stale state detection preserved exactly (409 with JSON body, same error shape)
- Workflow resolution calls same `resolveChoiceWorkflow` with same params
- Context note and observability logs unchanged
- Non-stale validation errors still re-thrown

**Test:** `npx tsc --noEmit` + baseline

---

### Task 1.7: Assemble RunLane

**Create:** `src/lib/chat-harness/entry/resolve-run-lane.ts`

**What this does:**
Assembles a `RunLane` from the results of previous tasks. This is the explicit "run ownership" contract that the plan requires (`resolve-run-lane.ts` at plan line 192).

**Function signature:**
```typescript
export function resolveRunLane(params: {
  requestId: string;
  conversationId: Id<"conversations">;
  isNewConversation: boolean;
}): RunLane
```

**Logic:**
- `mode` = `isNewConversation ? "start" : "resume_candidate"`
- Returns a plain data object (no closures, no functions — per forward-compat constraint in Task 1.1)

**Why this is a separate function (not inline):**
- The plan explicitly names this file
- `RunLane` is the harness's provisional run identity — it must be a first-class value, not an ad-hoc object literal in route.ts
- When Phase 6 adds durable persistence, `resolveRunLane` becomes the seam where a persisted run row gets created or resumed

**Acceptance criteria:**
- Returns `RunLane` plain data object
- `mode` correctly derived from `isNewConversation`
- No side effects, no async, no closures

**Test:** `npx tsc --noEmit`

---

### Task 1.8: Compose entry barrel and wire into route.ts

**Create:** `src/lib/chat-harness/entry/index.ts` (barrel export)

**Modify:** `src/app/api/chat/route.ts`

**What happens:**
- Replace lines 93–522 entry section with calls to the extracted functions
- `route.ts` POST handler becomes:

```
// === Entry boundary (Phase 1) ===
1. const accepted = await acceptChatRequest(req)
   → if Response, return it (401 or quota exceeded)

2. const conversation = await resolveConversation({
     conversationId: accepted.conversationId,  // from parsed body, may be undefined
     userId: accepted.userId,
     firstUserContent: accepted.firstUserContent,
     fetchQueryWithToken: accepted.fetchQueryWithToken,
     fetchMutationWithToken: accepted.fetchMutationWithToken,
   })

3. const attachments = await resolveAttachments({
     conversationId: conversation.conversationId,
     messages: accepted.messages,
     requestFileIds: accepted.requestFileIds,
     requestedAttachmentMode: accepted.requestedAttachmentMode,
     replaceAttachmentContext: accepted.replaceAttachmentContext,
     inheritAttachmentContext: accepted.inheritAttachmentContext,
     clearAttachmentContext: accepted.clearAttachmentContext,
     fetchQueryWithToken: accepted.fetchQueryWithToken,
     fetchMutationWithToken: accepted.fetchMutationWithToken,
   })

4. const msgResult = await persistUserMessage({
     messages: accepted.messages,
     conversationId: conversation.conversationId,
     effectiveFileIds: attachments.effectiveFileIds,
     ...
   })
   → if Response, return it (400)

// === Context assembly (stays in route.ts, Phase 3 scope) ===
5. paperSession fetch + paperModePrompt resolution (lines 369–456)
   → produces: paperSession, paperModePrompt, paperStageScope,
     isDraftingStage, freeTextContextNote, etc.

// === billingContext mutation (must happen after paperSession) ===
6. if (paperSession) { accepted.billingContext.operationType = "paper_generation" }
   → This line currently at route.ts:525-527 MUST be preserved here.
     Without it, paper sessions are always billed as "chat_message".

// === Choice validation (depends on paperSession from step 5) ===
7. const choiceResult = await validateChoiceInteraction({
     choiceInteractionEvent: accepted.choiceInteractionEvent,
     conversationId: conversation.conversationId,
     paperSession,
     paperStageScope,
     paperModePrompt,
   })
   → if Response, return it (409 stale state)

// === Run lane assembly ===
8. const lane = resolveRunLane({
     requestId: accepted.requestId,
     conversationId: conversation.conversationId,
     isNewConversation: conversation.isNewConversation,
   })

// === Continue with executor/stream setup ===
```

**Dependency ordering note:** Steps 5-7 are NOT a flat sequence — `validateChoiceInteraction` (step 7) depends on `paperSession` (step 5). The `billingContext` mutation (step 6) also depends on `paperSession`. This ordering is non-negotiable. Do NOT rearrange.

**What stays in route.ts (Phase 3 scope):**
- `paperSession` fetch and `paperModePrompt` resolution (lines 369–456)
- `freeTextContextNote` construction (lines 419–456)
- `stageSearchPolicy` helper (line 594+)
- `recentConversationMessagesForExactSource` (line 554+)

**Acceptance criteria:**
- `route.ts` entry section shrinks from ~430 lines to ~40-50 lines of orchestration calls
- **Zero behavior change** — same HTTP responses, same Convex mutations, same observability logs
- `billingContext.operationType` correctly mutated to `"paper_generation"` when `paperSession` exists
- All 7 baseline test files still pass
- `npx tsc --noEmit` passes
- Build passes

**Test:** Full baseline test suite + type check + build:
```bash
npx tsc --noEmit && npx vitest run convex/paperSessions.test.ts src/lib/ai/paper-tools.compileDaftarPustaka.test.ts src/lib/ai/paper-tools.inspect-source.test.ts src/lib/ai/chat-exact-source-guardrails.test.ts src/lib/ai/artifact-sources-policy.test.ts __tests__/context-budget.test.ts __tests__/context-compaction.test.ts
```

---

### Task 1.9: Post-phase review checkpoint

**Action:** Dispatch agent reviewer to audit the implemented Phase 1 extraction against:
- Plan requirements (entry boundary is explicit, `RunLane` instantiated, run ownership types exist)
- No behavior regression
- Type safety (no `any` leaks across boundary)
- No leaked implementation details across boundary
- Clean imports (no circular dependencies)
- Commit history is clean and scoped

**Output:** Review report with gaps (if any) → fix gaps → report to user → wait for user validation.

---

## Phase 2: Extract One-Step Agent Executor Boundary

**Scope:** The two stream pipelines in `route.ts` — primary (lines 2820–3721) and fallback (lines 3765–4595) — plus their shared dependencies: tool registry (lines 1325–1898), `saveAssistantMessage` (lines 1282–1320), model/provider config, and stream transforms.

> **Line number note (post-Phase 1):** Phase 1 extraction removed 278 lines from route.ts. All line numbers in this phase reflect the current file state. Uniform delta: OLD − 278 = NEW.

**Goal:** Make `route.ts` call a single executor function that handles model invocation, stream setup, onFinish persistence, and stream transforms — instead of having two near-duplicate ~800-line pipelines inline.

**Runtime namespace:** `src/lib/chat-harness/executor/`

**Key insight:** Primary and fallback pipelines share ~80% of their logic. The real differences are: model provider, `toolChoice` override, `providerOptions`/`samplingOptions`, search context in messages, and error recovery path. The executor should accept these as configuration, not duplicate the pipeline.

**Plan deviation note:** The plan lists both `build-step-stream.ts` and `build-fallback-step-stream.ts` as separate files. This task breakdown deliberately unifies them into a single `build-step-stream.ts` because the two pipelines differ only in configuration, not structure. A single function with config params is more maintainable than two near-identical files.

---

### Task 2.1: Define executor types

**Create:** `src/lib/chat-harness/executor/types.ts`

**What to define:**
- `StepExecutionConfig` — input to the executor:
  - `model: LanguageModel`
  - `messages: ModelMessage[]`
  - `tools: ToolSet`
  - `prepareStep: PrepareStepFunction | undefined`
  - `stopWhen: StopCondition | undefined`
  - `maxSteps: number`
  - `modelName: string` (for telemetry/persistence)
  - `toolChoice: ToolChoice | undefined` (forced tool choice — `route.ts:2825`, `3834`)
  - `providerOptions: Record<string, unknown> | undefined`
  - `samplingOptions: { temperature?: number; topP?: number } | undefined`
- `StepExecutionResult` — output of the executor:
  - `text: string`
  - `steps: StepResult[]`
  - `usage: TokenUsage`
  - `providerMetadata: unknown`
  - `finishReason: string`
  - `toolCalls: ToolCallSummary[]`
- `StreamPipelineConfig` — stream transform + persistence config:
  - `onFinish: OnFinishHandler`
  - `reasoningTraceEnabled: boolean`
  - `planCaptureEnabled: boolean`
  - `yamlRenderEnabled: boolean`
- `OnFinishContext` — normalized data passed to the onFinish handler:
  - `text: string`
  - `steps: StepResult[]`
  - `usage: TokenUsage`
  - `providerMetadata: unknown`
  - `toolChainOrder: string[]`
  - `modelName: string`

**Acceptance criteria:**
- Types compile
- No runtime code
- Compatible with AI SDK's `streamText` return shape

**Test:** `npx tsc --noEmit`

---

### Task 2.2: Extract saveAssistantMessage

**Create:** `src/lib/chat-harness/executor/save-assistant-message.ts`

**What to extract from `route.ts`:**
- `saveAssistantMessage` function (lines 1282–1320)

**Closure-to-parameter conversion note:** The current function closes over `currentConversationId` (line 1302) and uses `modelNames.primary.model` as default for `usedModel` (line 1307). In the extracted version, `conversationId` becomes an explicit required parameter, and `usedModel` becomes required (no default — caller always provides it). These are intentional changes from closure-based to parameter-based.

**Function signature:**
```typescript
export async function saveAssistantMessage(params: {
  conversationId: Id<"conversations">;
  content: string;
  sources: NormalizedSource[];
  usedModel: string;
  reasoningTrace: CuratedTraceSnapshot | undefined;
  jsonRendererChoice: JsonRendererChoicePayload | undefined;
  uiMessageId: string | undefined;
  planSnapshot: PlanSpec | undefined;
  fetchMutationWithToken: ConvexFetchMutation;
}): Promise<void>
```

**Acceptance criteria:**
- Reasoning trace sanitization preserved
- Source normalization preserved
- All fields passed to `api.messages.createMessage` unchanged
- `conversationId` and `usedModel` are explicit params (no closure capture)

**Test:** `npx tsc --noEmit` + baseline

---

### Task 2.3: Extract onFinish handler builder (internal helper for buildStepStream)

**Create:** `src/lib/chat-harness/executor/build-on-finish-handler.ts`

**What to extract from `route.ts`:**
- Primary onFinish handler (lines 2842–3457)
- Fallback onFinish handler (lines 3848–4345)

**Important:** This function is called internally by `buildStepStream` (Task 2.4), NOT by route.ts directly. This is because `onFinish` needs shared closure scope with the stream writer for `streamContentOverride`.

**Documented differences between primary and fallback onFinish:**
1. **Google grounding metadata** (route.ts:2878-2896): Primary extracts `groundingChunks` from `providerMetadata`. Fallback does not destructure `providerMetadata` at all.
2. **`enrichSourcesWithFetchedTitles`** (route.ts:3227-3231): Primary enriches source titles. Fallback does not.
3. **`classifyRevisionIntent`** (route.ts:2984-3000): Primary invokes async classifier with the model instance. Fallback does not.
4. **`isCompileThenFinalize` in ToolChainOrder** (route.ts:2860-2862): Primary uses this flag for expected tool chain log. Fallback always uses non-compile sequence.
5. **Unfenced plan-spec extraction** (route.ts:3370-3392): Primary has regex+yaml fallback for plan extraction. Fallback does not.

**Implementation note:** The fallback path uses a separate `fallbackStreamContentOverride` variable (declared at line 3771), distinct from primary's `streamContentOverride` (line 2818). Both follow the same pattern but are independent mutable refs — the unified `buildStepStream` must create its own instance internally.

These differences must be controlled by config flags (e.g., `enableGroundingExtraction`, `enableRevisionClassifier`, `enablePlanSpecFallback`), not by duplicating the handler.

**Function signature (OnFinishConfig — used by buildStepStream internally):**
```typescript
export type OnFinishConfig = {
  conversationId: Id<"conversations">;
  userId: Id<"users">;
  modelName: string;
  model: LanguageModel | undefined;  // needed for classifyRevisionIntent (primary only)
  requestId: string;
  convexToken: string;  // needed for telemetry and billing
  billingContext: BillingContext;
  paperSession: PaperSession | null;
  paperStageScope: PaperStageId | undefined;
  paperToolTracker: PaperToolTracker;
  paperTurnObservability: PaperTurnObservability;
  resolvedWorkflow: ResolvedChoiceWorkflow | undefined;
  choiceInteractionEvent: ParsedChoiceInteractionEvent | null;
  isCompileThenFinalize: boolean;
  normalizedLastUserContent: string;  // needed for revision classifier
  lane: RunLane;
  maybeUpdateTitleFromAI: TitleUpdateFn;
  fetchQueryWithToken: ConvexFetchQuery;
  fetchMutationWithToken: ConvexFetchMutation;
  // Feature flags for primary-only behaviors:
  enableGroundingExtraction: boolean;
  enableSourceTitleEnrichment: boolean;
  enableRevisionClassifier: boolean;
  enablePlanSpecFallbackExtraction: boolean;
}
```

**What the handler does (shared core):**
- Tool chain ordering observability + validation
- Text normalization (whitespace, leakage detection)
- Choice outcome sanitization → sets `streamContentOverride` (shared with stream writer)
- Source/body parity check
- Assistant message persistence (calls `saveAssistantMessage`)
- Plan capture persistence
- Billing usage recording
- Telemetry logging
- Title update trigger

**Acceptance criteria:**
- Single config-driven function replaces both primary and fallback onFinish handlers
- All 5 primary-only behaviors correctly gated by config flags
- `convexToken` available for telemetry and billing calls
- All observability logs preserved
- All persistence calls preserved
- Leakage detection logic preserved
- Plan capture logic preserved

**Test:** `npx tsc --noEmit` + baseline

---

### Task 2.4: Extract stream pipeline builder

**Create:** `src/lib/chat-harness/executor/build-step-stream.ts`

**What to extract from `route.ts`:**
- Primary stream creation (lines 3473–3721): `createUIMessageStream` + `execute` block + stream transforms
- Fallback stream creation (lines 4361–4594): same pattern
- Reasoning trace controller setup (lines 3463–3471 primary, 4349–4359 fallback)
- Stream transform application: `pipePlanCapture` (lines 3531, 4415) + `pipeYamlRender` (lines 3535, 4419)
- Spec/plan-spec part capture (lines 3554–3573 primary, 4437–4456 fallback)

**Architecture decision: `onFinish` must be built INSIDE `buildStepStream`, not passed in.**

The current code has shared mutable state (`streamContentOverride` / `fallbackStreamContentOverride`) that is written by `onFinish` (route.ts:3024-3026) and read by the stream writer loop (route.ts:3615-3652). This requires `onFinish` and the stream writer to share closure scope. If `onFinish` is built externally (Task 2.3) and passed in, there is no shared scope for `streamContentOverride` to live in.

**Resolution:** `buildStepStream` takes the onFinish _config_ (not a pre-built handler) and constructs both the `onFinish` handler and the stream writer internally, giving them shared access to `streamContentOverride`. Task 2.3 (`buildOnFinishHandler`) becomes a helper that `buildStepStream` calls internally, not something the route calls directly.

**Function signature:**
```typescript
export function buildStepStream(params: {
  executionConfig: StepExecutionConfig;
  onFinishConfig: OnFinishConfig;  // config, not a pre-built handler
  reasoningTraceEnabled: boolean;
  enablePlanCapture: boolean;
  enableYamlRender: boolean;
}): Response
```

Returns `Response` directly (`createUIMessageStreamResponse` called internally). The caller does `return buildStepStream(...)`.

**What this unifies:**
- Single function replaces both primary and fallback `createUIMessageStream` blocks
- `streamText` call happens inside this function
- `onFinish` handler constructed inside (shared scope with stream writer for `streamContentOverride`)
- Stream transforms applied inside this function
- Reasoning trace controller created inside this function
- Outcome guard / stream content override logic stays inside (same closure scope)

**Acceptance criteria:**
- Both primary and fallback paths can call this function with different configs
- Returns `Response` directly (not `{ stream, response }`)
- `streamContentOverride` shared state works correctly between onFinish and stream writer
- Stream transforms applied in correct order (pipePlanCapture → pipeYamlRender)
- Reasoning trace accumulator correctly wired
- Outcome guard behavior preserved (route.ts:3615-3652, 4492-4548)

**Test:** `npx tsc --noEmit` + baseline

---

### Task 2.5: Extract tool registry builder

**Create:** `src/lib/chat-harness/executor/build-tool-registry.ts`

**What to extract from `route.ts`:**
- Inline artifact tool definitions: `createArtifact` (lines 1326–1604), `updateArtifact` (lines 1605–1765), `readArtifact` (lines 1766–1818), `renameConversationTitle` (lines 1820–1893)
- Paper tools spread (line 1894–1897)
- The `tools` composition at lines 1325–1898

**Function signature:**
```typescript
export function buildToolRegistry(params: {
  conversationId: Id<"conversations">;
  userId: Id<"users">;
  paperSession: PaperSession | null;
  paperStageScope: PaperStageId | undefined;
  paperToolTracker: PaperToolTracker;
  paperTurnObservability: PaperTurnObservability;
  resolvedWorkflow: ResolvedChoiceWorkflow | undefined;
  fetchQueryWithToken: ConvexFetchQuery;
  fetchMutationWithToken: ConvexFetchMutation;
}): ToolSet
```

**Important:** The inline artifact tools (`createArtifact`, `updateArtifact`) contain significant business logic (auto-rescue, reference validation, parity checks). This task moves them out of route.ts but does NOT refactor their internals. Extract as-is.

**Scope clarification:** `isCompileThenFinalize` (route.ts:2138) is NOT part of the tool registry — it belongs to the enforcer composition section (lines 2093-2245) which stays in route.ts as Phase 4 scope. Do not extract it here. It is passed into `OnFinishConfig` (Task 2.3) from route.ts.

**Acceptance criteria:**
- `tools` object identical to current composition
- Artifact tool business logic unchanged
- Paper tools spread unchanged
- All tool closures still have access to required scope (conversationId, paperSession, etc.)

**Test:** `npx tsc --noEmit` + baseline

---

### Task 2.6: Wire executor into route.ts

**Modify:** `src/app/api/chat/route.ts`

**Create:** `src/lib/chat-harness/executor/index.ts` (barrel export)

**What happens:**
- Replace the two inline stream pipelines with calls to the extracted functions:

```
// === Tool registry (was lines 1325-1898) ===
const tools = buildToolRegistry({ ... })

// === Primary execution ===
try {
  return buildStepStream({
    executionConfig: {
      model, messages, tools, prepareStep, stopWhen, maxSteps,
      modelName: modelNames.primary.model,
      toolChoice: forcedToolChoice,
      providerOptions, samplingOptions,
    },
    onFinishConfig: {
      ...sharedOnFinishConfig,
      modelName: modelNames.primary.model,
      model,  // for classifyRevisionIntent
      enableGroundingExtraction: true,
      enableSourceTitleEnrichment: true,
      enableRevisionClassifier: true,
      enablePlanSpecFallbackExtraction: true,
    },
    reasoningTraceEnabled: true,
    enablePlanCapture: true,
    enableYamlRender: true,
  })
} catch (error) {
  // === Error classification + telemetry (was route.ts:3723-3750) ===
  const errorInfo = classifyError(error)
  logAiTelemetry({ ...primaryFailureTelemetry })
  Sentry.addBreadcrumb({ ... })

  // === Fallback execution ===
  const fallbackModel = await getOpenRouterModel({ enableWebSearch: false })
  return buildStepStream({
    executionConfig: {
      model: fallbackModel, messages: fallbackMessages, tools,
      prepareStep: fallbackPrepareStep, stopWhen, maxSteps,
      modelName: modelNames.fallback.model,
      toolChoice: fallbackForcedToolChoice,
      providerOptions: fallbackProviderOptions, samplingOptions,
    },
    onFinishConfig: {
      ...sharedOnFinishConfig,
      modelName: modelNames.fallback.model,
      model: undefined,  // no revision classifier in fallback
      enableGroundingExtraction: false,
      enableSourceTitleEnrichment: false,
      enableRevisionClassifier: false,
      enablePlanSpecFallbackExtraction: false,
    },
    reasoningTraceEnabled: true,
    enablePlanCapture: true,
    enableYamlRender: true,
  })
}
```

**Catch block ownership:** The error classification + telemetry logic at route.ts:4001-4028 (`classifyError`, `logAiTelemetry`, `Sentry.addBreadcrumb`) stays in `route.ts` as the orchestration-level error recovery decision. It is NOT inside `buildStepStream` — it decides whether to invoke fallback, which is a routing concern.

**What stays in route.ts for now:**
- `prepareStep` enforcer composition (lines 2093–2245) — Phase 4 scope
- Search/exact-source routing (lines 2247–2809) — Phase 3 scope
- Model loading (lines 2248, 3777) — stays until Phase 7

**Acceptance criteria:**
- `route.ts` loses ~2400 lines (two stream pipelines + tool registry + saveAssistantMessage)
- **Zero behavior change**
- Primary and fallback still produce identical stream format
- All 7 baseline tests pass
- `npx tsc --noEmit` passes
- Build passes

**Test:** Full baseline + type check + build

---

### Task 2.7: Post-phase review checkpoint

**Action:** Dispatch agent reviewer to audit Phase 2 extraction against:
- Plan requirements (one-step executor is a callable boundary)
- Primary/fallback unification is correct (no subtle behavioral differences lost)
- onFinish handler produces same persistence and telemetry
- Stream transforms applied in correct order
- Tool registry composition unchanged
- No circular dependencies between `executor/` and `entry/`

**Output:** Review report → fix gaps → report to user → wait for validation.

---

## Phase 3: Extract Prompt and Context Assembler Boundary

**Scope:** Lines 277–2060 of `route.ts` (2309 lines total) — everything between entry boundary aliases and the executor calls. This is the largest extraction phase covering: file context assembly, message conversion, system prompt stacking, context budget/compaction, search decision/execution, and exact-source routing.

> **Line number note (post-Phase 2):** Phases 1+2 removed ~2580 lines from route.ts (4889 → 2309). Line shifts are NON-UNIFORM: low-range code shifted by ~-291, high-range code (post-executor-block) shifted by ~-1075. All line numbers in this phase reflect the current file state.

**Goal:** Make the instruction stack explicit and inspectable. Route.ts should call a context assembler that returns a `ResolvedStepContext` containing: messages (with all system notes injected), tool config, search results, exact-source routing decisions, and budget status.

**Runtime namespace:** `src/lib/chat-harness/context/`

**Plan note:** The implementation plan says "a narrow Phase 3 cut that only centralizes instruction-stack assembly" is the recommended first execution slice. The full Phase 3 below is the complete extraction; during execution, the team may choose to implement only Tasks 3.1–3.4 first (the narrow cut) and defer 3.5–3.7 (search/routing) to a later pass.

---

### Task 3.1: Define context assembler types

**Create:** `src/lib/chat-harness/context/types.ts`

**What to define:**
- `ResolvedStepContext` — the final assembled context for one execution step:
  - `messages: ModelMessage[]` (system notes + conversation, post-compaction)
  - `toolChoice: ToolChoice | undefined`
  - `maxSteps: number`
  - `samplingOptions: SamplingOptions`
  - `providerOptions: Record<string, unknown> | undefined`
  - `budgetStatus: BudgetStatus`
  - `searchDecision: SearchDecision`
  - `exactSourceRouting: ExactSourceRoutingResult`
  - `skillTelemetryContext: SkillTelemetryContext`
- `BudgetStatus`:
  - `totalChars: number`
  - `contextWindow: number`
  - `didCompact: boolean`
  - `resolvedAtPriority: string | null`
  - `didPrune: boolean`
- `SearchDecision`:
  - `enableWebSearch: boolean`
  - `executionMode: SearchExecutionMode`
  - `intentType: string`
  - `confidence: number`
  - `reason: string`
- `ExactSourceRoutingResult`:
  - `mode: "force-inspect" | "clarify" | "none"`
  - `matchedSourceId: string | undefined`
  - `prepareStep: PrepareStepFunction | undefined`
- `InstructionStackEntry` — one item in the stacking order:
  - `role: "system"`
  - `content: string`
  - `source: string` (trace label: "base-prompt", "paper-mode", "file-context", "attachment-awareness", etc.)
- `ResolvedInstructionStack`:
  - `entries: InstructionStackEntry[]`
  - `conversationMessages: ModelMessage[]`

**Acceptance criteria:**
- Types compile
- No runtime code
- `InstructionStackEntry.source` provides full traceability of what's in the instruction stack

**Test:** `npx tsc --noEmit`

---

### Task 3.2: Extract file context assembly

**Create:** `src/lib/chat-harness/context/assemble-file-context.ts`

**What to extract from `route.ts`:**
- File content fetching with pending-extraction wait loop (lines 337–353)
- Per-file context assembly with budget cap and truncation (lines 355–428)
- Attachment health classification and telemetry (lines 429–474)

**Function signature:**
```typescript
export async function assembleFileContext(params: {
  effectiveFileIds: Id<"files">[];
  isPaperMode: boolean;
  conversationId: Id<"conversations">;
  fetchQueryWithToken: ConvexFetchQuery;
}): Promise<{
  fileContext: string;
  docFileCount: number;
  docExtractionSuccessCount: number;
  docExtractionFailedCount: number;
  omittedFileNames: string[];
}>
```

**Constants to co-locate:** `MAX_FILE_CONTEXT_CHARS_PER_FILE` (80K), `MAX_FILE_CONTEXT_CHARS_TOTAL` (240K)

**Acceptance criteria:**
- Pending extraction wait loop preserved (max 8s, 500ms polls)
- Per-file truncation logic preserved (80K per file, remaining budget check)
- Truncation marker text unchanged
- Attachment health telemetry fire-and-forget preserved

**Test:** `npx tsc --noEmit` + baseline

---

### Task 3.3: Extract instruction stack resolver

**Create:** `src/lib/chat-harness/context/resolve-instruction-stack.ts`

**What to extract from `route.ts`:**
- The `fullMessagesBase` array assembly (lines 622–710) — 13+ conditional system message injections in specific order

**Function signature:**
```typescript
export function resolveInstructionStack(params: {
  systemPrompt: string;
  paperModePrompt: string | null;
  fileContext: string;
  attachmentAwarenessInstruction: string;
  sourcesContext: string;
  sourceInventoryContext: string;
  exactSourceResolution: ExactSourceFollowupResult;
  skillInstructions: string;
  choiceContextNote: string | undefined;
  freeTextContextNote: string | undefined;
  isDraftingStage: boolean;
  paperStageScope: PaperStageId | undefined;
  paperSession: PaperSession | null;
  conversationMessages: ModelMessage[];
}): ResolvedInstructionStack
```

**Critical:** The ordering of system messages must be preserved exactly. Each entry gets a `source` label for traceability. The current implicit ordering in route.ts becomes an explicit, inspectable array.

**Acceptance criteria:**
- All 13+ conditional system notes injected in same order
- Each entry has a `source` trace label
- `CHOICE_YAML_SYSTEM_PROMPT` injected only when `isDraftingStage`
- Workflow discipline notes injected for correct stages
- Completed session override note injected when paper completed
- Conversation messages appended after all system notes

**Test:** `npx tsc --noEmit` + baseline

**Dependencies:**
- Task 3.2 → `fileContext`, `attachmentAwarenessInstruction`
- Task 3.5 → `exactSourceResolution` (for system message injection flags)
- Task 3.6 → `searchDecision` (for skill instructions conditional)
- Task 3.7 → `sourcesContext`, `sourceInventoryContext`, `hasRecentSourcesInDb`

---

### Task 3.4: Extract context budget and compaction

**Create:** `src/lib/chat-harness/context/apply-context-budget.ts`

**What to extract from `route.ts`:**
- Budget estimation helper `estimateModelMessageChars` (lines 736–743)
- `checkContextBudget` call and logging (lines 745–751)
- Compaction chain invocation (lines 754–785)
- Brute prune safety net (lines 787–800)
- Budget warning log (lines 802–806)

**Function signature:**
```typescript
export async function applyContextBudget(params: {
  messages: ModelMessage[];
  contextWindow: number;
  isPaperMode: boolean;
  paperStageScope: PaperStageId | undefined;
}): Promise<{
  messages: ModelMessage[];
  budgetStatus: BudgetStatus;
}>
```

**Acceptance criteria:**
- Compaction chain invocation preserved (calls `runCompactionChain` from existing module)
- Brute prune safety net preserved (last 50 conversation messages)
- Budget logging preserved
- Existing compaction tests still pass (`__tests__/context-compaction.test.ts`, `__tests__/context-budget.test.ts`)

**Test:** `npx tsc --noEmit` + full baseline (especially context-budget and context-compaction tests)

---

### Task 3.5: Extract exact-source followup resolution (early pass)

**Create:** `src/lib/chat-harness/context/resolve-exact-source-followup.ts`

**What to extract from `route.ts`:**
- Exact source resolution (lines 600–617): `resolveExactSourceFollowup` call
- Exact source routing flags (lines 608–617)

**Execution order note:** In the actual code, exact source resolution runs BEFORE the search decision (line 600 is before line 1540). The search decision then checks `exactSourceResolution.mode === "force-inspect"` at line 1530 as a pre-router guardrail. This means this task MUST execute before Task 3.6.

**Function signature:**
```typescript
export async function resolveExactSourceFollowup(params: {
  model: LanguageModel;
  lastUserContent: string;
  recentConversationMessages: ExactSourceConversationMessage[];
  availableExactSources: ExactSourceSummary[];
}): Promise<{
  resolution: ExactSourceFollowupResult;
  shouldIncludeRawSourcesContext: boolean;
  shouldIncludeExactInspectionSystemMessage: boolean;
  shouldIncludeRecentSourceSkillInstructions: boolean;
}>
```

**Acceptance criteria:**
- `resolveExactSourceFollowup` call preserved with same params
- Routing flags correctly derived from resolution mode
- No dependency on search decision output

**Test:** `npx tsc --noEmit` + baseline (especially `chat-exact-source-guardrails.test.ts`)

**Dependency:** Task 3.7 (needs `availableExactSources`)

---

### Task 3.6: Extract search decision

**Create:** `src/lib/chat-harness/context/resolve-search-decision.ts`

**What to extract from `route.ts`:**
- `decideWebSearchMode` function (lines 939–1104)
- Pre-router guardrails (lines 1517–1538): gagasan first turn guard, exact-source force-inspect guard
- LLM router invocation (lines 1540–1626)
- Search execution mode resolution (lines 1628–1665)
- Reference inventory short-circuit (lines 1676–1701)
- Search unavailability handling (lines 1703–1732)
- Forced sync/submit flag computation (lines 1712–1732)

**Function signature:**
```typescript
export async function resolveSearchDecision(params: {
  model: LanguageModel;
  messages: ModelMessage[];
  lastUserContent: string;
  paperSession: PaperSession | null;
  paperStageScope: PaperStageId | undefined;
  isDraftingStage: boolean;
  stageSearchPolicy: string;
  exactSourceResolution: ExactSourceFollowupResult;  // from Task 3.5
  choiceInteractionEvent: ParsedChoiceInteractionEvent | null;
  availableExactSources: ExactSourceSummary[];
  webSearchConfig: WebSearchConfig;
  fetchQueryWithToken: ConvexFetchQuery;
}): Promise<SearchDecision & {
  forcedSyncPrepareStep: PrepareStepFunction | undefined;
  forcedToolChoice: ToolChoice | undefined;
  missingArtifactNote: string | undefined;
  earlyResponse: Response | undefined;
}>
```

**Note:** If `earlyResponse` is non-undefined, the caller must return it immediately (reference inventory or search unavailability short-circuit).

**Pre-router guardrails included:** Lines 1517–1538 contain `isGagasanFirstTurn` guard and `exactSourceResolution.mode === "force-inspect"` guard. These run BEFORE the LLM router and can short-circuit search to disabled. They MUST be inside this function, not left in route.ts.

**Acceptance criteria:**
- LLM router prompt text unchanged
- Pre-router guardrails preserved (gagasan first turn, exact source force-inspect)
- Intent classification (sync, compile, save_submit, search, discussion) preserved
- Post-decision note injection preserved
- Reference inventory short-circuit preserved
- Forced sync/submit flags preserved

**Test:** `npx tsc --noEmit` + baseline

**Dependency:** Task 3.5 (needs `exactSourceResolution`)

---

### Task 3.6b: Extract exact-source routing build (late pass)

**Create:** `src/lib/chat-harness/context/build-exact-source-routing.ts`

**What to extract from `route.ts`:**
- Deterministic exact source prepareStep build (lines 1795–1817)
- Exact source router note injection

**Fallback path note:** There is an identical exact-source routing block for the fallback path at lines 2174–2200. This task must extract both instances into the same function, called once per path.

This runs AFTER the search decision because it needs `enableWebSearch`, `forcedSyncPrepareStep`, and `forcedToolChoice` from Task 3.6.

**Function signature:**
```typescript
export function buildExactSourceRouting(params: {
  exactSourceResolution: ExactSourceFollowupResult;  // from Task 3.5
  enableWebSearch: boolean;  // from Task 3.6
  forcedSyncPrepareStep: PrepareStepFunction | undefined;  // from Task 3.6
  forcedToolChoice: ToolChoice | undefined;  // from Task 3.6
  availableExactSources: ExactSourceSummary[];
}): ExactSourceRoutingResult
```

**Acceptance criteria:**
- `buildDeterministicExactSourcePrepareStep` call preserved
- Routing correctly gated by `enableWebSearch`, `forcedSyncPrepareStep`, `forcedToolChoice`

**Test:** `npx tsc --noEmit` + baseline

**Dependency:** Task 3.5 + Task 3.6

---

### Task 3.7: Extract sources fetch and context assembly

**Create:** `src/lib/chat-harness/context/fetch-and-assemble-sources.ts`

**What to extract from `route.ts`:**
- Recent sources fetch from DB (lines 554–584)
- Exact sources inventory fetch (lines 586–599)
- Source inventory context build (line 614)

**Note:** This function FETCHES from DB and then BUILDS context strings. The previous task design incorrectly took `availableExactSources` and `recentSourcesList` as inputs — those are the outputs of the DB fetches at lines 554–584 and 586–599.

**Function signature:**
```typescript
export async function fetchAndAssembleSourcesContext(params: {
  conversationId: Id<"conversations">;
  fetchQueryWithToken: ConvexFetchQuery;
}): Promise<{
  recentSourcesList: RecentSource[];
  availableExactSources: ExactSourceSummary[];
  hasRecentSourcesInDb: boolean;
  sourcesContext: string;
  sourceInventoryContext: string;
}>
```

**Output note:** `recentSourcesList`, `availableExactSources`, and `hasRecentSourcesInDb` are consumed by downstream tasks:
- `availableExactSources` → Task 3.5 (exact source followup) and Task 3.6 (search decision)
- `hasRecentSourcesInDb` → Task 3.3 (instruction stack: skill instructions conditional)
- `sourcesContext` and `sourceInventoryContext` → Task 3.3 (instruction stack)

**Acceptance criteria:**
- DB fetches for recent sources and exact sources preserved
- Source inventory context format unchanged
- Error handling (non-blocking) preserved
- All 5 outputs correctly produced

**Test:** `npx tsc --noEmit` + baseline

**Dependency:** None (runs early, produces data for 3.3, 3.5, 3.6)

---

### Task 3.8: Extract message conversion and sanitization

**Create:** `src/lib/chat-harness/context/convert-messages.ts`

**What to extract from `route.ts`:**
- `convertToModelMessages` call (line 476)
- Message sanitization/filtering loop (lines 478–525)
- Paper mode message trimming (lines 527–548)
- Recent conversation messages extraction for exact source (lines 277–300)

**Function signature:**
```typescript
export function convertAndSanitizeMessages(params: {
  messages: UIMessage[];
  isPaperMode: boolean;
}): {
  modelMessages: ModelMessage[];
  recentConversationMessagesForExactSource: ExactSourceConversationMessage[];
  userMessageCount: number;
}
```

**Acceptance criteria:**
- `convertToModelMessages` call preserved
- Role filtering preserved (user, assistant, system only)
- Content sanitization preserved (invalid tool calls filtered)
- Paper mode trimming preserved (max 40 messages)
- Recent conversation messages for exact source correctly extracted

**Test:** `npx tsc --noEmit` + baseline

---

### Task 3.9: Extract helper functions (search evidence, reasoning sanitization)

**Create:** `src/lib/chat-harness/context/search-evidence-helpers.ts`

**What to extract from `route.ts`:**
- `getSearchEvidenceFromStageData` (lines 808–836)
- `hasStageArtifact` (lines 838–846)
- `buildForcedSyncStatusMessage` (lines 848–883)
- `hasPreviousSearchResults` (lines 892–937)

**Create:** `src/lib/chat-harness/shared/reasoning-sanitization.ts`

**Already extracted (Phase 2):** Reasoning sanitization helpers were extracted to `src/lib/chat-harness/executor/save-assistant-message.ts` during Phase 2 (Task 2.2). To move them to `shared/reasoning-sanitization.ts` as planned, re-extract from save-assistant-message.ts (not from route.ts).

**Why `shared/` not `context/` or `executor/`:** These helpers are consumed by both `saveAssistantMessage` (Phase 2 executor) and the context/response factories. Placing them in a shared location avoids circular imports between `context/` and `executor/`.

**Create:** `src/lib/chat-harness/context/response-factories.ts`

**What to extract from `route.ts`:**
- `createSearchUnavailableResponse` (lines 1186–1239)
- `createStoredReferenceInventoryResponse` (lines 1241–1302)

**Closure-to-parameter conversion:** Both functions close over route-level variables: `currentConversationId`, `userId`, `convexToken`, `modelNames`, `telemetryStartTime`, `skillTelemetryContext`. These must become explicit parameters. Both also call `saveAssistantMessage` (Phase 2) and `logAiTelemetry` — these become imports from `executor/` and `@/lib/ai/telemetry` respectively.

**Acceptance criteria:**
- All search evidence helpers preserved as-is
- All reasoning sanitization helpers preserved as-is
- Response factories produce same HTTP response shape
- Response factory closure variables converted to explicit params

**Test:** `npx tsc --noEmit` + baseline

---

### Task 3.9b: Extract web search execution block

**Create:** `src/lib/chat-harness/context/execute-web-search-path.ts`

**What to extract from `route.ts`:**
- The `if (enableWebSearch)` block (lines 1825–1980) including:
  - Retriever chain validation
  - Fallback compose model acquisition
  - `executeWebSearch()` call with full inline onFinish handler
  - onFinish handler internals: plan persistence, plan-spec text stripping, fallback choice card injection, `saveAssistantMessage`, `appendSearchReferences` mutation, `maybeUpdateTitleFromAI`, billing, telemetry

**Function signature:**
```typescript
export async function executeWebSearchPath(params: {
  enableWebSearch: boolean;
  retrieverChain: RetrieverChain;
  messages: ModelMessage[];
  systemPrompt: string;
  paperModePrompt: string | null;
  fileContext: string;
  samplingOptions: SamplingOptions;
  reasoningSettings: ReasoningSettings;
  conversationId: Id<"conversations">;
  userId: Id<"users">;
  convexToken: string;
  modelNames: ModelNames;
  paperSession: PaperSession | null;
  paperStageScope: PaperStageId | undefined;
  billingContext: BillingContext;
  skillTelemetryContext: SkillTelemetryContext;
  maybeUpdateTitleFromAI: TitleUpdateFn;
  fetchQueryWithToken: ConvexFetchQuery;
  fetchMutationWithToken: ConvexFetchMutation;
}): Promise<Response | undefined>
```

Returns `Response` if web search path was taken (caller returns it immediately). Returns `undefined` if `enableWebSearch` is false (caller continues to normal executor path).

**Acceptance criteria:**
- `executeWebSearch` call preserved with all params
- onFinish handler preserved: plan persistence, message persistence, billing, telemetry
- `appendSearchReferences` mutation preserved
- Choice card fallback injection preserved
- Returns complete `Response` (not partial data)

**Test:** `npx tsc --noEmit` + baseline

---

### Task 3.10: Compose context assembler and wire into route.ts

**Create:** `src/lib/chat-harness/context/assemble-step-context.ts` (orchestrator)
**Create:** `src/lib/chat-harness/context/index.ts` (barrel export)

**Modify:** `src/app/api/chat/route.ts`

**Dynamic imports ownership:** The dynamic import block at route.ts:712–731 (which produces `getGatewayModel`, `getOpenRouterModel`, `modelNames`, `webSearchConfig`, `samplingOptions`, `reasoningSettings`, `providerSettings`) is loaded inside `assembleStepContext`. The orchestrator calls the imports, materializes the model instance, and passes it to sub-tasks that need it (3.5, 3.6). The model and config are also returned in `ResolvedStepContext` for Phase 2 (executor) consumption.

**`assembleStepContext` orchestration sequence:**
```
1. convertAndSanitizeMessages (Task 3.8)
2. assembleFileContext (Task 3.2)  [parallel with 1]
3. fetchAndAssembleSourcesContext (Task 3.7)  [parallel with 1, 2]
4. Dynamic imports + model loading (route.ts:712-731)
5. resolveExactSourceFollowup (Task 3.5)  [needs 3.availableExactSources + 4.model]
6. resolveSearchDecision (Task 3.6)  [needs 5.exactSourceResolution + 4.model]
7. buildExactSourceRouting (Task 3.6b)  [needs 5 + 6]
8. resolveInstructionStack (Task 3.3)  [needs 2, 3, 5, 6 outputs]
9. applyContextBudget (Task 3.4)  [needs 8.messages]
10. executeWebSearchPath (Task 3.9b)  [if enableWebSearch → early return Response]
11. Return ResolvedStepContext
```

**Function signature:**
```typescript
export async function assembleStepContext(params: {
  accepted: AcceptedChatRequest;
  conversation: ResolvedConversation;
  attachments: ResolvedAttachments;
  paperSession: PaperSession | null;
  paperModePrompt: string | null;
  paperStageScope: PaperStageId | undefined;
  isDraftingStage: boolean;
  choiceContextNote: string | undefined;
  freeTextContextNote: string | undefined;
  resolvedWorkflow: ResolvedChoiceWorkflow | undefined;
}): Promise<ResolvedStepContext | Response>
```

Returns `Response` on early-return paths (web search result, reference inventory, search unavailability).

**What stays in route.ts after this:**
- `paperSession` fetch (stays until Phase 7)
- Enforcer setup (Phase 4)
- Executor call (Phase 2)
- Error recovery / fallback (Phase 2)

**Acceptance criteria:**
- Route.ts context assembly section shrinks from ~2500 lines to one `assembleStepContext` call
- Model loading happens inside the orchestrator (not in route.ts)
- Instruction stack is traceable (each system note has a source label)
- Task execution order respects dependency graph (no circular dependencies)
- **Zero behavior change**
- All 7 baseline tests pass
- `npx tsc --noEmit` passes
- Build passes

**Test:** Full baseline + type check + build

---

### Task 3.11: Post-phase review checkpoint

**Action:** Dispatch agent reviewer to audit Phase 3 extraction against:
- Plan requirements (instruction precedence is explicit, context assembly is inspectable)
- Instruction stack ordering matches current route.ts exactly
- Context budget/compaction behavior unchanged
- Search decision logic unchanged
- Exact-source routing preserved
- Reasoning sanitization helpers accessible from both `context/` and `executor/` via `shared/`
- No circular dependencies between `context/`, `entry/`, `executor/`, and `shared/`

**Output:** Review report → fix gaps → report to user → wait for validation.

---

## Phase 4: Extract Runtime Policy Layer

**Scope:** Enforcer definitions (route.ts:300–429), enforcer composition into `prepareStep` (route.ts:455–464, 628–636), deterministic sync/submit forced routing (already extracted to context/assemble-step-context.ts:254–258, only consumption in route.ts), auto-rescue policy inside tool definitions (already in executor/build-tool-registry.ts:188–214, 372–399), and choice workflow resolution semantics.

> **Line number note (post-Phase 3):** Phases 1+2+3 reduced route.ts from 4889 → 731 lines. Auto-rescue and deterministic routing were already extracted in Phases 2+3. Enforcers and composition IIFEs remain in route.ts at new positions.

**Goal:** Turn scattered execution law into one runtime-visible policy layer. After this phase, route.ts has NO inline policy decisions — all enforcement and approval logic lives in `src/lib/chat-harness/policy/`.

**Runtime namespace:** `src/lib/chat-harness/policy/`

---

### Task 4.1: Define policy types

**Create:** `src/lib/chat-harness/policy/types.ts`

**What to define:**
- `RuntimePolicyDecision` — the full policy result for one execution step:
  - `prepareStep: PrepareStepFunction | undefined`
  - `forcedToolChoice: ToolChoice | undefined`
  - `maxSteps: number`
  - `requiresApproval: boolean`
  - `pauseReason: string | undefined`
  - `allowedToolNames: string[] | undefined`
  - `executionBoundary: "normal" | "forced-sync" | "forced-submit" | "exact-source" | "revision-chain"`
  - `policyDecisionSummary: string` (human-readable trace for observability)
- `EnforcerContext` — shared state that enforcers read:
  - `paperSession: PaperSession | null`
  - `paperStageScope: PaperStageId | undefined`
  - `paperToolTracker: PaperToolTracker`
  - `resolvedWorkflow: ResolvedChoiceWorkflow | undefined`
  - `choiceInteractionEvent: ParsedChoiceInteractionEvent | null`
  - `isCompileThenFinalize: boolean`
  - `shouldEnforceArtifactChain: boolean`
  - `planHasIncompleteTasks: boolean`
  - `stepTimingRef: { current: number }` — mutable ref for `enforcerStepStartTime` (route.ts:391). Written by universal reactive enforcer on each prepareStep call, read by onFinish handler for step timing telemetry. Must be a ref object so both enforcer and onFinish share the same mutable state.
- `AutoRescueResult`:
  - `rescued: boolean`
  - `refreshedSession: PaperSession | undefined`
  - `error: string | undefined`

**Acceptance criteria:**
- Types compile
- `RuntimePolicyDecision` captures all 6 policy outputs from the plan

**Test:** `npx tsc --noEmit`

---

### Task 4.2: Extract enforcers

**Create:** `src/lib/chat-harness/policy/enforcers.ts`

**What to extract from `route.ts`:**
- Revision chain enforcer (route.ts:302–336)
- Drafting choice artifact enforcer (route.ts:352–389)
- Universal reactive enforcer (route.ts:392–429)

**Function signatures:**
```typescript
export function createRevisionChainEnforcer(ctx: EnforcerContext): PrepareStepFunction | undefined
export function createDraftingChoiceArtifactEnforcer(ctx: EnforcerContext): PrepareStepFunction | undefined
export function createUniversalReactiveEnforcer(ctx: EnforcerContext): PrepareStepFunction | undefined
```

Each returns `undefined` when its activation condition is not met (e.g., not in revision status, not drafting, no choice event).

**Closure-to-parameter conversion:** All three enforcers currently close over route-level variables (`paperSession`, `paperToolTracker`, `paperStageScope`, `resolvedWorkflow`, etc.). These become fields on `EnforcerContext`.

**Acceptance criteria:**
- All three enforcers produce identical `prepareStep` behavior
- Revision chain: step 0 forced during revision, free during pending_validation
- Drafting choice: respects `isCompileThenFinalize`, `shouldEnforceArtifactChain`, `planHasIncompleteTasks`
- Universal reactive: step 0 free, then forces chain after `updateStageData`

**Test:** `npx tsc --noEmit` + baseline

---

### Task 4.3: Extract enforcer composition

**Create:** `src/lib/chat-harness/policy/compose-prepare-step.ts`

**What to extract from `route.ts`:**
- Primary enforcer composition IIFE (route.ts:455–464)
- Fallback enforcer composition IIFE (route.ts:628–636)

**Function signature:**
```typescript
export function composePrepareStep(params: {
  exactSourcePrepareStep: PrepareStepFunction | undefined;
  revisionChainEnforcer: PrepareStepFunction | undefined;
  draftingChoiceArtifactEnforcer: PrepareStepFunction | undefined;
  universalReactiveEnforcer: PrepareStepFunction | undefined;
  deterministicSyncPrepareStep: PrepareStepFunction | undefined;
}): PrepareStepFunction | undefined
```

**Priority chain (preserved exactly):**
1. Exact source force-inspect (from Phase 3)
2. Revision chain > Drafting choice > Universal reactive (null-coalescing)
3. Deterministic sync (fallback)

**Acceptance criteria:**
- Composition logic identical to current IIFE
- Priority order preserved
- Both primary and fallback paths use this same function (different inputs)

**Test:** `npx tsc --noEmit` + baseline

---

### Task 4.4: Extract auto-rescue policy

**Create:** `src/lib/chat-harness/shared/auto-rescue-policy.ts` (NOT `policy/` — see below)

**What to extract from `route.ts`:**
- Auto-rescue block in `createArtifact` (executor/build-tool-registry.ts:188–214)
- Auto-rescue block in `updateArtifact` (executor/build-tool-registry.ts:372–399)

**Source file note:** Auto-rescue blocks were extracted from route.ts to executor/build-tool-registry.ts during Phase 2. This task re-extracts them from build-tool-registry.ts into shared/auto-rescue-policy.ts.

**Why `shared/` not `policy/`:** This function is called from inside the artifact tools (Task 2.5, `buildToolRegistry` in `executor/`). If it lived in `policy/`, the import graph becomes `executor/ → policy/`, which creates a circular dependency risk since `policy/` types reference `PaperToolTracker` (produced by executor-adjacent code). Placing auto-rescue in `shared/` (alongside `reasoning-sanitization.ts` from Task 3.9) keeps the import graph acyclic: both `executor/` and `policy/` can import from `shared/`, but neither imports from each other.

**Function signature:**
```typescript
export async function executeAutoRescue(params: {
  paperSession: PaperSession;
  source: "createArtifact" | "updateArtifact";
  fetchMutationWithToken: ConvexFetchMutation;
  fetchQueryWithToken: ConvexFetchQuery;
  conversationId: Id<"conversations">;
}): Promise<AutoRescueResult>
```

**Acceptance criteria:**
- Auto-rescue transitions from `pending_validation` to `revision` preserved
- Session refresh after rescue preserved
- Error message with `nextAction` guidance preserved
- Import path is `shared/auto-rescue-policy` — no `executor/ → policy/` back-edge

**Test:** `npx tsc --noEmit` + baseline (especially `paperSessions.test.ts`)

---

### Task 4.4b: Extract execution boundary classifier

**Create:** `src/lib/chat-harness/policy/build-tool-boundary-policy.ts`

**What this does:** Derives the `executionBoundary` field of `RuntimePolicyDecision` from the combination of active policy signals. This is the plan's "execution-boundary classification for mutation-capable actions."

**Function signature:**
```typescript
export function classifyExecutionBoundary(params: {
  forcedSyncPrepareStep: PrepareStepFunction | undefined;
  forcedToolChoice: ToolChoice | undefined;
  exactSourceRouting: ExactSourceRoutingResult;
  revisionChainEnforcer: PrepareStepFunction | undefined;
}): RuntimePolicyDecision["executionBoundary"]
```

**Derivation logic:**
- If `forcedSyncPrepareStep` → `"forced-sync"`
- If `forcedToolChoice` (submitStageForValidation) → `"forced-submit"`
- If `exactSourceRouting.mode === "force-inspect"` → `"exact-source"`
- If `revisionChainEnforcer` → `"revision-chain"`
- Otherwise → `"normal"`

**Plan deviation note:** Plan names this file `build-tool-boundary-policy.ts`. Task 4.3 was renamed from `build-prepare-step-policy.ts` to `compose-prepare-step.ts` — this is a naming deviation from the plan, documented here for traceability.

**Acceptance criteria:**
- All 5 boundary classifications correctly derived
- Priority order matches the policy composition order

**Test:** `npx tsc --noEmit`

---

### Task 4.5: Extract policy evaluator and wire into route.ts

**Create:** `src/lib/chat-harness/policy/evaluate-runtime-policy.ts`
**Create:** `src/lib/chat-harness/policy/index.ts` (barrel export)

**Modify:** `src/app/api/chat/route.ts`

**`evaluateRuntimePolicy` orchestrates Tasks 4.2–4.3:**
```typescript
export function evaluateRuntimePolicy(params: {
  enforcerContext: EnforcerContext;
  exactSourceRouting: ExactSourceRoutingResult;
  searchDecision: SearchDecision & { forcedSyncPrepareStep, forcedToolChoice, missingArtifactNote };
}): RuntimePolicyDecision
```

**What stays in route.ts after this:**
- `paperSession` fetch (Phase 7)
- Executor call (Phase 2)
- Error recovery / fallback (Phase 2)

**Acceptance criteria:**
- Route.ts has NO inline enforcer definitions
- Route.ts has NO inline `prepareStep` composition
- `RuntimePolicyDecision` produces correct `prepareStep` for all paths: revision, drafting finalize, exact-source, sync, normal
- All 7 baseline tests pass
- `npx tsc --noEmit` passes
- Build passes

**Test:** Full baseline + type check + build

---

### Task 4.6: Post-phase review checkpoint

**Action:** Dispatch agent reviewer to audit Phase 4 extraction against:
- Plan policy outputs: `requiresApproval`, `pauseReason`, `allowedToolNames`, `forcedToolChoice`, `executionBoundary`, `policyDecisionSummary`
- Enforcer composition priority preserved
- Auto-rescue policy correctly callable from tool definitions
- No circular dependencies: auto-rescue lives in `shared/`, not `policy/` — `executor/` imports from `shared/`, not `policy/`
- prepareStep outcomes match current behavior on all 4 paths

**Output:** Review report → fix gaps → report to user → wait for validation.

---

## Phase 5: Extract Verification Layer

**Scope:** Outcome guards, stream content validation, artifact-chain completeness checks, and plan completion gates — currently embedded in executor modules (`build-on-finish-handler.ts`, `build-step-stream.ts`).

> **Source note (post-Phase 2):** All verification logic was already extracted from route.ts to executor/ during Phase 2. Phase 5 extracts FROM executor modules into a dedicated verification/ namespace. `checkSourceBodyParity` is excluded — it's a tool-call-time gate in `build-tool-registry.ts`, not a post-step check.

**Goal:** Make "can continue / must pause / can complete" a visible harness boundary with a canonical `VerificationResult` shape.

**Runtime namespace:** `src/lib/chat-harness/verification/`

---

### Task 5.1: Define verification types

**Create:** `src/lib/chat-harness/verification/types.ts`

**What to define:**
- `StepVerificationResult`:
  - `canContinue: boolean`
  - `mustPause: boolean`
  - `pauseReason: string | undefined`
  - `canComplete: boolean`
  - `completionBlockers: string[]`
  - `leakageDetected: boolean`
  - `leakageDetails: { match: string; snippet: string } | undefined`
  - `artifactChainComplete: boolean`
  - `planComplete: boolean`
  - `streamContentOverride: string | undefined` (replacement text if outcome guard triggers)
  - Note: `sourceBodyParity` removed — `checkSourceBodyParity` is a tool-call-time validation gate inside `build-tool-registry.ts`, not a post-step outcome check. It doesn't belong in step verification.
- `RunReadinessResult`:
  - `ready: boolean`
  - `blockers: string[]`

**Acceptance criteria:**
- Types compile
- `StepVerificationResult` captures all verification concerns currently scattered across onFinish handlers

**Test:** `npx tsc --noEmit`

---

### Task 5.2: Extract step outcome verification

**Create:** `src/lib/chat-harness/verification/verify-step-outcome.ts`

**What to extract from executor modules (Phase 2):**

> **Source file note (post-Phase 2):** All verification logic was extracted from route.ts to executor/ modules during Phase 2. This task extracts FROM executor modules into verification/, not from route.ts.

- Outcome guard evaluation: `sanitizeChoiceOutcome` call — **dual location**: `build-on-finish-handler.ts:314` (onFinish path) AND `build-step-stream.ts:393` (stream finish handler)
- Artifact-chain completeness checks: tool tracker flag verification in `build-on-finish-handler.ts:219-277`
- Plan completion gate: `autoCompletePlanOnValidation` in `build-on-finish-handler.ts:628,679`
- ~~Source/body parity check~~ — **REMOVED**: `checkSourceBodyParity` is a tool-call-time validation gate inside `build-tool-registry.ts:246,440` (not a post-step outcome check). Does NOT belong in step verification.
- Leakage detection: `paperRecoveryLeakagePattern` matching in `build-step-stream.ts:473` — **incremental** (runs per text-delta chunk, not at finish). Extract as a **leakage summary** (read `paperTurnObservability.firstLeakageMatch` at finish time), not as a re-scan.
- Stream guard: `sanitizeChoiceOutcome` in stream finish handler at `build-step-stream.ts:392-417` — produces `streamContentOverride`

**Function signature:**
```typescript
export function verifyStepOutcome(params: {
  text: string;
  steps: StepResult[];
  paperToolTracker: PaperToolTracker;
  paperTurnObservability: PaperTurnObservability;
  resolvedWorkflow: ResolvedChoiceWorkflow | undefined;
  choiceInteractionEvent: ParsedChoiceInteractionEvent | null;
  paperSession: PaperSession | null;
  paperStageScope: PaperStageId | undefined;
}): StepVerificationResult
```

**Stream guard placement note:** The stream guard content accumulation (route.ts:3893-3930, 4770-4826) happens inside the `createUIMessageStream` writer's `finish` chunk handler. Per Phase 2's shared-closure constraint, `buildStepStream` owns both the stream writer and `streamContentOverride`. Therefore: `verifyStepOutcome` is called FROM INSIDE `buildStepStream`'s stream writer `finish` handler (where accumulated text is available), NOT from `onFinish`. The function receives the accumulated `text` as a plain param and returns `StepVerificationResult` including `streamContentOverride`. The stream writer then uses `streamContentOverride` to replace content before `writer.write()`. This keeps the verification logic in a separate testable function while respecting the shared-closure constraint.

**Acceptance criteria:**
- `sanitizeChoiceOutcome` call preserved (stays wrapped, not rewritten)
- Leakage summary reads from `paperTurnObservability` (incremental detection stays in build-step-stream.ts)
- `streamContentOverride` produced when outcome guard triggers
- Called from inside `buildStepStream` stream writer, NOT from `onFinish`
- All completeness checks produce same results
- `checkSourceBodyParity` NOT moved here (stays in tool registry as tool-level check)

**Test:** `npx tsc --noEmit` + baseline

---

### Task 5.3: Extract run readiness verification

**Create:** `src/lib/chat-harness/verification/verify-run-readiness.ts`

**What to extract:** Completion-readiness logic — the decision of whether a run can be considered complete. Currently this is implicit in onFinish handlers (checking tool tracker, plan state, stage status).

**Function signature:**
```typescript
export function verifyRunReadiness(params: {
  stepVerification: StepVerificationResult;
  paperSession: PaperSession | null;
  paperStageScope: PaperStageId | undefined;
}): RunReadinessResult
```

**Acceptance criteria:**
- Run readiness correctly blocks when verification fails
- Run readiness correctly passes when all checks pass

**Test:** `npx tsc --noEmit` + baseline

---

### Task 5.4: Wire verification into executor and route.ts

**Create:** `src/lib/chat-harness/verification/index.ts` (barrel export)

**Modify:** `src/lib/chat-harness/executor/build-on-finish-handler.ts` (Task 2.3) — onFinish handler now calls `verifyStepOutcome` instead of inline guard logic

**Modify:** `src/lib/chat-harness/executor/build-step-stream.ts` (Task 2.4) — stream writer uses `StepVerificationResult.streamContentOverride`

**Acceptance criteria:**
- onFinish handler no longer contains inline verification logic
- Stream writer uses structured verification result
- All 7 baseline tests pass
- `npx tsc --noEmit` passes
- Build passes

**Test:** Full baseline + type check + build

---

### Task 5.5: Post-phase review checkpoint

**Action:** Dispatch agent reviewer to audit Phase 5 against:
- Plan requirements (completion explainable from structured verification result)
- Route no longer hardcodes completion/leakage guard logic inline
- Verification result shape captures all current inline checks

**Output:** Review report → fix gaps → report to user → wait for validation.

---

## Phase 6: Add Explicit Run, Step, Policy, and Event Persistence

**Scope:** New Convex tables (`harnessRuns`, `harnessRunSteps`, `harnessEvents`) plus persistence adapters in `src/lib/chat-harness/persistence/`. First phase that adds new data models — qualitatively different from Phase 1–5 extractions.

**Goal:** Persist harness runtime facts as a reconstructible event stream without mutating existing domain models (`paperSessions`, `artifacts`, `conversations`, `messages` remain untouched and authoritative for domain truth).

**Runtime namespace:** `src/lib/chat-harness/persistence/`, `convex/harnessRuns.ts`, `convex/harnessRunSteps.ts`, `convex/harnessEvents.ts`

> **Pre-verify patch notes (Session 3, 2026-04-16):** Original plan was minimal (3-table + 5-field envelope). User decision: **align to research doc event contract** (12-field envelope, 28 canonical event types) and **resolve three blockers in-phase** rather than deferring:
> - **B1 (step indexing missing):** resolved by adding `stepNumber` counter on `harnessRuns` + `incrementStepNumber` mutation for atomic increment (Task 6.2a).
> - **B2 (`executionBoundary` ≠ `PolicyState.currentBoundary`):** resolved by keeping `executionBoundary` (5 values) in event payloads and persisting a separate mapped `currentBoundary` (3 values) in `policyState` snapshot (Task 6.1d + Task 6.4c).
> - **B3 (RunLane insufficient for run creation):** resolved by extending RunLane with `runId` and `ownerToken`, and deriving `workflowStage`/`workflowStatus` from paperSession when present or defaulting to `"intake"`/`"running"` (Task 6.4a).
>
> `activeLaneKey` (never defined anywhere) is replaced by `ownerToken` per research doc RunState contract.

**Reference:** `.references/agent-harness/research/2026-04-15-makalahapp-harness-v1-event-model-and-data-contracts.md`
- Event envelope: line 128
- Canonical event types: lines 73–121 (6 categories, 28 types)
- `RunState` contract: lines 809–831
- `PolicyState` contract: lines 868–878
- `WorkflowStatus` enum: line 744 (`running | paused | failed | completed | aborted`)

**Schema conventions (applies to all Phase 6 tasks):**
- Timestamps use `v.number()` (ms epoch) to match existing tables; research doc's ISO strings convert at API edges only
- Enums use `v.union(v.literal(...), ...)`
- Foreign keys use `v.id("table")` where target is a Convex table
- Index names follow existing convention: `by_<field>` or `by_<a>_<b>`
- Auth: all mutations call `requireAuthUserId` / `requireConversationOwner` per `convex/conversations.ts` pattern

> **Accepted deviation from research doc — identity field types (post-audit, 2026-04-16):**
> Research doc contracts (`RunState`, `EventEnvelope`) use plain `string` for `userId`, `sessionId`, `chatId`, `runId`, `stepId`. This Phase 6 implementation uses Convex's typed `v.id("table")` brand for fields whose target is a real Convex table (`userId: v.id("users")`, `chatId: v.id("conversations")`, `runId: v.id("harnessRuns")`, `stepId: v.id("harnessRunSteps")`). `sessionId` remains plain `v.string()` (no target table; it's a request-scoped opaque token).
>
> **Rationale:** (1) at runtime, `v.id("users")` IS a string — branded type, identical persisted bytes; (2) all 15 existing tables in the repo use typed user/conversation IDs — repo-wide consistency outranks line-by-line spec fidelity; (3) typed IDs catch wrong-table foreign-key bugs at compile time.
>
> Codex audit (Phase 6 close-out) flagged this as MEDIUM. **Decision:** keep typed IDs, document deviation here. Research doc contracts remain authoritative for envelope SHAPE; field types are repo-pattern aligned.

---

### Task 6.1: Define Convex schema for harness tables

**Modify:** `convex/schema.ts`

#### 6.1a: `harnessRuns` table

Fields (aligned with research doc `RunState` + paperSessions link):
- `conversationId: v.id("conversations")`
- `paperSessionId: v.optional(v.id("paperSessions"))` — nullable; links when paper flow starts
- `userId: v.string()` — access-control parity with other tables
- `ownerToken: v.string()` — atomic ownership anchor (Phase 8 resume + duplicate-start prevention); replaces ambiguous `activeLaneKey`
- `status: v.union(v.literal("running"), v.literal("paused"), v.literal("completed"), v.literal("failed"), v.literal("aborted"))`
- `workflowStage: v.string()` — mirrors `paperSessions.currentStage` when linked; `"intake"` default when no paperSession
- `workflowStatus: v.union(...)` — `WorkflowStatus` enum (same 5 values as run status but tracked separately per research doc note: `stage` and `status` must remain separate; workflow status can complete while run is still running)
- `stepNumber: v.number()` — monotonic per-run counter (resolves Blocker B1)
- `currentStepId: v.optional(v.id("harnessRunSteps"))`
- `pendingDecisionId: v.optional(v.string())` — authoritative block marker for user pause (Phase 8)
- `policyState: v.optional(v.object({...}))` — see 6.1d
- `failureClass: v.optional(v.union(v.literal("entry_failure"), v.literal("state_failure"), v.literal("tool_failure"), v.literal("verification_failure"), v.literal("guard_failure"), v.literal("unexpected_failure")))`
- `failureReason: v.optional(v.string())`
- `startedAt: v.number()`
- `updatedAt: v.number()`
- `pausedAt: v.optional(v.number())`
- `completedAt: v.optional(v.number())`

Indexes:
- `by_conversation` on `conversationId`
- `by_paperSession` on `paperSessionId`
- `by_ownerToken` on `ownerToken` (unique lookups for resume)
- `by_user_updated` on `["userId", "updatedAt"]`

#### 6.1b: `harnessRunSteps` table

Fields:
- `runId: v.id("harnessRuns")`
- `stepIndex: v.number()` — monotonic per-run; matches the `stepNumber` value at creation time
- `status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed"))`
- `executorResultSummary: v.optional(v.object({ finishReason: v.string(), inputTokens: v.optional(v.number()), outputTokens: v.optional(v.number()), totalTokens: v.optional(v.number()) }))`
- `verificationSummary: v.optional(v.object({ canContinue: v.boolean(), mustPause: v.boolean(), pauseReason: v.optional(v.string()), canComplete: v.boolean(), completionBlockers: v.array(v.string()), leakageDetected: v.boolean(), artifactChainComplete: v.boolean(), planComplete: v.boolean(), streamContentOverridden: v.boolean() }))` — flattened snapshot of `StepVerificationResult` (omits `leakageDetails` body and `streamContentOverride` string to cap row size; retains booleans for replay)
- `toolCalls: v.array(v.object({ toolName: v.string(), toolCallId: v.optional(v.string()), resultStatus: v.optional(v.string()) }))`
- `startedAt: v.number()`
- `completedAt: v.optional(v.number())`

Indexes:
- `by_run` on `runId`
- `by_run_step` on `["runId", "stepIndex"]` — composite; enforces logical primary key at query level

Table uses default Convex `_id`; composite `(runId, stepIndex)` uniqueness enforced by mutation logic (not by schema constraint — Convex has no unique-index primitive).

#### 6.1c: `harnessEvents` table

Fields (12-field envelope per research doc line 128):
- `eventId: v.string()` — stable dedupable identifier; generated by mutation if not supplied
- `eventType: v.string()` — must be one of the 28 canonical names (validated at adapter level, not at schema level, to keep mutations permissive for future event types)
- `schemaVersion: v.number()` — start at `1`
- `occurredAt: v.number()` — ms epoch (converted from ISO at API boundaries if needed)
- `userId: v.string()`
- `sessionId: v.string()` — request-scoped session identifier
- `chatId: v.id("conversations")`
- `runId: v.optional(v.id("harnessRuns"))` — absent for pre-run entry events
- `stepId: v.optional(v.id("harnessRunSteps"))`
- `correlationId: v.optional(v.string())` — groups events for one user action
- `causationEventId: v.optional(v.string())` — causal chain pointer
- `payload: v.any()` — event-specific; validated by TypeScript at adapter layer

Indexes:
- `by_run_time` on `["runId", "occurredAt"]`
- `by_correlation` on `correlationId`
- `by_eventType_time` on `["eventType", "occurredAt"]`
- `by_chat_time` on `["chatId", "occurredAt"]`

#### 6.1d: `policyState` sub-object (embedded in `harnessRuns`)

Shape (research doc `PolicyState` contract, line 871):
```ts
v.object({
  approvalMode: v.union(v.literal("default"), v.literal("required_for_high_impact")),
  currentBoundary: v.union(v.literal("read_only"), v.literal("bounded_mutation"), v.literal("blocked")),
  pendingApprovalDecisionId: v.optional(v.string()),
  lastPolicyReason: v.optional(v.string()),
  updatedAt: v.number(),
})
```

`executionBoundary` (5 values from `RuntimePolicyDecision`) lives in event payloads only. Mapping to `currentBoundary` (3 values) happens in Task 6.4c wiring. This keeps runtime observability rich (5-value taxonomy preserved in events) while persisting the coarser durable contract.

**Acceptance criteria:**
- Schema compiles (`npx tsc --noEmit`)
- `npx convex dev` accepts the new tables without warnings
- `paperSessions`, `artifacts`, `conversations`, `messages` fields are NOT modified
- All four new indexes on `harnessRuns` are present

**Test:** `npx tsc --noEmit` + Convex schema validation via `npx convex dev` dry run

---

### Task 6.2: Create harness persistence mutations

**Create:** `convex/harnessRuns.ts`, `convex/harnessRunSteps.ts`, `convex/harnessEvents.ts`

**Conventions:**
- Use `mutation` / `query` from `./_generated/server`
- Auth: `requireAuthUserId(ctx, userId)` / `requireConversationOwner(ctx, conversationId, userId)` per existing `convex/conversations.ts` patterns
- Return the mutated record ID or record; let Convex validation errors propagate (no custom error classes)
- Each file stays under ~200 lines

#### 6.2a: `convex/harnessRuns.ts`

- `createRun({ conversationId, userId, paperSessionId?, workflowStage, workflowStatus })` → `{ runId, ownerToken }`
  - Generates `ownerToken` via `crypto.randomUUID()` (Convex Node runtime has `crypto.webcrypto`)
  - Initializes: `status="running"`, `stepNumber=0`, `startedAt=Date.now()`, `updatedAt=Date.now()`
- `updateRunStatus({ runId, status, workflowStatus?, pausedAt?, failureClass?, failureReason? })` → `null`
  - Always patches `updatedAt=Date.now()`
- `linkPaperSession({ runId, paperSessionId })` — called when paper flow starts mid-conversation
- `recordPolicyState({ runId, policyState })` — writes PolicyState snapshot; sets embedded `policyState.updatedAt`
- `incrementStepNumber({ runId })` → `{ stepNumber }` (atomic read + patch; **resolves Blocker B1**)
  - Read current `stepNumber`, patch to `stepNumber + 1`, return new value
  - Convex mutations are serialized per document so this is safe against double-increment
- `setCurrentStep({ runId, stepId })`
- `completeRun({ runId })` — sets `status="completed"`, `completedAt=Date.now()`
- `getRunByConversation({ conversationId, status? })` — returns latest run, optionally filtered by status (uses `by_conversation` index + `.order("desc")`)
- `getRunByOwnerToken({ ownerToken })` — Phase 8 resume lookup (uses `by_ownerToken` index)

#### 6.2b: `convex/harnessRunSteps.ts`

- `createStep({ runId, stepIndex, startedAt })` → `{ stepId }`
  - Callers MUST pass `stepIndex` obtained from `incrementStepNumber` (keeps monotonicity enforceable at one call site)
  - Initializes `status="running"`, empty `toolCalls=[]`
- `completeStep({ stepId, status, executorResultSummary?, verificationSummary?, toolCalls, completedAt })` → `null`
- `getStepsByRun({ runId })` — ordered by `stepIndex` asc (uses `by_run_step` index)
- `getCurrentStep({ runId })` — returns the step matching `harnessRuns.currentStepId`, or null

#### 6.2c: `convex/harnessEvents.ts`

- `emitEvent({ eventId?, eventType, schemaVersion?, occurredAt?, userId, sessionId, chatId, runId?, stepId?, correlationId?, causationEventId?, payload })` → `null`
  - If `eventId` omitted, generate via `crypto.randomUUID()`
  - If `occurredAt` omitted, use `Date.now()`
  - `schemaVersion` defaults to `1`
- `getEventsByRun({ runId, eventTypeFilter?, limit? })` — ordered by `occurredAt` asc (uses `by_run_time`)
- `getEventsByCorrelation({ correlationId })` (uses `by_correlation`)
- `getEventsByChat({ chatId, limit? })` — debug/observability helper (uses `by_chat_time`)

**Event type validation strategy:** Validation of `eventType` against the canonical 28 names lives in the TypeScript adapter layer (`event-types.ts` constant). Convex mutations accept arbitrary strings so future event types don't require a schema migration. Trade-off documented explicitly here.

**Acceptance criteria:**
- All mutations compile and are accessible via `api.harnessRuns.*`, `api.harnessRunSteps.*`, `api.harnessEvents.*`
- CRUD operations work for all three tables (verified via new unit tests)
- No import of `paperSessions` internals
- Each file ≤200 lines

**Test:** `npx tsc --noEmit` + new test files:
- `convex/harnessRuns.test.ts` — covers create → incrementStepNumber → updateStatus → completeRun flow
- `convex/harnessEvents.test.ts` — covers emit + query by run + query by correlation

---

### Task 6.3: Create persistence adapters

**Create:**
- `src/lib/chat-harness/persistence/types.ts` — `RunStore`, `EventStore`, `HarnessEventEnvelope` interfaces
- `src/lib/chat-harness/persistence/event-types.ts` — canonical event name constant + type guard
- `src/lib/chat-harness/persistence/run-store.ts`
- `src/lib/chat-harness/persistence/event-store.ts`
- `src/lib/chat-harness/persistence/index.ts` — barrel

#### 6.3a: `event-types.ts`

Export a frozen constant mapping canonical names → string literals, derived from research doc lines 73–121:

```ts
export const HARNESS_EVENT_TYPES = {
  // Entry (3)
  USER_MESSAGE_RECEIVED: "user_message_received",
  USER_TOOL_RESULT_RECEIVED: "user_tool_result_received",
  USER_DECISION_RECEIVED: "user_decision_received",
  // Run lifecycle (6)
  RUN_STARTED: "run_started",
  RUN_RESUMED: "run_resumed",
  RUN_PAUSED: "run_paused",
  RUN_COMPLETED: "run_completed",
  RUN_FAILED: "run_failed",
  RUN_ABORTED: "run_aborted",
  // Step execution (4)
  STEP_STARTED: "step_started",
  INSTRUCTION_STACK_RESOLVED: "instruction_stack_resolved",
  AGENT_OUTPUT_RECEIVED: "agent_output_received",
  STEP_COMPLETED: "step_completed",
  // Tool & mutation (8)
  TOOL_CALLED: "tool_called",
  APPROVAL_REQUESTED: "approval_requested",
  APPROVAL_RESOLVED: "approval_resolved",
  EXECUTION_BOUNDARY_EVALUATED: "execution_boundary_evaluated",
  TOOL_RESULT_RECEIVED: "tool_result_received",
  ARTIFACT_MUTATION_REQUESTED: "artifact_mutation_requested",
  ARTIFACT_MUTATION_APPLIED: "artifact_mutation_applied",
  ARTIFACT_MUTATION_REJECTED: "artifact_mutation_rejected",
  // Workflow & verification (5)
  WORKFLOW_TRANSITION_REQUESTED: "workflow_transition_requested",
  WORKFLOW_TRANSITION_APPLIED: "workflow_transition_applied",
  WORKFLOW_TRANSITION_REJECTED: "workflow_transition_rejected",
  VERIFICATION_STARTED: "verification_started",
  VERIFICATION_COMPLETED: "verification_completed",
  // User decision (3)
  USER_DECISION_REQUESTED: "user_decision_requested",
  USER_DECISION_RESOLVED: "user_decision_resolved",
  USER_DECISION_DECLINED: "user_decision_declined",
} as const;

export type HarnessEventType = (typeof HARNESS_EVENT_TYPES)[keyof typeof HARNESS_EVENT_TYPES];
```

#### 6.3b: `run-store.ts`

```ts
interface RunStore {
  createRun(params: CreateRunParams): Promise<{ runId: Id<"harnessRuns">; ownerToken: string }>;
  linkPaperSession(runId, paperSessionId): Promise<void>;
  updateStatus(runId, status, opts?): Promise<void>;
  recordPolicyState(runId, policyState): Promise<void>;
  startStep(runId): Promise<{ stepId: Id<"harnessRunSteps">; stepIndex: number }>;
    // Internally calls incrementStepNumber + createStep + setCurrentStep
  completeStep(stepId, summary): Promise<void>;
  completeRun(runId): Promise<void>;
  getActiveRunByConversation(conversationId): Promise<RunRecord | null>;
}
```

Thin wrapper over Convex mutations. No business logic beyond composing the `startStep` flow (two mutations, one boundary). All auth, validation, and mutation logic lives in Convex mutations.

#### 6.3c: `event-store.ts`

```ts
interface EventStore {
  emit(envelope: HarnessEventEnvelope): Promise<void>;
  // Typed helpers per canonical event (reduces call-site noise):
  emitRunStarted(params): Promise<void>;
  emitStepStarted(params): Promise<void>;
  emitStepCompleted(params): Promise<void>;
  emitToolCalled(params): Promise<void>;
  emitExecutionBoundaryEvaluated(params): Promise<void>;
  emitVerificationCompleted(params): Promise<void>;
  emitWorkflowTransitionApplied(params): Promise<void>;
  emitUserDecisionReceived(params): Promise<void>;
  // ...one helper per event actually emitted in Task 6.4 wiring
}
```

Canonical envelope fields (`schemaVersion`, `occurredAt`, generated `eventId`) are filled at adapter level. Correlation/causation IDs are threaded from request context.

**V1 scope:** Only implement typed helpers for events actually emitted in Task 6.4 wiring. Other 28 canonical types may emit via the generic `emit()` or be deferred to V2.

**Acceptance criteria:**
- Adapters callable from harness modules
- One synchronous chat request produces traceable `harnessRuns` + `harnessRunSteps` + `harnessEvents` records
- No Convex mutation calls outside `persistence/` (enforced by code review, not by type system)
- TypeScript payload types for each typed helper match the research doc contracts

**Test:**
- `npx tsc --noEmit`
- `src/lib/chat-harness/persistence/run-store.test.ts` — mock Convex client; verify correct mutation calls for each adapter method
- `src/lib/chat-harness/persistence/event-store.test.ts` — verify envelope assembly (auto-fills, correlation threading)

---

### Task 6.4: Wire persistence into harness modules

**Scope:** Inject persistence calls at lifecycle points without changing existing logic paths. UI behavior must remain identical.

**Execution strategy:** Multi-agent dispatch — one agent per wiring target (6.4a–6.4e) running in parallel where possible, then one agent for integration verification.

**Observability requirement:** Each wiring task MUST add corresponding `[HARNESS][persistence]` log lines so terminal output can be matched against Convex row changes during UI testing.

#### 6.4a: Entry wiring (resolves Blocker B3)

**Modify:**
- `src/lib/chat-harness/types/runtime.ts` — extend `RunLane`:
  ```ts
  interface RunLane {
    requestId: string;
    conversationId: Id<"conversations">;
    mode: RunStartMode;
    runId: Id<"harnessRuns">;   // NEW
    ownerToken: string;          // NEW
    sessionId: string;           // NEW — for event envelope
  }
  ```
- `src/lib/chat-harness/entry/resolve-run-lane.ts` — after acceptance, call `runStore.createRun` and populate new fields
- `src/lib/chat-harness/entry/persist-user-message.ts` — emit `user_message_received` after message save
- `src/lib/chat-harness/entry/validate-choice-interaction.ts` — emit `user_decision_received` when choice event validates (see also 6.4e)

**`workflowStage`/`workflowStatus` derivation:**
- If `paperSession` exists for conversation: `workflowStage = paperSession.currentStage`, `workflowStatus` mapped from `stageStatus` (`"pending_validation"` → `"running"`, `"completed"` → `"completed"`, etc.)
- Else: `workflowStage = "intake"`, `workflowStatus = "running"`
- Exact mapping table documented in `create-harness-run.ts` header comment

**Emit order:**
1. `createRun` → fills RunLane.runId/ownerToken/sessionId
2. Emit `run_started` with `RunStartedPayload`
3. Persist user message (existing logic)
4. Emit `user_message_received`

#### 6.4b: Executor wiring

**Modify:**
- `src/lib/chat-harness/executor/build-step-stream.ts` — wrap `streamText` invocation with step lifecycle
- `src/lib/chat-harness/executor/build-on-finish-handler.ts` — complete step + emit events in onFinish
- `src/lib/chat-harness/executor/types.ts` — extend `StepExecutionConfig` with `runId`, `stepId` (injected via closure from wrapper)

**Flow:**
1. Before `streamText`: `runStore.startStep(runId)` → `{ stepId, stepIndex }`; emit `step_started`
2. On each `tool-call` stream part: emit `tool_called`
3. On each `tool-result` stream part: emit `tool_result_received`
4. In onFinish handler:
   - Build `executorResultSummary` from `{ finishReason, usage }`
   - Build `toolCalls` from `steps.flatMap(...)`
   - Wait for `verifyStepOutcome` result (already produced per Phase 5)
   - Build `verificationSummary` from `StepVerificationResult` (booleans + arrays, no closure/stream fields)
   - Call `runStore.completeStep(stepId, { status, executorResultSummary, verificationSummary, toolCalls, completedAt })`
   - Emit `step_completed`, `agent_output_received`, `verification_completed`
5. On stream error: `runStore.updateStatus(runId, "failed", { failureClass: "tool_failure" | "unexpected_failure", failureReason })`; emit `run_failed`

**Step ID threading:** `stepId` is captured in the executor closure at stream start and used in onFinish. No changes to the external streamText API.

#### 6.4c: Policy wiring (resolves Blocker B2)

**Create:** `src/lib/chat-harness/policy/map-policy-boundary.ts`

```ts
export function mapExecutionBoundaryToPolicyBoundary(
  decision: RuntimePolicyDecision
): PolicyStateCurrentBoundary {
  if (decision.requiresApproval || decision.pauseReason) return "blocked";
  if (decision.executionBoundary === "normal") return "read_only";
  // forced-sync, forced-submit, exact-source, revision-chain
  return "bounded_mutation";
}
```

**Modify:** `src/lib/chat-harness/policy/evaluate-runtime-policy.ts`
- After decision computation, before return:
  - Build `PolicyState` snapshot: `{ approvalMode: decision.requiresApproval ? "required_for_high_impact" : "default", currentBoundary: mapExecutionBoundaryToPolicyBoundary(decision), pendingApprovalDecisionId: undefined /* populated by 6.4e when decision requested */, lastPolicyReason: decision.policyDecisionSummary, updatedAt: Date.now() }`
  - Call `runStore.recordPolicyState(runId, snapshot)`
  - Emit `execution_boundary_evaluated` with full `RuntimePolicyDecision` payload (excluding `prepareStep`, `stepTimingRef` — non-serializable)

#### 6.4d: Verification wiring

**Modify:**
- `src/lib/chat-harness/verification/verify-step-outcome.ts`:
  - Emit `verification_started` at entry (target=`"combined"`)
  - Emit `verification_completed` at return with full `StepVerificationResult` as payload
- `src/lib/chat-harness/verification/verify-run-readiness.ts`:
  - Emit `verification_completed` with target=`"completion"` and `RunReadinessResult` payload

**Note:** `verification_completed` fires twice per step (once for step outcome, once for run readiness). Distinguished by `payload.target`.

#### 6.4e: Decision / workflow transition wiring

**Modify:** `src/lib/chat-harness/entry/validate-choice-interaction.ts`
- On valid choice received:
  - Emit `user_decision_received`
  - Emit `workflow_transition_requested` + `workflow_transition_applied` (or `_rejected` on stale state)
- On stale state (409 response): emit `workflow_transition_rejected`

#### 6.4f: Baseline verification

**Run after all wiring complete:**
- All 11 baseline tests (handoff file list) pass unchanged
- New persistence tests pass
- `npx tsc --noEmit` clean
- `npx next build` succeeds
- Manual smoke: one chat request produces expected row counts in Convex dashboard

**Acceptance criteria:**
- One chat request produces: 1 `harnessRuns` row + ≥1 `harnessRunSteps` row + ≥10 `harnessEvents` rows (typical chat without tools; tool-heavy paper flow produces more)
- All 11 baseline tests still pass
- New persistence tests pass (`convex/harnessRuns.test.ts`, `convex/harnessEvents.test.ts`, `src/lib/chat-harness/persistence/run-store.test.ts`, `src/lib/chat-harness/persistence/event-store.test.ts`)
- `npx next build` passes
- `paperSessions` and `artifacts` tables have zero schema or data modifications
- `harnessEvents.correlationId` groups events within one user action (verifiable by query)

**Observability expectations — document per wiring target:**

| Wiring | Next.js terminal | Convex logs | Browser console |
|---|---|---|---|
| 6.4a Entry | `[HARNESS][persistence] createRun runId=<id> ownerToken=<token>` | `harnessRuns.createRun` mutation | (none) |
| 6.4a Entry | `[HARNESS][event] run_started correlationId=<cid>` | `harnessEvents.emitEvent` | (none) |
| 6.4b Executor | `[HARNESS][persistence] startStep runId=<id> stepIndex=N` | `harnessRuns.incrementStepNumber` + `harnessRunSteps.createStep` | (none) |
| 6.4b Executor | `[HARNESS][persistence] completeStep stepId=<id> blockers=[...]` | `harnessRunSteps.completeStep` | (none) |
| 6.4c Policy | `[HARNESS][persistence] recordPolicyState currentBoundary=<b>` | `harnessRuns.recordPolicyState` | (none) |
| 6.4d Verification | `[HARNESS][event] verification_completed target=<t>` | `harnessEvents.emitEvent` | (none) |

**Test:** Full baseline + persistence tests + type check + `npx next build` + manual smoke via UI

---

### Task 6.5: Post-phase review checkpoint

**Action:** Dispatch agent reviewer (Codex-delegated per `CLAUDE.md` ADR) to audit Phase 6 against:

- **Schema fidelity:** field types match research doc contracts; enum values match; 12-envelope is complete
- **No domain corruption:** `paperSessions`, `artifacts`, `conversations`, `messages` have zero field changes (verified via git diff on `convex/schema.ts`)
- **Adapter thinness:** no business logic in `run-store.ts` or `event-store.ts` beyond envelope assembly and one-to-many mutation composition (e.g., `startStep` = increment + create + setCurrent)
- **Event coverage:** all 28 canonical event types have typed helpers OR a documented deferral list
- **Boundary mapping:** `mapExecutionBoundaryToPolicyBoundary` is correct for all 5 `executionBoundary` values × approval states
- **Step monotonicity:** `stepNumber` increments atomically; cannot produce duplicate `stepIndex` under concurrent requests (Convex per-document serialization is sufficient; note in comment)
- **`ownerToken` generation:** uses `crypto.randomUUID()` (or equivalent CSPRNG); never predictable
- **Correlation chaining:** events within one request share `correlationId`; step events chain via `causationEventId` to `step_started`
- **Observability logs:** every `[HARNESS][persistence]` log line in the matrix above actually fires at the expected point during a test request

**Observability artifacts to produce:**
- Sample run trace: annotated Next.js terminal output for a simple chat request
- Sample run trace: annotated terminal output for a paper-flow `paper.start` → choice → next-stage sequence
- Sample Convex dashboard screenshot reference: row counts per table for each scenario
- Sample `harnessEvents` query: events for one `runId` ordered by `occurredAt`, showing correlation chain

**Output:** Review report → fix gaps → report to user → wait for validation before Phase 7.

---

## Phase 7: Thin `route.ts` into a Chat Harness Adapter

**Scope:** Final assembly — `route.ts` becomes a thin HTTP adapter that delegates to the harness runtime. All orchestration, paper-mode setup, observability plumbing, and fallback execution move behind a `runChatHarness()` entry.

**Goal:** `route.ts` responsibility = parse request → delegate to harness → return response → catch fatal. Everything else lives behind the adapter boundary so Phase 8 pause/resume can extend the orchestrator without touching HTTP concerns.

**Runtime namespace:** `src/lib/chat-harness/runtime/`

> **Pre-verify patch notes (Session 3, 2026-04-16):** Plan was written before Phases 1-6 executed. Post-Phase-6 reality changed the scope:
> - `route.ts` is now 645 lines (Phase 6 wiring added ~35 lines: runStore/eventStore construction, RunLane extended, async `evaluateRuntimePolicy`, step lifecycle state).
> - 17 inline logic blocks (~180 lines) that the original plan didn't enumerate need explicit orchestrator responsibility.
> - Fallback is a 195-line nested block in the primary try/catch, not a mere "classify + retry" step.
>
> User decisions on design points (Q1-Q5), documented here:
> - **Q1 Fallback extraction:** Extract to `attemptFallbackExecution()` method INSIDE `orchestrate-sync-run.ts` (not a separate file; same module so orchestrator retains single-source-of-truth for the full execution flow).
> - **Q2 Tool registry order:** Reorder in orchestrator so `buildToolRegistry` runs AFTER `evaluateRuntimePolicy` — policy's `forcedToolChoice` + `allowedToolNames` must apply before tools finalize.
> - **Q3 File split:** Two files as planned. `run-chat-harness.ts` = HTTP adapter boundary (request parse + adapter construction + Response assembly). `orchestrate-sync-run.ts` = 13-step synchronous execution engine + fallback path. Phase 8 modifies only `orchestrate-sync-run.ts`.
> - **Q4 paperSession threading:** `paperSession` becomes a first-class output of step 5 (paper context resolution) and is threaded explicitly to all downstream consumers. No more closure capture in `saveAssistantMessageLocal`, `getCurrentPlanSnapshot`, or fallback routing.
> - **Q5 Pause control flow:** After step 8 (policy), if `policyDecision.requiresApproval === true`, orchestrator returns early with a pause result (`{ status: "paused", pendingDecisionId }`). Phase 8 extends this return path with pause persistence; Phase 7 establishes the early-return pattern.
>
> **Line count target:** Tightened from "~50-80" to **~50-70 lines**, based on reviewer's calculated remaining (~41 lines core + imports/types ≈ 50-70).

**Reference:** Reviewer's pre-verify audit enumerates 17 inline logic blocks and 8 gap items. See Task 7.1 "Inline blocks inventory" below.

---

### Task 7.1: Create harness runtime orchestrator

**Create:**
- `src/lib/chat-harness/runtime/run-chat-harness.ts` — HTTP adapter boundary
- `src/lib/chat-harness/runtime/orchestrate-sync-run.ts` — 13-step execution engine + fallback
- `src/lib/chat-harness/runtime/types.ts` — `SyncRunResult`, `SyncRunPauseResult`, `SyncRunError` types
- `src/lib/chat-harness/runtime/index.ts` — barrel

#### 7.1a: `run-chat-harness.ts` — HTTP adapter

**Responsibility:** HTTP-level concerns only. Does NOT orchestrate steps.

Pseudocode:
```ts
export async function runChatHarness(req: Request): Promise<Response> {
  // 1. Accept + construct adapters (entry boundary)
  const accepted = await acceptChatRequest(req)
  const runStore = createRunStore({ fetchMutation: accepted.fetchMutationWithToken })
  const eventStore = createEventStore({ fetchMutation: accepted.fetchMutationWithToken })

  // 2. Delegate to 13-step sync orchestrator
  const result = await orchestrateSyncRun({
    accepted,
    runStore,
    eventStore,
  })

  // 3. Adapter: SyncRunResult → Response
  if (result.kind === "stream") return result.response
  if (result.kind === "paused") return buildPauseResponse(result)  // Phase 8 scaffolding
  throw result.error  // fatal → route.ts outer catch
}
```

**Acceptance criteria for 7.1a:**
- File ≤80 lines
- No business logic — only request parsing, adapter construction, and result→Response mapping
- `SyncRunResult` discriminated union: `{ kind: "stream", response } | { kind: "paused", pendingDecisionId, runId } | { kind: "error", error }`

#### 7.1b: `orchestrate-sync-run.ts` — 13-step sync engine + fallback

**Responsibility:** The full execution flow. Owns all orchestration, observability setup, and fallback retry.

**Revised 13-step sequence (post pre-verify):**

1. `resolveConversation` (Phase 1)
2. `resolveAttachments` (Phase 1)
3. `persistUserMessage` (Phase 1) + emit `user_message_received`
4. **Paper context resolution** (extracted from inline):
   - Fetch `paperSession` via Convex query
   - Resolve `paperModePrompt` via `getPaperModeSystemPrompt()`
   - Derive `paperStageScope`, `isDraftingStage`, `isHasilPostChoice`
   - Detect post-edit-resend reset condition
   - Initialize `paperToolTracker` + `paperTurnObservability` objects
   - Construct `freeTextContextNote` per paper-state branches
   - Log `[PAPER][session-resolve]` observability
   - Mutate `billingContext.operationType` IF paper mode (critical timing — must happen AFTER paperSession fetch; Phase 1 preserved this pattern)
   - **Output:** `PaperContextResolution` object: `{ paperSession, paperStageScope, isDraftingStage, isHasilPostChoice, paperToolTracker, paperTurnObservability, paperModePrompt, freeTextContextNote }`
5. `validateChoiceInteraction` (Phase 1)
6. `assembleStepContext` (Phase 3)
7. `evaluateRuntimePolicy` (Phase 4) — async post-Phase-6
8. **Pause check** (Phase 8 seam): if `policyDecision.requiresApproval === true` → return `{ kind: "paused", pendingDecisionId, runId }`. Phase 7 returns early with empty pendingDecisionId placeholder; Phase 8 populates via `runStore.updateStatus("paused", ...)`.
9. `buildToolRegistry` (Phase 2) — **MOVED: runs AFTER policy**, consumes `policyDecision.forcedToolChoice` + `allowedToolNames`
10. Telemetry setup: start time, reasoning trace controller+snapshot, trace mode label function, forced-tool telemetry context, skill telemetry context
11. Primary: `buildStepStream` execute → return stream Response
12. On error: `attemptFallbackExecution()` method (in same file)
13. Return Response (primary or fallback)

#### 7.1c: `attemptFallbackExecution(params)` method

**Location:** Private method in `orchestrate-sync-run.ts` (NOT a separate file per Q1=A decision).

**Responsibility:** Re-run steps 7-11 with fallback model + relaxed config.

Re-derives:
- Dynamic import of `@/lib/ai/streaming` → `getOpenRouterModel({ enableWebSearch: false })`
- Forced tool choice override (forced submit or undefined)
- Max steps override (conditional)
- Sync prepare step override (deterministic getCurrentPaperState sequence if needed)
- `buildExactSourceRouting()` re-derived for fallback
- Re-call `evaluateRuntimePolicy()` with adapted routing
- Reasoning provider options (transparency-aware)
- Re-call `buildStepStream()` with fallback config

**Input:** primary-path state (accepted, lane, paperContext, stepContext, stores)
**Output:** fallback Response OR re-throws if fallback itself fails

#### 7.1d: 17 inline blocks inventory (extraction targets)

These are the logic blocks enumerated by the pre-verify reviewer. All move into `orchestrate-sync-run.ts` as part of the 13-step sequence. None require their own extracted file — they are step components.

| Block | Current route.ts | New Home |
|---|---|---|
| 1. Paper mode prompt resolution | L108-115 | Step 4 |
| 2. Paper session fetch | L117-121 | Step 4 |
| 3. Stage scope + drafting detection | L122-131 | Step 4 |
| 4. Post-edit-resend reset detection | L127-131 | Step 4 |
| 5. Free-text context note construction | L149-186 | Step 4 |
| 6. `[PAPER][session-resolve]` log | L132 | Step 4 |
| 7. Paper tool tracker init | L134 | Step 4 |
| 8. Paper turn observability object | L135-147 | Step 4 |
| 9. Skill telemetry context | L209-219 | Step 10 |
| 10. Telemetry start time | L337 | Step 10 |
| 11. Reasoning trace controller+snapshot | L338-339 | Step 10 |
| 12. Trace mode label function | L340-344 | Step 10 |
| 13. Reasoning provider options (fallback) | L478-482 | Step 12 (fallback) |
| 14. Forced-tool telemetry context | L346-351 | Step 10 |
| 15. Billing context mutation timing | L202-205 | Step 4 (after paperSession fetch) |
| 16. `getCurrentPlanSnapshot` closure | L257-262 | Step 10 (threaded, not closure) |
| 17. `saveAssistantMessageLocal` wrapper | L265-287 | Step 10 (threaded, explicit params) |

#### 7.1e: paperSession threading (Q4 decision)

Per Q4=A, `paperSession` is an explicit parameter (not closure-captured) in:
- `saveAssistantMessageLocal` helper — takes `paperSession` param
- `getCurrentPlanSnapshot` — takes `paperSession` param (becomes a thin getter, not a closure)
- Fallback routing — receives `paperSession` from primary-path state
- Any other downstream consumer in executor `onFinishConfig`

This simplifies Phase 8 resume (paperSession snapshot becomes explicit state, not hidden closure state).

**Acceptance criteria for Task 7.1:**
- Two files created in `src/lib/chat-harness/runtime/`
- `runChatHarness` handles HTTP adapter role only (≤80 lines)
- `orchestrateSyncRun` implements 13-step sequence with `attemptFallbackExecution` method for step 12
- All 17 inline blocks moved into sync orchestrator
- `paperSession` threaded explicitly (no closure capture for plan snapshot / saveAssistantMessageLocal / fallback)
- Tool registry runs AFTER policy (step 9 after step 7-8 pause check)
- Step 8 (pause check) returns early if `requiresApproval === true` — Phase 8 extension seam
- `SyncRunResult` union supports `stream | paused | error`
- **Zero behavior change** — all baseline tests pass

**Test:** Full baseline + type check + production build + manual smoke (one chat request should produce identical stream output)

---

### Task 7.2: Thin `route.ts`

**Modify:** `src/app/api/chat/route.ts`

**Target shape (~50-70 lines total):**
```typescript
import { runChatHarness } from "@/lib/chat-harness/runtime"
import * as Sentry from "@sentry/nextjs"

export async function POST(req: Request): Promise<Response> {
  try {
    return await runChatHarness(req)
  } catch (error) {
    console.error("[HARNESS][fatal]", error)
    Sentry.captureException(error)
    return new Response("Internal server error", { status: 500 })
  }
}
```

**What moves behind `runChatHarness` (entire remaining 565 lines):**
- All entry phase (Phase 1 calls) — but those are already extracted; route.ts just stops invoking them directly
- All paper context resolution (L108-206, 99 lines) — extracted as step 4 of orchestrator
- All observability/telemetry plumbing (reasoning trace, telemetry start time, trace mode labels)
- `getCurrentPlanSnapshot` closure
- `saveAssistantMessageLocal` wrapper
- `evaluateRuntimePolicy` call
- `buildToolRegistry` call (reordered to after policy)
- `buildStepStream` primary call
- Entire fallback block (L440-634, 195 lines) — extracted as `attemptFallbackExecution` method
- `runStore`/`eventStore` construction (moved to `runChatHarness`)

**What remains in `route.ts`:**
- Imports (2-3 lines)
- `POST` handler declaration
- Outer try/catch fatal boundary
- `console.error` + `Sentry.captureException` + 500 response

**Acceptance criteria:**
- `route.ts` between 50-70 lines total
- Zero business logic in `route.ts` (verified via diff)
- No imports from `src/lib/chat-harness/{entry,executor,context,policy,verification,persistence}` — only from `src/lib/chat-harness/runtime`
- All 11 baseline tests pass
- All 5 Phase 6 tests pass (total 189/189)
- `npx tsc --noEmit` clean
- `npx next build` clean
- **Manual smoke required:** one chat request via UI must produce identical streaming output to pre-Phase-7

**Test:** Full baseline + type check + build + manual UI smoke

---

### Task 7.3: Post-phase review checkpoint

**Action:** Dispatch agent reviewer (Codex-delegated per CLAUDE.md ADR) to audit Phase 7 against:

1. **Adapter thinness:** `route.ts` ≤70 lines, zero business logic, imports only from `runtime/` namespace
2. **Orchestrator correctness:** all 13 steps present in `orchestrateSyncRun`; step order matches spec (policy BEFORE tool registry); pause check returns early correctly
3. **Fallback extraction:** `attemptFallbackExecution` method is cleanly separated, no duplicated logic with primary path beyond intentional re-evaluation
4. **paperSession threading:** no closure capture for `saveAssistantMessageLocal` / `getCurrentPlanSnapshot` / fallback routing — all explicit params
5. **Persistence wiring preserved:** `runStore` + `eventStore` constructed in `runChatHarness`, threaded through orchestrator to all downstream consumers
6. **Observability preserved:** all `[HARNESS][*]` logs + `[PAPER][*]` logs + telemetry events still fire in expected order for a typical chat request (verified via manual smoke or trace analysis)
7. **Zero behavior change:** stream output byte-identical (or semantically equivalent) to pre-Phase-7
8. **Phase 8 seam ready:** `SyncRunResult.kind === "paused"` path is present; Phase 8 can extend without restructuring orchestrator

**Output:** Review report → fix gaps → report to user → wait for validation before Phase 8.

**Output:** Review report → fix gaps → report to user → wait for validation.

---

## Phase 8: Prepare Durable Continuation Path

**Scope:** Add pause/resume semantics backed by persisted run status. Bridge toward true durable orchestration.

**Goal:** Support approval/user-decision resume off persisted pending state. DO NOT build: subagents, multi-lane durable worker farm, or paper workflow redesign.

**Runtime namespace:** `src/lib/chat-harness/runtime/` (extends Phase 7)

---

### Task 8.1: Add pause/resume semantics to run orchestrator

**Modify:** `src/lib/chat-harness/runtime/orchestrate-sync-run.ts`
**Modify:** `convex/harnessRuns.ts`

**What to add:**
- `pauseRun(runId, reason, pendingDecision)` — sets run status to `paused`, records pending decision
- `resumeRun(runId, decision)` — resumes from persisted pending state
- Orchestrator checks for `RuntimePolicyDecision.requiresApproval` and pauses if true

**Acceptance criteria:**
- Run can be paused when approval is required
- Run can be resumed with user decision
- Resume re-enters orchestration at the correct point
- No changes to `paperSessions` workflow

**Test:** `npx tsc --noEmit` + new pause/resume test

---

### Task 8.2: Connect approval UI to resume path

**Modify:** Relevant frontend/API to call `resumeRun` when user approves/rejects in validation panel

**Scope note:** This task's scope depends on the current approval UI implementation. It may be as simple as wiring `approveStage` → `resumeRun`, or it may require a new API endpoint.

**Acceptance criteria:**
- User approval in validation panel resumes the run
- User rejection triggers revision flow via run resume
- Existing approval UI behavior preserved

**Test:** `npx tsc --noEmit` + baseline + manual verification

---

### Task 8.3: Post-phase review checkpoint

**Action:** Dispatch agent reviewer to audit Phase 8 against:
- Pause/resume semantics correct
- No v1 subagents
- No multi-lane durable worker farm
- No paper workflow redesign
- `paperSessions` remains authoritative

**Output:** Review report → fix gaps → report to user → FINAL validation.

---

## Execution Protocol (applies to all phases)

Each task follows this loop:

1. **Execute** — write/modify code
2. **Test** — `npx tsc --noEmit` + relevant test files
3. **Commit** — scoped commit per task (e.g., `refactor(harness): extract acceptChatRequest from route.ts`)
4. **Review** — dispatch agent reviewer after final task of each phase
5. **Fix** — patch any gaps found by reviewer
6. **Report** — show user what changed, what was reviewed, what passed
7. **Validate** — wait for user approval before next phase

Build verification runs at phase completion (Task X.7), not per-task, to avoid unnecessary build overhead on intermediate steps.
