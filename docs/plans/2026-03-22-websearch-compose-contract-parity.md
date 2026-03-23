# Websearch Compose Contract Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 contract parity gaps between websearch compose and non-websearch paths — reasoning persistence, finish chunk forwarding, and compose failover.

**Architecture:** All changes stay local to `orchestrator.ts`, `route.ts`, and `types.ts`. No new shared modules or exported helper abstractions. The orchestrator gets reasoning accumulation for persistence, finish chunk forwarding, and a local one-time compose failover flow that handles thrown errors plus early `error` / `abort` chunks before first text output. The `route.ts` websearch `onFinish` callback consumes the new reasoning snapshot from the orchestrator result.

**Tech Stack:** AI SDK v6 (`streamText`, `createUIMessageStream`), `CuratedTraceController` from `curated-trace.ts`, Convex `messages.createMessage` validator.

**Reference:** `docs/ai-sdk-pattern-compose-corectness/final-verdict.md` (verified at commit 42a24752)

---

## Task 1: Extend WebSearchResult type for reasoning

**Files:**
- Modify: `src/lib/ai/web-search/types.ts`

**Step 1: Add reasoningSnapshot to WebSearchResult**

In `src/lib/ai/web-search/types.ts`, add the optional reasoning field to `WebSearchResult`:

```typescript
import type { PersistedCuratedTraceSnapshot } from "@/lib/ai/curated-trace"

// Add to WebSearchResult interface:
export interface WebSearchResult {
  text: string
  sources: NormalizedCitation[]
  usage?: { inputTokens: number; outputTokens: number }
  searchUsage?: { inputTokens: number; outputTokens: number }
  retrieverName: string
  retrieverIndex: number
  attemptedRetrievers: string[]
  capturedChoiceSpec?: import("@json-render/core").Spec
  /** Persisted reasoning trace snapshot from compose phase (transparent reasoning only). */
  reasoningSnapshot?: PersistedCuratedTraceSnapshot
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors (existing errors may appear — only check for new ones in `types.ts`)

**Step 3: Commit**

```bash
git add src/lib/ai/web-search/types.ts
git commit -m "feat(types): add reasoningSnapshot to WebSearchResult for persistence parity"
```

---

## Task 2: Add reasoning accumulator to orchestrator compose loop

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts`

**Context:** The non-websearch path in `route.ts` uses `createReasoningAccumulator()` to buffer reasoning deltas and `createCuratedTraceController()` + `getPersistedSnapshot()` to build a persistable snapshot. The orchestrator currently has its own inline reasoning handler that emits `data-reasoning-thought` events but never accumulates for persistence.

**Step 1: Import required reasoning utilities**

Add to the top of `orchestrator.ts`:

```typescript
import {
  createCuratedTraceController,
  type PersistedCuratedTraceSnapshot,
} from "@/lib/ai/curated-trace"
```

**Step 2: Create reasoning accumulator in the compose stream section**

Inside `executeWebSearch`, right before the `// Start compose stream` comment (before `streamText` call), add:

```typescript
      // ── Reasoning persistence: accumulate deltas for snapshot ──
      let reasoningBuffer = ""
```

**Step 3: Accumulate reasoning deltas alongside existing emission**

In the existing `reasoning-delta` handler (the block that checks `chunk.type === "reasoning-delta"`), after the existing `writer.write` of `data-reasoning-thought`, add accumulation:

Replace the existing reasoning-delta block:

```typescript
          if (chunk.type === "reasoning-delta") {
            reasoningChunkCount += 1
            lastChunkWasReasoning = true
            const sanitized = sanitizeReasoningDelta(chunk.delta ?? "")
            // Accumulate ALL deltas (not just sampled ones) for persistence
            reasoningBuffer += chunk.delta ?? ""
            if (sanitized.trim() && (reasoningChunkCount % 3 === 0 || sanitized.length > 100)) {
              writer.write({
                type: "data-reasoning-thought",
                id: `${reasoningTraceId}-thought-${reasoningChunkCount}`,
                data: {
                  traceId: reasoningTraceId,
                  delta: sanitized,
                  ts: Date.now(),
                },
              })
            }
          }
```

Note: `reasoningBuffer` accumulates the RAW delta (not sanitized) because `populateFromReasoning` does its own segmentation. The existing sampled emission to UI stays unchanged.

**Step 4: Build persisted snapshot in the finish handler**

Inside the existing `chunk.type === "finish"` handler, after the `onFinishStart` timing log and before `await config.onFinish(...)`, build the snapshot:

