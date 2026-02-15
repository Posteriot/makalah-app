# Task Step-by-Step - UI AI Indicators

> Turunan eksekusi dari `implementation-task-plan.md`  
> Fokus: implementasi teknis terstruktur + checklist progres + testing

## 1) Aturan Eksekusi

- Branch kerja: `feat/chatpage-redesign-mechanical-grace`
- Worktree: `worktrees/chatpage-redesign-mechanical-grace`
- Port uji: `3001`
- Requirement wajib:
  - indikator proses di bubble assistant aktif selalu di atas konten teks,
  - indikator proses di bubble persisten sampai `ready` atau stop manual,
  - indikator proses di bubble tidak boleh turun/loncat ke bawah saat streaming.

---

## 2) Breakdown Task Teknis

## Phase 0 - Baseline & Guardrail

Tujuan: memastikan kondisi awal jelas sebelum refactor.

Langkah:
1. Inventaris titik render indikator saat ini di:
   - `src/components/chat/ChatWindow.tsx`
   - `src/components/chat/MessageBubble.tsx`
   - `src/components/chat/ToolStateIndicator.tsx`
   - `src/components/chat/SearchStatusIndicator.tsx`
   - `src/components/chat/ThinkingIndicator.tsx`
2. Tandai sumber state utama:
   - `status` dari `useChat`
   - flag `isGenerating`
   - data tool/search part di message terakhir assistant.
3. Catat baseline behavior loncatan (rekam screenshot/observasi manual).

Checklist:
- [ ] Titik render indikator terdokumentasi
- [ ] State mapping terdokumentasi
- [ ] Baseline loncatan tervalidasi di port `3001`

## Phase 1 - Komponen `ChatProcessStatusBar`

Tujuan: membuat indikator utama persisten di luar list message.

Langkah:
1. Buat file baru `src/components/chat/ChatProcessStatusBar.tsx`.
2. Props minimal:
   - `active: boolean`
   - `status: "submitted" | "streaming" | "ready" | "error"`
   - `progress: number`
   - `message: string`
3. Style:
   - adaptif dark/light (varian slate),
   - animated progress bar,
   - tanpa warna non-netral kecuali status error bila diperlukan.
4. Mapping status Indonesia:
   - submitted: `Menyiapkan respons AI...`
   - streaming: `AI sedang menyusun jawaban...`
   - ready: `Respons selesai`
   - error: `Terjadi kendala saat memproses respons`

Checklist:
- [ ] File komponen baru dibuat
- [ ] Status text Indonesia terpasang
- [ ] Progress bar animasi berjalan
- [ ] Style dark/light adaptif

## Phase 2 - Integrasi ke `ChatWindow`

Tujuan: status bar persisten muncul di atas `ChatInput` dan lifecycle stabil.

Langkah:
1. Di `ChatWindow.tsx`, tambahkan state:
   - `processProgress`
   - `processVisible`
2. Lifecycle progress:
   - `submitted` -> start progress awal,
   - `streaming` -> progress naik bertahap (smooth),
   - `ready` -> set 100, lalu hide dengan delay singkat,
   - `error` -> tampil state error.
3. Render `ChatProcessStatusBar` persisten tepat di atas `ChatInput`.
4. Pastikan komponen ini tidak berada di item `Virtuoso` (harus di luar list message).

Checklist:
- [ ] Progress lifecycle sesuai status
- [ ] Bar persisten di atas input
- [ ] Tidak berada di dalam item message list
- [ ] Tidak menambah loncatan layout

## Phase 3 - Ubah `Send` menjadi `Stop` saat generating

Tujuan: user bisa menghentikan proses dengan jelas.

Langkah:
1. Di `ChatInput.tsx`, tambah props:
   - `isGenerating`
   - `onStop`
2. Saat `isGenerating === true`:
   - tombol utama jadi `Stop`,
   - style slate adaptif dark/light (bukan rose),
   - klik memanggil `onStop`.
3. Di `ChatWindow.tsx`, teruskan `stop()` dari `useChat` ke `ChatInput`.
4. Pastikan saat stop:
   - stream berhenti,
   - teks parsial tetap tampil.

