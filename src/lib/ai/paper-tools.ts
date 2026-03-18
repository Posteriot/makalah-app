import { tool } from "ai"

import { z } from "zod"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { retryMutation, retryQuery } from "../convex/retry"
import { compileChoiceSpec, type NormalizedOption } from "@/lib/json-render/compile-choice-spec"
import { parseJsonRendererChoicePayload } from "@/lib/json-render/choice-payload"

/**
 * Factory for creating AI tools specific to the paper writing workflow.
 */
export const createPaperTools = (context: {
    userId: Id<"users">,
    conversationId: Id<"conversations">
    convexToken?: string
    availableSources?: Array<{ url: string; title: string; publishedAt?: number }>
    hasRecentSources?: boolean
    paperStageScope?: string   // current stage for tool gating
    paperStageStatus?: string  // drafting/pending_validation/approved/revision
}) => {
    const convexOptions = context.convexToken ? { token: context.convexToken } : undefined
    return {
        startPaperSession: tool({
            description: `Initialize a new paper writing session for this conversation.

You MUST call this tool IMMEDIATELY when the user indicates intent to write a paper/makalah/skripsi.

Rules for filling initialIdea:
- If user mentions a specific topic → use that topic
- If user only says "start writing a paper" without a topic → leave this parameter empty
- Do NOT wait for the user to provide a topic first, call this tool IMMEDIATELY`,
            inputSchema: z.object({
                initialIdea: z.string().optional().describe(
                    "Raw idea, initial title, or topic. Optional — if user has not mentioned a topic, leave empty."
                ),
            }),
            execute: async ({ initialIdea }) => {
                try {
                    const sessionId = await retryMutation(
                        () => fetchMutation(api.paperSessions.create, {
                            userId: context.userId,
                            conversationId: context.conversationId,
                            initialIdea: initialIdea || undefined,
                        }, convexOptions),
                        "paperSessions.create"
                    );
                    return {
                        success: true,
                        sessionId,
                        message: "Paper writing session started successfully. AI is now in 'Paper Writing Mode'. Follow the instructions for stage 'gagasan'.",
                    };
                } catch (error) {
                    console.error("Error in startPaperSession tool:", error);
                    return { success: false, error: "Failed to start paper session in database." };
                }
            },
        }),

        getCurrentPaperState: tool({
            description: "Retrieve the latest status of the paper writing session (active stage, draft data, validation status). Useful for synchronization after a pause.",
            inputSchema: z.object({}),
            execute: async () => {
                try {
                    const session = await retryQuery(
                        () => fetchQuery(api.paperSessions.getByConversation, {
                            conversationId: context.conversationId
                        }, convexOptions),
                        "paperSessions.getByConversation"
                    );
                    return session
                        ? { success: true, session }
                        : { success: false, error: "No active paper session found for this conversation." };
                } catch (error) {
                    console.error("Error in getCurrentPaperState tool:", error);
                    return { success: false, error: "Failed to retrieve paper session status." };
                }
            }
        }),

        updateStageData: tool({
            description: `Save draft data progress for the CURRENT writing stage to the database.

═══════════════════════════════════════════════════════════════════════════════
AUTO-STAGE (IMPORTANT!):
═══════════════════════════════════════════════════════════════════════════════
This tool AUTOMATICALLY saves to the currently active stage (currentStage).
You do NOT need to and CANNOT specify the stage — the tool auto-fetches it from the session.
This prevents "Cannot update X while in Y" errors.

═══════════════════════════════════════════════════════════════════════════════
DATA FORMAT:
═══════════════════════════════════════════════════════════════════════════════
- Fields 'referensiAwal' or 'referensiPendukung' MUST be ARRAY OF OBJECTS, NOT strings!
  Format: [{title: "Paper Title", authors: "Author Name", url: "https://...", year: 2024}, ...]
  - title (required): Reference/paper title
  - authors (optional): Author name(s)
  - url (optional): Source URL
  - year (optional): Publication year (number)

Example data for 'gagasan' stage:
{
  ideKasar: "User's idea...",
  analisis: "Feasibility analysis...",
  angle: "Unique perspective...",
  novelty: "What's new...",
  referensiAwal: [
    {title: "Self-determination theory and...", authors: "Ryan, R.M. & Deci, E.L.", year: 2000},
    {title: "Project-based learning effects...", url: "https://example.com", year: 2019}
  ]
}

Example data for 'outline' stage:
{
  sections: [
    {id: "abstrak", judul: "Abstrak", level: 1, parentId: null, estimatedWordCount: 200, status: "empty"},
    {id: "pendahuluan", judul: "Pendahuluan", level: 1, parentId: null, estimatedWordCount: 1000, status: "empty"},
    {id: "pendahuluan.latar", judul: "Latar Belakang", level: 2, parentId: "pendahuluan", estimatedWordCount: 500, status: "empty"}
  ],
  totalWordCount: 5000,
  completenessScore: 0
}
IMPORTANT for outline: Use 'judul' (NOT 'title'), 'estimatedWordCount' as a number (NOT 'wordCount' string). Do NOT add 'checked' or 'subSections' fields.`,
            inputSchema: z.object({
                // NOTE: 'stage' parameter REMOVED - auto-fetched from session.currentStage
                // This prevents AI from specifying wrong stage (Option B fix for stage confusion bug)
                ringkasan: z.string().max(280).describe(
                    "REQUIRED! The main decision AGREED upon with the user for this stage. Max 280 characters. " +
                    "Example: 'Agreed angle: AI impact on Indonesian higher education, gap: no studies on private universities'"
                ),
                ringkasanDetail: z.string().max(1000).optional().describe(
                    "Elaboration on ringkasan: WHY this decision was made, important nuances, discussion context with user, " +
                    "and details that don't fit in the 280-char ringkasan. Max 1000 characters. " +
                    "Example: 'Angle chosen due to large literature gap in Indonesian context, user has data access from 3 private universities in Jakarta, " +
                    "focus on introductory programming courses semesters 1-2.'"
                ),
                data: z.record(z.string(), z.any()).optional().describe(
                    "Additional draft data object (besides ringkasan/ringkasanDetail). IMPORTANT: referensiAwal/referensiPendukung must be ARRAY OF OBJECTS!"
                ),
            }),
            execute: async ({ ringkasan, ringkasanDetail, data }) => {
                try {
                    const session = await retryQuery(
                        () => fetchQuery(api.paperSessions.getByConversation, {
                            conversationId: context.conversationId
                        }, convexOptions),
                        "paperSessions.getByConversation"
                    );
                    if (!session) return { success: false, error: "Paper session not found." };

                    // Option B Fix: Auto-fetch stage from session.currentStage
                    // This eliminates the possibility of AI specifying wrong stage
                    const stage = session.currentStage;

                    // Reference integrity validation (if sources available)
                    if (context.hasRecentSources && context.availableSources && context.availableSources.length > 0) {
                        const refFields = ['referensiAwal', 'referensiPendukung', 'referensi', 'sitasiAPA', 'sitasiTambahan']
                        const allRefs: Array<{ title: string; url?: string; authors?: string }> = []
                        if (data) {
                            for (const field of refFields) {
                                const val = data[field]
                                if (Array.isArray(val)) {
                                    allRefs.push(...val.filter((r: unknown) => r && typeof r === 'object') as Array<{ title: string; url?: string; authors?: string }>)
                                }
                            }
                        }

                        if (allRefs.length > 0) {
                            const { getSearchSkill } = await import('@/lib/ai/skills')
                            const refValidation = getSearchSkill().checkReferences({
                                toolName: 'updateStageData',
                                claimedReferences: allRefs,
                                availableSources: context.availableSources,
                                hasRecentSources: true,
                            })
                            if (!refValidation.valid) {
                                return { success: false, error: refValidation.error }
                            }
                        }
                    }

                    // Merge ringkasan + ringkasanDetail into data object
                    const mergedData = {
                        ...(data || {}),
                        ringkasan,
                        ...(ringkasanDetail ? { ringkasanDetail } : {}),
                    };

                    const result = await retryMutation(
                        () => fetchMutation(api.paperSessions.updateStageData, {
                            sessionId: session._id,
                            stage,
                            data: mergedData,
                        }, convexOptions),
                        "paperSessions.updateStageData"
                    );

                    // Safety net: Parse warning from backend if ringkasan somehow missing
                    // (Should never happen now since ringkasan is required by Zod schema)
                    if (result && typeof result === 'object' && 'warning' in result && result.warning) {
                        return {
                            success: true,
                            stage, // Include stage in response so AI knows which stage was updated
                            message: `Successfully saved progress for stage ${stage}.`,
                            warning: result.warning,
                        };
                    }

                    return {
                        success: true,
                        stage, // Include stage in response so AI knows which stage was updated
                        message: `Successfully saved progress for stage ${stage}. Summary saved.`
                    };
                } catch (error) {
                    console.error("Error in updateStageData tool:", error);
                    // Forward specific error message from backend to AI
                    const errorMessage = error instanceof Error
                        ? error.message
                        : "Failed to save stage data progress.";
                    return { success: false, error: errorMessage };
                }
            },
        }),

        compileDaftarPustaka: tool({
            description: `Compile cross-stage references (stages 1-10) server-side for the daftar_pustaka stage.

This tool has 2 modes:
1) preview  -> can be used at any stage, WITHOUT persisting to stageData
2) persist  -> only for finalizing the daftar_pustaka stage, compiled result is saved to stageData

The tool will:
- compile references from approved stages
- skip invalidated/superseded stages due to rewind
- persist only if mode = persist`,
            inputSchema: z.object({
                mode: z.enum(["preview", "persist"]).optional().describe(
                    "Compilation mode. Default: persist. Use preview for a quick cross-stage audit."
                ),
                ringkasan: z.string().max(280).optional().describe(
                    "Required if mode=persist. Summary of the bibliography compilation result (max 280 characters)."
                ),
                ringkasanDetail: z.string().max(1000).optional().describe(
                    "Optional. Details on the compilation process, merged duplicates, and incomplete references."
                ),
            }),
            execute: async ({ mode, ringkasan, ringkasanDetail }) => {
                try {
                    const session = await retryQuery(
                        () => fetchQuery(api.paperSessions.getByConversation, {
                            conversationId: context.conversationId
                        }, convexOptions),
                        "paperSessions.getByConversation"
                    );
                    if (!session) return { success: false, error: "Paper session not found." };

                    const stage = session.currentStage;
                    const compileMode = mode ?? "persist";

                    if (compileMode === "persist" && (!ringkasan || ringkasan.trim() === "")) {
                        return {
                            success: false,
                            error: "compileDaftarPustaka persist mode requires the ringkasan field (max 280 characters).",
                        };
                    }

                    const compileResult = await retryMutation(
                        () => fetchMutation(api.paperSessions.compileDaftarPustaka, {
                            sessionId: session._id,
                            mode: compileMode,
                            includeWebSearchReferences: true,
                        }, convexOptions),
                        "paperSessions.compileDaftarPustaka"
                    ) as {
                        success: boolean;
                        mode: "preview" | "persist";
                        stage: string;
                        compiled: {
                            entries: Array<{
                                title: string;
                                authors?: string;
                                year?: number;
                                sourceStage?: string;
                                isComplete?: boolean;
                            }>;
                            totalCount: number;
                            incompleteCount: number;
                            duplicatesMerged: number;
                        };
                        warnings?: string[];
                    };

                    if (compileMode === "preview") {
                        const previewIncompleteSamples = compileResult.compiled.entries
                            .filter((entry) => entry.isComplete === false)
                            .slice(0, 5)
                            .map((entry) => ({
                                title: entry.title,
                                authors: entry.authors,
                                year: entry.year,
                                sourceStage: entry.sourceStage,
                            }));

                        return {
                            success: true,
                            mode: "preview" as const,
                            stage: compileResult.stage,
                            message: "Bibliography compilation preview successful.",
                            totalCount: compileResult.compiled.totalCount,
                            incompleteCount: compileResult.compiled.incompleteCount,
                            duplicatesMerged: compileResult.compiled.duplicatesMerged,
                            ...(previewIncompleteSamples.length > 0 ? { previewIncompleteSamples } : {}),
                            ...(Array.isArray(compileResult.warnings) && compileResult.warnings.length > 0
                                ? { warning: compileResult.warnings.join(" | ") }
                                : {}),
                        };
                    }

                    const mergedData = {
                        ringkasan: ringkasan!,
                        ...(ringkasanDetail ? { ringkasanDetail } : {}),
                        ...compileResult.compiled,
                    };

                    const updateResult = await retryMutation(
                        () => fetchMutation(api.paperSessions.updateStageData, {
                            sessionId: session._id,
                            stage,
                            data: mergedData,
                        }, convexOptions),
                        "paperSessions.updateStageData"
                    ) as { warning?: string };

                    const warnings: string[] = [];
                    if (Array.isArray(compileResult.warnings) && compileResult.warnings.length > 0) {
                        warnings.push(...compileResult.warnings);
                    }
                    if (updateResult?.warning) {
                        warnings.push(updateResult.warning);
                    }

                    return {
                        success: true,
                        mode: "persist" as const,
                        stage,
                        message: "Bibliography compilation successful and saved to stageData.",
                        totalCount: compileResult.compiled.totalCount,
                        incompleteCount: compileResult.compiled.incompleteCount,
                        duplicatesMerged: compileResult.compiled.duplicatesMerged,
                        ...(warnings.length > 0 ? { warning: warnings.join(" | ") } : {}),
                    };
                } catch (error) {
                    console.error("Error in compileDaftarPustaka tool:", error);
                    const errorMessage = error instanceof Error
                        ? error.message
                        : "Failed to compile bibliography.";
                    return { success: false, error: errorMessage };
                }
            },
        }),

        submitStageForValidation: tool({
            description: "Submit the current stage draft to the user for validation. This triggers an approval panel in the user's UI. AI stops generating after this.",
            inputSchema: z.object({}),
            execute: async () => {
                try {
                    const session = await retryQuery(
                        () => fetchQuery(api.paperSessions.getByConversation, {
                            conversationId: context.conversationId
                        }, convexOptions),
                        "paperSessions.getByConversation"
                    );
                    if (!session) return { success: false, error: "Paper session not found." };

                    await retryMutation(
                        () => fetchMutation(api.paperSessions.submitForValidation, {
                            sessionId: session._id,
                        }, convexOptions),
                        "paperSessions.submitForValidation"
                    );
                    return {
                        success: true,
                        message: "Draft submitted to user. Awaiting validation (Approve/Revise) from user before proceeding to the next stage."
                    };
                } catch (error) {
                    console.error("Error in submitStageForValidation tool:", error);
                    // Forward specific error message from backend to AI
                    const errorMessage = error instanceof Error
                        ? error.message
                        : "Failed to submit validation signal.";
                    return { success: false, error: errorMessage };
                }
            },
        }),

        // ── Choice Card Tool (phase-one drafting stages only) ──────
        ...((() => {
            const isPhaseOneDrafting = (context.paperStageScope === "gagasan" ||
              context.paperStageScope === "topik" ||
              context.paperStageScope === "outline") &&
              context.paperStageStatus === "drafting"
            console.info(`[CHOICE-CARD][register] stage=${context.paperStageScope ?? "none"} status=${context.paperStageStatus ?? "none"} registered=${isPhaseOneDrafting}`)
            return isPhaseOneDrafting
        })()
          ? {
              emitChoiceCard: tool({
                description:
                  "Present an interactive choice card to the user. Use this when the user needs to make a decision by choosing from 2-5 options. The frontend renders an interactive card — the user clicks instead of typing. Do NOT list the options as a numbered/bulleted list in your prose when using this tool.",
                inputSchema: z.object({
                  kind: z.enum(["single-select"]).describe(
                    "Interaction type. Currently only single-select is supported."
                  ),
                  title: z.string().min(1).describe(
                    "Short heading for the decision point, in Indonesian."
                  ),
                  options: z
                    .array(
                      z.object({
                        id: z.string().min(1).describe("Kebab-case identifier."),
                        label: z.string().min(1).describe("Human-readable label in Indonesian, under 60 chars."),
                      })
                    )
                    .min(2)
                    .max(5)
                    .describe("The selectable options."),
                  recommendedId: z
                    .string()
                    .optional()
                    .describe(
                      "The id of the option you recommend. Omit if all options are equally valid."
                    ),
                  submitLabel: z
                    .string()
                    .max(40)
                    .optional()
                    .describe("Button label. Defaults to 'Lanjutkan'."),
                }),
                execute: async (input) => {
                  console.info(`[CHOICE-CARD][execute] kind=${input.kind} title="${input.title}" options=${input.options.length} recommendedId=${input.recommendedId ?? "none"}`)
                  const { spec, normalizedOptions } = compileChoiceSpec({
                    stage: context.paperStageScope!,
                    kind: input.kind,
                    title: input.title,
                    options: input.options,
                    recommendedId: input.recommendedId,
                    submitLabel: input.submitLabel,
                    appendValidationOption: true,
                  })

                  const selectedOptionId = input.recommendedId
                    ? normalizedOptions.find(
                        (o: NormalizedOption) => o._originalId === input.recommendedId
                      )?.id ?? null
                    : null

                  return {
                    success: true,
                    payload: parseJsonRendererChoicePayload({
                      version: 1,
                      engine: "json-render",
                      stage: context.paperStageScope!,
                      kind: input.kind,
                      spec,
                      initialState: {
                        selection: { selectedOptionId, customText: "" },
                      },
                      options: normalizedOptions.map((o: NormalizedOption) => ({
                        id: o.id,
                        label: o.label,
                      })),
                    }),
                  }
                },
              }),
            }
          : {}),
    }
}
