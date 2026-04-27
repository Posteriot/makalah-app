# Cancel Decision — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace edit+resend on synthetic messages with a "Batalkan" (Cancel) button that performs targeted state revert — undoing a specific decision and its consequences, allowing the user to re-decide from the original UI.

**Architecture:** Three new Convex mutations (`cancelChoiceDecision`, `unapproveStage`, `stampDecisionEpoch`) handle server-side state revert. Client-side: `submittedChoiceKeys` split into two-set approach (persisted + optimistic), "Batalkan" button replaces edit icon on synthetic messages, `decisionEpoch` monotonic counter prevents chain-completion races. Phase 3 removes edit+resend from `choice` and `approved` synthetic messages (revision stays on old path).

**Tech Stack:** Convex mutations (TypeScript), React client state (useState/useEffect), existing `editAndTruncateConversation` for message cleanup.

**Design Doc:** `docs/cancel-decision/design.md` — 7 Codex review rounds + self-review. All implementation details derived from this document.

---

## Execution Model

- **Each phase** is executed by an orchestrated agent team (subagent-driven-development).
- **Each task** is assigned to a specialist agent based on the work type.
- **Each phase ends** with a code-review agent audit + report to user.
- **User validates** each phase report before the next phase begins.

### Agent Assignment Legend

| Agent Type | Role |
|------------|------|
| `backend-developer` | Convex mutations, schema changes |
| `frontend-developer` | React components, client state, UI |
| `code-reviewer` | Post-phase audit against design doc |
| `test-automator` | Test creation and verification |

---

## Phase 1: Cancel Choice Card + Client State Fixes

**Scope:** `cancelChoiceDecision` mutation, `stampDecisionEpoch` mutation, `decisionEpoch` schema field, two-set `submittedChoiceKeys`, `optimisticPendingValidation` clear, `handleCancelChoice` handler, "Batalkan" button for `kind: "choice"`, epoch guard in `build-on-finish-handler.ts`.

**Why Phase 1 is large:** The epoch guard (5.5.4) and chain-completion protection MUST ship together with cancel choice — without it, cancel creates broken state when chain-completion races. Similarly, the two-set `submittedChoiceKeys` fix is required for cancel to work correctly (stale Convex snapshots re-add keys). These are not independent features — they are co-dependent correctness requirements.

---

### Task 1.1: Schema + `decisionEpoch` field (Agent: `backend-developer`)

**Files:**
- Modify: `convex/schema.ts:746` (before `createdAt`)

**Step 1: Add `decisionEpoch` to paperSessions schema**

In `convex/schema.ts`, add field after `softBlockedAt` line (before `// Timestamps`):

```typescript
    // Cancel Decision: monotonic epoch counter for race prevention (design doc 5.5.4)
    decisionEpoch: v.optional(v.number()),
```

Insert at line 743 (before `// Timestamps` comment at line 743-744).

**Step 2: Verify Convex types regenerate**

Run: `npx convex dev --once` (or let the running dev server pick it up)
Expected: No type errors. Field is `v.optional` so backward compatible.

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(cancel-decision): add decisionEpoch to paperSessions schema"
```

---

### Task 1.2: `stampDecisionEpoch` mutation (Agent: `backend-developer`)

**Files:**
- Modify: `convex/paperSessions.ts` (add mutation after `resetStageDataForEditResend` at line ~754)

**Step 1: Add `stampDecisionEpoch` mutation**

After `resetStageDataForEditResend` (line 754), add:

```typescript
/**
 * Increment decisionEpoch and return new value.
 * Called at start of server-side request processing when choiceInteractionEvent present.
 * Ref: design doc section 5.3
 */
export const stampDecisionEpoch = mutation({
    args: {
        sessionId: v.id("paperSessions"),
    },
    handler: async (ctx, args) => {
        const { session } = await requirePaperSessionOwner(ctx, args.sessionId);
        const currentEpoch = session.decisionEpoch ?? 0;
        const newEpoch = currentEpoch + 1;
        await ctx.db.patch(args.sessionId, {
            decisionEpoch: newEpoch,
            updatedAt: Date.now(),
        });
        console.info(`[PAPER][stamp-epoch] stage=${session.currentStage} epoch=${newEpoch}`);
        return { epoch: newEpoch };
    },
});
```

**Step 2: Verify mutation compiles**

Run: `npx convex dev --once`
Expected: No errors. Mutation registered in `api.paperSessions.stampDecisionEpoch`.

**Step 3: Commit**

```bash
git add convex/paperSessions.ts
git commit -m "feat(cancel-decision): add stampDecisionEpoch mutation"
```

---

### Task 1.3: `cancelChoiceDecision` mutation (Agent: `backend-developer`)

**Files:**
- Modify: `convex/paperSessions.ts` (add mutation after `stampDecisionEpoch`)

**Step 1: Add `cancelChoiceDecision` mutation**

```typescript
/**
 * Cancel a choice card decision. Reverts stageData, invalidates artifact if exists,
 * reverts stageStatus from pending_validation to drafting, increments decisionEpoch.
 * Ref: design doc section 5.1
 */
