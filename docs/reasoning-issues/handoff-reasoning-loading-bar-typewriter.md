# Handoff: Reasoning Loading Bar — Typewriter + Flicker Fix

## Objective

Two changes to the reasoning loading bar above chat input:

1. **Typewriter effect** — reasoning text streams word-by-word like someone typing, instead of full string swap
2. **Fix teal bar flicker** — bar disappears briefly at ~90% progress then reappears; caused by 3 interacting bugs

## Current State

### Loading Bar Component

**File:** `src/components/chat/ChatProcessStatusBar.tsx`

The bar sits above the chat input area. During streaming it shows:
- Reasoning text (monospace, muted color, single line, `truncate`)
- Teal/emerald progress bar with shimmer animation below the text
- Progress percentage on the right

### Data Flow

```
Server: reasoningAccumulator.onReasoningDelta(delta)
  → accumulates rawReasoning, sanitizes to snapshot
  → throttled (160ms / 48 chars): emits ReasoningLiveDataPart
    { type: "data-reasoning-live", data: { text: CUMULATIVE_SNAPSHOT } }

Client: useChat() → UIMessage.parts[] includes data-reasoning-live parts

ChatWindow.tsx:
  → activeReasoningState useMemo (line 2008-2032)
    → resolveLiveReasoningHeadline() scans parts for data-reasoning-live
    → returns last non-reset cumulative snapshot as headline
  → passes reasoningHeadline={activeReasoningState.headline} to ChatProcessStatusBar

ChatProcessStatusBar.tsx:
  → narrativeHeadline useMemo (line 67-96): reasoningHeadline takes priority
  → renders: <span className="truncate">{narrativeHeadline}</span>
  → FULL STRING SWAP per render — no animation
```

### Key Files

| File | Role |
|---|---|
| `src/components/chat/ChatProcessStatusBar.tsx` | Loading bar component — render, visibility, progress |
| `src/components/chat/ChatWindow.tsx` | State management — activeReasoningState, processUi, effects |
| `src/lib/ai/reasoning-live-stream.ts` | Server-side — accumulator, throttle, SSE emission |
| `src/lib/ai/curated-trace.ts` | Type definitions — ReasoningLiveDataPart shape |
| `src/app/globals-new.css` | CSS — progress bar shimmer, ThinkingDots animations |

## Problem 1: Full String Swap (No Typewriter)

Data arrives as cumulative snapshots every ~160ms:
```
t=0ms:   "Analyzing"
t=160ms: "Analyzing the Chosen Topic"
t=320ms: "Analyzing the Chosen Topic I'm now formulating"
```

Each update replaces the entire `<span>` content. Result: text "jumps" instead of flowing naturally.

## Problem 2: Teal Bar Flicker at ~90%

Three bugs interact to cause a brief unmount/remount cycle:

### Bug 1 (PRIMARY): `shouldShow` unmounts bar when headline is transiently null

**File:** `ChatProcessStatusBar.tsx`, line 98-99

```tsx
const shouldShow = Boolean(narrativeHeadline) || (visible && reasoningSteps.length > 0) || isPanelOpenValue
if (!shouldShow) return null
```

During reasoning→text transition, `narrativeHeadline` briefly becomes `null`. If `reasoningSteps` is also empty (Bug 2), and panel is closed → `shouldShow = false` → bar unmounts entirely.

### Bug 2 (AMPLIFIER): activeReasoningState returns empty during transition

**File:** `ChatWindow.tsx`, lines 2008-2032

`useMemo` fallback returns `{ steps: [], headline: null }` when the latest assistant message is in the reasoning→text transition gap. Both headline and steps are empty simultaneously.

### Bug 3 (COMPOUNDING): persistedDurationSeconds effect fires prematurely

**File:** `ChatWindow.tsx`, lines 2098-2123

`data-reasoning-duration` SSE part arrives BEFORE `finish` chunk (emitted at `build-step-stream.ts` line 855). The effect immediately sets `visible: false` and `status: "ready"` while stream is still active.

### Flicker Timeline

```
~90% → reasoning ends → data-reasoning-duration arrives (before finish)
  → Bug 3: visible=false, status="ready", timers cleared
  → Bug 2: headline=null, steps=[]
  → Bug 1: shouldShow=false → bar unmounts (return null)
  → 1-3 renders later: text arrives → bar remounts → visible flicker
```

