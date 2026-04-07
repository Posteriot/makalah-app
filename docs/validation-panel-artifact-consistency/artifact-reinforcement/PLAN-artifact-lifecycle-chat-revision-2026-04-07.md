# Artifact Lifecycle — Chat-Triggered Revision & Versioning Reinforcement: Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable chat-triggered artifact revision across all 14 paper stages with backend safety net, stale choice guard, and observability.

**Architecture:** Hybrid approach — prompt instructs model to detect revision intent and call `requestRevision` tool (primary), backend auto-transitions to revision if model forgets (safety net). Stale choice guard rejects non-drafting choices deterministically. All changes are in shared layers, universal for all 14 stages.

**Tech Stack:** Convex (backend mutations), Next.js API route (tool orchestration), React (frontend hooks), Vitest (testing)

**Design doc:** `docs/validation-panel-artifact-consistency/artifact-reinforcement/DESIGN-artifact-lifecycle-chat-revision-2026-04-07.md`

---

### Task 1: Backend — Add `trigger` parameter to `requestRevision` mutation

**Files:**
- Modify: `convex/paperSessions.ts:1141-1179`
- Modify: `src/lib/hooks/usePaperSession.ts:121-128`
- Test: `convex/paperSessions.test.ts`

**Step 1: Write the failing test**

In `convex/paperSessions.test.ts`, append after line 73:

```typescript
describe("requestRevision — trigger parameter", () => {
  it("accepts trigger 'panel' and returns it in result", async () => {
    const session = makeSession({
      stageStatus: "pending_validation",
      stageData: { gagasan: { revisionCount: 0 } },
    });
    mockedRequirePaperSessionOwner.mockResolvedValue({ session } as never);
    const { ctx, patches } = makeMockCtx();

    const fn = requestRevision as unknown as {
      _handler: (ctx: unknown, args: {
        sessionId: string; userId: string; feedback: string; trigger: string;
      }) => Promise<unknown>;
    };
    const result = await fn._handler(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      feedback: "Fix paragraph 2",
      trigger: "panel",
    });

    expect(patches[0].patch).toMatchObject({ stageStatus: "revision" });
    expect(result).toMatchObject({ trigger: "panel" });
  });

  it("accepts trigger 'model' and returns it in result", async () => {
    const session = makeSession({
      stageStatus: "pending_validation",
      stageData: { gagasan: { revisionCount: 0 } },
    });
    mockedRequirePaperSessionOwner.mockResolvedValue({ session } as never);
    const { ctx } = makeMockCtx();

    const fn = requestRevision as unknown as {
      _handler: (ctx: unknown, args: {
        sessionId: string; userId: string; feedback: string; trigger: string;
      }) => Promise<unknown>;
    };
    const result = await fn._handler(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      feedback: "Revise intro",
      trigger: "model",
    });

    expect(result).toMatchObject({ trigger: "model" });
  });
});
```

Also add the import at line 2:

```typescript
import { submitForValidation, requestRevision } from "./paperSessions";
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run convex/paperSessions.test.ts --reporter=verbose`
Expected: FAIL — `requestRevision` does not accept `trigger` arg yet, and `requireAuthUserId` mock is missing for the new tests. Fix mock if needed — the handler currently uses `requireAuthUserId` (line 1148), but existing tests mock `requirePaperSessionOwner`. The new describe block needs `requestRevision` handler called directly, so also mock `requireAuthUserId`:

```typescript
vi.mock("./authHelpers", () => ({
  requireAuthUser: vi.fn(),
  requirePaperSessionOwner: vi.fn(),
  requireAuthUserId: vi.fn(),
}));
```

**Step 3: Implement — modify `requestRevision` mutation**

In `convex/paperSessions.ts`, change lines 1141-1179:

```typescript
export const requestRevision = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
        feedback: v.string(),
        trigger: v.optional(v.union(v.literal("panel"), v.literal("model"))),
    },
    handler: async (ctx, args) => {
        await requireAuthUserId(ctx, args.userId);
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        const trigger = args.trigger ?? "panel";
        const now = Date.now();
        const currentStage = session.currentStage;
        if (!STAGE_ORDER.includes(currentStage as PaperStageId)) {
            throw new Error(`Unknown current stage: ${currentStage}`);
        }

        const previousStatus = session.stageStatus;

        const updatedStageData = { ...session.stageData } as Record<string, Record<string, unknown>>;
        const stageData = updatedStageData[currentStage] || { revisionCount: 0 };

        const currentRevisionCount = typeof stageData.revisionCount === 'number' ? stageData.revisionCount : 0;
        updatedStageData[currentStage] = {
            ...stageData,
            revisionCount: currentRevisionCount + 1,
        };

        await ctx.db.patch(args.sessionId, {
            stageStatus: "revision",
            stageData: updatedStageData,
            updatedAt: now,
        });

        console.log(`[Revision] stage=${currentStage} trigger=${trigger} revisionCount=${currentRevisionCount + 1} previousStatus=${previousStatus}`);

        return {
            stage: currentStage,
            revisionCount: updatedStageData[currentStage].revisionCount,
            previousStatus,
            currentStatus: "revision",
            trigger,
        };
    },
});
```

