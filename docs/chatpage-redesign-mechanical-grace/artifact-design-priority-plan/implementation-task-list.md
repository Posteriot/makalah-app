# Artifact Redesign Task List (Granular - Murni Redesign)

Status legend:
- [ ] Belum dikerjakan
- [x] Selesai

Catatan:
- Checklist ini khusus redesign struktural dan UX artifact.
- Task visual refinement sebelumnya tidak dihitung di checklist ini.

## P0 - Fondasi Struktur Artifact

### `src/components/chat/ArtifactPanel.tsx`
- [x] ARD-PNL-01 Tetapkan ulang layout shell artifact panel (zona tabs, toolbar, content) dengan hierarchy yang lebih tegas.
- [x] ARD-PNL-02 Definisikan behavior saat `openTabs` kosong agar tetap informatif dan bisa jadi entry point kerja.
- [x] ARD-PNL-03 Rancang ulang relasi panel mode normal vs fullscreen supaya transisi konteks lebih jelas.
- [x] ARD-PNL-04 Validasi alur buka/tutup panel dari TopBar tidak membingungkan saat artifact aktif berubah.

### `src/components/chat/ArtifactTabs.tsx`
- [x] ARD-TAB-01 Redesign hierarchy tab aktif vs non-aktif (bukan sekadar warna), termasuk affordance close.
- [x] ARD-TAB-02 Redesign overflow strategy (scroll/fade/nav button) agar status tab tetap terbaca saat tab banyak.
- [x] ARD-TAB-03 Rapikan model interaksi keyboard tablist agar mengikuti pola dokumen editor.
- [x] ARD-TAB-04 Validasi perilaku saat tab ditutup (fallback tab tujuan) tetap prediktif.

### `src/components/chat/ArtifactToolbar.tsx`
- [x] ARD-TLB-01 Reposisi informasi metadata (type/version/date) agar menjadi konteks dokumen, bukan noise.
- [x] ARD-TLB-02 Rancang ulang grouping aksi (edit, refrasa, download, copy, expand) berdasarkan prioritas kerja.
- [x] ARD-TLB-03 Definisikan ulang mode responsif toolbar (ikon vs menu) tanpa kehilangan fungsi penting.
- [x] ARD-TLB-04 Validasi mapping action toolbar dengan state viewer/editor agar tidak ambigu.

## P1 - Redesign Viewer dan Editor

### `src/components/chat/ArtifactViewer.tsx`
- [x] ARD-VWR-01 Rancang ulang struktur header viewer (version switch, final state, invalidation context) dengan informasi berlapis.
- [x] ARD-VWR-02 Redesign area konten utama supaya mode baca dan mode edit terasa sebagai dua mode kerja yang jelas.
- [x] ARD-VWR-03 Definisikan UX source/citation area agar tidak mengganggu fokus membaca artifact.
- [x] ARD-VWR-04 Rancang ulang interaksi refrasa (trigger, loading, confirm) agar alurnya eksplisit.
- [x] ARD-VWR-05 Validasi fallback artifact code/markdown/plain tetap konsisten secara struktur, bukan cuma style.

### `src/components/chat/ArtifactEditor.tsx`
- [x] ARD-EDT-01 Rancang ulang layout editor lokal (body/footer/helper) supaya status kerja (`dirty`, `saving`) lebih jelas.
- [x] ARD-EDT-02 Definisikan ulang hierarchy aksi `Batal` vs `Simpan` mengikuti severity perubahan.
- [x] ARD-EDT-03 Rancang ulang komunikasi shortcut keyboard agar membantu, bukan elemen dekoratif.
- [x] ARD-EDT-04 Validasi transisi masuk/keluar edit mode tidak memutus konteks baca.

### `src/components/chat/FullsizeArtifactModal.tsx`
- [x] ARD-FSM-01 Redesign fullscreen sebagai workspace artifact utama, bukan hanya versi besar dari panel.
- [x] ARD-FSM-02 Definisikan ulang komposisi header/content/footer untuk skenario baca panjang dan editing panjang.
- [x] ARD-FSM-03 Rancang ulang interaksi close/minimize/backdrop/ESC agar aman dari accidental close.
- [x] ARD-FSM-04 Validasi sinkronisasi state fullscreen dengan viewer utama (edit/copy/refrasa/version).

## P2 - Redesign Entry Point Artifact di Chat Flow

