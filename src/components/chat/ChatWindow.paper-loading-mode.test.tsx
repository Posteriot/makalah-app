import { describe, expect, it } from "vitest"
import type { UIMessage } from "ai"
import { shouldPreferUnifiedPaperLoadingUi } from "./ChatWindow"

describe("shouldPreferUnifiedPaperLoadingUi", () => {
  it("memilih unified paper loading saat user terakhir punya intent paper dan assistant masih pending", () => {
    const messages = [
      {
        id: "user-paper",
        role: "user",
        parts: [{ type: "text", text: "Bantu gue bikin paper tentang AI di pendidikan tinggi." }],
      },
    ] as unknown as UIMessage[]

    expect(
      shouldPreferUnifiedPaperLoadingUi({
        isPaperMode: false,
        hasPendingAssistantGeneration: true,
        messages,
      })
    ).toBe(true)
  })

  it("tidak mengaktifkan unified paper loading untuk percakapan non-paper", () => {
    const messages = [
      {
        id: "user-normal",
        role: "user",
        parts: [{ type: "text", text: "Jelaskan adaptive learning secara singkat." }],
      },
    ] as unknown as UIMessage[]

    expect(
      shouldPreferUnifiedPaperLoadingUi({
        isPaperMode: false,
        hasPendingAssistantGeneration: true,
        messages,
      })
    ).toBe(false)
  })

  it("tidak perlu override bila paper mode sudah aktif", () => {
    const messages = [
      {
        id: "user-paper-active",
        role: "user",
        parts: [{ type: "text", text: "Bantu gue susun makalah tentang kebijakan pendidikan." }],
      },
    ] as unknown as UIMessage[]

    expect(
      shouldPreferUnifiedPaperLoadingUi({
        isPaperMode: true,
        hasPendingAssistantGeneration: true,
        messages,
      })
    ).toBe(false)
  })
})
