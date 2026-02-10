# Documentation Page Redesign (Mechanical Grace) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the Documentation page (`/documentation`) from legacy styling to Mechanical Grace design system — 16-column grid, Geist Mono interface typography, hybrid radius, hairline borders, and Amber active-state accents.

**Architecture:** The Documentation page is a single `"use client"` component (~743 lines) in `src/app/(marketing)/documentation/page.tsx`. It has a desktop sidebar (sticky, left), main content area (right), and a mobile Sheet sidebar. Data comes from Convex (`documentationSections.getPublishedSections`). The migration is **purely visual** — all logic (search/stemming, navigation, URL routing) stays untouched. We follow the 5-step protocol from `docs/makalah-design-system/justification-docs/documentation-redesign.md`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui, Convex, Iconoir

**Key References:**
- Justification doc: `docs/makalah-design-system/justification-docs/documentation-redesign.md`
- Design system: `docs/makalah-design-system/` (MANIFESTO, typografi, shape-layout, class-naming-convention, komponen-standar, bahasa-visual, justifikasi-warna)
- Current CSS tokens: `src/app/globals.css` (lines 380-400 radius, 1520-1560 utility classes, 1640-1668 interaction classes)

**Known Token State:**
- `.text-narrative` = Geist Sans ✅
- `.text-interface` = Geist Mono ✅
- `.text-signal` = Geist Mono + uppercase + tracking 0.1em ✅
- `.rounded-shell` = `--radius-xl` (16px) ✅
- `.rounded-action` = `--radius-sm` (4px) ⚠️ *(NOTE: design docs say 8px but CSS maps to 4px — we follow the CSS implementation as source of truth)*
- `.border-hairline` = 0.5px + `--border-hairline` color ✅
- `.border-main` = 1px ✅
- `.hover-slash` = diagonal stripe overlay via `/slash-pattern.svg` ✅
- `.active-nav` = `border-left: 2px solid amber-500` ✅
- `.focus-ring` = Sky/Info ring ✅
- `--header-h` = 54px ✅

**Layout Context:** This page is wrapped by `MarketingLayout` which already renders `GlobalHeader` + `Footer`. The page architecture follows: `GlobalHeader → Sidebar + Side-by-side Layout → Article` (no Hero). Per design spec, documentation uses denser padding (`.p-dense`).

---

## Task 1: Structural — Migrate wrapper to 16-column grid (Sidebar 4 : Content 12)

**Files:**
- Modify: `src/app/(marketing)/documentation/page.tsx` — the outer `<div className="flex min-h-screen">` wrapper and `<aside>` / `<main>` containers

**Step 1: Replace flex wrapper with CSS Grid 16-col**

In `DocumentationContent`, find (around line 337-338):
```tsx
<div className="min-h-screen pt-[var(--header-h)]">
  <div className="flex min-h-screen">
```

Replace with:
```tsx
<div className="min-h-screen pt-[var(--header-h)]">
  <div className="grid grid-cols-1 md:grid-cols-16 min-h-screen">
```

**Step 2: Migrate sidebar `<aside>` to col-span-4 with hairline border**

Find the `<aside>` (around line 338):
```tsx
<aside className="sticky top-[var(--header-h)] hidden h-[calc(100vh-var(--header-h))] w-64 flex-col overflow-y-auto border-r border-border bg-card/30 px-4 py-6 md:flex">
```

Replace with:
```tsx
<aside className="sticky top-[var(--header-h)] hidden h-[calc(100vh-var(--header-h))] flex-col overflow-y-auto border-r border-hairline bg-card/30 px-4 py-6 md:col-span-4 md:flex">
```

Changes:
- Remove `w-64` (grid handles width via `col-span-4`)
- `border-r border-border` → `border-r border-hairline` (0.5px precision hairline)
- Add `md:col-span-4`

**Step 3: Migrate `<main>` to col-span-12**

Find the `<main>` (around line 431):
```tsx
<main className="flex-1 px-4 py-6 md:px-10">
```

Replace with:
```tsx
<main className="col-span-1 px-4 py-6 md:col-span-12 md:px-10">
```

Changes:
- Remove `flex-1` (grid handles sizing)
- Add `col-span-1` (mobile full width) and `md:col-span-12`

