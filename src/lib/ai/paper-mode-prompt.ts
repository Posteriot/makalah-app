import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { STAGE_ORDER, getStageLabel, type PaperStageId } from "../../../convex/paperSessions/constants";
import { getStageInstructions, formatStageData, formatArtifactSummaries } from "./paper-stages";
import { resolveStageInstructions } from "./stage-skill-resolver";

type StageStatus = "drafting" | "pending_validation" | "approved" | "revision";

// Type for invalidated artifact from query
interface InvalidatedArtifact {
    _id: Id<"artifacts">;
    title: string;
    type: string;
    invalidatedAt?: number;
    invalidatedByRewindToStage?: string;
}

interface PaperMemoryEntry {
    stage: string;
    decision: string;
    timestamp: number;
    superseded?: boolean;
}

/**
 * Format paperMemoryDigest into a concise context block.
 * Always injected — serves as "memory anchor" for AI across stages.
 */
function formatMemoryDigest(digest: PaperMemoryEntry[]): string {
    if (!digest || digest.length === 0) return "";

    const entries = digest
        .filter(d => !d.superseded)
        .map(d => `- ${getStageLabel(d.stage as PaperStageId)}: ${d.decision}`)
        .join("\n");

    if (!entries) return "";

    return `\nMEMORY DIGEST (saved decisions per stage — DO NOT contradict):\n${entries}\n`;
}

/**
 * Format invalidated artifacts into AI context section
 * Returns empty string if no invalidated artifacts
 */
function getInvalidatedArtifactsContext(artifacts: InvalidatedArtifact[]): string {
    if (!artifacts || artifacts.length === 0) {
        return "";
    }

    const artifactsList = artifacts
        .map((a) => `  - ID: ${a._id} | Title: "${a.title}" | Type: ${a.type}`)
        .join("\n");

    return `
⚠️ ARTIFACTS REQUIRING UPDATE (due to rewind):
${artifactsList}

IMPORTANT INSTRUCTIONS:
- MUST use updateArtifact (NOT createArtifact) to revise the artifacts above
- These artifacts already exist but need updating because the user rewound to a previous stage
- Ensure new content is consistent with decisions made at the rewound stage
`;
}

/**
 * Generate paper mode system prompt if conversation has active paper session.
 * Simplified approach: goal-oriented instructions + inline revision context.
 */
export type PaperModePromptContext = {
    prompt: string;
    skillResolverFallback: boolean;
    stageInstructionSource: "skill" | "fallback" | "none";
    activeSkillId?: string;
    activeSkillVersion?: number;
    fallbackReason?: string;
};

