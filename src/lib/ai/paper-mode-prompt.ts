import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { getStageLabel, type PaperStageId } from "../../../convex/paperSessions/constants";
import { getStageInstructions, formatStageData } from "./paper-stages";

type StageStatus = "drafting" | "pending_validation" | "approved" | "revision";

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

        return `
---
[PAPER WRITING MODE]
Tahap: ${stageLabel} (${stage}) | Status: ${status}
${revisionNote}${pendingNote}
ATURAN UMUM:
- DISKUSI DULU sebelum drafting - jangan langsung generate output lengkap
- Gunakan google_search secara selektif jika membutuhkan literatur tambahan (opsional)
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