**Step 4: Visual verification**

Run: `npm run dev`
- Open `http://localhost:3000/documentation`
- Verify: sidebar sits in left 4 columns, content in right 12 columns
- Verify: hairline border (very thin, 0.5px) between sidebar and content
- Verify: mobile view still hides sidebar (md breakpoint)
- Verify: sidebar is still sticky and scrollable independently

**Step 5: Commit**

```bash
git add src/app/(marketing)/documentation/page.tsx
git commit -m "refactor(docs): migrate documentation layout to 16-column grid

Sidebar uses col-span-4, content uses col-span-12.
Border changed to border-hairline (0.5px) per Mechanical Grace spec."
```

---

## Task 2: Sidebar Navigation — Typography and active state

**Files:**
- Modify: `src/app/(marketing)/documentation/page.tsx` — sidebar navigation group headers, nav items, and active state styling

**Step 1: Migrate sidebar group headers to `.text-signal`**

Find both instances of sidebar group headers (desktop ~line 397, mobile ~line 641):
```tsx
<h3 className="font-hero text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
```

Replace with:
```tsx
<h3 className="text-signal text-[10px] font-bold text-muted-foreground">
```

Changes:
- `font-hero text-xs font-semibold uppercase tracking-[0.2em]` → `text-signal text-[10px] font-bold`
- `.text-signal` already includes: Geist Mono + uppercase + tracking 0.1em
- Size reduced to 10px per typografi.md Label spec
- Weight bumped to bold (700) per Label/Meta spec

**Step 2: Migrate nav item buttons — active state with Amber accent bar**

Find both desktop (~line 409) and mobile (~line 656) nav item buttons. Desktop version:
```tsx
<button
  type="button"
  onClick={() => handleSetActiveSection(item.slug)}
  className={cn(
    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition",
    isActive
      ? "bg-muted/70 text-primary"
      : "text-muted-foreground hover:bg-muted/50"
  )}
>
  {Icon && <Icon className="h-4 w-4 shrink-0" />}
  <span className="flex-1 truncate text-left font-hero">
    {item.title}
  </span>
  {isActive && <NavArrowRight className="h-4 w-4 shrink-0" />}
</button>
```

Replace with:
```tsx
<button
  type="button"
  onClick={() => handleSetActiveSection(item.slug)}
  className={cn(
    "relative flex w-full items-center gap-3 rounded-action px-3 py-2 text-sm transition",
    isActive
      ? "bg-amber-500/5 text-amber-500"
      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
  )}
>
  {isActive && (
    <div className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-amber-500" />
  )}
  {Icon && <Icon className="h-4 w-4 shrink-0" />}
  <span className="text-interface flex-1 truncate text-left">
    {item.title}
  </span>
  {isActive && <NavArrowRight className="h-4 w-4 shrink-0" />}
</button>
```

Changes:
- `rounded-md` → `rounded-action` (Carbon standard for interactive elements)
- Active: `bg-muted/70 text-primary` → `bg-amber-500/5 text-amber-500` + left amber bar
- Added `relative` for absolute-positioned amber bar
- `font-hero` → `text-interface` (semantically correct: Geist Mono for interface elements)
- Inactive hover: added `hover:text-foreground` for better contrast on hover

**Step 3: Apply the same changes to the mobile Sheet sidebar nav items**

Find the mobile nav button (~line 656) and apply identical class changes as Step 2.

Mobile version current:
```tsx
<button
  type="button"
  onClick={() => {
    handleSetActiveSection(item.slug)
    setSidebarOpen(false)
  }}
  className={cn(
    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition",
    isActive
      ? "bg-muted/70 text-primary"
      : "text-muted-foreground hover:bg-muted/50"
  )}
>
  {Icon && <Icon className="h-4 w-4 shrink-0" />}
  <span className="flex-1 truncate text-left font-hero">
    {item.title}
  </span>
  {isActive && <NavArrowRight className="h-4 w-4 shrink-0" />}
</button>
```

