# Dokumen Justifikasi Redesain: UserSettingsModal

Dokumen ini adalah instrumen kontrol teknis migrasi `UserSettingsModal` ke standar Makalah-Carbon. Arah visual mengacu ke prinsip Mechanical Grace pada `MANIFESTO.md`: presisi, keterbacaan tinggi, dan konsistensi token.

## 0. Target Migrasi
- **Target Components**: `src/components/settings/UserSettingsModal.tsx`
- **Target Pages**: Tidak ada page baru; komponen dipakai pada area settings/dashboard.
- **Style Scope**: `src/app/globals.css` (blok `.user-settings-*`, `.settings-*`, `.accordion-*`, termasuk override responsive).

---

## 1. Spesifikasi Visual & Token (Core Specs)

> [!IMPORTANT]
> **CSS Mandate**: Hilangkan seluruh Custom CSS khusus modal ini dan ganti dengan Tailwind CSS Utility Classes sesuai standar Carbon. Custom CSS hanya boleh dipakai jika tidak mungkin di Tailwind, dan harus dicatat eksplisit di dokumen ini.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: `docs/makalah-design-system/docs/justifikasi-warna.md` + `src/app/globals.css`*
- **Surface/Background**: Gunakan token `bg-background`, `bg-card`, `border-border`, dan `text-foreground`.
- **Action/Interaction**: Gunakan token semantik berbasis Amber/Emerald/Sky; CTA upgrade pakai token sukses (`--success`) tanpa nilai ad-hoc inline.
- **Destructive/Signal**: Aksi destruktif/close pakai token Rose (`--destructive`) dengan foreground yang kontras.
- **Contrast Audit**: Pastikan kontras teks `oklch(0.15 0 0)` (Light) vs `oklch(0.95 0 0)` (Dark) terpenuhi.

### 1.2 Hirarki Tipografi & Data
*Referensi: `docs/makalah-design-system/docs/typografi.md` + `docs/makalah-design-system/docs/class-naming-convention.md`*
- **Narrative (The Voice)**: Gunakan Sans untuk narasi pendek (subtitle/hint), weight `500` bila berfungsi sebagai penjelas utama.
- **Interface (The Interface)**: Gunakan Mono untuk label field, kontrol akun, data email/role, weight `400`.
- **Signal (The Signal)**: Gunakan Mono `700`, uppercase, tracking lebar untuk status/badge/penanda aktif.

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: `docs/makalah-design-system/docs/shape-layout.md` + `docs/makalah-design-system/docs/class-naming-convention.md`*
- **Radius Scale**: Gunakan `.rounded-shell`, `.rounded-action`, `.rounded-badge`, dan `.rounded-none` sesuai konteks shell/action/signal/data.
- **Border Precision**: Gunakan `.border-hairline` (0.5px) untuk separator internal dan `.border-main` (1px) untuk card/input.
- **Spacing & Gaps**: Gunakan `.p-comfort` / `.gap-comfort` (16px), `.p-dense` / `.gap-dense` (8px), `.p-airy` (24px+) dengan kelipatan 4px.

### 1.4 Iconography & Interaction Signature
*Referensi: `docs/makalah-design-system/docs/bahasa-visual.md` + `docs/makalah-design-system/docs/komponen-standar.md`*
- **Icon Library**: Gunakan `iconoir-react` dengan stroke `1.5px`/`2px` dan skala `icon-micro`/`icon-interface`/`icon-display`.
- **Interaction State**: Terapkan `.hover-slash` (CTA prioritas), `.focus-ring` (input/button), `.active-nav` (tab aktif).
- **Textures**: Jika dibutuhkan, gunakan `GridPattern`, `DiagonalStripes`, atau `DottedPattern` tanpa fade mask.

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

Matriks berikut adalah audit **1:1 untuk 52 class legacy** yang saat ini dipakai di `UserSettingsModal`.

