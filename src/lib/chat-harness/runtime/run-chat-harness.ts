/**
 * HTTP adapter (Phase 7).
 *
 * Thin boundary between the Next.js route handler and the synchronous
 * execution engine. Parses the request via `acceptChatRequest`, constructs
 * the persistence adapters, delegates to `orchestrateSyncRun`, and maps the
 * resulting `SyncRunResult` to an HTTP `Response`.
 *
 * All orchestration lives behind `orchestrateSyncRun`; this file must stay
 * thin so Phase 8 can extend pause semantics without touching HTTP concerns.
 */
import { acceptChatRequest } from "../entry"
import { createRunStore, createEventStore } from "../persistence"
import { orchestrateSyncRun } from "./orchestrate-sync-run"
import type { SyncRunResult } from "./types"

export async function runChatHarness(req: Request): Promise<Response> {
    const accepted = await acceptChatRequest(req)
    if (accepted instanceof Response) return accepted

    const runStore = createRunStore({ fetchMutation: accepted.fetchMutationWithToken })
    const eventStore = createEventStore({ fetchMutation: accepted.fetchMutationWithToken })

    const result = await orchestrateSyncRun({ accepted, runStore, eventStore })

    return mapResultToResponse(result)
}

function mapResultToResponse(result: SyncRunResult): Response {
    if (result.kind === "stream") return result.response
    if (result.kind === "paused") {
        // Phase 7 scaffolding. Phase 8 will build a proper pause response
        // body (decision id, resume URL, etc.) off persisted pending state.
        return new Response(
            JSON.stringify({
                status: "paused",
                runId: result.runId,
                pendingDecisionId: result.pendingDecisionId,
            }),
            {
                status: 202,
                headers: { "content-type": "application/json" },
            },
        )
    }
    // Exhaustiveness — TypeScript asserts the switch is complete.
    const _exhaustive: never = result
    throw new Error(`Unexpected SyncRunResult: ${JSON.stringify(_exhaustive)}`)
}
