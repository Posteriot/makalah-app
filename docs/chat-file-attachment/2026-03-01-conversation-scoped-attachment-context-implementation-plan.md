# Conversation-Scoped Attachment Context Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mengubah attachment dari message-scoped menjadi conversation-scoped secara durable di semua jalur kirim user.

**Architecture:** Server menyimpan active attachment context per conversation, client memakai unified send pipeline, route `/api/chat` menghitung `effectiveFileIds` dengan fallback deterministic.

**Tech Stack:** Next.js 16, React 19, AI SDK v5, Convex, Vitest.

---

## Task 0: Baseline Lock (Wajib)

**Files:**
- Update: `docs/chat-file-attachment/baseline-lock-evidence.md`
- Create: `__tests__/chat/conversation-attachment-baseline-smoke.test.ts`

**Steps:**
1. Tambah bukti log baseline terbaru (success + intermittent case).
2. Tambah smoke test yang memastikan jalur existing tetap aman sebelum migration.
3. Run: `npm run test -- __tests__/chat/conversation-attachment-baseline-smoke.test.ts`
4. Commit.

---

## Task 1: Data Layer Context Conversation

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/conversationAttachmentContexts.ts`
- Modify (index export jika perlu): `convex/_generated/api.d.ts` (auto-gen lewat convex)

**Steps:**
1. Tambah table `conversationAttachmentContexts` + index.
2. Buat functions:
   - `getByConversation`
   - `upsertByConversation`
   - `clearByConversation`
3. Run typecheck/build Convex.
4. Commit.

---

## Task 2: Server Effective Context Resolution

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Create: `__tests__/api/chat-effective-fileids-resolution.test.ts`

**Steps:**
1. Tambah contract body: `inheritAttachmentContext`, `clearAttachmentContext`.
2. Implement resolver `effectiveFileIds` di route.
3. Integrasikan resolver ke flow `fileContext` + persistence message.
4. Tambah test matrix:
   - explicit fileIds,
   - fallback ke active context,
   - clear context.
5. Run tests target.
6. Commit.

---

## Task 3: Unified Send Helper in ChatWindow

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`
- Create: `__tests__/chat/unified-send-helper.test.tsx`

**Steps:**
1. Buat helper tunggal `sendUserMessageWithContext`.
2. Refactor semua flow kirim user ke helper:
   - submit input,
   - edit-resend,
   - template,
   - approve/revise.
3. Hilangkan jalur text-only yang bypass attachment context.
4. Run tests target.
5. Commit.

---

## Task 4: Composer Sync ke Active Server Context

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`
- Modify: `src/components/chat/ChatInput.tsx`
- Create: `__tests__/chat/composer-active-context-sync.test.tsx`

**Steps:**
1. Tambah query context aktif per conversation.
2. Sinkronkan `activeAttachments` ke composer.
3. Pastikan chip composer merepresentasikan context aktif, bukan transient semata.
4. Run tests target.
5. Commit.

---

## Task 5: Edit-Resend Attachment Persistence Hardening

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `src/components/chat/ChatWindow.tsx`
- Update: `__tests__/chat/attachment-resend-contract.test.tsx`

**Steps:**
1. Pastikan payload edit selalu bawa metadata attachment lengkap.
2. Setelah resend, optimistic annotation wajib konsisten sampai history sync.
3. Run tests target.
4. Commit.

---

## Task 6: Clear Attachment Context UX

**Files:**
- Modify: `src/components/chat/ChatInput.tsx`
- Modify: `src/components/chat/ChatWindow.tsx`
- Create: `__tests__/chat/clear-attachment-context.test.tsx`

**Steps:**
1. Tambah tombol `Clear attachment context` di composer.
2. Tombol trigger `clearAttachmentContext: true` flow.
3. Pastikan chip composer + backend context benar-benar kosong.
4. Run tests target.
5. Commit.

---

## Task 7: Bubble Rendering Persisted-First Stabilization

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`
- Update: `__tests__/chat/message-bubble-attachment-chip-format.test.tsx`

**Steps:**
1. Tetapkan priority: persisted metadata > optimistic fallback.
2. Jaga format konsisten: truncated basename + extension + size.
3. Run tests target.
4. Commit.

---

## Task 8: E2E Regression Matrix (Local + Preview)

**Files:**
- Create: `docs/chat-file-attachment/2026-03-01-conversation-scoped-attachment-context-regression-checklist.md`
- Update: `docs/chat-file-attachment/README.md`

**Steps:**
1. Tambah checklist manual untuk semua format file + semua flow kirim.
2. Tambah skenario wajib:
   - upload sekali, follow-up 3 turn tanpa reattach,
   - edit-resend tetap bawa context,
   - refresh halaman tetap persist,
   - clear context benar-benar reset.
3. Jalankan test otomatis fokus chat attachment.
4. Commit.

---

## Task 9: Final Verification Gate

**Commands:**
- `npm run test`
- `npm run build`
- uji manual local
- uji manual preview deployment

**Exit criteria:**
- tidak ada regresi format file,
- tidak ada jalur kirim user yang kehilangan attachment context,
- behavior local/preview konsisten.

---

## Mandatory Execution Order

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

## Risks and Mitigation

- **Risk:** context bocor antar conversation.
  - **Mitigation:** auth guard + lookup strict by `conversationId` + `userId`.
- **Risk:** token usage naik karena context diwariskan terus.
  - **Mitigation:** tetap pakai context cap existing + clear context action.
- **Risk:** race optimistic UI vs history sync.
  - **Mitigation:** persisted-first rendering policy + deterministic annotation fallback.

---

## Validation Request (Sebelum Eksekusi)

Dokumen ini sengaja belum dieksekusi. Eksekusi hanya lanjut setelah approval eksplisit dari user untuk:
- mode inheritance default (`inheritAttachmentContext = true`),
- scope persistence mencakup dokumen + image metadata,
- urutan task di atas.