```typescript
            // ── Build reasoning snapshot for persistence ──
            let reasoningSnapshot: PersistedCuratedTraceSnapshot | undefined
            if (config.reasoningTraceEnabled && reasoningBuffer.length > 0) {
              const traceController = createCuratedTraceController({
                enabled: true,
                traceId: reasoningTraceId,
                mode: "websearch",
                stage: config.currentStage,
                webSearchEnabled: true,
              })
              // Populate step thoughts from accumulated reasoning
              traceController.populateFromReasoning(reasoningBuffer)
              traceController.finalize({
                outcome: "done",
                sourceCount,
              })
              reasoningSnapshot = traceController.getPersistedSnapshot()
            }
```

**Step 5: Pass reasoning snapshot to onFinish**

Modify the existing `config.onFinish(...)` call to include `reasoningSnapshot`:

```typescript
            await config.onFinish({
              text: textWithInlineCitations,
              sources: cleanSources.map((s) => ({ url: s.url, title: s.title, ...(typeof s.publishedAt === "number" ? { publishedAt: s.publishedAt } : {}), ...(s.citedText ? { citedText: s.citedText } : {}) })),
              usage: combinedInputTokens > 0 || combinedOutputTokens > 0
                ? { inputTokens: combinedInputTokens, outputTokens: combinedOutputTokens }
                : undefined,
              searchUsage,
              retrieverName: successRetrieverName,
              retrieverIndex: successRetrieverIndex,
              attemptedRetrievers,
              capturedChoiceSpec: capturedChoiceSpec && capturedChoiceSpec.root ? capturedChoiceSpec : undefined,
              reasoningSnapshot,
            })
```

**Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors

**Step 7: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts
git commit -m "feat(orchestrator): accumulate reasoning for persistence parity (A1)"
```

---

## Task 3: Consume reasoning snapshot in route.ts onFinish

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1: Update the executeWebSearch onFinish callback to use reasoningSnapshot**

Find the `onFinish` callback inside the `executeWebSearch(...)` call (the block that currently passes `undefined` for reasoningTrace). Change:

```typescript
                        // Before (broken):
                        await saveAssistantMessage(
                            result.text,
                            result.sources.length > 0 ? result.sources : undefined,
                            combinedModelName,
                            undefined, // reasoningTrace — not captured in web search compose
                            result.capturedChoiceSpec ?? undefined,
                        )
```

To:

```typescript
                        await saveAssistantMessage(
                            result.text,
                            result.sources.length > 0 ? result.sources : undefined,
                            combinedModelName,
                            result.reasoningSnapshot,
                            result.capturedChoiceSpec ?? undefined,
                        )
```

The `saveAssistantMessage` already accepts `PersistedCuratedTraceSnapshot | undefined` — no signature change needed.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(route): persist websearch reasoning snapshot instead of undefined (A1)"
```

---

## Task 4: Forward finish chunk in orchestrator (A2)

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts`

**Context:** Currently the finish handler ends with `continue` (line ~666), which skips `writer.write(chunk)`. The non-websearch path does `writer.write(chunk)` then `break`.

**Step 1: Replace `continue` with `writer.write(chunk)` + `break` after finalization**

Find the end of the `chunk.type === "finish"` handler block. The current code ends:

```typescript
          } catch (err) {
            // Citation finalize failed — ensure search status is terminal
            writer.write({
              type: "data-search",
              id: searchStatusId,
              data: { status: sourceCount > 0 ? "done" : "off" },
            })
            console.error("[Orchestrator] Citation finalize failed:", err)
          }

          continue
        }
```

Change to:

```typescript
          } catch (err) {
            // Citation finalize failed — ensure search status is terminal
            writer.write({
              type: "data-search",
              id: searchStatusId,
              data: { status: sourceCount > 0 ? "done" : "off" },
            })
            console.error("[Orchestrator] Citation finalize failed:", err)
          }

          // Forward finish chunk to preserve SDK semantics (finishReason, metadata)
          writer.write(chunk)
          break
        }
```

**Why `break` not `continue`:** After finish, the stream is done. `break` exits the for-await loop. `continue` would try reading the next chunk which is wasteful. This matches the non-websearch path pattern.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts
git commit -m "fix(orchestrator): forward finish chunk to preserve SDK semantics (A2)"
```

---

## Task 5: Add compose failover to orchestrator (A3)

**Files:**
- Modify: `src/lib/ai/web-search/types.ts`
- Modify: `src/lib/ai/web-search/orchestrator.ts`
- Modify: `src/app/api/chat/route.ts`

**Context:** The verified gap is not only synchronous `throw`. In this codebase, compose failure can surface in 2 ways after `executeWebSearch(...)` has already returned the `Response`:

- `streamText(...)` or `toUIMessageStream(...)` throws before stream consumption starts
- the compose stream emits `chunk.type === "error"` or `chunk.type === "abort"` before any meaningful `text-delta`

