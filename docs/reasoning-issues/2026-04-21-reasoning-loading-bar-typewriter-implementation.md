# Reasoning Loading Bar — Typewriter + Flicker Fix: Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the reasoning text in the loading bar above chat input stream word-by-word (typewriter effect) instead of full-string swapping, and fix the teal bar flicker at ~90% progress.

**Architecture:** Three independent client-side changes: (1) two guard conditions that prevent the bar from unmounting during streaming, (2) a new `useTypewriterText` hook that diffs cumulative snapshots and releases words via setInterval, (3) CSS crossfade transition from processing to completed mode. No server changes.

**Tech Stack:** React hooks, vitest + @testing-library/react, CSS transitions

**Design doc:** `docs/reasoning-issues/2026-04-21-reasoning-loading-bar-typewriter-design.md`

---

## Task 1: Flicker Fix — Guard `shouldShow` in ChatProcessStatusBar

**Files:**
- Modify: `src/components/chat/ChatProcessStatusBar.tsx:98`
- Test: `src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx`

**Step 1: Write the failing test**

Add a new test case that verifies the bar stays mounted when `isProcessing` is true but headline is transiently null. Add this test to the existing describe block in `ChatProcessStatusBar.transparent-mode.test.tsx`:

```tsx
it("stays mounted during streaming even when headline is transiently null", () => {
  const { container } = render(
    <ChatProcessStatusBar
      visible={false}
      status="streaming"
      progress={88}
      elapsedSeconds={9.2}
      reasoningHeadline={null}
      reasoningSteps={[]}
    />
  )

  // Bar should still be in the DOM because status is "streaming"
  expect(container.querySelector("[role='status']")).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx --reporter=verbose`

Expected: FAIL — currently `shouldShow` evaluates to `false` when headline is null, visible is false, steps is empty, and panel is closed. The component returns `null`.

**Step 3: Add `isProcessing` to `shouldShow` guard**

In `src/components/chat/ChatProcessStatusBar.tsx`, line 98, change:

```tsx
// Before (line 98)
const shouldShow = Boolean(narrativeHeadline) || (visible && reasoningSteps.length > 0) || isPanelOpenValue

// After
const shouldShow = isProcessing || Boolean(narrativeHeadline) || (visible && reasoningSteps.length > 0) || isPanelOpenValue
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx --reporter=verbose`

Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/chat/ChatProcessStatusBar.tsx src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx
git commit -m "fix: keep status bar mounted during streaming to prevent flicker"
```

---

## Task 2: Flicker Fix — Guard `persistedDurationSeconds` Effect

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx:2098-2123`
- Test: `src/components/chat/ChatWindow.reasoning-duration.test.tsx`

**Step 1: Write the failing test**

The current `persistedDurationSeconds` effect fires even during streaming. We can't easily test the effect directly (it's inside a large component), but we can add a unit test for the guard logic. Add to `ChatWindow.reasoning-duration.test.tsx`:

```tsx
describe("persistedDurationSeconds effect guard", () => {
  it("should not apply persisted duration while still streaming", () => {
    // This documents the invariant: persisted duration must not
    // override live state while AI SDK status is "streaming".
    // The actual guard is in the useEffect at ChatWindow.tsx:2098.
    // Here we verify the resolve function still works correctly
    // so the guard is the only change needed.
    const live = 8.5
    const persisted = 12.3
    expect(resolveProcessElapsedSeconds(live, persisted)).toBe(persisted)
    expect(resolveProcessElapsedSeconds(live, undefined)).toBe(live)
  })
})
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run src/components/chat/ChatWindow.reasoning-duration.test.tsx --reporter=verbose`

Expected: PASS (this test documents the existing behavior of the resolve function — the guard is in the effect itself)

**Step 3: Add streaming guard to the effect**

In `src/components/chat/ChatWindow.tsx`, modify the effect at line 2098-2123:

```tsx
// Before (line 2098-2123)
useEffect(() => {
  const persistedDurationSeconds = activeReasoningState.persistedDurationSeconds
  if (typeof persistedDurationSeconds !== "number" || !Number.isFinite(persistedDurationSeconds)) return

  clearProcessTimers()
  // ...rest
}, [activeReasoningState.persistedDurationSeconds, clearProcessTimers])

// After
useEffect(() => {
  // Guard: do NOT fire while AI SDK is still streaming —
  // data-reasoning-duration SSE arrives BEFORE the finish chunk,
  // and premature firing causes the bar to unmount briefly (flicker).
  if (status === "submitted" || status === "streaming") return

  const persistedDurationSeconds = activeReasoningState.persistedDurationSeconds
  if (typeof persistedDurationSeconds !== "number" || !Number.isFinite(persistedDurationSeconds)) return

  clearProcessTimers()
  processStartedAtRef.current = null

  setProcessUi((prev) => {
    const elapsedSeconds = resolveProcessElapsedSeconds(prev.elapsedSeconds, persistedDurationSeconds)
    if (
      prev.elapsedSeconds === elapsedSeconds &&
      prev.progress === 100 &&
      (prev.status === "ready" || prev.status === "stopped")
    ) {
      return prev
    }

    return {
      ...prev,
      visible: false,
      status: prev.status === "stopped" ? "stopped" : "ready",
      progress: 100,
      elapsedSeconds,
    }
  })
}, [activeReasoningState.persistedDurationSeconds, clearProcessTimers, status])
```

