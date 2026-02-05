# Guideline & Kontrol Teknis: Migrasi Chat Artifact System & Indicators Redesign (Fase 3)

Dokumen ini adalah panduan teknis untuk memigrasikan **Artifact System & Specialized Indicators** ke standar **Makalah-Carbon**. Ini adalah Fase 3 (Terakhir) dari redesain fitur Chat, fokus pada sistem manajemen dokumen dinamis (Artifact) dan bahasa visual untuk status pemrosesan AI.

## 0. Target Migrasi
*   **Artifact Explorer**: `src/components/chat/ArtifactPanel.tsx`, `ArtifactList.tsx`.
*   **Editor & Viewer**: `src/components/chat/ArtifactViewer.tsx`, `ArtifactEditor.tsx`, `FullsizeArtifactModal.tsx`.
*   **Diagnostics & History**: `src/components/chat/VersionHistoryDialog.tsx`, `ArtifactIndicator.tsx`.
*   **AI State Indicators**: `ThinkingIndicator.tsx`, `SearchStatusIndicator.tsx`, `ToolStateIndicator.tsx`, `SourcesIndicator.tsx`, `QuotaWarningBanner.tsx`.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **Diagnostic Precision**: Sistem Artifact dan Indikator adalah area di mana "mesin" berbicara kepada user. Setiap elemen harus memancarkan presisi teknis. Penggunaan **Geist Mono** untuk label sistem (`SYSTEM_PROCESSING`, `SYSTEM_OUTPUT`) dan hairline dividers adalah wajib.

### 1.1 Aesthetic "Diagnostic Panel"
*Referensi: [bahasa-visual.md](../docs/bahasa-visual.md)*
*   **Panels**: `bg-slate-950` untuk memberikan kedalaman workstation.
*   **Borders**: `.border-hairline` (0.5px) untuk pemisah permanen, `.border-dashed` untuk area interaktif/loading.
*   **Indicators**: Skema warna fungsional (Blue=Process, Green=Success, Red=Error, Amber=Alert).

### 1.2 Hirarki Sinyal & Tipografi
*Referensi: [typografi.md](../docs/typografi.md)*
*   **System Labels**: 
    *   Font: **Geist Mono**.
    *   Style: `Uppercase`, `Bold (700)`.
    *   Tracking: `tracking-widest`.
*   **Versioning & Metadata**:
    *   Font: **Geist Mono**.
    *   Size: `xs`.
*   **Document Content (Viewer)**:
    *   Font: **Geist Sans** (`text-narrative`).

### 1.3 State Visual Patterns
*   **Inactive/Static**: `.border-main` hairline.
*   **Processing/Loading**: `.border-dashed` dengan animasi pulse subtle.
*   **Interactive Controls**: `.rounded-action` (8px) dengan `.hover-slash`.

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Artifact Panel BG**| `bg-slate-950` | `bg-background .bg-dots` | Texture | Preservasi kontras dengan texture grid. |
| **Panel Radius** | `rounded-2xl` | `.rounded-shell` | Shape | Shell Radius (16px) untuk panel besar. |
| **Editor Textarea** | `font-mono border-dashed`| `.text-interface .border-ai` | Typography | Geist Mono untuk pengeditan teknis. |
| **Thinking Bar** | `bg-slate-900/80` | `.text-signal tracking-widest`| Typography | Sinyal sistem "Diagnostic". |
| **Search/Tool Bars** | `border-l-4` | `.border-l-brand-hairline` | Precision | Integrasi hairline pada status bars. |
| **Version Badge** | `variant="secondary"` | `.rounded-badge font-mono` | Shape | Versi sebagai data presisi. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Diagnostic Panel Hardening
*   **Aksi**: 
    1. Pastikan `ArtifactPanel.tsx` menggunakan `.rounded-shell` (16px).
    2. Header panel wajib menggunakan **Geist Mono** (Uppercase) untuk judul "ARTIFACT".

### Step 2: Artifact List & History Refinement
*   **Aksi**:
    1. Tiap item di `ArtifactList.tsx` menggunakan garis pemisah `.border-b-hairline` (0.5px).
    2. Tanggal dan nomor versi wajib menggunakan **Geist Mono** untuk kesan "Audit Trail".

### Step 3: Editor & Viewer Precision
*   **Aksi**:
    1. Area edit di `ArtifactEditor.tsx` menggunakan `.border-ai` (dashed) untuk menandai area input aktif.
    2. `VersionHistoryDialog.tsx` menggunakan sistem grid Carbon untuk membandingkan perubahan dokumen.

### Step 4: System State Indicators (The Signal)
*   **Aksi**:
    1. `ThinkingIndicator.tsx` dan `ToolStateIndicator.tsx` harus secara eksplisit mendefinisikan label sinyal (misal: `SYSTEM_PROCESSING`) menggunakan **Geist Mono** (Bold 700).
    2. Banner kuota dan error menggunakan skema warna fungsional Carbon (Amber/Rose).

### Step 5: Iconography & Badges
*   **Aksi**:
    1. Migrasi total indikator tool (Google Search, Python, dll) ke varian **Iconoir** 1.5px.
    2. `SourcesIndicator.tsx` menggunakan gaya list minimalis dengan hairline dividers.

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Indicator Audit**: Semua status AI (Thinking, Searching, Tools) menggunakan Geist Mono signal style.
- [ ] **Artifact Audit**: Header, Metadata, dan Editor menggunakan Geist Mono; Konten menggunakan Geist Sans.
- [ ] **Border Audit**: Pemisah list dan panel menggunakan hairline 0.5px.
- [ ] **Radius Audit**: Panel utuh = 16px. Elemen kontrol (View button) = 8px.
- [ ] **Icon Audit**: Seluruh icon status dan aksi menggunakan Iconoir.

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Artifact dan Indikator adalah layer yang menjembatani kecerdasan mesin dengan pemahaman manusia. Dengan menggunakan estetika "Diagnostic", kita memposisikan sistem bukan sebagai kotak hitam, melainkan sebagai instrumen laboratorium yang transparan dan presisi.
