# About Page Redesign

## Overview

Redesain halaman About (`/about`) dengan menerapkan design style dari Pricing page. Fokus pada konsistensi visual, migrasi dari custom CSS ke Tailwind classes, dan penggunaan React background components.

## Design Decisions

### 1. No Hero Section
- Halaman langsung dimulai dengan Manifesto section
- Tidak ada full-viewport hero seperti homepage
- `paddingTop: calc(var(--header-h) + 60px)` untuk ruang header

### 2. Uniform Background Pattern
- Semua section menggunakan `GridPattern` + `DottedPattern` components
- Background base: `bg-muted/30 dark:bg-black`
- Konsisten dengan Pricing page

### 3. Typography System
- Headings: `font-mono text-3xl md:text-4xl lg:text-5xl`
- Subheadings: `font-mono text-sm md:text-base text-muted-foreground`
- Body: `font-mono text-base`
- Section labels: `SectionBadge` component

### 4. Card Styling (PricingCard-inspired)
- Border: `border border-black/20 dark:border-white/25`
- Hover background: `hover:bg-bento-light-hover dark:hover:bg-bento-hover`
- Hover transform: `hover:-translate-y-1 transition-all duration-300`
- Hover border: `hover:border-black/30 dark:hover:border-white/35`

## Section Structure

### Section 1: Manifesto (First Section)
- **Badge**: "Tentang Kami"
- **Heading**: "AI Yang Menumbuhkan Pikiran"
- **Subheading**: "Teknologi tidak menggantikan manusia, melainkan melengkapi agar kian berdaya"
- **Content**: Collapsible manifesto text (Radix Collapsible)
- **CTA**: Dipindah ke section terakhir

### Section 2: Problems
- **Badge**: "Persoalan"
- **Heading**: "Apa Saja Persoalan Yang Dijawab?"
- **Desktop**: 2-column grid of cards (6 items)
- **Mobile**: Accordion view
- **Cards**: Icon + title + description

### Section 3: Agents
- **Badge**: "AI Agents"
- **Heading**: "Fitur & Pengembangan"
- **Desktop**: 2-column grid with status badges
- **Mobile**: Accordion with icons and badges
- **Status badges**:
  - Available: `bg-emerald-600 text-white`
  - In Progress: `bg-black/5 dark:bg-white/5 text-muted-foreground`

### Section 4: Career & Contact + CTA
- **Badge**: "Karier & Kontak"
- **Heading**: "Bergabung atau Hubungi Kami"
- **Desktop**: 2-column grid (Karier, Kontak)
- **Mobile**: Accordion
- **CTA Section**:
  - Text: "Ada pertanyaan? Hubungi kami"
  - Button: Brand-colored, shadow, hover effects
  - Link: Gmail compose URL

## Files to Modify

### Refactor (CSS → Tailwind)
- `src/app/(marketing)/about/page.tsx`
- `src/components/about/ManifestoSection.tsx`
- `src/components/about/ProblemsSection.tsx`
- `src/components/about/AgentsSection.tsx`
- `src/components/about/CareerContactSection.tsx`
- `src/components/about/ContentCard.tsx`
- `src/components/about/AccordionAbout.tsx`

### Delete
- `src/components/about/HeroSection.tsx`

### CSS Cleanup (globals.css)
Remove these class blocks:
- `.hero-section` and related (~996-1168)
- `.manifesto-section`, `.manifesto-container`, `.manifesto-trigger-*` (~1522-1620)
- `.prose`, `.prose-invert` (~1532-1558)
- `.content-card`, `.card-*` (~1628-1714)
- `.section-heading`

### Keep
- `.section-full` (still useful)
- CSS variables
- Header/footer CSS

## Component Dependencies

### From marketing/SectionBackground
- `GridPattern` - Grid overlay pattern
- `DottedPattern` - Dotted overlay pattern

### From ui
- `SectionBadge` - Category label badge
- `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` - Radix primitives
- `Badge` - Status badges for agents

## Anchor IDs (Preserved for Footer Links)
- `#bergabung-dengan-tim` (Karier card)
- `#hubungi-kami` (Kontak card)
- `#karier-kontak` (Section)

## Visual Reference
- Primary reference: `src/app/(marketing)/pricing/page.tsx`
- Card reference: `src/components/marketing/pricing/PricingCard.tsx`
