import { describe, expect, it } from "vitest"
import { findAiOpsTabConfig, resolveAiOpsTabId } from "./aiOpsConfig"

describe("aiOpsConfig tools monitor", () => {
  it("resolves parent tools tab to tools.websearch", () => {
    expect(resolveAiOpsTabId("tools")).toBe("tools.websearch")
  })

  it("registers tools.websearch as a valid tab config", () => {
    const tab = findAiOpsTabConfig("tools.websearch")
    expect(tab).toBeDefined()
    expect(tab?.label).toBe("Websearch")
  })
})

