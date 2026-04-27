# FASE 1 — STANDALONE (File Baru, Zero Risk ke Existing)

> **Per-Task Protocol:** Setiap task selesai → STOP → dispatch audit agent → tunggu PASS → baru lanjut. Lihat `context.md` §Mandatory Per-Task Checkpoint Protocol.

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

### CHECKPOINT Task 1
STOP. Dispatch audit agent (`feature-dev:code-reviewer`) untuk verifikasi: schema additive, no existing table modified, indexes correct, generated types updated. Tunggu PASS sebelum lanjut.

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

### CHECKPOINT Task 2
STOP. Dispatch audit agent untuk verifikasi: all 8 files created, no import cycles, types resolve against `convex/paperSessions/constants`, no dependency on reverted code. Tunggu PASS sebelum lanjut.

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

### CHECKPOINT Task 3
STOP. Dispatch audit agent untuk verifikasi: `naskah.ts` queries match schema indexes, `naskahRebuild.ts` imports from `paperSessions/constants` (sub-module, NOT `paperSessions.ts` — no circular dependency), compiler integration correct. Tunggu PASS sebelum lanjut.

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

### CHECKPOINT Task 4
STOP. Dispatch audit agent untuk verifikasi: hook uses `api.naskah.*` correctly, skip pattern for undefined sessionId works, no side effects on import. Tunggu PASS sebelum lanjut.

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

### CHECKPOINT Task 5
STOP. Dispatch audit agent untuk verifikasi: all 9 files created, B1 regex fix applied in NaskahShell.tsx, component imports resolve (MarkdownRenderer, CreditMeter, UserDropdown, Sheet all exist), no import from shared files that would be modified in Fase 2. Tunggu PASS sebelum lanjut.

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

### CHECKPOINT Task 6
STOP. Dispatch audit agent untuk verifikasi: all 4 route files exist, B1 regex fix applied in page.tsx, layout has `data-chat-scope` wrapper, API routes use `isAuthenticated` from `@/lib/auth-server`, no route conflicts with existing `/chat` routes. Tunggu PASS sebelum lanjut.

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

### CHECKPOINT Task 7
STOP. Dispatch audit agent untuk verifikasi: `pdfkit` added to array without modifying existing entries, pdfkit exists in `package.json` and `node_modules`. Tunggu PASS sebelum lanjut.

---

## FASE 1 CHECKPOINT

**Before proceeding to Fase 2, verify ALL of the following:**

1. `npx tsc --noEmit` → zero errors
2. `npm run dev` → dev server starts without errors
3. Chat page loads normally (no regressions)
4. Existing features work: open a conversation, verify sidebar, theme toggle, artifact indicator all function

**If ANY check fails → fix within naskah files only. Do NOT proceed to Fase 2 until all checks pass.**
