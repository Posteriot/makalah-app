import * as Sentry from "@sentry/nextjs"

import { runChatHarness } from "@/lib/chat-harness/runtime"

/**
 * Chat API HTTP boundary.
 *
 * All orchestration (entry → context → policy → executor → verification →
 * persistence) lives behind `runChatHarness`. This handler's only job is
 * to delegate and catch fatal exceptions that escape the harness.
 *
 * Non-fatal outcomes (stream, paused) are returned as `Response` objects
 * by the harness itself — see `runtime/run-chat-harness.ts` for the
 * `SyncRunResult` → `Response` mapping.
 */
export async function POST(req: Request): Promise<Response> {
    try {
        return await runChatHarness(req)
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                "api.route": "chat",
            },
        })
        console.error("Chat API Error:", error)
        return new Response("Internal Server Error", { status: 500 })
    }
}
