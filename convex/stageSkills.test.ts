import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  activateVersion,
  createOrUpdateDraft,
  publishVersion,
  rollbackVersion,
} from "./stageSkills";
import { requireRole } from "./permissions";

vi.mock("./permissions", () => ({
  requireRole: vi.fn(async () => undefined),
}));

type MockRecord = {
  _id: string;
  _creationTime: number;
  [key: string]: unknown;
};

type EqFilter = Array<{ field: string; value: unknown }>;

function createMockDb() {
  const tables = new Map<string, MockRecord[]>();
  const byId = new Map<string, { table: string; record: MockRecord }>();
  let sequence = 0;

  const ensureTable = (table: string) => {
    if (!tables.has(table)) {
      tables.set(table, []);
    }
    return tables.get(table)!;
  };

  const applyFilters = (rows: MockRecord[], filters: EqFilter) =>
    rows.filter((row) => filters.every((filter) => row[filter.field] === filter.value));

  const db = {
    async insert(table: string, doc: Record<string, unknown>) {
      const id = `${table}_${++sequence}`;
      const record: MockRecord = {
        _id: id,
        _creationTime: Date.now(),
        ...doc,
      };
      ensureTable(table).push(record);
      byId.set(id, { table, record });
      return id;
    },

    async patch(id: string, patch: Record<string, unknown>) {
      const target = byId.get(id);
      if (!target) throw new Error(`record ${id} not found`);
      Object.assign(target.record, patch);
    },

    async get(id: string) {
      return byId.get(id)?.record ?? null;
    },

    query(table: string) {
      const filters: EqFilter = [];
      let orderDirection: "asc" | "desc" | undefined;

      const run = () => {
        const rows = ensureTable(table);
        const filtered = applyFilters(rows, filters);
        if (!orderDirection) {
          return [...filtered];
        }
        return [...filtered].sort((a, b) =>
          orderDirection === "desc"
            ? Number(b._creationTime) - Number(a._creationTime)
            : Number(a._creationTime) - Number(b._creationTime)
        );
      };

      const builder = {
        withIndex(_index: string, callback: (q: { eq: (field: string, value: unknown) => unknown }) => unknown) {
          const q = {
            eq(field: string, value: unknown) {
              filters.push({ field, value });
              return q;
            },
          };
          callback(q);
          return builder;
        },
        order(direction: "asc" | "desc") {
          orderDirection = direction;
          return builder;
        },
        async first() {
          return run()[0] ?? null;
        },
        async unique() {
          return run()[0] ?? null;
        },
        async take(limit: number) {
          return run().slice(0, limit);
        },
        async collect() {
          return run();
        },
      };

      return builder;
    },
  };

  return {
    db,
    tables,
  };
}

const VALID_GAGASAN_SKILL = `
## Objective
Define a feasible research idea with clear novelty.

## Input Context
Read user intent, prior approved summaries, and available references.

## Tool Policy
Allowed:
- google_search (active mode)
- updateStageData
- createArtifact
- compileDaftarPustaka (mode: preview)
Disallowed:
- compileDaftarPustaka (mode: persist)

## Output Contract
Required:
- ringkasan
Recommended:
- ringkasanDetail
- ideKasar
- analisis
- angle
- novelty

## Guardrails
Never fabricate references and never skip user confirmation before submit.

## Done Criteria
Stage draft is agreed, ringkasan is stored, and draft is ready for validation.
`;

async function callMutation<TArgs, TResult>(
  fn: { _handler: (ctx: { db: ReturnType<typeof createMockDb>["db"] }, args: TArgs) => Promise<TResult> },
  db: ReturnType<typeof createMockDb>["db"],
  args: TArgs
) {
  return fn._handler({ db }, args);
}

describe("stageSkills lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("create draft -> publish -> activate -> rollback berjalan konsisten", async () => {
    const { db, tables } = createMockDb();
    const requestorUserId = "user_admin_1";

    const draftV1 = await callMutation<
      {
        requestorUserId: string;
        stageScope: "gagasan";
        name: string;
        description: string;
        contentBody: string;
        changeNote: string;
      },
      { version: number; skillId: string }
    >(createOrUpdateDraft as any, db, {
      requestorUserId,
      stageScope: "gagasan",
      name: "gagasan-skill",
      description: "Stage instruction for gagasan in Makalah AI paper workflow.",
      contentBody: VALID_GAGASAN_SKILL,
      changeNote: "Initial draft",
    });
    expect(draftV1.version).toBe(1);
    expect(draftV1.skillId).toBe("gagasan-skill");

    await callMutation(publishVersion as any, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 1,
    });
    await callMutation(activateVersion as any, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 1,
    });

    const draftV2 = await callMutation<
      {
        requestorUserId: string;
        stageScope: "gagasan";
        name: string;
        description: string;
        contentBody: string;
        changeNote: string;
      },
      { version: number }
    >(createOrUpdateDraft as any, db, {
      requestorUserId,
      stageScope: "gagasan",
      name: "gagasan-skill",
      description: "Stage instruction for gagasan in Makalah AI paper workflow.",
      contentBody: `${VALID_GAGASAN_SKILL}\n`,
      changeNote: "Improve wording",
    });
    expect(draftV2.version).toBe(2);

    await callMutation(publishVersion as any, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 2,
    });
    await callMutation(activateVersion as any, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 2,
    });

    const rollbackResult = await callMutation<
      {
        requestorUserId: string;
        skillId: string;
        targetVersion: number;
        reason: string;
      },
      { version: number }
    >(rollbackVersion as any, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      targetVersion: 1,
      reason: "Fallback to previous stable prompt",
    });
    expect(rollbackResult.version).toBe(1);

    const versions = tables.get("stageSkillVersions") ?? [];
    const version1 = versions.find((item) => Number(item.version) === 1);
    const version2 = versions.find((item) => Number(item.version) === 2);

    expect(version1?.status).toBe("active");
    expect(version2?.status).toBe("published");

    const auditActions = (tables.get("stageSkillAuditLogs") ?? []).map((item) => item.action);
    expect(auditActions).toEqual(
      expect.arrayContaining([
        "create",
        "draft_saved",
        "publish",
        "activate",
        "rollback",
      ])
    );

    expect(vi.mocked(requireRole)).toHaveBeenCalled();
  });

  it("menolak eksekusi saat role gate gagal", async () => {
    const { db, tables } = createMockDb();
    vi.mocked(requireRole).mockRejectedValueOnce(new Error("forbidden"));

    await expect(
      callMutation(createOrUpdateDraft as any, db, {
        requestorUserId: "user_non_admin",
        stageScope: "gagasan",
        name: "gagasan-skill",
        description: "Stage instruction for gagasan in Makalah AI paper workflow.",
        contentBody: VALID_GAGASAN_SKILL,
      })
    ).rejects.toThrow("forbidden");

    expect(tables.get("stageSkills") ?? []).toHaveLength(0);
    expect(tables.get("stageSkillVersions") ?? []).toHaveLength(0);
  });
});
