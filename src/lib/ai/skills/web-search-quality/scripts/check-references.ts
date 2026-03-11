import type { SourceEntry, ValidationResult } from "../../types"

export interface ReferenceCheckArgs {
  toolName: "createArtifact" | "updateArtifact" | "updateStageData"
  claimedSources?: SourceEntry[]
  claimedReferences?: Array<{ title: string; url?: string; authors?: string }>
  availableSources: SourceEntry[]
  hasRecentSources: boolean
}

export function canonicalizeUrl(raw: string): string {
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

export function checkReferences(args: ReferenceCheckArgs): ValidationResult {
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
}
