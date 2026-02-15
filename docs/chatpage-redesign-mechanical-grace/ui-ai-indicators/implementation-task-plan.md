# Implementation Task Plan - UI AI Indicators Stabilization

> Branch target: `feat/chatpage-redesign-mechanical-grace`  
> Scope: Chat area (`ChatWindow` + `ChatInput` + indikator proses AI)

## 1. Latar Belakang Masalah

Behavior saat ini di area chat:
- indikator proses AI muncul di dalam alur message (`MessageBubble`/footer list),
- saat stream berjalan, tinggi konten berubah dinamis,
- auto-scroll ikut bergerak sehingga viewport terasa “meloncat”,
- indikator proses tertentu menghilang sebelum user merasa proses benar-benar selesai.

Efek UX:
- user kehilangan fokus baca pada teks yang sedang muncul,
- status proses sulit dipantau secara konsisten.

## 2. Tujuan

1. Menyediakan indikator proses AI yang persisten dan stabil secara visual.
2. Mengurangi/meniadakan efek loncatan viewport selama streaming.
3. Menjaga teks parsial hasil AI tetap dipertahankan saat proses dihentikan manual.
4. Menyediakan kontrol stop yang jelas di area input.
5. Seluruh status utama tampil dalam Bahasa Indonesia.

## 3. Non-Goal

- Tidak mengubah logic bisnis paper workflow.
- Tidak mengubah format isi respons AI.
- Tidak mengubah layout sidebar/activity bar/artifact panel di task ini.

## 4. Desain Solusi

### 4.1 Komponen baru: `ChatProcessStatusBar`

Posisi:
- persisten tepat di atas `ChatInput`, di luar list message (bukan bagian dari bubble).

Karakter visual:
- background ringan netral (slate adaptif dark/light),
- progress line/bar animated,
- label status berbahasa Indonesia,
- tidak memicu perubahan tinggi konten message list berulang.

Sumber status:
- `useChat.status` (`submitted`, `streaming`, `ready`, `error`),
- sinyal tool aktif dari message terakhir assistant (opsional tahap awal),
- state internal progress 0..100 berbasis milestone + easing.

### 4.2 Perilaku tombol input: `Send` -> `Stop`

Saat `ChatProcessStatusBar` aktif:
- tombol kirim berubah menjadi tombol `Stop`,
- style tetap varian slate adaptif dark/light (sesuai arahan),
- ikon/label berubah untuk menegaskan aksi stop.

Saat tombol `Stop` ditekan:
- panggil `stop()` dari `useChat`,
- streaming dihentikan,
- teks parsial yang sudah keluar tetap dipertahankan (tidak dihapus).

### 4.3 Harmonisasi indikator inline lama

Agar tidak duplikatif dan mengurangi loncatan:
- indikator inline proses di `MessageBubble` disederhanakan saat `ChatProcessStatusBar` aktif,
- status detail yang tetap diperlukan (mis. sources/artifact) tetap bisa tampil setelah event selesai.

### 4.4 Requirement Wajib: Perilaku indikator di chat bubble

Aturan wajib implementasi:
- indikator proses di bubble harus selalu berada di bagian atas bubble assistant aktif (sebelum konten teks),
- indikator proses di bubble harus persisten selama proses belum selesai (`submitted`/`streaming`),
- indikator proses di bubble tidak boleh berpindah posisi ke bawah konten di tengah stream,
- indikator proses di bubble baru boleh hilang setelah proses selesai (`ready`) atau stop manual.

Strategi teknis:
- sediakan slot indikator khusus yang posisinya fixed secara struktur di atas konten bubble,
- gunakan state terpusat untuk mengunci visibilitas indikator selama stream berlangsung,
- hindari mount/unmount berulang pada slot indikator agar tidak memicu loncatan layout.

## 5. Rencana Perubahan Per File

## A. File baru

1. `src/components/chat/ChatProcessStatusBar.tsx`
- render progress bar + label status Indonesia.
- menerima props:
  - `active: boolean`
  - `status: "submitted" | "streaming" | "ready" | "error"`
  - `onStop?: () => void` (jika kontrol stop mau ditempatkan juga di bar)
  - `progress?: number` (opsional, bila progress dihitung di parent)

## B. File existing

1. `src/components/chat/ChatWindow.tsx`
- tambahkan state progress indikator proses.
- turunkan `isGenerating` + handler `stop` ke `ChatInput`.
- render `ChatProcessStatusBar` persisten di atas `ChatInput`.
- atur lifecycle progress:
  - start di submitted,
  - naik bertahap saat streaming,
  - settle ke 100 saat finish,
  - hide dengan delay halus setelah selesai.
