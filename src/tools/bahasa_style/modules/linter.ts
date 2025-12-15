import { StyleConfig, ValidationIssue, ValidationResult } from '../core/types';
import { BahasaTokenizer } from '../core/tokenizer';
import { FORBIDDEN_PATTERNS, BUDGETED_WORDS, EFFICIENCY_TARGETS } from '../core/definitions';

export class Linter {
    private config: StyleConfig;

    constructor(config?: Partial<StyleConfig>) {
        this.config = {
            maxShortLength: 4,
            maxMediumLength: 8,
            maxLongLength: 12,
            maxLongFreq: 0.1,
            ...config
        };
    }

    validate(text: string): ValidationResult {
        const issues: ValidationIssue[] = [];
        const sentences = BahasaTokenizer.splitSentences(text);
        const wordCounts = sentences.map(s => BahasaTokenizer.countWords(s));

        // 1. Check Variance (Burstiness)
        this.checkVariance(wordCounts, issues);

        // 2. Check Sentence Length Rules
        this.checkSentenceLengths(wordCounts, issues);

        // 3. Scan Paragraph for Patterns
        this.scanPatterns(text, issues);

        // 4. Check Budgeted Words
        this.checkBudget(text, issues);

        // 5. Check "Ini" at start of sentences
        this.checkSentenceStarts(sentences, issues);

        return {
            isValid: issues.filter(i => i.severity === 'CRITICAL').length === 0,
            score: Math.max(0, 100 - (issues.length * 10)), // Simple scoring
            issues
        };
    }

    private checkVariance(counts: number[], issues: ValidationIssue[]) {
        if (counts.length < 3) return; // Need sample size

        // Check for 3 consecutive sentences with same length (Monotony)
        for (let i = 0; i < counts.length - 2; i++) {
            const c1 = counts[i], c2 = counts[i + 1], c3 = counts[i + 2];

            // Ignore short "staccato" sentences (e.g. 2, 3, 2). Only check if average length is >= 5 (Total >= 15)
            if (c1 + c2 + c3 < 15) continue;

            const variance = Math.max(c1, c2, c3) - Math.min(c1, c2, c3);
            if (variance <= 1) { // Allow +/- 1 word diff
                issues.push({
                    type: 'SENTENCE_MONOTONY',
                    message: 'Variasi panjang kalimat terlalu monoton (3 kalimat berturut-turut mirip).',
                    snippet: `Lengths: ${c1}, ${c2}, ${c3}`,
                    severity: 'WARNING'
                });
            }
        }
    }

    private checkSentenceLengths(counts: number[], issues: ValidationIssue[]) {
        // Count long sentences
        const longSentences = counts.filter(c => c > this.config.maxLongLength).length;
        const ratio = longSentences / counts.length;

        if (ratio > this.config.maxLongFreq) {
            issues.push({
                type: 'SENTENCE_MONOTONY',
                message: `Terlalu banyak kalimat panjang (> ${this.config.maxLongLength} kata). Rasio: ${Math.round(ratio * 100)}%`,
                snippet: 'Paragraph stats',
                severity: 'WARNING'
            });
        }
    }

    private scanPatterns(text: string, issues: ValidationIssue[]) {
        FORBIDDEN_PATTERNS.forEach(rule => {
            if (rule.pattern.test(text)) {
                issues.push({
                    type: 'FORBIDDEN_WORD',
                    message: rule.message,
                    snippet: text.match(rule.pattern)?.[0] || 'pattern found',
                    suggestion: rule.suggestion,
                    severity: 'CRITICAL'
                });
            }
        });

        EFFICIENCY_TARGETS.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            if (regex.test(text)) {
                issues.push({
                    type: 'INEFFICIENT_COPULA',
                    message: `Kata "${word}" terdeteksi. Cek apakah bisa dihapus untuk efisiensi.`,
                    snippet: word,
                    suggestion: 'Hapus jika tidak mengubah makna.',
                    severity: 'WARNING'
                });
            }
        });
    }

    private checkBudget(text: string, issues: ValidationIssue[]) {
        for (const [word, rule] of Object.entries(BUDGETED_WORDS)) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = text.match(regex);
            const count = matches ? matches.length : 0;

            if (count > rule.limit) {
                issues.push({
                    type: 'BUDGET_EXCEEDED',
                    message: `Penggunaan kata "${word}" melebihi batas (Max: ${rule.limit}, Found: ${count}).`,
                    snippet: word,
                    suggestion: rule.suggestion,
                    severity: rule.limit === 0 ? 'CRITICAL' : 'WARNING'
                });
            }
        }
    }

    private checkSentenceStarts(sentences: string[], issues: ValidationIssue[]) {
        sentences.forEach((s, idx) => {
            if (/^Ini\b/i.test(s)) {
                issues.push({
                    type: 'BAD_PLACEMENT',
                    message: 'Dilarang memulai kalimat dengan kata "Ini".',
                    snippet: s.substring(0, 20) + '...',
                    suggestion: 'Gunakan "Hal tersebut" atau subjek spesifik.',
                    severity: 'CRITICAL'
                });
            }
        });
    }
}
