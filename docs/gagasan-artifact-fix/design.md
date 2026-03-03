# Design: Fix Artifact Generation di SEMUA Stage Paper Workflow

**Date:** 2026-03-04
**Branch:** `fix/gagasan-artifact-generation`
**Status:** Draft - Pending Approval

## Problem Statement

Pada paper writing workflow, AI model tidak pernah meng-generate artifact (via `createArtifact` tool) di **semua 13 stages**. Akibatnya, approval panel muncul tanpa artifact yang bisa di-review, edit, atau export oleh user.

Bug ini bersifat **sistemik** — bukan hanya stage gagasan, tapi semua stage terpengaruh oleh kombinasi 4 root causes.

## Root Cause Analysis

### Root Cause #1 (Primary): `shouldForceSubmitValidation` Bypass

**File:** `src/app/api/chat/route.ts:1908-1918`
**Affects:** ALL 13 stages

Ketika user mengkonfirmasi ("ok", "lanjut", "setuju") setelah AI menyimpan data via `updateStageData`:

1. Router mendeteksi: `hasStageRingkasan = true` + user confirmation
2. `shouldForceSubmitValidation = true`
3. `toolChoice` dipaksa ke `{ type: "tool", toolName: "submitStageForValidation" }` (line 1978)
4. AI **tidak bisa** memanggil `createArtifact` karena toolChoice memaksakan hanya `submitStageForValidation`
5. Bug ini ada di **dua tempat**: primary path (line 1978) DAN fallback path (line 3084)

**Flow buggy:**
```
Turn N:   AI → updateStageData(ringkasan + data) → "Bagaimana?"
Turn N+1: User → "ok, lanjut"
          Router → shouldForceSubmitValidation = true
          AI → submitStageForValidation() [FORCED]
          ❌ createArtifact NEVER CALLED
```

### Root Cause #2: `enforceArtifactSourcesPolicy` Block

**File:** `src/lib/ai/artifact-sources-policy.ts:20-37`
**Affects:** 6 ACTIVE search stages (gagasan, topik, pendahuluan, tinjauan_literatur, metodologi, diskusi) + potentially PASSIVE stages if `hasRecentSourcesInDb=true` dari web search stage sebelumnya

- Di ACTIVE stages, web search WAJIB (untuk referensi)
- Setelah web search, `hasRecentSourcesInDb = true`
- Policy mengharuskan `sources` parameter di `createArtifact` jika `hasRecentSourcesInDb = true`
- Instruksi stage TIDAK menyebutkan `sources` parameter di `createArtifact` call — **NONE of the 13 stages** currently include `sources` in their createArtifact example
- Kalaupun AI berhasil memanggil `createArtifact`, policy akan BLOCK tanpa `sources`

**PENTING:** `hasRecentSourcesInDb` bisa true di PASSIVE stages juga jika ada web search dari stage sebelumnya. Jadi `sources` requirement perlu di-communicate ke SEMUA stages, bukan hanya ACTIVE.

### Root Cause #3: Instruksi Hardcoded Tidak Cukup Eksplisit

**Files:**
- `src/lib/ai/paper-stages/foundation.ts` (gagasan line 99, topik line 225)
- `src/lib/ai/paper-stages/core.ts` (abstrak line 93, pendahuluan line 221, tinjauan_literatur line 350, metodologi line 468)
- `src/lib/ai/paper-stages/results.ts` (hasil line 99, diskusi line 223, kesimpulan line 337)
- `src/lib/ai/paper-stages/finalization.ts` (daftar_pustaka line 123, lampiran line 246, judul line 379, outline line 509)
- `src/lib/ai/paper-mode-prompt.ts` (general rule line 211)

**Affects:** ALL 13 stages

Instruksi hanya bilang `updateStageData + createArtifact` tanpa:
- Menjelaskan bahwa `createArtifact` HARUS dipanggil di turn yang SAMA
- Menjelaskan bahwa `createArtifact` HARUS include `sources` dari AVAILABLE_WEB_SOURCES jika ada
- Menjelaskan urutan: `createArtifact` HARUS SEBELUM `submitStageForValidation`
- **Tidak ada satu pun dari 13 stages yang include `sources` parameter** di contoh `createArtifact` mereka

### Root Cause #4: Skill System Tidak Enforce Artifact Creation

