# Guideline & Kontrol Teknis: Migrasi Global Header & User Dropdown

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan komponen Header ke standar **Makalah-Carbon**. Dokumen ini menggabungkan aturan dari seluruh ekosistem dokumen desain untuk menjamin presisi **Mechanical Grace**.

## 0. Target Migrasi
*   **Target Components**: 
    *   `src/components/layout/header/GlobalHeader.tsx`
    *   `src/components/layout/header/UserDropdown.tsx`
*   **Target Pages**: Seluruh page kecuali `/chat/*` (Header disembunyikan di area chat).
*   **Style Scope**: Pembersihan inline styles dan transisi ke Tailwind utility classes.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **CSS Mandate**: Hilangkan seluruh Custom CSS legacy dan ganti dengan **Tailwind CSS Utility Classes**. Seluruh transisi, hover effect (Slash Pattern), dan layouting wajib menggunakan abstraksi Tailwind/Carbon.

Penerapan token desain harus merujuk pada nilai teknis berikut untuk menjaga konsistensi instrumentasi.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)

Mengacu pada [justifikasi-warna.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/justifikasi-warna.md) & `src/app/globals.css`:

* **Header Surface (Light)**: `var(--slate-200)` → `oklch(.929 .013 255.508)`.
* **Header Surface (Dark)**: `var(--slate-700)` → `oklch(.372 .044 257.287)`.
* **Action Accent (Hover Slash)**: `oklch(.769 .188 70.08)` (Amber 500) dengan opacity subtle atau diagonal pattern.
* **Destructive (Logout)**: `oklch(.645 .246 16.439)` (Rose 500).
* **Adaptive Text**: `oklch(0.15 0 0)` (Light) / `oklch(0.95 0 0)` (Dark).

### 1.2 Hirarki Tipografi

Mengacu pada [typografi.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/typografi.md):

* **Nav Links (The Voice)**:
  * Font: **Geist Sans**.
  * Weight: `Medium (500)`.
  * Size: `12px`.
  * Case: `UPPERCASE`.
  * Tracking: `tracking-wider` (0.05em).
* **Dropdown Menu (The Interface)**:
  * Font: **Geist Mono**.
  * Weight: `Regular (400)`.
  * Size: `12px`.
* **User Labels/Badges**:
  * Font: **Geist Mono**.
  * Weight: `Bold (700)`.
  * Size: `10px`.
  * Case: `UPPERCASE`.

### 1.3 Shape, Spacing & Gaps (Mechanical Breath)

Mengacu pada [shape-layout.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/shape-layout.md) & [class-naming-convention.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/class-naming-convention.md):

* **Radius (Action)**: `.rounded-action` (8px) untuk trigger dropdown, buttons, dan switcher tema.
* **Radius (Menu)**: `.rounded-md` (8px) untuk popover menu dropdown.
* **Gap Standard**: `.gap-comfort` (16px) untuk jarak antar elemen navigasi utama.
* **Gap Dense**: `.gap-dense` (8px) untuk elemen yang lebih rapat (e.g. icon + text).
* **Padding Outer**: Menggunakan grid margins (Desktop: 32px / Mobile: 16px).
* **Z-Index**: Header berada pada layer `.z-drawer` (50) untuk memastikan tetap di atas content saat scrolling.

---

## 2. Tabel Pemetaan & Naming Convention

| Elemen UI                       | Target Class (Makalah-Carbon)                             | Aspek yang Dimigrasi                     | Ref. Dokumen                   |
| :------------------------------ | :-------------------------------------------------------- | :--------------------------------------- | :----------------------------- |
| **Header Container**      | `global-header z-drawer`                               | Warna dari `--header-background` + Elevasi z-index | `justifikasi-warna.md`      |
| **Inner Container**       | `grid grid-cols-16 gap-comfort max-w-7xl`               | Layout 16-Col Snap + Comfort Spacing     | `shape-layout.md`            |
| **Nav Links**             | `.text-narrative uppercase tracking-wider`                | Geist Sans + Industrial Signal           | `typografi.md`               |
| **User Dropdown Trigger** | `.rounded-action border-main`                           | Shape Radius (8px) + Border Solid 1px    | `shape-layout.md`            |
| **Menu Items**            | `.text-interface p-dense`                               | Geist Mono + Dense Spacing (8px)         | `class-naming-convention.md` |
| **Sign Out**              | `text-rose-500 font-mono`                               | Rose-500 Signal + Mono Font              | `justifikasi-warna.md`       |

