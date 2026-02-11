# Footer README.md Rewrite Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite `src/components/layout/footer/README.md` agar 100% akurat terhadap kode aktual di `Footer.tsx` dan `index.ts`.

**Architecture:** Single-file documentation rewrite. Semua 13 gap dari audit harus ditutup: 5 item salah/outdated, 8 item hilang/tidak terdokumentasi.

**Tech Stack:** Markdown documentation

---

### Task 1: Rewrite section Styling (5 gap salah/outdated)

**Files:**
- Modify: `src/components/layout/footer/README.md`

**Perbaikan:**

| # | README lama (SALAH) | Kode aktual (BENAR) |
|---|---------------------|---------------------|
| 1 | Wrapper: `bg-[#f8f8f8]`, `dark:bg-black` | `bg-background text-foreground` (CSS variable tokens) |
| 2 | Container: `max-w-[1200px] px-6 py-12 md:py-16` | `max-w-7xl px-4 py-6 md:px-8 md:py-8` |
| 3 | Pattern: `.footer-diagonal-stripes` CSS class | `<DiagonalStripes className="opacity-40" />` React component |
| 4 | Border: `border-black/[0.08]`, `dark:border-white/[0.05]` | `h-[0.5px] w-full bg-[color:var(--border-hairline)]` div separator |
| 5 | Dependencies: `lucide-react` (`Twitter`, `Linkedin`, `Instagram`) | `iconoir-react` (`X as XIcon`, `Linkedin`, `Instagram`) |

### Task 2: Tambah section yang hilang (8 gap missing)

**Files:**
- Modify: `src/components/layout/footer/README.md`

**Tambahan:**

| # | Item hilang | Detail dari kode |
|---|-------------|-----------------|
| 6 | Footer background token | `bg-[color:var(--footer-background)]` pada `<footer>` |
| 7 | 16-column grid system | `grid grid-cols-16` pada main grid |
| 8 | Column span layout | Brand: `col-span-16 md:col-span-4`. Links: `col-span-16 md:col-span-7 md:col-start-10 md:grid-cols-3` |
| 9 | Typography classes | Headings: `text-narrative text-[14px] font-medium`. Links: `text-narrative text-[14px] text-muted-foreground`. Copyright: `text-interface text-[12px]` |
| 10 | `DiagonalStripes` dependency | Import dari `@/components/marketing/SectionBackground` |
| 11 | Logo theme switching | Light: `makalah_logo_dark.svg` (block dark:hidden). Dark: `makalah_logo_light.svg` (hidden dark:block) |
| 12 | Responsive behavior | Mobile: centered, stacked. Desktop: flex row, `justify-between` |
| 13 | Social icon sizing | `icon-interface` class (16px) |

### Task 3: Review dan commit

**Step 1:** Verifikasi semua 13 gap tertutup.
**Step 2:** Commit: `docs(footer): rewrite README to match actual implementation`
