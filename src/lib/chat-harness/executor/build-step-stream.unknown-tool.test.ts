import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock @sentry/nextjs BEFORE importing the SUT so the helper picks up the mock.
vi.mock("@sentry/nextjs", () => ({
    captureMessage: vi.fn(),
}))

import * as Sentry from "@sentry/nextjs"
import { emitUnknownToolCallTelemetry, shouldEmitUnknownToolTelemetry } from "./build-step-stream"

describe("emitUnknownToolCallTelemetry", () => {
    let warnSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        vi.mocked(Sentry.captureMessage).mockReset()
        // Default: succeed (no throw). Individual tests override as needed.
        vi.mocked(Sentry.captureMessage).mockReturnValue("event-id" as unknown as string)
        warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    })

    afterEach(() => {
        warnSpy.mockRestore()
    })

    it("emits a warning console line with the expected grep tag and fields", () => {
        emitUnknownToolCallTelemetry({
            reqId: "req-123",
            logTag: "[primary]",
            toolName: "createStagePlan",
            source: "repair",
            availableTools: ["createArtifact", "updateArtifact"],
            errorText: "Unknown tool: createStagePlan",
            paperStage: "gagasan",
            runId: "run-456",
        })

        expect(warnSpy).toHaveBeenCalledTimes(1)
        const line = warnSpy.mock.calls[0]?.[0] as string
        expect(line).toContain("[\u26A0 UNKNOWN-TOOL-CALL]")
        expect(line).toContain("[req-123]")
        expect(line).toContain("[primary]")
        expect(line).toContain("source=repair")
        expect(line).toContain("toolName=createStagePlan")
        expect(line).toContain("stage=gagasan")
        expect(line).toContain("available=createArtifact,updateArtifact")
        expect(line).toContain("errorText=Unknown tool: createStagePlan")
    })

    it("renders nullish paperStage as 'none' and nullish errorText as 'null'", () => {
        emitUnknownToolCallTelemetry({
            reqId: "req-1",
            logTag: "",
            toolName: "markTaskDone",
            source: "chunk",
            availableTools: [],
            errorText: null,
            paperStage: null,
            runId: "run-1",
        })

        const line = warnSpy.mock.calls[0]?.[0] as string
        expect(line).toContain("stage=none")
        expect(line).toContain("errorText=null")
        expect(line).toContain("available=")
    })

    it("calls Sentry.captureMessage with expected level/tags/extra", () => {
        emitUnknownToolCallTelemetry({
            reqId: "req-789",
            logTag: "[fallback]",
            toolName: "confirmStageFinalization",
            source: "chunk",
            availableTools: ["createArtifact"],
            errorText: "tool-input-error: not registered",
            paperStage: "kerangka",
            runId: "run-xyz",
        })

        expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)
        const [message, options] = vi.mocked(Sentry.captureMessage).mock.calls[0]!
        expect(message).toBe("unknown_tool_call_attempted")
        expect(options).toEqual({
            level: "warning",
            tags: {
                subsystem: "harness",
                toolName: "confirmStageFinalization",
                source: "chunk",
                paperStage: "kerangka",
            },
            extra: {
                reqId: "req-789",
                availableTools: ["createArtifact"],
                errorText: "tool-input-error: not registered",
                runId: "run-xyz",
            },
        })
    })

    it("falls back to console.warn (and does not throw) when Sentry.captureMessage throws", () => {
        vi.mocked(Sentry.captureMessage).mockImplementation(() => {
            throw new Error("sentry transport down")
        })

        expect(() =>
            emitUnknownToolCallTelemetry({
                reqId: "req-err",
                logTag: "",
                toolName: "createStagePlan",
                source: "repair",
                availableTools: ["createArtifact"],
                errorText: null,
                paperStage: null,
                runId: "run-err",
            })
        ).not.toThrow()

        // First warn call = the structured telemetry line.
        // Second warn call = the sentry-failure fallback.
        expect(warnSpy).toHaveBeenCalledTimes(2)
        const fallbackLine = warnSpy.mock.calls[1]?.[0] as string
        expect(fallbackLine).toContain("[\u26A0 UNKNOWN-TOOL-CALL]")
        expect(fallbackLine).toContain("sentry capture failed")
        const fallbackErr = warnSpy.mock.calls[1]?.[1] as Error
        expect(fallbackErr).toBeInstanceOf(Error)
        expect(fallbackErr.message).toBe("sentry transport down")
    })
})

// ────────────────────────────────────────────────────────────────
// Predicate test — guards the chunk-loop integration so the B1
// regression (firing telemetry on tool-output-error) cannot return.
// ────────────────────────────────────────────────────────────────

describe("shouldEmitUnknownToolTelemetry (chunk-loop predicate)", () => {
    const registered = new Set<string>(["createArtifact", "updateArtifact", "markTaskDone"])

    it("emits when tool-input-error carries an UNREGISTERED toolName", () => {
        const chunk = {
            type: "tool-input-error",
            toolName: "createStagePlan",
            errorText: "Unknown tool: createStagePlan",
        }
        const decision = shouldEmitUnknownToolTelemetry(chunk, registered)
        expect(decision.emit).toBe(true)
        expect(decision.toolName).toBe("createStagePlan")
        expect(decision.errorText).toBe("Unknown tool: createStagePlan")
    })

    it("does NOT emit when tool-input-error carries a REGISTERED toolName (InvalidToolInputError case)", () => {
        const chunk = {
            type: "tool-input-error",
            toolName: "createArtifact",
            errorText: "input validation failed",
        }
        const decision = shouldEmitUnknownToolTelemetry(chunk, registered)
        expect(decision.emit).toBe(false)
        expect(decision.toolName).toBe("createArtifact")
    })

    it("does NOT emit on tool-output-error chunks (regression guard for B1 review finding)", () => {
        // tool-output-error has NO toolName field per the SDK type and is
        // post-execution — the SDK already resolved the tool from the
        // registry, so it can never be an unknown-name event. Emitting here
        // would mis-count every legit tool-execute failure as
        // `unknown_tool_call_attempted`.
        const chunk = {
            type: "tool-output-error",
            toolCallId: "call_123",
            errorText: "Tool execution threw",
        }
        const decision = shouldEmitUnknownToolTelemetry(chunk, registered)
        expect(decision.emit).toBe(false)
    })

    it("does NOT emit when chunk.type is unrelated (e.g. text-delta)", () => {
        const decision = shouldEmitUnknownToolTelemetry({ type: "text-delta", delta: "hi" }, registered)
        expect(decision.emit).toBe(false)
    })

    it("does NOT emit when tool-input-error is missing a string toolName (SDK shape drift guard)", () => {
        const chunk = { type: "tool-input-error", errorText: "boom" }
        const decision = shouldEmitUnknownToolTelemetry(chunk, registered)
        expect(decision.emit).toBe(false)
        expect(decision.toolName).toBeUndefined()
    })

    it("handles null/undefined chunk safely", () => {
        expect(shouldEmitUnknownToolTelemetry(null, registered).emit).toBe(false)
        expect(shouldEmitUnknownToolTelemetry(undefined, registered).emit).toBe(false)
    })
})
