# Documentation CMS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full CMS admin editor for the Documentation page — structured editing of all 12+ sections with inline image support inside `section` blocks.

**Architecture:** The `section` block type gains a new `richContent: string` field (TipTap JSON) alongside existing `paragraphs[]` + `list`. Admin edits via TipTap (with Image extension + Convex storage). Frontend renderer checks `richContent` first, falls back to `paragraphs/list` for backward compatibility. Other block types (`infoCard`, `ctaCards`) keep form-based editors.

**Tech Stack:** Convex mutations, TipTap (StarterKit + Image + Link), Convex file storage, React, TypeScript

**Current state:** Frontend display complete (DocumentationPage, DocSidebar, DocArticle). Schema + public query exists. 12 sections seeded via migrations. NO admin mutations, NO editor component, NOT wired into ContentManager.

---

## Phase 1: Backend — Mutations + Schema Enhancement

### Task 1: Add admin CRUD mutations to documentationSections.ts

**Files:**
- Modify: `convex/documentationSections.ts`

**Context:** Currently only has `getPublishedSections` query. We need full admin CRUD.

**Step 1: Add admin queries**

```typescript
import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRole } from "./lib/permissions"

// Existing public query stays as-is

export const listAllSections = query({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    return ctx.db
      .query("documentationSections")
      .withIndex("by_order")
      .collect()
  },
})

export const getSectionBySlug = query({
  args: { requestorId: v.id("users"), slug: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    return ctx.db
      .query("documentationSections")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()
  },
})
```

**Step 2: Add upsert mutation**

The args must match the schema validators exactly. Reuse the existing `documentationBlock` validator from schema.ts (import it or inline it). The mutation should:
- Accept all section fields
- If `id` provided → patch existing record
- If no `id` → insert new record
- Auto-generate `searchText` from title + summary + all block text content
- Set `updatedAt: Date.now()`
- Set `createdAt: Date.now()` only on insert

```typescript
export const upsertSection = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.optional(v.id("documentationSections")),
    slug: v.string(),
    title: v.string(),
    group: v.string(),
    order: v.number(),
    icon: v.optional(v.string()),
    headerIcon: v.optional(v.string()),
    summary: v.optional(v.string()),
    blocks: v.array(documentationBlock), // import from schema
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    const { requestorId, id, ...data } = args

    // Auto-generate searchText from content
    const searchText = generateSearchText(data)
    const now = Date.now()

    if (id) {
      await ctx.db.patch(id, { ...data, searchText, updatedAt: now })
      return id
    } else {
      return ctx.db.insert("documentationSections", {
        ...data, searchText, createdAt: now, updatedAt: now,
      })
    }
  },
})
```

**Step 3: Add delete mutation**

```typescript
export const deleteSection = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.id("documentationSections"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    await ctx.db.delete(args.id)
  },
})
```

**Step 4: Add `generateUploadUrl` mutation for doc images**

```typescript
export const generateDocUploadUrl = mutation({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    return ctx.storage.generateUploadUrl()
  },
})

export const getDocImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return ctx.storage.getUrl(args.storageId)
  },
})
```

**Step 5: Helper to generate searchText**

```typescript
function generateSearchText(data: {
  title: string
  summary?: string
  blocks: Array<{ type: string; title?: string; description?: string; paragraphs?: string[]; items?: any[]; list?: any; richContent?: string }>
}): string {
  const parts: string[] = [data.title]
  if (data.summary) parts.push(data.summary)

  for (const block of data.blocks) {
    if ("title" in block && block.title) parts.push(block.title)
    if ("description" in block && block.description) parts.push(block.description)
    if (block.type === "section") {
      if (block.paragraphs) parts.push(...block.paragraphs)
      if (block.richContent) {
        // Strip TipTap JSON to plain text
        try {
          const doc = JSON.parse(block.richContent)
          parts.push(extractTextFromTipTap(doc))
        } catch { /* ignore parse errors */ }
      }
      if (block.list) {
        for (const item of block.list.items) {
          parts.push(item.text)
          if (item.subItems) parts.push(...item.subItems)
        }
      }
    }
    if (block.type === "infoCard" && block.items) {
      parts.push(...block.items)
    }
    if (block.type === "ctaCards" && block.items) {
      for (const item of block.items) {
        parts.push(item.title, item.description)
      }
    }
  }

  return parts.join(" ")
}

function extractTextFromTipTap(node: any): string {
  if (node.type === "text") return node.text ?? ""
  if (node.content) return node.content.map(extractTextFromTipTap).join(" ")
  return ""
}
```

