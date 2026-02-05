# Guideline & Kontrol Teknis: Migrasi Dashboard Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan **Dashboard Section** (Admin, Subscription, & Papers) ke standar **Makalah-Carbon**. Dashboard diposisikan sebagai "Mission Control" yang mengutamakan kepadatan informasi yang fungsional dan presisi diagnostik (**Mechanical Grace**).

## 0. Target Migrasi
*   **Target Components**: 
    *   `src/components/admin/AdminPanelContainer.tsx` (dan semua sub-manager)
    *   `src/components/paper/PaperSessionsContainer.tsx`
    *   `src/components/paper/PaperSessionCard.tsx`
*   **Target Pages**: 
    *   `src/app/(dashboard)/dashboard/page.tsx`
    *   `src/app/(dashboard)/dashboard/papers/page.tsx`
    *   `src/app/(dashboard)/subscription/overview/page.tsx`
*   **Target Layouts**: 
    *   `src/app/(dashboard)/layout.tsx`
    *   `src/app/(dashboard)/subscription/layout.tsx`
*   **Style Scope**: Penghapusan Custom CSS (`admin-styles.css`), migrasi Lucide ke Iconoir, dan standardisasi 16-Column Grid.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **Diagnostic Density**: Dashboard dirancang untuk efisiensi operasional. Gunakan `.p-dense` untuk area tabel dan list guna memaksimalkan visibilitas data dalam satu layar.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: [justifikasi-warna.md](../docs/justifikasi-warna.md)*
*   **Background Shell**: `bg-background` (Slate 50 / Slate 900).
*   **Sidebar Surface**: `bg-slate-200/40` (Light) / `bg-slate-800/20` (Dark).
*   **Aksen Role/Status**: 
    *   Superadmin/Critical: `rose-500` (Signal Red).
    *   Admin/Action: `amber-500` (Main Identity).
    *   User/Standard: `slate-400` (Interface Gray).
*   **Internal Borders**: `.border-hairline` (0.5px) untuk pemisah antar modul admin.

### 1.2 Hirarki Tipografi
*Referensi: [typografi.md](../docs/typografi.md)*
*   **Operational Headings (H1/H2)**: 
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Tracking: `tracking-tighter`.
*   **Data Points (Counts, Dates, Stats)**:
    *   Font: **Geist Mono**.
    *   Weight: `Medium (500)`.
    *   Size: `Tabular-nums`.
*   **Navigation & Labels**:
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Case: `UPPERCASE` (untuk Header) / `Default` (untuk Links).
*   **Descriptions**:
    *   Font: **Geist Sans** (`text-narrative`).

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md](../docs/shape-layout.md)*
*   **Main Modules (Bento Items)**: `.rounded-shell` (16px).
*   **Status Badges & Controls**: `.rounded-badge` (6px) atau `.rounded-action` (8px).
*   **Layout Structure**: Sidebar mengambil **3 Kolom** (Desktop) dan Content mengambil **13 Kolom** dari total 16-Column Grid.

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard Layout** | `flex` | `grid grid-cols-16 gap-0` | Layout | Snap ke grid 16-kolom (Split 3:13). |
| **Aside Sidebar** | `w-[200px]` | `col-span-3 border-r-hairline`| Layout & Precision | Konsistensi lebar kolom & garis hairline. |
| **Admin Cards** | `rounded-lg border shadow-sm` | `.rounded-shell border-main bg-card/40` | Shape & Surface | Hybrid Radius Shell + Industrial background. |
| **Stats Numbers** | `text-2xl font-semibold` | `.text-signal tabular-nums` | Typography | Geist Mono untuk data numerik. |
| **Progress Bars** | `h-3 bg-muted` | `.h-1 bg-slate-800` | Precision | "Minimalist Mechanical" progress design. |
| **Sidebar Icons** | `LucideIcon` | `IconoirIcon` | Iconography | Standar Iconoir (1.5px stroke). |
| **Action Buttons** | `rounded-md font-medium px-3` | `.rounded-action .text-signal hover-slash` | Interaction | Geist Mono + Hover Slash signature. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Penyelarasan Layout & Grid
*   **Aksi**: 
    1. Ganti flexbox pada `AdminPanelContainer` dan `SubscriptionLayout` menjadi `grid grid-cols-16`. 
    2. Sidebar diset mengambil `col-span-3`. 
    3. Border pemisah sidebar menggunakan `.border-hairline` (0.5px).

### Step 2: Refactor Icons (Lucide to Iconoir)
*   **Aksi**: 
    1. Ganti semua import `lucide-react` dengan `iconoir-react`.
    2. Pastikan stroke width konsisten di `1.5` atau `2` sesuai konteks intensitas UI.

### Step 3: Standarisasi Modul Admin (The Brain)
*   **Aksi**:
    1. Hapus `admin-styles.css` secara bertahap dan pindahkan styling ke Tailwind.
    2. Semua modul (UserList, PromptsManager, dll) harus dibungkus `.rounded-shell` (16px).
    3. Gunakan `.bg-card/30 backdrop-blur-md` untuk surface modul guna memberikan kesan kedalaman industrial.

### Step 4: Refactor Paper Sessions (User Data)
*   **Aksi**: 
    1. Kartu paper (`PaperSessionCard`) dimigrasikan ke `.rounded-shell`.
    2. Tanggal update dan status progres menggunakan **Geist Mono** regular.
    3. Badge status penulisan menggunakan `.rounded-badge` (6px).

### Step 5: Interaction & Feedback
*   **Aksi**:
    1. Semua tombol navigasi sidebar yang aktif menggunakan aksen `border-l-2 border-amber-500`.
    2. Tombol aksi (Manage, Create, Delete) wajib memiliki `.hover-slash`.

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Grid Audit**: Sidebar (3-col) dan Content (13-col) snap sempurna ke 16-kolom grid.
- [ ] **Typo Audit**: Data teknis (counts, dates, IDs) menggunakan Geist Mono.
- [ ] **Radius Audit**: Main Module Containers = 16px. Badges & Form controls = 6px-8px.
- [ ] **Border Audit**: Border internal dan sekat sidebar menggunakan hairline 0.5px.
- [ ] **Color Audit**: Warna role (Superadmin=Rose, Admin=Amber) sinkron di seluruh dashboard.
- [ ] **Icon Audit**: Tidak ada lagi import dari `lucide-react`.
- [ ] **Interaction Audit**: Semua tombol konfirmasi dan primary action memiliki efek `.hover-slash`.

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Dashboard adalah jantung operasional Makalah App. Ia tidak butuh gradien cantik, ia butuh garis yang lurus, angka yang jelas (Mono), dan feedback yang instan. Pastikan setiap piksel memiliki tujuan fungsional.