export const cancelChoiceDecision = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { session } = await requirePaperSessionOwner(ctx, args.sessionId);

        const currentStage = session.currentStage;
        if (!STAGE_ORDER.includes(currentStage as PaperStageId)) {
            throw new Error(`Cannot cancel: invalid stage "${currentStage}"`);
        }

        const stageData = session.stageData as Record<string, Record<string, unknown>>;
        const currentStageData = stageData[currentStage] ?? {};

        // Increment epoch (invalidates any in-flight chain-completion/rescue)
        const currentEpoch = session.decisionEpoch ?? 0;
        const newEpoch = currentEpoch + 1;

        // Revert stageStatus if pending_validation
        const statusReverted = session.stageStatus === "pending_validation";

        // Invalidate artifact if exists
        let artifactInvalidated = false;
        const artifactId = currentStageData.artifactId as string | undefined;
        if (artifactId) {
            try {
                await ctx.db.patch(artifactId as Id<"artifacts">, {
                    invalidatedAt: Date.now(),
                });
                artifactInvalidated = true;
            } catch {
                console.warn(`[PAPER][cancel-choice] artifact patch failed id=${artifactId}`);
            }
        }

        // Clear stageData (preserve revisionCount only)
        const revisionCount = typeof currentStageData.revisionCount === "number"
            ? currentStageData.revisionCount : 0;
        const updatedStageData = { ...stageData };
        updatedStageData[currentStage] = { revisionCount };

        await ctx.db.patch(args.sessionId, {
            stageData: updatedStageData,
            stageStatus: statusReverted ? "drafting" : session.stageStatus,
            decisionEpoch: newEpoch,
            updatedAt: Date.now(),
        });

        console.info(`[PAPER][cancel-choice] stage=${currentStage} artifactInvalidated=${artifactInvalidated} statusReverted=${statusReverted} epoch=${newEpoch}`);
        return { stage: currentStage, artifactInvalidated, statusReverted };
    },
});
```

**Step 2: Verify mutation compiles**

Run: `npx convex dev --once`
Expected: No errors.

**Step 3: Commit**

```bash
git add convex/paperSessions.ts
git commit -m "feat(cancel-decision): add cancelChoiceDecision mutation"
```

---

### Task 1.4: Epoch stamping in request pipeline (Agent: `backend-developer`)

**Integration point:** `acceptChatRequest` (`accept-chat-request.ts`) does NOT have `paperSessionId` — it only has `conversationId` and `choiceInteractionEvent`. The `paperSession` is first queried in `orchestrate-sync-run.ts:509-513`. Therefore epoch stamping MUST happen in orchestrate, not accept.

**Files:**
- Modify: `src/lib/chat-harness/executor/types.ts:122` (add `myEpoch` to `OnFinishConfig`)
- Modify: `src/lib/chat-harness/runtime/orchestrate-sync-run.ts:509-520` (stamp epoch after paperSession query)

`AcceptedChatRequest` (`types/runtime.ts`) is NOT modified — epoch is stamped as a local variable in orchestrate and passed directly to OnFinishConfig. No reason to widen the AcceptedChatRequest contract.

**Step 1: Add `myEpoch` to OnFinishConfig type**

In `src/lib/chat-harness/executor/types.ts`, after `requestStartedAt: number | undefined` (line 122):

```typescript
    requestStartedAt: number | undefined
    myEpoch: number | undefined  // Cancel decision: epoch at choice submission time
```

**Step 2: Stamp epoch in orchestrate-sync-run.ts**

In `src/lib/chat-harness/runtime/orchestrate-sync-run.ts`, after `paperSession` is queried (line 509-513) and `paperStageScope` is derived (line 515-518), add epoch stamping:

```typescript
    const paperSession = paperModePrompt
        ? ((await accepted.fetchQueryWithToken(api.paperSessions.getByConversation, {
              conversationId,
          })) as PaperSessionForExecutor | null)
        : null

    // Cancel Decision: stamp epoch when this is a choice interaction request
    let myEpoch: number | undefined
    if (accepted.choiceInteractionEvent && paperSession?._id) {
        try {
            const epochResult = await accepted.fetchMutationWithToken(
                api.paperSessions.stampDecisionEpoch,
                { sessionId: paperSession._id }
            )
            myEpoch = epochResult.epoch
            console.info(`[CANCEL-DECISION] epoch stamped: ${myEpoch} for stage=${paperSession.currentStage}`)
        } catch (epochErr) {
            console.warn(`[CANCEL-DECISION] stampDecisionEpoch failed:`, epochErr)
        }
    }
```

**Step 3: Pass myEpoch to OnFinishConfig**

In the same file, at line 420 where `requestStartedAt` is passed to the onFinish config:

```typescript
                requestStartedAt: accepted.requestStartedAt,
                myEpoch,
