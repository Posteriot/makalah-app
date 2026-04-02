import { describe, expect, it, vi } from "vitest";
import { submitForValidation } from "./paperSessions";

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
  const fn = submitForValidation as unknown as {
    _handler: (ctx: unknown, args: { sessionId: string }) => Promise<unknown>;
  };
  return fn._handler(ctx, args);
}

describe("submitForValidation — artifact guard", () => {
  it("throws when ringkasan is missing", async () => {
    const session = makeSession({
      stageData: { gagasan: {} },
    });
    mockedRequirePaperSessionOwner.mockResolvedValue({ session } as never);
    const { ctx } = makeMockCtx();

    await expect(callHandler(ctx, { sessionId: "paperSessions_1" })).rejects.toThrow(
      /Ringkasan must be provided/
    );
  });

  it("throws when artifactId is missing but ringkasan exists", async () => {
    const session = makeSession({
      stageData: { gagasan: { ringkasan: "Test summary" } },
    });
    mockedRequirePaperSessionOwner.mockResolvedValue({ session } as never);
    const { ctx } = makeMockCtx();

    await expect(callHandler(ctx, { sessionId: "paperSessions_1" })).rejects.toThrow(
      /Artifact must be created first/
    );
  });

  it("succeeds when both ringkasan and artifactId exist", async () => {
    const session = makeSession({
      stageData: { gagasan: { ringkasan: "Test summary", artifactId: "artifact_123" } },
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
