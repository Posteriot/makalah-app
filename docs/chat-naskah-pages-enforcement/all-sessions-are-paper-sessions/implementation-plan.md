# All Sessions Are Paper Sessions — Implementation Plan (v2, post-Codex audit)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate dual-mode (chat/paper) architecture — every conversation auto-creates a paper session, removing ~250 lines of branching logic and an entire class of mode-boundary bugs.

**Architecture:** Surgical removal approach. Modify existing code paths one at a time: (1) auto-create paper session on conversation creation, (2) delete dual-mode detection files, (3) fix completed state to be navigable, (4) unlock full stage navigation in UI, (5) update paper mode prompt for completed awareness, (6) add lazy migration for existing conversations.

**Tech Stack:** Convex (backend mutations/queries), Next.js App Router (API route), React (UI components), Vitest (testing)

**Design doc:** `docs/chat-naskah-pages-enforcement/all-sessions-are-paper-sessions/design.md`

**Codex audit:** `docs/chat-naskah-pages-enforcement/all-sessions-are-paper-sessions/REVIEW-PROMPT.md`

---

## Codex Audit Fixes Applied (v1 → v2)

| Codex Finding | Severity | Fix in v2 |
|---------------|----------|-----------|
| Lazy migration ordering wrong — `getPaperModeSystemPrompt` returns empty before migration runs | Critical | Task 8 rewritten: migration inside `getPaperModeSystemPrompt`, not after it |
| Idempotency claim false — `by_conversation` index ≠ unique constraint, concurrent inserts possible | Critical | Task 1: single-transaction `ctx.db.insert`. New Task 1b: `ensurePaperSessionExists` internal mutation for lazy migration with duplicate guard |
| `updateStageData` return `{success: false}` breaks caller contract (callers don't read return) | Critical | Task 5: keep throwing, improve error message only. No contract change. |
| Missing dependency sweep — ChatWindow.tsx, schemas.ts, chat-config.ts, 2 sidebar components | Critical | Task 3 expanded to cover all 5 missed files |
| `isPaperMode = !!session` dead branch in `usePaperSession.ts` | Design | Task 6b added: remove `isPaperMode` conditional, remove empty-state UI |
| Inconsistent completed instructions (paper-stages vs new prompt) | Design | Task 7: replace `paper-stages/index.ts:75` completed fallback with new unified prompt |
| RewindConfirmationDialog — `getStageLabel("completed")` already returns "Selesai" | Suggestion | Task 6: remove unnecessary guard (was wrong in v1) |
| RewindConfirmationDialog warning too generic for full-paper invalidation | Design | Task 6: add stage count to warning text |
| Single helper for session creation | Suggestion | Task 1b: `ensurePaperSessionExists` shared by both paths |
| Observability for auto-migration and large rewinds | Suggestion | Tasks 1b and 5: explicit logging added |

---

### Task 1: Auto-Create Paper Session in Conversation Creation

**Files:**
- Modify: `convex/conversations.ts:257-275` (createConversation mutation)
- Test: `convex/conversations.test.ts` (create new if doesn't exist)

**Step 1: Write the failing test**

Create `convex/conversations.test.ts` with a test that verifies `ctx.db.insert` is called twice — once for `conversations`, once for `paperSessions`.

**Step 2: Implement — add paper session creation to createConversation**

In `convex/conversations.ts:257-275`, modify the handler:

```typescript
handler: async (ctx, { userId, title }) => {
    await requireAuthUserId(ctx, userId)
    const now = Date.now()
    const workingTitle = title ?? "Percakapan baru"
    const conversationId = await ctx.db.insert("conversations", {
        userId,
        title: workingTitle,
        titleUpdateCount: 0,
        titleLocked: false,
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
    })

    // Auto-create paper session — every conversation is a paper session.
    // Same transaction = atomic, no race condition possible.
    await ctx.db.insert("paperSessions", {
        userId,
        conversationId,
        currentStage: "gagasan",
        stageStatus: "drafting",
        workingTitle,
        stageData: {},
        createdAt: now,
        updatedAt: now,
    })

    return conversationId
},
```

> **Codex audit fix:** Direct `ctx.db.insert` in same Convex mutation = single transaction. No read-then-insert race. No need for unique constraint.

**Step 3: Verify paperSessions schema compatibility**

Check `convex/schema.ts` for required fields on `paperSessions` table. Ensure `stageData: {}` is valid (the `create` mutation at line 606 already uses similar pattern).

**Step 4: Run test**

Run: `npx vitest run convex/conversations.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add convex/conversations.ts convex/conversations.test.ts
git commit -m "feat: auto-create paper session on conversation creation (same transaction)"
```

---

### Task 1b: Create `ensurePaperSessionExists` Internal Mutation

**Files:**
- Create: `convex/paperSessions/ensureExists.ts` (or add to `convex/paperSessions.ts`)
- Test: `convex/paperSessions.test.ts`

This is the shared helper for lazy migration. It handles the race condition that `paperSessions.create` does NOT handle (read-then-insert without unique constraint).

**Step 1: Write the failing test**

```typescript
describe("ensurePaperSessionExists", () => {
  it("should create session if none exists", async () => {
    // Mock ctx.db.query to return null
    // Verify ctx.db.insert called with correct fields
  });

  it("should return existing session if already exists", async () => {
    // Mock ctx.db.query to return existing session
    // Verify ctx.db.insert NOT called
  });

  it("should handle concurrent creation gracefully", async () => {
    // If query returns null but insert would create duplicate,
    // the second caller should detect and return existing
  });
});
```

**Step 2: Implement**

```typescript
export const ensurePaperSessionExists = mutation({
    args: {
        userId: v.id("users"),
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, { userId, conversationId }) => {
        // Single-transaction check + insert = no race within this mutation.
        // If two mutations run concurrently, Convex OCC (optimistic concurrency
        // control) will retry the loser — the retry will see the winner's insert
        // and return it. This is safe because Convex mutations are serializable.
        const existing = await ctx.db
            .query("paperSessions")
            .withIndex("by_conversation", q => q.eq("conversationId", conversationId))
            .unique();

        if (existing) {
            console.info(`[PAPER][ensure-session] Reusing existing session for conversation ${conversationId}`);
            return existing._id;
        }

        const conversation = await ctx.db.get(conversationId);
        const now = Date.now();

        console.info(`[PAPER][ensure-session] Creating new session for legacy conversation ${conversationId}`);
        return await ctx.db.insert("paperSessions", {
            userId,
            conversationId,
            currentStage: "gagasan",
            stageStatus: "drafting",
            workingTitle: conversation?.title ?? "Percakapan baru",
            stageData: {},
            createdAt: now,
            updatedAt: now,
        });
    },
});
```

> **Codex audit fix:** Convex mutations are serializable (OCC). Read + insert in same mutation = safe. No separate unique constraint needed.

**Step 3: Run tests**

Run: `npx vitest run convex/paperSessions.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add convex/paperSessions.ts convex/paperSessions.test.ts
git commit -m "feat: ensurePaperSessionExists mutation for lazy migration"
```

---

### Task 2: Delete startPaperSession Tool

**Files:**
- Modify: `src/lib/ai/paper-tools.ts:68-102` (remove startPaperSession tool definition)
- Modify: `src/lib/ai/chat-config.ts:22-24` (remove startPaperSession from capabilities list)
- Verify: no remaining references

**Step 1: Remove startPaperSession from paper-tools.ts**

Delete the entire `startPaperSession: tool({...})` block (lines 68-102).

**Step 2: Update chat-config.ts — remove stale reference**

In `src/lib/ai/chat-config.ts:24`, remove `startPaperSession` from the tools list:

```typescript
// BEFORE:
//    - Tools: startPaperSession, updateStageData, submitStageForValidation, getCurrentPaperState
// AFTER:
//    - Tools: updateStageData, submitStageForValidation, getCurrentPaperState
```

> **Codex audit fix:** This file was missed in v1 sweep.

**Step 3: Search for remaining references**

Run: `grep -r "startPaperSession" src/ convex/ --include="*.ts" --include="*.tsx" -l`

Remove or update any remaining references.

**Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/lib/ai/paper-tools.ts src/lib/ai/chat-config.ts
git commit -m "refactor: remove startPaperSession tool and stale prompt reference"
```

---

### Task 3: Delete Dual-Mode Detection Files + All Runtime References

**Files to delete:**
- `src/lib/ai/paper-intent-detector.ts`
- `src/lib/ai/paper-workflow-reminder.ts`
- `src/lib/ai/completed-session.ts`
- `src/lib/ai/classifiers/completed-session-classifier.ts`
- `src/lib/ai/classifiers/completed-session-classifier.test.ts`

**Files to modify (Codex audit additions):**
- `src/components/chat/ChatWindow.tsx:48,166` — remove `hasPaperWritingIntent` import and usage
- `src/lib/ai/classifiers/schemas.ts:3,10,57,159-161` — remove `CompletedSessionHandling` import and `CompletedSessionClassifierSchema` + type compat check

**Step 1: Delete files**

```bash
rm src/lib/ai/paper-intent-detector.ts
rm src/lib/ai/paper-workflow-reminder.ts
rm src/lib/ai/completed-session.ts
rm src/lib/ai/classifiers/completed-session-classifier.ts
rm src/lib/ai/classifiers/completed-session-classifier.test.ts
```

Also check for and delete test files:
```bash
find src/lib/ai/__tests__/ -name "*completed-session*" -o -name "*paper-intent*"
```

**Step 2: Fix ChatWindow.tsx**

Remove import at line 48:
```typescript
// DELETE:
import { hasPaperWritingIntent } from "@/lib/ai/paper-intent-detector"
```

Remove usage at line 166 (and the function/block that calls it). Replace with appropriate logic for the all-paper-sessions world — or remove entirely if intent detection is no longer needed in the frontend.

**Step 3: Fix classifiers/schemas.ts**

Remove line 3:
```typescript
// DELETE:
import type { CompletedSessionHandling } from "../completed-session"
```

Remove `CompletedSessionClassifierSchema` definition (line 10), `CompletedSessionClassifierOutput` type (line 57), and the type compat assertion (lines 159-161). These are dead types now.

**Step 4: Full sweep**

```bash
grep -r "paper-intent-detector\|paper-workflow-reminder\|completed-session\|CompletedSessionHandling\|CompletedSessionClassifier" src/ --include="*.ts" --include="*.tsx" -l
```

Expected: No matches (except possibly this plan file).

**Step 5: Do NOT run type check yet** — route.ts still imports deleted modules. That's Task 4.

**Step 6: Commit**

```bash
git add -u
git add src/components/chat/ChatWindow.tsx src/lib/ai/classifiers/schemas.ts
git commit -m "refactor: delete dual-mode files + fix all runtime references (ChatWindow, schemas)"
```

---

### Task 4: Clean Up route.ts — Remove Dual-Mode Imports and Logic

**Files:**
- Modify: `src/app/api/chat/route.ts`

All changes are deletions/simplifications.

**Step 1: Remove imports (lines 20-22)**

```typescript
// DELETE:
import { hasPaperWritingIntent } from "@/lib/ai/paper-intent-detector"
import { PAPER_WORKFLOW_REMINDER } from "@/lib/ai/paper-workflow-reminder"
import { resolveCompletedSessionHandling, getCompletedSessionClosingMessage } from "@/lib/ai/completed-session"
```

**Step 2: Remove intent detection block (lines 518-521)**

```typescript
// DELETE:
let paperWorkflowReminder = ""
if (!paperModePrompt && lastUserContent && hasPaperWritingIntent(lastUserContent)) {
    paperWorkflowReminder = PAPER_WORKFLOW_REMINDER
}
```

**Step 3: Remove workflow reminder from system messages (lines 862-864)**

```typescript
// DELETE from fullMessagesBase array:
...(paperWorkflowReminder
    ? [{ role: "system" as const, content: paperWorkflowReminder }]
    : []),
```

**Step 4: Remove forcePaperToolsMode (lines 2431, 2458-2465)**

```typescript
// DELETE:
const forcePaperToolsMode = !!paperWorkflowReminder && !paperModePrompt

// DELETE the else-if branch:
} else if (forcePaperToolsMode) {
    searchRequestedByPolicy = false
    activeStageSearchReason = "force_paper_tools_mode"
    console.log("[SearchDecision] Force paper tools: no session yet, blocking search until session created")
}
```

**Step 5: Remove first-message-chat-mode fast path (lines 2466-2470)**

This path fires when `!paperModePrompt` — now impossible (paper session always exists).

```typescript
// DELETE:
} else if (!paperModePrompt && userMessageCount <= 1 && !searchAlreadyDone) {
    searchRequestedByPolicy = true
    activeStageSearchReason = "first_message_chat_mode"
    console.log("[SearchDecision] Fast path: first chat message, skip router")
}
```

**Step 6: Remove completed-prestream block (lines 2563-2805)**

Delete the entire `if (paperSession?.currentStage === "completed") { ... }` block (~240 lines).

**Step 7: Remove paperWorkflowReminder from orchestrator params (line 3037)**

```typescript
// DELETE:
paperWorkflowReminder: paperWorkflowReminder || undefined,
```

**Step 8: Full sweep**

```bash
grep -n "paperWorkflowReminder\|forcePaperToolsMode\|hasPaperWritingIntent\|PAPER_WORKFLOW_REMINDER\|resolveCompletedSessionHandling\|getCompletedSessionClosingMessage\|first_message_chat_mode" src/app/api/chat/route.ts
```

Expected: No matches.

**Step 9: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

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
- Modify: `convex/paperSessions.ts:649-662` (updateStageData — improve error message only)
- Modify: `convex/paperSessions.ts:1694-1778` (rewindToStage — clear completedAt + logging)
- Test: `convex/paperSessions.test.ts`

**Step 1: Write failing tests**

Add to `convex/paperSessions.test.ts`:

```typescript
describe("rewind from completed", () => {
  it("isValidRewindTarget should accept completed as current stage", () => {
    // currentStage = "completed", targetStage = "gagasan"
    // Should return { valid: true }
  });

  it("getStagesToInvalidate should return all 14 stages when rewinding from completed to gagasan", () => {
    // currentStage = "completed", targetStage = "gagasan"
    // Should return all 14 stage IDs
  });

  it("updateStageData should throw descriptive error for completed stage", async () => {
    const { ctx } = makeMockCtx();
    mockedRequirePaperSessionOwner.mockResolvedValue({
      session: makeSession({ currentStage: "completed", stageStatus: "approved" }),
    });

    const handler = (updateStageData as unknown as {
      _handler: (ctx: unknown, args: Record<string, unknown>) => Promise<unknown>;
    })._handler;

    await expect(handler(ctx, {
      sessionId: "paperSessions_1",
      stage: "completed",
      data: {},
    })).rejects.toThrow("Cannot update stage data in completed state");
  });
});
```

**Step 2: Fix isValidRewindTarget (line 1542)**

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

**Step 3: Fix getStagesToInvalidate (line 1583)**

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

**Step 4: Improve updateStageData error message (line 655-658)**

> **Codex audit fix:** Keep throwing (preserve caller contract). Only improve message.

The existing code at line 657 already throws for "completed" because `STAGE_ORDER.includes("completed")` is false → `Unknown stage: completed`. Improve the message:

```typescript
handler: async (ctx, args) => {
    const { session } = await requirePaperSessionOwner(ctx, args.sessionId);

    // Completed state: descriptive throw (preserves caller contract — callers expect throw for invalid state)
    if (session.currentStage === "completed") {
        throw new Error("Cannot update stage data in completed state — rewind to a specific stage first");
    }

    if (!STAGE_ORDER.includes(args.stage as PaperStageId)) {
        throw new Error(`Unknown stage: ${args.stage}`);
    }
    // ... rest unchanged
```

**Step 5: Clear completedAt on rewind from completed + observability logging**

In `rewindToStage` mutation (line 1757):

```typescript
// Log large rewinds for observability
const invalidatedCount = stagesToInvalidate.length;
if (invalidatedCount > 5) {
    console.info(`[PAPER][rewind] Large rewind: ${currentStage} → ${args.targetStage}, invalidating ${invalidatedCount} stages`);
}

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

> Note: Verify `completedAt: undefined` actually clears the field in Convex. If Convex requires explicit unset, use the Convex `v.optional()` unset pattern. Check Convex docs during implementation.

**Step 6: Run tests**

Run: `npx vitest run convex/paperSessions.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add convex/paperSessions.ts convex/paperSessions.test.ts
git commit -m "fix: support rewind from completed + descriptive error for updateStageData"
```

---

### Task 6: UI — Remove Rewind Limit in ALL Components + Support Completed State

**Files (Codex audit expansion — 3 components, not 1):**
- Modify: `src/components/paper/PaperStageProgress.tsx:34-79`
- Modify: `src/components/chat/sidebar/SidebarProgress.tsx:31,65,90-97`
- Modify: `src/components/chat/sidebar/SidebarQueueProgress.tsx:41,65,90-97`
- Modify: `src/components/paper/RewindConfirmationDialog.tsx:36-38`

**Step 1: Delete MAX_REWIND_STAGES and simplify isValidRewindTarget in ALL 3 components**

Same change in `PaperStageProgress.tsx`, `SidebarProgress.tsx`, and `SidebarQueueProgress.tsx`:

```typescript
// DELETE: const MAX_REWIND_STAGES = 2;

function isValidRewindTarget(
    stageId: PaperStageId,
    stageIndex: number,
    currentIndex: number,
    stageData?: Record<string, StageDataEntry>
): { canRewind: boolean; reason?: string } {
    if (stageIndex >= currentIndex) {
        return { canRewind: false };
    }

    if (!stageData) {
        return { canRewind: false };
    }

    const stageEntry = stageData[stageId];
    if (!stageEntry?.validatedAt) {
        return { canRewind: false, reason: "Stage ini belum pernah divalidasi" };
    }

    return { canRewind: true };
}
```

**Step 2: Improve RewindConfirmationDialog warning for large rewinds**

> **Codex audit fix:** `getStageLabel("completed")` already returns "Selesai" — no guard needed. Instead, add stage count to warning.

In `RewindConfirmationDialog.tsx`, enhance the warning when many stages will be invalidated:

```typescript
// Calculate stages that will be invalidated
const targetIndex = STAGE_ORDER.indexOf(targetStage);
const currentIndex = currentStage === "completed"
    ? STAGE_ORDER.length
    : STAGE_ORDER.indexOf(currentStage as PaperStageId);
const invalidatedCount = currentIndex - targetIndex;

// In the warning div:
<div className="text-left text-xs leading-relaxed text-[var(--chat-foreground)]">
    {invalidatedCount >= STAGE_ORDER.length ? (
        // Full paper invalidation — explicit warning
        <>Seluruh baseline makalah ({invalidatedCount} tahap) akan ditandai <em>invalidated</em> dan perlu direvisi ulang dari awal.</>
    ) : (
        // Partial invalidation — existing message with count
        <>{invalidatedCount} tahap (dari {targetLabel} sampai {currentLabel}) akan ditandai <em>invalidated</em> dan perlu divalidasi ulang setelah revisi.</>
    )}
</div>
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/paper/PaperStageProgress.tsx src/components/paper/RewindConfirmationDialog.tsx src/components/chat/sidebar/SidebarProgress.tsx src/components/chat/sidebar/SidebarQueueProgress.tsx
git commit -m "feat: remove rewind limit in all 3 progress components, improve rewind warning"
```

---

### Task 6b: Remove Dead `isPaperMode` Branches

**Files (Codex audit addition):**
- Modify: `src/lib/hooks/usePaperSession.ts:111` (remove or simplify isPaperMode)
- Modify: `src/components/chat/sidebar/SidebarProgress.tsx:346-355` (remove empty state)
- Modify: `src/components/chat/sidebar/SidebarQueueProgress.tsx:507-516` (remove empty state)

**Step 1: Simplify usePaperSession**

At line 111, change:
```typescript
// BEFORE:
const isPaperMode = !!session;

// AFTER:
// isPaperMode is always true in all-paper-sessions architecture.
// Kept as constant for now to avoid touching all consumer sites.
// TODO: remove isPaperMode from all consumers in follow-up cleanup
const isPaperMode = true;
```

> Note: Full removal of isPaperMode from all consumers is a larger refactor. For now, hardcode to `true` so dead branches become unreachable. Clean up in follow-up.

**Step 2: Remove empty-state UI in sidebar components**

In `SidebarProgress.tsx:346-355` and `SidebarQueueProgress.tsx:507-516`, the `if (!isPaperMode || !session)` block renders a "no paper session" empty state. This will never render. Remove the entire block.

But keep a loading guard: `if (!session)` can still be true during initial Convex query loading. Replace with a loading state instead of "no paper session":

```typescript
if (!session) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-xs text-[var(--chat-muted-foreground)]">Memuat...</span>
      </div>
    );
}
```

**Step 3: Commit**

```bash
git add src/lib/hooks/usePaperSession.ts src/components/chat/sidebar/SidebarProgress.tsx src/components/chat/sidebar/SidebarQueueProgress.tsx
git commit -m "refactor: remove dead isPaperMode branches, replace empty-state with loading"
```

---

### Task 7: Paper Mode Prompt — Unified Completed State Instructions

**Files:**
- Modify: `src/lib/ai/paper-mode-prompt.ts:115-126` (stage resolution area)
- Modify: `src/lib/ai/paper-stages/index.ts:75-84` (completed fallback — replace)

**Step 1: Add completed state prompt in paper-mode-prompt.ts**

In the stage resolution area (around line 115), add a branch for completed:

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
- Call updateStageData (will throw — session is completed)
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

**Step 2: Update paper-stages/index.ts completed fallback**

> **Codex audit fix:** Replace the stale completed fallback that references "sidebar artifact history" with instructions consistent with the new rewind-via-timeline UX.

At `src/lib/ai/paper-stages/index.ts:75-84`, replace:

```typescript
case "completed":
    return `STAGE: Completed — All stages approved. Paper complete.

User can rewind to any stage via the progress timeline above the chat.
If user wants to change something, suggest the specific stage name and tell them to click it in the timeline.
Do not call updateStageData, createArtifact, or submitStageForValidation in completed state.`;
```

**Step 3: Remove or simplify existing completed overrides in paper-mode-prompt.ts**

Check lines 929-944 — the dynamic notes for completed state. Remove if redundant with the new stage instructions above.

**Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/ai/paper-mode-prompt.ts src/lib/ai/paper-stages/index.ts
git commit -m "feat: unified completed-state prompt with rewind-via-timeline guidance"
```

---

### Task 8: Lazy Migration Inside getPaperModeSystemPrompt

**Files:**
- Modify: `src/lib/ai/paper-mode-prompt.ts:94-113` (session fetch + early return)

> **Codex audit fix (critical):** v1 placed lazy migration AFTER `getPaperModeSystemPrompt` returned empty prompt. This is wrong — migration must happen INSIDE the function, before the prompt is built.

**Step 1: Modify getPaperModeSystemPrompt**

At lines 94-113, replace the early return with lazy migration:

```typescript
try {
    const convexOptions = convexToken ? { token: convexToken } : undefined;
    const sessionStart = Date.now();
    let session = await fetchQuery(
        api.paperSessions.getByConversation,
        { conversationId },
        convexOptions
    );
    logPaperPromptLatency("paperPrompt.getSession", sessionStart, { found: !!session });

    // Lazy migration: ensure paper session exists for legacy conversations
    if (!session) {
        console.info(`[PAPER][lazy-migration] Creating paper session for legacy conversation ${conversationId}`);
        const userId = /* extract from convex auth context or pass as param */;
        await fetchMutation(
            api.paperSessions.ensurePaperSessionExists,
            { userId, conversationId },
            convexOptions
        );
        session = await fetchQuery(
            api.paperSessions.getByConversation,
            { conversationId },
            convexOptions
        );
        logPaperPromptLatency("paperPrompt.lazyMigration", sessionStart, { created: !!session });

        if (!session) {
            // Should not happen — but guard against mutation failure
            console.error(`[PAPER][lazy-migration] Failed to create session for ${conversationId}`);
            return { prompt: "", skillResolverFallback: false, stageInstructionSource: "none" };
        }
    }

    // ... rest of prompt building continues with guaranteed session
```

> Note: `getPaperModeSystemPrompt` currently doesn't receive `userId`. Either add it as a parameter or extract from the Convex auth token. Check the call site in route.ts to determine the cleanest approach.

**Step 2: Add TODO cleanup comment**

```typescript
// TODO(2026-05-15): Remove lazy migration after all active conversations have been migrated
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/ai/paper-mode-prompt.ts
git commit -m "feat: lazy migration inside getPaperModeSystemPrompt (Codex audit fix)"
```

---

### Task 9: End-to-End Verification

**Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

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
- [ ] In completed: all 14 stage badges clickable in timeline (all 3 components)
- [ ] Rewind from completed to any stage works
- [ ] Rewind confirmation dialog shows "Selesai" as current stage label (auto from getStageLabel)
- [ ] Rewind from completed to gagasan: dialog warns "14 tahap akan di-invalidate"
- [ ] After rewind: model re-enters stage correctly
- [ ] Re-approve through to completed: completedAt re-set
- [ ] Existing conversation (no paper session): lazy migration creates session on first message
- [ ] Sidebar progress: no "bukan sesi paper" empty state (replaced with loading)

**Step 4: Re-test previously broken stages**

- [ ] Stage 13 (lampiran): YAML choice cards render correctly
- [ ] Stage 14 (judul): correct artifact created, no premature completion
- [ ] Enforcer: no infinite loops on any stage

**Step 5: Commit verification results**

```bash
git commit --allow-empty -m "test: verified all-sessions-are-paper-sessions E2E"
```

---

## Task Dependency Graph (v2)

```
Task 1  (auto-create, same txn) ──────┐
Task 1b (ensurePaperSessionExists) ────┤
Task 2  (delete startPaperSession) ────┤
Task 3  (delete files + ALL refs) ─────┤── Task 4 (clean route.ts) ── Task 8 (lazy migration in getPaperModeSystemPrompt)
                                       │
Task 5  (fix backend completed) ───────┤── Task 9 (E2E verification)
Task 6  (UI unlock rewind, 3 components)┤
Task 6b (remove isPaperMode dead branches)┤
Task 7  (unified completed prompt) ────┘
```

Tasks 1, 1b, 2, 3, 5, 6, 6b, 7 can be parallelized. Task 4 depends on 3. Task 8 depends on 1b + 4. Task 9 depends on all.
