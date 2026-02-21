# CMS Architecture Documentation

Comprehensive documentation for the Makalah AI Content Management System.
For developer maintenance, scaling, and onboarding.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Backend API (Convex Functions)](#backend-api-convex-functions)
4. [Frontend Rendering Patterns](#frontend-rendering-patterns)
5. [Admin Panel Architecture](#admin-panel-architecture)
6. [Image Storage & Upload](#image-storage--upload)
7. [TipTap WYSIWYG Integration](#tiptap-wysiwyg-integration)
8. [Seed & Migration Data](#seed--migration-data)
9. [File Reference Map](#file-reference-map)
10. [Adding New CMS Sections](#adding-new-cms-sections)
11. [Common Patterns & Conventions](#common-patterns--conventions)

---

## Overview

Hybrid CMS for all marketing pages. Admin-only (superadmin/admin roles). Static fallback when CMS content is unpublished or absent.

### Design Principles

- **Publish toggle**: Every CMS record has `isPublished`. When `false`, frontend falls back to hardcoded static components.
- **Zero downtime**: Static components always available. CMS enhances, never blocks.
- **Real-time**: Convex subscriptions auto-update frontend when admin saves.
- **Image storage**: Convex file storage with CDN URLs. No external image hosts.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | Convex (real-time, serverless) |
| Admin UI | React + Tailwind CSS (client components) |
| Rich Text | TipTap (ProseMirror) with StarterKit + Link + Image |
| Image Upload | Convex Storage API (PUT to upload URL) |
| Frontend | Next.js App Router (`useQuery` subscriptions) |

---

## Database Schema

Five tables power the CMS. All defined in `convex/schema.ts`.

### 1. `pageContent` — Structured Sections

**Purpose:** Home page sections (hero, benefits, features) and about page sections (manifesto, problems, agents, career-contact).

| Field | Type | Description |
|-------|------|-------------|
| `pageSlug` | `string` | Page identifier (`"home"`, `"about"`) |
| `sectionSlug` | `string` | Section identifier (`"hero"`, `"benefits"`, `"features-workflow"`, `"features-refrasa"`, `"manifesto"`, `"problems"`, `"agents"`, `"career-contact"`) |
| `sectionType` | `union` | `"hero"` \| `"benefits"` \| `"feature-showcase"` \| `"manifesto"` \| `"problems"` \| `"agents"` \| `"career-contact"` |
| `title` | `string?` | Section heading |
| `subtitle` | `string?` | Sub-heading |
| `description` | `string?` | Section body text |
| `badgeText` | `string?` | SectionBadge text above heading |
| `ctaText` | `string?` | CTA button label |
| `ctaHref` | `string?` | CTA button URL |
| `items[]` | `array?` | Multi-item sections (benefits list, feature points). Each: `{ title, description, icon?, imageId? }` |
| `primaryImageId` | `Id<"_storage">?` | Primary image (light mode for features, hero mockup) |
| `primaryImageAlt` | `string?` | Alt text for primary image |
| `secondaryImageId` | `Id<"_storage">?` | Secondary image (dark mode variant for features) |
| `headingImageDarkId` | `Id<"_storage">?` | Hero heading SVG for dark theme |
| `headingImageLightId` | `Id<"_storage">?` | Hero heading SVG for light theme |
| `headingLines[]` | `string[]?` | Multi-line heading text |
| `subheading` | `string?` | Sub-heading text |
| `paragraphs[]` | `string[]?` | Multi-paragraph body content |
| `contactInfo` | `object?` | Career-contact: `{ company, address[], email }` |
| `isPublished` | `boolean` | Publish toggle |
| `sortOrder` | `number` | Section ordering within page |
| `updatedAt` | `number` | Last update timestamp |
| `updatedBy` | `Id<"users">?` | Last editor |

**Indices:** `by_page` (pageSlug + sortOrder), `by_page_section` (pageSlug + sectionSlug)

### 2. `richTextPages` — TipTap WYSIWYG Pages

**Purpose:** Full rich-text pages for legal/policy content (privacy, security, terms).

| Field | Type | Description |
|-------|------|-------------|
| `slug` | `string` | Page identifier (`"privacy"`, `"security"`, `"terms"`) |
| `title` | `string` | Page title |
| `content` | `string` | TipTap JSON (stringified `{ type: "doc", content: [...] }`) |
| `lastUpdatedLabel` | `string?` | Display text like "Terakhir diperbarui: Februari 2026" |
| `isPublished` | `boolean` | Publish toggle |
| `updatedAt` | `number` | Last update timestamp |
| `updatedBy` | `Id<"users">?` | Last editor |

**Index:** `by_slug`

### 3. `siteConfig` — Global Configuration

**Purpose:** Header navigation, footer sections, social links, logos, branding.

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Config identifier (`"header"` or `"footer"`) |
| `navLinks[]` | `array?` | Header nav: `{ label, href, isVisible }` |
| `footerSections[]` | `array?` | Footer columns: `{ title, links[{ label, href }] }` |
| `socialLinks[]` | `array?` | Social icons: `{ platform, url, isVisible, iconId? }` |
| `copyrightText` | `string?` | Footer copyright text |
| `companyDescription` | `string?` | Footer company description |
| `logoDarkId` | `Id<"_storage">?` | Logo for dark theme |
| `logoLightId` | `Id<"_storage">?` | Logo for light theme |
| `brandTextDarkId` | `Id<"_storage">?` | Brand text image for dark theme |
| `brandTextLightId` | `Id<"_storage">?` | Brand text image for light theme |
| `updatedAt` | `number` | Last update timestamp |
| `updatedBy` | `Id<"users">?` | Last editor |

**Index:** `by_key`

### 4. `blogSections` — Blog Posts

**Purpose:** Blog articles with cover images, categories, and TipTap/block content.

| Field | Type | Description |
|-------|------|-------------|
| `slug` | `string` | URL slug |
| `title` | `string` | Post title |
| `excerpt` | `string?` | Summary/preview text |
| `author` | `string` | Author name |
| `category` | `string` | Category (`"Update"`, `"Tutorial"`, `"Opini"`, `"Event"`) |
| `readTime` | `string` | Read time label (e.g., "5 min read") |
| `featured` | `boolean` | Featured post flag |
| `isPublished` | `boolean` | Publish toggle |
| `publishedAt` | `number` | Publication timestamp |
| `content` | `string?` | TipTap JSON for article body |
| `blocks[]` | `array?` | Legacy structured blocks (auto-converted to TipTap in CMS editor) |
| `coverImageId` | `Id<"_storage">?` | Cover image |
| `createdAt` | `number` | Creation timestamp |
| `updatedAt` | `number` | Last update timestamp |

**Indices:** `by_published`, `by_slug`, `by_category`, `by_featured`

**Category Normalization:** Legacy seed data uses categories like `"Produk"`, `"Penelitian"`, `"Dinamika"`, `"Perspektif"`. The `normalizeCategory()` function in `src/components/marketing/blog/utils.ts` maps these to canonical names (`Update`, `Tutorial`, `Opini`, `Event`).

### 5. `documentationSections` — Documentation

**Purpose:** Marketing docs with structured block-based content.

| Field | Type | Description |
|-------|------|-------------|
| `slug` | `string` | URL slug |
| `title` | `string` | Section title |
| `group` | `string` | Group (`"Mulai"`, `"Fitur Utama"`, `"Subskripsi"`, `"Panduan Lanjutan"`) |
| `order` | `number` | Sort order within group |
| `icon` | `string?` | Sidebar icon key |
| `headerIcon` | `string?` | Header display icon key |
| `summary` | `string?` | Intro text |
| `blocks[]` | `array` | Content blocks: `section`, `infoCard`, `ctaCards` |
| `searchText` | `string` | Auto-generated from title + summary + blocks (for search) |
| `isPublished` | `boolean` | Publish toggle |
| `createdAt` | `number` | Creation timestamp |
| `updatedAt` | `number` | Last update timestamp |

**Block Types:**
- `section` — Rich content: title, description, paragraphs, list, richContent (TipTap JSON)
- `infoCard` — Card: title, description, items[]
- `ctaCards` — CTA grid: items[] with title, description, targetSection, ctaText, icon

**Index:** `by_order`, `by_slug`, `by_published`

---

## Backend API (Convex Functions)

All CMS mutations require admin role via `requireRole(ctx.db, requestorId, "admin")`.
All public queries are unauthenticated (for frontend rendering).

### `convex/pageContent.ts`

| Function | Type | Auth | Description |
|----------|------|------|-------------|
| `getPageSections(pageSlug)` | query | public | Get all published sections for a page |
| `getSection(pageSlug, sectionSlug)` | query | public | Get single section |
| `listAllSections(requestorId)` | query | admin | List all sections (including drafts) |
| `upsertSection(requestorId, ...)` | mutation | admin | Create or update a section |
| `togglePublish(requestorId, id)` | mutation | admin | Toggle isPublished |
| `generateUploadUrl(requestorId)` | mutation | admin | Get Convex storage upload URL |
| `getImageUrl(storageId)` | query | public | Resolve storage ID to CDN URL |

### `convex/richTextPages.ts`

| Function | Type | Auth | Description |
|----------|------|------|-------------|
| `getPageBySlug(slug)` | query | public | Get published page by slug |
| `listAllPages(requestorId)` | query | admin | List all pages |
| `getPageBySlugAdmin(requestorId, slug)` | query | admin | Get page without publish filter |
| `upsertPage(requestorId, ...)` | mutation | admin | Create or update a page |

### `convex/siteConfig.ts`

| Function | Type | Auth | Description |
|----------|------|------|-------------|
| `getConfig(key)` | query | public | Get header or footer config |
| `listAllConfigs(requestorId)` | query | admin | List all configs |
| `upsertConfig(requestorId, key, ...)` | mutation | admin | Upsert by key |

### `convex/blog.ts`

| Function | Type | Auth | Description |
|----------|------|------|-------------|
| `getPublishedPosts(category?, limit?)` | query | public | Published posts with cover URLs |
| `getPostBySlug(slug)` | query | public | Single post + cover URL |
| `getFeaturedPost()` | query | public | Featured post |
| `listAllPosts(requestorId)` | query | admin | All posts (including drafts) |
| `getPostBySlugAdmin(requestorId, slug)` | query | admin | Single post without publish filter |
| `getBlogImageUrl(storageId)` | query | public | Resolve cover image URL |
| `upsertPost(requestorId, ...)` | mutation | admin | Create or update post |
| `deletePost(requestorId, id)` | mutation | admin | Delete post |
| `generateBlogUploadUrl(requestorId)` | mutation | admin | Get upload URL for blog images |

### `convex/documentationSections.ts`

| Function | Type | Auth | Description |
|----------|------|------|-------------|
| `getPublishedSections()` | query | public | Published sections ordered by `order` |
| `listAllSections(requestorId)` | query | admin | All sections |
| `getSectionBySlug(requestorId, slug)` | query | admin | Single section by slug |
| `getDocImageUrl(storageId)` | query | public | Resolve doc image URL |
| `upsertSection(requestorId, ...)` | mutation | admin | Create/update (auto-generates `searchText`) |
| `deleteSection(requestorId, id)` | mutation | admin | Delete section |
| `generateDocUploadUrl(requestorId)` | mutation | admin | Get upload URL for doc images |

---

## Frontend Rendering Patterns

Three patterns used depending on content type.

### Pattern 1: Wrapper Pattern (Structured Sections)

Used for home/about page sections. Three-component architecture per section.

```
XxxSection.tsx          ← "use client" wrapper with useQuery
├── XxxStatic.tsx       ← Hardcoded fallback component
└── XxxCMS.tsx          ← CMS-driven component
```

**Logic flow:**

```
useQuery(api.pageContent.getSection, { pageSlug, sectionSlug })
  ├── undefined (loading) → return null
  ├── null or !isPublished → <XxxStatic />
  └── published → <XxxCMS content={section} />
```

**Implementations:**

| Section | Wrapper | Static | CMS |
|---------|---------|--------|-----|
| Hero | `hero/HeroSection.tsx` | `hero/HeroStatic.tsx` | `hero/HeroCMS.tsx` |
| Benefits | `benefits/BenefitsSectionWrapper.tsx` | `benefits/BenefitsSection.tsx` (no items prop) | `benefits/BenefitsSection.tsx` (with items prop) |
| Workflow Feature | `features/WorkflowFeatureSection.tsx` | `features/WorkflowFeatureStatic.tsx` | `features/WorkflowFeatureCMS.tsx` |
| Refrasa Feature | `features/RefrasaFeatureSection.tsx` | `features/RefrasaFeatureStatic.tsx` | `features/RefrasaFeatureCMS.tsx` |

**Note on Benefits:** `BenefitsSection` is a single component that accepts optional `items` prop. Without items, it renders hardcoded defaults. With items from CMS, it renders CMS data. This is a shared-component variant of the Wrapper Pattern.

### Pattern 2: CmsPageWrapper (Rich Text Pages)

Used for policy pages (privacy, security, terms).

```tsx
// src/app/(marketing)/privacy/page.tsx
<CmsPageWrapper slug="privacy" badge="Legal">
  <SimplePolicyPage title="Kebijakan Privasi">
    {/* static content as children */}
  </SimplePolicyPage>
</CmsPageWrapper>
```

**Logic flow:**

```
useQuery(api.richTextPages.getPageBySlug, { slug })
  ├── undefined (loading) → return null
  ├── null (no CMS data) → render {children} (static page)
  └── published → render TipTap content via RichTextRenderer
```

**Key distinction:** CMS mode renders a completely different layout (badge + h1 + RichTextRenderer + lastUpdatedLabel) — it does NOT use SimplePolicyPage.

### Pattern 3: Inline Fallback (Global Config)

Used for header navigation and footer sections.

```tsx
// Inside GlobalHeader.tsx
const headerConfig = useQuery(api.siteConfig.getConfig, { key: "header" })
const navLinks = headerConfig?.navLinks?.filter(l => l.isVisible) ?? HEADER_LINKS
```

**Logic:** Query CMS config inside existing component. If CMS data exists, derive props from it. Otherwise, fall back to hardcoded constants. No separate wrapper/static/CMS split.

**Files using this pattern:**
- `src/components/layout/header/GlobalHeader.tsx` — nav links, logo, brand text
- `src/components/layout/footer/Footer.tsx` — sections, social links, copyright, logos

---

## Admin Panel Architecture

### ContentManager — Main Router

**File:** `src/components/admin/ContentManager.tsx`

Central navigation hub with sidebar + editor panel. Located in admin dashboard CMS tab.

**Navigation tree:**

```
Pages
├── Home (collapsible)
│   ├── Hero           → HeroSectionEditor
│   ├── Benefits       → BenefitsSectionEditor
│   ├── Fitur: Workflow → FeatureShowcaseEditor (sectionSlug="features-workflow")
│   └── Fitur: Refrasa  → FeatureShowcaseEditor (sectionSlug="features-refrasa")
├── About (collapsible)
│   ├── Manifesto      → ManifestoSectionEditor
│   ├── Problems       → ProblemsSectionEditor
│   ├── Agents         → AgentsSectionEditor
│   └── Karier & Kontak → CareerContactEditor
├── Dokumentasi (collapsible)
│   ├── Mulai          → DocSectionListEditor (group="Mulai")
│   ├── Fitur Utama    → DocSectionListEditor (group="Fitur Utama")
│   ├── Subskripsi     → DocSectionListEditor (group="Subskripsi")
│   └── Panduan Lanjutan → DocSectionListEditor (group="Panduan Lanjutan")
├── Blog (collapsible)
│   ├── Update         → BlogPostListEditor (category="Update")
│   ├── Tutorial       → BlogPostListEditor (category="Tutorial")
│   ├── Opini          → BlogPostListEditor (category="Opini")
│   └── Event          → BlogPostListEditor (category="Event")
├── Privacy            → RichTextPageEditor (slug="privacy")
├── Security           → RichTextPageEditor (slug="security")
└── Terms              → RichTextPageEditor (slug="terms")

Global
├── Header             → HeaderConfigEditor
└── Footer             → FooterConfigEditor
```

**State management:**
- `selectedPage` — which page is active
- `selectedSection` — which section within a page
- `expandedPages` — Set of pages with expanded sidebar
- `selectedDocSlug` — drill-down slug for doc editor (null = list, `"__new__"` = create, else = edit)
- `selectedBlogSlug` — drill-down slug for blog editor (same pattern)

**Routing maps:**

```typescript
// Documentation: sidebar section → group filter
const DOC_SECTION_GROUP_MAP = {
  "doc-mulai": "Mulai",
  "doc-fitur-utama": "Fitur Utama",
  "doc-subskripsi": "Subskripsi",
  "doc-panduan-lanjutan": "Panduan Lanjutan",
}

// Blog: sidebar section → category filter
const BLOG_CATEGORY_MAP = {
  "blog-update": "Update",
  "blog-tutorial": "Tutorial",
  "blog-opini": "Opini",
  "blog-event": "Event",
}
```

### Editor Components

All located in `src/components/admin/cms/`.

#### Structured Section Editors

These editors share a common pattern: query existing data → populate form state → save via `upsertSection`.

| Editor | Section | Key Fields |
|--------|---------|------------|
| `HeroSectionEditor` | hero | title, subtitle, badgeText, ctaText/Href, primaryImage, headingImageDark/Light |
| `BenefitsSectionEditor` | benefits | items[] (title + description + icon) |
| `FeatureShowcaseEditor` | features-workflow, features-refrasa | title, description, badgeText, items[], primaryImage (light), secondaryImage (dark) |
| `ManifestoSectionEditor` | manifesto | title, description, paragraphs[] |
| `ProblemsSectionEditor` | problems | title, description, items[] |
| `AgentsSectionEditor` | agents | title, description, items[] |
| `CareerContactEditor` | career-contact | title, description, contactInfo |

#### List + Detail Editors (Drill-down Pattern)

Documentation and Blog use a two-level flow: **List** → **Detail**.

```
DocSectionListEditor (filtered by group)
  ├── Click "Edit" → setSelectedDocSlug(slug) → DocSectionEditor
  └── Click "Buat Section Baru" → setSelectedDocSlug("__new__") → DocSectionEditor (create mode)
  └── Click "< Kembali ke Daftar" → setSelectedDocSlug(null) → back to list

BlogPostListEditor (filtered by category)
  ├── Click post row → setSelectedBlogSlug(slug) → BlogPostEditor
  └── Click "Buat Post Baru" → setSelectedBlogSlug("__new__") → BlogPostEditor (create mode)
  └── Click "< Kembali ke Daftar" → setSelectedBlogSlug(null) → back to list
```

#### Global Config Editors

| Editor | Config Key | Key Fields |
|--------|-----------|------------|
| `HeaderConfigEditor` | `"header"` | navLinks[], logoDark/Light, brandTextDark/Light |
| `FooterConfigEditor` | `"footer"` | footerSections[], socialLinks[], copyrightText, companyDescription, logoDark/Light, brandTextDark/Light |

#### Rich Text Page Editor

`RichTextPageEditor` — Shared for privacy, security, terms pages. Uses TipTapEditor for content editing.

#### Block Sub-editors

For documentation sections, blocks have type-specific editors in `blocks/`:

| Editor | Block Type | Fields |
|--------|-----------|--------|
| `SectionBlockEditor` | `"section"` | title, description, paragraphs, list, richContent (TipTap) |
| `InfoCardBlockEditor` | `"infoCard"` | title, description, items[] |
| `CtaCardsBlockEditor` | `"ctaCards"` | items[] with title, description, targetSection, ctaText, icon |

---

## Image Storage & Upload

### CmsImageUpload Component

**File:** `src/components/admin/cms/CmsImageUpload.tsx`

Reusable component for all CMS image uploads.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `currentImageId` | `Id<"_storage"> \| null` | Current stored image |
| `onUpload` | `(storageId) => void` | Callback when upload completes |
| `userId` | `Id<"users">` | Admin user ID |
| `label` | `string` | Display label above upload area |
| `aspectRatio` | `string?` | CSS aspect-ratio (e.g., `"16/9"`, `"4/1"`) |
| `fallbackPreviewUrl` | `string?` | Static image URL shown when no CMS image uploaded |
| `generateUploadUrlFn` | `ConvexMutation?` | Custom upload URL mutation (default: `api.pageContent.generateUploadUrl`) |
| `getImageUrlFn` | `ConvexQuery?` | Custom image URL query (default: `api.pageContent.getImageUrl`) |

**Upload Flow:**

```
1. User clicks upload area
2. File input dialog opens
3. File selected → call generateUploadUrlFn mutation
4. Mutation returns Convex storage upload URL
5. PUT request to upload URL with file body
6. Response: { storageId: "..." }
7. Call onUpload(storageId)
8. Parent component updates form state
9. On form save → storageId saved to DB record
```

**States:**
- **Empty** — Dashed border, "Upload" button
- **Fallback** — Shows `fallbackPreviewUrl` image with "Default" badge, "Upload Custom" hover overlay
- **Uploaded** — Shows resolved image with "Ganti" hover overlay
- **Loading** — Spinner during upload

### Image Conventions

| Context | Light Image Field | Dark Image Field |
|---------|------------------|-----------------|
| Feature sections | `primaryImageId` | `secondaryImageId` |
| Hero heading SVG | `headingImageLightId` | `headingImageDarkId` |
| Hero mockup | `primaryImageId` | — |
| Header/Footer logo | `logoLightId` | `logoDarkId` |
| Header/Footer brand text | `brandTextLightId` | `brandTextDarkId` |
| Social link icon | — (per social link `iconId`) | — |
| Blog cover | `coverImageId` | — |

### Dark/Light Mode Image Rendering

Feature sections render two `<img>` tags with CSS class switching:

```tsx
<img src={lightImageUrl ?? "/images/fallback-light.png"} className="dark:hidden" />
<img src={darkImageUrl ?? "/images/fallback-dark.png"} className="hidden dark:block" />
```

### Static Fallback Images

| Section | Light | Dark |
|---------|-------|------|
| Workflow Feature | `/images/workflow-feature-mock-light.png` | `/images/workflow-feature-mock-dark.png` |
| Refrasa Feature | `/images/refrasa-feature-mock-light.png` | `/images/refrasa-feature-mock-dark.png` |
| Hero Mockup | `/images/hero-paper-session-mock.png` | — |
| Hero Heading (dark theme) | `/heading-light-color.svg` | — |
| Hero Heading (light theme) | `/heading-dark-color.svg` | — |
| Blog Cover | Dynamic SVG via `createPlaceholderImageDataUri()` | — |

---

## TipTap WYSIWYG Integration

### Admin Editor

**File:** `src/components/admin/cms/TipTapEditor.tsx`

**Extensions:** StarterKit (heading 1-3, bold, italic, lists, blockquote, code), Link, Image

**Toolbar:**
- Heading 1/2/3
- Bold, Italic
- Bullet list, Ordered list, Blockquote
- Code inline
- Link insertion (prompt dialog)
- Image insertion (for documentation blocks — prompt for URL)
- Undo/Redo

**Props:**
- `content` — JSON string from DB
- `onChange(json: string)` — Callback with stringified TipTap JSON
- `editable` — Optional, default true

### Frontend Renderer

**File:** `src/components/marketing/RichTextRenderer.tsx`

Read-only TipTap instance. Same extensions as editor. Applies prose styling via Tailwind classes on `EditorContent`:
- Headings: `text-narrative`, `tracking-tight`, `text-foreground`
- Body: `text-interface`, `text-sm`, `text-muted-foreground`
- Links: `text-primary`, `underline`
- Code: `rounded-badge`, `bg-muted`, `text-interface`

### Blog Content Migration

Blog posts may store content in `blocks[]` (legacy structured format) or `content` (TipTap JSON string). The CMS editor handles this via `blocksToTipTapJson()` in `BlogPostEditor.tsx`:

```
Content resolution order:
1. existingPost.content (TipTap JSON) → use directly
2. existingPost.blocks (structured) → convert via blocksToTipTapJson()
3. Neither → empty editor
```

The conversion is one-way: once saved from the CMS editor, content is stored as TipTap JSON in the `content` field.

---

## Seed & Migration Data

Located in `convex/migrations/`. Run via `npx convex run migrations:<name>`.

| File | Purpose | Idempotent |
|------|---------|-----------|
| `seedHomeContent.ts` | Home page sections (hero, benefits, workflow, refrasa) | Yes (checks existing) |
| `seedAboutContent.ts` | About page sections (manifesto, problems, agents, career-contact) | Yes |
| `seedRichTextPages.ts` | Policy/legal pages (privacy, security, terms) | Yes |
| `seedSiteConfig.ts` | Header nav + footer sections/links | Yes (per key) |
| `seedPolicyContent.ts` | Additional policy content | Yes |
| `seedDocumentationSections.ts` | Documentation sections with blocks | Yes |

**Note:** Blog posts are seeded via `blog.ts` functions (`seedBlogPosts`), not a separate migration file.

All seed data is created with `isPublished: false` so static fallbacks remain active until admin explicitly publishes.

---

## File Reference Map

### Backend (Convex)

| File | Responsibility |
|------|---------------|
| `convex/schema.ts` | All table definitions |
| `convex/pageContent.ts` | Structured section CRUD + image URL resolution |
| `convex/richTextPages.ts` | Rich text page CRUD |
| `convex/siteConfig.ts` | Header/footer config CRUD |
| `convex/blog.ts` | Blog post CRUD + cover image handling |
| `convex/documentationSections.ts` | Documentation CRUD + searchText generation |
| `convex/permissions.ts` | `requireRole()` admin check |
| `convex/migrations/seed*.ts` | Seed data scripts |

### Admin Panel

| File | Responsibility |
|------|---------------|
| `src/components/admin/ContentManager.tsx` | Navigation sidebar + editor router |
| `src/components/admin/cms/HeroSectionEditor.tsx` | Hero section form |
| `src/components/admin/cms/BenefitsSectionEditor.tsx` | Benefits items form |
| `src/components/admin/cms/FeatureShowcaseEditor.tsx` | Workflow/Refrasa features form (reusable) |
| `src/components/admin/cms/ManifestoSectionEditor.tsx` | Manifesto section form |
| `src/components/admin/cms/ProblemsSectionEditor.tsx` | Problems section form |
| `src/components/admin/cms/AgentsSectionEditor.tsx` | Agents section form |
| `src/components/admin/cms/CareerContactEditor.tsx` | Career & contact section form |
| `src/components/admin/cms/RichTextPageEditor.tsx` | TipTap page editor (privacy/security/terms) |
| `src/components/admin/cms/HeaderConfigEditor.tsx` | Header nav + logos form |
| `src/components/admin/cms/FooterConfigEditor.tsx` | Footer sections + social + logos form |
| `src/components/admin/cms/DocSectionListEditor.tsx` | Documentation section list (filtered by group) |
| `src/components/admin/cms/DocSectionEditor.tsx` | Documentation section detail editor |
| `src/components/admin/cms/BlogPostListEditor.tsx` | Blog post list (filtered by category) |
| `src/components/admin/cms/BlogPostEditor.tsx` | Blog post detail editor |
| `src/components/admin/cms/TipTapEditor.tsx` | Shared WYSIWYG editor |
| `src/components/admin/cms/CmsImageUpload.tsx` | Shared image upload component |
| `src/components/admin/cms/blocks/SectionBlockEditor.tsx` | Documentation section block editor |
| `src/components/admin/cms/blocks/InfoCardBlockEditor.tsx` | Documentation info card block editor |
| `src/components/admin/cms/blocks/CtaCardsBlockEditor.tsx` | Documentation CTA cards block editor |

### Frontend Rendering

| File | Responsibility |
|------|---------------|
| `src/components/marketing/hero/HeroSection.tsx` | Hero wrapper (CMS query + fallback) |
| `src/components/marketing/hero/HeroCMS.tsx` | Hero CMS renderer |
| `src/components/marketing/hero/HeroStatic.tsx` | Hero static fallback |
| `src/components/marketing/hero/HeroHeadingSvg.tsx` | Static heading SVG component |
| `src/components/marketing/benefits/BenefitsSectionWrapper.tsx` | Benefits wrapper |
| `src/components/marketing/benefits/BenefitsSection.tsx` | Benefits renderer (shared static/CMS) |
| `src/components/marketing/features/WorkflowFeatureSection.tsx` | Workflow wrapper |
| `src/components/marketing/features/WorkflowFeatureCMS.tsx` | Workflow CMS renderer |
| `src/components/marketing/features/WorkflowFeatureStatic.tsx` | Workflow static fallback |
| `src/components/marketing/features/RefrasaFeatureSection.tsx` | Refrasa wrapper |
| `src/components/marketing/features/RefrasaFeatureCMS.tsx` | Refrasa CMS renderer |
| `src/components/marketing/features/RefrasaFeatureStatic.tsx` | Refrasa static fallback |
| `src/components/marketing/CmsPageWrapper.tsx` | Rich text page wrapper |
| `src/components/marketing/RichTextRenderer.tsx` | TipTap read-only renderer |
| `src/components/marketing/SimplePolicyPage.tsx` | Static policy page layout |
| `src/components/layout/header/GlobalHeader.tsx` | Header with inline CMS fallback |
| `src/components/layout/footer/Footer.tsx` | Footer with inline CMS fallback |

### Utilities

| File | Responsibility |
|------|---------------|
| `src/components/marketing/blog/utils.ts` | `normalizeCategory()`, `createPlaceholderImageDataUri()` |
| `src/components/marketing/blog/types.ts` | `CanonicalCategory`, `TimeRangeFilter` types |

### Page Routes (consumers)

| File | CMS Pattern Used |
|------|-----------------|
| `src/app/(marketing)/page.tsx` | Wrapper (HeroSection, BenefitsSectionWrapper, WorkflowFeatureSection, RefrasaFeatureSection) |
| `src/app/(marketing)/privacy/page.tsx` | CmsPageWrapper |
| `src/app/(marketing)/security/page.tsx` | CmsPageWrapper |
| `src/app/(marketing)/terms/page.tsx` | CmsPageWrapper |
| `src/app/(marketing)/blog/page.tsx` | Direct query (getPublishedPosts) |
| `src/app/(marketing)/blog/[slug]/page.tsx` | Direct query (getPostBySlug) |
| `src/app/(marketing)/documentation/page.tsx` | Direct query (getPublishedSections) |

---

## Adding New CMS Sections

### Adding a new structured section (Wrapper Pattern)

1. **Schema** (`convex/schema.ts`):
   - Add new `sectionType` to pageContent union (if needed)
   - Add any new fields to the table definition

2. **Backend** (`convex/pageContent.ts`):
   - Add new fields to `upsertSection` args validator
   - No changes needed if using existing field patterns

3. **Admin Editor** (`src/components/admin/cms/`):
   - Create `NewSectionEditor.tsx` with form fields
   - Register in `ContentManager.tsx`:
     - Add to `SectionId` type
     - Add to appropriate page's `sections[]` in `PAGES_NAV`
     - Add routing condition in the right panel

4. **Frontend Rendering** (`src/components/marketing/`):
   - Create `NewSectionStatic.tsx` (hardcoded fallback)
   - Create `NewSectionCMS.tsx` (renders from DB)
   - Create `NewSection.tsx` (wrapper with useQuery + fallback logic)
   - Import wrapper in page route

5. **Seed Data** (`convex/migrations/`):
   - Add seed function for initial content (isPublished: false)

### Adding a new rich text page (CmsPageWrapper)

1. Create page route in `src/app/(marketing)/`:

   ```tsx
   import { CmsPageWrapper } from "@/components/marketing/CmsPageWrapper"
   import { SimplePolicyPage } from "@/components/marketing/SimplePolicyPage"

   export default function NewPage() {
     return (
       <CmsPageWrapper slug="new-page" badge="Badge">
         <SimplePolicyPage title="Static Title">
           {/* static content */}
         </SimplePolicyPage>
       </CmsPageWrapper>
     )
   }
   ```

2. Register slug in `ContentManager.tsx`:
   - Add to `PageId` type
   - Add to `PAGES_NAV.pages`
   - Add routing: `selectedPage === "new-page" && selectedSection === null ? <RichTextPageEditor slug="new-page" ... />`

3. Add to `SLUG_TITLES` in `RichTextPageEditor.tsx`

### Adding a new blog category

1. Update `CATEGORY_OPTIONS` in `BlogPostEditor.tsx`
2. Update `BLOG_CATEGORY_MAP` in `ContentManager.tsx`
3. Add new section entry in `PAGES_NAV` blog sections
4. Update `CATEGORY_COLORS` in `BlogPostListEditor.tsx`
5. Update `PLACEHOLDER_PALETTE` in `blog/utils.ts` (for cover image placeholder)
6. Update `normalizeCategory()` if legacy names need mapping

### Adding a new documentation group

1. Update `GROUP_OPTIONS` in `DocSectionEditor.tsx`
2. Update `DOC_SECTION_GROUP_MAP` in `ContentManager.tsx`
3. Add new section entry in `PAGES_NAV` documentation sections
4. Update `GROUP_ORDER` in `DocSectionListEditor.tsx`

---

## Common Patterns & Conventions

### Form State Pattern

All editors follow the same lifecycle:

```
1. useQuery() to fetch existing data
2. useState() for each form field
3. useEffect() to populate state from query result
4. handleSave() → useMutation(api.xxx.upsert)
5. Loading skeleton while query === undefined
```

### Published Status Dot

Used in list editors (BlogPostListEditor, DocSectionListEditor):

```tsx
<span className={`h-2 w-2 shrink-0 rounded-full ${
  item.isPublished ? "bg-emerald-500" : "bg-slate-400"
}`} />
```

### Slug Auto-generation

Editors auto-generate URL slugs from titles:

```typescript
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
}
```

### Admin Role Enforcement

Every mutation checks admin role:

```typescript
const user = await requireRole(ctx.db, args.requestorId, "admin")
```

The `requireRole` function is in `convex/permissions.ts`. It checks the user's `role` field in the `users` table.

### Category Normalization (Blog)

Legacy seed data uses old category names. Always use `normalizeCategory()` when filtering:

```typescript
import { normalizeCategory } from "@/components/marketing/blog/utils"

const filtered = posts.filter(
  (p) => normalizeCategory(p.category, p.title, p.excerpt ?? "") === targetCategory
)
```

Mapping: `Produk` / `Dinamika` → `Update`, `Penelitian` / `Perspektif` → `Opini`

### Back Button Layout (Detail Editors)

Detail editors (DocSectionEditor, BlogPostEditor) use consistent back button layout:

```tsx
{/* Back button — standalone above heading */}
<button onClick={onBack} className="flex items-center gap-1 text-interface text-xs ...">
  <NavArrowLeft /> Kembali ke Daftar
</button>

{/* Section header */}
<div>
  <h3 className="text-narrative text-lg ...">
    {isCreateMode ? "Buat ..." : "Edit ..."}
  </h3>
  <div className="mt-2 border-t border-border" />
</div>
```

### Image Upload Context

Different CMS areas use different Convex endpoints for image storage. Pass custom functions via props:

```tsx
// Blog images
<CmsImageUpload
  generateUploadUrlFn={api.blog.generateBlogUploadUrl}
  getImageUrlFn={api.blog.getBlogImageUrl}
  ...
/>

// Documentation images
<CmsImageUpload
  generateUploadUrlFn={api.documentationSections.generateDocUploadUrl}
  getImageUrlFn={api.documentationSections.getDocImageUrl}
  ...
/>

// Default (pageContent images) — no custom props needed
<CmsImageUpload ... />
```