- pertahankan partial response saat stop (default behavior `useChat` + tanpa truncate).

2. `src/components/chat/ChatInput.tsx`
- ubah props agar menerima:
  - `isGenerating` (atau `showStop`)
  - `onStop`
- tombol aksi:
  - mode normal: `Send`
  - mode generating: `Stop` (varian slate, bukan rose)

3. `src/components/chat/MessageBubble.tsx`
- review render indikator inline proses (`ToolStateIndicator`, `SearchStatusIndicator`, `ThinkingIndicator` via footer)
- indikator proses bubble dipasang pada slot tetap di bagian atas bubble assistant aktif.
- indikator bubble tidak boleh dipindah ke bawah konten saat stream berjalan.
- indikator bubble tetap tampil sampai proses selesai, lalu hide terkontrol (bukan flicker).

4. `src/components/chat/ToolStateIndicator.tsx`
5. `src/components/chat/SearchStatusIndicator.tsx`
6. `src/components/chat/ThinkingIndicator.tsx`
- sinkronisasi agar perilaku tidak konflik dengan status bar persisten.
- visibilitas indikator mengikuti state terpusat supaya persisten dan tidak flicker.

## 6. Mapping Status Bahasa Indonesia (Draft)

- `submitted` -> `Menyiapkan respons AI...`
- `streaming` -> `AI sedang menyusun jawaban...`
- `stop` (manual) -> `Proses dihentikan`
- `ready` (complete) -> `Respons selesai`
- `error` -> `Terjadi kendala saat memproses respons`

Catatan:
- wording final bisa disesuaikan tone produk, tetapi harus konsisten di seluruh indikator utama.

## 7. Detail UX & Interaksi

1. Prevent jumping:
- status bar ada di region tetap di atas input.
- message list tidak menambah/menghapus blok indikator proses berulang.
- slot indikator di bubble assistant aktif wajib stabil (struktur posisi tetap di atas konten).

2. Scroll behavior:
- auto-scroll tetap aktif saat streaming bila user berada di bawah.
- status bar tidak mempengaruhi tinggi item list.

3. Stop behavior:
- klik `Stop` menghentikan stream segera.
- konten yang sudah terbentuk tetap tampil sebagai jawaban parsial.
- indikator bubble tetap konsisten posisinya sampai transisi state selesai.

## 8. Risiko & Mitigasi

1. Risiko: status bar dan indikator lama tampil ganda.
- Mitigasi: gate rendering indikator inline berdasarkan `isGenerating` + flag pusat.

2. Risiko: progress terasa “palsu”.
- Mitigasi: gunakan milestone sederhana + easing, bukan angka absolut yang terlalu presisi.

3. Risiko: stop tidak memutus request di semua kondisi.
- Mitigasi: verifikasi manual beberapa skenario (normal chat, paper mode, search mode).

4. Risiko: style tidak konsisten dark/light.
- Mitigasi: snapshot visual 2 mode untuk state idle/generating/stopped/finished.

## 9. Checklist Implementasi

1. Tambah `ChatProcessStatusBar` + styling adaptif.
2. Integrasi ke `ChatWindow` (persisten di atas input).
3. Tambah mode `Stop` pada `ChatInput` (slate variant).
4. Wiring `stop()` dari `useChat`.
5. Pastikan partial response tetap ada setelah stop.
6. Kurangi indikator inline yang menyebabkan loncatan.
7. Kunci posisi indikator bubble di atas konten assistant aktif (tidak boleh pindah).
8. Pastikan indikator bubble persisten sampai state selesai/stop.
9. Uji dark mode + light mode.
10. Uji state:
   - start generate
   - streaming panjang
   - stop manual
   - selesai normal
   - error

## 10. Acceptance Criteria

1. Tidak ada loncatan UI indikator proses di tengah streaming.
2. User selalu melihat satu indikator proses utama yang persisten.
3. Tombol aksi berubah jelas menjadi `Stop` saat generating.
4. Tombol `Stop` menghentikan stream dan mempertahankan teks parsial.
5. Seluruh status utama di bar menggunakan Bahasa Indonesia.
6. Tampilan konsisten dan terbaca di light mode/dark mode.
7. Indikator proses di bubble assistant aktif selalu berada di atas konten teks.
8. Indikator proses di bubble assistant aktif persisten sampai proses selesai/stop.
9. Indikator proses di bubble assistant aktif tidak boleh turun/loncat ke bawah selama streaming.

## 11. Verifikasi Akhir

- Jalankan manual di port worktree aktif (`3001`).
- Validasi skenario chat biasa + paper mode.
- Pastikan tidak ada error baru di console terkait render state/status.
