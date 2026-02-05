# Guideline & Kontrol Teknis: Migrasi Refrasa Section Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan **Refrasa Section** (Alat Perbaikan Gaya Akademik) ke standar **Makalah-Carbon**. Refrasa adalah fitur audit penulisan yang memerlukan ketelitian visual tinggi untuk membedakan antara masalah teks (Issues) dan hasil perbaikan.

## 0. Target Migrasi
*   **Trigger Elements**: `src/components/refrasa/RefrasaButton.tsx`.
*   **Review Interface**: `RefrasaConfirmDialog.tsx`, `RefrasaIssueItem.tsx`.
*   **Status Indicators**: `RefrasaLoadingIndicator.tsx`.
*   **Orchestration**: `index.ts`.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **Mechanical Audit**: Refrasa harus terlihat seperti proses audit laboratorium. Penggunaan warna fungsional (Semantic Colors) harus konsisten: Masalah = Orange/Amber, Sukses/Perbaikan = Green/Emerald. Tipografi **Geist Mono** digunakan untuk metadata audit.

### 1.1 Trigger & Activation
*Referensi: [komponen-standar.md](../docs/komponen-standar.md)*
*   **Refrasa Button**: 
    *   Icon: **Iconoir** `MagicWand` 1.5px (Pengganti `WandSparkles` Lucide).
    *   Pattern: `.hover-slash-subtle`.
    *   State: Loading menggunakan `.animate-spin` pada icon fungsional.

### 1.2 Comparison Dialog (Side-by-Side Audit)
*Referensi: [shape-layout.md](../docs/shape-layout.md)*
*   **Dialog Shell**: 
    *   Radius: `.rounded-shell` (16px).
    *   Border: `.border-hairline` (0.5px).
*   **Comparison Panels**:
    *   Original Panel: `bg-background` (Netral).
    *   Improved Panel: `bg-emerald-500/5` dengan border `.border-l-brand-hairline`.
*   **Typography**:
    *   Isi Teks: **Geist Sans** (`text-narrative`).
    *   Labels (v.s): **Geist Mono** Bold Uppercase.

### 1.3 Issue Detection UI
*   **Issue Cards**:
    *   Shape: `.rounded-action` (8px).
    *   Typography: Geist Mono untuk label kategori (NATURALNESS, STYLE).
*   **Badges**:
    *   Severity: Menggunakan skema fungsional Carbon (Critical=Red, Warning=Amber, Info=Blue).

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Trigger Icon** | `lucide-react` | `iconoir-react` | Asset | Standarisasi set icon 1.5px. |
| **Issue Category** | `text-purple-700` | `.text-signal .text-amber-500` | Signal | Penyelarasan skema audit fungsional. |
| **Improved Panel** | `bg-green-50/50` | `.bg-emerald-500/5` | Color | Carbon Success Surface level. |
| **Loading Text** | `animate-pulse` | `.text-signal font-mono` | Typography | Konten edukasi loading tetap Mono. |
| **Dialog Radius** | `rounded-lg` | `.rounded-shell` | Shape | Shell Radius (16px) untuk modal besar. |
| **Action Buttons** | `variant="outline"` | `.rounded-action .hover-slash`| Interaction | Consistency of action pattern. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Iconography Swap
*   **Aksi**: Ganti semua instance `lucide-react` (`WandSparkles`, `Loader2`, `ChevronDown`, dll) di seluruh folder `refrasa` dengan **Iconoir** yang ekivalen (`MagicWand`, `NavArrowDown`, dll).

### Step 2: Confirmation Dialog Structure
*   **Aksi**: 
    1. Update `RefrasaConfirmDialog.tsx` untuk menggunakan `.rounded-shell` (16px).
    2. Ganti grid title ("Teks Asli" vs "Hasil Perbaikan") menjadi **Geist Mono** Uppercase.
    3. Terapkan pemisah hairline antar panel jika diperlukan.

### Step 3: Issue Item Refinement
*   **Aksi**:
    1. Update `RefrasaIssueItem.tsx` agar label kategori (Naturalness/Style) menggunakan **Geist Mono** Bold.
    2. Selaraskan warna badge dengan `justifikasi-warna.md`. Hindari penggunaan ungu (purple) jika tidak terdefinisi di core tokens; gunakan skema fungsional (Amber/Sky).

### Step 4: Educational Loading
*   **Aksi**:
    1. Teks pesan di `RefrasaLoadingIndicator.tsx` wajib menggunakan **Geist Mono** agar kerasa seperti log sistem yang sedang memproses data.
    2. Ganti spinner Lucide dengan **Iconoir** `MagicWand` yang beranimasi pulse atau spinner fungsional Carbon.

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Icon Audit**: Tidak ada lagi penggunaan `lucide-react`.
- [ ] **Typo Audit**: Semua elemen metadata/audit menggunakan Geist Mono.
- [ ] **Color Audit**: Warna panel perbaikan menggunakan Emerald (Success) yang sesuai standar.
- [ ] **Radius Audit**: Dialog utama 16px, Issue cards 8px.
- [ ] **Interaction Audit**: Button "Terapkan" menggunakan efek Slash Carbon.

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Refrasa bukan sekadar "magic rewrite", tapi proses perbaikan ilmiah. Dengan menghadirkan antarmuka audit yang presisi (Mono typography & Functional colors), kita membangun kepercayaan user terhadap kualitas perbaikan akademis yang dihasilkan.
