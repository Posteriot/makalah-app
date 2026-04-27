# Validation Panel Cancellation — Investigation & Design Notes

## Status: DEFERRED
- **Ditemukan di:** Stage 1 (gagasan), round 3 — setelah fix cancel choice card
- **Prioritas:** Medium — UX gap, bukan data corruption
- **Scope:** Stage transition lifecycle, bukan bug dari fix session ini

---

## Problem 1: Cancel Approval Tidak Muncul (atau Muncul Terlambat)

### Gejala
Setelah user klik "Setuju & Lanjutkan" di validation panel, tidak ada tombol cancel (↩) di bubble `[Approved:]` yang muncul.

### Root Cause
`cancelableApprovalMessageId` di `ChatWindow.tsx:1855-1869` punya dua gate:

```typescript
const isNormalApproval = paperSession.stageStatus === "drafting"
const isFinalApproval = paperSession.currentStage === "completed" && paperSession.stageStatus === "approved"
if (!isNormalApproval && !isFinalApproval) return null
```

**Gate 1 — `isNormalApproval`:** `stageStatus === "drafting"`. Tapi setelah approval, `stageStatus` berubah ke `"approved"` lalu stage advance. Stage baru dimulai dengan `stageStatus === "drafting"`, tapi `[Approved:]` message milik stage lama. Jadi kondisi terpenuhi... **namun hanya sementara** — begitu Convex subscription sync, timing bisa race.

**Gate 2 — 30-second throttle** (`MessageBubble.tsx:1266-1268`):
```typescript
const messageAge = messageCreatedAt ? Date.now() - messageCreatedAt : 0
const throttled = !messageCreatedAt || messageAge < 30_000
const cancelAllowed = !isStreaming && !throttled
```
Cancel approval hanya muncul **setelah 30 detik** dari pembuatan message `[Approved:]`. Ini design decision untuk mencegah accidental cancel, tapi efeknya: user tidak pernah melihat cancel karena setelah 30 detik, stage baru sudah berjalan.

### File terkait
- `ChatWindow.tsx:1855-1869` — `cancelableApprovalMessageId` useMemo
- `MessageBubble.tsx:1264-1300` — approval cancel button render + throttle
- `ChatWindow.tsx` — `handleCancelApproval` handler (search `handleCancelApproval`)
- `convex/paperSessions.ts` — `unapproveStage` mutation (line ~843)

---

## Problem 2: Choice Card Cancel Hilang Setelah Approval

### Gejala
Semua choice card di stage sebelumnya kehilangan tombol cancel begitu user approve (klik "Setuju & Lanjutkan").

### Root Cause
`cancelableChoiceMessageIds` di `ChatWindow.tsx:1837-1850` scan backward dan **break** saat ketemu `[Approved:]`:

```typescript
if (text.startsWith("[Approved:") || text.startsWith("[Revisi untuk")) break
```

Begitu ada `[Approved:]` message di history, scan berhenti. Semua `[Choice:]` sebelum `[Approved:]` tidak masuk Set — cancel button hilang.

### Apakah ini benar?
**Secara desain, ya.** Approval adalah boundary — artinya stage sudah disepakati. Cancel choice di stage yang sudah di-approve tidak masuk akal karena:
1. Stage sudah advance
2. Data stage baru mungkin sudah di-generate
3. Cancel choice di stage lama akan orphan data stage baru

**Tapi user expectation-nya berbeda** — user mungkin ingin undo approval itu sendiri, bukan undo choice di dalam stage lama.

---

## Problem 3: Cancel Approval Icon Invisible di Light Mode

### Gejala
Sama dengan cancel choice — icon pakai `--chat-warning-foreground` yang white di kedua mode.

### Fix
Sama dengan fix `b7fac669` untuk choice cancel — ganti ke `--chat-muted-foreground`.

### File
`MessageBubble.tsx:1278`:
```typescript
style={{ color: "var(--chat-warning-foreground, var(--chat-muted-foreground))" }}
```
Harus diganti ke:
```typescript
style={{ color: "var(--chat-muted-foreground)" }}
```

---

## Solusi yang Diusulkan

### Opsi A: Enable Cancel Approval dengan Confirmation Dialog (Recommended)

