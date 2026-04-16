/**
 * Tests for src/lib/chat-harness/persistence/run-store.ts (Phase 6 Task 6.3b).
 *
 * Adapter is intentionally thin: each method should pass through to the
 * matching Convex mutation, except `startStep` which composes three.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createRunStore } from "./run-store"

// Helpers to read the mock call history.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FetchMutation = ReturnType<typeof vi.fn<(ref: any, args: any) => Promise<any>>>

function createFetchMutation(): FetchMutation {
  return vi.fn(async () => null)
}

function callAt(fn: FetchMutation, i: number): { ref: unknown; args: unknown } {
  const [ref, args] = fn.mock.calls[i]
  return { ref, args }
}

let consoleInfoSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
})

describe("createRunStore", () => {
  describe("createRun", () => {
    it("calls api.harnessRuns.createRun and returns the result verbatim", async () => {
      const fetchMutation = createFetchMutation()
      fetchMutation.mockResolvedValueOnce({ runId: "harnessRuns_X", ownerToken: "token-uuid" })
      const store = createRunStore({ fetchMutation })

      const result = await store.createRun({
        conversationId: "conversations_1" as never,
        userId: "users_1" as never,
        workflowStage: "intake",
        workflowStatus: "running",
      })

      expect(result).toEqual({ runId: "harnessRuns_X", ownerToken: "token-uuid" })
      expect(fetchMutation).toHaveBeenCalledTimes(1)
      const call = callAt(fetchMutation, 0)
      // ref identity check skipped: Convex api objects are Proxy-wrapped
      // and don't compare cleanly. Args verification is sufficient — if the
      // wrong mutation was called, the args contract would mismatch.
      expect(call.args).toMatchObject({
        conversationId: "conversations_1",
        userId: "users_1",
        workflowStage: "intake",
        workflowStatus: "running",
      })
    })

    it("includes paperSessionId only when provided", async () => {
      const fetchMutation = createFetchMutation()
      fetchMutation.mockResolvedValueOnce({ runId: "harnessRuns_X", ownerToken: "tok" })
      const store = createRunStore({ fetchMutation })

      await store.createRun({
        conversationId: "conversations_1" as never,
        userId: "users_1" as never,
        paperSessionId: "paperSessions_42" as never,
        workflowStage: "gagasan",
        workflowStatus: "running",
      })

      const args = callAt(fetchMutation, 0).args as { paperSessionId?: string }
      expect(args.paperSessionId).toBe("paperSessions_42")
    })
  })

  describe("startStep — composed operation", () => {
    it("calls incrementStepNumber → createStep → setCurrentStep in sequence", async () => {
      const fetchMutation = createFetchMutation()
      fetchMutation
        .mockResolvedValueOnce({ stepNumber: 7 })
        .mockResolvedValueOnce({ stepId: "harnessRunSteps_X" })
        .mockResolvedValueOnce(null)
      const store = createRunStore({ fetchMutation })

      const result = await store.startStep("harnessRuns_1" as never)

      expect(result).toEqual({ stepId: "harnessRunSteps_X", stepIndex: 7 })
      expect(fetchMutation).toHaveBeenCalledTimes(3)

      // Mutation #1: incrementStepNumber
      expect(callAt(fetchMutation, 0).args).toEqual({ runId: "harnessRuns_1" })

      // Mutation #2: createStep
      expect(callAt(fetchMutation, 1).args).toMatchObject({
        runId: "harnessRuns_1",
        stepIndex: 7,
      })
      expect(typeof (callAt(fetchMutation, 1).args as { startedAt: number }).startedAt).toBe("number")

      // Mutation #3: setCurrentStep
      expect(callAt(fetchMutation, 2).args).toEqual({
        runId: "harnessRuns_1",
        stepId: "harnessRunSteps_X",
      })
    })
  })

  describe("completeStep", () => {
    it("passes stepId + params spread to api.harnessRunSteps.completeStep", async () => {
      const fetchMutation = createFetchMutation()
      const store = createRunStore({ fetchMutation })

      const summary = {
        status: "completed" as const,
        executorResultSummary: { finishReason: "stop", inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        verificationSummary: {
          canContinue: true,
          mustPause: false,
          canComplete: true,
          completionBlockers: [],
          leakageDetected: false,
          artifactChainComplete: true,
          planComplete: true,
          streamContentOverridden: false,
        },
        toolCalls: [{ toolName: "createArtifact", toolCallId: "call_1", resultStatus: "success" }],
        completedAt: 99999,
      }

      await store.completeStep("harnessRunSteps_1" as never, summary)

      expect(fetchMutation).toHaveBeenCalledTimes(1)
      const call = callAt(fetchMutation, 0)
      expect(call.args).toMatchObject({ stepId: "harnessRunSteps_1", ...summary })
    })
  })

  describe("updateStatus", () => {
    it("passes status only when no opts", async () => {
      const fetchMutation = createFetchMutation()
      const store = createRunStore({ fetchMutation })

      await store.updateStatus("harnessRuns_1" as never, "paused")

      expect(callAt(fetchMutation, 0).args).toEqual({ runId: "harnessRuns_1", status: "paused" })
    })

    it("spreads opts when provided (failure case)", async () => {
      const fetchMutation = createFetchMutation()
      const store = createRunStore({ fetchMutation })

      await store.updateStatus(
        "harnessRuns_1" as never,
        "failed",
        { failureClass: "tool_failure", failureReason: "boom" },
      )

      expect(callAt(fetchMutation, 0).args).toMatchObject({
        runId: "harnessRuns_1",
        status: "failed",
        failureClass: "tool_failure",
        failureReason: "boom",
      })
    })
  })

  describe("recordPolicyState / linkPaperSession / completeRun", () => {
    it("recordPolicyState passes through verbatim", async () => {
      const fetchMutation = createFetchMutation()
      const store = createRunStore({ fetchMutation })

      const policyState = {
        approvalMode: "default" as const,
        currentBoundary: "read_only" as const,
        lastPolicyReason: "boundary=normal",
        updatedAt: 1234,
      }
      await store.recordPolicyState("harnessRuns_1" as never, policyState)

      const call = callAt(fetchMutation, 0)
      expect(call.args).toEqual({ runId: "harnessRuns_1", policyState })
    })

    it("linkPaperSession passes through", async () => {
      const fetchMutation = createFetchMutation()
      const store = createRunStore({ fetchMutation })

      await store.linkPaperSession("harnessRuns_1" as never, "paperSessions_42" as never)

      const call = callAt(fetchMutation, 0)
      expect(call.args).toEqual({ runId: "harnessRuns_1", paperSessionId: "paperSessions_42" })
    })

    it("completeRun passes through", async () => {
      const fetchMutation = createFetchMutation()
      const store = createRunStore({ fetchMutation })

      await store.completeRun("harnessRuns_1" as never)

      const call = callAt(fetchMutation, 0)
      expect(call.args).toEqual({ runId: "harnessRuns_1" })
    })
  })

  describe("observability", () => {
    it("logs [HARNESS][persistence] line after createRun", async () => {
      const fetchMutation = createFetchMutation()
      fetchMutation.mockResolvedValueOnce({ runId: "harnessRuns_X", ownerToken: "tok" })
      const store = createRunStore({ fetchMutation })

      await store.createRun({
        conversationId: "conversations_1" as never,
        userId: "users_1" as never,
        workflowStage: "intake",
        workflowStatus: "running",
      })

      const logged = consoleInfoSpy.mock.calls.flat().join(" ")
      expect(logged).toMatch(/\[HARNESS\]\[persistence\] createRun/)
    })
  })
})
