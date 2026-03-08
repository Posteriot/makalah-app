import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const repoRoot = path.resolve(__dirname, "..", "..", "..")
const routePath = path.join(repoRoot, "src/app/api/chat/route.ts")
const telemetryPath = path.join(repoRoot, "src/lib/ai/telemetry.ts")

describe("chat websearch observability guards", () => {
  it("keeps fail-closed reason and explicit search-unavailable response", () => {
    const routeSource = fs.readFileSync(routePath, "utf8")

    expect(routeSource).toContain('searchUnavailableReasonCode = "search_required_but_unavailable"')
    expect(routeSource).toContain('reasonCode: searchUnavailableReasonCode')
    expect(routeSource).toContain('telemetryFallbackReason: searchUnavailableReasonCode')
    expect(routeSource).toContain('status: "error"')
    expect(routeSource).toContain("message: input.message")
  })

  it("keeps telemetry fields required for ai-ops diagnosis", () => {
    const telemetrySource = fs.readFileSync(telemetryPath, "utf8")

    expect(telemetrySource).toContain('toolUsed?: string')
    expect(telemetrySource).toContain('mode: "normal" | "websearch" | "paper"')
    expect(telemetrySource).toContain("success: boolean")
    expect(telemetrySource).toContain("fallbackReason?: string")
  })
})

