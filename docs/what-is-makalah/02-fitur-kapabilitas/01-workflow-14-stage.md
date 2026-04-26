# Workflow 14 Stage

Makalah AI menggunakan alur kerja yang terstruktur secara akademik melalui 14 tahapan sistematis. Setiap tahap dirancang untuk memastikan kualitas paper terjaga dari ide awal hingga finalisasi.

## Daftar 14 Tahapan Penulisan

1. **Gagasan Paper**: Penentuan ide kasar dan arah awal riset. (**Search Orchestrator: AKTIF** — Namun pada **turn pertama**, sistem memblokir pencarian otomatis: Agent mendiskusikan ide terlebih dahulu, kemudian menawarkan pencarian via _choice card_. Pencarian baru dijalankan setelah User mengkonfirmasi).
2. **Penentuan Topik**: Pengkhususan topik agar lebih tajam dan fokus.
3. **Menyusun Outline**: Pembuatan struktur kerangka bab dan sub-bab.
4. **Penyusunan Abstrak**: Penulisan ringkasan awal penelitian.
5. **Pendahuluan**: Latar belakang, rumusan masalah, dan tujuan riset.
6. **Tinjauan Literatur**: Pemetaan teori dan referensi terdahulu. (**Search Orchestrator: AKTIF** — Agent secara otomatis melakukan riset mendalam untuk menyusun landasan teori).
7. **Metodologi**: Penjelasan metode riset yang digunakan.
8. **Hasil Penelitian**: Pemaparan data dan temuan riset.
9. **Diskusi**: Analisis mendalam atas hasil penelitian.
10. **Kesimpulan**: Rangkuman akhir dan saran.
11. **Pembaruan Abstrak**: Sinkronisasi abstrak dengan hasil akhir riset.
12. **Daftar Pustaka**: Kompilasi referensi yang digunakan secara otomatis.
13. **Lampiran**: Pengaturan dokumen pendukung (jika ada).
14. **Pemilihan Judul**: Penentuan judul final yang paling representatif.

> **Catatan Teknis**: Pada tahap **Gagasan** dan **Tinjauan Literatur**, _Search Orchestrator_ berstatus **Aktif** — artinya sistem secara aktif mengevaluasi kebutuhan pencarian tiap turn. Namun khusus pada **turn pertama tahap Gagasan**, sistem menerapkan _first-turn guard_: pencarian otomatis diblokir, model mendiskusikan ide dulu dan menawarkan pencarian via _choice card_. Setelah User konfirmasi (atau sudah ada riwayat pencarian/`_plan`), barulah pencarian dijalankan. Pada **12 tahapan lainnya** (Topik hingga Judul), pencarian bersifat **Pasif** — Agent hanya mencari jika User memberikan instruksi eksplisit.

## Mekanisme Transisi

Tiap tahapan tidak berjalan otomatis begitu saja, melainkan melalui siklus interaksi transparan:

- **Drafting & Generasi Artifak**: Agent menyusun draf berdasarkan diskusi dengan User. Setiap draf yang dihasilkan akan memunculkan sebuah **Kartu Artifak (Artifact Indicator)** di dalam area chat.
- **Trigger Panel Kanan**: Dengan mengeklik kartu tersebut, User men-trigger munculnya **Panel Artifak** di sisi kanan layar untuk meninjau draf secara utuh dan mendalam.
- **Munculnya Validation Panel**: Begitu draf di Artifak selesai di-generate, sistem akan memunculkan **Validation Panel** di area chat. Panel ini adalah gerbang kendali User.
- **Persetujuan atau Revisi**: User punya dua opsi mutlak:
    - **Setujui & Lanjutkan (Approved)**: Mengunci draf di Artifak sebagai progres permanen dan membuka akses ke tahap berikutnya secara linear.
    - **Revisi (Revision)**: Menolak draf saat ini dan memberikan feedback. Sistem akan masuk ke mode *Revision*, ditandai dengan pembaruan versi draf di Artifak dan label "Revisi" pada kartu di chat.

Alur ini menjamin kedaulatan User sebagai Pawang. Sistem tidak akan pernah melompati tahapan tanpa *stamping* persetujuan eksplisit dari User.

## Rujukan Kode
- `convex/paperSessions/constants.ts`: Definisi urutan (`STAGE_ORDER`) dan label 14 tahapan resmi, beserta fungsi navigasi (`getNextStage`, `getPreviousStage`, `getStageNumber`, `getStageLabel`, `getStageIdFromLabel`).
- `src/lib/chat-harness/context/resolve-search-decision.ts`: Pipeline penentuan keputusan pencarian, mencakup _first-turn guard_ Gagasan (`isGagasanFirstTurn`), LLM router (`decideWebSearchMode`), dan perhitungan flag downstream (`isSyncRequest`, `isSaveSubmitIntent`, dll.).
- `src/lib/ai/stage-skill-contracts.ts`: Definisi `ACTIVE_SEARCH_STAGES` (`gagasan`, `tinjauan_literatur`) dan `PASSIVE_SEARCH_STAGES` (12 tahap lainnya), serta fungsi `getExpectedSearchPolicy(stage)` yang memetakan tiap stage ke policy-nya.
