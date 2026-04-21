# Inventaris Masalah Problem 2: Tool Calls Tampil Sebagai Teks

Tanggal investigasi: 2026-04-21  
Scope: `screenshots/test-reasoning/problem-2` dan jalur kode choice workflow, paper stage prompt, runtime enforcer, streaming, serta verification.

## Ringkasan

Masalah utama bukan Convex gagal menyimpan data dan bukan UI salah membaca tool event. Pada request problematik `chat-1776769478285-hoowptno`, model tidak memanggil tool sama sekali (`tools=[none]`, `artifactToolCount=0`), tetapi menulis pseudo-tool-call sebagai teks biasa di chat. Root cause paling kuat adalah ketidaksinkronan kontrak antara plan/stage instruction `abstrak`, metadata choice card, dan runtime enforcer: stage `abstrak` mengharuskan artifact-first setelah user memilih fokus, tetapi choice submit membawa `workflowAction=continue_discussion`, sehingga runtime mematikan artifact tool chain.

## Fakta Dari Bukti Problem 2

### User-visible symptom

User melihat konten berikut tampil mentah di chat:

- `abstract: |` diikuti isi abstrak penuh.
- `call: updateStageData` dengan `args` dan `data`.
- `call: createArtifact` dengan `type`, `title`, `content`, dan `sources`.
- Metadata source seperti `verificationStatus`, `fetchedContentAvailable`, `documentKind`, dan `formatVerifiable`.
- `call: submitStageForValidation` dengan `args: {}`.

Bukti:

- `artifact-issue.md:5-7`
- `artifact-issue.md:35-39`
- Screenshot `Screen Shot 2026-04-21 at 18.10.03.png` sampai `18.10.27.png`

### Tool benar-benar tidak dipanggil

Log request problematik:

- `teminal-nexjs-log.txt:221` menunjukkan `step_start ... activeTools=all`.
- `teminal-nexjs-log.txt:235` menunjukkan `step_finish finishReason=stop tools=[none]`.
- `teminal-nexjs-log.txt:236-239` menunjukkan ribuan karakter berjalan sebagai text chunks.
- `teminal-nexjs-log.txt:244` menunjukkan `verdict=no_artifact artifactToolCount=0`.
- `terminal-convex.txt:19` hanya mencatat `paperSessions:updatePlan`, tidak ada `updateStageData`, `createArtifact`, atau `submitStageForValidation`.

Kesimpulan: tools tersedia, tetapi model memilih berhenti tanpa tool call. Runtime tidak punya tool event untuk dieksekusi.

### Request tetap sukses secara HTTP

- `teminal-nexjs-log.txt:246` menunjukkan `POST /api/chat 200`.
- Jadi ini bukan crash request utama.

### Auth timeout bukan penyebab langsung

Ada gangguan auth:

- `teminal-nexjs-log.txt:34-50` berisi `GET /api/auth/get-session 500` dengan `ETIMEDOUT`.
- `console-web.txt.log:152` juga mencatat `/api/auth/get-session` 500.

Tapi setelah itu request chat tetap berjalan, paper session resolve, stage prompt resolve, dan tools aktif. Jadi auth timeout adalah noise/risk lingkungan, bukan bukti root cause langsung.

## Root Cause Utama

### 1. Choice submit diklasifikasikan sebagai `continue_discussion`

Pada request problematik:

- `teminal-nexjs-log.txt:150` mencatat event choice submit untuk stage `abstrak` dengan selected option `fokus-masalah-solusi`.
- `teminal-nexjs-log.txt:175` mencatat `[CHOICE][exploration-loop] stage=abstrak action=continue_discussion`.
- `teminal-nexjs-log.txt:176-186` mencatat `resolvedAction: 'continue_discussion'`, `workflowClass: 'discussion_choice'`, dan `hasCurrentArtifact: false`.

Jalur kode:

- `src/lib/chat-harness/entry/validate-choice-interaction.ts:178-209` resolve workflow dari `workflowAction` event.
- `src/lib/chat/choice-workflow-registry.ts:89-95` mendefinisikan stage `abstrak` default-nya `finalize_stage`, tetapi masih mengizinkan `continue_discussion`.
- `src/lib/chat/choice-workflow-registry.ts:345-363` membuat `workflowAction` dari event menjadi source of truth. Kalau event membawa `continue_discussion`, resolver mengembalikan `toolStrategy: "none"`.

