# Exploration / Design Decision Checklist

Dokumen ini hanya untuk `P3-P5`. Isinya bukan bugfix langsung, tapi keputusan desain yang perlu dibuktikan dulu sebelum diimplementasikan.

## Scope

- `P3` — `B2` Evaluator-Optimizer
- `P4` — `B4` Parallel Retriever
- `P5` — `B3` Streaming Object UX

## P3 — B2 Evaluator-Optimizer

### Tujuan Eksplorasi

Menentukan apakah quality gate otomatis setelah generation benar-benar memberi value tanpa memperburuk latency, biaya, atau UX.

### Questions

- [ ] Output mana yang paling layak diberi evaluator loop: paper stage draft, citation-heavy answer, atau Refrasa?
- [ ] Rubric evaluasi apa yang bisa dibuat objektif dan stabil?
- [ ] Threshold apa yang cukup ketat tapi tidak bikin regeneration loop berlebihan?
- [ ] Apakah evaluator dijalankan sinkron sebelum user melihat output, atau async sebagai advisory signal?

### Design Checks

- [ ] Definisikan input rubric minimum: struktur, factuality against sources, citation completeness, stage compliance.
- [ ] Tentukan max iteration yang aman.
- [ ] Tentukan apakah evaluator memakai model yang sama atau model terpisah.
- [ ] Analisis dampak ke token cost dan latency.

### Exit Criteria

- [ ] Ada satu use case sempit yang dipilih lebih dulu.
- [ ] Ada rubric draft yang bisa diuji.
- [ ] Ada keputusan apakah feature ini sync, async, atau tidak jadi.

## P4 — B4 Parallel Retriever

### Tujuan Eksplorasi

Menentukan apakah retriever paralel benar-benar memberi net benefit dibanding chain sequential yang sekarang.

### Questions

- [ ] Apakah bottleneck utama search saat ini benar-benar di retriever selection, atau di fetch-content / compose?
- [ ] Berapa kenaikan biaya jika 2-3 retriever dijalankan bersamaan?
- [ ] Bagaimana merge policy sumber dari provider berbeda?
- [ ] Bagaimana dedup source by URL dilakukan lintas retriever?
- [ ] Bagaimana authority weighting diputuskan saat hasil conflict?

### Design Checks

- [ ] Dokumentasikan perilaku chain sequential yang sekarang: priority, first-success, fallback semantics.
- [ ] Definisikan minimal merge contract untuk citations lintas provider.
- [ ] Tentukan apakah paralel berlaku untuk semua query atau hanya query berisiko tinggi.
- [ ] Evaluasi dampak ke telemetry, observability, dan debugging.

### Exit Criteria

- [ ] Ada keputusan eksplisit: tetap sequential, hybrid, atau full parallel.
- [ ] Kalau hybrid/paralel dipilih, ada design doc khusus untuk merge/dedup/cost policy.

## P5 — B3 Streaming Object UX

### Tujuan Eksplorasi

Menentukan apakah progressive structured render benar-benar membantu flow Makalah, bukan sekadar demo pattern.

### Questions

- [ ] Use case mana yang paling cocok untuk streaming object: outline, literature matrix, reviewer summary, atau planner card?
- [ ] Apakah `json-renderer` yang sekarang sudah cukup, atau perlu object streaming baru?
- [ ] Apakah user butuh progressive reveal, atau hasil final saja cukup?

### Design Checks

- [ ] Cari satu UI target yang sudah structured dan sering terasa lambat atau abrupt.
- [ ] Evaluasi apakah shape data cocok untuk `streamText` + `Output.object()` (AI SDK v6 — `streamObject` sudah removed).
- [ ] Pastikan progressive object tidak bentrok dengan existing `json-renderer` contract.

### Exit Criteria

- [ ] Ada satu kandidat use case yang jelas.
- [ ] Ada keputusan implementasi kecil atau drop.

## Rule of Engagement

- Jangan mulai implementasi `P3-P5` sebelum `P0-P2` selesai atau ditunda secara sadar.
- Semua item di dokumen ini butuh keputusan desain atau evidence tambahan sebelum coding.
- Kalau hasil eksplorasi menunjukkan value rendah, close item tanpa implementasi.
