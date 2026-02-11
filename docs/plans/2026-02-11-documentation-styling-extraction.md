# Documentation Page Styling Extraction — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ekstrak seluruh styling CSS/Tailwind dari halaman dokumentasi marketing ke markdown reference file.

**Architecture:** Single markdown file, 23 sections, data-driven dari analisis kode aktual. Bahasa Indonesia, English untuk istilah teknis.

**Output:** `docs/tailwind-styling-consistency/documentation-page/documentation-page-style.md`

**Reference pattern:** `docs/tailwind-styling-consistency/home-hero/home-hero-style.md`

---

## Task 1-3: Header + Section 1-8 (File table, Section wrapper, DottedPattern, Container, Grid, Sidebar card, Search input, Search results)

Read source files:
- `src/components/marketing/documentation/DocumentationPage.tsx`
- `src/components/marketing/documentation/DocSidebar.tsx`
- `src/components/marketing/SectionBackground/DottedPattern.tsx`

Extract all class strings, build Property/Class/Value tables.

---

## Task 4-6: Section 9-15 (Nav groups, Nav items, Mobile button, Mobile Sheet, Article container, Article header, infoCard)

Read source files:
- `src/components/marketing/documentation/DocSidebar.tsx`
- `src/components/marketing/documentation/DocArticle.tsx`
- `src/components/ui/section-badge.tsx`
- `src/components/ui/sheet.tsx`

Include shared component styling with full source attribution.

---

## Task 7-8: Section 16-21 (ctaCards, section block, renderInline, Prev/Next nav, Empty state, Loading state)

Read source files:
- `src/components/marketing/documentation/DocArticle.tsx`
- `src/components/marketing/documentation/utils.tsx`
- `src/components/marketing/documentation/DocumentationPage.tsx`

Document hover states, dark mode variants, responsive breakpoints.

---

## Task 9: Section 22-23 + Review + Commit (Design tokens, Mobile vs Desktop comparison)

Compile all custom CSS classes, CSS variables, animations used.
Build mobile vs desktop comparison table.
Review for completeness and consistency with reference pattern.

Commit:
```bash
git add docs/tailwind-styling-consistency/documentation-page/documentation-page-style.md
git add docs/plans/2026-02-11-documentation-styling-extraction.md
git commit -m "docs: extract documentation page styling (23 sections, 1000+ lines)"
```
