# Technical Support Chat - README

## 1) Tujuan
Dokumen ini menjelaskan implementasi fitur **Technical Support / Technical Report** untuk kendala di area chat, mencakup:
- cara user melapor dari chat dan non-chat,
- alur data report dari UI ke backend,
- alur notifikasi email ke developer dan user,
- alur admin memproses status laporan,
- inventori file yang terlibat.

Dokumen ini diposisikan sebagai konteks utama sebelum pengembangan lanjutan.

## 2) Scope Fitur Saat Ini
### Sudah diimplementasikan
- Form laporan teknis untuk masalah chat.
- Entry point laporan dari:
1. banner/overlay error di halaman chat (auto-trigger + tombol report),
2. halaman support `/support/technical-report`,
3. menu `Lapor Masalah` di footer dan dropdown user.
- Progress laporan di halaman support (status timeline user sendiri).
- Tab admin `Technical Report` untuk list, detail, filter, dan update status.
- Status workflow: `open` -> `triaged` -> `resolved`.
- Email di semua event penting status (ke `dukungan@makalah.ai` dan ke email user).
- Fallback API route ketika fungsi Convex belum tersedia.

### Belum diimplementasikan
- AI triage/analyzer untuk merangkum masalah, membuat hipotesis, confidence, dan candidate prompt investigasi.
- Integrasi knowledge base/envelope AI insiden.

## 3) Alur End-to-End
### 3.1 Entry point laporan
1. User melihat kendala pada chat.
2. Sistem menampilkan warning + tombol `Lapor Masalah` saat trigger error terpenuhi.
3. User juga bisa melapor dari:
- footer (`source=footer-link`),
- dropdown user (`source=support-page`),
- halaman support.

### 3.2 Submit report
1. Form memvalidasi deskripsi dan snapshot.
2. Client submit ke mutation `technicalReports.submitTechnicalReport`.
3. Jika Convex function belum tersedia, client fallback ke API `POST /api/support/technical-report`.

### 3.3 Persist + event + email
1. Report masuk ke table `technicalReports` dengan status awal `open`.
2. Event awal `created` masuk ke `technicalReportEvents`.
3. Scheduler memicu notifikasi email:
- email developer,
- email user.

### 3.4 Proses admin
1. Admin buka `/dashboard?tab=technical-report`.
2. Admin filter/list/detail report.
3. Admin ubah status (`open|triaged|resolved`).
4. Event `status_changed` dicatat.
5. Email update status dikirim ke developer dan user.

## 4) Trigger Otomatis di Chat
Trigger tombol report otomatis dinyalakan jika salah satu kondisi true:
1. `chatStatus === "error"`,
2. `searchStatus === "error"` dari stream `data-search`,
3. ada `toolStates` dengan state `error` atau `output-error`.

Catatan:
- kasus quota rejection dipisahkan dari auto-trigger technical report.

## 5) Model Data
### `technicalReports`
Field utama:
- `userId`, `scope`, `source`, `status`,
- `description`, `issueCategory?`,
- `conversationId?`, `paperSessionId?`,
- `contextSnapshot?`,
- `createdAt`, `updatedAt`, `resolvedAt?`, `resolvedBy?`.

### `technicalReportEvents`
Field utama:
- `reportId`, `actorUserId?`,
- `eventType` (`created|status_changed|email_sent|email_failed`),
- `fromStatus?`, `toStatus?`,
- `recipient?`, `payload?`,
- `createdAt`.

## 6) Auth, Akses, dan Routing
- Query/mutation report user dilindungi `requireAuthUser`.
- Akses admin dilindungi kombinasi:
1. `requireAuthUser`,
2. `requireRole(..., "admin")`.
- Link footer `Lapor Masalah`:
1. jika login -> langsung ke `/support/technical-report?source=footer-link`,
2. jika belum login -> ke `/sign-in?redirect_url=...`.
- `redirectAfterAuth` sudah whitelist path support agar redirect selesai ke halaman target setelah login.

## 7) Email dan Notifikasi
### 7.1 Kanal email
- Developer support: `dukungan@makalah.ai`
- Sender: `noreply@makalah.ai`

### 7.2 Event email
- Saat report dibuat.
- Saat status diubah admin.

Jika email gagal:
- event `email_failed` tetap dicatat,
- alur utama report/status tetap lanjut.

