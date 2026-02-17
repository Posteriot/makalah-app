/**
 * Paper Search Decision Helpers
 *
 * Deterministic helpers for search decision in paper workflow.
 * These bypass the non-deterministic LLM router for ACTIVE stages.
 *
 * 3-Layer Protection:
 * 1. Task-based: Check stageData completion (referensi fields)
 * 2. Intent-based: Check AI's previous promise to search
 * 3. Language-based: Check explicit save/submit patterns
 */

import type { PaperStageId } from "../../../convex/paperSessions/constants"

/**
 * Stage research requirements - defines what data each ACTIVE stage needs
 */
export const STAGE_RESEARCH_REQUIREMENTS: Partial<Record<PaperStageId, {
    requiredField: string
    minCount: number
    description: string
}>> = {
    gagasan: {
        requiredField: "referensiAwal",
        minCount: 2,
        description: "referensi awal untuk mendukung kelayakan ide"
    },
    topik: {
        requiredField: "referensiPendukung",
        minCount: 3,
        description: "referensi pendukung untuk memperkuat topik"
    },
    tinjauan_literatur: {
        requiredField: "referensi",
        minCount: 5,
        description: "referensi untuk tinjauan literatur"
    },
    pendahuluan: {
        requiredField: "sitasiAPA",
        minCount: 2,
        description: "sitasi APA untuk mendukung latar belakang"
    },
    diskusi: {
        requiredField: "sitasiTambahan",
        minCount: 2,
        description: "sitasi tambahan untuk perbandingan literatur"
    },
}

/**
 * Check if current stage's research requirement is incomplete
 */
export const isStageResearchIncomplete = (
    stageData: Record<string, unknown> | undefined,
    stage: PaperStageId
): { incomplete: boolean; requirement?: string } => {
    const req = STAGE_RESEARCH_REQUIREMENTS[stage]
    if (!req) return { incomplete: false }

    const currentStageData = stageData?.[stage] as Record<string, unknown> | undefined
    const fieldData = currentStageData?.[req.requiredField]

    if (!Array.isArray(fieldData) || fieldData.length < req.minCount) {
        return {
            incomplete: true,
            requirement: `Butuh minimal ${req.minCount} ${req.description}`
        }
    }

    return { incomplete: false }
}

/**
 * Check if AI's previous response indicated intent to search
 */
export const aiIndicatedSearchIntent = (previousAIMessage: string): boolean => {
    const searchIntentPatterns = [
        // "Izinkan saya mencari..."
        /\b(izinkan|biar|biarkan)\s*(saya\s*)?(untuk\s*)?(mencari|cari|search)/i,
        // "Saya akan mencari..."
        /\bsaya\s*(akan|perlu|mau)\s*(mencari|cari)/i,
        // "...perlu mencari referensi..."
        /\b(perlu|butuh|harus)\s*(mencari|cari)\s*(referensi|literatur|sumber|data)/i,
        // "Mari kita cari..."
        /\b(mari|ayo)\s*(kita\s*)?(mencari|cari)/i,
        // "...akan saya carikan..."
        /\bakan\s*(saya\s*)?(carikan|cari)/i,
        // "akan memulai/melakukan pencarian" - common AI phrasing
        /\bakan\s*(memulai|melakukan)\s*(dengan\s*)?(pencarian|search)/i,
        // "saya akan memulai pencarian"
        /\bsaya\s*akan\s*(memulai|melakukan).*(pencarian|search)/i,
        // "melakukan pencarian literatur/referensi"
        /\b(akan\s*)?(melakukan|memulai)\s*pencarian\s*(literatur|referensi|sumber)?/i,
        // "tunggu sebentar selagi saya mencari/search"
        /\btunggu.*(saya|selagi).*(mencari|cari|search|pencarian)/i,
        // "mohon tunggu" + "pencarian/search"
        /\bmohon\s*tunggu.*pencarian/i,
    ]
    return searchIntentPatterns.some(p => p.test(previousAIMessage))
}

