# Technical Report Admin Evolution - Design Doc

Status: Draft v1  
Owner: Admin Operations + Chat Reliability  
Last Updated: 2026-03-05

## Ringkasan

Dokumen ini mendefinisikan pengembangan lanjutan fitur `technical report` menjadi alur operasional admin.

Pengembangan dibagi 2 fase:

1. Fase 1 (eksekusi sekarang): Admin tab `Technical Report` + detail report + update status + notifikasi email ke developer dan user di semua status.
2. Fase 2 (lanjutan): Integrasi AI triage yang terstruktur dan aman (anti-halusinasi).

## Tujuan

1. Admin/superadmin bisa memproses laporan teknis chat langsung dari dashboard.
2. User mendapat transparansi status laporan via email.
3. Tim internal (`dukungan@makalah.ai`) mendapat notifikasi otomatis untuk semua perubahan status.
4. Menyiapkan fondasi data untuk AI triage fase berikutnya tanpa mengganggu alur inti.

## Non-Goal

1. Tidak membangun sistem ticketing eksternal penuh (Zendesk/Jira) di fase ini.
2. Tidak mengaktifkan AI auto-resolution atau auto-status.
3. Tidak mengganti entry point user report yang sudah berjalan.

## Scope Fase 1

### 1) Admin Tab Baru

Tambahkan tab `Technical Report` di `/dashboard` admin panel.

Hak akses:

- `admin` dan `superadmin` saja.

### 2) Konten Tab

View utama:

1. Ringkasan metrik:
   - Total report
   - Pending
   - Proses
   - Selesai
2. Filter:
   - status
   - source (`chat-inline`, `footer-link`, `support-page`)
   - kata kunci (report ID / email / deskripsi)
3. Tabel report:
   - report ID
   - waktu dibuat
   - user email
   - ringkasan deskripsi
   - source
   - status
4. Detail panel (drawer/modal):
   - deskripsi lengkap user
   - issue category (jika ada)
   - context snapshot (sanitized)
   - reference conversation/paper session (jika ada)
   - riwayat perubahan status

### 3) Workflow Status

Label UI:

- `Pending`
- `Proses`
- `Selesai`

Persistensi DB (tetap pakai enum existing):

- `Pending` -> `open`
- `Proses` -> `triaged`
- `Selesai` -> `resolved`

Aturan:

1. Report baru default `Pending/open`.
2. Admin bisa ubah status kapan saja antar tiga status.
3. Perubahan status menulis audit event.

### 4) Notifikasi Email (Wajib Semua Status)

Email dikirim saat:

1. Report baru dibuat (status awal `Pending/open`).
2. Status berubah ke `Proses/triaged`.
3. Status berubah ke `Selesai/resolved`.
4. Jika status diubah kembali (mis. `resolved` ke `triaged`), tetap kirim email event terbaru.

Penerima:

1. `dukungan@makalah.ai`
2. email user pelapor

Template:

- Sederhana dulu (subject + status + reportId + timestamp + ringkasan + link dashboard/support).

Reliability rule:

- Pengiriman email dijalankan async (scheduler/action), tidak boleh memblokir update status.

### 5) Data Model Tambahan

Tetap gunakan tabel utama `technicalReports`, dan tambahkan audit trail:

1. `technicalReportEvents` (table baru):
   - `reportId`
   - `actorUserId` (nullable untuk event sistem)
   - `eventType` (`created`, `status_changed`, `email_sent`, `email_failed`)
   - `fromStatus` (opsional)
   - `toStatus` (opsional)
   - `recipient` (opsional)
   - `payload` (opsional, sanitized)
   - `createdAt`

Alasan:

- Menjaga jejak status + bukti notifikasi tanpa mengotori tabel report utama.

### 6) API Contract Fase 1

File target: `convex/technicalReports.ts`

Tambahan API:

1. `listForAdmin` (query, admin-only, support filter + pagination)
2. `getDetailForAdmin` (query, admin-only)
3. `updateStatusByAdmin` (mutation, admin-only)
4. `listEventsByReport` (query, admin-only)
5. `notifyTechnicalReportCreated` (internalAction)
6. `notifyTechnicalReportStatusChanged` (internalAction)

Flow kirim email:

1. Saat submit user sukses -> schedule `notifyTechnicalReportCreated`.
2. Saat admin update status sukses -> schedule `notifyTechnicalReportStatusChanged`.

## Scope Fase 2 (Roadmap AI)

### AI Triage Assistant di Detail Report

Output AI sebagai bantuan baca, bukan pengambil keputusan:

1. Ringkasan masalah
2. Hipotesis awal + confidence
3. Missing data
4. Calon prompt investigasi untuk dikirim ke Codex/engineer

Guardrail wajib:

1. AI tidak boleh auto-ubah status.
2. AI wajib menampilkan basis evidence yang dipakai.
3. Jika evidence kurang, output harus `insufficient_data`.
4. Semua output AI diberi label `AI-generated`.

Input fase 2 wajib pakai context envelope versioned (knowledge base + runtime context).

## Security & Compliance

1. Semua API admin wajib `requireRole(..., "admin")`.
2. Snapshot di detail harus tetap sanitized (tanpa isi chat penuh, token, cookie).
3. Email tidak boleh menyertakan data sensitif.
4. Semua perubahan status punya audit event.

## Acceptance Criteria Fase 1

1. Tab `Technical Report` muncul di admin dashboard.
2. Admin bisa lihat list + detail report.
3. Admin bisa ubah status (`Pending/Proses/Selesai`).
4. Setiap status event mengirim email ke `dukungan@makalah.ai` dan user pelapor.
5. Jika email gagal, status tetap tersimpan dan failure tercatat di event log.
6. UI menampilkan riwayat status dari event log.

## Open Items (Untuk Konfirmasi Sebelum Implementasi)

1. Status baru `Pending/Proses/Selesai` disepakati sebagai label UI final.
2. Subject email memakai prefix tetap: `[Technical Report]`.
3. Link di email internal diarahkan ke `/dashboard?tab=technical-report`.
4. Link di email user diarahkan ke `/support/technical-report` (riwayat user bisa fase berikutnya).
