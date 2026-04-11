import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deriveUpdatePending,
  getAvailability,
  getLatestSnapshot,
  getSnapshotByRevision,
  getViewState,
  markViewed,
} from "./naskah";

vi.mock("./authHelpers", () => ({
  getAuthUser: vi.fn(),
  requireAuthUser: vi.fn(),
  requireAuthUserId: vi.fn(),
  verifyAuthUserId: vi.fn(),
  requirePaperSessionOwner: vi.fn(),
}));

// Pull the mocks back so we can reconfigure per test.
import {
  getAuthUser,
  requireAuthUser,
  requireAuthUserId,
  verifyAuthUserId,
} from "./authHelpers";

const mockedGetAuthUser = vi.mocked(getAuthUser);
const mockedRequireAuthUser = vi.mocked(requireAuthUser);
const mockedRequireAuthUserId = vi.mocked(requireAuthUserId);
const mockedVerifyAuthUserId = vi.mocked(verifyAuthUserId);

interface AuthUserShape {
  _id: string;
}

function configureAuth(authUser: AuthUserShape | null) {
  if (authUser) {
    mockedGetAuthUser.mockResolvedValue(authUser as never);
    mockedRequireAuthUser.mockResolvedValue(authUser as never);
    mockedVerifyAuthUserId.mockImplementation(
      (async (_ctx: unknown, userId: string) => {
        return authUser._id === userId ? (authUser as never) : null;
      }) as never,
    );
    mockedRequireAuthUserId.mockImplementation(
      (async (_ctx: unknown, userId: string) => {
        if (authUser._id !== userId) throw new Error("Unauthorized");
        return authUser as never;
      }) as never,
    );
  } else {
    mockedGetAuthUser.mockResolvedValue(null);
    mockedRequireAuthUser.mockImplementation(
      (async () => {
        throw new Error("Unauthorized");
      }) as never,
    );
    mockedVerifyAuthUserId.mockResolvedValue(null);
    mockedRequireAuthUserId.mockImplementation(
      (async () => {
        throw new Error("Unauthorized");
      }) as never,
    );
  }
}

// Default per-test state: auth user `users_1` who owns `paperSessions_1`.
// Tests that exercise auth/ownership failure paths override either the
// auth config or the session fixture.
beforeEach(() => {
  vi.clearAllMocks();
  configureAuth({ _id: "users_1" });
});

// ────────────────────────────────────────────────────────────────────────────
// Mocked ctx with call-shape recording.
//
// Per Codex Task 2 guidance:
//   - mock only the surface area each test exercises
//   - record table name, withIndex name, eq field/value pairs, order
//     direction, and terminator (first/unique/collect) so a typo like
//     "by_sesion" or a wrong field name fails loudly
//   - return fixture rows verbatim — do NOT re-implement Convex query
//     filtering; the test sets up the rows it wants the query to see
// ────────────────────────────────────────────────────────────────────────────

interface QueryRecord {
  table: string;
  indexName?: string;
  eqs?: Array<{ field: string; value: unknown }>;
  order?: "asc" | "desc";
  terminator?: "first" | "unique" | "collect";
}

interface MockCtxOptions {
  rows?: Record<string, Array<Record<string, unknown>>>;
  /**
   * The paper session that `ctx.db.get(sessionId)` should return.
   * Defaults to a session owned by `users_1`. Tests that need a session
   * owned by a different user, or no session at all, override this.
   */
  session?: Record<string, unknown> | null;
}

