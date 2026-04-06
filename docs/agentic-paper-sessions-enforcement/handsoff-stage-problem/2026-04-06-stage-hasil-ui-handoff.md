# Handoff UI Testing — Stage Hasil

> Branch: `feature/paper-sessions-enforcement`  
> Date: 2026-04-06  
> Status: UI testing berhenti di stage `hasil`  
> Purpose: handoff ke session baru untuk brainstorming ulang dan retest dengan context yang lebih bersih

## Konteks

Sedang dilakukan UI testing end-to-end untuk paper workflow agentic pada branch `feature/paper-sessions-enforcement`.

Stage yang sudah dilalui dalam testing:
- `gagasan`
- `topik`
- `outline`
- `abstrak`
- `pendahuluan`
- `tinjauan_literatur`
- `metodologi`

Testing terhenti di stage `hasil`.

Session yang dipakai testing sudah panjang dan mengalami banyak edit/resend. Session baru direncanakan untuk melanjutkan pengujian dengan context yang lebih bersih.

## Kondisi Faktual Saat Ini

### 1. Stage `hasil` belum stabil

Dalam beberapa percobaan pada stage `hasil`, terjadi pola berikut:
- model menulis prose transisional tanpa menghasilkan choice card
- model mengklaim artifact sudah dibuat padahal log tidak menunjukkan `createArtifact`
- model meminta atau mengandalkan input manual user
- `updateStageData` gagal karena payload `hasil` tidak cocok dengan schema

### 2. Masalah choice card di entry turn `hasil`

Pada entry turn stage `hasil`, model beberapa kali berhenti di kalimat seperti:
- menjelaskan akan masuk ke tahap hasil
- mengatakan ada pilihan format
- tetapi tidak menghasilkan `yaml-spec` / choice card

Akibatnya flow terlihat menggantung di UI.

### 3. Masalah agentic contract di stage `hasil`

Masalah utama yang teridentifikasi:
- stage `hasil` sebelumnya masih berperilaku seperti mode manual data entry
- workflow yang diharapkan adalah agent menyusun draft dari material stage sebelumnya yang sudah approved

Perbaikan yang sudah dilakukan:
- skill `hasil` diubah ke default mode agentic
- mode manual data entry dijadikan mode opsional jika user eksplisit bilang punya data riset nyata

### 4. Masalah schema `hasil`

Masalah schema yang sudah muncul selama testing:
- `dataPoints[0] = {}` gagal karena `label` wajib
- `temuanUtama` dikirim sebagai string naratif panjang, sementara schema sebelumnya mengharapkan `string[]`

Perbaikan yang sudah dilakukan:
- `dataPoints.label` dan `dataPoints.value` dibuat opsional
- `temuanUtama` diubah agar menerima `string | string[]`
- consumer utama di formatter/export builder sudah disesuaikan

### 5. Masalah false artifact / false success claims

Dalam beberapa run, model menulis bahwa:
- artifact sudah dibuat
- artifact sudah dikirim untuk validasi

padahal tool success path yang sesuai tidak terjadi.

Perbaikan yang sudah dilakukan:
- success-path `nextAction` pada `createArtifact`
- success-path `nextAction` pada `submitStageForValidation`
- `TOOL CALL INTEGRITY` rule pada stage skills
- artifact-missing note diperluas di `paper-mode-prompt.ts`

### 6. Stage selain `hasil`

Sebelum berhenti di `hasil`, stage-stage sebelumnya sudah menunjukkan perbaikan berikut:
- `gagasan` close-out berhasil dengan trio tool calls
- `tinjauan_literatur` compose phase akhirnya berhasil menghasilkan choice card
- `metodologi` close-out berhasil dan false technical narration berhasil dibersihkan pada state setelah refresh

## Fix yang Sudah Masuk Terkait Stage `hasil`

### Skill / prompt / contract
- redesign `hasil` ke mode agentic default
- `results.ts` diselaraskan dengan mode agentic
- `PROACTIVE COLLABORATION` di `results.ts` sudah diubah agar tidak lagi menyuruh user menyediakan raw data
- `TOOL CALL INTEGRITY`, `FORBIDDEN`, `WRONG/CORRECT` rules ditambahkan

### Schema / type / consumer
- `temuanUtama` menerima `string | string[]`
- `dataPoints.label` dan `dataPoints.value` dibuat opsional
- `formatStageData.ts` menormalisasi `temuanUtama`
- `content-compiler.ts` menyesuaikan type
- `pdf-builder.ts` menormalisasi `temuanUtama`
- `word-builder.ts` menormalisasi `temuanUtama`
- `task-derivation.ts` completion logic untuk type `array` menerima `string`

### Success-path narration guard
- success path `createArtifact` melarang false technical narration
- success path `submitStageForValidation` melarang false technical narration

## Status Pengujian

Pengujian UI berhenti di stage `hasil` karena flow belum konsisten.

Gejala terakhir yang masih muncul:
- entry turn `hasil` kadang tidak menghasilkan choice card
- stage `hasil` masih dapat terlihat menggantung walau user sudah memilih
- beberapa run tetap berujung pada prose transisional tanpa handoff artifact/validation yang bersih

## Rekomendasi untuk Session Baru

### Rekomendasi operasional
Mulai dari session baru, lalu jalankan flow cepat sampai stage `hasil`.

### Hal yang perlu diuji secara khusus di session baru
1. apakah entry turn `hasil` langsung render choice card
2. apakah setelah user memilih format, agent benar-benar menyusun draft `hasil` dari material approved tanpa meminta input manual
3. apakah close-out `hasil` menghasilkan `updateStageData + createArtifact + submitStageForValidation` tanpa prose palsu atau state menggantung

### Jika masalah `hasil` tetap muncul
Lakukan brainstorming ulang khusus untuk stage `hasil`, dengan fokus pada:
- kontrak stage `hasil`
- lifecycle choice card pada entry turn
- sinkronisasi antara prompt, schema, dan tool workflow

## File Relevan

- [08-hasil-skill.md](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/.references/system-prompt-skills-active/updated-1/08-hasil-skill.md)
- [results.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/ai/paper-stages/results.ts)
- [paper-tools.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/ai/paper-tools.ts)
- [paper-mode-prompt.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/ai/paper-mode-prompt.ts)
- [route.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/app/api/chat/route.ts)
- [types.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/convex/paperSessions/types.ts)
- [stage-types.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/paper/stage-types.ts)
- [task-derivation.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/paper/task-derivation.ts)
- [ui-test-checklist-f1-f6-paper-workflow.md](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/docs/agentic-paper-sessions-enforcement/ui-test-checklist-f1-f6-paper-workflow.md)
