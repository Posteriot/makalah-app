# stream-delivery-gap — Router Fast-Path Cross-Mode Design

> Tanggal: 2026-03-25
> Scope: optimasi latency `searchRouter` lintas mode orchestrator
> Target: `src/app/api/chat/route.ts`

---

## Tujuan

Mengurangi latency `searchRouter` sekitar `~2-3s` per request dengan
menambahkan deterministic fast-path **sebelum** `decideWebSearchMode(...)`
dijalankan.

Desain ini berlaku untuk semua jalur orchestrator `search -> fetch -> RAG`,
bukan hanya paper mode `gagasan`.

Prinsip utamanya:

- skip LLM router hanya untuk kasus yang secara struktur sudah jelas
- pertahankan LLM router untuk kasus ambigu
- jangan ubah kontrak mode yang sudah dibangun oleh guardrails sekarang

---

## Kondisi Saat Ini

Di [route.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/app/api/chat/route.ts#L1940), router sekarang punya:

- pre-router deterministic guardrails yang masih sempit
- lalu fallback ke `decideWebSearchMode(...)`
- lalu post-router overrides (`sync_request`, `compile_daftar_pustaka`, `save_submit`, `rag_chunks_available`)

Fast-path yang sudah ada sekarang hanya:

1. `forcePaperToolsMode && !hasExplicitSearchIntent` -> `NO-SEARCH`
2. `forcePaperToolsMode && hasExplicitSearchIntent` -> `SEARCH`
3. `!paperModePrompt && userMessageCount <= 1 && !searchAlreadyDone` -> `SEARCH`

Akibatnya, banyak kasus yang sebenarnya deterministic masih tetap masuk
LLM router dan membayar `~2.5s`.

---

## Constraint dari Kode Sekarang

Desain fast-path harus hormat ke constraint ini:

1. **Jangan menabrak stage policy paper mode**
   `stagePolicy` tetap authoritative untuk `active | passive | none`.

2. **Jangan menabrak exact-source / RAG reuse**
   Kalau `searchAlreadyDone && ragChunksAvailable`, dan user tidak meminta
   sumber baru, idealnya `NO-SEARCH`.

3. **Jangan menabrak intent tool-only**
   `sync_request`, `compile_daftar_pustaka`, dan `save_submit` harus tetap
   `NO-SEARCH`.

4. **Jangan membuat false negative untuk factual search**
   Kalau intent jelas meminta data faktual / referensi baru, fast-path harus
   berani langsung `SEARCH`.

5. **Ambiguous cases tetap masuk LLM router**
   Fast-path bukan pengganti router total. Ia hanya memangkas kasus yang
   sudah jelas dari struktur state + regex intent.

---

## Desain Arsitektur

Tambahkan satu layer baru sebelum `decideWebSearchMode(...)`:

```ts
const fastPathDecision = resolveDeterministicSearchFastPath({
  isPaperMode: !!paperModePrompt,
  forcePaperToolsMode,
  userMessageCount,
  hasExplicitSearchIntent,
  normalizedLastUserContentLower,
  stagePolicy,
  currentStage,
  searchAlreadyDone,
  ragChunksAvailable,
  researchStatus: { incomplete, requirement },
})

if (fastPathDecision) {
  // pakai hasil deterministic, skip decideWebSearchMode()
} else {
  // fallback ke LLM router yang sekarang
}
```

Return type yang disarankan:

```ts
type DeterministicSearchDecision = {
  enableWebSearch: boolean
  reason: string
  intentType: "search" | "discussion" | "sync_request" | "compile_daftar_pustaka" | "save_submit"
  source: "fast_path"
}
```

Kalau hasil `null`, baru masuk `decideWebSearchMode(...)`.

---

## Rule Set yang Disarankan

Urutan rule penting. Rule yang lebih tegas harus jalan lebih dulu.

### Rule 1 — Force paper tools mode

Gunakan rule yang sudah ada:

- `forcePaperToolsMode && !hasExplicitSearchIntent` -> `NO-SEARCH`
- `forcePaperToolsMode && hasExplicitSearchIntent` -> `SEARCH`

Ini sudah deterministic dan valid.

### Rule 2 — Tool-only intent lintas paper mode

Tambahkan regex deterministic untuk intent yang sekarang baru ditangani
post-router:

- `sync_request`
- `compile_daftar_pustaka`
- `save_submit`

Contoh pattern:

```ts
const isSyncIntent = /\b(sinkronkan|sinkronisasi|cek state|status sesi|status terbaru|lanjut dari state|state terbaru)\b/i.test(msg)
const isCompileBibliographyIntent = /\b(compile daftar pustaka|susun daftar pustaka|preview daftar pustaka|buat daftar pustaka)\b/i.test(msg)
const isSaveSubmitIntent = /\b(simpan|submit|kirim tahap|ajukan tahap|approve|setujui|selesaikan tahap|lanjut ke tahap berikutnya)\b/i.test(msg)
```

Keputusan:

- kalau match -> `NO-SEARCH`
- isi `intentType` sesuai intent

Kenapa defensible:

- prompt router di [route.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/app/api/chat/route.ts#L1089) sendiri sudah bilang intent-intent ini harus `enableWebSearch=false`
- jadi regex deterministic di depan tidak mengubah policy, hanya memotong latency

### Rule 3 — First message chat mode

Pertahankan rule yang sudah ada:

- `!paperModePrompt && userMessageCount <= 1 && !searchAlreadyDone` -> `SEARCH`

Ini sudah proven dan aman.

### Rule 4 — Exact-source / RAG reuse

Pindahkan override yang sekarang ada **sesudah** router menjadi fast-path
di **sebelum** router:

Jika:

- `searchAlreadyDone === true`
- `ragChunksAvailable === true`
- tidak ada explicit new-search trigger

maka:

- `NO-SEARCH`
- `reason = "rag_chunks_available_fast_path"`
- `intentType = "discussion"`

Pola trigger `new search` bisa reuse regex yang sudah ada sekarang:

```ts
const wantsNewSearch = /\b(cari\s+(lagi|lebih|baru|tentang)|tambah\s+sumber|search\s+(again|for|more)|referensi\s+(baru|tambahan)|sumber\s+(baru|lain))\b/i.test(msg)
```

Kenapa ini penting:

- saat ini request semacam "jelaskan lagi sumber tadi" masih bisa bayar
  LLM router dulu baru di-override ke `NO-SEARCH`
- itu latency mubazir

### Rule 5 — Stage policy `none`

Jika:

- `paperModePrompt === true`
- `stagePolicy === "none"`

maka:

- `NO-SEARCH`

Ini sudah implicit di jalur sesudah router sekarang, tapi layak dipindah
lebih awal karena deterministic.

### Rule 6 — Active paper stage research incomplete + no previous search

Jika:

- `paperModePrompt === true`
- `stagePolicy === "active"`
- `researchStatus.incomplete === true`
- `searchAlreadyDone === false`

maka:

- `SEARCH`
- `reason = "research_incomplete_fast_path"`
- `intentType = "search"`

Kenapa ini defensible:

- helper `isStageResearchIncomplete(...)` di
  [paper-search-helpers.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/paper-search-helpers.ts#L53)
  sudah deterministic
- prompt router sendiri bilang research incomplete + no previous search
  harus strongly prefer search

Catatan:

- ini bukan hanya `gagasan`
- ini berlaku ke semua stage yang ada di
  `STAGE_RESEARCH_REQUIREMENTS`

### Rule 7 — Explicit search intent kuat lintas mode

Kalau user secara eksplisit meminta:

- cari referensi
- cari sumber
- search literature
- tambahkan sumber baru

maka:

- langsung `SEARCH`

Kecuali kalau lebih dulu match Rule 2 (`sync_request`, `compile`, `save_submit`).

Ini membuat intent priority tetap sama seperti router prompt:

`sync_request > compile_daftar_pustaka > save_submit > search > discussion`

---

## Rule yang Sengaja TIDAK Dibuat Deterministic

Beberapa hal tetap sebaiknya lewat LLM router:

### 1. Discussion vs search pada pertanyaan faktual yang implisit

Contoh:

- user tanya opini bercampur fakta
- user minta evaluasi tanpa eksplisit bilang "cari"
- query ambigu apakah butuh sumber baru atau cukup RAG lama

Ini tetap biarkan ke `decideWebSearchMode(...)`.

### 2. Passive paper stage tanpa explicit search intent

Di stage policy `passive`, keputusan sering bergantung pada konteks percakapan,
bukan hanya regex. Jangan terlalu agresif memaksa `SEARCH`.

### 3. Query chat mode non-first-turn yang samar

Kalau bukan first message dan bukan explicit search intent, sebaiknya router
tetap menangani agar false positive search tidak meledak.

---

## Prioritas Implementasi

Implement bertahap, dari yang paling aman.

### Batch A — Aman dan paling bernilai

1. Force paper tools mode
2. Tool-only intent (`sync_request`, `compile_daftar_pustaka`, `save_submit`)
3. First message chat mode
4. RAG reuse / no-new-search trigger

Ini paling kecil risiko dan langsung memotong latency router untuk kasus
yang sudah jelas.

### Batch B — Masih aman, tapi perlu review lebih ketat

5. `stagePolicy === "none"` -> `NO-SEARCH`
6. `research incomplete + no previous search` -> `SEARCH`
7. explicit strong search intent -> `SEARCH`

Ini tetap defensible, tapi perlu cek coverage regex dan policy interaction.

---

## Rekomendasi Penempatan Kode

Buat helper baru, misalnya:

- `src/lib/ai/search-router-fast-path.ts`

Isi helper:

- parser deterministic intent
- evaluator rule ordering
- return `DeterministicSearchDecision | null`

Di `route.ts`, pakai alurnya:

1. hitung semua state yang memang sudah ada sekarang
2. panggil fast-path helper
3. kalau ada hasil -> pakai dan skip `decideWebSearchMode(...)`
4. kalau tidak ada hasil -> fallback ke router yang sekarang

Kenapa helper terpisah:

- bisa dites unit
- lebih gampang diaudit
- tidak menambah kompleksitas liar di `route.ts`

---

## Logging yang Disarankan

Tambahkan log khusus agar hemat latency bisa dibuktikan:

```ts
console.log(
  `[SearchDecision] Fast path: reason=${decision.reason} intent=${decision.intentType} enableWebSearch=${decision.enableWebSearch}`
)
```

Dan bedakan dari router:

- `Fast path` = deterministic
- `Unified router` = LLM path

Dengan begitu, metrik berikut bisa diukur:

- berapa persen request lolos fast-path
- berapa latency router yang berhasil dihemat
- rule mana paling sering aktif

---

## Acceptance Criteria

### Functional

- request yang match rule deterministic tidak lagi memanggil `decideWebSearchMode(...)`
- hasil `enableWebSearch` tetap sama dengan policy yang diharapkan
- exact-source / RAG reuse tidak memicu web search baru tanpa explicit trigger
- tool-only intent tidak masuk web search

### Latency

- `searchRouter` tidak muncul pada request fast-path, atau muncul `0ms` / skipped
- median latency request fast-path turun `~2s+` dibanding sebelumnya

### Safety

- tidak ada peningkatan false positive `SEARCH` di stage passive
- tidak ada peningkatan false negative untuk explicit search intent
- paper workflow note (`activeStageSearchNote`) tetap konsisten dengan keputusan final

---

## Risiko

### Risiko 1 — Regex terlalu agresif

Kalau pattern intent terlalu luas, request diskusi biasa bisa salah masuk
tool-only atau search path.

Mitigasi:

- mulai dari pattern sempit
- audit log rule hit rate
- tambah unit tests per intent class

### Risiko 2 — Double source of truth

Kalau fast-path dan router prompt divergen, perilaku jadi susah diprediksi.

Mitigasi:

- fast-path hanya untuk kasus yang router prompt sendiri sudah anggap
  deterministic
- jangan pindahkan kasus ambigu ke deterministic layer

### Risiko 3 — Override logic jadi pecah

Sekarang ada rule post-router seperti RAG override. Kalau fast-path baru
ditambah tanpa konsolidasi, rule bisa dobel.

Mitigasi:

- pindahkan rule deterministic ke satu helper tunggal
- post-router override yang sama dihapus atau dijadikan fallback assertion

---

## Recommendation

Rekomendasi terbaik untuk langkah berikutnya:

1. implement `search-router-fast-path.ts`
2. mulai dari **Batch A** dulu
3. ukur hit rate + latency reduction
4. baru tambah **Batch B** jika hasil Batch A aman

Ini adalah optimasi latency yang paling defensible sekarang karena:

- berlaku lintas mode orchestrator
- impact tinggi
- risiko lebih rendah daripada mengubah retriever atau partial-source architecture
