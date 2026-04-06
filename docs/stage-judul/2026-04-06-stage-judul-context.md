# Context — Stage `judul`

> Branch: `feature/paper-sessions-enforcement`  
> Date: 2026-04-06  
> Scope: handoff context untuk hardening/follow-up stage `judul` di worktree atau branch lain  
> Status: lifecycle utama sudah ditambal, tetapi masih ada limitation yang diketahui

## Ringkasan

Stage `judul` adalah tahap final pemilihan judul paper setelah `lampiran`.

Flow yang diinginkan:
- agent menghasilkan 5 opsi judul via choice card
- user memilih satu opsi
- sistem menyimpan `judulTerpilih`
- artifact judul dibuat atau diperbarui
- stage dikirim ke validation panel

Masalah utama yang sempat muncul:
- choice event diterima, tetapi tidak ada `updateStageData`
- tidak ada `createArtifact`
- tidak ada `submitStageForValidation`
- model malah menulis pseudo tool call sebagai teks chat, misalnya:
  - `functions.updateStageData({...})`
  - `functions.createArtifact({...})`

Artinya bug utamanya bukan renderer, melainkan **workflow enforcement** pada jalur choice-submit `judul`.

## Kondisi Faktual yang Sudah Terkonfirmasi

### 1. Choice submit `judul` sempat jatuh ke jalur generic

Sebelum fix khusus `judul`, branch choice-submit di [choice-request.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/chat/choice-request.ts) tidak punya path spesifik untuk `event.stage === "judul"`.

Akibatnya pilihan judul user diperlakukan sebagai:
- `Mode: decision-to-draft`
- tidak ada kewajiban menutup lifecycle stage

Ini menjelaskan kenapa sesudah user memilih `judul-1`, sistem bisa berhenti tanpa artifact dan tanpa validation.

### 2. Model bisa menulis pseudo tool syntax ke chat

Pada runtime test, model menampilkan teks seperti:
- `functions.updateStageData(...)`
- `functions.createArtifact(...)`

Ini menunjukkan model tidak benar-benar mengeksekusi tools, tetapi menarasikan rencana tool call sebagai teks.

### 3. Stage `judul` membutuhkan enforcement yang lebih keras

Karena choice-submit `judul` adalah action workflow, bukan generation problem, prompt/note saja tidak cukup.  
Seperti `lampiran: tidak ada`, stage ini akhirnya memerlukan server-owned fallback.

## Fix yang Sudah Masuk

### A. Branch choice-submit khusus `judul`

Commit:
- `1a528b33`
- `f1afac77` untuk test tambahan

Perubahan:
- [choice-request.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/chat/choice-request.ts) sekarang punya branch:
  - `Mode: post-choice-title-selection`
- branch ini memaksa urutan:
  1. `updateStageData`
  2. `createArtifact` atau `updateArtifact`
  3. `submitStageForValidation`

Coverage test yang sudah ditambahkan:
- [choice-request.test.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/chat/__tests__/choice-request.test.ts)
  - `judul -> post-choice-title-selection`
  - `hasil -> post-choice-artifact-first`
  - `lampiran tidak-ada -> no-appendix-placeholder`
  - `lampiran normal -> decision-to-draft`

### B. Server-owned fallback untuk `judul`

Commit:
- `7c47c97f`
- `5e7eaa1d` untuk revision-aware hardening

Perubahan utama di [route.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/app/api/chat/route.ts):
- jika:
  - `paperStageScope === "judul"`
  - ada `choiceInteractionEvent.stage === "judul"`
  - model tidak benar-benar memanggil `updateStageData`, `createArtifact`, atau `updateArtifact`
  - tetapi masih ada `normalizedText`
- maka server mencoba menyelesaikan lifecycle sendiri:
  1. ekstrak judul terpilih dari teks model
  2. `paperSessions.updateStageData({ judulTerpilih, alasanPemilihan })`
  3. `artifacts.create(...)` atau `artifacts.update(...)`
  4. `paperSessions.submitForValidation(...)`
  5. replace `persistedContent` dengan pesan bersih untuk user

