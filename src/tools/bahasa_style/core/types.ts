export interface StyleConfig {
    maxShortLength: number;   // e.g., 4 words
    maxMediumLength: number;  // e.g., 8 words
    maxLongLength: number;    // e.g., 12 words
    maxLongFreq: number;      // e.g., 0.1 (10%)
}

export type IssueType =
    | 'FORBIDDEN_WORD'
    | 'SENTENCE_MONOTONY'
    | 'BAD_PLACEMENT'
    | 'INDONENGLISH'
    | 'INEFFICIENT_COPULA'
    | 'BUDGET_EXCEEDED';

export interface ValidationIssue {
    type: IssueType;
    message: string;
    snippet: string;
    suggestion?: string;
    severity: 'CRITICAL' | 'WARNING';
}

export interface ValidationResult {
    isValid: boolean;
    score: number; // 0-100 (100 = Perfect Style)
    issues: ValidationIssue[];
}
