# Blog Page Styling Extraction — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ekstrak seluruh styling CSS/Tailwind dari halaman blog marketing ke markdown reference file.

**Architecture:** Single markdown file, 33 sections, data-driven dari analisis kode aktual. Bahasa Indonesia, English untuk istilah teknis.

**Output:** `docs/tailwind-styling-consistency/blog-page/blog-page-style.md`

**Reference pattern:** `docs/tailwind-styling-consistency/home-hero/home-hero-style.md`

---

## Task 1-3: Header + Section 1-11 (File table, Page wrapper, Section wrapper, DottedPattern, Container, Grid, Sidebar, Mobile filter button, Mobile Sheet, BlogFiltersPanel container/search/buttons)

Read source files:
- `src/components/marketing/blog/BlogLandingPage.tsx`
- `src/components/marketing/blog/BlogFiltersPanel.tsx`
- `src/components/marketing/SectionBackground/DottedPattern.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/input.tsx`

Extract all class strings, build Property/Class/Value tables.

---

## Task 4-6: Section 12-20 (BlogHeadlineSection loading/empty/card/badge/thumbnail/title/metadata, BlogFeedSection loading/empty/container/row/toggle/expanded, BlogNewsletterSection)

Read source files:
- `src/components/marketing/blog/BlogHeadlineSection.tsx`
- `src/components/marketing/blog/BlogFeedSection.tsx`
- `src/components/marketing/blog/BlogNewsletterSection.tsx`
- `src/components/ui/section-badge.tsx`
- `src/components/ui/section-cta.tsx`
- `src/components/marketing/SectionBackground/DiagonalStripes.tsx`

Include shared component styling with full source attribution.

---

## Task 7-8: Section 21-31 (BlogArticlePage loading/not-found/unpublished/back-link/header/cover/grid/sidebar/share/article-body, BlockRenderer section/infoCard/ctaCards, renderInline)

Read source files:
- `src/components/marketing/blog/BlogArticlePage.tsx`

Document hover states, dark mode variants, responsive breakpoints.

---

## Task 9: Section 32-33 + Review + Commit (Design tokens, Mobile vs Desktop comparison)

Compile all custom CSS classes, CSS variables, animations used.
Build mobile vs desktop comparison table.
Review for completeness and consistency with reference pattern.

Commit:
```bash
git add docs/tailwind-styling-consistency/blog-page/blog-page-style.md
git add docs/plans/2026-02-11-blog-styling-extraction.md
git commit -m "docs: extract blog page styling (33 sections)"
```
