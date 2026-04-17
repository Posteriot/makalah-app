# Agent Harness V1 — Observability Map (Post-Refactor)

**Status:** Active reference as of HEAD `d459c4a7` (cancel-decision audit complete, 2026-04-18)
**Purpose:** Consolidated map of every observability log after Phases 1-8. Since `route.ts` shrank from 4889 → 28 lines, all logs that USED to be inline are now scattered across harness namespaces. This doc answers: "log X sekarang ada di file mana?"

**Companion docs (still valid, pre-Phase-6 scope):**
- `docs/chat-naskah-pages-enforcement/all-sessions-are-paper-sessions/agent-harness/test-review-audit-checklist.md` — item-level checklist (H/I harness plan system)
- `screenshots/test-stages/review-audit-checklist.md` — per-stage review checklist

Use THIS doc for the "where does log X come from" question; use those for "what should I verify at stage N."

---

## Log Tier Taxonomy

Post-refactor, logs fire from 3 tiers. Knowing the tier tells you WHERE to look during UI testing:

| Tier | Where to read | When to check | Example tags |
|---|---|---|---|
| **Next.js Terminal** (server stdout) | Terminal running `npm run dev` | Every API request | `[USER-INPUT]`, `[PAPER][*]`, `[HARNESS][persistence]`, `[HARNESS][event]`, `[STEP-TIMING]`, `[F1-F6-TEST]`, `[AI-TELEMETRY]` |
| **Convex Dashboard Logs** | Convex dashboard → Logs tab | Mutation/query execution | `[PAPER][stage-transition]`, `[PAPER][edit-resend-reset]`, `[revision-auto-rescued-by-backend]` |
| **Browser Console** | Chrome DevTools → Console | Client-side state | `[UNIFIED-PROCESS-UI]`, `[PAPER][edit-resend-reset] Client:`, `[HARNESS][ui] resumed paused run`, `[F1-DEBUG]` |

---

## Quick Reference — "Log X sekarang ada di file Y"

### User-requested tracing

| Log Pattern | Where it USED to live | Where it is NOW | Tier |
|---|---|---|---|
| `[USER-INPUT] type=prompt text="..."` | `route.ts` (inline, pre-Phase-1) | `src/lib/chat-harness/entry/accept-chat-request.ts:94` | Terminal |
| `[USER-INPUT] type=choice-selection stage=... selected=...` | `route.ts` | `src/lib/chat-harness/entry/accept-chat-request.ts:92` | Terminal |
| `[F1-F6-TEST] SearchDecision { stage, search, reason }` | `route.ts` (search routing block) | `src/lib/chat-harness/context/resolve-search-decision.ts:528` | Terminal |
| `[F1-F6-TEST] SearchPolicy { stage, policy }` | `route.ts` | `src/lib/chat-harness/context/resolve-search-decision.ts:409` | Terminal |
| `[HARNESS-FLOW] ...` (search router flow) | `route.ts` | `src/lib/chat-harness/context/resolve-search-decision.ts` | Terminal |
| `[PAPER][session-resolve] stage=... status=...` | `route.ts` L132 inline | `src/lib/chat-harness/runtime/orchestrate-sync-run.ts` step 5 helper `resolvePaperContext` | Terminal |
| `[FREE-TEXT-CONTEXT] stage=... plan=...` | `route.ts` L185 | `src/lib/chat-harness/runtime/orchestrate-sync-run.ts` step 5 | Terminal |
| `[STEP-TIMING] step=N stage=... tools=[...] elapsed=Nms` | `route.ts` onFinish | `src/lib/chat-harness/executor/build-on-finish-handler.ts` | Terminal |
| `[CHOICE-CARD][yaml-capture]` | `route.ts` onFinish | `src/lib/chat-harness/executor/build-step-stream.ts` | Terminal |
| `[PAPER][outcome-gated]` / `[outcome-guard-stream]` | `route.ts` onFinish | `src/lib/chat-harness/executor/build-on-finish-handler.ts` + `build-step-stream.ts` | Terminal |
| `[PAPER][recovery-leakage-first-detected]` | `route.ts` onFinish | `src/lib/chat-harness/executor/build-step-stream.ts` | Terminal |
| `[AI-TELEMETRY] { model, tokens, duration }` | `route.ts` onFinish + fallback | `orchestrate-sync-run.ts` (fallback) + `build-on-finish-handler.ts` (primary) | Terminal |
| `[REVISION][chain-enforcer] step=N status=...` | `route.ts` policy block | `src/lib/chat-harness/policy/enforcers.ts` | Terminal |
| `[CHOICE][artifact-enforcer] step=N stage=...` | `route.ts` policy | `src/lib/chat-harness/policy/enforcers.ts` | Terminal |
| `[REACTIVE-ENFORCER] step=N stage=...` | `route.ts` policy | `src/lib/chat-harness/policy/enforcers.ts` | Terminal |
| `[PLAN-GATE] enforcer downgraded: ...` | `route.ts` policy | `src/lib/chat-harness/policy/enforcers.ts` | Terminal |
| `[PLAN-CAPTURE] parsed stage=X tasks=N` | `route.ts` stream handler | `src/lib/chat-harness/executor/build-step-stream.ts` | Terminal |
| `[EXACT-SOURCE-RESOLUTION] mode=...` | `route.ts` context | `src/lib/chat-harness/context/resolve-exact-source-followup.ts` | Terminal |

**Key insight:** Anything you used to grep in `route.ts` for debugging, grep in `src/lib/chat-harness/` instead. Route.ts has ZERO logs now except the fatal `console.error("Chat API Error:", error)` on L24.

---

## Full Log Map by Namespace

### Entry — `src/lib/chat-harness/entry/` (Phase 1)

