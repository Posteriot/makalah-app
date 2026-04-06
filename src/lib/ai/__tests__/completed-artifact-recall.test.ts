import { describe, expect, it } from "vitest"

import { resolveRecallTargetStage, isArtifactRecallRequest, isArtifactRecallReason } from "../completed-session"

describe("isArtifactRecallRequest", () => {
    it("matches explicit recall requests", () => {
        expect(isArtifactRecallRequest("lihat artifact judul")).toBe(true)
        expect(isArtifactRecallRequest("tampilkan artifact lampiran")).toBe(true)
        expect(isArtifactRecallRequest("buka artifact abstrak")).toBe(true)
        expect(isArtifactRecallRequest("show artifact judul")).toBe(true)
        expect(isArtifactRecallRequest("tunjukkan artifact pendahuluan")).toBe(true)
    })

    it("matches recall with 'lagi' modifier", () => {
        expect(isArtifactRecallRequest("tampilkan lagi artifact judul")).toBe(true)
    })

    it("matches 'munculkan' and 'perlihatkan' verbs", () => {
        expect(isArtifactRecallRequest("munculkan lagi artifak judul")).toBe(true)
        expect(isArtifactRecallRequest("perlihatkan artifact abstrak")).toBe(true)
    })

    it("matches recall with 'artefak' spelling", () => {
        expect(isArtifactRecallRequest("lihat artefak pendahuluan")).toBe(true)
    })

    it("matches recall targeting stage name without 'artifact' word", () => {
        expect(isArtifactRecallRequest("lihat judul")).toBe(true)
        expect(isArtifactRecallRequest("tampilkan abstrak")).toBe(true)
    })

    it("rejects informational questions", () => {
        expect(isArtifactRecallRequest("di mana lihat artifact?")).toBe(false)
        expect(isArtifactRecallRequest("apa isi artifact judul?")).toBe(false)
        expect(isArtifactRecallRequest("bagaimana lihat artifact?")).toBe(false)
        expect(isArtifactRecallRequest("apakah ada artifact judul?")).toBe(false)
    })

    it("rejects messages without display verb", () => {
        expect(isArtifactRecallRequest("artifact judul")).toBe(false)
        expect(isArtifactRecallRequest("judul akhirnya apa?")).toBe(false)
    })

    it("rejects empty input", () => {
        expect(isArtifactRecallRequest("")).toBe(false)
        expect(isArtifactRecallRequest("   ")).toBe(false)
    })

    it("rejects generic export questions", () => {
        expect(isArtifactRecallRequest("bagaimana export?")).toBe(false)
    })
})

describe("resolveRecallTargetStage", () => {
    it("resolves single-word stage names", () => {
        expect(resolveRecallTargetStage("lihat artifact judul")).toBe("judul")
        expect(resolveRecallTargetStage("buka artifact lampiran")).toBe("lampiran")
        expect(resolveRecallTargetStage("tampilkan artifact abstrak")).toBe("abstrak")
        expect(resolveRecallTargetStage("lihat artifact gagasan")).toBe("gagasan")
        expect(resolveRecallTargetStage("lihat artifact topik")).toBe("topik")
        expect(resolveRecallTargetStage("lihat artifact outline")).toBe("outline")
        expect(resolveRecallTargetStage("lihat artifact pendahuluan")).toBe("pendahuluan")
        expect(resolveRecallTargetStage("lihat artifact metodologi")).toBe("metodologi")
        expect(resolveRecallTargetStage("lihat artifact hasil")).toBe("hasil")
        expect(resolveRecallTargetStage("lihat artifact diskusi")).toBe("diskusi")
        expect(resolveRecallTargetStage("lihat artifact kesimpulan")).toBe("kesimpulan")
    })

    it("resolves compound stage names", () => {
        expect(resolveRecallTargetStage("tampilkan artifact daftar pustaka")).toBe("daftar_pustaka")
        expect(resolveRecallTargetStage("lihat artifact tinjauan literatur")).toBe("tinjauan_literatur")
        expect(resolveRecallTargetStage("buka artifact pembaruan abstrak")).toBe("pembaruan_abstrak")
    })

    it("returns null for ambiguous (artifact without stage name)", () => {
        expect(resolveRecallTargetStage("lihat artifact")).toBeNull()
    })

    it("returns null for empty input", () => {
        expect(resolveRecallTargetStage("")).toBeNull()
    })
})

describe("isArtifactRecallReason", () => {
    it("detects retrieve + artifact in reason", () => {
        expect(isArtifactRecallReason("User is asking to retrieve a previously generated artifact (title artifact)")).toBe(true)
    })

    it("detects re-display + existing artifact", () => {
        expect(isArtifactRecallReason("User is asking to re-display an existing artifact")).toBe(true)
    })

    it("detects show + artifact", () => {
        expect(isArtifactRecallReason("User wants to show the artifact again")).toBe(true)
    })

    it("rejects reason without artifact mention", () => {
        expect(isArtifactRecallReason("User is asking a general question about progress")).toBe(false)
    })

    it("rejects reason with artifact but no retrieval verb", () => {
        expect(isArtifactRecallReason("User is asking about artifact content quality")).toBe(false)
    })

    it("rejects empty reason", () => {
        expect(isArtifactRecallReason("")).toBe(false)
    })
})
