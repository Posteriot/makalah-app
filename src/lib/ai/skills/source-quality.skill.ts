import type {
  Skill,
  SkillContext,
  ValidationResult,
  SourceEntry,
} from "./types"
import type { PaperStageId } from "@convex/paperSessions/constants"
import { BLOCKED_DOMAINS } from "@/lib/ai/blocked-domains"
import { ACTIVE_SEARCH_STAGES } from "@/lib/ai/stage-skill-contracts"

export interface SourceQualityValidateArgs {
  sources: SourceEntry[]
}

export type DomainTier =
  | "academic"
  | "institutional"
  | "news-major"
  | "news-local"
  | "unknown"
  | "blocked"

export interface ScoredSource {
  url: string
  title: string
  tier: DomainTier
  score: number
}

export interface SourceQualityResult extends Record<string, unknown> {
  valid: boolean
  error?: string
  suggestion?: string
  scoredSources?: ScoredSource[]
  filteredOut?: SourceEntry[]
  diversityWarning?: string
}

const MIN_QUALITY_SCORE = 30

const ACADEMIC_DOMAINS = [
  "scholar.google.com",
  "pubmed.ncbi.nlm.nih.gov",
  "arxiv.org",
  "jstor.org",
  "researchgate.net",
  "semanticscholar.org",
  "sciencedirect.com",
  "springer.com",
  "nature.com",
  "wiley.com",
  "ieee.org",
  "acm.org",
  "plos.org",
  "doi.org",
]

const INSTITUTIONAL_DOMAINS = [
  "who.int",
  "worldbank.org",
  "un.org",
  "imf.org",
  "oecd.org",
  "bps.go.id",
  "bi.go.id",
]

const MAJOR_NEWS_DOMAINS = [
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "nytimes.com",
  "theguardian.com",
  "washingtonpost.com",
  "ft.com",
  "bloomberg.com",
  "economist.com",
  "kompas.com",
  "tempo.co",
  "cnnindonesia.com",
]

const BASE_SCORES: Record<DomainTier, number> = {
  academic: 90,
  institutional: 80,
  "news-major": 70,
  "news-local": 50,
  unknown: 40,
  blocked: 0,
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ""
  }
}

function isBlockedDomain(hostname: string): boolean {
  return BLOCKED_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  )
}

function isAcademicDomain(hostname: string): boolean {
  if (
    hostname.endsWith(".edu") ||
    hostname.endsWith(".ac.id") ||
    hostname.endsWith(".ac.uk")
  ) {
    return true
  }
  return ACADEMIC_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  )
}

function isInstitutionalDomain(hostname: string): boolean {
  if (hostname.endsWith(".go.id") || hostname.endsWith(".gov")) {
    return true
  }
  return INSTITUTIONAL_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  )
}

function isMajorNewsDomain(hostname: string): boolean {
  return MAJOR_NEWS_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  )
}

export function classifyDomain(url: string): DomainTier {
  const hostname = getHostname(url)
  if (!hostname) return "unknown"
  if (isBlockedDomain(hostname)) return "blocked"
  if (isAcademicDomain(hostname)) return "academic"
  if (isInstitutionalDomain(hostname)) return "institutional"
  if (isMajorNewsDomain(hostname)) return "news-major"
  return "unknown"
}

function isHomepage(url: string): boolean {
  try {
    const u = new URL(url)
    return u.pathname === "/" || u.pathname === ""
  } catch {
    return false
  }
}

function hasArticlePath(url: string): boolean {
  try {
    const u = new URL(url)
    const path = u.pathname.toLowerCase()
    // Has meaningful path segments (more than just /)
    const segments = path.split("/").filter(Boolean)
    return segments.length >= 2
  } catch {
    return false
  }
}

function hasInformativeTitle(title: string): boolean {
  // Title with 3+ words is considered informative
  return title.trim().split(/\s+/).length >= 3
}

function scoreSource(url: string, title: string): ScoredSource {
  const tier = classifyDomain(url)
  let score = BASE_SCORES[tier]

  if (tier !== "blocked") {
    if (isHomepage(url)) score -= 10
    if (hasArticlePath(url)) score += 5
    if (hasInformativeTitle(title)) score += 5
  }

  return { url, title, tier, score }
}