**Step 6: Export `documentationBlock` validator from schema**

In `convex/schema.ts`, the `documentationBlock` validator is defined at module scope but not exported. We need to export it so `documentationSections.ts` can import it.

Add `export` keyword to:
```typescript
export const documentationBlock = v.union(...)
export const documentationListItem = v.object(...)
export const documentationList = v.object(...)
```

**Step 7: Commit**

```bash
git add convex/documentationSections.ts convex/schema.ts
git commit -m "feat(cms): add admin CRUD mutations for documentation sections"
```

---

### Task 2: Add `richContent` field to section block schema

**Files:**
- Modify: `convex/schema.ts`
- Modify: `src/components/marketing/documentation/types.ts`

**Context:** The `section` block type currently has `paragraphs?: string[]` and `list?: DocList`. We add `richContent?: string` (TipTap JSON with inline images) for the new CMS editor. Existing content with `paragraphs/list` remains valid — backward compatible.

**Step 1: Update schema validator**

In `convex/schema.ts`, find the `section` variant in `documentationBlock`:

```typescript
v.object({
  type: v.literal("section"),
  title: v.string(),
  description: v.optional(v.string()),
  paragraphs: v.optional(v.array(v.string())),
  list: v.optional(documentationList),
  richContent: v.optional(v.string()),  // ← ADD THIS
})
```

**Step 2: Update TypeScript types**

In `src/components/marketing/documentation/types.ts`:

```typescript
| {
    type: "section"
    title: string
    description?: string
    paragraphs?: string[]
    list?: DocList
    richContent?: string  // ← ADD THIS: TipTap JSON with inline images
  }
```

**Step 3: Commit**

```bash
git add convex/schema.ts src/components/marketing/documentation/types.ts
git commit -m "feat(schema): add richContent field to documentation section block"
```

---

## Phase 2: Admin Editor Components

### Task 3: Create DocSectionListEditor — section list view

**Files:**
- Create: `src/components/admin/cms/DocSectionListEditor.tsx`

**Context:** Shows all documentation sections grouped by `group`, with controls to add, edit, delete, reorder. This is the entry point when admin clicks "Dokumentasi" in ContentManager sidebar.

**Behavior:**
- Fetch all sections via `listAllSections` query
- Group by `group` field, ordered by `order` within each group
- Each section row shows: drag handle (optional) | title | group badge | order | published status | edit button | delete button
- "Tambah Section Baru" button at top
- Click edit → passes `selectedDocSlug` callback to parent (ContentManager will route to section editor)
- Delete → confirmation dialog → `deleteSection` mutation

**Layout:** Grouped accordion or flat list with group headers. Each group header: group name (bold) + section count.

**Key UI patterns (match existing editors):**
- Label: `text-signal text-[10px] font-bold uppercase tracking-widest text-muted-foreground`
- Cards: `rounded-action border border-border p-dense`
- Published badge: green dot for published, gray for draft

---

### Task 4: Create DocSectionEditor — metadata + blocks editor

**Files:**
- Create: `src/components/admin/cms/DocSectionEditor.tsx`

**Context:** Full editor for a single documentation section. Two parts: metadata fields (top) and blocks editor (bottom).

**Metadata fields (form-based):**
- `title` — text input
- `slug` — text input (auto-generated from title, editable)
- `group` — select dropdown: "Mulai" | "Fitur Utama" | "Subskripsi" | "Panduan Lanjutan"
- `order` — number input
- `icon` — select dropdown (from utils.tsx icon map keys: BookOpen, FileText, Globe, Lightbulb, Settings, ShieldCheck, Users, Zap)
- `headerIcon` — select dropdown (same options + empty)
- `summary` — textarea
- `isPublished` — switch toggle

**Blocks editor:**
- Dynamic list of blocks with add/remove/reorder
- "Tambah Block" button → dropdown to pick type: Section | Info Card | CTA Cards
- Each block has a type-specific sub-editor (Tasks 5-7)
- Blocks rendered in a vertical list with drag handles and type badges

**Save behavior:**
- Collect all fields + blocks → call `upsertSection` mutation
- Auto-generate `searchText` on server side
- "Simpan" button at bottom + success feedback

**Back button:** Returns to DocSectionListEditor (via parent callback)

**Props:** `{ slug: string | null, userId: Id<"users">, onBack: () => void }`
- `slug: null` → create new section
- `slug: "welcome"` → edit existing section (fetch via `getSectionBySlug`)

---

### Task 5: Create block sub-editor — InfoCardBlockEditor

