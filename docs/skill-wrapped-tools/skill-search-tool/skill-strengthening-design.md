# Skill Strengthening + Observability Design

**Goal:** Transform skill instructions from static gatekeeping rules into research methodology guidance that makes the model a better researcher. Add simple ai-ops indicator to verify skills are active.

**Architecture:** No structural changes. Same skill modules, same validate() logic. Only `instructions()` content changes + telemetry logging added at validation points. Ai-ops extends existing Skill Monitor panel.

---

## Section 1: Source Quality Skill — Instructions Redesign

### Current State (6-line checklist)

```
- Prefer academic sources (.edu, .ac.id, scholar.google.com, pubmed, arxiv, etc.)
- Trust institutional sources (.gov, .go.id, WHO, World Bank, etc.)
- Major news outlets are acceptable for current events
- AVOID: Wikipedia, Reddit, Quora, personal blogs, content farms
- Diversify sources across different domains and tiers
- Prefer specific article pages over homepages
```

### New: Base Instructions (always injected when search is active)

```
## RESEARCH SOURCE STRATEGY

You are a researcher, not a link collector.

### Evaluate Source Substance
Do not judge sources by domain alone. Evaluate:
- Does the source present PRIMARY DATA (statistics, surveys, studies)?
- Is there METHODOLOGY that can be assessed (sample size, method)?
- Does the source provide ANALYSIS, not just opinion?
- Sources without data/methodology = context only, not argument foundation.

### Source Selection by Purpose
- Factual/statistical claims → require primary data (BPS, World Bank, journals, studies)
- Current trends/events → recent news, then cross-check with institutional data
- Concepts/theory → academic literature, peer-reviewed journals
- Never force one source type for all purposes.

### Build Narrative FROM Sources
- Every cited source must CONTRIBUTE to the argument — explain its relevance,
  do not just attach and move on.
- Build from strongest to supporting: primary data → institutional analysis
  → news context.
- When sources contradict each other — acknowledge it, do not ignore.
- When available sources are insufficient for the claim you want to make
  → tell the user, request another search. Do not force weak sources.

### Diversification
- Minimum 2 different perspectives/domains for substantive claims
- Do not use 3+ sources from the same domain unless it is the specialist
  authority on that topic
```

### New: Context-Specific Additions (appended based on currentStage)

Only for ACTIVE search stages. Passive stages (outline, abstrak, hasil, kesimpulan, pembaruan_abstrak, daftar_pustaka, lampiran, judul) return `null` — search is disabled, skill does not inject.

| Stage | Search | Addition |
|-------|--------|----------|
| `gagasan`, `topik` | ACTIVE | "Exploration phase: seek breadth, not depth. 3-5 diverse sources to map the landscape." |
| `tinjauan_literatur` | ACTIVE | "Literature review phase: seek depth. Minimum 5 sources, prioritize academic/journals. Identify patterns across studies, gaps not yet addressed, and position the user's research within the existing landscape." |
| `pendahuluan` | ACTIVE | "Framing phase: sources to build problem context. Use primary data to establish significance, academic sources for theoretical grounding." |
| `metodologi` | ACTIVE | "Methodology phase: cite sources that justify the approach. Find studies using similar methods as precedent." |
| `diskusi` | ACTIVE | "Discussion phase: sources for cross-referencing findings. Compare with other studies — what aligns, what differs, and why." |
| `null` / non-paper | ACTIVE | "Chat mode: match depth to the question. Casual = 2-3 sources sufficient. Serious inquiry = treat as mini literature review." |

### Validate Logic

**No changes.** Domain tier scoring, diversity checks, and filtering remain as-is. The enforcement layer (otot) stays — only the guidance layer (otak) changes.

---

## Section 2: Reference Integrity Skill — Instructions Redesign

### Current State (4-line rules)

```
- ONLY use URLs from sources that were returned by web search
- Do NOT fabricate, guess, or hallucinate any source URLs
- Every cited URL must match one of the available search result URLs
- If you need more sources, request a web search first
```

### New: Research Integrity Methodology

