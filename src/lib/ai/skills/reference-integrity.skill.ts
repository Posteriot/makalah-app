import type { Skill, SkillContext, ValidationResult, SourceEntry } from "./types"

export interface ReferenceValidateArgs {
  toolName: "createArtifact" | "updateArtifact" | "updateStageData"
  claimedSources?: SourceEntry[]
  claimedReferences?: Array<{ title: string; url?: string; authors?: string }>
  availableSources: SourceEntry[]
  hasRecentSources: boolean
}

function canonicalizeUrl(raw: string): string {
  try {
    const u = new URL(raw)
    for (const key of Array.from(u.searchParams.keys())) {
      if (/^utm_/i.test(key)) u.searchParams.delete(key)
    }
    u.hash = ""
    const out = u.toString()
    return out.endsWith("/") ? out.slice(0, -1) : out
  } catch {
    return raw
  }
}

function isUrlInAvailable(url: string, available: SourceEntry[]): boolean {
  const canonical = canonicalizeUrl(url)
  return available.some((s) => canonicalizeUrl(s.url) === canonical)
}

export const referenceIntegritySkill: Skill<ReferenceValidateArgs> = {
  name: "reference-integrity",
  wrappedTools: ["createArtifact", "updateArtifact", "updateStageData"],

  instructions(context: SkillContext): string | null {
    if (!context.hasRecentSources) return null

    return `## REFERENCE INTEGRITY

You are accountable for every reference you cite.

### Integration, Not Decoration
- Every cited source must serve a PURPOSE in your argument.
- When you cite, explain WHY this source matters to the point you are making.
- Do not stack citations at the end of a paragraph as decoration.
  BAD:  "AI impacts employment [1][2][3]."
  GOOD: "McKinsey (2025) estimates 30% of tasks are automatable [1], though ILO data suggests net job creation in service sectors [2]."

### Source Honesty
- ONLY cite URLs from actual web search results. Never fabricate.
- If available sources are insufficient for a claim → say so explicitly and ask the user to search again. Do not stretch a source beyond what it actually says.
- If a source partially supports your claim → state what it supports and what remains unsupported.

### Claim-Source Alignment
- Factual claims require primary data sources. Do not cite a news article as evidence for a statistical claim when the article itself cites a study — find the original study if possible.
- Distinguish between what the source SAYS vs what you INTERPRET from it.
- When sources conflict, present both sides rather than cherry-picking.

### When to Request More Sources
- You are about to make a claim but no available source supports it.
- Available sources only cover one perspective on a contested topic.
- The user's question requires depth that current sources cannot provide.
- In these cases: tell the user what is missing and why another search would strengthen the response.`
  },

  validate(args: ReferenceValidateArgs): ValidationResult {
    if (!args.hasRecentSources || args.availableSources.length === 0) {
      return { valid: true }
    }

    if (args.toolName === "createArtifact" || args.toolName === "updateArtifact") {
      if (!args.claimedSources || args.claimedSources.length === 0) {
        return {
          valid: false,
          error:
            "Sources are required when search results are available. Include sources from the web search results.",
          suggestion:
            "Add claimedSources with URLs from the available search results.",
        }
      }

      const unmatched = args.claimedSources.filter(
        (s) => !isUrlInAvailable(s.url, args.availableSources)
      )
      if (unmatched.length > 0) {
        const urls = unmatched.map((s) => s.url).join(", ")
        return {
          valid: false,
          error: `Source URL(s) not found in available search results: ${urls}`,
          suggestion:
            "Only use URLs that were returned by web search. Request another search if you need different sources.",
        }
      }

      return { valid: true }
    }

    if (args.toolName === "updateStageData") {
      if (!args.claimedReferences || args.claimedReferences.length === 0) {
        return { valid: true }
      }

      const refsWithUrl = args.claimedReferences.filter((r) => r.url)
      if (refsWithUrl.length === 0) {
        return { valid: true }
      }

      const unmatched = refsWithUrl.filter(
        (r) => !isUrlInAvailable(r.url!, args.availableSources)
      )
      if (unmatched.length > 0) {
        const urls = unmatched.map((r) => r.url).join(", ")
        return {
          valid: false,
          error: `Reference URL(s) not found in available search results: ${urls}`,
          suggestion:
            "Only use URLs from web search results when adding references to stage data.",
        }
      }

      return { valid: true }
    }

    return { valid: true }
  },

  examples: [
    {
      toolName: "createArtifact",
      scenario: "Creating artifact with valid sources from search results",
      correctArgs: {
        sources: [
          { url: "https://scholar.google.com/paper-1", title: "Paper 1" },
        ],
      },
      explanation:
        "Sources must reference URLs that were returned by web search.",
    },
    {
      toolName: "createArtifact",
      scenario: "Attempting to use fabricated URL vs correct URL",
      correctArgs: {
        sources: [
          { url: "https://scholar.google.com/paper-1", title: "Paper 1" },
        ],
      },
      incorrectArgs: {
        sources: [
          { url: "https://fabricated.com/fake", title: "Fake Paper" },
        ],
      },
      explanation:
        "Never fabricate source URLs. Only use URLs from actual search results.",
    },
    {
      toolName: "updateStageData",
      scenario: "Updating stage data with references from search results",
      correctArgs: {
        data: {
          referensiAwal: [
            {
              title: "Real Paper",
              url: "https://journals.org/real-paper",
              authors: "Author A",
            },
          ],
        },
      },
      explanation:
        "Reference URLs in stage data must come from web search results.",
    },
  ],
}
