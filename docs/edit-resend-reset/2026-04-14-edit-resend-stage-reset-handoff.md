# Edit+Resend Should Reset Stage to Drafting

## Problem

When user performs "edit last prompt + resend" during paper workflow, the backend treats it as a revision of the existing stage — not a fresh start. This creates a UX mismatch:

- **User expectation:** "I'm retrying from scratch, give me a new result"
- **Actual behavior:** Model runs revision chain (requestRevision → updateArtifact → submitStageForValidation) on the existing artifact instead of creating a fresh one

## Observed Evidence

During stage 8 (hasil) testing on 2026-04-14:

1. First attempt failed — model wrote tool calls as text (tool call leak), artifact not created
2. Retry via approve worked — artifact created, `pending_validation` set
3. User did edit+resend expecting fresh choice card flow
4. Instead, model saw `stageStatus: revision`, `hasCurrentArtifact: true` and ran revision chain directly

Terminal log from retry:
```
[F1-F6-TEST] PaperPrompt { stage: 'hasil', status: 'revision', hasCurrentArtifact: true }
[REVISION][chain-enforcer] step=0 status=revision → required
[REVISION][chain-enforcer] step=1 prev=updateStageData → required
[REVISION][chain-enforcer] step=2 prev=updateArtifact → submitStageForValidation
```

## Root Cause

`editAndTruncateConversation` (AI SDK) truncates chat message history, but **Convex paperSession state is not affected**:

- `stageStatus` stays at whatever it was (`revision`, `pending_validation`)
- Existing artifact remains in `artifacts` table
- `stageData` for the stage persists

So from the backend's perspective, this is a continuation of the same stage — not a fresh start.

## Desired Behavior

When edit+resend happens in paper mode:

1. Detect that the user truncated conversation history at a point before the current stage's artifact was created
2. Reset `stageStatus` back to `drafting`
3. Model should treat this as a fresh draft — present choice card, create new artifact (not updateArtifact)
4. Previous artifact can remain in DB (for version history) but should not be treated as "current"

## Implementation Considerations

### Option A: Client-Side Reset on Truncate

In `ChatWindow.tsx` or the edit handler, when `editAndTruncateConversation` is called:
- Check if the truncation point is before the message that triggered artifact creation for the current stage
- If yes, call a new mutation (e.g., `paperSessions.resetStageToDrafting`) that sets `stageStatus: "drafting"` and clears `hasCurrentArtifact` indicators

**Pros:** Explicit, deterministic
**Cons:** Needs to determine "which message created the artifact" — non-trivial mapping

### Option B: Server-Side Detection in Prompt Builder

In `paperPrompt` builder, detect that message history no longer contains the artifact creation event for the current stage:
- If `stageStatus !== "drafting"` but no message in history contains `createArtifact` success for this stage → reset to drafting

**Pros:** Self-healing, no client changes
**Cons:** Expensive to scan message history; could have false positives

### Option C: Prompt-Level Override

Add instruction to system prompt: "If stageStatus is revision but conversation history shows no prior artifact discussion for this stage, treat as fresh drafting — use createArtifact, not updateArtifact."

**Pros:** Zero code change
**Cons:** Probabilistic — model may or may not follow

### Recommendation

**Option A** is the most reliable. The truncation point is known at edit time, and a targeted mutation is deterministic.

## Files Likely Involved

- `src/components/chat/ChatWindow.tsx` — edit+resend handler
- `convex/paperSessions.ts` — new mutation `resetStageToDrafting`
- `convex/messages.ts` — `editAndTruncateConversation` (may need to trigger stage reset)

## Priority

Low — this is a UX improvement, not a blocking bug. The workaround is to start a new conversation or approve/continue from the current state.

## Related Context

- Branch: `chat-naskah-pages-enforcement`
- Session: 2026-04-14 E2E testing stages 1-8
- The revision chain enforcer works correctly — it's doing exactly what it should given the session state. The issue is that session state should have been reset.