**Files:**
- Create: `src/components/admin/cms/blocks/InfoCardBlockEditor.tsx`

**Context:** Editor for `infoCard` block type.

**Fields:**
- `title` — text input
- `description` — text input (optional)
- `items` — dynamic list of text inputs (add/remove)

**Props:** `{ block: InfoCardBlock, onChange: (block) => void }`

---

### Task 6: Create block sub-editor — CtaCardsBlockEditor

**Files:**
- Create: `src/components/admin/cms/blocks/CtaCardsBlockEditor.tsx`

**Context:** Editor for `ctaCards` block type.

**Fields:**
- Dynamic list of CTA card items, each with:
  - `title` — text input
  - `description` — textarea
  - `targetSection` — text input (slug of target section)
  - `ctaText` — text input
  - `icon` — select dropdown (same icon map)

**Props:** `{ block: CtaCardsBlock, onChange: (block) => void }`

---

### Task 7: Create block sub-editor — SectionBlockEditor (TipTap with images)

**Files:**
- Create: `src/components/admin/cms/blocks/SectionBlockEditor.tsx`

**Context:** Editor for `section` block type. This is the key component — uses TipTap with Image extension for `richContent`.

**Fields:**
- `title` — text input (accordion title when rendered)
- `richContent` — TipTap WYSIWYG editor with:
  - StarterKit (headings H2/H3, bold, italic, lists, blockquote)
  - Link extension
  - Image extension (with Convex storage upload)
  - `immediatelyRender: false` (SSR safe)

**Image upload flow:**
1. TipTap toolbar has "Insert Image" button (MediaImage icon from iconoir-react)
2. Click → opens hidden file input
3. Select file → upload to Convex storage via `generateDocUploadUrl`
4. Get `storageId` → query `getDocImageUrl` for URL → insert `<img>` node in TipTap

**TipTap Image extension config:**
```typescript
import Image from "@tiptap/extension-image"

Image.configure({
  inline: false,
  allowBase64: false,
  HTMLAttributes: {
    class: "rounded-action max-w-full my-4",
  },
})
```

**Note on `richContent` vs `paragraphs/list`:** When admin saves, the editor writes to `richContent` (TipTap JSON string). The old `paragraphs` and `list` fields are left as-is (not modified). The frontend renderer will prefer `richContent` when present.

**If editing existing section that has `paragraphs/list` but no `richContent`:** The editor should show a notice "Konten ini masih menggunakan format lama. Edit dan simpan untuk mengkonversi ke format baru." The TipTap editor starts empty — admin re-enters content. Alternatively, auto-convert `paragraphs/list` to initial TipTap JSON for the editor (better UX).

**Auto-conversion from paragraphs/list to TipTap JSON (recommended):**

```typescript
function convertLegacyToTipTap(block: SectionBlock): string {
  const nodes: any[] = []
  if (block.description) {
    nodes.push({ type: "paragraph", content: [{ type: "text", text: block.description }] })
  }
  if (block.paragraphs) {
    for (const p of block.paragraphs) {
      nodes.push({ type: "paragraph", content: [{ type: "text", text: p }] })
    }
  }
  if (block.list) {
    const listType = block.list.variant === "numbered" ? "orderedList" : "bulletList"
    nodes.push({
      type: listType,
      content: block.list.items.map((item) => ({
        type: "listItem",
        content: [
          { type: "paragraph", content: [{ type: "text", text: item.text }] },
          ...(item.subItems?.length ? [{
            type: "bulletList",
            content: item.subItems.map((sub) => ({
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: sub }] }],
            })),
          }] : []),
        ],
      })),
    })
  }
  return JSON.stringify({ type: "doc", content: nodes.length ? nodes : [{ type: "paragraph" }] })
}
```

**Props:** `{ block: SectionBlock, onChange: (block) => void, userId: Id<"users"> }`

---

### Task 8: Wire documentation into ContentManager

**Files:**
- Modify: `src/components/admin/ContentManager.tsx`

**Context:** Add "Dokumentasi" to the sidebar navigation and route to the correct editor.

**Step 1: Add to PAGES_NAV**

```typescript
{ id: "documentation", label: "Dokumentasi" },
```

Place after "about" (which has sections). Documentation is NOT expandable — clicking it shows DocSectionListEditor directly.

**Step 2: Add PageId**

Add `"documentation"` to the `PageId` type union.

**Step 3: Add routing logic**

