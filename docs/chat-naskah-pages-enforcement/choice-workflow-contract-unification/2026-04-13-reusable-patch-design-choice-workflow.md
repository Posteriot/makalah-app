# Reusable Patch Design: Unified Choice Workflow Contract for Durable Artifact Lifecycle

## Tujuan

Mendesain patch reusable yang menyelesaikan akar masalah `choice -> post-choice runtime -> artifact lifecycle -> validation` secara permanen.

Target utamanya:

1. menghapus split-brain antara prose model, event choice, dan resolver backend
2. mengganti kontrak choice card yang terlalu longgar dengan typed workflow contract
3. memusatkan special-case stage ke workflow registry yang sama
4. membuat prompt source aktif, fallback prompt code, dan runtime enforcement berbicara dalam kontrak yang sama
5. membuat outcome handling corrective, bukan destruktif

Patch ini bukan patch kosmetik. Ini redesign kontrak lintas-layer yang harus bisa diimplementasikan tanpa meninggalkan blind spot.

## Prinsip Desain

1. Source of truth workflow tidak boleh bergantung pada satu field longgar yang dibangkitkan model.
2. Semantik workflow harus hidup di typed contract, bukan hanya di prose prompt.
3. Resolver runtime harus menjadi satu-satunya tempat yang memutuskan action akhir.
4. Special-case stage harus diturunkan dari registry yang sama, bukan cabang imperatif yang tersebar.
5. Prompt aktif di DB dan fallback prompt code harus sinkron terhadap kontrak runtime yang sama.
6. Guard harus action-aware, bukan sekadar artifact-aware.
7. Deploy dev dan deploy prod adalah tahap akhir verifikasi, bukan bagian dari asumsi desain.

## Diagnosis Arsitektural Saat Ini

### Choice Contract Saat Ini Terlalu Sempit

Choice card saat ini pada praktiknya hanya membawa:

- option selection
- `customText`
- `decisionMode: exploration | commit`

Masalah:

- terlalu abstrak
- tidak mendeskripsikan next action runtime secara eksplisit
- tidak typed end-to-end sebagai workflow contract
- mudah tidak sinkron dengan prose assistant

### Runtime Rule Saat Ini Belum Dipusatkan

Keputusan finalize saat ini tersebar di:

- frontend extraction dari card shell
- event builder
- `shouldFinalizeAfterChoice`
- `buildChoiceContextNote`
- route observability
- server-owned fallback untuk stage tertentu
- outcome guard

Masalahnya bukan cuma "resolver salah". Masalahnya rule hidup di terlalu banyak tempat.

### Prompt Source of Truth Masih Ganda

Instruksi aktif sekarang datang dari:

1. active stage skills di Convex DB dev/prod
2. fallback prompt code di repo
3. choice YAML prompt
4. global paper mode prompt
5. migration/seed script untuk stage skills

Kalau kontrak baru hanya diubah di satu domain, split-brain tetap hidup.

## Desain Patch yang Diusulkan

### Patch 1: Ganti Kontrak Metadata Card Menjadi Typed Workflow Contract

Tambahkan metadata eksplisit pada `ChoiceCardShell`:

- `workflowAction: continue_discussion | finalize_stage | compile_then_finalize | special_finalize | validation_ready`

Opsional tambahan untuk kebutuhan observability dan compatibility:

- `workflowClass: discussion_choice | choice_finalize | compile_finalize | special_finalize`
- `decisionMode` tetap boleh ada, tetapi turun derajat menjadi hint UI/analytics/compatibility

Makna field utama:

- `continue_discussion`
  - pilihan mempersempit arah, tetapi belum boleh memulai artifact lifecycle
- `finalize_stage`
  - pilihan adalah commit point; backend wajib menjalankan tool chain penuh
- `compile_then_finalize`
  - stage butuh compile server-side dulu sebelum artifact finalization
- `special_finalize`
  - stage finalize dengan deterministic branch yang tetap hidup dalam registry utama
- `validation_ready`
  - user memilih opsi canonical validation-ready jika memang masih didukung kontrak UI sekarang

Rekomendasi terbaik:

- gunakan `workflowAction` sebagai source of truth runtime
- pertahankan `decisionMode` hanya untuk backward compatibility selama migrasi

Alasannya sederhana: `workflowAction` mendeskripsikan next action runtime, sedangkan `decisionMode` hanya mendeskripsikan nuansa keputusan.

### Patch 2: Turunkan Kontrak Baru ke Typed Schema, Catalog, Component, dan Event

Ini wajib. Tidak cukup menambah instruksi di prompt.

Layer yang harus berubah bersama:

- `choice-payload.ts`
- `choice-catalog.ts`
- `ChoiceCardShell` props
- frontend submit extraction
- `buildChoiceInteractionEvent`
- parser/validator event submit
- test schema dan test compile spec

