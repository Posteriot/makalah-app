import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { getStageLabel, type PaperStageId } from "../../../convex/paperSessions/constants";
import { getStageInstructions, formatStageData } from "./paper-stages";

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
export const getPaperModeSystemPrompt = async (conversationId: Id<"conversations">) => {
    try {
        const session = await fetchQuery(api.paperSessions.getByConversation, { conversationId });
        if (!session) return "";

        const stage = session.currentStage as PaperStageId | "completed";
        const status = session.stageStatus as StageStatus;
        const stageLabel = getStageLabel(stage);

        // Get stage-specific instructions
        const stageInstructions = getStageInstructions(stage);

        // Format stageData into readable context
        const formattedData = formatStageData(session.stageData, stage);

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
                { conversationId, userId: session.userId }
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
- Gunakan google_search secara selektif jika membutuhkan literatur tambahan (opsional)
- Jika memakai google_search, lakukan di turn terpisah: turn ini hanya untuk pencarian + rangkum temuan. Jangan panggil updateStageData/createArtifact/submitStageForValidation di turn yang sama.
- Simpan progres dengan updateStageData() setelah diskusi matang
- Buat artifact dengan createArtifact() untuk output yang sudah disepakati
- submitStageForValidation() HANYA setelah user EKSPLISIT konfirmasi puas
- Jangan lompat ke tahap berikutnya sebelum currentStage berubah di database

${stageInstructions}

KONTEKS TAHAP SELESAI & CHECKLIST:
${formattedData}
---
`;
    } catch (error) {
        console.error("Error fetching paper session for prompt:", error);
        return "";
    }
};
