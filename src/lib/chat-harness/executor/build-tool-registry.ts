import * as Sentry from "@sentry/nextjs"
import { tool, type ToolSet } from "ai"
import { z } from "zod"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import { retryMutation } from "@/lib/convex/retry"
import { checkSourceBodyParity } from "@/lib/ai/skills/web-search-quality/scripts/check-source-body-parity"
import { createPaperTools } from "@/lib/ai/paper-tools"
import { logAiTelemetry } from "@/lib/ai/telemetry"
import type { WebSearchSkill } from "@/lib/ai/skills"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import type { ResolvedChoiceWorkflow } from "@/lib/chat/choice-request"
import type { PaperToolTracker } from "@/lib/ai/paper-tools"
import type {
    PaperSessionForExecutor,
    PaperTurnObservability,
} from "./types"
import type { ConvexFetchQuery, ConvexFetchMutation } from "../types"
import { executeAutoRescue } from "../shared/auto-rescue-policy"

// ────────────────────────────────────────────────────────────────
// buildToolRegistry — extracted from route.ts lines 1325–1898
// ────────────────────────────────────────────────────────────────

export function buildToolRegistry(params: {
    conversationId: Id<"conversations">
    userId: Id<"users">
    paperSession: PaperSessionForExecutor | null
    paperStageScope: PaperStageId | undefined
    paperToolTracker: PaperToolTracker
    paperTurnObservability: PaperTurnObservability
    resolvedWorkflow: ResolvedChoiceWorkflow | undefined
    fetchQueryWithToken: ConvexFetchQuery
    fetchMutationWithToken: ConvexFetchMutation
    // Additional closures from route.ts scope
    skill: WebSearchSkill
    recentSourcesList: Array<{ url: string; title: string; publishedAt?: number }>
    hasRecentSourcesInDb: boolean
    convexToken: string
    modelProvider: string
    isPaperMode: boolean
}): ToolSet {
    const {
        conversationId,
        userId,
        paperSession,
        paperToolTracker,
        paperTurnObservability,
        fetchQueryWithToken,
        fetchMutationWithToken,
        skill,
        recentSourcesList,
        hasRecentSourcesInDb,
        convexToken,
        modelProvider,
        isPaperMode,
    } = params

    const tools = {
        createArtifact: tool({
            description: `Create a NEW artifact for standalone, non-conversational content that the user might want to edit, copy, or export.

⚠️ PENTING: Jika artifact untuk stage/konten ini SUDAH ADA dan ditandai 'invalidated' (karena rewind), gunakan updateArtifact sebagai gantinya. JANGAN buat artifact baru untuk konten yang sudah punya artifact sebelumnya.

USE THIS TOOL WHEN generating:
✓ Paper outlines and structures (type: "outline")
✓ Draft sections: Introduction, Methodology, Results, Discussion, Conclusion (type: "section")
✓ Code snippets for data analysis in Python, R, JavaScript, TypeScript (type: "code")
✓ Tables and formatted data (type: "table")
✓ Bibliography entries and citations (type: "citation")
✓ LaTeX mathematical formulas (type: "formula")
✓ Research summaries and abstracts (type: "section")
✓ Paraphrased paragraphs (type: "section")
✓ Charts and graphs: bar, line, pie (type: "chart", format: "json")
✓ Diagrams: flowchart, sequence, class, state, ER, gantt, mindmap, timeline, pie (type: "code", format: "markdown", content: raw mermaid syntax WITHOUT fences)

DO NOT use this tool for:
✗ Explanations and teaching
✗ Discussions about concepts
✗ Questions and clarifications
✗ Suggestions and feedback
✗ Meta-conversation about writing process
✗ Short answers (less than 3 sentences)
✗ Updating existing/invalidated artifacts (use updateArtifact instead)

When using this tool, always provide a clear, descriptive title (max 50 chars).

📊 CHARTS: For charts/graphs, use type "chart" with format "json". Content must be a valid JSON string.

Bar chart example:
{"chartType":"bar","title":"Publikasi per Tahun","xAxisLabel":"Tahun","yAxisLabel":"Jumlah","data":[{"name":"2020","value":150},{"name":"2021","value":200},{"name":"2022","value":280}],"series":[{"dataKey":"value","name":"Publikasi","color":"#f59e0b"}]}

Line chart example:
{"chartType":"line","title":"Tren Penelitian","xAxisLabel":"Tahun","yAxisLabel":"Jumlah","data":[{"name":"2020","value":50},{"name":"2021","value":80},{"name":"2022","value":120}],"series":[{"dataKey":"value","name":"Penelitian","color":"#0ea5e9"}]}

Pie chart example:
{"chartType":"pie","title":"Distribusi Metode","data":[{"name":"Kualitatif","value":35},{"name":"Kuantitatif","value":45},{"name":"Mixed","value":20}]}

Rules: "data" is array of objects with "name" (label) + numeric field(s). "series" defines which numeric fields to plot (optional for pie, auto-detected if omitted). Content MUST be valid JSON — no comments, no trailing commas.

📐 DIAGRAMS (Mermaid): For visual diagrams (flowcharts, sequence diagrams, class diagrams, etc.), use type "code" with format "markdown". Content is RAW mermaid syntax — NO \`\`\`mermaid fences, just the diagram code directly.

Flowchart example:
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E

Sequence diagram example:
sequenceDiagram
    participant U as User
    participant S as Server
    U->>S: Request
    S-->>U: Response

Supported types: flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt, mindmap, timeline, journey, gitgraph, quadrantChart, xychart, block-beta, sankey-beta.`,
            inputSchema: z.object({
                type: z.enum(["code", "outline", "section", "table", "citation", "formula", "chart"])
                    .describe("The type of artifact to create"),
                title: z.string().max(200)
                    .describe("Short, descriptive title for the artifact (max 200 chars). Examples: 'Introduction Draft', 'Data Analysis Code', 'Research Outline'"),
                content: z.string().min(10)
                    .describe("The actual content of the artifact"),
                format: z.enum(["markdown", "latex", "python", "r", "javascript", "typescript", "json"]).optional()
                    .describe("Format of the content. Use 'markdown' for text, language name for code, 'json' for charts"),
                description: z.string().optional()
                    .describe("Optional brief description of what the artifact contains"),
                sources: z.array(z.object({
                    url: z.string(),
                    title: z.string(),
                    publishedAt: z.number().optional(),
                })).optional()
                    .describe("Web sources from previous web search turn. Pass this if artifact content references web search results. Format: [{url, title, publishedAt?}]"),
            }),
            execute: async ({ type, title, content, format, description, sources }) => {
                try {
                    // Guard: race-free claim — set synchronously before any await.
                    // JS event loop runs sync code to completion before yielding,
                    // so the second parallel call sees true immediately.
                    if (paperToolTracker?.createArtifactClaimed) {
                        console.log(`[create-artifact-blocked-duplicate] stage=${paperSession?.currentStage} — artifact creation already claimed this turn`);
                        return {
                            success: false,
                            errorCode: "CREATE_BLOCKED_DUPLICATE_TURN",
                            retryable: false,
                            error: "An artifact was already created in this turn. Use updateArtifact to make changes to the existing artifact.",
                            nextAction: "Call updateArtifact if content needs changes, or submitStageForValidation if not yet submitted.",
                        }
                    }
                    if (paperToolTracker) paperToolTracker.createArtifactClaimed = true;

                    // Guard: block duplicate createArtifact after a successful creation in the same turn.
                    // Model sometimes retries after wrong tool ordering triggers auto-rescue.
                    if (paperToolTracker?.sawCreateArtifactSuccess) {
                        console.log(`[create-artifact-blocked-duplicate] stage=${paperSession?.currentStage} — artifact already created this turn`);
                        return {
                            success: false,
                            errorCode: "CREATE_BLOCKED_DUPLICATE_TURN",
                            retryable: false,
                            error: "An artifact was already created in this turn. Use updateArtifact to make changes to the existing artifact.",
                            nextAction: "Call updateArtifact if content needs changes, or submitStageForValidation if not yet submitted.",
                        }
                    }

                    // Plan completion is enforced SOFTLY via prepareStep (plan gate
                    // downgrades enforcer). No hard block here — plan tasks are
                    // model-generated guidance, not hard requirements. The model may
                    // finalize before all tasks are complete, especially when the user
                    // explicitly clicks finalize_stage.

                    // Guard: block createArtifact when a valid artifact already exists (pending_validation OR revision).
                    // During revision, model should use updateArtifact to create v2/v3 — not createArtifact.
                    // createArtifact is only allowed as exceptional fallback when artifact is missing/invalidated.
                    if (paperSession?.stageStatus === "pending_validation" || paperSession?.stageStatus === "revision") {
                        const currentStageData = (paperSession.stageData as Record<string, Record<string, unknown>>)?.[paperSession.currentStage];
                        const existingArtifactId = currentStageData?.artifactId as string | undefined;

                        let artifactIsValid = false;
                        if (existingArtifactId) {
                            try {
                                const existingArtifact = await fetchQueryWithToken(api.artifacts.get, {
                                    artifactId: existingArtifactId as Id<"artifacts">,
                                    userId: userId as Id<"users">,
                                });
                                artifactIsValid = !!existingArtifact && !existingArtifact.invalidatedAt;
                            } catch {
                                artifactIsValid = false;
                            }
                        }

                        if (artifactIsValid) {
                            console.log(`[create-artifact-blocked-valid-exists] stage=${paperSession.currentStage} stageStatus=${paperSession.stageStatus} artifactId=${existingArtifactId}`);
                            return {
                                success: false,
                                errorCode: "CREATE_BLOCKED_VALID_EXISTS",
                                retryable: false,
                                error: "A valid artifact already exists for this stage. Use updateArtifact to create a new version instead of createArtifact.",
                                nextAction: "Call updateArtifact with the revised content. Do NOT use createArtifact when a valid artifact exists.",
                            }
                        }

                        // Artifact missing/invalidated/inaccessible — allow createArtifact as exceptional fallback.
                        // Auto-rescue only for pending_validation (revision is already correct state).
                        const createRescue = await executeAutoRescue({
                            paperSession,
                            source: "createArtifact",
                            userId: userId as Id<"users">,
                            fetchMutationWithToken,
                            fetchQueryWithToken,
                            conversationId,
                        })
                        if (createRescue.error) {
                            return {
                                success: false,
                                errorCode: "AUTO_RESCUE_FAILED",
                                retryable: true,
                                error: "Failed to auto-transition stage to revision. Try calling requestRevision explicitly first.",
                                nextAction: "Call requestRevision(feedback) first, then retry createArtifact.",
                            }
                        }
                        if (createRescue.rescued && createRescue.refreshedSession) {
                            console.log(`[create-artifact-fallback-no-valid] stage=${paperSession.currentStage} — auto-rescued, proceeding with createArtifact`)
                            Object.assign(paperSession, createRescue.refreshedSession)
                        }
                    }

                    const refValidation = skill.checkReferences({
                        toolName: 'createArtifact',
                        claimedSources: sources,
                        availableSources: recentSourcesList,
                        hasRecentSources: hasRecentSourcesInDb,
                    })
                    logAiTelemetry({
                        token: convexToken,
                        userId: userId as Id<"users">,
                        conversationId: conversationId as Id<"conversations">,
                        provider: modelProvider as "vercel-gateway" | "openrouter",
                        model: "tool-validation",
                        isPrimaryProvider: true,
                        failoverUsed: false,
                        mode: isPaperMode ? "paper" : "normal",
                        success: refValidation.valid,
                        latencyMs: 0,
                        searchSkillApplied: true,
                        searchSkillName: "reference-integrity",
                        searchSkillAction: refValidation.valid ? "validated" : "rejected",
                        referencesClaimed: sources?.length ?? 0,
                        referencesMatched: refValidation.valid ? (sources?.length ?? 0) : 0,
                    })
                    if (!refValidation.valid) {
                        return {
                            success: false,
                            error: refValidation.error,
                        }
                    }

                    // Source-body parity check: content reference inventory must match attached sources
                    if (sources && sources.length > 0) {
                        const parityCheck = checkSourceBodyParity({ content, sources })
                        if (!parityCheck.valid) {
                            console.warn(`[source-body-parity-rejected] tool=createArtifact level=${parityCheck.level} sources=${sources.length}`)
                            return {
                                success: false,
                                errorCode: "SOURCE_BODY_PARITY_MISMATCH",
                                retryable: true,
                                error: parityCheck.error,
                                nextAction: "Fix the artifact content to match attached sources count, or add an explicit subset disclaimer.",
                            }
                        }
                    }

                    const result = await retryMutation(
                        () => fetchMutationWithToken(api.artifacts.create, {
                            conversationId: conversationId as Id<"conversations">,
                            userId: userId as Id<"users">,
                            type,
                            title,
                            content,
                            format,
                            description,
                            sources,
                        }),
                        "artifacts.create"
                    )

                    // Auto-link artifactId to paper session stageData
                    if (paperSession) {
                        try {
                            await fetchMutationWithToken(api.paperSessions.updateStageData, {
                                sessionId: paperSession._id,
                                stage: paperSession.currentStage,
                                data: { artifactId: result.artifactId },
                            })
                        } catch {
                            // Non-critical: artifact exists but not linked to stage
                            console.warn("[createArtifact] Auto-link artifactId to stageData failed")
                        }
                    }

                    console.log("[F1-F6-TEST] createArtifact", { stage: paperSession?.currentStage, artifactId: result.artifactId, title })
                    if (paperToolTracker) paperToolTracker.sawCreateArtifactSuccess = true
                    paperTurnObservability.createArtifactAtMs = Date.now()
                    console.info("[PAPER][artifact-tool-success]", {
                        stage: paperSession?.currentStage,
                        artifactId: result.artifactId,
                        hadLeakageBeforeArtifact: paperTurnObservability.firstLeakageAtMs !== null,
                        firstLeakageMatch: paperTurnObservability.firstLeakageMatch,
                    })

                    // Auto-submit: if model called submitStageForValidation before artifact existed
                    // (wrong tool order), retry submit now that artifact is created.
                    let autoSubmitted = false
                    if (paperToolTracker?.sawSubmitValidationArtifactMissing && !paperToolTracker?.sawSubmitValidationSuccess) {
                        try {
                            await fetchMutationWithToken(api.paperSessions.submitForValidation, {
                                sessionId: paperSession!._id,
                            })
                            autoSubmitted = true
                            paperToolTracker.sawSubmitValidationSuccess = true
                            console.log("[createArtifact][auto-submit] submitStageForValidation retried after artifact creation — success")
                        } catch (autoSubmitError) {
                            console.warn("[createArtifact][auto-submit] submitStageForValidation retry failed:", autoSubmitError)
                        }
                    }

                    return {
                        success: true,
                        artifactId: result.artifactId,
                        title,
                        message: autoSubmitted
                            ? `Artifact "${title}" berhasil dibuat dan sudah disubmit untuk validasi.`
                            : `Artifact "${title}" berhasil dibuat. User dapat melihatnya di panel artifact.`,
                        nextAction: autoSubmitted
                            ? "Artifact created and submitted for validation. Do NOT call submitStageForValidation again. Do NOT mention technical issues. Respond with MAX 2-3 sentences confirming the artifact is ready for review."
                            : "⚠️ MANDATORY: Artifact is created successfully. Do NOT restate the draft content in chat. Do NOT output markdown headings, fenced code blocks, or paragraphs from the artifact. Do NOT mention technical issues, errors, partial saves, or source/title problems — the operation SUCCEEDED. Respond with MAX 2-3 sentences ONLY: (1) confirm artifact was created, (2) direct user to review in artifact panel, (3) call submitStageForValidation() NOW.",
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error)
                    Sentry.captureException(error, { tags: { subsystem: "artifact" } })
                    console.error("[createArtifact] Failed:", errorMessage)
                    return {
                        success: false,
                        error: `Gagal membuat artifact: ${errorMessage}`,
                    }
                }
            },
        }),
        updateArtifact: tool({
            description: `Update an existing artifact with new content, creating a new version.

⚠️ WAJIB gunakan tool ini untuk artifact yang ditandai 'invalidated' (karena rewind).
JANGAN gunakan createArtifact untuk artifact yang sudah ada - gunakan updateArtifact.

USE THIS TOOL WHEN:
✓ User meminta revisi artifact yang sudah ada
✓ Artifact ditandai 'invalidated' setelah rewind ke stage sebelumnya
✓ User ingin memperbaiki atau mengubah konten artifact sebelumnya
✓ Perlu membuat versi baru dari artifact yang sudah ada

Tool ini akan:
1. Membuat versi baru dari artifact (immutable versioning)
2. Versi baru otomatis bersih dari flag invalidation
3. Versi lama tetap tersimpan sebagai history

PENTING: Gunakan artifactId yang ada di context percakapan atau yang diberikan AI sebelumnya.`,
            inputSchema: z.object({
                artifactId: z.string()
                    .describe("ID of the artifact to update. Must be an existing artifact."),
                content: z.string().min(10)
                    .describe("New content for the artifact (replaces previous content)"),
                title: z.string().max(200).optional()
                    .describe("New title (optional). If not provided, previous title is retained."),
                sources: z.array(z.object({
                    url: z.string(),
                    title: z.string(),
                    publishedAt: z.number().optional(),
                })).optional()
                    .describe("Web sources if update is based on web search. If not provided, sources from previous version are retained."),
            }),
            execute: async ({ artifactId: modelArtifactId, content, title, sources }) => {
                try {
                    // Route-level auto-rescue for updateArtifact path.
                    // convex/artifacts.ts:update does NOT go through paperSessions.updateStageData,
                    // so the backend auto-rescue in updateStageData does not cover this path.
                    // Uses autoRescueRevision (NOT requestRevision) to preserve trigger provenance.
                    if (paperSession) {
                        const updateRescue = await executeAutoRescue({
                            paperSession,
                            source: "updateArtifact",
                            userId: userId as Id<"users">,
                            fetchMutationWithToken,
                            fetchQueryWithToken,
                            conversationId,
                        })
                        if (updateRescue.error) {
                            return {
                                success: false,
                                errorCode: "AUTO_RESCUE_FAILED",
                                retryable: true,
                                error: "Failed to auto-transition stage to revision. Try calling requestRevision explicitly first.",
                                nextAction: "Call requestRevision(feedback) first, then retry updateArtifact.",
                            }
                        }
                        if (updateRescue.rescued && updateRescue.refreshedSession) {
                            Object.assign(paperSession, updateRescue.refreshedSession)
                        }
                    }

                    // Auto-resolve artifactId from stage data when model supplies invalid ID
                    let artifactId = modelArtifactId
                    if (paperSession) {
                        const stageDataMap = paperSession.stageData as Record<string, Record<string, unknown> | undefined> | undefined
                        const stageArtifactId = stageDataMap?.[paperSession.currentStage]?.artifactId as string | undefined
                        if (stageArtifactId && stageArtifactId !== modelArtifactId) {
                            console.warn(`[updateArtifact] Auto-resolved artifactId: model supplied "${modelArtifactId}", using stage artifactId "${stageArtifactId}"`)
                            artifactId = stageArtifactId
                        }
                    }

                    const refValidation = skill.checkReferences({
                        toolName: 'updateArtifact',
                        claimedSources: sources,
                        availableSources: recentSourcesList,
                        hasRecentSources: hasRecentSourcesInDb,
                    })
                    logAiTelemetry({
                        token: convexToken,
                        userId: userId as Id<"users">,
                        conversationId: conversationId as Id<"conversations">,
                        provider: modelProvider as "vercel-gateway" | "openrouter",
                        model: "tool-validation",
                        isPrimaryProvider: true,
                        failoverUsed: false,
                        mode: isPaperMode ? "paper" : "normal",
                        success: refValidation.valid,
                        latencyMs: 0,
                        searchSkillApplied: true,
                        searchSkillName: "reference-integrity",
                        searchSkillAction: refValidation.valid ? "validated" : "rejected",
                        referencesClaimed: sources?.length ?? 0,
                        referencesMatched: refValidation.valid ? (sources?.length ?? 0) : 0,
                    })
                    if (!refValidation.valid) {
                        console.warn(`[updateArtifact][ref-validation-rejected] stage=${paperSession?.currentStage} error=${refValidation.error}`)
                        return {
                            success: false,
                            error: refValidation.error,
                        }
                    }

                    // Source-body parity check: content reference inventory must match attached sources
                    if (sources && sources.length > 0) {
                        const parityCheck = checkSourceBodyParity({ content, sources })
                        if (!parityCheck.valid) {
                            console.warn(`[source-body-parity-rejected] tool=updateArtifact stage=${paperSession?.currentStage} level=${parityCheck.level} sources=${sources.length}`)
                            return {
                                success: false,
                                errorCode: "SOURCE_BODY_PARITY_MISMATCH",
                                retryable: true,
                                error: parityCheck.error,
                                nextAction: "Fix the artifact content to match attached sources count, or add an explicit subset disclaimer.",
                            }
                        }
                    }

                    const result = await retryMutation(
                        () => fetchMutationWithToken(api.artifacts.update, {
                            artifactId: artifactId as Id<"artifacts">,
                            userId: userId as Id<"users">,
                            content,
                            title,
                            sources,
                        }),
                        "artifacts.update"
                    )

                    console.log("[F1-F6-TEST] updateArtifact", { stage: paperSession?.currentStage, artifactId })
                    if (paperToolTracker) paperToolTracker.sawUpdateArtifactSuccess = true
                    paperTurnObservability.updateArtifactAtMs = Date.now()
                    console.info("[PAPER][artifact-tool-success]", {
                        stage: paperSession?.currentStage,
                        artifactId,
                        mode: "update",
                        hadLeakageBeforeArtifact: paperTurnObservability.firstLeakageAtMs !== null,
                        firstLeakageMatch: paperTurnObservability.firstLeakageMatch,
                    })
                    return {
                        success: true,
                        newArtifactId: result.artifactId,
                        oldArtifactId: artifactId,
                        version: result.version,
                        message: `Artifact berhasil di-update ke versi ${result.version}. User dapat melihat versi baru di panel artifact.`,
                        nextAction: "⚠️ Artifact updated. Do NOT repeat the revised content in chat. Respond with MAX 2-3 sentences confirming the update and directing user to review in artifact panel.",
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error)
                    Sentry.captureException(error, { tags: { subsystem: "artifact" } })
                    console.error("[updateArtifact] Failed:", errorMessage)
                    return {
                        success: false,
                        error: `Gagal update artifact: ${errorMessage}`,
                    }
                }
            },
        }),
        readArtifact: tool({
            description: `Read the full content of an artifact by its ID. Use this tool when you need to reference complete artifact content rather than the truncated summaries in the system prompt.

USE THIS TOOL WHEN:
✓ You need to re-read a previous stage's artifact as reference material
✓ The user asks about specific content within an artifact
✓ You need to check full content before writing a revision or the next stage
✓ You need to verify details that may be truncated in the artifact summary

Returns: title, type, version, full content, and sources (if any).
Artifact IDs are available from ARTIFACT SUMMARY in the system prompt or from getCurrentPaperState().`,
            inputSchema: z.object({
                artifactId: z.string()
                    .describe("The artifact ID to read."),
            }),
            execute: async ({ artifactId }) => {
                if (!artifactId?.trim()) {
                    return { success: false, error: "artifactId must not be empty." }
                }
                try {
                    const artifact = await fetchQueryWithToken(api.artifacts.get, {
                        artifactId: artifactId as Id<"artifacts">,
                        userId: userId as Id<"users">,
                    })

                    if (!artifact) {
                        return {
                            success: false,
                            error: "Artifact tidak ditemukan atau tidak memiliki akses.",
                        }
                    }

                    return {
                        success: true,
                        artifactId: artifact._id,
                        title: artifact.title,
                        type: artifact.type,
                        version: artifact.version,
                        content: artifact.content,
                        format: artifact.format ?? null,
                        sources: artifact.sources ?? [],
                        createdAt: artifact.createdAt,
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error)
                    Sentry.captureException(error, { tags: { subsystem: "artifact" } })
                    console.error("[readArtifact] Failed:", errorMessage)
                    return {
                        success: false,
                        error: `Gagal membaca artifact: ${errorMessage}`,
                    }
                }
            },
        }),
        renameConversationTitle: tool({
            description: `Ganti judul conversation secara final ketika kamu benar-benar sudah yakin dengan tujuan utama user.

Aturan:
- Maksimal 2 kali update judul oleh AI per conversation.
- Jangan panggil kalau user sudah mengganti judul sendiri.
- Panggil ini hanya ketika kamu yakin judul finalnya stabil (tidak akan berubah lagi).
- Judul maksimal 50 karakter.`,
            inputSchema: z.object({
                title: z.string().min(3).max(50).describe("Judul final conversation (maks 50 karakter)"),
            }),
            execute: async ({ title }) => {
                try {
                    const conversation = await fetchQueryWithToken(api.conversations.getConversation, {
                        conversationId: conversationId as Id<"conversations">,
                    })

                    if (!conversation) {
                        return { success: false, error: "Conversation tidak ditemukan" }
                    }
                    if (conversation.userId !== userId) {
                        return { success: false, error: "Tidak memiliki akses" }
                    }
                    if (conversation.titleLocked) {
                        return { success: false, error: "Judul sudah dikunci oleh user" }
                    }

                    const currentCount = conversation.titleUpdateCount ?? 0
                    if (currentCount >= 2) {
                        return { success: false, error: "Batas update judul AI sudah tercapai" }
                    }
                    if (currentCount < 1) {
                        return { success: false, error: "Judul awal belum terbentuk" }
                    }

                    const minPairsForFinalTitle = Number.parseInt(
                        process.env.CHAT_TITLE_FINAL_MIN_PAIRS ?? "3",
                        10
                    )
                    const effectiveMinPairs = Number.isFinite(minPairsForFinalTitle)
                        ? minPairsForFinalTitle
                        : 3

                    const counts = await fetchQueryWithToken(api.messages.countMessagePairsForConversation, {
                        conversationId: conversationId as Id<"conversations">,
                        userId,
                    })

                    if ((counts?.pairCount ?? 0) < effectiveMinPairs) {
                        return {
                            success: false,
                            error: `Belum cukup putaran percakapan (butuh minimal ${effectiveMinPairs} pasang pesan)`,
                        }
                    }

                    await fetchMutationWithToken(api.conversations.updateConversationTitleFromAI, {
                        conversationId: conversationId as Id<"conversations">,
                        userId,
                        title,
                        nextTitleUpdateCount: 2,
                    })

                    return { success: true, title: title.trim().slice(0, 50) }
                } catch (error) {
                    console.error("Failed to rename conversation title:", error)
                    return { success: false, error: "Gagal mengubah judul conversation" }
                }
            },
        }),
        // Task Group 3: Paper Writing Workflow Tools
        ...createPaperTools({
            userId: userId as Id<"users">,
            conversationId: conversationId as Id<"conversations">,
            convexToken,
            availableSources: recentSourcesList,
            hasRecentSources: hasRecentSourcesInDb,
            toolTracker: paperToolTracker,
        }),
    } satisfies ToolSet

    return tools
}
