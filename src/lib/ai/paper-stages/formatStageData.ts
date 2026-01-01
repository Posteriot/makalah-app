/**
 * Format Stage Data Helper
 *
 * Converts stageData object to human-readable string for system prompt injection.
 * Shows completed stages' summaries in a clear, structured format.
 */

import { getStageLabel, type PaperStageId } from "../../../../convex/paperSessions/constants";
import type {
    AbstrakData,
    DaftarPustakaData,
    DiskusiData,
    ElaborasiData,
    GagasanData,
    HasilData,
    JudulData,
    KesimpulanData,
    LampiranData,
    MetodologiData,
    OutlineData,
    PendahuluanData,
    TinjauanLiteraturData,
    TopikData,
} from "../../paper/stage-types";

const SUMMARY_CHAR_LIMIT = 1000;

interface StageData {
    gagasan?: GagasanData;
    topik?: TopikData;
    abstrak?: AbstrakData;
    pendahuluan?: PendahuluanData;
    tinjauan_literatur?: TinjauanLiteraturData;
    metodologi?: MetodologiData;
    hasil?: HasilData;
    diskusi?: DiskusiData;
    kesimpulan?: KesimpulanData;
    daftar_pustaka?: DaftarPustakaData;
    lampiran?: LampiranData;
    judul?: JudulData;
    outline?: OutlineData;
    elaborasi?: ElaborasiData;
    [key: string]: unknown;
}

