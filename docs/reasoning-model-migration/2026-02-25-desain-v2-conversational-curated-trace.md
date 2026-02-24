# Desain V2: Conversational Visible Reasoning (Persistent Curated Trace)

Tanggal: 25 Februari 2026  
Status: Draft Desain V2 (siap diturunkan ke implementation plan)  
Scope: UX + contract reasoning trace di chat runtime (worktree `feature/paper-prompt-compression`)

Dokumen terkait:
- [Desain v1](./2026-02-25-desain-visible-reasoning-curated-trace.md)
- [Implementation Plan v1](./2026-02-25-implementation-plan-visible-reasoning-curated-trace.md)

---

## 1) Latar Masalah

Observasi dari uji visual menunjukkan panel saat ini terasa seperti **tool/state monitor**, bukan "model sedang berpikir".

Gejala utama:
1. Copy step terlalu teknis (`web-search-enabled`, `no-tool-detected-yet`).
2. Visual terlalu tabel/status-card, minim nuansa narasi.
3. User tidak dapat "membaca alur berpikir" secara natural dari atas ke bawah.
4. Detail reasoning menumpuk di area progress bar, tidak ada pola master-detail yang jelas.

Dampak:
1. Nilai marketing "visible reasoning" kurang terasa.
2. Persepsi user: "ini log sistem", bukan "AI sedang menalar".

---

## 2) Objective V2

1. Ubah pengalaman reasoning dari **status teknis** menjadi **narasi proses**.
2. Pertahankan prinsip keamanan: `visible reasoning = curated trace`, bukan raw CoT.
3. Jadikan reasoning trace **persistent per assistant message** agar bisa dibuka ulang kapan pun.
4. Tetap kompatibel dengan paper workflow dan tool-calling tanpa regression.

---

## 3) Prinsip UX V2

1. **Narrative-first**: user melihat 1 kalimat proses aktif yang manusiawi.
2. **Progressive disclosure**: detail step-by-step tampil saat headline diklik.
3. **No raw CoT**: tidak menampilkan pikiran mentah, hanya ringkasan proses aman.
4. **Consistency**: istilah dan tone konsisten lintas normal mode, paper mode, web search.
5. **Trust by transparency**: alur kerja agent terbaca jelas dari headline + aktivitas detail.
6. **Persistent access**: trace final tetap bisa dibuka dari histori chat.

---

## 4) Interaction Model (Target)

## 4.1 Surface Layer (Inline di atas input)

Komponen ringkas yang selalu terlihat:
1. `headline`: satu baris kalimat aktif, contoh: "Sedang memvalidasi sumber paling relevan..."
2. `action`: headline bersifat klikable untuk buka panel aktivitas.
3. `cta`: ketika selesai, headline tetap ada sebagai jejak proses yang bisa dibuka ulang.

Tujuan:
1. Memberi kesan "AI sedang melakukan sesuatu" dengan bahasa natural.
2. Mengurangi noise card status di area utama.
3. Menyediakan entry point permanen ke detail reasoning.

## 4.2 Detail Layer (Activity Panel)

Panel detail kanan (desktop) / bottom sheet (mobile) berisi:
1. daftar step curated (timestamp relatif + status)
2. detail aman per step (mis. jumlah sumber, stage aktif, tool name)
3. highlight step yang sedang berjalan

Target visual:
1. format bullet/timeline naratif
2. bukan grid status teknis
3. bisa dibuka dari headline kapan pun, termasuk chat lama

---

## 5) Information Architecture

## 5.1 Struktur Data UI

Tetap gunakan event utama:
1. `data-reasoning-trace`

Tambahkan event turunan (opsional):
1. `data-reasoning-headline`

Kontrak `data-reasoning-headline`:
1. `traceId: string`
2. `text: string` (kalimat naratif aktif)
3. `kind: "thinking" | "searching" | "validating" | "composing" | "finalizing"`
4. `ts: number`