**Step 4: Update `usePaperSession.ts` hook to pass trigger**

In `src/lib/hooks/usePaperSession.ts`, change lines 121-128:

```typescript
    const requestRevision = async (userId: Id<"users">, feedback: string, trigger?: "panel" | "model") => {
        if (!session) return;
        return await requestRevisionMutation({
            sessionId: session._id,
            userId,
            feedback,
            trigger: trigger ?? "panel",
        });
    };
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run convex/paperSessions.test.ts --reporter=verbose`
Expected: PASS

**Step 6: Commit**

```bash
git add convex/paperSessions.ts convex/paperSessions.test.ts src/lib/hooks/usePaperSession.ts
git commit -m "feat: add trigger parameter to requestRevision mutation

Supports 'panel' and 'model' triggers for observability.
Backend auto-rescue will set trigger internally (next task)."
```

---

### Task 2: Backend — `autoRescueRevision` mutation + auto-rescue in `updateStageData`

**Files:**
- Modify: `convex/paperSessions.ts:639-645` (the guard block)
- Modify: `convex/paperSessions.ts` (add new `autoRescueRevision` mutation after `requestRevision`)
- Test: `convex/paperSessions.test.ts`

**Context — Trigger Trust Boundary:**
The design doc (Section 6.2) specifies:
- `requestRevision` accepts `trigger: "panel" | "model"` from callers
- Auto-rescue sets trigger `"auto-rescue"` **internally**, never accepted from caller input
- Route-level rescue and backend-level rescue both need a mutation that enforces this

**Solution:** Create `autoRescueRevision` — an internal mutation that performs the same revision logic as `requestRevision` but hardcodes `trigger: "auto-rescue"`. This mutation is used by **route-level callers only** (Task 3: `updateArtifact` and `createArtifact` handlers).

`updateStageData` keeps **mirrored inline logic** in the same DB transaction rather than calling `autoRescueRevision`, because it needs to re-read the session within its own handler context. Both paths log the identical event `revision-auto-rescued-by-backend` with `trigger=auto-rescue`.

**Step 0: Add `autoRescueRevision` mutation**

After `requestRevision` (line 1179), add:

```typescript
/**
 * Internal auto-rescue: transition from pending_validation to revision.
 * Used by updateStageData (backend) and route-level artifact tools (route).
 * Trigger is ALWAYS "auto-rescue" — never caller-provided.
 */
export const autoRescueRevision = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        source: v.string(), // e.g. "updateStageData", "updateArtifact", "createArtifact"
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");

        if (session.stageStatus !== "pending_validation") {
            // Already not pending — no rescue needed
            return {
                stage: session.currentStage,
                rescued: false,
                currentStatus: session.stageStatus,
            };
        }

        const now = Date.now();
        const currentStage = session.currentStage;

        const updatedStageData = { ...session.stageData } as Record<string, Record<string, unknown>>;
        const stageData = updatedStageData[currentStage] || { revisionCount: 0 };
        const prevCount = typeof stageData.revisionCount === 'number' ? stageData.revisionCount : 0;
        updatedStageData[currentStage] = {
            ...stageData,
            revisionCount: prevCount + 1,
        };

        await ctx.db.patch(args.sessionId, {
            stageStatus: "revision",
            stageData: updatedStageData,
            updatedAt: now,
        });

        console.log(`[revision-auto-rescued-by-backend] stage=${currentStage} trigger=auto-rescue revisionCount=${prevCount + 1} previousStatus=pending_validation source=${args.source}`);

        return {
            stage: currentStage,
            rescued: true,
            revisionCount: prevCount + 1,
            previousStatus: "pending_validation",
            currentStatus: "revision",
            trigger: "auto-rescue",
            source: args.source,
        };
    },
});
```

**Step 1: Write the failing test**

Append to `convex/paperSessions.test.ts`:

```typescript
import { updateStageData } from "./paperSessions";

// Helper to call updateStageData handler directly
async function callUpdateStageData(ctx: any, args: { sessionId: string; stage: string; data: Record<string, unknown> }) {
  const fn = updateStageData as unknown as {
    _handler: (ctx: unknown, args: typeof args) => Promise<unknown>;
  };
  return fn._handler(ctx, args);
}

describe("updateStageData — auto-revision safety net", () => {
  it("previously threw on pending_validation, now auto-transitions to revision", async () => {
    const session = makeSession({
      stageStatus: "pending_validation",
      currentStage: "outline",
      stageData: { outline: { artifactId: "artifact_123", revisionCount: 0 } },
    });
    mockedRequirePaperSessionOwner.mockResolvedValue({ session } as never);
    const { ctx, patches } = makeMockCtx();

    // Should NOT throw anymore — should auto-rescue
    const result = await callUpdateStageData(ctx, {
      sessionId: "paperSessions_1",
      stage: "outline",
      data: { tema: "Updated theme" },
    });

    // First patch: auto-revision (stageStatus → revision, revisionCount++)
    expect(patches[0].patch).toMatchObject({
      stageStatus: "revision",
    });
    // Second patch: the actual updateStageData
    expect(patches.length).toBeGreaterThanOrEqual(2);
  });

  it("still works normally during drafting (no auto-rescue)", async () => {
    const session = makeSession({
      stageStatus: "drafting",
      currentStage: "outline",
      stageData: { outline: {} },
    });
    mockedRequirePaperSessionOwner.mockResolvedValue({ session } as never);
    const { ctx, patches } = makeMockCtx();

    await callUpdateStageData(ctx, {
      sessionId: "paperSessions_1",
      stage: "outline",
      data: { tema: "My theme" },
    });

    // Should NOT have auto-revision patch — just normal update
    // No patch should contain stageStatus: "revision"
    const revisionPatches = patches.filter(p => p.patch.stageStatus === "revision");
    expect(revisionPatches.length).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run convex/paperSessions.test.ts --reporter=verbose`
Expected: FAIL — first test throws "Stage is pending validation"

**Step 3: Implement — replace hard-block with auto-rescue**

In `convex/paperSessions.ts`, replace lines 639-645:

**Old:**
```typescript
        // Guard: Block update if stage is pending validation
        if (session.stageStatus === "pending_validation") {
            throw new Error(
                "updateStageData failed: Stage is pending validation. " +
                "Request revision first if you want to modify the draft."
            );
        }
```

**New:**
```typescript
        // Auto-revision safety net: if pending_validation, auto-transition to revision
        // Uses inline logic (same DB transaction) rather than calling autoRescueRevision mutation,
        // because we need to re-read session in the same handler context.
        // The autoRescueRevision mutation is for route-level callers (Task 3).
        if (session.stageStatus === "pending_validation") {
            const stageDataForRevision = { ...session.stageData } as Record<string, Record<string, unknown>>;
            const currentStageRevisionData = stageDataForRevision[session.currentStage] || { revisionCount: 0 };
            const prevCount = typeof currentStageRevisionData.revisionCount === 'number' ? currentStageRevisionData.revisionCount : 0;
            stageDataForRevision[session.currentStage] = {
                ...currentStageRevisionData,
                revisionCount: prevCount + 1,
            };
            await ctx.db.patch(args.sessionId, {
                stageStatus: "revision",
                stageData: stageDataForRevision,
                updatedAt: Date.now(),
            });
            console.log(`[revision-auto-rescued-by-backend] stage=${session.currentStage} trigger=auto-rescue revisionCount=${prevCount + 1} previousStatus=pending_validation source=updateStageData`);
            // Re-read session after patch so rest of mutation sees updated state
            const updatedSession = await ctx.db.get(args.sessionId);
            if (!updatedSession) throw new Error("Session not found after auto-rescue patch");
            // Replace session reference for the rest of the handler
            Object.assign(session, updatedSession);
        }
```

Note: The `Object.assign(session, updatedSession)` is needed because the rest of the handler reads `session.stageData`. After auto-rescue, `session` must reflect the updated `stageStatus` and `revisionCount`. Verify this works with the destructured `{ session }` pattern from `requirePaperSessionOwner`. If `session` is `const`, use a `let` reassignment instead.

Note: The inline logic here mirrors `autoRescueRevision` but runs within the same DB transaction. Both log the identical event ID `revision-auto-rescued-by-backend` with `trigger=auto-rescue`. The `autoRescueRevision` mutation exists for route-level callers (Task 3) who need to call it as a separate mutation before proceeding to `api.artifacts.update`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run convex/paperSessions.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add convex/paperSessions.ts convex/paperSessions.test.ts
git commit -m "feat: auto-revision safety net in updateStageData

When updateStageData is called during pending_validation, backend
auto-transitions to revision instead of hard-blocking.
Logs revision-auto-rescued-by-backend for observability."
```

---

### Task 3: Route — Replace `pending_validation` hard-blocks with auto-rescue in `createArtifact` and `updateArtifact`

**Prerequisite confirmed:** `api.artifacts.get` exists at `convex/artifacts.ts:37-61`. Accepts `{ artifactId: Id<"artifacts">, userId: Id<"users"> }`, returns full artifact record (including `invalidatedAt`) or `null`.

**Files:**
- Modify: `src/app/api/chat/route.ts:1510-1518` (createArtifact guard)
- Modify: `src/app/api/chat/route.ts:1632-1640` (updateArtifact guard)

**Step 1: Replace `createArtifact` guard (lines 1510-1518)**

**Old:**
```typescript
                        if (paperSession?.stageStatus === "pending_validation") {
                            return {
                                success: false,
                                errorCode: "STAGE_PENDING_VALIDATION",
                                retryable: false,
                                error: "Stage is pending validation. Request revision first if you want to replace the artifact.",
                                nextAction: "Do not create a new artifact now. Direct the user to the validation panel to approve or request revision first.",
                            }
                        }
