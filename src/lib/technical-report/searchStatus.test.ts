import { describe, expect, it } from "vitest"
import type { UIMessage } from "ai"
import { resolveTechnicalReportSearchStatus } from "./searchStatus"

function createAssistantMessageWithStatuses(statuses: string[]): UIMessage {
  return {
    id: "assistant-message",
    role: "assistant",
    parts: statuses.map((status, index) => ({
      type: "data-search",
      id: `search-${index}`,
      data: { status },
    })),
  } as unknown as UIMessage
}

describe("resolveTechnicalReportSearchStatus", () => {
  it("returns error when any search status in conversation is error", () => {
    const messages = [
      createAssistantMessageWithStatuses(["searching", "done"]),
      createAssistantMessageWithStatuses(["searching", "error", "done"]),
    ]

    expect(resolveTechnicalReportSearchStatus(messages)).toBe("error")
  })

  it("returns latest status when there is no error", () => {
    const messages = [
      createAssistantMessageWithStatuses(["searching"]),
      createAssistantMessageWithStatuses(["done"]),
    ]

    expect(resolveTechnicalReportSearchStatus(messages)).toBe("done")
  })

  it("returns undefined when no data-search status exists", () => {
    const messages = [
      {
        id: "assistant-message",
        role: "assistant",
        parts: [{ type: "text", text: "hello" }],
      } as unknown as UIMessage,
    ]

    expect(resolveTechnicalReportSearchStatus(messages)).toBeUndefined()
  })
})