/**
 * Check if user explicitly requested save/submit (NOT general confirmation)
 */
export const isExplicitSaveSubmitRequest = (text: string): boolean => {
    const normalized = text.toLowerCase()
    const savePatterns = [
        /\b(simpan|save)\b/,
        /\bsubmit\b/,
        /\bapprove\s*(draf|draft)?\b/,
        /\bapproved\b/,
        /\bdisetujui\b/,
        /\[\s*(approved|disetujui)\s*:/i,
        /\blanjut\s*(ke\s*)?(tahap|stage)\s*(berikut|selanjut)/,
        /\bapprove\s*&\s*lanjut\b/,
        /\bselesai(kan)?\s*(tahap|stage)?\b/,
    ]
    return savePatterns.some(p => p.test(normalized))
}

/**
 * Check if AI's previous response indicated intent to SAVE (not search)
 * This is the opposite of aiIndicatedSearchIntent
 */
export const aiIndicatedSaveIntent = (previousAIMessage: string): boolean => {
    const saveIntentPatterns = [
        // "Saya akan menyimpan..."
        /\bsaya\s*(akan|segera)\s*(menyimpan|simpan|save)/i,
        // "akan saya simpan"
        /\bakan\s*(saya\s*)?(simpan|menyimpan)/i,
        // "membuat artifact"
        /\b(akan|segera)\s*(membuat|buat)\s*artifact/i,
        // "membuatkan artifact untuk Anda"
        /\bmembuatkan\s*artifact/i,
        // "menyimpan data/detail"
        /\b(menyimpan|simpan)\s*(data|detail|informasi|ringkasan)/i,
        // "update stage data"
        /\b(akan\s*)?(update|mengupdate)\s*stage/i,
        // "mengirimkan untuk validasi"
        /\b(akan\s*)?(mengirim|kirim)\s*(untuk\s*)?validasi/i,
    ]
    return saveIntentPatterns.some(p => p.test(previousAIMessage))
}

/**
 * Check if user message is a short confirmation (for following up on AI's proposal)
 * This should be used together with aiIndicatedSaveIntent to detect:
 * AI: "Saya akan menyimpan..." → User: "Lakukan" → function tools mode
 */
export const isUserConfirmation = (text: string): boolean => {
    const normalized = text.toLowerCase().trim()
    // Keep it reasonably short, but allow structured auto-message like:
    // [Approved: ...] Lanjut ke tahap berikutnya.
    if (normalized.length > 220) return false

    const confirmationPatterns = [
        /^(ya|yes|yup|yep|ok|oke|okay|sip|siap|baik|boleh)\.?$/i,
        /^\[\s*(approved|disetujui)\s*:/i,
        /^lakukan\.?$/i,
        /^lanjut(kan)?\.?$/i,
        /^lanjut\s+ke\s+tahap\s+berikut(nya)?\.?$/i,
        /^silakan\.?$/i,
        /^setuju\.?$/i,
        /^saya\s+setuju\.?$/i,
        /^sudah\s+setuju\.?$/i,
        /^setuju,\s*lanjut(kan)?\.?$/i,
        /^proses\.?$/i,
        /^eksekusi\.?$/i,
        /^jalankan\.?$/i,
        /^go\.?$/i,
    ]
    return confirmationPatterns.some(p => p.test(normalized))
}

/**
 * Check if user explicitly wants MORE search (after search already done)
 * More restrictive than isExplicitSearchRequest - requires explicit "more" patterns
 *
 * Use case: When searchAlreadyDone=true, we need to differentiate between:
 * - "tampilkan hasil pencarian" → DISPLAY (no search)
 * - "cari lagi tentang X" → MORE SEARCH (enable search)
 */
export const isExplicitMoreSearchRequest = (text: string): boolean => {
    const normalized = text.toLowerCase()
    const moreSearchPatterns = [
        // "cari lagi", "carikan lagi"
        /\bcari(kan)?\s+(lagi|tambahan|lebih)\b/,
        // "cari referensi/sumber/literatur lagi"
        /\bcari(kan)?\s+(referensi|sumber|literatur|data)\s*(lagi|tambahan|lebih)?\b/,
        // "tambah referensi/sumber"
        /\btambah(kan)?\s+(referensi|sumber|literatur|data)\b/,
        // "search more", "search again"
        /\bsearch\s+(more|again|lagi)\b/,
        // Explicit command: "cari tentang X", "carikan X"
        /\bcari(kan)?\s+tentang\b/,
        /\bcari(kan)?\s+\w{3,}/,  // "cari [topic]" with at least 3 chars
    ]
    return moreSearchPatterns.some(p => p.test(normalized))
}

/**
 * Get last assistant message content from model messages
 */
export const getLastAssistantMessage = (
    messages: Array<{ role: string; content?: string | unknown }>
): string | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i]
        if (msg.role === "assistant") {
            if (typeof msg.content === "string") return msg.content
            // Handle array content (AI SDK format)
            if (Array.isArray(msg.content)) {
                const textParts = msg.content
                    .filter((p): p is { type: "text"; text: string } =>
                        typeof p === "object" && p !== null &&
                        "type" in p && p.type === "text" &&
                        "text" in p && typeof p.text === "string"
                    )
                    .map(p => p.text)
                if (textParts.length > 0) return textParts.join("\n")
            }
        }
    }
    return null
}

