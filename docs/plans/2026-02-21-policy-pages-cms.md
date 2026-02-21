# Policy Pages CMS Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Privacy, Security, and Terms pages fully CMS-driven with actual content seeded as TipTap JSON, preserving the sky-blue intro callout treatment.

**Architecture:** CmsPageWrapper already wraps all 3 pages. The work is: (1) seed actual content as TipTap JSON, (2) update CmsPageWrapper to split first paragraph as intro callout, matching SimplePolicyPage behavior. No schema changes needed — first paragraph convention mirrors the existing static pattern.

**Tech Stack:** Convex migrations, TipTap JSON, React, TypeScript

**Current state:** CmsPageWrapper wraps all 3 pages, RichTextPageEditor wired in ContentManager, richTextPages seed exists but with placeholder "Konten akan segera diperbarui." content and `isPublished: false`.

---

### Task 1: Update CmsPageWrapper to support intro callout

**Files:**
- Modify: `src/components/marketing/CmsPageWrapper.tsx`

**Context:** `SimplePolicyPage` splits `children[0]` as an intro paragraph rendered in a sky-blue callout box (border sky-300/45, bg sky-400/10, left gradient bar). `CmsPageWrapper` CMS mode currently renders ALL TipTap content flat without this callout treatment. We need to split the first paragraph from TipTap JSON and render it in the same callout style.

**Step 1: Add intro paragraph extraction logic**

In `CmsPageWrapper`, before the JSX return, parse the TipTap JSON content and split:

```tsx
// Parse TipTap JSON, extract first paragraph as intro
const parsed = JSON.parse(page.content)
const nodes = parsed?.content ?? []
const firstNode = nodes[0]
const hasIntro = firstNode?.type === "paragraph"

const introContent = hasIntro
  ? JSON.stringify({ type: "doc", content: [firstNode] })
  : null
const bodyContent = hasIntro
  ? JSON.stringify({ type: "doc", content: nodes.slice(1) })
  : page.content
```

**Step 2: Update CMS JSX to render intro callout + body**

Replace the single `<RichTextRenderer content={page.content} />` with:

```tsx
{introContent && (
  <div className="relative overflow-hidden rounded-shell border-main border border-sky-300/45 bg-sky-400/10 px-4 py-4 dark:border-sky-200/35 dark:bg-sky-400/20 md:px-5">
    <span
      aria-hidden
      className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-sky-300 to-sky-500 dark:from-sky-200 dark:to-sky-400"
    />
    <div className="relative">
      <RichTextRenderer content={introContent} />
    </div>
  </div>
)}

<RichTextRenderer content={bodyContent} />
```

The callout classes are **exactly** copied from `SimplePolicyPage` lines 52-60. The `<div className="relative">` wrapper replaces the `text-narrative text-sm leading-relaxed text-slate-700 ...` div because RichTextRenderer already handles its own styling.

Also add `space-y-10` to the parent motion.div `className="mt-9"` → `className="mt-9 space-y-10"` to match SimplePolicyPage's vertical spacing.

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors from CmsPageWrapper.tsx

**Step 4: Commit**

```bash
git add src/components/marketing/CmsPageWrapper.tsx
git commit -m "feat(cms): add intro callout treatment to CmsPageWrapper"
```

---

### Task 2: Create seed migration with actual Privacy content as TipTap JSON

**Files:**
- Create: `convex/migrations/seedPolicyContent.ts`

**Context:** The current `seedRichTextPages.ts` seeded placeholder content. This new migration will **update** existing records with the actual page content converted to TipTap JSON. It updates (not inserts) by querying existing records by slug.

**Step 1: Write the migration file**

Create `convex/migrations/seedPolicyContent.ts` with an `internalMutationGeneric` that:
1. Queries existing record by slug
2. If exists, patches with real content + `lastUpdatedLabel: "TERAKHIR DIPERBARUI: 21 FEBRUARI 2026"`
3. If not exists, inserts full record

**Privacy TipTap JSON structure:**

