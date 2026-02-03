# Section Background

Komponen background dekoratif untuk section marketing. Semua komponen di sini bersifat overlay dan `pointer-events-none`.

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan properti komponen tanpa buka satu per satu file.

## Structure

```
SectionBackground/
├── index.ts            # Re-exports semua komponen
├── DiagonalStripes.tsx # Pola garis diagonal 45 derajat
├── DottedPattern.tsx   # Pola titik dengan radial mask
├── GridPattern.tsx     # Pola grid halus
├── FadeBottom.tsx      # Fade gradient di bagian bawah
└── README.md           # Dokumentasi ini
```

## Usage

```tsx
import {
  DiagonalStripes,
  DottedPattern,
  FadeBottom,
  GridPattern
} from "@/components/marketing/SectionBackground"

<div className="relative">
  <GridPattern />
  <DiagonalStripes />
  <DottedPattern />
  <FadeBottom />
</div>
```

## Exports (index.ts)

- `GridPattern`
- `DiagonalStripes`
- `DottedPattern`
- `FadeBottom`

## Komponen dan Tanggung Jawab

- `DiagonalStripes.tsx`: pola garis diagonal 45 derajat, opsi fade mask vertikal.
- `DottedPattern.tsx`: pola titik radial, opsi radial mask dari center.
- `GridPattern.tsx`: pola grid halus dengan ukuran cell dan warna garis yang bisa diatur.
- `FadeBottom.tsx`: fade gradient ke `var(--background)` di bagian bawah.

## Props dan Default

| Komponen | Props | Default | Catatan |
| --- | --- | --- | --- |
| DiagonalStripes | `withFadeMask` | `true` | Menambah mask gradient dari atas ke bawah. |
|  | `className` | - | Tambahan class. |
| DottedPattern | `spacing` | `24` | Jarak antar titik (px). |
|  | `withRadialMask` | `true` | Mask radial dari center. |
|  | `className` | - | Tambahan class. |
| GridPattern | `size` | `48` | Ukuran cell grid (px). |
|  | `color` | `rgba(148, 163, 184, 0.15)` | Warna garis grid. |
|  | `className` | - | Tambahan class. |
| FadeBottom | `height` | `120` | Tinggi area fade (px). |
|  | `className` | - | Tambahan class. |

## Layering dan Posisi

- Semua komponen memakai `position: absolute` dengan `inset-0` (kecuali `FadeBottom` yang hanya di bawah).
- `DiagonalStripes` pakai `z-0`.
- `DottedPattern` dan `FadeBottom` pakai `z-[1]`.
- `GridPattern` tidak set z-index (ikut konteks parent).

## Styling Ringkas

- `DiagonalStripes`: garis 1px, gap 8px, sudut 45 derajat; light mode pakai garis gelap `rgba(0,0,0,0.10)`, dark mode pakai garis putih `rgba(255,255,255,0.12)`.
- `DottedPattern`: titik 1px dengan jarak berdasarkan `spacing`; light dan dark mode sama-sama opacity 12%.
- `GridPattern`: dua linear-gradient (horizontal + vertikal) dengan garis 1px.
- `FadeBottom`: gradient `transparent -> var(--background)`.

## Dependencies

- `@/lib/utils` untuk `cn`.
