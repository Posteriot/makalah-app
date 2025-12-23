/**
 * Paper Intent Detector
 *
 * Detects if user message indicates intent to write academic paper.
 * Used for auto-triggering paper workflow when appropriate.
 */

/**
 * Keywords that indicate paper writing intent.
 * Grouped by category for maintainability.
 */
const PAPER_INTENT_KEYWORDS = {
    // Document types
    documentTypes: [
        "paper",
        "makalah",
        "skripsi",
        "tesis",
        "disertasi",
        "jurnal",
        "artikel ilmiah",
        "karya tulis",
        "karya ilmiah",
        "tugas akhir",
        "laporan penelitian",
        "esai akademik",
        "essay akademik",
    ],
    // Action verbs (Indonesian)
    actionVerbs: [
        "menulis paper",
        "bikin paper",
        "buat paper",
        "susun paper",
        "tulis paper",
        "menulis makalah",
        "bikin makalah",
        "buat makalah",
        "susun makalah",
        "tulis makalah",
        "menulis skripsi",
        "bikin skripsi",
        "buat skripsi",
        "susun skripsi",
        "tulis skripsi",
    ],
    // Paper workflow specific terms
    workflowTerms: [
        "bantu menulis paper",
        "asistensi paper",
        "bantuan paper",
        "bantu paper",
        "bantu makalah",
        "asistensi makalah",
        "bantuan makalah",
        "bantu skripsi",
        "asistensi skripsi",
        "bantuan skripsi",
    ],
};

/**
 * Keywords that indicate user does NOT want full paper workflow.
 * If these are present, we should NOT auto-trigger paper mode.
 */
const PAPER_EXCLUDE_KEYWORDS = [
    "jelaskan",
    "apa itu",
    "pengertian",
    "definisi",
    "contoh",
    "perbedaan",
    "cara menulis", // asking how to write, not asking to write
    "tips menulis",
    "langkah-langkah",
    "format",
    "struktur",
    "template",
];

/**
 * Normalize text for keyword matching.
 * Lowercase and remove extra whitespace.
 */
function normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Detect if user message indicates paper writing intent.
 *
 * @param userMessage - The user's message content
 * @returns Object with detection result and matched keywords
 */
export function detectPaperIntent(userMessage: string): {
    hasPaperIntent: boolean;
    matchedKeywords: string[];
    isExcluded: boolean;
    excludeReason?: string;
} {
    const normalized = normalizeText(userMessage);

    // Check for exclusion keywords first
    const hasExcludeKeyword = PAPER_EXCLUDE_KEYWORDS.some((kw) =>
        normalized.includes(kw.toLowerCase())
    );

    if (hasExcludeKeyword) {
        const matchedExclude = PAPER_EXCLUDE_KEYWORDS.find((kw) =>
            normalized.includes(kw.toLowerCase())
        );
        return {
            hasPaperIntent: false,
            matchedKeywords: [],
            isExcluded: true,
            excludeReason: `Contains exclude keyword: "${matchedExclude}"`,
        };
    }

    // Collect all matched keywords
    const matchedKeywords: string[] = [];

    // Check document types
    for (const keyword of PAPER_INTENT_KEYWORDS.documentTypes) {
        if (normalized.includes(keyword.toLowerCase())) {
            matchedKeywords.push(keyword);
        }
    }

    // Check action verbs
    for (const keyword of PAPER_INTENT_KEYWORDS.actionVerbs) {
        if (normalized.includes(keyword.toLowerCase())) {
            matchedKeywords.push(keyword);
        }
    }

    // Check workflow terms
    for (const keyword of PAPER_INTENT_KEYWORDS.workflowTerms) {
        if (normalized.includes(keyword.toLowerCase())) {
            matchedKeywords.push(keyword);
        }
    }

    return {
        hasPaperIntent: matchedKeywords.length > 0,
        matchedKeywords,
        isExcluded: false,
    };
}

/**
 * Simple boolean check for paper intent.
 * Use this for quick checks without detailed info.
 */
export function hasPaperWritingIntent(userMessage: string): boolean {
    const result = detectPaperIntent(userMessage);
    return result.hasPaperIntent && !result.isExcluded;
}