Checklist:
- [ ] Props baru `ChatInput` terintegrasi
- [ ] Tombol berubah `Send` -> `Stop`
- [ ] Aksi `Stop` memanggil `useChat.stop()`
- [ ] Partial response tidak hilang

## Phase 4 - Kunci posisi indikator di bubble

Tujuan: indikator bubble tidak turun/loncat saat streaming.

Langkah:
1. Di `MessageBubble.tsx`, buat slot indikator khusus di bagian paling atas bubble assistant aktif.
2. Pastikan urutan render konsisten:
   - indicator slot
   - baru konten markdown/text.
3. Gate rendering indikator supaya:
   - tidak mount/unmount berulang di tengah streaming,
   - baru hide setelah `ready`/stop.
4. Sinkronkan `ToolStateIndicator` dan `SearchStatusIndicator` agar tidak konflik dengan status bar persisten.

Checklist:
- [ ] Slot indikator tetap di atas konten
- [ ] Indikator tidak pindah ke bawah saat stream
- [ ] Indikator persisten sampai selesai/stop
- [ ] Tidak ada flicker akibat remount berulang

## Phase 5 - Rapikan indikator lama

Tujuan: tidak ada duplikasi indikator yang membingungkan user.

Langkah:
1. Evaluasi `ThinkingIndicator` di footer list.
2. Pilih mode final:
   - dijadikan fallback minimal, atau
   - dinonaktifkan saat `ChatProcessStatusBar` aktif.
3. Pastikan detail penting pasca-proses (mis. sources/artifact) tetap muncul normal.

Checklist:
- [ ] Tidak ada indikator ganda yang redundan
- [ ] Sources/artifact tetap berfungsi
- [ ] UX status proses tetap jelas

---

## 3) Checklist Progres Implementasi

Gunakan list ini sebagai tracker harian:

- [ ] Phase 0 selesai
- [ ] Phase 1 selesai
- [ ] Phase 2 selesai
- [ ] Phase 3 selesai
- [ ] Phase 4 selesai
- [ ] Phase 5 selesai
- [ ] Refactor minor + cleanup className/props selesai
- [ ] Dokumen diperbarui jika ada deviasi implementasi

---

## 4) Checklist Testing

## A. Functional Testing

1. Start generate (`submitted`):
- [ ] `ChatProcessStatusBar` muncul
- [ ] status text Indonesia benar
- [ ] tombol `Stop` muncul

2. Streaming panjang:
- [ ] progress bergerak halus
- [ ] indikator bubble tetap di atas konten
- [ ] indikator bubble tidak turun/loncat
- [ ] viewport tidak loncat ekstrem

3. Stop manual:
- [ ] klik `Stop` menghentikan stream
- [ ] teks parsial tetap ada
- [ ] status bar transisi ke selesai/dihentikan dengan benar

4. Finish normal (`ready`):
- [ ] progress mencapai 100
- [ ] indikator hide dengan transisi halus
- [ ] tidak ada indikator nyangkut

5. Error state:
- [ ] status bar tampil state error
- [ ] tidak merusak input & message render

## B. Visual Testing (Light/Dark)

- [ ] Status bar terbaca di light mode
- [ ] Status bar terbaca di dark mode
- [ ] Tombol `Stop` slate variant konsisten di light mode
- [ ] Tombol `Stop` slate variant konsisten di dark mode
- [ ] Kontras teks memenuhi keterbacaan

## C. Regression Testing

- [ ] Chat input biasa tetap bisa kirim pesan
- [ ] Edit message flow tidak rusak
- [ ] Paper validation panel tetap berfungsi
- [ ] Sources indicator tetap berfungsi
- [ ] Artifact indicator tetap berfungsi
- [ ] Tidak ada error baru di console browser

## D. Build/Lint Sanity

- [ ] `npm run lint`
- [ ] `npm run build` (opsional tapi disarankan sebelum commit besar)

---

## 5) Definition of Done

Task dinyatakan selesai jika:
1. Semua checklist functional + visual + regression tercentang.
2. Requirement wajib indikator bubble terpenuhi penuh.
3. UX loncatan indikator proses sudah hilang secara nyata pada uji manual.
4. Tidak ada error runtime baru dari perubahan ini.
