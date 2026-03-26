interface SearchSource {
  url: string
  title: string
  tier?: string
  score?: number
  citedText?: string
  pageContent?: string // actual page content in markdown
}

export type SearchResultsContextOptions = {
  responseMode?: "synthesis"
}

function getSearchFindingsIntro(): string {
  return "Search findings (raw, for your synthesis — do NOT copy verbatim, rewrite with your own analysis):"
}

export function buildSearchResultsContext(
  sources: SearchSource[],
  searchText?: string,
  options: SearchResultsContextOptions = {},
): string {
  if (sources.length === 0) {
    return `## SEARCH RESULTS\nNo sources found from web search. Answer based on your knowledge and inform the user that no web sources were available.`
  }

  // Only show verified/unverified labels when at least one source has pageContent.
  // When FetchWeb is entirely unavailable (no source has pageContent), omit labels
  // to avoid making compose model over-cautious — behave like current pipeline.
  const anyHasPageContent = sources.some((s) => s.pageContent)

  const sourceList = sources
    .map((s, i) => {
      const tierLabel = s.tier ? ` (${s.tier})` : ""
      const snippet = s.citedText ? `\n   Snippet: ${s.citedText}` : ""
      let content = ""
      if (anyHasPageContent) {
        content = s.pageContent
          ? `\n   Page content (verified):\n   ${s.pageContent.split("\n").join("\n   ")}`
          : "\n   [no page content — unverified source]"
      }
      return `${i + 1}. ${s.title} — ${s.url}${tierLabel}${snippet}${content}`
    })
    .join("\n")

  // When page content is available, OMIT searchText from context.
  // searchText is the retriever's synthesis which can contain hallucinations —
  // it's the root cause of compose model fabrication. Page content replaces it
  // as the ground truth source material.
  // When NO page content is available (FetchWeb failed), keep searchText as
  // fallback — same as pre-FetchWeb behavior.
  const searchFindings = (!anyHasPageContent && searchText?.trim())
    ? `\n\n${getSearchFindingsIntro()}\n${searchText.trim()}`
    : ""

  const context = `## SEARCH RESULTS (COMPLETED)
Web search has been executed. The following sources were retrieved.
You MUST synthesize these sources in your response.
Use ONLY these sources for citations. Do not fabricate or guess URLs.

Sources:
${sourceList}${searchFindings}`

  const verifiedCount = sources.filter((s) => s.pageContent).length
  console.log(`[SearchContext] Built context: ${sources.length} sources (${verifiedCount} verified), ${context.length} chars total`)

  return context
}
