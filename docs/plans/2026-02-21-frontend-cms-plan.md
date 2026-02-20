# Frontend CMS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an admin-managed CMS for all marketing frontend pages (home, about, pricing, blog, docs, privacy, security, terms, header, footer) with image upload and rich text editing.

**Architecture:** Hybrid 3-table approach — `pageContent` (structured sections), `richTextPages` (TipTap WYSIWYG), `siteConfig` (header/footer/brand). CMS-driven rendering with static fallback for each section. Existing CMS tables (`pricingPlans`, `documentationSections`, `blogSections`) remain untouched.

**Tech Stack:** Convex (schema + functions), React 19, Next.js 16, TipTap (WYSIWYG), Convex File Storage (images), shadcn/ui, Tailwind CSS 4, Iconoir icons.

**Design Doc:** `docs/plans/2026-02-21-frontend-cms-design.md`

---

## Phase 0: Foundation (Schema + Admin Shell + Seeds)

### Task 1: Add 3 new tables to Convex schema

**Files:**
- Modify: `convex/schema.ts:927` (before closing `})`)

**Step 1: Add tables to schema**

Insert before line 928 (`})`):

```typescript
  // ── CMS Tables ──────────────────────────────────────────

  pageContent: defineTable({
    pageSlug: v.string(),
    sectionSlug: v.string(),
    sectionType: v.union(
      v.literal("hero"),
      v.literal("benefits"),
      v.literal("feature-showcase"),
    ),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaHref: v.optional(v.string()),
    badgeText: v.optional(v.string()),
    items: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
      icon: v.optional(v.string()),
      imageId: v.optional(v.id("_storage")),
    }))),
    primaryImageId: v.optional(v.id("_storage")),
    primaryImageAlt: v.optional(v.string()),
    isPublished: v.boolean(),
    sortOrder: v.number(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  })
    .index("by_page", ["pageSlug", "sortOrder"])
    .index("by_page_section", ["pageSlug", "sectionSlug"]),

  richTextPages: defineTable({
    slug: v.string(),
    title: v.string(),
    content: v.string(),
    lastUpdatedLabel: v.optional(v.string()),
    isPublished: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  })
    .index("by_slug", ["slug"]),

  siteConfig: defineTable({
    key: v.string(),
    navLinks: v.optional(v.array(v.object({
      label: v.string(),
      href: v.string(),
      isVisible: v.boolean(),
    }))),
    footerSections: v.optional(v.array(v.object({
      title: v.string(),
      links: v.array(v.object({
        label: v.string(),
        href: v.string(),
        isExternal: v.optional(v.boolean()),
      })),
    }))),
    socialLinks: v.optional(v.array(v.object({
      platform: v.string(),
      url: v.string(),
      isVisible: v.boolean(),
    }))),
    copyrightText: v.optional(v.string()),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  })
    .index("by_key", ["key"]),
```

**Step 2: Verify Convex syncs**

Run: `npx convex dev` (should be running)
Expected: Schema accepted, no errors. New tables visible in dashboard.

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(cms): add pageContent, richTextPages, siteConfig tables"
```

---

### Task 2: Create Convex functions for `pageContent`

**Files:**
- Create: `convex/pageContent.ts`

**Step 1: Write queries and mutations**

Create `convex/pageContent.ts` with:

```typescript
import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { requireRole } from "./permissions"

// Public query: get all published sections for a page
export const getPageSections = query({
  args: { pageSlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pageContent")
      .withIndex("by_page", (q) => q.eq("pageSlug", args.pageSlug))
      .collect()
  },
})

// Public query: get single section by page + section slug
export const getSection = query({
  args: {
    pageSlug: v.string(),
    sectionSlug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pageContent")
      .withIndex("by_page_section", (q) =>
        q.eq("pageSlug", args.pageSlug).eq("sectionSlug", args.sectionSlug)
      )
      .first()
  },
})

// Admin query: list all sections (including unpublished)
export const listAllSections = query({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    return await ctx.db.query("pageContent").collect()
  },
})