Dampak: server percaya metadata choice card, bukan plan atau stage instruction.

### 2. Jalur `continue_discussion` mematikan artifact lifecycle

`buildChoiceContextNote` untuk `continue_discussion` menyuntik instruksi:

- `src/lib/chat/choice-request.ts:329-338`
- Isi penting: `Do NOT start artifact lifecycle (no createArtifact, no updateArtifact, no submitStageForValidation).`

Ini langsung bertentangan dengan kebutuhan stage `abstrak` setelah user memilih fokus.

### 3. Artifact enforcer tidak aktif

Runtime enforcer yang seharusnya memaksa urutan tool:

- `updateStageData`
- `createArtifact` atau `updateArtifact`
- `submitStageForValidation`

berada di:

- `src/lib/chat-harness/policy/enforcers.ts:88-125`

Namun enforcer aktif hanya jika `ctx.shouldEnforceArtifactChain` true. Nilai ini berasal dari:

- `src/lib/chat-harness/policy/enforcers.ts:18-21`

Jika `resolvedWorkflow.action === "continue_discussion"`, `shouldEnforceArtifactChain` menjadi false.

Dampak: tidak ada `toolChoice` yang memaksa model memanggil tool. Model bebas menghasilkan teks dan stop.

### 4. Prompt stage `abstrak` meminta hal yang berlawanan

Instruksi stage `abstrak`:

- `src/lib/ai/paper-stages/core.ts:47-51`: setelah user memilih approach, generate abstract langsung ke artifact.
- `src/lib/ai/paper-stages/core.ts:73-85`: expected flow berakhir dengan `createArtifact` dan `submitStageForValidation`.
- `src/lib/ai/paper-stages/core.ts:113-117`: tool yang wajib dipakai adalah `updateStageData`, `createArtifact`, dan `submitStageForValidation`.

Kontradiksi:

- Choice context note bilang jangan start artifact lifecycle.
- Stage instruction bilang harus generate artifact dan submit validation.

Dampak: model berada dalam prompt stack yang saling bertabrakan. Output akhirnya berupa pseudo-tool-call sebagai teks, bukan tool invocation.

### 5. System prompt aktif ikut menciptakan ambiguity `continue_discussion` vs drafting

Referensi aktif yang di-download dari DB dev/prod ada di:

- `.references/system-prompt-skills-active/updated-7/system-prompt.md`
- `.references/system-prompt-skills-active/updated-7/*-skill.md`

System prompt utama mendefinisikan `workflowAction` sebagai sumber keputusan setelah user memilih choice card:

- `.references/system-prompt-skills-active/updated-7/system-prompt.md:140-151`
- `continue_discussion` berarti selection hanya menyempitkan arah, tidak commit, dan tidak ada artifact lifecycle.
- `finalize_stage` berarti model wajib menjalankan tool chain lengkap.

Namun bagian workflow juga berkata:

- `.references/system-prompt-skills-active/updated-7/system-prompt.md:163-164`
- Untuk review-mode stages, model harus menampilkan content direction options via choice card, lalu draft dari material existing setelah user selects.

Kontradiksi kontribusi:

- Jika choice direction card memakai `continue_discussion`, runtime mematikan artifact lifecycle.
- Tetapi kalimat "then draft ... after user selects" dapat mendorong model mulai drafting setelah klik pertama.
- Dalam kondisi ini, model mencoba menyusun draft pada turn yang runtime anggap discussion-only.

Dampak: system prompt utama bukan satu-satunya root cause, tapi memperbesar peluang mismatch antara "pilihan arah" dan "turn drafting".

### 6. Stage skills aktif menerapkan pola dua kartu yang rawan disalah-eksekusi

Pada `04-abstrak-skill.md`, instruksi aktif menyatakan:

- `.references/system-prompt-skills-active/updated-7/04-abstrak-skill.md:5`: setelah user picks, generate abstract directly to artifact as v1.
- `.references/system-prompt-skills-active/updated-7/04-abstrak-skill.md:55-58`: flow aktual meminta direction card `continue_discussion`, lalu setelah user confirms direction, draft content dan present finalize card.
- `.references/system-prompt-skills-active/updated-7/04-abstrak-skill.md:62-64`: `continue_discussion` dipakai untuk "direction proposals and content confirmations"; `finalize_stage` hanya untuk final confirmation.

