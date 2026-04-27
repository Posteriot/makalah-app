# Restore Naskah & Pratinjau Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore the Naskah preview feature (Pratinjau button in TopBar + full `/naskah/:id` route) that was accidentally lost during merge conflict resolution in commit `9491dadb`.

**Architecture:** Surgical restore from commit `5c6f385b` into the current HEAD. Two-phase execution: standalone files first (zero risk), shared files last (controlled risk).

**Tech Stack:** Convex, Next.js App Router, React, pdfkit, docx

**Source of truth:** Commit `5c6f385b` — the last commit with naskah code intact.

**Restoration mechanism:** All "restore verbatim" steps MUST use `git show 5c6f385b:<path>` to extract the exact file content. Do NOT reconstruct from memory or description.

**Audit status:** Audited 2026-04-20 by 3 independent agents. 3 blockers fixed (B1: Convex ID regex, B2: test mock gap, B3: try-catch rebuild). See `[AUDIT FIX]` markers.

### Cardinal Rule: Naskah Yields to Existing System

Naskah adalah fitur read-only preview yang di-restore ke sistem yang sudah berjalan dan stabil. Berlaku prinsip:

1. **Naskah yang ngalah, bukan sistem existing.** Jika ada tension, naskah yang harus beradaptasi.
2. **Additive only di shared files.** Menambah tanpa mengubah atau menghapus kode yang sudah jalan.
3. **Naskah failure = silent log, bukan rollback.** Semua `rebuildNaskahSnapshot` calls di-wrap try-catch.
4. **Jika naskah menyebabkan bug di sistem existing → revert naskah code, bukan fix sistem.**
5. **Schema additive only.** Tabel baru saja, tabel existing tidak disentuh.

### Execution Strategy: 2 Phases + Per-Task Checkpoint

**Fase 1 — Standalone:** Tasks 1–7 membuat file baru tanpa mengubah satu baris pun kode existing. Error di fase ini hanya terdampak ke naskah.

**Fase 2 — Shared Files:** Tasks 8–10 sentuh kode existing satu-satu. Urutan by design: TopBar (paling isolated) → ChatLayout (wiring + test) → paperSessions (paling berisiko, terakhir).

**Task 11 (E2E Verification)** setelah kedua fase selesai.

### Mandatory Per-Task Checkpoint Protocol

**Setiap task — tanpa kecuali — HARUS diakhiri dengan:**

1. **STOP.** Jangan langsung lanjut ke task berikutnya.
2. **Dispatch audit agent** (`feature-dev:code-reviewer` atau `feature-dev:code-architect`) untuk review hasil task yang baru selesai. Audit scope:
   - Fase 1: verifikasi file baru tidak introduce type error, import cycle, atau dependency yang hilang.
   - Fase 2: verifikasi kode existing TIDAK berubah behavior. Fitur cancel, approve, rewind, choice card, artifact ordering, search orchestration harus tetap intact.
3. **Tunggu audit selesai.** Baca hasilnya. Jika ada RISK atau FAIL → perbaiki sebelum lanjut.
4. **Baru lanjut** ke task berikutnya setelah audit PASS.

Jangan skip checkpoint ini demi kecepatan. Setiap task yang lolos tanpa audit adalah potensi bug tersembunyi yang menumpuk.

**Fase 1 checkpoint tambahan:** Setelah Task 7 selesai (semua standalone tasks), jalankan full typecheck + dev server sebelum masuk Fase 2. Jika error, fix TANPA sentuh shared files. Jika tidak bisa → STOP, eskalasi ke user.

**Fase 2 checkpoint tambahan:** Setelah setiap task, verifikasi fitur existing (chat page load, approve, cancel, rewind) masih bekerja. Jika ada regresi → `git checkout <shared-file>` immediately, jangan debug.

---

# FASE 1 — STANDALONE (File Baru, Zero Risk ke Existing)

---

## Task 1: Restore Convex Schema (naskahSnapshots + naskahViews tables)

**Files:**
- Modify: `convex/schema.ts:778` (insert after `rewindHistory` table, before `pricingPlans`)

**Step 1: Add naskahSnapshots and naskahViews tables to schema**

Insert after line 778 (after `rewindHistory` closing `.index(...)`) and before the `pricingPlans` comment block:

```typescript
  // ════════════════════════════════════════════════════════════════
  // Naskah Snapshots - read-only compiled paper view per session
  // Each row is a materialized snapshot produced by the naskah compiler
  // (src/lib/naskah/compiler.ts) when validation-relevant state changes.
  // ════════════════════════════════════════════════════════════════
  naskahSnapshots: defineTable({
    sessionId: v.id("paperSessions"),
    revision: v.number(), // Monotonic per session
    compiledAt: v.number(),
    status: v.union(v.literal("growing"), v.literal("stable")),

    title: v.string(),
    titleSource: v.union(
      v.literal("judul_final"),
      v.literal("paper_title"),
      v.literal("working_title"),
      v.literal("topik_definitif"),
      v.literal("fallback"),
    ),

    sections: v.array(
      v.object({
        key: v.union(
          v.literal("abstrak"),
          v.literal("pendahuluan"),
          v.literal("tinjauan_literatur"),
          v.literal("metodologi"),
          v.literal("hasil"),
          v.literal("diskusi"),
          v.literal("kesimpulan"),
          v.literal("daftar_pustaka"),
          v.literal("lampiran"),
        ),
        label: v.string(),
        content: v.string(),
        sourceStage: v.string(),
        sourceArtifactId: v.optional(v.string()),
      }),
    ),

    pageEstimate: v.number(),

    sourceArtifactRefs: v.array(
      v.object({
        stage: v.string(),
        artifactId: v.optional(v.id("artifacts")),
        revisionCount: v.optional(v.number()),
        usedForRender: v.boolean(),
        resolution: v.union(
          v.literal("artifact"),
          v.literal("inline"),
          v.literal("dropped"),
          v.literal("overridden"),
        ),
      }),
    ),

    isAvailable: v.boolean(),
    reasonIfUnavailable: v.optional(
      v.union(
        v.literal("empty_session"),
        v.literal("no_validated_abstrak"),
        v.literal("abstrak_guard_failed"),
      ),
    ),
  })
    .index("by_session", ["sessionId", "revision"]),

  // ════════════════════════════════════════════════════════════════
  // Naskah Views - per-user view state for manual refresh contract
  // ════════════════════════════════════════════════════════════════
  naskahViews: defineTable({
    sessionId: v.id("paperSessions"),
    userId: v.id("users"),
    lastViewedRevision: v.number(),
    viewedAt: v.number(),
  })
    .index("by_session_user", ["sessionId", "userId"]),
```

**Step 2: Verify schema**

Run: `npx convex dev --once`
Expected: Schema accepted, `convex/_generated/api.d.ts` updated with naskah entries

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(naskah): restore naskahSnapshots and naskahViews schema tables"
```

---

## Task 2: Restore Naskah Lib Layer (types, compiler, utilities)

**Files:**
- Create: `src/lib/naskah/types.ts`
- Create: `src/lib/naskah/compiler.ts`
- Create: `src/lib/naskah/anchors.ts`
- Create: `src/lib/naskah/split-markdown.ts`
- Create: `src/lib/naskah/updatePending.ts`
- Create: `src/lib/naskah/export/markdown-blocks.ts`
- Create: `src/lib/naskah/export/naskah-pdf-builder.ts`
- Create: `src/lib/naskah/export/naskah-word-builder.ts`

**Step 1: Create all 8 lib files**

```bash
mkdir -p src/lib/naskah/export
git show 5c6f385b:src/lib/naskah/types.ts > src/lib/naskah/types.ts
git show 5c6f385b:src/lib/naskah/compiler.ts > src/lib/naskah/compiler.ts
git show 5c6f385b:src/lib/naskah/anchors.ts > src/lib/naskah/anchors.ts
git show 5c6f385b:src/lib/naskah/split-markdown.ts > src/lib/naskah/split-markdown.ts
git show 5c6f385b:src/lib/naskah/updatePending.ts > src/lib/naskah/updatePending.ts
git show 5c6f385b:src/lib/naskah/export/markdown-blocks.ts > src/lib/naskah/export/markdown-blocks.ts
git show 5c6f385b:src/lib/naskah/export/naskah-pdf-builder.ts > src/lib/naskah/export/naskah-pdf-builder.ts
git show 5c6f385b:src/lib/naskah/export/naskah-word-builder.ts > src/lib/naskah/export/naskah-word-builder.ts
```

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -i naskah | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/naskah/
git commit -m "feat(naskah): restore lib layer — types, compiler, anchors, split-markdown, export builders"
```

---

## Task 3: Restore Convex Backend (naskah.ts + naskahRebuild.ts)

**Files:**
- Create: `convex/naskah.ts`
- Create: `convex/naskahRebuild.ts`

**Step 1: Create both Convex files**

