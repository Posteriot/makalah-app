# Stage Recommendation UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menambahkan recommendation UI berbasis `data-stage-recommendation` ke chat paper workflow fase awal (`gagasan`, `topik`, `outline`) dengan custom renderer, submit event terstruktur, dan persistence metadata yang aman.

**Architecture:** Fase awal memakai shared contract tunggal di runtime, custom renderer di `MessageBubble`, dan satu jalur submit tetap lewat `POST /api/chat`. Scope fase awal sengaja dibatasi ke stage yang semuanya `single-select`, supaya kontrak, lifecycle streaming, dan audit trail selection bisa dibuktikan tanpa mencampur kompleksitas `multi-select`, `ranked-select`, dan `action-list`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vercel AI SDK v5 (`useChat`, `DefaultChatTransport`, `createUIMessageStream`), Convex, Vitest, Testing Library, Zod

---

## Task Breakdown

### Task 1: Tambahkan shared contract stage recommendation

**Files:**
- Create: `src/lib/chat/stage-recommendation.ts`
- Create: `__tests__/chat/stage-recommendation-contract.test.ts`
- Reference: `docs/chat-page-ux-design-enforcement/stage-recommendation-ui/2026-03-16-submit-event-and-streaming-contract-design.md`
- Reference: `docs/chat-page-ux-design-enforcement/stage-recommendation-ui/2026-03-16-stage-recommendation-persistence-and-ai-tool-mapping.md`

**Step 1: Tulis failing test untuk schema dan helper fase awal**

Isi test minimal:
- payload valid untuk `gagasan`, `topik`, `outline` lolos validasi
- payload `judul` dengan opsi selain 5 gagal
- helper `isStageRecommendationStageSupportedInPhase1()` hanya menerima `gagasan`, `topik`, `outline`
- submit event `single-select` gagal kalau `selectedOptionIds.length !== 1`

Run: `npx vitest run __tests__/chat/stage-recommendation-contract.test.ts --reporter=verbose`
Expected: FAIL karena module belum ada

**Step 2: Implement shared contract minimal**

Buat `src/lib/chat/stage-recommendation.ts` yang berisi:
- union `StageRecommendationStage`
- union `StageRecommendationKind`
- `stageRecommendationPayloadSchema`
- `stageRecommendationSubmitEventSchema`
- helper:
  - `parseStageRecommendationPayload()`
  - `parseStageRecommendationSubmitEvent()`
  - `isStageRecommendationStageSupportedInPhase1()`
  - `isStageRecommendationKindSupportedInPhase1()`

Gunakan Zod dan pisahkan:
- kontrak penuh lintas 14 stage
- support matrix fase awal

**Step 3: Jalankan test kontrak**

Run: `npx vitest run __tests__/chat/stage-recommendation-contract.test.ts --reporter=verbose`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/chat/stage-recommendation.ts __tests__/chat/stage-recommendation-contract.test.ts
git commit -m "feat(chat): add stage recommendation runtime contracts"
```

---

### Task 2: Tambahkan metadata interaction ke persistence message

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/messages.ts`
- Create: `__tests__/chat/message-interaction-metadata-contract.test.ts`
- Reference: `src/app/api/chat/route.ts`

**Step 1: Tulis failing test untuk shape metadata baru**

Isi test minimal:
- validator metadata tetap menerima message assistant lama
- validator metadata menerima interaction submit event stage recommendation
- validator metadata menolak `kind` di luar union

Run: `npx vitest run __tests__/chat/message-interaction-metadata-contract.test.ts --reporter=verbose`
Expected: FAIL karena validator belum ada

**Step 2: Extend schema message secara additive**

Tambah optional metadata interaction yang aman di `messages`:
- `metadata.interaction`
  - `type: "paper_stage_recommendation"`
  - `version`
  - `stage`
  - `kind`
  - `sourceMessageId`
  - `recommendationPartId`
  - `selectedOptionIds`
  - `rankedOptionIds?`
  - `customText?`
  - `optionFollowupInputs?`
  - `submittedAt`

Prinsip:
- additive only
- jangan rusak `model`, `tokens`, `finishReason`
- simpan metadata interaction yang sudah dinormalisasi dari request event, bukan clone mentah request body

**Step 3: Extend `api.messages.createMessage`**

