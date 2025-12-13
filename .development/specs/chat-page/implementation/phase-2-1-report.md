# Phase 2.1 Report: Custom Hooks

## Completed Tasks
### Task Group 2.1: Custom Hooks
- [x] **CHAT-022: useConversations Hook**
  - Created `src/lib/hooks/useConversations.ts`.
  - Implemented Client-side ID resolution: `clerkUserId` -> `Convex ID` using `api.chatHelpers.getUserId`.
  - Implemented fetching of conversations dependent on the resolved ID.
  - Implemented mutations for creating and deleting conversations.

- [x] **CHAT-023: useMessages Hook**
  - Created `src/lib/hooks/useMessages.ts`.
  - Implemented fetching messages for a given `conversationId`.
  - Implemented mutation for creating messages.

## Verification
- **Build Status**: Passed (`npm run build`).
- **Lint Status**: Passed (`npm run lint`).
- **Type Check**: Verified usage of `Id<"tableName">` for type safety.

## Next Steps
Proceed to **Task Group 2.2: Chat UI Components** starting with `ChatContainer`.