Event choice submit yang baru minimal harus membawa:

- `selectedOptionIds`
- `customText`
- `workflowAction`
- `decisionMode` opsional untuk compatibility

Kalau contract baru tidak hidup di typed schema dan event, frontend akan tetap parsing raw spec secara opportunistic dan itu mengulang masalah lama.

### Patch 3: Buat Resolver Tunggal `resolveChoiceWorkflow`

Ganti helper lama yang hanya menjawab `finalize: boolean` dengan resolver tunggal yang mengembalikan struktur eksplisit, misalnya:

- `action`
- `workflowClass`
- `toolStrategy`
- `prosePolicy`
- `fallbackPolicy`
- `reason`
- `contractVersion`

Input resolver:

- `stage`
- `workflowAction`
- `decisionMode`
- `stageData`
- `hasExistingArtifact`
- `stageStatus`

Prioritas resolver:

1. `workflowAction` dari contract baru
2. deterministic stage registry rule
3. compatibility bridge dari contract lama
4. heuristic lama hanya sebagai fallback terbawah

Rekomendasi terbaik:

- helper lama `shouldFinalizeAfterChoice` tidak dipakai lagi sebagai pusat keputusan
- ia bisa diubah menjadi compatibility wrapper sementara, lalu dihapus setelah migrasi penuh

### Patch 4: Pusatkan Stage Behavior ke Workflow Registry

Alih-alih banyak cabang khusus tersebar, buat registry yang memetakan setiap stage ke workflow class dan special executor yang eksplisit.

Contoh pengelompokan yang durable:

- `discussion_choice`
  - `gagasan`
- `choice_finalize`
  - `topik`, `outline`, `abstrak`, `pendahuluan`, `tinjauan_literatur`, `metodologi`, `hasil`
- `direct_finalize`
  - `diskusi`, `kesimpulan`, `pembaruan_abstrak`
- `compile_finalize`
  - `daftar_pustaka`
- `special_finalize`
  - `lampiran`, `judul`

Setiap class mendefinisikan:

- apakah choice dibutuhkan
- action yang diizinkan
- tool chain wajib
- prose policy
- output guard policy
- fallback policy

Stage khusus lalu boleh menambahkan adapter kecil, tetapi tetap hidup di registry yang sama.

### Patch 5: Jadikan Note Builder dan Tool Enforcement Berbasis Resolved Workflow

`buildChoiceContextNote` saat ini campuran antara generic path dan special-case path. Itu harus diubah menjadi projector dari hasil resolver.

Artinya:

- note tidak lagi memutuskan sendiri jalur workflow
- note hanya menerjemahkan resolved workflow menjadi runtime instruction
- route, tool enforcer, dan observability membaca objek resolved yang sama

Dengan begitu:

- `hasil`
- `judul`
- `lampiran`
- `daftar_pustaka`

tidak lagi menjadi kumpulan if-else liar yang berdiri sendiri.

### Patch 6: Exploration Path Harus Punya Prose Contract yang Keras

Untuk `continue_discussion`, kontrak prose harus eksplisit:

- dilarang imply artifact sedang dibuat
- dilarang imply draft final sudah siap
- dilarang imply validation panel relevan di turn itu
- dilarang menulis handoff phrasing yang terdengar final

Respons yang valid untuk exploration hanya boleh:

- merangkum pilihan user
- menjelaskan konsekuensi pilihan
- menajamkan arah
- memicu diskusi lanjutan yang aman

Kalau melanggar:

- sanitize ke exploration-safe response
- log workflow violation
- jangan diam-diam memulai finalization

### Patch 7: Finalize Path Harus Tool-First dan Idempotent

Untuk `finalize_stage`, `compile_then_finalize`, dan `special_finalize`, kontraknya:

1. jalankan tool chain sesuai strategy
2. baru prose penutup singkat

Contoh strategy:

- `finalize_stage`
  - `updateStageData -> createArtifact/updateArtifact -> submitStageForValidation`
- `compile_then_finalize`
  - `compileDaftarPustaka(persist) -> createArtifact/updateArtifact -> submitStageForValidation`
- `special_finalize`
  - executor khusus, tetapi tetap mengembalikan state tracker yang sama

Jika prose final-handoff muncul sebelum tool sukses:

- catat sebagai workflow violation
- sanitize output
- fallback boleh menolong hanya jika registry memang mengizinkan rescue untuk stage itu

### Patch 8: Server-Owned Fallback Harus Diposisikan Ulang Sebagai Workflow Rescue Layer

Fallback untuk `judul` dan `lampiran` sekarang membuktikan bahwa runtime butuh rescue layer. Masalahnya, rescue layer ini belum unified.

Rekomendasi terbaik:

- jangan hapus fallback mentah-mentah
- pindahkan fallback menjadi bagian resmi dari workflow registry
- tentukan secara eksplisit stage mana yang boleh punya deterministic rescue
- gunakan satu struktur return dan satu tracker yang sama dengan path utama

Kalau tidak, fallback akan terus drift dari kontrak utama.

### Patch 9: Outcome Guard Harus Action-Aware

Guard baru minimal harus membedakan:

1. `continue_discussion` + false draft handoff
   - sanitize handoff phrasing
   - pertahankan arah diskusi
   - jangan tambahkan closing artifact/validation

2. `finalize_stage|compile_then_finalize|special_finalize` + recovery leakage
   - buang paragraf recovery/internal failure
   - pertahankan prose sehat
   - tambahkan closing yang cocok dengan status submit

3. finalize action + partial-save stall
   - log violation yang jelas
   - jangan menampilkan klaim palsu ke user

Selain itu:

- primary path dan fallback path harus memakai util guard yang sama
- jangan ada duplikasi logika sanitize di dua jalur yang berbeda

### Patch 10: Prompt Source Harus Dimigrasikan Secara Menyeluruh

Patch durable harus mencakup seluruh source-of-truth prompt berikut:

1. active stage skills yang sudah di-download ke `.references/system-prompt-skills-active/updated-5`
2. fallback prompt code di:
   - `paper-mode-prompt.ts`
   - `paper-stages/*`
   - stage skill resolver footer
   - choice YAML prompt
3. seed/migration file yang dipakai untuk menulis ulang skill aktif

Rekomendasi terbaik:

- anggap `updated-5` sebagai editable mirror dari source-of-truth DB dev
- setelah update selesai, deploy ke dev `wary-ferret-59`
- prod `basic-oriole-337` baru disentuh setelah seluruh branch benar-benar selesai dan tervalidasi

Ini penting karena kontrak prompt yang tidak sinkron adalah salah satu akar masalah, bukan cuma follow-up task opsional.

## Penerapan per Layer

### Layer A: Choice Schema and Catalog

Update:

- `choice-payload.ts`
- `choice-catalog.ts`
- `ChoiceCardShell` props
- parser dan validator terkait

Target:

- `workflowAction` menjadi bagian dari typed props
- event submit bisa membawa field ini tanpa parsing liar

### Layer B: Frontend Submit Flow

Update:

- ekstraksi metadata choice di `ChatWindow`
- event builder `paper.choice.submit`
- test submit flow

Target:

- frontend tetap pasif
- tetapi pasif yang typed, bukan pasif yang opportunistic

### Layer C: Backend Workflow Resolver

Update:

- buat `resolveChoiceWorkflow`
- turunkan semua decision helper, note builder, observability, dan fallback decision dari resolver ini

Target:

- tidak ada lagi banyak sumber keputusan finalize

### Layer D: Note Builder and Tool Enforcement

Update:

- `buildChoiceContextNote`
- commit-point detection
- tool enforcement note

Target:

- note hanya jadi turunan dari resolved workflow
- bukan lagi lokasi keputusan implisit

### Layer E: Stage Registry and Rescue Strategy

Update:

- stage mapping
- special executor
- rescue policy

Target:

- `hasil`, `daftar_pustaka`, `lampiran`, `judul` masuk ke sistem yang sama

### Layer F: Outcome Guard and Observability

Update:

- util sanitize
- persisted path
- stream path
- log reason dan contract version

Target observability minimal:

- resolved action
- workflow class
- contract version
- old-contract fallback digunakan atau tidak
- prose violation type
- rescue triggered atau tidak

### Layer G: Prompt Sources

Update:

- `.references/system-prompt-skills-active/updated-5`
- fallback prompt code
- seed/migration source bila relevan

Target:

- active skill dev, fallback prompt, dan runtime enforcement sinkron

## Dampak per Stage

### `gagasan`

Masalah utama ada di sini.

Kontrak baru harus bisa membedakan:

- narrowing / continue discussion
- final draft commit

Kalau ini gagal dibedakan di typed contract, bug lama akan hidup lagi walau nama field diganti.

### `topik`

Topik memang choice-driven finalize, tetapi tetap tidak boleh bergantung pada `decisionMode` global.

Harus pindah ke `workflowAction: finalize_stage`.

### `outline`, `abstrak`, `pendahuluan`, `tinjauan_literatur`, `metodologi`, `hasil`

Ini termasuk `choice_finalize`.

Semua harus finalize lewat strategy yang sama, dengan pengecualian kecil hanya jika registry bilang demikian.

### `diskusi`, `kesimpulan`, `pembaruan_abstrak`

Ini direct finalize. Kalau choice dipakai, choice hanya boleh memodulasi content direction, bukan mengubah kontrak lifecycle seenaknya.

### `daftar_pustaka`

Harus hidup sebagai `compile_then_finalize`, bukan finalize biasa.

