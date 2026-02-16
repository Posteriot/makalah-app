import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { STAGE_ORDER, getStageLabel, type PaperStageId } from "../../../convex/paperSessions/constants";
import { getStageInstructions, formatStageData, formatArtifactSummaries } from "./paper-stages";

type StageStatus = "drafting" | "pending_validation" | "approved" | "revision";

// Type for invalidated artifact from query
interface InvalidatedArtifact {
    _id: Id<"artifacts">;
    title: string;
    type: string;
    invalidatedAt?: number;
    invalidatedByRewindToStage?: string;
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
        .map((a) => `  - ID: ${a._id} | Judul: "${a.title}" | Tipe: ${a.type}`)
        .join("\n");

    return `
⚠️ ARTIFACT YANG PERLU DI-UPDATE (karena rewind):
${artifactsList}

INSTRUKSI PENTING:
- WAJIB gunakan updateArtifact (BUKAN createArtifact) untuk merevisi artifact di atas
- Artifact tersebut sudah ada tapi perlu diperbarui karena user melakukan rewind ke tahap sebelumnya
- Pastikan konten baru konsisten dengan keputusan di tahap yang di-rewind
`;
}

/**
 * Generate paper mode system prompt if conversation has active paper session.
 * Simplified approach: goal-oriented instructions + inline revision context.
 */
export const getPaperModeSystemPrompt = async (
    conversationId: Id<"conversations">,
    convexToken?: string
) => {
    try {
        const convexOptions = convexToken ? { token: convexToken } : undefined;
        const session = await fetchQuery(
            api.paperSessions.getByConversation,
            { conversationId },
            convexOptions
        );
        if (!session) return "";

        const stage = session.currentStage as PaperStageId | "completed";
        const status = session.stageStatus as StageStatus;
        const stageLabel = getStageLabel(stage);

        // Get stage-specific instructions
        const stageInstructions = getStageInstructions(stage);

        // Format stageData into readable context
        const formattedData = formatStageData(session.stageData, stage);

        // Build artifact summaries from completed stages
        let artifactSummariesSection = "";
        try {
            const allArtifacts = await fetchQuery(
                api.artifacts.listByConversation,
                { conversationId, userId: session.userId },
                convexOptions
            );

            // Map artifactId -> artifact content for quick lookup
            const artifactMap = new Map<string, { content: string }>();
            for (const a of allArtifacts) {
                // Only include non-invalidated, latest-version artifacts
                if (!a.invalidatedAt) {
                    artifactMap.set(String(a._id), { content: a.content });
                }
            }

            // Collect artifacts from completed (validated) stages
            const stageData = session.stageData as Record<string, { artifactId?: string; validatedAt?: number; superseded?: boolean }>;
            const completedArtifacts: Array<{ stageLabel: string; content: string }> = [];

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
            ? "\n⚠️ MODE REVISI: User meminta perbaikan. Perhatikan feedback mereka di pesan terakhir.\n"
            : "";

        // Inline pending validation note
        const pendingNote = status === "pending_validation"
            ? "\n⏳ MENUNGGU VALIDASI: Draf sudah dikirim. Tunggu user approve/revise sebelum lanjut.\n"
            : "";

        // Query invalidated artifacts (Rewind Feature)
        // Gracefully handle errors - don't break the prompt if query fails
        let invalidatedArtifactsContext = "";
        try {
            const invalidatedArtifacts = await fetchQuery(
                api.artifacts.getInvalidatedByConversation,
                { conversationId, userId: session.userId },
                convexOptions
            );
            invalidatedArtifactsContext = getInvalidatedArtifactsContext(invalidatedArtifacts);
        } catch (err) {
            console.error("Error fetching invalidated artifacts:", err);
            // Continue without invalidated artifacts context
        }

        return `
---
[PAPER WRITING MODE]
Tahap: ${stageLabel} (${stage}) | Status: ${status}
${revisionNote}${pendingNote}${invalidatedArtifactsContext}
ATURAN UMUM:
- DISKUSI DULU sebelum drafting - jangan langsung generate output lengkap
- Setelah diskusi matang, tulis paper utuh untuk tahap aktif sesuai konteks yang sudah disepakati
- ⚠️ WAJIB gunakan google_search untuk SEMUA referensi dan data faktual - TIDAK BOLEH di-hallucinate
- Jika memakai google_search, lakukan di turn terpisah: turn ini hanya untuk pencarian + rangkum temuan. Jangan panggil updateStageData/createArtifact/submitStageForValidation di turn yang sama.
- Simpan progres dengan updateStageData() setelah diskusi matang
- Buat artifact dengan createArtifact() untuk output yang sudah disepakati
- Untuk artifact, WAJIB pakai referensi yang sudah tersimpan di stageData (lihat konteks di bawah)
- DILARANG membuat referensi baru tanpa websearch terlebih dahulu
- submitStageForValidation() HANYA setelah user EKSPLISIT konfirmasi puas
- Jangan lompat ke tahap berikutnya sebelum currentStage berubah di database

${stageInstructions}

KONTEKS TAHAP SELESAI & CHECKLIST:
${formattedData}
${artifactSummariesSection ? `\n${artifactSummariesSection}` : ""}
---
`;
    } catch (error) {
        console.error("Error fetching paper session for prompt:", error);
        return "";
    }
};
