# stream-delivery-gap — Implementation Plan

> If implemented by an agent, use the `executing-plans` workflow and keep verification evidence for each task.

**Goal:** Remove the dominant portion of the 4.3-second gap between compose-end and stream-close without silently weakening message durability guarantees.

**Architecture:** Reorder the finish handler in `orchestrator.ts` so that `writer.write(finish)` fires immediately after citation/reasoning data events, then move only the non-essential persistence out of the `execute` promise's awaited critical path first. This is necessary because AI SDK `createUIMessageStream` closes the stream only after the `execute` promise settles; simply moving persistence after `writer.write(finish)` but still awaiting it inside `execute` does **not** eliminate the stream-close gap. In the safe baseline, `config.onFinish(...)` remains awaited, so the plan removes the dominant exact-source portion of the gap first, not the entire gap. Add lifecycle tracing for observability and a client-side watchdog as safety net.

**Durability boundary:** `saveAssistantMessage` is not equivalent to `persistExactSourceDocuments`. In this codebase, `saveAssistantMessage` writes the assistant message and also updates `conversation.lastMessageAt` / `updatedAt` via `api.messages.createMessage`. Detaching it from the critical path is an explicit product/durability tradeoff, not a default-safe optimization. The recommended default is:
- detach `persistExactSourceDocuments` first
- keep `saveAssistantMessage` awaited unless the team explicitly accepts the risk or adds a stronger recovery mechanism

**Tech Stack:** Next.js 16, AI SDK v6 (`ai` 6.0.106, `@ai-sdk/react` 3.0.108), Convex, React 19

**Source documents:**
- `docs/search-fetch-rag-jsonRenderer-reinforcement/stream-delivery-gap/verdict.md`
- `docs/search-fetch-rag-jsonRenderer-reinforcement/stream-delivery-gap/priority-map.md`

---

## Scope Boundary: Safe Refactor vs Product Tradeoff Refactor

### Safe refactor

These changes improve latency and stream lifecycle behavior without changing
the core durability contract that users perceive after refresh:

- move `persistExactSourceDocuments(...)` out of the finish-path blocking flow
- keep `RAG ingest` as background enrichment
- move `writer.write(finish)` as early as possible after required data events
- add lifecycle tracing around finish delivery and persistence
- fix misleading comments and architectural docs
- add a client-side watchdog for stuck progress-shell state

Why these are safe:

- they affect enrichment, observability, or presentation
- they do not change whether the assistant message exists after refresh
- they do not change conversation freshness ordering in the sidebar

### Product tradeoff refactor

These changes alter the durability semantics of the chat product and must not
be treated as default-safe:

- detach `saveAssistantMessage(...)` from the critical path
- detach `config.onFinish(...)` if it still performs message persistence
- switch assistant-message storage to eventual consistency without recovery
- delay `conversation.lastMessageAt` / `updatedAt` without compensation
- rely on watchdog UI to hide transport or persistence failure

Why these are tradeoffs:

- user can see a response that later disappears on refresh
- sidebar ordering can become stale or misleading
- failure recovery becomes a product decision, not just an implementation detail

### Practical rule

Use this rule during implementation review:

- if a failure still leaves refresh behavior and sidebar ordering correct, the change is usually a `safe refactor`
- if a failure can make a visible answer disappear or leave the conversation stale, the change is a `product tradeoff refactor`

---

## Task 1: Fix misleading comment (Quick Win)

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts:774-776`

**Step 1: Read the current comment**

Current code at line 774:
```typescript
// ── Exact document persist + RAG ingest: fire-and-forget, isolated ──
// Keep the existing RAG path intact and persist exact source documents
// alongside it so exact-inspection queries can read structured metadata.
```

**Step 2: Replace with accurate comment**

```typescript
// ── Exact document persist (awaited) + RAG ingest (fire-and-forget) ──
// persistExactSourceDocuments is awaited to ensure documents are stored
// before stream closes. RAG ingest runs in background (void async).
```

Note: this comment is only accurate for the pre-refactor state. Task 4
will replace it again after the finish-path restructure lands.

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (comment-only change)

**Step 4: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts
git commit -m "fix(orchestrator): correct misleading fire-and-forget comment at :774

persistExactSourceDocuments is actually awaited (blocking), not
fire-and-forget. Only RAG ingest is truly fire-and-forget.
Ref: stream-delivery-gap verdict"
```