/**
 * System note when search is disabled in paper mode
 * Prevents AI from promising to search when it can't
 */
export const PAPER_TOOLS_ONLY_NOTE = `
═══════════════════════════════════════════════════════════════════
MODE PAPER TOOLS (TANPA WEB SEARCH)
═══════════════════════════════════════════════════════════════════

CONSTRAINT TEKNIS:
- Tool google_search TIDAK TERSEDIA di turn ini.
- JANGAN berjanji akan mencari referensi/literatur.
- Tools yang tersedia: updateStageData, submitStageForValidation, createArtifact, updateArtifact.

JIKA BUTUH DATA FAKTUAL/REFERENSI:
- Minta user untuk EKSPLISIT meminta pencarian.
- Contoh: "Untuk melanjutkan, saya perlu mencari referensi. Bolehkah saya carikan?"
- JANGAN fabricate/hallucinate referensi - ini TERLARANG.
═══════════════════════════════════════════════════════════════════`

/**
 * System note when research is incomplete for current stage
 * Strong reminder to use google_search
 */
export const getResearchIncompleteNote = (stage: string, requirement: string): string => `
═══════════════════════════════════════════════════════════════════
PERHATIAN: TAHAP "${stage.toUpperCase()}" BELUM LENGKAP
═══════════════════════════════════════════════════════════════════

STATUS: ${requirement}

INSTRUKSI WAJIB:
1. Gunakan tool google_search untuk mencari referensi yang relevan
2. JANGAN lanjutkan diskusi tanpa melakukan pencarian
3. JANGAN fabricate/hallucinate referensi - ini TERLARANG
4. Setelah dapat referensi, baru diskusikan dengan user

JIKA ANDA SKIP PENCARIAN, ANDA MELANGGAR PROTOKOL PAPER WORKFLOW.
═══════════════════════════════════════════════════════════════════`

/**
 * Concise state note for function tools mode (after search is done)
 * Informs AI that it should use function tools, not web search
 */
export const getFunctionToolsModeNote = (searchInfo: string): string => `
══════════════════════════════════════════════════
MODE: FUNCTION_TOOLS | ${searchInfo}
TERSEDIA: createArtifact, updateStageData, submitStageForValidation
TUGAS: Proses hasil dan lanjutkan workflow dengan user
══════════════════════════════════════════════════`