Revision-aware behavior yang sudah masuk:
- jika stage `judul` sudah punya `artifactId`, fallback memakai `artifacts.update(...)`
- jika belum ada artifact, fallback memakai `artifacts.create(...)`

Primary dan fallback path parity sudah ada.

## Kondisi Saat Ini

### Yang sudah lebih baik

- stage `lampiran` sudah bisa lanjut ke `judul`
- choice card `judul` tetap muncul
- ada jalur fallback server-owned jika model gagal execute tool chain
- fallback `judul` sekarang revision-aware

### Yang masih menjadi limitation

#### 1. Source title masih belum deterministic

Saat ini fallback `judul` masih mengambil judul dari `normalizedText` model dengan regex seperti:
- `judulTerpilih...`
- fallback regex lain yang longgar

Artinya:
- jika model mengubah format pseudo tool text
- atau tidak lagi menulis judul dengan pola yang bisa diparse
- fallback bisa gagal mengekstrak judul

Ini limitation paling jelas yang masih tersisa.

#### 2. Belum ada test runtime khusus untuk fallback `judul`

Yang sudah ada baru test branch note di `choice-request.ts`, belum test untuk fallback lifecycle di `route.ts`.

## Penilaian Teknis

### Apa yang sudah “cukup baik”

Untuk tujuan UI testing stage 8–14, patch `judul` sekarang sudah masuk kategori:
- tactical fix
- lifecycle-aware
- lebih baik daripada sekadar prompt-only fix

### Apa yang belum “fix bersih”

Belum bersih karena source-of-truth judul masih model-text-driven, bukan system-owned.

Jadi framing yang akurat:
- lifecycle `judul`: sudah ditambal
- source title deterministic: belum selesai

## Rekomendasi Follow-Up untuk Branch Lain

### Prioritas 1 — buat source title deterministic

Idealnya jangan extract judul dari prose model.

Arah yang disarankan:
- simpan mapping `optionId -> title text` ketika choice card judul dibuat
- atau sertakan label/title di payload choice submit
- atau simpan choice payload judul yang bisa dibaca kembali saat `paper.choice.submit`

Target:
- saat user memilih `judul-1`, server tahu judul persis yang dipilih tanpa menebak dari teks model

### Prioritas 2 — tambah test runtime fallback `judul`

Tambahkan test untuk skenario:
1. choice event `judul` diterima
2. model tidak menjalankan tool
3. server fallback menyimpan `judulTerpilih`
4. server membuat atau meng-update artifact
5. server submit validation

Jika ingin lebih lengkap, pecah jadi dua:
- drafting path -> `create`
- revision path -> `update`

## Hal yang Tidak Perlu Dikerjakan Sekarang

- refactor besar seluruh arsitektur streaming
- real-time suppression untuk semua pseudo tool text
- redesign toolset baru khusus `judul`

Semua itu bisa ditunda jika target utama hanya menyelesaikan workflow testing dan stabilitas dasar.

## File Relevan

- [choice-request.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/chat/choice-request.ts)
- [choice-request.test.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/chat/__tests__/choice-request.test.ts)
- [finalization.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/ai/paper-stages/finalization.ts)
- [route.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/app/api/chat/route.ts)
- [formatStageData.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/ai/paper-stages/formatStageData.ts)
- [stage-types.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/paper/stage-types.ts)

## Exit Criteria untuk Follow-Up Branch

Stage `judul` bisa dianggap bersih jika:
1. choice submit selalu menghasilkan `updateStageData + create/updateArtifact + submitStageForValidation`
2. user tidak melihat pseudo tool syntax di chat/persisted content
3. title terpilih di-resolve dari source yang deterministic, bukan regex atas teks model
4. fallback runtime punya test untuk drafting dan revision path
