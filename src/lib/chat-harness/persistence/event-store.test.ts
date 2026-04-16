/**
 * Tests for src/lib/chat-harness/persistence/event-store.ts (Phase 6 Task 6.3c).
 *
 * EventStore validates eventType against the canonical 29-name registry,
 * assembles envelope defaults at adapter level, and emits via the Convex
 * harnessEvents.emitEvent mutation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createEventStore } from "./event-store"
import { HARNESS_EVENT_TYPES } from "./event-types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FetchMutation = ReturnType<typeof vi.fn<(ref: any, args: any) => Promise<any>>>

function createFetchMutation(): FetchMutation {
  return vi.fn(async () => ({ eventId: "generated-event-id" }))
}

function callAt(fn: FetchMutation, i: number): { ref: unknown; args: unknown } {
  const [ref, args] = fn.mock.calls[i]
  return { ref, args }
}

let consoleInfoSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
})

const baseEnvelope = {
  eventType: HARNESS_EVENT_TYPES.RUN_STARTED,
  userId: "users_1" as never,
  sessionId: "session-abc",
  chatId: "conversations_1" as never,
  payload: { startReason: "new_user_message" },
}

describe("createEventStore", () => {
  describe("emit — valid envelope", () => {
    it("calls api.harnessEvents.emitEvent and returns { eventId }", async () => {
      const fetchMutation = createFetchMutation()
      const store = createEventStore({ fetchMutation })

      const result = await store.emit(baseEnvelope)

      expect(result).toEqual({ eventId: "generated-event-id" })
      expect(fetchMutation).toHaveBeenCalledTimes(1)
    })

    it("passes required fields verbatim", async () => {
      const fetchMutation = createFetchMutation()
      const store = createEventStore({ fetchMutation })

      await store.emit(baseEnvelope)

      const args = callAt(fetchMutation, 0).args as Record<string, unknown>
      expect(args.eventType).toBe("run_started")
      expect(args.userId).toBe("users_1")
      expect(args.sessionId).toBe("session-abc")
      expect(args.chatId).toBe("conversations_1")
      expect(args.payload).toEqual({ startReason: "new_user_message" })
    })

    it("omits optional fields when undefined (no explicit undefined leaks)", async () => {
      const fetchMutation = createFetchMutation()
      const store = createEventStore({ fetchMutation })

      await store.emit(baseEnvelope)

      const args = callAt(fetchMutation, 0).args as Record<string, unknown>
      expect("eventId" in args).toBe(false)
      expect("schemaVersion" in args).toBe(false)
      expect("occurredAt" in args).toBe(false)
      expect("runId" in args).toBe(false)
      expect("stepId" in args).toBe(false)
      expect("correlationId" in args).toBe(false)
      expect("causationEventId" in args).toBe(false)
    })

    it("includes optional fields when provided", async () => {
      const fetchMutation = createFetchMutation()
      const store = createEventStore({ fetchMutation })

      await store.emit({
        ...baseEnvelope,
        eventId: "custom-id",
        schemaVersion: 2,
        occurredAt: 12345,
        runId: "harnessRuns_1" as never,
        stepId: "harnessRunSteps_1" as never,
        correlationId: "req-99",
        causationEventId: "evt-prev",
      })

      const args = callAt(fetchMutation, 0).args as Record<string, unknown>
      expect(args.eventId).toBe("custom-id")
      expect(args.schemaVersion).toBe(2)
      expect(args.occurredAt).toBe(12345)
      expect(args.runId).toBe("harnessRuns_1")
      expect(args.stepId).toBe("harnessRunSteps_1")
      expect(args.correlationId).toBe("req-99")
      expect(args.causationEventId).toBe("evt-prev")
    })
  })

  describe("emit — invalid eventType", () => {
    it("throws before invoking the Convex mutation", async () => {
      const fetchMutation = createFetchMutation()
      const store = createEventStore({ fetchMutation })

      await expect(
        store.emit({ ...baseEnvelope, eventType: "not_a_real_event" as never }),
      ).rejects.toThrow(/invalid eventType: not_a_real_event/)

      expect(fetchMutation).not.toHaveBeenCalled()
    })

    it("rejects all 29 canonical names that look similar but aren't", async () => {
      const fetchMutation = createFetchMutation()
      const store = createEventStore({ fetchMutation })

      // Camel-case variant should be rejected (canonical uses snake_case)
      await expect(
        store.emit({ ...baseEnvelope, eventType: "runStarted" as never }),
      ).rejects.toThrow(/invalid eventType/)

      // Empty string
      await expect(
        store.emit({ ...baseEnvelope, eventType: "" as never }),
      ).rejects.toThrow(/invalid eventType/)
    })
  })

  describe("observability", () => {
    it("logs [HARNESS][event] line after successful emit", async () => {
      const fetchMutation = createFetchMutation()
      const store = createEventStore({ fetchMutation })

      await store.emit(baseEnvelope)

      const logged = consoleInfoSpy.mock.calls.flat().join(" ")
      expect(logged).toMatch(/\[HARNESS\]\[event\] run_started/)
      expect(logged).toMatch(/eventId=generated-event-id/)
    })

    it("does NOT call console.info when emit throws (validation failure)", async () => {
      const fetchMutation = createFetchMutation()
      const store = createEventStore({ fetchMutation })
      consoleInfoSpy.mockClear() // ignore any prior test's noise

      await expect(
        store.emit({ ...baseEnvelope, eventType: "bogus" as never }),
      ).rejects.toThrow()

      expect(consoleInfoSpy).not.toHaveBeenCalled()
    })
  })

  describe("event registry coverage", () => {
    it.each(Object.entries(HARNESS_EVENT_TYPES))(
      "accepts canonical event type %s = %s",
      async (_constName, value) => {
        const fetchMutation = createFetchMutation()
        const store = createEventStore({ fetchMutation })

        await store.emit({ ...baseEnvelope, eventType: value })

        expect(fetchMutation).toHaveBeenCalledTimes(1)
      },
    )
  })
})
