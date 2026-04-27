# Partial Failure in Sequential unapproveStage Loop

## Masalah

`handleCancelChoice` (ChatWindow.tsx ~line 2575) dan `handleCancelApproval` (ChatWindow.tsx ~line 2697) melakukan cross-stage rollback dengan memanggil `unapproveStage` secara berurutan dalam loop:

```typescript
for (let j = 0; j < totalUnapprovals; j++) {
    await unapproveStage({ sessionId: paperSession._id, userId })
}
```

Jika `unapproveStage` throw di iterasi ke-N (misal call ke-2 dari 3), state Convex sudah partially rolled back (N-1 approval sudah revert) tapi sisanya belum. UI dan backend tidak sinkron:
- Convex session sudah mundur N-1 stage
- UI masih menampilkan state sebelum cancel (karena catch block menangkap error)
- Message truncation (`editAndTruncate` + `setMessages`) belum dijalankan

## Konteks

- `unapproveStage` (paperSessions.ts ~line 866) throw di 2 kondisi: `stageStatus === "revision"` dan `getPreviousStage()` return null (stage paling awal). Kedua kondisi ini secara teori impossible dalam flow cancel karena:
  - Status selalu `"pending_validation"` setelah setiap unapprove call
  - Earliest stage (gagasan) hanya tercapai jika loop berjalan dengan benar
- Pola ini identik di kedua handler (choice cancel dan approval cancel)
- Sudah live sejak commit `19e7e473` (choice card cross-stage rollback) tanpa laporan kegagalan

## File Terkait

- `src/components/chat/ChatWindow.tsx` — `handleCancelChoice` (~line 2575), `handleCancelApproval` (~line 2697)
- `convex/paperSessions.ts` — `unapproveStage` mutation (~line 866)

## Severity

Non-blocking edge case. Tidak pernah terjadi di production. Ditemukan saat code quality review di sesi 2026-04-20.
