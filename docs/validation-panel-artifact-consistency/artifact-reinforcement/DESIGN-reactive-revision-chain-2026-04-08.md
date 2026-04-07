# Design: Reactive Revision Chain — Hapus Regex, Model Detect, Harness Enforce

**Date:** 2026-04-08
**Branch:** `validation-panel-artifact-consistency`
**Status:** Pending approval
**Supersedes:** Revision-specific parts of `DESIGN-artifact-lifecycle-chat-revision-2026-04-07.md` (sections on `revisionIntentPattern` and `shouldForceRequestRevision`)

---

## 1. Problem Statement

Artifact revision via chat gagal di SEMUA stage. Model output teks revisi ke chat instead of updating artifact melalui tool chain.

### Root Cause — Terbukti dari Code

**Dua bug deterministic bekerja bersama:**

#### Bug 1: `maxToolSteps` dicuri oleh exact source routing

`shouldApplyDeterministicExactSourceRouting` (route.ts:2736-2740) TIDAK exclude `shouldForceRequestRevision`. Ketika kedua sistem aktif bersamaan:

- `prepareStep`: revision chain menang (via `??`) ✓
- `maxToolSteps`: exact source routing menang (1-2) ❌ — override revision's 5

Line 2913: `stopWhen: stepCountIs(primaryExactSourceRoutePlan.maxToolSteps ?? maxToolSteps)` — exact source's `maxToolSteps` (1-2) selalu defined, jadi revision's `maxToolSteps` (5) gak pernah tercapai.

Collision terjadi karena `EXACT_SOURCE_PATTERNS` (exact-source-followup.ts:27-40) overlap dengan vocabulary revisi natural:
- `/\bparagraf\b/` — "ganti paragraf kedua" = revision intent, tapi exact source system treat sebagai source inspection request
- `/\bjudul\b/` — "ubah judul" = revision intent, same collision
- `/\bkutip(?:an)?\b/` — "perbaiki kutipan" = revision intent, same collision

#### Bug 2: Regex adalah satu-satunya gerbang ke chain forcing

`shouldForceRequestRevision` (route.ts:2633-2638) HANYA true kalau `revisionIntentPattern` regex match. Kalau regex miss (user bilang "bikin lebih akademis" — gak ada keyword revisi):
- Gak ada forcing sama sekali
- Model bebas output teks
- Exact source routing bisa take over dan force `inspectSourceDocument`

#### 3 failure paths, semua terbukti di code:

| # | Kondisi | Apa yang terjadi |
|---|---------|-----------------|
| 1 | Regex match + exact source keyword collision | `maxToolSteps` = 1-2, chain terpotong setelah `requestRevision` |
| 2 | Regex miss | Gak ada forcing, model bisa output teks |
| 3 | Regex miss + exact source aktif | Model dipaksa `inspectSourceDocument` instead of revision tools |

---

## 2. Design Principle

**Model yang detect intent, harness yang enforce chain setelah model commit.**

- Regex gak bisa tangkap semantic intent. "Bikin lebih akademis" = revision intent tapi gak ada keyword.
- Model sudah di-instruksikan via `pendingNote` dan 14 skill files untuk detect revision intent dan call `requestRevision`.
- Masalah bukan model gak cerdas — masalah harness menghalangi kecerdasan model.
- Harness seharusnya ENFORCE commitment (setelah model call `requestRevision`, paksa chain selesai), bukan DETECT intent (itu kerja model).

---

## 3. Changes

### 3.1 Hapus: Regex Intent Detection + Forcing Logic

**Hapus total dari `src/app/api/chat/route.ts`:**

| Item | Location | Apa |
|------|----------|-----|
| `revisionIntentPattern` | ~line 2629 | Regex detection |
| `shouldForceRequestRevision` declaration | ~line 2060 | Variable |
| `shouldForceRequestRevision` assignment | ~lines 2633-2641 | Regex test + console.info |
| `forcedToolChoice` revision branch | ~lines 2687-2688 | `toolChoice: { type: "tool", toolName: "requestRevision" }` |
| `maxToolSteps` revision branch | ~lines 2694-2695 | `shouldForceRequestRevision ? 5` |
| `revisionChainPrepareStep` | ~lines 2701-2716 | Entire prepareStep builder |
| Fallback `forcedToolChoice` revision branch | ~line 3556-3557 | Same in fallback streamText |

**Total: ~40 lines removed.**

### 3.2 Tambah: Reactive `revisionChainEnforcer`

**Di `src/app/api/chat/route.ts`, gantikan `revisionChainPrepareStep`:**

```typescript
// Reactive chain enforcer — only active during pending_validation.
// Does NOT detect intent. Model decides freely at step 0.
// After model commits to revision (calls requestRevision), harness
// enforces the full chain deterministically.
const revisionChainEnforcer = paperSession?.stageStatus === "pending_validation"
  ? ({ steps, stepNumber }: {
      steps: Array<{ toolCalls?: Array<{ toolName: string }> }>;
      stepNumber: number;
    }) => {
      if (stepNumber === 0) return undefined // Model bebas

      const prevStep = steps[stepNumber - 1]
      const prevToolNames = prevStep.toolCalls?.map(tc => tc.toolName) ?? []

      // After requestRevision → force next tool call
      if (prevToolNames.includes("requestRevision")) {
        return { toolChoice: "required" as const }
      }
      // After updateStageData → force next tool call
      if (prevToolNames.includes("updateStageData")) {
        return { toolChoice: "required" as const }
      }
      // After updateArtifact/createArtifact → force submitStageForValidation
      if (prevToolNames.includes("updateArtifact") || prevToolNames.includes("createArtifact")) {
        return {
          toolChoice: { type: "tool", toolName: "submitStageForValidation" } as const,
        }
      }

      return undefined
    }
  : undefined
```

