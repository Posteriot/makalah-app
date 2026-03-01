# Konteks Tray + Explicit Bubble + Merge Attachment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Membangun workflow attachment yang durable dan sederhana: file aktif dikelola di UI "Konteks", chip bubble hanya tampil saat explicit attach, dan context attachment tetap dipakai lintas percakapan sampai user hapus satu file atau hapus semua.

**Architecture:** Source of truth tetap di server (`conversationAttachmentContexts`). Client menampilkan context aktif di tray `Konteks` dan melakukan operasi context secara eksplisit (add/merge, remove one, clear all). Message persistence dibedakan antara `explicit` vs `inherit` supaya render bubble dan edit-resend konsisten.

**Tech Stack:** Next.js 16, React 19, AI SDK v5 (`useChat`), Convex, TypeScript, Vitest.

---

### Task 0: Lock Baseline Sebelum Refactor

**Files:**
- Modify: `__tests__/chat/conversation-attachment-baseline-smoke.test.ts`
- Modify: `docs/chat-file-attachment/baseline-lock-evidence.md`

**Step 1: Write the failing test**

Tambahkan assertion baseline baru:

```ts
expect(routeSource).toContain("[ATTACH-DIAG][route] effective fileIds")
expect(chatWindowSource).toContain("const sendUserMessageWithContext")
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- __tests__/chat/conversation-attachment-baseline-smoke.test.ts`
Expected: FAIL pada assertion baru.

**Step 3: Write minimal implementation**

Update test/lock evidence agar cocok dengan baseline branch saat ini.

**Step 4: Run test to verify it passes**

Run: `npm run test -- __tests__/chat/conversation-attachment-baseline-smoke.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add __tests__/chat/conversation-attachment-baseline-smoke.test.ts docs/chat-file-attachment/baseline-lock-evidence.md
git commit -m "test(chat): lock baseline before konteks tray refactor"
```

---

### Task 1: Persisted Attachment Mode di Message (`explicit` vs `inherit`)

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/messages.ts`
- Modify: `convex/_generated/api.d.ts` (auto-generated)
- Test: `__tests__/chat/attachment-mode-persistence-smoke.test.ts`

**Step 1: Write the failing test**

Buat test baru untuk memastikan schema/message contract punya `attachmentMode`:

```ts
expect(sourceSchema).toContain("attachmentMode")
expect(sourceMessages).toContain("attachmentMode")
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- __tests__/chat/attachment-mode-persistence-smoke.test.ts`
Expected: FAIL karena field belum ada.

**Step 3: Write minimal implementation**

Tambahkan field opsional di `messages` table:

```ts
attachmentMode: v.optional(v.union(v.literal("explicit"), v.literal("inherit")))
```

Dan pass-through di mutation `createMessage` args + insert payload.

**Step 4: Run test to verify it passes**

Run:
- `npm run convex -- codegen`
- `npm run test -- __tests__/chat/attachment-mode-persistence-smoke.test.ts`
- `npm run build`

Expected: semua PASS.

**Step 5: Commit**

```bash
git add convex/schema.ts convex/messages.ts convex/_generated/api.d.ts __tests__/chat/attachment-mode-persistence-smoke.test.ts
git commit -m "feat(chat): persist attachment mode on user messages"
```

---

### Task 2: Server Resolver Merge-by-Default + Remove/Clear Semantics

**Files:**
- Modify: `src/lib/chat/effective-file-ids.ts`
- Modify: `src/app/api/chat/route.ts`
- Test: `__tests__/api/chat-effective-fileids-resolution.test.ts`

**Step 1: Write the failing test**

Tambah matrix test untuk contract baru:

```ts
it("merges explicit request with active context by default", ...)
it("supports replace context when replaceAttachmentContext=true", ...)
it("supports remove-by-list when explicit fileIds omits one file with replaceAttachmentContext=true", ...)
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- __tests__/api/chat-effective-fileids-resolution.test.ts`
Expected: FAIL untuk skenario merge/replace baru.

**Step 3: Write minimal implementation**

Perluas body contract route:

```ts
replaceAttachmentContext?: boolean
attachmentMode?: "explicit" | "inherit"
```

Ubah resolver logic:
- default explicit -> merge `context + request` dedupe
- `replaceAttachmentContext === true` -> pakai request apa adanya
- clear tetap prioritas tertinggi

Pastikan saat create user message:
- `attachmentMode: "explicit"` jika request explicit attach
- `attachmentMode: "inherit"` jika pakai inherited context

**Step 4: Run test to verify it passes**

Run:
- `npm run test -- __tests__/api/chat-effective-fileids-resolution.test.ts`
- `npm run build`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/chat/effective-file-ids.ts src/app/api/chat/route.ts __tests__/api/chat-effective-fileids-resolution.test.ts
git commit -m "feat(chat): merge attachment context by default with replace override"
```