Note: `status` is added to the dependency array.

**Step 4: Run both flicker-related tests**

Run: `npx vitest run src/components/chat/ChatWindow.reasoning-duration.test.tsx src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx --reporter=verbose`

Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/chat/ChatWindow.tsx src/components/chat/ChatWindow.reasoning-duration.test.tsx
git commit -m "fix: guard persistedDurationSeconds effect against premature firing during streaming"
```

---

## Task 3: Typewriter Hook — `useTypewriterText`

**Files:**
- Create: `src/components/chat/useTypewriterText.ts`
- Test: `src/components/chat/useTypewriterText.test.ts`

**Step 1: Write the failing tests**

Create `src/components/chat/useTypewriterText.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useTypewriterText } from "./useTypewriterText"

describe("useTypewriterText", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns empty string when input is null", () => {
    const { result } = renderHook(() => useTypewriterText(null, true))
    expect(result.current).toBe("")
  })

  it("returns empty string when input is undefined", () => {
    const { result } = renderHook(() => useTypewriterText(undefined, true))
    expect(result.current).toBe("")
  })

  it("returns full text immediately when isActive is false", () => {
    const { result } = renderHook(() =>
      useTypewriterText("Hello world foo bar", false)
    )
    expect(result.current).toBe("Hello world foo bar")
  })

  it("reveals words one at a time when active", () => {
    const { result } = renderHook(() =>
      useTypewriterText("Hello world", true)
    )

    // Initially empty — words are queued
    expect(result.current).toBe("")

    // After one interval tick (~80ms), first word appears
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Hello")

    // After another tick, second word appears
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Hello world")
  })

  it("diffs cumulative snapshots to extract only new words", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriterText(text, true),
      { initialProps: { text: "Analyzing" as string | null } }
    )

    // Drain first word
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Analyzing")

    // New cumulative snapshot arrives with more words
    rerender({ text: "Analyzing the Chosen Topic" })

    // Queue now has ["the", "Chosen", "Topic"]
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Analyzing the")

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Analyzing the Chosen")

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Analyzing the Chosen Topic")
  })

  it("pauses naturally when queue is empty", () => {
    const { result } = renderHook(() =>
      useTypewriterText("Hello", true)
    )

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Hello")

    // Extra ticks do nothing — queue is empty
    act(() => { vi.advanceTimersByTime(240) })
    expect(result.current).toBe("Hello")
  })

  it("snaps to full text when isActive flips to false", () => {
    const { result, rerender } = renderHook(
      ({ text, active }) => useTypewriterText(text, active),
      { initialProps: { text: "Hello world foo bar", active: true } }
    )

    // Only drain one word
    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Hello")

    // Deactivate — should snap to full text
    rerender({ text: "Hello world foo bar", active: false })
    expect(result.current).toBe("Hello world foo bar")
  })

  it("resets when input changes to a completely different string", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriterText(text, true),
      { initialProps: { text: "First message" as string | null } }
    )

    act(() => { vi.advanceTimersByTime(160) })
    expect(result.current).toBe("First message")

    // New unrelated snapshot (e.g., new reasoning turn with reset)
    rerender({ text: "" })
    rerender({ text: "Second message entirely" })

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Second")

    act(() => { vi.advanceTimersByTime(80) })
    expect(result.current).toBe("Second message")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/chat/useTypewriterText.test.ts --reporter=verbose`

Expected: FAIL — module `./useTypewriterText` not found

**Step 3: Implement the hook**

Create `src/components/chat/useTypewriterText.ts`:

```ts
import { useEffect, useRef, useState } from "react"

const WORD_INTERVAL_MS = 80

