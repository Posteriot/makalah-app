import { tool } from "ai"

import { z } from "zod"
import { fetchQuery, fetchMutation, fetchAction } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { retryMutation, retryQuery } from "../convex/retry"

type ExactSourceParagraph = {
    index: number
    text: string
}

type ExactSourceDocument = {
    title?: string
    author?: string
    publishedAt?: string
    siteName?: string
    documentKind?: "html" | "pdf" | "unknown"
    paragraphs?: ExactSourceParagraph[]
}

const buildExactAvailability = (document: ExactSourceDocument | null) => ({
    title: typeof document?.title === "string" && document.title.trim().length > 0,
    author: typeof document?.author === "string" && document.author.trim().length > 0,
    publishedAt: typeof document?.publishedAt === "string" && document.publishedAt.trim().length > 0,
    siteName: typeof document?.siteName === "string" && document.siteName.trim().length > 0,
    documentKind: typeof document?.documentKind === "string" && document.documentKind.trim().length > 0,
    paragraphs: Array.isArray(document?.paragraphs) && document.paragraphs.length > 0,
})

/**
 * Factory for creating AI tools specific to the paper writing workflow.
 */
export const createPaperTools = (context: {
    userId: Id<"users">,
    conversationId: Id<"conversations">
    convexToken?: string
    availableSources?: Array<{ url: string; title: string; publishedAt?: number }>
    hasRecentSources?: boolean
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
                data: z.record(z.string(), z.any()).describe(
                    "Draft data object for the current stage. IMPORTANT: referensiAwal/referensiPendukung must be ARRAY OF OBJECTS!"
                ),
            }),
            execute: async ({ data }) => {
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

                    await retryMutation(
                        () => fetchMutation(api.paperSessions.updateStageData, {
                            sessionId: session._id,
                            stage,
                            data,
                        }, convexOptions),
                        "paperSessions.updateStageData"
                    );

                    // Check if artifact exists for this stage
                    const stageDataMap = session.stageData as Record<string, Record<string, unknown> | undefined> | undefined;
                    const currentStageData = stageDataMap?.[stage];
                    const hasArtifact = !!currentStageData?.artifactId;

                    console.log("[F1-F6-TEST] updateStageData", { stage, hasArtifact, dataKeys: Object.keys(data) })
                    return {
                        success: true,
                        stage,
                        message: `Successfully saved progress for stage ${stage}.`,
                        nextAction: hasArtifact
                            ? "Data saved. Artifact already exists — call updateArtifact if content changed, then call submitStageForValidation()."
                            : "⚠️ MANDATORY: call createArtifact() RIGHT NOW in this same response, then call submitStageForValidation(). Do NOT generate text, do NOT stop — call the tools IMMEDIATELY.",
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
            }),
            execute: async ({ mode }) => {
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

                    const updateResult = await retryMutation(
                        () => fetchMutation(api.paperSessions.updateStageData, {
                            sessionId: session._id,
                            stage,
                            data: { ...compileResult.compiled },
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
            description: "Submit the current stage draft to the user for validation. This triggers an approval panel in the user's UI. AI stops generating after this. IMPORTANT: createArtifact MUST be called BEFORE this tool.",
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

                    // Pre-check: artifact must exist before submitting
                    const stage = session.currentStage;
                    const stageDataMap = session.stageData as Record<string, Record<string, unknown> | undefined> | undefined;
                    const currentStageData = stageDataMap?.[stage];
                    if (!currentStageData?.artifactId) {
                        console.warn("[submitStageForValidation] Blocked: no artifact yet for stage", stage);
                        return {
                            success: false,
                            error: "Artifact has not been created yet. You MUST call createArtifact() FIRST, then call submitStageForValidation() again.",
                        };
                    }

                    await retryMutation(
                        () => fetchMutation(api.paperSessions.submitForValidation, {
                            sessionId: session._id,
                        }, convexOptions),
                        "paperSessions.submitForValidation"
                    );
                    console.log("[F1-F6-TEST] submitStageForValidation", { stage: session.currentStage, status: "pending_validation" })
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

        inspectSourceDocument: tool({
            description:
                "Inspect an exact source document that was previously stored for this conversation. Use for title, author, publishedAt, siteName, or exact paragraph lookup. Do not use this tool for semantic search or relevance matching.",
            inputSchema: z.object({
                sourceId: z
                    .string()
                    .describe("The source identifier to inspect (web source URL or uploaded file ID)."),
                paragraphIndex: z
                    .number()
                    .int()
                    .positive()
                    .optional()
                    .describe("Optional one-based paragraph index to retrieve exactly."),
                includeParagraphs: z
                    .boolean()
                    .optional()
                    .describe("Include all stored paragraphs in the response when no paragraphIndex is requested."),
                includeMetadata: z
                    .boolean()
                    .optional()
                    .describe("Include exact metadata fields in the response."),
            }),
            execute: async ({ sourceId, paragraphIndex, includeParagraphs, includeMetadata }) => {
                try {
                    const document = await retryQuery(
                        () => fetchQuery(api.sourceDocuments.getBySource, {
                            conversationId: context.conversationId,
                            sourceId,
                        }, convexOptions),
                        "sourceDocuments.getBySource"
                    ) as ExactSourceDocument | null

                    if (!document) {
                        return { success: false, error: "Source document not found for this conversation." }
                    }

                    const exactAvailable = buildExactAvailability(document)
                    const response: {
                        success: boolean
                        sourceId: string
                        exactAvailable: ReturnType<typeof buildExactAvailability>
                        title?: string
                        author?: string
                        publishedAt?: string
                        siteName?: string
                        documentKind?: "html" | "pdf" | "unknown"
                        requestedParagraph?: ExactSourceParagraph
                        paragraphs?: ExactSourceParagraph[]
                    } = {
                        success: true,
                        sourceId,
                        exactAvailable,
                    }

                    if (includeMetadata !== false) {
                        if (exactAvailable.title) response.title = document.title
                        if (exactAvailable.author) response.author = document.author
                        if (exactAvailable.publishedAt) response.publishedAt = document.publishedAt
                        if (exactAvailable.siteName) response.siteName = document.siteName
                        if (exactAvailable.documentKind) response.documentKind = document.documentKind
                    }

                    if (typeof paragraphIndex === "number") {
                        const requestedParagraph = document.paragraphs?.find((paragraph) => paragraph.index === paragraphIndex) ?? null
                        if (!requestedParagraph) {
                            return {
                                success: false,
                                sourceId,
                                exactAvailable,
                                error: `Paragraph index ${paragraphIndex} not found in source document.`,
                            }
                        }

                        response.requestedParagraph = requestedParagraph
                        return response
                    }

                    if (includeParagraphs) {
                        response.paragraphs = document.paragraphs ?? []
                    }

                    return response
                } catch (_error) {
                    return { success: false, error: "Failed to inspect source document." }
                }
            },
        }),

        quoteFromSource: tool({
            description:
                "Search semantic chunks within a previously searched web source or uploaded file. Use when the user asks for a relevant passage, quote candidate, or broader match within a source. Do not use this tool to verify exact paragraph positions or exact titles.",
            inputSchema: z.object({
                sourceId: z
                    .string()
                    .describe("The URL (for web sources) or fileId (for uploaded files) to quote from"),
                query: z.string().describe("What to search for within this source"),
            }),
            execute: async ({ sourceId, query }) => {
                try {
                    const { embedQuery } = await import("@/lib/ai/embedding")
                    const embedding = await embedQuery(query)

                    const results = await fetchAction(
                        api.sourceChunks.searchByEmbedding,
                        {
                            conversationId: context.conversationId,
                            embedding,
                            sourceId,
                            limit: 5,
                        },
                        convexOptions
                    )

                    if (!results || results.length === 0) {
                        return { success: false, error: "No matching content found for this source." }
                    }

                    return {
                        success: true,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        chunks: results.map((r: any) => ({
                            content: r.content,
                            sectionHeading: r.metadata?.sectionHeading,
                            relevanceScore: r._score,
                        })),
                    }
                } catch (_error) {
                    return { success: false, error: "Failed to retrieve source content." }
                }
            },
        }),

        searchAcrossSources: tool({
            description:
                "Search across all previously searched web sources and uploaded files in this conversation. Use for finding relevant passages about a topic across multiple references.",
            inputSchema: z.object({
                query: z.string().describe("The topic or claim to search for across all sources"),
                sourceType: z
                    .enum(["web", "upload"])
                    .optional()
                    .describe("Filter by source type. Omit to search all."),
            }),
            execute: async ({ query, sourceType }) => {
                try {
                    const { embedQuery } = await import("@/lib/ai/embedding")
                    const embedding = await embedQuery(query)

                    const results = await fetchAction(
                        api.sourceChunks.searchByEmbedding,
                        {
                            conversationId: context.conversationId,
                            embedding,
                            sourceType: sourceType ?? undefined,
                            limit: 10,
                        },
                        convexOptions
                    )

                    if (!results || results.length === 0) {
                        return { success: false, error: "No matching content found across sources." }
                    }

                    return {
                        success: true,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        chunks: results.map((r: any) => ({
                            content: r.content,
                            sourceId: r.sourceId,
                            sectionHeading: r.metadata?.sectionHeading,
                            relevanceScore: r._score,
                        })),
                    }
                } catch (_error) {
                    return { success: false, error: "Failed to search across sources." }
                }
            },
        }),
    }
}
