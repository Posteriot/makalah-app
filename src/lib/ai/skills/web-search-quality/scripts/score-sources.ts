import type { DomainTier } from "../references/domain-tiers"
import {
  BASE_SCORES,
  MIN_QUALITY_SCORE,
  ACADEMIC_DOMAINS,
  INSTITUTIONAL_DOMAINS,
  MAJOR_NEWS_DOMAINS,
} from "../references/domain-tiers"
import { BLOCKED_DOMAINS } from "@/lib/ai/blocked-domains"
import type { SourceEntry } from "../../types"

export interface ScoredSource {
  url: string
  title: string
  tier: DomainTier
  score: number
}

export interface ScoreResult {
  valid: boolean
  scoredSources: ScoredSource[]
  filteredOut: SourceEntry[]
  diversityWarning?: string
  error?: string
  suggestion?: string
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

export function scoreSource(url: string, title: string): ScoredSource {
  const tier = classifyDomain(url)
  let score = BASE_SCORES[tier]

  if (tier !== "blocked") {
    if (isHomepage(url)) score -= 10
    if (hasArticlePath(url)) score += 5
    if (hasInformativeTitle(title)) score += 5
  }

  return { url, title, tier, score }
}

export function checkDiversity(
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

export function scoreSources(sources: SourceEntry[]): ScoreResult {
  if (sources.length === 0) {
    return { valid: true, scoredSources: [], filteredOut: [] }
  }

  const scored: ScoredSource[] = []
  const filteredOut: SourceEntry[] = []

  for (const source of sources) {
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
    filteredOut,
    diversityWarning,
  }
}