export function useTypewriterText(
  cumulativeText: string | null | undefined,
  isActive: boolean
): string {
  const [displayedText, setDisplayedText] = useState("")
  const queueRef = useRef<string[]>([])
  const prevSnapshotRef = useRef("")
  const displayedWordsRef = useRef<string[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Diff new cumulative snapshot → enqueue new words
  useEffect(() => {
    const text = cumulativeText ?? ""

    if (!text) {
      // Reset on empty/null
      queueRef.current = []
      displayedWordsRef.current = []
      prevSnapshotRef.current = ""
      setDisplayedText("")
      return
    }

    if (!isActive) {
      // Snap to full text when not active
      queueRef.current = []
      displayedWordsRef.current = text.split(/\s+/)
      prevSnapshotRef.current = text
      setDisplayedText(text)
      return
    }

    const prevWords = prevSnapshotRef.current ? prevSnapshotRef.current.split(/\s+/) : []
    const newWords = text.split(/\s+/)

    // Check if this is a continuation (new text starts with prev text)
    const isContinuation = prevWords.length > 0 &&
      newWords.slice(0, prevWords.length).join(" ") === prevWords.join(" ")

    if (isContinuation) {
      // Only enqueue the truly new words
      const freshWords = newWords.slice(prevWords.length)
      queueRef.current.push(...freshWords)
    } else {
      // Completely new text — reset and enqueue all
      displayedWordsRef.current = []
      setDisplayedText("")
      queueRef.current = [...newWords]
    }

    prevSnapshotRef.current = text
  }, [cumulativeText, isActive])

  // Interval loop: dequeue one word at a time
  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      if (queueRef.current.length === 0) return

      const word = queueRef.current.shift()!
      displayedWordsRef.current.push(word)
      setDisplayedText(displayedWordsRef.current.join(" "))
    }, WORD_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive])

  return displayedText
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/chat/useTypewriterText.test.ts --reporter=verbose`

Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/chat/useTypewriterText.ts src/components/chat/useTypewriterText.test.ts
git commit -m "feat: add useTypewriterText hook for word-by-word reasoning text reveal"
```

---

## Task 4: Integrate Typewriter Hook into ChatProcessStatusBar

**Files:**
- Modify: `src/components/chat/ChatProcessStatusBar.tsx`
- Test: `src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx`

**Step 1: Update existing streaming test for typewriter compatibility**

The existing test `"menahan headline transparent saat status masih streaming"` will break after typewriter integration because `displayText` starts as `""` (words are queued, not rendered synchronously). Update it to advance fake timers before asserting.

Add `act` to the existing import from `@testing-library/react`, and add `beforeEach`/`afterEach` **inside the existing `describe` block** (not at top-level — top-level fake timers would globally affect all test files):

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react"

describe("ChatProcessStatusBar transparent mode", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("menahan headline transparent saat status masih streaming agar tidak jatuh ke dots-only", () => {
    render(
      <ChatProcessStatusBar
        visible
        status="streaming"
        progress={48}
        elapsedSeconds={6.8}
        reasoningHeadline="Sedang membandingkan dua jalur penalaran yang paling kuat."
        reasoningSteps={[
          {
            traceId: "trace-streaming",
            stepKey: "response-compose",
            label: "Menyusun jawaban final",
            status: "running",
            progress: 48,
          },
        ]}
        reasoningTraceMode="transparent"
      />
    )

    // Advance fake timers to drain all 9 words through typewriter queue
    act(() => { vi.advanceTimersByTime(80 * 9 + 10) })

    expect(
      screen.getByText("Sedang membandingkan dua jalur penalaran yang paling kuat.")
    ).toBeInTheDocument()
    expect(screen.getByText("48%")).toBeInTheDocument()
  })
```

**Step 2: Write the new typewriter integration test**

Add inside the same `describe` block. This test explicitly verifies that words appear incrementally, not all at once:

```tsx
  it("reveals reasoning headline word by word during streaming (typewriter)", () => {
    const { container } = render(
      <ChatProcessStatusBar
        visible
        status="streaming"
        progress={30}
        elapsedSeconds={3.5}
        reasoningHeadline="Analyzing the Chosen Topic"
        reasoningSteps={[]}
      />
    )

    // Before any interval ticks, the truncate span should not exist yet
    // because displayText is "" (falsy), so the conditional render skips it
    expect(container.querySelector(".truncate")).not.toBeInTheDocument()

    // After one tick, first word appears — span now exists
    act(() => { vi.advanceTimersByTime(80) })
    const textEl = container.querySelector(".truncate")
    expect(textEl).toBeInTheDocument()
    expect(textEl!.textContent).toBe("Analyzing")

    // After all 4 words drain, full text appears
    act(() => { vi.advanceTimersByTime(80 * 3 + 10) })
    expect(container.querySelector(".truncate")!.textContent).toBe("Analyzing the Chosen Topic")
  })
```

**Step 3: Run tests to verify they fail (pre-integration)**

Run: `npx vitest run src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx --reporter=verbose`

Expected: The new typewriter test FAILS because the component still renders full text immediately (no hook integrated yet). The updated existing test may pass or fail depending on timing — both are acceptable at this step.

**Step 4: Integrate the hook**

In `src/components/chat/ChatProcessStatusBar.tsx`:

1. Add import at the top:

```tsx
import { useTypewriterText } from "./useTypewriterText"
```

2. After the `narrativeHeadline` useMemo (line 96), add the hook call:

```tsx
const displayText = useTypewriterText(narrativeHeadline, isProcessing)
```

3. Replace the headline render in the processing mode section. Change line 124:

```tsx
// Before (line 124)
{narrativeHeadline && <span className="truncate">{narrativeHeadline}</span>}

// After
{displayText && <span className="truncate">{displayText}</span>}
```

4. Update the `aria-label` on the processing div. Change line 110:

```tsx
// Before (line 110)
<div role="status" aria-live="polite" aria-label={narrativeHeadline ?? undefined}>

// After
<div role="status" aria-live="polite" aria-label={displayText || undefined}>
```

Note: The completed mode section (line 149-198) continues to use `narrativeHeadline` directly — no typewriter there.

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx --reporter=verbose`

Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/components/chat/ChatProcessStatusBar.tsx src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx
git commit -m "feat: integrate typewriter hook into ChatProcessStatusBar for word-by-word reasoning text"
```

---

## Task 5: CSS Crossfade Transition — Processing to Completed

**Files:**
- Modify: `src/components/chat/ChatProcessStatusBar.tsx`
- Modify: `src/app/globals-new.css`

**Step 1: Add CSS transition classes**

In `src/app/globals-new.css`, after the `chat-progress-fill-shimmer::after` block (around line 1424), add:

```css
/* Processing → Completed crossfade transition */
[data-chat-scope] .chat-status-processing-enter {
  animation: chat-status-fade-in 300ms ease forwards;
}

[data-chat-scope] .chat-status-completed-enter {
  animation: chat-status-fade-in 300ms ease forwards;
}

@keyframes chat-status-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  [data-chat-scope] .chat-status-processing-enter,
  [data-chat-scope] .chat-status-completed-enter {
    animation: none;
  }
}
```

**Step 2: Add transition classes to ChatProcessStatusBar**

In `src/components/chat/ChatProcessStatusBar.tsx`, track the previous `isProcessing` state to detect transitions. Add a ref after the existing state declarations (after line 53):

```tsx
const prevIsProcessingRef = useRef(isProcessing)
const isTransitioning = prevIsProcessingRef.current !== isProcessing

