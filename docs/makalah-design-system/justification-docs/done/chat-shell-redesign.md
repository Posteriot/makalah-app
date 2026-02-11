# Guideline & Kontrol Teknis: Migrasi Chat Shell & Layout Redesign (Fase 1)

Dokumen ini adalah panduan teknis untuk memigrasikan **Chat Shell & Layout** (Kerangka Aplikasi Chat) ke standar **Makalah-Carbon**. Ini adalah Fase 1 dari 3 fase redesain fitur Chat, fokus pada fondasi tata letak, navigasi lateral, dan mekanisme resizing panel.

## 0. Target Migrasi
*   **Layout & Orchestrator**: `src/app/chat/layout.tsx`, `src/components/chat/layout/ChatLayout.tsx`.
*   **Shell Components**: `src/components/chat/shell/ShellHeader.tsx`, `ActivityBar.tsx`, `ChatTabs.tsx`.
*   **Sidebar & Extensions**: `ChatSidebar.tsx`, `SidebarChatHistory.tsx`, `SidebarPaperSessions.tsx`, `SidebarProgress.tsx`.
*   **Utilities**: `PanelResizer.tsx`, `useResizer.ts`.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **Mechanical Breath**: Kerangka chat harus terasa seperti "Scientific Workstation". Penggunaan hairline borders dan transisi grid yang mulus adalah kunci untuk mencapai estetika **Mechanical Grace**.

### 1.1 Arsitektur Grid (6-Column System)
*Referensi: [shape-layout.md](../docs/shape-layout.md)*
1.  **Activity Bar**: Fixed 48px.
2.  **Sidebar**: Resizable (Min 180px).
3.  **Left Resizer**: 4px active area.
4.  **Main Content**: Fluid `1fr`.
5.  **Right Resizer**: 4px active area (only when Panel open).
6.  **Action Panel**: Resizable (Min 280px).

### 1.2 Hirarki Navigasi & Tipografi
*Referensi: [typografi.md](../docs/typografi.md)*
*   **Sidebar Groups**: 
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Case: `UPPERCASE`.
    *   Size: `10px`.
*   **Chat History Items**:
    *   Font: **Geist Sans**.
    *   Weight: `Medium (500)`.
*   **Shell Header Title**:
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Outer Wrapper** | `bg-background` | `.bg-background .bg-dots` | Textures | Penambahan tekstur fungsional. |
| **Sidebar Container**| `bg-sidebar` | `.bg-card .border-r-hairline` | Precision | Hairline separator (0.5px). |
| **Activity Bar** | `w-12 bg-muted` | `.w-activity .bg-slate-950` | Layout | Warna gelap untuk kontras instrumen. |
| **Shell Header** | `h-16 border-b` | `.h-header .border-b-hairline` | Shape | Precision alignment 72px. |
| **Tab Bar** | `h-9 bg-accent` | `.h-tab .bg-background` | Efficiency | Minimalist tab design. |
| **Resizer Handle** | `w-1 bg-border` | `.w-resizer hover:bg-amber-500`| Interaction | Visual cues saat resize. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Grid Transformation
*   **Aksi**: Ubah `ChatLayout.tsx` untuk menggunakan CSS Variables yang sinkron dengan `.border-hairline`. Pastikan transisi grid template columns menggunakan `duration-300 ease-in-out` untuk kesan mekanis yang halus.

### Step 2: Activity Bar Refinement
*   **Aksi**: 
    1. Pastikan background `ActivityBar` menggunakan Slate 950 (Darkest).
    2. Icon Navigasi wajib menggunakan **Iconoir** 1.5px. 
    3. Indikator aktif menggunakan strip amber di sisi kiri.

### Step 3: Sidebar Typography & List
*   **Aksi**:
    1. Ganti judul grup (misal: "RIWAYAT CHAT") di `ChatSidebar.tsx` menjadi **Geist Mono** Uppercase Bold 700.
    2. Item list menggunakan Geist Sans dengan padding yang lebih "airy" (`p-2.5`).

### Step 4: Shell Header & Tab Standar
*   **Aksi**:
    1. Ganti tinggi header menjadi standar `72px`.
    2. Logo menggunakan varian "Academic Instrument" yang lebih clean.
    3. Badge jumlah artifact menggunakan `rounded-full` dengan background neutral.

### Step 5: Precision Resizing Control
*   **Aksi**:
    1. Update `PanelResizer.tsx` agar handle visualnya lebih tipis (2px) tapi memiliki click area yang cukup (4px).
    2. Tambahkan feedback warna `amber-500` saat sedang di-drag.

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Grid Audit**: 6-column grid tersinkronisasi sempurna tanpa kebocoran layout.
- [ ] **Border Audit**: Seluruh pemisah panel (Sidebar, Header, Tabs) menggunakan hairline 0.5px.
- [ ] **Typo Audit**: Label sidebar dan heading shell sudah menggunakan Geist Mono.
- [ ] **Performance Audit**: Resizing tidak menyebabkan reflow yang berat di area message.
- [ ] **Responsive Audit**: Sidebar otomatis collapse di mobile dan menggunakan `Sheet` Carbon.

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Shell aplikasi adalah kerangka instruksi. Dengan menggunakan hairline borders dan tipografi Mono pada navigasi, kita memberi tahu user bahwa mereka berada di "Laboratory Environment" yang siap untuk pengerjaan paper dengan presisi tinggi.