Catatan:
1. Jika event headline tidak ada, UI generate headline dari step aktif (`data-reasoning-trace`).
2. Setelah turn selesai, backend menyimpan snapshot trace final ke DB untuk rehydrate histori.

## 5.2 Mapping Step -> Copy Naratif

Contoh mapping default:
1. `intent-analysis` -> "Memahami kebutuhan lo dulu..."
2. `paper-context-check` -> "Cek konteks stage paper yang aktif..."
3. `search-decision` -> "Menentukan perlu web search atau tidak..."
4. `source-validation` -> "Memvalidasi kualitas sumber yang ditemukan..."
5. `response-compose` -> "Menyusun jawaban paling relevan buat lo..."
6. `tool-action` -> "Menjalankan aksi tool yang diperlukan..."

Larangan copy:
1. jangan tampilkan istilah internal mentah seperti `web-search-enabled`
2. jangan tampilkan alasan policy internal/system prompt

---

## 6) State Machine UX

State global reasoning panel:
1. `idle` (tidak tampil)
2. `active-inline` (headline tampil, panel closed)
3. `active-panel-open` (headline + panel open)
4. `completed-persisted` (trace final tersimpan ke DB dan tetap bisa dibuka)
5. `error` (headline error aman + opsi retry)

Aturan pembukaan:
1. saat generating, headline aktif selalu terlihat.
2. klik headline membuka panel detail.
3. setelah selesai, headline + panel tetap tersedia dari histori message.

---

## 7) Persistence Data Model

Lokasi data:
1. Simpan trace di record `messages` untuk role `assistant`.
2. Tambah field optional baru yang direkomendasikan: `reasoningTrace`.

Struktur `reasoningTrace` (snapshot final):
1. `version: 1`
2. `headline: string`
3. `steps: Array<{ stepKey, label, status, progress?, meta?, ts }>`
4. `completedAt: number`
5. `traceMode: "curated"`

Aturan data:
1. write hanya saat response final (sukses/error terkendali).
2. read saat hydrate histori chat.
3. update parsial tidak wajib; cukup simpan snapshot final.

---

## 8) Responsiveness

1. Desktop (`>= md`): activity panel side drawer kanan.
2. Mobile (`< md`): bottom sheet (target tinggi final ditentukan produk).
3. Headline inline tetap muncul di semua breakpoint.

---

## 9) Accessibility

1. Headline area pakai `aria-live="polite"`.
2. Panel detail memiliki fokus keyboard trap + escape close.
3. Status step punya label teks (jangan icon-only).

---

## 10) Security & Safety Guardrails

1. Tidak pernah stream `reasoning-delta` mentah (`sendReasoning: false` tetap wajib).
2. Sanitasi step meta whitelist-only.
3. Batasi panjang `headline` dan `meta.note`.
4. Yang disimpan ke DB hanya curated trace final yang sudah tersanitasi.
5. Dilarang menyimpan raw CoT, prompt internal, credential, atau policy text.

---

## 11) Acceptance Criteria V2

Desain dianggap siap eksekusi jika:
1. Surface layer menampilkan 1 kalimat naratif aktif, bukan daftar status teknis.
2. Detail reasoning dipindah ke panel aktivitas, bukan menumpuk di status bar utama.
3. Bahasa step human-readable dan kontekstual.
4. Curated trace tetap aman (tanpa raw CoT).
5. Trace final bisa dibuka ulang dari histori chat (persistent).
6. Paper mode + websearch mode tetap terwakili dalam alur naratif.

---

## 12) Open Questions (Product)

1. Retensi trace dikunci ikut lifecycle message: selama message ada, trace tetap ada.
2. Saat user edit-and-resend yang menghapus message lama, trace lama ikut terhapus permanen, lo setuju?
3. Untuk copy naratif, lo prefer tone netral profesional atau semi-konversasional yang terasa "agent lagi kerja"?