```bash
git show 5c6f385b:convex/naskah.ts > convex/naskah.ts
git show 5c6f385b:convex/naskahRebuild.ts > convex/naskahRebuild.ts
```

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -i naskah | head -20`
Expected: Clean

**Step 3: Commit**

```bash
git add convex/naskah.ts convex/naskahRebuild.ts
git commit -m "feat(naskah): restore Convex queries/mutations and rebuild helper"
```

---

## Task 4: Restore useNaskah Hook

**Files:**
- Create: `src/lib/hooks/useNaskah.ts`

**Step 1: Create the hook file**

```bash
git show 5c6f385b:src/lib/hooks/useNaskah.ts > src/lib/hooks/useNaskah.ts
```

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | grep useNaskah | head -5`
Expected: Clean

**Step 3: Commit**

```bash
git add src/lib/hooks/useNaskah.ts
git commit -m "feat(naskah): restore useNaskah client hook"
```

---

## Task 5: Restore Naskah Components (9 files)

**Files:**
- Create: `src/components/naskah/NaskahPage.tsx`
- Create: `src/components/naskah/NaskahShell.tsx`
- Create: `src/components/naskah/NaskahHeader.tsx`
- Create: `src/components/naskah/NaskahPreview.tsx`
- Create: `src/components/naskah/NaskahActivityBar.tsx`
- Create: `src/components/naskah/NaskahDownloadButton.tsx`
- Create: `src/components/naskah/NaskahSidebar.tsx`
- Create: `src/components/naskah/NaskahSidebarContainer.tsx`
- Create: `src/components/naskah/useLineLevelPagination.ts`

**Step 1: Create all 9 component files**

```bash
mkdir -p src/components/naskah
git show 5c6f385b:src/components/naskah/NaskahPage.tsx > src/components/naskah/NaskahPage.tsx
git show 5c6f385b:src/components/naskah/NaskahShell.tsx > src/components/naskah/NaskahShell.tsx
git show 5c6f385b:src/components/naskah/NaskahHeader.tsx > src/components/naskah/NaskahHeader.tsx
git show 5c6f385b:src/components/naskah/NaskahPreview.tsx > src/components/naskah/NaskahPreview.tsx
git show 5c6f385b:src/components/naskah/NaskahActivityBar.tsx > src/components/naskah/NaskahActivityBar.tsx
git show 5c6f385b:src/components/naskah/NaskahDownloadButton.tsx > src/components/naskah/NaskahDownloadButton.tsx
git show 5c6f385b:src/components/naskah/NaskahSidebar.tsx > src/components/naskah/NaskahSidebar.tsx
git show 5c6f385b:src/components/naskah/NaskahSidebarContainer.tsx > src/components/naskah/NaskahSidebarContainer.tsx
git show 5c6f385b:src/components/naskah/useLineLevelPagination.ts > src/components/naskah/useLineLevelPagination.ts
```

**Step 2: Fix Convex ID regex in NaskahShell.tsx**

> `[AUDIT FIX B1]` `/^[a-z0-9]{32}$/` rejects valid Convex IDs. Replace with length-only check.

In `src/components/naskah/NaskahShell.tsx`, change:
```typescript
    typeof conversationId === "string" && /^[a-z0-9]{32}$/.test(conversationId)
```
to:
```typescript
    typeof conversationId === "string" && conversationId.length > 0
```

**Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -i naskah | head -20`

**Step 4: Commit**

```bash
git add src/components/naskah/
git commit -m "feat(naskah): restore all naskah page components"
```

---

## Task 6: Restore Next.js Route + Layout + API Routes

**Files:**
- Create: `src/app/naskah/layout.tsx`
- Create: `src/app/naskah/[conversationId]/page.tsx`
- Create: `src/app/api/naskah/export/pdf/route.ts`
- Create: `src/app/api/naskah/export/word/route.ts`

**Step 1: Create route files**

```bash
mkdir -p src/app/naskah/\[conversationId\]
mkdir -p src/app/api/naskah/export/pdf
mkdir -p src/app/api/naskah/export/word
git show 5c6f385b:src/app/naskah/layout.tsx > src/app/naskah/layout.tsx
git show '5c6f385b:src/app/naskah/[conversationId]/page.tsx' > 'src/app/naskah/[conversationId]/page.tsx'
git show 5c6f385b:src/app/api/naskah/export/pdf/route.ts > src/app/api/naskah/export/pdf/route.ts
git show 5c6f385b:src/app/api/naskah/export/word/route.ts > src/app/api/naskah/export/word/route.ts
```

**Step 2: Fix Convex ID regex in naskah page.tsx**

> `[AUDIT FIX B1]` Same regex bug as NaskahShell.

In `src/app/naskah/[conversationId]/page.tsx`, change:
```typescript
    typeof conversationId === "string" && /^[a-z0-9]{32}$/.test(conversationId)
