# Handoff: Restore Naskah & Pratinjau Feature

**Baca ini PERTAMA sebelum melakukan apapun.**

## Apa yang Terjadi

Button "Pratinjau" di TopBar chat hilang. Fitur naskah (preview halaman paper) secara tidak sengaja terhapus saat merge conflict resolution di commit `9491dadb` (20 Apr 2026). Claude di sesi sebelumnya resolve conflict dengan membuang sisi naskah karena main sudah di-revert (`4435ea0b`).

Tidak ada bug fundamental. CI pass, Vercel deploy sukses. Ini murni conflict resolution error.

## Apa yang Harus Dilakukan

1. Baca context & rules di `context.md`
2. Eksekusi Fase 1 di `phase-1.md` (Tasks 1–7, standalone files)
3. Eksekusi Fase 2 di `phase-2.md` (Tasks 8–10, shared files)
4. E2E verification di `e2e-verification.md` (Task 11)
5. Referensi audit fixes di `audit-fixes-summary.md`

Semua file ada di direktori ini (`docs/rebuild-naskah/`).

**Gunakan skills & tools berikut:**
- **`superpowers:executing-plans`** — Skill utama untuk eksekusi plan task-by-task dengan review checkpoints
- **`superpowers:subagent-driven-development`** — Dispatch fresh subagent per task, review antar task
- **Agent tool (subagent dispatch)** — Dispatch `feature-dev:code-reviewer` atau `feature-dev:code-architect` di setiap akhir task untuk audit hasil. Tunggu PASS sebelum lanjut ke task berikutnya
- **Parallel agent dispatch** — Tasks di Fase 1 yang independent (Task 1 & 2) bisa di-dispatch paralel via multiple Agent tool calls dalam satu message

## File yang Harus Dibaca

1. **Context & rules:** `context.md` — cardinal rule, protected systems, checkpoint protocol
2. **Memory:** Baca `project_naskah_restore_cardinal_rule.md` di memory — cardinal rule: naskah yields to existing system

## Source of Truth

Commit `5c6f385b` — semua file naskah di-restore dari commit ini via `git show`.

## Hal Kritis yang TIDAK BOLEH Dilanggar

1. **Naskah TIDAK BOLEH merusak sistem existing.** Cancel, approve, rewind, choice card, artifact ordering, search — semua harus tetap jalan. Jika rusak → revert naskah, bukan fix sistem.
2. **Try-catch di 4 rebuild call sites.** `rebuildNaskahSnapshot` di `paperSessions.ts` HARUS wrapped try-catch. Jangan pernah bare await.
3. **Per-task checkpoint.** Setiap task selesai → STOP → dispatch audit agent → tunggu PASS → baru lanjut. Jangan skip.
4. **Fase 1 dulu, Fase 2 kemudian.** Jangan loncat ke shared files sebelum semua standalone files selesai dan typecheck clean.
5. **Regex fix B1.** Tiga file punya `/^[a-z0-9]{32}$/` yang SALAH — harus diganti `conversationId.length > 0`. Sudah ditandai di plan.

## Urutan Eksekusi

```
FASE 1 — STANDALONE (zero risk)
  Task 1:  schema.ts          → 2 new tables
  Task 2:  src/lib/naskah/    → 8 new files
  Task 3:  convex/naskah*.ts  → 2 new files
  Task 4:  useNaskah.ts       → 1 new file
  Task 5:  components/naskah/ → 9 new files
  Task 6:  app/naskah/        → 4 new files
  Task 7:  next.config.ts     → 1 line additive
  ─── CHECKPOINT: typecheck + dev server ───

FASE 2 — SHARED FILES (one at a time, audit between each)
  Task 8:  TopBar.tsx          → replace file
  Task 9:  ChatLayout.tsx      → hooks + props + test mocks
  Task 10: paperSessions.ts    → 4x try-catch rebuild (HIGHEST RISK)
  ─── E2E VERIFICATION ───

  Task 11: Full verification
```

## Jangan Lakukan

- Jangan baca seluruh codebase — plan sudah punya semua info
- Jangan modifikasi kode existing di luar yang ditulis di plan
- Jangan skip audit checkpoint demi kecepatan
- Jangan bare `await rebuildNaskahSnapshot()` tanpa try-catch
- Jangan lanjut ke task berikutnya kalau audit belum PASS