Masalahnya: frasa "After user confirms direction, draft the content. Present a finalize choice card..." berada di turn `continue_discussion`. Ini meminta model melakukan drafting dalam jalur yang secara runtime tidak boleh melakukan tool lifecycle.

Pola yang sama muncul di banyak stage skills aktif:

- `05-pendahuluan-skill.md:62,68`
- `06-tinjauan-literatur-skill.md:63,71`
- `07-metodologi-skill.md:57,63`
- `08-hasil-skill.md:64,70`
- `09-diskusi-skill.md:60,66`
- `10-kesimpulan-skill.md:56,62`
- `11-pembaruan-abstrak-skill.md:64,70`
- `12-daftar-pustaka-skill.md:62,68`
- `13-lampiran-skill.md:56,62`
- `14-judul-skill.md:56,62`

Dampak: masalah bukan isolated di `abstrak`; prompt aktif mendorong pola umum "draft in continue_discussion, finalize later" yang bertentangan dengan runtime yang hanya mengeksekusi tool chain pada non-discussion action.

### 7. Beberapa stage skills punya instruksi langsung yang bertentangan dalam file yang sama

Contoh `04-abstrak-skill.md`:

- Line 5: "After user picks, generate abstract DIRECTLY to artifact as v1 working draft."
- Lines 55-60: jangan rush ke artifact, minimal 2 choice cards, draft content lalu present finalize card.
- Lines 62-64: `continue_discussion` untuk direction proposals and content confirmations, `finalize_stage` hanya final confirmation.

Contoh lain dari grep aktif:

- `.references/system-prompt-skills-active/updated-7/09-diskusi-skill.md:48,52` menyatakan setelah user selects via choice card, model execute full tool chain same turn.
- `.references/system-prompt-skills-active/updated-7/09-diskusi-skill.md:59-67` menyatakan user pilih direction dengan `continue_discussion`, lalu baru final confirmation dengan `finalize_stage`.
- Pola serupa muncul di `10-kesimpulan`, `11-pembaruan_abstrak`, dan `12-daftar_pustaka`.

Dampak: model menerima dua strategi berbeda: "tool chain immediately after selection" dan "draft/confirm first, tool chain later". Saat metadata card salah, runtime tidak punya cara membedakan intent sebenarnya.

## Masalah Turunan

### A. Metadata choice card terlalu dipercaya

`workflowAction` yang dibuat oleh model di YAML choice card dianggap otoritatif oleh server. Ini berisiko karena model bisa salah memilih metadata untuk stage yang seharusnya commit point.

Bukti kode:

- `src/lib/json-render/choice-yaml-prompt.ts:100-105` memberi model opsi `continue_discussion`, `finalize_stage`, `compile_then_finalize`, atau `special_finalize`.
- `src/lib/chat/choice-workflow-registry.ts:345-363` memprioritaskan `workflowAction` dari event.

Risiko: satu field UI/model bisa mengubah runtime dari artifact-first menjadi discussion-only.

### B. Registry mengizinkan `continue_discussion` pada banyak stage artifact-first

Stage berikut default-nya finalize/special/compile, tapi tetap mengizinkan `continue_discussion`:

- `topik`
- `outline`
- `abstrak`
- `pendahuluan`
- `tinjauan_literatur`
- `metodologi`
- `hasil`
- `diskusi`
- `kesimpulan`
- `pembaruan_abstrak`
- `daftar_pustaka`
- `lampiran`
- `judul`

Bukti:

- `src/lib/chat/choice-workflow-registry.ts:73-175`

Dampak: problem yang terjadi di `abstrak` bisa berulang di stage lain bila model membuat choice card dengan `workflowAction=continue_discussion` pada momen yang sebenarnya commit/finalize.

### C. Test saat ini mengunci behavior problematik untuk beberapa stage

Test memastikan bahwa `topik` dan `outline` dengan `resolvedWorkflow=continue_discussion` tidak finalize:

- `src/lib/chat/__tests__/choice-request.test.ts:253-285`

Ini tidak selalu salah untuk tahap eksplorasi awal, tetapi menjadi celah jika choice yang sama sebenarnya adalah commit point menurut stage instruction atau plan.

Dampak: test belum membedakan "choice eksplorasi" vs "choice setelah plan meminta finalisasi".

### D. Rescue policy tidak menolong stage non-deterministic