| Log | File:Line | Fires When | Tier |
|---|---|---|---|
| `[USER-INPUT] type=prompt text="..."` | `accept-chat-request.ts:94` | Every chat POST with free-text message | Terminal |
| `[USER-INPUT] type=choice-selection stage=... selected=...` | `accept-chat-request.ts:92` | Every chat POST from choice card click | Terminal |
| `[HARNESS][entry] resume header detected runId=... workflowStage=...` | `accept-chat-request.ts:201` | When `x-harness-resume` header present (Phase 8 resume) | Terminal |
| `[Billing] Quota check failed: ...` | `accept-chat-request.ts` (billing block) | Quota exceeded → 429 response | Terminal |
| `[Billing] Usage recorded: ...` | `persist-user-message.ts` post-save | After successful message save | Terminal |
| `[stale-choice-rejected] stage=... → 409 Response` | `validate-choice-interaction.ts` | User clicks stale choice card (workflow advanced) | Terminal |
| `[CHOICE-CARD][event-received] type=paper.choice.submit stage=...` | `validate-choice-interaction.ts` | Choice event validated | Terminal |
| `[CHOICE-CARD][fallback-injected]` | `validate-choice-interaction.ts` | Fallback context injected when paper session mid-flight | Terminal |
| `[CHOICE][commit-point] stage=... action=...` | `validate-choice-interaction.ts` | Choice resolved to commit action | Terminal |
| `[CHOICE][exploration-loop]` | `validate-choice-interaction.ts` | Continue-discussion choice detected | Terminal |
| `[HARNESS][persistence] createRun runId=... ownerToken=...` | via `run-store.ts` (Phase 6) | After harnessRuns row created (step 2) | Terminal |
| `[HARNESS][event] run_started eventId=... correlationId=... runId=...` | via `event-store.ts` | After createRun succeeds | Terminal |
| `[HARNESS][event] user_message_received eventId=...` | via `event-store.ts` | After persistUserMessage succeeds (non-empty text only) | Terminal |
| `[HARNESS][event] user_decision_received eventId=...` | via `event-store.ts` | After choice event validates | Terminal |
| `[HARNESS][event] workflow_transition_requested/applied/rejected` | via `event-store.ts` | Per choice workflow outcome | Terminal |

### Runtime Orchestrator — `src/lib/chat-harness/runtime/` (Phase 7+8)

| Log | File:Line | Fires When | Tier |
|---|---|---|---|
| `[PAPER][session-resolve] stage=... status=... hasPrompt=...` | `orchestrate-sync-run.ts` step 5 (`resolvePaperContext`) | Every request after paperSession fetched | Terminal |
| `[FREE-TEXT-CONTEXT] stage=... plan=... hasArtifact=...` | `orchestrate-sync-run.ts` step 5 | Only when non-choice message in drafting stage | Terminal |
| `[HARNESS][persistence] resumeLane runId=... requestId=...` | `orchestrate-sync-run.ts` step 2 resume branch | Phase 8 resume path (header detected) | Terminal |
| `[HARNESS][event] run_resumed eventId=...` | step 2 resume branch | Phase 8 resume path | Terminal |
| `[HARNESS][event] run_paused eventId=...` | step 8.5 pause block | When `policyDecision.requiresApproval=true` (latent — no current trigger) | Terminal |
| `[HARNESS][persistence] pauseRun runId=... decisionId=... reason="..."` | step 8.5 (via `run-store`) | Same as above | Terminal |
| `[HARNESS][resume] conversationId mismatch: ...` | step 2 guard | Client pointed resume header at wrong conversation (throws) | Terminal |
| `[AI-TELEMETRY]` primary failure breadcrumb | fallback path | When primary streamText throws | Terminal (Sentry breadcrumb) |
| `Gateway stream failed, trying fallback:` | fallback path | streamText error caught | Terminal |
| `[CANCEL-DECISION] epoch stamped: N for stage=...` | `orchestrate-sync-run.ts:254` | `stampDecisionEpoch` called when `choiceInteractionEvent` present — epoch assigned for this request | Terminal |
| `[CANCEL-DECISION] stampDecisionEpoch failed: <error>` | `orchestrate-sync-run.ts:256` | Epoch stamp mutation threw (warn, request continues without epoch guard) | Terminal |

### Context Assembler — `src/lib/chat-harness/context/` (Phase 3)

| Log | File:Line | Fires When | Tier |
|---|---|---|---|
| `[FILE-CONTEXT] Waiting for extraction... (attempt N/16)` | `assemble-file-context.ts` | While file processing pending | Terminal |
| `[SOURCES] recentCount=N exactSourceCount=N hasRecentInDb=true` | `fetch-and-assemble-sources.ts` | Every request with sources | Terminal |
| `[EXACT-SOURCE-RESOLUTION] mode=force-inspect\|clarify\|none` | `resolve-exact-source-followup.ts` | Exact source classifier ran | Terminal |
| `[F1-F6-TEST] SearchPolicy { stage, policy }` | `resolve-search-decision.ts:409` | Every request (search policy decided) | Terminal |
| `[F1-F6-TEST] SearchDecision { stage, policy, search, reason }` | `resolve-search-decision.ts:528` | Search decision finalized | Terminal |
| `[HARNESS-FLOW]` (router/search path flow) | `resolve-search-decision.ts` + `execute-web-search-path.ts` | Search orchestration steps | Terminal |
| `[SEARCH-UNAVAILABLE] reasonCode=...` | `response-factories.ts` | Search required but unavailable | Terminal |
| `[CONTEXT-BUDGET] totalChars=N shouldCompact=true\|false` | `apply-context-budget.ts` | Every request (budget evaluated) | Terminal |
| `[CONTEXT-COMPACTION] priority=...` | `apply-context-budget.ts` | When compaction triggers | Terminal |
| `[Context Compaction] P3 LLM summarization failed: ...` | `apply-context-budget.ts` | P3 LLM path fails | Terminal |
| `[PAPER][post-choice-context] stage=...` | `resolve-exact-source-followup.ts` | Post-choice context enrichment | Terminal |
| `[PAPER][post-choice-search-context] / [-rag]` | `execute-web-search-path.ts` | Search context for post-choice path | Terminal |
| `[CHOICE-CARD][guaranteed][stream] stage=... source=deterministic-fallback` | `orchestrator.ts` (`maybeEmitGuaranteedChoiceSpec`) | Orchestrator finish handler emits fallback `SPEC_DATA_PART_TYPE` to live stream when compose model didn't produce a valid YAML choice card. Fires BEFORE `onFinish` callback. | Terminal |
| `[CHOICE-CARD][guaranteed][search] stage=... source=model-or-guaranteed\|none` | `execute-web-search-path.ts` (onFinish) | Search path persistence: logs whether the choice spec being persisted to DB came from model/orchestrator-guaranteed or was absent. | Terminal |

### Policy — `src/lib/chat-harness/policy/` (Phase 4+6)