Di `convex/messages.ts`:
- validator `metadata` harus menerima interaction metadata baru
- handler tetap insert shape yang sama, tanpa logic tambahan

**Step 4: Jalankan test metadata**

Run: `npx vitest run __tests__/chat/message-interaction-metadata-contract.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add convex/schema.ts convex/messages.ts __tests__/chat/message-interaction-metadata-contract.test.ts
git commit -m "feat(chat): persist stage recommendation interaction metadata"
```

---

### Task 3: Buat renderer frontend fase awal untuk recommendation card

**Files:**
- Create: `src/components/chat/stage-recommendation/StageRecommendationCard.tsx`
- Create: `src/components/chat/stage-recommendation/StageRecommendationOptionList.tsx`
- Create: `src/components/chat/stage-recommendation/StageRecommendationSubmitBar.tsx`
- Create: `src/components/chat/stage-recommendation/index.ts`
- Create: `src/components/chat/stage-recommendation/StageRecommendationCard.test.tsx`
- Reference: `src/components/paper/PaperValidationPanel.tsx`
- Reference: `src/components/chat/SourcesIndicator.tsx`

**Step 1: Tulis failing UI test untuk card fase awal**

Isi test minimal:
- merender title, prompt, recommended badge, dan reason
- mendukung pilih satu opsi untuk `single-select`
- tombol submit disabled sebelum ada pilihan
- `allowCustomInput` merender textarea tambahan
- kind unsupported fase awal menampilkan fallback non-interaktif

Run: `npx vitest run src/components/chat/stage-recommendation/StageRecommendationCard.test.tsx --reporter=verbose`
Expected: FAIL karena component belum ada

**Step 2: Implement card dengan Mechanical Grace**

Komponen harus:
- pakai `rounded-shell` untuk container utama
- teks label/signal pakai mono untuk metadata kecil
- tidak memakai dashed AI border untuk semua elemen; gunakan seperlunya
- dukung hanya `single-select` interaktif di fase awal
- jika `kind` bukan `single-select`, tampilkan fallback text dan disable submit

Pisahkan tanggung jawab:
- `StageRecommendationCard` pegang state lokal
- `StageRecommendationOptionList` render opsi
- `StageRecommendationSubmitBar` render tombol submit + secondary action bila perlu

**Step 3: Jalankan UI test**

Run: `npx vitest run src/components/chat/stage-recommendation/StageRecommendationCard.test.tsx --reporter=verbose`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/chat/stage-recommendation src/components/chat/stage-recommendation/StageRecommendationCard.test.tsx
git commit -m "feat(chat): add stage recommendation card for phase-one stages"
```

---

### Task 4: Wire extractor dan renderer ke MessageBubble

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `src/components/chat/MessageBubble.search-status.test.tsx`
- Create: `src/components/chat/MessageBubble.stage-recommendation.test.tsx`
- Reference: `src/lib/chat/stage-recommendation.ts`
- Reference: `src/components/chat/stage-recommendation/index.ts`

**Step 1: Tulis failing test khusus MessageBubble**

Isi test minimal:
- `MessageBubble` merender recommendation card dari `data-stage-recommendation`
- text markdown assistant tetap muncul bersama card
- payload invalid tidak merender card interaktif
- message user sintetis dengan metadata interaction tetap dirender sebagai text biasa

Run: `npx vitest run src/components/chat/MessageBubble.stage-recommendation.test.tsx src/components/chat/MessageBubble.search-status.test.tsx --reporter=verbose`
Expected: FAIL karena extractor belum ada

**Step 2: Tambahkan extractor recommendation part**

Di `MessageBubble.tsx`:
- buat helper `extractStageRecommendation(uiMessage)`
- parse `data-stage-recommendation` via shared contract
- render `StageRecommendationCard` hanya untuk assistant message
- letakkan renderer recommendation sebelum indicator/footer yang sifatnya pasca-proses, tapi tetap di dalam bubble flow

Tambahkan props baru yang dibutuhkan:
- `onSubmitStageRecommendation?`
- `submittedStageRecommendationKeys?` atau bentuk lookup serupa untuk read-only state

**Step 3: Jagain compatibility existing**

Pastikan perubahan ini tidak memecah:
- `data-search`
- `data-cited-text`
- `tool-*`
- internal-thought separation
- artifact signals

**Step 4: Jalankan test bubble**

Run: `npx vitest run src/components/chat/MessageBubble.stage-recommendation.test.tsx src/components/chat/MessageBubble.search-status.test.tsx src/components/chat/MessageBubble.internal-thought.test.tsx --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/MessageBubble.tsx src/components/chat/MessageBubble.stage-recommendation.test.tsx src/components/chat/MessageBubble.search-status.test.tsx
git commit -m "feat(chat): render stage recommendation parts in MessageBubble"
```

---

### Task 5: Tambahkan submit flow di ChatWindow dan transport body

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`
- Modify: `src/components/chat/ChatWindow.mobile-workspace.test.tsx`
- Create: `__tests__/chat/stage-recommendation-submit-flow.test.tsx`
- Reference: `src/lib/chat/stage-recommendation.ts`

