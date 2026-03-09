interface SearchSource {
  url: string
  title: string
  tier?: string
  score?: number
}

export function buildSearchResultsContext(
  sources: SearchSource[],
): string {
  if (sources.length === 0) {
    return `## SEARCH RESULTS\nNo sources found from web search. Answer based on your knowledge and inform the user that no web sources were available.`
  }

  const sourceList = sources
    .map((s, i) => {
      const tierLabel = s.tier ? ` (${s.tier})` : ""
      return `${i + 1}. ${s.title} — ${s.url}${tierLabel}`
    })
    .join("\n")

  return `## SEARCH RESULTS
You have the following sources from web search.
Use ONLY these sources for citations. Do not fabricate or guess URLs.

Sources:
${sourceList}`
}
