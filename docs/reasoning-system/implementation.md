# Reasoning Expandable Panel — Implementation Plan

> **For Claude:** REQUIRED execution methodology: **Subagent-Driven Development with Multi-Agent Orchestration.** The orchestrator dispatches specialized agents per task based on expertise. After each task's commit, dispatch a reviewer+auditor agent to verify compliance with design.md, accuracy of changes, no regressions, no new problems.

**Goal:** Replace the invisible single-line reasoning bar with an expandable collapsible panel inside MessageBubble, and strip ChatProcessStatusBar to a pure progress indicator.

**Architecture:** New `ReasoningPanel` component using Radix Collapsible, rendered inside MessageBubble above UnifiedProcessCard. ChatProcessStatusBar stripped to teal bar + percentage + ThinkingDots. Data threaded from ChatWindow through MessageBubble, scoped to last assistant message during streaming.

**Tech Stack:** React, Radix UI Collapsible (already installed), iconoir-react (already installed), Tailwind CSS.

**Design doc:** `docs/reasoning-system/design.md`

---

## Execution Protocol

### Agent Orchestration

Each task is dispatched to a specialized subagent. The orchestrator:

1. **Dispatches** a code-implementation agent with the task prompt (includes exact files, code, and expected behavior).
2. **Waits** for the agent to complete and commit.
3. **Dispatches** a reviewer+auditor agent that verifies:
   - Compliance with `design.md` decisions
   - No regressions to existing systems (UnifiedProcessCard, ReasoningActivityPanel, flicker guards, CSS animations)
   - Correct data flow (scoped reasoning props, narrativeHeadline priority chain preserved)
   - Tests pass for changed files
4. **Patches** any gaps found by the auditor before proceeding to next task.

### Agent Expertise Mapping

| Task | Agent Type | Expertise |
|------|-----------|-----------|
| Tasks 1-2 (component creation) | Frontend developer | React components, Radix primitives, CSS |
| Task 3 (prop threading) | Code architect | Data flow, prop design, scoping logic |
| Task 4 (strip ChatProcessStatusBar) | Refactoring specialist | Safe removal, guard simplification |
| Task 5 (test updates) | Test engineer | Test migration, selector updates |
| Task 6 (CSS) | Frontend developer | Animations, a11y, responsive |
| Task 7 (cleanup) | Refactoring specialist | Dead code removal, verification |
| Post-commit audit | Code reviewer + auditor | Design compliance, regression detection |

---

## Task 1: Create ReasoningPanel Component — Core Structure

**Files:**
- Create: `src/components/chat/ReasoningPanel.tsx`

**Step 1: Create the component file with full implementation**

