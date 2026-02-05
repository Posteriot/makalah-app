# Guideline & Kontrol Teknis: Migrasi Auth Section Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan **Auth Section** (Sign-in, Sign-up, Waitlist) ke standar **Makalah-Carbon**. Migrasi ini bertujuan untuk memberikan pengalaman akses yang aman, presisi, dan memiliki kesan "Academic Security" yang kuat (**Mechanical Grace**).

## 0. Target Migrasi
*   **Target Components**: 
    *   `src/components/auth/AuthWideCard.tsx`
    *   `src/components/auth/WaitlistForm.tsx`
*   **Target Pages**: 
    *   `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
    *   `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
    *   `src/app/(auth)/waiting-list/page.tsx`
*   **Target Layouts**: `src/app/(auth)/layout.tsx`
*   **Style Scope**: Pembersihan total `hero-vivid`, pemetaan ulang Clerk `appearance` variables, dan standardisasi radius.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **Industrial Security**: Area Auth harus terasa kokoh dan transparan. Penggunaan **Geist Mono Bold** pada elemen judul dan input adalah mandat untuk menciptakan kesan "Terminal Access".

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: [justifikasi-warna.md](../docs/justifikasi-warna.md)*
*   **Background Shell**: `bg-background` (Slate 50 / Slate 900).
*   **Auth Surface (Card)**: `bg-card` dengan border `slate-800`.
*   **Action Color (Primary)**: `amber-500` (Amber 500) untuk tombol masuk dan daftar.
*   **Success Tone**: `emerald-500` (Emerald 500) untuk notifikasi undangan valid atau sukses terdaftar.

### 1.2 Hirarki Tipografi
*Referensi: [typografi.md](../docs/typografi.md)*
*   **Card Headings (The Signal)**: 
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Tracking: `tracking-tighter`.
*   **Input Labels & Button Text**:
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Case: `UPPERCASE`.
    *   Tracking: `tracking-widest`.
*   **Descriptions & Narratives**:
    *   Font: **Geist Sans** (`text-narrative`).
    *   Weight: `Regular (400)`.

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md](../docs/shape-layout.md)*
*   **Auth Card Shell**: `.rounded-shell` (16px).
*   **Inputs & Buttons**: `.rounded-action` (8px).
*   **Interactions**: Tombol utama wajib memiliki `.hover-slash`.
*   **Grid Alignment**: Wrapper utama di `layout.tsx` harus menggunakan `.bg-grid` yang sejajar dengan kontainer.

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Auth Layout** | `hero-vivid hero-grid-thin` | `.bg-background .bg-grid` | Background | Pembersihan legacy vivid visual. |
| **Auth Card Shell** | `rounded-2xl shadow-2xl` | `.rounded-shell border-main shadow-none` | Shape | Hybrid Radius Shell (16px). |
| **Auth Title** | `font-hero text-3xl md:text-5xl`| `.text-signal tracking-tighter` | Typography | Geist Mono Signal style. |
| **Waitlist Input** | `rounded-lg h-11` | `.rounded-action h-10 border-main` | Shape | Standar input industri (8px). |
| **Primary Button** | `rounded-lg font-semibold bg-brand`| `.rounded-action .text-signal hover-slash` | Interaction | Geist Mono + Hover Slash signature. |
| **Clerk Overrides** | Hardcoded Color Hex/Oklch | Carbon OKLCH Tokens | Colors | Penyelarasan tema adaptif Carbon. |
| **Icons (Waitlist)** | `lucide-react` | `iconoir-react` | Iconography | Standar Iconoir (1.5px stroke). |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Penyelarasan Layout Utama
*   **Aksi**: 
    1. Ganti `hero-vivid` di `src/app/(auth)/layout.tsx` dengan `bg-background flex flex-col items-center justify-center`.
    2. Gunakan `GridPattern` sebagai background dekoratif yang snap ke container.
    3. Hapus hardcoded `bg-black/60` overlay.

### Step 2: Refactor `AuthWideCard`
*   **Aksi**:
    1. Ganti `rounded-2xl` ke `.rounded-shell` (16px).
    2. Ubah font judul utama ke **Geist Mono** (Bold 700).
    3. Pastikan kolom kiri (branding) menggunakan `.border-r-hairline` (0.5px) untuk pemisah.

### Step 3: Standardisasi Input & Button (Waitlist)
*   **Aksi**:
    1. Terapkan `.rounded-action` (8px) pada `Input` dan `Button` di `WaitlistForm.tsx`.
    2. Ganti semua icon `lucide-react` dengan `iconoir-react` (e.g., `Mail`, `CheckCircle`).
    3. Pastikan teks tombol ("DAFTAR", "MASUK") menggunakan font **Mono Uppercase**.

### Step 4: Clerk Appearance Refactoring
*   **Aksi**: 
    1. Update `clerkAppearance` di `sign-in` dan `sign-up` pages.
    2. Ganti `variables.colorPrimary` dengan token Amber Carbon.
    3. Map semantic elements Clerk: `socialButtonsBlockButton`, `formButtonPrimary`, `formFieldInput` ke `.rounded-action` dan font **Mono**.

### Step 5: Texture & Micro-interaction
*   **Aksi**: Tambahkan subtle texture atau `DottedPattern` (opacity low) di bagian branding kolom kiri `AuthWideCard` untuk memberikan kedalaman visual industrial.

---

## 4. Checklist Verifikasi (Review & Audit)

- [x] **Grid Audit**: Card berada tepat di tengah grid sistem.
- [x] **Typo Audit**: Judul, Label, dan Tombol = Geist Mono. Deskripsi = Geist Sans.
- [x] **Radius Audit**: Main Card = 16px. Form elements = 8px.
- [x] **Color Audit**: Tombol utama menggunakan Amber 500. Notifikasi sukses menggunakan Emerald 500.
- [x] **Icon Audit**: Tidak ada lagi icon dari Lucide, semua sudah Iconoir.
- [x] **Interaction Audit**: Tombol utama (Clerk maupun Waitlist) memiliki efek `.hover-slash`.
- [x] **Responsive Audit**: Layout dua kolom `AuthWideCard` rapi di portrait/mobile.

**Migration Status:** ✅ COMPLETED (2026-02-06)
**Branch:** `feat/auth-redesign-mechanical-grace`
**Commits:** 6 commits total (layout, card, form, sign-in, sign-up, docs)

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Authentication adalah gerbang utama keamanan data. Tampilan harus memancarkan "Robust Precision". Geist Mono dan Hairline border adalah kunci untuk mengubah form biasa menjadi instrumen akses yang premium.
