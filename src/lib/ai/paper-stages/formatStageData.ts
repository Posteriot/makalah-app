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
    GagasanData,
    HasilData,
    JudulData,
    KesimpulanData,
    LampiranData,
    MetodologiData,
    OutlineData,
    PembaruanAbstrakData,
    PendahuluanData,
    TinjauanLiteraturData,
    TopikData,
} from "../../paper/stage-types";

const SUMMARY_CHAR_LIMIT = 1000;
const WEB_REFERENCES_CAP = 5;
const CITATION_CAP = 5;

export interface StageData {
    gagasan?: GagasanData;
    topik?: TopikData;
    abstrak?: AbstrakData;
    pendahuluan?: PendahuluanData;
    tinjauan_literatur?: TinjauanLiteraturData;
    metodologi?: MetodologiData;
    hasil?: HasilData;
    diskusi?: DiskusiData;
    kesimpulan?: KesimpulanData;
    pembaruan_abstrak?: PembaruanAbstrakData;
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
    | PembaruanAbstrakData
    | DaftarPustakaData
    | LampiranData
    | JudulData
    | OutlineData

/**
 * Format webSearchReferences from the ACTIVE stage into a prominent block.
 * This ensures AI has structured reference data available every turn.
 */
function formatWebSearchReferences(stageData: StageData, currentStage: PaperStageId | "completed"): string {
    if (currentStage === "completed") return "";

    const data = stageData[currentStage] as AllStageData | undefined;
    if (!data) return "";

    const refs = (data as Record<string, unknown>).webSearchReferences as
        Array<{ url: string; title: string; publishedAt?: number }> | undefined;

    if (!refs || refs.length === 0) return "";

    const refsToShow = refs.slice(0, WEB_REFERENCES_CAP);
    const remainingRefs = refs.length - refsToShow.length;

    const lines = refsToShow.map((ref, i) => {
        const date = ref.publishedAt
            ? ` (${new Date(ref.publishedAt).getFullYear()})`
            : "";
        return `  ${i + 1}. "${ref.title}"${date} — ${ref.url}`;
    });

    return [
        `SAVED WEB SEARCH REFERENCES (MUST use, DO NOT fabricate):`,
        ...lines,
        ...(remainingRefs > 0
            ? [`  ... and ${remainingRefs} more references (truncated for context efficiency).`]
            : []),
        ``,
        `ALL in-text citations MUST refer to the references above.`,
        `If additional references are needed, ASK the user to search first.`,
    ].join("\n");
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

    const activeStageBlock = formatActiveStageData(stageData, currentStage);
    if (activeStageBlock) {
        sections.push(activeStageBlock);
    }

    // Web search references block (prominent, for anti-hallucination)
    const webRefsBlock = formatWebSearchReferences(stageData, currentStage);
    if (webRefsBlock) {
        sections.push(webRefsBlock);
    }

    sections.push(formatOutlineChecklist(stageData.outline, currentStage));

    if (sections.length === 0) {
        return "No data from previous stages yet.";
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
        case "pembaruan_abstrak":
            return formatPembaruanAbstrakData(data as PembaruanAbstrakData, true);
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
    const status = data.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisions)` : "";

    let output = `=== STAGE 1: ${getStageLabel("gagasan")} [${status}${revisions}] ===\n`;

    if (data.ideKasar) output += `Raw Idea: ${truncateText(data.ideKasar, summaryMode)}\n`;
    if (data.analisis) output += `Analysis: ${truncateText(data.analisis, summaryMode)}\n`;
    if (data.angle) output += `Writing Angle: ${truncateText(data.angle, summaryMode)}\n`;
    if (data.novelty) output += `Novelty: ${truncateText(data.novelty, summaryMode)}\n`;
    if (data.referensiAwal && data.referensiAwal.length > 0) {
        output += `Initial References:\n`;
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
    const status = data.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisions)` : "";

    let output = `=== STAGE 2: ${getStageLabel("topik")} [${status}${revisions}] ===\n`;

    if (data.definitif) output += `Definitive Topic: ${truncateText(data.definitif, summaryMode)}\n`;
    if (data.angleSpesifik) output += `Specific Angle: ${truncateText(data.angleSpesifik, summaryMode)}\n`;
    if (data.argumentasiKebaruan) output += `Novelty Argumentation: ${truncateText(data.argumentasiKebaruan, summaryMode)}\n`;
    if (data.researchGap) output += `Research Gap: ${truncateText(data.researchGap, summaryMode)}\n`;
    if (data.referensiPendukung && data.referensiPendukung.length > 0) {
        output += `Supporting References:\n`;
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
    const status = data.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisions)` : "";

    let output = `=== STAGE 4: ${getStageLabel("abstrak")} [${status}${revisions}] ===\n`;

    if (data.ringkasanPenelitian) output += `Research Summary: ${truncateText(data.ringkasanPenelitian, summaryMode)}\n`;
    if (data.keywords && data.keywords.length > 0) {
        output += `Keywords: ${data.keywords.join(", ")}\n`;
    }
    if (data.wordCount) output += `Word Count: ${data.wordCount} words\n`;

    return output.trim();
}

/**
 * Format Pendahuluan stage data
 */
function formatPendahuluanData(data: PendahuluanData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisions)` : "";

    let output = `=== STAGE 5: ${getStageLabel("pendahuluan")} [${status}${revisions}] ===\n`;

    if (data.latarBelakang) output += `Background: ${truncateText(data.latarBelakang, summaryMode)}\n`;
    if (data.rumusanMasalah) output += `Problem Formulation: ${truncateText(data.rumusanMasalah, summaryMode)}\n`;
    if (data.researchGapAnalysis) output += `Research Gap Analysis: ${truncateText(data.researchGapAnalysis, summaryMode)}\n`;
    if (data.tujuanPenelitian) output += `Research Objectives: ${truncateText(data.tujuanPenelitian, summaryMode)}\n`;
    if (data.signifikansiPenelitian) output += `Research Significance: ${truncateText(data.signifikansiPenelitian, summaryMode)}\n`;
    if (data.hipotesis) output += `Hypothesis: ${truncateText(data.hipotesis, summaryMode)}\n`;
    if (data.sitasiAPA && data.sitasiAPA.length > 0) {
        const citationsToShow = data.sitasiAPA.slice(0, CITATION_CAP);
        const remainingCitations = data.sitasiAPA.length - citationsToShow.length;

        output += `Citations (showing ${citationsToShow.length}/${data.sitasiAPA.length}):\n`;
        citationsToShow.forEach((cite, i) => {
            const citationUrl = cite.url ? ` — ${cite.url}` : " — URL not available";
            output += `  ${i + 1}. ${cite.inTextCitation} - ${cite.fullReference}${citationUrl}\n`;
        });
        if (remainingCitations > 0) {
            output += `  ... and ${remainingCitations} more citations (truncated for context efficiency)\n`;
        }
    }

    return output.trim();
}

/**
 * Format Tinjauan Literatur stage data
 */
function formatTinjauanLiteraturData(data: TinjauanLiteraturData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisions)` : "";

    let output = `=== STAGE 6: ${getStageLabel("tinjauan_literatur")} [${status}${revisions}] ===\n`;

    if (data.kerangkaTeoretis) output += `Theoretical Framework: ${truncateText(data.kerangkaTeoretis, summaryMode)}\n`;
    if (data.reviewLiteratur) output += `Literature Review: ${truncateText(data.reviewLiteratur, summaryMode)}\n`;
    if (data.gapAnalysis) output += `Gap Analysis: ${truncateText(data.gapAnalysis, summaryMode)}\n`;
    if (data.justifikasiPenelitian) output += `Research Justification: ${truncateText(data.justifikasiPenelitian, summaryMode)}\n`;
    if (data.referensi && data.referensi.length > 0) {
        output += `References (${data.referensi.length}):\n`;
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
    const status = data.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisions)` : "";