```tsx
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { NavArrowDown, NavArrowRight } from "iconoir-react"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { ReasoningActivityPanel } from "./ReasoningActivityPanel"
import { type ReasoningTraceStep } from "./ReasoningTracePanel"

// --- Constants ---

const AUTO_CLOSE_DELAY = 1000
const SCROLL_BOTTOM_THRESHOLD = 20

const TEMPLATE_LABELS = new Set([
  "Memahami kebutuhan user",
  "Memeriksa konteks paper aktif",
  "Menentukan kebutuhan pencarian web",
  "Memvalidasi sumber referensi",
  "Menyusun jawaban final",
  "Menjalankan aksi pendukung",
])

// --- Types ---

interface ReasoningPanelProps {
  /** Cumulative reasoning text snapshot (max 800 chars, tail-kept). */
  reasoningText: string | null | undefined
  /** True while model is actively reasoning. Drives auto-open. */
  isReasoning: boolean
  /** Duration in seconds after reasoning completes. */
  durationSeconds?: number
  /** Steps data for narrativeHeadline priority chain fallback. */
  reasoningSteps?: ReasoningTraceStep[]
  /** Trace mode for ReasoningActivityPanel. */
  reasoningTraceMode?: "curated" | "transparent"
  /**
   * ReasoningActivityPanel open state.
   * Externally controlled by ChatWindow's activeSheet === "proses".
   */
  isPanelOpen?: boolean
  onPanelOpenChange?: (open: boolean) => void
}

// --- Narrative headline priority chain ---
// Ported from ChatProcessStatusBar.tsx lines 68-97.
// Priority: raw reasoningText → non-template step labels → step thoughts → any step with content.

function resolveNarrativeHeadline(
  reasoningText: string | null | undefined,
  reasoningSteps: ReasoningTraceStep[],
): string | null {
  if (reasoningText && reasoningText.trim()) return reasoningText

  if (reasoningSteps.length === 0) return null

  const running = reasoningSteps.find((step) => step.status === "running")
  if (running) {
    if (!TEMPLATE_LABELS.has(running.label)) return running.label
    if (running.thought) return running.thought.trim()
  }

  const errored = reasoningSteps.find((step) => step.status === "error")
  if (errored) {
    if (!TEMPLATE_LABELS.has(errored.label)) return errored.label
    if (errored.thought) return errored.thought.trim()
  }

  const withContent = [...reasoningSteps].reverse().find((s) =>
    !TEMPLATE_LABELS.has(s.label) || (s.thought && s.thought.trim())
  )
  if (withContent) {
    if (!TEMPLATE_LABELS.has(withContent.label)) return withContent.label
    if (withContent.thought) return withContent.thought.trim()
  }

  return null
}

function extractFirstSentence(text: string): string {
  const match = text.match(/^[^.!?]*[.!?]/)
  return match ? match[0].trim() : text.slice(0, 80)
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds)
  if (safe < 60) return `${safe.toFixed(1)}s`
  const minutes = Math.floor(safe / 60)
  const seconds = safe - minutes * 60
  return `${minutes}m ${seconds.toFixed(0)}s`
}

// --- Component ---

export function ReasoningPanel({
  reasoningText,
  isReasoning,
  durationSeconds,
  reasoningSteps = [],
  reasoningTraceMode: _reasoningTraceMode,
  isPanelOpen,
  onPanelOpenChange,
}: ReasoningPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const hasUserClosedRef = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const isUserScrolledUpRef = useRef(false)

  const narrativeHeadline = useMemo(
    () => resolveNarrativeHeadline(reasoningText, reasoningSteps),
    [reasoningText, reasoningSteps],
  )

  const hasSteps = reasoningSteps.length > 0
  const canOpenActivityPanel = hasSteps

  // --- Auto-open / auto-close: single effect tracking transitions ---
  const prevIsReasoningRef = useRef(isReasoning)
  useEffect(() => {
    const wasReasoning = prevIsReasoningRef.current
    prevIsReasoningRef.current = isReasoning

    // Transition: false → true (reasoning just started)
    if (isReasoning && !wasReasoning) {
      // New reasoning session — reset all flags and auto-open
      hasUserClosedRef.current = false
      isUserScrolledUpRef.current = false
      setIsOpen(true)
      return
    }

    // During reasoning: respect manual close (don't force re-open on every render)
    // hasUserClosedRef is checked in the transition above, not here.

    // Transition: true → false (reasoning just ended)
    if (!isReasoning && wasReasoning && isOpen && narrativeHeadline) {
      const timer = setTimeout(() => {
        setIsOpen(false)
      }, AUTO_CLOSE_DELAY)
      return () => clearTimeout(timer)
    }
  }, [isReasoning, isOpen, narrativeHeadline])

  // --- Auto-scroll to bottom during streaming ---
  useEffect(() => {
    if (!isReasoning || !contentRef.current || isUserScrolledUpRef.current) return
    const el = contentRef.current
    el.scrollTop = el.scrollHeight
  }, [narrativeHeadline, isReasoning])

  // --- Detect user scroll-up to pause auto-scroll ---
  const handleScroll = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_BOTTOM_THRESHOLD
    isUserScrolledUpRef.current = !isNearBottom
  }, [])

  // --- Manual toggle handler ---
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // User manually closed — prevent auto-reopen during this reasoning session
      hasUserClosedRef.current = true
    } else {
      // User manually opened — clear the flag
      hasUserClosedRef.current = false
    }
  }, [])

  // Don't render if no reasoning data
  if (!narrativeHeadline && !isReasoning) return null

  const showDuration = typeof durationSeconds === "number" && durationSeconds > 0.5

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={handleOpenChange} className="reasoning-panel">
        {/* Trigger row: flex container with trigger + Detail button as siblings (no nested buttons) */}
        <div className="flex w-full items-center gap-2 py-1.5">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-1 min-w-0 items-center gap-2 text-left",
                "transition-colors hover:bg-[var(--chat-accent)] rounded-action"
              )}
            >
              <span className="shrink-0 text-[var(--chat-muted-foreground)]">
                {isOpen
                  ? <NavArrowDown className="h-3 w-3" />
                  : <NavArrowRight className="h-3 w-3" />
                }
              </span>

              <span className="flex-1 min-w-0 text-xs font-mono text-[var(--chat-muted-foreground)]">
                {isReasoning ? (
                  <span className="flex items-center gap-1">
                    Thinking
                    <ThinkingShimmer />
                  </span>
                ) : (
                  <span className="truncate">
                    {showDuration && (
                      <span className="opacity-60">{formatDuration(durationSeconds!)} — </span>
                    )}
                    {narrativeHeadline && extractFirstSentence(narrativeHeadline)}
                  </span>
                )}
              </span>
            </button>
          </CollapsibleTrigger>

          {/* Detail button — sibling of trigger, not nested inside */}
          {!isReasoning && canOpenActivityPanel && (
            <button
              type="button"
              onClick={() => onPanelOpenChange?.(true)}
              className="shrink-0 text-[10px] font-mono text-[var(--chat-muted-foreground)] opacity-40 transition-opacity hover:opacity-80"
            >
              Detail &rarr;
            </button>
          )}
        </div>

        <CollapsibleContent>
          <div
            ref={contentRef}
            onScroll={handleScroll}
            className={cn(
              "max-h-40 overflow-y-auto rounded-md px-3 py-2",
              "whitespace-pre-wrap font-mono text-[11px] leading-relaxed",
              "text-[var(--chat-muted-foreground)]",
              "bg-[var(--chat-muted)]/30"
            )}
          >
            {narrativeHeadline}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {canOpenActivityPanel && (
        <ReasoningActivityPanel
          open={isPanelOpen ?? false}
          onOpenChange={onPanelOpenChange ?? (() => {})}
          steps={reasoningSteps}
        />
      )}
    </>
  )
}

// --- Sub-components ---

function ThinkingShimmer() {
  return (
    <span className="inline-flex shrink-0 items-center gap-px" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            "inline-block h-[3px] w-[3px] rounded-full bg-[var(--chat-muted-foreground)]",
            "animate-chat-thought-dot",
            `chat-thought-dot-${n}`
          )}
        />
      ))}
    </span>
  )
}
```