**Step 1: Tulis failing test submit flow**

Isi test minimal:
- `ChatWindow` membentuk `interactionEvent` dari submit UI
- request body `DefaultChatTransport` tetap menyertakan `conversationId`
- event submit tidak membuka jalur request baru di luar `useChat`
- block yang sudah sukses submit jadi read-only di render berikutnya

Run: `npx vitest run __tests__/chat/stage-recommendation-submit-flow.test.tsx src/components/chat/ChatWindow.mobile-workspace.test.tsx --reporter=verbose`
Expected: FAIL karena wiring belum ada

**Step 2: Tambahkan local submit helper**

Di `ChatWindow.tsx`:
- buat helper `buildStageRecommendationInteractionEvent(...)`
- kirim event lewat `sendMessage`/transport body yang sama, bukan fetch manual baru
- bentuk synthetic text audit trail:

```txt
[Stage Recommendation: gagasan]
Pilihan: Angle #2
Catatan user: ...
```

Gunakan satu source of truth:
- `interactionEvent` untuk backend
- text sintetis hanya untuk readibility

**Step 3: Tambahkan read-only tracking lokal**

Minimal untuk fase awal:
- simpan key submit sukses berbasis `sourceMessageId + recommendationPartId`
- teruskan ke `MessageBubble` agar card yang sama tidak bisa dikirim dua kali

**Step 4: Jalankan test submit flow**

Run: `npx vitest run __tests__/chat/stage-recommendation-submit-flow.test.tsx src/components/chat/ChatWindow.mobile-workspace.test.tsx --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/ChatWindow.tsx src/components/chat/ChatWindow.mobile-workspace.test.tsx __tests__/chat/stage-recommendation-submit-flow.test.tsx
git commit -m "feat(chat): send stage recommendation interaction events through chat transport"
```

---

### Task 6: Extend `/api/chat` untuk menerima interaction event dan persist message user

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Create: `__tests__/api/chat-stage-recommendation-request.test.ts`
- Create: `__tests__/api/chat-stage-recommendation-synthetic-message.test.ts`
- Reference: `convex/messages.ts`
- Reference: `src/lib/chat/stage-recommendation.ts`

**Step 1: Tulis failing test request contract**

Isi test minimal:
- body chat biasa tanpa `interactionEvent` tetap valid
- body dengan `interactionEvent` valid bisa diparse
- event invalid ditolak sebelum masuk ke jalur model
- helper synthetic message membentuk text audit trail yang konsisten

Run: `npx vitest run __tests__/api/chat-stage-recommendation-request.test.ts __tests__/api/chat-stage-recommendation-synthetic-message.test.ts --reporter=verbose`
Expected: FAIL karena parser/helper belum ada

**Step 2: Tambahkan parser dan normalizer request**

Di `route.ts`:
- parse optional `interactionEvent`
- validasi dengan shared contract
- cek stage aktif paper session jika session ada
- cek sourceMessageId / recommendationPartId presence minimal

Jangan lakukan dulu:
- lookup silang berat ke history untuk semua edge case
- RPC baru

Fase awal cukup:
- validasi schema
- validasi ownership + stage aktif
- persist metadata ke message user

**Step 3: Persist synthetic user message**

Saat `interactionEvent` ada:
- bentuk `content` sintetis
- panggil `api.messages.createMessage` dengan:
  - `role: "user"`
  - `content: synthetic text`
  - `metadata.interaction: normalized interaction metadata`

Pastikan jalur existing create user message tetap utuh untuk submit teks biasa.

