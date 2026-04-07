# Handoff: Artifact Regeneration Via Chat for All 14 Stages

Kamu melanjutkan pekerjaan di branch `validation-panel-artifact-consistency`.
Dokumen ini KHUSUS untuk kasus artifact lifecycle saat user melakukan `edit`,
`resend`, `generate ulang`, atau meminta perubahan lewat chat biasa pada stage
yang sudah pernah menghasilkan artifact.

Perlakukan ini sebagai masalah
state machine dan artifact workflow yang harus diselesaikan sebagai pola reusable
untuk SEMUA 14 stage paper:

1. `gagasan`
2. `topik`
3. `outline`
4. `abstrak`
5. `pendahuluan`
6. `tinjauan_literatur`
7. `metodologi`
8. `hasil`
9. `diskusi`
10. `kesimpulan`
11. `pembaruan_abstrak`
12. `daftar_pustaka`
13. `lampiran`
14. `judul`

## Scope:
Kamu harus menyelesaikan masalah apapun yang terjadi fase ini yang disebutkan user, JANGAN PERNAH TOLAK MASALAH, SEBAB LOGIKANYA MASALAH APAPUN YANG MUNCUL ADALAH MASALAH BRANCH WORKTREE.

## 1. Konteks

Branch ini sebelumnya fokus memperbaiki konsistensi `choice card`,
`updateStageData`, `createArtifact` / `updateArtifact`,
`submitStageForValidation`, backend `pending_validation`, dan render
`PaperValidationPanel`.

Sebagian perbaikan itu sudah berhasil. Contoh yang sudah terbukti:

- `outline` first-pass flow sekarang bisa mencapai
  `updateStageData -> createArtifact -> submitStageForValidation`
- backend Convex benar-benar masuk `pending_validation`
- validation panel benar-benar muncul

Tetapi ada masalah baru yang lebih mendasar pada artifact lifecycle:

- ketika artifact lama sudah ada
- lalu user melakukan `edit`, `resend`, atau meminta `generate ulang` lewat
  chat biasa
- sistem sekarang tidak lagi andal membuat versi artifact baru / memperbarui
  artifact yang ada
- terutama ketika stage sedang `pending_validation` atau ketika interaction lama
  masih aktif

Visi produk yang harus dijaga:

- artifact lama boleh menjadi basis revisi
- revisi artifact boleh dimulai lewat dua jalur yang sama-sama sah:
  - tombol `Revisi` di validation panel
  - perintah chat biasa seperti `edit`, `resend`, `generate ulang`, atau
    instruksi koreksi lain yang bermakna regenerasi artifact
- hasil revisi HARUS menjadi artifact dalam versi baru
- versioning artifact HARUS benar-benar berfungsi; versi artifact terbaru harus
  dikenali sistem sebagai artifact aktif yang dipakai dalam proses berikutnya
- setelah artifact versi terbaru jadi, stage harus kembali ke alur validasi yang
  benar

Masalah ini terlihat jelas pada `outline`, tetapi harus diperlakukan sebagai
masalah reusable workflow lintas semua stage, bukan edge case satu stage.

## 2. Scope

Scope sesi baru adalah mendefinisikan, membuktikan, dan memperbaiki workflow
artifact regeneration dan artifact versioning untuk semua stage paper.

Yang termasuk dalam scope:

- artifact versioning sebagai lifecycle resmi, bukan sekadar metadata yang
  terlihat di UI
- entry path revisi lewat chat biasa saat stage sudah punya artifact
- entry path revisi lewat validation panel
- perilaku `edit`, `resend`, `generate ulang`, atau prompt lanjutan yang
  bermakna "buat versi artifact terbaru"
- interaksi antara choice card lama, prompt baru, stage status backend, dan
  tool-calling artifact
- transisi state `drafting`, `pending_validation`, `revision`, dan `approved`
- pemilihan artifact aktif / versi aktif yang dipakai sistem setelah revisi
- sinkronisasi antara prompt contract, tool order, backend mutation, dan
  frontend render/panel

Yang bukan asumsi awal:

- jangan asumsikan validation panel harus menjadi satu-satunya pintu revisi
- jangan asumsikan behavior lama branch ini sudah sesuai visi produk
- jangan asumsikan masalah hanya berada di skill DB atau hanya di prompt

Semua asumsi teknis harus diverifikasi ulang di sesi baru lewat brainstorming,
code reading, dan evidence runtime.

## 3. Masalah

Masalah yang harus diselesaikan:

1. User tidak lagi bisa mengandalkan chat biasa untuk meregenerasi artifact
   setelah artifact sebelumnya sudah ada.