```

**Step 4: Verify pipeline compiles**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 5: Commit**

```bash
git add src/lib/chat-harness/executor/types.ts src/lib/chat-harness/runtime/orchestrate-sync-run.ts
git commit -m "feat(cancel-decision): stamp decisionEpoch in orchestrate pipeline"
```

---

### Task 1.5: Epoch guard in build-on-finish-handler.ts (Agent: `backend-developer`)

**Files:**
- Modify: `src/lib/chat-harness/executor/build-on-finish-handler.ts:593-646` (chain-completion)
- Modify: `src/lib/chat-harness/executor/build-on-finish-handler.ts:406-460` (lampiran rescue)
- Modify: `src/lib/chat-harness/executor/build-on-finish-handler.ts:462-581` (judul rescue)

**Step 1: Create epoch check helper at top of onFinish builder**

Add a helper function inside the builder (or at module scope):

```typescript
/** Check if this request's epoch is still current. Returns false if decision changed. */
async function isEpochCurrent(
    fetchQueryWithToken: ConvexFetchQuery,
    sessionId: string,
    myEpoch: number | undefined,
    label: string
): Promise<boolean> {
    if (myEpoch === undefined) return true // No epoch stamped = not a choice request
    try {
        const fresh = await fetchQueryWithToken(api.paperSessions.getById, { sessionId })
        if (fresh && fresh.decisionEpoch !== myEpoch) {
            console.info(`[${label}] aborted: epoch drift (mine=${myEpoch}, current=${fresh.decisionEpoch})`)
            return false
        }
    } catch {
        // If we can't check, proceed cautiously
        console.warn(`[${label}] epoch check failed, proceeding`)
    }
    return true
}
```

**Step 2: Add epoch check before chain-completion (line 603)**

Inside the chain-completion block, after `const chainStartTime = Date.now()` (line 603), before `try {`:

```typescript
                // Cancel Decision: abort if epoch drifted
                if (!await isEpochCurrent(fetchQueryWithToken, paperSession!._id, config.myEpoch, "CHAIN-COMPLETION")) {
                    measureStep("chainCompletion", Date.now() - chainStartTime)
                } else {
                    // existing try block continues here...
```

Restructure the existing try-catch to be inside the else branch. OR simpler: add early-return guard:

```typescript
                const chainStartTime = Date.now()
                // Cancel Decision: abort if epoch drifted
                const epochOk = await isEpochCurrent(fetchQueryWithToken, paperSession!._id, config.myEpoch, "CHAIN-COMPLETION")
                if (epochOk) {
                    try {
                        // ... existing chain-completion code ...
                    } catch (chainErr) {
                        // ... existing error handling ...
                    }
                }
                measureStep("chainCompletion", Date.now() - chainStartTime)
```

**Step 3: Add epoch check before lampiran rescue (line 416)**

Same pattern: before `const lampiranRescueStart`, add epoch check. Wrap rescue body.

**Step 4: Add epoch check before judul rescue (line 478)**

Same pattern: before `const judulRescueStart`, add epoch check. Wrap rescue body.

**Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 6: Commit**

```bash
git add src/lib/chat-harness/executor/build-on-finish-handler.ts
git commit -m "feat(cancel-decision): add decisionEpoch guard to chain-completion and rescue paths"
```

---

### Task 1.6: Two-set `submittedChoiceKeys` refactor (Agent: `frontend-developer`)

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx:577` (state declaration)
- Modify: `src/components/chat/ChatWindow.tsx:1348` (handleChoiceSubmit)
- Modify: `src/components/chat/ChatWindow.tsx:1647-1669` (rehydration useEffect)

**Step 1: Replace single set with two-set approach**

At line 577, replace:
```typescript
const [submittedChoiceKeys, setSubmittedChoiceKeys] = useState<Set<string>>(new Set())
```

With:
```typescript
// Cancel Decision: two-set approach (design doc 5.5.1)
// persistedChoiceKeys — full-derived from historyMessages
// optimisticPendingKeys — bridges submit→persist gap, cleared on cancel or persistence confirm
const [persistedChoiceKeys, setPersistedChoiceKeys] = useState<Set<string>>(new Set())
const [optimisticPendingKeys, setOptimisticPendingKeys] = useState<Set<string>>(new Set())
```

**Step 2: Add derived `isChoiceSubmitted` helper**

Below the state declarations:
```typescript
const isChoiceSubmitted = useCallback((key: string) => {
    return persistedChoiceKeys.has(key) || optimisticPendingKeys.has(key)
}, [persistedChoiceKeys, optimisticPendingKeys])
```

**Step 3: Update handleChoiceSubmit (line 1348)**

Replace:
```typescript
setSubmittedChoiceKeys((prev) => new Set([...prev, submissionKey]))
```
With:
```typescript
setOptimisticPendingKeys((prev) => new Set([...prev, submissionKey]))
```

**Step 4: Rewrite rehydration useEffect (lines 1647-1669)**

Replace the entire useEffect with full-derive + optimistic migration:

```typescript
// Rehydrate submitted choice keys from history — full-derive persisted set
useEffect(() => {
    if (!historyMessages || historyMessages.length === 0) return
    const keys = new Set<string>()
    for (let i = 0; i < historyMessages.length; i++) {
        const msg = historyMessages[i]
        if (msg.role === "user" && typeof msg.content === "string" && msg.content.startsWith("[Choice:")) {
            for (let j = i - 1; j >= 0; j--) {
                const prev = historyMessages[j]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (prev.role === "assistant" && (prev as any).jsonRendererChoice) {
                    keys.add(`${prev._id}::${prev._id}-choice-spec`)
                    break
                }
            }
        }
    }
    // Full-derive: replace entire persisted set
    setPersistedChoiceKeys(keys)
    // Migrate confirmed keys from optimistic to persisted
    setOptimisticPendingKeys((prev) => {
        const next = new Set(prev)
        for (const key of prev) {
            if (keys.has(key)) next.delete(key) // Now in persisted, remove from optimistic
        }
        return next.size === prev.size ? prev : next
    })
}, [historyMessages])
```

**Step 5: Preserve existing interface — derive combined `submittedChoiceKeys` for prop usage**

The existing interface passes a boolean to `MessageBubble`:
```typescript
// ChatWindow.tsx:2767 — existing usage (DO NOT change prop interface)
isChoiceSubmitted={submittedChoiceKeys.has(`${message.id}::${message.id}-choice-spec`)}
```

`MessageBubble` receives `isChoiceSubmitted?: boolean` (line 171) — NOT a set. No child component changes needed.

Create a derived combined view for this single call site:

```typescript
// Derived combined set — replaces the old single submittedChoiceKeys state
const submittedChoiceKeys = useMemo(() =>
    new Set([...persistedChoiceKeys, ...optimisticPendingKeys]),
    [persistedChoiceKeys, optimisticPendingKeys]
)
```

This keeps the existing `submittedChoiceKeys.has(...)` call at line 2767 working with zero changes to the render code or `MessageBubble` props.

**Step 6: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors. The derived `submittedChoiceKeys` is a drop-in replacement — same `Set<string>` type, same `.has()` method.

**Step 7: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat(cancel-decision): split submittedChoiceKeys into persisted + optimistic sets"
```

---

### Task 1.7: `handleCancelChoice` handler + UI (Agent: `frontend-developer`)

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx` (add handler + wire mutation)
- Modify: `src/components/chat/MessageBubble.tsx` (add Batalkan button for `kind: "choice"`)

Visibility guards (streaming, stage status) are inline in MessageBubble render code — no separate utility function. V1 scope is simple enough that an extracted utility would be dead weight.

**Step 1: Add `handleCancelChoice` in ChatWindow.tsx**

After `handleApprove` and `handleRevise`, add:

**Data model note:** `MessageBubble` receives `UIMessage` (AI SDK type). The identifier is `message.id` (string), NOT `message._id` (Convex Id). The Convex `_id` is on the raw `historyMessages` items, not on the `messages` state (UIMessage[]). The cancel handler receives `message.id` from the UI, but `editAndTruncateConversation` needs a Convex `Id<"messages">`. The mapping between them uses `historyMessages` which has both `.uiMessageId` and `._id`.

Similarly, `jsonRendererChoice` is a field on raw Convex messages, NOT on UIMessage. During rehydration (ChatWindow.tsx:1524-1538), the choice spec is parsed from Convex message's `jsonRendererChoice` and injected as a `parts` entry on UIMessage. So assistant message lookup for key cleanup must use `historyMessages`, not `messages`.

```typescript
const handleCancelChoice = useCallback(async (uiMessageId: string, syntheticMessageIndex: number) => {
    if (!userId || !paperSession?._id || !conversationId) return
    try {
        // 1. Revert Convex state
        await cancelChoiceDecision({ sessionId: paperSession._id, userId })

        // 2. Map UIMessage.id → Convex message._id for truncation
        // historyMessages are raw Convex messages; find the one matching this UI message
        const convexMsg = historyMessages?.find(
            (m) => m.uiMessageId === uiMessageId || String(m._id) === uiMessageId
        )
        if (convexMsg) {
            await editAndTruncateConversation({
                messageId: convexMsg._id as Id<"messages">,
                content: "", // Required arg, not used
                conversationId,
            })
        }

        // 3. Truncate local messages (UIMessage state)
        setMessages((prev) => prev.slice(0, syntheticMessageIndex))

        // 4. Remove from both choice key sets
        // Walk backward in historyMessages to find the assistant message with jsonRendererChoice
        // (jsonRendererChoice is a Convex field, NOT on UIMessage)
        if (historyMessages) {
            const syntheticIdx = historyMessages.findIndex(
                (m) => m.uiMessageId === uiMessageId || String(m._id) === uiMessageId
            )
            if (syntheticIdx > 0) {
                for (let j = syntheticIdx - 1; j >= 0; j--) {
                    const prev = historyMessages[j]
                    if (prev.role === "assistant" && (prev as any).jsonRendererChoice) {
                        // Key format matches rehydration: ChatWindow.tsx:1659
                        const key = `${prev._id}::${prev._id}-choice-spec`
                        setPersistedChoiceKeys((p) => { const n = new Set(p); n.delete(key); return n })
                        setOptimisticPendingKeys((p) => { const n = new Set(p); n.delete(key); return n })
                        break
                    }
                }
            }
        }

        // 5. Clear optimistic pending validation if it was set
        setOptimisticPendingValidation(false)

        console.info("[CANCEL-DECISION] choice cancelled, card re-activated")
    } catch (error) {
        Sentry.captureException(error, { tags: { subsystem: "paper.cancel-choice" } })
        console.error("Failed to cancel choice:", error)
        toast.error("Gagal membatalkan pilihan.")
    }
}, [userId, paperSession?._id, conversationId, historyMessages, cancelChoiceDecision, editAndTruncateConversation, setMessages])
```

Note: `cancelChoiceDecision` must be wired up via `useMutation(api.paperSessions.cancelChoiceDecision)` at the top of the component. Add this alongside other mutation hooks.

**Step 2: Pass `onCancelChoice` to MessageBubble**

In the `MessageBubble` render call, add the new callback prop. Also pass `isStreaming`.

**Step 3: Add "Batalkan" button in MessageBubble.tsx**

In `MessageBubble.tsx`, in the action buttons area (lines 1158-1202), for user messages where `autoUserAction?.kind === "choice"`:

Replace the edit icon with a "Batalkan" button. The logic:

```typescript
{onEdit && (() => {
    const autoAction = parseAutoUserAction(typeof message.content === "string" ? message.content : "")
    // Cancel Decision: replace edit icon with Batalkan for choice synthetic messages
    if (autoAction?.kind === "choice" && onCancelChoice) {
        const cancelAllowed = !isStreaming // simplified; full check in caller
        return cancelAllowed ? (
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => onCancelChoice(message.id, messageIndex)}
                        className={actionBtnClass}
                        style={{ color: "var(--chat-warning-foreground, var(--chat-muted-foreground))" }}
                        aria-label="Batalkan pilihan"
                    >
                        <Undo2 className={actionIconClass} strokeWidth={2} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="left">Batalkan</TooltipContent>
            </Tooltip>
        ) : null
    }
    // ... existing edit icon code for non-synthetic messages ...
})()}
```

Import `Undo2` from `lucide-react` (or use appropriate icon from the project's icon set — check existing imports).

**Step 4: Add `onCancelChoice` to MessageBubble props interface**

Add to the existing props:
```typescript
onCancelChoice?: (messageId: string, messageIndex: number) => void
isStreaming?: boolean
```

**Step 5: Verify compilation and visual**

Run: `npx tsc --noEmit`
Expected: No errors.

Manual check: choice synthetic message should show undo icon instead of edit pencil.

**Step 6: Commit**

```bash
git add src/components/chat/ChatWindow.tsx src/components/chat/MessageBubble.tsx
git commit -m "feat(cancel-decision): add handleCancelChoice handler + Batalkan button for choice messages"
```

---

### Task 1.8: Phase 1 Review (Agent: `code-reviewer`)

**Review Checklist:**

1. **Schema:** `decisionEpoch: v.optional(v.number())` in paperSessions — backward compatible?
2. **Mutations:** `stampDecisionEpoch`, `cancelChoiceDecision` — guards correct? `requirePaperSessionOwner` used?
3. **Epoch pipeline:** `orchestrate-sync-run.ts` (stamp after paperSession query) → `OnFinishConfig` → `build-on-finish-handler.ts` — `myEpoch` passed correctly? NOT stamped in `accept-chat-request.ts` (no paperSessionId there)?
4. **Epoch guard:** Chain-completion, lampiran rescue, judul rescue — all three protected?
5. **Two-set submittedChoiceKeys:** Full-derive from historyMessages + optimistic migration — no stale key re-add? No optimistic key wipe?
6. **handleCancelChoice:** State revert order correct? (mutation first, then message delete, then local state cleanup)
7. **optimisticPendingValidation:** Cleared on cancel?
8. **No unused imports/exports left behind**
9. **Cross-reference with design doc sections:** 4.2, 5.1, 5.3, 5.5.1, 5.5.2, 5.5.4

**Report format to user:**

```
## Phase 1 Report: Cancel Choice Card + Client State Fixes

### Commits
- [list of commits with messages]

### Files Modified
- [list with line ranges]

### Design Doc Compliance
- Section 4.2 (Cancel Choice Card): [PASS/ISSUE]
- Section 5.1 (cancelChoiceDecision): [PASS/ISSUE]
- Section 5.3 (stampDecisionEpoch): [PASS/ISSUE]
- Section 5.5.1 (two-set submittedChoiceKeys): [PASS/ISSUE]
- Section 5.5.2 (optimisticPendingValidation clear): [PASS/ISSUE]
- Section 5.5.4 (decisionEpoch guard): [PASS/ISSUE]

### Issues Found
- [any issues with severity]

### Awaiting User Validation
Phase 2 (Cancel Approval) will begin after user confirmation.
```

---

## Phase 2: Cancel Approval + Harness Run Guard

**Scope:** `unapproveStage` mutation, `titleStrippedOnApproval` flag in `approveStage`, `handleCancelApproval` handler, "Batalkan" button for `kind: "approved"` with 30-second throttle, harness run guard.

**Depends on:** Phase 1 complete (client state patterns, epoch infrastructure).

---

### Task 2.1: `titleStrippedOnApproval` flag in `approveStage` (Agent: `backend-developer`)

**Files:**
- Modify: `convex/paperSessions.ts:1261-1268` (approveStage title stripping)

**Step 1: Store flag when title is stripped**

In `approveStage`, at line 1262-1268, after stripping the title, store the flag:

```typescript
            if (artifact && /^draf(?:t)?\b/i.test(artifact.title)) {
                const finalTitle = artifact.title.replace(/^draf(?:t)?\b\s*/i, "").trim();
                if (finalTitle) {
                    await ctx.db.patch(stageArtifactId as Id<"artifacts">, { title: finalTitle });
                    decisionText = finalTitle;
                    // Cancel Decision: record that we stripped the prefix for unapproveStage reversal
                    updatedStageData[currentStage] = {
                        ...updatedStageData[currentStage],
                        titleStrippedOnApproval: true,
                    };
                }
            }
```

This uses the existing `updatedStageData` object (line 1240) which already has `validatedAt` added. The flag is stored in stageData (not a new schema field), so no schema change needed.

**Step 2: Verify compilation**

Run: `npx convex dev --once`
Expected: No errors.

**Step 3: Commit**

```bash
git add convex/paperSessions.ts
git commit -m "feat(cancel-decision): store titleStrippedOnApproval flag in approveStage"
```

---

### Task 2.2: `unapproveStage` mutation (Agent: `backend-developer`)

**Files:**
- Modify: `convex/paperSessions.ts` (add mutation after `cancelChoiceDecision`)

**Step 1: Add `unapproveStage` mutation**

This is the most complex mutation. Follow design doc section 5.2 precisely:

```typescript
/**
 * Unapprove a stage — revert the last approval decision.
 * Only allowed when the approved stage is exactly 1 stage behind currentStage.
 * Ref: design doc section 5.2
 */
export const unapproveStage = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { session } = await requirePaperSessionOwner(ctx, args.sessionId);
        const now = Date.now();

        // Guard: valid post-approval state
        const isNormalApproval = session.stageStatus === "drafting";
        const isFinalApproval = session.currentStage === "completed" && session.stageStatus === "approved";
        if (!isNormalApproval && !isFinalApproval) {
            throw new Error(`Cannot unapprove: stageStatus="${session.stageStatus}", currentStage="${session.currentStage}"`);
        }

        // Derive targetStage
        let targetStage: PaperStageId;
        if (isFinalApproval) {
            // completed → last STAGE_ORDER entry ("judul")
            targetStage = STAGE_ORDER[STAGE_ORDER.length - 1];
        } else {
            const prev = getPreviousStage(session.currentStage as PaperStageId);
            if (!prev) throw new Error(`Cannot unapprove: no previous stage for "${session.currentStage}"`);
            targetStage = prev;
        }

        // Guard: target stage must have validatedAt
        const stageData = session.stageData as Record<string, Record<string, unknown>>;
        const targetStageData = stageData[targetStage];
        if (!targetStageData?.validatedAt) {
            throw new Error(`Cannot unapprove: stage "${targetStage}" has no validatedAt`);
        }

        // Save nextStageToClear BEFORE revert (this is the stage opened after approval)
        const nextStageToClear = session.currentStage;

        // 1. Remove validatedAt from targetStage stageData
        const updatedStageData = { ...stageData };
        const { validatedAt: _, ...targetStageWithoutValidated } = targetStageData;
        updatedStageData[targetStage] = targetStageWithoutValidated;

        // 2. Clear nextStageToClear stageData (may have _plan or draft fields)
        if (nextStageToClear !== "completed" && updatedStageData[nextStageToClear]) {
            updatedStageData[nextStageToClear] = {};
        }

        // 3. Mark last digest entry as superseded (consistent with rewind pattern)
        const existingDigest = (session.paperMemoryDigest as Array<{
            stage: string; decision: string; timestamp: number; superseded?: boolean;
        }>) || [];
        const updatedDigest = [...existingDigest];
        // Find last entry for targetStage and mark superseded
        for (let i = updatedDigest.length - 1; i >= 0; i--) {
            if (updatedDigest[i].stage === targetStage && !updatedDigest[i].superseded) {
                updatedDigest[i] = { ...updatedDigest[i], superseded: true };
                break;
            }
        }

        // 4. Remove last stageMessageBoundaries entry (verify stage matches)
        const existingBoundaries = (session.stageMessageBoundaries as Array<{
            stage: string; firstMessageId: string; lastMessageId: string; messageCount: number;
        }>) || [];
        let updatedBoundaries = existingBoundaries;
        if (existingBoundaries.length > 0) {
            const lastBoundary = existingBoundaries[existingBoundaries.length - 1];
            if (lastBoundary.stage === targetStage) {
                updatedBoundaries = existingBoundaries.slice(0, -1);
            }
        }

        // 5. Re-add "Draf " prefix to artifact title if stripped on approval
        if (targetStageData.titleStrippedOnApproval && targetStageData.artifactId) {
            try {
                const artifact = await ctx.db.get(targetStageData.artifactId as Id<"artifacts">);
                if (artifact && artifact.title && !/^draf(?:t)?\b/i.test(artifact.title)) {
                    await ctx.db.patch(targetStageData.artifactId as Id<"artifacts">, {
                        title: `Draf ${artifact.title}`,
                    });
                }
            } catch {
                console.warn(`[PAPER][unapprove] artifact title re-prefix failed`);
            }
        }

        // Build patch
        const patchData: Record<string, unknown> = {
            currentStage: targetStage,
            stageStatus: "pending_validation",
            stageData: updatedStageData,
            paperMemoryDigest: updatedDigest,
            stageMessageBoundaries: updatedBoundaries,
            updatedAt: now,
        };

        // 6. If targetStage === "judul": clear paperTitle, workingTitle, completedAt
        if (targetStage === "judul") {
            patchData.paperTitle = undefined;
            patchData.workingTitle = undefined;
            patchData.completedAt = undefined;
        }

        await ctx.db.patch(args.sessionId, patchData);

        // 7. Rebuild naskahSnapshot
        await rebuildNaskahSnapshot(ctx, args.sessionId);

        const clearedNextStage = nextStageToClear !== "completed" && !!stageData[nextStageToClear];
        console.info(`[PAPER][unapprove] stage=${targetStage} clearedNextStage=${clearedNextStage}`);
        return { targetStage, clearedNextStage };
    },
});
```

**Step 2: Verify compilation**

Run: `npx convex dev --once`
Expected: No errors.

**Step 3: Commit**

```bash
git add convex/paperSessions.ts
git commit -m "feat(cancel-decision): add unapproveStage mutation"
```

---

### Task 2.3: `handleCancelApproval` handler + UI (Agent: `frontend-developer`)

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx` (add handler + wire mutation)
- Modify: `src/components/chat/MessageBubble.tsx` (add Batalkan button for `kind: "approved"`)

Visibility guards (streaming, 30-second throttle) are inline in MessageBubble render code — same rationale as Task 1.7.

**Step 1: Add `handleCancelApproval` in ChatWindow.tsx**

**Data model note:** Same as Task 1.7 — `MessageBubble` passes `message.id` (UIMessage string), but `editAndTruncateConversation` needs Convex `Id<"messages">`. Map via `historyMessages`.

```typescript
const handleCancelApproval = useCallback(async (uiMessageId: string, syntheticMessageIndex: number) => {
    if (!userId || !paperSession?._id || !conversationId) return
    try {
        // 1. Revert Convex state
        await unapproveStage({ sessionId: paperSession._id, userId })

        // 2. Map UIMessage.id → Convex message._id for truncation
        const convexMsg = historyMessages?.find(
            (m) => m.uiMessageId === uiMessageId || String(m._id) === uiMessageId
        )
        if (convexMsg) {
            await editAndTruncateConversation({
                messageId: convexMsg._id as Id<"messages">,
                content: "",
                conversationId,
            })
        }

        // 3. Truncate local messages (UIMessage state)
        setMessages((prev) => prev.slice(0, syntheticMessageIndex))

        // 4. Validation panel auto-reappears via Convex reactivity
        // (stageStatus = "pending_validation" triggers panel render)

        console.info("[CANCEL-DECISION] approval cancelled, validation panel re-shown")
    } catch (error) {
        Sentry.captureException(error, { tags: { subsystem: "paper.cancel-approval" } })
        console.error("Failed to cancel approval:", error)
        toast.error("Gagal membatalkan persetujuan.")
    }
}, [userId, paperSession?._id, conversationId, historyMessages, unapproveStage, editAndTruncateConversation, setMessages])
```

Wire up `unapproveStage` via `useMutation(api.paperSessions.unapproveStage)`.

**Step 2: Add Batalkan button for `kind: "approved"` in MessageBubble**

Same pattern as Task 1.7 Step 4, but for `autoAction?.kind === "approved"`:

```typescript
if (autoAction?.kind === "approved" && onCancelApproval) {
    // 30-second throttle using message.createdAt
    const messageAge = message.createdAt ? Date.now() - message.createdAt : 0
    const throttled = !message.createdAt || messageAge < 30_000
    return !isStreaming && !throttled ? (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={() => onCancelApproval(message.id, messageIndex)}
                    className={actionBtnClass}
                    style={{ color: "var(--chat-warning-foreground, var(--chat-muted-foreground))" }}
                    aria-label="Batalkan persetujuan"
                >
                    <Undo2 className={actionIconClass} strokeWidth={2} />
                </button>
            </TooltipTrigger>
            <TooltipContent side="left">Batalkan</TooltipContent>
        </Tooltip>
    ) : null
}
```

**Step 3: Add `onCancelApproval` prop to MessageBubble**

```typescript
onCancelApproval?: (messageId: string, messageIndex: number) => void
```

**Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 5: Commit**

```bash
git add src/components/chat/ChatWindow.tsx src/components/chat/MessageBubble.tsx
git commit -m "feat(cancel-decision): add handleCancelApproval handler + Batalkan button for approved messages"
```

---

### Task 2.4: Phase 2 Review (Agent: `code-reviewer`)

**Review Checklist:**

1. **`approveStage` flag:** `titleStrippedOnApproval` stored correctly? Only when regex matches AND finalTitle is non-empty?
2. **`unapproveStage` mutation completeness:**
   - Guard: both normal approval AND final approval (completed) states?
   - targetStage derivation: `getPreviousStage` for normal, last STAGE_ORDER for completed?
   - `nextStageToClear` saved BEFORE revert?
   - Digest: `superseded` pattern (NOT delete)?
   - Boundaries: remove (NOT supersede)?
   - Title re-prefix: only when `titleStrippedOnApproval` flag present?
   - judul special case: `paperTitle`, `workingTitle`, `completedAt` cleared?
   - `rebuildNaskahSnapshot` called?
3. **30-second throttle:** Uses `message.createdAt`? Default hide when absent?
4. **`handleCancelApproval`:** No AI turn triggered? Just state revert + message delete?
5. **Cross-reference with design doc sections:** 4.3, 5.2, 5.5.3

**Report format to user:** Same structure as Phase 1 report.

---

## Phase 3: Remove Edit+Resend from Synthetic Messages

**Scope:** Hide edit icon for `choice` and `approved` synthetic messages. `revision` synthetic messages keep edit+resend (V1 scope limitation per design doc section 8).

**Depends on:** Phase 1 + Phase 2 complete (Batalkan must fully work before removing fallback).

---

### Task 3.1: Hide edit icon for choice + approved synthetics (Agent: `frontend-developer`)

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx:1158-1202` (action buttons area)

**Step 1: Modify edit icon visibility**

In the action buttons area, the edit icon rendering logic (lines 1165-1187) should be hidden when the message is a `choice` or `approved` synthetic:

```typescript
{onEdit && (() => {
    const autoAction = parseAutoUserAction(typeof message.content === "string" ? message.content : "")

    // Cancel Decision Phase 3: choice + approved synthetics use Batalkan, not edit
    if (autoAction?.kind === "choice" && onCancelChoice) {
        // Batalkan button (already added in Phase 1, Task 1.7)
        // ... existing Batalkan code ...
        return /* Batalkan button JSX */
    }
    if (autoAction?.kind === "approved" && onCancelApproval) {
        // Batalkan button (already added in Phase 2, Task 2.3)
        // ... existing Batalkan code ...
        return /* Batalkan button JSX */
    }
    // revision + regular messages: keep edit icon
    if (autoAction?.kind === "revision") {
        // V1: revision keeps edit+resend path (design doc section 8)
        // Fall through to existing edit icon
    }

    // Existing edit icon code (unchanged)
    return editPermission.allowed ? (
        // ... existing edit button ...
    ) : (
        // ... existing disabled edit button ...
    )
})()}
```

**Important:** This is likely a refactor of what was already partially done in Tasks 1.7 and 2.3. The key change is making the edit icon COMPLETELY gone for choice + approved (not just adding Batalkan alongside it). Verify that only one icon shows — Batalkan XOR edit, never both.

**Step 2: Verify revision messages still show edit icon**

Manual check: Send a revision synthetic message `[Revisi untuk ...]` → edit pencil icon should still appear.

**Step 3: Commit**

```bash
git add src/components/chat/MessageBubble.tsx
git commit -m "feat(cancel-decision): remove edit+resend from choice and approved synthetic messages"
```

---

### Task 3.2: Phase 3 Review (Agent: `code-reviewer`)

**Review Checklist:**

1. **Choice synthetics:** Edit icon hidden? Only Batalkan shows?
2. **Approved synthetics:** Edit icon hidden? Only Batalkan shows (with 30s throttle)?
3. **Revision synthetics:** Edit icon STILL shows? Edit+resend path unchanged?
4. **Regular user messages:** Edit icon STILL shows? No regression?
5. **Cross-reference with design doc section 8:** V1 scope correct?
6. **No unused code left:** `resetStageDataForEditResend` still referenced for non-synthetic edit+resend?

**Final Report format to user:**

```
## Phase 3 Report: Remove Edit+Resend from Synthetic Messages

### Commits
- [list]

### Files Modified
- [list]

### V1 Scope Verification
- [x] choice messages: Batalkan only, no edit
- [x] approved messages: Batalkan only (30s throttle), no edit
- [x] revision messages: edit+resend preserved (V1 intentional)
- [x] regular user messages: edit icon unchanged
- [x] resetStageDataForEditResend: still used for non-synthetic edit

### FULL IMPLEMENTATION COMPLETE
All 3 phases delivered. Design doc sections covered:
4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.5.1, 5.5.2, 5.5.3, 5.5.4, 6, 7, 8
```

---

## Summary: Files Modified

| File | Phase | Changes |
|------|-------|---------|
| `convex/schema.ts` | 1 | `decisionEpoch` field |
| `convex/paperSessions.ts` | 1+2 | `stampDecisionEpoch`, `cancelChoiceDecision`, `unapproveStage` mutations + `titleStrippedOnApproval` flag |
| `src/lib/chat-harness/executor/types.ts` | 1 | `myEpoch` in OnFinishConfig |
| `src/lib/chat-harness/runtime/orchestrate-sync-run.ts` | 1 | Stamp epoch after paperSession query + pass to OnFinishConfig |
| `src/lib/chat-harness/executor/build-on-finish-handler.ts` | 1 | Epoch guard on chain-completion + rescues |
| `src/components/chat/ChatWindow.tsx` | 1+2 | Two-set submittedChoiceKeys, `handleCancelChoice`, `handleCancelApproval` |
| `src/components/chat/MessageBubble.tsx` | 1+2+3 | Batalkan buttons (inline guards), edit icon removal for synthetics |
