import { describe, expect, it, vi } from "vitest";

import { rebuildNaskahSnapshot } from "./naskahRebuild";
import { compileNaskahSnapshot } from "../src/lib/naskah/compiler";

// ────────────────────────────────────────────────────────────────────────────
// Mock ctx for the rebuild helper.
//
// The rebuild helper needs:
//   - ctx.db.get(sessionId) -> session row
//   - ctx.db.get(artifactId) -> artifact row (or null)
//   - ctx.db.query("naskahSnapshots").withIndex("by_session", ...).order("desc").first()
//   - ctx.db.insert("naskahSnapshots", row)
//
// The mock records:
//   - every db.get id (so D1/D2 can assert "exactly once per validated stage with artifactId")
//   - every db.insert (so we can read the persisted snapshot back)
//   - every db.query call shape (table, indexName, eqs, terminator)
// ────────────────────────────────────────────────────────────────────────────

interface QueryRecord {
  table: string;
  indexName?: string;
  eqs?: Array<{ field: string; value: unknown }>;
  order?: "asc" | "desc";
  terminator?: "first" | "unique" | "collect";
}

interface RebuildCtxOptions {
  session: Record<string, unknown> | null;
  artifacts?: Record<string, Record<string, unknown> | null>;
  previousSnapshots?: Array<Record<string, unknown>>;
}