```

**New:**
```typescript
                        if (paperSession?.stageStatus === "pending_validation") {
                            // Check if a valid, accessible artifact exists in DB — not just stageData pointer
                            const currentStageData = (paperSession.stageData as Record<string, Record<string, unknown>>)?.[paperSession.currentStage];
                            const existingArtifactId = currentStageData?.artifactId as string | undefined;

                            let artifactIsValid = false;
                            if (existingArtifactId) {
                                try {
                                    const existingArtifact = await retryQuery(
                                        () => fetchQuery(api.artifacts.get, {
                                            artifactId: existingArtifactId as Id<"artifacts">,
                                        }, convexOptions),
                                        "artifacts.get-for-validity-check"
                                    );
                                    // Artifact is valid if it exists in DB AND is not invalidated
                                    artifactIsValid = !!existingArtifact && !existingArtifact.invalidatedAt;
                                } catch {
                                    // DB lookup failed — treat as invalid/missing
                                    artifactIsValid = false;
                                }
                            }

                            if (artifactIsValid) {
                                console.log(`[create-artifact-blocked-valid-exists] stage=${paperSession.currentStage} artifactId=${existingArtifactId}`);
                                return {
                                    success: false,
                                    errorCode: "CREATE_BLOCKED_VALID_EXISTS",
                                    retryable: false,
                                    error: "A valid artifact already exists for this stage. Use updateArtifact to create a new version instead of createArtifact.",
                                    nextAction: "Call updateArtifact with the revised content. Do NOT use createArtifact when a valid artifact exists.",
                                }
                            }

                            // Artifact missing, invalidated, or inaccessible — allow createArtifact as fallback
                            // Auto-rescue via autoRescueRevision (NOT requestRevision — preserves trigger provenance)
                            try {
                                const rescueResult = await fetchMutationWithToken(api.paperSessions.autoRescueRevision, {
                                    sessionId: paperSession._id,
                                    source: "createArtifact",
                                });
                                if (rescueResult.rescued) {
                                    console.log(`[create-artifact-fallback-no-valid] stage=${paperSession.currentStage} — auto-rescued, proceeding with createArtifact`);
                                    const refreshed = await retryQuery(
                                        () => fetchQuery(api.paperSessions.getByConversation, {
                                            conversationId: currentConversationId
                                        }, convexOptions),
                                        "paperSessions.getByConversation-after-auto-rescue"
                                    );
                                    if (refreshed) Object.assign(paperSession, refreshed);
                                }
                            } catch (autoRescueError) {
                                console.error("[createArtifact] Auto-rescue failed:", autoRescueError);
                                return {
                                    success: false,
                                    errorCode: "AUTO_RESCUE_FAILED",
                                    retryable: true,
                                    error: "Failed to auto-transition stage to revision. Try calling requestRevision explicitly first.",
                                    nextAction: "Call requestRevision(feedback) first, then retry createArtifact.",
                                };
                            }
                        }
```

**Design note**: The guard now performs a real DB lookup via `api.artifacts.get` to verify the artifact exists AND is not invalidated (`!invalidatedAt`). This correctly handles: (1) stale pointer (artifactId in stageData but artifact deleted from DB), (2) invalidated artifact (exists but marked invalid from rewind), (3) missing artifactId (no pointer at all). Only when the artifact is genuinely valid does it block `createArtifact` and redirect to `updateArtifact`.

**Step 2: Replace `updateArtifact` guard (lines 1632-1640)**

**CRITICAL**: `convex/artifacts.ts:update` (line 485-579) calls `db.insert` + `db.patch` on paperSessions.stageData directly — it does NOT call `paperSessions.updateStageData` mutation. Therefore the auto-rescue in `updateStageData` mutation (Task 2) will NEVER trigger for the `updateArtifact` path. Auto-rescue must happen at route level.

**Old:**
```typescript
                        if (paperSession?.stageStatus === "pending_validation") {
                            return {
                                success: false,
                                errorCode: "STAGE_PENDING_VALIDATION",
                                retryable: false,
                                error: "Stage is pending validation. Request revision first if you want to update the artifact.",
                                nextAction: "Do not update the artifact now. Direct the user to the validation panel to approve or request revision first.",
                            }
                        }
