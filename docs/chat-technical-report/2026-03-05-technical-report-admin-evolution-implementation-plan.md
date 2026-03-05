# Technical Report Admin Evolution - Implementation Plan

> Basis dokumen: `2026-03-05-technical-report-admin-evolution-design-doc.md`

## Strategi Eksekusi

Rilis dibagi dua fase:

1. **Fase 1 (Implement Now)**: Admin tab + status workflow + email otomatis.
2. **Fase 2 (Next)**: Integrasi AI triage (context envelope + prompt generator).

Dokumen ini fokus eksekusi detail untuk Fase 1, dengan backlog terstruktur untuk Fase 2.

---

## Fase 1 - Admin Workflow + Email

### Task 1: Extend Schema for Admin Workflow

**Files:**

- Modify: `convex/schema.ts`

**Changes:**

1. Pastikan `technicalReports.status` tetap `open|triaged|resolved`.
2. Tambah table baru `technicalReportEvents`:
   - `reportId`
   - `actorUserId` (optional)
   - `eventType`
   - `fromStatus` (optional)
   - `toStatus` (optional)
   - `recipient` (optional)
   - `payload` (optional)
   - `createdAt`
3. Tambah index:
   - `by_report_created`
   - `by_event_created`

**Verification:**

- `npx convex codegen`
- `npm run typecheck`

---

### Task 2: Convex API for Admin List, Detail, and Status Update

**Files:**

- Modify: `convex/technicalReports.ts`

**Changes:**

1. Tambah query admin-only:
   - `listForAdmin`
   - `getDetailForAdmin`
   - `listEventsByReport`
2. Tambah mutation admin-only:
   - `updateStatusByAdmin`
3. Aturan mutation:
   - validasi role admin/superadmin
   - reject jika report tidak ditemukan
   - jika status berubah:
     - patch report (`status`, `updatedAt`, `resolvedAt`, `resolvedBy`)
     - insert event `status_changed`
     - schedule email notify internal action

**Verification:**

- `npm run typecheck`

---

### Task 3: Email Notification Pipeline (All Status Events)

**Files:**

- Modify: `convex/technicalReports.ts`
- Modify: `convex/authEmails.ts`

**Changes:**

1. Tambah helper email baru di `authEmails.ts`:
   - `sendTechnicalReportDeveloperNotification(...)`
   - `sendTechnicalReportUserNotification(...)`
2. Tambah internal actions:
   - `notifyTechnicalReportCreated`
   - `notifyTechnicalReportStatusChanged`
3. Event `created` dan `status_changed` harus kirim email ke:
   - `dukungan@makalah.ai`
   - email user pelapor
4. Jika email gagal:
   - jangan rollback status/report
   - tulis event `email_failed`
5. Jika email sukses:
   - tulis event `email_sent`

**Verification:**

- test manual trigger event created + status changed
- cek console/error log tidak memblokir alur utama

---

### Task 4: Admin UI - New Sidebar Tab and Content

**Files:**

- Modify: `src/components/admin/adminPanelConfig.ts`
- Modify: `src/components/admin/AdminContentSection.tsx`
- Create: `src/components/admin/TechnicalReportManager.tsx`

**Changes:**

1. Tambah tab sidebar:
   - id: `technical-report`
   - label: `Technical Report`
2. Render `TechnicalReportManager` pada `activeTab === "technical-report"`.
3. `TechnicalReportManager` minimal berisi:
   - cards summary
   - filter status/source/search
   - table list report
   - detail drawer
   - status action buttons (`Pending/Proses/Selesai`)
   - timeline event log

**Verification:**

- buka `/dashboard?tab=technical-report`
- pastikan tab desktop + mobile sidebar berfungsi

---

### Task 5: UX Mapping for Status Labels

**Files:**

- Create/Modify: `src/components/admin/TechnicalReportStatusBadge.tsx` (jika dipisah)
- Modify: `src/components/admin/TechnicalReportManager.tsx`

**Changes:**

1. Mapping UI:
   - `open` -> `Pending`
   - `triaged` -> `Proses`
   - `resolved` -> `Selesai`
2. Konsisten di:
   - table column
   - filter dropdown
   - detail header
   - email subject/body

**Verification:**

- manual cek konsistensi label lintas UI dan email

---

### Task 6: Tests and Regression

**Files:**

- Create: `__tests__/technical-report-admin-status.test.ts`
- Create: `__tests__/technical-report-email-events.test.ts`

**Test Minimum:**

1. admin dapat update status report.
2. non-admin ditolak.
3. event `status_changed` tercatat.
4. event email sukses/gagal tercatat.
5. created event juga memicu email pipeline.

**Global Checks:**

1. `npm run typecheck`
2. `npm run test`

---

### Task 7: Manual QA Checklist (Fase 1)

1. User submit report baru dari chat/support.
2. Admin buka tab `Technical Report`, report muncul.
3. Admin ubah status ke `Proses`, email terkirim ke developer + user.
4. Admin ubah status ke `Selesai`, email terkirim ke developer + user.
5. Simulasi failure email (mis. env key kosong): status tetap berubah, event `email_failed` tercatat.

---

## Fase 2 - AI Triage (Backlog Siap Eksekusi)

### Task A: Knowledge Base + Context Envelope

1. Buat skema `incident context envelope` versioned.
2. Simpan `kbVersion` pada setiap hasil AI.

### Task B: AI Summary + Investigation Prompt

1. Generate:
   - ringkasan masalah
   - hipotesis + confidence
   - missing data
   - calon prompt investigasi untuk engineer/Codex
2. Output diberi label `AI-generated`.

### Task C: Guardrails Anti-Halusinasi

1. Wajib evidence references.
2. Wajib `insufficient_data` saat bukti kurang.
3. Dilarang auto-update status dari AI.

### Task D: AI UI Integration

1. Tambah section AI di detail report.
2. Tombol `Regenerate`.
3. Tombol `Copy Investigation Prompt`.

---

## Definition of Done Fase 1

1. Tab `Technical Report` aktif untuk admin/superadmin.
2. Admin bisa lihat list + detail + timeline event.
3. Status report bisa diubah via UI admin.
4. Email terkirim ke `dukungan@makalah.ai` dan user untuk semua event status.
5. Bila email gagal, alur utama tetap sukses dan kegagalan tercatat.
6. Seluruh checks (`typecheck`, `test`) lulus.