function makeRebuildCtx(opts: RebuildCtxOptions) {
  const getCalls: string[] = [];
  const inserts: Array<{ table: string; doc: Record<string, unknown> }> = [];
  const queryRecords: QueryRecord[] = [];
  const sessionRow = opts.session;
  const artifacts = opts.artifacts ?? {};
  const previousSnapshots = opts.previousSnapshots ?? [];

  // naskahSnapshots index returns previousSnapshots[0] for .first() — the
  // test arranges them in expected "desc by revision" order.

  return {
    getCalls,
    inserts,
    queryRecords,
    ctx: {
      db: {
        get: vi.fn(async (id: string) => {
          getCalls.push(id);
          if (sessionRow && sessionRow._id === id) return sessionRow;
          if (id in artifacts) return artifacts[id];
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
              return previousSnapshots[0] ?? null;
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
      },
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Fixture builders
// ────────────────────────────────────────────────────────────────────────────

function makeSession(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    _id: "paperSessions_1",
    userId: "users_1",
    paperTitle: null,
    workingTitle: null,
    stageData: {},
    ...overrides,
  };
}

function makeArtifact(
  id: string,
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    _id: id,
    content: "Body",
    format: "markdown",
    invalidatedAt: undefined,
    title: "Artifact title",
    ...overrides,
  };
}

/**
 * Build a previous-snapshot fixture by running the same compiler the
 * rebuild helper uses, then merging in the persistence-only fields.
 * Used by tests that pin idempotency: a previous snapshot built this way
 * is GUARANTEED to hash-match what the rebuild will produce given the
 * same stageData + artifacts.
 */
function makePreviousSnapshotFromCompile(
  compileInputs: Parameters<typeof compileNaskahSnapshot>[0],
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  const compiled = compileNaskahSnapshot(compileInputs);
  return {
    _id: "naskahSnapshots_prev",
    sessionId: "paperSessions_1",
    revision: 1,
    compiledAt: 1000,
    status: compiled.status,
    title: compiled.title,
    titleSource: compiled.titleSource,
    sections: compiled.sections,
    pageEstimate: compiled.pageEstimate,
    sourceArtifactRefs: compiled.sourceArtifactRefs,
    isAvailable: compiled.isAvailable,
    reasonIfUnavailable: compiled.reasonIfUnavailable,
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// GROUP A — first rebuild from empty state
// ────────────────────────────────────────────────────────────────────────────

describe("rebuildNaskahSnapshot — first rebuild", () => {
  it("A1: empty session writes revision=1 with empty_session reason", async () => {
    const session = makeSession({ stageData: {} });
    const { ctx, inserts } = makeRebuildCtx({ session });

    const result = await rebuildNaskahSnapshot(
      ctx as never,
      "paperSessions_1" as never,
    );

    expect(result.written).toBe(true);
    expect(result.revision).toBe(1);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe("naskahSnapshots");
    expect(inserts[0].doc).toMatchObject({
      sessionId: "paperSessions_1",
      revision: 1,
      isAvailable: false,
      reasonIfUnavailable: "empty_session",
      title: "Paper Tanpa Judul",
      titleSource: "fallback",
    });
    expect(typeof inserts[0].doc.compiledAt).toBe("number");
    expect(inserts[0].doc.sections).toEqual([]);
    expect(inserts[0].doc.sourceArtifactRefs).toEqual([]);
  });

  it("A2: validated abstrak with valid artifact writes revision=1 isAvailable=true", async () => {
    const session = makeSession({
      stageData: {
        abstrak: { validatedAt: 1, artifactId: "art_a" },
      },
    });
    const { ctx, inserts } = makeRebuildCtx({
      session,
      artifacts: { art_a: makeArtifact("art_a", { content: "Abstrak body." }) },
    });

    const result = await rebuildNaskahSnapshot(
      ctx as never,
      "paperSessions_1" as never,
    );

    expect(result.written).toBe(true);
    expect(result.revision).toBe(1);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].doc).toMatchObject({
      revision: 1,
      isAvailable: true,
      reasonIfUnavailable: undefined,
    });
    const sections = inserts[0].doc.sections as Array<Record<string, unknown>>;
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      key: "abstrak",
      content: "Abstrak body.",
      sourceStage: "abstrak",
      sourceArtifactId: "art_a",
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GROUP B — re-rebuild idempotency
// ────────────────────────────────────────────────────────────────────────────

describe("rebuildNaskahSnapshot — re-rebuild idempotency", () => {
  it("B1: identical state returns {written:false}, no insert, queries naskahSnapshots by_session desc first()", async () => {
    const session = makeSession({
      stageData: {
        abstrak: { validatedAt: 1, artifactId: "art_a" },
      },
    });
    const artifact = makeArtifact("art_a", { content: "Abstrak body." });

    // Build the previous snapshot to exactly match what the rebuild will compute.
    const previous = makePreviousSnapshotFromCompile({
      stageData: session.stageData as never,
      artifactsById: { art_a: artifact as never },
      paperTitle: null,
      workingTitle: null,
    });

    const { ctx, inserts, queryRecords } = makeRebuildCtx({
      session,
      artifacts: { art_a: artifact },
      previousSnapshots: [previous],
    });

    const result = await rebuildNaskahSnapshot(
      ctx as never,
      "paperSessions_1" as never,
    );

    expect(result.written).toBe(false);
    expect(result.revision).toBe(1);
    expect(inserts).toHaveLength(0);

    // Pin the previous-snapshot query call shape exactly. The rebuild
    // must use the same by_session index, the same eq field, the same
    // desc order, and .first() — anything else fails loudly.
    expect(queryRecords).toHaveLength(1);
    expect(queryRecords[0]).toMatchObject({
      table: "naskahSnapshots",
      indexName: "by_session",
      eqs: [{ field: "sessionId", value: "paperSessions_1" }],
      order: "desc",
      terminator: "first",
    });
  });

  it("B2: changed artifact content writes a new row at revision=2", async () => {
    const session = makeSession({
      stageData: {
        abstrak: { validatedAt: 1, artifactId: "art_a" },
      },
    });
    const oldArtifact = makeArtifact("art_a", { content: "OLD body." });
    const newArtifact = makeArtifact("art_a", { content: "NEW body." });

    // Previous snapshot was built from the OLD artifact body
    const previous = makePreviousSnapshotFromCompile({
      stageData: session.stageData as never,
      artifactsById: { art_a: oldArtifact as never },
      paperTitle: null,
      workingTitle: null,
    });

    // Current state: same stageData but the artifact body changed
    const { ctx, inserts } = makeRebuildCtx({
      session,
      artifacts: { art_a: newArtifact },
      previousSnapshots: [previous],
    });

    const result = await rebuildNaskahSnapshot(
      ctx as never,
      "paperSessions_1" as never,
    );

    expect(result.written).toBe(true);
    expect(result.revision).toBe(2);
    expect(inserts).toHaveLength(1);
    const sections = inserts[0].doc.sections as Array<Record<string, unknown>>;
    expect(sections[0].content).toBe("NEW body.");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GROUP C — provenance-only changes must NOT trigger new revisions
//
// Per implementation plan Task 3 Step 3, dedupe compares title + sections
// only. A pure provenance change (revisionCount bump with identical rendered
// bytes) must stay a no-op — otherwise the user sees `update pending` for
// something invisible, violating D-018's manual refresh semantics. A change
// that flips a section's rendered source (artifact -> inline) still triggers
// a new row because `section.sourceArtifactId` is part of the section hash.
// ────────────────────────────────────────────────────────────────────────────

describe("rebuildNaskahSnapshot — provenance-only dedupe", () => {
  it("C1: revisionCount bump on a winning ref does NOT trigger a new row when sections are byte-identical", async () => {
    // Pure provenance test: nothing in `sections` changes, only the
    // sourceArtifactRefs[abstrak].revisionCount field. Section hash covers
    // key, label, content, sourceStage, and sourceArtifactId — not the ref's
    // revisionCount. Writing a new row here would surface as a false
    // `update pending` in the UI.

    const sessionPrev = makeSession({
      stageData: {
        abstrak: {
          validatedAt: 1,
          artifactId: "art_a",
          revisionCount: 1,
        },
      },
    });
    const sessionNow = makeSession({
      stageData: {
        abstrak: {
          validatedAt: 1,
          artifactId: "art_a",
          revisionCount: 2,
        },
      },
    });
    const artifact = makeArtifact("art_a", { content: "Body" });

    const previous = makePreviousSnapshotFromCompile({
      stageData: sessionPrev.stageData as never,
      artifactsById: { art_a: artifact as never },
      paperTitle: null,
      workingTitle: null,
    });

    const { ctx, inserts } = makeRebuildCtx({
      session: sessionNow,
      artifacts: { art_a: artifact },
      previousSnapshots: [previous],
    });

    const result = await rebuildNaskahSnapshot(
      ctx as never,
      "paperSessions_1" as never,
    );

    expect(result.written).toBe(false);
    expect(result.revision).toBe(1);
    expect(inserts).toHaveLength(0);
  });

  it("C2: artifact invalidated with inline fallback (sourceArtifactId flips) triggers new row", async () => {
    // Initial state: validated abstrak with a fresh artifact body
    // New state: same validated abstrak, same body string in the inline
    // ringkasanPenelitian field, but the artifact is invalidated.
    // The rendered content stays "Body" but section.sourceArtifactId
    // flips from "art_a" -> undefined (because the compiler only records
    // sourceArtifactId when via === "artifact"). That flip is captured in
    // the section hash (key, label, content, sourceStage, sourceArtifactId),
    // so a new row IS written even though the content string is identical.
    // This is the correct boundary: the user now sees content sourced from
    // a DIFFERENT place, which is a real provenance change visible to the
    // compiler's guarantees — not pure metadata drift like revisionCount.

    const session = makeSession({
      stageData: {
        abstrak: {
          validatedAt: 1,
          artifactId: "art_a",
          ringkasanPenelitian: "Body",
        },
      },
    });
    const validArtifact = makeArtifact("art_a", { content: "Body" });
    const invalidatedArtifact = makeArtifact("art_a", {
      content: "Body",
      invalidatedAt: 999,
    });

    const previous = makePreviousSnapshotFromCompile({
      stageData: session.stageData as never,
      artifactsById: { art_a: validArtifact as never },
      paperTitle: null,
      workingTitle: null,
    });

    const { ctx, inserts } = makeRebuildCtx({
      session,
      artifacts: { art_a: invalidatedArtifact },
      previousSnapshots: [previous],
    });

    const result = await rebuildNaskahSnapshot(
      ctx as never,
      "paperSessions_1" as never,
    );

    expect(result.written).toBe(true);
    expect(result.revision).toBe(2);
    expect(inserts).toHaveLength(1);

    const sections = inserts[0].doc.sections as Array<Record<string, unknown>>;
    expect(sections[0].content).toBe("Body");
    expect(sections[0].sourceArtifactId).toBeUndefined();

    const refs = inserts[0].doc.sourceArtifactRefs as Array<
      Record<string, unknown>
    >;
    const abstrakRef = refs.find((r) => r.stage === "abstrak");
    expect(abstrakRef?.resolution).toBe("inline");
    expect(abstrakRef?.usedForRender).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GROUP D — artifact fetching surface
// ────────────────────────────────────────────────────────────────────────────

describe("rebuildNaskahSnapshot — artifact fetching", () => {
  it("D1: db.get is called exactly once per validated stage that has an artifactId", async () => {
    const session = makeSession({
      stageData: {
        abstrak: { validatedAt: 1, artifactId: "art_a" },
        pendahuluan: { validatedAt: 2, artifactId: "art_p" },
        // outline is validated but no artifactId — should NOT be fetched
        outline: { validatedAt: 3 },
      },
    });
    const { ctx, getCalls } = makeRebuildCtx({
      session,
      artifacts: {
        art_a: makeArtifact("art_a", { content: "Abstrak body." }),
        art_p: makeArtifact("art_p", { content: "Pendahuluan body." }),
      },
    });

    await rebuildNaskahSnapshot(ctx as never, "paperSessions_1" as never);

    // session lookup + 2 artifact lookups = 3 total db.get calls
    const artifactGets = getCalls.filter((id) => id.startsWith("art_"));
    expect(artifactGets).toEqual(["art_a", "art_p"]);
    // No duplicate fetch for art_a or art_p
    expect(new Set(artifactGets).size).toBe(artifactGets.length);
  });

  it("D2: db.get is NOT called for stages without an artifactId", async () => {
    const session = makeSession({
      stageData: {
        // validated but no artifactId — falls back to inline only
        abstrak: {
          validatedAt: 1,
          ringkasanPenelitian: "Inline body.",
        },
      },
    });
    const { ctx, getCalls } = makeRebuildCtx({ session });

    await rebuildNaskahSnapshot(ctx as never, "paperSessions_1" as never);

    const artifactGets = getCalls.filter((id) => id.startsWith("art_"));
    expect(artifactGets).toHaveLength(0);
  });

  it("D3: artifact-not-found (db.get returns null) lets the compiler fall back to inline", async () => {
    const session = makeSession({
      stageData: {
        abstrak: {
          validatedAt: 1,
          artifactId: "art_missing",
          ringkasanPenelitian: "Inline survivor.",
        },
      },
    });
    const { ctx, inserts, getCalls } = makeRebuildCtx({
      session,
      artifacts: { art_missing: null }, // explicitly null = "fetched but missing"
    });

    const result = await rebuildNaskahSnapshot(
      ctx as never,
      "paperSessions_1" as never,
    );

    // Rebuild attempted exactly one fetch for the missing artifact
    expect(getCalls.filter((id) => id === "art_missing")).toHaveLength(1);

    expect(result.written).toBe(true);
    const sections = inserts[0].doc.sections as Array<Record<string, unknown>>;
    expect(sections[0].content).toBe("Inline survivor.");
    expect(sections[0].sourceArtifactId).toBeUndefined();
  });

  it("D4: invalidated artifact is still fetched once; compiler decides the fallback", async () => {
    const session = makeSession({
      stageData: {
        abstrak: {
          validatedAt: 1,
          artifactId: "art_a",
          ringkasanPenelitian: "Inline survivor.",
        },
      },
    });
    const invalidated = makeArtifact("art_a", {
      content: "Stale body",
      invalidatedAt: 999,
    });
    const { ctx, inserts, getCalls } = makeRebuildCtx({
      session,
      artifacts: { art_a: invalidated },
    });

    await rebuildNaskahSnapshot(ctx as never, "paperSessions_1" as never);

    // Rebuild fetched the invalidated artifact exactly once — it does NOT
    // pre-filter based on invalidatedAt. The compiler is the only place
    // that decides fallback semantics.
    expect(getCalls.filter((id) => id === "art_a")).toHaveLength(1);

    const sections = inserts[0].doc.sections as Array<Record<string, unknown>>;
    expect(sections[0].content).toBe("Inline survivor.");
    expect(sections[0].sourceArtifactId).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GROUP E — revision math
// ────────────────────────────────────────────────────────────────────────────

describe("rebuildNaskahSnapshot — revision math", () => {
  it("E1: revision increments by 1 from the latest existing row", async () => {
    const session = makeSession({
      stageData: {
        abstrak: { validatedAt: 1, artifactId: "art_a" },
      },
    });
    const oldArtifact = makeArtifact("art_a", { content: "OLD" });
    const newArtifact = makeArtifact("art_a", { content: "NEW" });

    const previousAtRev7 = makePreviousSnapshotFromCompile(
      {
        stageData: session.stageData as never,
        artifactsById: { art_a: oldArtifact as never },
        paperTitle: null,
        workingTitle: null,
      },
      { revision: 7 },
    );

    const { ctx, inserts } = makeRebuildCtx({
      session,
      artifacts: { art_a: newArtifact },
      previousSnapshots: [previousAtRev7],
    });

    const result = await rebuildNaskahSnapshot(
      ctx as never,
      "paperSessions_1" as never,
    );

    expect(result.written).toBe(true);
    expect(result.revision).toBe(8);
    expect(inserts[0].doc.revision).toBe(8);
  });

  it("E2: when no previous row exists, revision starts at 1", async () => {
    const session = makeSession({
      stageData: {
        abstrak: { validatedAt: 1, artifactId: "art_a" },
      },
    });
    const { ctx, inserts } = makeRebuildCtx({
      session,
      artifacts: { art_a: makeArtifact("art_a", { content: "Body." }) },
      previousSnapshots: [],
    });

    const result = await rebuildNaskahSnapshot(
      ctx as never,
      "paperSessions_1" as never,
    );

    expect(result.revision).toBe(1);
    expect(inserts[0].doc.revision).toBe(1);
  });
});
