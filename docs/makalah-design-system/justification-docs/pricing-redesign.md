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
*   **Card Surface**: `bg-slate-900` (Dark) dengan border `slate-800`.
*   **Highlighted Card (Pro)**: Gunakan border **Amber 500** (`oklch(.769 .188 70.08)`) untuk menonjolkan value utama.
*   **Success Signal (Checkmarks)**: `oklch(.704 .14 182.503)` (Teal 500).

### 1.2 Hirarki Tipografi
*Referensi: [typografi.md](../docs/typografi.md)*
*   **Section Title (The Voice)**: 
    *   Font: **Geist Mono** (Sejajar dengan standarisasi data teknis).
    *   Weight: `Bold (700)`.
    *   Size: `3xl` - `5xl`.
*   **Plan Name (The Signal)**:
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Case: `UPPERCASE`.
    *   Tracking: `tracking-widest`.
    *   Color: **Amber 500**.
*   **Pricing Numbers (The Interface)**:
    *   Font: **Geist Mono** (Tabular digits).
    *   Weight: `Bold (700)`.
    *   Size: `5xl`.
*   **Features List (The Interface)**:
    *   Font: **Geist Mono**.
    *   Weight: `Regular (400)`.
    *   Size: `11px` - `12px`.

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md](../docs/shape-layout.md)*
*   **Card Shell**: `.rounded-xl` (16px) untuk container utama plan.
*   **CTA Button**: `.rounded-action` (8px) dengan `.hover-slash`.
*   **Internal Dividers**: `.border-hairline` (0.5px).
*   **Grid Alignment**: Wajib snap ke **16-Column Grid** (`grid-cols-16`).

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Section Header** | `font-mono text-3xl` | `.text-signal tracking-tight` | Typography | Standarisasi industrial signal. |
| **Pricing Card** | `rounded-lg border-black/20` | `.rounded-shell border-main bg-slate-900` | Shape & Surface | Hybrid radius & industrial surface. |
| **Highlighted Card**| `border-emerald-600` | `border-amber-500` | Color Identity | Amber sebagai Main Brand/Action. |
| **Popular Badge** | `rounded-full text-[11px]` | `.rounded-badge .text-signal` | Shape & Typo | Geist Mono + tracking-widest. |
| **CTA Button** | `rounded-lg font-semibold` | `.rounded-action .text-signal hover-slash` | Interaction | Mechanical signature hover. |
| **Feature List** | `font-mono text-sm` | `.text-interface text-[11px]` | Typography | Info-dense scaling. |
| **Dividers** | `border-t border-slate-800` | `.border-hairline` | Precision | Hairline separator (0.5px). |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Penyelarasan Grid (16-Column Snap)
*   **Aksi**: Ubah container utama di `page.tsx` menggunakan `grid grid-cols-16`.
*   **Snap**: Section header mengambil `col-span-16`. Grid kartu pricing mengambil `col-span-16` dengan sub-grid desktop.

### Step 2: Refactor `PricingCard`
*   **Aksi**:
    1. Ganti `rounded-lg` ke `.rounded-shell` (16px).
    2. Terapkan `.border-hairline` untuk divider internal antara header card dan list fitur.
    3. Ganti warna `emerald-600` pada highlighted card ke `amber-500` (Amber 500).
    4. Ubah font plan name ke **Geist Mono** dengan gaya **Signal** (Uppercase + Widest Tracking).

### Step 3: Standarisasi Data Pricing
*   **Aksi**: Pastikan angka harga (`plan.price`) menggunakan font **Geist Mono** dengan tracking-tighter untuk kesan padat/industrial.

### Step 4: Refactor CTA & Interaction
*   **Target**: `PricingCTA` di dalam `PricingCard.tsx`.
*   **Aksi**: Terapkan `.rounded-action` (8px) dan aktifkan `.hover-slash`. Pastikan teks tombol ("PILIH PAKET", dll) menggunakan font **Mono Uppercase**.

### Step 5: Texture & Background
*   **Aksi**: Gunakan `DottedPattern` pada latar belakang kartu highlighted dengan opacity sangat rendah (`0.03`) untuk memberikan tekstur "Premium/Machine" tanpa mengganggu teks.

---

## 4. Checklist Verifikasi (Review & Audit)

- [x] **Grid Audit**: Content pricing sejajar sempurna dengan 16-kolom grid.
- [x] **Typo Audit**: Plan name & Price = Mono. Fitur List = Mono. Header = Mono.
- [x] **Radius Audit**: Shell = 16px. CTA = 8px.
- [x] **Border Audit**: Pemisah internal menggunakan `.border-hairline` (0.5px).
- [x] **Color Audit**: Highlight menggunakan Amber (Main Brand), bukan Emerald lagi.
- [x] **Interaction Audit**: Efek `.hover-slash` aktif pada tombol CTA.
- [x] **Contrast Audit**: Teks Mono 11px tetap terbaca dengan kontras Slate-400 ke atas.
- [x] **Skeleton Audit**: `PricingSkeleton` harus meniru struktur radius dan gap baru.

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Halaman pricing adalah area konversi. Ia harus terasa sangat presisi dan transparan. Penggunaan Geist Mono pada semua elemen data adalah mandat untuk memberikan kesan "Diagnostic Accuracy".
