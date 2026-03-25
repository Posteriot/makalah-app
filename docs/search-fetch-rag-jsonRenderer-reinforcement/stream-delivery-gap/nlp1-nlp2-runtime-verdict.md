# NLP-1 + NLP-2 Runtime Verdict

> Tanggal: 2026-03-25
> Scope: verifikasi runtime untuk implementasi `nlp1-nlp2-implementation-plan.md`

---

## Verdict

Implementasi **NLP-1** dan **NLP-2** lolos verifikasi runtime utama.

- **NLP-1 (RAG override ke pre-router): PASS**
- **NLP-2 (paper prompt parallelization): PASS**

Keduanya berjalan sesuai intent desain dan tidak menunjukkan regression
struktural pada jalur orchestrator.

---

## NLP-1 — RAG Override ke Pre-Router

### Skenario 1: follow-up reuse lama

Pada request follow-up yang memakai sumber lama:

- muncul log `Pre-router RAG override: chunks available, search done, no new-search trigger → skip router`
- tidak ada log `searchRouter=...`
- tidak ada `Phase1 retriever=...`
- tidak ada `Phase1.5 FetchWeb...`
- `SearchExecution` menunjukkan `mode=off, searchRequired=false`

Interpretasi:

- router benar-benar di-skip
- websearch pipeline tidak jalan
- behavior sesuai target NLP-1

### Skenario 2: explicit new-search request

Pada follow-up dengan permintaan sumber baru:

- **tidak** muncul `Pre-router RAG override...`
- muncul `searchRouter=2398ms decision=SEARCH intent=search confidence=1`
- muncul `Phase1 retriever=...`
- muncul `Phase1.5 FetchWeb...`

Interpretasi:

- guard `wantsNewSearch` bekerja benar
- NLP-1 tidak over-skip
- explicit request untuk sumber baru tetap jatuh ke router + websearch

### Kesimpulan NLP-1

NLP-1 lolos dua sisi acceptance criteria:

1. reuse lama -> skip router
2. explicit new-search -> router tetap jalan

---

## NLP-2 — Paper Prompt Parallelization

### Evidence of overlap

Sample runtime sehat:

- `paperPrompt.getSession = 513ms`
- `paperPrompt.resolveStageInstructions = 488ms`
- `paperPrompt.listArtifacts = 537ms`
- `paperPrompt.getInvalidatedArtifacts = 668ms`
- `paperPrompt.parallelBatch = 673ms`
- `paperPrompt.total = 1187ms`

Interpretasi:

- `parallelBatch` mendekati query paling lambat, bukan jumlah ketiganya
- `paperPrompt.total` mendekati `getSession + max(three parallel tasks)`
- overlap benar-benar terjadi

Sample lain juga konsisten:

- `parallelBatch = 578ms`
- `paperPrompt.total = 1477ms`

### Catatan

Gain runtime tidak selalu stabil, karena beberapa request masih menunjukkan
spike backend pada `getSession`, `listArtifacts`, atau `getInvalidatedArtifacts`.
Namun ini tidak membatalkan keberhasilan paralelisasi; yang berubah sekarang
adalah bottleneck per request ditentukan oleh query paling lambat, bukan
penjumlahan semua query.

### Kesimpulan NLP-2

NLP-2 lolos acceptance criteria utama:

- `parallelBatch` benar-benar overlap
- `paperPrompt.total` turun signifikan pada request dengan backend sehat

---

## Residual Issues (bukan blocker NLP-1/NLP-2)

- latency retriever masih dominan (`google-grounding` tetap mahal)
- kualitas fetch source masih bervariasi antar request
- beberapa query backend masih spike, terutama pada jalur paper prompt
- finish path residual ~700-850ms dari `onFinish` tetap ada, sesuai safe baseline

---

## Closing

Loop implementasi untuk:

- `NLP-1: RAG override ke pre-router`
- `NLP-2: paper prompt parallelization`

dapat dianggap **selesai dan tervalidasi runtime**.

Prioritas berikutnya sebaiknya kembali ke dokumen:

- `next-latency-priorities.md`