```

**New:**
```typescript
                        // Route-level auto-rescue for updateArtifact path.
                        // convex/artifacts.ts:update does NOT go through paperSessions.updateStageData,
                        // so the backend auto-rescue in Task 2 does not cover this path.
                        // We must transition state here before calling artifacts.update.
                        // Uses autoRescueRevision (NOT requestRevision) to preserve trigger provenance.
                        if (paperSession?.stageStatus === "pending_validation") {
                            try {
                                const rescueResult = await fetchMutationWithToken(api.paperSessions.autoRescueRevision, {
                                    sessionId: paperSession._id,
                                    source: "updateArtifact",
                                });
                                if (rescueResult.rescued) {
                                    // Refresh paperSession reference so downstream code sees updated stageStatus
                                    const refreshed = await retryQuery(
                                        () => fetchQuery(api.paperSessions.getByConversation, {
                                            conversationId: currentConversationId
                                        }, convexOptions),
                                        "paperSessions.getByConversation-after-auto-rescue"
                                    );
                                    if (refreshed) Object.assign(paperSession, refreshed);
                                }
                            } catch (autoRescueError) {
                                console.error("[updateArtifact] Auto-rescue failed:", autoRescueError);
                                return {
                                    success: false,
                                    errorCode: "AUTO_RESCUE_FAILED",
                                    retryable: true,
                                    error: "Failed to auto-transition stage to revision. Try calling requestRevision explicitly first.",
                                    nextAction: "Call requestRevision(feedback) first, then retry updateArtifact.",
                                };
                            }
                        }
```

**Design note**: Uses `autoRescueRevision` mutation (Task 2) which hardcodes `trigger: "auto-rescue"` internally. This preserves the trust boundary: `requestRevision` is only for `panel`/`model` callers, while auto-rescue is always internally tagged. The `autoRescueRevision` mutation handles `revisionCount` increment and logging.

**Step 3: Run existing tests**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests pass (no test directly tests route-level guards)

**Step 4: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: route-level auto-rescue for artifact tools during pending_validation

createArtifact: DB-validated guard via api.artifacts.get — blocks if valid
non-invalidated artifact exists, otherwise auto-rescues then proceeds.
updateArtifact: route-level auto-rescue before calling artifacts.update
(which has no stageStatus awareness).
Both paths use autoRescueRevision mutation (trigger: auto-rescue) —
NOT requestRevision — preserving trigger provenance trust boundary."
```

---

### Task 4: Paper Tools — Remove `pending_validation` guard from `updateStageData` tool

**Files:**
- Modify: `src/lib/ai/paper-tools.ts:183-191`

**Step 1: Replace guard**

**Old (lines 183-191):**
```typescript
                    if (session.stageStatus === "pending_validation") {
                        return {
                            success: false,
                            errorCode: "STAGE_PENDING_VALIDATION",
                            retryable: false,
                            error: "Stage is pending validation. Request revision first if you want to modify the draft.",
                            nextAction: "Do not call updateStageData now. Direct the user to the validation panel to approve, or ask them to request a revision first.",
                        };
                    }
```

**New:**
```typescript
                    // pending_validation: backend auto-rescue handles state transition.
                    // No hard-block here — let the Convex mutation auto-transition to revision.
```

**Step 2: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/ai/paper-tools.ts
git commit -m "feat: remove pending_validation hard-block from updateStageData tool

Backend auto-rescue now handles state transition when called during
pending_validation. Tool no longer rejects — delegates to Convex mutation."
```

---

### Task 5: Paper Tools — Expose `requestRevision` as model-callable tool

**Files:**
- Modify: `src/lib/ai/paper-tools.ts` (add new tool near line 470, after `submitStageForValidation`)
- Test: manual verification (tool is a thin wrapper)

**Step 1: Add `requestRevision` tool**

After the `submitStageForValidation` tool (around line 470), add:

```typescript
        requestRevision: tool({
            description: "Request revision for the current stage. Call this FIRST when user requests changes via chat while stage is pending_validation. This transitions the stage from pending_validation to revision, allowing subsequent updateArtifact and submitStageForValidation calls.",
            parameters: z.object({
                feedback: z.string().min(1).describe("Summary of the user's revision intent from their chat message"),
            }),
            execute: async ({ feedback }) => {
                try {
                    const session = await retryQuery(
                        () => fetchQuery(api.paperSessions.getByConversation, {
                            conversationId: context.conversationId
                        }, convexOptions),
                        "paperSessions.getByConversation"
                    );
                    if (!session) return { success: false, error: "Paper session not found." };

                    if (session.stageStatus !== "pending_validation") {
                        return {
                            success: false,
                            errorCode: "NOT_PENDING_VALIDATION",
                            error: `Stage is "${session.stageStatus}", not "pending_validation". requestRevision only applies when stage is pending validation.`,
                        };
                    }

                    const result = await fetchMutation(
                        api.paperSessions.requestRevision,
                        {
                            sessionId: session._id,
                            userId: context.userId,
                            feedback,
                            trigger: "model" as const,
                        },
                        convexOptions
                    );

                    console.log(`[revision-triggered-by-model] stage=${result.stage} revisionCount=${result.revisionCount}`);

                    return {
                        success: true,
                        stage: result.stage,
                        revisionCount: result.revisionCount,
                        previousStatus: "pending_validation",
                        currentStatus: "revision",
                        trigger: "model",
                        nextAction: "Proceed: updateArtifact → submitStageForValidation (updateStageData only if structured data changed)",
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `requestRevision failed: ${error instanceof Error ? error.message : String(error)}`,
                    };
                }
            },
        }),