2. Artifact versioning belum berfungsi sesuai visi produk:
   - user seharusnya bisa menghasilkan artifact versi baru
   - versi baru itu seharusnya menjadi artifact aktif yang dipakai sistem
   - behavior saat ini belum cukup jelas, belum konsisten, atau belum berjalan

3. Saat stage berada di `pending_validation`, chat biasa bisa masuk ke alur yang
   salah:
   - interaction lama masih diproses
   - prompt/tool routing mencoba edit atau submit pada state yang tidak valid
   - backend lalu menolak `updateStageData`

4. Jalur revisi belum selalu memaksa urutan tool yang benar:
   - seharusnya `updateStageData -> updateArtifact/createArtifact -> submitStageForValidation`
   - tetapi evidence runtime menunjukkan `submitStageForValidation` bisa terjadi
     terlalu cepat, lalu edit gagal karena stage terkunci lagi

5. Choice card lama / stale interaction tampaknya belum dipensiunkan tegas saat
   stage keluar dari `drafting`.

6. Branch ini cenderung menggeser workflow menjadi terlalu ketat:
   - revisi efektif hanya lewat `PaperValidationPanel`
   - padahal visi produk menginginkan revisi/generate ulang juga bisa dimulai
     dari chat biasa

7. Sistem belum cukup tegas mengenali bahwa artifact versi terbaru harus menjadi
   basis resmi untuk proses berikutnya:
   - validasi berikutnya
   - context stage berikutnya
   - pembacaan artifact berikutnya

8. Pola ini harus diberlakukan lintas semua stage, bukan hanya `outline`:
   - stage yang menggunakan choice-driven commit
   - stage yang lebih direct-to-artifact
   - stage special flow seperti `daftar_pustaka`

## 4. Pertanyaan

Pertanyaan yang harus dijawab di sesi baru:

1. Apakah sistem memang sengaja mengunci revisi agar hanya bisa dimulai dari
   `PaperValidationPanel`, atau itu efek samping perubahan branch ini?

2. Jika user mengetik `edit`, `resend`, atau `generate ulang` saat stage punya
   artifact aktif, alur resmi yang seharusnya terjadi apa?

3. Jika revisi dimulai dari validation panel atau dari chat biasa, apakah
   keduanya harus berujung pada kontrak artifact versioning yang sama?

4. Apakah `pending_validation` saat ini terlalu keras memblokir revisi via chat,
   padahal produk menginginkan chat-triggered regeneration?

5. Apakah stale choice card masih diterima setelah stage bukan `drafting`?
   Jika iya, di layer mana acceptance itu terjadi?

6. Apakah server-side perlu menolak `paper.choice.submit` bila
   `stageStatus !== "drafting"`?

7. Jika revisi via chat diizinkan, state transition apa yang benar:
   - auto request revision
   - atau bypass lock secara langsung
   - atau path lain yang lebih eksplisit

8. Untuk stage yang sudah punya artifact, kapan sistem harus:
   - `updateArtifact`
   - `createArtifact` baru
   - atau membuat versi baru dari artifact yang sama secara lifecycle

9. Apakah artifact versioning saat ini benar-benar tercatat dan dipakai ulang
   oleh sistem, atau hanya tampak ada di UI tanpa berfungsi sebagai source of
   truth?

10. Setelah versi artifact baru dibuat, bagaimana sistem memastikan versi itu
    menjadi artifact aktif yang dipakai untuk proses berikutnya?

11. Apakah urutan tool revisi sekarang salah karena prompt, skill, runtime
   router, atau mutation backend?

12. Bagaimana pola reusable yang benar untuk semua stage:
   - drafting via choice card
   - regenerate via chat biasa
   - regenerate via validation panel
   - pending validation
   - revision
   - resubmit

13. Bagaimana mencegah false claim di chat jika backend menolak edit atau jika
    submit belum sah?

14. Apakah `daftar_pustaka`, `gagasan`, dan stage lain dengan flow unik perlu
    pengecualian terbatas, atau tetap harus ikut satu kontrak artifact
    regeneration yang sama?

15. Bagaimana memastikan kontrak ini berlaku di SEMUA 14 stage, bukan hanya
    stage yang sedang diuji saat itu?

16. Apa bukti runtime minimum yang harus dikumpulkan agar bisa mengklaim masalah
    ini selesai untuk semua stage?

## 5. Files dan Codes Terkait

Daftar ini adalah proyeksi awal berdasarkan evidence sesi ini. Di sesi baru
semua item harus diverifikasi ulang lewat brainstorming dan pembacaan kode
aktual sebelum implementasi.

### Core state machine dan backend