Convert the JSX from `privacy/page.tsx` to TipTap JSON. The structure is:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Makalah AI (dioperasikan oleh PT THE MANAGEMENT ASIA) sangat menghargai privasi Anda. Sebagai aplikasi " },
        { "type": "text", "marks": [{ "type": "bold" }], "text": "AI Academic Writing Assistant" },
        { "type": "text", "text": ", kami berkomitmen untuk transparan dalam mengelola data yang Anda berikan agar layanan kami dapat membantu Anda menyusun karya tulis ilmiah dengan maksimal." }
      ]
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "1. Data yang Kami Kumpulkan" }]
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Untuk menjalankan fungsi aplikasi, kami mengumpulkan:" }]
    },
    {
      "type": "bulletList",
      "content": [
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [
          { "type": "text", "marks": [{ "type": "bold" }], "text": "Data Profil" },
          { "type": "text", "text": ": Nama dan alamat email saat Anda mendaftar (via Google atau formulir langsung)." }
        ]}]},
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [
          { "type": "text", "marks": [{ "type": "bold" }], "text": "Konten Riset" },
          { "type": "text", "text": ": Pesan chat, draf paper, dan file lampiran yang Anda unggah untuk diproses oleh AI." }
        ]}]},
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [
          { "type": "text", "marks": [{ "type": "bold" }], "text": "Data Transaksi" },
          { "type": "text", "text": ": Informasi transaksi pembayaran (melalui mitra Xendit) untuk pengelolaan langganan." }
        ]}]},
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [
          { "type": "text", "marks": [{ "type": "bold" }], "text": "Data Teknis" },
          { "type": "text", "text": ": Log aktivitas dasar untuk memastikan layanan tetap stabil dan aman." }
        ]}]}
      ]
    }
  ]
}
```

Continue this pattern for all 6 sections of the Privacy page. Each `<section>` becomes: heading (h2) → optional paragraph → optional bulletList.

Section mapping (Privacy):
- Section 1: h2 + p + bulletList (4 items)
- Section 2: h2 + p + bulletList (4 items)
- Section 3: h2 + p + bulletList (3 items)
- Section 4: h2 + p (single paragraph)
- Section 5: h2 + p + bulletList (3 items)
- Section 6: h2 + p (with line breaks → use `{ "type": "hardBreak" }` for `<br/>`)

**Step 2: Add Security content**

Same pattern. Section mapping (Security):
- Intro: single paragraph
- "Komitmen Kami": h2 + p
- Section 1: h2 + bulletList (3 items)
- Section 2: h2 + bulletList (2 items)
- Section 3: h2 + bulletList (2 items)
- Section 4: h2 + bulletList (2 items)
- Section 5: h2 + bulletList (2 items)

**Step 3: Add Terms content**

Section mapping (Terms):
- Intro: single paragraph (with bold "PT THE MANAGEMENT ASIA")
- Sections 1-6: each h2 + single paragraph
- Section 7: h2 + p + bulletList (2 items)

**Step 4: Wire all three in the migration handler**

```typescript
export const seedPolicyContent = internalMutationGeneric({
  args: {},
  handler: async ({ db }) => {
    const pages = [
      { slug: "privacy", title: "Kebijakan Privasi Makalah AI", content: privacyContent, lastUpdatedLabel: "TERAKHIR DIPERBARUI: 21 FEBRUARI 2026" },
      { slug: "security", title: "Keamanan Data di Makalah AI", content: securityContent, lastUpdatedLabel: "TERAKHIR DIPERBARUI: 21 FEBRUARI 2026" },
      { slug: "terms", title: "Ketentuan Layanan Makalah AI", content: termsContent, lastUpdatedLabel: "TERAKHIR DIPERBARUI: 21 FEBRUARI 2026" },
    ]

    for (const page of pages) {
      const existing = await db.query("richTextPages")
        .withIndex("by_slug", (q) => q.eq("slug", page.slug))
        .first()

      if (existing) {
        await db.patch(existing._id, {
          title: page.title,
          content: page.content,
          lastUpdatedLabel: page.lastUpdatedLabel,
          updatedAt: Date.now(),
        })
        // Note: isPublished NOT changed — admin toggles manually
      } else {
        await db.insert("richTextPages", {
          slug: page.slug,
          title: page.title,
          content: page.content,
          lastUpdatedLabel: page.lastUpdatedLabel,
          isPublished: false,
          updatedAt: Date.now(),
        })
      }
    }
  },
})
```

**IMPORTANT:** Do NOT set `isPublished: true` in the migration. Admin will toggle publish manually after reviewing content in the CMS editor.

**Step 5: Commit**

```bash
git add convex/migrations/seedPolicyContent.ts
git commit -m "feat(cms): add seed migration with actual policy content as TipTap JSON"
```

---

### Task 3: Run seed migration and verify DB content

**Step 1: Run migration**

```bash
npx convex run migrations:seedPolicyContent
```

Expected: 3 records updated (privacy, security, terms).

**Step 2: Verify content in Convex dashboard (optional)**

```bash
npx convex run richTextPages:getPageBySlugAdmin --args '{"requestorId": "<admin-user-id>", "slug": "privacy"}'
```

Verify: title, content (long JSON), lastUpdatedLabel, isPublished: false.

**Step 3: Commit generated types if changed**

```bash
git add convex/_generated/api.d.ts
git commit -m "chore: update Convex generated types for seedPolicyContent"
```

---

### Task 4: Verify end-to-end — static vs CMS rendering parity

**Step 1: Verify static mode (isPublished: false)**

With dev server running, visit:
- `http://localhost:3000/privacy`
- `http://localhost:3000/security`
- `http://localhost:3000/terms`

Expected: All 3 show static content with intro callout biru. This is the existing behavior since `isPublished: false` → `CmsPageWrapper` returns `<>{children}</>`.

**Step 2: Toggle publish via admin CMS editor**

Go to `/cms` → select Privacy → toggle "Published" on → Save.

**Step 3: Verify CMS mode**

Visit `http://localhost:3000/privacy`.

Expected:
- Intro paragraph appears in sky-blue callout box (border sky-300/45, left gradient bar)
- All sections render with proper h2 headings, paragraphs, bullet lists
- Bold text renders correctly
- `lastUpdatedLabel` appears at bottom
- Layout matches static mode (dotted bg, max-w-4xl card, badge "Legal")

**Step 4: Compare static vs CMS side-by-side**

Toggle isPublished off → refresh → screenshot static.
Toggle isPublished on → refresh → screenshot CMS.

Confirm: callout treatment, heading styles, list styles, spacing are visually consistent.

**Step 5: Repeat for Security and Terms**

---

### Task 5: Lint and final commit

**Step 1: Run lint**

```bash
npm run lint 2>&1 | tail -20
```

Expected: No new errors from our changes (pre-existing ones OK).

**Step 2: Run tests**

```bash
npm run test 2>&1 | tail -10
```

Expected: Same 7/8 pass (pre-existing billing test failure).

**Step 3: Final commit if any cleanup needed**

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Intro callout in CmsPageWrapper | `CmsPageWrapper.tsx` |
| 2 | Seed migration with real TipTap JSON | `seedPolicyContent.ts` (new) |
| 3 | Run migration + verify DB | Run command |
| 4 | E2E verify static vs CMS parity | Manual browser check |
| 5 | Lint + test | Verification |
