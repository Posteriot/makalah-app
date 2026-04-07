import { describe, expect, it } from "vitest"
import { checkSourceBodyParity } from "./check-source-body-parity"

const makeSources = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
        url: `https://example.com/ref-${i + 1}`,
        title: `Reference ${i + 1}`,
    }))

describe("checkSourceBodyParity", () => {
    // === Skip conditions ===

    it("allows when sources is empty", () => {
        const result = checkSourceBodyParity({
            content: "Some content with 21 rujukan",
            sources: [],
        })
        expect(result.valid).toBe(true)
    })

    it("allows narrative content without reference heading", () => {
        const result = checkSourceBodyParity({
            content: "This is a narrative discussion about the research findings. No reference inventory here.",
            sources: makeSources(21),
        })
        expect(result.valid).toBe(true)
    })

    // === Level 1: Numeric claim validation ===

    it("rejects when numeric claim mismatches sources.length", () => {
        const result = checkSourceBodyParity({
            content: "Berikut 21 rujukan yang ditemukan dari pencarian.",
            sources: makeSources(15),
        })
        expect(result.valid).toBe(false)
        expect(result.level).toBe("numeric-claim")
        expect(result.details?.claimedCount).toBe(21)
        expect(result.details?.actualSourcesCount).toBe(15)
    })

    it("allows when numeric claim matches sources.length", () => {
        const result = checkSourceBodyParity({
            content: "Berikut 15 referensi yang berhasil dikumpulkan.",
            sources: makeSources(15),
        })
        expect(result.valid).toBe(true)
    })

    it("allows numeric mismatch with explicit subset disclaimer", () => {
        const result = checkSourceBodyParity({
            content: "Berikut 15 referensi utama dari total 21 sumber yang tersedia.",
            sources: makeSources(21),
        })
        expect(result.valid).toBe(true)
    })

    it("detects Indonesian numeric patterns: rujukan, referensi, sumber", () => {
        for (const word of ["rujukan", "referensi", "sumber"]) {
            const result = checkSourceBodyParity({
                content: `Terdapat 10 ${word} dalam penelitian ini.`,
                sources: makeSources(7),
            })
            expect(result.valid).toBe(false)
            expect(result.level).toBe("numeric-claim")
        }
    })

    // === Level 2: Reference inventory URL parity ===

    it("rejects when reference inventory body is missing source URLs", () => {
        const sources = makeSources(5)
        // Body only lists 3 of 5 URLs
        const content = `# Referensi

1. Title One - https://example.com/ref-1
2. Title Two - https://example.com/ref-2
3. Title Three - https://example.com/ref-3`

        const result = checkSourceBodyParity({ content, sources })
        expect(result.valid).toBe(false)
        expect(result.level).toBe("url-inventory")
        expect(result.details?.missingFromBody).toHaveLength(2)
    })

    it("allows when all source URLs are in body", () => {
        const sources = makeSources(3)
        const content = `## Daftar Referensi

1. Ref 1 - https://example.com/ref-1
2. Ref 2 - https://example.com/ref-2
3. Ref 3 - https://example.com/ref-3`

        const result = checkSourceBodyParity({ content, sources })
        expect(result.valid).toBe(true)
    })

    it("allows URL inventory mismatch with subset disclaimer", () => {
        const sources = makeSources(10)
        const content = `## Rujukan

Berikut subset referensi utama:

1. Ref 1 - https://example.com/ref-1
2. Ref 2 - https://example.com/ref-2`

        const result = checkSourceBodyParity({ content, sources })
        expect(result.valid).toBe(true)
    })

    it("skips URL parity when reference section has no URLs", () => {
        const result = checkSourceBodyParity({
            content: `## Referensi

1. Smith et al. (2024) - A study on something
2. Jones (2023) - Another paper`,
            sources: makeSources(5),
        })
        // No URLs in body — skip level 2, and no numeric claim — valid
        expect(result.valid).toBe(true)
    })

    it("handles various reference heading formats", () => {
        const sources = makeSources(3)
        const bodyWithAllUrls = (heading: string) => `${heading}

1. https://example.com/ref-1
2. https://example.com/ref-2
3. https://example.com/ref-3`

        for (const heading of ["# Referensi", "## Rujukan", "### Daftar Pustaka", "## Sumber", "## Daftar Referensi"]) {
            const result = checkSourceBodyParity({
                content: bodyWithAllUrls(heading),
                sources,
            })
            expect(result.valid).toBe(true)
        }
    })

    it("canonicalizes URLs for comparison (trailing slash, UTM params)", () => {
        const sources = [
            { url: "https://example.com/ref-1/", title: "Ref 1" },
            { url: "https://example.com/ref-2?utm_source=google", title: "Ref 2" },
        ]
        const content = `## Referensi

1. https://example.com/ref-1
2. https://example.com/ref-2`

        const result = checkSourceBodyParity({ content, sources })
        expect(result.valid).toBe(true)
    })
})