```
## REFERENCE INTEGRITY

You are accountable for every reference you cite.

### Integration, Not Decoration
- Every cited source must serve a PURPOSE in your argument.
- When you cite, explain WHY this source matters to the point you are making.
- Do not stack citations at the end of a paragraph as decoration.
  BAD:  "AI impacts employment [1][2][3]."
  GOOD: "McKinsey (2025) estimates 30% of tasks are automatable [1],
         though ILO data suggests net job creation in service sectors [2]."

### Source Honesty
- ONLY cite URLs from actual web search results. Never fabricate.
- If available sources are insufficient for a claim → say so explicitly
  and ask the user to search again. Do not stretch a source beyond what
  it actually says.
- If a source partially supports your claim → state what it supports and
  what remains unsupported.

### Claim-Source Alignment
- Factual claims require primary data sources. Do not cite a news article
  as evidence for a statistical claim when the article itself cites a study
  — find the original study if possible.
- Distinguish between what the source SAYS vs what you INTERPRET from it.
- When sources conflict, present both sides rather than cherry-picking.

### When to Request More Sources
- You are about to make a claim but no available source supports it.
- Available sources only cover one perspective on a contested topic.
- The user's question requires depth that current sources cannot provide.
- In these cases: tell the user what is missing and why another search
  would strengthen the response.
```

### Context Behavior

Only injected when `hasRecentSources === true`. When no recent sources exist, returns `null`.

### Validate Logic

**No changes.** URL cross-checking against available sources remains as-is.

---

## Section 3: Ai-Ops Indicator

Extend existing Skill Runtime Monitoring panel (already in ai-ops at `/dashboard` → Skill Monitor). Not a new panel — add search skill data to existing infrastructure.

### Metrics to Add

| Metric | Source | Description |
|--------|--------|-------------|
| Skill Applied count | Increment when `validateWithScores()` or `referenceIntegritySkill.validate()` fires | Proves skill is active |
| Rejection count | When validate returns `{ valid: false }` | Proves enforcement works |
| Sources scored | Count of sources entering scoring pipeline | Volume indicator |
| Sources filtered | Count of sources filtered out (blocked/low-quality) | Filtering activity |

### Trace Table Extension

Same pattern as existing Skill Runtime Trace:

| Waktu | Context | Source | Skill | Detail |
|-------|---------|--------|-------|--------|
| 09 Mar, 01:36 | gagasan | SKILL | source-quality | 8 scored, 2 filtered |
| 09 Mar, 01:36 | chat | SKILL | reference-integrity | 3 claimed, 3 matched |
| 09 Mar, 01:35 | topik | REJECT | reference-integrity | 1 URL not in search results |

### Implementation Approach

Log to existing `aiTelemetry` table with new fields or use existing `toolUsed` field with skill name. Query via existing ai-ops panel infrastructure.

---

## Section 4: Testing Strategy

### Visual Testing via Chat UI

1. **Local** (with skills): chat at `localhost:3000`, verify ai-ops indicator shows skill active
2. **Remote** (without skills): chat at production, same topic
3. **Compare** on the same topic — observable differences:
   - Does local model integrate sources into narrative (not just attach)?
   - Does local model select sources by purpose (data for claims, news for context)?
   - Does local model acknowledge limitations or contradictions?
   - Does local model request more search when sources are insufficient?

### Ai-Ops Verification

After any chat with web search, check Skill Monitor:
- source-quality: Skill Applied incremented, scored/filtered counts visible
- reference-integrity: Skill Applied incremented, claimed/matched counts visible
- Any REJECT entries = enforcement caught an issue

---

## Summary of Changes

| Component | What Changes | What Stays |
|-----------|-------------|------------|
| source-quality `instructions()` | Rewritten: checklist → research methodology | `validate()`, scoring, domain tiers |
| reference-integrity `instructions()` | Rewritten: rules → integrity methodology | `validate()`, URL cross-check |
| ai-ops Skill Monitor | Extended with search skill metrics + trace | Existing panel structure |
| SkillContext | May need `stageSearchPolicy` field | Existing fields |
| Telemetry | Log skill validation events | Existing aiTelemetry table |
