# Frontend CMS Design — Makalah App

**Date:** 2026-02-21
**Status:** Approved
**Scope:** Content management system for all marketing frontend pages

## Overview

A CMS accessible only by superadmin/admin to manage all frontend marketing content: header, footer, home page (including images/illustrations), pricing, blog, documentation, about, privacy, security, and terms pages.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| CMS granularity | Content-only (no layout/reorder) | Marketing pages rarely change structure; keeps it simple and safe |
| Image storage | Convex File Storage | Consistent with existing architecture; no deploy needed for image changes |
| Policy page editor | TipTap (WYSIWYG) | Rich text editing for legal/prose content; headless, Tailwind-friendly |
| Publish flow | Draft/Published toggle | Simple; consistent with existing `pricingPlans`/`blogSections` pattern |
| Architecture | Hybrid (3 new tables + existing tables untouched) | Balance of type safety and simplicity |

## Schema Design

### New Table 1: `pageContent` — Structured marketing sections

Stores content for sections within marketing pages (home hero, benefits, feature showcases).

```typescript
pageContent: defineTable({
  // Identity
  pageSlug: v.string(),        // "home"
  sectionSlug: v.string(),     // "hero", "benefits", "features-workflow", "features-refrasa"
  sectionType: v.union(
    v.literal("hero"),
    v.literal("benefits"),
    v.literal("feature-showcase"),
  ),

  // Content fields (usage varies by sectionType)
  title: v.optional(v.string()),
  subtitle: v.optional(v.string()),
  description: v.optional(v.string()),
  ctaText: v.optional(v.string()),
  ctaHref: v.optional(v.string()),
  badgeText: v.optional(v.string()),

  // Structured items (benefit cards, feature points)
  items: v.optional(v.array(v.object({
    title: v.string(),
    description: v.string(),
    icon: v.optional(v.string()),          // Iconoir icon name
    imageId: v.optional(v.id("_storage")),
  }))),

  // Images
  primaryImageId: v.optional(v.id("_storage")),
  primaryImageAlt: v.optional(v.string()),

  // Publishing
  isPublished: v.boolean(),
  sortOrder: v.number(),
  updatedAt: v.number(),
  updatedBy: v.optional(v.string()),
})
.index("by_page", ["pageSlug", "sortOrder"])
.index("by_page_section", ["pageSlug", "sectionSlug"])
```

### New Table 2: `richTextPages` — Prose/legal pages (TipTap)

Stores content for About, Privacy, Security, Terms pages using TipTap JSON format.

```typescript
richTextPages: defineTable({
  slug: v.string(),              // "about", "privacy", "security", "terms"
  title: v.string(),
  content: v.string(),           // TipTap JSON stringified
  lastUpdatedLabel: v.optional(v.string()),

  isPublished: v.boolean(),
  updatedAt: v.number(),
  updatedBy: v.optional(v.string()),
})
.index("by_slug", ["slug"])
```

### New Table 3: `siteConfig` — Global site settings

Stores header navigation, footer links, brand settings.

```typescript
siteConfig: defineTable({
  key: v.string(),               // "header", "footer", "brand"

  // Header config
  navLinks: v.optional(v.array(v.object({
    label: v.string(),
    href: v.string(),
    isVisible: v.boolean(),
  }))),

  // Footer config
  footerSections: v.optional(v.array(v.object({
    title: v.string(),
    links: v.array(v.object({
      label: v.string(),
      href: v.string(),
      isExternal: v.optional(v.boolean()),
    })),
  }))),
  socialLinks: v.optional(v.array(v.object({
    platform: v.string(),        // "x", "linkedin", "instagram"
    url: v.string(),
    isVisible: v.boolean(),
  }))),

  // Brand
  copyrightText: v.optional(v.string()),

  updatedAt: v.number(),
  updatedBy: v.optional(v.string()),
})
.index("by_key", ["key"])
```

### Existing Tables (unchanged)

- `pricingPlans` — Already CMS-driven, no changes needed
- `documentationSections` — Already CMS-driven, no changes needed
- `blogSections` — Already CMS-driven, no changes needed

## Admin UI Design

### New Admin Tab: Content Manager

