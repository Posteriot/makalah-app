# FASE 2 — SHARED FILES (Sentuh Kode Existing, Satu-Satu)

> Every task in this phase touches existing working code. Execute one at a time with verification between each.
> **Per-Task Protocol:** Setiap task selesai → STOP → dispatch audit agent → verifikasi fitur existing TIDAK rusak → tunggu PASS → baru lanjut. Jika ada regresi → `git checkout <shared-file>` immediately, jangan debug. Lihat `context.md` §Mandatory Per-Task Checkpoint Protocol.

---

## Task 8: Restore TopBar with Pratinjau Button

**Files:**
- Modify: `src/components/chat/shell/TopBar.tsx` (full replacement)

**Why this is safe:** TopBar has exactly 1 caller (ChatLayout). The new props are all optional with defaults, so the existing caller works unchanged until Task 9 passes the new props.

**Step 1: Replace TopBar.tsx**

```bash
git show 5c6f385b:src/components/chat/shell/TopBar.tsx > src/components/chat/shell/TopBar.tsx
```

**Step 2: Verify existing behavior unchanged**

Run: `npx tsc --noEmit 2>&1 | grep TopBar | head -5`
Expected: Clean — new props all have defaults so existing caller compiles

**Step 3: Verify dev server**

`npm run dev` → chat page loads, TopBar renders (Pratinjau won't show yet — no props passed)

**Step 4: Commit**

```bash
git add src/components/chat/shell/TopBar.tsx
git commit -m "feat(topbar): restore Pratinjau button with naskah availability + auto-tooltip"
```

### CHECKPOINT Task 8
STOP. Dispatch audit agent (`feature-dev:code-reviewer`) untuk verifikasi: TopBar compiles with existing caller (no new required props), chat page loads normally, TopBar renders without Pratinjau (props not passed yet — expected). Verifikasi fitur existing: sidebar toggle, theme toggle, artifact indicator, user dropdown. Tunggu PASS sebelum lanjut.

---

## Task 9: Wire TopBar Props in ChatLayout

**Files:**
- Modify: `src/components/chat/layout/ChatLayout.tsx`
- Modify: `src/components/chat/layout/ChatLayout.sidebar-tree.test.tsx`

**Step 1: Add imports**

At line 4, change:
```typescript
import { useRouter } from "next/navigation"
```
to:
```typescript
import { usePathname, useRouter } from "next/navigation"
```

After line 16 (after `ArtifactOpenOptions` import), add:
```typescript
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import { useNaskah } from "@/lib/hooks/useNaskah"
```

**Step 2: Add `routeContext` to ChatLayoutProps interface**

In the `ChatLayoutProps` interface (around line 53), add:
```typescript
  routeContext?: "chat" | "naskah"
```

**Step 3: Add `routeContext` to destructured props**

Add `routeContext,` after `onMobileSidebarOpenChange,`.

**Step 4: Add naskah state derivation**

> `[AUDIT FIX B1]` Length-only check, not regex.

After `const isRightPanelOpen = isArtifactPanelOpen` (around line 99), add:

```typescript
  const pathname = usePathname()
  const safeConversationId =
    typeof conversationId === "string" && conversationId.length > 0
      ? (conversationId as Id<"conversations">)
      : undefined
  const { session } = usePaperSession(safeConversationId)
  const { availability, updatePending } = useNaskah(session?._id)
  const resolvedRouteContext =
    routeContext ??
    (pathname?.includes("/naskah") ? "naskah" : "chat")
```

**Step 5: Pass naskah props to TopBar**

In the `<TopBar>` JSX, add after `artifactCount={artifactCount}`:

```tsx
            conversationId={conversationId}
            routeContext={resolvedRouteContext}
            naskahAvailable={availability?.isAvailable ?? false}
            naskahUpdatePending={updatePending}
```

**Step 6: Fix existing ChatLayout test mocks**

> `[AUDIT FIX B2]` Without these mocks, tests crash calling Convex hooks outside a provider.

In `src/components/chat/layout/ChatLayout.sidebar-tree.test.tsx`, add to the mock block:

```typescript
vi.mock("@/lib/hooks/usePaperSession", () => ({
  usePaperSession: () => ({ session: undefined, isLoading: false }),
}))

vi.mock("@/lib/hooks/useNaskah", () => ({
  useNaskah: () => ({ availability: undefined, updatePending: false, isLoading: false }),
}))
```

Update the existing `next/navigation` mock to include `usePathname`:

```typescript
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/chat/test123",
}))
```

**Step 7: Verify tests pass**

Run: `npx vitest run src/components/chat/layout/ChatLayout.sidebar-tree.test.tsx`
Expected: All existing tests pass

**Step 8: Verify dev server + Pratinjau visible**

`npm run dev` → open a conversation → TopBar should show "Pratinjau" (muted if no naskah available)

**Step 9: Commit**

```bash
git add src/components/chat/layout/ChatLayout.tsx src/components/chat/layout/ChatLayout.sidebar-tree.test.tsx
git commit -m "feat(layout): wire naskah availability into TopBar via ChatLayout"
```

### CHECKPOINT Task 9
STOP. Dispatch audit agent untuk verifikasi: B1 regex fix applied (length check, NOT regex), B2 test mocks added (usePaperSession, useNaskah, usePathname), ALL existing ChatLayout tests pass, Pratinjau visible in TopBar, chat page loads without error. **Critical:** verify no existing useEffect dep arrays were modified (CLAUDE.md rule). Tunggu PASS sebelum lanjut.

---

## Task 10: Wire rebuildNaskahSnapshot into paperSessions.ts

**Files:**
- Modify: `convex/paperSessions.ts`

> `[AUDIT FIX B3 — DEFENSIVE WRAP]` All 4 call sites MUST use try-catch. Naskah rebuild failure must NEVER block approve, cancel, unapprove, or rewind.

> `[AUDIT NOTE]` Site 1 (cancelChoiceDecision) and Site 3 (approveStage) have orphaned comments. Site 2 (unapproveStage) and Site 4 (rewindToStage) do NOT — insert fresh.

**Step 1: Add import**

At line 20 (after existing imports), add:

```typescript
import { rebuildNaskahSnapshot } from "./naskahRebuild";
```

**Step 2: cancelChoiceDecision (line ~843)**

Current orphaned comment at line 843:
```typescript
        // Naskah rebuild hook — atomic with the cancel. If rebuild
        console.info(`[PAPER][cancel-choice] ...
```

Replace orphaned comment and insert try-catch:

```typescript
        // Naskah snapshot rebuild — non-blocking. Failure logs error
        // but does NOT roll back the cancel.
        try {
            await rebuildNaskahSnapshot(ctx, args.sessionId);
        } catch (error) {
            console.error(
                `[NASKAH][rebuild-failed] trigger=cancelChoiceDecision ` +
                `sessionId=${args.sessionId} stage=${currentStage} ` +
                `error=${error instanceof Error ? error.message : String(error)}`
            );
        }

        console.info(`[PAPER][cancel-choice] ...
```

**Step 3: unapproveStage (line ~980)**

> No orphaned comment at this site. Insert fresh.

After `await ctx.db.patch(args.sessionId, patchData);` (line 979), before `clearedNextStage` (line 981):

```typescript
        // Naskah snapshot rebuild — non-blocking.
        try {
            await rebuildNaskahSnapshot(ctx, args.sessionId);
        } catch (error) {
            console.error(
                `[NASKAH][rebuild-failed] trigger=unapproveStage ` +
                `sessionId=${args.sessionId} stage=${targetStage} ` +
                `error=${error instanceof Error ? error.message : String(error)}`
            );
        }
```

**Step 4: approveStage (line ~1578)**

Current orphaned comment at line 1578-1579:
```typescript
        // Naskah rebuild hook — atomic with the approval. If rebuild
        // throws, the entire mutation rolls back so the snapshot can
        console.info(`[USER-ACTION] ...
```

Replace orphaned comment and insert try-catch:

```typescript
        // Naskah snapshot rebuild — non-blocking. Failure logs error
        // but does NOT roll back the approval.
        try {
            await rebuildNaskahSnapshot(ctx, args.sessionId);
        } catch (error) {
            console.error(
                `[NASKAH][rebuild-failed] trigger=approveStage ` +
                `sessionId=${args.sessionId} stage=${currentStage} ` +
                `error=${error instanceof Error ? error.message : String(error)}`
            );
        }

        console.info(`[USER-ACTION] ...
```

**Step 5: rewindToStage (line ~2175)**

After `});` patch call (line 2175), before `return` (line 2177):

```typescript
        // Naskah snapshot rebuild — non-blocking.
        try {
            await rebuildNaskahSnapshot(ctx, args.sessionId);
        } catch (error) {
            console.error(
                `[NASKAH][rebuild-failed] trigger=rewindToStage ` +
                `sessionId=${args.sessionId} stage=${args.targetStage} ` +
                `error=${error instanceof Error ? error.message : String(error)}`
            );
        }
```

**Step 6: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | grep paperSessions | head -10`
Expected: Clean

**Step 7: Verify core workflows NOT broken**

This is the most critical verification. Run dev server and test:
1. Approve a stage → should succeed
2. Cancel a choice card → should succeed
3. Rewind to previous stage → should succeed

If ANY of these fail → `git checkout convex/paperSessions.ts` immediately.

**Step 8: Commit**

```bash
git add convex/paperSessions.ts
git commit -m "feat(naskah): wire rebuildNaskahSnapshot (try-catch) into 4 mutation sites"
```

### CHECKPOINT Task 10 (MOST CRITICAL)
STOP. Dispatch audit agent (`feature-dev:code-architect`) untuk verifikasi:
1. All 4 call sites use try-catch (NO bare await)
2. Import is from `./naskahRebuild` (sub-module, no circular dependency)
3. No existing mutation logic was modified — only additive insertions
4. Error log format includes trigger, sessionId, stage
5. **Manual verification required:** approve a stage, cancel a choice card, rewind to previous stage — ALL must succeed
6. If ANY core workflow fails → `git checkout convex/paperSessions.ts` immediately

Tunggu PASS sebelum proceeding to Task 11 (E2E Verification in `e2e-verification.md`).