import { describe, expect, it, vi } from "vitest";
import { submitForValidation, requestRevision, updateStageData, autoRescueRevision } from "./paperSessions";

vi.mock("./authHelpers", () => ({
  requireAuthUser: vi.fn(),
  requirePaperSessionOwner: vi.fn(),
  requireAuthUserId: vi.fn(),
}));

import { requirePaperSessionOwner } from "./authHelpers";

const mockedRequirePaperSessionOwner = vi.mocked(requirePaperSessionOwner);

function makeMockCtx() {
  const patches: Array<{ id: string; patch: Record<string, unknown> }> = [];
  return {
    ctx: {
      db: {
        patch: vi.fn(async (id: string, patch: Record<string, unknown>) => {
          patches.push({ id, patch });
        }),
      },
    },
    patches,
  };
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    _id: "paperSessions_1",
    userId: "users_1",
    currentStage: "gagasan",
    stageStatus: "in_progress",
    stageData: {},
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callHandler(ctx: any, args: { sessionId: string }) {
  const fn = submitForValidation as unknown as {
    _handler: (ctx: unknown, args: { sessionId: string }) => Promise<unknown>;
  };
  return fn._handler(ctx, args);
}

describe("submitForValidation — artifact guard", () => {
  it("throws when artifactId is missing", async () => {
    const session = makeSession({
      stageData: { gagasan: {} },
    });
    mockedRequirePaperSessionOwner.mockResolvedValue({ session } as never);
    const { ctx } = makeMockCtx();

    await expect(callHandler(ctx, { sessionId: "paperSessions_1" })).rejects.toThrow(
      /Artifact must be created first/
    );
  });

  it("succeeds when artifactId exists", async () => {
    const session = makeSession({
      stageData: { gagasan: { artifactId: "artifact_123" } },
    });
    mockedRequirePaperSessionOwner.mockResolvedValue({ session } as never);
    const { ctx, patches } = makeMockCtx();

    await callHandler(ctx, { sessionId: "paperSessions_1" });

    expect(patches.length).toBe(1);
    expect(patches[0].patch).toMatchObject({
      stageStatus: "pending_validation",
    });
  });
});

describe("requestRevision — trigger parameter", () => {
  function makeMockCtxWithGet(session: ReturnType<typeof makeSession>) {
    const patches: Array<{ id: string; patch: Record<string, unknown> }> = [];
    return {
      ctx: {
        db: {
          get: vi.fn(async () => session),
          patch: vi.fn(async (id: string, patch: Record<string, unknown>) => {
            patches.push({ id, patch });
          }),
        },
        auth: { getUserIdentity: vi.fn(async () => ({ subject: "users_1" })) },
      },
      patches,
    };
  }

  type RevisionArgs = {
    sessionId: string; userId: string; feedback: string; trigger?: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function callRevisionHandler(ctx: any, args: RevisionArgs) {
    const fn = requestRevision as unknown as {
      _handler: (ctx: unknown, args: RevisionArgs) => Promise<unknown>;
    };
    return fn._handler(ctx, args);
  }

  it("accepts trigger 'panel' and returns it in result", async () => {
    const session = makeSession({
      stageStatus: "pending_validation",
      stageData: { gagasan: { revisionCount: 0 } },
    });
    const { ctx, patches } = makeMockCtxWithGet(session);

    const result = await callRevisionHandler(ctx, {
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
    const { ctx } = makeMockCtxWithGet(session);

    const result = await callRevisionHandler(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      feedback: "Revise intro",
      trigger: "model",
    });

    expect(result).toMatchObject({ trigger: "model" });
  });
});

describe("updateStageData — auto-revision safety net", () => {
  function makeMockCtxWithGet(session: ReturnType<typeof makeSession>) {
    const patches: Array<{ id: string; patch: Record<string, unknown> }> = [];
    return {
      ctx: {
        db: {
          get: vi.fn(async () => session),
          patch: vi.fn(async (id: string, patch: Record<string, unknown>) => {
            patches.push({ id, patch });
          }),
          insert: vi.fn(async () => "systemAlerts_1"),
        },
      },
      patches,
    };
  }

  it("previously threw on pending_validation, now auto-transitions to revision", async () => {
    const session = makeSession({
      stageStatus: "pending_validation",
      currentStage: "outline",
      stageData: { outline: { artifactId: "artifact_123", revisionCount: 0 } },
    });
    mockedRequirePaperSessionOwner.mockResolvedValue({ session } as never);
    const { ctx, patches } = makeMockCtxWithGet(session);

    const fn = updateStageData as unknown as {
      _handler: (ctx: unknown, args: { sessionId: string; stage: string; data: Record<string, unknown> }) => Promise<unknown>;
    };

    // Should NOT throw anymore — should auto-rescue
    const result = await fn._handler(ctx, {
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
    const { ctx, patches } = makeMockCtxWithGet(session);

    const fn = updateStageData as unknown as {
      _handler: (ctx: unknown, args: { sessionId: string; stage: string; data: Record<string, unknown> }) => Promise<unknown>;
    };

    await fn._handler(ctx, {
      sessionId: "paperSessions_1",
      stage: "outline",
      data: { tema: "My theme" },
    });

    // Should NOT have auto-revision patch — just normal update
    const revisionPatches = patches.filter(p => p.patch.stageStatus === "revision");
    expect(revisionPatches.length).toBe(0);
  });
});

describe("autoRescueRevision mutation", () => {
  function makeMockCtxWithGet(session: ReturnType<typeof makeSession>) {
    const patches: Array<{ id: string; patch: Record<string, unknown> }> = [];
    return {
      ctx: {
        db: {
          get: vi.fn(async () => session),
          patch: vi.fn(async (id: string, patch: Record<string, unknown>) => {
            patches.push({ id, patch });
          }),
        },
      },
      patches,
    };
  }

  it("rescues from pending_validation to revision", async () => {
    const session = makeSession({
      stageStatus: "pending_validation",
      currentStage: "outline",
      stageData: { outline: { revisionCount: 1 } },
    });
    const { ctx, patches } = makeMockCtxWithGet(session);

    const fn = autoRescueRevision as unknown as {
      _handler: (ctx: unknown, args: { sessionId: string; userId: string; source: string }) => Promise<unknown>;
    };

    const result = await fn._handler(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      source: "updateArtifact",
    });

    expect(result).toMatchObject({
      rescued: true,
      revisionCount: 2,
      previousStatus: "pending_validation",
      currentStatus: "revision",
      trigger: "auto-rescue",
      source: "updateArtifact",
    });
    expect(patches[0].patch).toMatchObject({ stageStatus: "revision" });
  });

  it("returns rescued=false when not in pending_validation", async () => {
    const session = makeSession({
      stageStatus: "drafting",
      currentStage: "outline",
      stageData: { outline: {} },
    });
    const { ctx, patches } = makeMockCtxWithGet(session);

    const fn = autoRescueRevision as unknown as {
      _handler: (ctx: unknown, args: { sessionId: string; userId: string; source: string }) => Promise<unknown>;
    };

    const result = await fn._handler(ctx, {
      sessionId: "paperSessions_1",
      userId: "users_1",
      source: "createArtifact",
    });

    expect(result).toMatchObject({
      rescued: false,
      currentStatus: "drafting",
    });
    expect(patches.length).toBe(0);
  });
});