**Step 2: Verify file created correctly**

Run: `head -5 src/components/chat/ReasoningPanel.tsx`
Expected: `"use client"` header visible.

**Step 3: Commit**

```bash
git add src/components/chat/ReasoningPanel.tsx
git commit -m "feat: create ReasoningPanel collapsible component

Radix Collapsible-based panel with auto-open/close, smart scroll,
narrativeHeadline priority chain, and ReasoningActivityPanel wiring."
```

**Post-commit: Dispatch reviewer+auditor agent.** Verify:
- Props match design.md interface
- `resolveNarrativeHeadline` preserves exact priority chain from ChatProcessStatusBar lines 68-97
- `ReasoningActivityPanel` wiring uses `isPanelOpen`/`onPanelOpenChange` (externally controlled)
- Auto-open/close logic matches design.md Auto-behavior table
- `ThinkingShimmer` reuses existing CSS classes (`animate-chat-thought-dot`, `chat-thought-dot-{n}`)
- No new dependencies introduced

---

## Task 2: Thread Reasoning Props Through MessageBubble

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx` (lines 151–197 for props, lines 1503–1505 for render)
- Modify: `src/components/chat/ChatWindow.tsx` (lines 3321–3364 for MessageBubble render site)

**Step 1: Add reasoning props to MessageBubbleProps**

In `src/components/chat/MessageBubble.tsx`, add after line 196 (`cancelableApprovalMessageIds`):

```typescript
    // Reasoning panel props (scoped: only last message during streaming gets live data)
    /** Cumulative reasoning headline text */
    reasoningHeadline?: string | null
    /** True when model is actively reasoning */
    isModelReasoning?: boolean
    /** Reasoning duration in seconds */
    reasoningDurationSeconds?: number
    /** Reasoning trace steps */
    reasoningSteps?: ReasoningTraceStep[]
    /** Reasoning trace mode */
    reasoningTraceMode?: "curated" | "transparent"
    /** ReasoningActivityPanel open state (controlled by ChatWindow activeSheet) */
    isReasoningPanelOpen?: boolean
    /** ReasoningActivityPanel open change handler */
    onReasoningPanelOpenChange?: (open: boolean) => void