// Admin mutation: upsert a section
export const upsertSection = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.optional(v.id("pageContent")),
    pageSlug: v.string(),
    sectionSlug: v.string(),
    sectionType: v.union(
      v.literal("hero"),
      v.literal("benefits"),
      v.literal("feature-showcase"),
    ),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaHref: v.optional(v.string()),
    badgeText: v.optional(v.string()),
    items: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
      icon: v.optional(v.string()),
      imageId: v.optional(v.id("_storage")),
    }))),
    primaryImageId: v.optional(v.id("_storage")),
    primaryImageAlt: v.optional(v.string()),
    isPublished: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const { requestorId, id, ...data } = args
    const now = Date.now()

    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: now, updatedBy: requestorId })
      return id
    }

    return await ctx.db.insert("pageContent", {
      ...data,
      updatedAt: now,
      updatedBy: requestorId,
    })
  },
})

// Admin mutation: toggle publish status
export const togglePublish = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.id("pageContent"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    const section = await ctx.db.get(args.id)
    if (!section) throw new Error("Section not found")
    await ctx.db.patch(args.id, {
      isPublished: !section.isPublished,
      updatedAt: Date.now(),
      updatedBy: args.requestorId,
    })
  },
})

// Admin mutation: generate upload URL for CMS images
export const generateUploadUrl = mutation({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    return await ctx.storage.generateUploadUrl()
  },
})

// Public query: get storage URL by ID
export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})
```

**Step 2: Verify types compile**

Run: Convex dev should auto-sync and generate types.
Expected: No TypeScript errors.

**Step 3: Commit**

```bash
git add convex/pageContent.ts
git commit -m "feat(cms): add pageContent Convex functions (queries + mutations)"
```

---

### Task 3: Create Convex functions for `richTextPages`

**Files:**
- Create: `convex/richTextPages.ts`

**Step 1: Write queries and mutations**

```typescript
import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { requireRole } from "./permissions"

// Public query: get published page by slug
export const getPageBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("richTextPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()
    if (!page || !page.isPublished) return null
    return page
  },
})

// Admin query: list all pages (including unpublished)
export const listAllPages = query({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    return await ctx.db.query("richTextPages").collect()
  },
})

// Admin mutation: upsert a page
export const upsertPage = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.optional(v.id("richTextPages")),
    slug: v.string(),
    title: v.string(),
    content: v.string(),
    lastUpdatedLabel: v.optional(v.string()),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const { requestorId, id, ...data } = args
    const now = Date.now()

    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: now, updatedBy: requestorId })
      return id
    }

    return await ctx.db.insert("richTextPages", {
      ...data,
      updatedAt: now,
      updatedBy: requestorId,
    })
  },
})
```

**Step 2: Commit**

```bash
git add convex/richTextPages.ts
git commit -m "feat(cms): add richTextPages Convex functions"
```

---

### Task 4: Create Convex functions for `siteConfig`

**Files:**
- Create: `convex/siteConfig.ts`

**Step 1: Write queries and mutations**

```typescript
import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { requireRole } from "./permissions"

// Public query: get config by key
export const getConfig = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("siteConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first()
  },
})

// Admin query: list all configs
export const listAllConfigs = query({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    return await ctx.db.query("siteConfig").collect()
  },
})

