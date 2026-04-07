import { canonicalizeUrl } from "./check-references"

export interface SourceBodyParityArgs {
    content: string
    sources: Array<{ url: string; title: string }>
}

export interface SourceBodyParityResult {
    valid: boolean
    error?: string
    level?: "numeric-claim" | "url-inventory"
    details?: {
        claimedCount?: number
        actualSourcesCount?: number
        bodyUrls?: string[]
        sourceUrls?: string[]
        missingFromBody?: string[]
    }
}

const REFERENCE_HEADING_PATTERN = /^#{1,3}\s*(referensi|rujukan|daftar\s+referensi|daftar\s+pustaka|sumber|references|bibliography|sources)\s*$/im

const NUMERIC_CLAIM_PATTERN = /\b(\d+)\s*(rujukan|referensi|sumber|pustaka|references|sources|citations)\b/gi

const SUBSET_DISCLAIMER_PATTERN = /\b(utama\s+dari\s+total|subset|referensi\s+utama|rujukan\s+terpilih|contoh\s+rujukan|sebagian\s+dari|selected\s+references|key\s+references\s+from)\b/i

const URL_PATTERN = /https?:\/\/[^\s)>\]"']+/g

/**
 * Narrow integrity guard for source-body parity.
 * NOT a quality scorer — only checks payload consistency.
 *
 * Level 1: Numeric claim validation
 *   If content says "21 rujukan" but sources.length != 21 → reject
 *
 * Level 2: Reference inventory URL parity
 *   If content has reference heading + URLs → compare with sources
 *   Missing URLs from body → reject (unless explicit subset disclaimer)
 *
 * Skips if: no sources, content is not a reference inventory
 */
export function checkSourceBodyParity(args: SourceBodyParityArgs): SourceBodyParityResult {
    const { content, sources } = args

    // Skip if no sources attached
    if (!sources || sources.length === 0) {
        return { valid: true }
    }

    // === Level 1: Numeric claim validation ===
    const numericMatches = Array.from(content.matchAll(NUMERIC_CLAIM_PATTERN))
    for (const match of numericMatches) {
        const claimedCount = parseInt(match[1], 10)
        if (isNaN(claimedCount)) continue

        if (claimedCount !== sources.length) {
            // Check for subset disclaimer near the claim
            const claimIndex = match.index ?? 0
            const surroundingText = content.slice(
                Math.max(0, claimIndex - 100),
                Math.min(content.length, claimIndex + match[0].length + 100)
            )
            if (SUBSET_DISCLAIMER_PATTERN.test(surroundingText)) {
                continue // Explicit subset — allow
            }

            return {
                valid: false,
                level: "numeric-claim",
                error: `Content claims ${claimedCount} references but sources has ${sources.length} items. Either fix the count or add an explicit subset disclaimer.`,
                details: {
                    claimedCount,
                    actualSourcesCount: sources.length,
                },
            }
        }
    }

    // === Level 2: Reference inventory URL parity ===
    // Only trigger if content has an explicit reference heading
    if (!REFERENCE_HEADING_PATTERN.test(content)) {
        return { valid: true } // Not a reference inventory — skip
    }

    // Extract URLs from content body
    const bodyUrls = Array.from(content.matchAll(URL_PATTERN))
        .map(m => canonicalizeUrl(m[0]))
        .filter((url, i, arr) => arr.indexOf(url) === i) // dedupe

    // If no URLs in body, skip — might be a narrative reference section
    if (bodyUrls.length === 0) {
        return { valid: true }
    }

    // Canonicalize source URLs
    const sourceUrls = sources.map(s => canonicalizeUrl(s.url))

    // Check if there's subset disclaimer anywhere in content
    if (SUBSET_DISCLAIMER_PATTERN.test(content)) {
        return { valid: true } // Explicit subset — allow
    }

    // Find source URLs missing from body
    const missingFromBody = sourceUrls.filter(
        sUrl => !bodyUrls.some(bUrl => bUrl === sUrl)
    )

    if (missingFromBody.length > 0) {
        return {
            valid: false,
            level: "url-inventory",
            error: `Reference inventory in body is missing ${missingFromBody.length} of ${sources.length} attached sources. Either include all sources or add an explicit subset disclaimer (e.g., "X referensi utama dari total Y sumber").`,
            details: {
                actualSourcesCount: sources.length,
                bodyUrls,
                sourceUrls,
                missingFromBody,
            },
        }
    }

    return { valid: true }
}
