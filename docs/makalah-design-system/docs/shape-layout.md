# Panduan Shape & Layout - Makalah-Carbon

Dokumen ini mendefinisikan rujukan fungsional untuk **bentuk (shape)**, **radius**, dan **struktur layout** aplikasi Makalah App sesuai dengan filosofi Makalah-Carbon.

## 1. Hybrid Radius Scale (Mechanical Grace)

Makalah-Carbon menggunakan skala radius yang granular untuk menciptakan kontras antara "Wadah Premium" dan "Konten Teknis".

| Token | Value | Penggunaan / Konteks |
| :--- | :--- | :--- |
| `--radius-none` | `0px` | **Core Data**: Syntax highlighting, data grid, terminal lines. |
| `--radius-xs` | `2px` | **Micro**: Internal borders, checkbox internal, micro-tags. |
| `--radius-sm` | `4px` | **Small**: Action menus, small thumbnails. |
| `--radius-s-md` | `6px` | **Badge**: Status indicators, category tags. |
| `--radius-md` | `8px` | **Standard**: Main Buttons, standard Inputs, popovers. |
| `--radius-lg` | `12px` | **Medium Card**: Bento items, sidebar items, modal inner. |
| `--radius-xl` | `16px` | **Large Container**: Outer cards, moderate page sections. |
| `--radius-2xl` | `24px` | **Main Shell**: Footer, Hero blocks, main page containers. |
| `--radius-3xl` | `32px` | **Luxe Outer**: Oversized decorative containers / Luxe shells. |
| `--radius-full` | `9999px` | **Pill**: Status dots, indicator tags (`NEW`), Login button. |

## 2. Struktur Border & Hairline (Mechanical Lines)

Kita menggunakan garis yang sangat tipis untuk menjaga kebersihan informasi, namun tetap memberikan hierarki melalui ketebalan yang terukur.

| Token | Value | Penggunaan / Konteks |
| :--- | :--- | :--- |
| `--border-none` | `0px` | Elemen tanpa pembatas visual. |
| `--border-xs` | `0.5px` | **Hairline**: Pemisah antar item list yang sangat subtle (Light Mode). |
| `--border-sm` | `1px` | **Standard**: Border default untuk Card, Input, dan Modul (Default). |
| `--border-md` | `2px` | **Emphasis**: Highlight untuk elemen aktif atau modul yang ditekankan. |
| `--border-lg` | `4px` | **Frame**: Pembatas section besar atau "Neo-Industrial" highlight. |

### Border Styles (Functional Signals)
- **Solid**: Digunakan untuk elemen statis dan terverifikasi.
- **Dashed / Dotted**: Khusus untuk **AI System Frame** (Machine-generated).

## 3. Spacing & Gap Logic (Mechanical Grid)

Makalah-Carbon membedakan antara "Napas" (Spacing) dan "Pemisah" (Gap) untuk presisi layout yang maksimal. Keduanya menggunakan **Base Unit 4px** sebagai standar harmoni.

### 3.1 Skala Jarak (Ideal Scale)

| Token | Value | Rekomendasi Penggunaan |
| :--- | :--- | :--- |
| `xs` | `4px` | Micro details (icon-to-text, internal badge). |
| `sm` | `8px` | Tight elements (label-to-input). |
| `md` | `16px` | Standard comfort (inner padding, component gaps). |
| `lg` | `24px` | Module level (card padding, module gap). |
| `xl` | `32px` | Page sectors (section margins). |
| `2xl` | `48px` | Hero elements (hero padding). |
| `3xl` | `64px` | High-end whitespace (elite landing zones). |

### 3.2 Definisi Implementasi

1.  **Spacing (Paddings/Margins)**: Digunakan untuk menentukan "napas" sebuah blok atau container (sekat internal atau jarak luar blok).
2.  **Gaps (Vertical/Horizontal)**: Digunakan untuk menentukan jarak "antar komponen" dalam satu susunan (jarak antar item dalam Flex atau Grid).

---
## 4. Responsive Grid (The 16-Column System)

Makalah-Carbon mengadopsi standar **2x Grid** dari Carbon Design System untuk menjamin stabilitas layout di berbagai ukuran layar.

### 4.1 Breakpoints & Columns

| Breakpoint | Range (Width) | Columns | Gutter / Margin |
| :--- | :--- | :--- | :--- |
| **sm** | `< 672px` | 4 | 16px / 16px |
| **md** | `672px - 1055px` | 8 | 16px / 16px |
| **lg** | `1056px - 1311px` | 16 | 32px / 16px |
| **xlg** | `1312px - 1583px` | 16 | 32px / 16px |
| **max** | `≥ 1584px` | 16 | 32px / 16px |

### 4.2 Grid Rules
- **Gutter**: Jarak antar kolom untuk memisahkan konten secara vertikal/horizontal.
    - **sm**: `12px` (Mobile tightness).
    - **md**: `16px` (Tablet standard).
    - **lg**: `32px` (Desktop standard).
    - **xl / max**: `32px` (Ultra-wide stability).