// Admin mutation: upsert config
export const upsertConfig = mutation({
  args: {
    requestorId: v.id("users"),
    key: v.string(),
    navLinks: v.optional(v.array(v.object({
      label: v.string(),
      href: v.string(),
      isVisible: v.boolean(),
    }))),
    footerSections: v.optional(v.array(v.object({
      title: v.string(),
      links: v.array(v.object({
        label: v.string(),
        href: v.string(),
        isExternal: v.optional(v.boolean()),
      })),
    }))),
    socialLinks: v.optional(v.array(v.object({
      platform: v.string(),
      url: v.string(),
      isVisible: v.boolean(),
    }))),
    copyrightText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const { requestorId, key, ...data } = args
    const now = Date.now()

    const existing = await ctx.db
      .query("siteConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { ...data, updatedAt: now, updatedBy: requestorId })
      return existing._id
    }

    return await ctx.db.insert("siteConfig", {
      key,
      ...data,
      updatedAt: now,
      updatedBy: requestorId,
    })
  },
})
```

**Step 2: Commit**

```bash
git add convex/siteConfig.ts
git commit -m "feat(cms): add siteConfig Convex functions"
```

---

### Task 5: Create seed migration for home page content

**Files:**
- Create: `convex/migrations/seedHomeContent.ts`

**Context:** Current hardcoded values are in:
- `src/components/marketing/hero/HeroHeading.tsx` — hero title
- `src/components/marketing/hero/HeroSubheading.tsx` — hero subtitle
- `src/components/marketing/hero/HeroCTA.tsx` — CTA text
- `src/components/marketing/hero/PawangBadge.tsx` — badge text
- `src/components/marketing/benefits/BentoBenefitsGrid.tsx` — benefits array

**Step 1: Read current hardcoded values from those components**

Before writing the seed, read these files to extract exact text content:
- `src/components/marketing/hero/HeroHeading.tsx`
- `src/components/marketing/hero/HeroSubheading.tsx`
- `src/components/marketing/hero/HeroCTA.tsx`
- `src/components/marketing/hero/PawangBadge.tsx`
- `src/components/marketing/benefits/BentoBenefitsGrid.tsx`
- `src/components/marketing/features/WorkflowFeatureSection.tsx`
- `src/components/marketing/features/RefrasaFeatureSection.tsx`

**Step 2: Write seed migration**

Create `convex/migrations/seedHomeContent.ts` that inserts records for:
- `home/hero` (sectionType: "hero") — title, subtitle, badge, CTA from hero components
- `home/benefits` (sectionType: "benefits") — items array from BentoBenefitsGrid
- `home/features-workflow` (sectionType: "feature-showcase") — from WorkflowFeatureSection
- `home/features-refrasa` (sectionType: "feature-showcase") — from RefrasaFeatureSection

All with `isPublished: false` initially (static fallback active until admin publishes).

Pattern to follow — see `convex/migrations/seedPricingPlans.ts` for existing seed pattern.

**Step 3: Commit**

```bash
git add convex/migrations/seedHomeContent.ts
git commit -m "feat(cms): add seed migration for home page content"
```

---

### Task 6: Create seed migration for siteConfig (header + footer)

**Files:**
- Create: `convex/migrations/seedSiteConfig.ts`

**Context:** Current hardcoded values are in:
- `src/components/layout/header/GlobalHeader.tsx:37-43` — NAV_LINKS array
- `src/components/layout/footer/Footer.tsx:8-29` — RESOURCE_LINKS, COMPANY_LINKS, LEGAL_LINKS, social links

**Step 1: Read current values from those files**

**Step 2: Write seed migration**

Create `convex/migrations/seedSiteConfig.ts` that inserts:
- `key: "header"` — navLinks from NAV_LINKS
- `key: "footer"` — footerSections from link arrays + socialLinks

**Step 3: Commit**

```bash
git add convex/migrations/seedSiteConfig.ts
git commit -m "feat(cms): add seed migration for site config (header + footer)"
```

---

### Task 7: Create seed migration for richTextPages

**Files:**
- Create: `convex/migrations/seedRichTextPages.ts`

**Context:** Current hardcoded content is in:
- `src/app/(marketing)/privacy/page.tsx`
- `src/app/(marketing)/about/page.tsx`
- `src/app/(marketing)/security/page.tsx` (if exists)
- `src/app/(marketing)/terms/page.tsx` (if exists)

**Step 1: Read current pages to extract text content**

**Step 2: Write seed migration**

Create records for slugs: "about", "privacy", "security", "terms".
Content stored as TipTap JSON string (minimal: a doc with paragraph nodes containing the existing text).
All with `isPublished: false` initially.

**Step 3: Commit**

```bash
git add convex/migrations/seedRichTextPages.ts
git commit -m "feat(cms): add seed migration for rich text pages"
```

---

### Task 8: Add Content Manager tab to admin panel

**Files:**
- Modify: `src/components/admin/adminPanelConfig.ts:1-74`
- Modify: `src/components/admin/AdminContentSection.tsx:1-93`
- Create: `src/components/admin/ContentManager.tsx`

**Step 1: Add icon import and tab config**

In `adminPanelConfig.ts`, add `Journal` import from `iconoir-react`, then add new item to `ADMIN_SIDEBAR_ITEMS` array (before "stats"):

```typescript
{
  id: "content",
  label: "Content",
  icon: Journal,
  headerTitle: "Content Manager",
  headerDescription: "Kelola konten halaman marketing dan pengaturan situs",
  headerIcon: Journal,
},
```

**Step 2: Create placeholder ContentManager component**

Create `src/components/admin/ContentManager.tsx`:

```typescript
"use client"

