import { describe, expect, it } from "vitest"
import { initGoogleSearchTool } from "./google-search-tool"

describe("initGoogleSearchTool", () => {
  it("returns unavailable when googleSearch factory is missing", async () => {
    const result = await initGoogleSearchTool(async () => ({
      google: { tools: {} },
    }))

    expect(result.status).toBe("unavailable")
    expect(result.reason).toBe("factory_missing")
  })

  it("returns ready when googleSearch factory returns tool instance", async () => {
    const result = await initGoogleSearchTool(async () => ({
      google: { tools: { googleSearch: () => ({ type: "provider-defined-tool" }) } },
    }))

    expect(result.status).toBe("ready")
    expect(result.reason).toBe("ok")
    if (result.status === "ready") {
      expect(result.tool).toEqual({ type: "provider-defined-tool" })
    }
  })

  it("returns unavailable when module import throws", async () => {
    const result = await initGoogleSearchTool(async () => {
      throw new Error("boom")
    })

    expect(result.status).toBe("unavailable")
    expect(result.reason).toBe("import_failed")
  })
})

