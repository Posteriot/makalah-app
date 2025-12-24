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

interface AbstrakData {
    ringkasanPenelitian?: string;
    keywords?: string[];
    wordCount?: number;
    validatedAt?: number;
    revisionCount?: number;
}

interface SitasiAPA {
    inTextCitation: string;
    fullReference: string;
    url?: string;
}

interface PendahuluanData {
    latarBelakang?: string;
    rumusanMasalah?: string;
    researchGapAnalysis?: string;
    tujuanPenelitian?: string;
    sitasiAPA?: SitasiAPA[];
    validatedAt?: number;
    revisionCount?: number;
}

interface Referensi {
    title: string;
    authors?: string;
    year?: number;
    url?: string;
    inTextCitation?: string;
    isFromPhase1?: boolean;
}

interface TinjauanLiteraturData {
    kerangkaTeoretis?: string;
    reviewLiteratur?: string;
    gapAnalysis?: string;
    referensi?: Referensi[];
    validatedAt?: number;
    revisionCount?: number;
}

interface MetodologiData {
    desainPenelitian?: string;
    metodePerolehanData?: string;
    teknikAnalisis?: string;
    etikaPenelitian?: string;
    pendekatanPenelitian?: "kualitatif" | "kuantitatif" | "mixed";
    validatedAt?: number;
    revisionCount?: number;
}

interface StageData {
    gagasan?: GagasanData;
    topik?: TopikData;
    abstrak?: AbstrakData;
    pendahuluan?: PendahuluanData;
    tinjauan_literatur?: TinjauanLiteraturData;
    metodologi?: MetodologiData;
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

    // Format Phase 1 stages
    if (stageData.gagasan && hasContent(stageData.gagasan)) {
        sections.push(formatGagasanData(stageData.gagasan, currentStage === "gagasan"));
    }
    if (stageData.topik && hasContent(stageData.topik)) {
        sections.push(formatTopikData(stageData.topik, currentStage === "topik"));
    }

    // Format Phase 2 stages
    if (stageData.abstrak && hasContent(stageData.abstrak)) {
        sections.push(formatAbstrakData(stageData.abstrak, currentStage === "abstrak"));
    }
    if (stageData.pendahuluan && hasContent(stageData.pendahuluan)) {
        sections.push(formatPendahuluanData(stageData.pendahuluan, currentStage === "pendahuluan"));
    }
    if (stageData.tinjauan_literatur && hasContent(stageData.tinjauan_literatur)) {
        sections.push(formatTinjauanLiteraturData(stageData.tinjauan_literatur, currentStage === "tinjauan_literatur"));
    }
    if (stageData.metodologi && hasContent(stageData.metodologi)) {
        sections.push(formatMetodologiData(stageData.metodologi, currentStage === "metodologi"));
    }

    if (sections.length === 0) {
        return "Belum ada data dari tahap sebelumnya.";
    }

    return sections.join("\n\n");
}

/**
 * Check if a stage data object has any meaningful content
 */
function hasContent(
    data: GagasanData | TopikData | AbstrakData | PendahuluanData | TinjauanLiteraturData | MetodologiData
): boolean {
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

    if (data.ideKasar) output += `Ide Kasar: ${data.ideKasar}\n`;
    if (data.analisis) output += `Analisis: ${data.analisis}\n`;
    if (data.angle) output += `Angle Penulisan: ${data.angle}\n`;
    if (data.novelty) output += `Kebaruan (Novelty): ${data.novelty}\n`;
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

    if (data.definitif) output += `Topik Definitif: ${data.definitif}\n`;
    if (data.angleSpesifik) output += `Angle Spesifik: ${data.angleSpesifik}\n`;
    if (data.argumentasiKebaruan) output += `Argumentasi Kebaruan: ${data.argumentasiKebaruan}\n`;
    if (data.researchGap) output += `Research Gap: ${data.researchGap}\n`;
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

/**
 * Format Abstrak stage data
 */
function formatAbstrakData(data: AbstrakData, isCurrentStage: boolean): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 3: ${getStageLabel("abstrak")} [${status}${revisions}] ===\n`;

    if (data.ringkasanPenelitian) output += `Ringkasan: ${data.ringkasanPenelitian}\n`;
    if (data.keywords && data.keywords.length > 0) {
        output += `Keywords: ${data.keywords.join(", ")}\n`;
    }
    if (data.wordCount) output += `Word Count: ${data.wordCount} kata\n`;

    return output.trim();
}

/**
 * Format Pendahuluan stage data
 */
function formatPendahuluanData(data: PendahuluanData, isCurrentStage: boolean): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 4: ${getStageLabel("pendahuluan")} [${status}${revisions}] ===\n`;

    if (data.latarBelakang) output += `Latar Belakang: ${data.latarBelakang}\n`;
    if (data.rumusanMasalah) output += `Rumusan Masalah: ${data.rumusanMasalah}\n`;
    if (data.researchGapAnalysis) output += `Research Gap Analysis: ${data.researchGapAnalysis}\n`;
    if (data.tujuanPenelitian) output += `Tujuan Penelitian: ${data.tujuanPenelitian}\n`;
    if (data.sitasiAPA && data.sitasiAPA.length > 0) {
        output += `Daftar Sitasi (${data.sitasiAPA.length}):\n`;
        data.sitasiAPA.forEach((cite, i) => {
            output += `  ${i + 1}. ${cite.inTextCitation} - ${cite.fullReference}\n`;
        });
    }

    return output.trim();
}

/**
 * Format Tinjauan Literatur stage data
 */
function formatTinjauanLiteraturData(data: TinjauanLiteraturData, isCurrentStage: boolean): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 5: ${getStageLabel("tinjauan_literatur")} [${status}${revisions}] ===\n`;

    if (data.kerangkaTeoretis) output += `Kerangka Teoretis: ${data.kerangkaTeoretis}\n`;
    if (data.reviewLiteratur) output += `Review Literatur: ${data.reviewLiteratur}\n`;
    if (data.gapAnalysis) output += `Gap Analysis: ${data.gapAnalysis}\n`;
    if (data.referensi && data.referensi.length > 0) {
        output += `Referensi (${data.referensi.length}):\n`;
        data.referensi.forEach((ref, i) => {
            const phase = ref.isFromPhase1 ? "[P1]" : "[NEW]";
            const authors = ref.authors ? ` - ${ref.authors}` : "";
            const year = ref.year ? ` (${ref.year})` : "";
            output += `  ${i + 1}. ${phase} ${ref.title}${authors}${year}\n`;
        });
    }

    return output.trim();
}

/**
 * Format Metodologi stage data
 */
function formatMetodologiData(data: MetodologiData, isCurrentStage: boolean): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 6: ${getStageLabel("metodologi")} [${status}${revisions}] ===\n`;

    if (data.pendekatanPenelitian) output += `Pendekatan: ${data.pendekatanPenelitian.toUpperCase()}\n`;
    if (data.desainPenelitian) output += `Desain Penelitian: ${data.desainPenelitian}\n`;
    if (data.metodePerolehanData) output += `Metode Perolehan Data: ${data.metodePerolehanData}\n`;
    if (data.teknikAnalisis) output += `Teknik Analisis: ${data.teknikAnalisis}\n`;
    if (data.etikaPenelitian) output += `Etika Penelitian: ${data.etikaPenelitian}\n`;

    return output.trim();
}