| Log | File:Line | Fires When | Tier |
|---|---|---|---|
| `[REVISION][chain-enforcer] step=N status=revision → required` | `enforcers.ts` | Revision chain enforcer fires | Terminal |
| `[CHOICE][artifact-enforcer] step=N stage=... → updateStageData` | `enforcers.ts` | Choice artifact enforcer fires | Terminal |
| `[REACTIVE-ENFORCER] step=N stage=... → createArtifact` | `enforcers.ts` | Reactive enforcer gates tool choice | Terminal |
| `[PLAN-GATE] enforcer downgraded: plan has incomplete tasks` | `enforcers.ts` | Plan gate blocks premature artifact creation | Terminal |
| `[AUTO-RESCUE] source=createArtifact status=pending_validation → rescued` | `enforcers.ts` (auto-rescue policy) | Auto-rescue triggers | Terminal |
| `[HARNESS][persistence] recordPolicyState runId=... currentBoundary=...` | via `run-store.ts` | After policy decision | Terminal |
| `[HARNESS][event] execution_boundary_evaluated eventId=...` | via `event-store.ts` | Same as above | Terminal |

### Executor — `src/lib/chat-harness/executor/` (Phase 2+6)

| Log | File:Line | Fires When | Tier |
|---|---|---|---|
| `[CHAIN-COMPLETION] aborted: epoch drift (mine=N, current=N)` | `build-on-finish-handler.ts:172` | Epoch guard blocked chain-completion/rescue — user cancelled choice since this request started | Terminal |
| `[LAMPIRAN-RESCUE] aborted: epoch drift (mine=N, current=N)` | `build-on-finish-handler.ts:172` | Epoch guard blocked lampiran rescue | Terminal |
| `[JUDUL-RESCUE] aborted: epoch drift (mine=N, current=N)` | `build-on-finish-handler.ts:172` | Epoch guard blocked judul rescue | Terminal |
| `[<label>] epoch check failed, proceeding` | `build-on-finish-handler.ts:177` | Epoch check query failed (warn, proceeds cautiously) | Terminal |
| `[TOOL-CHAIN-ORDER] expected=[...] actual=[...]` | `build-on-finish-handler.ts` | Tool chain validation | Terminal |
| `[F1-F6-TEST] ToolChainOrder { correct: true/false, ... }` | `build-on-finish-handler.ts` | Tool chain audit | Terminal |
| `[F1-F6-TEST] updateStageData { dataKeys, ... }` | `build-tool-registry.ts` (tool tracker) | `updateStageData` tool invoked | Terminal |
| `[F1-F6-TEST] submitStageForValidation { status }` | `build-tool-registry.ts` | Submit tool invoked | Terminal |
| `[F1-F6-TEST] ChoiceCardSpec { hasSubmitButton, elements }` | `build-step-stream.ts` | Choice card YAML spec captured | Terminal |
| `[STEP-TIMING] step=N stage=... tools=[...] elapsed=Nms (final)` | `build-on-finish-handler.ts` | Every step completion | Terminal |
| `[CHOICE-CARD][yaml-capture] stage=... specKeys=...` | `build-step-stream.ts:447` | YAML spec parsed during stream | Terminal |
| `[PAPER][outcome-gated]<logTag> emitted data-cited-text override` | `build-on-finish-handler.ts` | Outcome guard replaced content | Terminal |
| `[PAPER][outcome-guard-stream]<logTag> stage=...` | `build-step-stream.ts:469` | Stream-finish outcome guard fired | Terminal |
| `[PAPER][recovery-leakage-first-detected]` | `build-step-stream.ts` | Leakage detected incrementally | Terminal |
| `[PAPER][artifact-tool-success]` | `build-tool-registry.ts` | Artifact tool succeeded | Terminal |
| `[PAPER][completed-guard]` | `build-tool-registry.ts` | Tool rejected due to completed stage | Terminal |
| `[FALLBACK] Attempting fallback with OpenRouter` | `orchestrate-sync-run.ts` (fallback path, technically) | Primary streamText failed | Terminal |
| `[EMPTY-RESPONSE][recovery]` | `build-on-finish-handler.ts` | Empty response recovery | Terminal |
| `[HARNESS][persistence] startStep runId=... stepIndex=N` | via `run-store.ts` | Before streamText | Terminal |
| `[HARNESS][persistence] completeStep stepId=... status=... blockers=N` | via `run-store.ts` | After streamText success (in onFinish) | Terminal |
| `[HARNESS][event] step_started/step_completed/agent_output_received` | via `event-store.ts` | Step lifecycle | Terminal |
| `[HARNESS][event] tool_called/tool_result_received` | via `event-store.ts` | Per tool call in onFinish aggregate | Terminal |
| `[HARNESS][event] run_failed eventId=...` | `build-step-stream.ts:631` | Stream error caught | Terminal |
| `[HARNESS][persistence] updateStatus runId=... status=failed` | via `run-store.ts` | Failure path | Terminal |
| `[CHAIN-COMPLETION]` | `build-on-finish-handler.ts` | Finalization tool chain complete | Terminal |
| `[PLAN-CAPTURE] parsed stage=X tasks=N` | `build-step-stream.ts` | Plan YAML fence parsed | Terminal |
| `[PLAN-CAPTURE] no plan-spec detected (stage=X)` | `build-step-stream.ts` | Plan spec absent | Terminal |
| `[PLAN-SNAPSHOT]` / `[PLAN-SNAPSHOT][search]` | `build-on-finish-handler.ts` | Plan snapshot recorded | Terminal |
| `[HASIL][ordering-bug]` | `build-on-finish-handler.ts` | Hasil stage ordering issue | Terminal |
| `[HASIL][partial-save-stall]` / `[false-validation-claim]` / `[prose-leakage]` | `build-on-finish-handler.ts` | Hasil-specific detections | Terminal |
| `[DAFTAR_PUSTAKA][artifact-without-submit]` / `[compiled-but-no-artifact]` / `[revision-create-instead-of-update]` | `build-on-finish-handler.ts` | Daftar pustaka specific detections | Terminal |
| `[JUDUL][server-fallback]` / `[LAMPIRAN][server-fallback]` | `build-on-finish-handler.ts` | Server fallback for these stages | Terminal |
| `[⏱ ONFINISH][reqId] step=<name> elapsed=<ms>ms` | `build-on-finish-handler.ts:183` (`measureStep` helper) | Per-step timing inside `onFinishHandler`. Wraps each major await: `revisionClassify`, `verifyStep`, `lampiranRescue`, `judulRescue`, `enrichSources`, `chainCompletion`, `saveAssistantMsg`, `updatePlan`, `recordUsage`, `logTelemetry`, `updateTitleScheduled`, `completeStep`, `aggregateEmits`. (E2E iteration 1) | Terminal |
| `[⏱ ONFINISH][reqId] total=<ms>ms breakdown=<name>=<ms>,...` | `build-on-finish-handler.ts:1005` | One-line summary at onFinish end. Grep `breakdown=` to quickly attribute tail latency to specific awaits. Follow-up for any step whose elapsed > ~500ms. (E2E iteration 1) | Terminal |
| `[⏱ TOOLS-STREAM][reqId]<logTag> streamText_started` / `firstTextDelta=...ms` / `gap=...ms after chunk#N reasoningBetween=<bool>` / `finish_received elapsedFromStart=...ms` / `finish_written t=...ms composeTotal=...ms` / `summary: total=... textChunks=... composedChars=... maxGap=... gapsOver200ms=... reasoningChunks=... reasoningInterruptions=...` | `build-step-stream.ts` (writer loop) | Tools-path parity with the web-search orchestrator's Phase 2 stream timing. `gap=` fires when inter-chunk delta > 200ms (heuristic for stream stutter). `logTag` is `[fallback]` on the fallback model's stream. Used together with `[⏱ TOOL-BOUNDARY]` to locate where the time went. (E2E iteration 1) | Terminal |
| `[⏱ TOOL-BOUNDARY][reqId]<logTag> step_start stepNumber=N activeTools=...` / `step_finish finishReason=... tools=[...] usage=in:N/out:N elapsedSinceStreamStart=...ms` / `tool_call_start toolName=... toolCallId=... stepNumber=N elapsedSinceStreamStart=...ms gapSinceLastToolFinish=...ms` / `tool_call_finish toolName=... toolCallId=... success=<bool> durationMs=... stepNumber=N elapsedSinceStreamStart=...ms` / `post_tool_text_resume gapMs=... chunk#N` | `build-step-stream.ts` (streamText callbacks: `experimental_onStepStart`, `onStepFinish`, `experimental_onToolCallStart`, `experimental_onToolCallFinish`) + writer-loop text-delta branch | Exact tool-chain boundaries sourced from AI SDK callbacks. `post_tool_text_resume` is the gap between the last tool finish and the next text-delta resuming — a legitimate reasoning pause if model needed to think post-tool. (E2E iteration 3) | Terminal |
| `[⏱ CHUNK-TAP][reqId]<logTag> layer=<afterToUIMessageStream\|afterPipePlanCapture\|afterPipeYamlRender> cause=<finish\|error\|abort\|stream_end> textChunks=N textChars=N totalChunks=N` | `build-step-stream.ts` (`makeChunkCountTap`) | Chunk counters at each pipeline layer, one summary line per layer at stream terminator. Primarily used to audit where text-deltas get split or coalesced (e.g. `afterPipeYamlRender` always shows per-char because the library splits internally). Compare across layers to spot missing pipes. (E2E iteration 5; `afterUITextCoalesce` layer tap was removed in iteration 9 rerun when pipeUITextCoalesce was reintroduced only in the compose path wiring, not behind a tap.) | Terminal |
| `[TOOLS-STREAM-ERROR][reqId]<logTag> stream emitted chunk.type=error { errorText, errorName, errorMessage, errorCause, errorStack, messageField, textChunkCount, composedChars, reasoningChunks, msSinceStreamStart, msSinceFirstTextDelta, msSinceLastTextChunk, lastChunkWasReasoning }` | `build-step-stream.ts` (writer loop error branch) | `console.error` — fires when the writer loop receives a `chunk.type=error` (regardless of whether `onStepFinish` already reported `finishReason=stop`; they can coexist). Full payload so the error's origin layer can be traced — see the "Gagal mengirim pesan" banner scenario in the iteration-5 commit history. (E2E iteration 5) | Terminal |
| `[⏱ STREAM-SMOOTHNESS][reqId] pass=<y\|n\|na> reason=<ok\|avg_too_small_batched_render\|avg_too_large_sentence_burst\|inter_chunk_gap_exceeded> avgCharsPerChunk=... maxInterChunkGapMs=... textChunks=... composedChars=...` | `build-step-stream.ts` (`emitStreamSmoothnessVerdict`) | Emitted once per turn at writer-loop `finish` / `error` / `abort`. `pass=y` when avgCharsPerChunk ∈ [3, 20] AND maxInterChunkGapMs ≤ 2000ms (thresholds: `STREAM_SMOOTHNESS_THRESHOLDS`). See "Streaming feels choppy or sentence-burst" scenario below. (E2E iteration 10) | Terminal |
| `[⏱ ARTIFACT-ORDERING][reqId] verdict=<ordered\|concurrent\|reversed\|no_artifact> artifactToolCount=N lastTextAtMs=N firstArtifactAtMs=N lastArtifactAtMs=N orderingGapMs=N` | `build-step-stream.ts` (`emitArtifactOrderingVerdict`) | Emitted once per turn at writer-loop `finish` / `error` / `abort`. Tracks tools in `ARTIFACT_SURFACE_TOOLS = {createArtifact, updateArtifact, submitStageForValidation}` where `success=true`. `ordered` = desired UX (artifact after last text). See "Artifact panel appears during text, not after" scenario below. (E2E iteration 10) | Terminal |

