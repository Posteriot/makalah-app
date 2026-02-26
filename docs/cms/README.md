# CMS Architecture Documentation

Comprehensive documentation for the Makalah AI Content Management System.
For developer maintenance, scaling, and onboarding.

---

## Table of Contents

1. [Overview](#overview)
2. [CMS Shell Architecture](#cms-shell-architecture)
3. [Database Schema](#database-schema)
4. [Backend API (Convex Functions)](#backend-api-convex-functions)
5. [Frontend Rendering Patterns](#frontend-rendering-patterns)
6. [Admin Panel — Editor Components](#admin-panel--editor-components)
7. [Pricing CMS & DB-Driven Pricing](#pricing-cms--db-driven-pricing)
8. [Image Storage & Upload](#image-storage--upload)
9. [TipTap WYSIWYG Integration](#tiptap-wysiwyg-integration)
10. [Background Pattern CMS Toggles](#background-pattern-cms-toggles)
11. [Seed & Migration Data](#seed--migration-data)
12. [File Reference Map](#file-reference-map)
13. [Adding New CMS Sections](#adding-new-cms-sections)
14. [Common Patterns & Conventions](#common-patterns--conventions)

---

## Overview

Hybrid CMS for marketing pages, chat empty state, and pricing configuration. Admin-only (superadmin/admin roles). Fallback behavior depends on each consumer component:
- Home/About structured sections: if missing or unpublished, section is hidden (`return null`).
- Chat empty state (`TemplateGrid` + `ChatWindow`): desktop dan mobile memakai mode strict CMS-only. Jika section `chat-empty-state` belum `isPublished`, logo + heading + deskripsi + link sidebar + template tidak dirender (kosong).
- Legal pages (`CmsPageWrapper`): fallback to static `children` content.
- Pricing header/teaser: fallback to local constants for text when section is not published.

### Design Principles

- **Publish toggle**: Every CMS record has `isPublished`; behavior when `false` is component-specific (hidden section, static children fallback, or local constant fallback).
- **Graceful degradation**: Marketing pages remain renderable even when CMS data is incomplete; fallback is handled at wrapper/component level.
- **Real-time**: Convex subscriptions auto-update frontend when admin saves.
- **Image storage**: Convex file storage with CDN URLs. No external image hosts.
- **DB as single source of truth for pricing**: All prices flow from `pricingPlans` table. Constants used only as fallback safety net.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | Convex (real-time, serverless) |
| Admin UI | React + Tailwind CSS (client components) |
| Rich Text | TipTap (ProseMirror): `TipTapEditor` uses StarterKit + Link, `SectionBlockEditor`/`RichTextRenderer` use StarterKit + Link + Image |
| Image Upload | Convex Storage API (upload URL + HTTP POST/PUT depending on component) |
| Frontend | Next.js App Router (`useQuery` subscriptions) |

### CMS Route

| File | Purpose |
|------|---------|
| `src/app/cms/page.tsx` | CMS entry point. Protected: requires `admin` or `superadmin` role. Renders `<CmsShell userId={user._id} />` |
| `src/app/cms/layout.tsx` | Fullscreen wrapper (`h-dvh bg-background`) |

---

## CMS Shell Architecture

The CMS uses a dedicated 4-column CSS Grid layout, completely separate from the admin dashboard. Accessed at `/cms`.

### Layout Structure

```
┌──────────┬─────────────────┬──┬──────────────────────────────┐
│ Activity │    Sidebar      │R │         Main Content         │
│   Bar    │  (collapsible,  │e │  ┌──────────────────────┐   │
│  (48px)  │   resizable)    │s │  │      CmsTopBar       │   │
│          │                 │i │  ├──────────────────────┤   │
│  [Logo]  │ Content Manager │z │  │                      │   │
│  [Home]  │ ─── PAGE ───── │e │  │   Editor Component   │   │
│  [About] │  ○ Section 1   │r │  │   (scrollable)       │   │
│ [Pricing]│  ● Section 2   │  │  │                      │   │
│  [Docs]  │  ○ Section 3   │2 │  │                      │   │
│  [Blog]  │                 │p │  │                      │   │
│  [Legal] │                 │x │  │                      │   │
│  ─────── │                 │  │  │                      │   │
│ [Global] │                 │  │  │                      │   │
└──────────┴─────────────────┴──┴──────────────────────────────┘
     48px      280px (default)       1fr
```

**Grid CSS:** `grid-template-columns: 48px ${sidebarWidth}px 2px 1fr`

### Shell Components

| Component | File | Role |
|-----------|------|------|
| `CmsShell` | `src/components/cms/CmsShell.tsx` | 4-column grid orchestrator. Holds all state. Routes to editors via `renderEditor()`. |
| `CmsActivityBar` | `src/components/cms/CmsActivityBar.tsx` | Vertical icon sidebar (48px). Defines `CmsPageId` type. Two groups: Content Pages + Global. |
| `CmsSidebar` | `src/components/cms/CmsSidebar.tsx` | Dynamic section sidebar (280px default, min 180px, collapses at <100px). Defines `CmsSectionId` and sub-page types. "Content Manager" header is clickable — resets to main overview. |
| `CmsTopBar` | `src/components/cms/CmsTopBar.tsx` | Top bar above content area. Expand sidebar toggle (when collapsed), theme toggle, Admin Dashboard link, user dropdown. |
| `CmsMainOverview` | `src/components/cms/CmsMainOverview.tsx` | Main overview dashboard shown when no page is selected. Shows status summary for all 8 pages. Queries all CMS data sources. |
| `PanelResizer` | `src/components/ui/PanelResizer.tsx` | Draggable 2px divider for sidebar resize. Double-click resets to 280px. |

### Page & Section Type System

**`CmsPageId`** (activity bar navigation):

| Page ID | Icon | Label | Sidebar Pattern |
|---------|------|-------|-----------------|
| `home` | `Home` | Home | Section list |
| `chat` | `ChatBubble` | Chat | Section list |
| `about` | `InfoCircle` | About | Section list |
| `pricing` | `CreditCard` | Pricing | Section list |
| `documentation` | `Book` | Dokumentasi | Drill-down (group → section list → detail) |
| `blog` | `Journal` | Blog | Drill-down (category → post list → detail) |
| `legal` | `PrivacyPolicy` | Legal | Sub-page list |
| `global-layout` | `ScaleFrameEnlarge` | Global Layout | Sub-page list |

**`CmsSectionId`** (sidebar items for section-list pages):

| Section ID | Parent Page | Editor |
|------------|-------------|--------|
| `hero` | home | `HeroSectionEditor` |
| `benefits` | home | `BenefitsSectionEditor` |
| `features-workflow` | home | `FeatureShowcaseEditor` (sectionSlug="features-workflow") |
| `features-refrasa` | home | `FeatureShowcaseEditor` (sectionSlug="features-refrasa") |
| `pricing-teaser` | home | `PricingHeaderEditor` (sectionSlug="pricing-teaser") |
| `chat-empty-state` | chat | `ChatEmptyStateEditor` |
| `manifesto` | about | `ManifestoSectionEditor` |
| `problems` | about | `ProblemsSectionEditor` |
| `agents` | about | `AgentsSectionEditor` |
| `career-contact` | about | `CareerContactEditor` |
| `pricing-header` | pricing | `PricingHeaderEditor` (sectionSlug="pricing-page-header") |
| `pricing-gratis` | pricing | `PricingPlanEditor` (slug="gratis") |
| `pricing-bpp` | pricing | `PricingPlanEditor` (slug="bpp") |
| `pricing-pro` | pricing | `PricingPlanEditor` (slug="pro") |

**Other navigation types** (defined in `CmsSidebar.tsx`):

| Type | Values | Used By |
|------|--------|---------|
| `LegalPageId` | `privacy`, `security`, `terms` | legal page → `RichTextPageEditor` |
| `GlobalLayoutPageId` | `header`, `footer` | global-layout → `HeaderConfigEditor` / `FooterConfigEditor` |
| `DocGroupId` | `doc-mulai`, `doc-fitur-utama`, `doc-subskripsi`, `doc-panduan-lanjutan` | documentation drill-down → `DocSectionListEditor` → `DocSectionEditor` |
| `BlogCategoryId` | `blog-update`, `blog-tutorial`, `blog-opini`, `blog-event` | blog drill-down → `BlogPostListEditor` → `BlogPostEditor` |

### Sidebar Rendering Patterns

The sidebar uses 3 rendering functions + 2 specialized drill-down renderers:

| Function | Used By | Behavior |
|----------|---------|----------|
| `renderSectionList()` | home, chat, about, pricing | Simple flat list, highlights `activeSection` |
| `renderSubPageList()` | legal, global-layout | Generic typed list, highlights active sub-page |
| `renderDrillDownList()` | (base for doc/blog) | Two-level: shows groups initially, then back-button when drilled in |
| `renderDocDrillDown()` | documentation | Three-level: group list → back button + article list (from `listAllSections` query) → article editor |
| `renderBlogDrillDown()` | blog | Three-level: category list → back button + post list (from `listAllPosts` query, normalized by category) → post editor |

Documentation and blog drill-downs query article/post data when a group/category is selected, displaying child items directly in the sidebar for quick navigation.

### Navigation Tree (Complete)

```
Content Pages
├── Home                    → CmsPageOverview (section list + published status)
│   ├── Hero                → HeroSectionEditor
│   ├── Benefits            → BenefitsSectionEditor
│   ├── Fitur: Workflow     → FeatureShowcaseEditor
│   ├── Fitur: Refrasa      → FeatureShowcaseEditor
│   └── Pricing Teaser      → PricingHeaderEditor (sectionSlug="pricing-teaser")
├── Chat                    → CmsPageOverview (section list + published status)
│   └── Empty State         → ChatEmptyStateEditor (sectionSlug="chat-empty-state")
├── About                   → CmsPageOverview (section list + published status)
│   ├── Manifesto           → ManifestoSectionEditor
│   ├── Problems            → ProblemsSectionEditor
│   ├── Agents              → AgentsSectionEditor
│   └── Karier & Kontak     → CareerContactEditor
├── Pricing                 → CmsPricingOverview (plan list + pattern toggles)
│   ├── Header              → PricingHeaderEditor (sectionSlug="pricing-page-header")
│   ├── Gratis              → PricingPlanEditor (slug="gratis")
│   ├── Bayar Per Paper     → PricingPlanEditor (slug="bpp")
│   └── Pro                 → PricingPlanEditor (slug="pro")
├── Dokumentasi             → CmsDocOverview (group list + pattern toggles)
│   ├── Mulai               → [sidebar: article list] → DocSectionEditor
│   ├── Fitur Utama         → [sidebar: article list] → DocSectionEditor
│   ├── Subskripsi          → [sidebar: article list] → DocSectionEditor
│   └── Panduan Lanjutan    → [sidebar: article list] → DocSectionEditor
├── Blog                    → CmsBlogOverview (category counts + pattern toggles)
│   ├── Update              → [sidebar: post list] → BlogPostEditor
│   ├── Tutorial            → [sidebar: post list] → BlogPostEditor
│   ├── Opini               → [sidebar: post list] → BlogPostEditor
│   └── Event               → [sidebar: post list] → BlogPostEditor
└── Legal                   → CmsLegalOverview (page status + pattern toggles)
    ├── Privacy             → RichTextPageEditor (slug="privacy")
    ├── Security            → RichTextPageEditor (slug="security")
    └── Terms               → RichTextPageEditor (slug="terms")

Global Components           → CmsGlobalLayoutOverview (config status)
├── Header                  → HeaderConfigEditor
└── Footer                  → FooterConfigEditor
```

---

## Database Schema

Six tables power the CMS. All defined in `convex/schema.ts`.

### 1. `pageContent` — Structured Sections

**Purpose:** Home page sections (hero, benefits, features, pricing-teaser), chat page section (empty state), about page sections (manifesto, problems, agents, career-contact), pricing page header, and per-page settings (background patterns for pricing, docs, legal, blog).

| Field | Type | Description |
|-------|------|-------------|
| `pageSlug` | `string` | Page identifier (`"home"`, `"chat"`, `"about"`, `"pricing"`, `"docs"`, `"legal"`, `"blog"`) |
| `sectionSlug` | `string` | Section identifier (`"hero"`, `"benefits"`, `"features-workflow"`, `"features-refrasa"`, `"pricing-teaser"`, `"chat-empty-state"`, `"manifesto"`, `"problems"`, `"agents"`, `"career-contact"`, `"pricing-page-header"`, `"docs-page-settings"`, `"legal-page-settings"`, `"blog-page-settings"`) |
| `sectionType` | `union` | `"hero"` \| `"benefits"` \| `"feature-showcase"` \| `"manifesto"` \| `"problems"` \| `"agents"` \| `"career-contact"` \| `"pricing-header"` \| `"page-header"` \| `"page-settings"` |
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
| `headingLines[]` | `string[]?` | Multi-line heading text (manifesto) |
| `subheading` | `string?` | Sub-heading text |
| `paragraphs[]` | `string[]?` | Multi-paragraph body content |
| `contactInfo` | `object?` | Career-contact: `{ company, address[], email }` |
| `showGridPattern` | `boolean?` | Background pattern toggle (Grid) |
| `showDiagonalStripes` | `boolean?` | Background pattern toggle (Diagonal) |
| `showDottedPattern` | `boolean?` | Background pattern toggle (Dotted) |
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
| `footerSections[]` | `array?` | Footer columns: `{ title, links[{ label, href, isExternal? }] }` |
| `socialLinks[]` | `array?` | Social icons: `{ platform, url, isVisible, iconId? }` |
| `copyrightText` | `string?` | Footer copyright text (`{year}` placeholder auto-replaced) |
| `companyDescription` | `string?` | Footer company description |
| `logoDarkId` | `Id<"_storage">?` | Logo for dark theme |
| `logoLightId` | `Id<"_storage">?` | Logo for light theme |
| `brandTextDarkId` | `Id<"_storage">?` | Brand text image for dark theme |
| `brandTextLightId` | `Id<"_storage">?` | Brand text image for light theme |
| `showGridPattern` | `boolean?` | Footer background pattern toggle (Grid) |
| `showDottedPattern` | `boolean?` | Footer background pattern toggle (Dotted) |
| `showDiagonalStripes` | `boolean?` | Footer background pattern toggle (Diagonal) |
| `updatedAt` | `number` | Last update timestamp |
| `updatedBy` | `Id<"users">?` | Last editor |

**Index:** `by_key`

### 4. `pricingPlans` — Pricing Tiers

**Purpose:** Single source of truth for all pricing — marketing display, checkout pages, and payment endpoints.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Plan name (e.g., "Gratis", "Bayar Per Tugas", "Pro") |
| `slug` | `string` | Identifier: `"gratis"`, `"bpp"`, `"pro"` |
| `price` | `string` | Display price (e.g., "Rp0", "Rp80rb", "Rp200rb") |
| `priceValue` | `number?` | Numeric price for payments (e.g., 0, 80000, 200000) |
| `unit` | `string?` | Price unit (e.g., "per paper", "per bulan") |
| `tagline` | `string` | Short description for full pricing page |
| `teaserDescription` | `string?` | Description for home page teaser card |
| `teaserCreditNote` | `string?` | Credit note for teaser card |
| `features[]` | `string[]` | Feature list for full pricing page |
| `isHighlighted` | `boolean` | Highlight with brand border |
| `isDisabled` | `boolean` | Plan not yet available (masks price, hides CTA, rejects payments) |
| `ctaText` | `string` | Button text |
| `ctaHref` | `string?` | Button link |
| `sortOrder` | `number` | Display order |
| `topupOptions[]` | `array?` | **@deprecated** — use `creditPackages` |
| `creditPackages[]` | `array?` | BPP credit packages: `{ type, credits, tokens, priceIDR, label, description?, ratePerCredit?, popular? }` |
| `createdAt` | `number` | Creation timestamp |
| `updatedAt` | `number` | Last update timestamp |

**Indices:** `by_sortOrder`, `by_slug`

### 5. `blogSections` — Blog Posts

**Purpose:** Blog articles with cover images, categories, and TipTap content.

| Field | Type | Description |
|-------|------|-------------|
| `slug` | `string` | URL slug |
| `title` | `string` | Post title |
| `excerpt` | `string` | Summary/preview text |
| `author` | `string` | Author name |
| `category` | `string` | Category (`"Update"`, `"Tutorial"`, `"Opini"`, `"Event"`) |
| `readTime` | `string` | Read time label (e.g., "5 min read") |
| `featured` | `boolean` | Featured post flag |
| `isPublished` | `boolean` | Publish toggle |
| `publishedAt` | `number` | Publication timestamp |
| `content` | `string?` | TipTap JSON for article body |
| `blocks[]` | `array` | Legacy structured blocks (auto-converted to TipTap in CMS editor) |
| `coverImageId` | `Id<"_storage">?` | Cover image |
| `createdAt` | `number` | Creation timestamp |
| `updatedAt` | `number` | Last update timestamp |

**Indices:** `by_published`, `by_slug`, `by_category`, `by_featured`

**Category Normalization:** Legacy seed data uses categories like `"Produk"`, `"Penelitian"`, `"Dinamika"`, `"Perspektif"`. The `normalizeCategory()` function in `src/components/marketing/blog/utils.ts` maps these to canonical names (`Update`, `Tutorial`, `Opini`, `Event`).

### 6. `documentationSections` — Documentation

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

**Indices:** `by_order`, `by_slug`, `by_published`

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

### `convex/pricingPlans.ts`

| Function | Type | Auth | Description |
|----------|------|------|-------------|
| `getActivePlans()` | query | public | All plans sorted by sortOrder |
| `getPlanBySlug(slug)` | query | public | Single plan by slug |
| `getTopupOptionsForPlan(slug)` | query | public | Topup options with fallback |
| `getCreditPackagesForPlan(slug)` | query | public | Credit packages with fallback |
| `updatePricingPlan(requestorId, ...)` | mutation | admin | Update plan (Gratis price locked) |
| `updateCreditPackages(requestorId, ...)` | mutation | admin | Update BPP credit packages |

### `convex/billing/pricingHelpers.ts`

| Function | Type | Auth | Description |
|----------|------|------|-------------|
| `getBppCreditPackage(packageType)` | query | public | BPP package from DB, fallback to constants |
| `getProPricing()` | query | public | Pro pricing from DB, fallback to constants |
| `isPlanDisabled(slug)` | query | public | Check if a plan tier is disabled |

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
| `getDocImageUrl(storageId)` | query | public | Resolve doc image URL |
| `listAllSections(requestorId)` | query | admin | All sections |
| `getSectionBySlug(requestorId, slug)` | query | admin | Single section by slug (admin) |
| `upsertSection(requestorId, ...)` | mutation | admin | Create/update (auto-generates `searchText`) |
| `deleteSection(requestorId, id)` | mutation | admin | Delete section |
| `generateDocUploadUrl(requestorId)` | mutation | admin | Get upload URL for doc images |
| `getDocImageUrlMutation(storageId)` | mutation | public | Mutation wrapper for imperative image URL resolve |

---

## Frontend Rendering Patterns

Four patterns used depending on content type.

### Pattern 1: Wrapper Pattern (Structured Sections — Home Page)

Used for home page sections. Two-layer architecture (wrapper + CMS renderer).

```
XxxSection.tsx          ← "use client" wrapper with useQuery + publish gate
└── XxxCMS.tsx          ← CMS-driven renderer (with field-level fallback where needed)
```

**Logic flow:**

```
useQuery(api.pageContent.getSection, { pageSlug, sectionSlug })
  ├── undefined (loading) → return null
  ├── null or !isPublished → return null (section hidden)
  └── published → <XxxCMS content={section} />
```

**Implementations:**

| Section | Wrapper | Renderer | Behavior if missing/unpublished |
|---------|---------|----------|-------------------------------|
| Hero | `hero/HeroSection.tsx` | `hero/HeroCMS.tsx` | Hidden |
| Benefits | `benefits/BenefitsSectionWrapper.tsx` | `benefits/BenefitsSection.tsx` | Hidden |
| Workflow Feature | `features/WorkflowFeatureSection.tsx` | `features/WorkflowFeatureCMS.tsx` | Hidden |
| Refrasa Feature | `features/RefrasaFeatureSection.tsx` | `features/RefrasaFeatureCMS.tsx` | Hidden |

**Note on Benefits:** `BenefitsSection` accepts optional `items`. If `items` is empty, child components render their own default list.

### Pattern 2: Wrapper Pattern (Structured Sections — About Page)

Same wrapper + CMS renderer architecture, with components in `src/components/about/`.

| Section | Wrapper | Renderer | Behavior if missing/unpublished |
|---------|---------|----------|-------------------------------|
| Manifesto | `about/ManifestoSection.tsx` | `about/ManifestoSectionCMS.tsx` | Hidden |
| Problems | `about/ProblemsSection.tsx` | `about/ProblemsSectionCMS.tsx` | Hidden |
| Agents | `about/AgentsSection.tsx` | `about/AgentsSectionCMS.tsx` | Hidden |
| Career & Contact | `about/CareerContactSection.tsx` | `about/CareerContactSectionCMS.tsx` | Hidden |

Exported via barrel file `src/components/about/index.ts`.

### Pattern 3: CmsPageWrapper (Rich Text Pages)

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

### Pattern 4: Inline Fallback (Global Config + Pricing)

Used for header navigation, footer sections, and pricing pages.

```tsx
// Inside GlobalHeader.tsx
const headerConfig = useQuery(api.siteConfig.getConfig, { key: "header" })
const navLinks = headerConfig?.navLinks?.filter(l => l.isVisible) ?? HEADER_LINKS
```

**Logic:** Query CMS config inside existing component. If CMS data exists, derive props from it. Otherwise, fall back to hardcoded constants. No separate wrapper/static/CMS split.

**Files using this pattern:**

| File | Data Source |
|------|------------|
| `src/components/layout/header/GlobalHeader.tsx` | `siteConfig` key="header" |
| `src/components/layout/footer/Footer.tsx` | `siteConfig` key="footer" |
| `src/app/(marketing)/pricing/page.tsx` | `pricingPlans.getActivePlans()` |
| `src/components/marketing/pricing-teaser/PricingTeaser.tsx` | `pricingPlans.getActivePlans()` |
| `src/app/(dashboard)/subscription/plans/page.tsx` | `pricingPlans.getActivePlans()` |
| `src/app/(dashboard)/subscription/overview/page.tsx` | `pricingPlans.getPlanBySlug()` |
| `src/app/(onboarding)/checkout/bpp/page.tsx` | `pricingHelpers.getBppCreditPackage()` |
| `src/app/(onboarding)/checkout/pro/page.tsx` | `pricingHelpers.getProPricing()` |

---

## Admin Panel — Editor Components

All located in `src/components/admin/cms/`.

### Structured Section Editors

These editors share a common pattern: query existing data → populate form state → save via `upsertSection`.

| Editor | Section | Key Fields |
|--------|---------|------------|
| `HeroSectionEditor` | hero | title, subtitle, badgeText, ctaText/Href, primaryImage + alt, headingImageDark/Light |
| `BenefitsSectionEditor` | benefits | items[] (title + description) — starts with 4 empty items, can add/remove dynamically |
| `FeatureShowcaseEditor` | features-workflow, features-refrasa | title, description, badgeText, items[] (dynamic), primaryImage (light), secondaryImage (dark) |
| `ManifestoSectionEditor` | manifesto | badgeText, headingLines[] (3 lines), subheading, paragraphs[] (dynamic), terminalDark/Light images |
| `ProblemsSectionEditor` | problems | badgeText, title, items[] (title + description, dynamic) |
| `AgentsSectionEditor` | agents | badgeText, title, items[] (name + description + status dropdown) |
| `CareerContactEditor` | career-contact | badgeText, title, careerText, contactInfo { company, address, email } |

### Pricing Header Editor

**`PricingHeaderEditor`** — Edits the header section for pricing pages (title, badge, description, CTA, background patterns).

**Props:** `{ pageSlug: string; sectionSlug: string; userId: Id<"users">; onNavigateToPricing?: () => void }`

Used in two contexts:
- **Home page** → `pricing-teaser` section (with "Navigate to Pricing" link)
- **Pricing page** → `pricing-page-header` section

### Pricing Plan Editor

**`PricingPlanEditor`** — Edits a single pricing tier.

**Props:** `{ slug: string; userId: Id<"users"> }`

| Slug | Special Behavior |
|------|-----------------|
| `gratis` | `price` and `priceValue` fields are read-only (locked at Rp0) |
| `bpp` | Shows editable `creditPackages[]` section (type, credits, tokens, priceIDR, label, description, ratePerCredit, popular) |
| `pro` | Full edit access to all fields |

**Fields:** name, price (display string), priceValue (numeric), unit, tagline, teaserDescription, teaserCreditNote, features[] (dynamic list), ctaText, ctaHref, isHighlighted, isDisabled

**Mutations:** `api.pricingPlans.updatePricingPlan` for plan fields, `api.pricingPlans.updateCreditPackages` for BPP credit packages.

### List + Detail Editors (Drill-down Pattern)

Documentation and Blog use a two-level flow: **List** → **Detail**.

```
Sidebar: group/category list → click group → sidebar shows article/post list
  └── Click article/post → main content loads editor

Main content: DocSectionListEditor / BlogPostListEditor (when drill-down selected)
  ├── Click "Edit" → setSelectedDocSlug(slug) → DocSectionEditor
  └── Click "Buat Section Baru" → setSelectedDocSlug("__new__") → DocSectionEditor (create mode)

BlogPostListEditor:
  ├── Click post row → setSelectedBlogSlug(slug) → BlogPostEditor
  └── Click "Buat Post Baru" → setSelectedBlogSlug("__new__") → BlogPostEditor (create mode)
```

### Global Config Editors

| Editor | Config Key | Key Fields |
|--------|-----------|------------|
| `HeaderConfigEditor` | `"header"` | navLinks[] (label, href, isVisible), logoDark/Light (1:1), brandTextDark/Light (4:1) |
| `FooterConfigEditor` | `"footer"` | footerSections[] (title + links), socialLinks[] (platform, url, isVisible, iconId), copyrightText (`{year}` placeholder), companyDescription, logoDark/Light, pattern toggles (grid, dotted, diagonal) |

### Shared Components

**`CmsSaveButton`** (`src/components/admin/cms/CmsSaveButton.tsx`) — Reusable save button with three states: idle → saving (spinner) → saved (checkmark, auto-resets 2s). Used by all overview components and editors that save pattern toggles.

### Rich Text Page Editor

`RichTextPageEditor` — Shared for privacy, security, terms pages. Uses TipTapEditor for content editing.

**Fields:** title, content (TipTap JSON), lastUpdatedLabel, isPublished

### Block Sub-editors

For documentation sections, blocks have type-specific editors in `blocks/`:

| Editor | Block Type | Fields |
|--------|-----------|--------|
| `SectionBlockEditor` | `"section"` | title, description, paragraphs, list, richContent (TipTap), image |
| `InfoCardBlockEditor` | `"infoCard"` | title, items[] (list of strings) |
| `CtaCardsBlockEditor` | `"ctaCards"` | items[] (title, description, targetSection, ctaText, icon) |

---

## Pricing CMS & DB-Driven Pricing

### Architecture

All pricing flows from the `pricingPlans` Convex table. No frontend or payment endpoint uses hardcoded price values directly.

```
                  ┌─────────────────────────┐
                  │   pricingPlans (Convex)  │  ← Single source of truth
                  │  gratis | bpp | pro      │
                  └────────┬────────────────┘
                           │
              ┌────────────┼────────────────────────┐
              │            │                        │
     ┌────────▼──────┐  ┌─▼──────────────┐  ┌──────▼───────────┐
     │  Marketing    │  │  Dashboard     │  │  Payment APIs   │
     │  (frontend)   │  │  (checkout)    │  │  (server-side)  │
     └───────────────┘  └────────────────┘  └─────────────────┘
     PricingTeaser       checkout/bpp        api/payments/topup
     PricingPage         checkout/pro        api/payments/subscribe
     Plans Hub           subscription/*      Xendit webhook
```

### Pricing Data Flow

| Consumer | Query Used | Fallback |
|----------|-----------|----------|
| Home page pricing teaser | `pricingPlans.getActivePlans()` + `pageContent.getSection("home","pricing-teaser")` | Header text fallback ke konstanta lokal (`FALLBACK_BADGE`, `FALLBACK_TITLE`) |
| `/pricing` page | `pricingPlans.getActivePlans()` + `pageContent.getSection("pricing","pricing-page-header")` | Header text fallback ke konstanta lokal (`FALLBACK_BADGE`, `FALLBACK_TITLE`, `FALLBACK_SUBTITLE`) |
| `/subscription/plans` | `pricingPlans.getActivePlans()` | — |
| `/subscription/overview` | `pricingPlans.getPlanBySlug()` | — |
| `/checkout/bpp` | `billing.pricingHelpers.getBppCreditPackage()` | Constants in `billing/constants.ts` |
| `/checkout/pro` | `billing.pricingHelpers.getProPricing()` | Constants: `{ priceIDR: 200_000, label: "Pro Bulanan" }` |
| `api/payments/subscribe` | `billing.pricingHelpers.getProPricing()` | Constants fallback |
| `api/payments/topup` | `billing.pricingHelpers.getBppCreditPackage()` | Constants fallback |
| Xendit webhook (email label) | `billing.pricingHelpers.getProPricing()` | `"Pro Bulanan"` |
| Subscription mutations | `resolveSubscriptionPricing()` (internal) | `SUBSCRIPTION_PRICING` constants |

### `isDisabled` Guard

When `isDisabled === true` for a plan:

| Area | Behavior |
|------|----------|
| Marketing pages | Price masked (`"Rp80rb"` → `"Rp00rb"`), CTA replaced with "SEGERA HADIR" badge |
| Checkout page | `useEffect` redirects to `/subscription/overview` |
| Payment API | Returns HTTP 403 `"Paket ... sedang tidak tersedia"` |
| Subscription overview | Plan hidden from upgrade cards |
| Plans hub | Price masked, checkout CTA hidden, "SEGERA HADIR" badge shown |

**Price masking:** `price.replace(/\d/g, "0")` — purely frontend cosmetic.

### Gratis Lockdown

The Gratis plan has special protections:
- `price` and `priceValue` are read-only in CMS editor
- `updatePricingPlan` mutation skips `price`/`priceValue` updates for Gratis slug
- `isDisabled` is always `false` (Gratis tier cannot be disabled)

### Constants as Fallback Only

`convex/billing/constants.ts` still contains `SUBSCRIPTION_PRICING`, `CREDIT_PACKAGES`, etc. These are **never used directly** by frontend or API routes. They serve only as fallback values inside:

- `convex/billing/pricingHelpers.ts` — `getBppCreditPackage()`, `getProPricing()` query functions
- `convex/billing/subscriptions.ts` — `resolveSubscriptionPricing()` internal helper

If the DB query returns data, constants are ignored.

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
| `aspectRatio` | `string?` | CSS aspect-ratio (e.g., `"16/9"`, `"4/1"`, `"1/1"`) |
| `fallbackPreviewUrl` | `string?` | Static image URL shown when no CMS image uploaded |
| `generateUploadUrlFn` | `ConvexMutation?` | Custom upload URL mutation (default: `api.pageContent.generateUploadUrl`) |
| `getImageUrlFn` | `ConvexQuery?` | Custom image URL query (default: `api.pageContent.getImageUrl`) |

**Upload Flow:**

```
1. User clicks upload area
2. File input dialog opens
3. File selected → call generateUploadUrlFn mutation
4. Mutation returns Convex storage upload URL
5. POST request to upload URL with file body (`CmsImageUpload`)
6. Validate HTTP response + parse JSON payload
7. Response valid: `{ storageId: "..." }`
8. Call onUpload(storageId)
9. Parent component updates form state
10. On form save → storageId saved to DB record
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
| Manifesto terminal | `primaryImageId` (via items) | `secondaryImageId` (via items) |
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
| Manifesto Terminal | `/images/manifesto-terminal-dark.png` | `/images/manifesto-terminal-light.png` |
| Blog Cover | Dynamic SVG via `createPlaceholderImageDataUri()` | — |

### Image Upload Endpoints Per CMS Area

Different CMS areas use different Convex endpoints for image storage:

```tsx
// Blog images
<CmsImageUpload
  generateUploadUrlFn={api.blog.generateBlogUploadUrl}
  getImageUrlFn={api.blog.getBlogImageUrl}
/>

// Documentation images
<CmsImageUpload
  generateUploadUrlFn={api.documentationSections.generateDocUploadUrl}
  getImageUrlFn={api.documentationSections.getDocImageUrl}
/>

// Default (pageContent images) — no custom props needed
<CmsImageUpload ... />
```

---

## TipTap WYSIWYG Integration

### Admin Editor

**File:** `src/components/admin/cms/TipTapEditor.tsx`

**Extensions:** StarterKit (heading 1-3, bold, italic, lists, blockquote, codeBlock), Link

**Toolbar:**
- Heading 1/2/3
- Bold, Italic
- Bullet list, Ordered list, Blockquote
- Code block
- Link insertion (prompt dialog)
- Undo/Redo

**Note:** Inline image insertion for documentation lives in `src/components/admin/cms/blocks/SectionBlockEditor.tsx` (TipTap + Image extension + upload to Convex storage).

**Props:**
- `content` — JSON string from DB
- `onChange(json: string)` — Callback with stringified TipTap JSON
- `editable` — Optional, default true

### Frontend Renderer

**File:** `src/components/marketing/RichTextRenderer.tsx`

Read-only TipTap instance with StarterKit + Link + Image. Applies prose styling via Tailwind classes on `EditorContent`:
- Headings: `text-narrative`, `tracking-tight`, `text-foreground`
- Body: `text-interface`, `text-sm`, `text-muted-foreground`
- Links: `text-primary`, `underline`
- Code: `rounded-badge`, `bg-muted`, `text-interface`

### Blog Content Migration

Blog posts may store content in `blocks[]` (legacy structured format) or `content` (TipTap JSON string). The CMS editor handles this via `blocksToTipTapJson()` in `BlogPostEditor.tsx`:

```
CMS Editor content resolution:
1. existingPost.content (TipTap JSON) → use directly
2. existingPost.blocks (structured) → convert via blocksToTipTapJson()
3. Neither → empty editor

Frontend blog post display (BlogPostPage):
1. post.content (TipTap JSON) → RichTextRenderer
2. post.blocks (structured) → legacy block renderer
3. Neither → post.excerpt as fallback text
```

The conversion is one-way: once saved from the CMS editor, content is stored as TipTap JSON in the `content` field.

---

## Background Pattern CMS Toggles

Admin can show/hide background patterns (GridPattern, DottedPattern, DiagonalStripes) per page via CMS toggle switches.

### Data Storage

| Page | Storage Location | Section/Key |
|------|-----------------|-------------|
| Home sections | `pageContent` | Each section's own record (via CMS variant components) |
| About sections | `pageContent` | Each section's own record |
| Pricing | `pageContent` | `pricing-page-header` section |
| Documentation | `pageContent` | `docs-page-settings` (sectionType: `"page-settings"`) |
| Blog | `pageContent` | `blog-page-settings` (sectionType: `"page-settings"`) |
| Legal (Privacy/Security/Terms) | `pageContent` | `legal-page-settings` (sectionType: `"page-settings"`) |
| Footer | `siteConfig` | key: `"footer"` |

### Default Behavior (Opt-in vs Opt-out)

Two default strategies depending on whether the pattern was previously hardcoded:

| Strategy | Guard | Default | Used When |
|----------|-------|---------|-----------|
| **Opt-in** | `=== true` | OFF (hidden) | Pattern didn't exist on that page before |
| **Opt-out** | `!== false` | ON (visible) | Pattern was hardcoded and always visible |

**Example — Documentation page:**
- Grid: `=== true` (opt-in, was never shown → default OFF)
- Diagonal: `=== true` (opt-in, was never shown → default OFF)
- Dotted: `!== false` (opt-out, was hardcoded → default ON)

This ensures backward compatibility: existing published sections without the new fields show the same patterns as before.

### Per-Page Pattern Defaults

| Page | Grid Default | Dotted Default | Diagonal Default |
|------|-------------|----------------|-----------------|
| Documentation | OFF | ON | OFF |
| Blog | OFF | ON | OFF |
| Legal | OFF | ON | OFF |
| Footer | ON* | ON* | ON* |
| Pricing | ON* | ON* | ON* |

\* For Footer/Pricing, defaults apply when config/section exists and toggle fields are absent (`!== false`). If config/section record is absent, patterns are not rendered because components guard with `footerConfig != null` / `headerSection != null`.

### Overview Components with Pattern Toggles

Pattern toggles are managed in:
- `CmsPricingOverview`, `CmsDocOverview`, `CmsBlogOverview`, `CmsLegalOverview` (page-level settings).
- Home/About section editors (`HeroSectionEditor`, `BenefitsSectionEditor`, `FeatureShowcaseEditor`, `ManifestoSectionEditor`, `ProblemsSectionEditor`, `AgentsSectionEditor`, `CareerContactEditor`) for per-section patterns.
- `FooterConfigEditor` for footer patterns.

### Frontend Conditional Rendering

CMS variant components and page wrappers query their pattern settings and conditionally render:

```tsx
{content.showGridPattern !== false && <GridPattern className="z-0" />}
{content.showDiagonalStripes !== false && <DiagonalStripes className="..." />}
{content.showDottedPattern !== false && <DottedPattern spacing={24} ... />}
```

Most structured sections now use single CMS renderers (no separate `*Static.tsx` files). Fallback is handled by publish gates and field-level fallback values inside renderers.

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
| `seedPricingPlans.ts` | Pricing tiers (gratis, bpp, pro) with credit packages | Yes (aborts if table already has data) |

**Note:** Blog posts are seeded via `blog.ts` functions (`seedBlogPosts`), not a separate migration file.

Seed publish defaults vary by migration:
- `seedHomeContent`, `seedAboutContent`, `seedRichTextPages`, `seedPolicyContent`: `isPublished: false`.
- `seedDocumentationSections`: `isPublished: true`.
- `seedPricingPlans` / `seedSiteConfig`: no `isPublished` field (different table models).

---

## File Reference Map

### CMS Shell (Layout)

| File | Responsibility |
|------|---------------|
| `src/app/cms/page.tsx` | CMS route entry point (admin gate + renders CmsShell) |
| `src/app/cms/layout.tsx` | Fullscreen `h-dvh` wrapper |
| `src/components/cms/CmsShell.tsx` | 4-column grid orchestrator, all state, `renderEditor()` routing |
| `src/components/cms/CmsActivityBar.tsx` | Vertical icon nav, defines `CmsPageId` type |
| `src/components/cms/CmsSidebar.tsx` | Dynamic sidebar, defines `CmsSectionId` + sub-page types |
| `src/components/cms/CmsTopBar.tsx` | Top bar (expand toggle, theme, dashboard link, user) |
| `src/components/cms/CmsMainOverview.tsx` | Main overview dashboard (all pages status summary, shown when no page selected) |
| `src/components/cms/CmsPageOverview.tsx` | Overview dashboard for Home/Chat/About pages (section list + published status) |
| `src/components/cms/CmsPricingOverview.tsx` | Overview dashboard for Pricing page (plan list + pattern toggles) |
| `src/components/cms/CmsDocOverview.tsx` | Overview dashboard for Documentation page (group list + pattern toggles) |
| `src/components/cms/CmsBlogOverview.tsx` | Overview dashboard for Blog page (category counts + pattern toggles) |
| `src/components/cms/CmsLegalOverview.tsx` | Overview dashboard for Legal page (page status + pattern toggles) |
| `src/components/cms/CmsGlobalLayoutOverview.tsx` | Overview dashboard for Global Layout (config status) |

### Backend (Convex)

| File | Responsibility |
|------|---------------|
| `convex/schema.ts` | All table definitions |
| `convex/pageContent.ts` | Structured section CRUD + image URL resolution |
| `convex/richTextPages.ts` | Rich text page CRUD |
| `convex/siteConfig.ts` | Header/footer config CRUD |
| `convex/pricingPlans.ts` | Pricing plan CRUD + credit packages |
| `convex/billing/pricingHelpers.ts` | DB pricing queries with constant fallback (getBppCreditPackage, getProPricing, isPlanDisabled) |
| `convex/billing/subscriptions.ts` | Subscription mutations using `resolveSubscriptionPricing()` from DB |
| `convex/blog.ts` | Blog post CRUD + cover image handling |
| `convex/documentationSections.ts` | Documentation CRUD + searchText generation |
| `convex/permissions.ts` | `requireRole()` admin check |
| `convex/migrations/*.ts` | Seed and update migration scripts |

### Admin Panel (Editors)

| File | Responsibility |
|------|---------------|
| `src/components/admin/cms/HeroSectionEditor.tsx` | Hero section form |
| `src/components/admin/cms/ChatEmptyStateEditor.tsx` | Chat empty state editor (logo, description lines, starter templates) tanpa default fallback konten/image |
| `src/components/admin/cms/BenefitsSectionEditor.tsx` | Benefits items form |
| `src/components/admin/cms/FeatureShowcaseEditor.tsx` | Workflow/Refrasa features form (reusable) |
| `src/components/admin/cms/ManifestoSectionEditor.tsx` | Manifesto section form |
| `src/components/admin/cms/ProblemsSectionEditor.tsx` | Problems section form |
| `src/components/admin/cms/AgentsSectionEditor.tsx` | Agents section form |
| `src/components/admin/cms/CareerContactEditor.tsx` | Career & contact section form |
| `src/components/admin/cms/PricingPlanEditor.tsx` | Pricing tier editor (gratis/bpp/pro) |
| `src/components/admin/cms/PricingHeaderEditor.tsx` | Pricing header/teaser editor (title, badge, CTA, patterns) |
| `src/components/admin/cms/RichTextPageEditor.tsx` | TipTap page editor (privacy/security/terms) |
| `src/components/admin/cms/HeaderConfigEditor.tsx` | Header nav + logos form |
| `src/components/admin/cms/FooterConfigEditor.tsx` | Footer sections + social + logos form |
| `src/components/admin/cms/DocSectionListEditor.tsx` | Documentation section list (filtered by group) |
| `src/components/admin/cms/DocSectionEditor.tsx` | Documentation section detail editor |
| `src/components/admin/cms/BlogPostListEditor.tsx` | Blog post list (filtered by category) |
| `src/components/admin/cms/BlogPostEditor.tsx` | Blog post detail editor |
| `src/components/admin/cms/TipTapEditor.tsx` | Shared WYSIWYG editor |
| `src/components/admin/cms/CmsImageUpload.tsx` | Shared image upload component |
| `src/components/admin/cms/CmsSaveButton.tsx` | Shared save button (idle → saving → saved states) |
| `src/components/admin/cms/blocks/SectionBlockEditor.tsx` | Documentation section block editor |
| `src/components/admin/cms/blocks/InfoCardBlockEditor.tsx` | Documentation info card block editor |
| `src/components/admin/cms/blocks/CtaCardsBlockEditor.tsx` | Documentation CTA cards block editor |

### Frontend Rendering

| File | Responsibility |
|------|---------------|
| `src/components/marketing/hero/HeroSection.tsx` | Hero wrapper (CMS query + fallback) |
| `src/components/marketing/hero/HeroCMS.tsx` | Hero CMS renderer |
| `src/components/marketing/hero/HeroHeadingSvg.tsx` | Static heading SVG component |
| `src/components/marketing/benefits/BenefitsSectionWrapper.tsx` | Benefits wrapper |
| `src/components/marketing/benefits/BenefitsSection.tsx` | Benefits renderer (supports optional CMS items + internal defaults) |
| `src/components/marketing/features/WorkflowFeatureSection.tsx` | Workflow wrapper |
| `src/components/marketing/features/WorkflowFeatureCMS.tsx` | Workflow CMS renderer |
| `src/components/marketing/features/RefrasaFeatureSection.tsx` | Refrasa wrapper |
| `src/components/marketing/features/RefrasaFeatureCMS.tsx` | Refrasa CMS renderer |
| `src/components/about/ManifestoSection.tsx` | Manifesto wrapper |
| `src/components/about/ManifestoSectionCMS.tsx` | Manifesto CMS renderer |
| `src/components/about/ProblemsSection.tsx` | Problems wrapper |
| `src/components/about/ProblemsSectionCMS.tsx` | Problems CMS renderer |
| `src/components/about/AgentsSection.tsx` | Agents wrapper |
| `src/components/about/AgentsSectionCMS.tsx` | Agents CMS renderer |
| `src/components/about/CareerContactSection.tsx` | Career-Contact wrapper |
| `src/components/about/CareerContactSectionCMS.tsx` | Career-Contact CMS renderer |
| `src/components/marketing/CmsPageWrapper.tsx` | Rich text page wrapper (queries legal-page-settings for patterns) |
| `src/components/marketing/RichTextRenderer.tsx` | TipTap read-only renderer |
| `src/components/marketing/SimplePolicyPage.tsx` | Static policy page layout (queries legal-page-settings for patterns) |
| `src/components/marketing/blog/BlogLandingPage.tsx` | Blog landing page (queries blog-page-settings for patterns) |
| `src/components/marketing/blog/BlogArticlePage.tsx` | Blog article page (post content + page settings) |
| `src/components/marketing/documentation/DocumentationPage.tsx` | Documentation page (queries docs-page-settings for patterns) |
| `src/components/marketing/SectionBackground/index.ts` | Background pattern exports (GridPattern, DottedPattern, DiagonalStripes) |
| `src/components/marketing/pricing-teaser/PricingTeaser.tsx` | Home page pricing teaser (reads from DB) |
| `src/components/marketing/pricing-teaser/TeaserCard.tsx` | Individual teaser card (with price masking) |
| `src/components/marketing/pricing/PricingCard.tsx` | Full pricing page card (with price masking) |
| `src/components/layout/header/GlobalHeader.tsx` | Header with inline CMS fallback |
| `src/components/layout/footer/Footer.tsx` | Footer with inline CMS fallback + pattern toggles from siteConfig |
| `src/components/chat/messages/TemplateGrid.tsx` | Chat empty-state renderer (`chat/chat-empty-state`): CMS-only untuk desktop+mobile, unpublished state renders empty |
| `src/components/chat/ChatWindow.tsx` | Chat page container yang mount `TemplateGrid` untuk desktop+mobile tanpa fallback static |
| `scripts/check-chat-empty-state-no-fallback.sh` | Guard `rg` untuk blok pola fallback/static di scope `chat-empty-state` (runtime + admin editor) |

### Utilities

| File | Responsibility |
|------|---------------|
| `src/components/marketing/blog/utils.ts` | `normalizeCategory()`, `createPlaceholderImageDataUri()` |
| `src/components/marketing/blog/types.ts` | `CanonicalCategory`, `TimeRangeFilter` types |
| `src/components/marketing/pricing-teaser/types.ts` | `TeaserPlan` type (includes `isDisabled`) |

### Page Routes (Consumers)

| File | CMS Pattern Used |
|------|-----------------|
| `src/app/(marketing)/page.tsx` | Wrapper (HeroSection, BenefitsSectionWrapper, WorkflowFeatureSection, RefrasaFeatureSection, PricingTeaser) |
| `src/app/(marketing)/about/page.tsx` | Wrapper (ManifestoSection, ProblemsSection, AgentsSection, CareerContactSection) |
| `src/app/(marketing)/pricing/page.tsx` | Inline (`pricingPlans.getActivePlans`) |
| `src/app/(marketing)/privacy/page.tsx` | CmsPageWrapper |
| `src/app/(marketing)/security/page.tsx` | CmsPageWrapper |
| `src/app/(marketing)/terms/page.tsx` | CmsPageWrapper |
| `src/app/(marketing)/blog/page.tsx` | Component route (`BlogLandingPage`) |
| `src/app/(marketing)/blog/[slug]/page.tsx` | Component route (`BlogArticlePage`) |
| `src/app/(marketing)/documentation/page.tsx` | Component route (`DocumentationPage`) |
| `src/app/chat/page.tsx` | Chat empty-state and conversation page entry (`ChatContainer` with `conversationId=null`) |
| `src/app/chat/[conversationId]/page.tsx` | Chat conversation route (`ChatContainer` with selected conversation) |
| `src/app/(dashboard)/subscription/plans/page.tsx` | Inline (getActivePlans + price masking) |
| `src/app/(dashboard)/subscription/overview/page.tsx` | Inline (getPlanBySlug for upgrade cards) |
| `src/app/(onboarding)/checkout/bpp/page.tsx` | Inline (getBppCreditPackage + disabled guard) |
| `src/app/(onboarding)/checkout/pro/page.tsx` | Inline (getProPricing + disabled guard) |

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

4. **CMS Shell** (register in 3 files):
   - `CmsActivityBar.tsx` — Add page to `CmsPageId` type + icon in `contentPageItems` (if new page)
   - `CmsSidebar.tsx` — Add section to `CmsSectionId` type + section data array + `case` in `renderContent()`
   - `CmsShell.tsx` — Import editor + add routing in `renderEditor()` + add empty state

5. **Frontend Rendering** (`src/components/marketing/`):
   - Create `NewSectionCMS.tsx` (renders from DB, include field-level fallback values if needed)
   - Create `NewSection.tsx` (wrapper with `useQuery`, publish gate, and section visibility behavior)
   - Import wrapper in page route

6. **Seed Data** (`convex/migrations/`):
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

2. Register in CMS Shell:
   - `CmsSidebar.tsx` — Add to `LegalPageId` type (or create new type) + data array
   - `CmsShell.tsx` — Add routing: `activePage === "legal" && activeLegalPage === "new-page" ? <RichTextPageEditor slug="new-page" ... />`

3. Add to `SLUG_TITLES` in `RichTextPageEditor.tsx`

### Adding a new pricing tier

1. **Seed** — Add new plan to `seedPricingPlans.ts`
2. **CMS Sidebar** — Add new section ID to `CmsSectionId` + `PRICING_SECTIONS` array in `CmsSidebar.tsx`
3. **CMS Shell** — Add routing in `renderEditor()` in `CmsShell.tsx`
4. **Frontend** — Plan automatically appears in `getActivePlans()` queries (PricingTeaser, PricingPage, etc.)

### Adding a new blog category

1. Update `CATEGORY_OPTIONS` in `BlogPostEditor.tsx`
2. Add new `BlogCategoryId` value in `CmsSidebar.tsx`
3. Add to `BLOG_CATEGORIES` array in `CmsSidebar.tsx`
4. Add group map entry in `CmsShell.tsx` `renderEditor()` → `categoryMap`
5. Update `CATEGORY_COLORS` in `BlogPostListEditor.tsx`
6. Update `PLACEHOLDER_PALETTE` in `blog/utils.ts` (for cover image placeholder)
7. Update `normalizeCategory()` if legacy names need mapping

### Adding a new documentation group

1. Update `GROUP_OPTIONS` in `DocSectionEditor.tsx`
2. Add new `DocGroupId` value in `CmsSidebar.tsx`
3. Add to `DOC_GROUPS` array in `CmsSidebar.tsx`
4. Add group map entry in `CmsShell.tsx` `renderEditor()` → `groupMap`
5. Update `GROUP_ORDER` in `DocSectionListEditor.tsx`

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
6. "Tersimpan!" feedback after successful save (auto-resets after 2s)
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

The `requireRole` function is in `convex/permissions.ts`. It checks the user's `role` field in the `users` table. Accepts both `"admin"` and `"superadmin"`.

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

### Price Masking (Pricing)

When a plan has `isDisabled: true` (or waitlist mode is active), prices are masked:

```typescript
function maskPrice(price: string): string {
  return price.replace(/\d/g, "0")
}
// "Rp80rb" → "Rp00rb"
```

Used in `TeaserCard.tsx`, `PricingCard.tsx`, and `plans/page.tsx`.
