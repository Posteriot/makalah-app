/**
 * @deprecated Absorbed by web-search-quality skill (src/lib/ai/skills/web-search-quality/).
 * This file is kept for reference during transition. Safe to delete after skill pilot validates.
 */
export function getSourcePolicyPrompt(): string {
  return `Search GLOBALLY. Cast a wide net across all credible source types — news media,
academic journals, think tanks, international organizations, and government data.
Do not limit yourself to one category.

Credible Sources (examples, not exhaustive — use any credible source you find):
- News media, e.g.: Kompas, Tempo, Katadata, Tirto, CNN Indonesia, Republika, Reuters, AP News, BBC, NY Times, The Guardian
- Academic, e.g.: arxiv.org, PubMed, ScienceDirect, Nature, Google Scholar, university repositories
- Organizations, e.g.: World Bank, UN agencies, IRENA, IEA, WHO, McKinsey, Brookings
- Government data, e.g.: .go.id, .gov (use as data source, cross-check with independent sources)

These are examples to illustrate the breadth of acceptable sources. Do NOT limit yourself
to only these names. Any credible, verifiable source is welcome.

Blocked: Wikipedia, personal blogs, forums, unverified document-sharing sites.`
}