The outer fallback `catch` in `route.ts` cannot recover either case once the response is committed. The fix therefore has to live inside `orchestrator.ts`, and it must only retry **before first text output**. Do not claim this solves all mid-stream failures. This task closes the pre-text / early-stream gap only.

**Step 1: Add fallbackComposeModel to WebSearchOrchestratorConfig**

In `src/lib/ai/web-search/types.ts`:

```typescript
export interface WebSearchOrchestratorConfig {
  // ... existing fields ...
  composeModel: LanguageModel
  /** Fallback model for compose phase. Used only when primary compose fails before first text output. */
  fallbackComposeModel?: LanguageModel
  // ... rest unchanged ...
}
```

**Step 2: Prepare compose execution for one-time retry**

In `orchestrator.ts`, keep the existing in-place structure, but introduce minimal retry state near the compose setup:

- `let composeModel = config.composeModel`
- `let composeFailoverUsed = false`
- `let canFailover = !!config.fallbackComposeModel`

Create a local helper that starts a compose stream for any supplied model:

```typescript
      const startComposeStream = (model: LanguageModel) => streamText({
        model,
        messages: composeMessages,
        ...config.samplingOptions,
        ...(config.reasoningProviderOptions
          ? { providerOptions: config.reasoningProviderOptions as Parameters<typeof streamText>[0]["providerOptions"] }
          : {}),
      })
```

Then start the primary compose stream with:

```typescript
      const composeStartTime = Date.now()
      let composeResult = startComposeStream(composeModel)
```

**Step 3: Extract chunk processing into a local async function**

The existing compose loop already handles:

- choice spec capture
- reasoning emission / accumulation
- text accumulation
- finish finalization
- generic chunk forwarding

Move that existing loop body into a local async function such as `processComposeChunk(chunk)`.

This function should return one of:

- `"continue"` → keep consuming current stream
- `"break"` → current stream is terminal
- `"retry"` → stop consuming current stream and retry with fallback

Rules inside `processComposeChunk(chunk)`:

- Keep existing `finish` finalization logic intact
- Preserve the `A2` fix: after finish finalization, do `writer.write(chunk)` and return `"break"`
- Add explicit handling for `chunk.type === "error"` and `chunk.type === "abort"`
- If `textChunkCount > 0`, do **not** retry; forward the chunk as-is and return `"break"`
- If `textChunkCount === 0` and `canFailover` and fallback exists, do **not** forward the primary error/abort chunk; return `"retry"` instead

This is the key correction versus the previous version of the plan: failover must cover early `error` / `abort` chunks, not only thrown exceptions.

**Step 4: Consume the compose stream through a one-time retry wrapper**

Add a small local helper to consume any compose readable stream:

```typescript
      async function consumeComposeStream(stream: ReadableStream<unknown>) {
        for await (const chunk of iterateStream(stream)) {
          const action = await processComposeChunk(chunk)
          if (action === "continue") continue
          if (action === "break") break
          if (action === "retry") return "retry"
        }
        return "done"
      }
```

Create another local helper to switch to fallback exactly once:

```typescript
      async function tryFallbackCompose() {
        if (!canFailover || !config.fallbackComposeModel || textChunkCount > 0) {
          return false
        }

        canFailover = false
        composeFailoverUsed = true
        composeModel = config.fallbackComposeModel

        // Reset compose-local state only because no user-visible text has been emitted yet.
        composedText = ""
        reasoningBuffer = ""
        reasoningChunkCount = 0
        textChunkCount = 0
        firstTokenTime = 0
        lastTextChunkTime = 0
        lastChunkWasReasoning = false

        composeResult = startComposeStream(composeModel)
        return true
      }
```

Then run the compose stage with this shape:

```typescript
      const buildComposeReadable = (result: ReturnType<typeof streamText>) => {
        const uiStream = result.toUIMessageStream({
          sendStart: false,
          generateMessageId: () => messageId,
          sendReasoning: config.isTransparentReasoning,
        })
        return config.isDraftingStage ? pipeYamlRender(uiStream) : uiStream
      }

      try {
        let readable = buildComposeReadable(composeResult)
        let outcome = await consumeComposeStream(readable)

        if (outcome === "retry" && await tryFallbackCompose()) {
          readable = buildComposeReadable(composeResult)
          await consumeComposeStream(readable)
        }
      } catch (composeError) {
        if (await tryFallbackCompose()) {
          const readable = buildComposeReadable(composeResult)
          await consumeComposeStream(readable)
        } else {
          throw composeError
        }
      }
```

Important boundaries:

- Retry exactly once
- Do not reset search-phase state such as `scoredSources`, `searchUsage`, or resolved source maps
- Do not retry after first visible `text-delta`

**Step 5: Pass fallbackComposeModel from route.ts**

