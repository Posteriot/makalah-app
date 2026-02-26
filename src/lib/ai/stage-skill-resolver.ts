import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import type { PaperStageId } from "../../../convex/paperSessions/constants";
import { validateStageSkillContent } from "./stage-skill-validator";

type ResolveResult = {
    instructions: string;
    source: "skill" | "fallback";
    skillResolverFallback: boolean;
    skillId?: string;
    version?: number;
    fallbackReason?: string;
};

type ResolveArgs = {
    stage: PaperStageId | "completed";
    fallbackInstructions: string;
    convexToken?: string;
    requestId?: string;
};

async function logRuntimeConflict(args: {
    stage: PaperStageId;
    skillId?: string;
    version?: number;
    rule: string;
    message: string;
    convexToken?: string;
    requestId?: string;
}) {
    if (!args.convexToken) return;

    try {
        await fetchMutation(
            api.stageSkills.logRuntimeConflict,
            {
                stageScope: args.stage,
                skillId: args.skillId,
                version: args.version,
                rule: args.rule,
                message: args.message,
                source: "stage-skill-resolver",
                requestId: args.requestId,
            },
            { token: args.convexToken }
        );
    } catch (error) {
        console.error("[stage-skill-resolver] Failed to log runtime conflict:", error);
    }
}

export async function resolveStageInstructions(args: ResolveArgs): Promise<ResolveResult> {
    if (args.stage === "completed") {
        return {
            instructions: args.fallbackInstructions,
            source: "fallback",
            skillResolverFallback: true,
            fallbackReason: "completed_stage",
        };
    }

    const options = args.convexToken ? { token: args.convexToken } : undefined;

    try {
        const activeSkill = await fetchQuery(
            api.stageSkills.getActiveByStage,
            { stageScope: args.stage },
            options
        );

        if (!activeSkill || !activeSkill.content?.trim()) {
            return {
                instructions: args.fallbackInstructions,
                source: "fallback",
                skillResolverFallback: true,
                fallbackReason: "no_active_skill",
            };
        }

        const validation = validateStageSkillContent({
            stageScope: args.stage,
            skillId: activeSkill.skillId,
            name: activeSkill.name,
            description: activeSkill.description,
            content: activeSkill.content,
        });

        if (!validation.ok) {
            const firstIssue = validation.issues[0]?.message ?? "validation failed";
            await logRuntimeConflict({
                stage: args.stage,
                skillId: activeSkill.skillId,
                version: activeSkill.version,
                rule: "skill_validation_failed_runtime",
                message: firstIssue,
                convexToken: args.convexToken,
                requestId: args.requestId,
            });

            return {
                instructions: args.fallbackInstructions,
                source: "fallback",
                skillResolverFallback: true,
                skillId: activeSkill.skillId,
                version: activeSkill.version,
                fallbackReason: "runtime_validation_failed",
            };
        }

        return {
            instructions: activeSkill.content,
            source: "skill",
            skillResolverFallback: false,
            skillId: activeSkill.skillId,
            version: activeSkill.version,
        };
    } catch (error) {
        console.error("[stage-skill-resolver] Error resolving active skill:", error);
        return {
            instructions: args.fallbackInstructions,
            source: "fallback",
            skillResolverFallback: true,
            fallbackReason: "resolver_error",
        };
    }
}
