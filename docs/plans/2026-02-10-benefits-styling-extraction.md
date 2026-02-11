# Benefits Styling Extraction Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract all CSS/Tailwind styling from home benefits section into `home-benefits-style.md`.

**Architecture:** Single markdown file documenting every class, token, and CSS variable used across all benefits components + shared dependencies (SectionBadge, SectionCTA, SectionBackground).

**Tech Stack:** Markdown documentation only. No code changes.

---

### Task 1: Write home-benefits-style.md

**Files:**
- Create: `docs/tailwind-styling-consistency/home-benefits/home-benefits-style.md`

**Sections to cover (component-by-component):**

1. Section Wrapper (BenefitsSection.tsx) — section element, inner container, grid
2. Background Layers — DiagonalStripes + DottedPattern (with props, z-index)
3. Content Grid — 16-col layout, col-span centering
4. BenefitsBadge — SectionBadge internals (emerald bg, amber dot, text-signal)
5. BenefitsTitle — h2 classes
6. BentoBenefitsGrid — container, card, heading, dot, description
7. BenefitsAccordion — container, accordion, item, trigger, dot, title, content, description
8. DocsCTA — wrapper + SectionCTA internals (btn-stripes-pattern, inverted theme)
9. Shared Tokens — amber dot, text-narrative/text-interface, gap-comfort, p-comfort
10. CSS Variables — --section-bg-alt (light/dark), bento token definitions (legacy/unused)
11. Custom CSS Classes — btn-stripes-pattern, rounded-shell/action/badge, border-hairline, text-narrative/interface/signal
12. Desktop vs Mobile Comparison — side-by-side differences
13. Bento Grid vs Accordion Comparison — card shape, hover, typography, data format
