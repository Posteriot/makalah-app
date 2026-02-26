import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireRole } from "./permissions";
import { STAGE_SCOPE_VALUES, getExpectedSearchPolicy, toSkillId } from "./stageSkills/constants";
import { validateStageSkillContent } from "../src/lib/ai/stage-skill-validator";

const stageScopeValidator = v.union(
    v.literal("gagasan"),
    v.literal("topik"),
    v.literal("outline"),
    v.literal("abstrak"),
    v.literal("pendahuluan"),
    v.literal("tinjauan_literatur"),
    v.literal("metodologi"),
    v.literal("hasil"),
    v.literal("diskusi"),
    v.literal("kesimpulan"),
    v.literal("daftar_pustaka"),
    v.literal("lampiran"),
    v.literal("judul")
);

const DEFAULT_ALLOWED_TOOLS = [
    "google_search",
    "updateStageData",
    "createArtifact",
    "compileDaftarPustaka",
    "submitStageForValidation",
];

function normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

async function appendAuditLog(
    db: any,
    input: {
        skillRefId?: Id<"stageSkills">;
        skillId: string;
        version?: number;
        action: string;
        actorId?: Id<"users">;
        metadata?: unknown;
    }
) {
    await db.insert("stageSkillAuditLogs", {
        skillRefId: input.skillRefId,
        skillId: input.skillId,
        version: input.version,
        action: input.action,
        actorId: input.actorId,
        metadata: input.metadata,
        createdAt: Date.now(),
    });
}

async function getSkillBySkillId(
    db: any,
    skillId: string
) {
    return db
        .query("stageSkills")
        .withIndex("by_skillId", (q: any) => q.eq("skillId", skillId))
        .first();
}

async function getSkillByStageScope(
    db: any,
    stageScope: (typeof STAGE_SCOPE_VALUES)[number]
) {
    return db
        .query("stageSkills")
        .withIndex("by_stageScope", (q: any) => q.eq("stageScope", stageScope))
        .first();
}

async function getLatestVersionNumber(
    db: any,
    skillRefId: Id<"stageSkills">
) {
    const versions = await db
        .query("stageSkillVersions")
        .withIndex("by_skillRefId", (q: any) => q.eq("skillRefId", skillRefId))
        .order("desc")
        .take(1);

    return versions[0]?.version ?? 0;
}

async function getVersionByNumber(
    db: any,
    skillRefId: Id<"stageSkills">,
    version: number
) {
    return db
        .query("stageSkillVersions")
        .withIndex("by_skillRefId", (q: any) =>
            q.eq("skillRefId", skillRefId).eq("version", version)
        )
        .first();
}

export const getActiveByStage = query({
    args: {
        stageScope: stageScopeValidator,
    },
    handler: async ({ db }, { stageScope }) => {
        const skill = await getSkillByStageScope(db, stageScope);
        if (!skill || !skill.isEnabled) return null;

        const active = await db
            .query("stageSkillVersions")
            .withIndex("by_skillRefId_status", (q: any) =>
                q.eq("skillRefId", skill._id).eq("status", "active")
            )
            .order("desc")
            .first();

        if (!active) return null;

        return {
            skillId: skill.skillId,
            stageScope: skill.stageScope,
            name: skill.name,
            description: skill.description,
            allowedTools: skill.allowedTools,
            version: active.version,
            content: active.content,
            expectedSearchPolicy: getExpectedSearchPolicy(stageScope),
            updatedAt: active.updatedAt,
        };
    },
});