function makeMockCtx(opts: MockCtxOptions = {}) {
  const queryRecords: QueryRecord[] = [];
  const inserts: Array<{ table: string; doc: Record<string, unknown> }> = [];
  const patches: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const rowsByTable = opts.rows ?? {};
  const sessionRow: Record<string, unknown> | null =
    opts.session === undefined
      ? { _id: "paperSessions_1", userId: "users_1" }
      : opts.session;

  return {
    queryRecords,
    inserts,
    patches,
    ctx: {
      db: {
        get: vi.fn(async (id: string) => {
          if (sessionRow && sessionRow._id === id) return sessionRow;
          return null;
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query: vi.fn((table: string): any => {
          const record: QueryRecord = { table };
          queryRecords.push(record);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const builder: any = {
            withIndex: vi.fn(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (indexName: string, fn: (q: any) => unknown) => {
                record.indexName = indexName;
                const eqs: Array<{ field: string; value: unknown }> = [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const indexQ: any = {
                  eq: vi.fn((field: string, value: unknown) => {
                    eqs.push({ field, value });
                    return indexQ;
                  }),
                };
                fn(indexQ);
                record.eqs = eqs;
                return builder;
              },
            ),
            order: vi.fn((dir: "asc" | "desc") => {
              record.order = dir;
              return builder;
            }),
            first: vi.fn(async () => {
              record.terminator = "first";
              const rows = rowsByTable[table] ?? [];
              return rows[0] ?? null;
            }),
            unique: vi.fn(async () => {
              record.terminator = "unique";
              const rows = rowsByTable[table] ?? [];
              if (rows.length > 1) {
                throw new Error(
                  `unique() called on '${table}' but fixture has ${rows.length} rows`,
                );
              }
              return rows[0] ?? null;
            }),
            collect: vi.fn(async () => {
              record.terminator = "collect";
              return rowsByTable[table] ?? [];
            }),
          };
          return builder;
        }),
        insert: vi.fn(
          async (table: string, doc: Record<string, unknown>) => {
            inserts.push({ table, doc });
            return `${table}_${inserts.length}`;
          },
        ),
        patch: vi.fn(
          async (id: string, patch: Record<string, unknown>) => {
            patches.push({ id, patch });
          },
        ),
      },
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Handler call helpers — Convex queries/mutations expose `_handler` for
// direct invocation in tests, same pattern as `convex/paperSessions.test.ts`.
// ────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function callQuery<T>(handler: any, ctx: any, args: T): Promise<unknown> {
  const fn = handler as { _handler: (ctx: unknown, args: T) => Promise<unknown> };
  return fn._handler(ctx, args);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function callMutation<T>(handler: any, ctx: any, args: T): Promise<unknown> {
  const fn = handler as { _handler: (ctx: unknown, args: T) => Promise<unknown> };
  return fn._handler(ctx, args);
}

// ────────────────────────────────────────────────────────────────────────────
// Snapshot fixture builder
// ────────────────────────────────────────────────────────────────────────────

function makeSnapshotRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    _id: "naskahSnapshots_1",
    sessionId: "paperSessions_1",
    revision: 1,
    compiledAt: 1000,
    status: "growing",
    title: "Paper Tanpa Judul",
    titleSource: "fallback",
    sections: [],
    pageEstimate: 1,
    sourceArtifactRefs: [],
    isAvailable: false,
    reasonIfUnavailable: "empty_session",
    ...overrides,
  };
}

function makeViewRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    _id: "naskahViews_1",
    sessionId: "paperSessions_1",
    userId: "users_1",
    lastViewedRevision: 1,
    viewedAt: 500,
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// GROUP A — deriveUpdatePending pure helper
// ────────────────────────────────────────────────────────────────────────────

describe("deriveUpdatePending", () => {
  it("A1: returns true when latest revision is greater than viewed revision", () => {
    expect(
      deriveUpdatePending({ latestRevision: 4, viewedRevision: 3 }),
    ).toBe(true);
  });

  it("A2: returns false when latest revision equals viewed revision", () => {
    expect(
      deriveUpdatePending({ latestRevision: 3, viewedRevision: 3 }),
    ).toBe(false);
  });

  it("A3: returns true when snapshot exists but user has never viewed", () => {
    expect(
      deriveUpdatePending({ latestRevision: 3, viewedRevision: undefined }),
    ).toBe(true);
  });

  it("A4: returns false when neither latest nor viewed revision exists", () => {
    expect(
      deriveUpdatePending({
        latestRevision: undefined,
        viewedRevision: undefined,
      }),
    ).toBe(false);
  });

  it("A5: returns false in the degenerate viewed-without-latest case (under-notify)", () => {
    expect(
      deriveUpdatePending({ latestRevision: undefined, viewedRevision: 3 }),
    ).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GROUP B — getLatestSnapshot query
// ────────────────────────────────────────────────────────────────────────────

describe("getLatestSnapshot", () => {
  it("B1: returns null when no snapshot exists for the session", async () => {
    const { ctx } = makeMockCtx({ rows: { naskahSnapshots: [] } });

    const result = await callQuery(
      getLatestSnapshot,
      ctx,
      { sessionId: "paperSessions_1" },
    );

    expect(result).toBeNull();
  });

  it("B2: returns the latest snapshot row when fixture supplies one", async () => {
    const row = makeSnapshotRow({
      revision: 7,
      isAvailable: true,
      reasonIfUnavailable: undefined,
    });
    const { ctx } = makeMockCtx({ rows: { naskahSnapshots: [row] } });

    const result = await callQuery(
      getLatestSnapshot,
      ctx,
      { sessionId: "paperSessions_1" },
    );

    expect(result).toMatchObject({
      _id: "naskahSnapshots_1",
      revision: 7,
      isAvailable: true,
    });
  });

  it("B3: queries naskahSnapshots by_session index, eq sessionId, order desc, first()", async () => {
    const { ctx, queryRecords } = makeMockCtx({
      rows: { naskahSnapshots: [makeSnapshotRow({ revision: 2 })] },
    });

    await callQuery(
      getLatestSnapshot,
      ctx,
      { sessionId: "paperSessions_1" },
    );

    expect(queryRecords).toHaveLength(1);
    expect(queryRecords[0]).toMatchObject({
      table: "naskahSnapshots",
      indexName: "by_session",
      eqs: [{ field: "sessionId", value: "paperSessions_1" }],
      order: "desc",
      terminator: "first",
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GROUP B-rev — getSnapshotByRevision query
// Powers D-018: useNaskah loads the user's last-viewed snapshot so the
// route can render it on entry without auto-consuming pending state.
// ────────────────────────────────────────────────────────────────────────────

describe("getSnapshotByRevision", () => {
  it("BR1: returns null when no snapshot row exists at the requested revision", async () => {
    const { ctx } = makeMockCtx({ rows: { naskahSnapshots: [] } });

    const result = await callQuery(
      getSnapshotByRevision,
      ctx,
      { sessionId: "paperSessions_1", revision: 3 },
    );

    expect(result).toBeNull();
  });

  it("BR2: returns the snapshot row when the fixture supplies one", async () => {
    const row = makeSnapshotRow({
      revision: 3,
      title: "Judul Revisi 3",
      isAvailable: true,
      reasonIfUnavailable: undefined,
    });
    const { ctx } = makeMockCtx({ rows: { naskahSnapshots: [row] } });

    const result = await callQuery(
      getSnapshotByRevision,
      ctx,
      { sessionId: "paperSessions_1", revision: 3 },
    );

    expect(result).toMatchObject({
      _id: "naskahSnapshots_1",
      revision: 3,
      title: "Judul Revisi 3",
    });
  });

  it("BR3: queries naskahSnapshots by_session index with sessionId+revision eqs and unique()", async () => {
    const { ctx, queryRecords } = makeMockCtx({
      rows: { naskahSnapshots: [makeSnapshotRow({ revision: 3 })] },
    });

    await callQuery(
      getSnapshotByRevision,
      ctx,
      { sessionId: "paperSessions_1", revision: 3 },
    );

    expect(queryRecords).toHaveLength(1);
    expect(queryRecords[0]).toMatchObject({
      table: "naskahSnapshots",
      indexName: "by_session",
      eqs: [
        { field: "sessionId", value: "paperSessions_1" },
        { field: "revision", value: 3 },
      ],
      // unique() because (sessionId, revision) is a logical single-row
      // contract per the by_session index. Duplicates must explode loudly.
      terminator: "unique",
    });
  });

  it("BR4: returns null when caller is not authenticated", async () => {
    configureAuth(null);
    const { ctx } = makeMockCtx({
      rows: { naskahSnapshots: [makeSnapshotRow({ revision: 3 })] },
    });

    const result = await callQuery(
      getSnapshotByRevision,
      ctx,
      { sessionId: "paperSessions_1", revision: 3 },
    );

    expect(result).toBeNull();
  });

  it("BR5: returns null when session is owned by a different user", async () => {
    const { ctx } = makeMockCtx({
      rows: { naskahSnapshots: [makeSnapshotRow({ revision: 3 })] },
      session: { _id: "paperSessions_1", userId: "users_other" },
    });

    const result = await callQuery(
      getSnapshotByRevision,
      ctx,
      { sessionId: "paperSessions_1", revision: 3 },
    );

    expect(result).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GROUP C — getAvailability query
// ────────────────────────────────────────────────────────────────────────────

describe("getAvailability", () => {
  it("C1: returns isAvailable=true with availableAtRevision when latest snapshot is available", async () => {
    const row = makeSnapshotRow({
      revision: 5,
      isAvailable: true,
      reasonIfUnavailable: undefined,
    });
    const { ctx } = makeMockCtx({ rows: { naskahSnapshots: [row] } });

    const result = await callQuery(
      getAvailability,
      ctx,
      { sessionId: "paperSessions_1" },
    );

    expect(result).toMatchObject({
      isAvailable: true,
      availableAtRevision: 5,
      reasonIfUnavailable: undefined,
    });
  });

  it("C2: returns isAvailable=false with stored reason when snapshot is unavailable", async () => {
    const row = makeSnapshotRow({
      revision: 3,
      isAvailable: false,
      reasonIfUnavailable: "abstrak_guard_failed",
    });
    const { ctx } = makeMockCtx({ rows: { naskahSnapshots: [row] } });

    const result = await callQuery(
      getAvailability,
      ctx,
      { sessionId: "paperSessions_1" },
    );

    expect(result).toMatchObject({
      isAvailable: false,
      reasonIfUnavailable: "abstrak_guard_failed",
    });
  });

  it("C3: falls back to isAvailable=false / reason=empty_session when no snapshot exists", async () => {
    const { ctx } = makeMockCtx({ rows: { naskahSnapshots: [] } });

    const result = await callQuery(
      getAvailability,
      ctx,
      { sessionId: "paperSessions_1" },
    );

    expect(result).toMatchObject({
      isAvailable: false,
      reasonIfUnavailable: "empty_session",
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GROUP D — getViewState query
// ────────────────────────────────────────────────────────────────────────────

describe("getViewState", () => {
  it("D1: returns null when no view state exists for the current user's session", async () => {
    const { ctx } = makeMockCtx({ rows: { naskahViews: [] } });

    const result = await callQuery(
      getViewState,
      ctx,
      { sessionId: "paperSessions_1" },
    );

    expect(result).toBeNull();
  });

  it("D2: returns the existing view row when fixture supplies one", async () => {
    const row = makeViewRow({ lastViewedRevision: 4 });
    const { ctx } = makeMockCtx({ rows: { naskahViews: [row] } });

    const result = await callQuery(
      getViewState,
      ctx,
      { sessionId: "paperSessions_1" },
    );

    expect(result).toMatchObject({
      _id: "naskahViews_1",
      lastViewedRevision: 4,
    });
  });

  it("D3: queries naskahViews by_session_user index with server-resolved userId and unique()", async () => {
    const { ctx, queryRecords } = makeMockCtx({
      rows: { naskahViews: [makeViewRow()] },
    });

    await callQuery(
      getViewState,
      ctx,
      { sessionId: "paperSessions_1" },
    );

    expect(queryRecords).toHaveLength(1);
    expect(queryRecords[0]).toMatchObject({
      table: "naskahViews",
      indexName: "by_session_user",
      // userId is resolved server-side from the authenticated user
      // (mocked configureAuth default = users_1), never passed by the
      // client. This prevents userId spoofing at the API surface.
      eqs: [
        { field: "sessionId", value: "paperSessions_1" },
        { field: "userId", value: "users_1" },
      ],
      // Pin unique(), not first(). (sessionId, userId) is a logical
      // single-row contract — duplicates must explode loudly, not be
      // silently swept by first().
      terminator: "unique",
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GROUP E — markViewed mutation upsert (insert if absent, patch if present)
// ────────────────────────────────────────────────────────────────────────────

describe("markViewed", () => {
  it("E1: inserts a new naskahViews row when no view state exists", async () => {
    const { ctx, inserts, patches, queryRecords } = makeMockCtx({
      rows: { naskahViews: [] },
    });

    await callMutation(
      markViewed,
      ctx,
      {
        sessionId: "paperSessions_1",
        revision: 5,
      },
    );

    expect(queryRecords).toHaveLength(1);
    expect(queryRecords[0]).toMatchObject({
      table: "naskahViews",
      indexName: "by_session_user",
      // userId resolved server-side from authUser (users_1 via default
      // configureAuth). Client cannot spoof another user at the args
      // surface because the arg does not exist.
      eqs: [
        { field: "sessionId", value: "paperSessions_1" },
        { field: "userId", value: "users_1" },
      ],
      // markViewed must use unique() on its existing-row lookup so any
      // duplicate (sessionId, userId) row explodes instead of being
      // silently overwritten on the first match.
      terminator: "unique",
    });

    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe("naskahViews");
    expect(inserts[0].doc).toMatchObject({
      sessionId: "paperSessions_1",
      userId: "users_1",
      lastViewedRevision: 5,
    });
    expect(typeof inserts[0].doc.viewedAt).toBe("number");

    expect(patches).toHaveLength(0);
  });

  it("E2: patches the existing row when view state already exists", async () => {
    const existing = makeViewRow({
      _id: "naskahViews_existing",
      lastViewedRevision: 3,
      viewedAt: 100,
    });
    const { ctx, inserts, patches, queryRecords } = makeMockCtx({
      rows: { naskahViews: [existing] },
    });

    await callMutation(
      markViewed,
      ctx,
      {
        sessionId: "paperSessions_1",
        revision: 5,
      },
    );

    expect(queryRecords).toHaveLength(1);
    expect(queryRecords[0]).toMatchObject({
      table: "naskahViews",
      indexName: "by_session_user",
      terminator: "unique",
    });

    expect(patches).toHaveLength(1);
    expect(patches[0].id).toBe("naskahViews_existing");
    expect(patches[0].patch).toMatchObject({
      lastViewedRevision: 5,
    });
    expect(typeof patches[0].patch.viewedAt).toBe("number");

    expect(inserts).toHaveLength(0);
  });

  it("E3: patches with the new revision and timestamps even when revision matches existing", async () => {
    // Idempotency check: a re-view of the same revision still bumps viewedAt.
    const existing = makeViewRow({
      _id: "naskahViews_existing",
      lastViewedRevision: 5,
      viewedAt: 100,
    });
    const { ctx, patches, inserts, queryRecords } = makeMockCtx({
      rows: { naskahViews: [existing] },
    });

    await callMutation(
      markViewed,
      ctx,
      {
        sessionId: "paperSessions_1",
        revision: 5,
      },
    );

    expect(queryRecords).toHaveLength(1);
    expect(queryRecords[0]).toMatchObject({
      table: "naskahViews",
      indexName: "by_session_user",
      terminator: "unique",
    });

    expect(patches).toHaveLength(1);
    expect(patches[0].patch).toMatchObject({ lastViewedRevision: 5 });
    expect(typeof patches[0].patch.viewedAt).toBe("number");
    expect(inserts).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GROUP F — Auth and ownership guards
//
// Pins that every handler refuses to leak data when:
//   - the caller is not authenticated
//   - the auth user does not own the requested session
//   - the userId arg does not match the auth user (for getViewState/markViewed)
//
// Reads collapse to null or to the empty_session fallback so a caller
// cannot enumerate sessions or view-state existence. The mutation throws
// "Unauthorized" loudly.
// ────────────────────────────────────────────────────────────────────────────

describe("naskah handlers — auth & ownership", () => {
  describe("getLatestSnapshot", () => {
    it("F1: returns null when caller is not authenticated", async () => {
      configureAuth(null);
      const { ctx } = makeMockCtx({
        rows: { naskahSnapshots: [makeSnapshotRow()] },
      });

      const result = await callQuery(
        getLatestSnapshot,
        ctx,
        { sessionId: "paperSessions_1" },
      );

      expect(result).toBeNull();
    });

    it("F2: returns null when session is owned by a different user", async () => {
      const { ctx } = makeMockCtx({
        rows: { naskahSnapshots: [makeSnapshotRow()] },
        session: { _id: "paperSessions_1", userId: "users_other" },
      });

      const result = await callQuery(
        getLatestSnapshot,
        ctx,
        { sessionId: "paperSessions_1" },
      );

      expect(result).toBeNull();
    });

    it("F3: returns null when session does not exist", async () => {
      const { ctx } = makeMockCtx({
        rows: { naskahSnapshots: [makeSnapshotRow()] },
        session: null,
      });

      const result = await callQuery(
        getLatestSnapshot,
        ctx,
        { sessionId: "paperSessions_1" },
      );

      expect(result).toBeNull();
    });
  });

  describe("getAvailability", () => {
    it("F4: returns empty_session fallback when caller is not authenticated", async () => {
      configureAuth(null);
      const { ctx } = makeMockCtx({
        rows: {
          naskahSnapshots: [
            makeSnapshotRow({
              isAvailable: true,
              reasonIfUnavailable: undefined,
              revision: 5,
            }),
          ],
        },
      });

      const result = await callQuery(
        getAvailability,
        ctx,
        { sessionId: "paperSessions_1" },
      );

      // Same shape as a fresh-but-empty session — no enumeration leak.
      expect(result).toMatchObject({
        isAvailable: false,
        reasonIfUnavailable: "empty_session",
      });
    });

    it("F5: returns empty_session fallback when session is owned by a different user", async () => {
      const { ctx } = makeMockCtx({
        rows: {
          naskahSnapshots: [
            makeSnapshotRow({
              isAvailable: true,
              reasonIfUnavailable: undefined,
              revision: 5,
            }),
          ],
        },
        session: { _id: "paperSessions_1", userId: "users_other" },
      });

      const result = await callQuery(
        getAvailability,
        ctx,
        { sessionId: "paperSessions_1" },
      );

      expect(result).toMatchObject({
        isAvailable: false,
        reasonIfUnavailable: "empty_session",
      });
    });
  });

  describe("getViewState", () => {
    it("F6: returns null when caller is not authenticated", async () => {
      configureAuth(null);
      const { ctx } = makeMockCtx({
        rows: { naskahViews: [makeViewRow()] },
      });

      const result = await callQuery(
        getViewState,
        ctx,
        { sessionId: "paperSessions_1" },
      );

      expect(result).toBeNull();
    });

    it("F7: returns null when session is owned by a different user", async () => {
      const { ctx } = makeMockCtx({
        rows: { naskahViews: [makeViewRow()] },
        session: { _id: "paperSessions_1", userId: "users_other" },
      });

      const result = await callQuery(
        getViewState,
        ctx,
        { sessionId: "paperSessions_1" },
      );

      expect(result).toBeNull();
    });
  });

  describe("markViewed", () => {
    it("F8: throws Unauthorized when caller is not authenticated", async () => {
      configureAuth(null);
      const { ctx, inserts, patches } = makeMockCtx({
        rows: { naskahViews: [] },
      });

      await expect(
        callMutation(
          markViewed,
          ctx,
          {
            sessionId: "paperSessions_1",
            revision: 5,
          },
        ),
      ).rejects.toThrow(/Unauthorized/);

      expect(inserts).toHaveLength(0);
      expect(patches).toHaveLength(0);
    });

    it("F9: throws Unauthorized when session is owned by a different user", async () => {
      const { ctx, inserts, patches } = makeMockCtx({
        rows: { naskahViews: [] },
        session: { _id: "paperSessions_1", userId: "users_other" },
      });

      await expect(
        callMutation(
          markViewed,
          ctx,
          {
            sessionId: "paperSessions_1",
            revision: 5,
          },
        ),
      ).rejects.toThrow(/Unauthorized/);

      expect(inserts).toHaveLength(0);
      expect(patches).toHaveLength(0);
    });

    it("F10: throws when session does not exist", async () => {
      const { ctx, inserts, patches } = makeMockCtx({
        rows: { naskahViews: [] },
        session: null,
      });

      await expect(
        callMutation(
          markViewed,
          ctx,
          {
            sessionId: "paperSessions_1",
            revision: 5,
          },
        ),
      ).rejects.toThrow(/Session not found/);

      expect(inserts).toHaveLength(0);
      expect(patches).toHaveLength(0);
    });
  });
});