---

## Task 2: Add stream lifecycle tracing (Quick Win)

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts:715-770` (inside finish handler)

**Step 1: Add lifecycle log points around the blocking operations**

Insert log lines to make the finish-path timing visible. Add BEFORE the
`await config.onFinish(...)` block (after the existing compose latency logs
at line 717):

```typescript
console.log(`[⏱ LIFECYCLE] finish-handler: citations+reasoning written, starting persistence`)
```

After `await config.onFinish(...)` at line 769 (after existing onFinish log):

```typescript
console.log(`[⏱ LIFECYCLE] finish-handler: onFinish done, starting exact-source persist`)
```

After `await persistExactSourceDocuments(...)` completes (after line 785):

```typescript
console.log(`[⏱ LIFECYCLE] finish-handler: exact-source persist done, writing finish event`)
```

After `writer.write(chunk)` at line 829:

```typescript
console.log(`[⏱ LIFECYCLE] finish-handler: finish event written, stream closing`)
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts
git commit -m "feat(orchestrator): add stream lifecycle tracing to finish handler

Logs before/after each blocking operation in the finish path so the
gap between compose-end and stream-close is visible in server logs.
Ref: stream-delivery-gap verdict CF-2"
```

---

## Task 3: Move finish event before persistence (Priority 1)

This is the core fix. Reorder the finish handler so `writer.write(chunk)`
happens BEFORE persistence, and ensure only the non-critical exact-source
persistence is **not awaited inside** the `execute` promise.

Expected outcome of this safe baseline:

- remove roughly the `persistExactSourceDocuments(...)` portion of the gap
- preserve synchronous assistant-message durability
- leave a smaller residual finish delay from `config.onFinish(...)`

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts:632-831` (finish handler in `processComposeChunk`)

**Step 1: Understand the current order inside `chunk.type === "finish"`**

Current order (lines 632-831):
1. `await proxyResolvePromise` (resolve remaining URLs)
2. Build sources, citations, userFacingPayload
3. Write `data-search`, `data-cited-text`, `data-internal-thought`, `data-cited-sources`
4. Compute usage, log YAML spec, log compose latency
5. Finalize reasoning trace, write `data-reasoning-duration`
6. `await config.onFinish(...)` — **1,060ms blocking**
7. `await persistExactSourceDocuments(...)` — **3,275ms blocking**
8. `void` RAG ingest (fire-and-forget)
9. `writer.write(chunk)` — finish event
10. `return "break"`

**Step 2: Restructure to new order**

New order:
1. `await proxyResolvePromise` (resolve remaining URLs) — unchanged
2. Build sources, citations, userFacingPayload — unchanged
3. Write `data-search`, `data-cited-text`, `data-internal-thought`, `data-cited-sources` — unchanged
4. Compute usage, log YAML spec, log compose latency — unchanged
5. Finalize reasoning trace, write `data-reasoning-duration` — unchanged
6. `await config.onFinish(...)` — still awaited in the safe baseline
7. **`writer.write(chunk)` — finish event MOVED HERE** (immediately after onFinish in the safe baseline)
8. **`return "break"` — MOVED HERE** (compose loop stops immediately)

Detached post-finish persistence (runs after `consumeComposeStream` returns
and is launched via `void`, so `execute` can settle and the stream can close):

9. `void postFinishPersistence()` — launched without awaiting
10. Inside that detached task: `await persistExactSourceDocuments(...)`
11. `void` RAG ingest (fire-and-forget) — unchanged

