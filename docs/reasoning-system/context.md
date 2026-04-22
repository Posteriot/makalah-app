# Context: Reasoning Bar → Expandable Panel

> Compiled from parallel research agents, 2026-04-22.
> Source: handoff doc, codebase verification, AI SDK documentation study.

---

## 1. Problem Statement

The current single-line reasoning bar in `ChatProcessStatusBar.tsx` fails to convey the model's thinking process. Three confirmed issues:

### 1.1 Text Changes Are Invisible
- CSS `truncate` class on both the outer flex container and inner `<span>` (lines 123–128) applies `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- Only the first ~60-80 characters are visible
- Reasoning text grows at the END of the string — all new content lands off-screen
- Users perceive static text even though the content actively updates

### 1.2 Typewriter Effect Is Ineffective
- `useTypewriterText.ts` does NO animation — it calls `setDisplayedText` directly in a `useEffect` (lines 49–53)
- The hook extracts only the last sentence via `splitSentences` regex, discarding context
- Gemini emits entire paragraphs per snapshot (~160ms throttle), not word-by-word
- The "typewriter" name is misleading; the hook is a direct state setter with sentence extraction
- Dead code: `wasInactive` (line 34) is assigned but never read

### 1.3 One Line Cannot Convey Reasoning
- Model reasoning is multi-sentence, multi-paragraph
- Truncating to a single line loses all informational value
- The fragment shown has no meaningful context

---

## 2. Current Architecture

### 2.1 Data Flow (Server → UI)

```
Server: reasoningAccumulator.onReasoningDelta(delta)
  → throttled (160ms / 48 chars): emits ReasoningLiveDataPart
    { type: "data-reasoning-live", data: { text: CUMULATIVE_SNAPSHOT } }

Client: useChat() → UIMessage.parts[] → data-reasoning-live
  → ChatWindow.tsx: resolveLiveReasoningHeadline() (defined line 388, called line 2012)
    walks parts for last non-empty "data-reasoning-live" text
    fallback: "data-reasoning-thought" parts (lines 413–427)
    NOTE: data-reasoning-thought is actively emitted server-side (not just legacy):
      - ChatWindow.tsx line 1689 (rehydration)
      - web-search/orchestrator.ts line 800 (compat emit)
      - chat-harness/executor/build-step-stream.ts line 67 (compat emit)
  → activeReasoningState.headline (cumulative snapshot, max 800 chars)
  → ChatProcessStatusBar: reasoningHeadline prop (line 3474)
  → narrativeHeadline useMemo (lines 68–97): multi-source priority chain:
    1. raw reasoningHeadline prop (if non-empty)
    2. running step label (from reasoningSteps)
    3. step thought (from reasoningSteps)
    4. any step with content
    NOTE: The collapsible replacement MUST preserve this priority logic.
  → useTypewriterText(narrativeHeadline, isProcessing): extracts last sentence
  → displayText → <span className="truncate">{displayText}</span>
