# Architecture Constraints: Makalah AI Skills

## Language Rule

**ALL skill instructions MUST be written in English.**

- Model's native language is English — instructions in English minimize ambiguity and maximize accuracy
- This applies to: SKILL.md body, stage guidance, system notes
- Indonesian is for USER-FACING output only (Gemini's response to user), never for model instructions
- Search system prompts to Perplexity/Grok must also be in English
- This rule applies to ALL skills, not just `web-search-quality`

## Skill Scope

- `src/lib/ai/skills/` is dedicated to search web tools (for now)
- Each skill is a self-contained folder following adapted Anthropic skill concept
- Skills are NOT Claude Code skills — they are server-side knowledge layers injected into Gemini's compose phase
- Pattern will be extended to other tools once proven effective

## Separation of Concerns

- **Skill** = HOW Gemini processes and presents results (source evaluation, narration, integrity, blocklist)
- **Workflow** = WHEN tools are available and what mode is active (paper stage enforcement, mode switching)
- **Tool** = simple executor — retrieves data, no quality judgment
- These are independent concerns — do not mix them in the same skill

## Tools vs Skills vs Code Pipeline

This is the core architectural principle, validated through iterative experimentation:

### Tools are Simple Executors
- Perplexity/Grok = retrieve broadly, return raw sources
- No blocklist, no filtering, no scoring at the tool level
- Tools should be free to gather as much data as possible
- Constraining tools constrains the LLM's intelligence

### Skills Provide Intelligence
- SKILL.md = knowledge layer that tells Gemini HOW to evaluate, filter, and present
- Blocklist enforcement via natural language in SKILL.md (not code)
- Source credibility evaluation via skill instructions (not domain tier scoring)
- Quality judgment delegated to LLM, not hardcoded in pipeline

### Code Pipeline Should Be Minimal
- normalize → pass ALL to Gemini — that's it
- No intermediate scoring, filtering, enrichment, or dedup between search and compose
- Deterministic code only for: URL normalization, citation format normalization
- Every code filter step between tool output and LLM input = potential source loss

### Why This Works
- LLMs are trained to follow instructions — they respect blocklists written in natural language
- Complex pipelines (score → enrich → filter → dedup) lost 50% of sources in practice
- Simpler pipeline = more sources preserved = better Gemini output
- Skill instructions are easier to update than code logic

## Blocklist Strategy

**Blocklist lives in SKILL.md as natural language, NOT as programmatic code filter.**

- `src/lib/ai/blocked-domains.ts` still exists as canonical list (shared reference)
- But `isBlockedSourceDomain()` is NOT called in the search pipeline
- Gemini respects "NEVER cite these domains" instruction in SKILL.md
- Validated: 14 sources preserved, zero blocked domains in final output

## Search System Prompt Strategy

- Perplexity/Grok receive a minimal system prompt: "You are a research assistant. Provide thorough, well-sourced answers..."
- NO blocklist in search system prompt — let search models retrieve freely
- User message augmented with diversity hints (breadth, minimum sources, multi-domain)
- Perplexity uses user message content as search query basis — system prompt affects text, not retrieval
