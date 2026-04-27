Claude,

You need to fix one verified Stage 1 E2E regression before further manual UI testing continues.

Context:
- Scope: `gagasan`, round 1.
- Observability standard: `/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/docs/agent-harness/new/OBSERVABILITY-MAP.md`
- Evidence bundle:
  - Browser console: `/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/screenshots/test-e2e/stage-1/test-1/console-browser-log.txt`
  - Convex terminal: `/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/screenshots/test-e2e/stage-1/test-1/convex-terminal-log.txt`
  - Next.js terminal: `/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/screenshots/test-e2e/stage-1/test-1/nextjs-terminal-log.txt`
  - Flow screenshots:
    - `/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/screenshots/test-e2e/stage-1/test-1/Screen Shot 2026-04-18 at 01.12.26.png`
    - `/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/screenshots/test-e2e/stage-1/test-1/Screen Shot 2026-04-18 at 01.12.36.png`
    - `/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/screenshots/test-e2e/stage-1/test-1/Screen Shot 2026-04-18 at 01.12.44.png`
    - `/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/screenshots/test-e2e/stage-1/test-1/Screen Shot 2026-04-18 at 01.13.14.png`

Primary finding:
- The search-turn assistant response rendered the references and source count, but the primary choice card did not appear in the live UI at `01.12.44`.
- After a full page refresh, the fallback choice card appeared at `01.13.14`.
- This is not acceptable because the workflow depends on the post-search choice card being visible immediately and durably without reload.

Severity:
- High. This blocks the next turn in the E2E flow and breaks the core guided workflow contract.

Verified diagnosis:
1. The backend/search path did generate a guaranteed choice-card fallback for the search response and persisted it.
   - Evidence: Next.js log contains `[CHOICE-CARD][guaranteed][search] stage=gagasan source=deterministic-fallback`.
   - Code path:
     - `src/lib/chat-harness/context/execute-web-search-path.ts:217-261`
     - The search fallback spec is compiled and persisted via `saveAssistantMessage(... jsonRendererChoice: searchChoiceSpec ...)`.
2. The missing card is therefore not explained by “search never produced a choice card.”
3. The live client only renders a choice card when `message.parts` contains `SPEC_DATA_PART_TYPE`, which `MessageBubble` parses and gates on.
   - `src/components/chat/MessageBubble.tsx:668-710`
   - `src/components/chat/MessageBubble.tsx:1607-1625`
4. `ChatWindow` rehydrates persisted `jsonRendererChoice` into `message.parts`, but only during a one-shot history-to-`useChat` sync for a conversation.
   - Sync gate:
     - `src/components/chat/ChatWindow.tsx:1478-1603`
     - `syncedConversationRef` blocks further full sync for the same `conversationId`.
   - Rehydration site:
     - `src/components/chat/ChatWindow.tsx:1535-1560`
5. `useMessages` itself is reactive. The issue is not that Convex history is fetched only once.
   - `src/lib/hooks/useMessages.ts:7-19`
6. The practical bug is this:
   - The search path can persist a fallback choice spec after the turn completes.
   - That persisted choice spec does not reliably reach the already-mounted live `useChat` message state for the same conversation.
   - Result: no card in the live UI, card appears only after refresh/remount when persisted history is rehydrated again.

Secondary contributing gap:
- The search persistence path currently saves `uiMessageId: undefined`.
  - `src/lib/chat-harness/context/execute-web-search-path.ts:249-259`
- The tools path does persist the UI message identifier.
  - `src/lib/chat-harness/executor/build-on-finish-handler.ts:739-748`
- This makes incremental merge-on-history-update harder and less reliable for search responses.

Best recommendation:
- Fix this as a small durability package, not as a one-off patch.
- The best solution is to make the fallback choice card available in both channels:
  1. The live stream path.
  2. The persisted history rehydration/update path.

Required implementation:
1. Emit the deterministic fallback choice spec into the live search stream when the compose/model stream did not emit a valid spec.
   - The search-turn UI should receive a `SPEC_DATA_PART_TYPE` chunk before finish, not only a persisted DB field after finish.
   - Relevant file:
     - `src/lib/ai/web-search/orchestrator.ts`
     - Existing capture/forward logic:
       - `src/lib/ai/web-search/orchestrator.ts:758-769`
       - `src/lib/ai/web-search/orchestrator.ts:1088-1095`
   - Reuse the same fallback choice contract already used by `execute-web-search-path.ts` so behavior stays consistent.
2. Add incremental choice-spec rehydration in `ChatWindow` for reactive `historyMessages` changes within the same conversation.
   - Do not rely only on the one-shot `syncedConversationRef` path.
   - When a persisted assistant message gains `jsonRendererChoice` and the current UI message lacks `SPEC_DATA_PART_TYPE`, merge that spec into the existing `useChat` state.
   - Match priority should prefer `uiMessageId`; provide a safe fallback only if needed.
3. Persist `uiMessageId` on the search path too, so live-to-persisted reconciliation is robust.
   - Relevant file:
     - `src/lib/chat-harness/context/execute-web-search-path.ts`

Constraints:
- Do not ship a narrow fix that only handles this exact screenshot scenario.
- Do not break starter-prompt flow, optimistic rendering, or existing reasoning rehydration behavior.
- Do not remove the guaranteed fallback behavior; strengthen it.

Tests you should add or update:
1. A regression test proving that a search-turn fallback choice card becomes visible without refresh.
2. A `ChatWindow` test proving that when `historyMessages` updates with a persisted `jsonRendererChoice` for the same conversation, the mounted UI message gets the choice spec without remount.
3. If you emit the fallback via stream, add a focused test around the search orchestration or message hydration contract so the spec reaches `message.parts`.

Verification you must run before claiming success:
1. The relevant test file(s) you add/update.
2. A broader targeted test sweep for chat choice-card / search-response behavior.
3. `npm run build`

What to report back:
- Root cause summary.
- Exact files changed.
- Tests run and their results.
- Why the fix is durable for both live stream and persisted reload paths.

This issue is verified. Do not debate whether it exists. Fix it end-to-end.