**Step 4: Feed event ke konteks model**

Tambahkan context note singkat ke model messages, misalnya:
- user memilih opsi recommendation stage aktif
- selected option ids
- custom text jika ada

Prinsip:
- model tidak parsing synthetic text sebagai source of truth
- backend yang menurunkan event menjadi context note
- translasi context harus stage-aware sesuai mapping fase awal:
  - `gagasan` dan `topik` = `decision-only`, AI lanjut elaborasi dulu dan tidak dipaksa save
  - `outline` = `decision-to-draft`, AI diarahkan untuk menerjemahkan pilihan menjadi `sections[]`, `totalWordCount`, `completenessScore`, lalu `updateStageData` + `createArtifact`, tetapi tetap menunggu review user sebelum validasi

**Step 5: Jalankan test API**

Run: `npx vitest run __tests__/api/chat-stage-recommendation-request.test.ts __tests__/api/chat-stage-recommendation-synthetic-message.test.ts --reporter=verbose`
Expected: PASS

**Step 6: Commit**

```bash
git add src/app/api/chat/route.ts __tests__/api/chat-stage-recommendation-request.test.ts __tests__/api/chat-stage-recommendation-synthetic-message.test.ts
git commit -m "feat(api): accept and persist stage recommendation interaction events"
```

---

### Task 7: Tambahkan emission recommendation block untuk tiga stage fase awal

**Files:**
- Modify: `src/lib/ai/paper-stages/foundation.ts`
- Modify: `src/lib/ai/paper-stages/finalization.ts`
- Modify: `src/app/api/chat/route.ts`
- Create: `src/lib/ai/stage-recommendation-builder.ts`
- Create: `__tests__/paper-stage-recommendation-builder.test.ts`
- Reference: `src/lib/ai/paper-stages/foundation.ts`
- Reference: `src/lib/ai/paper-stages/finalization.ts`

**Step 1: Tulis failing test builder**

Isi test minimal:
- builder bisa membentuk payload valid untuk `gagasan`
- builder bisa membentuk payload valid untuk `topik`
- builder bisa membentuk payload valid untuk `outline`
- builder menolak stage di luar fase awal

Run: `npx vitest run __tests__/paper-stage-recommendation-builder.test.ts --reporter=verbose`
Expected: FAIL karena builder belum ada

**Step 2: Tambahkan instruksi prompt yang eksplisit tapi sempit**

Di file prompt yang benar, jangan ubah seluruh style prompt. Tambahkan aturan baru:
- di `foundation.ts` untuk `gagasan` dan `topik`
- di `finalization.ts` untuk `outline`
- saat model memberi opsi rekomendasi, ia juga harus menyediakan blok recommendation terstruktur sesuai kontrak internal
- tetap izinkan penjelasan teks singkat

Pendekatan terbaik di fase awal:
- builder server-side menerima structured output recommendation
- route menerjemahkannya ke `data-stage-recommendation`

Jangan memaksa 14 stage sekaligus.

**Step 3: Emit `data-stage-recommendation` di stream**

Di `route.ts`:
- saat current stage termasuk fase awal dan builder menghasilkan payload valid:
  - tulis `writer.write({ type: "data-stage-recommendation", id, data })`
- kalau payload invalid:
  - skip emission
  - biarkan assistant text biasa tetap jalan

**Step 4: Jalankan test builder**

Run: `npx vitest run __tests__/paper-stage-recommendation-builder.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/ai/paper-stages/foundation.ts src/lib/ai/paper-stages/finalization.ts src/lib/ai/stage-recommendation-builder.ts src/app/api/chat/route.ts __tests__/paper-stage-recommendation-builder.test.ts
git commit -m "feat(ai): emit stage recommendation blocks for phase-one stages"
```

---

### Task 8: Tambahkan regression coverage dan verifikasi integrasi fase awal

**Files:**
- Modify: `src/components/chat/MessageBubble.search-status.test.tsx`
- Modify: `src/components/chat/MessageBubble.internal-thought.test.tsx`
- Modify: `src/components/chat/ChatWindow.mobile-workspace.test.tsx`
- Modify: `__tests__/api/chat-effective-fileids-resolution.test.ts`
- Create: `docs/chat-page-ux-design-enforcement/stage-recommendation-ui/2026-03-17-phase-1-rollout-notes.md`

