# Hero Section

Section hero untuk marketing page (`/`).

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan sumber konten tanpa baca semua file satu per satu. Semua poin di bawah ini sesuai dengan isi file di `src/components/marketing/hero`.

## Struktur

```
hero/
├── index.ts              # Re-exports semua komponen
├── PawangBadge.tsx       # Badge hero (link ke /about)
├── HeroHeading.tsx       # Heading utama (SR text + SVG)
├── HeroHeadingSvg.tsx    # SVG heading dengan warna tema
├── HeroSubheading.tsx    # Subheading/tagline
├── HeroCTA.tsx           # CTA utama (smart route)
├── HeroResearchMock.tsx  # Mockup progress riset (back layer)
├── ChatInputHeroMock.tsx # Mockup input chat (front layer)
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

## Anatomi Section

- Wrapper/layout hero disusun di `src/app/(marketing)/page.tsx`.
- Komponen di folder ini hanya menyediakan blok konten (badge, heading, CTA, dan mockup).
- Hero kanan memakai dua layer mockup: `HeroResearchMock` (belakang) dan `ChatInputHeroMock` (depan).

## Komponen dan Tanggung Jawab

- `PawangBadge.tsx`: badge kecil dengan dot animasi, link ke `/about` (gunakan `next/link`).
- `HeroHeading.tsx`: heading `h1` dengan text SR (`sr-only`) dan render visual via `HeroHeadingSvg`.
- `HeroHeadingSvg.tsx`: SVG text heading dengan warna tema (`fill-foreground`) dan aksen merah `#ee4036`.
- `HeroSubheading.tsx`: teks subheading/tagline (Geist via `text-narrative`).
- `HeroCTA.tsx`: tombol CTA utama, menentukan route berdasar status auth + onboarding.
- `HeroResearchMock.tsx`: mockup progress riset/paper (timeline + progress bar), data statik.
- `ChatInputHeroMock.tsx`: mockup input chat dengan animasi typewriter + cursor + click.

## Client Components

Komponen yang memakai `"use client"`:
- `PawangBadge.tsx`
- `HeroCTA.tsx`
- `HeroResearchMock.tsx`
- `ChatInputHeroMock.tsx`

## Perilaku Ringkas

**HeroCTA**
- Not signed in → `/sign-up`
- Signed in + onboarding selesai → `/chat`
- Signed in + onboarding belum selesai → `/get-started`
- `aria-busy` aktif saat loading auth/onboarding.

**ChatInputHeroMock**
- Ada siklus animasi: placeholder → typing → hold → cursor move → hover → click → reset → return.
- Menghormati `prefers-reduced-motion`; kalau aktif, render versi statik.
- IntersectionObserver untuk mulai animasi saat komponen masuk viewport.
- Reset animasi saat tab/browser tidak terlihat (`visibilitychange`).
- `aria-hidden="true"` karena murni dekoratif.

**HeroResearchMock**
- Data progress statik: `percent: 38`, `current: 5`, `total: 13`.
- Timeline statik 6 tahap, dengan label status `DONE` / `IN PROGRESS`.

## Data & Konstanta

**ChatInputHeroMock**
- `PROMPTS`: 3 contoh kalimat (informal + formal).
- `CONFIG`: delay typing, hold, cursor move, hover, click, reset, return, dan placeholder.

**HeroResearchMock**
- `MOCK_STAGES`: 6 tahap (3 completed, 1 current, 2 pending).
- `MOCK_PROGRESS`: progress 38% pada stage 5 dari 13.

## Konten yang Ditampilkan

**PawangBadge**
- Text: "Anda Pawang, Ai Tukang"
- Link: `/about`

**HeroHeading**
- SR text: `Ngobrol+Riset +Brainstorming =Paper_Akademik`
- SVG text:
  - "Ngobrol+Riset"
  - "+Brainstorming"
  - "=Paper_Akademik"
- Visual heading disembunyikan dari layout text normal (`h1` memakai `text-[0px]` + `leading-[0]`), aksesibilitas tetap lewat `sr-only`.

**HeroSubheading**
- "Nggak perlu prompt ruwet. Ide apapun bakal diolah Agen Makalah AI menjadi paper utuh"

**HeroCTA**
- Label: "AYO MULAI"

**HeroResearchMock**
- URL bar: "makalah.ai/paper"
- Judul progress: "Dampak AI pada Pendidikan Tinggi"
- Footer: "+7 tahap lagi"
- Stage list:
  - "Gagasan Paper"
  - "Penentuan Topik"
  - "Menyusun Outline"
  - "Penyusunan Abstrak"
  - "Pendahuluan"
  - "Tinjauan Literatur"

**ChatInputHeroMock**
- Placeholder (default): "Ketik obrolan" + animasi titik
- Placeholder (reduced motion fallback): "Ketik obrolan..."
- PROMPTS (rotasi):
  1) "Ayo bikin paper. Tapi gue belum punya ide. Bisa, kan? Kita diskusi!"
  2) "gue ada tugas paper nih tp blm tau mau bahas apa, bantuin mikir dong"
  3) "Saya sedang mengerjakan paper dan butuh bantuan. Bisa kita diskusikan?"

## Styling

- Kelas utility/Tailwind dipakai langsung di komponen.
- Token neo-brutalist (`bg-neo-*`, `border-neo-*`, `text-neo-*`) bersumber dari CSS variables di `src/app/globals.css`.
- `HeroHeadingSvg` set font via inline styles (`var(--font-geist-mono)`, `fontWeight: 500`, `letterSpacing: -0.05em`).
- Animasi yang dipakai:
  - `animate-pulse` (dot di `PawangBadge`)
  - `neo-shimmer` dan `neo-dot-pulse` (placeholder di `ChatInputHeroMock`)
  - `hero-caret-blink` (caret saat hold di `ChatInputHeroMock`)
- `HeroCTA` memakai class `.btn-brand` dari `src/app/globals.css`.

## Dependencies

- `next/link` untuk `PawangBadge`.
- `@clerk/nextjs` (`useUser`) untuk status auth di `HeroCTA`.
- `useOnboardingStatus` dari `src/lib/hooks/useOnboardingStatus` untuk status onboarding.
- `lucide-react` (`Send`) untuk ikon pada `ChatInputHeroMock`.
- `cn` dari `src/lib/utils` untuk komposisi className.
