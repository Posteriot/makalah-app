# Waitlist Admin Email Notifications — Design

**Date:** 2026-02-20
**Status:** Approved

## Problem

Saat calon user mendaftar waiting list, status berubah (pending → invited → registered), admin/superadmin hanya bisa melihat perubahan di dashboard `/dashboard/waitlist`. Tidak ada notifikasi email ke admin, sehingga admin harus aktif membuka dashboard untuk mengetahui aktivitas waitlist.

## Solution

Centralized notification action yang mengirim email ke semua admin dan superadmin saat terjadi 3 event waitlist:
1. **new_registration** — User baru mendaftar waiting list
2. **invited** — Admin mengirim undangan ke user
3. **registered** — User yang diundang berhasil mendaftar akun

## Architecture

```
[Event Trigger]              [Centralized Action]           [Email]

register()         ─┐
  (mutation)        │
                    ├──►  notifyAdminsWaitlistEvent()  ──►  sendViaResend()
sendInviteEmail()   │       (internalAction)                 → all admins
  (action)          │
                    │
createAppUser()   ──┘
  (mutation)
```

## Recipients

Email dikirim ke gabungan `SUPERADMIN_EMAILS` + `ADMIN_EMAILS` env vars (deduplicated).

## File Changes

| File | Change |
|------|--------|
| `convex/authEmails.ts` | + `sendWaitlistAdminNotification()` — email sender with 3 template variants |
| `convex/waitlist.ts` | + `notifyAdminsWaitlistEvent` internalAction, + scheduler call in `register`, + direct call in `sendInviteEmail` |
| `convex/users.ts` | + scheduler call after `markWaitlistRegistered()` returns true |

## Trigger Mechanisms

| Event | Location | Mechanism |
|-------|----------|-----------|
| `new_registration` | `waitlist.register` | `ctx.scheduler.runAfter(0, ...)` |
| `invited` | `waitlist.sendInviteEmail` | Direct call (already action context) |
| `registered` | `users.createAppUser` | `ctx.scheduler.runAfter(0, ...)` (only when markWaitlistRegistered returns true) |

## Email Templates

Subject patterns:
- `[Waitlist] Pendaftar Baru: {nama} ({email})`
- `[Waitlist] Undangan Terkirim: {nama} ({email})`
- `[Waitlist] Registrasi Selesai: {nama} ({email})`

Body: Minimal industrial-style (Mechanical Grace), includes nama, email, timestamp, link ke dashboard.

## Edge Cases

- Empty env vars → skip silently
- Email send failure → log warning, don't throw (not critical path)
- Duplicate admin emails → dedupe before sending
- `markWaitlistRegistered` needs to return boolean to signal notification trigger
