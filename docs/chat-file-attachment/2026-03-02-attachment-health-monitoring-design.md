# Attachment Health Monitoring Design (AI Ops)

## Ringkasan
Dokumen ini mendesain monitoring kesehatan attachment file (PDF, DOCX, XLSX, PPTX, TXT, image) di `/ai-ops` agar tim bisa melihat apakah pipeline attachment benar-benar sehat dari sisi request, context injection, dan hasil parsing dokumen.

## Masalah yang Ingin Diselesaikan
Saat ini sinyal attachment masih tersebar di log `ATTACH-DIAG` pada `/api/chat`. Efeknya:
- Sulit mengukur kesehatan attachment secara agregat.
- Sulit mendeteksi anomali intermittent (kadang sukses, kadang gagal).
- Sulit menjawab cepat: "model kemungkinan bisa baca file atau tidak".

## Goal
1. Menyediakan metrik attachment health di `/ai-ops` berbasis data terstruktur di Convex.
2. Menyediakan status inferensi "read-ready" untuk dokumen (bukan asumsi, berbasis sinyal pipeline).
3. Menyediakan daftar kegagalan terbaru dan drill-down per request.
4. Menjaga sistem existing tetap aman (tanpa mengubah behavior kirim attachment yang sudah stabil).

## Non-Goal
1. Tidak mengubah alur core upload/extraction/send yang sudah stabil.
2. Tidak menjamin pembuktian semantik 100% bahwa model "memahami" dokumen; monitoring fokus pada kesiapan konteks dan hasil extraction/injection.
3. Tidak menambah toggle fitur user-facing pada fase ini.

## Kondisi Kode Saat Ini (Baseline)
1. Attachment context dihitung di `src/app/api/chat/route.ts` melalui `resolveEffectiveFileIds`.
2. Dokumen diproses di `/api/extract-file` dan hasilnya disimpan pada tabel `files` (`extractionStatus`, `extractedText`).
3. `/ai-ops` memakai query Convex (`convex/aiOps.ts`, `convex/aiTelemetry.ts`) namun belum punya panel khusus attachment.

## Rekomendasi Arsitektur (Best)
Gunakan **tabel telemetry terpisah** untuk attachment, bukan menumpuk ke `aiTelemetry`.

Alasan:
1. Skema `aiTelemetry` saat ini fokus provider/tool/runtime AI dan sudah padat.
2. Attachment observability punya dimensi berbeda (effective fileIds, hasil extraction, context chars, mode explicit/inherit, dll).
3. Query dashboard attachment akan lebih sederhana dan murah kalau indeksnya spesifik.

## Model Data Baru
Tambahkan tabel `attachmentTelemetry` pada `convex/schema.ts`.

Field inti yang dicatat per request `/api/chat`:
- `requestId: string`
- `userId: Id<"users">`
- `conversationId: Id<"conversations">`
- `createdAt: number`
- `runtimeEnv: "local" | "vercel" | "unknown"`
- `requestedAttachmentMode: "explicit" | "inherit" | "none"`
- `resolutionReason: "clear" | "explicit" | "inherit" | "none"`
- `requestFileIdsLength: number`
- `effectiveFileIdsLength: number`
- `replaceAttachmentContext: boolean`
- `clearAttachmentContext: boolean`
- `docFileCount: number`
- `imageFileCount: number`
- `docExtractionSuccessCount: number`
- `docExtractionPendingCount: number`
- `docExtractionFailedCount: number`
- `docContextChars: number`
- `attachmentFirstResponseForced: boolean`
- `healthStatus: "healthy" | "degraded" | "failed" | "processing" | "unknown"`
- `failureReason: string | undefined`

Indeks minimum:
- `by_created`
- `by_health_created`
- `by_conversation_created`
- `by_env_created`

## Aturan Inferensi Health Status
Status dihitung server-side di `/api/chat` setelah evaluasi file context.

1. `unknown`
- Tidak ada attachment efektif (`effectiveFileIdsLength === 0`).
- Atau attachment image-only (karena tidak ada extraction text sebagai sinyal langsung).

2. `processing`
- Ada dokumen, namun masih `pending` saat request ini diproses.

3. `failed`
- Ada dokumen, dan semua dokumen gagal diproses.
- Atau ada dokumen, tetapi `docContextChars === 0` serta tidak ada dokumen sukses.

4. `degraded`
- Ada kombinasi sukses+gagal/pending (partial readiness).

5. `healthy`
- Ada dokumen, minimal satu `success`, dan `docContextChars > 0`.

Catatan: Ini adalah **read-readiness inference** untuk dokumen, bukan jaminan kualitas jawaban model.

## Integrasi ke AI Ops
### Navigasi
Tambah group baru di AI Ops:
- Parent: `Attachment Health`
- Child:
  - `attachment.overview`
  - `attachment.failures`

### Panel
1. `AttachmentOverviewPanel`
- Total request attachment
- Health rate (`healthy` / total dokumen)
- Processing rate
- Failed rate
- Distribusi format file
- Distribusi env (`local` vs `vercel`)

2. `AttachmentFailuresPanel`
- Daftar kegagalan terbaru
- Kolom: waktu, conversationId, reason, format ringkas, mode (explicit/inherit)

3. `AttachmentContextDrilldownPanel` (fase 1 opsional)
- Detail per conversation/request untuk forensik.

## Query Convex Baru
Tambahkan di `convex/aiOps.ts`:
1. `getAttachmentHealthOverview({ requestorUserId, period })`
2. `getAttachmentRecentFailures({ requestorUserId, limit })`
3. `getAttachmentFormatBreakdown({ requestorUserId, period })`
4. `getAttachmentEnvBreakdown({ requestorUserId, period })`

Semua query wajib admin guard (`requireRole`/assert admin).

## Logging Hook di Chat Route
Tambahkan helper logging non-blocking di `src/app/api/chat/route.ts`:
1. Kumpulkan metrik attachment setelah `effectiveFileIds` dan `fileContext` final tersedia.
2. Panggil mutation telemetry attachment (best-effort, jangan blok response chat).
3. Jika logging gagal, hanya `console.warn`, tidak mengganggu user flow.

## Security dan Privacy
1. Jangan simpan raw `extractedText` di telemetry.
2. Simpan hanya angka/ringkasan status dan ID.
3. UI AI Ops tetap admin/superadmin only.

## Rollout Plan
1. Tambah schema + mutation logging.
2. Tambah query agregasi.
3. Tambah panel UI + tab.
4. Validasi local dan vercel dengan test matrix attachment existing.

## Definisi Sukses
1. Tim bisa lihat health rate attachment di `/ai-ops` dalam 1 layar.
2. Tim bisa identifikasi failure reason tanpa buka raw server log.
3. Tidak ada regresi pada flow attachment yang sudah stabil.