`shouldAttemptRescue` hanya mencoba rescue jika `fallbackPolicy === "deterministic_rescue"` dan action bukan `continue_discussion`.

Bukti:

- `src/lib/chat/choice-workflow-registry.ts:306-335`

Untuk `abstrak`, `fallbackPolicy` adalah `no_rescue`.

Dampak: ketika model tidak memanggil tool pada stage artifact-first, tidak ada server-owned fallback yang mengeksekusi chain.

### E. Verification mendeteksi blocker, tapi tidak mencegah konten buruk tampil

Verification mencatat blocker:

- `teminal-nexjs-log.txt:249-252`: `plan incomplete — validation not submitted`.

Kode verification:

- `src/lib/chat-harness/verification/verify-step-outcome.ts:111-170` memeriksa completeness chain.
- `src/lib/chat-harness/verification/verify-step-outcome.ts:191-199` menganggap drafting stage belum complete jika validation belum submit.

Namun output pseudo-tool-call sudah terlanjur berjalan sebagai text stream.

Dampak: verification lebih observability/post-factum daripada prevention.

### F. Outcome guard belum mendeteksi tool-call leakage

Guard saat ini fokus pada:

- false draft handoff untuk `continue_discussion`
- recovery leakage seperti "kendala teknis"

Bukti:

- `src/lib/chat/choice-outcome-guard.ts:4-18`
- `src/lib/chat/choice-outcome-guard.ts:49-67`

Belum ada pola eksplisit untuk:

- `call: updateStageData`
- `call: createArtifact`
- `call: submitStageForValidation`
- `args:`
- `sources:` sebagai pseudo-tool-call prose

Dampak: kalau model menulis tool internals sebagai teks, guard tidak mengganti output dengan pesan aman.

### G. Plan tidak menjadi source of truth untuk execution boundary

Pada problem ini plan menunjukkan progres dan task yang mengarah ke draft/artifact:

- `teminal-nexjs-log.txt:161`: `PLAN-CONTEXT stage=abstrak injected=plan progress=2/4`
- `teminal-nexjs-log.txt:224`: model membuat plan baru 8 tasks.
- `teminal-nexjs-log.txt:252`: task 5-7 adalah menyimpan draf, membuat artifact, dan mengajukan validasi.

Namun execution boundary ditentukan oleh `resolvedWorkflow.action`, bukan oleh plan.

Dampak: plan bisa mengatakan "lanjut artifact", tapi runtime tetap discussion-only.

### H. Urutan stage instruction vs generic choice contract tidak punya conflict resolver

Stage instruction `abstrak` punya aturan artifact-first, tetapi generic `continue_discussion` contract punya aturan no-artifact. Tidak ada mekanisme yang memilih kontrak dengan prioritas lebih tinggi.

Bukti:

- Stage-specific: `src/lib/ai/paper-stages/core.ts:47-117`
- Generic choice: `src/lib/chat/choice-request.ts:329-338`

Dampak: model menerima instruksi konflik dan hasilnya probabilistik.

### I. UI tidak salah, tapi tidak punya perlindungan terhadap pseudo-tool-call text

Karena runtime menerima teks biasa, UI merender teks biasa. Ini behavior wajar dari sisi renderer.

Bukti:

- Stream chunk summary menunjukkan semua output menjadi text chunk: `teminal-nexjs-log.txt:236-239`.
- Tidak ada tool part yang bisa dipakai UI untuk menampilkan tool indicator atau artifact panel.

Dampak: user melihat internal pseudo-structure dan raw source metadata.

### J. Prompt aktif melarang pseudo-tool-call text, tapi tidak punya mekanisme enforcement

System prompt aktif sudah punya aturan benar:

- `.references/system-prompt-skills-active/updated-7/system-prompt.md:236-239`
- Function tools harus dipanggil via tool calling API, tidak boleh ditulis sebagai teks.
- Jika tool name ditulis sebagai teks, tool tidak execute dan action gagal diam-diam.

Masalahnya aturan ini bersifat instruksional, bukan deterministik. Ketika prompt stack konflik, model tetap bisa melanggar. Runtime tidak otomatis mengonversi teks `call:` menjadi tool event dan outcome guard belum menahan leakage ini.

Dampak: prompt sudah mengenali bahaya, tetapi tidak cukup untuk mencegah kasus awal.

