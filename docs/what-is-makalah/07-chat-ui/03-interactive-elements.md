# Interactive Logic & User Agency

Dokumen ini menjelaskan mekanisme interaksi aktif yang memungkinkan lo untuk mengendalikan alur kerja AI secara deterministik.

## 1. JsonRenderer & Choice Cards

`JsonRenderer` adalah sistem yang merender elemen UI dinamis berdasarkan skema JSON yang dikirim oleh AI di akhir pesan. Logika utamanya berada di direktori [src/lib/json-render/](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/json-render/).

- **Choice Block**: Menampilkan kartu interaktif via [JsonRendererChoiceBlock.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/json-renderer/JsonRendererChoiceBlock.tsx).
- **Dinamisme**: Tombol-tombol ini tidak statis; AI bisa meminta input teks tambahan atau pilihan ganda.
- **Optimistic UI**: Memberikan umpan balik visual instan sebelum data tersimpan di Convex.

---

## 2. Validation Flow (Persetujuan Stage)

Saat sebuah stage selesai dikerjakan oleh AI dan berstatus `pending_validation`, [PaperValidationPanel.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/paper/PaperValidationPanel.tsx) akan muncul.

- **Reveal Sequencing**: Menunggu hingga streaming teks selesai DAN proses pembuatan artifak selesai. Diatur oleh logika `isValidationPanelEligible` di [ChatWindow.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ChatWindow.tsx).
- **Tombol Setujui**: Mengirim pesan otomatis untuk memajukan stage.
- **Tombol Minta Revisi**: Membuka input instruksi perbaikan tanpa harus mengetik manual.

---

## 3. Composer & Chat Input

Komponen [ChatInput.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ChatInput.tsx) dirancang untuk fleksibilitas input yang tinggi.

- **Context Tray (Lampiran)**: Baris horizontal yang menampilkan file PDF atau gambar konteks.
- **Context Add Menu**: Via [ContextAddMenu.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ContextAddMenu.tsx), memberikan akses ke upload file atau pencarian file.
- **Mobile Fullscreen Mode**: Fitur khusus perangkat mobile untuk menulis instruksi panjang tanpa rasa sesak.

---

## 4. Modals & Overlay Layers

- **Fullsize Artifact Modal**: Versi layar penuh editor via [FullsizeArtifactModal.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/FullsizeArtifactModal.tsx).
- **Sources Panel**: Panel referensi via [SourcesPanel.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/SourcesPanel.tsx). Muncul sebagai *bottom sheet* di mobile dan *side panel* di desktop.
- **Rewind Confirmation**: Dialog peringatan mundur stage via [RewindConfirmationDialog.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/paper/RewindConfirmationDialog.tsx).
- **Mobile Options**: Panel bawah via [MobileEditDeleteSheet.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/mobile/MobileEditDeleteSheet.tsx).

---

**File Source Code Utama:**
- `src/components/chat/ChatInput.tsx`: Engine input pesan dan lampiran konteks.
- `src/components/chat/json-renderer/JsonRendererChoiceBlock.tsx`: Komponen render kartu pilihan interaktif.
- `src/components/paper/PaperValidationPanel.tsx`: Kontrol persetujuan stage penulisan.
- `src/components/chat/FullsizeArtifactModal.tsx`: Overlay editor artifak fokus tinggi.
- `src/components/chat/SourcesPanel.tsx`: UI daftar referensi dan sumber data.
- `src/components/paper/RewindConfirmationDialog.tsx`: Dialog konfirmasi keamanan untuk mundur stage.