## 8) Fallback Saat Convex Belum Sinkron
Jika client menerima error `Could not find public function for 'technicalReports:submitTechnicalReport'`:
1. hook client pindah ke fallback API route,
2. fallback route tetap kirim email developer + user,
3. response sukses mengembalikan `reportId` pseudo `fallback-<uuid>`.

## 9) Environment Variable Penting
- `RESEND_API_KEY` (wajib untuk pengiriman email).
- `APP_URL` atau `SITE_URL` (base URL di link email/dashboard/support).

## 10) Daftar File Terlibat
Berikut inventori file implementasi fitur ini (berdasarkan pengembangan branch `feat/chat-technical-report` dan dokumen pendukung).

### 10.1 Backend Convex
- `convex/schema.ts`
- `convex/technicalReports.ts`
- `convex/authEmails.ts`
- `convex/_generated/api.d.ts`

### 10.2 API Route Fallback
- `src/app/api/support/technical-report/route.ts`

### 10.3 Chat + Trigger + Snapshot
- `src/components/chat/ChatWindow.tsx`
- `src/lib/technical-report/chatSnapshot.ts`
- `src/lib/technical-report/payload.ts`
- `src/lib/technical-report/searchStatus.ts`
- `src/lib/technical-report/submitFallback.ts`
- `src/lib/hooks/useTechnicalReport.ts`
- `src/components/technical-report/ChatTechnicalReportButton.tsx`
- `src/components/technical-report/TechnicalReportForm.tsx`
- `src/components/technical-report/TechnicalReportProgressSection.tsx`
- `src/components/technical-report/index.ts`

### 10.4 Halaman Support
- `src/app/(dashboard)/support/technical-report/page.tsx`

### 10.5 Entry Point Navigasi Non-Chat
- `src/components/layout/footer/Footer.tsx`
- `src/components/layout/footer/README.md`
- `src/components/layout/header/UserDropdown.tsx`
- `src/components/layout/header/GlobalHeader.tsx`
- `src/lib/utils/redirectAfterAuth.ts`

### 10.6 Admin Panel Technical Report
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/components/admin/AdminPanelContainer.tsx`
- `src/components/admin/adminPanelConfig.ts`
- `src/components/admin/AdminContentSection.tsx`
- `src/components/admin/TechnicalReportManager.tsx`
- `src/components/admin/TechnicalReportStatusBadge.tsx`

### 10.7 File Pendukung Chat Stream (dependency terkait status/data error)
- `src/app/api/chat/route.ts`
- `src/components/chat/MessageBubble.tsx`
- `src/lib/ai/internal-thought-separator.ts`

### 10.8 Test Coverage
- `__tests__/chat-technical-report-snapshot.test.ts`
- `__tests__/technical-report-admin-status.test.tsx`
- `__tests__/technical-report-email-events.test.ts`
- `__tests__/technical-report-form.test.tsx`
- `__tests__/technical-report-payload.test.ts`
- `src/lib/technical-report/searchStatus.test.ts`
- `src/lib/technical-report/submitFallback.test.ts`
- `src/lib/utils/redirectAfterAuth.test.ts`
- `src/components/chat/MessageBubble.search-status.test.tsx`
- `src/components/chat/MessageBubble.internal-thought.test.tsx`
- `__tests__/api/chat-internal-thought-separation.test.ts`
- `src/lib/ai/internal-thought-separator.test.ts`

### 10.9 Dokumen Design/Plan/QA di Folder Ini
- `docs/chat-technical-report/design-doc.md`
- `docs/chat-technical-report/2026-03-05-chat-technical-report-implementation-plan.md`
- `docs/chat-technical-report/2026-03-05-model-behavior-chat-paper-session-design.md`
- `docs/chat-technical-report/2026-03-05-model-behavior-chat-paper-session-implementation-plan.md`
- `docs/chat-technical-report/2026-03-05-technical-report-admin-evolution-design-doc.md`
- `docs/chat-technical-report/2026-03-05-technical-report-admin-evolution-implementation-plan.md`
- `docs/chat-technical-report/2026-03-05-task-6-qa-notes.md`

## 11) Catatan Guardrail Pengembangan Lanjutan
Sebelum masuk fase AI triage:
1. pertahankan alur manual report/status/email yang sudah stabil,
2. jangan biarkan AI auto-update status report,
3. pastikan setiap output AI punya evidence reference dan fallback `insufficient_data`,
4. versioning untuk context envelope wajib sejak awal implementasi fase AI.
