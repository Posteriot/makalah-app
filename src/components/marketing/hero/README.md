# Hero Section

Section hero untuk marketing page (`/`).

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan sumber konten tanpa baca semua file satu per satu. Semua poin di bawah ini sesuai dengan isi file di `src/components/marketing/hero`.

## Struktur

```
hero/
├── index.ts              # Re-exports semua komponen
├── PawangBadge.tsx       # Badge hero (delegate ke SectionBadge)
├── HeroHeading.tsx       # Heading utama (SR text + SVG images)
├── HeroHeadingSvg.tsx    # Theme-aware heading via next/image (light/dark SVG)
├── HeroSubheading.tsx    # Subheading/tagline
├── HeroCTA.tsx           # CTA utama (delegate ke SectionCTA, smart route)
├── HeroResearchMock.tsx  # Mockup progress riset (back layer, z-10)
├── ChatInputHeroMock.tsx # Mockup input chat (front layer, z-20)
└── README.md             # Dokumentasi ini
```

## Penggunaan

```tsx
import {
  PawangBadge,
  HeroHeading,
  HeroSubheading,
  HeroCTA,
  HeroResearchMock,
  ChatInputHeroMock,
} from "@/components/marketing/hero"
```

Integrasi utamanya ada di `src/app/(marketing)/page.tsx`.

## Ekspor (index.ts)

- `PawangBadge`
- `HeroHeading`
- `HeroHeadingSvg`
- `HeroSubheading`
- `HeroCTA`
- `HeroResearchMock`
- `ChatInputHeroMock`

## Hero Layout (page.tsx)

- Section wrapper: `relative isolate min-h-[100svh] overflow-hidden bg-background`.
- Background layers (bottom to top): `GridPattern` (opacity-80) + `DiagonalStripes` (opacity-80).
- Content container: `max-w-7xl`, centered, flex, responsive padding `px-4 py-10 md:px-8 md:py-24`.
- Grid: `grid-cols-1 gap-comfort lg:grid-cols-16 lg:gap-16`.
- Hero left (text): `lg:col-span-7`, flex column, items-start.
- Hero right (mockup): `hidden lg:flex lg:col-span-9`, relative container `h-[480px] max-w-[560px]`.
- Mockup hidden di bawah breakpoint `lg`.

## Komponen dan Tanggung Jawab

- `PawangBadge.tsx`: server component, delegates ke `SectionBadge` (dari `@/components/ui/section-badge`) dengan `href="/about"` dan `className="mb-4"`.
- `HeroHeading.tsx`: server component, heading `h1` dengan text SR (`sr-only`) dan render visual via `HeroHeadingSvg`.
- `HeroHeadingSvg.tsx`: server component, menampilkan heading sebagai 2 file SVG image via `next/image` (`heading-light-color.svg` untuk dark mode, `heading-dark-color.svg` untuk light mode). Theme switch via `hidden dark:block` / `block dark:hidden`. Kedua image diberi `priority` flag untuk LCP optimization. Container max-w `520px`.
- `HeroSubheading.tsx`: server component, teks subheading/tagline (Geist Sans via `text-narrative`).
- `HeroCTA.tsx`: client component, delegates ke `SectionCTA` (dari `@/components/ui/section-cta`), menentukan route berdasar status auth + onboarding.
- `HeroResearchMock.tsx`: client component, mockup progress riset/paper (timeline + progress bar), data statik. Permanent dark theme (Stone-800). Z-layer: `z-10` (back).
- `ChatInputHeroMock.tsx`: client component, mockup input chat dengan animasi typewriter + cursor + click. Permanent light-ish theme (Stone-200). Z-layer: `z-20` (front).

## Client Components

Komponen yang memakai `"use client"`:
- `HeroCTA.tsx`
- `HeroResearchMock.tsx`
- `ChatInputHeroMock.tsx`

Server components (tanpa `"use client"`):
- `PawangBadge.tsx`
- `HeroHeading.tsx`
- `HeroHeadingSvg.tsx`
- `HeroSubheading.tsx`

## Perilaku Ringkas

**HeroCTA**
- Not signed in: `/sign-up`
- Signed in + onboarding selesai: `/chat`
- Signed in + onboarding belum selesai: `/get-started`
- `aria-busy` aktif saat loading auth/onboarding.
- Delegates rendering ke `SectionCTA` yang punya stripes animation dan inverted slate button pattern.

**ChatInputHeroMock**
- Siklus animasi: placeholder, typing, hold, cursorMove, hover, click, reset, return (loop).
- Menghormati `prefers-reduced-motion`; kalau aktif, render versi statik ("Ketik obrolan...").
- IntersectionObserver (threshold 0.3) untuk mulai animasi saat komponen masuk viewport.
- Reset animasi saat tab/browser tidak terlihat (`visibilitychange`).
- `aria-hidden="true"` karena murni dekoratif.

**HeroResearchMock**
- Data progress statik: `percent: 38`, `current: 5`, `total: 13`.
- Timeline statik 6 tahap: 4 completed, 1 current, 1 pending.
- Label status: `SELESAI` / `IN PROGRESS`.
- `aria-hidden` tidak eksplisit (karena hidden di mobile via `hidden md:block`).

