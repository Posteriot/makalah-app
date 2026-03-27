# Dynamic Reasoning UI Design Doc

Tanggal: 2026-03-27
Branch kerja: `fix/chat-transparent-thinking-surface`
Ruang lingkup: `/chat` chat window, khusus mode reasoning `transparent`

## 1. Ringkasan Masalah

UX target untuk mode `transparent` adalah: pikiran model terlihat hidup, terus berubah selama proses berjalan, dan tetap terlihat sampai respons selesai. Implementasi sekarang belum memenuhi target itu.

Gejala yang teramati dari UI:

- Reasoning bisa muncul panjang di awal proses, lalu menghilang di tengah proses.
- Di tengah proses, user sering hanya melihat dots dan progress persen tanpa isi reasoning.
- Reasoning baru bisa muncul lagi mendekati akhir proses.
- Surface proses lain seperti `Respons agen` atau status search dapat tetap tampil saat reasoning kosong, sehingga kesannya reasoning “hilang” atau digantikan indikator lain.

Kesimpulan riset: masalah ini bukan bug tunggal. Ini adalah kombinasi bottleneck pada layer emit backend, state derivation frontend, dan kompetisi antar-surface proses.

## 2. Temuan Riset End-to-End

### 2.1 Backend non-websearch hanya mengirim thought secara sampling

Di `src/app/api/chat/route.ts`, `createReasoningAccumulator()` menambahkan semua delta ke buffer internal, tetapi event `data-reasoning-thought` hanya dikirim jika:

- `chunkCount % 3 === 0`, atau
- `delta.length > 100`

Artinya sebagian besar reasoning delta memang tidak pernah dikirim ke UI live.

### 2.2 Backend websearch juga memakai sampling, bukan live stream penuh

Di `src/lib/ai/web-search/orchestrator.ts`, reasoning delta juga hanya diteruskan bila:

- chunk pertama,
- setiap chunk ke-3,
- atau sanitized delta cukup panjang.

Jadi mode websearch dan non-websearch sama-sama tidak memodelkan “reasoning buffer yang selalu tumbuh”; keduanya hanya memodelkan “snapshot delta sesekali”.

### 2.3 Frontend hanya mengambil thought terakhir, bukan buffer reasoning yang terus bertambah

Di `src/components/chat/ChatWindow.tsx`, `extractLiveThought()` mengiterasi semua `data-reasoning-thought`, tetapi yang dipertahankan hanya `lastThought`.

Implikasinya:

- UI tidak punya konsep “live accumulated reasoning”.
- Kalau event terakhir kosong atau tidak ada event baru yang lolos sampling, headline reasoning kehilangan isi.
- User melihat reasoning sebagai kilatan-kilatan terpisah, bukan aliran yang hidup.

### 2.4 Status bar tetap tampil walau headline kosong

Di `src/components/chat/ChatProcessStatusBar.tsx`, status bar tetap dirender kalau:

- `visible && reasoningSteps.length > 0`, atau
- panel reasoning sedang terbuka.

Akibatnya, ketika step timeline ada tetapi `reasoningHeadline` kosong, status bar tetap muncul dengan dots dan persen progress. Ini menjelaskan keadaan “48% cuma ada ...”.

### 2.5 Surface proses lain dapat mengisi slot kognitif saat reasoning kosong

Di `src/components/chat/MessageBubble.tsx`, ada fallback `ToolStateIndicator` dengan label `assistant_response` yang dirender sebagai `Respons agen`. Ada juga `SearchStatusIndicator`.

Akibatnya:

- reasoning bukan satu-satunya surface proses yang hidup,
- user menerima sinyal proses dari beberapa kanal yang tidak dikordinasikan,
- saat live reasoning kosong, indikator lain tetap terlihat dan memperkuat kesan reasoning menghilang.

### 2.6 Rehydrate persisted trace belum merepresentasikan perilaku live

Saat reload/history sync, `ChatWindow` menyuntik `rawReasoning` persisted menjadi satu part `data-reasoning-thought`. Itu baik untuk konsistensi pasca-refresh, tetapi bukan solusi untuk streaming dinamis selama request berjalan.

### 2.7 Batas provider tetap perlu diakui

Di `src/lib/ai/streaming.ts`, `includeThoughts` hanya diaktifkan untuk provider/model yang kompatibel dengan reasoning. Jadi sistem tidak boleh menjanjikan “token-by-token thought” universal untuk semua provider. Target yang realistis adalah:

- selama provider mengirim reasoning delta, UI harus menampilkannya sebagai buffer yang stabil dan selalu tumbuh,
- bukan menunggu sampling jarang lalu mengganti headline secara putus-putus.

## 3. Sasaran

### 3.1 Sasaran utama

- Mode `transparent` menampilkan satu live reasoning surface yang terus hidup selama generation berjalan.
- Isi reasoning berubah dinamis berdasarkan reasoning delta terbaru dari model.
- Isi yang sudah tampil tidak hilang di tengah proses hanya karena tidak ada delta baru pada satu interval.
- Curated mode tetap bekerja seperti sekarang.
- Timeline/detail panel tetap bisa diakses secara manual tanpa menjadi surface utama yang bersaing.

