# Message & Content Components

Dokumen ini membedah komponen-komponen yang ada di dalam aliran percakapan (message thread), yang menjadi jantung dari interaksi antara lo dan agen AI. Seluruh pesan dikelola oleh [MessageBubble.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/MessageBubble.tsx).

## 1. Anatomi Message Bubble

Komponen `MessageBubble.tsx` adalah unit terkecil dalam chat yang menangani berbagai jenis konten secara reaktif.

### Pesan User
- **Quick Actions**: Terpusat di [QuickActions.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/QuickActions.tsx). Muncul saat kursor di atas pesan. Berisi tombol Copy, Edit, dan Delete.
- **Auto-Action Labels**: Pesan yang dikirim secara otomatis oleh sistem (misal: saat lo klik "Setujui" di panel validasi) akan diberi label khusus seperti `[Approved: ...]`.

### Pesan AI (Assistant)
- **Markdown Rendering**: Dikelola oleh [MarkdownRenderer.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/MarkdownRenderer.tsx). Mendukung format teks kaya, tabel, daftar, dan diagram [Mermaid](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/MermaidRenderer.tsx).
- **Citations**: Sitasi inline via [InlineCitationChip.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/InlineCitationChip.tsx). Menampilkan domain sumber yang bisa di-klik untuk membuka *carousel* referensi.

---

## 2. Komponen Penalaran (Reasoning)

Makalah AI menonjolkan transparansi proses melalui [ReasoningPanel.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ReasoningPanel.tsx).

- **Internal Thought**: Menampilkan "pemikiran internal" model yang dipisahkan dari jawaban final.
- **Reasoning Steps**: Langkah-langkah logis yang sedang atau telah dijalankan via [ReasoningTracePanel.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ReasoningTracePanel.tsx).
- **Visual Status**: Menggunakan indikator dot yang berubah warna sesuai status (aktif/selesai) dan animasi *Thinking shimmer* saat proses berlangsung.

---

## 3. Unified Process Card

Kartu ini muncul saat AI sedang mengeksekusi *tools* atau melakukan pencarian web. Dikelola di [UnifiedProcessCard.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/UnifiedProcessCard.tsx).

- **Task Checklist**: Menampilkan daftar tugas yang relevan dengan stage saat ini (diambil via `deriveTaskList`). Memberikan kepastian kepada lo tentang apa yang sedang dikerjakan AI.
- **Search Status**: Indikator *real-time* saat AI sedang melakukan pencarian di web via [SearchStatusIndicator.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/SearchStatusIndicator.tsx).
- **Tool Progress**: Menunjukkan nama tool yang sedang dipanggil via [ToolStateIndicator.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ToolStateIndicator.tsx).

---

## 4. Sistem Sitasi & Referensi

- **Inline Citation Chips**: Chip angka via [InlineCitationChip.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/InlineCitationChip.tsx).
- **Artifact Signals**: Notifikasi visual via [ArtifactIndicator.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ArtifactIndicator.tsx) yang menandakan interaksi dengan artifak (Created, Updated, Read).
- **Sources Indicator**: Pill rangkuman sumber via [SourcesIndicator.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/SourcesIndicator.tsx).

---

**File Source Code Utama:**
- `src/components/chat/MessageBubble.tsx`: Kontainer utama gelembung pesan.
- `src/components/chat/MarkdownRenderer.tsx`: Engine rendering konten markdown.
- `src/components/chat/ReasoningPanel.tsx`: UI pelacakan penalaran AI.
- `src/components/chat/UnifiedProcessCard.tsx`: Kartu status proses dan checklist tugas.
- `src/components/chat/SourcesIndicator.tsx`: Indikator dan pemicu panel sumber.
- `src/components/chat/ArtifactIndicator.tsx`: Sinyal interaksi artifak di level pesan.