    let output = `=== STAGE 7: ${getStageLabel("metodologi")} [${status}${revisions}] ===\n`;

    if (data.pendekatanPenelitian) output += `Approach: ${data.pendekatanPenelitian.toUpperCase()}\n`;
    if (data.desainPenelitian) output += `Research Design: ${truncateText(data.desainPenelitian, summaryMode)}\n`;
    if (data.metodePerolehanData) output += `Data Collection Method: ${truncateText(data.metodePerolehanData, summaryMode)}\n`;
    if (data.teknikAnalisis) output += `Analysis Technique: ${truncateText(data.teknikAnalisis, summaryMode)}\n`;
    if (data.alatInstrumen) output += `Tools/Instruments: ${truncateText(data.alatInstrumen, summaryMode)}\n`;
    if (data.etikaPenelitian) output += `Research Ethics: ${truncateText(data.etikaPenelitian, summaryMode)}\n`;

    return output.trim();
}

/**
 * Format Hasil stage data
 */
function formatHasilData(data: HasilData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisions)` : "";

    let output = `=== STAGE 8: ${getStageLabel("hasil")} [${status}${revisions}] ===\n`;

    if (data.metodePenyajian) {
        output += `Presentation Method: ${data.metodePenyajian.toUpperCase()}\n`;
    }
    if (data.temuanUtama && data.temuanUtama.length > 0) {
        output += `Key Findings:\n`;
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
    const status = data.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisions)` : "";

    let output = `=== STAGE 9: ${getStageLabel("diskusi")} [${status}${revisions}] ===\n`;

    if (data.interpretasiTemuan) output += `Findings Interpretation: ${truncateText(data.interpretasiTemuan, summaryMode)}\n`;
    if (data.perbandinganLiteratur) output += `Literature Comparison: ${truncateText(data.perbandinganLiteratur, summaryMode)}\n`;
    if (data.implikasiTeoretis) output += `Theoretical Implications: ${truncateText(data.implikasiTeoretis, summaryMode)}\n`;
    if (data.implikasiPraktis) output += `Practical Implications: ${truncateText(data.implikasiPraktis, summaryMode)}\n`;
    if (data.keterbatasanPenelitian) output += `Research Limitations: ${truncateText(data.keterbatasanPenelitian, summaryMode)}\n`;
    if (data.saranPenelitianMendatang) output += `Future Research Suggestions: ${truncateText(data.saranPenelitianMendatang, summaryMode)}\n`;
    if (data.sitasiTambahan && data.sitasiTambahan.length > 0) {
        output += `Additional Citations: ${data.sitasiTambahan.length}\n`;
    }

    return output.trim();
}