### 3.2 Non-goal

- Tidak mengubah semantics `curated` menjadi transparent.
- Tidak mendesain ulang seluruh chat window.
- Tidak menambah pipeline scoring/filtering baru di antara tool output dan UI state.
- Tidak memaksa semua provider menghasilkan reasoning jika provider itu memang tidak mendukung thought streaming.

## 4. Problem Statement Teknis

Sistem saat ini memakai event `data-reasoning-thought` sebagai delta snapshot, tetapi UI memperlakukannya seolah-olah itu adalah current truth. Ini menghasilkan mismatch:

- backend mengirim delta sporadis,
- frontend menganggap delta terakhir adalah headline final,
- status bar tidak punya buffer reasoning yang stabil.

Selama model sedang berpikir, yang dibutuhkan sebenarnya bukan “delta terakhir”, melainkan “live reasoning snapshot” yang monotonik: setiap update merepresentasikan keadaan reasoning yang paling mutakhir dan dapat terus dipajang sampai update berikutnya datang.

## 5. Opsi Desain

### Opsi A: Tingkatkan frekuensi sampling, frontend tetap pakai `lastThought`

Perubahan:

- backend emit lebih sering,
- frontend tetap memakai event terakhir.

Kelebihan:

- perubahan kecil.

Kekurangan:

- reasoning masih bisa menghilang jika beberapa delta tidak lolos sanitasi,
- headline tetap mudah berganti-ganti secara kasar,
- tidak menyelesaikan mismatch fundamental antara delta dan snapshot.

Putusan: ditolak.

### Opsi B: Perkenalkan `live reasoning snapshot` sebagai source of truth transparent

Perubahan:

- backend tetap mengumpulkan buffer raw reasoning,
- backend mengirim event baru yang merepresentasikan snapshot reasoning terkini, bukan delta acak,
- frontend menyimpan dan menampilkan snapshot terakhir yang valid sampai ada snapshot baru atau stream selesai.

Kelebihan:

- cocok dengan target UX “selalu berubah sampai selesai”,
- stabil walau provider mengirim delta tidak merata,
- meminimalkan disappearance di tengah proses,
- kompatibel dengan persistence yang sudah ada.

Kekurangan:

- perlu perubahan data contract event reasoning,
- perlu penyesuaian test dan derivation state frontend.

Putusan: dipilih.

### Opsi C: Jangan pakai reasoning provider thoughts, bangun pseudo-thinking dari timeline step

Perubahan:

- headline dibentuk dari curated step labels/progress saja.

Kelebihan:

- deterministic.

Kekurangan:

- bukan transparent reasoning,
- memalsukan pengalaman berpikir model,
- bertentangan langsung dengan tujuan produk.

Putusan: ditolak.

## 6. Desain Yang Dipilih

### 6.1 Konsep inti

Mode `transparent` memakai satu state baru secara konseptual:

- `liveReasoningSnapshot`

State ini:

- berasal dari reasoning buffer yang terus diakumulasi di backend,
- dikirim ke client sebagai snapshot yang sudah disanitasi,
- dipertahankan di frontend sebagai headline aktif hingga ada snapshot baru,
- tidak dihapus hanya karena satu interval tidak ada delta baru.

### 6.2 Kontrak data

Tambahkan data part reasoning baru untuk stream live:

- `data-reasoning-live`

Struktur:

```ts
{
  type: "data-reasoning-live"
  id: string
  data: {
    traceId: string
    text: string
    ts: number
    done?: boolean
  }
}
```

Prinsip:

- `text` adalah snapshot reasoning yang sudah disanitasi, bukan delta.
- Event hanya dikirim saat snapshot berubah secara bermakna.
- Event terakhir boleh membawa `done: true` untuk menandai reasoning stream selesai.

`data-reasoning-thought` tetap dipertahankan sementara sebagai compatibility bridge sampai migrasi UI selesai, tetapi transparent UI baru tidak lagi bergantung padanya sebagai source of truth utama.

### 6.3 Strategi emit backend

Untuk kedua jalur, `route.ts` dan `web-search/orchestrator.ts`:

- tetap kumpulkan raw reasoning buffer lengkap untuk persistence,
- setiap reasoning delta memperbarui raw buffer,
- bentuk sanitized snapshot dari buffer,
- emit `data-reasoning-live` bila snapshot berbeda dari snapshot terakhir yang sudah dikirim.

Guardrails:

- jangan emit snapshot jika hasil sanitasi kosong,
- throttle ringan berbasis perubahan konten, bukan sampling buta,
- boleh tambah batas minimum interval kecil untuk mencegah flood render, tetapi tidak boleh kembali ke model `setiap chunk ke-3`.

Rekomendasi:

- gunakan kombinasi `content change` + `time gate` pendek, misalnya sekitar 120-200ms,
- snapshot terakhir tetap di-emit lagi pada finish jika perlu memastikan keadaan final tersimpan di UI.

### 6.4 Strategi derivation frontend

