# Conversation-Scoped Attachment Context Regression Checklist

Date: 2026-03-01
Scope: local + preview deployment

## Prasyarat

- Node runtime local: `20.x`
- Vercel runtime: `20.x`
- Build berhasil (`npm run build`)
- Convex schema terbaru sudah ter-deploy (table `conversationAttachmentContexts`)

## Matrix File Format

1. `txt`
2. `docx`
3. `pptx`
4. `xlsx`
5. `pdf`
6. `png/jpg/webp`

## Matrix Flow Wajib

1. Upload file + kirim teks (`"."` valid)
2. Follow-up 3 turn tanpa re-attach
3. Edit pesan user terakhir + resend
4. Refresh halaman
5. Clear attachment context
6. Kirim pesan baru setelah clear (harus tanpa context attachment)

## Expected Result per Flow

1. Upload + send
- `POST /api/chat` harus membawa effective `fileIdsLength > 0` di diag route.
- Chip tampil di bubble user.
- Untuk dokumen: `fileContextLength > 0`.

2. Follow-up tanpa re-attach
- Request body boleh tanpa `fileIds`, tapi diag `effective fileIdsLength` tetap > 0 (inherit).
- Model tetap mengenali dokumen yang sama.

3. Edit + resend
- Request resend harus mempertahankan attachment metadata.
- Chip tetap tampil setelah resend.
- Tidak ada split perilaku “text terkirim tapi attachment hilang”.

4. Refresh halaman
- Composer harus memuat ulang chip dari server context aktif.
- Bubble history tetap render chip dari persisted `fileIds`.

5. Clear attachment context
- Tombol `Clear` di composer menghapus chip composer.
- Follow-up send berikutnya tidak membawa effective `fileIds`.

6. Setelah clear
- Model tidak lagi menganggap dokumen lama masih aktif.

## Negative Cases

1. Attachment tanpa teks
- Tombol send disabled.
- Jika dipaksa via API, route mengembalikan `400` (`Attachment membutuhkan teks pendamping minimal 1 karakter.`).

2. File extraction pending
- Route tetap polling sampai 8 detik.
- Bila timeout: context menampilkan status pending, bukan silent fail.

## Observability Log Yang Dicek

1. `[ATTACH-DIAG][route] request body`
2. `[ATTACH-DIAG][route] effective fileIds`
3. `[ATTACH-DIAG][route] context result`

## Final Gate

Semua kombinasi format + flow di atas harus hijau di:

1. Local dev
2. Vercel preview
