# Design: Reasoning Expandable Panel

> Approved via brainstorming session 2026-04-22.
> Context: [context.md](./context.md)

---

## Problem

Three confirmed issues with the current reasoning display:

1. **Invisible text** — CSS `truncate` shows first 60-80 chars; text grows at the end, so updates are off-screen.
2. **Ineffective typewriter** — `useTypewriterText` does no animation; extracts last sentence only, discards context. Gemini emits paragraphs, not words.
3. **One line can't convey reasoning** — multi-paragraph thinking truncated to a fragment.

Additionally, `ChatProcessStatusBar` has guard `!effectivePaperUiMode` which hides it entirely — and all sessions are paper sessions. The reasoning display is currently **never visible to users**.

---

## Solution

Two changes:

1. **New `ReasoningPanel` component** inside MessageBubble — collapsible panel showing full reasoning text.
2. **Strip `ChatProcessStatusBar`** — remove reasoning text, remove paper-mode guard. Keep only teal progress bar + percentage + ThinkingDots.

---

## Layout

```
┌─ MessageBubble (assistant) ──────────────────────────┐
│                                                       │
│  ┌─ ReasoningPanel (NEW) ─────────────────────────┐   │
│  │  [▼ Thinking...                               ]│   │
│  │  ┌────────────────────────────────────────────┐│   │
│  │  │ Full reasoning text, multi-line,           ││   │
│  │  │ whitespace-pre-wrap, scrollable            ││   │
│  │  └────────────────────────────────────────────┘│   │
│  └────────────────────────────────────────────────┘   │
│                                                       │
│  ┌─ UnifiedProcessCard (existing, untouched) ─────┐   │
│  │  📋 Tasks + Tools + Search                      │   │
│  └────────────────────────────────────────────────┘   │
│                                                       │
│  [Message content / markdown]                         │
└───────────────────────────────────────────────────────┘

... (scroll area) ...

┌─ ChatProcessStatusBar (stripped) ─────────────────────┐
│  [████████░░░░░░░░░░░░░░░░░  8%]  ···                │
│  (teal bar + percentage + ThinkingDots only)          │
└───────────────────────────────────────────────────────┘

┌─ ChatInput ───────────────────────────────────────────┐
│  [Type your message...]                               │
└───────────────────────────────────────────────────────┘
```

### Temporal order during streaming