Important durability note:

- `config.onFinish(...)` should remain awaited in the default implementation.
- In this repo, `onFinish` calls `saveAssistantMessage(...)`, and `saveAssistantMessage(...)` persists the assistant message plus updates conversation freshness metadata.
- If `onFinish` is detached without a recovery mechanism, the user can see a response that later disappears on refresh, and the sidebar conversation ordering can stay stale.

**Step 3: Implement the restructure**

The key change is to extract only the exact-source / RAG work OUT of
`processComposeChunk` and run it AFTER `consumeComposeStream` returns,
**without awaiting it from** `execute`. Keep `config.onFinish(...)`
awaited in the default implementation.

Create a closure payload that captures only the data needed for detached
exact-source persistence after the compose loop exits.

In `processComposeChunk`, when `chunk.type === "finish"`:

```typescript
if (chunk.type === "finish") {
  try {
    // ── Steps 1-5: unchanged (proxy resolve, citations, data events, reasoning) ──
    // ... all existing code from line 634 to line 746 stays exactly the same ...

    if (composeFailoverUsed) {
      console.warn("[Orchestrator] Compose used fallback model before first text output")
    }

    const onFinishStart = Date.now()
    await config.onFinish({
      text: textWithInlineCitations,
      sources: cleanSources.map((s) => ({
        url: s.url,
        title: s.title,
        ...(typeof s.publishedAt === "number" ? { publishedAt: s.publishedAt } : {}),
        ...(s.citedText ? { citedText: s.citedText } : {}),
      })),
      usage: combinedInputTokens > 0 || combinedOutputTokens > 0
        ? { inputTokens: combinedInputTokens, outputTokens: combinedOutputTokens }
        : undefined,
      searchUsage,
      retrieverName: successRetrieverName,
      retrieverIndex: successRetrieverIndex,
      attemptedRetrievers,
      capturedChoiceSpec: capturedChoiceSpec && capturedChoiceSpec.root
        ? capturedChoiceSpec
        : undefined,
      reasoningSnapshot,
    })
    console.log(`[⏱ LATENCY] onFinish(DB writes)=${Date.now() - onFinishStart}ms`)

    // ── Capture only data needed for detached exact-source persistence ──
    postFinishWork = {
      cleanSources,
      fetchedContent,
    }
  } catch (err) {
    // Citation finalize failed — ensure search status is terminal
    writer.write({
      type: "data-search",
      id: searchStatusId,
      data: { status: sourceCount > 0 ? "done" : "off" },
    })
    console.error("[Orchestrator] Citation finalize failed:", err)
  }

  // Forward finish chunk IMMEDIATELY — no persistence blocking
  writer.write(chunk)
  console.log(`[⏱ LIFECYCLE] finish event written to stream`)
  return "break"
}
```

Declare `postFinishWork` before the compose loop (alongside `composedText`,
`reasoningBuffer`, etc.):

```typescript
let postFinishWork: {
  cleanSources: typeof scoredSources
  fetchedContent: typeof fetchedContent
} | null = null
```

After `consumeComposeStream` returns (around line 892, after the retry
logic), add detached post-finish persistence:

```typescript
// ── Post-finish persistence: detached so execute can settle and stream can close ──
if (postFinishWork) {
  const pf = postFinishWork
  void (async () => {
    try {
      console.log(`[⏱ LIFECYCLE] post-finish: starting detached exact-source persistence`)

      const convexOptions = config.convexToken ? { token: config.convexToken } : undefined
      await persistExactSourceDocuments({
        fetchedContent: pf.fetchedContent,
        conversationId: config.conversationId as Id<"conversations">,
        convexOptions,
      })

      const ragSourceCount = pf.fetchedContent.filter((f) => f.fullContent).length
      if (ragSourceCount > 0) {
        console.log(`[⏱ LATENCY] RAG ingest starting (fire-and-forget): ${ragSourceCount} sources`)
      }

      // ... existing RAG ingest loop unchanged ...
    } catch (err) {
      console.error("[Orchestrator] Detached post-finish persistence failed:", err)
    }
  })()
}
```