import type { Id } from "@convex/_generated/dataModel"

type ContentManagerProps = {
  userId: Id<"users">
}

export function ContentManager({ userId }: ContentManagerProps) {
  return (
    <div className="rounded-shell border-main border border-border bg-card/60">
      <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
        <h3 className="text-interface mb-2 text-base font-medium text-foreground">
          Content Manager
        </h3>
        <p className="text-narrative mb-4 max-w-md text-sm text-muted-foreground">
          Kelola konten halaman marketing, gambar, dan pengaturan navigasi situs.
        </p>
        <span className="text-signal rounded-badge border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-500">
          IN DEVELOPMENT
        </span>
      </div>
    </div>
  )
}
```

**Step 3: Wire tab in AdminContentSection**

In `AdminContentSection.tsx`, add import and conditional render:

```typescript
import { ContentManager } from "./ContentManager"

// Add in render, before stats tab:
{activeTab === "content" && (
  <div className="space-y-6">
    <ContentManager userId={userId} />
  </div>
)}
```

**Step 4: Verify admin panel renders new tab**

Run dev server, navigate to `/dashboard?tab=content`.
Expected: See "Content Manager" tab with "IN DEVELOPMENT" placeholder.

**Step 5: Commit**

```bash
git add src/components/admin/adminPanelConfig.ts src/components/admin/AdminContentSection.tsx src/components/admin/ContentManager.tsx
git commit -m "feat(cms): add Content Manager tab to admin panel (placeholder)"
```

---

### Task 9: Run seed migrations

**Step 1: Ensure Convex dev is running**

Run: `npx convex dev`

**Step 2: Run seed scripts**

```bash
npx convex run migrations:seedHomeContent
npx convex run migrations:seedSiteConfig
npx convex run migrations:seedRichTextPages
```

Expected: Each prints confirmation of records inserted.

**Step 3: Verify in Convex dashboard**

Open: `npx convex dashboard`
Check: `pageContent` table has 4 records (hero, benefits, features-workflow, features-refrasa)
Check: `siteConfig` table has 2 records (header, footer)
Check: `richTextPages` table has 4 records (about, privacy, security, terms)

**Step 4: Commit any adjustments**

---

## Phase 1: Home — Hero + Benefits (CMS-Driven)

### Task 10: Build ContentManager sub-navigation shell

**Files:**
- Modify: `src/components/admin/ContentManager.tsx`

**Step 1: Replace placeholder with sub-navigation layout**

Build the ContentManager with left sidebar (page list) and right content area:

```
Left panel (sidebar):
  Pages group:
    - Home (expandable: Hero, Benefits, Features-Workflow, Features-Refrasa)
    - About, Privacy, Security, Terms
  Global group:
    - Header, Footer
Right panel:
  - Editor area (renders based on selection)
