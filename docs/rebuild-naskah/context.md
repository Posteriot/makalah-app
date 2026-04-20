# Restore Naskah & Pratinjau — Context & Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> **Plan files:** `phase-1.md` → `phase-2.md` → `e2e-verification.md`. Execute in that order.
> **Audit fixes:** See `audit-fixes-summary.md` for all blocker/risk items.

**Goal:** Restore the Naskah preview feature (Pratinjau button in TopBar + full `/naskah/:id` route) that was accidentally lost during merge conflict resolution in commit `9491dadb`.

**Architecture:** Surgical restore from commit `5c6f385b` into the current HEAD. Two-phase execution: standalone files first (zero risk), shared files last (controlled risk).

**Tech Stack:** Convex, Next.js App Router, React, pdfkit, docx

**Source of truth:** Commit `5c6f385b` — the last commit with naskah code intact.

**Restoration mechanism:** All "restore verbatim" steps MUST use `git show 5c6f385b:<path>` to extract the exact file content. Do NOT reconstruct from memory or description.

**Audit status:** Audited 2026-04-20 by 3 independent agents. 3 blockers fixed (B1: Convex ID regex, B2: test mock gap, B3: try-catch rebuild). See `[AUDIT FIX]` markers in phase files. Full summary in `audit-fixes-summary.md`.

### Cardinal Rule: Naskah Yields to Existing System

Naskah adalah fitur read-only preview yang di-restore ke sistem yang sudah berjalan dan stabil. Berlaku prinsip:

1. **Naskah yang ngalah, bukan sistem existing.** Jika ada tension, naskah yang harus beradaptasi.
2. **Additive only di shared files.** Menambah tanpa mengubah atau menghapus kode yang sudah jalan.
3. **Naskah failure = silent log, bukan rollback.** Semua `rebuildNaskahSnapshot` calls di-wrap try-catch.
4. **Jika naskah menyebabkan bug di sistem existing → revert naskah code, bukan fix sistem.**
5. **Schema additive only.** Tabel baru saja, tabel existing tidak disentuh.

**Protected systems (MUST NOT be disrupted):**
- Cancellation of confirmed choice card (`cancelChoiceDecision`)
- Cancellation of validated validation panel (`unapproveStage`)
- Prompt-driven rollback/rewind (`rewindToStage`)
- Stage approval flow (`approveStage`)
- Artifact ordering (must appear last)
- Choice card enforcement (every turn)
- Search orchestration pipeline

---

### Execution Strategy: 2 Phases + Per-Task Checkpoint

**Fase 1 — Standalone:** Tasks 1–7 membuat file baru tanpa mengubah satu baris pun kode existing. Error di fase ini hanya terdampak ke naskah.

**Fase 2 — Shared Files:** Tasks 8–10 sentuh kode existing satu-satu. Urutan by design: TopBar (paling isolated) → ChatLayout (wiring + test) → paperSessions (paling berisiko, terakhir).

**Task 11 (E2E Verification)** setelah kedua fase selesai.

### Mandatory Per-Task Checkpoint Protocol

**Setiap task — tanpa kecuali — HARUS diakhiri dengan:**

1. **STOP.** Jangan langsung lanjut ke task berikutnya.
2. **Dispatch audit agent** (`feature-dev:code-reviewer` atau `feature-dev:code-architect`) untuk review hasil task yang baru selesai. Audit scope:
   - Fase 1: verifikasi file baru tidak introduce type error, import cycle, atau dependency yang hilang.
   - Fase 2: verifikasi kode existing TIDAK berubah behavior. Semua protected systems (lihat daftar di atas) harus tetap intact.
3. **Tunggu audit selesai.** Baca hasilnya. Jika ada RISK atau FAIL → perbaiki sebelum lanjut.
4. **Baru lanjut** ke task berikutnya setelah audit PASS.

Jangan skip checkpoint ini demi kecepatan. Setiap task yang lolos tanpa audit adalah potensi bug tersembunyi yang menumpuk.

**Fase 1 checkpoint tambahan:** Setelah Task 7 selesai (semua standalone tasks), jalankan full typecheck + dev server sebelum masuk Fase 2. Jika error, fix TANPA sentuh shared files. Jika tidak bisa → STOP, eskalasi ke user.

**Fase 2 checkpoint tambahan:** Setelah setiap task, verifikasi fitur existing (chat page load, approve, cancel, rewind) masih bekerja. Jika ada regresi → `git checkout <shared-file>` immediately, jangan debug.

---

## Execution Order Summary

```
FASE 1 — STANDALONE (zero risk) → phase-1.md
  Task 1:  schema.ts          → 2 new tables (additive)
  Task 2:  src/lib/naskah/    → 8 new files (pure lib)
  Task 3:  convex/naskah*.ts  → 2 new files (backend)
  Task 4:  useNaskah.ts       → 1 new file (hook)
  Task 5:  components/naskah/ → 9 new files (UI)
  Task 6:  app/naskah/        → 4 new files (routes)
  Task 7:  next.config.ts     → 1 line additive
  ─── CHECKPOINT: typecheck + dev server ───

FASE 2 — SHARED FILES (controlled risk) → phase-2.md
  Task 8:  TopBar.tsx          → replace file (1 caller, optional props)
  Task 9:  ChatLayout.tsx      → add hooks + props + test mocks
  Task 10: paperSessions.ts    → 4x try-catch rebuild (LAST, highest risk)
  ─── E2E VERIFICATION → e2e-verification.md ───

  Task 11: Full verification
```