## Data & Konstanta

**ChatInputHeroMock**
- `PROMPTS`: 3 contoh kalimat (informal + formal).
- `CONFIG`: delay typing (50-90ms), hold (1600ms), cursor move (1200ms), hover (500ms), click (300ms), reset (500ms), return (1000ms), placeholder (2800ms).
- `Phase` type: `"placeholder" | "typing" | "hold" | "cursorMove" | "hover" | "click" | "reset" | "return"`.

**HeroResearchMock**
- `MOCK_STAGES`: 6 tahap:
  - "Gagasan Paper" (completed)
  - "Penentuan Topik" (completed)
  - "Menyusun Outline" (completed)
  - "Penyusunan Abstrak" (completed)
  - "Pendahuluan" (current)
  - "Tinjauan Literatur" (pending)
- `MOCK_PROGRESS`: `{ percent: 38, current: 5, total: 13 }`.

## Konten yang Ditampilkan

**PawangBadge**
- Text: "Anda Pawang, Ai Tukang"
- Link: `/about`
- Delegates ke `SectionBadge` (emerald background, amber animated dot, `text-signal`).

**HeroHeading**
- SR text: `Ngobrol+Riset+Brainstorming=Paper_Akademik`
- SVG images (theme-aware):
  - Light mode: `heading-dark-color.svg` (`block dark:hidden`)
  - Dark mode: `heading-light-color.svg` (`hidden dark:block`)
  - Alt text: "Ngobrol+Riset +Brainstorming +Kolaboratif =Paper_Akademik"
  - Dimensions: 520x246
- Visual heading disembunyikan dari layout text normal (`h1` memakai `text-[0px]` + `leading-[0]`), aksesibilitas lewat `sr-only`.

**HeroSubheading**
- "Nggak perlu prompt & workflow ruwet. Gagasan bakal diolah runtut oleh Agen Makalah menjadi paper utuh"

**HeroCTA**
- Label: "AYO MULAI"
- Container: `flex justify-center lg:justify-start w-full mt-4`.

**HeroResearchMock**
- URL bar: "makalah.ai/workflow"
- Judul progress: "Kolaborasi dengan Ai"
- Progress label: "Progress" (amber-500, uppercase, tracking-[0.3em])
- Footer: "+7 tahap lagi"

**ChatInputHeroMock**
- Placeholder (default): "Ketik obrolan" + animasi titik (3 dots, `animate-pulse` staggered)
- Placeholder (reduced motion fallback): "Ketik obrolan..."
- PROMPTS (rotasi):
  1. "Ayo bikin paper. Tapi gue belum punya ide. Bisa, kan? Kita diskusi!"
  2. "gue ada tugas paper nih tp blm tau mau bahas apa, bantuin mikir dong"
  3. "Saya sedang mengerjakan paper dan butuh bantuan. Bisa kita diskusikan?"

## Mockup Visual System

Kedua mockup pakai permanent dark/stone theme (tidak ikut app theme toggle).

**Shadow system (sharp diagonal bottom-left):**
- Light app: `shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.3)]` (Stone-700 30%)
- Dark app: `dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.2)]` (Stone-400 20%)

**Z-layering dan positioning:**
- HeroResearchMock (back): `z-10`, `scale-[0.88]`, `-translate-x-[60px]`, `top-1/2 -translate-y-1/2`
- ChatInputHeroMock (front): `z-20`, `right-0`, `top-1/2 -translate-y-1/2`, `max-w-[440px]`

**Theme per mockup:**
- HeroResearchMock: `bg-stone-800 border-stone-500` (dark shell)
- ChatInputHeroMock: `bg-stone-200 border-stone-300` (light shell)

## Styling

- Kelas utility/Tailwind dipakai langsung di komponen.
- Mockup pakai Stone palette langsung (`bg-stone-800`, `border-stone-500`, `text-stone-100`, dll).
- `HeroHeadingSvg`: theme switch via `next/image` + `hidden dark:block` / `block dark:hidden`, container `max-w-[520px]`.
- Animasi yang dipakai:
  - `animate-pulse` (dot di `SectionBadge`, placeholder dots, caret hold di `ChatInputHeroMock`)
  - Custom cursor transitions (`duration-800`, `transition-all`) di `ChatInputHeroMock`
- `HeroCTA` delegates ke `SectionCTA` yang memakai `btn-stripes-pattern` slide-in animation.
- Traffic lights di kedua mockup: `bg-rose-500`, `bg-amber-500`, `bg-emerald-500` (w-2 h-2 rounded-full).

## Dependencies

- `next/image` untuk `HeroHeadingSvg`.
- `next/link` via `SectionBadge` (indirect) untuk `PawangBadge`.
- `@/lib/auth-client` (`useSession`) untuk status auth di `HeroCTA`.
- `useOnboardingStatus` dari `src/lib/hooks/useOnboardingStatus` untuk status onboarding.
- `SectionBadge` dari `@/components/ui/section-badge` untuk `PawangBadge`.
- `SectionCTA` dari `@/components/ui/section-cta` untuk `HeroCTA`.
- `iconoir-react` (`Send`) untuk ikon pada `ChatInputHeroMock`.
- `cn` dari `src/lib/utils` untuk komposisi className.
