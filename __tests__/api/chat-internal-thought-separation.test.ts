import { describe, expect, it } from "vitest"
import { buildUserFacingSearchPayload } from "@/lib/ai/internal-thought-separator"

describe("chat internal-thought separation contract", () => {
  it("strips internal-thought from user-facing cited text payload", () => {
    const streamedText =
      "Bentar ya, aku cari dulu informasinya. Oke, aku sudah melakukan pencarian awal. Ini rangkuman hasilnya dengan sumber [1]."

    const payload = buildUserFacingSearchPayload(streamedText)

    expect(payload.citedText).toBe("Ini rangkuman hasilnya dengan sumber [1].")
    expect(payload.internalThoughtText).toContain("Bentar ya")
    expect(payload.internalThoughtText).toContain("aku sudah melakukan pencarian awal")
  })

  it("keeps full cited text when no internal-thought prefix is detected", () => {
    const streamedText = "Ini rangkuman hasilnya dengan sumber [1]."

    const payload = buildUserFacingSearchPayload(streamedText)

    expect(payload.citedText).toBe(streamedText)
    expect(payload.internalThoughtText).toBe("")
  })

  it("returns structured inventory payload without empty links", () => {
    const payload = buildUserFacingSearchPayload({
      text: "placeholder",
      responseMode: "reference_inventory",
      referenceItems: [
        {
          title: "Paper A",
          url: "https://example.com/a.pdf",
          verificationStatus: "unverified_link",
        },
        {
          title: "Paper B",
          url: null,
          verificationStatus: "unavailable",
        },
      ],
    })

    expect(payload.referenceInventory).toBeDefined()
    expect(payload.referenceInventory?.items[0].url).toBe("https://example.com/a.pdf")
    expect(payload.referenceInventory?.items[1].url).toBeNull()
    expect(payload.citedText).not.toContain("Link:")
  })
})