**Files:**
- `src/lib/ai/stage-skill-validator.ts:5-12, 116-233`
- `src/lib/ai/stage-skill-resolver.ts:110-116`
- `convex/stageSkills.ts:24-30`

**Affects:** Any stage with an active DB skill override

Dua masalah:

**4a. Validator tidak cek `createArtifact` mention:**
- `MANDATORY_SECTIONS` hanya cek 6 sections: Objective, Input Context, Tool Policy, Output Contract, Guardrails, Done Criteria
- TIDAK ada validasi bahwa Tool Policy section menyebutkan `createArtifact`
- `DEFAULT_ALLOWED_TOOLS` (line 24-30) include `"createArtifact"` tapi hanya metadata, tidak di-enforce

**4b. Resolver melakukan FULL REPLACEMENT, bukan append:**
- Line 111: `instructions: activeSkill.content` — skill content SEPENUHNYA menggantikan hardcoded instructions
- Hardcoded instructions (yang mention createArtifact) TIDAK di-append setelah skill content
- Bahkan jika validator fix ditambahkan, admin bisa menulis "Tool available: createArtifact (optional)" → lolos validator tapi AI tidak punya instruksi tegas
- **Ini design flaw struktural** — validator saja tidak cukup, perlu resolver-side enforcement

## Proposed Solution

### Fix #1: Tambah Guard `hasStageArtifact` di `shouldForceSubmitValidation`

**File:** `src/app/api/chat/route.ts`

Tambah helper `hasStageArtifact()` near line 870 (next to `hasStageRingkasan`):

```typescript
const hasStageArtifact = (session: {
    currentStage?: string
    stageData?: Record<string, unknown>
} | null): boolean => {
    if (!session?.stageData || !session.currentStage) return false;
    if (session.currentStage === "completed") return false;
    const data = session.stageData[session.currentStage] as Record<string, unknown> | undefined;
    return !!data?.artifactId;
};
```

Tambah guard di `shouldForceSubmitValidation` (line 1918):
```typescript
    && hasStageRingkasan(paperSession)
    && hasStageArtifact(paperSession)  // NEW
```

**Efek:** Ketika user konfirmasi tapi artifact belum ada, AI mendapat mode normal (semua function tools available) sehingga bisa memanggil `createArtifact` + `submitStageForValidation`.

### Fix #2: Inject System Note "Create Artifact Before Submit"

**File:** `src/app/api/chat/route.ts`

Ketika `shouldForceSubmitValidation` di-skip karena artifact belum ada, inject system note:

```typescript
const missingArtifactNote = !shouldForceSubmitValidation
    && !!paperModePrompt
    && hasStageRingkasan(paperSession)
    && !hasStageArtifact(paperSession)
    && paperSession?.stageStatus === "drafting"
    && (
        activeStageSearchReason === "user_confirmation_prefer_paper_tools" ||
        activeStageSearchReason === "ai_promised_save_user_confirms" ||
        activeStageSearchReason === "explicit_save_request" ||
        isExplicitSaveSubmitRequest(lastUserContent)
    )
    ? `\n⚠️ ARTIFACT BELUM DIBUAT untuk tahap ini. WAJIB panggil createArtifact() dengan konten yang sudah disimpan di updateStageData SEBELUM memanggil submitStageForValidation(). Pastikan include parameter 'sources' jika ada AVAILABLE_WEB_SOURCES.\n`
    : "";
```

**PENTING:** Inject ke DUA tempat:
1. `fullMessagesGateway` non-websearch path (line ~1966-1973)
2. `fullMessagesBase` untuk fallback path (line 3109 pakai `fullMessagesBase`, bukan `fullMessagesGateway`)

### Fix #3: Auto-link `artifactId` ke StageData

**File:** `src/app/api/chat/route.ts` — dalam `createArtifact` tool execute (after line 1417)

Setelah artifact berhasil dibuat, auto-update stageData:

```typescript
// After successful artifact creation, auto-link to paper session stage
if (paperSession) {
    try {
        await fetchMutationWithToken(api.paperSessions.updateStageData, {
            sessionId: paperSession._id,
            stage: paperSession.currentStage,
            data: { artifactId: result.artifactId },
        });
    } catch {
        // Non-critical: artifact exists but not linked to stage
        console.warn("[createArtifact] Auto-link to stage failed");
    }
}
```

