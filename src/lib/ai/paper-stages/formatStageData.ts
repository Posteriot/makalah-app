/**
 * Format Stage Data Helper
 *
 * Converts stageData object to human-readable string for system prompt injection.
 * Shows completed stages' summaries in a clear, structured format.
 */

import { getStageLabel, type PaperStageId } from "../../../../convex/paperSessions/constants";

interface ReferensiAwal {
    title: string;
    authors?: string;
    year?: number;
    url?: string;
}

interface GagasanData {
    ideKasar?: string;
    analisis?: string;
    angle?: string;
    novelty?: string;
    referensiAwal?: ReferensiAwal[];
    validatedAt?: number;
    revisionCount?: number;
}

interface ReferensiPendukung {
    title: string;
    authors?: string;
    year?: number;
    url?: string;
}

interface TopikData {
    definitif?: string;
    angleSpesifik?: string;
    argumentasiKebaruan?: string;
    researchGap?: string;
    referensiPendukung?: ReferensiPendukung[];
    validatedAt?: number;
    revisionCount?: number;
}

interface StageData {
    gagasan?: GagasanData;
    topik?: TopikData;
    // Future stages will be added here
    [key: string]: unknown;
}

/**
 * Format stageData object into a human-readable string.
 * Only includes stages that have actual content.
 */
export function formatStageData(
    stageData: StageData,
    currentStage: PaperStageId | "completed"
): string {
    const sections: string[] = [];

    // Format Gagasan data if exists
    if (stageData.gagasan && hasContent(stageData.gagasan)) {
        sections.push(formatGagasanData(stageData.gagasan, currentStage === "gagasan"));
    }

    // Format Topik data if exists
    if (stageData.topik && hasContent(stageData.topik)) {
        sections.push(formatTopikData(stageData.topik, currentStage === "topik"));
    }

    // Future stages formatting would go here...

    if (sections.length === 0) {
        return "Belum ada data dari tahap sebelumnya.";
    }

    return sections.join("\n\n");
}

/**
 * Check if a stage data object has any meaningful content
 */
function hasContent(data: GagasanData | TopikData): boolean {
    return Object.values(data).some(
        (v) => v !== undefined && v !== null && v !== "" &&
        !(Array.isArray(v) && v.length === 0)
    );
}

/**
 * Format Gagasan stage data
 */
function formatGagasanData(data: GagasanData, isCurrentStage: boolean): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 1: ${getStageLabel("gagasan")} [${status}${revisions}] ===\n`;

    if (data.ideKasar) {
        output += `Ide Kasar: ${data.ideKasar}\n`;
    }
    if (data.analisis) {
        output += `Analisis: ${data.analisis}\n`;
    }
    if (data.angle) {
        output += `Angle Penulisan: ${data.angle}\n`;
    }
    if (data.novelty) {
        output += `Kebaruan (Novelty): ${data.novelty}\n`;
    }
    if (data.referensiAwal && data.referensiAwal.length > 0) {
        output += `Referensi Awal:\n`;
        data.referensiAwal.forEach((ref, i) => {
            const authors = ref.authors ? ` - ${ref.authors}` : "";
            const year = ref.year ? ` (${ref.year})` : "";
            output += `  ${i + 1}. ${ref.title}${authors}${year}\n`;
        });
    }

    return output.trim();
}

/**
 * Format Topik stage data
 */
function formatTopikData(data: TopikData, isCurrentStage: boolean): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 2: ${getStageLabel("topik")} [${status}${revisions}] ===\n`;

    if (data.definitif) {
        output += `Topik Definitif: ${data.definitif}\n`;
    }
    if (data.angleSpesifik) {
        output += `Angle Spesifik: ${data.angleSpesifik}\n`;
    }
    if (data.argumentasiKebaruan) {
        output += `Argumentasi Kebaruan: ${data.argumentasiKebaruan}\n`;
    }
    if (data.researchGap) {
        output += `Research Gap: ${data.researchGap}\n`;
    }
    if (data.referensiPendukung && data.referensiPendukung.length > 0) {
        output += `Referensi Pendukung:\n`;
        data.referensiPendukung.forEach((ref, i) => {
            const authors = ref.authors ? ` - ${ref.authors}` : "";
            const year = ref.year ? ` (${ref.year})` : "";
            output += `  ${i + 1}. ${ref.title}${authors}${year}\n`;
        });
    }

    return output.trim();
}