export const listByStage = query({
    args: {
        requestorUserId: v.id("users"),
    },
    handler: async ({ db }, { requestorUserId }) => {
        await requireRole(db, requestorUserId, "admin");

        const allSkills = await db
            .query("stageSkills")
            .withIndex("by_updatedAt")
            .order("desc")
            .collect();

        const rank = new Map(STAGE_SCOPE_VALUES.map((stage, index) => [stage, index]));
        const skills = [...allSkills].sort((a, b) => {
            return (rank.get(a.stageScope) ?? 999) - (rank.get(b.stageScope) ?? 999);
        });

        return Promise.all(
            skills.map(async (skill) => {
                const versions = await db
                    .query("stageSkillVersions")
                    .withIndex("by_skillRefId", (q: any) => q.eq("skillRefId", skill._id))
                    .order("desc")
                    .collect();

                const latestDraft = versions.find((item) => item.status === "draft");
                const latestPublished = versions.find((item) => item.status === "published");
                const active = versions.find((item) => item.status === "active");

                return {
                    ...skill,
                    latestVersion: versions[0]?.version ?? 0,
                    latestDraftVersion: latestDraft?.version ?? null,
                    latestDraftContent: latestDraft?.content ?? "",
                    latestPublishedVersion: latestPublished?.version ?? null,
                    latestPublishedContent: latestPublished?.content ?? "",
                    activeVersion: active?.version ?? null,
                    activeContent: active?.content ?? "",
                    versionsCount: versions.length,
                    expectedSearchPolicy: getExpectedSearchPolicy(skill.stageScope),
                };
            })
        );
    },
});

export const getVersionHistory = query({
    args: {
        requestorUserId: v.id("users"),
        skillId: v.string(),
    },
    handler: async ({ db }, { requestorUserId, skillId }) => {
        await requireRole(db, requestorUserId, "admin");

        const skill = await getSkillBySkillId(db, skillId);
        if (!skill) throw new Error("Skill tidak ditemukan.");

        const versions = await db
            .query("stageSkillVersions")
            .withIndex("by_skillRefId", (q: any) => q.eq("skillRefId", skill._id))
            .order("desc")
            .collect();

        return {
            skill,
            versions,
        };
    },
});

export const createStageSkill = mutation({
    args: {
        requestorUserId: v.id("users"),
        stageScope: stageScopeValidator,
        skillId: v.optional(v.string()),
        name: v.string(),
        description: v.string(),
        allowedTools: v.optional(v.array(v.string())),
    },
    handler: async ({ db }, args) => {
        await requireRole(db, args.requestorUserId, "admin");

        const normalizedSkillId = normalizeText(args.skillId ?? toSkillId(args.stageScope));
        const existingBySkillId = await getSkillBySkillId(db, normalizedSkillId);
        if (existingBySkillId) {
            throw new Error(`Skill "${normalizedSkillId}" sudah ada.`);
        }

        const existingByStage = await getSkillByStageScope(db, args.stageScope);
        if (existingByStage) {
            throw new Error(`Stage "${args.stageScope}" sudah punya skill catalog.`);
        }

        const now = Date.now();
        const skillRefId = await db.insert("stageSkills", {
            skillId: normalizedSkillId,
            stageScope: args.stageScope,
            name: args.name.trim(),
            description: args.description.trim(),
            allowedTools: args.allowedTools ?? DEFAULT_ALLOWED_TOOLS,
            isEnabled: true,
            createdBy: args.requestorUserId,
            createdAt: now,
            updatedAt: now,
        });

        await appendAuditLog(db, {
            skillRefId,
            skillId: normalizedSkillId,
            action: "create",
            actorId: args.requestorUserId,
            metadata: {
                stageScope: args.stageScope,
            },
        });

        return {
            skillRefId,
            skillId: normalizedSkillId,
            message: "Stage skill berhasil dibuat.",
        };
    },
});

export const createDraftVersion = mutation({
    args: {
        requestorUserId: v.id("users"),
        skillId: v.string(),
        content: v.string(),
        changeNote: v.optional(v.string()),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        allowedTools: v.optional(v.array(v.string())),
    },
    handler: async ({ db }, args) => {
        await requireRole(db, args.requestorUserId, "admin");

        const skill = await getSkillBySkillId(db, args.skillId);
        if (!skill) throw new Error("Skill tidak ditemukan.");

        const now = Date.now();
        const nextVersion = (await getLatestVersionNumber(db, skill._id)) + 1;
        await db.insert("stageSkillVersions", {
            skillRefId: skill._id,
            skillId: skill.skillId,
            version: nextVersion,
            content: args.content.trim(),
            status: "draft",
            changeNote: args.changeNote?.trim(),
            createdBy: args.requestorUserId,
            createdAt: now,
            updatedAt: now,
        });

        const patchPayload: Partial<typeof skill> = {
            updatedAt: now,
        };
        if (args.name?.trim()) patchPayload.name = args.name.trim();
        if (args.description?.trim()) patchPayload.description = args.description.trim();
        if (args.allowedTools) patchPayload.allowedTools = args.allowedTools;
        await db.patch(skill._id, patchPayload);

        await appendAuditLog(db, {
            skillRefId: skill._id,
            skillId: skill.skillId,
            version: nextVersion,
            action: "draft_saved",
            actorId: args.requestorUserId,
            metadata: {
                changeNote: args.changeNote,
            },
        });

        return {
            skillId: skill.skillId,
            version: nextVersion,
            message: `Draft v${nextVersion} tersimpan.`,
        };
    },
});