Replace with:
```tsx
<button
  type="button"
  onClick={() => {
    handleSetActiveSection(item.slug)
    setSidebarOpen(false)
  }}
  className={cn(
    "relative flex w-full items-center gap-3 rounded-action px-3 py-2 text-sm transition",
    isActive
      ? "bg-amber-500/5 text-amber-500"
      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
  )}
>
  {isActive && (
    <div className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-amber-500" />
  )}
  {Icon && <Icon className="h-4 w-4 shrink-0" />}
  <span className="text-interface flex-1 truncate text-left">
    {item.title}
  </span>
  {isActive && <NavArrowRight className="h-4 w-4 shrink-0" />}
</button>
```

**Step 4: Visual verification**

Run: `npm run dev`
- Open `http://localhost:3000/documentation`
- Verify: group headers are Mono, uppercase, 10px, bold
- Verify: active nav item has 2px amber bar on left side
- Verify: active nav item text is amber-500
- Verify: inactive items show muted color, hover highlights to foreground
- Verify: nav item text is Geist Mono (monospaced)
- Test mobile: resize to <768px, open Sheet sidebar, verify same styling

**Step 5: Commit**

```bash
git add src/app/(marketing)/documentation/page.tsx
git commit -m "refactor(docs): apply Mechanical Grace sidebar nav typography and active states

Group headers use text-signal (Mono/uppercase/bold/10px).
Nav items use text-interface with amber-500 active accent bar.
Applied to both desktop and mobile Sheet sidebar."
```

---

## Task 3: Content Area — Article headers, paragraphs, and inline rendering

**Files:**
- Modify: `src/app/(marketing)/documentation/page.tsx` — article header, section headers, paragraphs, `renderInline` function, and group label

**Step 1: Migrate article header (H1) and group label**

Find the article header area (~line 435-457):
```tsx
<div className="space-y-4">
  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
    {activeContent.group}
  </div>
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
      {(() => {
        const Icon = getIcon(activeContent.headerIcon ?? activeContent.icon)
        return Icon ? <Icon className="h-6 w-6 text-primary" /> : null
      })()}
    </div>
    <div>
      <h1 className="font-heading text-2xl font-semibold text-foreground md:text-3xl">
        {activeContent.title}
      </h1>
    </div>
  </div>
  {activeContent.summary && (
    <p className="text-base leading-relaxed text-muted-foreground">
      {activeContent.summary}
    </p>
  )}
</div>
```

Replace with:
```tsx
<div className="space-y-4">
  <div className="text-signal text-[10px] font-bold text-muted-foreground">
    {activeContent.group}
  </div>
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-action bg-primary/10">
      {(() => {
        const Icon = getIcon(activeContent.headerIcon ?? activeContent.icon)
        return Icon ? <Icon className="h-6 w-6 text-primary" /> : null
      })()}
    </div>
    <div>
      <h1 className="text-interface text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {activeContent.title}
      </h1>
    </div>
  </div>
  {activeContent.summary && (
    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
      {activeContent.summary}
    </p>
  )}
</div>
```

Changes:
- Group label: raw classes → `text-signal text-[10px] font-bold`
- Icon container: `rounded-md` → `rounded-action`
- H1: `font-heading text-2xl font-semibold` → `text-interface text-2xl font-bold tracking-tight` (Geist Mono for doc headers per justification doc spec 1.2)
- Summary: `text-base` → `text-narrative text-sm` (Geist Sans, 14px for narrative content)

**Step 2: Migrate section headers (H2)**

Find the section `<h2>` (~line 530):
```tsx
<h2 className="font-heading text-lg font-semibold text-foreground">
```

Replace with:
```tsx
<h2 className="text-interface text-base font-medium text-foreground">
```

Changes:
- `font-heading text-lg font-semibold` → `text-interface text-base font-medium` (Geist Mono, 16px per H3/Card level in typografi.md — documentation sections are card-level headers)

**Step 3: Migrate content paragraphs**

Find section description and paragraphs (~lines 533-545):
```tsx
{block.description && (
  <p className="text-sm text-muted-foreground">
    {block.description}
  </p>
)}
{block.paragraphs?.map((paragraph, paragraphIndex) => (
  <p
    key={`${block.title}-p-${paragraphIndex}`}
    className="text-sm text-muted-foreground"
  >
```