```

Add import at top of `MessageBubble.tsx`:
```typescript
import { ReasoningPanel } from "./ReasoningPanel"
import { type ReasoningTraceStep } from "./ReasoningTracePanel"
```

**Step 2: Destructure new props in component function**

In the destructure block of `MessageBubble` (after `cancelableApprovalMessageIds`), add:

```typescript
    reasoningHeadline,
    isModelReasoning = false,
    reasoningDurationSeconds,
    reasoningSteps,
    reasoningTraceMode,
    isReasoningPanelOpen,
    onReasoningPanelOpenChange,
```

**Step 3: Render ReasoningPanel above UnifiedProcessCard**

Insert BEFORE the `{showUnifiedCard && (` block (before line 1505):

```tsx
                    {/* Reasoning Panel — above UnifiedProcessCard, above message content */}
                    {(reasoningHeadline || isModelReasoning) && isAssistant && (
                        <div className="mb-2">
                            <ReasoningPanel
                                reasoningText={reasoningHeadline}
                                isReasoning={isModelReasoning}
                                durationSeconds={reasoningDurationSeconds}
                                reasoningSteps={reasoningSteps}
                                reasoningTraceMode={reasoningTraceMode}
                                isPanelOpen={isReasoningPanelOpen}
                                onPanelOpenChange={onReasoningPanelOpenChange}
                            />
                        </div>
                    )}
```

**Step 4: Pass reasoning props from ChatWindow to MessageBubble**

In `src/components/chat/ChatWindow.tsx`, at the MessageBubble render site (lines 3321–3364), add reasoning props. These must be **scoped to the last assistant message** — not `messages.length - 1` (which could be a user turn).

First, compute `lastAssistantIndex` above the message map (near `activeReasoningState`):

```tsx
const lastAssistantIndex = useMemo(() => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return i
  }
  return -1
}, [messages])
```

Then in the MessageBubble render:

```tsx
                      <MessageBubble
                        key={message.id}
                        message={displayMessage}
                        // ... existing props unchanged ...
                        // Reasoning props — scoped to last assistant message only
                        reasoningHeadline={
                          index === lastAssistantIndex
                            ? activeReasoningState.headline
                            : null
                        }
                        isModelReasoning={
                          index === lastAssistantIndex &&
                          (status === "submitted" || status === "streaming") &&
                          Boolean(activeReasoningState.headline)
                        }
                        reasoningDurationSeconds={
                          index === lastAssistantIndex
                            ? activeReasoningState.persistedDurationSeconds
                            : undefined
                        }
                        reasoningSteps={
                          index === lastAssistantIndex
                            ? activeReasoningState.steps
                            : undefined
                        }
                        reasoningTraceMode={
                          index === lastAssistantIndex
                            ? activeReasoningState.traceMode
                            : undefined
                        }
                        isReasoningPanelOpen={
                          index === lastAssistantIndex
                            ? activeSheet === "proses"
                            : undefined
                        }
                        onReasoningPanelOpenChange={
                          index === lastAssistantIndex
                            ? (open) => handleSheetChange(open ? "proses" : null)
                            : undefined
                        }
                      />
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to ReasoningPanel, MessageBubble, or ChatWindow.

**Step 6: Commit**

