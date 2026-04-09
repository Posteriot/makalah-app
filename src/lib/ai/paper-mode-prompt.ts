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

        // ── Parallel query batch: all three depend on session but not on each other ──
        const parallelStart = Date.now();
        const [stageInstructionsResult, artifactsResult, invalidatedResult] = await Promise.allSettled([
            // 1. Resolve stage instructions
            (async () => {
                const start = Date.now();
                const resolution = await resolveStageInstructions({
                    stage,
                    fallbackInstructions: fallbackStageInstructions,
                    convexToken,
                    requestId,
                });
                logPaperPromptLatency("paperPrompt.resolveStageInstructions", start, {
                    source: resolution.source,
                });
                return resolution;
            })(),

            // 2. List artifacts
            (async () => {
                const start = Date.now();
                const allArtifacts = await fetchQuery(
                    api.artifacts.listByConversation,
                    { conversationId, userId: session.userId },
                    convexOptions
                );
                logPaperPromptLatency("paperPrompt.listArtifacts", start, {
                    count: Array.isArray(allArtifacts) ? allArtifacts.length : 0,
                });
                return allArtifacts;
            })(),

            // 3. Get invalidated artifacts
            (async () => {
                const start = Date.now();
                const invalidated = await fetchQuery(
                    api.artifacts.getInvalidatedByConversation,
                    { conversationId, userId: session.userId },
                    convexOptions
                );
                logPaperPromptLatency("paperPrompt.getInvalidatedArtifacts", start, {
                    count: Array.isArray(invalidated) ? invalidated.length : 0,
                });
                return invalidated;
            })(),
        ]);
        logPaperPromptLatency("paperPrompt.parallelBatch", parallelStart, {
            stageInstructions: stageInstructionsResult.status,
            artifacts: artifactsResult.status,
            invalidated: invalidatedResult.status,
        });

        // ── Extract results with graceful fallbacks ──

        // Stage instructions: critical — if failed, use fallback
        const stageInstructions = stageInstructionsResult.status === "fulfilled"
            ? stageInstructionsResult.value.instructions
            : (() => {
                console.error("Error resolving stage instructions:", (stageInstructionsResult as PromiseRejectedResult).reason);
                return fallbackStageInstructions;
            })();
        const stageInstructionSource = stageInstructionsResult.status === "fulfilled"
            ? stageInstructionsResult.value.source
            : "fallback";
        const skillResolverFallback = stageInstructionsResult.status === "fulfilled"
            ? stageInstructionsResult.value.skillResolverFallback
            : true;
        const activeSkillId = stageInstructionsResult.status === "fulfilled"
            ? stageInstructionsResult.value.skillId
            : undefined;
        const activeSkillVersion = stageInstructionsResult.status === "fulfilled"
            ? stageInstructionsResult.value.version
            : undefined;
        const fallbackReason = stageInstructionsResult.status === "fulfilled"
            ? stageInstructionsResult.value.fallbackReason
            : "parallel_batch_failure";

        // Format stageData into readable context
        const formattedData = formatStageData(session.stageData, stage);

        // Artifact summaries: non-critical — empty string on failure
        let artifactSummariesSection = "";
        let currentArtifactContext = "";
        if (artifactsResult.status === "fulfilled") {
            try {
                const allArtifacts = artifactsResult.value;
                const artifactMap = new Map<string, { content: string; version: number; title: string; artifactId: string }>();
                for (const a of allArtifacts) {
                    if (!a.invalidatedAt) {
                        artifactMap.set(String(a._id), { content: a.content, version: a.version, title: a.title, artifactId: String(a._id) });
                    }
                }

                const stageData = session.stageData as Record<string, { artifactId?: string; validatedAt?: number; superseded?: boolean }>;
                const completedArtifacts: Array<{ stageLabel: string; content: string; version: number; title: string; artifactId: string }> = [];

                for (const stageId of STAGE_ORDER) {
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

                // Current artifact context: inject full content during revision/pending_validation.
                // The artifact summaries loop above skips the current stage (line 224) and requires
                // validatedAt (line 226), so the artifact being revised is never visible to the model.
                // This section bypasses both filters to give the model the content it needs to revise.
                if (status === "revision" || status === "pending_validation") {
                    const currentStageArtifactId = stageData[stage]?.artifactId;
                    if (currentStageArtifactId) {
                        const currentArtifact = artifactMap.get(currentStageArtifactId);
                        if (currentArtifact) {
                            currentArtifactContext = `\n📄 CURRENT ARTIFACT — this is the artifact you must revise (artifactId: ${currentStageArtifactId}, version: ${currentArtifact.version}, title: "${currentArtifact.title}"):
---
${currentArtifact.content}
---
Use updateArtifact with the FULL revised content based on user feedback. Do NOT regenerate from scratch unless explicitly asked.\n`;
                        }
                    }
                }
            } catch (err) {
                console.error("Error building artifact summaries:", err);
            }
        } else {
            console.error("Error fetching artifacts:", (artifactsResult as PromiseRejectedResult).reason);
        }

        // Invalidated artifacts: non-critical — empty string on failure
        let invalidatedArtifactsContext = "";
        if (invalidatedResult.status === "fulfilled") {
            try {
                invalidatedArtifactsContext = getInvalidatedArtifactsContext(invalidatedResult.value);
            } catch (err) {
                console.error("Error processing invalidated artifacts:", err);
            }
        } else {
            console.error("Error fetching invalidated artifacts:", (invalidatedResult as PromiseRejectedResult).reason);
        }

        // Inline revision context
        const revisionNote = status === "revision"
            ? `\n⚠️ REVISION MODE: User requested changes. Pay attention to their feedback in the latest message.

Tool sequence:
  1. updateStageData — only if structured stage data changed.
  2. updateArtifact — use this for ALL revisions including full content replacement. Do NOT use createArtifact unless artifact is missing/inaccessible in DB.
  3. submitStageForValidation — SAME TURN as updateArtifact. Do not stop early.

${stage === "daftar_pustaka" ? "For daftar_pustaka: call compileDaftarPustaka(mode: 'persist') before step 1.\n" : ""}`
            : "";

        // Inline pending validation note with revision intent detection
        const pendingNote = status === "pending_validation"
            ? `\n⏳ AWAITING VALIDATION: Draft for ${getStageLabel(stage as PaperStageId)} has been submitted.

IF user asks a question or wants discussion:
  → Answer normally. Do NOT call any stage tools.

IF user requests revision, correction, edit, regeneration, or sends instructions that clearly mean "change the artifact":
  → Call requestRevision(feedback: "<user's revision intent>") FIRST.
  → After status transitions to "revision", proceed:
    1. updateStageData (only if structured data changed)
    2. updateArtifact (with revised content — full replacement if needed)
    3. submitStageForValidation
  → Complete steps 2-3 in the SAME TURN. Do not stop after updateArtifact.

Do NOT call updateStageData, createArtifact, or updateArtifact while status is still pending_validation. Call requestRevision first.

REVISION INTENT DETECTION:
Priority: semantic intent — "user wants to change the artifact content".
Strong signal examples (not exhaustive): "revisi", "edit", "ubah", "ganti", "perbaiki", "resend", "generate ulang", "tulis ulang", "koreksi", "buat ulang", "ulangi", "dari awal", or specific corrections like "paragraf kedua harus...", "tambahkan...", "hapus bagian...".
These keywords are examples only. The primary criterion is whether the user's semantic intent is to change the artifact content.
NOT revision intent: questions about content, discussion, status inquiry.
When uncertain: ask ONLY if the difference between "discuss" vs "revise" is truly material and ambiguous. If user gives concrete change instructions, treat as revision intent without asking. Bias toward action.\n`
            : "";
        // Check if previous turn saved data but skipped artifact creation
        const currentStageData = (session.stageData as Record<string, Record<string, unknown> | undefined>)?.[stage as string];
        const hasArtifactForStage = !!currentStageData?.artifactId;
        const hasDataButNoArtifact = status === "drafting"
            && currentStageData
            && Object.keys(currentStageData).filter(k => k !== "referensiAwal" && k !== "referensiPendukung" && k !== "webSearchReferences").length > 0
            && !hasArtifactForStage;
        const artifactMissingNote = hasDataButNoArtifact
            ? `\n⚠️ CRITICAL: Stage data was saved but NO ARTIFACT exists yet. You MUST call createArtifact() NOW with the saved data, then call submitStageForValidation() in this SAME turn. Do NOT write more prose — create the artifact IMMEDIATELY. Do NOT claim you already created an artifact — check the tool results.\n`
            : !hasArtifactForStage && status === "drafting" && stage !== "gagasan"
                ? `\n⚠️ IMPORTANT: No artifact exists for this stage yet. When you are ready to save the draft, you MUST call updateStageData + createArtifact + submitStageForValidation in the SAME turn. Do NOT claim artifact was created unless you actually called the createArtifact tool and received a success response.\n`
                : "";

        const dirtyContextNote = `\n🔄 DIRTY CONTEXT: ${isDirty ? "true" : "false"}\n`;
        const dirtySyncContractNote = status === "pending_validation" && isDirty
            ? "\n⚠️ SYNC CONTRACT: Stage data is not yet synced. If user asks to sync or continue from state, you MUST explain that the update cannot be finalized until the user requests a revision first.\n"
            : "";

        console.log("[F1-F6-TEST] PaperPrompt", { stage, status, stageInstructionSource, activeSkillId: activeSkillId ?? "fallback", hasArtifactSummaries: !!artifactSummariesSection, hasCurrentArtifact: !!currentArtifactContext })
        logPaperPromptLatency("paperPrompt.total", paperPromptStart, {
            hasPrompt: true,
            stage,
        });
        return {
            prompt: `
---
[PAPER WRITING MODE]
Tahap: ${stageLabel} (${stage}) | Status: ${status}
${revisionNote}${pendingNote}${currentArtifactContext}${artifactMissingNote}${dirtyContextNote}${dirtySyncContractNote}${invalidatedArtifactsContext}
GENERAL RULES:
- STAGE MODES:
  - gagasan = discussion hub + proactive dual search (academic + non-academic)
  - topik = derivation only from gagasan material; do NOT initiate new search
  - tinjauan_literatur = proactive deep academic search + synthesis
  - all other stages = review mode; generate from approved material, no new search
- DISCUSS FIRST only for gagasan and topik. In review-mode stages, draft directly from existing material and present for review.
- MANDATORY: EVERY response MUST end with a yaml-spec interactive card presenting the next action options to the user. This is your visual language — never leave the user without a clear next step. Never write options as numbered lists or bullet points when the card is available. This applies to ALL turns including search result turns — after presenting findings, always end with a choice card for what to do next.
  EXCEPTION: Do NOT output a choice card when the response already calls submitStageForValidation(), when the next step is entirely handled by the PaperValidationPanel (approve/revise), or when stage === "completed". In that case, end with prose only. The choice card is for CONTENT decisions — stage lifecycle decisions belong to the validation panel.
- Discussion stages: write full paper content AFTER discussion is mature. Review stages: generate content IMMEDIATELY from approved material and create artifact as v1 working draft.
- ⚠️ ALL references and factual data MUST come from web search — NEVER hallucinate/fabricate
- Web search: If the user explicitly asks to search (e.g. "cari referensi", "search for papers"), proceed immediately — do NOT ask for confirmation again. Only ask for confirmation when YOU initiate a search that the user did not request. Do NOT say "please wait" or promise the search will happen automatically — either search now or ask first.
- SEARCH TURN CONTRACT:
  - If web search runs in THIS turn and sources are available, your final response MUST present actual findings from those results in the same turn.
  - If web search runs in THIS turn, do NOT end with transition text such as saying you will search, you are searching, or asking the user to wait.
  - Treat AVAILABLE_WEB_SOURCES and fresh search citations as proof that search has already completed for this turn.
- IMPORTANT: Web search and function tools CANNOT run in the same turn. After search results arrive, use function tools to save findings.
- Do NOT call any function tool (updateStageData, createArtifact, submitStageForValidation) in a turn where you request web search. Complete search first, then save in the next turn.
- Save progress with updateStageData() — in discussion stages: after discussion is mature; in review stages: in the SAME TURN as createArtifact (v1 generation)
- INCREMENTAL PROGRESS: Call updateStageData() after every significant decision or milestone — not just at the end. This keeps task progress visible to the user. Partial data is acceptable. IMPORTANT: Do NOT call updateStageData in the same turn as web search — save in the NEXT turn after search findings are presented.
- For cross-stage reference audit, you MAY call compileDaftarPustaka({ mode: "preview" }) at any stage. This mode does not persist to DB.
- Bibliography finalization MUST use compileDaftarPustaka({ mode: "persist" }) and is only valid when active stage = daftar_pustaka.
- ARTIFACT WORKFLOW:
  - Discussion stages (gagasan, topik): createArtifact AFTER discussion is mature and content is agreed. Call in the SAME TURN as updateStageData.
  - Review stages (all others): createArtifact EARLY as v1 working draft in the SAME TURN as updateStageData. Use updateArtifact for revisions (v2, v3...). Chat should contain brief summary + pointer to artifact, NOT the full draft text repeated in chat.
  - Include 'sources' from AVAILABLE_WEB_SOURCES if available.
  - Do NOT prefix artifact titles with "Draf" or "Draft" — artifacts ARE the stage output.
- INTERNAL FAILURE POLICY: Do NOT expose tool retries, internal repair attempts, partial backend failures, or technical diagnostics to the user if the final workflow succeeds. Only mention an error when the turn cannot complete and the user must take action. If a tool fails but a later retry/recovery succeeds, present only the successful final outcome.
- For artifacts, MUST use references already stored in stageData (see context below)
- FORBIDDEN to introduce new references without web search first
- submitStageForValidation():
  - All stages: call in the SAME TURN as createArtifact. User approves or requests revision via the PaperValidationPanel.
  - topik: ONLY after user confirms topic direction via choice card.
  - Review stages (all others): Present for validation IMMEDIATELY after v1 artifact is created. User approves or requests revision via the validation panel. Do NOT wait for explicit chat confirmation.
- Do not advance to next stage before currentStage changes in database
- If status is pending_validation and DIRTY CONTEXT = true, MUST state "data not yet synced" and direct user to request revision so sync/draft update can proceed
- ⚠️ CRITICAL: All function tools (updateStageData, createArtifact, submitStageForValidation, etc.) MUST be called via the tool calling API, NEVER written as text or code blocks. Writing a tool name as text does NOT execute it — the action FAILS silently.

⚠️ IN-TEXT CITATION FORMAT (APA) — MANDATORY EVERY TURN:
- STRICTLY FORBIDDEN to use DOMAIN/WEBSITE name as author in citations
- ❌ WRONG: (Kuanta.id, n.d.), (Graphie.co.id, n.d.), (Researchgate.net, n.d.), (Kompas.com, 2024)
- If web search returns only URL without author:
  1. Look for the ACTUAL AUTHOR NAME in the search result page
  2. If author not found → use ARTICLE TITLE (abbreviated, in quotes)
  3. If year not found → use "n.d."
- ✅ CORRECT: (Wijaya, 2023), ("Dampak AI pada Pembelajaran", 2024), (Kementerian Pendidikan, n.d.)
- When in doubt between domain vs real author → DO NOT CITE, just mention the information without citation mark

PAPER VALIDATION PANEL:
- After submitStageForValidation, the user sees a panel with approve and revise buttons.
- If user clicks revise, they type feedback in a dedicated textarea. This feedback arrives as their next chat message.
- Do NOT ask "would you like to approve or revise?" — the panel already presents this choice.

${stageInstructions}
${memoryDigest}
COMPLETED STAGES CONTEXT & CHECKLIST:
Context compression active: max 5 refs, max 5 citations, detailed summary only for last 3 completed stages.
${formattedData}
${artifactSummariesSection ? `\n${artifactSummariesSection}` : ""}
---
`,
            skillResolverFallback: skillResolverFallback,
            stageInstructionSource: stageInstructionSource,
            activeSkillId: activeSkillId,
            activeSkillVersion: activeSkillVersion,
            fallbackReason: fallbackReason,
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
