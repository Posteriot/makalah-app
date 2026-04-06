import { describe, expect, it } from "vitest"
import {
  extractChatDiagnosticSnapshot,
  shouldShowTechnicalReportTrigger,
} from "@/lib/technical-report/chatSnapshot"

describe("extractChatDiagnosticSnapshot", () => {
  it("collects tool error summary from reasoning steps", () => {
    const result = extractChatDiagnosticSnapshot({
      chatStatus: "error",
      errorMessage: "tool failed",
      model: "openai/gpt-4o-mini",
      reasoningSteps: [{ label: "tool", status: "error", meta: { toolName: "google_search" } }],
    })
    expect(result.chatStatus).toBe("error")
    expect(result.toolStates?.[0]?.toolName).toBe("google_search")
  })

  it("shows trigger when chat status is error", () => {
    expect(
      shouldShowTechnicalReportTrigger({
        chatStatus: "error",
        toolStates: [],
      })
    ).toBe(true)
  })

  it("does not show trigger when chat recovered (ready) even with historical tool error", () => {
    expect(
      shouldShowTechnicalReportTrigger({
        chatStatus: "ready",
        toolStates: [{ toolName: "google_search", state: "error" }],
      })
    ).toBe(false)
  })

  it("does not show trigger when chat recovered (ready) even with historical search error", () => {
    expect(
      shouldShowTechnicalReportTrigger({
        chatStatus: "ready",
        searchStatus: "error",
        toolStates: [],
      })
    ).toBe(false)
  })

  it("shows trigger when chat status is error with tool error", () => {
    expect(
      shouldShowTechnicalReportTrigger({
        chatStatus: "error",
        toolStates: [{ toolName: "google_search", state: "error" }],
      })
    ).toBe(true)
  })

  it("shows trigger when chat status is error with search error", () => {
    expect(
      shouldShowTechnicalReportTrigger({
        chatStatus: "error",
        searchStatus: "error",
        toolStates: [],
      })
    ).toBe(true)
  })

  it("does not show trigger in healthy state", () => {
    expect(
      shouldShowTechnicalReportTrigger({
        chatStatus: "ready",
        searchStatus: "done",
        toolStates: [{ toolName: "google_search", state: "done" }],
      })
    ).toBe(false)
  })
})
