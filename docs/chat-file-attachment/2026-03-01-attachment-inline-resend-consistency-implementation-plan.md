# Chat Attachment Inline + Edit-Resend Consistency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Memastikan attachment (dokumen + gambar) selalu terkirim konsisten bersama teks, tidak hilang saat edit-resend, dan perilaku local/Vercel stabil terutama untuk PDF.

**Architecture:** Frontend dijadikan single source untuk paket kirim user (`text + fileIds + image parts`) dalam satu composer inline. Backend tetap source of truth persistensi `fileIds` dan menolak request file-only. UI bubble prioritas baca attachment persisted (`msg.fileIds`) lalu annotation lokal hanya fallback optimistik.

**Tech Stack:** Next.js 16 App Router, React 19, Vercel AI SDK (`useChat`), Convex, Vitest + Testing Library.

---

## Insight Penguncian (Wajib Sebelum Refactor)

- Kondisi saat ini sudah pernah terbukti berhasil untuk `txt/docx/pptx/xlsx/pdf/image`, jadi baseline ini harus dikunci dulu sebelum ubah kontrak edit/composer.
- Tanpa penguncian baseline, perubahan UX kecil bisa diam-diam merusak jalur kirim `fileIds` dan baru ketahuan setelah deploy.
- Karena ada riwayat mismatch local vs Vercel, penguncian harus meliputi behavior runtime dan build trace, bukan cuma unit test.

---

## Scope & Acceptance Checklist

- [ ] Baseline “semua format file terbaca” terkunci lewat regression checklist sebelum refactor.
- [ ] Edit-resend mempertahankan `fileIds` dari message yang diedit.
- [ ] Tidak ada send file-only dari UI (`input.trim().length > 0` wajib).
- [ ] Backend mengembalikan `400` untuk payload `fileIds` tanpa teks.
- [ ] Composer menampilkan attachment chips inline di dalam kotak input (desktop + mobile + fullscreen).
- [ ] Bubble file chip tetap stabil setelah refresh/sync dari persisted data.
- [ ] PDF extractor parity local/Vercel dijaga lewat guard build-time trace.
- [ ] Test matrix anti-regresi berjalan hijau.

---

## Task 0: Lock Baseline agar Perbaikan Existing Tidak Terganggu

**Files:**
- Create: `docs/chat-file-attachment/baseline-lock-evidence.md`
- Create: `__tests__/chat/attachment-baseline-formats-smoke.test.ts`
- Create: `scripts/verify-attachment-baseline.mjs`
- Read/Reference: `src/components/chat/ChatWindow.tsx`, `src/app/api/chat/route.ts`, `src/app/api/extract-file/route.ts`

**Step 1: Dokumentasikan baseline yang sudah terbukti**

Isi `baseline-lock-evidence.md` dengan bukti bahwa `txt/docx/pptx/xlsx/pdf/image` sudah berhasil (timestamp, screenshot, ringkas log route diag).

**Step 2: Tambah smoke test baseline format**

Buat test smoke untuk memastikan payload route minimal tetap benar:
- body mengandung `fileIds` saat ada attachment.
- `fileContextLength > 0` untuk dokumen non-image.
- image tetap lewat jalur multimodal tanpa regress.

**Step 3: Tambah script verifikasi baseline**

`scripts/verify-attachment-baseline.mjs` menjalankan check cepat untuk memastikan guard kritikal belum berubah:
- submit guard frontend tidak kembali ke mode file-only.
- route masih menerima + memproses `fileIds`.
- mapping history -> annotation `file_ids` tetap ada untuk render chip.

**Step 4: Run baseline gate**

Run:
- `npm run test -- __tests__/chat/attachment-baseline-formats-smoke.test.ts`
- `node scripts/verify-attachment-baseline.mjs`

Expected: PASS semua. Jika ada fail, hentikan task berikutnya.

**Step 5: Commit penguncian baseline**

```bash
git add docs/chat-file-attachment/baseline-lock-evidence.md __tests__/chat/attachment-baseline-formats-smoke.test.ts scripts/verify-attachment-baseline.mjs
git commit -m "test(chat): lock proven attachment baseline before refactor"
```

---

## Task 1: Baseline Contract Test (Attachment + Edit-Resend)

**Files:**
- Create: `__tests__/chat/attachment-resend-contract.test.tsx`
- Read/Reference: `src/components/chat/ChatWindow.tsx`, `src/components/chat/MessageBubble.tsx`

**Step 1: Write failing test for edit-resend membawa fileIds**

Tambahkan test yang memverifikasi callback edit menerima metadata attachment, bukan hanya text.

**Step 2: Run test to verify it fails**

Run: `npm run test -- __tests__/chat/attachment-resend-contract.test.tsx`
Expected: FAIL (karena kontrak `onEdit(messageId, newContent)` masih sempit).

**Step 3: Commit baseline test**

```bash
git add __tests__/chat/attachment-resend-contract.test.tsx
git commit -m "test(chat): add failing contract test for attachment-preserving edit resend"
```

