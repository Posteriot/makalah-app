# Auth Race Condition Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix race condition where Convex queries throw auth errors before Clerk identity syncs, causing runtime crashes in multi-tab and session refresh scenarios.

**Architecture:** Two-layer defense: (1) Server-side defensive returns instead of throws, (2) Client-side auth gating to prevent premature query execution. Both layers work together - server provides graceful degradation, client prevents unnecessary error states.

**Tech Stack:** Convex (backend), React hooks, Clerk auth, TypeScript

---

## Task 1: Server - Create Defensive Auth Helper

**Files:**
- Modify: `convex/auth.ts:58-71`

**Step 1: Add new helper function `getConversationIfOwner`**

Add this function after `requireConversationOwner` (around line 71):

```typescript
/**
 * Defensive version: Return conversation + authUser if owner, null otherwise.
 * Use this for queries where unauthorized access should return null, not throw.
 */
export async function getConversationIfOwner(
  ctx: AnyCtx,
  conversationId: Id<"conversations">
): Promise<{ authUser: Doc<"users">; conversation: Doc<"conversations"> } | null> {
  const authUser = await getAuthUser(ctx)
  if (!authUser) return null

  const conversation = await ctx.db.get(conversationId)
  if (!conversation) return null
  if (conversation.userId !== authUser._id) return null

  return { authUser, conversation }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp && npx tsc --noEmit -p convex/tsconfig.json 2>&1 | head -20`
Expected: No errors related to auth.ts

**Step 3: Commit**

```bash
git add convex/auth.ts
git commit -m "feat(auth): add defensive getConversationIfOwner helper

Returns null instead of throwing for unauthorized/unauthenticated access.
Prevents race condition crashes during auth sync."
```

---

## Task 2: Server - Fix paperSessions.getByConversation

**Files:**
- Modify: `convex/paperSessions.ts:210-222`

**Step 1: Update import**

At top of file (line 7), add `getConversationIfOwner` to imports:

```typescript
import {
    requireAuthUser,
    requireAuthUserId,
    requireConversationOwner,
    requirePaperSessionOwner,
    getConversationIfOwner,  // ADD THIS
} from "./auth";
```

**Step 2: Refactor getByConversation handler**

Replace lines 210-222 with:

```typescript
/**
 * Mendapatkan paper session berdasarkan conversation ID.
 * Returns null if conversation not found, not owned, or auth not ready.
 */
export const getByConversation = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        // Defensive: return null if auth not ready or not owner
        const result = await getConversationIfOwner(ctx, args.conversationId);
        if (!result) return null;

        const { authUser } = result;
        const session = await ctx.db
            .query("paperSessions")
            .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
            .unique();
        if (!session) return null;
        if (session.userId !== authUser._id) return null;
        return session;
    },
});
```

**Step 3: Verify TypeScript compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp && npx tsc --noEmit -p convex/tsconfig.json 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add convex/paperSessions.ts
git commit -m "fix(paperSessions): defensive getByConversation returns null

Prevents runtime crash when auth identity not yet synced.
Uses getConversationIfOwner for graceful degradation."
```

---

## Task 3: Server - Fix conversations.getConversation

**Files:**
- Modify: `convex/conversations.ts:19-25`

**Step 1: Update import**

At top of file (line 3), add `getConversationIfOwner`:

```typescript
import { requireAuthUserId, requireConversationOwner, getConversationIfOwner } from "./auth"
```

**Step 2: Refactor getConversation handler**

Replace lines 19-25 with:

```typescript
// Get single conversation (defensive - returns null if not owner or auth not ready)
export const getConversation = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const result = await getConversationIfOwner(ctx, conversationId)
        return result?.conversation ?? null
    },
})
```

**Step 3: Verify TypeScript compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp && npx tsc --noEmit -p convex/tsconfig.json 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add convex/conversations.ts
git commit -m "fix(conversations): defensive getConversation returns null

Consistent with paperSessions pattern for race condition prevention."
```

