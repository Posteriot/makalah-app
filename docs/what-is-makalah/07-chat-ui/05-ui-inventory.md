# UI Component Inventory (State-Based)

Dokumen ini merangkum seluruh komponen antarmuka pengguna (UI) yang membentuk pengalaman chat Makalah AI, dikategorikan berdasarkan kondisi kemunculannya (State).

## 1. UI Default (Selalu Tampak)
Komponen yang membentuk struktur dasar dan kerangka aplikasi yang menetap.

| Komponen | File Rujukan | Deskripsi |
| :--- | :--- | :--- |
| **4-Panel Grid** | [ChatLayout.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/layout/ChatLayout.tsx) | Fondasi tata letak resizable untuk seluruh dashboard chat. |
| **Activity Bar** | [ActivityBar.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/shell/ActivityBar.tsx) | Navigasi vertikal paling kiri untuk kontrol panel. |
| **Sidebar** | [ChatSidebar.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ChatSidebar.tsx) | Menampilkan riwayat chat dan linimasa progres (Timeline). |
| **Top Bar** | [TopBar.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/shell/TopBar.tsx) | Header yang berisi kontrol tema, navigasi naskah, dan status user. |
| **Chat Input** | [ChatInput.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ChatInput.tsx) | Area penulisan pesan (*composer*) dan tombol kirim. |
| **Message Thread** | [ChatWindow.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ChatWindow.tsx) | Pengelola utama aliran pesan menggunakan `Virtuoso`. |
| **Message Bubble** | [MessageBubble.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/MessageBubble.tsx) | Gelembung pesan standar untuk User dan Assistant. |

## 2. UI Interaktif (Hanya Tampak pada Interaksi/Status Tertentu)
Komponen yang muncul secara reaktif berdasarkan aktivitas Agen atau tindakan User.

| Komponen | File Rujukan | Trigger / Kondisi |
| :--- | :--- | :--- |
| **Quick Actions** | [QuickActions.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/QuickActions.tsx) | Muncul saat *hover* di atas pesan User (Edit/Delete). |
| **Reasoning Panel** | [ReasoningPanel.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ReasoningPanel.tsx) | Muncul saat AI sedang bernalar (Thinking trace). |
| **Unified Process Card** | [UnifiedProcessCard.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/UnifiedProcessCard.tsx) | Muncul saat AI menjalankan tool atau pencarian web. |
| **Artifact Indicator** | [ArtifactIndicator.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ArtifactIndicator.tsx) | Pill sinyal saat artifak dibuat atau diperbarui. |
| **Sources Indicator** | [SourcesIndicator.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/SourcesIndicator.tsx) | Pill jumlah sitasi; jika diklik membuka Sources Sheet. |
| **Choice Cards** | [JsonRendererChoiceBlock.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/json-renderer/JsonRendererChoiceBlock.tsx) | Muncul di akhir pesan AI untuk pilihan interaktif. |
| **Validation Panel** | [PaperValidationPanel.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/paper/PaperValidationPanel.tsx) | Muncul di akhir stage (Tombol Setujui/Revisi). |
| **Context Tray** | [ChatInputAttachment.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ChatInputAttachment.tsx) | Muncul di atas input jika ada file yang dilampirkan. |
| **Special Renderers** | `MermaidRenderer.tsx`, `ChartRenderer.tsx` | Muncul jika pesan berisi diagram atau bagan data. |
| **Modals & Sheets** | `FullsizeArtifactModal.tsx`, `SourcesPanel.tsx` | Muncul saat artifak atau sumber referensi diklik. |
| **Rewind Dialog** | [RewindConfirmationDialog.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/paper/RewindConfirmationDialog.tsx) | Muncul saat user mencoba mundur stage. |

## 3. UI Error & Guardrails (Hanya Tampak Saat Terjadi Masalah)
Komponen pertahanan untuk menangani batasan sistem dan kegagalan teknis.

| Komponen | File Rujukan | Kondisi |
| :--- | :--- | :--- |
| **Quota Banner** | [QuotaWarningBanner.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/QuotaWarningBanner.tsx) | Muncul jika penggunaan pesan mendekati/melebihi batas. |
| **Tool Error Icon** | [ToolStateIndicator.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ToolStateIndicator.tsx) | Ikon X merah di dalam Process Card saat tool gagal. |
| **Diagnostic Trigger** | [ChatTechnicalReportButton.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/technical-report/ChatTechnicalReportButton.tsx) | Muncul saat terjadi kejanggalan sistem (diagnostic). |
| **Quota Error Overlay** | [ChatWindow.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ChatWindow.tsx) | Banner overlay di atas input chat saat kuota habis total. |

---

**File Source Code Utama:**
- `src/components/chat/ChatWindow.tsx`: Pusat orkestrasi kemunculan seluruh komponen di atas.
- `src/components/chat/MessageBubble.tsx`: Kontainer utama yang merender sebagian besar komponen interaktif.