Important note:

- If `persistExactSourceDocuments(...)` stays awaited inside `execute`, the stream still will not close early.
- AI SDK `createUIMessageStream` waits for the `execute` result promise to settle before `controller.close()` (`ai/dist/index.js:8173-8199`).
- `useChat` transitions to `ready` only after the stream consumption completes, not when a `finish` chunk merely appears (`ai/src/ui/chat.ts:681-698`).

Durability note:

- Keeping `config.onFinish(...)` awaited preserves the current message persistence contract and matches the standard AI SDK message-persistence pattern.
- This plan intentionally prioritizes the lower-risk win first: remove exact-source persistence from the critical path while keeping assistant-message persistence synchronous.

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Manual test — verify stream closes faster**

Start dev server, trigger a web search query, observe logs:
- `[⏱ LIFECYCLE] finish event written to stream` should appear BEFORE
  `[⏱ LATENCY] Exact source persist ALL DONE ...`
- `useChat` status / progress UI should no longer wait for exact-source
  persistence, but may still wait for `onFinish`
- Response text and sources should still display correctly
- After page refresh, message should still be persisted in the normal case
- Simulate persistence failure manually and confirm the risk is visible in logs

**Step 6: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts
git commit -m "fix(orchestrator): move finish event before persistence in finish handler

Restructure the finish handler so writer.write(finish) fires immediately
after citation/reasoning data events. Persistence now runs in a detached
post-finish task instead of blocking the execute promise, removing the
dominant exact-source portion of the stream-close gap.

Root cause: architectural boundary violation — persistence was blocking
stream delivery. Ref: stream-delivery-gap verdict + priority-map P1"
```

---

## Task 4: Update comment to match new structure

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts` (comment near the new post-finish block)

**Step 1: Add architectural comment above the post-finish block**

```typescript
// ── Post-finish persistence ──────────────────────────────────────────
// finish event is already delivered to the client and execute is allowed
// to settle. Only exact-source persistence and RAG ingest run in this
// detached task, so stream close no longer waits on source-document writes.
//
// Assistant message persistence stays awaited in onFinish because it also
// updates conversation freshness metadata. Detaching that path would be an
// explicit durability tradeoff and is intentionally NOT part of this task.
// ─────────────────────────────────────────────────────────────────────
```

**Step 2: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts
git commit -m "docs(orchestrator): document detached exact-source persistence boundary"
```

---

## Task 4B: Optional follow-up — evaluate detaching `saveAssistantMessage` (Not default)

This is a deliberate product decision, not part of the safe baseline fix.

**Decision gate:**
- Only do this if the team explicitly accepts weaker durability semantics, or
  if a stronger recovery mechanism is added first.
- Reason: `saveAssistantMessage(...)` persists the assistant response and also
  updates `conversation.lastMessageAt` / `updatedAt`, which affects sidebar
  ordering and refresh consistency.

**Required before implementation:**
1. Define the failure contract: what should the product do if the user saw the
   answer but the message is missing after refresh?
2. Decide recovery strategy: retry queue, outbox table, resumable save, or
   background reconciliation job.
3. Add telemetry for detached-save failure count and stale conversation order.

**If this task is approved later, acceptance criteria must include:**
- explicit product sign-off on the durability tradeoff
- verified behavior for refresh-after-failure
- verified sidebar ordering behavior when delayed save succeeds/fails

---

## Task 5: Add client-side stale streaming watchdog

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx:1525-1603` (status transition useEffect)

**Step 1: Add a stale-streaming timeout ref**

Near the existing refs (around line 505-507):

```typescript
const staleStreamingTimeoutRef = useRef<number | null>(null)
```

Add cleanup to the existing `clearProcessTimers` callback:

