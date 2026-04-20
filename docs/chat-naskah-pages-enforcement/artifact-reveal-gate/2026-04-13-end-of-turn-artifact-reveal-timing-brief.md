# End-of-Turn Artifact Reveal Timing Brief

## Purpose

This brief replaces the previous artifact reveal gate brief.

The previous brief overreached. It assumed the artifact panel could auto-open from live Convex artifact query changes during streaming. That diagnosis is **not supported by the code**.

This new brief targets the real problem more precisely:

- the artifact panel reveal happens at the **end of the assistant turn**
- but its visual timing can still appear earlier than the final bubble text completion
- this is likely an **end-of-turn render / paint timing issue**, not a streaming-time bypass

## Verified Diagnosis

### What is true

1. The only programmatic artifact-panel auto-open path is `onFinish` inside `useChat`.

Relevant code:

- [`src/components/chat/ChatWindow.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-naskah-pages-enforcement/src/components/chat/ChatWindow.tsx:967)

At the end of the turn:

- `extractCreatedArtifacts(message)` runs
- `onArtifactSelect(...)` is called for the newest created artifact

2. `ChatContainer` does **not** auto-open artifact tabs from Convex query refresh.

Relevant code:

- [`src/components/chat/ChatContainer.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-naskah-pages-enforcement/src/components/chat/ChatContainer.tsx:99)

The Convex artifact query effect only syncs titles for tabs that are **already open**.

3. `ArtifactPanel` is passive.

Relevant code:

- [`src/components/chat/ArtifactPanel.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-naskah-pages-enforcement/src/components/chat/ArtifactPanel.tsx)

There is no internal effect that auto-opens the panel from query updates.

4. AI SDK `onFinish` fires after stream consumption finishes.

Relevant dependency code:

- [`node_modules/ai/dist/index.mjs`](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-naskah-pages-enforcement/node_modules/ai/dist/index.mjs:13085)

Order is:

- `await consumeStream(...)`
- `setStatus("ready")`
- `onFinish(...)`

So this is **not** a case where the panel is opened while the stream is still logically active.

## Actual Problem Statement

The user-observed anomaly is still real:

- visually, the artifact panel can appear to open before the bubble text feels complete

But the likely mechanism is:

- final text chunks are already consumed internally
- `onFinish` fires immediately after consumption
- `onArtifactSelect(...)` opens the artifact panel in the same end-of-turn commit window
- React layout, Virtuoso list rendering, footer updates, validation UI, and panel opening compete visually in the final paint

This creates a **perception of premature panel reveal**, even though the panel is not opening during streaming.

## Non-Goals

This implementation must **not**:

- add a fake global artifact gate
- block or delay backend artifact creation
- block or delay `submitStageForValidation`
- treat Convex live artifact queries as the source of auto-open
- introduce stage-specific logic for `topik`, `hasil`, `daftar_pustaka`, or any other stage
- refactor `ChatContainer` or `ArtifactPanel` without direct evidence they are the cause

## Scope

This fix should be narrowly scoped to the **end-of-turn reveal timing** behavior.

Primary target:

- [`src/components/chat/ChatWindow.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-naskah-pages-enforcement/src/components/chat/ChatWindow.tsx)

Optional secondary targets only if needed for testability:

- `src/components/chat/__tests__/...`
- a small utility helper colocated with ChatWindow if needed

Do **not** widen scope without evidence.

## Recommended Fix Direction

Keep the current `onFinish`-based reveal model, but delay the actual UI artifact open by **one render boundary** so the final assistant bubble paint settles first.

Best implementation shape:

1. `onFinish` still detects the newest created artifact exactly as it does now.
2. Instead of opening immediately in the same synchronous callback body, schedule the reveal after the bubble has had one chance to paint.
3. Use a minimal, explicit end-of-turn reveal scheduler.

Recommended reveal scheduling order:

- first choice: `requestAnimationFrame`
- if needed, a second nested `requestAnimationFrame`

Reason:

- this gives the message list and final text render one browser paint opportunity before the panel changes layout
- it addresses the likely visual-order issue directly
- it does not alter backend correctness or logical turn ordering

## Why This Is Better Than the Old Brief

The old brief assumed there was a bypass from Convex artifact query updates.

There is no code evidence for that.

This brief instead targets the only real reveal point we can prove exists:

- `useChat.onFinish` in `ChatWindow`

That makes the patch:

- smaller
- more truthful
- easier to verify
- less likely to introduce regressions

