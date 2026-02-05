# Guideline & Kontrol Teknis: Migrasi Settings & Account Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan **Settings Section** (Halaman Pengaturan & Status Akun) ke standar **Makalah-Carbon**. Migrasi ini memastikan area konfigurasi user tetap fungsional, transparan, dan memiliki estetika "Academic Instruments" (**Mechanical Grace**).

## 0. Target Migrasi
*   **Target Components**: `src/components/user/AccountStatusPage.tsx`
*   **Context**: Komponen ini di-inject ke dalam Clerk `UserProfile` sebagai custom page.
*   **Style Scope**: Penyelarasan tipografi, standardisasi border, dan sinkronisasi dengan Clerk branding.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **Data Integrity**: Area pengaturan adalah area kebenaran data. Penggunaan **Geist Mono** untuk nilai data (email, role, status) adalah wajib untuk memberikan kesan akurasi diagnostik.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: [justifikasi-warna.md](../docs/justifikasi-warna.md)*
*   **Surface**: `bg-card` (Slate 50 / Slate 900).
*   **Active Accents**: `amber-500` (Amber 500) untuk elemen atensi/branding.
*   **Role Indicators**: Mengikuti standar `RoleBadge` (Admin=Amber, Superadmin=Rose).

### 1.2 Hirarki Tipografi
*Referensi: [typografi.md](../docs/typografi.md)*
*   **Settings Headings (H1)**: 
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
*   **Field Labels**:
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Case: `UPPERCASE`.
    *   Size: `10px`.
    *   Tracking: `tracking-widest`.
*   **Field Values (The Interface)**:
    *   Font: **Geist Mono**.
    *   Weight: `Regular (400)`.
*   **Descriptions**:
    *   Font: **Geist Sans** (`text-narrative`).

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md](../docs/shape-layout.md)*
*   **Field Rows**: `.border-b-hairline` (0.5px) untuk pemisah antar baris informasi.
*   **Container Padding**: Menggunakan `.p-airy` (24px) untuk sirkulasi udara visual yang baik.
*   **Radius Control**: Mengadopsi `.rounded-action` (8px) jika terdapat tombol aksi tambahan.

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Section Header** | `text-xl font-semibold` | `.text-signal tracking-tight` | Typography | Geist Mono Heading. |
| **Field Labels** | `text-sm font-medium` | `.text-signal tracking-widest` | Typography | Geist Mono Signal style. |
| **Field Values** | `text-sm text-muted-fore...`| `.text-interface` | Typography | Geist Mono untuk data teknis. |
| **Row Divider** | `border-b` | `.border-b-hairline` | Precision | Hairline separator (0.5px). |
| **Loading State** | `Memuat...` | `.text-signal animate-pulse` | Interaction | Sinyal loading industrial. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Refactor Headers
*   **Aksi**: Ubah judul "Status Akun" menggunakan **Geist Mono** (Bold 700). Pastikan deskripsi di bawahnya menggunakan **Geist Sans** dengan style `.text-narrative`.

### Step 2: Implementasi Signal Labels
*   **Aksi**: Ganti label (Email, Role, Subscription) menjadi **Geist Mono**, Uppercase, dan tracking-widest. Ini menciptakan kontras antara "Label Kontrol" dan "Nilai Data".

### Step 3: Standarisasi Data Values
*   **Aksi**: Pastikan email user dan status subskripsi menggunakan **Geist Mono**. Nilai subskripsi (e.g., "Pro") diberikan style `.text-interface` dengan warna aksen jika perlu.

### Step 4: Precision Border Tuning
*   **Aksi**: Ganti `border-b` standar pada baris informasi dengan `.border-b-hairline` (0.5px). Ini memberikan kesan UI yang lebih tipis dan canggih (Technical Industrialism).

### Step 5: Clerk UI Synchronization
*   **Aksi**: Karena komponen ini muncul di dalam modal Clerk, pastikan padding kontainer (`p-6`) tetap konsisten dengan wrapper modal Clerk agar tidak terasa "patah" secara visual.

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Typo Audit**: Heading, Label, dan Value secara konsisten menggunakan Geist Mono. Deskripsi menggunakan Geist Sans.
- [ ] **Border Audit**: Baris pemisah informasi menggunakan hairline 0.5px.
- [ ] **Color Audit**: RoleBadge menggunakan token Amber/Rose yang sinkron.
- [ ] **Spacing Audit**: Padding `p-6` konsisten dengan Clerk UserProfile padding.
- [ ] **Responsive Audit**: Tampilan tetap rapi saat modal Clerk mengecil di mobile.

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Halaman pengaturan adalah area di mana user mencari kepastian akan identitas dan status mereka. Penggunaan Geist Mono pada area ini memberikan rasa "Keamanan Data" dan "Presisi Sistem" yang tidak bisa diberikan oleh font Sans biasa.