1. **ReasoningPanel** appears + auto-opens (model thinking — not a tool call)
2. **UnifiedProcessCard** appears (tool execution — may overlap with reasoning, since reasoning is model-layer, tools are tool-layer; AI SDK allows this because they're different layers)
3. **Text output** begins (after reasoning + planning complete)
4. **Message complete** → ReasoningPanel auto-collapses

### Placement rationale

- ReasoningPanel ABOVE UnifiedProcessCard: matches cognitive order — thinking → planning/execution → output.
- Inside MessageBubble (scroll area): expand/collapse doesn't disturb fixed layout. No push on ChatInput.
- Separate from UnifiedProcessCard: they have different data sources and lifecycles. No reason to merge.

---

## ReasoningPanel Component

### File

`src/components/chat/ReasoningPanel.tsx` — in `src/components/chat/`, matching convention of `UnifiedProcessCard.tsx`, `ReasoningActivityPanel.tsx`.

### Technology

Radix UI `Collapsible` primitive (`@radix-ui/react-collapsible`, already installed `^1.1.12`). Same primitive used by `UnifiedProcessCard`. No new dependencies.

### Props

```typescript
interface ReasoningPanelProps {
  /** Cumulative reasoning text snapshot (max 800 chars, tail-kept). */
  reasoningText: string
  /** True while model is actively reasoning. Drives auto-open. */
  isReasoning: boolean
  /** Duration in seconds after reasoning completes. */
  durationSeconds?: number
  /** Steps data for narrativeHeadline priority chain fallback. */
  reasoningSteps?: ReasoningTraceStep[]
  /** Trace mode for ReasoningActivityPanel. */
  reasoningTraceMode?: ReasoningTraceStatus
  /**
   * ReasoningActivityPanel open state.
   * Externally controlled by ChatWindow's activeSheet === "proses".
   * Must be threaded through MessageBubble, not made local —
   * ChatWindow coordinates sheet exclusivity (only one sheet open at a time).
   */
  isPanelOpen?: boolean
  onPanelOpenChange?: (open: boolean) => void
}
```

### Data source

**New prop threading required.** `MessageBubbleProps` (lines 151–197) currently has zero reasoning props. 4–6 new props must be added.

`activeReasoningState` in ChatWindow is **global** — it tracks the currently streaming message only. It must NOT be passed to all MessageBubble instances blindly, or historical messages would show stale reasoning panels.

**Scoping rule:** ReasoningPanel renders only on the last assistant message during active streaming. For completed messages, reasoning data comes from per-message persisted state (if available) or is absent.

```
ChatWindow.tsx:
  activeReasoningState (global, live streaming only)
    → .headline, .persistedDurationSeconds, .steps, .traceMode
    → passed ONLY to the last MessageBubble when streaming
    → MessageBubble → ReasoningPanel

  For historical messages:
    extractReasoningHeadline (lines 472–519) provides per-message
    persisted headline from reasoningTrace.headline fallback.
    This is the canonical source for completed messages.
```

**Two headline resolution chains exist in the codebase:**
1. `narrativeHeadline` useMemo in ChatProcessStatusBar (lines 68–97): priority chain over live props (reasoningHeadline → step labels → step thoughts).
2. `extractReasoningHeadline` in ChatWindow.tsx (lines 472–519): includes persistence fallback from `reasoningTrace.headline`.

**Decision:** Move `narrativeHeadline` priority logic into ReasoningPanel (it operates on props the panel already receives). For historical messages, `extractReasoningHeadline` provides the persisted headline — ChatWindow resolves this before passing to MessageBubble.

### Rendering

**Content rendering**: Plain text with `whitespace-pre-wrap`. No Streamdown, no markdown renderer. Reasoning text arrives already markdown-stripped by `reasoning-sanitizer.ts` server-side.

```tsx
<Collapsible open={isOpen} onOpenChange={setIsOpen}>
  <CollapsibleTrigger>
    {/* Trigger row: chevron + status text */}
  </CollapsibleTrigger>
  <CollapsibleContent>
    <div
      ref={contentRef}
      className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm"
    >
      {reasoningText}
    </div>
  </CollapsibleContent>
</Collapsible>
```

### States

#### Streaming state (`isReasoning === true`)

```
┌─────────────────────────────────────────────────────┐
│ ▼ Thinking...                                       │
├─────────────────────────────────────────────────────┤
│ Analyzing the topic. I'm focused on the key         │
│ research question about LLM impact on critical      │
│ thinking in elementary students.                    │
│                                                     │
│ Now I need to frame the abstract around the         │
│ problem, methodology, and implications...█          │
└─────────────────────────────────────────────────────┘
```

- Panel auto-opens when `isReasoning` transitions to `true`
- Text grows naturally as server sends cumulative snapshots
- Auto-scroll to bottom while streaming
- User can manually close; manual close is respected (no forced re-open)

#### Completed state (`isReasoning === false`, message complete)

```
┌─────────────────────────────────────────────────────┐
│ ▶ Thought for 3s — Analyzing the research question  │
│   about LLM impact...                        Detail →│
└─────────────────────────────────────────────────────┘
```

- Panel auto-collapses when message status reaches `ready` (full message complete)
- Trigger shows: duration + first sentence preview (truncated)
- "Detail →" opens `ReasoningActivityPanel` (existing drill-down timeline)
- User can re-expand to see full reasoning text

### Auto-behavior

| Event | Action |
|-------|--------|
| `isReasoning` → `true` | Auto-open panel (unless user manually closed) |
| Message status → `ready` | Auto-collapse after ~1s delay |
| User clicks trigger | Manual toggle, always respected |
| User scrolls up in panel | Pause auto-scroll |
| User scrolls back to bottom | Resume auto-scroll |

Implementation: track `hasUserClosed` via ref. If user manually closes during streaming, don't re-open. Reset `hasUserClosed` on new message/streaming session.

### Scroll behavior

- `max-h-40` (160px, ~8 lines) — same on desktop and mobile. On mobile (667px viewport) this is ~24% of screen, reasonable.
- `overflow-y: auto` for internal scrolling.
- Auto-scroll to bottom during streaming via `scrollTop = scrollHeight` on content update.
- Pause auto-scroll when user scrolls up (detect via `scrollTop + clientHeight < scrollHeight - threshold`).
- Resume when user scrolls back to near-bottom.

---

## ChatProcessStatusBar Changes

### What stays

- Teal progress bar with shimmer animation
- Percentage display
- ThinkingDots animation

### What's removed

- Reasoning text display (`narrativeHeadline`, `displayText`, truncated `<span>`)
- `useTypewriterText` import and usage
- Completed mode (duration + expandable headline + "Detail →" button) — moves to ReasoningPanel
- `ReasoningActivityPanel` trigger + rendering — moves to ReasoningPanel
- `reasoningTraceMode` prop (currently unused, prefixed `_reasoningTraceMode` at line 44)
- `narrativeHeadline` useMemo (lines 68–97) — logic moves to ReasoningPanel

### Guard changes

```diff
# ChatWindow.tsx — render site
- visible={processUi.visible && !effectivePaperUiMode}
+ visible={processUi.visible}

# ChatProcessStatusBar.tsx — shouldShow guard (line 101-102)
# Current: const shouldShow = isProcessing || Boolean(narrativeHeadline) || (visible && reasoningSteps.length > 0) || isPanelOpenValue
# After strip: simplify to just isProcessing check
- const shouldShow = isProcessing || Boolean(narrativeHeadline) || (visible && reasoningSteps.length > 0) || isPanelOpenValue
+ const shouldShow = isProcessing
```

Remove `!effectivePaperUiMode` so progress bar is visible in paper mode (which is all modes). Simplify `shouldShow` — reasoning-related conditions no longer apply to this component.

### Result

Component shrinks from ~242 lines to ~40-50 lines. Becomes a pure streaming progress indicator. Rename to `StreamingProgressBar` is optional and out of scope.

---

## File Map

### Create

| File | Purpose |
|------|---------|
| `src/components/chat/ReasoningPanel.tsx` | Collapsible reasoning panel with auto-open/close, scroll, completed state |

### Modify

| File | Change |
|------|--------|
| `src/components/chat/ChatProcessStatusBar.tsx` | Strip reasoning text, completed mode, ReasoningActivityPanel trigger. Keep teal bar + percentage + dots only. |
| `src/components/chat/ChatWindow.tsx` | Remove `!effectivePaperUiMode` guard on ChatProcessStatusBar (line 3468). Pass reasoning props to MessageBubble at render site (lines 3321–3364) — scoped to last message only during streaming. For historical messages, use `extractReasoningHeadline` (lines 472–519) for persisted headline. |
| `src/components/chat/MessageBubble.tsx` | Add 4–6 reasoning props to `MessageBubbleProps` (lines 151–197). Render `<ReasoningPanel>` at insertion point (between lines 1503–1505, above `showUnifiedCard` block). Receive reasoning props from ChatWindow. |
| `src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx` | Update test selectors — `.truncate .truncate` query (line 66) will break. Update to match new stripped structure. |
| `src/app/globals-new.css` | Add collapsible panel animations for ReasoningPanel. Ensure `prefers-reduced-motion` covers them. |

### Remove

| File | Reason |
|------|--------|
| `src/components/chat/useTypewriterText.ts` | No longer needed — reasoning text rendered directly |
| `src/components/chat/useTypewriterText.test.ts` | 14 tests for removed hook. Must delete alongside hook. |

### Verify (no changes expected)

| File | Verify |
|------|--------|
| `src/lib/ai/reasoning-sanitizer.ts` | 800-char cap unchanged. Markdown stripping still compatible. |
| `src/lib/ai/reasoning-live-stream.ts` | Server-side throttle unchanged. |
| `src/components/chat/ReasoningActivityPanel.tsx` | No code changes needed. `open`/`onOpenChange` interface unchanged. Now rendered inside ReasoningPanel instead of ChatProcessStatusBar. Sheet coordination (only one sheet open at a time) stays in ChatWindow via `activeSheet` — threaded through MessageBubble as `isPanelOpen`/`onPanelOpenChange` props. |

---

## Constraints

- **No server-side changes.** 800-char cap stays. Throttle stays.
- **No new dependencies.** Radix Collapsible already installed. Icons from iconoir-react (already installed). Plain text rendering — no Streamdown.
- **Must preserve `narrativeHeadline` priority chain** — multi-source fallback (reasoningHeadline → step labels → step thoughts) must work in new location.
- **Must preserve `ReasoningActivityPanel`** — separate feature, just re-wired to trigger from ReasoningPanel.
- **Must respect `prefers-reduced-motion`** — panel animations disabled when preference active.
- **UnifiedProcessCard untouched** — no changes to existing component.

---

## Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Inline in `ReasoningPanel.tsx`, no `ai-elements/` abstraction | YAGNI — 1 consumer. Radix Collapsible is sufficient primitive. |
| 2 | Placement: inside MessageBubble, above UnifiedProcessCard | Cognitive order: think → plan → output. Inside scroll area = no layout disruption. |
| 3 | Separate from UnifiedProcessCard | Different data sources, different lifecycles. Mutually exclusive rendering not needed — they coexist. |
| 4 | Auto-collapse on message complete, not on reasoning end | Don't interrupt reading mid-stream. Panel is in scroll area, not blocking. |
| 5 | Completed trigger: duration + first-sentence preview | Glanceable context without expanding. "Detail →" for full drill-down. |
| 6 | `max-h-40` (160px) + smart auto-scroll | ~8 lines, ~24% mobile viewport. Pause on user scroll-up. |
| 7 | Keep 800-char server cap | Full utilization at 160px panel. No server changes. Full trace in ReasoningActivityPanel. |
| 8 | Strip ChatProcessStatusBar to bar + percentage + dots | Clean separation: progress = fixed indicator, reasoning = inline panel. |
| 9 | Remove `!effectivePaperUiMode` guard | All sessions are paper sessions. Guard made progress bar invisible. |
| 10 | Plain text rendering (`whitespace-pre-wrap`) | Markdown already stripped server-side. No Streamdown (not installed, redundant). |