function checkDiversity(
  scored: ScoredSource[]
): string | undefined {
  if (scored.length < 3) return undefined

  // Check single-domain concentration (3+)
  const domainCounts = new Map<string, number>()
  for (const s of scored) {
    const hostname = getHostname(s.url)
    domainCounts.set(hostname, (domainCounts.get(hostname) ?? 0) + 1)
  }
  for (const [domain, count] of domainCounts) {
    if (count >= 3) {
      return `Low source diversity: ${count} sources from ${domain}. Consider diversifying.`
    }
  }

  // Check same-tier concentration (4+)
  if (scored.length >= 4) {
    const tierCounts = new Map<DomainTier, number>()
    for (const s of scored) {
      tierCounts.set(s.tier, (tierCounts.get(s.tier) ?? 0) + 1)
    }
    for (const [tier, count] of tierCounts) {
      if (count >= 4) {
        return `Low source diversity: ${count} sources from the same tier (${tier}). Consider mixing academic, institutional, and news sources.`
      }
    }
  }

  return undefined
}

export function validateWithScores(
  args: SourceQualityValidateArgs
): SourceQualityResult {
  if (args.sources.length === 0) {
    return { valid: true }
  }

  const scored: ScoredSource[] = []
  const filteredOut: SourceEntry[] = []

  for (const source of args.sources) {
    const result = scoreSource(source.url, source.title)
    if (result.score < MIN_QUALITY_SCORE) {
      filteredOut.push(source)
    } else {
      scored.push(result)
    }
  }

  if (scored.length === 0) {
    return {
      valid: false,
      error:
        "All sources are below the quality threshold. No usable sources remain.",
      suggestion:
        "Search for higher-quality sources from academic, institutional, or major news outlets.",
      scoredSources: [],
      filteredOut,
    }
  }

  const diversityWarning = checkDiversity(scored)

  return {
    valid: true,
    scoredSources: scored,
    filteredOut: filteredOut.length > 0 ? filteredOut : undefined,
    diversityWarning,
  }
}

function getStageGuidance(stage: PaperStageId | null): string {
  switch (stage) {
    case "gagasan":
    case "topik":
      return "Exploration phase: seek breadth, not depth. 3-5 diverse sources to map the landscape."
    case "tinjauan_literatur":
      return "Literature review phase: seek depth. Minimum 5 sources, prioritize academic/journals. Identify patterns across studies, gaps not yet addressed, and position the user's research within the existing landscape."
    case "pendahuluan":
      return "Framing phase: sources to build problem context. Use primary data to establish significance, academic sources for theoretical grounding."
    case "metodologi":
      return "Methodology phase: cite sources that justify the approach. Find studies using similar methods as precedent."
    case "diskusi":
      return "Discussion phase: sources for cross-referencing findings. Compare with other studies — what aligns, what differs, and why."
    default:
      return "Chat mode: match depth to the question. Casual = 2-3 sources sufficient. Serious inquiry = treat as mini literature review."
  }
}

export const sourceQualitySkill: Skill<SourceQualityValidateArgs> = {
  name: "source-quality",
  wrappedTools: [],

  instructions(context: SkillContext): string | null {
    // Passive search stages: search is disabled, no instructions needed
    if (
      context.isPaperMode &&
      context.currentStage &&
      !ACTIVE_SEARCH_STAGES.includes(context.currentStage as PaperStageId)
    ) {
      return null
    }

    const stageGuidance = getStageGuidance(
      context.isPaperMode ? (context.currentStage as PaperStageId | null) : null
    )

    const base = `## RESEARCH SOURCE STRATEGY

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
- Every cited source must CONTRIBUTE to the argument — explain its relevance, do not just attach and move on.
- Build from strongest to supporting: primary data → institutional analysis → news context.
- When sources contradict each other — acknowledge it, do not ignore.
- When available sources are insufficient for the claim you want to make → tell the user, request another search. Do not force weak sources.

### Diversification
- Minimum 2 different perspectives/domains for substantive claims
- Do not use 3+ sources from the same domain unless it is the specialist authority on that topic`

    if (stageGuidance) {
      return `${base}\n\n### Stage Context\n${stageGuidance}`
    }

    return base
  },

  validate(args: SourceQualityValidateArgs): ValidationResult {
    const result = validateWithScores(args)
    if (!result.valid) {
      return {
        valid: false,
        error: result.error!,
        suggestion: result.suggestion,
      }
    }
    return { valid: true }
  },

  examples: [],
}