### Verification — `src/lib/chat-harness/verification/` (Phase 5+6)

| Log | File:Line | Fires When | Tier |
|---|---|---|---|
| `[VERIFICATION][blocker] <reason>` | `verify-step-outcome.ts` (called from executor) | Completion blockers detected | Terminal |
| `[VERIFICATION][must-pause] stage=... reason=...` | `verify-step-outcome.ts` | Ordering bug triggers pause | Terminal |
| `[HARNESS][event] verification_started target=combined` | via `event-store.ts` | onFinish verification entry (with `emitEvents: true`) | Terminal |
| `[HARNESS][event] verification_completed payload.outcome=pass\|fail_*` | via `event-store.ts` | onFinish verification return | Terminal |

### Persistence Adapters — `src/lib/chat-harness/persistence/` (Phase 6+8)

| Log | File:Line | Fires When | Tier |
|---|---|---|---|
| `[HARNESS][persistence] createRun runId=... ownerToken=...` | `run-store.ts:39` | createRun mutation succeeds | Terminal |
| `[HARNESS][persistence] linkPaperSession runId=... paperSessionId=...` | `run-store.ts` | Link mutation succeeds | Terminal |
| `[HARNESS][persistence] updateStatus runId=... status=...` | `run-store.ts` | Status update | Terminal |
| `[HARNESS][persistence] recordPolicyState runId=... currentBoundary=...` | `run-store.ts` | Policy state write | Terminal |
| `[HARNESS][persistence] startStep runId=... stepIndex=N` | `run-store.ts:97` | Atomic step start (Phase 6 audit fix) | Terminal |
| `[HARNESS][persistence] completeStep stepId=... status=... blockers=N` | `run-store.ts` | Step complete | Terminal |
| `[HARNESS][persistence] completeRun runId=...` | `run-store.ts` | Run complete | Terminal |
| `[HARNESS][persistence] pauseRun runId=... decisionId=... reason="..."` | `run-store.ts:156` | Phase 8 pause (infra; latent trigger) | Terminal |
| `[HARNESS][persistence] resumeRun runId=... decisionId=... resolution=resolved` | `run-store.ts:176` | Phase 8 resume | Terminal |
| `[HARNESS][event] <eventType> eventId=... correlationId=... runId=...` | `event-store.ts:67` | Every event emit success | Terminal |
| `[HARNESS][event] invalid eventType: <name>` | `event-store.ts:32` | Validation reject (before DB write) | Terminal (throws) |

