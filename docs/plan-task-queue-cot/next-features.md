# Next Features (Post Plan/Task/Queue/CoT)

> Ideas identified during design that are out of scope for the current implementation
> but worth revisiting after Phases 1-7 are stable.

---

## Checkpoint — Stage Transition Markers in Chat

**Reference:** https://elements.ai-sdk.dev/components/checkpoint

**Problem:** Stage transitions in the chat are currently invisible. When a user
approves a stage and the model moves to the next one, there is no visual break
in the conversation. In long sessions this makes it hard to find where one stage
ended and the next began.

**Proposed solution:** A Checkpoint-style visual separator at each stage transition:

```
... gagasan discussion ...
[User approves stage]

────── ◆ Stage 2: Penentuan Topik ──────

Model: Berdasarkan gagasan yang disepakati...
```

**Components (from AI Elements):**
- `Checkpoint` — root container with separator line
- `CheckpointIcon` — visual marker (default: BookmarkIcon)
- `CheckpointTrigger` — button to restore conversation state (variant: ghost, size: sm)

**Data structure:**
```typescript
type CheckpointType = {
  id: string
  messageIndex: number
  timestamp: Date
  messageCount: number
}
```

**Existing infrastructure that supports this:**
- `validatedAt` timestamp per stage — natural checkpoint moments
- `isMessageInCurrentStage()` in `usePaperSession.ts` — already determines stage boundaries
- `currentStageStartIndex` already passed to MessageBubble — knows where current stage begins

**Why deferred:** Rewind already works at the data layer via `paperSessions.rewindToStage`.
Checkpoint adds visual clarity but no new capability. Current scope is visibility
(plan/task/queue/CoT), not navigation.