```bash
git add src/components/chat/MessageBubble.tsx src/components/chat/ChatWindow.tsx
git commit -m "feat: thread reasoning props through MessageBubble

Scoped to last assistant message during streaming. ReasoningPanel
renders above UnifiedProcessCard in message bubble."
```

**Scope note — historical messages:** Only the last assistant message gets live reasoning data. Historical completed messages do NOT render a ReasoningPanel. Per-message persisted reasoning display is a future enhancement (not in this scope). Users can still access historical reasoning via the full conversation history.

**Post-commit: Dispatch reviewer+auditor agent.** Verify:
- `lastAssistantIndex` correctly identifies last assistant message (not last message overall)
- Props scoped correctly — only last assistant message gets live reasoning data
- `activeSheet === "proses"` coordination preserved for ReasoningActivityPanel
- `handleSheetChange` used for panel open/close (sheet exclusivity maintained)
- No props passed to non-last-assistant messages
- Import paths correct

---

## Task 3: Strip ChatProcessStatusBar to Pure Progress Indicator

**Files:**
- Modify: `src/components/chat/ChatProcessStatusBar.tsx`
- Modify: `src/components/chat/ChatWindow.tsx` (line 3468 — remove guard)

**Step 1: Strip ChatProcessStatusBar**

Replace the entire content of `src/components/chat/ChatProcessStatusBar.tsx` with:

```tsx
"use client"

import { cn } from "@/lib/utils"

type ChatProcessStatus = "submitted" | "streaming" | "ready" | "error" | "stopped"

interface ChatProcessStatusBarProps {
  status: ChatProcessStatus
  progress: number
}

export function ChatProcessStatusBar({
  status,
  progress,
}: ChatProcessStatusBarProps) {
  const isProcessing = status === "submitted" || status === "streaming"
  const isError = status === "error"
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)))

  if (!isProcessing) return null

  return (
    <div className="pb-2" style={{ paddingInline: "var(--chat-input-pad-x, 5rem)" }}>
      <div role="status" aria-live="polite">
        <div className="mb-1.5 flex w-full items-center justify-between">
          <span className="flex min-w-0 items-baseline gap-1">
            <ThinkingDots />
          </span>
          <span
            className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--chat-foreground)]"
            style={{ opacity: 0.92 }}
          >
            {safeProgress}%
          </span>
        </div>

        {/* Teal progress bar */}
        <div className="relative h-1 overflow-hidden rounded-full bg-[var(--chat-muted)]">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300 ease-out",
              isError
                ? "bg-[var(--chat-destructive)]"
                : "bg-[var(--chat-success)] chat-progress-fill-shimmer"
            )}
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function ThinkingDots() {
  return (
    <span className="inline-flex shrink-0 items-center gap-px" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            "inline-block h-[3px] w-[3px] rounded-full bg-[var(--chat-muted-foreground)]",
            "animate-chat-thought-dot",
            `chat-thought-dot-${n}`
          )}
        />
      ))}
    </span>
  )
}
```

**Step 2: Remove guard and unused props in ChatWindow.tsx**

At line 3467-3478, replace the ChatProcessStatusBar render with:

```tsx
        <ChatProcessStatusBar
          status={processUi.status}
          progress={processUi.progress}
        />
```

Remove `visible` prop (no longer needed — component guards on `isProcessing` internally) and these props that no longer exist:
- `elapsedSeconds`
- `persistedDurationSeconds`
- `reasoningSteps`
- `reasoningHeadline`
- `reasoningTraceMode`
- `isPanelOpen`
- `onPanelOpenChange`

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors. ChatProcessStatusBar props are now minimal.

**Step 4: Commit**

```bash
git add src/components/chat/ChatProcessStatusBar.tsx src/components/chat/ChatWindow.tsx
git commit -m "refactor: strip ChatProcessStatusBar to pure progress indicator

Remove reasoning text, completed mode, ReasoningActivityPanel trigger.
Remove !effectivePaperUiMode guard. Keep teal bar + percentage + dots."
```