### `src/components/chat/ArtifactIndicator.tsx`
- [x] ARD-IND-01 Redesign komponen indikator artifact di bubble assistant agar jelas sebagai “hasil kerja” yang bisa dibuka.
- [x] ARD-IND-02 Definisikan ulang label/status artifact indicator untuk membedakan artifact baru vs revisi.
- [x] ARD-IND-03 Validasi akses keyboard dan screen reader agar CTA artifact tetap tegas.

### `src/components/chat/MessageBubble.tsx`
- [x] ARD-MSG-01 Rancang ulang penempatan ArtifactIndicator dalam bubble agar tidak tenggelam oleh elemen lain.
- [x] ARD-MSG-02 Selaraskan ulang pola auto-action (approved/revisi) dengan narasi artifact lifecycle.
- [x] ARD-MSG-03 Validasi koeksistensi sources, quick actions, dan artifact indicator tetap terbaca bertahap.

### `src/components/chat/shell/TopBar.tsx`
- [x] ARD-TOP-01 Redesign affordance panel artifact di topbar agar status terbuka/tertutup mudah dikenali.
- [x] ARD-TOP-02 Definisikan ulang representasi jumlah artifact agar tetap informatif di layar sempit.
- [x] ARD-TOP-03 Validasi state disabled saat tanpa artifact tetap komunikatif.

### `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- [x] ARD-SPS-01 Redesign relasi folder artifact di sidebar dengan artifact panel agar user paham konteks dokumen aktif.
- [x] ARD-SPS-02 Rancang ulang item artifact list (title/version/final) untuk scanning cepat.
- [x] ARD-SPS-03 Validasi flow klik item dari sidebar ke panel artifact tidak menimbulkan state “selected palsu”.

## P3 - Versioning, History, dan State Narrative

### `src/components/chat/VersionHistoryDialog.tsx`
- [x] ARD-VHD-01 Redesign timeline versi sebagai alur evolusi artifact (bukan hanya list button).
- [x] ARD-VHD-02 Definisikan ulang state “Dilihat”, “Terbaru”, dan transisi pilih versi agar mudah dipahami.
- [x] ARD-VHD-03 Validasi konsistensi perilaku dialog dengan version selector di viewer.

### `src/components/chat/ArtifactList.tsx`
- [x] ARD-LST-01 Audit peran ArtifactList pada flow terbaru, lalu redesign jika masih dipakai sebagai entry point alternatif.
- [x] ARD-LST-02 Validasi relasi data di ArtifactList dengan tabs aktif agar tidak menampilkan konteks usang.
  Catatan audit: per 2026-02-15 komponen belum terhubung ke flow runtime utama, dipertahankan sebagai fallback entrypoint dengan mode `latest-only` untuk mencegah konteks versi usang.

## P4 - Konsolidasi, QA, dan Compliance

### Konsistensi UX lintas komponen
- [x] ARD-VAL-01 Validasi konsistensi model interaksi artifact antar panel, modal fullscreen, sidebar, dan topbar.
- [x] ARD-VAL-02 Validasi hierarki informasi artifact (status, versi, sumber, aksi) konsisten di semua entry point.
- [x] ARD-VAL-03 Validasi empty/loading/error states artifact flow tidak saling bertentangan.

### Aksesibilitas dan operability
- [x] ARD-VAL-04 Uji keyboard operability untuk tablist, toolbar action, context menu, dialog history, dan fullscreen controls.
- [x] ARD-VAL-05 Uji focus order dan focus trap khusus untuk fullscreen modal + dialog history.
- [x] ARD-VAL-06 Uji keterbacaan label/status artifact untuk screen reader (`aria-label`, state announcement).

### Dokumentasi redesign
- [x] ARD-DOC-01 Update `design-priority-plan.md` setelah keputusan struktur final terkunci.
- [x] ARD-DOC-02 Update dokumen redesign chatpage yang terdampak agar istilah artifact lifecycle konsisten.
- [x] ARD-DOC-03 Sinkronkan checklist QA akhir dengan kondisi codebase terbaru.

## Urutan Eksekusi Redesign yang Direkomendasikan
- [x] Batch A: `ArtifactPanel` + `ArtifactTabs` + `ArtifactToolbar`
- [x] Batch B: `ArtifactViewer` + `ArtifactEditor`
- [x] Batch C: `FullsizeArtifactModal`
- [x] Batch D: `ArtifactIndicator` + `MessageBubble`
- [x] Batch E: `SidebarPaperSessions` + `TopBar` + `VersionHistoryDialog`
- [x] Batch F: `ArtifactList` (jika masih relevan) + konsolidasi QA + update dokumentasi