export const createOrUpdateDraft = mutation({
    args: {
        requestorUserId: v.id("users"),
        stageScope: stageScopeValidator,
        name: v.string(),
        description: v.string(),
        contentBody: v.string(),
        changeNote: v.optional(v.string()),
        allowedTools: v.optional(v.array(v.string())),
    },
    handler: async ({ db }, args) => {
        await requireRole(db, args.requestorUserId, "admin");

        const now = Date.now();
        let skill = await getSkillByStageScope(db, args.stageScope);
        if (!skill) {
            const skillRefId = await db.insert("stageSkills", {
                skillId: toSkillId(args.stageScope),
                stageScope: args.stageScope,
                name: args.name.trim(),
                description: args.description.trim(),
                allowedTools: args.allowedTools ?? DEFAULT_ALLOWED_TOOLS,
                isEnabled: true,
                createdBy: args.requestorUserId,
                createdAt: now,
                updatedAt: now,
            });

            skill = await db.get(skillRefId);
            if (!skill) throw new Error("Gagal membuat skill catalog.");

            await appendAuditLog(db, {
                skillRefId,
                skillId: skill.skillId,
                action: "create",
                actorId: args.requestorUserId,
                metadata: {
                    stageScope: args.stageScope,
                    source: "createOrUpdateDraft",
                },
            });
        } else {
            await db.patch(skill._id, {
                name: args.name.trim(),
                description: args.description.trim(),
                allowedTools: args.allowedTools ?? skill.allowedTools,
                updatedAt: now,
            });
        }

        const nextVersion = (await getLatestVersionNumber(db, skill._id)) + 1;
        await db.insert("stageSkillVersions", {
            skillRefId: skill._id,
            skillId: skill.skillId,
            version: nextVersion,
            content: args.contentBody.trim(),
            status: "draft",
            changeNote: args.changeNote?.trim(),
            createdBy: args.requestorUserId,
            createdAt: now,
            updatedAt: now,
        });

        await appendAuditLog(db, {
            skillRefId: skill._id,
            skillId: skill.skillId,
            version: nextVersion,
            action: "draft_saved",
            actorId: args.requestorUserId,
            metadata: {
                source: "createOrUpdateDraft",
                stageScope: args.stageScope,
            },
        });

        return {
            skillId: skill.skillId,
            stageScope: skill.stageScope,
            version: nextVersion,
            message: `Draft ${skill.skillId} v${nextVersion} tersimpan.`,
        };
    },
});

export const publishVersion = mutation({
    args: {
        requestorUserId: v.id("users"),
        skillId: v.string(),
        version: v.number(),
    },
    handler: async ({ db }, args) => {
        await requireRole(db, args.requestorUserId, "admin");

        const skill = await getSkillBySkillId(db, args.skillId);
        if (!skill) throw new Error("Skill tidak ditemukan.");

        const targetVersion = await getVersionByNumber(db, skill._id, args.version);
        if (!targetVersion) throw new Error(`Versi ${args.version} tidak ditemukan.`);

        const validation = validateStageSkillContent({
            stageScope: skill.stageScope,
            skillId: skill.skillId,
            name: skill.name,
            description: skill.description,
            content: targetVersion.content,
        });
        if (!validation.ok) {
            throw new Error(`Publish ditolak: ${validation.issues.map((item) => item.message).join(" | ")}`);
        }

        const now = Date.now();
        await db.patch(targetVersion._id, {
            status: "published",
            publishedAt: now,
            updatedAt: now,
        });
        await db.patch(skill._id, { updatedAt: now });

        await appendAuditLog(db, {
            skillRefId: skill._id,
            skillId: skill.skillId,
            version: targetVersion.version,
            action: "publish",
            actorId: args.requestorUserId,
            metadata: {
                validation: validation.metadata,
            },
        });

        return {
            skillId: skill.skillId,
            version: targetVersion.version,
            message: `Version v${targetVersion.version} berhasil dipublish.`,
        };
    },
});

