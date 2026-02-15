# UI AI Indicators - Chat Area

> Inventaris indikator visual proses AI yang muncul di area chat (bukan sidebar), disusun 1:1 sesuai implementasi codebase saat ini.

## Scope

Dokumen ini mencakup:
- indikator proses AI saat generate/streaming
- indikator status tool AI
- indikator status web search
- indikator sumber (sources)
- indikator output artifact
- panel validasi tahap paper
- warning kuota/kredit
- overlay error kirim pesan
- quick action pada bubble assistant

Dokumen ini tidak mencakup:
- indikator di activity bar/sidebar
- indikator di artifact panel kanan

---

## Daftar Indikator dan Teks Visual

### 1) Thinking Indicator
- Komponen: `ThinkingIndicator`
- Muncul saat: response assistant masih berjalan (`isGenerating`)
- File render: `src/components/chat/ChatWindow.tsx`
- File komponen: `src/components/chat/ThinkingIndicator.tsx`
- Teks yang tampil:
  - `SYSTEM_PROCESSING`
  - animated dots `...` (visual titik animasi)

### 2) Tool State Indicator
- Komponen: `ToolStateIndicator`
- Muncul saat: ada `tool-*` part di message assistant
- File render: `src/components/chat/MessageBubble.tsx`
- File komponen: `src/components/chat/ToolStateIndicator.tsx`
- Teks yang tampil (dinamis):
  - `SEARCHING_WEB` (khusus tool `google_search`)
  - `RUNNING_{NAMA_TOOL}`
  - `PROCESSING_{NAMA_TOOL}`
  - `ERROR: {ERROR_TEXT}`
  - `ERROR: UNKNOWN_ERROR` (fallback)
  - `{NAMA_TOOL}_{STATE}` (fallback lain)

### 3) Search Status Indicator
- Komponen: `SearchStatusIndicator`
- Muncul saat: ada part `data-search` dengan status `searching|done|error`
- File render: `src/components/chat/MessageBubble.tsx`
- File komponen: `src/components/chat/SearchStatusIndicator.tsx`
- Teks yang tampil:
  - `SEARCHING...`
  - `SEARCH_COMPLETE`
  - `SEARCH_ERROR`
  - `SEARCH` (fallback default)

### 4) Sources Indicator
- Komponen: `SourcesIndicator`
- Muncul saat: assistant message punya daftar `sources`
- File render: `src/components/chat/MessageBubble.tsx`
- File komponen: `src/components/chat/SourcesIndicator.tsx`
- Teks yang tampil:
  - `Found {n} source`
  - `Found {n} sources`
  - `{n} source`
  - `{n} sources`
  - `Show {x} more`
  - `Show less`
  - judul source + URL (dinamis per source)

### 5) Artifact Indicator
- Komponen: `ArtifactIndicator`
- Muncul saat: tool `createArtifact` sukses
- File render: `src/components/chat/MessageBubble.tsx`
- File komponen: `src/components/chat/ArtifactIndicator.tsx`
- Teks yang tampil:
  - `SYSTEM_OUTPUT`
  - `{judul artifact}` (dinamis)
  - `VIEW`

### 6) Paper Validation Panel
- Komponen: `PaperValidationPanel`
- Muncul saat: paper mode dan stage `pending_validation`
- File render: `src/components/chat/ChatWindow.tsx`
- File komponen: `src/components/paper/PaperValidationPanel.tsx`
- Teks yang tampil:
  - `Validasi Tahap: {stageLabel}`
  - `Periksa draft di artifact. Apakah sudah sesuai atau perlu revisi?`
  - tombol `Revisi`
  - tombol `Approve & Lanjut`
  - placeholder `Kasih tau AI yang mana yang kudu diganti...`
  - tombol `Kirim Feedback`

### 7) Quota Warning Banner
- Komponen: `QuotaWarningBanner`
- Muncul saat: pemakaian kuota/kredit melewati threshold sesuai tier
- File render: `src/components/chat/ChatWindow.tsx`
- File komponen: `src/components/chat/QuotaWarningBanner.tsx`
- Teks yang tampil (dinamis):
  - `Kuota habis. Upgrade ke Pro atau tunggu reset bulan depan.`
  - `Kuota tersisa {x}%. Segera upgrade untuk lanjut tanpa batas.`
  - `Kuota tersisa {x}%. Pantau pemakaian Anda.`
  - `Kredit habis. Beli kredit untuk melanjutkan.`
  - `Kredit rendah: {x} kredit. Segera beli kredit.`
  - `Sisa kredit: {x} kredit. Pertimbangkan beli kredit.`
  - CTA: `Upgrade` / `Lihat Detail` / `Beli Kredit`

### 8) Error Overlay (Kirim Pesan)
- Komponen: error block di `ChatWindow`
- Muncul saat: `error` dari `useChat`
- File: `src/components/chat/ChatWindow.tsx`
- Teks yang tampil:
  - `Gagal mengirim pesan.`
  - tombol `Coba Lagi`

### 9) Quick Actions pada Bubble Assistant
- Komponen: `QuickActions`
- Muncul saat: assistant message selesai dirender (non-edit mode)
- File render: `src/components/chat/MessageBubble.tsx`
- File komponen: `src/components/chat/QuickActions.tsx`
- Teks yang tampil:
  - `Copy`
  - `Copied`

---

## Catatan Kepatuhan terhadap Codebase

- Daftar indikator di atas ditarik dari titik render aktual di:
  - `src/components/chat/ChatWindow.tsx`
  - `src/components/chat/MessageBubble.tsx`
- Teks visual ditarik dari komponen sumber masing-masing.
- Dokumen ini hanya mencatat UI yang benar-benar dirender di chat area saat kondisi pemicunya terpenuhi.