### UI — `src/components/chat/ChatWindow.tsx` + hooks (Phase 8)

| Log | File:Line | Fires When | Tier |
|---|---|---|---|
| `[F1-DEBUG] handleApprove TRIGGERED — who called this?` | `ChatWindow.tsx:2180` | User clicks approve | Browser Console |
| `[F1-DEBUG] handleApprove context: { stageLabel, stageStatus, userId }` | `ChatWindow.tsx:2181` | Same | Browser Console |
| `[HARNESS][ui] resumed paused run runId=... on approve` | `ChatWindow.tsx:2194` | Phase 8: paused run resumed before approveStage | Browser Console |
| `[HARNESS][ui] resumed paused run runId=... on revise` | `ChatWindow.tsx:2222` | Phase 8: paused run resumed before requestRevision | Browser Console |
| `[CANCEL-DECISION] choice cancelled, card re-activated` | `ChatWindow.tsx:2457` | User clicks Batalkan on `[Choice:]` synthetic → cancel handler succeeded | Browser Console |
| `Failed to cancel choice: <error>` | `ChatWindow.tsx:2460` | `cancelChoiceDecision` or `editAndTruncate` threw | Browser Console |
| `[CANCEL-DECISION] approval cancelled, validation panel re-shown` | `ChatWindow.tsx:2489` | User clicks Batalkan on `[Approved:]` synthetic → cancel handler succeeded | Browser Console |
| `Failed to cancel approval: <error>` | `ChatWindow.tsx:2492` | `unapproveStage` or `editAndTruncate` threw | Browser Console |
| `[UNIFIED-PROCESS-UI] source=model-driven\|hardcoded-fallback progress=N/N` | `MessageBubble.tsx` | Every assistant message during active stage | Browser Console |
| `[PAPER][edit-resend-reset] Client: stage=... cleared=N fields` | `ChatWindow.tsx:2076` | After resetStageDataForEditResend mutation | Browser Console |
| `[ARTIFACT-REVEAL] onFinish — deferring panel open { ts, artifactId }` | `ChatWindow.tsx:952` | Artifact created during stream | Browser Console |
| `[ARTIFACT-REVEAL][fallback] Convex-reactive auto-open { ts, artifactId, turnStartedAt, createdAt, stageStatus }` | `ChatWindow.tsx` (fallback useEffect) | Auto-open path that fires when the happy-path `extractCreatedArtifacts` is empty (model `createArtifact` returned `success=false` and server CHAIN-COMPLETION persisted the artifact without emitting a tool-output). Gated on `stageStatus === "pending_validation"` or `optimisticPendingValidation` + newest artifact `_creationTime > lastTurnStartRef`. (E2E iteration 9) | Browser Console |

### Convex Dashboard Logs

| Log | File:Line | Fires When | Tier |
|---|---|---|---|
| `[PAPER][auto-create] conversationId=... stage=gagasan` | `convex/conversations.ts:278` | New conversation → auto paperSession created | Convex Logs |
| `[PAPER][session-resolve]` | Fires from Next.js server (not Convex) — see orchestrator | — | Terminal |
| `[PAPER][stage-transition] stageA → stageB (drafting/session completed)` | `convex/paperSessions.ts:1348` | approveStage mutation succeeds | Convex Logs |
| `[PAPER][updateStageData] stage=... keys=[...] warnings=N` | `convex/paperSessions.ts` | updateStageData mutation | Convex Logs |
| `[PAPER][edit-resend-reset] stage=... cleared=[fields]` | `convex/paperSessions.ts:750` | resetStageDataForEditResend mutation | Convex Logs |
| `[revision-auto-rescued-by-backend] stage=... trigger=auto-rescue revisionCount=N previousStatus=pending_validation source=updateStageData\|updateArtifact` | `convex/paperSessions.ts` | autoRescueRevision fires | Convex Logs |
| `[USER-ACTION] type=approve stage=... decision=...` | `convex/paperSessions.ts` | approveStage logs the user action | Convex Logs |
| `[USER-ACTION] type=revise stage=... trigger=panel\|model revision=N feedback="..."` | `convex/paperSessions.ts` | requestRevision | Convex Logs |
| `[PAPER][stamp-epoch] stage=... epoch=N` | `convex/paperSessions.ts:773` | `stampDecisionEpoch` mutation — increments counter at choice submission start | Convex Logs |
| `[PAPER][cancel-choice] stage=... artifactInvalidated=bool statusReverted=bool epoch=N` | `convex/paperSessions.ts:833` | `cancelChoiceDecision` mutation — reverts stageData, invalidates artifact, increments epoch | Convex Logs |
| `[PAPER][cancel-choice] artifact patch failed id=...` | `convex/paperSessions.ts:816` | `cancelChoiceDecision` — artifact invalidation failed (warn, non-fatal) | Convex Logs |
| `[PAPER][unapprove] stage=... clearedNextStage=bool` | `convex/paperSessions.ts:953` | `unapproveStage` mutation — reverts approval, restores pending_validation | Convex Logs |
| `[PAPER][unapprove] boundary stage mismatch: last="..." expected="...", skipping removal` | `convex/paperSessions.ts:912` | `unapproveStage` — stageMessageBoundaries last entry doesn't match target (warn, non-fatal) | Convex Logs |
| `[PAPER][unapprove] artifact title re-prefix failed` | `convex/paperSessions.ts:926` | `unapproveStage` — "Draf " prefix re-add failed (warn, non-fatal) | Convex Logs |
| Harness table mutation invocations (`harnessRuns.createRun`, `harnessEvents.emitEvent`, `harnessDecisions.createDecision`, etc.) | `convex/harness*.ts` | Every harness persistence call | Convex Logs |

