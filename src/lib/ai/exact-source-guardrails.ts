export const EXACT_SOURCE_INSPECTION_RULES = `EXACT SOURCE INSPECTION RULES:
- For any request asking for an exact title, author, published date, paragraph number, or verbatim quote from a previously stored source, call inspectSourceDocument before answering.
- Use quoteFromSource and searchAcrossSources only for semantic retrieval, not for exact paragraph positions or exact metadata verification.
- If the requested exact detail is unavailable, say it cannot be verified exactly from the verified source data.
- Do not infer article titles from URLs, slugs, or citation labels.
- Never mention internal tools, RAG, retrieval, fetch pipelines, or available web sources to the user.
- Respond in natural narrative language.`

export function buildExactSourceInspectionSystemMessage() {
  return {
    role: "system" as const,
    content: EXACT_SOURCE_INSPECTION_RULES,
  }
}

export function buildExactSourceInspectionRouterNote(hasRecentSources: boolean) {
  if (!hasRecentSources) return ""

  return `
RAG SOURCE CHUNKS AVAILABLE:
Stored source content from previous web search turns is available for follow-up inspection without a new web search.
Use inspectSourceDocument for exact title, author, published date, paragraph number, or verbatim quote requests about existing sources.
Use quoteFromSource and searchAcrossSources only when the user needs relevant passages or semantic matches within existing sources.
Set enableWebSearch=false when the user asks about previously cited sources, requests quotes,
asks for exact title/author/date/paragraph details from earlier results, or references information from prior search responses.
Only set enableWebSearch=true when the user explicitly asks for NEW/ADDITIONAL sources on a NEW topic.`
}