Replace both with:
```tsx
{block.description && (
  <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
    {block.description}
  </p>
)}
{block.paragraphs?.map((paragraph, paragraphIndex) => (
  <p
    key={`${block.title}-p-${paragraphIndex}`}
    className="text-narrative text-sm leading-relaxed text-muted-foreground"
  >
```

Changes:
- Add `text-narrative` (Geist Sans for narrative content)
- Add `leading-relaxed` for better readability in documentation

**Step 4: Refactor `renderInline` for Mechanical Grace**

Find the `renderInline` function (~line 176-198):
```tsx
const renderInline = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="text-foreground font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded bg-muted px-1 py-0.5 text-xs text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={`${part}-${index}`}>{part}</span>
  })
}
```

Replace with:
```tsx
const renderInline = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="text-narrative font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="text-interface rounded-sm bg-slate-950/10 px-1 py-0.5 text-xs text-foreground dark:bg-slate-950"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={`${part}-${index}`}>{part}</span>
  })
}
```

Changes:
- `<strong>`: add `text-narrative` (Geist Sans for narrative emphasis)
- `<code>`: `rounded bg-muted` → `text-interface rounded-sm bg-slate-950/10 dark:bg-slate-950` (Geist Mono + terminal-style background, with light mode variant using subtle opacity)

**Step 5: Visual verification**

Run: `npm run dev`
- Open `http://localhost:3000/documentation`
- Verify: group label is Mono uppercase (signal style)
- Verify: H1 title is Geist Mono, bold, tracking-tight
- Verify: summary text is Geist Sans (narrative)
- Verify: section H2s are Geist Mono, medium weight
- Verify: paragraph text is Geist Sans (readable body)
- Verify: `**bold text**` renders in Sans semibold
- Verify: `` `code text` `` renders in Mono with dark terminal-like background
- Test dark mode: toggle theme and verify code blocks have `bg-slate-950`

**Step 6: Commit**

```bash
git add src/app/(marketing)/documentation/page.tsx
git commit -m "refactor(docs): apply Mechanical Grace content typography

H1 uses text-interface (Mono/bold/tracking-tight).
H2 uses text-interface (Mono/medium).
Paragraphs use text-narrative (Sans).
Code inline uses text-interface with terminal-style bg.
Group labels use text-signal."
```

---

## Task 4: Info Cards and CTA Cards — Shell radius, Sky accent, hover-slash

**Files:**
- Modify: `src/app/(marketing)/documentation/page.tsx` — `infoCard` block rendering and `ctaCards` block rendering

**Step 1: Migrate Info Cards**