Added to admin panel sidebar as a new tab alongside existing tabs (overview, users, prompts, providers, refrasa, stats).

### Sub-navigation Layout

```
Content Manager
├── Pages
│   ├── Home (sections: Hero, Benefits, Features-Workflow, Features-Refrasa)
│   ├── About (TipTap editor)
│   ├── Privacy (TipTap editor)
│   ├── Security (TipTap editor)
│   └── Terms (TipTap editor)
└── Global
    ├── Header (nav links editor)
    └── Footer (sections + social links editor)
```

### Editor Types by Section

| Section Type | Editor Component | Fields |
|---|---|---|
| `hero` | Structured form | title, subtitle, badgeText, ctaText, ctaHref, image upload |
| `benefits` | Card list editor | 4 items × (title, description, icon picker, optional image) |
| `feature-showcase` | Structured form | title, description, items list, image upload |
| Rich text pages | TipTap WYSIWYG | Full toolbar (H1-H3, bold, italic, lists, links, blockquote) |
| Header | Link list editor | navLinks array (label, href, visibility toggle) |
| Footer | Section + links editor | footerSections, socialLinks, copyrightText |

### Image Upload Flow

1. Admin clicks upload button → file picker dialog
2. Client calls `generateUploadUrl()` from Convex
3. File uploaded via `fetch PUT` to Convex storage
4. `storageId` saved to `pageContent` record
5. Frontend renders via `getUrl(storageId)` → Next.js Image component

### TipTap Editor Config

- Toolbar: H1, H2, H3, Bold, Italic, Bullet List, Ordered List, Link, Blockquote
- Storage: TipTap JSON via `editor.getJSON()` → stringified in `content` field
- Preview: Side-by-side or toggle preview mode
- Styling: Mechanical Grace design tokens (Geist fonts, OKLCH colors)

## Frontend Rendering Strategy

### CMS-Driven with Static Fallback

Every marketing section follows this pattern:

```typescript
function HeroSection() {
  const content = useQuery(api.pageContent.getSection, {
    pageSlug: "home",
    sectionSlug: "hero"
  });

  // Loading → skeleton
  if (content === undefined) return <HeroSkeleton />;

  // No CMS data or unpublished → static fallback
  if (content === null || !content.isPublished) {
    return <HeroStatic />;  // current hardcoded version
  }

  // CMS data → render from DB
  return <HeroCMS content={content} />;
}
```

### Why Fallback Matters

1. **First deploy safety** — before admin seeds content, pages render normally
2. **Graceful degradation** — if Convex is down, static content still works
3. **Incremental migration** — migrate section by section, not big bang

### Image Fallback

```typescript
const imageUrl = useQuery(api.storage.getUrl, {
  storageId: content.primaryImageId
});

<Image
  src={imageUrl ?? "/images/fallback-hero.png"}
  alt={content.primaryImageAlt ?? "Hero"}
  width={769} height={768}
/>
```

## Migration Strategy

### Phase 0: Foundation

- Add 3 new tables to Convex schema
- Create Content Manager admin tab (placeholder)
- Create seed migrations with current hardcoded values

### Phase 1: Home — Hero + Benefits

- Hero section editor + CMS rendering
- Benefits section editor + CMS rendering
- Image upload for hero mockup

### Phase 2: Home — Feature Sections

- Workflow feature section editor + CMS rendering
- Refrasa feature section editor + CMS rendering
- Image upload for feature screenshots

### Phase 3: Header + Footer

- Header nav links editor + CMS rendering
- Footer sections/social links editor + CMS rendering

### Phase 4: Rich Text Pages

- TipTap integration + editor component
- About, Privacy, Security, Terms pages → CMS rendering

### Seed Scripts

Each phase includes a seed migration that populates the database with current hardcoded values:

```bash
npx convex run migrations:seedHomeContent
npx convex run migrations:seedSiteConfig
npx convex run migrations:seedRichTextPages
```

## Security

- All CMS mutations gated by `superadmin` or `admin` role check
- Image uploads validated for file type and size
- TipTap content sanitized on render (no raw HTML injection)

## Dependencies

- **New:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link` (for Phase 4)
- **Existing:** Convex file storage, Next.js Image, shadcn/ui components
