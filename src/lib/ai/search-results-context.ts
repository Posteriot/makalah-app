interface SearchSource {
  url: string
  title: string
  tier?: string
  score?: number
  citedText?: string
}

export function buildSearchResultsContext(
  sources: SearchSource[],
  searchText?: string,
): string {
  if (sources.length === 0) {
    return `## SEARCH RESULTS\nNo sources found from web search. Answer based on your knowledge and inform the user that no web sources were available.`
  }

  const sourceList = sources
    .map((s, i) => {
      const tierLabel = s.tier ? ` (${s.tier})` : ""
      const snippet = s.citedText ? `\n   Snippet: ${s.citedText}` : ""
      return `${i + 1}. ${s.title} — ${s.url}${tierLabel}${snippet}`
    })
    .join("\n")

  const searchFindings = searchText?.trim()
    ? `\n\nSearch findings (raw, for your synthesis — do NOT copy verbatim, rewrite with your own analysis):\n${searchText.trim()}`
    : ""

  return `## SEARCH RESULTS (COMPLETED)
Web search has been executed. The following sources were retrieved.
You MUST synthesize these sources in your response. Use ONLY these sources for citations. Do not fabricate or guess URLs.

Sources:
${sourceList}${searchFindings}`
}