- **Margin**: Zona aman (*Safe Zone*) antara grid dan tepi layar browser.
    - **Filosofi**: Mencegah konten terlihat "terjepit" atau terpotong di tepi perangkat.
    - **Aturan**: Harus kelipatan **4px**. Standard: `16px` (sm/md), `32px` (lg), `48px` (xl/max).
    - **Contoh**: Jika layar lebar 1920px, margin kiri-kanan masing-masing 48px memberikan ruang napas yang premium di sisi luar grid.
    - **Contoh**: Sidebar profil user mengambil **4 kolom**, area Chat mengambil **9 kolom**, dan panel Activity Bar AI mengambil **3 kolom**. Total **16 kolom** penuh tanpa ada ruang kosong yang tidak terukur.

### 4.3 Hero Split (Marketing Home)
- **Hero Left**: `col-span-7`
- **Hero Right**: `col-span-9`
- **Alasan**: Menghindari overlap antara heading text dan mockup kanan.

---
## 5. Bento Grid Logic (Sub-Grid Precision)

Makalah-Carbon menggunakan **Bento Grid** untuk visualisasi data dan bento-style landing pages. Strukturnya harus selalu berkelipatan **4 kolom** dari sistem utama 16-kolom.

### 5.1 Bento Rules
- **Base Grid**: Menggunakan `grid-cols-4` (Mobile) dan `grid-cols-16` (Desktop).
- **Span Ratio**: Item bento harus memiliki rentang (span) yang harmonis:
    - **Small (1/4)**: `col-span-4`.
    - **Medium (1/2)**: `col-span-8`.
    - **Large (3/4)**: `col-span-12`.
    - **Full (1/1)**: `col-span-16`.
- **Gap Stability**: Wajib menggunakan `.gap-comfort` (16px) untuk menjaga ritme visual antar modul bento.

### 5.2 Aesthetic Snapping
Setiap modul di dalam bento wajib memiliki **Hairline Border (0.5px)** untuk memisahkan antar data jika berada dalam satu container yang sama.

## 6. Page Layout Architecture (The Blueprint)

Makalah-Carbon mengatur komposisi blok halaman untuk menjaga ritme visual dan fungsi navigasi yang konsisten.

### 6.1 Marketing & Info Pages
| Tipe Halaman | Struktur Komposisi |
| :--- | :--- |
| **Home Page** | `GlobalHeader` → `Hero` → `Section` → `Section (n)` → `Footer` |
| **Pricing** | `GlobalHeader` → `Section` (Feature/Tiers) → `Section (n)` → `Footer` **[Tanpa Hero]** |
| **About / Tentang** | `GlobalHeader` → `Section` (Story) → `Section (n)` → `Footer` **[Tanpa Hero]** |
| **Documentation** | `GlobalHeader` → `Sidebar + Side-by-side Layout` (Dense Docs) → `Article` **[Tanpa Hero]** |
| **Blog / News** | `GlobalHeader` → `Grid Module` (Factory Card Style) → `Footer` **[Tanpa Hero]** |
| **Admin Dashboard** | `AdminSidebar` (Left) → `Main Content` (Right / Scrollable) → `Header (Internal)` |
| **User Dashboard** | `GlobalHeader` → `Page Title/Filter Section` → `Papers Grid` → `Footer` |
| **Onboarding Flow** | `OnboardingHeader` → `Centered Step Module` (Focus Flow) → [No Footer] |
| **Subscription Mod**| `SubscriptionSidebar` (Left) → `Main Content` (Right) → `Grid Pattern Overlay` |
| **AI Chat Workspace** | `Sidebar Header` (Brand/Logo) → `16-Col Grid` (Workbench) → `Chat Mini Footer` |

### 6.2 Layout Rules
1. **Hero Exclusion**: Halaman fungsional (Pricing, About, Docs, Blog) dilarang menggunakan Hero yang terlalu ekspansif untuk mempercepat akses informasi.
2. **Standard Padding**: Setiap `Section` wajib menggunakan padding atas-bawah minimal `48px` (2xl) atau `64px` (3xl) untuk landing page premium.
3. **Footer Stability**: Footer harus selalu menggunakan radius paling besar (`--radius-2xl`) pada sisi atas untuk menutup aliran visual halaman secara solid.
4. **Chat Efficiency Constraint**: Khusus untuk **AI Chat Workspace**, Global Header dan Footer umum dilarang keras muncul (dibuang). Akses navigasi kembali ke Home wajib menggunakan Brand Logo yang terintegrasi di `Sidebar Header`.
5. **Chat Mini-Footer**: Footer di Chat Workspace wajib berbentuk horizontal 1 baris yang padat (copyright, tahun, brand tanpa logo) untuk menghemat vertical real-estate demi area workspace yang lebih luas.
6. **Menu Suppression**: Main Menu navigasi tidak boleh muncul di area Chat Workspace untuk menjaga fokus kognitif penuh pada pengerjaan makalah.

---
> [!NOTE]
> Warna untuk border tetap dirujuk pada [justifikasi-warna.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-design-system/justifikasi-warna.md).