**Efek:** Menghilangkan dependency pada AI untuk manually pass `artifactId`. Setelah ini, `hasStageArtifact()` return true → turn berikutnya bisa force submit.

**Note:** `paperSession` accessible via closure dari parent scope (defined line 343). `fetchMutationWithToken` adalah helper pattern yang sudah dipakai di seluruh file.

### Fix #4: Update Instruksi ALL 13 Stages — Eksplisitkan `sources` dan Urutan

**Files:** All 4 stage instruction files + paper-mode-prompt.ts

Untuk setiap stage, update TOOLS section:
1. Tambah `sources: [{ url, title, publishedAt? }]` di SETIAP `createArtifact` example — karena `hasRecentSourcesInDb` bisa true di stage manapun
2. Tambah note: "WAJIB panggil createArtifact di TURN YANG SAMA dengan updateStageData"
3. Tambah note: "WAJIB panggil createArtifact SEBELUM submitStageForValidation"
4. Tambah note: "`sources` WAJIB diisi dari AVAILABLE_WEB_SOURCES jika tersedia"
5. Update general rule di paper-mode-prompt.ts line 211

### Fix #5: Skill Validator Enforce `createArtifact` Mention

**File:** `src/lib/ai/stage-skill-validator.ts`

Tambah validasi: Tool Policy section WAJIB menyebut `createArtifact` dengan konteks instruksi (bukan sekadar mention). Stage `daftar_pustaka` dikecualikan karena pakai `compileDaftarPustaka`.

```typescript
const toolPolicySection = getSection(content, "Tool Policy");
const requiresArtifactMention = input.stageScope !== "daftar_pustaka";
if (requiresArtifactMention && !/createArtifact/i.test(toolPolicySection)) {
    issues.push({
        code: "missing_create_artifact_in_tool_policy",
        message: `Tool Policy wajib menyebut createArtifact untuk stage "${input.stageScope}".`,
    });
}
```

### Fix #6: Resolver Inject Artifact Reminder Setelah Skill Content

**File:** `src/lib/ai/stage-skill-resolver.ts`

Karena resolver melakukan **full replacement**, tambah mandatory footer yang di-append SETELAH skill content saat source = "skill":

```typescript
// Line 110-116, modify return to append artifact reminder
const ARTIFACT_CREATION_FOOTER = `

═══ MANDATORY ARTIFACT RULE ═══
⚠️ WAJIB panggil createArtifact() untuk membuat artifact dari output tahap ini.
- Panggil di TURN YANG SAMA dengan updateStageData, SEBELUM submitStageForValidation.
- Include parameter 'sources' dari AVAILABLE_WEB_SOURCES jika tersedia.
- Artifact adalah HASIL AKHIR yang akan di-review dan di-approve user.
═══════════════════════════════`;

return {
    instructions: activeSkill.content + ARTIFACT_CREATION_FOOTER,
    source: "skill",
    // ...rest
};
```

**Efek:** Bahkan jika skill content tidak memberi instruksi artifact yang kuat, footer ini memastikan AI selalu mendapat reminder wajib. Stage `daftar_pustaka` tetap mendapat footer ini — `createArtifact` juga dipakai di daftar_pustaka (untuk artifact daftar referensi).

## Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `src/app/api/chat/route.ts` | Add `hasStageArtifact()` helper (~line 870) |
| 2 | `src/app/api/chat/route.ts` | Guard `shouldForceSubmitValidation` with `hasStageArtifact` (line 1918) |
| 3 | `src/app/api/chat/route.ts` | Add `missingArtifactNote` computation (~line 1919+) |
| 4 | `src/app/api/chat/route.ts` | Inject `missingArtifactNote` into `fullMessagesGateway` non-websearch (~line 1966) |
| 5 | `src/app/api/chat/route.ts` | Inject `missingArtifactNote` into `fullMessagesBase` for fallback path |
| 6 | `src/app/api/chat/route.ts` | Auto-link `artifactId` in `createArtifact` execute (after line 1417) |
| 7 | `src/lib/ai/paper-stages/foundation.ts` | Update GAGASAN + TOPIK instructions |
| 8 | `src/lib/ai/paper-stages/core.ts` | Update ABSTRAK + PENDAHULUAN + TINJAUAN_LITERATUR + METODOLOGI |
| 9 | `src/lib/ai/paper-stages/results.ts` | Update HASIL + DISKUSI + KESIMPULAN |
| 10 | `src/lib/ai/paper-stages/finalization.ts` | Update DAFTAR_PUSTAKA + LAMPIRAN + JUDUL + OUTLINE |
| 11 | `src/lib/ai/paper-mode-prompt.ts` | Update general rule (line 211) |
| 12 | `src/lib/ai/stage-skill-validator.ts` | Add `createArtifact` mention validation in Tool Policy |
| 13 | `src/lib/ai/stage-skill-resolver.ts` | Append ARTIFACT_CREATION_FOOTER to skill content |

