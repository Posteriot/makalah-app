import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  activateVersion,
  createOrUpdateDraft,
  DEFAULT_ALLOWED_TOOLS,
  deleteAllVersionHistory,
  deleteSkillEntirely,
  deleteVersion,
  publishVersion,
  rollbackVersion,
  setSkillEnabled,
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

    async delete(id: string) {
      const target = byId.get(id);
      if (!target) throw new Error(`record ${id} not found`);
      const rows = tables.get(target.table)!;
      const idx = rows.indexOf(target.record);
      if (idx >= 0) rows.splice(idx, 1);
      byId.delete(id);
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

## Web Search
Policy: active.
When factual evidence, references, or literature data is needed, express your search
intent clearly in your response (e.g., "Saya akan mencari referensi tentang X" or
"Perlu mencari data pendukung untuk Y"). The orchestrator detects this intent and
executes web search automatically in the next turn.
IMPORTANT: Web search and function tools cannot run in the same turn. After search
results arrive, use function tools to save findings.
Do not fabricate references — if evidence is needed, request a search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact (first draft)
- updateArtifact — create new version of existing artifact (revision)
- requestRevision — transition from pending_validation to revision on chat request
- submitStageForValidation — submit for user approval (only after explicit user confirmation)
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
Disallowed:
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Fabricating references or factual claims

## Output Contract
Required:
- ideKasar
Recommended:
- analisis
- angle
- novelty

## Guardrails
Never fabricate references and never skip user confirmation before submit.

## Done Criteria
Stage draft is agreed, artifact is created, and draft is ready for validation.

## Visual Language
Use the interactive choice card when showing options is clearer than prose.
Never replace the PaperValidationPanel for approval or stage transitions.
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
    >(createOrUpdateDraft as never, db, {
      requestorUserId,
      stageScope: "gagasan",
      name: "gagasan-skill",
      description: "Stage instruction for gagasan in Makalah AI paper workflow.",
      contentBody: VALID_GAGASAN_SKILL,
      changeNote: "Initial draft",
    });
    expect(draftV1.version).toBe(1);
    expect(draftV1.skillId).toBe("gagasan-skill");

    await callMutation(publishVersion as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 1,
    });
    await callMutation(activateVersion as never, db, {
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
    >(createOrUpdateDraft as never, db, {
      requestorUserId,
      stageScope: "gagasan",
      name: "gagasan-skill",
      description: "Stage instruction for gagasan in Makalah AI paper workflow.",
      contentBody: `${VALID_GAGASAN_SKILL}\n`,
      changeNote: "Improve wording",
    });
    expect(draftV2.version).toBe(2);

    await callMutation(publishVersion as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 2,
    });
    await callMutation(activateVersion as never, db, {
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
    >(rollbackVersion as never, db, {
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
      callMutation(createOrUpdateDraft as never, db, {
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

describe("DEFAULT_ALLOWED_TOOLS", () => {
  it("does not include google_search", () => {
    expect(DEFAULT_ALLOWED_TOOLS).not.toContain("google_search")
    expect(DEFAULT_ALLOWED_TOOLS).toContain("updateStageData")
    expect(DEFAULT_ALLOWED_TOOLS).toContain("createArtifact")
    expect(DEFAULT_ALLOWED_TOOLS).toContain("submitStageForValidation")
    expect(DEFAULT_ALLOWED_TOOLS).toContain("compileDaftarPustaka")
  })
})

// Helper: seed a skill with multiple versions in various statuses
async function seedSkillWithVersions(
  db: ReturnType<typeof createMockDb>["db"],
  requestorUserId: string,
  options?: { activate?: boolean }
) {
  // Create skill + v1 draft
  await callMutation(createOrUpdateDraft as never, db, {
    requestorUserId,
    stageScope: "gagasan",
    name: "gagasan-skill",
    description: "Stage instruction for gagasan in Makalah AI paper workflow.",
    contentBody: VALID_GAGASAN_SKILL,
    changeNote: "v1",
  });

  // v2 draft
  await callMutation(createOrUpdateDraft as never, db, {
    requestorUserId,
    stageScope: "gagasan",
    name: "gagasan-skill",
    description: "Stage instruction for gagasan in Makalah AI paper workflow.",
    contentBody: `${VALID_GAGASAN_SKILL}\n`,
    changeNote: "v2",
  });

  // Publish v1, activate v1 if requested
  await callMutation(publishVersion as never, db, {
    requestorUserId,
    skillId: "gagasan-skill",
    version: 1,
  });

  if (options?.activate) {
    await callMutation(activateVersion as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 1,
    });
  }
}

describe("deleteVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("deletes a draft version successfully", async () => {
    const { db, tables } = createMockDb();
    const requestorUserId = "user_admin_1";
    await seedSkillWithVersions(db, requestorUserId);

    // v2 is draft, delete it
    const result = await callMutation<
      { requestorUserId: string; skillId: string; version: number; reason: string },
      { deletedVersion: number; deletedStatus: string; remainingVersions: number }
    >(deleteVersion as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 2,
      reason: "Draft duplikat",
    });

    expect(result.deletedVersion).toBe(2);
    expect(result.deletedStatus).toBe("draft");
    expect(result.remainingVersions).toBe(1);

    const versions = (tables.get("stageSkillVersions") ?? []);
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
  });

  it("deletes a published version successfully", async () => {
    const { db } = createMockDb();
    const requestorUserId = "user_admin_1";
    await seedSkillWithVersions(db, requestorUserId);

    // v1 is published, delete it
    const result = await callMutation<
      { requestorUserId: string; skillId: string; version: number; reason: string },
      { deletedVersion: number; deletedStatus: string }
    >(deleteVersion as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 1,
      reason: "Versi obsolete",
    });

    expect(result.deletedVersion).toBe(1);
    expect(result.deletedStatus).toBe("published");
  });

  it("deletes an archived version successfully", async () => {
    const { db } = createMockDb();
    const requestorUserId = "user_admin_1";
    await seedSkillWithVersions(db, requestorUserId, { activate: true });

    // v1 is active, v2 is draft — publish+activate v2, v1 becomes published, archive v1
    await callMutation(publishVersion as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 2,
    });
    await callMutation(activateVersion as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 2,
    });
    // v1 is now published, archive it
    const { archiveVersion } = await import("./stageSkills");
    await callMutation(archiveVersion as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 1,
    });

    const result = await callMutation<
      { requestorUserId: string; skillId: string; version: number; reason: string },
      { deletedVersion: number; deletedStatus: string }
    >(deleteVersion as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 1,
      reason: "Archived cleanup",
    });

    expect(result.deletedVersion).toBe(1);
    expect(result.deletedStatus).toBe("archived");
  });

  it("rejects deleting an active version", async () => {
    const { db } = createMockDb();
    const requestorUserId = "user_admin_1";
    await seedSkillWithVersions(db, requestorUserId, { activate: true });

    await expect(
      callMutation(deleteVersion as never, db, {
        requestorUserId,
        skillId: "gagasan-skill",
        version: 1,
        reason: "Test",
      })
    ).rejects.toThrow("Versi active tidak boleh dihapus.");
  });

  it("rejects empty reason", async () => {
    const { db } = createMockDb();
    const requestorUserId = "user_admin_1";
    await seedSkillWithVersions(db, requestorUserId);

    await expect(
      callMutation(deleteVersion as never, db, {
        requestorUserId,
        skillId: "gagasan-skill",
        version: 2,
        reason: "   ",
      })
    ).rejects.toThrow("Alasan penghapusan wajib diisi.");
  });

  it("writes audit log with correct action and metadata", async () => {
    const { db, tables } = createMockDb();
    const requestorUserId = "user_admin_1";
    await seedSkillWithVersions(db, requestorUserId);

    await callMutation(deleteVersion as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 2,
      reason: "Cleanup draft",
    });

    const auditLogs = tables.get("stageSkillAuditLogs") ?? [];
    const deleteLog = auditLogs.find((l) => l.action === "delete_version");
    expect(deleteLog).toBeDefined();
    expect(deleteLog?.metadata).toMatchObject({
      deletedVersion: 2,
      deletedStatus: "draft",
      reason: "Cleanup draft",
      remainingVersions: 1,
    });
  });
});

