# Attachment Monitoring

Dokumentasi ini menjelaskan sistem monitoring kesehatan attachment file di Chat, khusus untuk observabilitas operasional (bukan perubahan perilaku user-facing flow).

## Tujuan

1. Memastikan pipeline attachment (upload -> extract/inject -> dipakai model) bisa dipantau secara konsisten.
2. Memudahkan deteksi anomali lintas format file dan lintas environment (`local` vs `vercel`).
3. Menyediakan dasar investigasi cepat saat user melaporkan "file tidak terbaca model".

## Cakupan Monitoring

Monitoring mencakup request chat yang mengandung sinyal attachment:

1. `fileIds` explicit dari client.
2. Context attachment yang di-inherit dari conversation state server.
3. Operasi clear/replace context attachment.

Output monitoring:

1. Ringkasan health rate attachment.
2. Breakdown format/kategori file (dokumen vs gambar).
3. Breakdown environment runtime.
4. Daftar request degraded/failed terbaru.

## Definisi Metrik Utama

Metrik utama yang dipakai dashboard adalah **file-only health rate (dokumen + gambar)**.

Formula:

`healthy_rate = healthy_count / file_request_count`

Keterangan:

1. `file_request_count`: hanya request yang benar-benar melibatkan file (`docFileCount + imageFileCount > 0`).
2. Request chat tanpa file tidak masuk denominator.
3. Image-only dihitung `healthy` karena jalurnya native multimodal (tanpa extraction teks dokumen).

## Definisi Status Health

1. `healthy`
   - Request ber-file siap dipakai model.
   - Dokumen sukses terinjeksi context, atau image-only delivered dengan benar.
2. `degraded`
   - Parsial: ada yang siap, tapi sebagian dokumen pending/gagal.
3. `failed`
   - Request ber-file tidak menghasilkan context dokumen usable.
4. `processing`
   - Dokumen masih pending saat request diproses.
5. `unknown`
   - Tidak ada file efektif pada request.

## Arsitektur Data Monitoring

Sumber utama:

1. `src/app/api/chat/route.ts`
   - Menghitung hasil resolusi attachment (effective file IDs, extraction counters, chars context).
   - Melakukan logging telemetry secara best-effort (non-blocking).
2. `convex/attachmentTelemetry.ts`
   - Mutation `logAttachmentTelemetry` untuk menyimpan event observabilitas.
3. `convex/schema.ts`
   - Tabel `attachmentTelemetry`.
4. `convex/aiOps.ts`
   - Query agregasi untuk AI Ops:
     - `getAttachmentHealthOverview`
     - `getAttachmentFormatBreakdown`
     - `getAttachmentEnvBreakdown`
     - `getAttachmentRecentFailures`

## Dashboard AI Ops

Lokasi:

1. `/ai-ops` -> `Attachment Health` -> `Ringkasan`
2. `/ai-ops` -> `Attachment Health` -> `Kegagalan`

Hak akses:

1. Hanya role `admin`/`superadmin`.

Panel:

1. Ringkasan:
   - `totalRequests`
   - `fileRequestCount`
   - `healthy/degraded/failed/processing/unknown`
   - `healthyRate/failedRate/processingRate`
2. Distribusi:
   - total dokumen
   - total gambar
   - request dengan dokumen/gambar
3. Environment:
   - local/vercel/unknown
4. Failure list:
   - status, failure reason, mode, reason, extraction S/P/F, request id.

## Prinsip Keamanan Data

1. Telemetry tidak menyimpan raw `extractedText`.
2. Telemetry menyimpan metrik operasional (count/status/char-length), bukan isi dokumen user.
3. Query monitoring tetap mengikuti otorisasi admin.

## Cara Baca Anomali

1. `failed` naik + `docContextChars` rendah:
   - indikasi extractor gagal atau context injection tidak terjadi.
2. `processing` naik tinggi:
   - indikasi latency extraction meningkat.
3. Gap besar `local` sehat vs `vercel` gagal:
   - indikasi parity runtime/dependency deployment.
4. `degraded` dominan:
   - indikasi partial success (sebagian file sehat, sebagian tidak).

## Checklist Verifikasi Cepat

1. Upload dan kirim 1 file per format utama:
   - PDF, DOCX, XLSX, PPTX, TXT, image.
2. Cek log route:
   - `[ATTACH-DIAG][route] request body`
   - `[ATTACH-DIAG][route] effective fileIds`
   - `[ATTACH-DIAG][route] context result`
3. Cek dashboard `/ai-ops`:
   - angka `fileRequestCount` bertambah
   - status health sesuai hasil request terbaru
4. Ulangi skenario `inherit` dan `clear context` untuk memastikan klasifikasi tetap konsisten.

## Limitasi

1. Monitoring ini mengukur readiness pipeline attachment, bukan akurasi semantik jawaban model.
2. `healthy` tidak berarti jawaban model pasti "benar", hanya berarti data attachment berhasil masuk jalur yang semestinya.
3. `unknown` bisa valid untuk chat tanpa file, jadi harus dibaca bersama `fileRequestCount`.

## Referensi Dokumen Terkait

1. `docs/chat-file-attachment/README.md`
2. `docs/chat-file-attachment/2026-03-02-attachment-health-monitoring-design.md`
3. `docs/chat-file-attachment/2026-03-02-attachment-health-monitoring-implementation-plan.md`
4. `docs/chat-file-attachment/2026-03-02-attachment-health-monitoring-runbook.md`
