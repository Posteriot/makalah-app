interface SearchSource {
  url: string
  title: string
  tier?: string
  score?: number
  citedText?: string
  pageContent?: string // actual page content in markdown
}

export type SearchResultsContextOptions = {
  responseMode?: "synthesis" | "reference_inventory" | "mixed"
}

function getResponseModeInstructions(responseMode: NonNullable<SearchResultsContextOptions["responseMode"]>): string {
  if (responseMode === "reference_inventory") {
    return `REFERENCE INVENTORY MODE
This response is an inventory of references, not a general analysis.
- display the URL when available
- do not make factual claims from unverified links
- treat verified page content as claimable evidence
- treat unverified links as displayable pointers only`
  }

  if (responseMode === "mixed") {
    return `MIXED MODE
Provide a brief synthesis first, then a compact reference inventory.
- display the URL when available
- do not make factual claims from unverified links
- keep the anti-fabrication rules in force`
  }

  return ""
}

function getSearchFindingsIntro(responseMode: NonNullable<SearchResultsContextOptions["responseMode"]>): string {
  if (responseMode === "reference_inventory") {
    return "Search findings (raw, for reference inventory — do NOT copy verbatim, rewrite with your own reference list):"
  }

  if (responseMode === "mixed") {
    return "Search findings (raw, for your synthesis and reference inventory — do NOT copy verbatim, rewrite with your own analysis and reference list):"
  }

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

  const responseMode = options.responseMode ?? "synthesis"

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
    ? `\n\n${getSearchFindingsIntro(responseMode)}\n${searchText.trim()}`
    : ""

  const context = `## SEARCH RESULTS (COMPLETED)
Web search has been executed. The following sources were retrieved.
${responseMode === "reference_inventory"
  ? "You MUST build a reference inventory from these sources in your response."
  : responseMode === "mixed"
    ? "You MUST synthesize these sources in your response and include a short reference inventory."
    : "You MUST synthesize these sources in your response."}
Use ONLY these sources for citations. Do not fabricate or guess URLs.

${getResponseModeInstructions(responseMode)}

Sources:
${sourceList}${searchFindings}`

  const verifiedCount = sources.filter((s) => s.pageContent).length
  console.log(`[SearchContext] Built context: ${sources.length} sources (${verifiedCount} verified), ${context.length} chars total`)

  return context
}