export const getPaperModeSystemPrompt = async (
    conversationId: Id<"conversations">,
    convexToken?: string,
    requestId?: string
): Promise<PaperModePromptContext> => {
    const paperPromptStart = Date.now();
    const logPaperPromptLatency = (phase: string, start: number, extra?: Record<string, unknown>) => {
        const extraText = extra
            ? " " + Object.entries(extra).map(([key, value]) => `${key}=${String(value)}`).join(" ")
            : "";
        console.log(
            `[⏱ PAPER_PROMPT] requestId=${requestId ?? "none"} conversationId=${conversationId} phase=${phase} total=${Date.now() - start}ms${extraText}`
        );
    };
    try {
        const convexOptions = convexToken ? { token: convexToken } : undefined;
        const sessionStart = Date.now();
        const session = await fetchQuery(
            api.paperSessions.getByConversation,
            { conversationId },
            convexOptions
        );
        logPaperPromptLatency("paperPrompt.getSession", sessionStart, { found: !!session });
        if (!session) {
            logPaperPromptLatency("paperPrompt.total", paperPromptStart, {
                hasPrompt: false,
                reason: "no_session",
            });
            return {
                prompt: "",
                skillResolverFallback: false,
                stageInstructionSource: "none",
            };
        }

        const stage = session.currentStage as PaperStageId | "completed";
        const status = session.stageStatus as StageStatus;
        const isDirty = session.isDirty === true;
        const stageLabel = getStageLabel(stage);

        // Build memory digest
        const memoryDigest = formatMemoryDigest(
            (session as unknown as { paperMemoryDigest?: PaperMemoryEntry[] }).paperMemoryDigest || []
        );

        // Resolve stage-specific instructions: active skill first, then hardcoded fallback.
        const fallbackStageInstructions = getStageInstructions(stage);
        const stageInstructionsStart = Date.now();
        const stageInstructionsResolution = await resolveStageInstructions({
            stage,
            fallbackInstructions: fallbackStageInstructions,
            convexToken,
            requestId,
        });
        logPaperPromptLatency("paperPrompt.resolveStageInstructions", stageInstructionsStart, {
            source: stageInstructionsResolution.source,
        });
        const stageInstructions = stageInstructionsResolution.instructions;

        // Format stageData into readable context
        const formattedData = formatStageData(session.stageData, stage);

        // Build artifact summaries from completed stages
        let artifactSummariesSection = "";
        try {
            const listArtifactsStart = Date.now();
            const allArtifacts = await fetchQuery(
                api.artifacts.listByConversation,
                { conversationId, userId: session.userId },
                convexOptions
            );
            logPaperPromptLatency("paperPrompt.listArtifacts", listArtifactsStart, {
                count: Array.isArray(allArtifacts) ? allArtifacts.length : 0,
            });

            // Map artifactId -> artifact metadata for quick lookup
            const artifactMap = new Map<string, { content: string; version: number; title: string; artifactId: string }>();
            for (const a of allArtifacts) {
                // Only include non-invalidated, latest-version artifacts
                if (!a.invalidatedAt) {
                    artifactMap.set(String(a._id), { content: a.content, version: a.version, title: a.title, artifactId: String(a._id) });
                }
            }

            // Collect artifacts from completed (validated) stages
            const stageData = session.stageData as Record<string, { artifactId?: string; validatedAt?: number; superseded?: boolean }>;
            const completedArtifacts: Array<{ stageLabel: string; content: string; version: number; title: string; artifactId: string }> = [];

            for (const stageId of STAGE_ORDER) {
                // Skip current stage (not yet completed)
                if (stage !== "completed" && stageId === stage) continue;

                const sd = stageData[stageId];
                if (!sd?.validatedAt || sd.superseded) continue;
                if (!sd.artifactId) continue;

                const artifact = artifactMap.get(sd.artifactId);
                if (artifact) {
                    completedArtifacts.push({
                        stageLabel: getStageLabel(stageId as PaperStageId),
                        content: artifact.content,
                        version: artifact.version,
                        title: artifact.title,
                        artifactId: artifact.artifactId,
                    });
                }
            }

            artifactSummariesSection = formatArtifactSummaries(completedArtifacts);
        } catch (err) {
            console.error("Error building artifact summaries:", err);
            // Continue without artifact summaries - non-critical
        }

        // Inline revision context (simple, not over-prescriptive)
        const revisionNote = status === "revision"
            ? "\n⚠️ REVISION MODE: User requested changes. Pay attention to their feedback in the latest message.\n"
            : "";

        // Inline pending validation note
        const pendingNote = status === "pending_validation"
            ? "\n⏳ AWAITING VALIDATION: Draft has been submitted. Wait for user to approve/revise before proceeding.\n"
            : "";
        const dirtyContextNote = `\n🔄 DIRTY CONTEXT: ${isDirty ? "true" : "false"}\n`;
        const dirtySyncContractNote = status === "pending_validation" && isDirty
            ? "\n⚠️ SYNC CONTRACT: Stage data is not yet synced. If user asks to sync or continue from state, you MUST explain that the update cannot be finalized until the user requests a revision first.\n"
            : "";

        // Query invalidated artifacts (Rewind Feature)
        // Gracefully handle errors - don't break the prompt if query fails
        let invalidatedArtifactsContext = "";
        try {
            const invalidatedArtifactsStart = Date.now();
            const invalidatedArtifacts = await fetchQuery(
                api.artifacts.getInvalidatedByConversation,
                { conversationId, userId: session.userId },
                convexOptions
            );
            logPaperPromptLatency("paperPrompt.getInvalidatedArtifacts", invalidatedArtifactsStart, {
                count: Array.isArray(invalidatedArtifacts) ? invalidatedArtifacts.length : 0,
            });
            invalidatedArtifactsContext = getInvalidatedArtifactsContext(invalidatedArtifacts);
        } catch (err) {
            console.error("Error fetching invalidated artifacts:", err);
            // Continue without invalidated artifacts context
        }

        logPaperPromptLatency("paperPrompt.total", paperPromptStart, {
            hasPrompt: true,
            stage,
        });
        return {
            prompt: `
---
[PAPER WRITING MODE]
Tahap: ${stageLabel} (${stage}) | Status: ${status}
${revisionNote}${pendingNote}${dirtyContextNote}${dirtySyncContractNote}${invalidatedArtifactsContext}
GENERAL RULES:
- DISCUSS FIRST before drafting — do not immediately generate full output
- When guiding, recommending, or presenting directions to the user, write an interactive card using a yaml-spec code fence — it is your visual language alongside text. Never write options as numbered lists or bullet points when the card is available.
- After discussion is mature, write full paper content for the active stage based on agreed context
- ⚠️ ALL references and factual data MUST come from web search — NEVER hallucinate/fabricate
- To request web search: ASK the user to confirm the search. Example: "I need to search for references about X. Shall I proceed?" The user must send a message to trigger the search. Do NOT say "please wait" or promise the search will happen automatically.
- IMPORTANT: Web search and function tools CANNOT run in the same turn. After search results arrive, use function tools to save findings.
- Do NOT call any function tool (updateStageData, createArtifact, submitStageForValidation) in a turn where you request web search. Complete search first, then save in the next turn.
- Save progress with updateStageData() after discussion is mature
- For cross-stage reference audit, you MAY call compileDaftarPustaka({ mode: "preview" }) at any stage. This mode does not persist to DB.
- Bibliography finalization MUST use compileDaftarPustaka({ mode: "persist", ringkasan, ringkasanDetail? }) and is only valid when active stage = daftar_pustaka.
- MUST create artifact with createArtifact() for agreed stage output. Call in the SAME TURN as updateStageData, BEFORE submitStageForValidation. Include 'sources' from AVAILABLE_WEB_SOURCES if available. Artifact is the FINAL OUTPUT reviewed by user.
- For artifacts, MUST use references already stored in stageData (see context below)
- FORBIDDEN to introduce new references without web search first
- submitStageForValidation() ONLY after user EXPLICITLY confirms satisfaction
- Do not advance to next stage before currentStage changes in database
- If status is pending_validation and DIRTY CONTEXT = true, MUST state "data not yet synced" and direct user to request revision so sync/draft update can proceed

⚠️ IN-TEXT CITATION FORMAT (APA) — MANDATORY EVERY TURN:
- STRICTLY FORBIDDEN to use DOMAIN/WEBSITE name as author in citations
- ❌ WRONG: (Kuanta.id, n.d.), (Graphie.co.id, n.d.), (Researchgate.net, n.d.), (Kompas.com, 2024)
- If web search returns only URL without author:
  1. Look for the ACTUAL AUTHOR NAME in the search result page
  2. If author not found → use ARTICLE TITLE (abbreviated, in quotes)
  3. If year not found → use "n.d."
- ✅ CORRECT: (Wijaya, 2023), ("Dampak AI pada Pembelajaran", 2024), (Kementerian Pendidikan, n.d.)
- When in doubt between domain vs real author → DO NOT CITE, just mention the information without citation mark

${stageInstructions}
${memoryDigest}
COMPLETED STAGES CONTEXT & CHECKLIST:
Context compression active: max 5 refs, max 5 citations, detailed summary only for last 3 completed stages.
${formattedData}
${artifactSummariesSection ? `\n${artifactSummariesSection}` : ""}
---
`,
            skillResolverFallback: stageInstructionsResolution.skillResolverFallback,
            stageInstructionSource: stageInstructionsResolution.source,
            activeSkillId: stageInstructionsResolution.skillId,
            activeSkillVersion: stageInstructionsResolution.version,
            fallbackReason: stageInstructionsResolution.fallbackReason,
        };
    } catch (error) {
        console.error("Error fetching paper session for prompt:", error);
        logPaperPromptLatency("paperPrompt.total", paperPromptStart, {
            hasPrompt: false,
            reason: "error",
        });
        return {
            prompt: "",
            skillResolverFallback: false,
            stageInstructionSource: "none",
        };
    }
};
