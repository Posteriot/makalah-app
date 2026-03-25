# stream-delivery-gap — Priority Map

> Berdasarkan verdict.md. Urutan: impact tertinggi + risiko terendah duluan.

---

## Prioritas 1

**Keluarkan persistExactSourceDocuments dari jalur sebelum finish.**

Impact:

- time-to-stream-finish: sangat tinggi
- time-to-first-token: nol
- post-response resource drain: sedang (persist jadi post-response work)

Kenapa ini paling atas:

- Ini root cause paling bersih dan paling langsung untuk gap ~4.3 detik
  sebelum stream benar-benar selesai.
- Di `orchestrator.ts:781` dia masih `await`, padahal finish baru ditulis
  di `orchestrator.ts:829`.
- Ini paling rendah risiko terhadap kualitas jawaban, karena tidak mengubah
  search/fetch/compose logic.
- Data yang dibutuhkan persist (`fetchedContent`) sudah tersedia di memory —
  tidak ada dependensi yang mengharuskan persist blocking finish event.

Catatan sinkron dengan implementation plan:

- P1 adalah **safe baseline** yang memangkas porsi gap terbesar
  (`persistExactSourceDocuments`), tapi tidak menghilangkan seluruh gap.
- Sisa gap utama setelah P1 adalah `await config.onFinish(...)`.

Arah perbaikan terbaik:

- kirim finish dulu (`writer.write(chunk)` sebelum await persist)
- exact persist pindah ke background task terisolasi
- update comment misleading di `orchestrator.ts:774` (bilang "fire-and-forget"
  tapi faktanya `await`)

---

## Prioritas 2

**Ringankan atau keluarkan saveAssistantMessage dari critical finish path.**

Impact:

- time-to-stream-finish: tinggi
- time-to-first-token: nol
- post-response resource drain: rendah

Kenapa:

- `onFinish` masih di-await di `orchestrator.ts:752`.
- Di dalamnya ada `await saveAssistantMessage(...)` di `route.ts:2268`,
  dan write DB via `await retryMutation(...)` di `route.ts:1378`.
- Dari log: 1,060ms blocking.

Tradeoff:

- Ini lebih sensitif dari prioritas 1, karena message persistence adalah
  data inti.
- **Risiko data loss**: kalau `saveAssistantMessage` dipindah ke
  fire-and-forget dan gagal (Convex down, timeout, crash), message hilang
  permanen. User lihat respons di layar, tapi kalau refresh halaman,
  respons tidak ada. Ini bukan tradeoff kecil.
- Opsi tengah: kirim finish event dulu, lalu jalankan persistence setelah
  finish ditulis. Ini memperbaiki UX karena client sudah menerima finish
  signal lebih cepat, tapi tidak menghilangkan risiko bahwa persistence
  tetap gagal sesudah user melihat respons.
- Kalau target UX lebih penting dari durability guarantee, ini kandidat
  besar. Tapi harus diputuskan secara eksplisit, bukan diam-diam.

Catatan sinkron dengan implementation plan:

- P2 **bukan** bagian dari safe baseline execution plan.
- P2 adalah follow-up opsional kalau tim memang ingin mengejar sisa gap
  ~1 detik dan menerima atau mengompensasi tradeoff durability.

---

## Prioritas 3

**Kurangi biaya Phase 1 retriever atau ubah router supaya tidak selalu
kena jalur search berat.**

Impact:

- time-to-first-token: sangat tinggi
- time-to-stream-finish: sedang (mengurangi total wall-clock time dari
  request-start ke stream-close, tapi TIDAK mengurangi gap 4.3s antara
  compose-end dan finish event — gap itu masalah P1/P2)
- post-response resource drain: rendah

Kenapa:

- Dari log, retriever search makan ~17.7 detik (`Phase1 total=17665ms`).
  Itu bottleneck terbesar sebelum token pertama.
- Di kode, orchestrator menunggu full retriever text dulu lewat
  `await searchResult.text` di `orchestrator.ts:228-233` (Promise.race
  dengan timeout).