useEffect(() => {
  prevIsProcessingRef.current = isProcessing
}, [isProcessing])
```

Add `useEffect` and `useRef` to the React import at line 4:

```tsx
import { useEffect, useMemo, useRef, useState } from "react"
```

Then add the transition class to the processing and completed mode wrappers:

```tsx
// Processing mode wrapper (line 110):
// Before:
<div role="status" aria-live="polite" aria-label={displayText || undefined}>
// After:
<div role="status" aria-live="polite" aria-label={displayText || undefined}
  className={isTransitioning ? "chat-status-processing-enter" : undefined}>

// Completed mode wrapper (line 150):
// Before:
<div role="status" aria-live="polite">
// After:
<div role="status" aria-live="polite"
  className={isTransitioning ? "chat-status-completed-enter" : undefined}>
```

**Step 3: Run all related tests**

Run: `npx vitest run src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx src/components/chat/useTypewriterText.test.ts src/components/chat/ChatWindow.reasoning-duration.test.tsx --reporter=verbose`

Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/components/chat/ChatProcessStatusBar.tsx src/app/globals-new.css
git commit -m "feat: add CSS crossfade transition from processing to completed mode"
```

---

## Task 6: Manual UI Verification

**No code changes.** Visual verification in the browser.

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Trigger a reasoning-enabled chat**

Send a message that invokes reasoning (e.g., a question about a paper). Watch the loading bar above the chat input.

**Step 3: Verify typewriter effect**

- [ ] Text appears word-by-word, not as a full string swap
- [ ] Words appear at a smooth ~80ms pace
- [ ] When new snapshot arrives, additional words flow in seamlessly
- [ ] Text overflow is handled by CSS truncate (no layout break)

**Step 4: Verify no flicker at ~90%**

- [ ] Teal progress bar does NOT disappear/reappear near the end
- [ ] Bar stays continuously visible from start to finish of streaming

**Step 5: Verify completed transition**

- [ ] Processing mode fades out smoothly when reasoning finishes
- [ ] Completed mode (duration + expandable headline) fades in
- [ ] Clicking the completed headline still expands it
- [ ] "Detail →" button still opens the reasoning panel

**Step 6: Verify completed mode rehydrate (page reload)**

- [ ] Reload the page after a completed response
- [ ] Duration still shows correctly (from persisted data)
- [ ] No flicker or jarring transitions on rehydrate