## Expected Flow After Fix

**Happy path (AI calls createArtifact in Turn N):**
```
Turn N:   AI → updateStageData(ringkasan + data)
          AI → createArtifact(content + sources) → auto-links artifactId to stageData
          AI → "Bagaimana menurut Anda?"
Turn N+1: User → "ok, lanjut"
          Router → hasStageRingkasan=true, hasStageArtifact=true
          → shouldForceSubmitValidation = true
          AI → submitStageForValidation() [FORCED]
          ✅ Artifact EXISTS, approval panel shows with artifact
```

**Fallback flow (AI forgets createArtifact in Turn N):**
```
Turn N:   AI → updateStageData(ringkasan + data)
          AI → "Bagaimana menurut Anda?" (lupa createArtifact)
Turn N+1: User → "ok, lanjut"
          Router → hasStageRingkasan=true, hasStageArtifact=FALSE
          → shouldForceSubmitValidation = FALSE (guard aktif!)
          → missingArtifactNote injected (both primary + fallback paths)
          AI → createArtifact(content + sources) → auto-link
          AI → submitStageForValidation()
          ✅ Artifact EXISTS
```

**Skill override flow:**
```
Admin → Publishes custom skill for stage X
      → Validator checks: Tool Policy mentions createArtifact ✅
      → Resolver appends ARTIFACT_CREATION_FOOTER ✅
      → AI receives: [skill content] + [mandatory artifact reminder]
      → AI → createArtifact() as instructed
      ✅ Artifact guaranteed even with custom skills
```

## Defense-in-Depth Summary

| Layer | Mechanism | Protects Against |
|-------|-----------|-----------------|
| L1: Runtime Guard | `hasStageArtifact` di `shouldForceSubmitValidation` | Force-submit tanpa artifact |
| L2: System Note | `missingArtifactNote` injection (primary + fallback) | AI lupa panggil createArtifact |
| L3: Auto-link | `artifactId` auto-linked setelah createArtifact | AI lupa link artifactId ke stageData |
| L4: Instruction Update | `sources` + ordering di semua 13 stages | AI tidak tahu harus pass sources / urutan |
| L5: Skill Validator | `createArtifact` check di Tool Policy | Admin buat skill tanpa artifact instruction |
| L6: Resolver Footer | ARTIFACT_CREATION_FOOTER di-append ke skill content | Skill content replace hardcoded tanpa artifact reminder |

## Non-Goals

- Tidak mengubah `enforceArtifactSourcesPolicy` logic — policy ini benar, AI yang harus pass sources
- Tidak mengubah tool mode switching (google_search vs function tools) — ini constraint teknis valid
- Tidak menambahkan auto-generate artifact — AI tetap yang menulis konten
- Tidak mengubah stage data schema atau whitelist — `artifactId` sudah ada di semua 13 stages

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Auto-link `artifactId` gagal | Try-catch, non-critical — artifact tetap ada di conversation artifacts list |
| AI masih skip `createArtifact` | 6-layer defense: guard + note + auto-link + instructions + validator + resolver footer |
| Skill validator terlalu ketat | Hanya cek Tool Policy section, `daftar_pustaka` juga butuh createArtifact |
| Resolver footer terlalu verbose | Footer singkat dan spesifik, hanya 5 baris |
| Extra latency dari auto-link mutation | Minimal (~50ms), non-blocking untuk response stream |
| Existing DB skills gagal validasi | Ini diinginkan — admin perlu update skills yang tidak mention createArtifact |
| `hasRecentSourcesInDb` true di PASSIVE stage | Instructions sekarang bilang "include sources jika AVAILABLE_WEB_SOURCES tersedia" — berlaku universal |