/**
 * Format Kesimpulan stage data
 */
function formatKesimpulanData(data: KesimpulanData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisions)` : "";

    let output = `=== STAGE 10: ${getStageLabel("kesimpulan")} [${status}${revisions}] ===\n`;

    if (data.ringkasanHasil) output += `Results Summary: ${truncateText(data.ringkasanHasil, summaryMode)}\n`;
    if (data.jawabanRumusanMasalah && data.jawabanRumusanMasalah.length > 0) {
        output += `Problem Formulation Answers:\n`;
        data.jawabanRumusanMasalah.forEach((item, i) => {
            output += `  ${i + 1}. ${truncateText(item, summaryMode)}\n`;
        });
    }
    if (data.implikasiPraktis) output += `Practical Implications: ${truncateText(data.implikasiPraktis, summaryMode)}\n`;
    if (data.saranPraktisi) output += `Practitioner Suggestions: ${truncateText(data.saranPraktisi, summaryMode)}\n`;
    if (data.saranPeneliti) output += `Researcher Suggestions: ${truncateText(data.saranPeneliti, summaryMode)}\n`;
    if (data.saranKebijakan) output += `Policy Suggestions: ${truncateText(data.saranKebijakan, summaryMode)}\n`;

    return output.trim();
}

/**
 * Format Pembaruan Abstrak stage data (Stage 11)
 */
function formatPembaruanAbstrakData(data: PembaruanAbstrakData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisions)` : "";

    let output = `=== STAGE 11: ${getStageLabel("pembaruan_abstrak")} [${status}${revisions}] ===\n`;

    if (data.ringkasanPenelitianBaru) output += `Updated Abstract: ${truncateText(data.ringkasanPenelitianBaru, summaryMode)}\n`;
    if (data.perubahanUtama && data.perubahanUtama.length > 0) {
        output += `Key Changes:\n`;
        data.perubahanUtama.forEach((item, i) => {
            output += `  ${i + 1}. ${truncateText(item, summaryMode)}\n`;
        });
    }
    if (data.keywordsBaru && data.keywordsBaru.length > 0) {
        output += `Updated Keywords: ${data.keywordsBaru.join(", ")}\n`;
    }
    if (data.wordCount !== undefined) output += `Word Count: ${data.wordCount}\n`;

    return output.trim();
}

