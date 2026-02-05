# Guideline & Kontrol Teknis: Migrasi Onboarding Section Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan **Onboarding Section** (Welcome, Get Started, & Checkout) ke standar **Makalah-Carbon**. Onboarding adalah fase impresi pertama dan konversi; ia harus terasa transparan, aman, dan berwibawa secara akademik (**Mechanical Grace**).

## 0. Target Migrasi
*   **Target Components**: 
    *   `src/components/onboarding/OnboardingHeader.tsx`
*   **Target Pages**: 
    *   `src/app/(onboarding)/get-started/page.tsx`
    *   `src/app/(onboarding)/checkout/bpp/page.tsx`
    *   `src/app/(onboarding)/checkout/pro/page.tsx`
*   **Target Layouts**: `src/app/(onboarding)/layout.tsx`
*   **Style Scope**: Pembersihan `onboarding-bg`, standardisasi card radius (Shell), dan sinkronisasi tipografi Paket/Harga.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **Conversion Precision**: Onboarding harus memandu user dengan instruksi yang tajam. Penggunaan **Geist Mono** pada judul paket dan nominal harga memberikan kesan "Sistem Transaksi" yang solid dan tidak main-main.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: [justifikasi-warna.md](../docs/justifikasi-warna.md)*
*   **Background Shell**: `bg-background` (Slate 50 / Slate 900).
*   **Onboarding Cards**: `bg-card` dengan border `slate-200` (Light) / `slate-800` (Dark).
*   **Primary Action**: `amber-500` (Amber 500) untuk tombol "Beli" atau "Lanjut".
*   **Price Signal**: `text-foreground` (Bold) untuk nominal harga utama.

### 1.2 Hirarki Tipografi
*Referensi: [typografi.md](../docs/typografi.md)*
*   **Step/Page Headings**: 
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Tracking: `tracking-tighter`.
*   **Plan/Package Titles**:
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Case: `UPPERCASE`.
*   **Price Values**:
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Size: `lg` - `xl`.
*   **Narrative Instructions**:
    *   Font: **Geist Sans** (`text-narrative`).

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md](../docs/shape-layout.md)*
*   **Onboarding Cards (Plans/Features)**: `.rounded-shell` (16px).
*   **Buttons & Inputs**: `.rounded-action` (8px) dengan `.hover-slash`.
*   **Internal Borders**: `.border-hairline` (0.5px) untuk pemisah antara judul paket dan daftar fitur.
*   **Layout Structure**: Kontainer terpusat (max-width 600px) yang selaras dengan grid dasar.

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Onboarding Layout**| `onboarding-bg` | `.bg-background .bg-grid` | Background | Pembersihan legacy custom bg. |
| **Header Wrapper** | `bg-background/80` | `border-b-hairline backdrop-blur-md` | Precision | Hairline border untuk header minimal. |
| **Welcome Heading** | `text-2xl font-semibold` | `.text-signal tracking-tighter` | Typography | Geist Mono Page Heading. |
| **Plan Card Shell** | `rounded-xl border shadow-none` | `.rounded-shell border-main` | Shape | Hybrid Radius Shell (16px). |
| **Price Point** | `text-lg font-bold` | `.text-signal tracking-tight` | Typography | Geist Mono untuk nominal fungsional. |
| **Action Button** | `rounded-lg font-medium` | `.rounded-action .text-signal hover-slash` | Interaction | Geist Mono + Hover Slash signature. |
| **Feature Icons** | `CheckCircle (Green-500)`| `CheckCircle (Iconoir) .text-brand` | Iconography | Standar Iconoir + Brand Color. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Refactor Background & Layout
*   **Aksi**: 
    1. Ganti `onboarding-bg` di `layout.tsx` dengan `bg-background`. 
    2. Tambahkan `GridPattern` subtle sebagai alas visual agar tidak terlalu kosong ("Vibrant Silence").

### Step 2: Onboarding Header Tuning
*   **Aksi**:
    1. Pastikan logo menggunakan varian Carbon yang konsisten dengan Global Header.
    2. Ganti bottom border menjadi `.border-b-hairline` (0.5px).

### Step 3: Standarisasi Plan Cards (Get Started)
*   **Aksi**:
    1. Ganti `rounded-xl` dengan `.rounded-shell` (16px).
    2. Judul paket (GRATIS, PRO, BPP) wajib menggunakan **Geist Mono** Bold & Uppercase.
    3. Terapkan `.border-hairline` sebagai divider antara harga dan daftar fitur.

### Step 4: Checkout Visual Polish (BPP/PRO)
*   **Aksi**: 
    1. Semua icon pembayaran (QRIS, VA, E-Wallet) wajib menggunakan **Iconoir** (bukan Lucide).
    2. Nominal saldo kredit dan harga total menggunakan **Geist Mono** tabular-nums.
    3. Input nomor HP (OVO) menggunakan `.rounded-action` (8px).

### Step 5: Interaction & Feedback Logic
*   **Aksi**:
    1. Tombol "Beli Sekarang" atau "Bayar" mendapatkan efek `.hover-slash`.
    2. Banner sukses/error menggunakan `.rounded-shell` dengan state colors yang sesuai (Amber/Emerald).

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Grid Audit**: Content area tetap terpusat dan sejajar dengan sistem 16-kolom.
- [ ] **Typo Audit**: Heading, Nama Paket, dan Harga = Geist Mono. Fitur & Deskripsi = Geist Sans.
- [ ] **Radius Audit**: Kartu Paket = 16px. Tombol & Input = 8px.
- [ ] **Border Audit**: Border internal kartu dan header menggunakan hairline 0.5px.
- [ ] **Color Audit**: Tombol aksi utama menggunakan Amber 500.
- [ ] **Icon Audit**: Migrasi total ke Iconoir 1.5px stroke.
- [ ] **Interaction Audit**: Tombol konversi memiliki efek `.hover-slash`.

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Onboarding adalah tentang membangun kepercayaan. Transparansi visual melalui Geist Mono dan kebersihan layout melalui Hairline border meyakinkan user bahwa Makalah-App adalah instrumen riset yang serius dan presisi.
