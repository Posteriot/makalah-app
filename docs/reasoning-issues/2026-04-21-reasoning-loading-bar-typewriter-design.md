# Design: Reasoning Loading Bar — Typewriter + Flicker Fix

## Objective

Two fixes to the reasoning loading bar above chat input:

1. **Typewriter effect** — reasoning text streams word-by-word instead of full string swap
2. **Flicker fix** — teal bar disappears briefly at ~90% progress then reappears

## Scope

- Client-side only. No server changes.
- Keep existing completed mode (duration + expandable headline + Detail button).
- Add smooth transition from processing → completed mode.

## Current Architecture

```
Server: reasoningAccumulator.onReasoningDelta(delta)
  → accumulates rawReasoning, sanitizes to snapshot
  → throttled (160ms / 48 chars): emits ReasoningLiveDataPart
    { type: "data-reasoning-live", data: { text: CUMULATIVE_SNAPSHOT } }

Client: useChat() → UIMessage.parts[] includes data-reasoning-live parts

ChatWindow.tsx:
  → activeReasoningState useMemo scans parts for data-reasoning-live
  → returns last non-reset cumulative snapshot as headline
  → passes reasoningHeadline to ChatProcessStatusBar

ChatProcessStatusBar.tsx:
  → narrativeHeadline useMemo: reasoningHeadline takes priority
  → renders: <span className="truncate">{narrativeHeadline}</span>
  → FULL STRING SWAP per render — no animation
```

## Files

| File | Role |
|---|---|
| `src/components/chat/ChatProcessStatusBar.tsx` | Loading bar component — render, visibility, progress |
| `src/components/chat/ChatWindow.tsx` | State management — activeReasoningState, processUi, effects |
| `src/lib/ai/reasoning-live-stream.ts` | Server-side accumulator, throttle, SSE emission |
| `src/app/globals-new.css` | CSS animations |

---

## Fix 1: Flicker — Prevent Bar Unmount During Streaming

### Problem

Three bugs interact to cause unmount/remount at ~90%:

1. **shouldShow unmounts bar** when `narrativeHeadline` is transiently null (`ChatProcessStatusBar.tsx:98`)
2. **activeReasoningState returns empty** during reasoning→text transition gap (`ChatWindow.tsx:2008-2032`)
3. **persistedDurationSeconds effect fires prematurely** — `data-reasoning-duration` SSE arrives BEFORE finish chunk, sets `visible: false` while stream is still active (`ChatWindow.tsx:2098-2123`)

Timeline:
```
~90% → reasoning ends → data-reasoning-duration arrives (before finish)
  → Bug 3: visible=false, status="ready", timers cleared
  → Bug 2: headline=null, steps=[]
  → Bug 1: shouldShow=false → bar unmounts → 1-3 renders later remounts → flicker
```

### Solution

Two changes that cut the cascade at the root. Bug 2 becomes irrelevant because the bar stays mounted.

**Change 1** — Add `isProcessing` to `shouldShow` in `ChatProcessStatusBar.tsx:98`:

```tsx
// Before
const shouldShow = Boolean(narrativeHeadline) || (visible && reasoningSteps.length > 0) || isPanelOpenValue

// After
const shouldShow = isProcessing || Boolean(narrativeHeadline) || (visible && reasoningSteps.length > 0) || isPanelOpenValue
```

Bar stays mounted for the entire duration of `status === "submitted" || status === "streaming"`.

**Change 2** — Guard `persistedDurationSeconds` effect in `ChatWindow.tsx:2098-2123`:

```tsx
useEffect(() => {
  // Guard: do NOT fire while still streaming
  if (status === "submitted" || status === "streaming") return

  const persistedDurationSeconds = activeReasoningState.persistedDurationSeconds
  // ... rest unchanged
}, [activeReasoningState.persistedDurationSeconds, clearProcessTimers, status])
```

---

## Fix 2: Typewriter Word-by-Word Effect

### Problem

Cumulative snapshots arrive every ~160ms. Each update replaces the entire `<span>` content. Text "jumps" instead of flowing.

### Solution

New hook `useTypewriterText` that diffs cumulative snapshots and releases words one-by-one.

**Signature:**

```ts
function useTypewriterText(
  cumulativeText: string | null | undefined,
  isActive: boolean
): string
```

- `isActive = true` (processing): animate word-by-word
- `isActive = false` (completed): return full text immediately, no animation

**Algorithm:**

1. When new cumulative snapshot arrives, diff against previous snapshot to extract new words
2. Buffer new words in a queue
3. `setInterval` at ~80ms dequeues 1 word, appends to displayed text
4. If queue empties, interval idles (natural "thinking pause")
5. Cleanup interval on unmount or when `isActive` becomes false

**Integration in ChatProcessStatusBar:**

```tsx
const displayText = useTypewriterText(narrativeHeadline, isProcessing)
// render: <span className="truncate">{displayText}</span>
```

**Overflow handling:** Keep existing CSS `truncate`. No sliding window, no custom DOM management. Text overflows left naturally as new words append.

**No server changes.** Cumulative snapshot data is sufficient; diffing and buffering happen entirely in the hook.

---

## Fix 3: Processing → Completed Transition

### Problem

Instant swap from processing mode to completed mode is jarring, especially combined with smooth typewriter.

### Solution

CSS crossfade transition using opacity.

1. When `isProcessing` flips from `true` to `false`:
   - Typewriter text freezes at last position (hook returns full text when `isActive = false`)
   - Processing content fades out (opacity 1→0, ~300ms)
   - Completed content fades in (opacity 0→1, ~300ms)
2. Existing completed mode behavior preserved entirely (duration, expandable headline, Detail button)

**Implementation:** Conditional CSS class on the wrapper div, driven by `isProcessing` state. Pure CSS `transition: opacity 300ms ease`.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Flicker fix strategy | Guard shouldShow + guard effect (2 changes) | Cuts cascade at root; Bug 2 becomes irrelevant |
| Typewriter timing | setInterval ~80ms | Simple, sufficient for text. rAF overkill. |
| Overflow handling | Keep CSS truncate | Simpler than sliding window, visually identical |
| Completed state | Keep existing, add CSS crossfade | User approved keeping expandable headline + Detail |
| Transition duration | ~300ms opacity crossfade | Fast enough to not feel sluggish, slow enough to be smooth |
| Server changes | None | All client-side |

## Files to Modify

| File | Changes |
|---|---|
| `src/components/chat/ChatProcessStatusBar.tsx` | Add `isProcessing` to `shouldShow`; integrate `useTypewriterText`; add transition classes |
| `src/components/chat/ChatWindow.tsx` | Guard `persistedDurationSeconds` effect with streaming status check |
| `src/components/chat/useTypewriterText.ts` (new) | Hook: cumulative snapshot → word diff → buffered release → display string |
| `src/app/globals-new.css` | Add crossfade transition classes for processing→completed |