/**
 * Format Daftar Pustaka stage data (Stage 12)
 */
function formatDaftarPustakaData(data: DaftarPustakaData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisions)` : "";

    let output = `=== STAGE 12: ${getStageLabel("daftar_pustaka")} [${status}${revisions}] ===\n`;

    // Stats
    if (data.totalCount !== undefined) {
        output += `Total References: ${data.totalCount}\n`;
    }
    if (data.incompleteCount !== undefined && data.incompleteCount > 0) {
        output += `Incomplete References: ${data.incompleteCount}\n`;
    }
    if (data.duplicatesMerged !== undefined && data.duplicatesMerged > 0) {
        output += `Duplicates Merged: ${data.duplicatesMerged}\n`;
    }

    // Entries list
    if (data.entries && data.entries.length > 0) {
        output += `\nReference List:\n`;

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
            output += `  ... and ${data.entries.length - 5} more references\n`;
        }
    }

    return output.trim();
}

/**
 * Format Lampiran stage data (Stage 13)
 */
function formatLampiranData(data: LampiranData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisions)` : "";

    let output = `=== STAGE 13: ${getStageLabel("lampiran")} [${status}${revisions}] ===\n`;

    if (data.tidakAdaLampiran) {
        output += `Appendix: None\n`;
        if (data.alasanTidakAda) {
            output += `Reason: ${truncateText(data.alasanTidakAda, summaryMode)}\n`;
        }
        return output.trim();
    }
    if (data.items && data.items.length > 0) {
        output += `Total Appendices: ${data.items.length}\n\n`;

        const itemsToShow = summaryMode ? data.items.slice(0, 3) : data.items;
        itemsToShow.forEach((item) => {
            const tipeStr = item.tipe ? ` (${item.tipe})` : "";
            output += `Appendix ${item.label}: ${item.judul || "Untitled"}${tipeStr}\n`;

            if (!summaryMode && item.referencedInSections && item.referencedInSections.length > 0) {
                output += `  -> Referenced in: ${item.referencedInSections.join(", ")}\n`;
            }
        });

        if (summaryMode && data.items.length > 3) {
            output += `... and ${data.items.length - 3} more appendices\n`;
        }
    } else {
        output += `No appendices yet\n`;
    }

    return output.trim();
}

/**
 * Format Judul stage data (Stage 14)
 */