### `lampiran`

`no appendix placeholder` dan path normal harus hidup di `special_finalize` yang sama, bukan if-else liar di route.

### `judul`

Pemilihan title, update/create artifact, dan fallback deterministic harus hidup di strategy yang sama.

## Migrasi Implementasi yang Disarankan

### Tahap 1: Typed Contract Introduction

1. Tambahkan `workflowAction` ke schema, catalog, props, event, dan tests
2. Pertahankan `decisionMode` sementara untuk compatibility
3. Tandai event/card lama sebagai `contractVersion=legacy`

### Tahap 2: Unified Resolver Introduction

1. Implement `resolveChoiceWorkflow`
2. Jadikan resolver ini satu-satunya sumber keputusan runtime
3. Adapt helper lama menjadi wrapper sementara atau hapus bila aman

### Tahap 3: Registry and Rescue Consolidation

1. Pindahkan special-case path ke workflow registry
2. Satukan rescue policy untuk stage yang memang butuh deterministic fallback
3. Hapus keputusan ad hoc yang tidak lagi dipakai

### Tahap 4: Guard Migration

1. Tambah false draft handoff handling untuk `continue_discussion`
2. Tambah recovery leakage sanitize yang action-aware
3. Satukan util sanitize di primary dan fallback path

### Tahap 5: Prompt Source Migration

1. Update active system prompt dan stage skills yang sudah di-download di `updated-5`
2. Update fallback prompt code di repo
3. Update seed/migration file bila itu masih dipakai untuk sinkronisasi active skills

### Tahap 6: Dev Deployment and Verification

1. Deploy prompt/skills ke dev `wary-ferret-59` dengan [deploy-skills-dev.py](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-naskah-pages-enforcement/scripts/deploy-skills-dev.py)
2. Jalankan verifikasi perilaku end-to-end di dev
3. Baru setelah seluruh pekerjaan branch selesai, pertimbangkan deploy prod dengan [deploy-skills-prod.py](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-naskah-pages-enforcement/scripts/deploy-skills-prod.py)

Catatan keras:

- deploy prod bukan bagian dari acceptance desain
- deploy prod hanya boleh dilakukan setelah implementation, regression test, dan audit branch selesai

## Acceptance Criteria

### Functional

1. Jika action = `continue_discussion`, backend tidak boleh memulai artifact lifecycle.
2. Jika action = `continue_discussion`, chat tidak boleh berbunyi seperti final artifact handoff.
3. Jika action = `finalize_stage`, backend wajib mengeksekusi tool chain penuh atau mencatat violation yang eksplisit.
4. Jika action = `compile_then_finalize`, `compileDaftarPustaka(persist)` wajib terjadi sebelum artifact finalization.
5. `judul` dan `lampiran` tetap bekerja, tetapi lewat rescue strategy yang turun dari registry yang sama.

### Contract

1. `workflowAction` hidup di schema, catalog, component props, submit event, parser, dan resolver.
2. `decisionMode` bukan lagi source of truth utama.
3. Active skills dev, fallback prompt code, dan runtime enforcement memakai vocabulary workflow yang sama.

### Observability

Log minimal harus menunjukkan:

- resolved workflow action
- workflow class
- reason
- contract version
- prose violation type
- rescue triggered atau tidak
- sanitization triggered atau tidak

### Regression

1. `gagasan` tidak lagi berhenti di exploration sambil berkata "berikut adalah draf".
2. `outline` dan stage choice-finalize lain tidak lagi kehilangan pengantar sehat akibat guard yang destruktif.
3. `daftar_pustaka`, `lampiran`, dan `judul` tidak memerlukan patch satu per satu di luar registry utama.

## Risiko

1. Migrasi ini menyentuh schema, frontend, route, prompt, dan skill source sekaligus.
2. Compatibility bridge untuk contract lama bisa memperpanjang umur split-brain jika dibiarkan terlalu lama.
3. Special-case fallback yang tidak segera dipusatkan akan terus jadi sumber drift.
4. Deploy prompt ke dev tanpa runtime yang sinkron justru bisa menambah mismatch baru.

## Rekomendasi Eksekusi

Rekomendasi terbaik:

1. setujui dokumen ini sebagai desain dasar
2. tulis implementation plan berbasis `workflow contract unification`, bukan berbasis `tambah field postSubmitAction` saja
3. implement typed contract dan resolver dulu
4. lanjutkan ke registry, guard, dan prompt migration
5. deploy ke dev `wary-ferret-59` setelah code dan prompt sinkron
6. deploy ke prod `basic-oriole-337` hanya setelah seluruh pekerjaan branch selesai dan tervalidasi

Urutan ini terbaik karena memaksa kita menutup akar masalah secara sistemik:

- contract
- resolver
- registry
- guard
- prompt source
- deploy gate

Itu baru durable.
