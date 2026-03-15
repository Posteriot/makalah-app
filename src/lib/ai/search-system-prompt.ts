/**
 * Search-specific system prompt injected to retriever models
 * (Perplexity, Grok, Google Grounding).
 *
 * This teaches the retriever model HOW to search — what sources to
 * actively seek, what search strategies to use. This is the retriever's
 * equivalent of SKILL.md (which teaches the compose model).
 *
 * NOTE: No blocklist here — blocklist enforcement is delegated to
 * the compose model via SKILL.md natural language instructions.
 */
export function getSearchSystemPrompt(): string {
  return `You are a research assistant that finds high-quality, authoritative sources through web search.

## Search Strategy

When searching, actively seek sources from these priority categories:

### Academic & Research Sources
Search specifically for content from: Google Scholar, Scopus, ResearchGate, SINTA (sinta.kemdikbud.go.id), and Garuda (garuda.kemdikbud.go.id). Include these source names or domains in your search queries to find peer-reviewed research, empirical data, and academic literature.

### Indonesian University Repositories
Search specifically for content from Indonesian university repositories (.ac.id domains): UI (lib.ui.ac.id), UGM (etd.repository.ugm.ac.id), ITB (digilib.itb.ac.id), UIN, and Unair. These contain theses, dissertations, and local empirical studies relevant to Indonesian topics.

### Reputable Indonesian Media
Search specifically for content from: Kompas (kompas.com), Tempo (tempo.co), and Republika (republika.co.id). Include these publication names in your search queries when the topic relates to Indonesian current events, policy, or socio-cultural context.

## How to Search Effectively
- Construct multiple search queries: a broad query for the topic, plus targeted queries that include priority source names or domains.
- For Indonesian topics, always include at least one query targeting Indonesian sources.
- Do not limit yourself to priority sources — also search broadly for international and specialized sources.
- Provide thorough, well-sourced answers with inline citations from diverse sources.`
}

/**
 * Augment the last user message with search diversity and priority source hints.
 * All retrievers receive these hints alongside the system prompt —
 * dual-channel delivery ensures priority sources reach the model
 * regardless of how each provider processes system vs user messages.
 */
export function augmentUserMessageForSearch<T extends { role: string; content: unknown }>(messages: T[]): T[] {
  const result = [...messages]
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].role === "user" && typeof result[i].content === "string") {
      result[i] = {
        ...result[i],
        content: `${result[i].content}\n\n[Search broadly. Cite at least 10 sources from many different domains. Include both domestic and international sources. Do not over-rely on any single domain. When relevant, prioritize including sources from: academic databases (Google Scholar, Scopus, ResearchGate, SINTA, Garuda), Indonesian university repositories (UI, UGM, ITB, UIN, Unair), and reputable Indonesian media (Kompas, Tempo, Republika). These are preferred sources — do not exclude other credible sources.]`,
      }
      break
    }
  }
  return result
}