- `convex/paperSessions.ts`
  - guard `updateStageData` terhadap `pending_validation`
  - `submitForValidation`
  - `requestRevision`
  - artifact/version selection setelah revisi
  - kemungkinan transisi state yang relevan untuk chat-triggered revision

- `convex/schema.ts`
- `convex/paperSessions/types.ts`
- `convex/paperSessions/stageDataWhitelist.ts`

### Prompt, routing, dan tool orchestration

- `src/app/api/chat/route.ts`
  - tool `createArtifact`
  - tool `updateArtifact`
  - tool `submitStageForValidation`
  - outcome-gated cleanup
  - stage-aware routing / fallback
  - jalur revision dan pending state handling

- `src/lib/chat/choice-request.ts`
  - acceptance dan context note untuk choice interaction
  - `POST_CHOICE_FINALIZE_STAGES`
  - kandidat utama untuk stale-choice guard

- `src/lib/ai/paper-mode-prompt.ts`
  - revision note
  - pending state note
  - sync contract

- `src/lib/ai/paper-tools.ts`

### Stage instructions dan skill path

- `src/lib/ai/stage-skill-resolver.ts`
- `src/lib/ai/stage-skill-validator.ts`
- `src/lib/ai/paper-stages/foundation.ts`
- `src/lib/ai/paper-stages/core.ts`
- `src/lib/ai/paper-stages/results.ts`
- `src/lib/ai/paper-stages/finalization.ts`

### Frontend render dan user entry points

- `src/components/chat/ChatWindow.tsx`
  - request revision action
  - optimistic pending validation
  - render `PaperValidationPanel`
  - perilaku saat user mengirim prompt lanjutan atau klik message lama

- `src/components/paper/PaperValidationPanel.tsx`
  - jalur masuk revisi via tombol panel

### Existing docs dan evidence

- `docs/validation-panel-artifact-consistency/HANDOFF-REPORT.md`
- `docs/validation-panel-artifact-consistency/HANDOFF-NEXT-SESSION.md`
- screenshot paths yang dikumpulkan user untuk kasus `outline`

### Area test yang kemungkinan relevan

- `convex/paperSessions.test.ts`
- `src/lib/chat/__tests__/choice-request.test.ts`
- test lain yang perlu ditambah untuk state machine chat-triggered revision

## 6. Goals

Tujuan sesi baru:

1. Menentukan kontrak produk yang jelas untuk artifact regeneration via chat
   biasa maupun revisi di validation panel, dan memastikan kontrak itu berlaku
   di semua stage.

2. Mengembalikan capability yang diinginkan:
   - artifact lama bisa direvisi / digenerate ulang lewat chat dalam versi baru
   - artifact lama juga bisa direvisi lewat validation panel dalam versi baru
   - hasil terbaru menjadi artifact yang sah untuk stage tersebut
   - versi artifact terbaru itulah yang dipakai sistem sebagai basis proses
     berikutnya
   - validation panel tetap sinkron terhadap hasil terbaru

3. Menutup bug state-machine:
   - stale choice card tidak boleh memicu flow yang salah
   - chat-triggered revision harus masuk ke state yang benar sebelum edit
   - panel-triggered revision harus berujung pada kontrak versioning yang sama
   - submit tidak boleh terjadi sebelum edit artifact selesai

4. Menyamakan pola reusable lintas semua stage, dengan pengecualian hanya jika
   benar-benar dibuktikan perlu.
   Ini harus diperlakukan sebagai mandatory default, bukan nice-to-have.

5. Menghasilkan evidence end-to-end yang cukup untuk menyatakan masalah selesai:
   - log tool chain
   - state backend
   - UI artifact
   - validation panel
   - tidak ada false claim

6. Menjaga agar solusi baru tidak merusak perbaikan yang sudah ada untuk:
   - choice card sebagai bahasa visual model
   - artifact lifecycle normal
   - validation panel rendering
   - revision flow yang sudah berhasil pada path tertentu

## Catatan Eksekusi

Di sesi baru, mulai dengan brainstorming dan audit workflow dulu. Jangan langsung
implementasi sebelum kontrak perilaku final dipilih dan dibuktikan dari kode yang
ada.

Jangan framing masalah ini sebagai "bug outline". Framing yang benar adalah:

- branch ini kemungkinan mematahkan workflow artifact regeneration via chat
- branch ini juga belum menegakkan artifact versioning sebagai source of truth
  aktif setelah revisi
- gejalanya terlihat di `outline`
- tetapi solusi harus reusable dan berlaku untuk semua stage paper
- perintah ini harus diperlakukan tegas: pola artifact regeneration/versioning
  yang dipilih di sesi baru WAJIB diproyeksikan untuk semua stage, lalu
  diverifikasi stage-by-stage
