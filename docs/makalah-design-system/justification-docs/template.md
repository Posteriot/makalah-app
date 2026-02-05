# Template Dokumen Justifikasi Redesain: [Nama Komponen/Page]

Dokumen ini adalah instrumen kontrol teknis untuk migrasi elemen UI ke standar **Makalah-Carbon**. Setiap redesain wajib mematuhi standar **Mechanical Grace** yang tertuang dalam kategori berikut.

## 0. Target Migrasi
Tentukan file mana saja yang akan terkena dampak migrasi ini:
*   **Target Components**: `src/components/...`
*   **Target Pages**: `src/app/...`
*   **Style Scope**: `src/app/globals.css` (Jika ada penambahan token).

---

## 1. Spesifikasi Visual & Token (Core Specs)

> [!IMPORTANT]
> **CSS Mandate**: Hilangkan seluruh Custom CSS (`.css` / `<style>`) dan ganti dengan **Tailwind CSS Utility Classes** sesuai standar Carbon. Custom CSS hanya boleh dipakai jika **tidak mungkin** di Tailwind, dan harus dicatat eksplisit di dokumen ini.

Gunakan nilai absolut dari sistem token. Jangan gunakan nilai ad-hoc.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: [justifikasi-warna.md] + `src/app/globals.css`*
*   **Surface/Background**: gunakan token `bg-background` atau token khusus (contoh: `--header-background`).
*   **Action/Interaction**: `oklch(...)` ([Amber/Emerald/Sky Token]).
*   **Destructive/Signal**: `oklch(...)` ([Rose Token]).
*   **Contrast Audit**: Pastikan kontras teks `oklch(0.15 0 0)` (Light) vs `oklch(0.95 0 0)` (Dark) terpenuhi.

### 1.2 Hirarki Tipografi & Data
*Referensi: [typografi.md]*
*   **Narrative (The Voice)**: Font (Sans), Weight (500), tracking (normal).
*   **Interface (The Interface)**: Font (Mono), Weight (400), tracking (wider).
*   **Signal (The Signal)**: Font (Mono), Weight (700), Case (Uppercase), tracking (widest).

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md] & [class-naming-convention.md]*
*   **Radius Scale**: `.rounded-[shell|action|badge|none]`.
*   **Border Precision**: `.border-[hairline|main|ai]` (Hairline = 0.5px).
*   **Spacing & Gaps**: 
    *   `.p-comfort` / `.gap-comfort`: `16px` (Standard inner padding & gaps).
    *   `.p-dense` / `.gap-dense`: `8px` (Tight lists & form groups).
    *   `.p-airy`: `24px+` (Landing page sections).
    *   **Logic**: Selalu gunakan kelipatan `4px` (4, 8, 12, 16, 24, 32).

### 1.4 Iconography & Interaction Signature
*Referensi: [bahasa-visual.md]*
*   **Icon Library**: **Iconoir** (Stroke: 1.5px/2px). Scale: `icon-[micro|interface|display]`.
*   **Interaction State**: `.hover-slash` (Buttons Only), `.focus-ring`, `.active-nav`.
*   **Textures**: gunakan komponen `GridPattern`, `DiagonalStripes`, `DottedPattern` (tanpa fade mask).

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Current) | Target Class (Carbon) | Aspek Migrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Container** | `.wrapper` | `.grid-cols-16` | Layout & Grid | Snap ke grid 16-kolom. |
| **Font Body** | `.text-base` | `.text-narrative` | Typography | Standarisasi narasi UI. |
| **Buttons** | `btn-primary` | `.rounded-action .hover-slash`| Shape & Motion | Estetika industrial. |
| **AI Content** | `bg-blue-50` | `border-ai bg-sky-50/10` | AI Identity | Mapping ke identitas AI. |
| **Header Surface** | `bg-background` | `--header-background` | Surface | Header harus beda dari section background. |

---

## 3. Protokol Migrasi (Step-by-Step)

### Step 1: Struktur & Layout (Zero-Chrome)
*   [ ] Redefinisi kontainer utama menggunakan **16-Column Grid**.
*   [ ] Audit visibilitas: suppression logic untuk area produktivitas (e.g. Chat path).
*   [ ] Penataan Z-Index Layers berdasarkan `.z-[base|overlay|popover|drawer]`.

### Step 2: Implementasi Token Visual
*   [ ] Penggantian semua nilai hardcoded dengan utility class Carbon.
*   [ ] Penerapan **Hybrid Radius** (Shell vs Action).
*   [ ] Validasi ketebalan garis (**Hairline 0.5px** vs **Standard 1px**).

### Step 3: Refactor Data & Tipografi
*   [ ] Pemisahan font Sans untuk naratif dan Mono untuk data/interface.
*   [ ] Penerapan uppercase + tracking pada elemen signal.

### Step 4: Industrial Texture & AI Identity
*   [ ] Penambahan tekstur (stripes/dots) via komponen `SectionBackground` dengan opacity konsisten.
*   [ ] Penerapan `.border-ai` dan warna Sky pada modul buatan mesin.

---

## 4. Checklist Verifikasi & Quality Control (QC)

- [ ] **Spacing Audit**: Pastikan semua padding/gap menggunakan token `-comfort`, `-dense`, atau `-airy`.
- [ ] **Grid Audit**: Elemen sejajar 100% dengan bento-grid/16-col grid.
- [ ] **Typo Audit**: Tidak ada font Sans pada area instruksi teknis/data.
- [ ] **Contrast Audit**: Lolos cek keterbacaan di Light & Dark mode.
- [ ] **Icon Audit**: 100% library Iconoir, no Lucide/Radial icons.
- [ ] **Interaction Audit**: Efek `.hover-slash` aktif pada tombol utama.
- [ ] **Motion Audit**: Gunakan animasi Tailwind default (mis. `animate-pulse`) tanpa keyframe custom.
- [ ] **Responsive Audit**: Breakpoint `md` dan `lg` stabil tanpa layout shift yang kasar.

---
> [!IMPORTANT]
> **Mechanical Grace Mandatory**: Jangan gunakan warna atau radius di luar token yang tersedia. Jika tidak ada di sistem, lapor ke Data Architect untuk penambahan token baru, **JANGAN** membuat inline style.
