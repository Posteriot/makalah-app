# Guideline & Kontrol Teknis: Migrasi Status Akun User Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan **Status Akun User** (Account Status Page) ke standar **Makalah-Carbon**. Halaman ini adalah representasi identitas user di dalam sistem; ia harus memancarkan presisi, transparansi data, dan estetika "Diagnostic Instruments" (**Mechanical Grace**).

## 0. Target Migrasi
*   **Target Components**: `src/components/user/AccountStatusPage.tsx`
*   **Integration Context**: Halaman ini muncul di dalam Clerk `UserProfile` modal sebagai Custom Page.
*   **Style Scope**: Penyelarasan tipografi teknis, standardisasi divider hairline, dan integrasi dengan sistem Carbon `RoleBadge`.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **Data Transparency**: Sebagai area profil, setiap poin data harus terbaca dengan presisi tinggi. Penggunaan **Geist Mono** adalah wajib untuk semua "Data Values" guna menciptakan kesan terminal sistem yang autentik.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: [justifikasi-warna.md](../docs/justifikasi-warna.md)*
*   **Card Background**: `bg-card` (Slate 50 / Slate 900).
*   **Brand Highlight**: `amber-500` (Amber 500) untuk indikator status aktif atau tombol kelola.
*   **Separators**: `slate-200/50` (Light) / `slate-800` (Dark).

### 1.2 Hirarki Tipografi
*Referensi: [typografi.md](../docs/typografi.md)*
*   **Page Title**: 
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Tracking: `tracking-tighter`.
*   **Field Labels (The Sinyal)**: 
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Case: `UPPERCASE`.
    *   Tracking: `tracking-widest`.
    *   Size: `10px`.
*   **Account Data Values**:
    *   Font: **Geist Mono**.
    *   Weight: `Regular (400)`.
    *   Size: `sm` (14px).
*   **Auxiliary Descriptions**:
    *   Font: **Geist Sans** (`text-narrative`).

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md](../docs/shape-layout.md)*
*   **Information Rows**: `.border-b-hairline` (0.5px) untuk pemisah antar field data.
*   **Inter-item Spacing**: Menggunakan skala 16px/24px untuk menjaga kepadatan informasi tanpa terasa sesak.
*   **Badges**: `.rounded-badge` (6px) untuk Role atau Status Subskripsi.

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Page Heading** | `text-xl font-semibold` | `.text-signal tracking-tighter` | Typography | Geist Mono Heading style. |
| **Field Labels** | `text-sm font-medium` | `.text-signal tracking-widest` | Typography | Geist Mono Signal style. |
| **User Data** | `text-sm text-muted-fore...`| `.text-interface` | Typography | Geist Mono untuk data fungsional. |
| **Pemisah Baris** | `border-b` | `.border-b-hairline` | Precision | Hairline separator (0.5px). |
| **Role Badge** | `Admin / User Standard` | `RoleBadge (Carbon System)` | Integration | Penyelarasan role-color branding. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Refactor Headers & Intro
*   **Aksi**: Ubah judul "Status Akun" menggunakan **Geist Mono** (Bold 700). Pastikan deskripsi di bawahnya menggunakan **Geist Sans** dengan style `.text-narrative` agar tetap nyaman dibaca sebagai teks deskriptif.

### Step 2: Implementasi Signal Labels
*   **Aksi**: Semua label field (misal: "EMAIL", "ROLE", "SUBSCRIPTION") wajib dikonversi ke **Geist Mono**, Uppercase, Bold 700, dengan letter-spacing `widest`. Ini memberikan ritme industrial pada form.

### Step 3: Standarisasi Data Profil
*   **Aksi**: Payload data user (email string, status string) harus menggunakan **Geist Mono** regular. Ini membedakan antara "Konten Sistem" dan "Data Dinamis".

### Step 4: Precision Border Tuning
*   **Aksi**: Ganti pemisah baris (`border-b`) dengan `.border-b-hairline`. Ketebalan 0.5px akan memberikan kesan estetika yang jauh lebih premium dan akurat.

### Step 5: Sinkronisasi Badge & Icons
*   **Aksi**: Gunakan komponen `RoleBadge` yang sudah terstandarisasi. Jika terdapat icon fungsional tambahan, wajib menggunakan **Iconoir** (1.5px stroke).

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Typo Audit**: Heading, Label, dan Data Profil menggunakan Geist Mono.
- [ ] **Border Audit**: Baris pemisah antar data menggunakan hairline 0.5px.
- [ ] **Color Audit**: RoleBadge menggunakan token Amber/Rose sesuai level otorisasi.
- [ ] **Precision Audit**: Tipografi data (Email) selaras dengan baseline grid.
- [ ] **Responsive Audit**: Tetap rapi saat diakses melalui modal Clerk di berbagai ukuran layar.

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Halaman status akun adalah titik di mana user memvalidasi peran mereka di Makalah AI. Estetika yang "sharp" dan penggunaan font Mono memberikan keyakinan bahwa sistem menangani data mereka dengan integritas dan akurasi tinggi.
