import { describe, expect, it, vi } from "vitest";
import { submitForValidation } from "./paperSessions";

// Mock authHelpers — requirePaperSessionOwner is called inside submitForValidation.
// We intercept it to return a controlled session object without needing real auth.
vi.mock("./authHelpers", () => ({
  requireAuthUser: vi.fn(),
  requirePaperSessionOwner: vi.fn(),
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
  // Convex mutations expose _handler on the object
  const fn = submitForValidation as unknown as {
    _handler: (ctx: unknown, args: { sessionId: string }) => Promise<unknown>;
  };
  return fn._handler(ctx, args);
}

describe("submitForValidation", () => {
  it("throws when ringkasan exists but artifactId is missing", async () => {
    const session = makeSession({
      stageData: {
        gagasan: {
          ringkasan: "Some summary text",
          // No artifactId — this is the gap we are testing
        },
      },
    });

    mockedRequirePaperSessionOwner.mockResolvedValue({
      authUser: { _id: "users_1" } as never,
      session: session as never,
    });

    const { ctx } = makeMockCtx();

    await expect(
      callHandler(ctx, { sessionId: "paperSessions_1" })
    ).rejects.toThrow(
      "submitForValidation failed: Artifact must be created first."
    );
  });

  it("throws when ringkasan is missing (existing guard still works)", async () => {
    const session = makeSession({
      stageData: {
        gagasan: {
          // No ringkasan, no artifactId
        },
      },
    });

    mockedRequirePaperSessionOwner.mockResolvedValue({
      authUser: { _id: "users_1" } as never,
      session: session as never,
    });

    const { ctx } = makeMockCtx();

    await expect(
      callHandler(ctx, { sessionId: "paperSessions_1" })
    ).rejects.toThrow(
      "submitForValidation failed: Ringkasan must be provided first."
    );
  });

  it("succeeds when both ringkasan and artifactId exist", async () => {
    const session = makeSession({
      stageData: {
        gagasan: {
          ringkasan: "Some summary text",
          artifactId: "artifacts_42",
        },
      },
    });

    mockedRequirePaperSessionOwner.mockResolvedValue({
      authUser: { _id: "users_1" } as never,
      session: session as never,
    });

    const { ctx, patches } = makeMockCtx();

    const result = await callHandler(ctx, { sessionId: "paperSessions_1" });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        stage: "gagasan",
      })
    );

    // Contract: submit sets pending_validation but does NOT advance currentStage
    expect(patches).toHaveLength(1);
    expect(patches[0].patch).toEqual(
      expect.objectContaining({
        stageStatus: "pending_validation",
      })
    );
    // currentStage must NOT be in the patch — only approveStage advances it
    expect(patches[0].patch).not.toHaveProperty("currentStage");
  });
});