In `route.ts`, pass a non-websearch fallback compose model into `executeWebSearch(...)`.

Do **not** remove the existing outer fallback path. This task only adds an inner recovery path for websearch compose.

Add to the websearch orchestrator config:

```typescript
                return await executeWebSearch({
                    // ... existing config ...
                    composeModel: model,
                    fallbackComposeModel: fallbackComposeModel ?? undefined,
                    // ... rest unchanged ...
                })
```

Resolve it before the `if (enableWebSearch)` branch, but treat failure to resolve as non-fatal:

```typescript
            let fallbackComposeModel: Awaited<ReturnType<typeof getOpenRouterModel>> | undefined
            try {
                fallbackComposeModel = await getOpenRouterModel({ enableWebSearch: false })
            } catch {
                // Non-fatal: websearch compose still works, just without inner failover
            }
```

Keep the variable scoped tightly near the websearch branch so it is obvious that this model is only for compose failover.

**Step 6: Add telemetry for compose failover**

In the orchestrator, if fallback compose was used, log it once before `config.onFinish(...)`:

```typescript
            if (composeFailoverUsed) {
              console.warn("[Orchestrator] Compose used fallback model before first text output")
            }
```

Do not add scoring or policy logic here. Simple observability only.

**Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors

**Step 8: Manual behavior verification for A3**

Verify 3 cases explicitly:

1. Primary compose throws before stream consumption starts  
Expected: fallback compose is attempted once

2. Primary compose emits `error` or `abort` before first `text-delta`  
Expected: primary error/abort is suppressed and fallback compose is attempted once

3. Primary compose fails after first `text-delta`  
Expected: no retry; stream terminates with original chunk/error behavior

This task is only successful if case 2 is covered. That is the gap the previous version of the plan missed.

**Step 9: Commit**

```bash
git add src/lib/ai/web-search/types.ts src/lib/ai/web-search/orchestrator.ts src/app/api/chat/route.ts
git commit -m "feat(orchestrator): add compose failover for pre-stream failures (A3)"
```

---

## Task 6: Manual verification

**Step 1: Verify A1 — Reasoning persistence**

1. Start dev server: `npm run dev`
2. Open chat, enable a conversation with web search (ask a factual question)
3. Observe reasoning trace appears during streaming (live)
4. After response completes, hard refresh the page (Cmd+R)
5. Check the same message — reasoning trace should still be visible from history

Expected: Reasoning trace survives reload for websearch messages.

**Step 2: Verify A2 — Finish semantics**

1. In the same session, make another websearch request
2. After response completes, check browser DevTools Network tab → EventStream
3. Look for a `finish` event in the stream

Expected: Stream includes a `finish` chunk with `finishReason`.

**Step 3: Verify A3 — Compose failover**

Verify the 3 A3 cases explicitly:

1. Primary compose throws before stream consumption starts  
How to simulate:
- temporarily add `throw new Error("test")` immediately before primary compose stream creation, or
- temporarily force `buildComposeReadable(...)` to throw

Expected:
- fallback compose is attempted once
- response still completes via fallback model

2. Primary compose emits `error` or `abort` before first `text-delta`  
How to simulate:
- temporarily intercept the first compose stream chunk in orchestrator and replace it with an `error` or `abort` chunk before any text is forwarded, or
- temporarily mock the compose stream so it yields `error` first

Expected:
- primary `error` / `abort` chunk is suppressed
- fallback compose is attempted once
- response still completes via fallback model

3. Primary compose fails after first `text-delta`  
How to simulate:
- temporarily force an `error` chunk after one `text-delta`, or
- temporarily throw from the chunk-processing path after first visible text

Expected:
- no retry occurs
- stream terminates with the original failure behavior

Undo any temporary failure trigger after verification.

**Step 4: Verify no regression**

1. Test non-websearch chat (no reasoning trace should change behavior)
2. Test paper mode with choice cards (YAML spec still captured)
3. Test websearch with reasoning disabled (reasoningSnapshot should be undefined, not crash)

**Step 5: Commit any fixes from verification**

```bash
git add -A
git commit -m "fix: address issues found during manual verification"
```

---

## Summary

| Task | Issue | What Changes |
|------|-------|-------------|
| 1 | A1 prep | `WebSearchResult` gets `reasoningSnapshot` field |
| 2 | A1 core | Orchestrator accumulates reasoning + builds `PersistedCuratedTraceSnapshot` |
| 3 | A1 wire | `route.ts` passes snapshot to `saveAssistantMessage` instead of `undefined` |
| 4 | A2 | `continue` → `writer.write(chunk); break` in finish handler |
| 5 | A3 | Local one-time compose failover for thrown errors plus early `error` / `abort` chunks before first text |
| 6 | Verify | Manual end-to-end verification of all 3 fixes |
