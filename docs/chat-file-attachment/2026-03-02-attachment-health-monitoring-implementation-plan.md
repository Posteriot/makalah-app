# Attachment Health Monitoring Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `subagent-driven-development` atau `executing-plans` untuk implementasi bertahap.

**Goal:** Menambahkan observability attachment health di `/ai-ops` tanpa mengganggu pipeline attachment yang sudah stabil.

**Architecture:** Tambah telemetry attachment terpisah (`attachmentTelemetry`) yang ditulis dari `/api/chat`, lalu expose agregasi via query `convex/aiOps.ts`, dan render panel baru di `/ai-ops`.

**Tech Stack:** Next.js 16 (App Router), Convex, React, TypeScript.

---

## Prakondisi (Wajib)
- [ ] Branch kerja: `.worktrees/attachment-monitoring` (`attachment-monitoring`).
- [ ] Main baseline attachment tetap terkunci (jangan ubah behavior send/upload/context existing).
- [ ] `.env.local` sudah tersedia di worktree.
- [ ] `npm install` selesai di worktree.

## Task 0: Lock Baseline Safety

**Files:**
- Verify only: `src/components/chat/ChatWindow.tsx`
- Verify only: `src/components/chat/ChatInput.tsx`
- Verify only: `src/app/api/chat/route.ts`
- Verify only: `src/app/api/extract-file/route.ts`

**Step 1:** Jalankan smoke test manual 6 format (PDF, TXT, DOCX, XLSX, PPTX, image).

**Step 2:** Pastikan tidak ada perubahan perilaku:
- `effective fileIds` tetap benar.
- Dokumen tetap menghasilkan `fileContext` saat extraction sukses.
- Message bubble explicit/inherit tetap konsisten.

**Definition of done:** baseline stabil sebelum menambah monitoring.

## Task 1: Tambah Schema Telemetry Attachment

**Files:**
- Modify: `convex/schema.ts`

**Step 1:** Tambah tabel `attachmentTelemetry` + indeks:
- `by_created`
- `by_health_created`
- `by_conversation_created`
- `by_env_created`

**Step 2:** Regenerate Convex types jika diperlukan.

**Step 3:** Validasi compile schema.

**Definition of done:** schema baru aktif tanpa mengubah tabel existing.

## Task 2: Tambah Mutation Logging Attachment

**Files:**
- Modify: `convex/aiOps.ts` atau file baru `convex/attachmentTelemetry.ts`

**Step 1:** Implement mutation `logAttachmentTelemetry` (server-side ingest).

**Step 2:** Validasi data minimal:
- `requestId`, `userId`, `conversationId`, `createdAt`
- `healthStatus`
- metrik counts/chars

**Step 3:** Tambah guard agar payload invalid ditolak (safe validation).

**Definition of done:** endpoint mutation siap dipanggil dari chat route.

## Task 3: Instrumentasi `/api/chat` ke Telemetry Attachment

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1:** Hitung metrik runtime attachment dari data yang sudah ada:
- request/effective fileIds
- count dokumen vs image
- extraction status counts
- `docContextChars`
- mode + resolution reason

**Step 2:** Implement classifier `healthStatus` sesuai design doc.

**Step 3:** Kirim log via mutation Convex secara best-effort (non-blocking user response).

**Step 4:** Tambah `console.warn` jika log gagal (tanpa throw).

**Definition of done:** setiap request attachment menghasilkan record telemetry yang konsisten.

## Task 4: Query Agregasi untuk Dashboard AI Ops

**Files:**
- Modify: `convex/aiOps.ts`

**Step 1:** Tambah query `getAttachmentHealthOverview({ requestorUserId, period })`.

**Step 2:** Tambah query `getAttachmentRecentFailures({ requestorUserId, limit })`.

**Step 3:** Tambah query breakdown format/env untuk troubleshooting parity local vs vercel.

**Step 4:** Pastikan semua query admin-only.

**Definition of done:** data siap dipakai panel UI.

## Task 5: Integrasi Tab Baru di `/ai-ops`

**Files:**
- Modify: `src/components/ai-ops/aiOpsConfig.ts`
- Modify: `src/components/ai-ops/AiOpsContentSection.tsx`

**Step 1:** Tambah tab group `attachment` dengan child:
- `attachment.overview`
- `attachment.failures`

**Step 2:** Wire query Convex pada tab terkait (pakai `skip` pattern seperti panel existing).

**Definition of done:** navigasi AI Ops punya area monitoring attachment.

## Task 6: Buat Panel UI Monitoring Attachment

**Files:**
- Create: `src/components/ai-ops/panels/AttachmentOverviewPanel.tsx`
- Create: `src/components/ai-ops/panels/AttachmentFailuresPanel.tsx`

**Step 1:** `AttachmentOverviewPanel`
- ringkasan health, failed, processing, throughput
- format/env breakdown

**Step 2:** `AttachmentFailuresPanel`
- list failure terbaru + reason + timestamp
- empty/loading states konsisten dengan panel lain

**Definition of done:** panel readable untuk observability harian.

## Task 7: Testing dan Validasi Anti-Regresi

**Files:**
- Create: `__tests__/ai-ops/attachment-health-overview.test.ts`
- Create: `__tests__/ai-ops/attachment-failures-query.test.ts`
- Update (jika perlu): test chat attachment existing

**Step 1:** Unit test classifier `healthStatus`.

**Step 2:** Test query agregasi:
- overview
- recent failures
- env breakdown

**Step 3:** Regression manual matrix attachment (6 format) untuk pastikan fitur existing aman.

**Definition of done:** monitoring jalan dan attachment flow tidak regress.

## Task 8: Dokumentasi

**Files:**
- Modify: `docs/chat-file-attachment/README.md`
- Create: `docs/chat-file-attachment/2026-03-02-attachment-health-monitoring-runbook.md`

**Step 1:** Tambah section "Attachment Health Monitoring" di README.

**Step 2:** Runbook troubleshooting:
- arti status `healthy/degraded/failed/processing/unknown`
- langkah investigasi saat `failed` naik

**Definition of done:** tim ops bisa pakai dashboard + runbook tanpa baca kode.

---

## Checklist Eksekusi
- [ ] Schema + mutation telemetry selesai.
- [ ] Instrumentation `/api/chat` aktif.
- [ ] Query Convex AI Ops untuk attachment tersedia.
- [ ] Tab + panel UI attachment tampil di `/ai-ops`.
- [ ] Test baru pass.
- [ ] Regression matrix attachment existing pass.
- [ ] README + runbook update.

## Guardrails Implementasi
1. Jangan sentuh logic inti kirim attachment kecuali untuk read-only instrumentation.
2. Jangan ubah kontrak UI explicit/inherit yang sudah stabil.
3. Logging failure tidak boleh memblokir respons chat.
4. Hindari menyimpan raw isi dokumen di telemetry.
