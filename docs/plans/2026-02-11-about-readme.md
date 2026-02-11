# About Page README — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tulis README.md komprehensif untuk `src/components/about/` mengikuti pola hero/README.md.

**Architecture:** Single markdown file, ~14 sections, data-driven dari analisis kode aktual. Bahasa Indonesia, English untuk istilah teknis.

**Output:** `src/components/about/README.md`

**Reference pattern:** `src/components/marketing/hero/README.md`

---

## Sections yang harus ditulis:

1. Header + Scope + Struktur (file tree 11 files)
2. Penggunaan + Ekspor (index.ts: types + constants + components)
3. About Route (/about — 4 sections rendered from page.tsx)
4. About Page Layout (page.tsx: ManifestoSection → ProblemsSection → AgentsSection → CareerContactSection)
5. Komponen dan Tanggung Jawab (4 section components + AccordionAbout + ManifestoTerminalPanel + ManifestoMobileAccordion + types + data + icons)
6. Client Components (semua "use client")
7. Perilaku Ringkas (ManifestoSection, ProblemsSection, AgentsSection, CareerContactSection, AccordionAbout, ManifestoMobileAccordion, ManifestoTerminalPanel)
8. Data & Konstanta (data.ts: PROBLEMS_ITEMS, AGENTS_ITEMS, CAREER_CONTACT_ITEMS, AGENT_STATUS_LABELS, types, icons.ts)
9. Konten yang Ditampilkan (manifesto heading/subheading/terminal, problem cards, agent cards, career/contact cards)
10. Manifesto Terminal Panel (stone palette, traffic lights, numbered paragraphs)
11. AccordionAbout System (reusable accordion: Collapsible, icons, badges, anchor scroll, className overrides)
12. Mobile Carousel System (AgentsSection pointer-event swipe, dot indicators)
13. Styling
14. Dependencies