```

Make sure `context.userId` is available in the tool factory scope. Check existing tools like `submitStageForValidation` for how they access userId — they use `context.userId` from the `createPaperTools` factory parameter.

**Step 2: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: PASS (no tests break, new tool is additive)

**Step 3: Commit**

```bash
git add src/lib/ai/paper-tools.ts
git commit -m "feat: expose requestRevision as model-callable tool

Model can now call requestRevision(feedback) when it detects
revision intent from chat during pending_validation state.
Returns enriched output with trigger, previousStatus, nextAction."
```

---

### Task 6: Stale Choice Guard

**Files:**
- Modify: `src/lib/chat/choice-request.ts:50-61`
- Test: `src/lib/chat/__tests__/choice-request.test.ts`

**Step 1: Write the failing tests**

Append to `src/lib/chat/__tests__/choice-request.test.ts`:

```typescript
describe("validateChoiceInteractionEvent — stale choice guard", () => {
  const validEvent = {
    type: "paper.choice.submit" as const,
    version: 1 as const,
    conversationId: "conv-123",
    stage: "outline",
    sourceMessageId: "msg-789",
    choicePartId: "msg-789-json-renderer-choice",
    kind: "single-select" as const,
    selectedOptionIds: ["option-1"],
    submittedAt: Date.now(),
  }

  it("accepts choice when stageStatus is drafting", () => {
    expect(() =>
      validateChoiceInteractionEvent({
        event: validEvent,
        conversationId: "conv-123",
        currentStage: "outline",
        isPaperMode: true,
        stageStatus: "drafting",
      })
    ).not.toThrow()
  })

  it("rejects choice when stageStatus is pending_validation", () => {
    expect(() =>
      validateChoiceInteractionEvent({
        event: validEvent,
        conversationId: "conv-123",
        currentStage: "outline",
        isPaperMode: true,
        stageStatus: "pending_validation",
      })
    ).toThrow(/CHOICE_REJECTED_STALE_STATE/)
  })

  it("rejects choice when stageStatus is revision", () => {
    expect(() =>
      validateChoiceInteractionEvent({
        event: validEvent,
        conversationId: "conv-123",
        currentStage: "outline",
        isPaperMode: true,
        stageStatus: "revision",
      })
    ).toThrow(/CHOICE_REJECTED_STALE_STATE/)
  })

  it("rejects choice when stageStatus is approved", () => {
    expect(() =>
      validateChoiceInteractionEvent({
        event: validEvent,
        conversationId: "conv-123",
        currentStage: "outline",
        isPaperMode: true,
        stageStatus: "approved",
      })
    ).toThrow(/CHOICE_REJECTED_STALE_STATE/)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/chat/__tests__/choice-request.test.ts --reporter=verbose`
Expected: FAIL — function signature doesn't accept `stageStatus`, and no guard exists

**Step 3: Implement — add `stageStatus` parameter and guard**

In `src/lib/chat/choice-request.ts`, change the function signature (lines 50-61):

**Old:**
```typescript
export function validateChoiceInteractionEvent(params: {
  event: ParsedChoiceInteractionEvent
  conversationId: string
  currentStage?: PaperStageId | "completed" | null
  isPaperMode: boolean
}): void {
  const { event, conversationId, currentStage, isPaperMode } = params
  if (!isPaperMode) throw new Error("Choice submit is only valid in paper mode.")
  if (event.conversationId !== conversationId) throw new Error("interactionEvent.conversationId does not match active conversation.")
  if (!currentStage || currentStage === "completed") throw new Error("Choice submit requires an active paper stage.")
  if (event.stage !== currentStage) throw new Error("interactionEvent.stage does not match active paper stage.")
}
```

**New:**
```typescript
export function validateChoiceInteractionEvent(params: {
  event: ParsedChoiceInteractionEvent
  conversationId: string
  currentStage?: PaperStageId | "completed" | null
  isPaperMode: boolean
  stageStatus?: string
}): void {
  const { event, conversationId, currentStage, isPaperMode, stageStatus } = params
  if (!isPaperMode) throw new Error("Choice submit is only valid in paper mode.")
  if (event.conversationId !== conversationId) throw new Error("interactionEvent.conversationId does not match active conversation.")
  if (!currentStage || currentStage === "completed") throw new Error("Choice submit requires an active paper stage.")
  if (event.stage !== currentStage) throw new Error("interactionEvent.stage does not match active paper stage.")
  if (stageStatus && stageStatus !== "drafting") {
    throw new Error(
      `CHOICE_REJECTED_STALE_STATE: Choice rejected — stageStatus is "${stageStatus}", expected "drafting". ` +
      `Pilihan ini sudah tidak berlaku karena state draft sudah berubah. Silakan gunakan chat atau panel validasi yang aktif.`
    )
  }
}
```

**Step 4: Update caller in `route.ts` to pass `stageStatus`**

Find where `validateChoiceInteractionEvent` is called in `src/app/api/chat/route.ts` and add `stageStatus: paperSession?.stageStatus`. Search for `validateChoiceInteractionEvent` in route.ts to find the exact call site.

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/chat/__tests__/choice-request.test.ts --reporter=verbose`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/chat/choice-request.ts src/lib/chat/__tests__/choice-request.test.ts src/app/api/chat/route.ts
git commit -m "feat: stale choice guard — reject choices when stageStatus !== drafting

Deterministic rejection for choice cards submitted during
pending_validation, revision, or approved states.
Logs stale-choice-rejected for observability."
```

---

### Task 7: Frontend — Pass `trigger: "panel"` from ChatWindow

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx:2172`

**Step 1: Update `handleRevise` to pass trigger**

**Old (line 2172):**
```typescript
      await requestRevision(userId, feedback)
```

**New:**
```typescript
      await requestRevision(userId, feedback, "panel")
```

**Step 2: Run existing ChatWindow tests**

Run: `npx vitest run src/components/chat/ChatWindow.mobile-workspace.test.tsx --reporter=verbose`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat: pass trigger 'panel' when requesting revision from validation panel

Enables observability distinction: revision-triggered-by-panel vs
revision-triggered-by-model vs revision-auto-rescued-by-backend."
```

---

### Task 8: Prompt Contract — Rewrite `pendingNote`, `revisionNote`, add intent detection

**Files:**
- Modify: `src/lib/ai/paper-mode-prompt.ts:260-267`

**Step 1: Replace `revisionNote` (lines 260-262)**

**Old:**
```typescript
        const revisionNote = status === "revision"
            ? "\n⚠️ REVISION MODE: User requested changes. Pay attention to their feedback in the latest message. If an artifact already exists for this stage, use updateArtifact (NOT createArtifact). MANDATORY SEQUENCE: updateArtifact() → submitStageForValidation() in the SAME turn. Do NOT stop after updateArtifact — you MUST call submitStageForValidation() immediately after.\n"
            : "";
```

**New:**
```typescript
        const revisionNote = status === "revision"
            ? `\n⚠️ REVISION MODE: User requested changes. Pay attention to their feedback in the latest message.

Tool sequence:
  1. updateStageData — only if structured stage data changed.
  2. updateArtifact — use this for ALL revisions including full content replacement. Do NOT use createArtifact unless artifact is missing/inaccessible in DB.
  3. submitStageForValidation — SAME TURN as updateArtifact. Do not stop early.

${stage === "daftar_pustaka" ? "For daftar_pustaka: call compileDaftarPustaka(mode: 'persist') before step 1.\n" : ""}`
            : "";
```

**Step 2: Replace `pendingNote` (lines 265-267)**

**Old:**
```typescript
        const pendingNote = status === "pending_validation"
            ? "\n⏳ AWAITING VALIDATION: Draft has been submitted. Wait for user to approve/revise before proceeding. Do NOT call updateStageData, createArtifact, updateArtifact, or submitStageForValidation again unless the user explicitly requests revision and the stage is reopened.\n"
            : "";
```

**New:**
```typescript
        const pendingNote = status === "pending_validation"
            ? `\n⏳ AWAITING VALIDATION: Draft for ${getStageLabel(stage as PaperStageId)} has been submitted.

IF user asks a question or wants discussion:
  → Answer normally. Do NOT call any stage tools.

IF user requests revision, correction, edit, regeneration, or sends instructions that clearly mean "change the artifact":
  → Call requestRevision(feedback: "<user's revision intent>") FIRST.
  → After status transitions to "revision", proceed:
    1. updateStageData (only if structured data changed)
    2. updateArtifact (with revised content — full replacement if needed)
    3. submitStageForValidation
  → Complete steps 2-3 in the SAME TURN. Do not stop after updateArtifact.

Do NOT call updateStageData, createArtifact, or updateArtifact while status is still pending_validation. Call requestRevision first.

REVISION INTENT DETECTION:
Priority: semantic intent — "user wants to change the artifact content".
Strong signal examples (not exhaustive): "revisi", "edit", "ubah", "ganti", "perbaiki", "resend", "generate ulang", "tulis ulang", "koreksi", "buat ulang", "ulangi", "dari awal", or specific corrections like "paragraf kedua harus...", "tambahkan...", "hapus bagian...".
These keywords are examples only. The primary criterion is whether the user's semantic intent is to change the artifact content.
NOT revision intent: questions about content, discussion, status inquiry.
When uncertain: ask ONLY if the difference between "discuss" vs "revise" is truly material and ambiguous. If user gives concrete change instructions, treat as revision intent without asking. Bias toward action.\n`
            : "";
```

**Step 3: Verify `getStageLabel` is imported/available**

Check that `getStageLabel` is accessible in the scope. It's already used at line 231 in the same function, so it should be available.

**Step 4: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/ai/paper-mode-prompt.ts
git commit -m "feat: rewrite prompt contract for chat-triggered revision

- pendingNote: model can now detect revision intent and call requestRevision
- revisionNote: updateStageData optional, daftar_pustaka exception noted
- Added revision intent detection instruction with semantic-first approach"
```

---

### Task 9: Observability — Add `revision-intent-answered-without-tools` detection

**Files:**
- Modify: `src/app/api/chat/route.ts` (in the outcome tracking section, around lines 2815-2865)

**Step 1: Find the outcome tracking section**

Search for `paperToolTracker` outcome logging in route.ts. The section around lines 2815-2865 logs violations like `partial-save-stall`, `artifact-without-submit`, etc.

**Step 2: Add detection**

After existing outcome checks, add:

```typescript
// Detect: model answered revision-like intent without calling any tools
if (paperSession?.stageStatus === "pending_validation"
    && !paperToolTracker.sawRequestRevision
    && !paperToolTracker.sawUpdateStageData
    && !paperToolTracker.sawCreateArtifactSuccess
    && !paperToolTracker.sawUpdateArtifactSuccess) {
    // Check if user message contained revision-like signals
    const userMessage = /* extract last user message text */;
    const revisionSignals = /\b(revisi|edit|ubah|ganti|perbaiki|resend|generate ulang|tulis ulang|koreksi|buat ulang|ulangi|dari awal)\b/i;
    if (userMessage && revisionSignals.test(userMessage)) {
        console.warn(`[revision-intent-answered-without-tools] stage=${paperSession.currentStage} — model responded to apparent revision intent with prose only`);
    }
}
```

Note: `paperToolTracker.sawRequestRevision` needs to be added to the tracker. Initialize it as `false` alongside other `saw*` flags, and set it to `true` when the `requestRevision` tool executes successfully.

**Step 3: Add `sawRequestRevision` to paperToolTracker**

Find where `paperToolTracker` is initialized (around line 371) and add:

```typescript
sawRequestRevision: false,
```

Set it to `true` in the `requestRevision` tool's success path.

**Step 4: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: add revision-intent-answered-without-tools observability

Detects when model responds to apparent revision intent with prose
only during pending_validation. Helps audit prompt contract effectiveness."
```

---

### Task 10: Integration verification — run all tests

**Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: ALL PASS

**Step 2: Check for TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No **new** TypeScript errors introduced by these changes. There is a known pre-existing JSX namespace error in `src/components/chat/ChatWindow.mobile-workspace.test.tsx:176` documented in earlier handoffs — that is not caused by this work and should be ignored for this check. Compare error count before and after to confirm no regressions.

**Step 3: Fix any failures**

If tests fail, investigate and fix. Common issues:
- Type mismatches from new `trigger` parameter
- Existing tests that depend on `pending_validation` hard-block behavior
- Import changes needed
- `api.artifacts.get` query may need to be verified for existence (used in createArtifact validity check)
- `api.paperSessions.get` query may need to accept `sessionId` arg (used in auto-rescue refresh)

**Step 4: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix: resolve integration issues from artifact lifecycle changes"
```

---

### Summary of Commits

| Task | Commit Message |
|------|---------------|
| 1 | `feat: add trigger parameter to requestRevision mutation` |
| 2 | `feat: auto-revision safety net in updateStageData` |
| 3 | `feat: relax pending_validation hard-blocks in route artifact tools` |
| 4 | `feat: remove pending_validation hard-block from updateStageData tool` |
| 5 | `feat: expose requestRevision as model-callable tool` |
| 6 | `feat: stale choice guard — reject choices when stageStatus !== drafting` |
| 7 | `feat: pass trigger 'panel' when requesting revision from validation panel` |
| 8 | `feat: rewrite prompt contract for chat-triggered revision` |
| 9 | `feat: add revision-intent-answered-without-tools observability` |
| 10 | `fix: resolve integration issues` (if needed) |

### Files Modified (Complete List)

| File | Tasks |
|------|-------|
| `convex/paperSessions.ts` | 1, 2 |
| `convex/paperSessions.test.ts` | 1, 2 |
| `src/lib/hooks/usePaperSession.ts` | 1 |
| `src/app/api/chat/route.ts` | 3, 6 (caller update), 9 |
| `src/lib/ai/paper-tools.ts` | 4, 5 |
| `src/lib/chat/choice-request.ts` | 6 |
| `src/lib/chat/__tests__/choice-request.test.ts` | 6 |
| `src/components/chat/ChatWindow.tsx` | 7 |
| `src/lib/ai/paper-mode-prompt.ts` | 8 |