```

Use existing admin panel patterns:
- State: `selectedPage` and `selectedSection`
- Tabs/accordion for page sections
- Skeleton loading for data

The right panel should show a message "Pilih halaman atau section untuk mulai editing" when nothing is selected.

**Step 2: Verify navigation works**

Click between pages/sections in sidebar. Right panel shows correct selection label.

**Step 3: Commit**

```bash
git add src/components/admin/ContentManager.tsx
git commit -m "feat(cms): build ContentManager sub-navigation shell"
```

---

### Task 11: Build image upload component for CMS

**Files:**
- Create: `src/components/admin/cms/CmsImageUpload.tsx`

**Step 1: Create reusable image upload component**

This component handles:
- Display current image (from Convex storage URL) or placeholder
- Click to upload new image
- Calls `generateUploadUrl` → `fetch PUT` → returns `storageId`
- Shows upload progress/loading state

Reference existing pattern: `convex/files.ts:generateUploadUrl` and the file upload flow in chat.

Props:
```typescript
type CmsImageUploadProps = {
  currentImageId?: Id<"_storage"> | null
  onUpload: (storageId: Id<"_storage">) => void
  userId: Id<"users">
  label?: string
  aspectRatio?: string  // e.g., "16/9", "1/1"
}
```

Use `useMutation(api.pageContent.generateUploadUrl)` for upload URL generation.
Use `useQuery(api.pageContent.getImageUrl, { storageId })` for current image display.

**Step 2: Commit**

```bash
git add src/components/admin/cms/CmsImageUpload.tsx
git commit -m "feat(cms): add CmsImageUpload component"
```

---

### Task 12: Build Hero section editor

**Files:**
- Create: `src/components/admin/cms/HeroSectionEditor.tsx`

**Step 1: Create hero editor form**

Form fields:
- Title (text input)
- Subtitle (text input)
- Badge Text (text input)
- CTA Text (text input)
- CTA Link (text input)
- Hero Image (CmsImageUpload component)
- Image Alt Text (text input)
- Published toggle (Switch from shadcn/ui)
- Save button

Load data: `useQuery(api.pageContent.getSection, { pageSlug: "home", sectionSlug: "hero" })`
Save data: `useMutation(api.pageContent.upsertSection)`

Follow existing admin form patterns (labels, spacing, button styling).

**Step 2: Wire into ContentManager**

When `selectedPage === "home" && selectedSection === "hero"`, render `<HeroSectionEditor />`.

**Step 3: Test in browser**

Navigate to admin → Content → Home → Hero. Edit title, save. Verify data persists in Convex dashboard.

**Step 4: Commit**

```bash
git add src/components/admin/cms/HeroSectionEditor.tsx src/components/admin/ContentManager.tsx
git commit -m "feat(cms): add Hero section editor in admin"
```

---

### Task 13: Build Benefits section editor

**Files:**
- Create: `src/components/admin/cms/BenefitsSectionEditor.tsx`

**Step 1: Create benefits editor**

A card-list editor for 4 benefit items. Each item has:
- Title (text input)
- Description (textarea)
- Icon name (text input — Iconoir icon name, e.g., "BookStack")

Plus section-level fields:
- Published toggle
- Save button

Load data: `useQuery(api.pageContent.getSection, { pageSlug: "home", sectionSlug: "benefits" })`
Save data: `useMutation(api.pageContent.upsertSection)` with `items` array

**Step 2: Wire into ContentManager**

**Step 3: Test in browser**

Edit benefit card titles and save. Verify in Convex dashboard.

**Step 4: Commit**

```bash
git add src/components/admin/cms/BenefitsSectionEditor.tsx src/components/admin/ContentManager.tsx
git commit -m "feat(cms): add Benefits section editor in admin"
```

---

### Task 14: Refactor Hero frontend to CMS-driven with fallback

**Files:**
- Modify: `src/app/(marketing)/page.tsx` (hero section)
- Create: `src/components/marketing/hero/HeroCMS.tsx`

**Context:** Current hero is composed of: `PawangBadge`, `HeroHeading`, `HeroSubheading`, `HeroCTA`, `HeroResearchMock`. These stay as-is (static fallback). New `HeroCMS` renders from DB data.

**Step 1: Create HeroCMS component**

`src/components/marketing/hero/HeroCMS.tsx`:

Renders the same visual layout as current hero, but reads text from CMS data and image from Convex storage URL.

Props: `{ content: Doc<"pageContent"> }` — receives the CMS record.

For the image, use `useQuery(api.pageContent.getImageUrl, ...)` with fallback to `/images/hero-paper-session-mock.png`.

**Step 2: Create wrapper component with fallback logic**

In the home page, replace inline hero section with a client component that:
1. Queries `api.pageContent.getSection` for `home/hero`
2. If `undefined` → skeleton
3. If `null` or not published → render current static hero (existing components)
4. If published → render `<HeroCMS content={data} />`

**Step 3: Verify both modes work**

- With `isPublished: false` (default from seed) → static hero renders
- Toggle `isPublished: true` via admin → CMS hero renders
- Compare visual appearance between static and CMS versions

**Step 4: Commit**

```bash
git add src/components/marketing/hero/HeroCMS.tsx src/app/\(marketing\)/page.tsx
git commit -m "feat(cms): hero section with CMS-driven rendering + static fallback"
```

---

### Task 15: Refactor Benefits frontend to CMS-driven with fallback

**Files:**
- Modify: `src/components/marketing/benefits/BenefitsSection.tsx` (or equivalent wrapper)
- Create: `src/components/marketing/benefits/BenefitsCMS.tsx`

**Step 1: Create BenefitsCMS component**

Renders the same bento grid (desktop) / accordion (mobile) layout, but reads items from CMS data.

**Step 2: Add fallback wrapper**

Same pattern as hero: query → skeleton → fallback → CMS.

Static fallback = current `BentoBenefitsGrid` / `BenefitsAccordion` with hardcoded data.

**Step 3: Verify**

Toggle isPublished. Both modes render correctly.

**Step 4: Commit**

```bash
git add src/components/marketing/benefits/
git commit -m "feat(cms): benefits section with CMS-driven rendering + static fallback"
```

---

## Phase 2: Home — Feature Sections

### Task 16: Build Feature Showcase editor (reusable)

**Files:**
- Create: `src/components/admin/cms/FeatureShowcaseEditor.tsx`

**Step 1: Create reusable editor for feature-showcase type**

Props: `{ pageSlug: string, sectionSlug: string, userId: Id<"users"> }`

Fields: title, description, items list (title + description per item), primary image upload, published toggle, save.

**Step 2: Wire into ContentManager for both feature sections**

When `selectedSection === "features-workflow"` → `<FeatureShowcaseEditor sectionSlug="features-workflow" ... />`
When `selectedSection === "features-refrasa"` → `<FeatureShowcaseEditor sectionSlug="features-refrasa" ... />`

**Step 3: Test both editors**

**Step 4: Commit**

```bash
git add src/components/admin/cms/FeatureShowcaseEditor.tsx src/components/admin/ContentManager.tsx
git commit -m "feat(cms): add Feature Showcase editor (reusable for workflow + refrasa)"
```

---

### Task 17: Refactor WorkflowFeatureSection to CMS-driven

**Files:**
- Modify: `src/components/marketing/features/WorkflowFeatureSection.tsx`

**Step 1: Add CMS query + fallback pattern**

Same pattern: query `home/features-workflow` → skeleton → static fallback → CMS rendering.

**Step 2: Verify**

**Step 3: Commit**

```bash
git add src/components/marketing/features/WorkflowFeatureSection.tsx
git commit -m "feat(cms): workflow feature section with CMS rendering + fallback"
```

---

### Task 18: Refactor RefrasaFeatureSection to CMS-driven

**Files:**
- Modify: `src/components/marketing/features/RefrasaFeatureSection.tsx`

Same pattern as Task 17.

**Step 1: Add CMS query + fallback**

**Step 2: Verify**

**Step 3: Commit**

```bash
git add src/components/marketing/features/RefrasaFeatureSection.tsx
git commit -m "feat(cms): refrasa feature section with CMS rendering + fallback"
```

---

## Phase 3: Header + Footer

### Task 19: Build Header nav links editor

**Files:**
- Create: `src/components/admin/cms/HeaderConfigEditor.tsx`

**Step 1: Create header config editor**

A sortable list of nav links. Each link has:
- Label (text input)
- Href (text input)
- Visible (toggle/switch)

Buttons: Add link, Remove link, Save.

Load: `useQuery(api.siteConfig.getConfig, { key: "header" })`
Save: `useMutation(api.siteConfig.upsertConfig)` with `key: "header"`, `navLinks: [...]`

**Step 2: Wire into ContentManager**

When `selectedPage === "header"`, render `<HeaderConfigEditor />`.

**Step 3: Test**

**Step 4: Commit**

```bash
git add src/components/admin/cms/HeaderConfigEditor.tsx src/components/admin/ContentManager.tsx
git commit -m "feat(cms): add Header nav links editor"
```

---

### Task 20: Build Footer config editor

**Files:**
- Create: `src/components/admin/cms/FooterConfigEditor.tsx`

**Step 1: Create footer config editor**

Sections:
1. Footer Sections (Resources, Company, Legal) — each with title + links list
2. Social Links — platform, url, visible toggle
3. Copyright Text — text input

Load: `useQuery(api.siteConfig.getConfig, { key: "footer" })`
Save: `useMutation(api.siteConfig.upsertConfig)` with `key: "footer"`, `footerSections`, `socialLinks`, `copyrightText`

**Step 2: Wire into ContentManager**

**Step 3: Test**

**Step 4: Commit**

```bash
git add src/components/admin/cms/FooterConfigEditor.tsx src/components/admin/ContentManager.tsx
git commit -m "feat(cms): add Footer config editor"
```

---

### Task 21: Refactor GlobalHeader to CMS-driven

**Files:**
- Modify: `src/components/layout/header/GlobalHeader.tsx`

**Step 1: Add CMS query with fallback**

```typescript
const headerConfig = useQuery(api.siteConfig.getConfig, { key: "header" })