```typescript
} : selectedPage === "documentation" && selectedDocSlug === null ? (
  <DocSectionListEditor
    userId={userId}
    onSelectSection={(slug) => setSelectedDocSlug(slug)}
    onCreateNew={() => setSelectedDocSlug("__new__")}
  />
) : selectedPage === "documentation" && selectedDocSlug !== null ? (
  <DocSectionEditor
    slug={selectedDocSlug === "__new__" ? null : selectedDocSlug}
    userId={userId}
    onBack={() => setSelectedDocSlug(null)}
  />
)
```

**Step 4: Add state**

```typescript
const [selectedDocSlug, setSelectedDocSlug] = useState<string | null>(null)
```

Reset to null when `selectedPage` changes away from "documentation".

**Step 5: Commit**

```bash
git add src/components/admin/ContentManager.tsx src/components/admin/cms/DocSectionListEditor.tsx src/components/admin/cms/DocSectionEditor.tsx src/components/admin/cms/blocks/
git commit -m "feat(admin): add documentation section editors to CMS"
```

---

## Phase 3: Frontend Rendering Update

### Task 9: Update DocArticle to render richContent

**Files:**
- Modify: `src/components/marketing/documentation/DocArticle.tsx`

**Context:** When a section block has `richContent`, render it via `RichTextRenderer` instead of `paragraphs/list`. This is backward compatible — blocks without `richContent` continue rendering as before.

**Step 1: Import RichTextRenderer**

```typescript
import { RichTextRenderer } from "@/components/marketing/RichTextRenderer"
```

**Step 2: Update section block rendering inside AccordionContent**

Replace the current paragraph + list rendering with a conditional:

```tsx
<AccordionContent className="px-5 pt-0 pb-5">
  {block.richContent ? (
    <RichTextRenderer content={block.richContent} />
  ) : (
    <div className="space-y-3">
      {block.description && (
        <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
          {block.description}
        </p>
      )}
      {block.paragraphs?.map((paragraph, paragraphIndex) => (
        <p key={`${block.title}-p-${paragraphIndex}`} className="text-narrative text-sm leading-relaxed text-muted-foreground">
          {renderInline(paragraph)}
        </p>
      ))}
      {block.list && (
        // ... existing list rendering unchanged
      )}
    </div>
  )}
</AccordionContent>
```

**Step 3: Verify existing content renders correctly**

All 12 existing sections use `paragraphs/list` → they should render exactly as before since `richContent` is undefined.

**Step 4: Commit**

```bash
git add src/components/marketing/documentation/DocArticle.tsx
git commit -m "feat(docs): support richContent rendering in DocArticle with fallback"
```

---

## Phase 4: Verification

### Task 10: Lint, test, and manual verification

**Step 1: Run lint**

```bash
npm run lint 2>&1 | tail -10
```

Expected: No new errors from our changes.

**Step 2: Run tests**

```bash
npm run test 2>&1 | tail -10
```

Expected: Same 7/8 pass (pre-existing billing failure).

**Step 3: Manual verification checklist**

1. Go to `/cms` → Dokumentasi should appear in sidebar
2. Click Dokumentasi → DocSectionListEditor shows all 12 sections grouped
3. Click edit on "welcome" → DocSectionEditor opens with metadata + blocks
4. Section blocks show TipTap editor (auto-converted from paragraphs/list)
5. Insert an image in TipTap → uploads to Convex storage → shows inline
6. Save → verify content persists
7. Visit `/documentation` → existing sections render normally (backward compat)
8. Toggle a section's publish off → verify it disappears from frontend
9. Create a new section → verify it appears after publish

**Step 4: Commit any fixes**

---

## Summary

| Task | Phase | What | Files |
|------|-------|------|-------|
| 1 | Backend | Admin CRUD mutations + searchText generator | `documentationSections.ts`, `schema.ts` |
| 2 | Backend | Add `richContent` field to section block | `schema.ts`, `types.ts` |
| 3 | Editor | DocSectionListEditor (section list view) | New component |
| 4 | Editor | DocSectionEditor (metadata + blocks) | New component |
| 5 | Editor | InfoCardBlockEditor | New component |
| 6 | Editor | CtaCardsBlockEditor | New component |
| 7 | Editor | SectionBlockEditor (TipTap + images) | New component |
| 8 | Editor | Wire into ContentManager | `ContentManager.tsx` |
| 9 | Frontend | DocArticle richContent rendering | `DocArticle.tsx` |
| 10 | Verify | Lint, test, manual check | - |

**Dependencies:**
- Task 2 depends on Task 1 (schema export)
- Tasks 3-7 depend on Task 1 (mutations)
- Task 8 depends on Tasks 3-7 (editor components)
- Task 9 depends on Task 2 (richContent field)
- Task 10 depends on all