**Apa yang berubah:**
1. **Hapus 30-second throttle** — ganti dengan confirmation dialog (seperti yang sudah ada di cancel choice)
2. **Perluas gate condition** — `cancelableApprovalMessageId` juga return ID saat `stageStatus === "approved"` (bukan hanya `"drafting"`)
3. **Backend `unapproveStage`** sudah ada — cek apakah handler-nya revert stage transition dengan benar
4. **Tambah confirmation dialog** di approval cancel button — teks: "Batalkan Persetujuan? Stage akan kembali ke validasi. Semua progres di stage berikutnya akan hilang."

**Dampak:**
- `cancelableApprovalMessageId` gate logic perlu di-relax
- Throttle 30s dihapus, diganti dialog
- `unapproveStage` di Convex perlu di-audit: apakah sudah handle revert stage transition + clear data stage baru
- Confirmation dialog perlu teks yang jelas karena scope lebih besar dari cancel choice

**Risiko:**
- Kalau stage baru sudah punya artifact/stageData, unapprove harus clear itu juga — atau user kehilangan data tanpa sadar
- Race condition: model mungkin sedang streaming response untuk stage baru saat user cancel approval

### Opsi B: Remove Cancel Approval Entirely

**Rationale:** Approval adalah keputusan final per stage. Kalau user salah approve, mereka bisa revise di stage berikutnya atau gunakan rewind feature.

**Dampak:** Simpler, tapi user kehilangan escape hatch kalau klik approve terlalu cepat.

### Opsi C: Time-windowed Cancel (Improve Current 30s Throttle)

**Apa yang berubah:**
1. **Invert throttle** — cancel hanya available dalam 30 detik pertama (bukan setelah 30 detik)
2. **Tambah visual countdown** — "Batalkan (25s)" yang countdown sampai 0, lalu hilang
3. **Tidak perlu dialog** — window 30s sudah cukup mencegah accidental click

**Dampak:** Sederhana, tapi user harus cepat. Dan kalau mereka baru sadar setelah 30 detik, terlambat.

### Rekomendasi: Opsi A

Opsi A paling konsisten dengan cancel choice yang sudah pakai dialog. User punya control penuh. Dialog mencegah accidental cancel. Backend `unapproveStage` sudah ada.

---

## Backend Reference: `unapproveStage`

```
convex/paperSessions.ts:843 — unapproveStage mutation
```

**Perlu di-audit:**
1. Apakah revert `currentStage` ke stage sebelumnya?
2. Apakah revert `stageStatus` ke `pending_validation`?
3. Apakah clear data di stage baru yang mungkin sudah mulai di-generate?
4. Apakah increment `decisionEpoch` untuk invalidate in-flight operations?
5. Apakah handle artifact yang sudah di-create di stage baru?

---

## Implementation Checklist (untuk sesi fix nanti)

- [ ] Audit `unapproveStage` backend mutation — verify revert logic
- [ ] Relax `cancelableApprovalMessageId` gate — allow cancel saat `stageStatus === "approved"`
- [ ] Remove 30-second throttle dari approval cancel
- [ ] Add confirmation dialog (Dialog component, same pattern as cancel choice)
- [ ] Dialog teks: "Batalkan Persetujuan? Stage akan kembali ke validasi. Progres di stage berikutnya akan hilang. Tindakan ini tidak dapat dikembalikan."
- [ ] Fix icon color: `--chat-muted-foreground` (same fix as `b7fac669`)
- [ ] Test: approve → cancel approval → verify stage reverts correctly
- [ ] Test: approve → stage baru mulai generate → cancel approval → verify no orphan data
- [ ] Test: cancel approval di light mode dan dark mode

---

## Hubungan dengan Choice Card Cancel

| Aspek | Choice Cancel | Approval Cancel |
|-------|--------------|-----------------|
| **Scope** | Revert 1 pilihan dalam stage | Revert seluruh stage transition |
| **Data loss** | Pesan setelah choice dihapus | Potensial: data stage baru hilang |
| **Backend** | `cancelChoiceDecision` | `unapproveStage` |
| **Dialog** | Sudah ada (commit `f708eff9`) | Belum ada |
| **Boundary** | `[Approved:]` stops collection | N/A — approval adalah boundary itu sendiri |
| **Fix di session ini** | `0c291edf` (Set), `9e231968` (dedupe), `f708eff9` (dialog) | Belum di-fix |
