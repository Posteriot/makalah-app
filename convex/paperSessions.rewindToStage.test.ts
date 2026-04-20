import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./authHelpers", () => ({
  requireAuthUser: vi.fn(),
  requirePaperSessionOwner: vi.fn(),
  requireAuthUserId: vi.fn(),
}));

vi.mock("./naskahRebuild", () => ({
  rebuildNaskahSnapshot: vi.fn(),
}));

import { rewindToStage } from "./paperSessions";
import { rebuildNaskahSnapshot } from "./naskahRebuild";

const mockedRebuildNaskah = vi.mocked(rebuildNaskahSnapshot);

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    _id: "paperSessions_1",
    userId: "users_1",
    conversationId: "conversations_1",
    currentStage: "outline",
    stageStatus: "pending_validation",
    stageData: {
      gagasan: { validatedAt: 1000, artifactId: "art_gagasan" },
      topik: { validatedAt: 2000, artifactId: "art_topik" },
      outline: { validatedAt: 3000, artifactId: "art_outline" },
    },
    paperMemoryDigest: [
      { stage: "gagasan", decision: "approved", timestamp: 1000 },
      { stage: "topik", decision: "approved", timestamp: 2000 },
    ],
    stageMessageBoundaries: [
      { stage: "gagasan", firstMessageId: "m1", lastMessageId: "m2", messageCount: 2 },
      { stage: "topik", firstMessageId: "m3", lastMessageId: "m4", messageCount: 2 },
    ],
    decisionEpoch: 5,
    ...overrides,
  };
}