describe("deleteAllVersionHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("deletes all non-active versions and preserves active", async () => {
    const { db, tables } = createMockDb();
    const requestorUserId = "user_admin_1";
    await seedSkillWithVersions(db, requestorUserId, { activate: true });

    // v1 active, v2 draft
    const result = await callMutation<
      { requestorUserId: string; skillId: string; reason: string },
      { deletedCount: number; preservedActiveVersion: number | null; deletedVersions: number[] }
    >(deleteAllVersionHistory as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      reason: "Cleanup all non-active",
    });

    expect(result.deletedCount).toBe(1);
    expect(result.deletedVersions).toEqual([2]);
    expect(result.preservedActiveVersion).toBe(1);

    const versions = tables.get("stageSkillVersions") ?? [];
    expect(versions).toHaveLength(1);
    expect(versions[0].status).toBe("active");
  });

  it("returns no-op when no non-active versions exist", async () => {
    const { db } = createMockDb();
    const requestorUserId = "user_admin_1";

    // Create + publish + activate v1 only
    await callMutation(createOrUpdateDraft as never, db, {
      requestorUserId,
      stageScope: "gagasan",
      name: "gagasan-skill",
      description: "Stage instruction for gagasan in Makalah AI paper workflow.",
      contentBody: VALID_GAGASAN_SKILL,
      changeNote: "v1",
    });
    await callMutation(publishVersion as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 1,
    });
    await callMutation(activateVersion as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      version: 1,
    });

    const result = await callMutation<
      { requestorUserId: string; skillId: string; reason: string },
      { deletedCount: number; message: string }
    >(deleteAllVersionHistory as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      reason: "Cleanup attempt",
    });

    expect(result.deletedCount).toBe(0);
    expect(result.message).toBe("Tidak ada version history non-active yang bisa dihapus.");
  });

  it("rejects empty reason", async () => {
    const { db } = createMockDb();
    const requestorUserId = "user_admin_1";
    await seedSkillWithVersions(db, requestorUserId);

    await expect(
      callMutation(deleteAllVersionHistory as never, db, {
        requestorUserId,
        skillId: "gagasan-skill",
        reason: "",
      })
    ).rejects.toThrow("Alasan penghapusan wajib diisi.");
  });

  it("writes audit log with delete_all_versions action", async () => {
    const { db, tables } = createMockDb();
    const requestorUserId = "user_admin_1";
    await seedSkillWithVersions(db, requestorUserId, { activate: true });

    await callMutation(deleteAllVersionHistory as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      reason: "Bulk cleanup",
    });

    const auditLogs = tables.get("stageSkillAuditLogs") ?? [];
    const deleteLog = auditLogs.find((l) => l.action === "delete_all_versions");
    expect(deleteLog).toBeDefined();
    expect(deleteLog?.metadata).toMatchObject({
      deletedCount: 1,
      preservedActiveVersion: 1,
      reason: "Bulk cleanup",
    });
  });
});