---

## Task 2: Enforce Composer Rule “Attachment Harus Ada Teks”

**Files:**
- Modify: `src/components/chat/ChatInput.tsx`
- Modify: `src/components/chat/ChatWindow.tsx`
- Create: `__tests__/chat/attachment-send-rule.test.tsx`

**Step 1: Write failing UI tests**

Tambahkan 2 test:
- `input="" + ada attachment => tombol send disabled`
- `input="." + ada attachment => tombol send enabled`

**Step 2: Run test to verify it fails**

Run: `npm run test -- __tests__/chat/attachment-send-rule.test.tsx`
Expected: FAIL (rule sekarang masih izinkan file-only).

**Step 3: Implement minimal code**

- Ubah disable guard di `ChatInput` jadi hanya berbasis `input.trim().length === 0`.
- Ubah submit guard di `ChatWindow` jadi `if (!input.trim()) return`.

**Step 4: Run tests**

Run:
- `npm run test -- __tests__/chat/attachment-send-rule.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/chat/ChatInput.tsx src/components/chat/ChatWindow.tsx __tests__/chat/attachment-send-rule.test.tsx
git commit -m "feat(chat): require non-empty text for sending messages with attachments"
```

---

## Task 3: Inline Composer Layout (Bukan Attachment Bar Terpisah)

**Files:**
- Modify: `src/components/chat/ChatInput.tsx`
- Test: `__tests__/chat/attachment-send-rule.test.tsx` (extend assertions DOM placement)

**Step 1: Write/extend failing test untuk posisi chip di dalam composer**

Assert chips dirender di dalam container composer desktop/mobile/fullscreen, bukan di luar `<form>`.

**Step 2: Run test to verify it fails**

Run: `npm run test -- __tests__/chat/attachment-send-rule.test.tsx`
Expected: FAIL (chips masih punya varian posisi di luar composer).

**Step 3: Implement minimal code**

Refactor `renderFileChips()` placement supaya selalu menjadi bagian dalam composer wrapper yang sama.

**Step 4: Run tests**

Run: `npm run test -- __tests__/chat/attachment-send-rule.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/chat/ChatInput.tsx __tests__/chat/attachment-send-rule.test.tsx
git commit -m "feat(chat): move attachment chips into inline composer container"
```

---

## Task 4: Widen Edit Contract to Carry Attachment Metadata

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `src/components/chat/ChatWindow.tsx`
- Optional Create: `src/lib/chat/edit-resend-payload.ts` (kalau perlu helper tipis)
- Test: `__tests__/chat/attachment-resend-contract.test.tsx`

**Step 1: Implement new edit payload contract**

Ubah signature dari:
- `onEdit(messageId, newContent)`

Menjadi:
- `onEdit({ messageId, newContent, fileIds, fileNames })`

Sumber attachment untuk payload edit diambil dari message yang diedit (annotation/persisted map).

**Step 2: Wire resend call with body.fileIds**

Di `ChatWindow`, saat edit-resend setelah truncate, panggil `sendMessage(..., { body: { fileIds } })` untuk payload edit.

**Step 3: Run tests**

Run:
- `npm run test -- __tests__/chat/attachment-resend-contract.test.tsx`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/components/chat/MessageBubble.tsx src/components/chat/ChatWindow.tsx __tests__/chat/attachment-resend-contract.test.tsx
git commit -m "feat(chat): preserve fileIds when editing and resending user message"
```

---

## Task 5: Backend Hard Guard for File-Only Payload

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Create: `__tests__/api/chat-file-only-validation.test.ts`

**Step 1: Write failing API test**

Kasus:
- request berisi `fileIds` tapi `last user text` kosong -> harus `400` + pesan error eksplisit.

**Step 2: Run test to verify it fails**

Run: `npm run test -- __tests__/api/chat-file-only-validation.test.ts`
Expected: FAIL (server saat ini belum hard reject).

**Step 3: Implement minimal validation**

Tambahkan validasi sebelum persist/user processing:
- Jika `Array.isArray(fileIds) && fileIds.length > 0 && userContent.trim().length === 0`, return `400`.

**Step 4: Run tests**

Run: `npm run test -- __tests__/api/chat-file-only-validation.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts __tests__/api/chat-file-only-validation.test.ts
git commit -m "feat(api): reject attachment-only chat payload with 400 validation"
```

---

## Task 6: Stabilize Bubble Attachment Rendering (Persisted-First)

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`
- Modify: `src/components/chat/MessageBubble.tsx`
- Create: `__tests__/chat/persisted-fileids-priority.test.tsx`

**Step 1: Write failing render-priority test**

Kasus:
- bila `msg.fileIds` tersedia dari history/persisted, bubble wajib render chip dari persisted source meskipun annotation lokal belum ada.

**Step 2: Run test to verify it fails**

Run: `npm run test -- __tests__/chat/persisted-fileids-priority.test.tsx`
Expected: FAIL (bergantung utama ke annotation saat ini).