## Required Behavior After Fix

For any artifact-producing assistant turn:

1. Backend tools may still create/update artifact immediately.
2. `onFinish` remains the only auto-open path.
3. The panel reveal must happen **after** final bubble text has had a chance to paint.
4. The user should perceive:
   - assistant text finishes
   - then artifact panel opens

This is a visual sequencing fix, not a lifecycle reorder.

## File-by-File Implementation Brief

### File 1

[`src/components/chat/ChatWindow.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-naskah-pages-enforcement/src/components/chat/ChatWindow.tsx)

What to change:

- keep `extractCreatedArtifacts(message)`
- keep `onFinish` as the trigger point
- replace direct synchronous `onArtifactSelect(...)` call with a small scheduled reveal

Recommended implementation pattern:

```tsx
const pendingRevealRafRef = useRef<number | null>(null)

const scheduleArtifactReveal = (artifactId: Id<"artifacts">) => {
  if (pendingRevealRafRef.current) {
    cancelAnimationFrame(pendingRevealRafRef.current)
  }

  pendingRevealRafRef.current = requestAnimationFrame(() => {
    pendingRevealRafRef.current = requestAnimationFrame(() => {
      onArtifactSelect?.(artifactId)
      pendingRevealRafRef.current = null
    })
  })
}
```

Then in `onFinish`:

- call `scheduleArtifactReveal(newestArtifactId)` instead of direct open

Also add cleanup:

- cancel pending RAF on unmount
- prevent stale reveal if conversation changes before RAF fires

Important:

- do not defer forever
- do not add timers longer than necessary
- do not move reveal to `useEffect` keyed by artifacts query

### File 2

Test file for `ChatWindow`

Use the existing chat test naming pattern in the repo.

What must be tested:

1. `onFinish` no longer calls `onArtifactSelect` synchronously in the same tick
2. artifact reveal happens after scheduled animation frame(s)
3. if no artifact is created, nothing is opened
4. if component unmounts before scheduled reveal, callback is not fired
5. if a newer reveal supersedes an older one in the same component lifetime, only the newest one wins

If the repo already mocks RAF globally, use that. Otherwise add a local deterministic RAF harness in the test.

## Invariants

Claude must keep all of these true:

1. `onFinish` remains the only programmatic auto-open path.
2. No new artifact-panel auto-open path is introduced in `ChatContainer`.
3. No change to backend tool ordering.
4. No change to Convex artifact persistence timing.
5. Manual artifact open still works immediately.
6. Deep-link artifact open still works immediately.
7. Reload / persisted artifact reconstruction remains unchanged.

## What Must Not Happen

Do **not** implement any of these:

- stage-specific conditions
- Convex-query-based reveal blocking
- new global pending reveal store in container
- delaying artifact creation until after prose
- delaying validation submission until after prose
- replacing `onFinish` with some polling or artifact query effect

Those would be solving the wrong problem.

## Test Plan

### Test Group 1: End-of-turn scheduling

Target:

- `ChatWindow` test file

Required tests:

1. `reveals artifact asynchronously after onFinish`
- simulate `onFinish` with a message containing successful `tool-createArtifact`
- assert `onArtifactSelect` not called immediately
- flush RAF once or twice depending on implementation
- assert `onArtifactSelect` called with correct artifact id

2. `does not reveal when no artifact exists in message`

3. `cancels pending reveal on unmount`

4. `keeps newest artifact if multiple tool outputs exist`

### Test Group 2: Regression boundaries

Target:

- whichever existing test file already covers artifact opening behavior

Required tests:

1. manual artifact opening still immediate
2. deep-link opening still immediate
3. no dependency on Convex artifact query timing for auto-open

## Verification Commands

Claude should run the narrowest relevant suite first.

Suggested minimum:

```bash
npm test -- --run src/components/chat/__tests__/ChatWindow*.test.tsx src/components/chat/__tests__/ChatContainer*.test.tsx
```

If there is no existing container test touched, keep the patch focused and run only the chat window test file plus any directly affected shared test file.

## Acceptance Criteria

The fix is acceptable only if:

1. There is still exactly one programmatic auto-open path: `onFinish`.
2. That auto-open is visually deferred by one render boundary.
3. The panel no longer appears to jump ahead of the final bubble text.
4. No container-level fake gate or Convex-query suppression is introduced.
5. Existing manual and deep-link artifact opening behaviors remain intact.
