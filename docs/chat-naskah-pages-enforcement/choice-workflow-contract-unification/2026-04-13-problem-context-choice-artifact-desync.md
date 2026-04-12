# Problem Context: Choice-to-Artifact Desync in Chat + Naskah Workflow

## Ringkasan

Masalah yang berulang di branch `chat-naskah-pages-enforcement` bukan bug copy per stage, tetapi bug kontrak workflow lintas-layer pada alur:

`choice card -> choice submit event -> post-choice runtime resolver -> tool chain -> outcome guard -> persisted chat`

Yang rusak bukan satu komponen tunggal. Yang rusak adalah sinkronisasi antara:

1. metadata choice card yang dibangkitkan model
2. prose assistant yang dibaca user
3. resolver backend yang memutuskan finalize vs exploration
4. tool chain artifact lifecycle
5. guard sanitization dan fallback server-owned
6. source-of-truth prompt aktif dan fallback prompt code

Karena boundary ini longgar, user bisa menerima sinyal finalisasi di chat padahal backend belum memulai artifact lifecycle, atau sebaliknya backend sudah berhasil finalize tetapi chat ditimpa guard secara destruktif.

## Scope Masalah yang Nyata di Runtime

Masalah ini harus dibaca terhadap runtime aktif saat ini, bukan terhadap desain yang dibayangkan:

- choice metadata dikirim dari frontend lewat `paper.choice.submit`
- frontend saat ini mengekstrak `decisionMode` dari `ChoiceCardShell` raw spec
- backend saat ini menghitung finalize decision terutama dari `decisionMode`
- note builder masih bercampur antara generic path dan special-case path
- route masih punya server-owned fallback khusus untuk beberapa stage
- outcome guard masih berbasis `hasArtifactSuccess`, belum berbasis resolved workflow action
- prompt aktif datang dari active stage skills di Convex DB, dengan fallback ke prompt code di repo

Artinya, solusi yang hanya menyentuh satu layer tidak akan durable.

## Gejala yang Terlihat

### Gejala A: False Draft Handoff

Model menulis kalimat seperti:

- "Berikut adalah draf ..."
- "Draf yang akan kita ajukan ..."
- "Silakan review di panel artifact ..."

Tetapi pada backend:

- tidak ada `createArtifact`
- tidak ada `submitStageForValidation`
- turn tetap dianggap exploration atau partial-save

Akibatnya user menerima sinyal palsu bahwa artifact lifecycle sudah dimulai.

### Gejala B: Recovery Leakage Saat Tool Chain Akhirnya Sukses

Model sempat mengeluarkan narasi seperti:

- "Maaf, ada kendala teknis"
- "Saya akan coba lagi"
- "Sekarang sudah saya perbaiki"

Padahal tool chain akhirnya berhasil:

- `createArtifact` atau `updateArtifact` sukses
- `submitStageForValidation` sukses

Akibatnya outcome guard lama menghapus atau mengganti prose sehat, sehingga respons final terasa janggal atau terlalu mekanis.

### Gejala C: Frontend/Backend Perceived Desync

User melihat mismatch antara:

- isi chat yang terdengar final
- artifact panel yang tidak muncul atau muncul belakangan
- validation panel yang tidak konsisten dengan narasi chat

Frontend pada dasarnya hanya merender payload yang diterima. Jadi mismatch ini terutama berasal dari kontrak runtime yang tidak tegas, bukan dari frontend yang "mengarang state".

### Gejala D: Special-Case Branch Works, But Only Locally

Beberapa stage punya fallback atau note khusus, misalnya:

- `hasil`
- `daftar_pustaka`
- `lampiran`
- `judul`

Sebagian bug tertutup untuk stage tertentu, tetapi logika itu tersebar di beberapa cabang imperatif. Hasilnya:

- satu stage tampak aman
- stage lain masih rawan
- regresi mudah muncul saat metadata card atau prompt berubah

Ini ciri patch parsial, bukan kontrak reusable.

## Akar Masalah

### 1. `decisionMode` Menjadi Source of Truth Utama Padahal Terlalu Longgar

Saat user submit choice card, event yang dikirim frontend saat ini hanya membawa sinyal inti:

- pilihan option
- `customText`
- `decisionMode`

`decisionMode` lalu diperlakukan sebagai sinyal utama untuk finalize vs exploration. Ini terlalu rapuh karena:

- hanya dua nilai global
- tidak menjelaskan next action runtime secara eksplisit
- tidak membedakan finalize biasa, compile-then-finalize, special finalize, atau continue discussion
- mudah tidak sinkron dengan prose model

Akibatnya satu field sempit bisa "membajak" seluruh alur runtime.

### 2. Typed Contract Choice Card Belum Menangkap Semantik Workflow

Masalahnya bukan cuma prompt YAML. Typed contract di level schema, catalog, component props, frontend submit builder, dan event parser juga belum membawa semantik workflow yang cukup.

Konsekuensi:

- prompt bisa menulis makna lebih kaya daripada yang disimpan runtime
- frontend terpaksa mengekstrak metadata dari raw spec secara oportunistik
- backend menerima event yang terlalu miskin untuk memutuskan alur secara aman

Selama semantik workflow tidak hidup di typed contract, bug ini akan tetap mudah kembali.

### 3. Resolver dan Note Builder Masih Campuran Antara Generic Rule dan Cabang Khusus

Resolver finalize saat ini menggabungkan:

- `decisionMode`
- maturity heuristic
- static always-finalize stage set
- artifact existence fallback

Sementara note builder juga mencampur:

- validation-ready generic path
- finalize generic path
- special branch untuk `hasil`
- special branch untuk `judul`
- special branch untuk `lampiran`
- compile branch untuk `daftar_pustaka`

Artinya sistem belum punya satu model workflow yang konsisten. Ia masih berupa kombinasi rule + pengecualian.

### 4. Outcome Guard Masih Berbasis Artifact Success, Belum Berbasis Workflow Action

Guard lama sudah lebih baik daripada full replace buta, tetapi prinsipnya masih:

- kalau artifact lifecycle sukses
- dan ada recovery leakage
- sanitize output

Masalahnya:

- guard belum tahu apakah turn itu `continue_discussion` atau `finalize`
- false handoff pada exploration path belum ditangani sebagai first-class workflow violation
- dua jalur stream/onFinish masih mengandung logika mirip yang berisiko drift

Jadi guard saat ini masih symptom handler, belum enforcement layer yang utuh.

### 5. Source-of-Truth Prompt Belum Tunggal di Satu Tempat

Prompt aktif untuk paper workflow sekarang datang dari dua domain yang sama-sama penting:

1. active stage skills di Convex DB
2. fallback prompt code di repo

Selain itu masih ada:

- choice YAML prompt
- paper mode prompt umum
- fallback stage instructions code
- seed/migration script untuk stage skills

Kalau kontrak baru hanya diubah di satu tempat, runtime bisa tetap membaca instruksi lama dari jalur lain. Ini sumber regresi yang sangat nyata.

### 6. Server-Owned Fallback Menunjukkan Bahwa Kontrak Utama Belum Stabil

Adanya fallback khusus untuk `judul` dan `lampiran` menunjukkan sistem sudah terpaksa menambal kegagalan model dengan jalur deterministic di route.

Fallback bukan masalah jika ia bagian dari desain inti. Yang jadi masalah adalah:

- fallback tidak diturunkan dari workflow contract yang sama
- fallback hanya ada untuk sebagian stage
- fallback ada di lebih dari satu jalur eksekusi

Selama fallback tidak dipusatkan, reuse akan tetap lemah.

## Kenapa Ini Fundamental

Masalah ini fundamental karena menyentuh boundary inti antara:

- choice card contract
- frontend submit event
- backend workflow resolver
- tool orchestration
- prompt source aktif dan fallback
- output guard
- server-owned fallback

Ini bukan bug wording. Ini bug state machine lintas-layer yang belum pernah dinormalisasi menjadi kontrak tunggal.

## Tujuan Perbaikan

Perbaikan yang benar harus:

1. memindahkan source of truth dari metadata longgar ke workflow contract yang typed dan eksplisit
2. menjaga sinkronisasi antara intent card, intent runtime, prose, dan tool chain
3. membuat special-case stage hidup di registry/workflow class yang sama, bukan patch per stage
4. membuat prompt source aktif dan fallback code berbicara dengan kontrak yang sama
5. membuat outcome guard action-aware, bukan hanya artifact-aware
6. menyediakan observability yang bisa membedakan:
   - contract lama vs contract baru
   - continue discussion vs finalize
   - prose violation vs tool failure
   - model miss vs fallback rescue

## Non-Goals

Perbaikan ini bukan tentang:

- memperhalus copy per stage tanpa mengubah kontrak runtime
- menambah regex baru sebagai solusi utama
- membuat patch lokal hanya untuk `gagasan` atau `outline`
- memaksa semua choice card menjadi commit point
- menghapus fallback khusus tanpa mengganti dengan workflow registry yang lebih baik

## Pertanyaan Desain yang Wajib Dijawab

1. Kalau `decisionMode` tidak lagi jadi source of truth utama, field typed apa yang menggantikannya?
2. Bagaimana contract baru dibawa dari YAML/card spec sampai event submit tanpa parsing opportunistic?
3. Bagaimana resolver tunggal memodelkan:
   - continue discussion
   - finalize
   - compile then finalize
   - special finalize
   - validation-ready
4. Bagaimana special stage seperti `daftar_pustaka`, `lampiran`, `judul`, dan `hasil` hidup di sistem yang reusable?
5. Bagaimana memastikan prompt aktif di DB dev, fallback prompt code, dan seed/migration script tetap sinkron?
6. Bagaimana observability membuktikan bahwa split-brain benar-benar hilang?

## Kriteria Solusi yang Layak

Solusi dianggap layak jika:

1. `gagasan` tidak lagi bisa menghasilkan prose final handoff saat runtime masih berada pada jalur discussion.
2. `outline` dan stage choice-finalize lain tidak lagi bisa kehilangan pengantar sehat hanya karena recovery leakage nonfatal.
3. `daftar_pustaka`, `lampiran`, `judul`, dan `hasil` tidak lagi bergantung pada logika ad hoc yang terpisah dari kontrak utama.
4. active skills di DB dev, fallback prompt code, choice card contract, dan route runtime memakai model workflow yang sama.
5. contract baru bisa diaudit eksplisit di level:
   - choice schema/catalog/component props
   - frontend submit payload
   - choice interaction event schema
   - backend workflow resolver
   - note builder / tool chain enforcement
   - outcome guard
   - prompt source aktif dan fallback
6. implementation plan bisa ditulis dari dokumen ini tanpa perlu menebak source-of-truth runtime yang sebenarnya.
