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
└── README.md           # Dokumentasi ini
```

## Usage

```tsx
import {
  DiagonalStripes,
  DottedPattern,
  GridPattern
} from "@/components/marketing/SectionBackground"

<div className="relative">
  <GridPattern />
  <DiagonalStripes />
  <DottedPattern />
</div>
```

## Exports (index.ts)

- `GridPattern`
- `DiagonalStripes`
- `DottedPattern`

## Komponen dan Tanggung Jawab

- `DiagonalStripes.tsx`: pola garis diagonal 45 derajat.
- `DottedPattern.tsx`: pola titik radial, opsi radial mask dari center.
- `GridPattern.tsx`: pola grid halus dengan ukuran cell dan warna garis tetap.

## Props dan Default

| Komponen | Props | Default | Catatan |
| --- | --- | --- | --- |
| DiagonalStripes | `className` | - | Tambahan class. |
| DottedPattern | `spacing` | `24` | Jarak antar titik (px). |
|  | `withRadialMask` | `true` | Mask radial dari center. |
|  | `className` | - | Tambahan class. |
| GridPattern | `className` | - | Tambahan class. |

## Layering dan Posisi

- `DiagonalStripes` pakai `z-0`.
- `GridPattern` tidak set z-index (ikut konteks parent).

## Styling Ringkas

- `DiagonalStripes`: garis 1px, gap 8px, sudut 45 derajat; light mode pakai garis gelap `var(--slate-900)` opacity 10%, dark mode pakai garis terang `var(--slate-50)` opacity 12%.
- `DottedPattern`: titik 1px dengan jarak berdasarkan `spacing`; light dan dark mode sama-sama opacity 12%.
- `GridPattern`: dua linear-gradient (horizontal + vertikal) dengan garis 1px (warna `var(--slate-400)` opacity 15%).

## Dependencies

- `@/lib/utils` untuk `cn`.
