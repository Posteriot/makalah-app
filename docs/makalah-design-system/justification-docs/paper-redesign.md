# Guideline & Kontrol Teknis: Migrasi Paper Section Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan **Paper Section** (Workflow, Session Management, & Progress Tracking) ke standar **Makalah-Carbon**. Paper section adalah representasi visual dari "Academic Engine" di Makalah-App, sehingga memerlukan estetika instrumen yang kuat dan presisi transaksional.

## 0. Target Migrasi
*   **Session Display**: `src/components/paper/PaperSessionCard.tsx`, `PaperSessionBadge.tsx`.
*   **Progress & Workflow**: `src/components/paper/PaperStageProgress.tsx`, `PaperSessionsList.tsx`, `PaperSessionsContainer.tsx`.
*   **Decision Controls**: `src/components/paper/PaperValidationPanel.tsx`, `RewindConfirmationDialog.tsx`.
*   **Empty State**: `src/components/paper/PaperSessionsEmpty.tsx`.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **Mechanical Engine**: Alur paper harus terasa seperti "Assembly Line" yang sistematis. Gunakan **Geist Mono** untuk indikator tahapan (Stage Number) dan hairline dividers untuk memisahkan logika workflow.

### 1.1 Progress Orchestration (The Assembly Line)
*Referensi: [shape-layout.md](../docs/shape-layout.md)*
*   **Stage Nodes**: 
    *   Shape: Lingkaran presisi dengan border 2px.
    *   Active/Completed: Menggunakan skema fungsional Carbon (Primary/Emerald).
    *   Typography: **Geist Mono** untuk nomor tahap.
*   **Progress Path**: Garis pemisah hairline `.h-[1px] .bg-border` (bukan 2px default).

### 1.2 Decision Framework (Validation Panel)
*Referensi: [bahasa-visual.md](../docs/bahasa-visual.md)*
*   **Panel Shell**: `.rounded-shell` (16px) dengan `.bg-background` (Texture dots).
*   **Action Buttons**:
    *   Approve: `.bg-emerald-500` dengan `.hover-slash`.
    *   Revise: `.border-rose-500` (Hairline) dengan `.text-rose-500`.
*   **Badges Status**: Geist Mono Bold Uppercase untuk label "IN_PROGRESS", "VALIDATED", "REVISION".

### 1.3 Session Inventory (The Cards)
*   **Card Container**: `.rounded-shell` (16px) dengan `.border-hairline`.
*   **Metadata Typography**: 
    *   Judul Paper: Geist Sans (Narrative).
    *   Stage Info: **Geist Mono** (Signal) untuk "STAGE 2/13".

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Stage Badge** | `bg-primary-500/15` | `.rounded-badge .font-mono` | Shape & Typo | Penyelarasan badge data presisi. |
| **Progress Line** | `h-[2px] bg-green-500` | `.h-hairline .bg-emerald-500` | Dimension | Hairline (1px/0.5px) untuk presisi. |
| **Validation Card** | `max-w-[80%] rounded-lg` | `.rounded-shell .bg-dots` | Architecture | Integrasi shell 16px & texture. |
| **Approve Button** | `bg-green-600` | `.bg-emerald-500 .hover-slash` | Interaction | Carbon Success & Slash pattern. |
| **Icons** | `lucide-react` | `iconoir-react` | Asset | Standarisasi set icon 1.5px. |
| **Session Title** | `text-base font-semibold` | `.text-narrative .font-medium`| Typography | Readable narrative title. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Icon & Typo Standardisation
*   **Aksi**: 
    1. Ganti semua `lucide-react` di folder `paper` (FileText, Check, ChevronRight, dll) dengan **Iconoir** ekivalen.
    2. Ganti font nomor tahap dan label status di `PaperStageProgress.tsx` menjadi **Geist Mono** (Uppercase for Status).

### Step 2: Progress Path Refinement
*   **Aksi**:
    1. Tipiskan garis progress agar menggunakan hairline style.
    2. Pastikan animasi pulse pada tahap aktif menggunakan opacity transition yang halus (`duration-500`).

### Step 3: Validation Panel Redesign
*   **Aksi**:
    1. Update `PaperValidationPanel.tsx` agar memiliki radius 16px.
    2. Gunakan background dots fungsional untuk menekankan area "Decision Making".
    3. Terapkan efek `.hover-slash` pada tombol utama.

### Step 4: Session Card Polishing
*   **Aksi**:
    1. Gunakan `.border-hairline` untuk seluruh kartu di `PaperSessionCard.tsx`.
    2. Metadata seperti "Dibuat pada" dan "Diubah pada" wajib menggunakan **Geist Mono** Small (10px).

### Step 5: Empty & Loading States
*   **Aksi**:
    1. Update `PaperSessionsEmpty.tsx` agar menggunakan ilustrasi/icon Iconoir yang lebih clean.
    2. Skeleton loading harus mengikuti proporsi grid Carbon yang baru (16px radius).

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Icon Audit**: Tidak ada lagi penggunaan `lucide-react` di seluruh komponen Paper.
- [ ] **Typo Audit**: Semua stage numbers dan system status menggunakan Geist Mono.
- [ ] **Border Audit**: Progress lines dan card borders menggunakan hairline precision.
- [ ] **Color Audit**: Warna hijau approve diselaraskan ke Emerald-500 Carbon.
- [ ] **Interaction Audit**: Tombol transaksional (Approve/Lanjutkan) memiliki efek Slash.

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Workflow paper adalah tulang punggung dari Makalah-App. Dengan menerapkan estetika "Engine" yang presisi, kita memberikan rasa aman kepada user bahwa proses penulisan mereka dikelola oleh sistem yang akurat dan kredibel.