| Elemen UI | Class Legacy (Current) | Target Class (Carbon) | Aspek Migrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| Root Modal | `user-settings-modal` | `fixed inset-0 z-overlay flex items-center justify-center` | Layout & Layer | Overlay modal dipindah ke utility penuh tanpa class global khusus. |
| Backdrop | `user-settings-backdrop` | `absolute inset-0 bg-background/70 backdrop-blur-sm` | Surface | Backdrop konsisten dengan standar modal Carbon. |
| Modal Container | `user-settings-container` | `relative z-popover w-full max-w-[720px] h-[560px] rounded-shell border-main bg-card shadow-lg overflow-hidden` | Shell | Container utama mengikuti shell radius + border tokenized. |
| Header Wrapper | `user-settings-header` | `flex items-start justify-between px-comfort pt-comfort pb-dense border-b border-main shrink-0` | Header Layout | Struktur header tidak lagi bergantung custom CSS. |
| Header Title Group | `user-settings-title-area` | `flex flex-col gap-1` | Spacing | Jarak internal heading diseragamkan ke skala spacing sistem. |
| Header Title | `user-settings-title` | `text-signal text-lg` | Typography | Judul modal jadi signal text sesuai hierarki Carbon. |
| Header Subtitle | `user-settings-subtitle` | `text-narrative text-sm text-muted-foreground` | Typography | Subtitle naratif pakai token warna teks sekunder. |
| Close Button | `user-settings-close-btn` | `inline-flex h-8 w-8 items-center justify-center rounded-action text-muted-foreground hover:bg-destructive hover:text-destructive-foreground focus-ring` | Interaction | Hover/focus untuk tombol close distandarkan. |
| Modal Body | `user-settings-body` | `flex min-h-0 flex-1 max-md:flex-col` | Layout | Struktur body desktop-mobile dipindahkan ke utility responsive. |
| Sidebar Nav Wrapper | `user-settings-nav` | `w-[200px] shrink-0 flex flex-col gap-dense p-dense pt-comfort border-r border-main bg-muted/30 max-md:w-full max-md:flex-row max-md:flex-wrap` | Navigation Layout | Sidebar tab tetap stabil pada desktop dan wrap pada mobile. |
| Sidebar Nav Item | `user-settings-nav-item` | `relative inline-flex items-center gap-3 rounded-action px-3 py-2 text-interface text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-ring [&.active]:active-nav` | Navigation State | Active/hover/focus distandarkan dan tidak tergantung pseudo custom murni. |
| Content Wrapper | `user-settings-content` | `flex-1 min-w-0 overflow-y-auto p-comfort max-sm:p-5` | Content Layout | Area konten scrollable dipertahankan dengan token spacing. |
| Tab Panel | `user-settings-tab` | `hidden [&.active]:block` | Visibility State | Mekanisme show/hide tab tetap eksplisit tapi utility-first. |
| Section Header Wrapper | `settings-content-header` | `mb-comfort` | Spacing | Jarak antar header section dikunci ke token 16px. |
| Section Title | `settings-content-title` | `flex items-center gap-2 text-signal text-lg` | Typography | Judul tab profil/keamanan/status disatukan ke signal style. |
| Section Subtitle | `settings-content-subtitle` | `mt-1 text-narrative text-sm text-muted-foreground` | Typography | Deskripsi section dipetakan ke narrative style. |
| Card Shell | `settings-card` | `mb-comfort overflow-hidden rounded-action border-main bg-card` | Card Structure | Shell card diseragamkan lintas section. |
| Card Header | `settings-card-header` | `border-b border-main px-comfort py-dense text-interface text-sm font-medium` | Card Header | Header card mengikuti interface typography + border utama. |
| Card Body | `settings-card-body` | `p-comfort` | Card Body Spacing | Padding isi card distandarkan ke token comfort. |
| Profile Info Row | `settings-profile-info` | `flex items-center gap-dense` | Row Layout | Komposisi avatar + nama jadi utility murni. |
| Avatar Base | `settings-avatar` | `inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground text-sm font-semibold` | Avatar Visual | Avatar mempertahankan fallback initial dengan token warna primer. |
| Profile Name | `settings-profile-name` | `text-interface text-sm font-medium` | Typography | Nama user dikategorikan sebagai interface data. |
| Email Row | `settings-email-item` | `flex items-center gap-2 text-interface text-sm` | Row Layout | Baris email jadi konsisten dengan row data ringan. |
| Primary Badge | `settings-badge-primary` | `inline-flex rounded-badge border-main bg-muted px-2 py-0.5 text-signal text-[10px]` | Badge | Badge “Utama” dipetakan ke signal badge tokenized. |
| Generic Settings Row | `settings-row` | `grid grid-cols-[120px_1fr_auto] items-center gap-dense` | Grid Layout | Struktur label-value-action tetap sama tapi utility-first. |
| Settings Label | `settings-row-label` | `text-interface text-xs text-muted-foreground` | Typography | Label data menjadi mono/interface. |
| Settings Value | `settings-row-value` | `min-w-0 text-interface text-sm text-foreground` | Typography | Value data pakai interface style agar konsisten dengan tabel data. |
| Row Action Link | `settings-row-action` | `text-interface text-sm font-medium text-primary hover:opacity-80 focus-ring` | Interaction | Aksi inline dapat focus state yang jelas. |
| Password Dots | `settings-password-dots` | `tracking-[0.2em] text-muted-foreground` | Data Display | Visual mask password dipertahankan tanpa custom selector. |
| Accordion Full Width | `settings-accordion-fullwidth` | `w-full` | Width Control | Wrapper edit mode menjadi utility sederhana. |
| Accordion Header | `accordion-fw-header` | `mb-comfort text-interface text-sm font-semibold` | Accordion Heading | Heading edit mode dipetakan ke interface heading. |
| Accordion Body | `accordion-fw-body` | `flex flex-col gap-comfort` | Accordion Layout | Stack field di edit mode distandarkan gap-nya. |
| Accordion Footer | `accordion-fw-footer` | `mt-5 flex justify-end gap-dense border-t border-main pt-comfort` | Action Footer | Area tombol edit mode jadi konsisten antar tab. |
| Avatar Row | `accordion-avatar-row` | `flex items-center gap-dense` | Row Layout | Baris avatar upload dipindah ke utility murni. |
| Avatar Size Variant | `accordion-avatar` | `size-12 text-base` | Avatar Variant | Varian ukuran avatar edit mode dipisahkan jelas. |
| Avatar Meta Column | `accordion-avatar-info` | `flex flex-col gap-1` | Column Layout | Informasi upload dibuat stack dengan gap token. |
| Upload Button | `accordion-upload-btn` | `inline-flex w-fit rounded-action border-main px-3 py-1.5 text-interface text-sm hover:bg-accent focus-ring disabled:opacity-50` | Interaction | Tombol upload dapat state hover/focus/disabled standar. |
| Upload Hint | `accordion-upload-hint` | `text-narrative text-xs text-muted-foreground` | Helper Text | Hint upload mengikuti style naratif sekunder. |
| Field Grid | `accordion-fields-row` | `grid grid-cols-2 gap-dense max-sm:grid-cols-1` | Responsive Form | Dua kolom desktop, satu kolom mobile tanpa media query custom. |
| Field Wrapper | `accordion-field` | `flex flex-1 flex-col gap-1.5` | Field Structure | Struktur label-input distandarkan untuk semua field. |
| Field Full Width | `accordion-field-full` | `w-full` | Width Control | Field password full-width tidak lagi bergantung class khusus. |
| Field Label | `accordion-label` | `text-interface text-xs font-medium text-foreground` | Typography | Label form dipindah ke semantic interface text. |
| Input Wrapper | `accordion-input-wrapper` | `relative flex items-center` | Input Composition | Penempatan eye-toggle jadi pola wrapper standar. |
| Input Element | `accordion-input` | `h-10 w-full rounded-action border-main bg-background px-3 text-interface text-sm focus-ring` | Form Control | Input state (normal/focus) dipusatkan pada utility token. |
| Eye Toggle Button | `accordion-eye-btn` | `absolute right-2 inline-flex h-7 w-7 items-center justify-center rounded-badge text-muted-foreground hover:bg-accent focus-ring` | Interaction | Tombol lihat password mendapat focus indicator yang jelas. |
| Checkbox Row | `accordion-checkbox-row` | `flex items-start gap-2.5` | Checkbox Layout | Struktur checkbox + teks jadi utility murni. |
| Checkbox Input | `accordion-checkbox` | `mt-0.5 size-[18px] shrink-0 accent-primary` | Checkbox Control | Ukuran dan warna checkbox distandarkan dengan token primer. |
| Checkbox Content | `accordion-checkbox-content` | `flex flex-col gap-0.5` | Content Stack | Label + hint checkbox dirapikan dengan gap kecil tokenized. |
| Checkbox Label | `accordion-checkbox-label` | `text-interface text-xs font-medium text-foreground` | Typography | Label checkbox pakai interface text agar seragam form. |
| Checkbox Hint | `accordion-checkbox-hint` | `text-narrative text-xs leading-5 text-muted-foreground` | Helper Text | Hint keamanan tetap terbaca pada light/dark. |
| Cancel Button | `accordion-cancel-btn` | `rounded-action border-main bg-background px-4 py-2 text-interface text-sm hover:bg-accent focus-ring disabled:opacity-50` | Button Secondary | Tombol batal jadi secondary action konsisten. |
| Save Button | `accordion-save-btn` | `rounded-action bg-primary px-5 py-2 text-signal text-primary-foreground hover-slash focus-ring disabled:opacity-50` | Button Primary | Tombol simpan jadi primary CTA sesuai signature interaction. |

