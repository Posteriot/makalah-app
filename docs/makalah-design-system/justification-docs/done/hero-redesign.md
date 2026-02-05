# Guideline & Kontrol Teknis: Migrasi Hero Section Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan **Hero Section** di Landing Page ke standar **Makalah-Carbon**. Dokumen ini menjamin kesan pertama yang inklusif terhadap filosofi **Mechanical Grace**.

## 0. Target Migrasi
*   **Target Components**: 
    *   `src/components/marketing/hero/HeroHeading.tsx`
    *   `src/components/marketing/hero/HeroSubheading.tsx`
    *   `src/components/marketing/hero/HeroCTA.tsx`
    *   `src/components/marketing/hero/PawangBadge.tsx`
    *   `[DELETE]` [AuroraBackground.tsx](file:///Users/eriksupit/Desktop/makalahapp/src/components/marketing/PageBackground/AuroraBackground.tsx)
    *   `[DELETE]` [VignetteOverlay.tsx](file:///Users/eriksupit/Desktop/makalahapp/src/components/marketing/PageBackground/VignetteOverlay.tsx)
*   **Target Pages**: `src/app/(marketing)/page.tsx`
*   **Style Scope**: Migrasi total ke Tailwind utility classes.

> [!CAUTION]
> **PROTECTED COMPONENTS**: Dilarang keras mengubah atau menyentuh komponen berikut guna menjaga integritas demonstrasi visual:
> 1. [HeroResearchMock.tsx](file:///Users/eriksupit/Desktop/makalahapp/src/components/marketing/hero/HeroResearchMock.tsx)
> 2. [ChatInputHeroMock.tsx](file:///Users/eriksupit/Desktop/makalahapp/src/components/marketing/hero/ChatInputHeroMock.tsx)

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **CSS Mandate**: Hilangkan seluruh Custom CSS legacy dan ganti dengan **Tailwind CSS Utility Classes**. Seluruh pattern grid dan layouting wajib menggunakan abstraksi Tailwind/Carbon.

Penerapan token desain harus merujuk pada nilai teknis absolut berikut.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: [justifikasi-warna.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/justifikasi-warna.md)*
*   **Background Layers**:
    *   `GridPattern` & `DiagonalStripes`: Opacity `0.8` (kelas `opacity-80`).
    *   **Koreksi**: Hapus layer `AuroraBackground`, `VignetteOverlay`, dan `TintOverlay` untuk tampilan industrial yang bersih.
*   **Text Primary**: `oklch(0.15 0 0)` (Light) / `oklch(0.95 0 0)` (Dark).
*   **Subheading Text**: Menggunakan **Slate 600** (Light) / **Slate 300** (Dark) untuk hirarki visual yang jelas.

### 1.2 Hirarki Tipografi
*Referensi: [typografi.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/typografi.md)*
*   **Heading (The Voice - PROTECTED ASSET)**: 
    *   **Aksi**: Gunakan komponen `HeroHeadingSvg` (Visual Title).
    *   **LARANGAN**: Dilarang keras mengganti aset SVG ([heading-dark-color.svg](file:///Users/eriksupit/Desktop/makalahapp/public/heading-dark-color.svg) & [heading-light-color.svg](file:///Users/eriksupit/Desktop/makalahapp/public/heading-light-color.svg)) dengan font/teks biasa. Estetika visual judul tipe "Liquid/Fluid" pada SVG ini wajib dipertahankan.
    *   `sr-only` text tetap dipertahankan untuk aksesibilitas.
*   **Subheading (The Voice - Narrative)**:
*   Font: **Geist Sans** (`text-narrative`) untuk teks naratif marketing.
*   Weight: `Medium (500)`.
*   Size: `text-base` (16px) - `text-lg` (18px).
*   **PawangBadge & CTA (The Signal)**:
    *   Font: **Geist Mono**.
    *   Weight: **Bold (700)**.
    *   Case: **UPPERCASE**.
    *   Tracking: `tracking-widest`.

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/shape-layout.md)*
*   **PawangBadge Shape**: `.rounded-badge`.
*   **CTA Shape**: `.rounded-action` (8px).
*   **Spacing Units**: `.p-airy` (Hingga 64px vertikal). `.gap-comfort` (16px) antar elemen teks.
*   **Grid alignment**: Wajib snap ke **16-Column Grid** (`hero-flex`).

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Container** | `hero-flex` | `grid grid-cols-16 gap-comfort` | Layout | 16-Column Grid dengan gap standar. |
| **Hero Grid Split** | `col-span-8/8` | `col-span-7/9` (desktop) | Layout | Cegah overlap mockup kanan. |
| **PawangBadge** | `bg-[#2a7d6e]` | `bg-[color:var(--emerald-500)]` | Color & Identity | Emerald sebagai secondary brand. |
| **Badge Dot** | `bg-orange-500` | `bg-amber-500` | Color Tone | Migrasi Orange ke **Amber**. |
| **Subheading** | `text-zinc-600` | `.text-narrative text-slate-600` | Typography & Color | Geist Sans + Slate palette. |
| **CTA Button** | `font-sans text-[12px]` | `.text-signal font-mono uppercase` | Typography | Case & Font Family Standarisasi. |
| **Aurora & Vignette** | `<AuroraBackground />` / `<VignetteOverlay />` | `[REMOVE]` | Background | Pembersihan layer non-Carbon. |
| **Mockups** | `hero-right` | No Change (PROTECTED) | Content | Integritas visual aset demonstrasi. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Penyelarasan Grid Isolate
*   **Aksi**: Pastikan `hero-flex` di `page.tsx (marketing)` menggunakan sistem `grid grid-cols-16`.
*   **Snap**: `hero-left` = `col-span-7`, `hero-right` = `col-span-9` pada resolusi desktop untuk menghindari tabrakan mockup.

### Step 2: Refactor Subheading (The Interface)
*   **Target**: `HeroSubheading.tsx`
*   **Aksi**: 
    1. Gunakan font **Geist Sans** via `text-narrative`.
    2. Ganti `text-zinc` dengan token **Slate** yang setara (`Slate 600` / `Slate 300`).
    3. Pastikan `max-w-[520px]` tetap untuk menjaga keterbacaan baris.

### Step 3: Standarisasi CTA Signal
*   **Target**: `HeroCTA.tsx` -> `SectionCTA`
*   **Aksi**: Pastikan komponen `SectionCTA` menerapkan `.rounded-action` (8px), `.hover-slash`, dan font **Geist Mono** untuk label "AYO MULAI".

### Step 4: Background Layering Validation
*   **Aksi**: Hapus instance `<AuroraBackground />` dan `<VignetteOverlay />` dari `page.tsx` (marketing).
*   **Penyelarasan**: Pastikan `DiagonalStripes` dan `GridPattern` berada di posisi dasar (`z-0`) tanpa fade mask.

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Grid Audit**: Content hero sejajar sempurna dengan 16-kolom grid (7/9 split).
- [ ] **SVG Protection Audit**: Pastikan Heading tetap menggunakan SVG asli, tidak dikonversi ke font.
- [ ] **Background Cleanup**: Pastikan `AuroraBackground` dan `VignetteOverlay` sudah dihapus dari kode.
- [ ] **Typo Audit**: Subheading menggunakan Geist Sans. CTA menggunakan Mono + Uppercase.
- [ ] **Color Audit**: Semua warna memetakan ke token Slate (OKLCH).
- [ ] **Protection Check**: Pastikan `HeroResearchMock` dan `ChatInputHeroMock` tidak memiliki perubahan diff.
- [ ] **Contrast Audit**: Subheading memiliki kontras yang cukup di atas layer `GridPattern`/`DiagonalStripes`.
- [ ] **Icon Audit**: Jika ada ikon di CTA, pastikan menggunakan library **Iconoir**.

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Hero section adalah "Janji" aplikasi. Ia harus menggabungkan tekstur industrial (`Grid`) dengan presisi tipografi (`Mono/Sans`).
