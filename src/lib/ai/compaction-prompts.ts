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
    return `Ringkas diskusi berikut jadi 3-5 bullet points dalam bahasa Indonesia.
Fokus pada:
- Keputusan yang disepakati user dan AI
- Referensi atau data yang dibahas
- Request user yang belum diselesaikan
- Perubahan/revisi yang diminta

Konteks: Tahap paper "${stageName}" sedang berlangsung.
Max 500 karakter total. Hanya bullet points, tanpa pembuka/penutup.`
}

/**
 * Prompt for summarizing general (non-paper) chat history.
 * Called when conversation messages exceed threshold without paper context.
 */
export function getGeneralChatSummaryPrompt(): string {
    return `Ringkas percakapan berikut jadi 3-7 bullet points dalam bahasa Indonesia.
Fokus pada:
- Topik utama yang dibahas
- Keputusan atau kesepakatan
- File yang di-upload atau dibahas
- Request yang belum selesai

Max 500 karakter total. Hanya bullet points, tanpa pembuka/penutup.`
}