// Fallback to hardcoded NAV_LINKS if no CMS data
const navLinks = headerConfig?.navLinks
  ? headerConfig.navLinks.filter(link => link.isVisible)
  : NAV_LINKS  // existing hardcoded array stays as fallback
```

Keep existing `NAV_LINKS` as fallback constant. Only use CMS data when available.

**Step 2: Verify**

Header renders correctly with CMS data. With no CMS data, falls back to hardcoded links.

**Step 3: Commit**

```bash
git add src/components/layout/header/GlobalHeader.tsx
git commit -m "feat(cms): header navigation with CMS-driven rendering + fallback"
```

---

### Task 22: Refactor Footer to CMS-driven

**Files:**
- Modify: `src/components/layout/footer/Footer.tsx`

Same pattern as header: query `siteConfig("footer")` → fallback to hardcoded constants.

**Step 1: Add CMS query with fallback**

**Step 2: Verify**

**Step 3: Commit**

```bash
git add src/components/layout/footer/Footer.tsx
git commit -m "feat(cms): footer with CMS-driven rendering + fallback"
```

---

## Phase 4: Rich Text Pages (TipTap)

### Task 23: Install TipTap dependencies

**Step 1: Install packages**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/pm
```

**Step 2: Verify installation**

Run: `npm run build`
Expected: No errors from TipTap imports.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add TipTap WYSIWYG editor packages"
```

---

### Task 24: Build TipTap editor component

**Files:**
- Create: `src/components/admin/cms/TipTapEditor.tsx`

**Step 1: Create reusable TipTap editor**

Props:
```typescript
type TipTapEditorProps = {
  content: string          // TipTap JSON string
  onChange: (json: string) => void
  editable?: boolean
}
```

Extensions: StarterKit (headings H1-H3, bold, italic, bullet/ordered lists, blockquote, code), Link.

Toolbar: Row of icon buttons for formatting actions.
Style toolbar with Mechanical Grace tokens (border-hairline, rounded-action, Geist Mono labels).

**Step 2: Test component in isolation**

Render editor, type text, verify `onChange` fires with JSON string.

**Step 3: Commit**

```bash
git add src/components/admin/cms/TipTapEditor.tsx
git commit -m "feat(cms): add TipTap WYSIWYG editor component"
```

---

### Task 25: Build TipTap renderer component (for frontend)

**Files:**
- Create: `src/components/marketing/RichTextRenderer.tsx`

**Step 1: Create read-only renderer**

Takes TipTap JSON string, creates a non-editable TipTap instance, renders with prose styling.

Apply Mechanical Grace typography:
- Headings: `text-narrative tracking-tight`
- Body: `text-interface` (Geist Mono)
- Lists: proper spacing and bullets
- Links: underline with primary color

**Step 2: Commit**

```bash
git add src/components/marketing/RichTextRenderer.tsx
git commit -m "feat(cms): add TipTap rich text renderer for frontend"
```

---

### Task 26: Build Rich Text Page editor in admin

**Files:**
- Create: `src/components/admin/cms/RichTextPageEditor.tsx`

**Step 1: Create editor component**

Props: `{ slug: string, userId: Id<"users"> }`

Loads: `useQuery(api.richTextPages.getPageBySlug, { slug })` — wait, this is the public query that filters unpublished. Need to use the admin list or add an admin-specific query.

Actually, add to `convex/richTextPages.ts`:

```typescript
export const getPageBySlugAdmin = query({
  args: { requestorId: v.id("users"), slug: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    return await ctx.db
      .query("richTextPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()
  },
})
```

Fields:
- Title (text input)
- Last Updated Label (text input, e.g., "Terakhir diperbarui: 21 Februari 2026")
- Content (TipTapEditor component)
- Published toggle
- Save button

**Step 2: Wire into ContentManager**

When `selectedPage` is "about"/"privacy"/"security"/"terms", render `<RichTextPageEditor slug={selectedPage} />`.

**Step 3: Test**

**Step 4: Commit**

```bash
git add src/components/admin/cms/RichTextPageEditor.tsx convex/richTextPages.ts src/components/admin/ContentManager.tsx
git commit -m "feat(cms): add Rich Text Page editor with TipTap"
```

---

### Task 27: Refactor policy pages to CMS-driven

**Files:**
- Modify: `src/app/(marketing)/privacy/page.tsx`
- Modify: `src/app/(marketing)/security/page.tsx`
- Modify: `src/app/(marketing)/terms/page.tsx`
- Modify: `src/app/(marketing)/about/page.tsx`

**Step 1: Create shared CMS policy page wrapper**

Create a client component that:
1. Queries `api.richTextPages.getPageBySlug` with the slug
2. If `undefined` → skeleton
3. If `null` (unpublished/missing) → render current static content (existing components)
4. If published → render title + `<RichTextRenderer content={page.content} />` + lastUpdatedLabel

**Step 2: Update each page to use wrapper**

Each page wraps its current content with the CMS check. Static content preserved as fallback.

**Step 3: Verify all 4 pages**

Toggle publish for each. Both modes render correctly.

**Step 4: Commit**

```bash
git add src/app/\(marketing\)/privacy/page.tsx src/app/\(marketing\)/security/page.tsx src/app/\(marketing\)/terms/page.tsx src/app/\(marketing\)/about/page.tsx
git commit -m "feat(cms): policy + about pages with CMS rendering + static fallback"
```

---

## Phase 5: Final Integration

### Task 28: End-to-end testing

**Step 1: Test admin CMS flow**

1. Navigate to admin panel → Content tab
2. Select Home → Hero → edit title → save → verify saved
3. Upload new hero image → save → verify image URL works
4. Toggle Published ON → verify home page shows CMS content
5. Toggle Published OFF → verify home page shows static fallback
6. Repeat for Benefits, Features, Header, Footer, Policy pages

**Step 2: Test edge cases**

- Delete all CMS data from Convex dashboard → all pages should fall back to static
- Rapidly toggle publish → no flicker or stale data (Convex real-time)
- Upload large image (>5MB) → should handle gracefully

**Step 3: Run existing tests**

```bash
npm run test
npm run lint
npm run build
```

Expected: All pass. No regressions.

---

### Task 29: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add CMS section to Architecture Overview**

Add under "Key Directories" or as new section:

```markdown
### CMS Architecture

**Tables:**
- `pageContent` — Structured marketing sections (home hero, benefits, features)
- `richTextPages` — Prose/legal pages (About, Privacy, Security, Terms) via TipTap JSON
- `siteConfig` — Global settings (header nav, footer links)
- `pricingPlans` — Pricing page (existing, unchanged)
- `documentationSections` — Documentation page (existing, unchanged)
- `blogSections` — Blog page (existing, unchanged)

**Admin:** Content Manager tab in admin panel (`/dashboard?tab=content`)

**Frontend Pattern:** CMS-driven with static fallback — each section queries DB, falls back to hardcoded content if no published CMS data exists.

**Key Files:**
- `convex/pageContent.ts` — Structured section queries/mutations
- `convex/richTextPages.ts` — Rich text page queries/mutations
- `convex/siteConfig.ts` — Site config queries/mutations
- `src/components/admin/ContentManager.tsx` — Admin CMS UI
- `src/components/admin/cms/` — Editor components (Hero, Benefits, Feature, TipTap, Header, Footer)
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CMS architecture to CLAUDE.md"
```

---

## Summary

| Phase | Tasks | What's Built |
|-------|-------|-------------|
| Phase 0 | 1-9 | Schema, Convex functions, seeds, admin placeholder |
| Phase 1 | 10-15 | Home Hero + Benefits (admin editor + CMS frontend) |
| Phase 2 | 16-18 | Home Features (admin editor + CMS frontend) |
| Phase 3 | 19-22 | Header + Footer (admin editor + CMS frontend) |
| Phase 4 | 23-27 | TipTap + Rich Text Pages (admin editor + CMS frontend) |
| Phase 5 | 28-29 | E2E testing + documentation |

**Total:** 29 tasks across 5 phases.

**Dependencies:**
- Phase 0 must complete before all others (schema + functions needed)
- Phases 1-3 can technically run in parallel (independent sections)
- Phase 4 depends on TipTap installation (Task 23)
- Phase 5 runs after all others