function formatJudulData(data: JudulData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisions)` : "";

    let output = `=== STAGE 14: ${getStageLabel("judul")} [${status}${revisions}] ===\n`;

    // Selected title (emphasized)
    if (data.judulTerpilih) {
        output += `**SELECTED TITLE:** ${data.judulTerpilih}\n`;
        if (data.alasanPemilihan && !summaryMode) {
            output += `Rationale: ${truncateText(data.alasanPemilihan, summaryMode)}\n`;
        }
    }

    // Options list
    if (data.opsiJudul && data.opsiJudul.length > 0 && !summaryMode) {
        output += `\nTitle Options:\n`;
        data.opsiJudul.forEach((opsi, idx) => {
            const coverageStr = opsi.coverageScore !== undefined
                ? ` (coverage: ${Math.round(normalizePercentage(opsi.coverageScore))}%)`
                : "";
            const selected = data.judulTerpilih === opsi.judul ? " [SELECTED]" : "";
            output += `  ${idx + 1}. ${opsi.judul}${coverageStr}${selected}\n`;
        });
    } else if (!data.judulTerpilih) {
        output += `Title not yet selected\n`;
    }

    return output.trim();
}

/**
 * Format Outline stage data (Stage 3)
 */
function formatOutlineData(data: OutlineData, isCurrentStage: boolean, summaryMode = false): string {
    const status = data.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");
    const revisions = data.revisionCount ? ` (${data.revisionCount}x revisions)` : "";

    let output = `=== STAGE 3: ${getStageLabel("outline")} [${status}${revisions}] ===\n`;

    // Stats
    if (data.totalWordCount !== undefined) {
        output += `Estimated Total: ${data.totalWordCount} words\n`;
    }
    if (data.completenessScore !== undefined) {
        output += `Completeness: ${Math.round(normalizePercentage(data.completenessScore))}%\n`;
    }

    // Sections hierarchy
    if (data.sections && data.sections.length > 0) {
        output += `\nOutline Structure:\n`;

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
                ? ` (~${section.estimatedWordCount} words)`
                : "";

            output += `${indent}${statusIcon} ${section.judul || section.id}${wordCount}\n`;
        });

        if (summaryMode && data.sections.length > 10) {
            output += `  ... and ${data.sections.length - 10} more sections\n`;
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
    const status = outline?.validatedAt ? "APPROVED" : (isCurrentStage ? "IN PROGRESS" : "DRAFT");

    let output = `OUTLINE CHECKLIST (STAGE 3: ${getStageLabel("outline")}) [${status}]:\n`;

    if (!outline?.sections || outline.sections.length === 0) {
        output += "Checklist not yet available.";
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
        output += `  ...and ${remainingCount} more sections\n`;
    }

    return output.trim();
}

// ════════════════════════════════════════════════════════════════
// Artifact Summary Injection (W1: Paper Workflow Resilience)
// ════════════════════════════════════════════════════════════════

const ARTIFACT_SUMMARY_CHAR_LIMIT = 500;

function formatArtifactSummary(content: string, stageLabel: string, version: number, title: string, artifactId: string): string {
    const truncated = content.length > ARTIFACT_SUMMARY_CHAR_LIMIT
        ? content.slice(0, ARTIFACT_SUMMARY_CHAR_LIMIT).trim() + "..."
        : content;
    return `- [${stageLabel}] ID: ${artifactId} | "${title}" (v${version}): "${truncated}"`;
}

/**
 * Format artifact summaries from completed stages into a context section.
 * Includes artifactId, version, and title so the model can reference and read them via readArtifact tool.
 * Truncates content to 500 chars per artifact to keep prompt size manageable.
 */
export function formatArtifactSummaries(
    artifacts: Array<{ stageLabel: string; content: string; version: number; title: string; artifactId: string }>
): string {
    if (artifacts.length === 0) return "";

    const summaries = artifacts
        .map((a) => formatArtifactSummary(a.content, a.stageLabel, a.version, a.title, a.artifactId));

    return `COMPLETED STAGE ARTIFACT SUMMARIES (use readArtifact to read full content if needed):\n${summaries.join("\n")}`;
}