### K. Stage skills aktif tidak memberi boundary aman untuk turn `continue_discussion`

Banyak stage skills memakai `continue_discussion` untuk "content confirmations", tetapi tidak menjelaskan batas output aman pada turn itu.

Yang belum eksplisit:

- Jangan output full draft body pada `continue_discussion`.
- Jangan output raw source metadata pada `continue_discussion`.
- Jangan output pseudo-tool-call text pada `continue_discussion`.
- Jika arah sudah confirmed, cukup ringkas arah dan tampilkan finalize card.

Dampak: model punya ruang untuk "membantu" dengan menyusun draft di chat, padahal runtime belum mengizinkan tool chain.

## Area Stage Yang Perlu Didalami

### Risiko tinggi

Stage yang instruksinya jelas berbunyi "setelah user memilih, generate langsung ke artifact", tapi registry masih membolehkan `continue_discussion`:

- `topik`
- `outline`
- `abstrak`
- `pendahuluan`
- `tinjauan_literatur`
- `metodologi`
- `hasil`
- `daftar_pustaka`
- `lampiran`
- `judul`

Tambahan dari stage skills aktif:

- `abstrak`, `pendahuluan`, `tinjauan_literatur`, `metodologi`, dan `hasil` memakai wording objective "After user picks ... generate directly to artifact", tetapi flow detail meminta direction `continue_discussion` lalu finalize card.
- `diskusi`, `kesimpulan`, `pembaruan_abstrak`, dan `daftar_pustaka` memiliki wording "After user selects via choice card, execute full tool chain same turn", tetapi flow detail tetap memakai `continue_discussion` untuk direction card.

### Risiko sedang

Stage direct-finalize yang mungkin tidak selalu butuh choice card eksplorasi, tapi tetap bisa terdampak bila card salah metadata:

- `diskusi`
- `kesimpulan`
- `pembaruan_abstrak`

### Risiko lebih rendah

- `gagasan`

Alasan: default `gagasan` memang exploration/discussion. Namun saat sudah sampai commit point, risiko tetap ada jika choice metadata salah.

## Pertanyaan Pendalaman

1. Untuk setiap stage, kapan `continue_discussion` benar-benar valid setelah user klik choice card?
2. Apakah stage artifact-first seperti `abstrak`, `pendahuluan`, `metodologi`, dan `hasil` boleh punya lebih dari satu putaran choice setelah user memilih approach?
3. Apakah server harus mempercayai `workflowAction` dari model, atau menurunkannya sendiri dari stage + option catalog + plan state?
4. Kalau model salah metadata, apakah server harus override ke finalize action, atau menolak event sebagai invalid contract?
5. Apakah plan `_plan.tasks` harus ikut menentukan execution boundary ketika task berikutnya adalah artifact/validation?
6. Apakah tool-call leakage text harus disanitasi di stream guard sebagai lapisan proteksi terakhir?
7. Apakah wording "After user picks/generate directly to artifact" di stage skills harus diseragamkan menjadi "after final confirmation" agar tidak mendorong drafting pada turn `continue_discussion`?
8. Apakah `continue_discussion` boleh digunakan untuk "content confirmations", atau harus dibatasi hanya untuk "direction proposals"?
9. Apakah stage skills perlu mencantumkan explicit output boundary untuk `continue_discussion` agar tidak menulis full draft, source inventory, atau pseudo-tool-call?
10. Apakah final confirmation card perlu memiliki option ID/metadata deterministik yang bisa dikenali server, bukan hanya `workflowAction` dari model?

## Kandidat Arah Solusi Untuk Didalami

### 1. Server-side workflow derivation sebagai source of truth

Jangan jadikan `workflowAction` dari model sebagai otoritas final. Gunakan sebagai hint saja. Server menentukan action final berdasarkan:

- current stage
- selected option id
- stage status
- existing artifact
- plan state
- known stage workflow class

Ini solusi paling akurat karena root cause ada di metadata model yang terlalu dipercaya.

### 2. Stage-specific allowed action yang lebih ketat

Untuk stage artifact-first, batasi `continue_discussion` hanya pada choice card eksplorasi awal. Setelah plan masuk ke "user picks approach", action harus finalize.

Butuh data tambahan: cara membedakan choice card eksplorasi awal vs commit choice secara deterministik.

### 2b. Prompt/skill contract cleanup

