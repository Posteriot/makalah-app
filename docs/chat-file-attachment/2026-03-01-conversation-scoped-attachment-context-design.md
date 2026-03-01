# Conversation-Scoped Attachment Context — Durable Design

**Date:** 2026-03-01  
**Branch:** `attachment-inline-plan`  
**Status:** Draft untuk validasi arsitektur sebelum implementasi

---

## 1. Tujuan

Membuat attachment file menjadi **context percakapan yang persisten**, bukan hanya per-message.

Target perilaku:
- file yang sudah attached tetap aktif sepanjang percakapan,
- semua jalur kirim user (chat input normal, template, approve/revise, edit-resend) membaca context yang sama,
- UI chip konsisten sebelum/selama/sesudah kirim,
- backend tetap source of truth jika client miss/race.

---

## 2. Problem Aktual

Arsitektur sekarang masih campuran:
- sebagian flow kirim `fileIds` eksplisit,
- sebagian flow kirim text-only (`sendMessageWithPendingIndicator`),
- rendering chip bergantung kombinasi optimistic annotations + history sync,
- ekstraksi dokumen async terpisah.

Dampak:
- terasa “kadang hilang, kadang balik lagi”,
- perilaku antar fungsi tidak seragam,
- gejala intermittency tinggi walau sebagian request berhasil.

---

## 3. Prinsip Desain (Invariants)

1. **Server source of truth:** context attachment aktif harus disimpan server-side per conversation.
2. **Single send pipeline:** semua kiriman user lewat helper tunggal, tidak boleh ada jalur text-only tersembunyi.
3. **Deterministic effective context:** `effectiveFileIds` dihitung dengan aturan yang konsisten.
4. **UI reflect server state:** chip di composer dan bubble menampilkan state yang sama dengan context aktif.
5. **Clear semantics:** user bisa clear context secara eksplisit.

---

## 4. Proposed Architecture

## 4.1 Data Model Baru (Convex)

Tambahkan table baru: `conversationAttachmentContexts`

Field minimum:
- `conversationId: Id<"conversations">` (unique index)
- `userId: Id<"users">`
- `activeFileIds: Id<"files">[]`
- `updatedAt: number`
- `updatedByMessageId?: Id<"messages">`

Index:
- `by_conversation` (unique lookup by conversation)
- `by_user_conversation` (auth safety)

Kenapa table baru:
- tidak mencampur concern ke table `conversations`,
- mudah audit/migration/rollback,
- lifecycle attachment context jelas.

## 4.2 Effective Context Resolution

Di `/api/chat`, tentukan `effectiveFileIds`:

1. Jika body kirim `fileIds` non-empty -> pakai body, lalu update `activeFileIds`.
2. Jika body kirim `clearAttachmentContext: true` -> `effectiveFileIds = []`, lalu clear server context.
3. Jika body kosong dan `inheritAttachmentContext !== false` -> fallback ke `activeFileIds` dari table context.

Default perilaku: `inheritAttachmentContext = true`.

## 4.3 Unified Client Send Pipeline

Buat satu helper pusat di `ChatWindow`, misalnya `sendUserMessageWithContext`.

Semua flow wajib lewat helper ini:
- submit dari chat input,
- template select,
- approve/revise auto-message,
- edit-resend.

Helper input:
- `text`
- `mode: "replace" | "inherit" | "clear"`
- optional `explicitFileIds`
- optional `files` (image parts)

Helper output request body:
- `fileIds`
- `inheritAttachmentContext`
- `clearAttachmentContext`

Dengan ini tidak ada lagi jalur text-only yang bypass attachment context.

## 4.4 Image + Document Strategy (Durable)

- **Document (pdf/docx/xlsx/pptx/txt):** tetap lewat extraction text + fileContext injection.
- **Image (png/jpg/webp/gif):** masuk `activeFileIds` juga (agar konsisten di chip/context),
  lalu server tentukan bagaimana diteruskan ke model:
  - fase 1 aman: image tetap dikirim dari client `files` saat message awal,
  - fase 2 durable: server bisa resolve image storage URL untuk reuse lintas turn (opsional setelah fase 1 stabil).

Catatan: target immediate durability fokus dokumen dulu (karena kebutuhan isi file), image tetap tampil sebagai context aktif.

## 4.5 UI Contract

Composer harus menampilkan `activeAttachments` dari server context (bukan hanya local transient).

State minimum di client:
- `draftAttachments` (perubahan lokal sebelum send),
- `activeAttachments` (sinkron dari server),
- merge policy: setelah send sukses -> refresh `activeAttachments` dari server.

Bubble user:
- render chip dari persisted message metadata (`fileIds + fileNames + fileSizes + fileTypes`),
- optimistic annotations hanya fallback singkat.

## 4.6 Edit-Resend Contract

Edit payload wajib bawa metadata attachment dari message yang diedit.

Server path:
- truncate message sesuai flow sekarang,
- kirim ulang sebagai message baru,
- context update mengikuti rules `replace/inherit/clear`.

Expected: attachment tidak hilang setelah edit-resend.

---

## 5. API Contract Changes

`POST /api/chat` body extension:

```ts
{
  messages: UIMessage[]
  conversationId: string
  fileIds?: string[]
  inheritAttachmentContext?: boolean // default true
  clearAttachmentContext?: boolean // default false
}
```

Rules:
- `clearAttachmentContext === true` mengabaikan `fileIds` dan memaksa kosong.
- jika `fileIds` ada -> validasi owner + simpan ke active context.
- jika `fileIds` tidak ada -> fallback ke active context bila `inheritAttachmentContext !== false`.

---

## 6. Failure Modes + Guardrails

1. **Race upload vs send:** extraction belum selesai.
   - Guard: route polling tetap (max 8s) + status pending message.
2. **Client lupa kirim fileIds:**
   - Guard: server fallback ke active context.
3. **Stale UI chip:**
   - Guard: hydrate composer dari server context setiap send selesai + saat load conversation.
4. **Cross-conversation leak:**
   - Guard: context table strict by `conversationId` + `userId` auth check.
5. **Token bloat karena context panjang:**
   - Guard: tetap pakai caps existing (`MAX_FILE_CONTEXT_CHARS_PER_FILE`, total cap).

---

## 7. Rollout Strategy

1. Tambah data layer + API fallback (tanpa ubah UI dulu).
2. Migrasi client ke unified send pipeline.
3. Migrasi composer ke active server context.
4. Tambah tombol clear context.
5. Jalankan regression matrix local + preview deployment.

---

## 8. Definition of Durable Done

- Semua jalur kirim user memakai helper send tunggal.
- `fileIds` tidak lagi bergantung penuh pada state lokal momentary.
- Attachment context tetap aktif lintas message, lintas edit-resend, lintas refresh.
- Ada aksi clear context eksplisit.
- Test anti-regresi lulus di local dan preview.
