/**
 * Format Stage Data Helper
 *
 * Converts stageData object to human-readable string for system prompt injection.
 * Shows completed stages' summaries in a clear, structured format.
 */

import { STAGE_ORDER, getStageLabel, type PaperStageId } from "../../../../convex/paperSessions/constants";
import type {
    AbstrakData,
    DaftarPustakaData,
    DiskusiData,
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
const RINGKASAN_CHAR_LIMIT = 280;

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

/**
 * Format stageData object into a human-readable string.
 * Only includes stages that have actual content.
 */
export function formatStageData(
    stageData: StageData,
    currentStage: PaperStageId | "completed"
): string {
    const sections: string[] = [];

    sections.push(formatRingkasanTahapSelesai(stageData, currentStage));

    const activeStageBlock = formatActiveStageData(stageData, currentStage);
    if (activeStageBlock) {
        sections.push(activeStageBlock);
    }

    sections.push(formatOutlineChecklist(stageData.outline, currentStage));

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

function formatRingkasanTahapSelesai(
    stageData: StageData,
    currentStage: PaperStageId | "completed"
): string {
    const summaries: string[] = [];

    STAGE_ORDER.forEach((stageId) => {
        if (currentStage !== "completed" && stageId === currentStage) {
            return;
        }
        const data = stageData[stageId] as AllStageData | undefined;
        if (!data || !data.validatedAt || (data as any).superseded) {
            return;
        }
        const ringkasanValue = typeof data.ringkasan === "string" && data.ringkasan.trim()
            ? data.ringkasan.trim()
            : "Ringkasan belum tersedia.";
        summaries.push(`- ${getStageLabel(stageId)}: ${truncateRingkasan(ringkasanValue)}`);
    });

    if (summaries.length === 0) {
        return "RINGKASAN TAHAP SELESAI:\n- Belum ada tahap yang disetujui.";
    }

    return `RINGKASAN TAHAP SELESAI:\n${summaries.join("\n")}`;
}

function formatActiveStageData(
    stageData: StageData,
    currentStage: PaperStageId | "completed"
): string | null {
    if (currentStage === "completed") {
        return null;
    }

    const data = stageData[currentStage] as AllStageData | undefined;
    if (!data || !hasContent(data)) {
        return null;
    }

    switch (currentStage) {
        case "gagasan":
            return formatGagasanData(data as GagasanData, true);
        case "topik":
            return formatTopikData(data as TopikData, true);
        case "outline":
            return formatOutlineData(data as OutlineData, true);
        case "abstrak":
            return formatAbstrakData(data as AbstrakData, true);
        case "pendahuluan":
            return formatPendahuluanData(data as PendahuluanData, true);
        case "tinjauan_literatur":
            return formatTinjauanLiteraturData(data as TinjauanLiteraturData, true);
        case "metodologi":
            return formatMetodologiData(data as MetodologiData, true);
        case "hasil":
            return formatHasilData(data as HasilData, true);
        case "diskusi":
            return formatDiskusiData(data as DiskusiData, true);
        case "kesimpulan":
            return formatKesimpulanData(data as KesimpulanData, true);
        case "daftar_pustaka":
            return formatDaftarPustakaData(data as DaftarPustakaData, true);
        case "lampiran":
            return formatLampiranData(data as LampiranData, true);
        case "judul":
            return formatJudulData(data as JudulData, true);
        default:
            return null;
    }
}

function truncateText(text: string, summaryMode: boolean): string {
    if (!summaryMode || text.length <= SUMMARY_CHAR_LIMIT) {
        return text;
    }

    return `${text.slice(0, SUMMARY_CHAR_LIMIT).trim()}...`;
}

function truncateRingkasan(text: string): string {
    if (text.length <= RINGKASAN_CHAR_LIMIT) {
        return text;
    }
    return `${text.slice(0, RINGKASAN_CHAR_LIMIT).trim()}...`;
}

/**
 * Truncate text with custom character limit (for short summaries in Phase 4)
 */
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

    if (data.ringkasan) output += `Ringkasan: ${truncateRingkasan(data.ringkasan)}\n`;
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

    if (data.ringkasan) output += `Ringkasan: ${truncateRingkasan(data.ringkasan)}\n`;
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

    let output = `=== TAHAP 4: ${getStageLabel("abstrak")} [${status}${revisions}] ===\n`;

    if (data.ringkasan) output += `Ringkasan: ${truncateRingkasan(data.ringkasan)}\n`;
    if (data.ringkasanPenelitian) output += `Ringkasan Penelitian: ${truncateText(data.ringkasanPenelitian, summaryMode)}\n`;
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

    let output = `=== TAHAP 5: ${getStageLabel("pendahuluan")} [${status}${revisions}] ===\n`;

    if (data.ringkasan) output += `Ringkasan: ${truncateRingkasan(data.ringkasan)}\n`;
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

    let output = `=== TAHAP 6: ${getStageLabel("tinjauan_literatur")} [${status}${revisions}] ===\n`;

    if (data.ringkasan) output += `Ringkasan: ${truncateRingkasan(data.ringkasan)}\n`;
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

    let output = `=== TAHAP 7: ${getStageLabel("metodologi")} [${status}${revisions}] ===\n`;

    if (data.ringkasan) output += `Ringkasan: ${truncateRingkasan(data.ringkasan)}\n`;
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

    let output = `=== TAHAP 8: ${getStageLabel("hasil")} [${status}${revisions}] ===\n`;

    if (data.ringkasan) output += `Ringkasan: ${truncateRingkasan(data.ringkasan)}\n`;
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

    let output = `=== TAHAP 9: ${getStageLabel("diskusi")} [${status}${revisions}] ===\n`;

    if (data.ringkasan) output += `Ringkasan: ${truncateRingkasan(data.ringkasan)}\n`;
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

    let output = `=== TAHAP 10: ${getStageLabel("kesimpulan")} [${status}${revisions}] ===\n`;

    if (data.ringkasan) output += `Ringkasan: ${truncateRingkasan(data.ringkasan)}\n`;
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
 * Format Daftar Pustaka stage data (Stage 11)
 */
function formatDaftarPustakaData(data: DaftarPustakaData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 11: ${getStageLabel("daftar_pustaka")} [${status}${revisions}] ===\n`;

    // Stats
    if (data.ringkasan) output += `Ringkasan: ${truncateRingkasan(data.ringkasan)}\n`;
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
 * Format Lampiran stage data (Stage 12)
 */
function formatLampiranData(data: LampiranData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 12: ${getStageLabel("lampiran")} [${status}${revisions}] ===\n`;

    if (data.ringkasan) output += `Ringkasan: ${truncateRingkasan(data.ringkasan)}\n`;
    if (data.tidakAdaLampiran) {
        output += `Lampiran: Tidak ada\n`;
        if (data.alasanTidakAda) {
            output += `Alasan: ${truncateText(data.alasanTidakAda, summaryMode)}\n`;
        }
        return output.trim();
    }
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
 * Format Judul stage data (Stage 13)
 */
function formatJudulData(data: JudulData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 13: ${getStageLabel("judul")} [${status}${revisions}] ===\n`;

    if (data.ringkasan) output += `Ringkasan: ${truncateRingkasan(data.ringkasan)}\n`;
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
 * Format Outline stage data (Stage 3)
 */
function formatOutlineData(data: OutlineData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisi)` : "";

    let output = `=== TAHAP 3: ${getStageLabel("outline")} [${status}${revisions}] ===\n`;

    // Stats
    if (data.ringkasan) output += `Ringkasan: ${truncateRingkasan(data.ringkasan)}\n`;
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

// ════════════════════════════════════════════════════════════════
// Phase 2 Task 2.2.1: Outline Checklist Limiter Constants
// ════════════════════════════════════════════════════════════════
const MAX_OUTLINE_SECTIONS = 10;
const MAX_OUTLINE_DEPTH = 2;

function formatOutlineChecklist(
    outline: OutlineData | undefined,
    currentStage: PaperStageId | "completed"
): string {
    const isCurrentStage = currentStage === "outline";
    const status = outline?.validatedAt ? "DISETUJUI" : (isCurrentStage ? "DALAM PROSES" : "DRAFT");

    let output = `CHECKLIST OUTLINE (TAHAP 3: ${getStageLabel("outline")}) [${status}]:\n`;

    if (!outline?.sections || outline.sections.length === 0) {
        output += "Checklist belum tersedia.";
        return output.trim();
    }

    // Task 2.2.1: Filter by depth and limit sections
    const filteredSections = outline.sections
        .filter((section) => (section.level ?? 1) <= MAX_OUTLINE_DEPTH);

    const limitedSections = filteredSections.slice(0, MAX_OUTLINE_SECTIONS);
    const remainingCount = filteredSections.length - limitedSections.length;

    limitedSections.forEach((section) => {
        const indent = "  ".repeat((section.level || 1) - 1);
        const statusIcon = section.status === "complete" ? "[OK]"
            : section.status === "partial" ? "[~]"
            : "[_]";
        output += `${indent}${statusIcon} ${section.judul || section.id}\n`;
    });

    // Show indicator if content was truncated
    if (remainingCount > 0) {
        output += `  ...dan ${remainingCount} section lainnya\n`;
    }

    return output.trim();
}

// ════════════════════════════════════════════════════════════════
// Artifact Summary Injection (W1: Paper Workflow Resilience)
// ════════════════════════════════════════════════════════════════

const ARTIFACT_SUMMARY_CHAR_LIMIT = 500;

function formatArtifactSummary(content: string, stageLabel: string): string {
    const truncated = content.length > ARTIFACT_SUMMARY_CHAR_LIMIT
        ? content.slice(0, ARTIFACT_SUMMARY_CHAR_LIMIT).trim() + "..."
        : content;
    return `- [${stageLabel}] "${truncated}"`;
}

/**
 * Format artifact summaries from completed stages into a context section.
 * Truncates content to 500 chars per artifact to keep prompt size manageable.
 */
export function formatArtifactSummaries(
    artifacts: Array<{ stageLabel: string; content: string }>
): string {
    if (artifacts.length === 0) return "";

    const summaries = artifacts
        .map((a) => formatArtifactSummary(a.content, a.stageLabel));

    return `RINGKASAN ARTIFACT TAHAP SELESAI:\n${summaries.join("\n")}`;
}
