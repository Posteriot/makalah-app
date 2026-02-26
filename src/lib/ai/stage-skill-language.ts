const ENGLISH_HINT_WORDS = new Set([
    "the", "and", "with", "for", "from", "this", "that", "must", "should", "only",
    "required", "recommended", "allowed", "disallowed", "objective", "input", "context",
    "policy", "output", "contract", "guardrails", "criteria", "stage", "search", "reference",
    "validation", "draft", "submit", "confirm", "final", "compile", "preview", "persist",
]);

const NON_ENGLISH_HINT_WORDS = new Set([
    "yang", "dan", "untuk", "dengan", "pada", "atau", "tidak", "adalah", "wajib", "gunakan",
    "jangan", "boleh", "harus", "tahap", "daftar", "pustaka", "ringkasan", "lanjut", "sudah",
    "belum", "sebelum", "setelah", "dari", "ke", "di", "ini", "itu",
]);

export type EnglishCheckResult = {
    ok: boolean;
    confidence: number;
    englishHits: number;
    nonEnglishHits: number;
};

export function estimateEnglishConfidence(text: string): EnglishCheckResult {
    const tokens = text
        .toLowerCase()
        .replace(/[^a-z0-9_\s-]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 2);

    let englishHits = 0;
    let nonEnglishHits = 0;

    for (const token of tokens) {
        if (ENGLISH_HINT_WORDS.has(token)) englishHits += 1;
        if (NON_ENGLISH_HINT_WORDS.has(token)) nonEnglishHits += 1;
    }

    const scoredTokens = englishHits + nonEnglishHits;
    if (scoredTokens === 0) {
        return {
            ok: true,
            confidence: 1,
            englishHits,
            nonEnglishHits,
        };
    }

    const confidence = englishHits / scoredTokens;
    return {
        ok: confidence >= 0.55,
        confidence,
        englishHits,
        nonEnglishHits,
    };
}
