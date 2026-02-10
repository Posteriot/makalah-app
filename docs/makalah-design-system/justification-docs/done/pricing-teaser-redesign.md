# Guideline & Kontrol Teknis: Migrasi Pricing Teaser Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan **Pricing Teaser Section** ke standar **Makalah-Carbon**. Fokus utama adalah pada kejujuran visual informasi harga dan integrasi **Mechanical Grace**.

## 0. Target Migrasi
*   **Target Components**: 
    *   `src/components/marketing/pricing-teaser/PricingTeaser.tsx`
    *   `src/components/marketing/pricing-teaser/TeaserCard.tsx`
    *   `src/components/marketing/pricing-teaser/TeaserCarousel.tsx`
*   **Target Pages**: `src/app/(marketing)/page.tsx`
*   **Style Scope**: Migrasi total ke Tailwind utility classes.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **CSS Mandate**: Hilangkan seluruh Custom CSS legacy dan ganti dengan **Tailwind CSS Utility Classes**. Seluruh pattern grid dan carousel wajib menggunakan abstraksi Tailwind/Carbon.

Penerapan token desain harus merujuk pada nilai teknis absolut berikut.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: [justifikasi-warna.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/justifikasi-warna.md) + `src/app/globals.css`*
*   **Section Background**: `bg-background` (Slate 50 / Slate 900).
*   **Pricing Cards**:
    *   Standard Border: `.border-hairline` (0.5px) menggunakan **Slate 200** (Light) / **Slate 800** (Dark).
    *   Highlighted Border (**Pro/Solo**): `border-[2px] border-[color:var(--amber-500)]`.
    *   Popular Tag: `bg-[color:var(--amber-500)]` dengan text `var(--slate-50)`.
*   **Status/Indicator Dot**: `bg-[color:var(--amber-500)]` + `animate-pulse`.
*   **Text Muted**: **Slate 500**.

### 1.2 Hirarki Tipografi
*Referensi: [typografi.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/typografi.md)*
*   **Section Title (The Signal - Technical Title)**: 
    *   Font: **Geist Mono** (Pricing section treats the title as a system parameter).
    *   Weight: `Medium (500)`.
    *   Size: `text-2xl` sampai `text-[2.5rem]`.
*   **Plan Name (The Voice)**:
    *   Font: **Geist Sans**.
    *   Size: `text-xl` sampai `text-2xl`.
*   **Pricing & Numbers (The Interface)**:
    *   Font: **Geist Mono** (Wajib untuk data numerik).
    *   Weight: `Medium (500)`.
    *   Size: `text-3xl` sampai `text-5xl`.
*   **Description & Credits (The Interface)**:
    *   Font: **Geist Mono**.
    *   Size: `text-sm` / `text-xs`.

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/shape-layout.md)*
*   **Card Radius**: `.rounded-shell` (16px) untuk kartu utama.
*   **Section Spacing**: `.p-airy` (Hingga 64px vertikal).
*   **Z-Index Hierarchy**: 
    *   `GridPattern` / `DottedPattern`: `z-0`.
    *   Main Content Container: `z-10`.
*   **Grid alignment**: Wajib snap ke **16-Column Grid**.

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Section Wrapper**| `bg-muted/30` | `bg-background` | Color Token | Slate palette (50/900). |
| **Section Title** | `font-mono` | `.text-signal` | Typography | Geist Mono consistency. |
| **Pricing Card** | `border-black/20` | `.border-hairline` | Border Precision | Hairline separator (0.5px). |
| **Highlighted Card**| `border-emerald-600` | `border-[color:var(--amber-500)]` | Identity | Main Brand Accent (Amber). |
| **Badge Dot** | `bg-orange-500` | `bg-[color:var(--amber-500)] + animate-pulse` | Color Tone | Amber brand consistency. |
| **Carousel Dots** | `bg-brand` | `bg-[color:var(--amber-500)]` | Color Tone | Amber brand consistency. |
| **Teaser CTA** | `SectionCTA` | `.rounded-action .text-signal .hover-slash`| Shape & Motion | Geist Mono Label + Slash Pattern. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Arsitektur Layout 16-Column
*   **Aksi**: Pastikan kontainer utama (`PricingTeaser.tsx`) mengikuti grid 16-kolom.
*   **Desktop Layout**: Card grid (`grid-cols-3`) harus diatur agar sejajar atau terpusat dalam span kolom yang konsisten dengan section lain.

### Step 2: Penyelarasan Identitas (Amber vs Emerald)
*   **Aksi**: Ganti semua elemen visual `emerald` (hijau) pada kartu 'Solusi Terbaik' menjadi **Amber 500** (emas/kuning brand).
*   **Tagging**: Ganti warna "Solusi Terbaik" tag menjadi `bg-amber-500`.

### Step 3: Refactor Tipografi Numerik
*   **Aksi**: Pastikan komponen harga (`TeaserCard.tsx`) menggunakan font-family **Geist Mono** dengan pengaturan `tabular-nums` jika diperlukan untuk presisi angka.
*   **Consistency**: Gunakan **Geist Mono** untuk semua deskripsi dan credit note guna memperkuat vibe teknis/transparan.

### Step 4: Texture & Interaction Layer
*   **Background**: `GridPattern` dan `DottedPattern` tetap, tanpa fade mask, opacity konsisten dengan section lain.
*   **Hover Effect**: Terapkan `.hover-bg` (Slate-100/800) dan hapus bayangan (shadow) berat jika ada, fokus pada border highlight.

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Grid Audit**: Content pricing sejajar sempurna dengan grid 16-kolom.
- [ ] **Typo Audit**: Harga dan deskripsi menggunakan Mono. Nama paket menggunakan Sans.
- [ ] **Border Audit**: Kartu standar menggunakan `.border-hairline`. Kartu unggulan menggunakan border Amber.
- [ ] **Color Audit**: Semua aksen menggunakan Amber-500 (No Emerald).
- [ ] **Contrast Audit**: Harga harus tetap terbaca jelas (Contrast tinggi) pada kedua tema.
- [ ] **Carousel Audit**: Navigasi dots di mobile menggunakan warna Amber (tanpa animasi custom).

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Pricing adalah data paling sensitif. Ia harus disajikan dengan kejujuran "Terminal" (Mono) namun tetap dalam wadah yang premium (Slate Surface & Amber Accents).