---

## Task 4: Client - Add Auth Gating to usePaperSession

**Files:**
- Modify: `src/lib/hooks/usePaperSession.ts:1-10, 95-99`

**Step 1: Add useConvexAuth import**

At line 1, update import:

```typescript
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";  // ADD THIS
import { useCallback } from "react";
```

**Step 2: Add auth check before query**

Replace lines 95-99 with:

```typescript
export const usePaperSession = (conversationId?: Id<"conversations">) => {
    const { isAuthenticated } = useConvexAuth();

    const session = useQuery(
        api.paperSessions.getByConversation,
        conversationId && isAuthenticated ? { conversationId } : "skip"
    );
```

**Step 3: Verify TypeScript compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp && npm run lint 2>&1 | head -20`
Expected: No errors in usePaperSession.ts

**Step 4: Commit**

```bash
git add src/lib/hooks/usePaperSession.ts
git commit -m "fix(usePaperSession): gate query until auth ready

Prevents premature query execution during Clerk-Convex sync window."
```

---

## Task 5: Client - Add Auth Gating to ChatWindow

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx:11, 63-66`

**Step 1: Add useConvexAuth import**

At line 11, update import:

```typescript
import { useMutation, useQuery } from "convex/react"
import { useConvexAuth } from "convex/react"  // ADD THIS
```

**Step 2: Add auth check for conversation query**

After line 46 (after safeConversationId definition), add:

```typescript
  const { isAuthenticated } = useConvexAuth()
```

**Step 3: Update conversation query to use auth gate**

Replace lines 63-66 with:

```typescript
  // 0. Check if conversation exists (for invalid conversationId handling)
  const conversation = useQuery(
    api.conversations.getConversation,
    safeConversationId && isAuthenticated ? { conversationId: safeConversationId } : "skip"
  )
```

**Step 4: Verify TypeScript compiles and lint passes**

Run: `cd /Users/eriksupit/Desktop/makalahapp && npm run lint 2>&1 | head -20`
Expected: No errors in ChatWindow.tsx

**Step 5: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "fix(ChatWindow): gate conversation query until auth ready

Consistent with usePaperSession auth gating pattern."
```

---

## Task 6: Integration Test - Manual Verification

**Step 1: Start dev servers**

Run in separate terminals:
```bash
# Terminal 1
cd /Users/eriksupit/Desktop/makalahapp && npm run dev

# Terminal 2
cd /Users/eriksupit/Desktop/makalahapp && npm run convex:dev
```

**Step 2: Test multi-tab scenario**

1. Login to app in browser
2. Open a conversation: `/chat/[conversationId]`
3. Copy the URL
4. Open new tab, paste URL
5. Expected: No error, conversation loads normally

**Step 3: Test session refresh scenario**

1. Open a conversation
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. Expected: No error, conversation loads after brief loading state

**Step 4: Test logout/login scenario**

1. Open a conversation, note the URL
2. Logout
3. Login again
4. Navigate to the same URL
5. Expected: No error, conversation loads normally

**Step 5: Final commit (if all tests pass)**

```bash
git add -A
git commit -m "test: verify auth race condition fix works

Tested scenarios:
- Multi-tab: PASS
- Session refresh: PASS
- Logout/login: PASS"
```

---

## Summary

| Task | Component | Change |
|------|-----------|--------|
| 1 | `convex/auth.ts` | Add `getConversationIfOwner` helper |
| 2 | `convex/paperSessions.ts` | Defensive `getByConversation` |
| 3 | `convex/conversations.ts` | Defensive `getConversation` |
| 4 | `usePaperSession.ts` | Auth gate with `useConvexAuth` |
| 5 | `ChatWindow.tsx` | Auth gate with `useConvexAuth` |
| 6 | Manual test | Verify all scenarios |

**Total commits:** 6 (one per task)