**Step 3: Implement minimal code**

- Mapping history di `ChatWindow` tetap injeksi annotation dari `msg.fileIds`.
- Di `MessageBubble`, urutan sumber data:
  1. persisted metadata (yang berasal dari `msg.fileIds` sinkron)
  2. annotation lokal (fallback untuk optimistik pre-sync)

**Step 4: Run tests**

Run: `npm run test -- __tests__/chat/persisted-fileids-priority.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/chat/ChatWindow.tsx src/components/chat/MessageBubble.tsx __tests__/chat/persisted-fileids-priority.test.tsx
git commit -m "fix(chat): prioritize persisted fileIds for stable attachment chip rendering"
```

---

## Task 7: PDF Local/Vercel Parity Guard (Anti-ulang)

**Files:**
- Modify: `next.config.ts`
- Modify: `package.json` (script check)
- Create: `scripts/assert-extract-file-trace.mjs`
- Create: `__tests__/build/pdf-trace-check.test.ts` (optional wrapper, jika perlu)

**Step 1: Add trace assertion script**

Script membaca artifact tracing build Next (`.next/server/...nft.json` untuk route `/api/extract-file`) dan assert dependency kritikal ada:
- `pdf-parse`
- `pdfjs-dist/legacy/build`
- `@napi-rs/canvas`

**Step 2: Wire to build workflow**

Tambahkan script npm:
- `check:extract-file-trace`

Lalu jalankan setelah `npm run build` pada CI/proses release.

**Step 3: Run locally**

Run:
- `npm run build`
- `npm run check:extract-file-trace`

Expected: PASS dengan output dependency trace valid.

**Step 4: Commit**

```bash
git add next.config.ts package.json scripts/assert-extract-file-trace.mjs __tests__/build/pdf-trace-check.test.ts
git commit -m "chore(build): add extract-file trace assertion for pdf runtime parity"
```

---

## Task 8: End-to-End Regression Matrix (Manual + Automated)

**Files:**
- Create: `docs/chat-file-attachment/attachment-regression-checklist.md`
- Update: `docs/chat-file-attachment/README.md` (link plan + checklist)

**Step 1: Add manual QA checklist matrix**

Wajib cover:
- send disabled saat attachment tanpa teks
- send enabled saat attachment + "."
- edit-resend message ber-attachment -> chip tetap ada
- TXT/DOCX/XLSX/PPTX/PDF/PNG roundtrip
- local vs Vercel parity

**Step 2: Run focused test suite**

Run:
- `npm run test -- __tests__/chat/attachment-send-rule.test.tsx __tests__/chat/attachment-resend-contract.test.tsx __tests__/chat/persisted-fileids-priority.test.tsx __tests__/api/chat-file-only-validation.test.ts`

Expected: PASS.

**Step 3: Commit**

```bash
git add docs/chat-file-attachment/attachment-regression-checklist.md docs/chat-file-attachment/README.md
git commit -m "docs(chat): add attachment regression matrix for local and vercel parity"
```

---

## Task 9: Final Verification + Release Checklist

**Files:**
- No code file required (verification gate)

**Step 1: Local verification**

Run:
- `npm run test`
- `npm run build`
- `npm run check:extract-file-trace`

Expected: semua PASS.

**Step 2: Smoke verification in deployment environment**

Checklist run di preview deployment:
- upload + kirim `PDF/TXT/DOCX/XLSX/PPTX/PNG`
- edit-resend untuk message ber-attachment
- refresh halaman, chip masih ada

**Step 3: Final commit (if needed for small follow-up fixes)**

```bash
git add -A
git commit -m "chore(chat): finalize attachment reliability and resend consistency"
```

---

## Implementation Order (Mandatory)

1. Task 0
2. Task 1
3. Task 2
4. Task 3
5. Task 4
6. Task 5
7. Task 6
8. Task 7
9. Task 8
10. Task 9

---

## Risk Register + Mitigation

- **Risk:** Perubahan kontrak `onEdit` memicu type error lintas komponen.
  - **Mitigation:** Ubah signature bertahap + compile check tiap task.
- **Risk:** Validasi backend 400 memutus client lama.
  - **Mitigation:** Selaraskan frontend guard lebih dulu (Task 2), baru backend guard (Task 5).
- **Risk:** Refactor layout mobile/fullscreen merusak ergonomi keyboard.
  - **Mitigation:** QA manual fokus iOS/Android viewport + keyboard overlap.
- **Risk:** PDF parity regress lagi karena perubahan dependency/bundling.
  - **Mitigation:** enforce `check:extract-file-trace` sebagai gate build.

---

## Definition of Done

- [ ] Semua task selesai dengan commit terpisah per task.
- [ ] Seluruh test baru dan test existing terkait chat/attachment PASS.
- [ ] Dokumen non-image + image konsisten terbaca model pada local dan Vercel.
- [ ] Edit-resend tidak pernah menghilangkan attachment chip.
- [ ] Tidak ada file-only submission dari UI maupun API.