**Step 1: Tambahkan regression checklist berbasis test**

Minimal cek:
- attachment flow existing tidak pecah
- `data-search` tetap dirender
- internal-thought tetap dipisah
- mobile chat workspace tidak kehilangan elemen penting
- synthetic user message tidak mengganggu logic chat biasa

**Step 2: Jalankan batch verifikasi fase awal**

Run:

```bash
npx vitest run \
  __tests__/chat/stage-recommendation-contract.test.ts \
  __tests__/chat/message-interaction-metadata-contract.test.ts \
  __tests__/chat/stage-recommendation-submit-flow.test.tsx \
  __tests__/api/chat-stage-recommendation-request.test.ts \
  __tests__/api/chat-stage-recommendation-synthetic-message.test.ts \
  __tests__/paper-stage-recommendation-builder.test.ts \
  src/components/chat/stage-recommendation/StageRecommendationCard.test.tsx \
  src/components/chat/MessageBubble.stage-recommendation.test.tsx \
  src/components/chat/MessageBubble.search-status.test.tsx \
  src/components/chat/MessageBubble.internal-thought.test.tsx \
  src/components/chat/ChatWindow.mobile-workspace.test.tsx \
  __tests__/api/chat-effective-fileids-resolution.test.ts \
  --reporter=verbose
```

Expected: PASS

**Step 3: Jalankan typecheck minimal**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Tulis rollout note fase awal**

Catat di `2026-03-17-phase-1-rollout-notes.md`:
- stage yang aktif di fase awal
- kind yang benar-benar interaktif di fase awal
- known limitations:
  - belum ada `multi-select`
  - belum ada `ranked-select`
  - belum ada `action-list`
  - belum ada emission untuk stage setelah `outline`

**Step 5: Commit**

```bash
git add docs/chat-page-ux-design-enforcement/stage-recommendation-ui/2026-03-17-phase-1-rollout-notes.md \
  src/components/chat/MessageBubble.search-status.test.tsx \
  src/components/chat/MessageBubble.internal-thought.test.tsx \
  src/components/chat/ChatWindow.mobile-workspace.test.tsx \
  __tests__/api/chat-effective-fileids-resolution.test.ts
git commit -m "test(chat): lock stage recommendation phase-one regressions"
```

---

## Recommended Execution Order

1. Task 1
2. Task 3
3. Task 4
4. Task 7
5. Task 2
6. Task 5
7. Task 6
8. Task 8

Alasan urutan ini:
- fase 1 di dokumen kontrak adalah stream part + read-only renderer dulu
- fase 2 baru submit interaktif + persistence metadata
- fase 3 baru translasi logic per stage untuk perilaku AI/tool

## Scope Guardrails

- Jangan implement `multi-select`, `ranked-select`, atau `action-list` sebagai UI interaktif di fase awal.
- Jangan ubah `submitStageForValidation` flow.
- Jangan tambahkan endpoint baru selain `POST /api/chat`.
- Jangan paksa persistence final ke `paperSessions.stageData` pada saat submit recommendation; itu tetap keputusan AI/tool setelah interaction event diproses.
- Jangan menyebar ke semua 14 stage sebelum `gagasan`, `topik`, dan `outline` stabil.

## Definition Of Done

- Assistant bisa mengirim `data-stage-recommendation` untuk `gagasan`, `topik`, `outline`
- `MessageBubble` bisa merender single-select card interaktif
- User bisa submit pilihan tanpa mengetik manual
- Submit masuk lewat `POST /api/chat` sebagai `interactionEvent`
- Message user sintetis tersimpan dengan `metadata.interaction` yang sudah dinormalisasi
- Block yang sudah disubmit menjadi read-only
- Test kontrak, UI, API, dan regression fase awal lulus

Plan complete and saved to `docs/plans/2026-03-17-stage-recommendation-ui-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - gue dispatch task satu per satu, review di antara task, iterasi cepat

**2. Parallel Session (separate)** - lo buka sesi baru dengan `executing-plans`, lalu eksekusi batch dengan checkpoint

Pilihan terbaik untuk konteks ini menurut gue adalah **Subagent-Driven (this session)**, karena scope-nya lintas frontend, route, dan persistence, jadi lebih aman kalau diverifikasi per task. Lo mau lanjut yang itu?
