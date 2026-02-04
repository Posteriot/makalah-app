# Master AI & Chat Elements - Makalah-Carbon

Dokumen ini memetakan seluruh komponen UI di area Chat (`src/app/chat` & `src/components/chat`) hasil audit mendalam. Ini adalah blueprint inventarisasi untuk transisi ke standar **Mechanical Grace**.

## 1. Shell & Workplace Layout (IDE-Standard)
Kerangka utama yang mengatur densitas informasi dengan logika antarmuka mesin (Chrome).

| Komponen | Deskripsi | Standar Target (Mechanical Grace) |
| :--- | :--- | :--- |
| **SidebarHeader** | Navigasi & Branding terpadu. | Terintegrasi di Sidebar, **Geist Mono** (metadata), Logo klik ke Home. |
| **Artifact Toggle** | Tombol Show/Hide Artifact Panel. | `PanelRightIcon`, Amber-500 badge untuk count, `.rounded-action`. |
| **ActivityBar** | Vertical nav 48px (Command Strip). | **Amber-500 Left Line** (active state), Icon 16px, Mono tooltips. |
| **Sidebar Toggle** | Tombol Expand/Collapse Sidebar. | Terletak di bawah ActivityBar, `.icon-interface`. |
| **ChatTabs** | Multi-Tab Bar ala VS Code. | Container dengan height 36px, `bg-muted`. Menggantikan Global Header di area Chat. |
| **Individual Tab** | Tab percakapan aktif/tidak aktif. | **Geist Mono**, **2px Amber-500 underline** (active), `.rounded-t-[6px]`, close icon `.icon-micro`. |
| **PanelResizer** | Divider panel presisi. | `0.5px Hairline`, **Sky/Info feedback** saat manipulasi drag/hover. |
| **ChatLayout** | Grid 16-kolom (The Workbench). | **16-Col Snap**. Tanpa Global Header/Footer. Maximized vertical real-estate. |
| **ChatMiniFooter** | Ringkasan Copyright 1-baris. | Horizontal bottom-strip, **Geist Mono text-[10px]**, Brand-only (no logo). |

## 2. Chat Interaction Core (The Dialogue)
Komponen utama dalam aliran percakapan manusia-AI.

| Komponen | Deskripsi | Standar Target (Mechanical Grace) |
| :--- | :--- | :--- |
| **MessageBubble (User)**| Bubble pesan dari pengguna. | **.rounded-action (8px)**, `border-main` (Slate-800), Sans font. |
| **Assistant Metadata** | Nama asisten, waktu, tool logs. | **Geist Mono**, Slate-500, `text-indicator` (11px). |
| **ChatInput** | Textarea input utama. | **.rounded-action (8px)**, **Geist Mono** typing font, focus-ring Amber. |
| **Send Button** | Tombol kirim pesan. | `SendIcon`, Ghost-to-Solid transition, `.rounded-action`. |
| **Attach Button** | Tombol upload file. | `PaperclipIcon`, memicu `FileUploadButton`, `.icon-interface`. |
| **Edit Mode** | State saat user mengedit pesan lama. | Swap text ke textarea, `.border-ai` (dashed), tombol Save/Cancel Mono. |
| **QuickActions** | Copy respons model di bawah pesan. | Ghost-button, **Geist Mono** (`text-[10px]`), `.icon-micro`. |

## 3. Diagnostic & Progress (The System)
Visualisasi "Thinking Process" dan alur kerja AI.

| Komponen | Deskripsi | Standar Target (Mechanical Grace) |
| :--- | :--- | :--- |
| **ThinkingIndicator** | Blok animasi proses AI. | Terminal-block style, font Mono **"SYSTEM_PROCESSING"**. |
| **SearchStatusIndicator**| Progress pencarian (literatur). | Hairline border, Ghost background, Mono diagnostic text. |
| **SidebarProgress** | Timeline pengerjaan paper. | Vertical line with dots, `.rounded-full` progress bar, Mono metadata. |
| **ToolStateIndicator** | Eksekusi fungsi (Python, etc). | `.border-ai` (dashed), Status: RUNNING, DONE, ERROR (Uppercase). |
| **ValidationPanel** | Tombol Approve/Revisi paper. | **Geist Mono** buttons, `.rounded-action` (8px), industrial contrast (Approve vs Revision). |
| **PaperStageProgress**| Progress pengerjaan paper. | **0.5px Hairline** connecting lines, **Geist Mono** labels, CAPITALIZED status. |
| **QuotaWarning** | Alert limitasi token/kredit. | High-contrast Alert, **Slate-950 bg**, Amber-500 border, Close button (X) micro. |

## 4. Artifact & Research Logic (The Work Bench)
Modul keluaran AI dan sistem rujukan dengan identitas "Machine-Generated".

| Komponen | Deskripsi | Standar Target (Mechanical Grace) |
| :--- | :--- | :--- |
| **ArtifactPanel** | Side panel utama hasil riset. | **Slate-950 Solid**, `.rounded-shell` (16px), Hairline **Slate-800** border. |
| **Panel Header Actions** | Download, Copy, Edit, Fullscreen. | Row of icons, `.icon-micro`, Ghost button, tooltip Mono. |
| **Download Menu** | Opsi format DOCX/PDF/TXT. | Dropdown dengan **Geist Mono** text, hairline separators. |
| **ArtifactIndicator** | Sinyal pembuatan file di chat. | `.rounded-badge` (6px), **Dashed border (Sky)**, Label "SYSTEM_OUTPUT" (Mono). |
| **ArtifactList** | Daftar dokumen/versi (Dropdown). | Antarmuka padat (dense), icon-micro, font Mono metadata versi. |
| **Citation & Sources** | Chip rujukan & list PDF. | `.rounded-badge` (4px/6px), hairline border, Mono typography. |

## 5. Navigation & Session Management
Pengaturan konteks dan riwayat.

| Komponen | Deskripsi | Standar Target (Mechanical Grace) |
| :--- | :--- | :--- |
| **New Chat Button** | Tombol mulai sesi baru. | Large button in sidebar, **.rounded-action (8px)**, Plus icon. |
| **History Item** | Baris riwayat chat di sidebar. | Hover state `.bg-accent`, Active state `.border-l-2 border-amber-500`. |
| **Session Folders** | Grup paper sessions di sidebar. | `FolderIcon` (Orange), blue status dots, collapse/expand chevrons. |
| **User/Notif Menu** | Dropdown profil & lonceng. | `.rounded-action` (8px), Mono labels, hairline separators. |
| **PaperSessionCard** | Card sesi di list dashboard. | **Hybrid Radius** (16px shell, 8px inner), **Geist Mono** metadata (Word count, %). |

## 6. Content Optimization (Refrasa)
Modul perbaikan kualitas teks otomatis.

| Komponen | Deskripsi | Standar Target (Mechanical Grace) |
| :--- | :--- | :--- |
| **RefrasaDialog** | Komparasi teks asli vs AI. | Side-by-side layout, **Geist Mono** for metadata, **0.5px Hairline** divider. |
| **IssueItem** | List masalah naturalness/style. | **Geist Mono**, `.rounded-badge` (4px), Status: `STYLE_DEVIATION` (Mono). |
| **RefrasadText** | Area teks hasil perbaikan. | `bg-green-overlay` (Dotted 2% opacity), Sans text with Mono metadata. |

---
> [!IMPORTANT]
> **Mechanical Audit Focus**: Semua tombol "Close (X)", "Expand/Collapse", "Copy", dan "Download" wajib menggunakan skala **Icon-Micro (14px-16px)** dengan area sentuh yang presisi, bukan bubble sirkular yang lebar.