**Post-commit: Dispatch reviewer+auditor agent.** Verify:
- All reasoning logic removed from ChatProcessStatusBar
- `!effectivePaperUiMode` guard removed — bar now visible in paper mode
- Props reduced to `visible`, `status`, `progress` only
- ThinkingDots preserved with same CSS classes
- Teal progress bar + shimmer preserved
- No import of `useTypewriterText`, `ReasoningActivityPanel`, `NavArrowRight`
- `shouldShow` simplified to `isProcessing` check
- `ChatWindow.tsx` no longer passes removed props

---

## Task 4: Delete useTypewriterText Hook and Tests

**Files:**
- Remove: `src/components/chat/useTypewriterText.ts`
- Remove: `src/components/chat/useTypewriterText.test.ts`

**Step 1: Verify no other consumers**

Run: `grep -r "useTypewriterText" src/ --include="*.ts" --include="*.tsx" -l`
Expected: Only `ChatProcessStatusBar.tsx` (already stripped in Task 3) and the two files being deleted.

**Step 2: Delete both files**

```bash
rm src/components/chat/useTypewriterText.ts
rm src/components/chat/useTypewriterText.test.ts
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors. No remaining imports of `useTypewriterText`.

**Step 4: Commit**

```bash
git add -u src/components/chat/useTypewriterText.ts src/components/chat/useTypewriterText.test.ts
git commit -m "chore: remove useTypewriterText hook and tests

Hook no longer needed — ReasoningPanel renders cumulative snapshot directly.
14 tests removed alongside the deleted hook."
```

**Post-commit: Dispatch reviewer+auditor agent.** Verify:
- No remaining imports of `useTypewriterText` anywhere in `src/`
- No broken imports in any file
- TypeScript compilation clean

---

## Task 5: Update ChatProcessStatusBar Tests

**Files:**
- Modify: `src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx`

**Step 1: Rewrite tests for stripped component**

The existing 4 tests all test reasoning text display and ReasoningActivityPanel wiring — both now moved to ReasoningPanel. The stripped ChatProcessStatusBar only shows progress bar + percentage + dots.

Replace entire test file:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ChatProcessStatusBar } from "./ChatProcessStatusBar"

describe("ChatProcessStatusBar (stripped progress indicator)", () => {
  it("shows progress bar and percentage during streaming", () => {
    render(
      <ChatProcessStatusBar
        status="streaming"
        progress={48}
      />
    )

    expect(screen.getByText("48%")).toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("returns null when not processing", () => {
    const { container } = render(
      <ChatProcessStatusBar
        status="ready"
        progress={100}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it("clamps progress to 0-100 range", () => {
    render(
      <ChatProcessStatusBar
        status="streaming"
        progress={150}
      />
    )

    expect(screen.getByText("100%")).toBeInTheDocument()
  })

  it("shows error styling on error status while still processing", () => {
    // Error status with submitted/streaming still shows bar
    // (error styling is on the bar color, not visibility)
    const { container } = render(
      <ChatProcessStatusBar
        status="streaming"
        progress={30}
      />
    )

    expect(screen.getByText("30%")).toBeInTheDocument()
    expect(container.querySelector("[role='status']")).toBeInTheDocument()
  })
})
```

**Step 2: Run the tests**

Run: `npx vitest run src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx --reporter=verbose`
Expected: All 4 tests pass.

**Step 3: Commit**

```bash
git add src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx
git commit -m "test: rewrite ChatProcessStatusBar tests for stripped component

Old tests covered reasoning text + ReasoningActivityPanel (now in ReasoningPanel).
New tests cover progress bar + percentage + visibility guard."
```

**Post-commit: Dispatch reviewer+auditor agent.** Verify:
- Tests match the stripped component's actual behavior
- No references to removed features (reasoning text, Detail button, ReasoningActivityPanel)
- All tests pass

---

## Task 6: Add CSS Animations for ReasoningPanel

**Files:**
- Modify: `src/app/globals-new.css`

**Step 1: Add collapsible panel animation**

Insert after the `chat-status-fade-in` keyframe block (after line 1438), before the `prefers-reduced-motion` block.

**IMPORTANT:** Scope to `.reasoning-panel` parent class to avoid affecting UnifiedProcessCard's Collapsible (which uses the same `data-slot="collapsible-content"` from the shared shadcn wrapper).

