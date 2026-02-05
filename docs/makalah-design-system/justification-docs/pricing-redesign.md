# Guideline & Kontrol Teknis: Migrasi Pricing Section Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan **Pricing Page** dan komponen-komponennya ke standar **Makalah-Carbon**. Dokumen ini menjamin konsistensi instrumen ekonomi di bawah filosofi **Mechanical Grace**.

## 0. Target Migrasi
*   **Target Components**: 
    *   `src/components/marketing/pricing/PricingCard.tsx`
    *   `src/components/marketing/pricing/PricingCarousel.tsx`
    *   `src/components/marketing/pricing/PricingSkeleton.tsx`
*   **Target Pages**: `src/app/(marketing)/pricing/page.tsx`
*   **Style Scope**: Migrasi total ke Tailwind utility classes dan sistem token Carbon.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **CSS Mandate**: Hilangkan seluruh Custom CSS legacy dan ganti dengan **Tailwind CSS Utility Classes**. Seluruh pattern grid dan layouting wajib menggunakan abstraksi Tailwind/Carbon.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: [justifikasi-warna.md](../docs/justifikasi-warna.md)*
*   **Background Page**: `oklch(.984 .003 247.858)` (Slate 50) / `oklch(.208 .042 265.755)` (Slate 900).
*   **Card Surface**: Border netral `var(--slate-400)` dengan hover surface `var(--slate-200)` / `var(--slate-700)` mengikuti Pricing Teaser.
*   **Highlighted Card (Pro)**: Gunakan border **Emerald 500** (`oklch(.696 .17 162.48)`) agar konsisten dengan Pricing Teaser.
*   **Accent Dot & Checkmarks**: Dot menggunakan **Rose 500** dan checkmark **Emerald 500** mengikuti Pricing Teaser.

### 1.2 Hirarki Tipografi
*Referensi: [typografi.md](../docs/typografi.md)*
*   **Section Title (The Voice)**:
    *   Font: **Geist Sans** (`text-narrative`) seperti Pricing Teaser.
    *   Weight: `Medium (500)`.
    *   Size: `2xl` - `2.5xl`.
*   **Plan Name (The Voice)**:
    *   Font: **Geist Sans** (`text-narrative`).
    *   Weight: `Light (300)`.
    *   Size: `xl` - `2xl`.
*   **Pricing Numbers (The Interface)**:
    *   Font: **Geist Mono** (`text-interface`, tabular nums).
    *   Weight: `Medium (500)`.
    *   Size: `3xl`.
*   **Features List (The Interface)**:
    *   Font: **Geist Mono** (`text-interface`).
    *   Weight: `Regular (400)`.
    *   Size: `xs`.

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md](../docs/shape-layout.md)*
*   **Card Shell**: `.rounded-xl` (16px) untuk container utama plan.
*   **CTA Button**: Gunakan styling `SectionCTA` (rounded-action + stripes).
*   **Internal Dividers**: Tidak digunakan (mengikuti TeaserCard).
*   **Grid Alignment**: Wajib snap ke **16-Column Grid** (`grid-cols-16`).

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Section Header** | `font-mono text-3xl` | `.text-narrative font-medium` | Typography | Ikuti Pricing Teaser. |
| **Pricing Card** | `rounded-lg border-black/20` | `.rounded-shell border-[color:var(--slate-400)]` | Shape & Surface | Border netral ala Teaser. |
| **Highlighted Card**| `border-emerald-600` | `border-emerald-500` | Color Identity | Emerald mengikuti karakter Pricing Teaser. |
| **Popular Badge** | `rounded-full text-[11px]` | `.rounded-full` + Emerald | Shape & Typo | Sama seperti TeaserCard. |
| **CTA Button** | `rounded-lg font-semibold` | `SectionCTA` | Interaction | Stripes hover dari TeaserCTA. |
| **Feature List** | `font-mono text-sm` | `.text-interface text-xs` | Typography | Skala padat ala Teaser. |
| **Dividers** | `border-t border-slate-800` | `—` | Precision | Tidak ada divider (TeaserCard). |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Penyelarasan Grid (16-Column Snap)
*   **Aksi**: Ubah container utama di `page.tsx` menggunakan `grid grid-cols-16`.
*   **Snap**: Section header mengambil `col-span-16`. Grid kartu pricing mengambil `col-span-16` dengan sub-grid desktop.

### Step 2: Refactor `PricingCard`
*   **Aksi**:
    1. Ganti `rounded-lg` ke `.rounded-shell` (16px).
    2. Hilangkan divider internal agar sama dengan TeaserCard.
    3. Pertahankan highlighted card di `emerald-500` (Emerald 500) mengikuti Pricing Teaser.
    4. Ubah font plan name ke **Geist Sans** (text-narrative) seperti TeaserCard.

### Step 3: Standarisasi Data Pricing
*   **Aksi**: Pastikan angka harga (`plan.price`) menggunakan `text-interface` (Geist Mono) seperti TeaserCard.

### Step 4: Refactor CTA & Interaction
*   **Target**: `PricingCTA` di dalam `PricingCard.tsx`.
*   **Aksi**: Gunakan `SectionCTA` (struktur + stripes hover) seperti TeaserCTA.

### Step 5: Texture & Background
*   **Aksi**: Tidak ada texture khusus pada card (mengikuti TeaserCard).

---

## 4. Checklist Verifikasi (Review & Audit)

- [x] **Grid Audit**: Content pricing sejajar sempurna dengan 16-kolom grid.
- [x] **Typo Audit**: Header = Sans, Plan name = Sans, Price & list = Mono (text-interface).
- [x] **Radius Audit**: Shell = 16px. CTA = 8px.
- [x] **Border Audit**: Border card memakai `var(--slate-400)` dan tidak ada divider internal.
- [x] **Color Audit**: Highlight menggunakan Emerald (mengikuti Pricing Teaser).
- [x] **Interaction Audit**: CTA menggunakan stripes hover dari `SectionCTA`.
- [x] **Contrast Audit**: Teks Mono 11px tetap terbaca dengan kontras Slate-400 ke atas.
- [x] **Skeleton Audit**: `PricingSkeleton` harus meniru struktur radius dan gap baru.

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Halaman pricing mengikuti karakter Pricing Teaser untuk konsistensi visual antar bagian halaman marketing.
