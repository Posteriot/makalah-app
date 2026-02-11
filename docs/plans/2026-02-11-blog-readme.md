# Blog Section README — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tulis README.md komprehensif untuk `src/components/marketing/blog/` mengikuti pola hero/README.md.

**Architecture:** Single markdown file, ~15 sections, data-driven dari analisis kode aktual. Bahasa Indonesia, English untuk istilah teknis.

**Output:** `src/components/marketing/blog/README.md`

**Reference pattern:** `src/components/marketing/hero/README.md`

---

## Sections yang harus ditulis:

1. Header + Scope + Struktur (file tree 11 files)
2. Penggunaan + Ekspor (index.ts: 6 exports)
3. Blog Routes (2 routes: /blog dan /blog/[slug])
4. Blog Landing Layout (BlogLandingPage: grid, sidebar, headline, feed, newsletter, mobile Sheet)
5. Komponen dan Tanggung Jawab (8 components + types + utils)
6. Client Components (semua "use client")
7. Perilaku Ringkas (BlogLandingPage, BlogArticlePage, BlogHeadlineSection, BlogFeedSection, BlogFiltersPanel, BlogNewsletterSection)
8. Data & Konstanta (Convex queries, CATEGORY_OPTIONS, TIME_RANGE_OPTIONS, SORT_OPTIONS, PLACEHOLDER_PALETTE)
9. Konten yang Ditampilkan (headline card, feed rows, article blocks, filter groups, newsletter)
10. Article Page States (loading skeleton, not found, unpublished, content)
11. Block Renderer (BlogArticlePage's local renderInline + BlockRenderer: section, infoCard, ctaCards)
12. Placeholder Image System (SVG data URI generator, category palettes)
13. Styling
14. Dependencies