function makeMockCtx() {
  const patches: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const inserts: Array<{ table: string; doc: Record<string, unknown> }> = [];
  let sessionToReturn: Record<string, unknown> | null = null;
  const artifactStore: Record<string, Record<string, unknown>> = {};

  return {
    ctx: {
      db: {
        get: vi.fn(async (id: string) => {
          if (id === sessionToReturn?._id) return sessionToReturn;
          return artifactStore[id] ?? null;
        }),
        patch: vi.fn(async (id: string, patch: Record<string, unknown>) => {
          patches.push({ id, patch });
        }),
        insert: vi.fn(async (table: string, doc: Record<string, unknown>) => {
          inserts.push({ table, doc });
          return `${table}_new`;
        }),
        query: vi.fn(() => ({
          withIndex: vi.fn(() => ({
            collect: vi.fn(async () => []),
          })),
        })),
      },
    },
    patches,
    inserts,
    setSession(s: Record<string, unknown>) { sessionToReturn = s; },
    setArtifact(id: string, artifact: Record<string, unknown>) { artifactStore[id] = artifact; },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callRewindToStage(ctx: any, args: any) {
  const fn = rewindToStage as unknown as {
    _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
  };
  return fn._handler(ctx, args);
}

describe("rewindToStage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRebuildNaskah.mockResolvedValue({ written: false, revision: null });
  });

  // 1. mode: "rewind" (default) — existing behavior preserved
  it("mode rewind (default): sets stageStatus to drafting, no epoch increment", async () => {
    const session = makeSession();
    const { ctx, patches, setSession } = makeMockCtx();
    setSession(session);

    const result = await callRewindToStage(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      targetStage: "gagasan",
    });

    expect(result).toMatchObject({
      success: true,
      previousStage: "outline",
      newStage: "gagasan",
    });

    // Find the session patch (the last big patch)
    const sessionPatch = patches.find(p => p.id === "paperSessions_1");
    expect(sessionPatch).toBeDefined();
    expect(sessionPatch!.patch.stageStatus).toBe("drafting");
    // No decisionEpoch in patch for rewind mode
    expect(sessionPatch!.patch.decisionEpoch).toBeUndefined();
  });

  // 2. mode: "cancel-approval", single stage
  it("mode cancel-approval single stage: sets pending_validation, removes validatedAt, increments epoch", async () => {
    const session = makeSession({
      currentStage: "topik",
      stageStatus: "pending_validation",
      stageData: {
        gagasan: { validatedAt: 1000, artifactId: "art_gagasan" },
        topik: { validatedAt: 2000, artifactId: "art_topik" },
      },
    });
    const { ctx, patches, setSession } = makeMockCtx();
    setSession(session);

    const result = await callRewindToStage(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      targetStage: "gagasan",
      mode: "cancel-approval",
    });

    expect(result).toMatchObject({ success: true, newStage: "gagasan" });

    const sessionPatch = patches.find(p => p.id === "paperSessions_1");
    expect(sessionPatch!.patch.stageStatus).toBe("pending_validation");
    expect(sessionPatch!.patch.decisionEpoch).toBe(6); // 5 + 1

    // Target stage stageData should have validatedAt removed but keep other fields
    const updatedStageData = sessionPatch!.patch.stageData as Record<string, Record<string, unknown>>;
    expect(updatedStageData.gagasan.validatedAt).toBeUndefined();
    expect(updatedStageData.gagasan.artifactId).toBe("art_gagasan");
  });

  // 3. mode: "cancel-approval", cross-stage (N=3)
  it("mode cancel-approval cross-stage: intermediate stages cleared, target loses validatedAt, boundaries popped, digest superseded", async () => {
    const session = makeSession({
      currentStage: "abstrak",
      stageStatus: "pending_validation",
      stageData: {
        gagasan: { validatedAt: 1000, artifactId: "art_gagasan" },
        topik: { validatedAt: 2000, artifactId: "art_topik" },
        outline: { validatedAt: 3000, artifactId: "art_outline" },
        abstrak: { validatedAt: 4000, artifactId: "art_abstrak" },
      },
      stageMessageBoundaries: [
        { stage: "gagasan", firstMessageId: "m1", lastMessageId: "m2", messageCount: 2 },
        { stage: "topik", firstMessageId: "m3", lastMessageId: "m4", messageCount: 2 },
        { stage: "outline", firstMessageId: "m5", lastMessageId: "m6", messageCount: 2 },
        { stage: "abstrak", firstMessageId: "m7", lastMessageId: "m8", messageCount: 2 },
      ],
      paperMemoryDigest: [
        { stage: "gagasan", decision: "approved", timestamp: 1000 },
        { stage: "topik", decision: "approved", timestamp: 2000 },
        { stage: "outline", decision: "approved", timestamp: 3000 },
      ],
    });
    const { ctx, patches, setSession } = makeMockCtx();
    setSession(session);

    await callRewindToStage(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      targetStage: "gagasan",
      mode: "cancel-approval",
    });

    const sessionPatch = patches.find(p => p.id === "paperSessions_1");
    const updatedStageData = sessionPatch!.patch.stageData as Record<string, Record<string, unknown>>;

    // Target stage: validatedAt removed, other fields preserved
    expect(updatedStageData.gagasan.validatedAt).toBeUndefined();
    expect(updatedStageData.gagasan.artifactId).toBe("art_gagasan");

    // Intermediate stages (topik, outline): cleared to {}
    expect(updatedStageData.topik).toEqual({});
    expect(updatedStageData.outline).toEqual({});

    // currentStage (abstrak) is in invalidation set for cancel modes, also cleared
    expect(updatedStageData.abstrak).toEqual({});

    // Boundaries: popped from end for invalidated stages
    const updatedBoundaries = sessionPatch!.patch.stageMessageBoundaries as Array<{ stage: string }>;
    // Invalidated: gagasan, topik, outline, abstrak — all boundaries popped
    expect(updatedBoundaries).toEqual([]);

    // Digest: gagasan, topik, outline entries superseded
    const updatedDigest = sessionPatch!.patch.paperMemoryDigest as Array<{ stage: string; superseded?: boolean }>;
    expect(updatedDigest.filter(d => d.superseded)).toHaveLength(3);

    // Target stage artifact NOT invalidated (cancel-approval preserves it for re-approval)
    const artifactPatches = patches.filter(p => p.id === "art_gagasan");
    const hasInvalidatedAt = artifactPatches.some(p => p.patch.invalidatedAt !== undefined);
    expect(hasInvalidatedAt).toBe(false);

    // Intermediate + currentStage artifacts ARE invalidated
    const intermediateArtifactPatches = patches.filter(p =>
      ["art_topik", "art_outline", "art_abstrak"].includes(p.id)
    );
    expect(intermediateArtifactPatches.length).toBeGreaterThanOrEqual(3);
  });

  // 4. mode: "cancel-choice", cross-stage
  it("mode cancel-choice: preserves revisionCount, webSearchReferences, nativeRefField in target; artifact invalidated", async () => {
    const session = makeSession({
      currentStage: "topik",
      stageStatus: "drafting",
      stageData: {
        gagasan: {
          validatedAt: 1000,
          artifactId: "art_gagasan",
          revisionCount: 3,
          webSearchReferences: [{ url: "http://example.com" }],
          referensiAwal: [{ title: "ref1" }],
          ideKasar: "some idea",
        },
        topik: { validatedAt: 2000, artifactId: "art_topik" },
      },
      paperMemoryDigest: [
        { stage: "gagasan", decision: "approved", timestamp: 1000 },
      ],
    });
    const { ctx, patches, setSession } = makeMockCtx();
    setSession(session);

    await callRewindToStage(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      targetStage: "gagasan",
      mode: "cancel-choice",
    });

    const sessionPatch = patches.find(p => p.id === "paperSessions_1");
    const updatedStageData = sessionPatch!.patch.stageData as Record<string, Record<string, unknown>>;

    // cancel-choice target: only preserves revisionCount, webSearchReferences, nativeRefField
    expect(updatedStageData.gagasan).toEqual({
      revisionCount: 3,
      webSearchReferences: [{ url: "http://example.com" }],
      referensiAwal: [{ title: "ref1" }],
    });

    // topik (currentStage, in invalidation set) cleared
    expect(updatedStageData.topik).toEqual({});

    // stageStatus = "drafting"
    expect(sessionPatch!.patch.stageStatus).toBe("drafting");

    // Target artifact invalidated (separate patch call)
    const artPatch = patches.find(p => p.id === "art_gagasan" && p.patch.invalidatedAt);
    expect(artPatch).toBeDefined();
  });

  // 5. Guard: stageStatus === "revision" — cancel modes throw, rewind does not
  it("guard: cancel modes throw when stageStatus is revision", async () => {
    const session = makeSession({ stageStatus: "revision" });
    const { ctx, setSession } = makeMockCtx();
    setSession(session);

    await expect(
      callRewindToStage(ctx, {
        sessionId: "paperSessions_1",
        userId: "users_1",
        targetStage: "gagasan",
        mode: "cancel-approval",
      })
    ).rejects.toThrow(/Cannot cancel: revision in progress/);

    await expect(
      callRewindToStage(ctx, {
        sessionId: "paperSessions_1",
        userId: "users_1",
        targetStage: "gagasan",
        mode: "cancel-choice",
      })
    ).rejects.toThrow(/Cannot cancel: revision in progress/);
  });

  it("guard: rewind mode succeeds even when stageStatus is revision", async () => {
    const session = makeSession({ stageStatus: "revision" });
    const { ctx, setSession } = makeMockCtx();
    setSession(session);

    const result = await callRewindToStage(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      targetStage: "gagasan",
    });

    expect(result).toMatchObject({ success: true });
  });

  // 6. Guard: invalid targetStage
  it("guard: throws on invalid targetStage", async () => {
    const session = makeSession();
    const { ctx, setSession } = makeMockCtx();
    setSession(session);

    await expect(
      callRewindToStage(ctx, {
        sessionId: "paperSessions_1",
        userId: "users_1",
        targetStage: "nonexistent_stage",
      })
    ).rejects.toThrow(/Unknown target stage/);
  });

  it("guard: throws when target is same as current", async () => {
    const session = makeSession({ currentStage: "gagasan" });
    const { ctx, setSession } = makeMockCtx();
    setSession(session);

    await expect(
      callRewindToStage(ctx, {
        sessionId: "paperSessions_1",
        userId: "users_1",
        targetStage: "gagasan",
      })
    ).rejects.toThrow(/Cannot rewind to current stage/);
  });

  // 7. Edge: cancel from "completed" state
  it("edge: cancel from completed state handles correctly", async () => {
    const session = makeSession({
      currentStage: "completed",
      stageStatus: "approved",
      stageData: {
        gagasan: { validatedAt: 1000, artifactId: "art_gagasan" },
        topik: { validatedAt: 2000, artifactId: "art_topik" },
        outline: { validatedAt: 3000, artifactId: "art_outline" },
        judul: { validatedAt: 14000, artifactId: "art_judul" },
      },
    });
    const { ctx, patches, setSession } = makeMockCtx();
    setSession(session);

    const result = await callRewindToStage(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      targetStage: "judul",
      mode: "cancel-approval",
    });

    expect(result).toMatchObject({ success: true, previousStage: "completed", newStage: "judul" });

    // completedAt must be explicitly set to undefined in the patch (not just absent)
    const sessionPatch = patches.find(p => p.id === "paperSessions_1");
    expect(Object.keys(sessionPatch!.patch)).toContain("completedAt");
    expect(sessionPatch!.patch.completedAt).toBeUndefined();
  });

  // 8. Edge: cancel to "gagasan" (first stage)
  it("edge: cancel to gagasan (first stage) works", async () => {
    const session = makeSession({
      currentStage: "topik",
      stageStatus: "pending_validation",
      stageData: {
        gagasan: { validatedAt: 1000, artifactId: "art_gagasan" },
        topik: { validatedAt: 2000, artifactId: "art_topik" },
      },
    });
    const { ctx, setSession } = makeMockCtx();
    setSession(session);

    const result = await callRewindToStage(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      targetStage: "gagasan",
      mode: "cancel-approval",
    });

    expect(result).toMatchObject({ success: true, newStage: "gagasan" });
  });

  // 9. Epoch: single increment regardless of rollback depth
  it("epoch: increments decisionEpoch by exactly 1 regardless of depth", async () => {
    const session = makeSession({
      currentStage: "abstrak",
      stageStatus: "pending_validation",
      stageData: {
        gagasan: { validatedAt: 1000, artifactId: "art_gagasan" },
        topik: { validatedAt: 2000, artifactId: "art_topik" },
        outline: { validatedAt: 3000, artifactId: "art_outline" },
        abstrak: { validatedAt: 4000, artifactId: "art_abstrak" },
      },
      decisionEpoch: 10,
    });
    const { ctx, patches, setSession } = makeMockCtx();
    setSession(session);

    await callRewindToStage(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      targetStage: "gagasan",
      mode: "cancel-choice",
    });

    const sessionPatch = patches.find(p => p.id === "paperSessions_1");
    expect(sessionPatch!.patch.decisionEpoch).toBe(11); // 10 + 1, not 10 + N
  });

  // 10. Naskah rebuild: called once
  it("naskah rebuild is called once", async () => {
    const session = makeSession();
    const { ctx, setSession } = makeMockCtx();
    setSession(session);

    await callRewindToStage(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      targetStage: "gagasan",
    });

    expect(mockedRebuildNaskah).toHaveBeenCalledTimes(1);
    expect(mockedRebuildNaskah).toHaveBeenCalledWith(ctx, "paperSessions_1");
  });

  // 11. Boundary stack-pop
  it("boundary stack-pop: only pops from end for matching invalidated stages", async () => {
    const session = makeSession({
      currentStage: "pendahuluan",
      stageStatus: "pending_validation",
      stageData: {
        gagasan: { validatedAt: 1000, artifactId: "art_gagasan" },
        topik: { validatedAt: 2000, artifactId: "art_topik" },
        outline: { validatedAt: 3000, artifactId: "art_outline" },
        abstrak: { validatedAt: 4000, artifactId: "art_abstrak" },
        pendahuluan: { validatedAt: 5000, artifactId: "art_pendahuluan" },
      },
      stageMessageBoundaries: [
        { stage: "gagasan", firstMessageId: "m1", lastMessageId: "m2", messageCount: 2 },
        { stage: "topik", firstMessageId: "m3", lastMessageId: "m4", messageCount: 2 },
        { stage: "outline", firstMessageId: "m5", lastMessageId: "m6", messageCount: 2 },
        { stage: "abstrak", firstMessageId: "m7", lastMessageId: "m8", messageCount: 2 },
        { stage: "pendahuluan", firstMessageId: "m9", lastMessageId: "m10", messageCount: 2 },
      ],
    });
    const { ctx, patches, setSession } = makeMockCtx();
    setSession(session);

    // Cancel from pendahuluan to outline
    // Invalidated stages: outline, abstrak, pendahuluan (target + intermediates + current)
    await callRewindToStage(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      targetStage: "outline",
      mode: "cancel-approval",
    });

    const sessionPatch = patches.find(p => p.id === "paperSessions_1");
    const updatedBoundaries = sessionPatch!.patch.stageMessageBoundaries as Array<{ stage: string }>;

    // Boundaries for outline, abstrak, pendahuluan should be popped from end
    // Remaining: gagasan, topik
    expect(updatedBoundaries).toHaveLength(2);
    expect(updatedBoundaries[0].stage).toBe("gagasan");
    expect(updatedBoundaries[1].stage).toBe("topik");
  });

  // 12. currentStage invalidation (C2): cancel-approval clears currentStage stageData to {}
  it("C2: cancel-approval clears currentStage stageData to {} and its artifact is invalidated", async () => {
    const session = makeSession({
      currentStage: "outline",
      stageStatus: "pending_validation",
      stageData: {
        gagasan: { validatedAt: 1000, artifactId: "art_gagasan" },
        topik: { validatedAt: 2000, artifactId: "art_topik", someField: "keep" },
        outline: { validatedAt: 3000, artifactId: "art_outline", content: "will be cleared" },
      },
    });
    const { ctx, patches, setSession } = makeMockCtx();
    setSession(session);

    const result = await callRewindToStage(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      targetStage: "topik",
      mode: "cancel-approval",
    });

    // outline (currentStage) is in invalidation set
    expect(result).toMatchObject({ success: true });
    const invalidated = (result as { invalidatedStages: string[] }).invalidatedStages;
    expect(invalidated).toContain("outline");

    const sessionPatch = patches.find(p => p.id === "paperSessions_1");
    const updatedStageData = sessionPatch!.patch.stageData as Record<string, Record<string, unknown>>;

    // currentStage (outline) cleared to {}
    expect(updatedStageData.outline).toEqual({});

    // outline artifact invalidated
    const artPatches = patches.filter(p => p.id === "art_outline");
    expect(artPatches.length).toBeGreaterThan(0);
    expect(artPatches[0].patch.invalidatedAt).toBeDefined();
  });
});
