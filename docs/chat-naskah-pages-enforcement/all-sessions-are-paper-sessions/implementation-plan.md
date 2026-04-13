# All Sessions Are Paper Sessions — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate dual-mode (chat/paper) architecture — every conversation auto-creates a paper session, removing ~250 lines of branching logic and an entire class of mode-boundary bugs.

**Architecture:** Surgical removal approach. Modify existing code paths one at a time: (1) auto-create paper session on conversation creation, (2) delete dual-mode detection files, (3) fix completed state to be navigable, (4) unlock full stage navigation in UI, (5) update paper mode prompt for completed awareness, (6) add lazy migration for existing conversations.

**Tech Stack:** Convex (backend mutations/queries), Next.js App Router (API route), React (UI components), Vitest (testing)

**Design doc:** `docs/chat-naskah-pages-enforcement/all-sessions-are-paper-sessions/design.md`

---

### Task 1: Auto-Create Paper Session in Conversation Creation

**Files:**
- Modify: `convex/conversations.ts:257-275` (createConversation mutation)
- Modify: `convex/paperSessions.ts:606-644` (create mutation — verify idempotency)
- Test: `convex/conversations.test.ts` (create new if doesn't exist)

**Step 1: Write the failing test**

Create `convex/conversations.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { createConversation } from "./conversations";

vi.mock("./authHelpers", () => ({
  requireAuthUserId: vi.fn(),
}));

// Mock paperSessions.create to verify it gets called
const mockPaperSessionCreate = vi.fn(async () => "paperSessions_1");

vi.mock("./paperSessions", () => ({
  create: { _handler: mockPaperSessionCreate },
}));

function makeMockCtx() {
  let insertedId = "conversations_1";
  return {
    ctx: {
      db: {
        insert: vi.fn(async (_table: string, _doc: Record<string, unknown>) => insertedId),
        query: vi.fn(() => ({
          withIndex: vi.fn(() => ({
            unique: vi.fn(async () => null),
          })),
        })),
      },
      // Convex internal scheduler if needed
    },
  };
}

describe("createConversation", () => {
  it("should create paper session after conversation insert", async () => {
    const { ctx } = makeMockCtx();
    const handler = (createConversation as unknown as {
      _handler: (ctx: unknown, args: Record<string, unknown>) => Promise<unknown>;
    })._handler;

    await handler(ctx, { userId: "users_1" });

    // Verify conversation was inserted
    expect(ctx.db.insert).toHaveBeenCalledWith("conversations", expect.objectContaining({
      userId: "users_1",
      title: "Percakapan baru",
    }));
  });
});
```

> Note: Exact mock structure depends on how Convex internal mutation-calling works. The test may need adjustment after seeing the actual invocation pattern. The key assertion: paper session creation is triggered with the new conversationId.

**Step 2: Run test to verify it fails**

Run: `npx vitest run convex/conversations.test.ts`
Expected: FAIL — test structure may need adjustment, but the point is to establish the test file.

**Step 3: Implement — add paper session creation to createConversation**

In `convex/conversations.ts:257-275`, modify the handler:

```typescript
handler: async (ctx, { userId, title }) => {
    await requireAuthUserId(ctx, userId)
    const now = Date.now()
    const conversationId = await ctx.db.insert("conversations", {
        userId,
        title: title ?? "Percakapan baru",
        titleUpdateCount: 0,
        titleLocked: false,
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
    })

    // Auto-create paper session — every conversation is a paper session
    await ctx.db.insert("paperSessions", {
        userId,
        conversationId,
        currentStage: "gagasan",
        stageStatus: "drafting",
        workingTitle: title ?? "Percakapan baru",
        stageData: {},
        createdAt: now,
        updatedAt: now,
    })

    return conversationId
},
```

> Important: Insert directly into `paperSessions` table (same transaction) rather than calling `paperSessions.create` mutation (can't call mutation from mutation in Convex). This is simpler and atomic.

**Step 4: Verify paper session schema**

Check `convex/schema.ts` for required fields on `paperSessions` table. Ensure `stageData: {}` is valid (should be — the create mutation at line 606 already uses empty-ish stageData).

**Step 5: Run test to verify it passes**

Run: `npx vitest run convex/conversations.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add convex/conversations.ts convex/conversations.test.ts
git commit -m "feat: auto-create paper session on conversation creation"
```

---

### Task 2: Delete startPaperSession Tool

**Files:**
- Modify: `src/lib/ai/paper-tools.ts:68-102` (remove startPaperSession tool definition)
- Verify: `src/app/api/chat/route.ts` (no references to startPaperSession remain)

**Step 1: Remove startPaperSession from paper-tools.ts**

In `src/lib/ai/paper-tools.ts`, delete the entire `startPaperSession: tool({...})` block (lines 68-102). Keep the surrounding tool definitions intact.

**Step 2: Search for remaining references**

Run: `grep -r "startPaperSession" src/ convex/ --include="*.ts" --include="*.tsx" -l`

Remove or update any remaining references:
- If referenced in tool type definitions, remove from the union
- If referenced in tests, remove those test cases
- If referenced in prompt text, remove those instructions

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors related to startPaperSession

**Step 4: Commit**

```bash
git add src/lib/ai/paper-tools.ts
# plus any other files that had references
git commit -m "refactor: remove startPaperSession tool (auto-created now)"
```

---

### Task 3: Delete Dual-Mode Detection Files

**Files:**
- Delete: `src/lib/ai/paper-intent-detector.ts`
- Delete: `src/lib/ai/paper-workflow-reminder.ts`
- Delete: `src/lib/ai/completed-session.ts`
- Delete: `src/lib/ai/classifiers/completed-session-classifier.ts`
- Delete: `src/lib/ai/classifiers/completed-session-classifier.test.ts`
- Delete: `src/lib/ai/__tests__/completed-session.test.ts` (if exists)

**Step 1: Delete the files**

```bash
rm src/lib/ai/paper-intent-detector.ts
rm src/lib/ai/paper-workflow-reminder.ts
rm src/lib/ai/completed-session.ts
rm src/lib/ai/classifiers/completed-session-classifier.ts
rm src/lib/ai/classifiers/completed-session-classifier.test.ts
```

Check for and delete any additional test files:
```bash
find src/lib/ai/__tests__/ -name "*completed-session*" -o -name "*paper-intent*"
```

**Step 2: Do NOT run type check yet** — route.ts still imports these. That's Task 4.

**Step 3: Commit**

```bash
git add -u  # stages deletions
git commit -m "refactor: delete dual-mode detection files (intent detector, workflow reminder, completed classifier)"
```

---

### Task 4: Clean Up route.ts — Remove Dual-Mode Imports and Logic

**Files:**
- Modify: `src/app/api/chat/route.ts`

This is the largest single task. All changes are deletions/simplifications within route.ts.

**Step 1: Remove imports (lines 20-22)**

Delete these three import lines:
```typescript
// DELETE line 20:
import { hasPaperWritingIntent } from "@/lib/ai/paper-intent-detector"
// DELETE line 21:
import { PAPER_WORKFLOW_REMINDER } from "@/lib/ai/paper-workflow-reminder"
// DELETE line 22:
import { resolveCompletedSessionHandling, getCompletedSessionClosingMessage } from "@/lib/ai/completed-session"
```

**Step 2: Remove intent detection block (lines 518-521)**

Delete:
```typescript
let paperWorkflowReminder = ""
if (!paperModePrompt && lastUserContent && hasPaperWritingIntent(lastUserContent)) {
    paperWorkflowReminder = PAPER_WORKFLOW_REMINDER
}
```

**Step 3: Remove workflow reminder from system messages (lines 862-864)**

Delete from `fullMessagesBase` array:
```typescript
...(paperWorkflowReminder
    ? [{ role: "system" as const, content: paperWorkflowReminder }]
    : []),
```

**Step 4: Remove forcePaperToolsMode (lines 2431, 2458-2465)**

Delete:
```typescript
const forcePaperToolsMode = !!paperWorkflowReminder && !paperModePrompt
```

Delete the `else if (forcePaperToolsMode)` branch (lines 2458-2465):
```typescript
} else if (forcePaperToolsMode) {
    searchRequestedByPolicy = false
    activeStageSearchReason = "force_paper_tools_mode"
    console.log("[SearchDecision] Force paper tools: no session yet, blocking search until session created")
}
```

**Step 5: Remove first-message-chat-mode fast path (line 2466-2470)**

This path only fires when `!paperModePrompt` — which is now impossible (paper session always exists). Delete:
```typescript
} else if (!paperModePrompt && userMessageCount <= 1 && !searchAlreadyDone) {
    searchRequestedByPolicy = true
    activeStageSearchReason = "first_message_chat_mode"
    console.log("[SearchDecision] Fast path: first chat message, skip router")
}
```

**Step 6: Remove completed-prestream block (lines 2563-2805)**

Delete the entire block:
```typescript
// ════════════════════════════════════════════════════════════════
// PRE-STREAM GUARD: Completed session containment (post-router)
// ...
// ════════════════════════════════════════════════════════════════
if (paperSession?.currentStage === "completed") {
    // ... ~240 lines of completed session handling
}
```

**Step 7: Remove paperWorkflowReminder from orchestrator params (line 3037)**

Delete:
```typescript
paperWorkflowReminder: paperWorkflowReminder || undefined,
```

**Step 8: Search for any remaining references**

Run: `grep -n "paperWorkflowReminder\|forcePaperToolsMode\|hasPaperWritingIntent\|PAPER_WORKFLOW_REMINDER\|resolveCompletedSessionHandling\|getCompletedSessionClosingMessage\|first_message_chat_mode" src/app/api/chat/route.ts`

Expected: No matches.

**Step 9: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS — all deleted imports and references are clean.

**Step 10: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor: remove dual-mode routing from route.ts (~250 lines)"
```

---

### Task 5: Fix Backend — Completed State Rewind Support

**Files:**
- Modify: `convex/paperSessions.ts:1542-1560` (isValidRewindTarget)
- Modify: `convex/paperSessions.ts:1583-1599` (getStagesToInvalidate)
- Modify: `convex/paperSessions.ts:649-658` (updateStageData — completed guard)
- Modify: `convex/paperSessions.ts:1694-1778` (rewindToStage — clear completedAt)
- Test: `convex/paperSessions.test.ts`

**Step 1: Write failing tests**

Add to `convex/paperSessions.test.ts`:

```typescript
describe("rewind from completed", () => {
  it("isValidRewindTarget should accept completed as current stage", () => {
    // Import the function or test via the mutation
    // The key: currentStage = "completed" should NOT return error
  });

  it("getStagesToInvalidate should return all stages from target to end when current is completed", () => {
    // currentStage = "completed", targetStage = "pendahuluan"
    // Should return stages from pendahuluan (index 4) to judul (index 13)
  });

  it("updateStageData should return graceful error for completed stage", async () => {
    const { ctx } = makeMockCtx();
    mockedRequirePaperSessionOwner.mockResolvedValue({
      session: makeSession({ currentStage: "completed", stageStatus: "approved" }),
    });

    const handler = (updateStageData as unknown as {
      _handler: (ctx: unknown, args: Record<string, unknown>) => Promise<unknown>;
    })._handler;

    const result = await handler(ctx, {
      sessionId: "paperSessions_1",
      stage: "completed",
      data: {},
    });

    expect(result).toMatchObject({
      success: false,
      reason: "session_completed_rewind_required",
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/paperSessions.test.ts`
Expected: FAIL

**Step 3: Fix isValidRewindTarget (line 1542)**

```typescript
function isValidRewindTarget(
    currentStage: string,
    targetStage: string
): { valid: boolean; error?: string } {
    // Handle "completed" as virtual position after all 14 stages
    const currentIndex = currentStage === "completed"
        ? STAGE_ORDER.length
        : STAGE_ORDER.indexOf(currentStage as PaperStageId);
    const targetIndex = STAGE_ORDER.indexOf(targetStage as PaperStageId);

    if (currentIndex === -1) {
        return { valid: false, error: `Unknown current stage: ${currentStage}` };
    }
    if (targetIndex === -1) {
        return { valid: false, error: `Unknown target stage: ${targetStage}` };
    }

    if (targetIndex >= currentIndex) {
        return {
            valid: false,
            error: "Cannot rewind to current stage or a stage that has not been passed",
        };
    }

    return { valid: true };
}
```

**Step 4: Fix getStagesToInvalidate (line 1583)**

```typescript
function getStagesToInvalidate(
    targetStage: string,
    currentStage: string
): string[] {
    const targetIndex = STAGE_ORDER.indexOf(targetStage as PaperStageId);
    const currentIndex = currentStage === "completed"
        ? STAGE_ORDER.length
        : STAGE_ORDER.indexOf(currentStage as PaperStageId);

    if (targetIndex === -1 || currentIndex === -1) return [];

    const stagesToInvalidate: string[] = [];
    for (let i = targetIndex; i < currentIndex; i++) {
        stagesToInvalidate.push(STAGE_ORDER[i]);
    }

    return stagesToInvalidate;
}
```

**Step 5: Add completed guard to updateStageData (line 655-658)**

Replace the existing stage validation:
```typescript
handler: async (ctx, args) => {
    const { session } = await requirePaperSessionOwner(ctx, args.sessionId);

    // Completed state: graceful rejection — user must rewind first
    if (session.currentStage === "completed") {
        return { success: false, reason: "session_completed_rewind_required" };
    }

    if (!STAGE_ORDER.includes(args.stage as PaperStageId)) {
        throw new Error(`Unknown stage: ${args.stage}`);
    }
    // ... rest unchanged
```

**Step 6: Clear completedAt on rewind from completed**

In `rewindToStage` mutation (line 1757), add `completedAt` clearing:

```typescript
await ctx.db.patch(args.sessionId, {
    currentStage: args.targetStage,
    stageStatus: "drafting",
    stageData: updatedStageData,
    paperMemoryDigest: updatedDigest,
    updatedAt: now,
    // Clear completion timestamp when rewinding from completed
    ...(currentStage === "completed" ? { completedAt: undefined } : {}),
});
```

**Step 7: Run tests**

Run: `npx vitest run convex/paperSessions.test.ts`
Expected: PASS

**Step 8: Commit**

```bash
git add convex/paperSessions.ts convex/paperSessions.test.ts
git commit -m "fix: support rewind from completed state + graceful updateStageData guard"
```

---

### Task 6: UI — Remove Rewind Limit, Support Completed State

**Files:**
- Modify: `src/components/paper/PaperStageProgress.tsx:34-79`
- Modify: `src/components/paper/RewindConfirmationDialog.tsx:36-38`

**Step 1: Delete MAX_REWIND_STAGES and simplify isValidRewindTarget**

In `PaperStageProgress.tsx`, replace lines 34-79:

```typescript
// DELETE: const MAX_REWIND_STAGES = 2;

function isValidRewindTarget(
    stageId: PaperStageId,
    stageIndex: number,
    currentIndex: number,
    stageData?: Record<string, StageDataEntry>
): { canRewind: boolean; reason?: string } {
    // Must be before current stage
    if (stageIndex >= currentIndex) {
        return { canRewind: false };
    }

    if (!stageData) {
        return { canRewind: false };
    }

    // Stage must have been validated
    const stageEntry = stageData[stageId];
    if (!stageEntry?.validatedAt) {
        return { canRewind: false, reason: "Stage ini belum pernah divalidasi" };
    }

    return { canRewind: true };
}
```

**Step 2: Fix RewindConfirmationDialog for completed state**

In `RewindConfirmationDialog.tsx`, line 36-38, replace:

```typescript
const targetLabel = getStageLabel(targetStage);
const currentLabel = currentStage === "completed"
    ? "Selesai"
    : getStageLabel(currentStage as PaperStageId);
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/paper/PaperStageProgress.tsx src/components/paper/RewindConfirmationDialog.tsx
git commit -m "feat: remove rewind limit, support rewind from completed state in UI"
```

---

### Task 7: Paper Mode Prompt — Completed State Awareness

**Files:**
- Modify: `src/lib/ai/paper-mode-prompt.ts:115-126` (stage resolution area)

**Step 1: Add completed state prompt**

In `paper-mode-prompt.ts`, where stage skill is resolved (around line 115-126), add a branch for completed:

```typescript
const stage = session.currentStage as PaperStageId | "completed"

let stageInstructions: string;
if (stage === "completed") {
    stageInstructions = `
COMPLETED SESSION — ALL 14 STAGES APPROVED
═══════════════════════════════════════════

Status: All stages validated and approved. Paper is complete.

YOUR ROLE NOW:
- Answer questions about any part of the paper
- Discuss improvements, alternative approaches, or next steps
- If user wants to REVISE a specific stage, tell them to click that stage in the progress timeline above the chat
- You CANNOT modify stage data or create artifacts in completed state — user must rewind first via the timeline UI

DO NOT:
- Call updateStageData (will be rejected — session is completed)
- Call createArtifact or submitStageForValidation
- Output a choice card

DO:
- Respond naturally to any question about the paper
- Reference approved content from any stage when relevant
- Suggest specific stage names when user describes what they want to change (e.g. "kalau mau ubah bagian pendahuluan, klik tahap Pendahuluan di timeline atas")
`;
} else {
    // Existing: resolve stage skill from stageSkills table
    const fallbackStageInstructions = getStageInstructions(stage);
    // ... existing resolution logic
}
```

> Note: Exact insertion point depends on how `stageInstructions` flows into the final prompt assembly. Read the function body carefully and insert the branch at the right point. The existing completed-state override at lines 929-944 should also be reviewed and potentially simplified/removed since the new prompt handles it.

**Step 2: Remove or simplify existing completed overrides**

Check lines 929-944 in `paper-mode-prompt.ts` — the dynamic notes for completed state. These may conflict with or duplicate the new prompt. Simplify to avoid double-injection.

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/ai/paper-mode-prompt.ts
git commit -m "feat: add completed-state awareness prompt for model rewind guidance"
```

---

### Task 8: Lazy Migration for Existing Conversations

**Files:**
- Modify: `src/app/api/chat/route.ts` (after paper session fetch)

**Step 1: Add lazy migration after paper session query**

Find where `paperSession` is fetched via `getByConversation` (around line 358-366 area, or wherever `getPaperModeSystemPrompt` returns). Add migration logic:

```typescript
// After paper session is resolved from getPaperModeSystemPrompt context:
let paperSession = paperModeContext.session; // or however it's accessed

// Lazy migration: create paper session for pre-existing conversations
if (!paperSession && conversationId) {
    console.info(`[PAPER][lazy-migration] Creating paper session for existing conversation ${conversationId}`);
    await fetchMutation(api.paperSessions.create, {
        userId,
        conversationId,
    }, convexOptions);
    // Re-fetch to get the full session object
    paperSession = await fetchQuery(api.paperSessions.getByConversation, {
        conversationId,
    }, convexOptions);
}
```

> Note: The exact location depends on how `getPaperModeSystemPrompt` returns the session object. This may need to be placed right after the `getPaperModeSystemPrompt` call, or the function itself may need modification to handle the lazy creation. Read the actual call site carefully.

**Step 2: Add cleanup comment**

```typescript
// TODO(2026-05-15): Remove lazy migration after all active conversations have been migrated
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: lazy migration — auto-create paper session for existing conversations"
```

---

### Task 9: End-to-End Verification

**Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass. Some existing tests for deleted files will be gone (completed-session-classifier.test.ts already deleted in Task 3).

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: Clean.

**Step 3: Manual verification checklist**

- [ ] New conversation auto-creates paper session (check Convex dashboard)
- [ ] First message goes to gagasan stage (no intent detection needed)
- [ ] Progress timeline shows gagasan as active
- [ ] Complete all 14 stages → completed state
- [ ] In completed: model responds naturally (no short-circuit)
- [ ] In completed: all 14 stage badges clickable in timeline
- [ ] Rewind from completed to any stage works
- [ ] Rewind confirmation dialog shows "Selesai" as current stage label
- [ ] After rewind: model re-enters stage correctly
- [ ] Re-approve through to completed: completedAt re-set
- [ ] Existing conversation (no paper session): lazy migration creates session on first message

**Step 4: Re-test previously broken stages**

- [ ] Stage 13 (lampiran): YAML choice cards render correctly (post emitChoiceCard removal)
- [ ] Stage 14 (judul): correct artifact created, no premature completion
- [ ] Enforcer: no infinite loops on any stage

**Step 5: Commit verification results**

```bash
git commit --allow-empty -m "test: verified all-sessions-are-paper-sessions E2E"
```

---

## Task Dependency Graph

```
Task 1 (auto-create) ─────────┐
Task 2 (delete startPaperSession) ──┤
Task 3 (delete files) ─────────────┤── Task 4 (clean route.ts) ── Task 8 (lazy migration)
                                    │
Task 5 (fix backend completed) ─────┤── Task 9 (E2E verification)
Task 6 (UI unlock rewind) ──────────┤
Task 7 (completed prompt) ──────────┘
```

Tasks 1-3, 5-7 can be done in parallel. Task 4 depends on Task 3 (deleted files). Task 8 depends on Task 4 (clean route.ts). Task 9 depends on all.
