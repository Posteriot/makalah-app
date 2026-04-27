/**
 * EventStore persistence adapter.
 *
 * Thin wrapper around the Convex `harnessEvents.emitEvent` mutation. Performs
 * two jobs before forwarding to Convex:
 *   1. Validates `eventType` against the canonical 29-name registry. Invalid
 *      names throw — they do NOT silently emit. This is the correctness gate
 *      that keeps the event stream free of typos and ad-hoc names.
 *   2. Builds the mutation args object without `undefined` fields, since the
 *      Convex validator rejects explicit `undefined` for optional fields.
 *
 * Design rules (mirrors run-store.ts; see persistence/types.ts for contract):
 *   - Single `emit` method — no typed helpers (emitRunStarted, etc.) in V1.
 *   - No try/catch: Convex errors propagate unchanged.
 *   - Observability log fires AFTER the mutation succeeds so the log line
 *     reflects the actual DB state change.
 */
import type { ConvexFetchMutation } from "../types/runtime"
import type { EventStore, HarnessEventEnvelope } from "./types"
import { isHarnessEventType } from "./event-types"
import { api } from "../../../../convex/_generated/api"

export interface EventStoreDeps {
    fetchMutation: ConvexFetchMutation
}

export function createEventStore(deps: EventStoreDeps): EventStore {
    return {
        async emit(envelope: HarnessEventEnvelope) {
            if (!isHarnessEventType(envelope.eventType)) {
                throw new Error(
                    `[HARNESS][event] invalid eventType: ${envelope.eventType}`,
                )
            }

            // Build args explicitly: include optional fields only when defined,
            // so Convex validators never see explicit `undefined`.
            const args = {
                eventType: envelope.eventType,
                userId: envelope.userId,
                sessionId: envelope.sessionId,
                chatId: envelope.chatId,
                payload: envelope.payload,
                ...(envelope.eventId !== undefined && { eventId: envelope.eventId }),
                ...(envelope.schemaVersion !== undefined && {
                    schemaVersion: envelope.schemaVersion,
                }),
                ...(envelope.occurredAt !== undefined && {
                    occurredAt: envelope.occurredAt,
                }),
                ...(envelope.runId !== undefined && { runId: envelope.runId }),
                ...(envelope.stepId !== undefined && { stepId: envelope.stepId }),
                ...(envelope.correlationId !== undefined && {
                    correlationId: envelope.correlationId,
                }),
                ...(envelope.causationEventId !== undefined && {
                    causationEventId: envelope.causationEventId,
                }),
            }

            const result = (await deps.fetchMutation(
                api.harnessEvents.emitEvent,
                args,
            )) as { eventId: string }

            console.info(
                `[HARNESS][event] ${envelope.eventType} eventId=${result.eventId} correlationId=${envelope.correlationId ?? "-"} runId=${envelope.runId ?? "-"}`,
            )

            return { eventId: result.eventId }
        },
    }
}