Di `ChatWindow`:

- tambahkan extractor untuk `data-reasoning-live`,
- prioritaskan `liveReasoningSnapshot` di atas `data-reasoning-thought`,
- untuk transparent mode, headline status bar diambil dari snapshot ini.

Aturan tampilan:

- selama ada snapshot reasoning aktif, status bar menampilkan snapshot itu,
- jika tidak ada update baru, snapshot lama tetap tampil,
- hanya fallback ke timeline/headline lama bila transparent live snapshot memang belum pernah tersedia.

### 6.5 Strategi render status bar

`ChatProcessStatusBar` tidak boleh menampilkan state “dots saja” untuk transparent mode selama sudah pernah ada snapshot reasoning valid dalam stream aktif.

Aturan:

- jika mode `transparent` dan ada `liveReasoningSnapshot`, render snapshot + dots + progress,
- jangan mengosongkan headline selama proses belum selesai,
- setelah selesai, snapshot final tetap tersedia untuk collapsed/expanded completed state,
- timeline/detail tetap drill-down manual, bukan surface utama.

### 6.6 Koordinasi dengan surface proses lain

Reasoning transparent harus menjadi surface kognitif utama. Karena itu:

- `SearchStatusIndicator` dan `ToolStateIndicator` tetap boleh hidup di area message bubble,
- tetapi status bar bawah chat tidak boleh kehilangan isi hanya karena indikator lain masih aktif,
- fallback `assistant_response` tidak boleh dianggap pengganti live reasoning transparent.

Desain ini sengaja tidak menghapus indikator tool/search, hanya memutus ketergantungan UX transparent terhadap indikator-indikator itu.

### 6.7 Persistence dan reload

Persistence yang ada tetap dipakai:

- raw reasoning lengkap tetap disimpan di snapshot trace,
- reload tetap bisa menyuntik reasoning final persisted ke UI.

Namun perilaku live baru memakai `data-reasoning-live` selama request aktif. Jadi ada pemisahan jelas:

- live transport: `data-reasoning-live`
- persistence / timeline: `data-reasoning-trace` + `rawReasoning`

## 7. Dampak ke Sistem Lain

### 7.1 Curated mode

Tidak boleh berubah perilakunya. Curated mode tetap:

- mengandalkan timeline steps,
- tidak wajib memakai live snapshot transparent.

### 7.2 Websearch mode

Harus ikut mendukung live snapshot karena saat ini problem juga terjadi di compose websearch path.

### 7.3 Message bubble process indicators

Tidak dihapus pada fase ini agar tidak memicu regresi di observability proses tool/search.

### 7.4 Persistence schema

Tidak perlu migrasi schema Convex. Solusi bekerja di level event stream dan derivation UI.

## 8. Risiko dan Mitigasi

### Risiko 1: Render terlalu sering

Mitigasi:

- emit snapshot berdasarkan perubahan isi + interval waktu ringan,
- hindari emit per token mentah.

### Risiko 2: Snapshot terlalu panjang dan noisy

Mitigasi:

- tetap gunakan sanitizer,
- pertahankan batas panjang tampilan yang stabil,
- kalau perlu lakukan trimming tail yang konsisten pada layer snapshot, bukan memotong buffer raw persistence.

### Risiko 3: Transparent dan curated saling bocor

Mitigasi:

- gate seluruh logic baru di `traceMode === "transparent"`,
- curated tetap pakai jalur lama.

### Risiko 4: Reload/retry/fallback provider menghasilkan headline aneh

Mitigasi:

- live state hanya aktif selama stream,
- setelah finish/error, fallback ke persisted final reasoning yang sudah ada,
- regression test untuk retry/error wajib ditambah.

## 9. Rencana Verifikasi

### 9.1 Unit/integration tests

- test backend accumulator/snapshot emit untuk non-websearch
- test backend snapshot emit untuk websearch orchestrator
- test `ChatWindow` memilih `data-reasoning-live` sebagai source of truth transparent
- test status bar transparent tidak drop ke dots-only setelah snapshot pertama muncul
- test curated mode tidak berubah
- test rehydrate persisted reasoning tetap bekerja

### 9.2 Manual UI verification

Pada provider reasoning-compatible dan mode `transparent`:

- reasoning muncul segera setelah provider mengirim thought
- teks reasoning berubah beberapa kali selama generation
- headline tidak menghilang di tengah proses
- `Detail →` tetap membuka panel timeline
- curated mode tetap menampilkan timeline seperti sebelumnya

## 10. Keputusan Akhir

Refactor harus berfokus pada satu perubahan arsitektural yang sempit tetapi benar:

- transparent mode tidak lagi bergantung pada delta sporadis sebagai headline,
- transparent mode memakai snapshot reasoning live yang stabil,
- timeline tetap menjadi drill-down dan persistence layer,
- surface proses lain tidak dihapus, tetapi tidak lagi boleh membuat live reasoning terasa hilang.

Ini adalah desain paling aman untuk mencapai target UX tanpa merusak sistem reasoning lain yang sudah berjalan.
