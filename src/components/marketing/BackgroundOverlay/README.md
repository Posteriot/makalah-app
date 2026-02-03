# Background Overlay

Komponen overlay untuk memberi tint (gelap/terang) di area background marketing.

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan props tanpa baca semua file satu per satu. Semua poin di bawah ini sesuai dengan isi file di `src/components/marketing/BackgroundOverlay`.

## Struktur

```
BackgroundOverlay/
├── TintOverlay.tsx # Overlay tint adaptif tema
├── index.ts        # Re-exports
└── README.md       # Dokumentasi ini
```

## Penggunaan

```tsx
import { TintOverlay } from "@/components/marketing/BackgroundOverlay"

<div className="relative">
  <TintOverlay intensity={30} />
</div>
```

## Ekspor (index.ts)

- `TintOverlay`

## Komponen dan Tanggung Jawab

- `TintOverlay.tsx`: overlay transparan yang menyesuaikan tema (dark/light) dan mengatur intensitas via opacity.

## Props

| Prop | Tipe | Default | Deskripsi |
| --- | --- | --- | --- |
| `intensity` | `number` | `20` | Intensitas tint (0-100). Dipakai sebagai `opacity = intensity / 100`. |
| `className` | `string` | `-` | Class tambahan untuk override/custom styling. |

## Perilaku Ringkas

- Menggunakan `style={{ opacity: intensity / 100 }}`.
- Overlay selalu menutup penuh area parent: `absolute inset-0`.
- Tidak menangkap input: `pointer-events-none`.
- Warna overlay:
  - Light mode: `bg-white` (white overlay → lightens content below)
  - Dark mode: `dark:bg-black` (black overlay → darkens content below)

## Styling

Class utama yang selalu dipakai:
- `absolute inset-0 pointer-events-none`
- `bg-white dark:bg-black` (light mode = white overlay, dark mode = black overlay)

## Penggunaan dengan PageBackground

TintOverlay adalah **single source of truth** untuk adaptasi dark/light mode.
Selalu gunakan bersama dengan AuroraBackground dan VignetteOverlay:

```tsx
<AuroraBackground />      {/* z-index: -2, theme-agnostic */}
<VignetteOverlay />       {/* z-index: -1, theme-agnostic */}
<TintOverlay intensity={15} className="z-0" />  {/* brightness control */}
```

**PENTING:** AuroraBackground dan VignetteOverlay adalah theme-agnostic.
TintOverlay yang menangani semua adaptasi brightness untuk dark/light mode.

## Aksesibilitas

- `aria-hidden="true"`.

## Dependencies

- `@/lib/utils` (`cn`)