describe("deleteSkillEntirely", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("rejects when skill is still enabled", async () => {
    const { db } = createMockDb();
    const requestorUserId = "user_admin_1";
    await seedSkillWithVersions(db, requestorUserId);

    await expect(
      callMutation(deleteSkillEntirely as never, db, {
        requestorUserId,
        skillId: "gagasan-skill",
        reason: "Deprecated",
        confirmationText: "DELETE gagasan-skill",
      })
    ).rejects.toThrow("Skill harus dinonaktifkan sebelum dihapus.");
  });

  it("rejects when active version exists", async () => {
    const { db } = createMockDb();
    const requestorUserId = "user_admin_1";
    await seedSkillWithVersions(db, requestorUserId, { activate: true });

    // Disable skill
    await callMutation(setSkillEnabled as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      isEnabled: false,
    });

    await expect(
      callMutation(deleteSkillEntirely as never, db, {
        requestorUserId,
        skillId: "gagasan-skill",
        reason: "Deprecated",
        confirmationText: "DELETE gagasan-skill",
      })
    ).rejects.toThrow("Skill dengan active version tidak boleh dihapus.");
  });

  it("rejects wrong confirmation text", async () => {
    const { db } = createMockDb();
    const requestorUserId = "user_admin_1";
    await seedSkillWithVersions(db, requestorUserId);

    // Disable skill
    await callMutation(setSkillEnabled as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      isEnabled: false,
    });

    await expect(
      callMutation(deleteSkillEntirely as never, db, {
        requestorUserId,
        skillId: "gagasan-skill",
        reason: "Deprecated",
        confirmationText: "WRONG TEXT",
      })
    ).rejects.toThrow('Ketik "DELETE gagasan-skill" untuk konfirmasi penghapusan skill.');
  });

  it("successfully deletes skill + versions, preserves audit logs with skillRefId patched to undefined", async () => {
    const { db, tables } = createMockDb();
    const requestorUserId = "user_admin_1";
    await seedSkillWithVersions(db, requestorUserId);

    // Disable skill
    await callMutation(setSkillEnabled as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      isEnabled: false,
    });

    const result = await callMutation<
      { requestorUserId: string; skillId: string; reason: string; confirmationText: string },
      { deletedSkillId: string; deletedVersionCount: number; deletedVersionNumbers: number[] }
    >(deleteSkillEntirely as never, db, {
      requestorUserId,
      skillId: "gagasan-skill",
      reason: "Skill deprecated",
      confirmationText: "DELETE gagasan-skill",
    });

    expect(result.deletedSkillId).toBe("gagasan-skill");
    expect(result.deletedVersionCount).toBe(2);
    expect(result.deletedVersionNumbers).toEqual(expect.arrayContaining([1, 2]));

    // Skill row deleted
    const skills = tables.get("stageSkills") ?? [];
    expect(skills).toHaveLength(0);

    // Version rows deleted
    const versions = tables.get("stageSkillVersions") ?? [];
    expect(versions).toHaveLength(0);

    // Audit logs preserved
    const auditLogs = tables.get("stageSkillAuditLogs") ?? [];
    expect(auditLogs.length).toBeGreaterThan(0);

    // All pre-existing audit logs have skillRefId patched to undefined
    const logsWithSkillRef = auditLogs.filter(
      (l) => l.action !== "delete_skill" && l.skillRefId !== undefined
    );
    expect(logsWithSkillRef).toHaveLength(0);

    // Terminal delete_skill log exists with skillRefId: undefined
    const terminalLog = auditLogs.find((l) => l.action === "delete_skill");
    expect(terminalLog).toBeDefined();
    expect(terminalLog?.skillRefId).toBeUndefined();
    expect(terminalLog?.skillId).toBe("gagasan-skill");
    expect(terminalLog?.metadata).toMatchObject({
      deletedSkillId: "gagasan-skill",
      stageScope: "gagasan",
      deletedVersionCount: 2,
      reason: "Skill deprecated",
    });
  });

  it("rejects empty reason", async () => {
    const { db } = createMockDb();
    const requestorUserId = "user_admin_1";
    await seedSkillWithVersions(db, requestorUserId);

    await expect(
      callMutation(deleteSkillEntirely as never, db, {
        requestorUserId,
        skillId: "gagasan-skill",
        reason: "  ",
        confirmationText: "DELETE gagasan-skill",
      })
    ).rejects.toThrow("Alasan penghapusan wajib diisi.");
  });
});