System prompt dan stage skills perlu diselaraskan agar tidak meminta drafting pada turn `continue_discussion`.

Target cleanup:

- Ganti wording "After user picks, generate directly to artifact" menjadi "After final confirmation, generate directly to artifact".
- Ganti "After user confirms direction, draft the content. Present finalize card" menjadi "After user confirms direction, summarize the direction and present finalize card; do not draft full content yet".
- Batasi `continue_discussion` untuk direction proposal only, bukan content confirmation/final drafting.
- Tambahkan boundary: pada `continue_discussion`, dilarang output full draft, raw source metadata, dan pseudo-tool-call text.

Catatan: perubahan prompt/skills harus dilakukan bersama perbaikan runtime/test, bukan sebagai patch tunggal, karena prompt saja tidak deterministik.

### 3. Enforcer override untuk commit-like choice

Jika stage drafting, no artifact, dan selected choice berasal dari stage yang expected flow-nya "after user picks", runtime bisa override `continue_discussion` menjadi finalize.

Risiko: kalau terlalu agresif, diskusi lanjutan bisa dipaksa finalize.

### 4. Add leakage guard untuk pseudo-tool-call text

Tambahkan guard yang mendeteksi `call: updateStageData`, `call: createArtifact`, `call: submitStageForValidation`, dan `args:` sebagai tool internals leak. Jika muncul tanpa tool success, ganti stream dengan pesan aman dan catat blocker.

Ini bukan solusi root cause, tapi perlindungan UX penting.

### 5. Test matrix lintas stage

Tambahkan test untuk kombinasi:

- stage artifact-first + `workflowAction=continue_discussion`
- stage artifact-first + plan task next step artifact
- no artifact existing
- choice submit dari option pendekatan/fokus/format

Ekspektasi test harus jelas: either override ke finalize atau reject contract.

### 6. Prompt lint / skill validator untuk workflowAction consistency

Tambahkan validator untuk file stage skill aktif sebelum deploy:

- Flag kombinasi berbahaya: `workflowAction: "continue_discussion"` + "draft the content" dalam flow yang sama.
- Flag "After user selects via choice card, execute full tool chain same turn" bila flow detail juga menyebut `continue_discussion`.
- Flag stage review yang tidak punya `continue_discussion` output boundary.
- Flag wording pseudo-tool-call leakage yang tidak dilarang eksplisit pada discussion turns.

## Hipotesis Solusi Terbaik Saat Ini

Solusi terbaik kemungkinan adalah kombinasi:

1. Server-side override/derivation untuk workflow action pada stage artifact-first.
2. Conflict resolver yang memberi prioritas ke stage workflow + plan state dibanding metadata choice card.
3. Guard terakhir untuk pseudo-tool-call leakage supaya user tidak melihat raw tool internals jika model tetap salah.
4. Prompt/skills cleanup agar stage skills tidak lagi mendorong drafting pada `continue_discussion`.
5. Prompt lint sebelum deploy agar kontradiksi workflowAction tidak masuk lagi ke DB.

Belum disarankan langsung patch sebelum menjawab pertanyaan pendalaman, karena perubahan terlalu longgar bisa memaksa finalize pada momen yang sebenarnya masih diskusi.

## File Terkait

- `screenshots/test-reasoning/problem-2/artifact-issue.md`
- `screenshots/test-reasoning/problem-2/console-web.txt.log`
- `screenshots/test-reasoning/problem-2/teminal-nexjs-log.txt`
- `screenshots/test-reasoning/problem-2/terminal-convex.txt`
- `src/lib/chat/choice-workflow-registry.ts`
- `src/lib/chat/choice-request.ts`
- `src/lib/json-render/choice-yaml-prompt.ts`
- `src/lib/chat-harness/entry/validate-choice-interaction.ts`
- `src/lib/chat-harness/policy/enforcers.ts`
- `src/lib/chat-harness/verification/verify-step-outcome.ts`
- `src/lib/chat/choice-outcome-guard.ts`
- `src/lib/ai/paper-stages/core.ts`
- `src/lib/ai/paper-stages/foundation.ts`
- `src/lib/ai/paper-stages/results.ts`
- `src/lib/ai/paper-stages/finalization.ts`
- `src/lib/chat/__tests__/choice-request.test.ts`
- `src/lib/chat/__tests__/choice-workflow-resolver.test.ts`
