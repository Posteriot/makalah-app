# stream-delivery-gap — Evidence of Improvement

> Tanggal: 2026-03-25
> Scope: verifikasi dampak implementasi `implementation-plan.md`
> Fokus: finish-path behavior, bukan sekadar total request wall-clock

---

## Ringkasan

Perbaikan utama **terbukti berhasil** pada target arsitekturalnya:
`persistExactSourceDocuments(...)` tidak lagi menahan `finish` event dan
tidak lagi duduk di critical path sebelum stream bisa settle.

Safe baseline yang diimplementasikan **belum** menghilangkan seluruh gap
compose-end → stream-close, karena `config.onFinish(...)` masih tetap
di-`await` untuk menjaga durability message persistence. Tapi bagian gap
terbesar dari exact-source persistence sudah keluar dari jalur blocking.

---

## Evidence Utama

### Before

Urutan finish path dari log sebelum refactor:

1. `Phase2 composeTotal=11250ms`
2. `onFinish(DB writes)=607ms`
3. `Exact source persist ALL DONE total=4393ms`
4. `POST /api/chat 200 in 51s`
5. baru `RAG ingest` lanjut

Interpretasi:

- `finish` / stream completion masih tertahan oleh `onFinish` **dan**
  `persistExactSourceDocuments`
- exact-source persistence masih duduk di critical finish path

### After

Urutan finish path dari log sesudah refactor:

1. `Phase2 composeTotal=11269ms`
2. `[⏱ LIFECYCLE] finish-handler: citations+reasoning written, starting persistence`
3. `[⏱ LATENCY] onFinish(DB writes)=706ms`
4. `[⏱ LIFECYCLE] finish-handler: onFinish done, writing finish event`
5. `[⏱ LIFECYCLE] finish-handler: finish event written, stream closing`
6. `[⏱ LIFECYCLE] post-finish: starting detached exact-source persistence`
7. `[⏱ LATENCY] Exact source persist starting (detached): 6 sources`
8. `[⏱ LATENCY] EXECUTE SETTLE=40905ms (stream will close, client transitions to ready)`
9. `POST /api/chat 200 in 52s`
10. `[⏱ LATENCY] Exact source persist ALL DONE total=3175ms sources=6`
11. `[⏱ LATENCY] RAG ingest ALL DONE total=15776ms sources=6`
12. `[⏱ LATENCY] DETACHED ALL DONE total=59850ms`

Interpretasi:

- `finish` ditulis **sebelum** exact-source persistence selesai
- `execute` bisa settle sementara exact persist + RAG masih lanjut
- exact-source persistence **sudah keluar** dari finish blocking path

---

## Tabel Before vs After

| Fase | Before | After | Interpretasi |
|---|---:|---:|---|
| `searchRouter` | 3081ms | 2461ms | Bervariasi per query; bukan efek fix utama |
| `Phase1 retriever` | 18556ms | 23493ms | Search tetap bottleneck terbesar; belum disentuh |
| `Phase1.5 FetchWeb` | 1842ms | 2397ms | Variasi source/query; bukan target fix |
| `Phase2 firstToken` | 3952ms | 4443ms | Compose TTFT belum dioptimasi |
| `Phase2 composeTotal` | 11250ms | 11269ms | Praktis sama; refactor tidak mengubah compose |
| `onFinish(DB writes)` | 607ms / 1060ms | 706ms | Masih blocking, sesuai safe baseline |
| `Exact source persist total` | 3275ms / 4393ms | 3175ms | Nilai mirip, tapi statusnya berubah: blocking → detached |
| `RAG ingest total` | 15842ms / 30033ms | 15776ms | Tetap background, bukan blocker finish |
| `POST /api/chat` | 51s | 52s | Metrik Next.js total request tidak ideal untuk menilai fix finish-path |
| `EXECUTE SETTLE` | tidak ada log | 40905ms | Bukti baru kapan stream bisa close |
| `DETACHED ALL DONE` | tidak ada log | 59850ms | Bukti baru bahwa persist + RAG lanjut setelah settle |

---

## Perubahan Behavioral yang Terbukti

### 1. Exact-source persistence tidak lagi blocking finish

Before:

- `await config.onFinish(...)`
- `await persistExactSourceDocuments(...)`
- baru `finish`

After:

- `await config.onFinish(...)`
- `finish`
- detached `persistExactSourceDocuments(...)`

Ini adalah bukti paling kuat bahwa refactor P1 berhasil.

### 2. Durability message contract tetap terjaga

`config.onFinish(...)` masih blocking sekitar `706ms`.

Artinya:

- assistant message persistence belum dipindah ke eventual consistency
- safe baseline tetap menjaga refresh consistency dan sidebar freshness
- refactor tidak diam-diam bocor ke product tradeoff path

### 3. Detached work benar-benar jalan di luar critical path

Adanya dua log baru ini penting:

- `EXECUTE SETTLE=40905ms`
- `DETACHED ALL DONE total=59850ms`

Interpretasi:

- stream bisa settle di ~40.9s
- exact persist + RAG masih lanjut sampai ~59.8s
- berarti detached path memang terpisah dari execute settle point

---

## Yang Belum Berubah

Refactor ini **tidak** menyelesaikan bottleneck utama total latency end-to-end:

- `searchRouter=2461ms`
- `Phase1 retriever=23493ms`
- `Phase1.5 FetchWeb total=2397ms`
- `Phase2 firstToken=4443ms`

Jadi setelah P1, bottleneck dominan kembali ke:

1. router
2. retriever
3. fetch
4. compose TTFT

bukan lagi ke exact-source persistence di finish path.

---

## Residual Gap yang Masih Wajar

Masih ada residual finish delay dari:

- `onFinish(DB writes)=706ms`

Ini **expected** dan sesuai desain safe baseline.

Kalau tim ingin mengejar sisa gap ini juga, maka harus masuk ke area
`Prioritas 2` / `Task 4B`, yaitu evaluasi detaching `saveAssistantMessage(...)`
dengan tradeoff durability yang eksplisit.

---

## Minor Runtime Notes

- Ada 1 URL fetch gagal:
  `vertexaisearch.cloud.google.com/grounding-api-redirect/...`
  Ini bukan anomali finish path, tapi indikasi kualitas source / redirect
  handling yang masih bisa dibersihkan.

- `POST /api/chat 200 in 52s` masih lebih besar dari `EXECUTE SETTLE=40905ms`.
  Ini belum cukup untuk menyimpulkan bug baru, karena kemungkinan beda titik
  ukur antara timer internal orchestrator dan timer lifecycle Next.js route.

---

## Kesimpulan

Evidence runtime mendukung kesimpulan berikut:

1. Refactor P1 **berhasil** secara arsitektural.
2. `persistExactSourceDocuments(...)` **sudah keluar** dari critical finish path.
3. Safe baseline tetap menjaga durability karena `onFinish(...)` masih synchronous.
4. Total request masih lambat, tapi bottleneck-nya sekarang kembali ke
   search/retriever/fetch/compose, bukan ke exact-source persistence.