---

## Common Debugging Scenarios

### "Stream output looks wrong"
1. **Terminal:** `[USER-INPUT]` — what did server receive?
2. **Terminal:** `[F1-F6-TEST] SearchDecision` — did search route correctly?
3. **Terminal:** `[PAPER][session-resolve]` — paper mode detected correctly?
4. **Terminal:** `[STEP-TIMING]` — how long did step take?
5. **Terminal:** `[PAPER][outcome-gated]` or `[outcome-guard-stream]` — did outcome guard replace content?
6. **Browser:** `[UNIFIED-PROCESS-UI]` — what task source?

### "Choice card not appearing"
1. **Terminal:** `[CHOICE-CARD][yaml-capture]` — was YAML spec captured from model stream?
2. **Terminal:** `[F1-F6-TEST] ChoiceCardSpec { hasSubmitButton }` — did spec have submit button?
3. **Terminal (search path):** `[CHOICE-CARD][guaranteed][stream]` — did orchestrator emit fallback to live stream?
4. **Terminal (search path):** `[CHOICE-CARD][guaranteed][search]` — what spec source was persisted to DB?
5. **Browser:** Check React component render — `message.parts` should contain `SPEC_DATA_PART_TYPE`

### "Approval panel not showing"
1. **Convex Logs:** `[F1-F6-TEST] submitStageForValidation { status }` — did submit succeed?
2. **Convex Logs:** `[PAPER][stage-transition]` — did stage advance?
3. **Browser:** Check `paperSession.stageStatus === "pending_validation"` via Convex dashboard row

### "Fallback not kicking in"
1. **Terminal:** `Gateway stream failed, trying fallback:` — primary error caught?
2. **Terminal:** `[AI-TELEMETRY] primary failure` — telemetry logged?
3. **Terminal:** Look for secondary `[STEP-TIMING]` from fallback model

### "Tool called but no artifact"
1. **Terminal:** `[F1-F6-TEST] ToolChainOrder { correct, expected, actual }` — order correct?
2. **Terminal:** `[PAPER][artifact-tool-success]` OR rescue logs
3. **Convex Logs:** `artifacts` table insert via mutation
4. **Terminal:** `[CHAIN-COMPLETION]` or `[HASIL][partial-save-stall]`

### "Edit/resend not clearing stageData"
1. **Terminal:** `[PAPER][session-resolve] ... postEditResendReset=true` — detected?
2. **Convex Logs:** `[PAPER][edit-resend-reset] stage=X cleared=[...]` — mutation ran?
3. **Browser:** `[PAPER][edit-resend-reset] Client: ...` — client confirmation?

### "Harness run not persisting" (Phase 6+)
1. **Terminal:** `[HARNESS][persistence] createRun` — should fire on every request
2. **Terminal:** `[HARNESS][event] run_started` — follows immediately
3. **Terminal:** `[HARNESS][persistence] startStep` — per step
4. **Terminal:** `[HARNESS][persistence] completeStep` — on finish
5. **Convex Dashboard:** query `harnessRuns` table, should see new row per request
6. **Convex Dashboard:** query `harnessEvents` table grouped by `correlationId` (requestId) — should see ≥10 events per request

### "Streaming feels choppy or sentence-burst" (E2E iteration 10)
1. **Terminal:** `grep "\[⏱ STREAM-SMOOTHNESS\].*pass=n" <log>` — any failing turns?
2. **Terminal:** Inspect `reason=` field on failing lines:
   - `avg_too_small_batched_render` — raw per-char chunks arriving; React batches them into bursts. Likely `pipeUITextCoalesce` was removed or its chunking preset regressed to something finer than `"word"`.
   - `avg_too_large_sentence_burst` — coalescer is holding text until sentence boundary. Check `pipeUITextCoalesce` wiring — chunking should be `"word"`, not `"sentence"`.
   - `inter_chunk_gap_exceeded` — model stalled >2s mid-stream. Cross-check with `[⏱ TOOL-BOUNDARY] post_tool_text_resume gapMs=...` to see if this is a legitimate reasoning pause post-tool vs a pipeline stall.
3. **Terminal:** `[⏱ CHUNK-TAP] layer=afterPipeYamlRender` — confirm pipeYamlRender is still emitting per-char (expected); if it has collapsed to sentence-level, something upstream is pre-coalescing.
4. **Terminal:** `[⏱ CHUNK-TAP] layer=afterUITextCoalesce` — confirm coalescer is still wired; if this layer is missing, pipeUITextCoalesce was accidentally removed.

### "Artifact panel appears during text, not after" (E2E iteration 10)
1. **Terminal:** `grep "\[⏱ ARTIFACT-ORDERING\].*verdict=reversed" <log>` — artifact fires before last text, pathological.
2. **Terminal:** `grep "\[⏱ ARTIFACT-ORDERING\].*verdict=concurrent" <log>` — tools interleaved with text; usually acceptable if model emits commentary after the tool, but worth inspecting.
3. **Terminal:** `[⏱ TOOL-BOUNDARY] tool_call_finish toolName=createArtifact` + subsequent `post_tool_text_resume gapMs=...` — did model emit text after the tool call? If yes and `orderingGapMs` is small/negative, model is streaming post-tool commentary; if no and verdict=reversed, the artifact event was the final thing emitted before finish and the text you saw earlier was everything.
4. **Browser:** `[ARTIFACT-REVEAL] onFinish — deferring panel open` (happy path) vs `[ARTIFACT-REVEAL][fallback] Convex-reactive auto-open` (CHAIN-COMPLETION path) — which path opened the panel?
5. **Convex Dashboard:** artifacts table createdAt — did the artifact row land during the turn or after?

