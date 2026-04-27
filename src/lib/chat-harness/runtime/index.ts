/**
 * Chat harness runtime barrel.
 *
 * `runChatHarness` is the HTTP adapter entry point consumed by
 * `src/app/api/chat/route.ts`. `orchestrateSyncRun` is the 13-step
 * synchronous execution engine; Phase 8 extends it with pause/resume
 * semantics without touching the HTTP boundary.
 */
export { runChatHarness } from "./run-chat-harness"
export { orchestrateSyncRun } from "./orchestrate-sync-run"
export type {
    SyncRunResult,
    SyncRunContext,
    PaperContextResolution,
} from "./types"
