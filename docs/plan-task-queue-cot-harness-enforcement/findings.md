# Findings — Post-Stabilization Runtime Test

> Findings dari runtime test setelah stabilization commit `d1cdac55`.

---

## Finding #1: UnifiedProcessCard Task Update Delay (~5 detik)

**Severity:** Medium (UX)
**Date:** 2026-04-02
**Status:** FIXED — commit `6a81ae16`
**Fix:** `appendSearchReferences` diubah dari fire-and-forget (`void`) ke `await`, sehingga stageData update sebelum stream close.

---

## Finding #2: Task Ordering Mismatch — Referensi Terisi Sebelum Eksplorasi Ide

**Severity:** Medium (UX + pedagogical flow)
**Date:** 2026-04-02
**Status:** FIXED — commit `6a81ae16`
**Fix:** `referensiAwal` dipindah ke posisi 1 di `STAGE_TASKS.gagasan` agar match actual flow (search auto-trigger persist refs duluan).

---

## Finding #3: Choice Card Tetap Interaktif Setelah Dikonfirmasi

**Severity:** Medium (UX)
**Date:** 2026-04-02
**Status:** Open — butuh deeper investigation
**Detail:** `submittedChoiceKeys` race condition antara live submit dan message state reset. Code identical dengan main tapi issue intermittent.

---

## Finding #4: Turbopack Persistent Cache Serve Code Lama

**Severity:** High (dev workflow)
**Date:** 2026-04-02
**Status:** FIXED — `.next` cache dihapus, root cause identified
**Fix:** `rm -rf .next` sebelum dev server start setelah major code changes via git. Turbopack persistent cache gak auto-invalidate saat files berubah via `git checkout`.

---

## Finding #5: Missing Choice Card Setelah Search — User Stuck

**Severity:** High (UX)
**Date:** 2026-04-02
**Status:** FIXED — commit `6a81ae16`
**Fix:** Prompt enforcement di `paper-mode-prompt.ts`: "MANDATORY: EVERY response MUST end with a yaml-spec interactive card". Berlaku untuk semua turns termasuk search result turns.

---

## Finding #6: Task Label Salah — "Definisikan judul" untuk Field `definitif`

**Severity:** Low (UX confusion)
**Date:** 2026-04-02
**Status:** FIXED — commit `d878a58a`
**Fix:** Label diubah ke "Rumuskan topik definitif" agar match isi artifact.

---

## Finding #7: Error Banner Stuck Selamanya Setelah Recovery

**Severity:** High (UX)
**Date:** 2026-04-02
**Status:** FIXED — commit `4bafb6b0`
**Fix:** `shouldShowTechnicalReportTrigger` return `false` saat `chatStatus` sudah `ready`/`streaming`/`submitted`. `resolveTechnicalReportSearchStatus` hanya cek last assistant message, bukan seluruh history.

---

## Finding #8: Missing `currentStage` Prop — UnifiedProcessCard Invisible

**Severity:** Critical (UI completely broken)
**Date:** 2026-04-02
**Status:** FIXED — commit `4bafb6b0`
**Fix:** Tambah `currentStage={paperSession?.currentStage}` prop ke MessageBubble di ChatWindow.tsx.

---

## Finding #9: Transient Convex Error Crash Tanpa Retry

**Severity:** Medium (reliability)
**Date:** 2026-04-02
**Status:** FIXED — commit `4bafb6b0`
**Fix:** `retryQuery` wrapper di `getMyUserId` call di route.ts.