### "Pause/resume flow" (Phase 8)
> Phase 8 infrastructure is LATENT — no enforcer currently sets `requiresApproval=true`. To manually test:
> 1. Temporarily add `requiresApproval = true` to `policy/evaluate-runtime-policy.ts` or an enforcer
> 2. Trigger a chat request — expect 202 Response + `run_paused` event
> 3. Check `harnessDecisions` table — should see new row with `status=pending`
> 4. UI: click approve → check `[HARNESS][ui] resumed paused run` in browser console
> 5. Check `harnessDecisions` row now `status=resolved` + `harnessRuns.status=running`
> 6. Next POST should include `x-harness-resume` header (Network tab)
> 7. Orchestrator terminal: `[HARNESS][persistence] resumeLane` + `run_resumed` event
> 8. REVERT the trigger

### "Cancel choice (Batalkan pilihan)" (cancel-decision Phase 1)
1. **Browser:** `[CANCEL-DECISION] choice cancelled, card re-activated` — handler completed?
2. **Convex Logs:** `[PAPER][cancel-choice] stage=... artifactInvalidated=... statusReverted=... epoch=N` — mutation fired? What was reverted?
3. **Convex Logs:** Check `paperSessions` row: `stageStatus` should be `"drafting"`, `stageData[currentStage]` should only have `revisionCount`
4. **Browser:** Choice card should re-render as interactive (check that `isChoiceSubmitted` is `false`)
5. **If card still stuck as submitted:** Check browser console for key mismatch — `submittedChoiceKeys` may have a stale key variant. Grep for `optimisticPendingKeys` in React DevTools state.

### "Cancel approval (Batalkan persetujuan)" (cancel-decision Phase 2)
1. **Browser:** `[CANCEL-DECISION] approval cancelled, validation panel re-shown` — handler completed?
2. **Convex Logs:** `[PAPER][unapprove] stage=... clearedNextStage=...` — mutation fired? Which stage was restored?
3. **Convex Logs:** Check `paperSessions` row: `currentStage` should revert to `targetStage`, `stageStatus` should be `"pending_validation"`
4. **Browser:** Validation panel should auto-reappear (driven by Convex reactivity on `stageStatus`)
5. **If Batalkan not visible (but expected):** Check `paperSession.stageStatus` — must be `"drafting"` or `completed+approved`. If `pending_validation`, the session already moved past the point where unapproval is allowed.
6. **If Batalkan visible but within 30s:** Throttle is working. Wait 30 seconds from message creation.

### "Chain-completion race after cancel" (cancel-decision epoch guard)
1. **Terminal:** `[CANCEL-DECISION] epoch stamped: N for stage=...` — epoch assigned on choice submission?
2. **Terminal:** `[CHAIN-COMPLETION] aborted: epoch drift` — epoch guard prevented stale chain-completion after cancel?
3. **If chain-completion ran anyway:** Check `[CANCEL-DECISION] epoch stamped` was present for the original request. If `stampDecisionEpoch failed`, the request had no epoch → guard skipped.
4. **Convex Logs:** Compare `decisionEpoch` on `paperSessions` row vs `myEpoch` in the terminal log.

---

## Log Tag Glossary (by Prefix)

| Prefix | Owner | Phase |
|---|---|---|
| `[USER-INPUT]` | entry | 1 |
| `[CHOICE-CARD]` / `[CHOICE]` | entry + executor + UI | 1+2 |
| `[PAPER][session-resolve]` | orchestrator step 5 | 7 |
| `[PAPER][outcome-*]` / `[recovery-*]` | executor | 2 |
| `[PAPER][post-choice-*]` | context | 3 |
| `[PAPER][stage-transition]` / `[edit-resend-reset]` / `[auto-create]` | Convex paperSessions | domain (pre-refactor) |
| `[PAPER][stamp-epoch]` / `[PAPER][cancel-choice]` / `[PAPER][unapprove]` | Convex paperSessions | cancel-decision |
| `[CANCEL-DECISION]` | orchestrator + ChatWindow | cancel-decision |
| `[F1-F6-TEST]` | shared across context + executor + UI | test fixtures |
| `[FREE-TEXT-CONTEXT]` | orchestrator step 5 | 7 |
| `[STEP-TIMING]` / `[TOOL-CHAIN-ORDER]` / `[CHAIN-COMPLETION]` | executor | 2 |
| `[⏱ ONFINISH]` | executor | 2 (added E2E iteration 1) |
| `[⏱ TOOLS-STREAM]` | executor | 2 (added E2E iteration 1) |
| `[⏱ TOOL-BOUNDARY]` | executor | 2 (added E2E iteration 3) |
| `[⏱ CHUNK-TAP]` | executor | 2 (added E2E iteration 5) |
| `[TOOLS-STREAM-ERROR]` | executor | 2 (added E2E iteration 5) |
| `[⏱ STREAM-SMOOTHNESS]` | executor | 2 (added E2E iteration 10) |
| `[⏱ ARTIFACT-ORDERING]` | executor | 2 (added E2E iteration 10) |
| `[ARTIFACT-REVEAL][fallback]` | ChatWindow (client) | UI (added E2E iteration 9) |
| `[PLAN-CAPTURE]` / `[PLAN-SNAPSHOT]` | executor | 2 |
| `[HARNESS-FLOW]` | context search decision | 3 |
| `[SEARCH-*]` / `[EXACT-SOURCE-*]` | context | 3 |
| `[CONTEXT-BUDGET]` / `[CONTEXT-COMPACTION]` | context | 3 |
| `[REVISION]` / `[CHOICE][artifact-enforcer]` / `[REACTIVE-ENFORCER]` / `[PLAN-GATE]` / `[AUTO-RESCUE]` | policy | 4 |
| `[VERIFICATION]` | verification | 5 |
| `[HARNESS][persistence]` / `[HARNESS][event]` | persistence adapters | 6 |
| `[HARNESS][entry]` | entry resume header | 8 |
| `[HARNESS][resume]` | orchestrator resume guard | 8 |
| `[HARNESS][ui]` | ChatWindow handlers | 8 |
| `[F1-DEBUG]` | ChatWindow (client) | debug (pre-refactor) |
| `[UNIFIED-PROCESS-UI]` | MessageBubble | UI (pre-refactor) |
| `[AI-TELEMETRY]` | executor + orchestrator fallback | 2+7 |
| `[Billing]` | entry | 1 |

---

## Test Harness Expectations