export const activateVersion = mutation({
    args: {
        requestorUserId: v.id("users"),
        skillId: v.string(),
        version: v.number(),
    },
    handler: async ({ db }, args) => {
        await requireRole(db, args.requestorUserId, "admin");

        const skill = await getSkillBySkillId(db, args.skillId);
        if (!skill) throw new Error("Skill tidak ditemukan.");

        const targetVersion = await getVersionByNumber(db, skill._id, args.version);
        if (!targetVersion) throw new Error(`Versi ${args.version} tidak ditemukan.`);
        if (targetVersion.status === "archived") {
            throw new Error("Versi archived tidak bisa diaktifkan.");
        }

        const validation = validateStageSkillContent({
            stageScope: skill.stageScope,
            skillId: skill.skillId,
            name: skill.name,
            description: skill.description,
            content: targetVersion.content,
        });
        if (!validation.ok) {
            throw new Error(`Activate ditolak: ${validation.issues.map((item) => item.message).join(" | ")}`);
        }

        const now = Date.now();
        const currentActive = await db
            .query("stageSkillVersions")
            .withIndex("by_skillRefId_status", (q: any) =>
                q.eq("skillRefId", skill._id).eq("status", "active")
            )
            .collect();

        for (const versionItem of currentActive) {
            await db.patch(versionItem._id, {
                status: "published",
                updatedAt: now,
            });
        }

        await db.patch(targetVersion._id, {
            status: "active",
            activatedAt: now,
            updatedAt: now,
        });
        await db.patch(skill._id, {
            isEnabled: true,
            updatedAt: now,
        });

        await appendAuditLog(db, {
            skillRefId: skill._id,
            skillId: skill.skillId,
            version: targetVersion.version,
            action: "activate",
            actorId: args.requestorUserId,
            metadata: {
                previousActiveVersions: currentActive.map((item) => item.version),
                validation: validation.metadata,
            },
        });

        return {
            skillId: skill.skillId,
            version: targetVersion.version,
            message: `Version v${targetVersion.version} aktif.`,
        };
    },
});

export const rollbackVersion = mutation({
    args: {
        requestorUserId: v.id("users"),
        skillId: v.string(),
        targetVersion: v.number(),
        reason: v.optional(v.string()),
    },
    handler: async ({ db }, args) => {
        await requireRole(db, args.requestorUserId, "admin");

        const skill = await getSkillBySkillId(db, args.skillId);
        if (!skill) throw new Error("Skill tidak ditemukan.");

        const targetVersion = await getVersionByNumber(db, skill._id, args.targetVersion);
        if (!targetVersion) throw new Error(`Versi ${args.targetVersion} tidak ditemukan.`);
        if (targetVersion.status === "archived") {
            throw new Error("Versi archived tidak bisa dijadikan rollback target.");
        }

        const validation = validateStageSkillContent({
            stageScope: skill.stageScope,
            skillId: skill.skillId,
            name: skill.name,
            description: skill.description,
            content: targetVersion.content,
        });
        if (!validation.ok) {
            throw new Error(`Rollback ditolak: ${validation.issues.map((item) => item.message).join(" | ")}`);
        }

        const now = Date.now();
        const currentActive = await db
            .query("stageSkillVersions")
            .withIndex("by_skillRefId_status", (q: any) =>
                q.eq("skillRefId", skill._id).eq("status", "active")
            )
            .collect();

        for (const item of currentActive) {
            await db.patch(item._id, {
                status: "published",
                updatedAt: now,
            });
        }

        await db.patch(targetVersion._id, {
            status: "active",
            activatedAt: now,
            updatedAt: now,
        });

        await db.patch(skill._id, { updatedAt: now });

        await appendAuditLog(db, {
            skillRefId: skill._id,
            skillId: skill.skillId,
            version: targetVersion.version,
            action: "rollback",
            actorId: args.requestorUserId,
            metadata: {
                reason: args.reason,
                previousActiveVersions: currentActive.map((item) => item.version),
            },
        });

        return {
            skillId: skill.skillId,
            version: targetVersion.version,
            message: `Rollback ke v${targetVersion.version} berhasil.`,
        };
    },
});

