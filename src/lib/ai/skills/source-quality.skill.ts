import type {
  Skill,
  SkillContext,
  ValidationResult,
  SourceEntry,
} from "./types"
import { BLOCKED_DOMAINS } from "@/lib/ai/blocked-domains"

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

export const MIN_QUALITY_SCORE = 30

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

export const sourceQualitySkill: Skill<SourceQualityValidateArgs> = {
  name: "source-quality",
  wrappedTools: [],

  instructions(): string | null {
    return `## SOURCE QUALITY CRITERIA
When evaluating and selecting web search sources:
- Prefer academic sources (.edu, .ac.id, scholar.google.com, pubmed, arxiv, etc.)
- Trust institutional sources (.gov, .go.id, WHO, World Bank, etc.)
- Major news outlets are acceptable for current events
- AVOID: Wikipedia, Reddit, Quora, personal blogs, content farms
- Diversify sources across different domains and tiers
- Prefer specific article pages over homepages`
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