// Type guard union for hasContent()
type AllStageData =
    | GagasanData
    | TopikData
    | AbstrakData
    | PendahuluanData
    | TinjauanLiteraturData
    | MetodologiData
    | HasilData
    | DiskusiData
    | KesimpulanData
    | DaftarPustakaData
    | LampiranData
    | JudulData
    | OutlineData
    | ElaborasiData;

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
        const isCurrentStage = currentStage === "gagasan";
        const summaryMode = Boolean(stageData.gagasan.validatedAt && !isCurrentStage);
        sections.push(formatGagasanData(stageData.gagasan, isCurrentStage, summaryMode));
    }
    if (stageData.topik && hasContent(stageData.topik)) {
        const isCurrentStage = currentStage === "topik";
        const summaryMode = Boolean(stageData.topik.validatedAt && !isCurrentStage);
        sections.push(formatTopikData(stageData.topik, isCurrentStage, summaryMode));
    }

    // Format Phase 2 stages
    if (stageData.abstrak && hasContent(stageData.abstrak)) {
        const isCurrentStage = currentStage === "abstrak";
        const summaryMode = Boolean(stageData.abstrak.validatedAt && !isCurrentStage);
        sections.push(formatAbstrakData(stageData.abstrak, isCurrentStage, summaryMode));
    }
    if (stageData.pendahuluan && hasContent(stageData.pendahuluan)) {
        const isCurrentStage = currentStage === "pendahuluan";
        const summaryMode = Boolean(stageData.pendahuluan.validatedAt && !isCurrentStage);
        sections.push(formatPendahuluanData(stageData.pendahuluan, isCurrentStage, summaryMode));
    }
    if (stageData.tinjauan_literatur && hasContent(stageData.tinjauan_literatur)) {
        const isCurrentStage = currentStage === "tinjauan_literatur";
        const summaryMode = Boolean(stageData.tinjauan_literatur.validatedAt && !isCurrentStage);
        sections.push(formatTinjauanLiteraturData(stageData.tinjauan_literatur, isCurrentStage, summaryMode));
    }
    if (stageData.metodologi && hasContent(stageData.metodologi)) {
        const isCurrentStage = currentStage === "metodologi";
        const summaryMode = Boolean(stageData.metodologi.validatedAt && !isCurrentStage);
        sections.push(formatMetodologiData(stageData.metodologi, isCurrentStage, summaryMode));
    }

    // Format Phase 3 stages
    if (stageData.hasil && hasContent(stageData.hasil)) {
        const isCurrentStage = currentStage === "hasil";
        const summaryMode = Boolean(stageData.hasil.validatedAt && !isCurrentStage);
        sections.push(formatHasilData(stageData.hasil, isCurrentStage, summaryMode));
    }
    if (stageData.diskusi && hasContent(stageData.diskusi)) {
        const isCurrentStage = currentStage === "diskusi";
        const summaryMode = Boolean(stageData.diskusi.validatedAt && !isCurrentStage);
        sections.push(formatDiskusiData(stageData.diskusi, isCurrentStage, summaryMode));
    }
    if (stageData.kesimpulan && hasContent(stageData.kesimpulan)) {
        const isCurrentStage = currentStage === "kesimpulan";
        const summaryMode = Boolean(stageData.kesimpulan.validatedAt && !isCurrentStage);
        sections.push(formatKesimpulanData(stageData.kesimpulan, isCurrentStage, summaryMode));
    }

    // Format Phase 4 stages
    if (stageData.daftar_pustaka && hasContent(stageData.daftar_pustaka)) {
        const isCurrentStage = currentStage === "daftar_pustaka";
        const summaryMode = Boolean(stageData.daftar_pustaka.validatedAt && !isCurrentStage);
        sections.push(formatDaftarPustakaData(stageData.daftar_pustaka, isCurrentStage, summaryMode));
    }
    if (stageData.lampiran && hasContent(stageData.lampiran)) {
        const isCurrentStage = currentStage === "lampiran";
        const summaryMode = Boolean(stageData.lampiran.validatedAt && !isCurrentStage);
        sections.push(formatLampiranData(stageData.lampiran, isCurrentStage, summaryMode));
    }
    if (stageData.judul && hasContent(stageData.judul)) {
        const isCurrentStage = currentStage === "judul";
        const summaryMode = Boolean(stageData.judul.validatedAt && !isCurrentStage);
        sections.push(formatJudulData(stageData.judul, isCurrentStage, summaryMode));
    }
    if (stageData.outline && hasContent(stageData.outline)) {
        const isCurrentStage = currentStage === "outline";
        const summaryMode = Boolean(stageData.outline.validatedAt && !isCurrentStage);
        sections.push(formatOutlineData(stageData.outline, isCurrentStage, summaryMode));
    }
    if (stageData.elaborasi && hasContent(stageData.elaborasi)) {
        const isCurrentStage = currentStage === "elaborasi";
        const summaryMode = Boolean(stageData.elaborasi.validatedAt && !isCurrentStage);
        sections.push(formatElaborasiData(stageData.elaborasi, isCurrentStage, summaryMode));
    }

    if (sections.length === 0) {
        return "Belum ada data dari tahap sebelumnya.";
    }

    return sections.join("\n\n");
}

/**
 * Check if a stage data object has any meaningful content
 */
function hasContent(data: AllStageData): boolean {
    return Object.values(data).some(
        (v) => v !== undefined && v !== null && v !== "" &&
            !(Array.isArray(v) && v.length === 0)
    );
}

function truncateText(text: string, summaryMode: boolean): string {
    if (!summaryMode || text.length <= SUMMARY_CHAR_LIMIT) {
        return text;
    }

    return `${text.slice(0, SUMMARY_CHAR_LIMIT).trim()}...`;
}

/**
 * Truncate text with custom character limit (for short summaries in Phase 4)
 */
function truncateTextWithLimit(text: string, limit: number): string {
    if (text.length <= limit) {
        return text;
    }
    return `${text.slice(0, limit).trim()}...`;
}

function normalizePercentage(value: number): number {
    if (Number.isNaN(value)) {
        return value;
    }
    if (value >= 0 && value <= 1) {
        return value * 100;
    }
    return value;
}

/**
 * Format Gagasan stage data
 */