```

**No server changes required.** The cumulative snapshot from `activeReasoningState.headline` is sufficient — only the display layer needs to change.

### 2.2 Key Files & Current State

| File | Role | Current State |
|------|------|---------------|
| `src/components/chat/ChatProcessStatusBar.tsx` (lines 36–213) | Main reasoning bar component | Processing mode: single truncated `<span>` + ThinkingDots + teal progress bar. Completed mode: duration + expandable headline + "Detail →" button. |
| `src/components/chat/useTypewriterText.ts` (lines 1–57) | Hook that extracts last sentence | No animation, direct `setDisplayedText`. Dead code (`wasInactive`). Active/inactive paths produce same output. |
| `src/components/chat/ChatWindow.tsx` | Data source | `activeReasoningState` built at lines 2008–2032. `resolveLiveReasoningHeadline` (line 388) with fallback to `data-reasoning-thought` (lines 413–427). |
| `src/lib/ai/reasoning-sanitizer.ts` | Markdown stripping + snapshot cap | `sanitizeReasoningSnapshot` caps at 800 chars, `keepTail: true` (line 70). |
| `src/lib/ai/reasoning-live-stream.ts` | Server-side throttle | 160ms / 48-char throttle for snapshot emission. |
| `src/components/chat/ReasoningActivityPanel.tsx` | Step-by-step drill-down timeline | Separate feature. Sheet-based panel (right on desktop, bottom drawer on mobile). Do NOT touch. |
| `src/app/globals-new.css` (lines 1286–1465) | CSS animations | `chat-thought-dot`, `chat-progress-fill-shimmer` animations. `prefers-reduced-motion` block at line 1447 sets `animation: none` (disables entirely, not zero duration). |

### 2.3 What Works (Do Not Break)

- **Flicker fix**: `isProcessing` guard in `shouldShow` — keeps bar mounted during streaming
- **Flicker fix**: streaming guard on `persistedDurationSeconds` effect
- **Completed mode**: duration display + expandable headline + "Detail →" button
- **CSS crossfade**: transition from processing → completed state
- **Markdown sanitization**: `reasoning-sanitizer.ts` strip logic
- **ReasoningActivityPanel**: step-by-step drill-down (separate feature)
- **Progress bar + percentage**: provides streaming context
- **`prefers-reduced-motion`**: accessibility compliance in `globals-new.css` (sets `animation: none`, not zero duration)
- **`narrativeHeadline` priority chain**: multi-source useMemo (lines 68–97) that falls back through reasoningHeadline → step labels → step thoughts

---

## 3. Proposed Solution

### 3.1 Core Change

Replace the truncated single-line `<span>` with a **collapsible panel** using the Radix UI Collapsible primitive, following the AI SDK Elements Reasoning component architecture.

**Before:**
```
[Analyzing the topic I'm focused on...                    ...8%]
[████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]
```

**After:**
```
[▼ Thinking...                                            8%]
[████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]
┌─────────────────────────────────────────────────────────────┐
│ Analyzing the topic. I'm focused on the key research       │
│ question about LLM impact on critical thinking in          │
│ elementary students.                                       │
│                                                            │
│ Now I need to frame the abstract around the problem,       │
│ methodology, and implications as the user selected...█     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Behavioral Requirements

| Behavior | Description |
|----------|-------------|
| **Auto-open on streaming start** | Panel expands automatically when reasoning begins streaming |
| **Natural text growth** | Render cumulative `reasoningText` directly — no typewriter animation. Visual "streaming" comes from text growing as server sends chunks. |
| **Auto-close on streaming end** | Panel collapses ~1s after model starts generating text output |
| **Manual toggle** | User can open/close anytime via trigger button |
| **Max-height with scroll** | Panel has max-height constraint; auto-scrolls to bottom as text grows |
| **Context-aware trigger** | Shows "Thinking..." during streaming; shows "Thought for Xs" after completion |

### 3.3 What to Remove

- **`useTypewriterText.ts`** — entire hook. Render cumulative snapshot directly.
- **Sentence splitting logic** — no parsing needed when showing full text.
- **Truncated `<span>`** in processing mode — replaced by collapsible panel.

### 3.4 What to Keep

- Progress bar + percentage display
- Completed mode UX (duration + Detail button)
- All flicker-prevention guards
- CSS crossfade transitions
- `reasoning-sanitizer.ts` (markdown stripping)

---

## 4. AI SDK Reasoning Component Reference

### 4.1 Component Structure

```tsx
<Reasoning isStreaming={isReasoningStreaming}>
  <ReasoningTrigger />
  <ReasoningContent>{reasoningText}</ReasoningContent>
</Reasoning>
```

### 4.2 Props & Types

**Reasoning (root)**:
```typescript
type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;       // Controls auto-open/close behavior. Default: false
  open?: boolean;              // Controlled open state
  defaultOpen?: boolean;       // Default: follows isStreaming
  onOpenChange?: (open: boolean) => void;
  duration?: number;           // Duration in seconds (auto-computed during streaming)
}
```

**ReasoningTrigger**:
```typescript
type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  getThinkingMessage?: (isStreaming: boolean, duration?: number) => ReactNode;
}
```

**ReasoningContent**:
```typescript
type ReasoningContentProps = ComponentProps<typeof CollapsibleContent> & {
  children: string;  // Reasoning text, rendered as plain text (whitespace-pre-wrap)
}
```

**useReasoning hook**:
```typescript
interface ReasoningContextValue {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number | undefined;
}
```

### 4.3 Auto-behavior Constants

- `AUTO_CLOSE_DELAY = 1000` — 1 second delay before auto-closing after streaming ends
- Duration computed from streaming start to streaming end (ceiling-ed to seconds)

### 4.4 Key Implementation Details

- Uses `useControllableState` from Radix UI for both `isOpen` and `duration`
- Tracks streaming state across re-renders via refs (`hasEverStreamedRef`, `startTimeRef`)
- One-time auto-close: tracked by `hasAutoClosed` state — only fires once per streaming session
- Components wrapped with `memo()` for performance
- All components set `displayName` for debugging

### 4.5 Frontend Integration Pattern

> **IMPORTANT: Adaptation Required.** The AI SDK reference uses `part.type === "reasoning"` which does NOT exist in this codebase. Our custom part types are `"data-reasoning-live"` and `"data-reasoning-thought"`. The pattern below is the AI SDK original — do NOT copy verbatim. Our integration point is `narrativeHeadline` (already resolved by ChatWindow.tsx), not raw message parts.

```tsx
// AI SDK REFERENCE PATTERN (not directly usable in our codebase):
const reasoningParts = message.parts.filter((part) => part.type === "reasoning");
const reasoningText = reasoningParts.map((part) => part.text).join("\n\n");

// OUR CODEBASE: reasoning text arrives as `narrativeHeadline` prop
// (derived from reasoningHeadline → narrativeHeadline useMemo priority chain)
// isProcessing maps to the AI SDK's isStreaming prop
```

### 4.6 Dependencies

| Dependency | Status in Codebase | Purpose |
|-----------|-------------------|---------|
| `@radix-ui/react-collapsible` | **INSTALLED** (package.json line 34, `^1.1.12`) | Collapsible primitive (via shadcn/ui) |
| `@radix-ui/react-use-controllable-state` | **TRANSITIVE ONLY** — available via `@radix-ui/react-collapsible` but NOT a direct dependency. Do not import directly; use Collapsible's built-in state management instead. | State management for open/duration |
| `streamdown` + plugins | **NOT INSTALLED. NOT AVAILABLE.** Zero references in codebase. Additionally, `reasoning-sanitizer.ts` already strips markdown server-side before text reaches the client — Streamdown rendering would be redundant. | Markdown rendering in content area |
| `lucide-react` | **NOT INSTALLED.** Codebase uses `iconoir-react` (package.json line 64). Use `iconoir-react` equivalents instead. | Icons |

> **Rendering Strategy Decision:** Since `streamdown` is not available and markdown is already stripped server-side, `ReasoningContent` should render plain text with `whitespace-pre-wrap` styling. This is simpler and avoids adding heavy dependencies for content that arrives as plain text anyway.

---

## 5. Implementation File Map

### 5.1 Files to Create

| File | Purpose |
|------|---------|
| `src/components/ai-elements/reasoning/index.tsx` | Reasoning root component + context + useReasoning hook |
| `src/components/ai-elements/reasoning/trigger.tsx` | ReasoningTrigger subcomponent |
| `src/components/ai-elements/reasoning/content.tsx` | ReasoningContent subcomponent (plain text with whitespace-pre-wrap) |
| `src/components/ai-elements/reasoning/index.ts` | Barrel export |

### 5.2 Files to Modify

| File | Change |
|------|--------|
| `src/components/chat/ChatProcessStatusBar.tsx` | Replace truncated `<span>` in processing mode with `<Reasoning>` component. Keep progress bar, percentage, completed mode. |
| `src/app/globals-new.css` | Add collapsible panel animations. Ensure `prefers-reduced-motion` covers new animations. |
| `src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx` | Line 66 queries `.truncate .truncate` DOM structure — this selector will return null after the truncated span is replaced. Must update test selectors. |

### 5.3 Files to Remove

| File | Reason |
|------|--------|
| `src/components/chat/useTypewriterText.ts` | No longer needed — render cumulative snapshot directly |
| `src/components/chat/useTypewriterText.test.ts` | Test file for removed hook (14 tests). Must be deleted alongside the hook or build/test will fail. |

### 5.4 Files to Verify (No Changes Expected)

| File | Verify What |
|------|-------------|
| `src/components/chat/ChatWindow.tsx` | `activeReasoningState` data flow unchanged. `reasoningHeadline` prop still passed correctly. |
| `src/lib/ai/reasoning-sanitizer.ts` | Markdown stripping still compatible. 800-char cap still appropriate. |
| `src/components/chat/ReasoningActivityPanel.tsx` | No interference with existing drill-down panel. |
| `src/lib/ai/reasoning-live-stream.ts` | Server-side throttle unchanged. |

---

## 6. Constraints & Risks

### 6.1 Hard Constraints

- Must not interfere with chat message scroll area
- Must work on mobile (responsive design)
- Must respect `prefers-reduced-motion` CSS preference
- Must maintain existing completed mode UX (duration + Detail button)
- Must preserve ReasoningActivityPanel as separate feature
- No server-side changes

### 6.2 Identified Risks

| Risk | Mitigation |
|------|-----------|
| **800-char server cap** in `reasoning-sanitizer.ts` limits panel content to tail ~800 chars. For long reasoning sessions, user won't see full history. | Evaluate if cap needs raising for panel display. Or accept that panel shows recent reasoning window. |
| **Long reasoning text on mobile** could consume too much screen space. Current component has NO mobile-specific code — inherits chat layout's responsive padding via `var(--chat-input-pad-x)`. Unlike `ReasoningActivityPanel` (which uses bottom drawer on mobile), the inline collapsible expands within the message area. | Set `max-height` with `overflow-y: auto` on content area. Test on mobile viewports — this is untested territory. |
| **Performance with large text rendering** | Test with realistic reasoning lengths. Plain text with `whitespace-pre-wrap` is lightweight; no heavy rendering deps needed. |
| **Removing `useTypewriterText`** — only one runtime consumer (ChatProcessStatusBar.tsx). CONFIRMED safe. | Delete both `useTypewriterText.ts` and `useTypewriterText.test.ts` together. |
| **Test file `ChatProcessStatusBar.transparent-mode.test.tsx`** queries `.truncate .truncate` DOM (line 66) | Must update test selectors to match new collapsible structure. |
| **`extractLiveReasoningSnapshot`** (ChatWindow.tsx line 366) may be unused duplicate of `resolveLiveReasoningHeadline` | Verify no other callers before cleanup |
| **Fallback path `data-reasoning-thought`** (ChatWindow.tsx lines 413–427) | Must be preserved in any data flow changes |
| **Styling conflicts** between existing CSS and Radix Collapsible | Use `cn()` utility, test thoroughly |

### 6.3 Dependency Status (Verified)

| Dependency | Status | Action |
|-----------|--------|--------|
| `@radix-ui/react-collapsible` | **INSTALLED** (`^1.1.12`) | Ready to use |
| `@radix-ui/react-use-controllable-state` | **TRANSITIVE ONLY** | Do NOT import directly. Use Collapsible's built-in state or React's own `useState`. |
| `streamdown` + plugins | **NOT INSTALLED** | Not needed. Markdown already stripped server-side. Use plain text rendering. |
| `lucide-react` | **NOT INSTALLED** | Use `iconoir-react` (already installed) for icons instead. |

### 6.4 State Mapping (AI SDK → Our Codebase)

| AI SDK Concept | Our Codebase Equivalent | Notes |
|---------------|------------------------|-------|
| `isStreaming` | `isProcessing` (line 54: `status === "submitted" \|\| status === "streaming"`) | Direct mapping |
| `message.parts.filter(p => p.type === "reasoning")` | `narrativeHeadline` (already resolved by ChatWindow.tsx → ChatProcessStatusBar) | Do NOT access raw parts; use the prop |
| `duration` | `persistedDurationSeconds` (existing in ChatProcessStatusBar) | Already computed |

### 6.5 `extractLiveReasoningSnapshot` (ChatWindow.tsx line 366)

Dead application code — exported but only called in test file `ChatWindow.reasoning-live.test.ts`. Not used in runtime. Can be cleaned up separately but not part of this work scope.