```
to:
```typescript
    typeof conversationId === "string" && conversationId.length > 0
```

**Step 3: Verify**

Run: `ls -la src/app/naskah/ src/app/api/naskah/export/*/`
Expected: All 4 files exist

**Step 4: Commit**

```bash
git add src/app/naskah/ src/app/api/naskah/
git commit -m "feat(naskah): restore /naskah route, layout, and PDF/DOCX export API routes"
```

---

## Task 7: Update next.config.ts for pdfkit

**Files:**
- Modify: `next.config.ts`

**Step 1: Add pdfkit to serverExternalPackages**

In the `serverExternalPackages` array (line 8-13), add after `"officeparser"`:

```typescript
    // pdfkit ships AFM font metric files loaded at runtime via fs.readFileSync.
    // Bundling through Turbopack strips those data files.
    // Required by /api/naskah/export/pdf.
    "pdfkit",
```

**Step 2: Commit**

```bash
git add next.config.ts
git commit -m "fix(config): add pdfkit to serverExternalPackages for naskah PDF export"
```

---

## FASE 1 CHECKPOINT

**Before proceeding to Fase 2, verify ALL of the following:**

1. `npx tsc --noEmit` → zero errors
2. `npm run dev` → dev server starts without errors
3. Chat page loads normally (no regressions)
4. Existing features work: open a conversation, verify sidebar, theme toggle, artifact indicator all function

**If ANY check fails → fix within naskah files only. Do NOT proceed to Fase 2 until all checks pass.**

---

# FASE 2 — SHARED FILES (Sentuh Kode Existing, Satu-Satu)

> Every task in this phase touches existing working code. Execute one at a time with verification between each.

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

---

# E2E VERIFICATION

---

## Task 11: End-to-End Verification

**Step 1: Full TypeScript check**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors

**Step 2: Run ChatLayout test**

Run: `npx vitest run src/components/chat/layout/ChatLayout.sidebar-tree.test.tsx`
Expected: All tests pass

**Step 3: Verify Convex schema + generated types**

Run: `npx convex dev --once 2>&1 | tail -10`
Expected: Schema pushed, API types include naskah entries

**Step 4: Dev server smoke test**

Run `npm run dev` and verify:
1. Chat page loads without errors
2. TopBar shows "Pratinjau" button (muted when no naskah available)
3. Clicking Pratinjau opens `/naskah/:id` in new tab
4. Naskah page renders (empty state "Belum ada section..." is fine)
5. Approve/cancel/rewind still work correctly

---

## Execution Order Summary

```
FASE 1 — STANDALONE (zero risk)
  Task 1:  schema.ts          → 2 new tables (additive)
  Task 2:  src/lib/naskah/    → 8 new files (pure lib)
  Task 3:  convex/naskah*.ts  → 2 new files (backend)
  Task 4:  useNaskah.ts       → 1 new file (hook)
  Task 5:  components/naskah/ → 9 new files (UI)
  Task 6:  app/naskah/        → 4 new files (routes)
  Task 7:  next.config.ts     → 1 line additive
  ─── CHECKPOINT: typecheck + dev server ───

FASE 2 — SHARED FILES (controlled risk, one at a time)
  Task 8:  TopBar.tsx          → replace file (1 caller, optional props)
  Task 9:  ChatLayout.tsx      → add hooks + props + test mocks
  Task 10: paperSessions.ts    → 4x try-catch rebuild (LAST, highest risk)
  ─── E2E VERIFICATION ───

  Task 11: Full verification
```

## Audit Fixes Summary

| ID | Type | Location | Fix |
|----|------|----------|-----|
| B1 | BLOCKER | ChatLayout.tsx, NaskahShell.tsx, naskah page.tsx | Replace `/^[a-z0-9]{32}$/` with `conversationId.length > 0` |
| B2 | BLOCKER | ChatLayout.sidebar-tree.test.tsx | Add mocks for `usePaperSession` and `useNaskah` |
| B3 | BLOCKER | paperSessions.ts (4 call sites) | Wrap `rebuildNaskahSnapshot` in try-catch — preview failure must not block core workflows |
| R1 | RISK | paperSessions.ts:980 (unapproveStage) | No orphaned comment — insert fresh |
| R2 | RISK | All verbatim restore tasks | Added explicit `git show` commands |
