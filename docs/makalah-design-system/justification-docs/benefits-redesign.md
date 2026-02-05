# Guideline & Kontrol Teknis: Migrasi Benefits Section Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan **Benefits Section** ("Kenapa Makalah AI?") ke standar **Makalah-Carbon**. Fokus utama adalah standarisasi **Bento Grid** dan **Accordion** di bawah payung **Mechanical Grace**.

## 0. Target Migrasi
*   **Target Components**: 
    *   `src/components/marketing/benefits/BenefitsSection.tsx`
    *   `src/components/marketing/benefits/BenefitsTitle.tsx`
    *   `src/components/marketing/benefits/BentoBenefitsGrid.tsx`
    *   `src/components/marketing/benefits/BenefitsAccordion.tsx`
*   **Target Pages**: `src/app/(marketing)/page.tsx`
*   **Style Scope**: Migrasi total ke Tailwind utility classes.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **CSS Mandate**: Hilangkan seluruh Custom CSS legacy dan ganti dengan **Tailwind CSS Utility Classes**. Seluruh pattern bento dan accordion wajib menggunakan abstraksi Tailwind/Carbon.

Penerapan token desain harus merujuk pada nilai teknis absolut berikut.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: [justifikasi-warna.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/justifikasi-warna.md) + `src/app/globals.css`*
*   **Section Background**: `bg-[color:var(--section-bg-alt)]` (Slate 100 / Slate 800).
*   **Bento Cards**:
    *   Border: `.border-hairline` (0.5px) menggunakan **Slate 200** (Light) / **Slate 800** (Dark).
    *   Hover Surface: `bg-[color:var(--slate-200)]` (Light) / `bg-[color:var(--slate-900)]` (Dark).
*   **Indicator Dot**: `bg-[color:var(--amber-500)]` + `animate-pulse`.
*   **Text Muted**: **Slate 500**.

### 1.2 Hirarki Tipografi
*Referensi: [typografi.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/typografi.md)*
*   **Section Title (The Voice)**:
    *   Font: **Geist Sans**.
    *   Weight: `Medium (500)`.
    *   Style: `tracking-tight`.
*   **Bento Card Title (The Voice)**:
    *   Font: **Geist Sans**.
    *   Weight: `Light (300)` atau `Regular (400)`.
    *   Size: `text-3xl`.
*   **Bento Card Description (The Interface)**:
    *   Font: **Geist Mono**.
    *   Weight: `Regular (400)`.
    *   Size: `text-xs` (12px).
    *   Line-height: `leading-relaxed`.

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/shape-layout.md)*
*   **Card Radius**: `.rounded-shell` (16px) untuk bento cards.
*   **Section Spacing**: `.p-airy` (Padding vertikal besar).
*   **Bento Gap**: `.gap-comfort` (16px).
*   **Grid Alignment**: Wajib snap ke **16-Column Grid** untuk container utama.

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Section Wrapper**| `.benefits-section` | `bg-[color:var(--section-bg-alt)]` | Color Token | Alternating section background. |
| **Grid Container** | `max-w-[1200px]` | `grid grid-cols-16` | Layout | 16-Column Snap. |
| **Bento Items** | `rounded-lg` | `.rounded-shell .border-hairline`| Shape & Border | Radius premium + hairline. |
| **Bento Titles** | `font-sans font-light`| `.text-narrative` | Typography | Geist Sans (The Voice). |
| **Bento Desc** | `font-mono text-xs` | `.text-interface` | Typography | Geist Mono (The Interface). |
| **Status Dot** | `bg-dot-light` | `bg-[color:var(--amber-500)] + animate-pulse` | Color Tone | Amber brand consistency. |
| **Docs CTA** | `SectionCTA` | `.rounded-action .text-signal` + hover solid | Shape & Motion | Geist Mono (Signal) dengan hover solid. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Arsitektur Bento 16-Column
*   **Aksi**: Ubah `benefits-container` untuk mengikuti grid 16-kolom.
*   **Desktop Layout**: 
    *   `BentoBenefitsGrid` berada di dalam kontainer yang mengambil `col-span-12` atau `col-span-14` (tengah).
    *   Pastikan gap antar kartu menggunakan `.gap-comfort` (16px).

### Step 2: Refactor Surface & Hairline
*   **Card Styling**: Ganti border default dengan `.border-hairline` (0.5px).
*   **Hover State**: Terapkan `bg-[color:var(--slate-200)]` / `bg-[color:var(--slate-900)]`. Hindari `-translate-y-1` untuk menjaga stabilitas grid.

### Step 3: Standarisasi Tipografi "Mechanical"
*   **Title vs Description**: Pastikan kontras antara judul (Sans/Besar) dan deskripsi (Mono/Kecil) sangat tajam.
*   **Mono Mapping**: Semua deskripsi manfaat di `BenefitsAccordion` dan `BentoBenefitsGrid` wajib menggunakan **Geist Mono**.

### Step 4: Texture & Depth
*   **Background**: `DiagonalStripes` tetap ada dengan `opacity-40` dan tanpa fade mask. `DottedPattern` tetap ada dengan `spacing=24` + `withRadialMask=true`.
*   **Signals**: Dot indikator memakai `animate-pulse` + **Amber-500**.

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Grid Audit**: Content benefits sejajar sempurna dengan grid 16-kolom.
- [ ] **Typo Audit**: Judul bento = Sans. Deskripsi bento = Mono.
- [ ] **Border Audit**: Border kartu bento menggunakan `.border-hairline` (0.5px).
- [ ] **Color Audit**: Dot indikator menggunakan Amber-500. background menggunakan Slate Trinity.
- [ ] **Mobile Audit**: Accordion menggunakan radius `.rounded-md` dan font Mono untuk konten.
- [ ] **Texture Audit**: Pola dot dan garis terlihat jelas namun tidak mendominasi konten (opacity 0.4).

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Benefits section adalah bukti efisiensi. Layout bento harus terasa seperti "Dashboard Kapabilitas" yang rapi, bukan sekadar list fitur.