Find the infoCard block rendering (~line 461-488):
```tsx
if (block.type === "infoCard") {
  return (
    <div
      key={`${block.type}-${index}`}
      className="rounded-lg border border-border bg-card/70"
    >
      <div className="border-l-4 border-primary px-5 py-4">
        <h2 className="font-heading text-lg font-semibold text-primary">
          {block.title}
        </h2>
        {block.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {block.description}
          </p>
        )}
      </div>
      <div className="px-5 pb-5 pt-4">
        <ul className="space-y-2 text-sm text-muted-foreground">
          {block.items.map((item, itemIndex) => (
            <li key={`${block.title}-${itemIndex}`} className="relative pl-4">
              <span className="absolute left-0 top-1 text-primary">•</span>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

Replace with:
```tsx
if (block.type === "infoCard") {
  return (
    <div
      key={`${block.type}-${index}`}
      className="rounded-shell border-main border border-info/20 bg-info/5"
    >
      <div className="border-l-4 border-info px-5 py-4">
        <h2 className="text-interface text-base font-medium text-info">
          {block.title}
        </h2>
        {block.description && (
          <p className="text-narrative mt-1 text-sm text-muted-foreground">
            {block.description}
          </p>
        )}
      </div>
      <div className="px-5 pb-5 pt-4">
        <ul className="space-y-2 text-narrative text-sm text-muted-foreground">
          {block.items.map((item, itemIndex) => (
            <li key={`${block.title}-${itemIndex}`} className="relative pl-4">
              <span className="absolute left-0 top-1 text-info">•</span>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

Changes:
- Container: `rounded-lg border border-border bg-card/70` → `rounded-shell border-main border border-info/20 bg-info/5` (16px radius, Sky-tinted border + bg for system info)
- Left accent: `border-primary` → `border-info` (Sky for info cards per spec 1.1)
- Title: `font-heading text-lg font-semibold text-primary` → `text-interface text-base font-medium text-info` (Mono, Sky color)
- Description: add `text-narrative`
- Bullet: `text-primary` → `text-info` (Sky)
- List: add `text-narrative`

**Step 2: Migrate CTA Cards with hover-slash and bento grid**

Find the ctaCards block rendering (~line 491-525):
```tsx
if (block.type === "ctaCards") {
  return (
    <div
      key={`${block.type}-${index}`}
      className="grid gap-4 sm:grid-cols-2"
    >
      {block.items.map((item) => {
        const Icon = getIcon(item.icon)
        return (
          <button
            key={item.title}
            type="button"
            onClick={() => handleSetActiveSection(item.targetSection)}
            className="group flex h-full flex-col rounded-lg border border-border bg-card px-5 py-4 text-left transition hover:-translate-y-0.5 hover:bg-card/80"
          >
            <div className="mb-4">
              {Icon && (
                <Icon className="mb-3 h-7 w-7 text-primary" />
              )}
              <h3 className="font-heading text-base font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
            <div className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-primary">
              {item.ctaText}
              <NavArrowRight className="h-4 w-4" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
```

Replace with:
```tsx
if (block.type === "ctaCards") {
  return (
    <div
      key={`${block.type}-${index}`}
      className="grid gap-4 sm:grid-cols-2"
    >
      {block.items.map((item) => {
        const Icon = getIcon(item.icon)
        return (
          <button
            key={item.title}
            type="button"
            onClick={() => handleSetActiveSection(item.targetSection)}
            className="hover-slash group flex h-full flex-col rounded-shell border border-main bg-card px-5 py-4 text-left transition hover:border-primary/30"
          >
            <div className="relative z-10 mb-4">
              {Icon && (
                <Icon className="mb-3 h-7 w-7 text-primary" />
              )}
              <h3 className="text-interface text-sm font-medium text-foreground">
                {item.title}
              </h3>
              <p className="text-narrative mt-1 text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
            <div className="text-signal relative z-10 mt-auto inline-flex items-center gap-2 text-xs text-primary">
              {item.ctaText}
              <NavArrowRight className="h-4 w-4" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
```

Changes:
- Container: `rounded-lg border border-border` → `rounded-shell border border-main` (16px shell radius)
- Added `hover-slash` class (diagonal stripe hover effect)
- Removed `hover:-translate-y-0.5 hover:bg-card/80` (Mechanical Grace uses slash texture, not translate animation)
- Added `hover:border-primary/30` for subtle amber border on hover
- Inner content: added `relative z-10` to sit above the slash overlay
- Title: `font-heading text-base font-semibold` → `text-interface text-sm font-medium` (Mono)
- Description: add `text-narrative`
- CTA text: `text-sm font-semibold` → `text-signal text-xs` (Mono + uppercase + tracking)

**Step 3: Visual verification**

Run: `npm run dev`
- Open `http://localhost:3000/documentation`, navigate to a section with infoCard blocks
- Verify: info cards have 16px radius, Sky-blue tint (border + background)
- Verify: info card title is Mono, Sky color
- Verify: CTA cards have 16px radius, diagonal stripe pattern on hover
- Verify: CTA card hover shows subtle amber border glow
- Verify: CTA text is uppercase Mono
- Test dark mode: verify info cards and CTA cards look correct

**Step 4: Commit**

```bash
git add src/app/(marketing)/documentation/page.tsx
git commit -m "refactor(docs): apply Mechanical Grace to info cards and CTA cards

Info cards use rounded-shell with Sky/info accent.
CTA cards use rounded-shell with hover-slash pattern.
Typography migrated to text-interface/text-narrative/text-signal."
```

---

## Task 5: Search Interface — Input, results dropdown, and mobile search

**Files:**
- Modify: `src/app/(marketing)/documentation/page.tsx` — desktop search input, search results dropdown, mobile Sheet search

**Step 1: Migrate desktop search input**

Find the desktop search container (~line 339-351):
```tsx
<div className="mb-6 rounded-lg bg-background/70 px-3 py-3">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <input
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && results.length > 0) {
          handleSetActiveSection(results[0].id)
        }
      }}
      placeholder="Cari dokumentasi..."
      className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  </div>
```

Replace with:
```tsx
<div className="mb-6 rounded-action bg-background/70 px-3 py-3">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <input
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && results.length > 0) {
          handleSetActiveSection(results[0].id)
        }
      }}
      placeholder="Cari dokumentasi..."
      className="text-interface focus-ring h-10 w-full rounded-action border-main border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-info focus:outline-none focus:ring-2 focus:ring-info/20"
    />
  </div>
```

Changes:
- Outer container: `rounded-lg` → `rounded-action`
- Input: `rounded-md` → `rounded-action`, add `text-interface` (Mono), add `focus-ring`
- Focus: `focus:border-primary focus:ring-primary/20` → `focus:border-info focus:ring-info/20` (Sky focus ring per Mechanical Grace)
- Add `border-main` for 1px standard border

**Step 2: Migrate desktop search results dropdown**

Find results dropdown (~line 354-391):
```tsx
{query.length > 0 && (
  <div className="mt-2 rounded-md border border-border bg-card/70">
    {results.length === 0 ? (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        Tidak ada hasil yang cocok
      </div>
    ) : (
      <ul className="max-h-56 overflow-auto">
        {results.map((result) => (
          <li key={result.id}>
            <button
              type="button"
              onClick={() => handleSetActiveSection(result.id)}
              className={cn(
                "w-full px-3 py-2 text-left text-xs transition hover:bg-muted/50",
                activeSection === result.id && "bg-muted/70"
              )}
            >
              <div className="font-medium text-foreground">{result.title}</div>
```

Replace with:
```tsx
{query.length > 0 && (
  <div className="mt-2 rounded-action border-main border border-border bg-card/70">
    {results.length === 0 ? (
      <div className="text-interface px-3 py-2 text-xs text-muted-foreground">
        Tidak ada hasil yang cocok
      </div>
    ) : (
      <ul className="max-h-56 overflow-auto">
        {results.map((result) => (
          <li key={result.id}>
            <button
              type="button"
              onClick={() => handleSetActiveSection(result.id)}
              className={cn(
                "w-full px-3 py-2 text-left text-xs transition hover:bg-muted/50",
                activeSection === result.id && "bg-muted/70"
              )}
            >
              <div className="text-interface font-medium text-foreground">{result.title}</div>
```

And find the footer hint (~line 387):
```tsx
<div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
  Tekan Enter untuk membuka hasil teratas
</div>
```

Replace with:
```tsx
<div className="text-interface border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
  Tekan Enter untuk membuka hasil teratas
</div>
```

Changes:
- Results container: `rounded-md` → `rounded-action`, add `border-main`
- Empty state: add `text-interface`
- Result title: add `text-interface`
- Footer hint: add `text-interface`

**Step 3: Migrate mobile Sheet search input**

Find the mobile Sheet search input (~line 622-634):
```tsx
<input
  value={query}
  onChange={(event) => setQuery(event.target.value)}
  onKeyDown={(event) => {
    if (event.key === "Enter" && results.length > 0) {
      handleSetActiveSection(results[0].id)
      setSidebarOpen(false)
    }
  }}
  placeholder="Cari dokumentasi..."
  className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
/>
```

Replace with:
```tsx
<input
  value={query}
  onChange={(event) => setQuery(event.target.value)}
  onKeyDown={(event) => {
    if (event.key === "Enter" && results.length > 0) {
      handleSetActiveSection(results[0].id)
      setSidebarOpen(false)
    }
  }}
  placeholder="Cari dokumentasi..."
  className="text-interface focus-ring h-10 w-full rounded-action border-main border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-info focus:outline-none focus:ring-2 focus:ring-info/20"
/>
```

**Step 4: Migrate mobile Sheet search results**

Find mobile results container (~line 675):
```tsx
<div className="mt-4 rounded-md border border-border bg-card/60">
  <div className="px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
    Hasil pencarian
  </div>
```

Replace with:
```tsx
<div className="mt-4 rounded-action border-main border border-border bg-card/60">
  <div className="text-signal px-3 py-2 text-[10px] font-bold text-muted-foreground">
    Hasil pencarian
  </div>
```

And find mobile result item button (~line 693):
```tsx
className={cn(
  "w-full rounded px-2 py-2 text-left text-xs transition hover:bg-muted/50",
  activeSection === result.id && "bg-muted/70"
)}
>
  <div className="font-medium text-foreground">{result.title}</div>
```

Replace with:
```tsx
className={cn(
  "w-full rounded-action px-2 py-2 text-left text-xs transition hover:bg-muted/50",
  activeSection === result.id && "bg-muted/70"
)}
>
  <div className="text-interface font-medium text-foreground">{result.title}</div>
```

**Step 5: Visual verification**

Run: `npm run dev`
- Open `http://localhost:3000/documentation`
- Verify: search input has Mono font, 4px radius
- Verify: focus ring is Sky/Info colored (not primary amber)
- Type a search query, verify results dropdown has 4px radius
- Verify: result titles are Mono font
- Test mobile: open Sheet, verify same search styling
- Verify: "Hasil pencarian" label is Signal style (Mono, uppercase)

**Step 6: Commit**

```bash
git add src/app/(marketing)/documentation/page.tsx
git commit -m "refactor(docs): apply Mechanical Grace to search interface

Search inputs use text-interface + rounded-action + focus-ring (Sky).
Results dropdowns use rounded-action with Mono typography.
Applied to both desktop and mobile Sheet."
```

---

## Task 6: Mobile Navigation Buttons and Loading State

**Files:**
- Modify: `src/app/(marketing)/documentation/page.tsx` — mobile prev/next buttons, loading state, and empty state

**Step 1: Migrate mobile prev/next navigation buttons**

Find the mobile navigation buttons (~line 576-607):
```tsx
<div className="flex items-center justify-between border-t border-border pt-4 md:hidden">
  <button
    type="button"
    className={cn(
      "inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold",
      previousSection
        ? "text-foreground"
        : "cursor-not-allowed text-muted-foreground"
    )}
    onClick={() =>
      previousSection && handleSetActiveSection(previousSection.slug)
    }
    disabled={!previousSection}
  >
    <NavArrowLeft className="h-4 w-4" />
    Kembali
  </button>
  <button
    type="button"
    className={cn(
      "inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold",
      nextSection
        ? "text-foreground"
        : "cursor-not-allowed text-muted-foreground"
    )}
    onClick={() => nextSection && handleSetActiveSection(nextSection.slug)}
    disabled={!nextSection}
  >
    Lanjut
    <NavArrowRight className="h-4 w-4" />
  </button>
</div>
```

Replace with:
```tsx
<div className="flex items-center justify-between border-t border-hairline pt-4 md:hidden">
  <button
    type="button"
    className={cn(
      "text-signal inline-flex items-center gap-2 rounded-action border-main border px-3 py-2 text-[10px]",
      previousSection
        ? "border-border text-foreground"
        : "cursor-not-allowed border-border/50 text-muted-foreground"
    )}
    onClick={() =>
      previousSection && handleSetActiveSection(previousSection.slug)
    }
    disabled={!previousSection}
  >
    <NavArrowLeft className="h-4 w-4" />
    Kembali
  </button>
  <button
    type="button"
    className={cn(
      "text-signal inline-flex items-center gap-2 rounded-action border-main border px-3 py-2 text-[10px]",
      nextSection
        ? "border-border text-foreground"
        : "cursor-not-allowed border-border/50 text-muted-foreground"
    )}
    onClick={() => nextSection && handleSetActiveSection(nextSection.slug)}
    disabled={!nextSection}
  >
    Lanjut
    <NavArrowRight className="h-4 w-4" />
  </button>
</div>
```

Changes:
- Separator: `border-t border-border` → `border-t border-hairline` (0.5px)
- Buttons: `rounded-md border border-border text-xs font-semibold` → `text-signal rounded-action border-main border text-[10px]` (Signal style: Mono + uppercase + tracking)

**Step 2: Migrate loading state**

Find `DocumentationLoading` (~line 724-735):
```tsx
function DocumentationLoading() {
  return (
    <div className="min-h-screen pt-[var(--header-h)]">
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshDouble className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat dokumentasi...</p>
        </div>
      </div>
    </div>
  )
}
```

Replace with:
```tsx
function DocumentationLoading() {
  return (
    <div className="min-h-screen pt-[var(--header-h)]">
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshDouble className="h-8 w-8 animate-spin text-primary" />
          <p className="text-interface text-xs uppercase tracking-widest text-muted-foreground">
            Memuat dokumentasi...
          </p>
        </div>
      </div>
    </div>
  )
}
```

Changes:
- Loading text: `text-sm text-muted-foreground` → `text-interface text-xs uppercase tracking-widest` (diagnostic/signal style per bahasa-visual.md "Thinking State")

**Step 3: Migrate content loading/empty state**

Find the empty state (~line 610):
```tsx
<div className="rounded-lg border border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
  Dokumentasi sedang dimuat.
</div>
```

Replace with:
```tsx
<div className="rounded-shell border-main border border-border bg-card/60 p-6 text-center">
  <p className="text-interface text-xs uppercase tracking-widest text-muted-foreground">
    Dokumentasi sedang dimuat.
  </p>
</div>
```

Changes:
- Container: `rounded-lg` → `rounded-shell` (16px)
- Add `border-main`
- Text: diagnostic style (Mono, uppercase, small, tracked)

**Step 4: Visual verification**

Run: `npm run dev`
- Open `http://localhost:3000/documentation` on mobile viewport
- Verify: prev/next buttons are Mono uppercase, 4px radius
- Verify: hairline border separator (very thin, 0.5px)
- Verify: loading state shows Mono uppercase text
- Verify: empty/loading card has 16px radius

**Step 5: Commit**

```bash
git add src/app/(marketing)/documentation/page.tsx
git commit -m "refactor(docs): finalize Mechanical Grace migration for documentation page

Mobile nav buttons use text-signal + rounded-action.
Loading/empty states use diagnostic Mono typography.
All border separators migrated to hairline."
```

---

## Task 7: Build Verification and Lint Check

**Files:**
- No file changes — verification only

**Step 1: Run lint**

Run: `npm run lint`
Expected: No new errors introduced. All existing patterns preserved.

**Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

**Step 3: Full visual audit against checklist**

Open `http://localhost:3000/documentation` and verify each item from the justification doc checklist:

- [ ] **Grid Audit**: Sidebar and Content aligned to 16-column split (4:12)
- [ ] **Typo Audit**: Nav & Code use Geist Mono. Paragraphs use Geist Sans
- [ ] **Radius Audit**: Info cards = 16px. Nav items/Input = 4px (rounded-action)
- [ ] **Border Audit**: Sidebar vertical border is hairline (0.5px)
- [ ] **Color Audit**: Active nav uses Amber 500 accent. Info Cards use Sky 500
- [ ] **Interaction Audit**: Only CTA cards use `.hover-slash`. Nav items do NOT
- [ ] **Search Audit**: Input uses rounded-action and Mono typography
- [ ] **Dark Mode**: Toggle theme, verify all elements adapt correctly
- [ ] **Mobile**: Resize to mobile, verify Sheet sidebar and prev/next buttons

**Step 4: Commit (if any fixes needed)**

```bash
git add src/app/(marketing)/documentation/page.tsx
git commit -m "fix(docs): address lint/build issues from documentation redesign"
```

Only commit if fixes were made. If build passes clean, skip this step.

---

## Summary

| Task | Scope | Est. Complexity |
|------|-------|----------------|
| 1 | Grid 16-col layout | Low |
| 2 | Sidebar nav typography + active state | Medium |
| 3 | Content area typography + renderInline | Medium |
| 4 | Info cards + CTA cards | Medium |
| 5 | Search interface (desktop + mobile) | Medium |
| 6 | Mobile nav buttons + loading states | Low |
| 7 | Build verification + visual audit | Low |

All tasks modify a single file: `src/app/(marketing)/documentation/page.tsx`. No new files created. No logic changes — purely visual migration.