## Solution Design

### Fix 1: Prevent unmount during streaming

In `ChatProcessStatusBar.tsx` line 98, add `isProcessing` to `shouldShow`:

```tsx
const shouldShow = isProcessing || Boolean(narrativeHeadline) || (visible && reasoningSteps.length > 0) || isPanelOpenValue
```

This keeps the bar mounted for the entire duration of `status === "submitted" || status === "streaming"`.

### Fix 2: Guard persistedDurationSeconds effect

In `ChatWindow.tsx` line 2098-2123, guard the effect so it does NOT fire while AI SDK status is still `"streaming"`. Only allow it when status has transitioned to a terminal state.

### Fix 3: Typewriter word-by-word with sliding window

**Algorithm:**

1. When new cumulative snapshot arrives, diff against previous snapshot to extract new words
2. Buffer new words in a queue
3. Release words from queue one-by-one at ~80ms interval (smoothing)
4. Display only the most recent words that fit in the container width (sliding window)
5. Old words exit left with hard cut (no gradient, no fade)
6. If buffer empties, pause until next snapshot arrives (natural "thinking pause")

**Implementation approach:**

- New React hook (e.g., `useTypewriterText`) that:
  - Accepts cumulative snapshot string
  - Maintains internal word queue + displayed text state
  - Runs a `requestAnimationFrame` or `setInterval` loop at ~80ms to dequeue words
  - Returns the current display string

- `ChatProcessStatusBar` uses this hook instead of raw `narrativeHeadline`:
  ```tsx
  const displayText = useTypewriterText(narrativeHeadline)
  // render: <span className="truncate">{displayText}</span>
  ```

**No server-side changes needed.** Cumulative snapshot data is sufficient; diffing and buffering happen entirely in the client component.

### Fix 4: Completed state — fade-out with delay

When reasoning finishes (model starts text output):

1. Typewriter text **freezes** at last position
2. Progress percentage replaced with **duration** (e.g., "3.2s") on the right
3. Hold visible for **1 second**
4. **Fade-out 500ms** (opacity 1→0 + collapse height)
5. Remove from DOM after animation completes

Implementation: CSS transition on opacity + max-height, triggered by a `completed` state with 1s delay via `setTimeout`.

## Design Decisions (Confirmed)

| Decision | Choice | Rationale |
|---|---|---|
| Text animation | Word-by-word typewriter, ~80ms per word | Natural typing feel, smooth regardless of server timing |
| Overflow handling | Sliding window, hard cut on left | Simple, no gradient mask needed |
| Word release speed | ~80ms per word, buffered smoothing | Fast enough to not feel slow, slow enough to read |
| Completed state | Freeze text + show duration → 1s delay → 500ms fade-out | User can read final thought + see duration |
| ThinkingDots | Not in loading bar (exists in planning card only) | Verified by user — not part of this component |
| Gradient mask | No | Hard cut preferred |
| Collapsible panel | Not in scope (expand-to-panel already exists via chevron) | Skip AI SDK Elements Collapsible pattern |
| Server changes | None | All changes client-side |

## AI SDK Elements Reference

Reference component: https://elements.ai-sdk.dev/components/reasoning

Key patterns from this reference (for inspiration, not direct adoption):
- `isStreaming` prop controls auto-open/close
- `useReasoning()` hook for state management
- Pulse animation as streaming indicator
- Collapsible with Radix UI primitives

We are NOT adopting the Collapsible pattern. We use the typewriter approach in the existing loading bar position instead.

## Files to Modify

| File | Changes |
|---|---|
| `src/components/chat/ChatProcessStatusBar.tsx` | Add `isProcessing` to `shouldShow` guard; integrate `useTypewriterText` hook; add completed-state fade-out transition |
| `src/components/chat/ChatWindow.tsx` | Guard `persistedDurationSeconds` effect against streaming status |
| New: `src/components/chat/useTypewriterText.ts` (or inline) | Hook: cumulative snapshot → word queue → smoothed word release → display string |
| `src/app/globals-new.css` | Add fade-out transition classes for completed state |

## Scope Summary

- Fix teal bar flicker (3 bugs → 2 code changes)
- Typewriter word-by-word (1 new hook + component integration)
- Completed state fade-out (CSS transition + setTimeout logic)
- No server-side changes
- No downstream consumer changes