---

## 3. Protokol Migrasi (Step-by-Step)

### Step 1: Arsitektur Zero-Chrome

* Hapus border bawah (`header-bottom-line`).
* Aktifkan *Suppression Logic*: Sembunyikan Header secara total di path `/chat/*`.

### Step 2: Implementasi 16-Column Snap

Gunakan `grid` untuk `header-inner` dengan pembagian kolom:

* `col-span-4`: Brand Logo & Status area.
* `col-span-12`: Navigation bar + Theme Toggle + User Action area (semua di-align ke **kanan/justify-end**).

### Step 3: Refactor Navigasi (The Voice)

Gunakan komponen `Button` variant `ghost`.

* **Alignment**: Navigasi harus berjejer di sisi kanan, bersebelahan dengan Toggle Mode dan Dropdown User.
* **Hover State**: Gunakan transisi warna/opacity standar. **DILARANG** menggunakan `.hover-slash` pada link navigasi.
* Update transisi durasi: `Standard (250ms)` dengan `cubic-bezier(0.4, 0, 0.2, 1)`.
* **Catatan Implementasi**: Hover nav = warna redup (muted) + underline dotted.

### Step 4: Protokol Adaptive Theme (Light/Dark)

* **Logo Swapping**: Pastikan logo menggunakan switch otomatis (Light/Dark assets).
* **Theme Toggle**: Gunakan `.rounded-action` (8px). Gunakan ikon Iconoir: `SunLight` & `HalfMoon`.
* **Contrast Audit**: Teks harus terbaca di `Slate 200` vs `Slate 700`.

### Step 5: Mobile Menu (The Drawer)

* **Background Textures**: Pertahankan elemen `.mobile-menu__auth-bg-stripes` dan `.mobile-menu__auth-bg-dots` untuk konsistensi brand.
* **Typo**: Gunakan `.text-narrative uppercase` untuk links utama. Gunakan `.text-interface` (Mono) untuk User Accordion (Atur Akun, Subskripsi).
* **Radius**: Ganti `.rounded-full` pada avatar ke `.rounded-action` (atau circle jika diatur dalam shell).

### Step 6: Standarisasi User Dropdown

* Ubah wrapper menu menjadi `.rounded-md` dengan `shadow-xl`.
* **Icon Validation**: Pastikan semua ikon konsisten menggunakan **Iconoir** (Stroke: 1.5px). Jangan campur dengan Lucide.
* Wajib gunakan `.text-interface` (Geist Mono) untuk semua baris menu.

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Spacing & Gap Audit**: Pastikan padding dan gap menggunakan token `.gap-comfort` (16px) atau `.gap-dense` (8px).
- [ ] **Radius Audit**: Pastikan trigger menggunakan `.rounded-action` (8px) dan menu menggunakan `.rounded-md` (8px).
- [ ] **Borderless Check**: Header harus bersih tanpa garis horizontal di bawahnya.
- [ ] **Suppression Check**: Buka `/chat`, header harus `null` (Total Hide).
- [ ] **Scroll Visibility**: Pastikan logika `isHidden` (scroll-based) tetap berjalan di page non-chat.
- [ ] **Typo Audit**: Nav link = Sans (Kapital). Menu dropdown = Mono.
- [ ] **Color Audit**: Logout = Rose-500.
- [ ] **Grid Audit**: Content sejajar dengan Bento Grid 16-kolom.
- [ ] **Icon Audit**: Semua ikon dipastikan dari library `Iconoir` dengan stroke 1.5px.
- [ ] **Texture Audit**: Pola garis/dots di mobile menu harus tetap ada namun bersih.

---

> [!IMPORTANT]
> **Mechanical Grace Hint**: Desain ini tidak boleh menghilangkan "jiwa" aplikasi. Pertahankan tekstur industrial (stripes) di mobile menu, tapi rapikan tipografinya menggunakan sistem Mono/Sans yang baru.