```typescript
const clearProcessTimers = useCallback(() => {
  if (processIntervalRef.current !== null) {
    clearInterval(processIntervalRef.current)
    processIntervalRef.current = null
  }
  if (processHideTimeoutRef.current !== null) {
    clearTimeout(processHideTimeoutRef.current)
    processHideTimeoutRef.current = null
  }
  if (staleStreamingTimeoutRef.current !== null) {
    clearTimeout(staleStreamingTimeoutRef.current)
    staleStreamingTimeoutRef.current = null
  }
}, [])
```

**Step 2: Add watchdog timer in the streaming branch**

In the `status === "streaming"` branch (line 1539-1560), after the existing
interval setup, add:

```typescript
// Stale streaming watchdog: if the UI shell stays in "streaming" for too
// long without transitioning, recover the local process UI to avoid a
// permanently stuck progress bar. This does NOT repair the underlying
// transport; it is only a safety net for the presentation layer.
const STALE_STREAMING_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
if (staleStreamingTimeoutRef.current !== null) {
  clearTimeout(staleStreamingTimeoutRef.current)
}
staleStreamingTimeoutRef.current = window.setTimeout(() => {
  setProcessUi((prev) => {
    if (prev.status !== "streaming") return prev
    console.warn("[WATCHDOG] Stale streaming UI detected — forcing local ready state after 5 minutes")
    return {
      ...prev,
      visible: true,
      status: "ready",
      progress: 100,
    }
  })
  staleStreamingTimeoutRef.current = null
}, STALE_STREAMING_TIMEOUT_MS)
```

**Step 3: Clear watchdog on successful transition**

In the `status === "ready" && hadGeneratingStatus` branch (line 1561),
`clearProcessTimers()` at line 1562 already clears all timers including
the new watchdog ref — no additional code needed.

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat(chat): add stale streaming watchdog as safety net

If the local process UI stays in 'streaming' for more than 5 minutes
without transitioning, force the process shell to 'ready' state. This
does not repair the transport itself; it only prevents a permanently
stuck progress bar in edge cases (network drop, browser sleep).
Ref: stream-delivery-gap verdict CF-1"
```

---

## Task 6: End-to-end verification

**Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 2: Manual test — web search flow**

1. Start dev server: `npm run dev`
2. Open chat, create a paper session, trigger a web search query
3. Observe in terminal:
   - `[⏱ LIFECYCLE] finish event written to stream` appears BEFORE
     `[⏱ LATENCY] Exact source persist ALL DONE ...`
   - Stream close / `ready` transition no longer waits for exact-source persistence
4. Observe in browser:
   - Response text displays correctly with citations
   - Choice card (yaml-spec) renders if present
   - Progress bar transitions to "ready" state (not stuck at 92%)
5. Refresh page:
   - Message is normally persisted (appears in history)
   - Sources are persisted
   - Reasoning trace is available
   - Conversation ordering in sidebar stays correct

**Step 3: Manual test — non-search flow**

1. Send a message that doesn't trigger search
2. Verify response works normally (no regression)
3. Progress bar transitions normally

**Step 4: Commit verification results**

```bash
git add -A
git commit -m "test(stream-delivery-gap): verify end-to-end after finish-path restructure"
```

---

## Safety verdict before execution

This plan is safe to execute **only if Task 3 keeps `config.onFinish(...)`
awaited** and detaches only `persistExactSourceDocuments(...)` plus downstream
RAG work.

This means the safe baseline should reduce the gap materially, but not drive
it all the way to zero. The remaining gap is the awaited `onFinish(...)`
segment and is intentionally preserved unless Task 4B gets explicit approval.

It is **not** safe to treat detaching `saveAssistantMessage(...)` as part of
the default fix, because that changes durability semantics:
- response can be visible to the user but missing after refresh
- `conversation.lastMessageAt` can stay stale
- sidebar ordering can drift from the latest visible interaction

Recommended execution order:
1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 4B only with explicit product sign-off