---

### Task 3: ChatWindow Contract — Explicit vs Inherit yang Konsisten

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`
- Test: `__tests__/chat/unified-send-helper.test.tsx`

**Step 1: Write the failing test**

Tambah assertion helper payload contract:

```ts
expect(source).toContain("attachmentMode")
expect(source).toContain("replaceAttachmentContext")
expect(source).toContain("mode: \"inherit\"")
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- __tests__/chat/unified-send-helper.test.tsx`
Expected: FAIL sebelum payload baru dipakai.

**Step 3: Write minimal implementation**

Di `sendUserMessageWithContext`:
- mode explicit kirim `attachmentMode: "explicit"`
- mode inherit kirim `attachmentMode: "inherit"`
- operasi replace context kirim `replaceAttachmentContext: true`

Pastikan path follow-up normal = inherit (tanpa chip annotation).

**Step 4: Run test to verify it passes**

Run: `npm run test -- __tests__/chat/unified-send-helper.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/chat/ChatWindow.tsx __tests__/chat/unified-send-helper.test.tsx
git commit -m "refactor(chat): enforce explicit vs inherit send contract"
```

---

### Task 4: UI `Konteks` Tray (x per file + Hapus semua)

**Files:**
- Modify: `src/components/chat/ChatInput.tsx`
- Modify: `src/components/chat/ChatWindow.tsx`
- Test: `__tests__/chat/clear-attachment-context.test.tsx`
- Test: `__tests__/chat/konteks-tray-ui.test.tsx`

**Step 1: Write the failing test**

Tambah test baru untuk UI tray:

```tsx
expect(screen.getByText("Konteks")).toBeInTheDocument()
expect(screen.getAllByLabelText(/Hapus file konteks/i).length).toBeGreaterThan(0)
expect(screen.getByRole("button", { name: /Hapus semua/i })).toBeInTheDocument()
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- __tests__/chat/clear-attachment-context.test.tsx __tests__/chat/konteks-tray-ui.test.tsx`
Expected: FAIL karena label/aksi belum ada.

**Step 3: Write minimal implementation**

Implementasi UI:
- Section label: `Konteks`
- Chip file aktif + tombol `x` per file
- Tombol `Hapus semua`

Event handler:
- `x`: hitung sisa fileId -> kirim update context (replace list) ke server
- `Hapus semua`: `clearByConversation`

**Step 4: Run test to verify it passes**

Run: `npm run test -- __tests__/chat/clear-attachment-context.test.tsx __tests__/chat/konteks-tray-ui.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/chat/ChatInput.tsx src/components/chat/ChatWindow.tsx __tests__/chat/clear-attachment-context.test.tsx __tests__/chat/konteks-tray-ui.test.tsx
git commit -m "feat(chat): add Konteks tray with per-file remove and clear all"
```

---

### Task 5: Bubble Chip Hanya untuk Explicit Attach

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `src/components/chat/ChatWindow.tsx`
- Test: `__tests__/chat/message-bubble-attachment-chip-format.test.tsx`
- Test: `__tests__/chat/explicit-vs-inherit-bubble-visibility.test.tsx`

**Step 1: Write the failing test**

Tambah test visibility rule:

```tsx
it("shows chip for explicit attachment message", ...)
it("hides chip for inherit message", ...)
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- __tests__/chat/message-bubble-attachment-chip-format.test.tsx __tests__/chat/explicit-vs-inherit-bubble-visibility.test.tsx`
Expected: FAIL pada inherit case.

**Step 3: Write minimal implementation**

Render chip di bubble hanya jika:
- role user
- `message.attachmentMode === "explicit"`
- fallback untuk data lama: jika `attachmentMode` undefined, gunakan behavior legacy.

**Step 4: Run test to verify it passes**

Run: `npm run test -- __tests__/chat/message-bubble-attachment-chip-format.test.tsx __tests__/chat/explicit-vs-inherit-bubble-visibility.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/chat/MessageBubble.tsx src/components/chat/ChatWindow.tsx __tests__/chat/message-bubble-attachment-chip-format.test.tsx __tests__/chat/explicit-vs-inherit-bubble-visibility.test.tsx
git commit -m "feat(chat): show attachment chips only on explicit messages"
```

---

### Task 6: Edit-Resend Rule (Explicit tetap Explicit, Inherit tetap Inherit)

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `src/components/chat/ChatWindow.tsx`
- Modify: `__tests__/chat/attachment-resend-contract.test.tsx`

**Step 1: Write the failing test**

Perluas test edit payload:

```ts
expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({
  attachmentMode: "explicit"
}))
```

Tambah satu case untuk inherit:

```ts
expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({
  attachmentMode: "inherit",
  fileIds: []
}))
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- __tests__/chat/attachment-resend-contract.test.tsx`
Expected: FAIL sebelum mode dibawa di payload.

**Step 3: Write minimal implementation**

- `MessageBubble` kirim `attachmentMode` saat `onEdit`.
- `ChatWindow.handleEdit` pakai mode ini:
  - explicit: resend explicit + chip
  - inherit: resend inherit + tanpa chip.

**Step 4: Run test to verify it passes**

Run: `npm run test -- __tests__/chat/attachment-resend-contract.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/chat/MessageBubble.tsx src/components/chat/ChatWindow.tsx __tests__/chat/attachment-resend-contract.test.tsx
git commit -m "fix(chat): preserve explicit vs inherit contract on edit resend"
```

---

### Task 7: Multi-File Merge + Partial Remove Regression

**Files:**
- Create: `__tests__/chat/multi-file-context-merge-regression.test.ts`
- Modify: `docs/chat-file-attachment/2026-03-01-conversation-scoped-attachment-context-regression-checklist.md`

**Step 1: Write the failing test**

Tambahkan test matrix murni logic:

```ts
it("merges second explicit attachment without dropping first", ...)
it("removes only one file when user clicks x", ...)
it("clear all resets all active files", ...)
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- __tests__/chat/multi-file-context-merge-regression.test.ts`
Expected: FAIL untuk merge/partial remove.

**Step 3: Write minimal implementation**

Rapikan helper resolver/transform list file IDs agar:
- merge append + dedupe
- partial remove deterministic.

**Step 4: Run test to verify it passes**

Run: `npm run test -- __tests__/chat/multi-file-context-merge-regression.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add __tests__/chat/multi-file-context-merge-regression.test.ts docs/chat-file-attachment/2026-03-01-conversation-scoped-attachment-context-regression-checklist.md
git commit -m "test(chat): add multi-file merge and partial clear regression coverage"
```

---

### Task 8: Final Verification Gate

**Files:**
- Modify: `docs/chat-file-attachment/README.md`
- Modify: `docs/chat-file-attachment/baseline-lock-evidence.md`

**Step 1: Run targeted tests**

Run:

```bash
npm run test -- __tests__/api/chat-effective-fileids-resolution.test.ts __tests__/chat/unified-send-helper.test.tsx __tests__/chat/clear-attachment-context.test.tsx __tests__/chat/attachment-resend-contract.test.tsx __tests__/chat/message-bubble-attachment-chip-format.test.tsx __tests__/chat/explicit-vs-inherit-bubble-visibility.test.tsx __tests__/chat/multi-file-context-merge-regression.test.ts
```

Expected: PASS.

**Step 2: Run full build**

Run: `npm run build`
Expected: PASS.

**Step 3: Manual check (local)**

Checklist cepat:
1. Initial explicit attach -> bubble chip muncul.
2. Follow-up inherit -> bubble chip tidak muncul.
3. Tambah file kedua explicit -> context berisi 2 file (merge).
4. Klik `x` satu file -> tinggal 1 file aktif.
5. Klik `Hapus semua` -> context kosong.
6. Edit-resend explicit tetap explicit; edit-resend inherit tetap inherit.

**Step 4: Manual check (preview/Vercel)**

Jalankan checklist yang sama untuk parity local vs preview.

**Step 5: Commit**

```bash
git add docs/chat-file-attachment/README.md docs/chat-file-attachment/baseline-lock-evidence.md
git commit -m "docs(chat): finalize konteks tray attachment behavior and verification"
```

---

## Notes for Implementer

- Keep DRY/YAGNI: jangan tambah toggle baru di UI.
- Rule UX final:
  1. User melihat tray `Konteks` sebagai daftar file aktif.
  2. Bubble chip hanya explicit attach.
  3. Inherit tetap transparan via tray + diagnostics, bukan via bubble spam.
- Required skills during execution:
  - `@executing-plans`
  - `@subagent-driven-development`
  - `@ai-engineer`

