/**
 * LLM Summarization Prompt Templates for Context Compaction (P3)
 *
 * Used by context-compaction.ts when P1-P2 are insufficient
 * and LLM summarization is needed to reduce context size.
 */

/**
 * Prompt for summarizing mid-stage paper discussion.
 * Called when messages within a single paper stage exceed threshold.
 */
export function getPaperMidStageSummaryPrompt(stageName: string): string {
    return `Summarize the following discussion into 3-5 bullet points in Indonesian (Bahasa Indonesia).
Focus on:
- Decisions agreed upon by user and AI
- References or data discussed
- Unresolved user requests
- Changes or revisions requested

Context: Paper stage "${stageName}" is currently in progress.
Max 500 characters total. Bullet points only, no introduction or conclusion.`
}

/**
 * Prompt for summarizing general (non-paper) chat history.
 * Called when conversation messages exceed threshold without paper context.
 */
export function getGeneralChatSummaryPrompt(): string {
    return `Summarize the following conversation into 3-7 bullet points in Indonesian (Bahasa Indonesia).
Focus on:
- Main topics discussed
- Decisions or agreements
- Files uploaded or discussed
- Unresolved requests

Max 500 characters total. Bullet points only, no introduction or conclusion.`
}