export const logRuntimeConflict = mutation({
    args: {
        stageScope: stageScopeValidator,
        skillId: v.optional(v.string()),
        version: v.optional(v.number()),
        rule: v.string(),
        message: v.string(),
        severity: v.optional(v.union(v.literal("info"), v.literal("warning"), v.literal("critical"))),
        source: v.optional(v.string()),
        requestId: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async ({ db }, args) => {
        const now = Date.now();
        const skillId = args.skillId ?? toSkillId(args.stageScope);

        const maybeSkill = await getSkillBySkillId(db, skillId);
        await appendAuditLog(db, {
            skillRefId: maybeSkill?._id,
            skillId,
            version: args.version,
            action: "runtime_conflict",
            metadata: {
                rule: args.rule,
                message: args.message,
                stageScope: args.stageScope,
                requestId: args.requestId,
                ...(args.metadata ?? {}),
            },
        });

        const severity = args.severity ?? "warning";
        await db.insert("systemAlerts", {
            alertType: "skill_runtime_conflict",
            severity,
            message: `[${args.stageScope}] ${args.rule}: ${args.message}`,
            source: args.source ?? "stage-skill-resolver",
            resolved: false,
            metadata: {
                type: "skill_runtime_conflict",
                stage: args.stageScope,
                skillId,
                version: args.version,
                rule: args.rule,
                requestId: args.requestId,
                ...(args.metadata ?? {}),
            },
            createdAt: now,
        });

        return {
            success: true,
            skillId,
        };
    },
});

export const archiveVersion = mutation({
    args: {
        requestorUserId: v.id("users"),
        skillId: v.string(),
        version: v.number(),
    },
    handler: async ({ db }, args) => {
        await requireRole(db, args.requestorUserId, "admin");

        const skill = await getSkillBySkillId(db, args.skillId);
        if (!skill) throw new Error("Skill tidak ditemukan.");

        const targetVersion = await getVersionByNumber(db, skill._id, args.version);
        if (!targetVersion) throw new Error(`Versi ${args.version} tidak ditemukan.`);
        if (targetVersion.status === "active") {
            throw new Error("Versi active tidak boleh diarsipkan langsung.");
        }

        await db.patch(targetVersion._id, {
            status: "archived",
            updatedAt: Date.now(),
        });

        await appendAuditLog(db, {
            skillRefId: skill._id,
            skillId: skill.skillId,
            version: targetVersion.version,
            action: "archive",
            actorId: args.requestorUserId,
        });

        return {
            skillId: skill.skillId,
            version: targetVersion.version,
            message: `Version v${targetVersion.version} diarsipkan.`,
        };
    },
});

export const setSkillEnabled = mutation({
    args: {
        requestorUserId: v.id("users"),
        skillId: v.string(),
        isEnabled: v.boolean(),
    },
    handler: async ({ db }, args) => {
        await requireRole(db, args.requestorUserId, "admin");

        const skill = await getSkillBySkillId(db, args.skillId);
        if (!skill) throw new Error("Skill tidak ditemukan.");

        await db.patch(skill._id, {
            isEnabled: args.isEnabled,
            updatedAt: Date.now(),
        });

        await appendAuditLog(db, {
            skillRefId: skill._id,
            skillId: skill.skillId,
            action: args.isEnabled ? "enable" : "disable",
            actorId: args.requestorUserId,
        });

        return {
            skillId: skill.skillId,
            isEnabled: args.isEnabled,
        };
    },
});

export const listRuntimeConflicts = query({
    args: {
        requestorUserId: v.id("users"),
        limit: v.optional(v.number()),
    },
    handler: async ({ db }, args) => {
        await requireRole(db, args.requestorUserId, "admin");

        return db
            .query("stageSkillAuditLogs")
            .withIndex("by_action_createdAt", (q: any) => q.eq("action", "runtime_conflict"))
            .order("desc")
            .take(args.limit ?? 30);
    },
});

export const getSkillById = query({
    args: {
        requestorUserId: v.id("users"),
        skillId: v.string(),
    },
    handler: async ({ db }, args) => {
        await requireRole(db, args.requestorUserId, "admin");
        const skill = await getSkillBySkillId(db, args.skillId);
        if (!skill) return null;

        const active = await db
            .query("stageSkillVersions")
            .withIndex("by_skillRefId_status", (q: any) =>
                q.eq("skillRefId", skill._id).eq("status", "active")
            )
            .order("desc")
            .first();

        return {
            ...skill,
            activeVersion: active?.version ?? null,
        };
    },
});

export const validateDraftVersion = query({
    args: {
        requestorUserId: v.id("users"),
        skillId: v.string(),
        version: v.number(),
    },
    handler: async ({ db }, args) => {
        await requireRole(db, args.requestorUserId, "admin");

        const skill = await getSkillBySkillId(db, args.skillId);
        if (!skill) throw new Error("Skill tidak ditemukan.");
        const version = await getVersionByNumber(db, skill._id, args.version);
        if (!version) throw new Error(`Versi ${args.version} tidak ditemukan.`);

        return validateStageSkillContent({
            stageScope: skill.stageScope,
            skillId: skill.skillId,
            name: skill.name,
            description: skill.description,
            content: version.content,
        });
    },
});

export const runPreActivationDryRun = query({
    args: {
        requestorUserId: v.id("users"),
    },
    handler: async ({ db }, args) => {
        await requireRole(db, args.requestorUserId, "admin");

        const skillByStage = new Map<string, Awaited<ReturnType<typeof getSkillByStageScope>>>();
        for (const stage of STAGE_SCOPE_VALUES) {
            const skill = await getSkillByStageScope(db, stage);
            if (skill) skillByStage.set(stage, skill);
        }

        const results: Array<{
            stageScope: string;
            skillId?: string;
            version?: number;
            ok: boolean;
            issues: string[];
            source: "missing_skill" | "missing_version" | "latest_draft" | "latest_published" | "active";
        }> = [];

        for (const stage of STAGE_SCOPE_VALUES) {
            const skill = skillByStage.get(stage);
            if (!skill) {
                results.push({
                    stageScope: stage,
                    ok: false,
                    issues: ["Skill belum dibuat untuk stage ini."],
                    source: "missing_skill",
                });
                continue;
            }

            const versions = await db
                .query("stageSkillVersions")
                .withIndex("by_skillRefId", (q: any) => q.eq("skillRefId", skill._id))
                .order("desc")
                .collect();

            const latestDraft = versions.find((item) => item.status === "draft");
            const latestPublished = versions.find((item) => item.status === "published");
            const active = versions.find((item) => item.status === "active");
            const candidate = latestDraft ?? latestPublished ?? active;

            if (!candidate) {
                results.push({
                    stageScope: stage,
                    skillId: skill.skillId,
                    ok: false,
                    issues: ["Belum ada versi untuk skill ini."],
                    source: "missing_version",
                });
                continue;
            }

            const validation = validateStageSkillContent({
                stageScope: stage,
                skillId: skill.skillId,
                name: skill.name,
                description: skill.description,
                content: candidate.content,
            });

            results.push({
                stageScope: stage,
                skillId: skill.skillId,
                version: candidate.version,
                ok: validation.ok,
                issues: validation.issues.map((item) => item.message),
                source:
                    candidate.status === "draft"
                        ? "latest_draft"
                        : candidate.status === "published"
                            ? "latest_published"
                            : "active",
            });
        }

        const failed = results.filter((item) => !item.ok);
        return {
            success: failed.length === 0,
            totalStages: STAGE_SCOPE_VALUES.length,
            passedStages: results.length - failed.length,
            failedStages: failed.length,
            results,
        };
    },
});