**Behavior per step:**

| Step | Prev Tool | Action | Alasan |
|------|-----------|--------|--------|
| 0 | — | `undefined` (model bebas) | Model detect intent sendiri |
| 1 | `requestRevision` | `"required"` | Model committed to revision, harus lanjut |
| 1 | bukan revision tool | `undefined` | Model diskusi atau call tool lain — bebas |
| 2 | `updateStageData` | `"required"` | Lanjut ke updateArtifact |
| 2 | `updateArtifact` | force `submitStageForValidation` | Chain harus selesai |
| 3 | `updateArtifact` | force `submitStageForValidation` | Chain harus selesai |
| 4+ | any | `undefined` | Selesai |

### 3.3 Tambah: Isolasi Exact Source Routing dari `pending_validation`

**Di `src/app/api/chat/route.ts`, tambah satu kondisi:**

```typescript
const shouldApplyDeterministicExactSourceRouting =
    !enableWebSearch &&
    !shouldForceGetCurrentPaperState &&
    !shouldForceSubmitValidation &&
    paperSession?.stageStatus !== "pending_validation" && // ← BARU
    availableExactSources.length > 0
```

**Efek:** Saat `pending_validation`:
- `shouldApplyDeterministicExactSourceRouting` = `false`
- `primaryExactSourceRoutePlan` = `{ messages, prepareStep: undefined, maxToolSteps: undefined }`
- `stopWhen: stepCountIs(undefined ?? maxToolSteps)` = `stepCountIs(5)` ✓
- Gak ada collision lagi

### 3.4 Komposisi di `streamText`

**Primary (line ~2912):**

Before:
```typescript
prepareStep: (revisionChainPrepareStep ?? primaryExactSourceRoutePlan.prepareStep ?? deterministicSyncPrepareStep)
```

After:
```typescript
prepareStep: (revisionChainEnforcer ?? primaryExactSourceRoutePlan.prepareStep ?? deterministicSyncPrepareStep)
```

**Fallback (line ~3610):** Same pattern — replace `revisionChainPrepareStep` with `revisionChainEnforcer`.

`toolChoice` line: remove revision branch, keep submit and sync branches:

Before:
```typescript
const forcedToolChoice = shouldForceSubmitValidation
    ? ({ type: "tool", toolName: "submitStageForValidation" } as const)
    : shouldForceRequestRevision
    ? ({ type: "tool", toolName: "requestRevision" } as const)
    : undefined
```

After:
```typescript
const forcedToolChoice = shouldForceSubmitValidation
    ? ({ type: "tool", toolName: "submitStageForValidation" } as const)
    : undefined
```

### 3.5 Yang TIDAK Berubah

| Komponen | Alasan tetap |
|----------|-------------|
| `pendingNote` prompt | Model butuh instruksi ini untuk detect intent |
| `revisionNote` prompt | Instruksi setelah status "revision" |
| `requestRevision` tool + mutation | Model call ini untuk commit ke revisi |
| Backend auto-rescue (`autoRescueRevision`) | Safety net kalau model skip `requestRevision` dan langsung call edit tool |
| `EXACT_SOURCE_PATTERNS` regex | Terisolasi — gak aktif saat `pending_validation` (Section 3.3) |
| Stale choice guard | Concern terpisah, sudah benar |
| Observability events | Semua event tetap fire dari mutation/tool layer |

---

## 4. Defense in Depth

Tiga layer pertahanan, masing-masing independen:

| Layer | Mekanisme | Menangkap apa |
|-------|-----------|--------------|
| **1. Prompt** | `pendingNote` + skill instructions | Model detect intent, call `requestRevision` |
| **2. Harness** | `revisionChainEnforcer` | Setelah model call `requestRevision`, chain gak bisa putus |
| **3. Backend** | `autoRescueRevision` | Model skip `requestRevision`, langsung call edit tool → backend auto-transition |

**Satu-satunya gap:** Model output teks revisi tanpa call tool apapun. Ini gap yang sama dengan regex approach (regex juga miss banyak intent), tapi TANPA side effect collision yang membunuh chain.

---

## 5. Files to Modify

| File | Changes |
|------|---------|
| `src/app/api/chat/route.ts` | Remove regex + forcing logic (~40 lines). Add `revisionChainEnforcer` (~25 lines). Add `pending_validation` exclusion to exact source routing (1 line). Update `forcedToolChoice` (remove revision branch). Apply to both primary and fallback streamText. |

**Total: 1 file, net reduction ~15 lines.**

---

## 6. Verification Plan

| Check | Evidence Required |
|-------|-------------------|
| Revision via chat works | User sends revision message during `pending_validation` → model calls `requestRevision` → `updateArtifact` → `submitStageForValidation`. Artifact updated, validation panel reappears. |
| Chain enforcement after commit | After `requestRevision`, model CANNOT output text — forced to continue chain. |
| Discussion still works | User sends question during `pending_validation` → model responds with text, no tools called. |
| Exact source routing unaffected outside pending | During `drafting` or other states, exact source routing works as before. |
| Backend auto-rescue still works | Model directly calls `updateArtifact` during `pending_validation` without `requestRevision` → backend auto-transitions to "revision". |
| No regression on first-pass flow | Choice card → artifact → validation panel flow unchanged. |
| Fallback model same behavior | Fallback streamText has identical enforcer logic. |