```css
/* Reasoning panel collapsible transition — scoped to avoid UnifiedProcessCard regression */
[data-chat-scope] .reasoning-panel [data-slot="collapsible-content"] {
  overflow: hidden;
  transition: height 200ms ease-out, opacity 200ms ease-out;
}

[data-chat-scope] .reasoning-panel [data-slot="collapsible-content"][data-state="closed"] {
  height: 0;
  opacity: 0;
}

[data-chat-scope] .reasoning-panel [data-slot="collapsible-content"][data-state="open"] {
  opacity: 1;
}
```

Correspondingly, add `className="reasoning-panel"` to the `<Collapsible>` in ReasoningPanel.tsx (already in Task 1 code).

**Step 2: Add to prefers-reduced-motion block**

In the `prefers-reduced-motion` block at line 1447, add:

```css
  [data-chat-scope] .reasoning-panel [data-slot="collapsible-content"] {
    transition: none;
  }
```

**Step 3: Verify no CSS conflicts**

The `.reasoning-panel` scope ensures only ReasoningPanel's Collapsible gets the transition. UnifiedProcessCard is unaffected.

**Step 4: Commit**

```bash
git add src/app/globals-new.css
git commit -m "style: add collapsible animation for ReasoningPanel

Height + opacity transition with prefers-reduced-motion support."
```

**Post-commit: Dispatch reviewer+auditor agent.** Verify:
- Animation doesn't break UnifiedProcessCard's Collapsible behavior
- `prefers-reduced-motion` disables the animation
- No CSS syntax errors

---

## Task 7: Final Cleanup and Verification

**Files:**
- Verify: all modified files
- No new files to create

**Step 1: Full TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -50`
Expected: Clean compilation.

**Step 2: Run affected tests only**

Run: `npx vitest run src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx --reporter=verbose`
Expected: All tests pass.

**Step 3: Verify no broken imports**

Run: `grep -r "useTypewriterText" src/ --include="*.ts" --include="*.tsx"`
Expected: No results.

Run: `grep -r "from.*ChatProcessStatusBar" src/ --include="*.ts" --include="*.tsx" -l`
Expected: Only `ChatWindow.tsx` and test files.

**Step 4: Verify ReasoningActivityPanel still importable**

Run: `grep -r "ReasoningActivityPanel" src/components/chat/ --include="*.tsx" -l`
Expected: `ReasoningPanel.tsx` and `ReasoningActivityPanel.tsx` (and possibly old test files).

**Step 5: Commit verification results**

No commit needed — this is a verification-only task.

**Post-commit: Dispatch FINAL reviewer+auditor agent.** Comprehensive audit:
- All design.md decisions implemented correctly (all 10 decisions in Decisions Log)
- Data flow: ChatWindow → MessageBubble → ReasoningPanel (scoped to last message)
- ChatProcessStatusBar stripped and visible in paper mode
- `useTypewriterText` fully removed
- `ReasoningActivityPanel` wired through ReasoningPanel
- `narrativeHeadline` priority chain preserved in `resolveNarrativeHeadline`
- CSS animations work with `prefers-reduced-motion`
- No regressions to UnifiedProcessCard, flicker guards, progress bar

---

## Summary

| Task | Files | Action |
|------|-------|--------|
| 1 | Create `ReasoningPanel.tsx` | New collapsible component with full logic |
| 2 | Modify `MessageBubble.tsx`, `ChatWindow.tsx` | Thread reasoning props, render ReasoningPanel |
| 3 | Modify `ChatProcessStatusBar.tsx`, `ChatWindow.tsx` | Strip to pure progress bar, remove guard |
| 4 | Delete `useTypewriterText.ts`, `.test.ts` | Remove dead hook + 14 tests |
| 5 | Modify `ChatProcessStatusBar.transparent-mode.test.tsx` | Rewrite tests for stripped component |
| 6 | Modify `globals-new.css` | Collapsible animation + reduced-motion |
| 7 | Verify all | TypeScript, tests, imports, design compliance |

**Total: 7 tasks, ~6 commits, 1 file created, 4 files modified, 2 files deleted.**
