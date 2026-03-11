import type { DomainTier } from "../references/domain-tiers"
import { BLOCKED_DOMAINS_SKILL } from "../references/domain-tiers"
import { BLOCKED_DOMAINS } from "@/lib/ai/blocked-domains"
import type { SourceEntry } from "../../types"

export interface ScoredSource {
  url: string
  title: string
  tier: DomainTier
}

export interface ScoreResult {
  valid: boolean
  scoredSources: ScoredSource[]
  filteredOut: SourceEntry[]
  error?: string
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ""
  }
}

function isBlockedDomain(hostname: string): boolean {
  const allBlocked = [...BLOCKED_DOMAINS, ...BLOCKED_DOMAINS_SKILL]
  // Deduplicate via Set for efficiency
  const uniqueBlocked = new Set(allBlocked)
  return Array.from(uniqueBlocked).some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  )
}

/**
 * Filter sources: remove blocked domains, pass everything else through.
 *
 * Source quality evaluation is delegated to the model via SKILL.md
 * instructions — not enforced by deterministic scoring.
 */
export function scoreSources(sources: SourceEntry[]): ScoreResult {
  if (sources.length === 0) {
    return { valid: true, scoredSources: [], filteredOut: [] }
  }

  const passed: ScoredSource[] = []
  const filteredOut: SourceEntry[] = []

  for (const source of sources) {
    const hostname = getHostname(source.url)
    if (hostname && isBlockedDomain(hostname)) {
      filteredOut.push(source)
    } else {
      passed.push({ url: source.url, title: source.title, tier: "pass" })
    }
  }

  if (passed.length === 0 && filteredOut.length > 0) {
    return {
      valid: false,
      error: "All sources are from blocked domains. No usable sources remain.",
      scoredSources: [],
      filteredOut,
    }
  }

  return {
    valid: true,
    scoredSources: passed,
    filteredOut,
  }
}