For UI smoke test across all 8 phases, expect these logs per typical chat request:

**Terminal (Next.js server):**
```
[USER-INPUT] type=prompt text="..."
[HARNESS][persistence] createRun runId=... ownerToken=...
[HARNESS][event] run_started ...
[HARNESS][event] user_message_received ...
[PAPER][session-resolve] stage=... status=... hasPrompt=...
[FREE-TEXT-CONTEXT] ... (only if free-text + drafting)
[SOURCES] recentCount=... exactSourceCount=...
[F1-F6-TEST] SearchPolicy { stage, policy }
[F1-F6-TEST] SearchDecision { stage, search, reason }
[CONTEXT-BUDGET] totalChars=... shouldCompact=...
[HARNESS][persistence] recordPolicyState runId=... currentBoundary=...
[HARNESS][event] execution_boundary_evaluated ...
[HARNESS][persistence] startStep runId=... stepIndex=N
[HARNESS][event] step_started ...
  <stream runs>
[CHOICE-CARD][yaml-capture] ... (if choice card)
[F1-F6-TEST] ChoiceCardSpec ...
[PLAN-CAPTURE] parsed stage=... tasks=N
[STEP-TIMING] step=N stage=... tools=[...] elapsed=Nms
[HARNESS][event] verification_started target=combined
[HARNESS][event] verification_completed payload.outcome=pass
[HARNESS][persistence] completeStep stepId=... status=completed
[HARNESS][event] step_completed
[HARNESS][event] agent_output_received
[HARNESS][event] tool_called (per tool)
[HARNESS][event] tool_result_received (per result)
[F1-F6-TEST] ToolChainOrder { correct: true, ... }
```

**Convex logs (per request):**
```
(mutations)
harnessRuns.createRun
harnessEvents.emitEvent x multiple
harnessRuns.startStepAtomic (Phase 6 atomic)
harnessRunSteps.completeStep
(if paper mode + user action)
paperSessions.updateStageData
paperSessions.approveStage → [PAPER][stage-transition] ...
```

**Browser Console (per interaction):**
```
[UNIFIED-PROCESS-UI] source=... progress=N/N
(on approve)
[F1-DEBUG] handleApprove TRIGGERED
[F1-DEBUG] handleApprove context:
(if paused run exists from Phase 8 latent trigger)
[HARNESS][ui] resumed paused run runId=... on approve
```

**Convex Dashboard snapshots (per request):**
- 1 `harnessRuns` row (status transitions running → completed)
- ≥1 `harnessRunSteps` row (one per executor step)
- ≥10 `harnessEvents` rows (typical chat; tool-heavy paper flow: 15-25)
- 0 `harnessDecisions` rows (unless Phase 8 pause triggered)

---

## Changelog

- **2026-04-16 (Phase 8 close):** Initial document. Covers Phases 1-8. Created in response to user request noting that log locations changed post-refactor and the existing `test-review-audit-checklist.md` docs don't reflect new file paths.
- **2026-04-17 (E2E iteration 10):** Added `[⏱ STREAM-SMOOTHNESS]` and `[⏱ ARTIFACT-ORDERING]` verdict lines emitted once per turn from `build-step-stream.ts`. Both carry `reqId` so they can be joined with the turn-scoped `[⏱ TOOLS-STREAM]` / `[⏱ TOOL-BOUNDARY]` logs. See new "Streaming feels choppy or sentence-burst" and "Artifact panel appears during text, not after" debugging scenarios for grep-based triage steps.
- **2026-04-17 (E2E iteration 10, map update follow-up):** Backfilled the six logs added during E2E iterations 1-9 that were previously deferred:
    - `[⏱ ONFINISH]` per-step + breakdown summary (iteration 1) — `build-on-finish-handler.ts`.
    - `[⏱ TOOLS-STREAM]` tools-path stream timing parity (iteration 1) — `build-step-stream.ts`.
    - `[⏱ TOOL-BOUNDARY]` exact AI-SDK-callback boundaries (iteration 3) — `build-step-stream.ts`.
    - `[⏱ CHUNK-TAP]` per-pipeline-layer chunk counters (iteration 5) — `build-step-stream.ts`.
    - `[TOOLS-STREAM-ERROR]` detailed error chunk payload (iteration 5) — `build-step-stream.ts` writer-loop error branch.
    - `[ARTIFACT-REVEAL][fallback]` Convex-reactive auto-open (iteration 9) — `ChatWindow.tsx`.

  Pre-refactor web-search logs (`[⏱ STUTTER]`, `[⏱ LATENCY]`, `[⏱ RETRIEVER]`, `[⏱ LIFECYCLE]`) live in `src/lib/ai/web-search/orchestrator.ts` and are still NOT mapped here — they predate the harness refactor and are left for a separate revision.
- **2026-04-18 (cancel-decision audit complete):** Added all logs from the cancel-decision feature (3 phases, 14 implementation commits + audit patches):
    - **Convex mutations:** `[PAPER][stamp-epoch]`, `[PAPER][cancel-choice]`, `[PAPER][unapprove]` (+ 3 warn-level logs for non-fatal failures) — `convex/paperSessions.ts`.
    - **Orchestrator:** `[CANCEL-DECISION] epoch stamped` / `stampDecisionEpoch failed` — `orchestrate-sync-run.ts`.
    - **Executor epoch guard:** `[CHAIN-COMPLETION] aborted: epoch drift` / `[LAMPIRAN-RESCUE] aborted: epoch drift` / `[JUDUL-RESCUE] aborted: epoch drift` — `build-on-finish-handler.ts`.
    - **Browser client:** `[CANCEL-DECISION] choice cancelled` / `approval cancelled` (+ error logs) — `ChatWindow.tsx`.
    - **Debugging scenarios:** "Cancel choice", "Cancel approval", "Chain-completion race after cancel".
- **2026-04-18 (search choice-card stream fix):** Added guaranteed fallback choice card logs for the search path:
    - **Orchestrator stream:** `[CHOICE-CARD][guaranteed][stream]` — `orchestrator.ts` (`maybeEmitGuaranteedChoiceSpec`). Fires when compose model didn't emit YAML spec and orchestrator injects fallback into live stream.
    - **Search persistence:** `[CHOICE-CARD][guaranteed][search]` — `execute-web-search-path.ts`. Logs spec source on DB persist.
    - **Debugging scenario:** Updated "Choice card not appearing" with steps 3-4 for search-path-specific triage.