- Router search juga nambah ~2.6 detik (`searchRouter=2610ms`) di
  `route.ts:1966`.

Arah perbaikan:

- kurangi frekuensi route ke web search
- cache hasil router
- pakai fast-path lebih agresif
- evaluasi apakah google-grounding memang retriever default terbaik
  buat latency

---

## Prioritas 4

**Kurangi biaya compose first-token pada drafting stage.**

Impact:

- time-to-first-token: sedang
- time-to-stream-finish: sedang
- post-response resource drain: rendah

Kenapa:

- Setelah search+fetch selesai pun compose first token masih ~3.7 detik
  (`Phase2 firstToken=3653ms`).
- Drafting stage juga bawa `CHOICE_YAML_SYSTEM_PROMPT` di
  `orchestrator.ts:455` dan transform `pipeYamlRender` di
  `orchestrator.ts:881`, yang menambah token context dan transform
  overhead.

Catatan:

- Ini bukan root cause utama, jadi jangan dikerjakan sebelum prioritas 1-3.

---

## Prioritas 5

**Batasi atau antrikan RAG ingest background.**

Impact:

- time-to-first-token: nol
- time-to-stream-finish: nol
- post-response resource drain: sangat tinggi

Kenapa:

- RAG ingest memang tidak menahan finish, tapi dia penyedot resource
  utama setelah response close.
- Loop background ada di `orchestrator.ts:787`, dan pekerjaan beratnya
  ada di chunk/embed/store di `rag-ingest.ts:43`, `:53`, `:69`.
- Dari log: total 15,842ms untuk 6 sources. Source terbesar
  (haibunda.com, 10 chunks, 7236 chars) butuh 3,128ms.

Arah perbaikan:

- queue
- concurrency cap
- skip ingest untuk source terlalu besar / terlalu lemah nilainya
- defer ingest sampai benar-benar dibutuhkan

---

## Prioritas 6

**Tambah client-side stale streaming watchdog.**

Impact:

- time-to-stream-finish: nol (tidak mempercepat normal case)
- recovery dari stuck state: sangat tinggi
- user experience saat failure: sangat tinggi

Kenapa:

- Dari verdict CF-1: `ChatWindow.tsx:1550-1560` interval timer jalan
  selamanya tanpa timeout. AI SDK `consumeStream` juga tanpa timeout.
- Kalau stream stuck karena alasan apapun (buffering, network drop,
  browser sleep), tidak ada recovery.
- Fix P1/P2 menghilangkan penyebab utama stuck, tapi watchdog tetap
  valuable sebagai safety net untuk skenario edge case.

Arah perbaikan:

- Timer di client: kalau tidak ada chunk baru dalam N detik setelah
  compose mulai, force transition ke "ready" atau "error"
- Bisa juga: heartbeat dari server selama idle gap (tapi lebih invasif)

---

## Quick wins (bisa dikerjakan kapan saja, zero risk)

- **Comment fix**: update `orchestrator.ts:774` — ganti "fire-and-forget,
  isolated" jadi yang akurat (persist = await, RAG = fire-and-forget).
  Ini mencegah salah diagnosis oleh developer berikutnya.

- **Observability mitigation** (verdict CF-2): tambah server-side logging
  di sekitar before-finish / after-finish / after-close untuk memperjelas
  apakah request berhenti di jalur orchestrator, di finish path, atau di
  close path. AI SDK `safeEnqueue` menelan error secara silent — tidak bisa
  di-fix di level repo, jadi mitigasi realistis di repo adalah memperkaya
  tracing lifecycle stream, bukan mengklaim bisa membuktikan chunk finish
  benar-benar diterima client.

---

## Urutan eksekusi perbaikan terbaik

1. Quick wins (comment fix + lifecycle tracing) — zero risk, immediate
2. persistExactSourceDocuments keluar dari finish path — highest impact
3. evaluasi saveAssistantMessage di finish path — high impact, tradeoff
4. tekan latency retriever/router — TTFT improvement
5. optimasi compose drafting — secondary TTFT
6. tata ulang RAG background — resource efficiency
7. client-side watchdog — safety net