---

## 3. Protokol Migrasi (Step-by-Step)

### Step 1: Struktur & Layout (Zero-Chrome)
- [ ] Redefinisi struktur modal ke utilitas Tailwind (root, backdrop, container, header, body, content).
- [ ] Audit visibilitas state tab/profile/security/status agar tidak bergantung pada class display custom.
- [ ] Penataan z-index sesuai `.z-base`, `.z-overlay`, `.z-popover`, `.z-drawer` dari class naming convention.

### Step 2: Implementasi Token Visual
- [ ] Ganti seluruh nilai hardcoded pada warna/radius/border ke utility class tokenized.
- [ ] Terapkan Hybrid Radius (Shell vs Action vs Badge) untuk container, card, tombol, dan badge.
- [ ] Validasi ketebalan garis: Hairline (0.5px) untuk separator dan Standard (1px) untuk card/input.

### Step 3: Refactor Data & Tipografi
- [ ] Pisahkan penggunaan Sans (narasi) dan Mono (interface/data/status) sesuai panduan tipografi.
- [ ] Terapkan uppercase + tracking untuk signal text (badge, label status, CTA signal).
- [ ] Standarkan style label form dan data akun agar konsisten lintas tab.

### Step 4: Industrial Texture & AI Identity
- [ ] Tidak menambah tekstur sebagai default pada modal settings; tetap clean-first sesuai konteks utilitarian.
- [ ] Jika ada kebutuhan aksen khusus, hanya gunakan pattern standar (`GridPattern`/`DottedPattern`/`DiagonalStripes`) dengan opacity rendah.
- [ ] Pastikan elemen terkait AI/subscription tetap mengikuti signal color system (Amber/Emerald/Sky/Rose).

---

## 4. Checklist Verifikasi & Quality Control (QC)

- [ ] **Spacing Audit**: Semua padding/gap memakai token `-comfort`, `-dense`, atau `-airy`.
- [ ] **Grid Audit**: Layout modal dan isi tab stabil pada desktop/tablet/mobile tanpa overflow kasar.
- [ ] **Typo Audit**: Tidak ada campuran font yang melanggar Voice/Interface/Signal hierarchy.
- [ ] **Contrast Audit**: Kontras teks/aksi lolos di light mode dan dark mode.
- [ ] **Icon Audit**: Semua ikon tetap `iconoir-react`, tanpa library campuran.
- [ ] **Interaction Audit**: State `.focus-ring`, `.active-nav`, dan `.hover-slash` aktif di elemen yang ditentukan.
- [ ] **Motion Audit**: Gunakan transisi default utility, tanpa keyframe custom baru.
- [ ] **Responsive Audit**: Breakpoint `md` dan `lg` stabil tanpa layout shift mengganggu.

---

> [!IMPORTANT]
> **Mechanical Grace Mandatory**: `UserSettingsModal` menangani area sensitif (profil, password, role, subscription), jadi semua keputusan visual wajib tokenized, terukur, dan bebas style ad-hoc.
