# Refactor Plan: ChainOfThought as Universal Indicator Wrapper

> Replaces the dual-system approach (old indicators + new CoT) with a single unified system.
> ChainOfThought becomes a collapsible wrapper around existing ToolStateIndicator and
> SearchStatusIndicator for ALL modes — paper and non-paper.

---

## Problem

Current implementation has two separate systems:
1. Old indicators (ToolStateIndicator + SearchStatusIndicator) — hidden in paper mode via `!isPaperMode`
2. New ChainOfThought — re-extracts same data, fails during streaming, disappears after completion

This causes:
- No indicators during streaming in paper mode
- ChainOfThought disappears after response completes
- TaskProgress only on last message (old messages lose it)
- Indicators invisible in paper mode because Phase 5 guard hides them

## Solution

**ChainOfThought becomes a collapsible wrapper** that renders existing indicator
components as children. It does NOT re-extract data — it wraps the same JSX.

```
ALL MODES (paper + non-paper):
  ChainOfThought (collapsible "Chain of Thought" header)
  └── ToolStateIndicator (existing, unchanged)
  └── SearchStatusIndicator (existing, unchanged)
  └── Fallback indicator (existing, unchanged)

PAPER MODE ONLY (additional, above ChainOfThought):
  TaskProgress (collapsible task checklist)
```

---

## Files to Change

### 1. `src/components/chat/ChainOfThought.tsx` — REWRITE

**Remove:** All data-extraction logic (mapSearchStatusToStep, TOOL_LABELS, extractDomains,
mapToolStateToStepStatus, getToolLabel, STEP_ICON, SearchStatus interface, StepStatus type)

**Keep:** Collapsible wrapper structure (header with "Chain of Thought" label)

**New interface:**
```typescript
interface ChainOfThoughtProps {
  children: React.ReactNode
  defaultOpen?: boolean
}
```

**New behavior:**
- Renders a Collapsible with "ⓘ Chain of Thought" header
- Children are the existing indicator components (passed from MessageBubble)
- No internal null-check — visibility controlled by `shouldShowProcessIndicators` guard in MessageBubble
  (React.Children.count is unreliable when children return null at render time)
- No data extraction, no state mapping, no domain badges — just a wrapper
- `defaultOpen` for streaming state (open while indicators are active)

### 2. `src/components/chat/MessageBubble.tsx` — RESTRUCTURE render block

**Remove:**
- `isLastAssistantMessage` useMemo (lines 227-237) — no longer needed
- The separate paper-mode block (lines 946-964) — merged into unified block
- The `!isPaperMode` guard on Process Indicators (line 967) — removed

**Replace both blocks (946-1002) with ONE unified block:**

```tsx
{/* TaskProgress — paper mode only, all assistant messages */}
{isPaperMode && isAssistant && taskSummary && (
    <div className="mb-3">
        <TaskProgress
            stageId={taskSummary.stageId}
            stageLabel={taskSummary.stageLabel}
            tasks={taskSummary.tasks}
            completed={taskSummary.completed}
            total={taskSummary.total}
        />
    </div>
)}

{/* Process Indicators — ALL modes, wrapped in ChainOfThought */}
{shouldShowProcessIndicators && (
    <ChainOfThought defaultOpen={persistProcessIndicators}>
        {nonSearchTools.map((tool, index) => (
            <ToolStateIndicator
                key={`tool-${index}`}
                toolName={tool.toolName}
                state={tool.state}
                errorText={tool.errorText}
                persistUntilDone={persistProcessIndicators}
            />
        ))}
        {(persistProcessIndicators || searchStatus?.status === "error") && searchStatus && (
            <SearchStatusIndicator
                status={searchStatus.status}
                message={searchStatus.message}
                sourceCount={searchStatus.sourceCount}
            />
        )}
        {searchTools.map((tool, index) => (
            <ToolStateIndicator
                key={`search-tool-${index}`}
                toolName={tool.toolName}
                state={tool.state}
                errorText={tool.errorText}
                persistUntilDone={persistProcessIndicators}
            />
        ))}
        {showFallbackProcessIndicator && (
            <ToolStateIndicator
                toolName="assistant_response"
                state="input-available"
                persistUntilDone
            />
        )}
    </ChainOfThought>
)}
```

**Key points:**
- TaskProgress: paper mode only, ALL assistant messages (not just last)
- ChainOfThought: ALL modes, wraps existing indicators EXACTLY as they were
- `shouldShowProcessIndicators` guard unchanged — same visibility logic
- `persistProcessIndicators` passed as `defaultOpen` to ChainOfThought
- Children are the EXACT same JSX from the old Process Indicators block
- No `!isPaperMode` gate — universal

### 3. Files NOT changed

| File | Why unchanged |
|------|---------------|
| `ToolStateIndicator.tsx` | Existing component, renders inside ChainOfThought as child |
| `SearchStatusIndicator.tsx` | Existing component, renders inside ChainOfThought as child |
| `ChatWindow.tsx` | Already passes all needed props (persistProcessIndicators, currentStage) |
| `ChatSidebar.tsx` | Sidebar unchanged |
| `SidebarQueueProgress.tsx` | Sidebar unchanged |
| `task-derivation.ts` | Logic unchanged |
| `paper-mode-prompt.ts` | System prompt unchanged |
| `TaskProgress.tsx` | Component unchanged |

---

## What This Fixes

| Previous anomaly | How this fixes it |
|-----------------|-------------------|
| No indicators during streaming | Existing indicators already work during streaming — now wrapped in CoT |
| ChainOfThought disappears after completion | Indicators handle their own visibility via `persistUntilDone` — no separate null guard |
| TaskProgress only on last message | Removed `isLastAssistantMessage` — shows on all paper mode messages |
| All TaskProgress cards update simultaneously | Accepted trade-off — sidebar shows authoritative progress, chat shows current state |
| No indicators in paper mode | Removed `!isPaperMode` gate — ChainOfThought wrapper applies universally |
| Non-paper mode loses indicators | No change — same indicators, just wrapped in collapsible |

---

## Verification

- [ ] Paper mode streaming: ToolStateIndicator visible inside ChainOfThought during stream
- [ ] Paper mode complete: indicators persist correctly per existing logic
- [ ] Paper mode: TaskProgress visible on ALL assistant messages
- [ ] Non-paper mode streaming: indicators visible inside ChainOfThought
- [ ] Non-paper mode complete: same behavior as before (indicators hide/show per existing logic)
- [ ] ChainOfThought collapsible works (expand/collapse)
- [ ] Three-dot loader still visible (independent of ChainOfThought)
- [ ] Sidebar progress still works
- [ ] Typecheck passes
- [ ] Unit tests pass