function formatGagasanData(data: GagasanData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 1: ${getStageLabel("gagasan")} [${status}${revisions}] ===\n`;

    if (data.ideKasar) output += `Ide Kasar: ${truncateText(data.ideKasar, summaryMode)}\n`;
    if (data.analisis) output += `Analisis: ${truncateText(data.analisis, summaryMode)}\n`;
    if (data.angle) output += `Angle Penulisan: ${truncateText(data.angle, summaryMode)}\n`;
    if (data.novelty) output += `Kebaruan (Novelty): ${truncateText(data.novelty, summaryMode)}\n`;
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
function formatTopikData(data: TopikData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 2: ${getStageLabel("topik")} [${status}${revisions}] ===\n`;

    if (data.definitif) output += `Topik Definitif: ${truncateText(data.definitif, summaryMode)}\n`;
    if (data.angleSpesifik) output += `Angle Spesifik: ${truncateText(data.angleSpesifik, summaryMode)}\n`;
    if (data.argumentasiKebaruan) output += `Argumentasi Kebaruan: ${truncateText(data.argumentasiKebaruan, summaryMode)}\n`;
    if (data.researchGap) output += `Research Gap: ${truncateText(data.researchGap, summaryMode)}\n`;
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
function formatAbstrakData(data: AbstrakData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 3: ${getStageLabel("abstrak")} [${status}${revisions}] ===\n`;

    if (data.ringkasanPenelitian) output += `Ringkasan: ${truncateText(data.ringkasanPenelitian, summaryMode)}\n`;
    if (data.keywords && data.keywords.length > 0) {
        output += `Keywords: ${data.keywords.join(", ")}\n`;
    }
    if (data.wordCount) output += `Word Count: ${data.wordCount} kata\n`;

    return output.trim();
}

/**
 * Format Pendahuluan stage data
 */
function formatPendahuluanData(data: PendahuluanData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 4: ${getStageLabel("pendahuluan")} [${status}${revisions}] ===\n`;

    if (data.latarBelakang) output += `Latar Belakang: ${truncateText(data.latarBelakang, summaryMode)}\n`;
    if (data.rumusanMasalah) output += `Rumusan Masalah: ${truncateText(data.rumusanMasalah, summaryMode)}\n`;
    if (data.researchGapAnalysis) output += `Research Gap Analysis: ${truncateText(data.researchGapAnalysis, summaryMode)}\n`;
    if (data.tujuanPenelitian) output += `Tujuan Penelitian: ${truncateText(data.tujuanPenelitian, summaryMode)}\n`;
    if (data.signifikansiPenelitian) output += `Signifikansi Penelitian: ${truncateText(data.signifikansiPenelitian, summaryMode)}\n`;
    if (data.hipotesis) output += `Hipotesis: ${truncateText(data.hipotesis, summaryMode)}\n`;
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
function formatTinjauanLiteraturData(data: TinjauanLiteraturData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 5: ${getStageLabel("tinjauan_literatur")} [${status}${revisions}] ===\n`;

    if (data.kerangkaTeoretis) output += `Kerangka Teoretis: ${truncateText(data.kerangkaTeoretis, summaryMode)}\n`;
    if (data.reviewLiteratur) output += `Review Literatur: ${truncateText(data.reviewLiteratur, summaryMode)}\n`;
    if (data.gapAnalysis) output += `Gap Analysis: ${truncateText(data.gapAnalysis, summaryMode)}\n`;
    if (data.justifikasiPenelitian) output += `Justifikasi Penelitian: ${truncateText(data.justifikasiPenelitian, summaryMode)}\n`;
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
function formatMetodologiData(data: MetodologiData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 6: ${getStageLabel("metodologi")} [${status}${revisions}] ===\n`;

    if (data.pendekatanPenelitian) output += `Pendekatan: ${data.pendekatanPenelitian.toUpperCase()}\n`;
    if (data.desainPenelitian) output += `Desain Penelitian: ${truncateText(data.desainPenelitian, summaryMode)}\n`;
    if (data.metodePerolehanData) output += `Metode Perolehan Data: ${truncateText(data.metodePerolehanData, summaryMode)}\n`;
    if (data.teknikAnalisis) output += `Teknik Analisis: ${truncateText(data.teknikAnalisis, summaryMode)}\n`;
    if (data.alatInstrumen) output += `Alat/Instrumen: ${truncateText(data.alatInstrumen, summaryMode)}\n`;
    if (data.etikaPenelitian) output += `Etika Penelitian: ${truncateText(data.etikaPenelitian, summaryMode)}\n`;

    return output.trim();
}

/**
 * Format Hasil stage data
 */
function formatHasilData(data: HasilData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 7: ${getStageLabel("hasil")} [${status}${revisions}] ===\n`;

    if (data.metodePenyajian) {
        output += `Metode Penyajian: ${data.metodePenyajian.toUpperCase()}\n`;
    }
    if (data.temuanUtama && data.temuanUtama.length > 0) {
        output += `Temuan Utama:\n`;
        data.temuanUtama.forEach((item, i) => {
            output += `  ${i + 1}. ${truncateText(item, summaryMode)}\n`;
        });
    }
    if (data.dataPoints && data.dataPoints.length > 0) {
        output += `Data Points:\n`;
        data.dataPoints.forEach((point, i) => {
            const unit = point.unit ? ` ${point.unit}` : "";
            const note = point.note ? ` - ${truncateText(point.note, summaryMode)}` : "";
            output += `  ${i + 1}. ${point.label}: ${point.value}${unit}${note}\n`;
        });
    }

    return output.trim();
}

/**
 * Format Diskusi stage data
 */
function formatDiskusiData(data: DiskusiData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 8: ${getStageLabel("diskusi")} [${status}${revisions}] ===\n`;

    if (data.interpretasiTemuan) output += `Interpretasi Temuan: ${truncateText(data.interpretasiTemuan, summaryMode)}\n`;
    if (data.perbandinganLiteratur) output += `Perbandingan Literatur: ${truncateText(data.perbandinganLiteratur, summaryMode)}\n`;
    if (data.implikasiTeoretis) output += `Implikasi Teoretis: ${truncateText(data.implikasiTeoretis, summaryMode)}\n`;
    if (data.implikasiPraktis) output += `Implikasi Praktis: ${truncateText(data.implikasiPraktis, summaryMode)}\n`;
    if (data.keterbatasanPenelitian) output += `Keterbatasan Penelitian: ${truncateText(data.keterbatasanPenelitian, summaryMode)}\n`;
    if (data.saranPenelitianMendatang) output += `Saran Penelitian Mendatang: ${truncateText(data.saranPenelitianMendatang, summaryMode)}\n`;
    if (data.sitasiTambahan && data.sitasiTambahan.length > 0) {
        output += `Sitasi Tambahan: ${data.sitasiTambahan.length}\n`;
    }

    return output.trim();
}

/**
 * Format Kesimpulan stage data
 */
function formatKesimpulanData(data: KesimpulanData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 9: ${getStageLabel("kesimpulan")} [${status}${revisions}] ===\n`;

    if (data.ringkasanHasil) output += `Ringkasan Hasil: ${truncateText(data.ringkasanHasil, summaryMode)}\n`;
    if (data.jawabanRumusanMasalah && data.jawabanRumusanMasalah.length > 0) {
        output += `Jawaban Rumusan Masalah:\n`;
        data.jawabanRumusanMasalah.forEach((item, i) => {
            output += `  ${i + 1}. ${truncateText(item, summaryMode)}\n`;
        });
    }
    if (data.implikasiPraktis) output += `Implikasi Praktis: ${truncateText(data.implikasiPraktis, summaryMode)}\n`;
    if (data.saranPraktisi) output += `Saran Praktisi: ${truncateText(data.saranPraktisi, summaryMode)}\n`;
    if (data.saranPeneliti) output += `Saran Peneliti: ${truncateText(data.saranPeneliti, summaryMode)}\n`;
    if (data.saranKebijakan) output += `Saran Kebijakan: ${truncateText(data.saranKebijakan, summaryMode)}\n`;

    return output.trim();
}

/**
 * Format Daftar Pustaka stage data (Stage 10)
 */
function formatDaftarPustakaData(data: DaftarPustakaData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 10: ${getStageLabel("daftar_pustaka")} [${status}${revisions}] ===\n`;

    // Stats
    if (data.totalCount !== undefined) {
        output += `Total Referensi: ${data.totalCount}\n`;
    }
    if (data.incompleteCount !== undefined && data.incompleteCount > 0) {
        output += `Referensi Incomplete: ${data.incompleteCount}\n`;
    }
    if (data.duplicatesMerged !== undefined && data.duplicatesMerged > 0) {
        output += `Duplikat Digabung: ${data.duplicatesMerged}\n`;
    }

    // Entries list
    if (data.entries && data.entries.length > 0) {
        output += `\nDaftar Referensi:\n`;

        const entriesToShow = summaryMode ? data.entries.slice(0, 5) : data.entries;
        entriesToShow.forEach((entry, idx) => {
            const incomplete = entry.isComplete === false ? " [INCOMPLETE]" : "";
            if (entry.fullReference && entry.inTextCitation) {
                output += `  ${idx + 1}. ${entry.inTextCitation} - ${entry.fullReference}${incomplete}\n`;
            } else if (entry.fullReference) {
                output += `  ${idx + 1}. ${entry.fullReference}${incomplete}\n`;
            } else if (entry.inTextCitation) {
                output += `  ${idx + 1}. ${entry.inTextCitation} - ${entry.title}${incomplete}\n`;
            } else {
                output += `  ${idx + 1}. ${entry.title}${incomplete}\n`;
            }
        });

        if (summaryMode && data.entries.length > 5) {
            output += `  ... dan ${data.entries.length - 5} referensi lainnya\n`;
        }
    }

    return output.trim();
}

/**
 * Format Lampiran stage data (Stage 11)
 */
function formatLampiranData(data: LampiranData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 11: ${getStageLabel("lampiran")} [${status}${revisions}] ===\n`;

    if (data.items && data.items.length > 0) {
        output += `Total Lampiran: ${data.items.length}\n\n`;

        const itemsToShow = summaryMode ? data.items.slice(0, 3) : data.items;
        itemsToShow.forEach((item) => {
            const tipeStr = item.tipe ? ` (${item.tipe})` : "";
            output += `Lampiran ${item.label}: ${item.judul || "Untitled"}${tipeStr}\n`;

            if (!summaryMode && item.referencedInSections && item.referencedInSections.length > 0) {
                output += `  -> Direferensikan di: ${item.referencedInSections.join(", ")}\n`;
            }
        });

        if (summaryMode && data.items.length > 3) {
            output += `... dan ${data.items.length - 3} lampiran lainnya\n`;
        }
    } else {
        output += `Belum ada lampiran\n`;
    }

    return output.trim();
}

/**
 * Format Judul stage data (Stage 12)
 */
function formatJudulData(data: JudulData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 12: ${getStageLabel("judul")} [${status}${revisions}] ===\n`;

    // Selected title (emphasized)
    if (data.judulTerpilih) {
        output += `**JUDUL TERPILIH:** ${data.judulTerpilih}\n`;
        if (data.alasanPemilihan && !summaryMode) {
            output += `Alasan: ${truncateText(data.alasanPemilihan, summaryMode)}\n`;
        }
    }

    // Options list
    if (data.opsiJudul && data.opsiJudul.length > 0 && !summaryMode) {
        output += `\nOpsi Judul:\n`;
        data.opsiJudul.forEach((opsi, idx) => {
            const coverageStr = opsi.coverageScore !== undefined
                ? ` (coverage: ${Math.round(normalizePercentage(opsi.coverageScore))}%)`
                : "";
            const selected = data.judulTerpilih === opsi.judul ? " [TERPILIH]" : "";
            output += `  ${idx + 1}. ${opsi.judul}${coverageStr}${selected}\n`;
        });
    } else if (!data.judulTerpilih) {
        output += `Judul belum dipilih\n`;
    }

    return output.trim();
}

/**
 * Format Outline stage data (Stage 13)
 */
function formatOutlineData(data: OutlineData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 13: ${getStageLabel("outline")} [${status}${revisions}] ===\n`;

    // Stats
    if (data.totalWordCount !== undefined) {
        output += `Estimasi Total: ${data.totalWordCount} kata\n`;
    }
    if (data.completenessScore !== undefined) {
        output += `Kelengkapan: ${Math.round(normalizePercentage(data.completenessScore))}%\n`;
    }

    // Sections hierarchy
    if (data.sections && data.sections.length > 0) {
        output += `\nStruktur Outline:\n`;

        // Build hierarchy display
        const sectionsToShow = summaryMode
            ? data.sections.filter(s => (s.level || 1) <= 2).slice(0, 10)
            : data.sections;

        sectionsToShow.forEach((section) => {
            const indent = "  ".repeat((section.level || 1) - 1);
            const statusIcon = section.status === "complete" ? "[OK]"
                : section.status === "partial" ? "[~]"
                : "[_]";
            const wordCount = section.estimatedWordCount !== undefined
                ? ` (~${section.estimatedWordCount} kata)`
                : "";

            output += `${indent}${statusIcon} ${section.judul || section.id}${wordCount}\n`;
        });

        if (summaryMode && data.sections.length > 10) {
            output += `  ... dan ${data.sections.length - 10} section lainnya\n`;
        }
    }

    return output.trim();
}

/**
 * Format Elaborasi stage data (Stage 14)
 */
function formatElaborasiData(data: ElaborasiData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 14: ${getStageLabel("elaborasi")} [${status}${revisions}] ===\n`;

    // Draft status
    if (data.draftComplete !== undefined) {
        output += `Status Draft: ${data.draftComplete ? "LENGKAP [OK]" : "DALAM PROSES"}\n`;
    }

    // Sections elaborated
    if (data.sectionsElaborated && data.sectionsElaborated.length > 0) {
        output += `Section Ter-elaborate: ${data.sectionsElaborated.length}\n`;

        if (!summaryMode) {
            output += `\nSections:\n`;
            data.sectionsElaborated.forEach((section) => {
                output += `  [OK] ${section}\n`;
            });
        }
    }

    // Coherence issues
    if (data.coherenceIssues && data.coherenceIssues.length > 0) {
        const unresolvedCount = data.coherenceIssues.filter(i => !i.resolved).length;
        output += `\nCoherence Issues: ${data.coherenceIssues.length} (${unresolvedCount} belum resolved)\n`;

        if (!summaryMode) {
            data.coherenceIssues.forEach((issue) => {
                const resolvedIcon = issue.resolved ? "[OK]" : "[!]";
                const typeStr = issue.issueType ? `[${issue.issueType}]` : "";
                const toStr = issue.sectionTo ? ` -> ${issue.sectionTo}` : "";
                output += `  ${resolvedIcon} ${issue.sectionFrom}${toStr} ${typeStr}\n`;
                if (issue.description) {
                    output += `      ${truncateTextWithLimit(issue.description, 80)}\n`;
                }
            });
        }
    }

    if (data.completenessCheck && Object.keys(data.completenessCheck).length > 0) {
        const entries = Object.entries(data.completenessCheck);
        const completedCount = entries.filter(([, value]) => value).length;
        output += `\nCompleteness Check: ${completedCount}/${entries.length} section lengkap\n`;

        if (!summaryMode) {
            const incompleteSections = entries
                .filter(([, value]) => !value)
                .map(([section]) => section);
            if (incompleteSections.length > 0) {
                output += `Section belum lengkap: ${incompleteSections.join(", ")}\n`;
            } else {
                output += `Semua section mandatory lengkap\n`;
            }
        }
    }

    return output.trim();
}
