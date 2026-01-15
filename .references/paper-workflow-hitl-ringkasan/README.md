# HITL Ringkasan Enforcement - Referensi Teknis

Dokumentasi lengkap untuk fitur HITL (Human In The Loop) Ringkasan Enforcement di Paper Workflow Makalah App. Fitur ini memastikan AI selalu menyertakan `ringkasan` saat menyimpan data tahap, sehingga user bisa approve dan lanjut ke tahap berikutnya.

## Daftar Isi

1. [Ikhtisar](#ikhtisar)
2. [Masalah yang Diselesaikan](#masalah-yang-diselesaikan)
3. [Root Cause Analysis](#root-cause-analysis)
4. [Solusi: Defense in Depth](#solusi-defense-in-depth)
5. [Arsitektur Layer](#arsitektur-layer)
6. [Implementasi Detail](#implementasi-detail)
7. [Alur Data](#alur-data)
8. [Error Messages](#error-messages)
9. [Testing](#testing)
10. [Rujukan File](#rujukan-file)

---

## Ikhtisar

Fitur HITL Ringkasan Enforcement memastikan setiap tahap paper workflow memiliki `ringkasan` sebelum bisa di-approve oleh user. Ringkasan adalah string max 280 karakter yang merangkum **keputusan utama yang DISEPAKATI** antara AI dan user untuk tahap tersebut.

### Fitur Kunci

- **Schema Enforcement**: `ringkasan` sebagai REQUIRED parameter di Zod schema (tool input)
- **Defense in Depth**: 6 layer validasi untuk memastikan ringkasan selalu ada
- **Clear Error Messages**: Pesan error yang jelas saat ringkasan missing
- **Backward Compatible**: Session lama tetap bisa lanjut setelah ringkasan diisi

### Constraint

- Ringkasan maksimal **280 karakter**
- Ringkasan harus **non-empty** untuk bisa submit/approve (guard backend)
- Ringkasan harus mencerminkan **keputusan yang DISEPAKATI** dengan user

---

## Masalah yang Diselesaikan

### Symptom

User klik "Approve & Lanjut" tapi muncul error:

```
approveStage gagal: Ringkasan wajib diisi. Gunakan updateStageData untuk menambahkan ringkasan.
```

### Root Behavior (Legacy)

Sebelum enforcement, AI bisa memanggil `updateStageData` tanpa `ringkasan` (signature lama):

```typescript
// LEGACY (SALAH):
updateStageData({
    stage: "gagasan",
    data: {
        ideKasar: "...",
        analisis: "...",
        angle: "...",
        // ringkasan MISSING!
    }
})
```

### Impact

- User tidak bisa approve tahap
- User stuck di validation panel
- Flow paper terhenti

---

## Root Cause Analysis

### Why AI Ignored Instructions?

Sebelum fix, instruksi ringkasan hanya berupa **text instructions** di:
1. Tool description (WARNING box)
2. Stage instructions (RINGKASAN WAJIB section)
3. System prompt

Tapi tool schema lama menggunakan `z.any()` dan tidak mewajibkan `ringkasan`:

```typescript
// BEFORE (problematic):
inputSchema: z.object({
    stage: z.string(), // LEGACY (sebelum auto-stage)
    data: z.any(),  // AI bisa pass APAPUN, termasuk tanpa ringkasan
}),
```

**Problem:** Text instructions = advisory only. AI bisa (dan sering) ignore karena:
1. LLM prioritas generate konten, bukan meta-instructions
2. `z.any()` = full freedom, AI assume flexibility
3. Instructions panjang = AI tidak retain semua constraints
4. `success: true` dari tool = AI assume selesai

### Key Insight

> **Schema enforcement > Text instructions**
>
> Zod validation adalah compile-time + runtime enforcement. AI TIDAK BISA bypass schema requirement.

---

## Solusi: Defense in Depth

Implementasi menggunakan 6 layer validasi untuk memastikan ringkasan selalu ada:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 0: ZOD SCHEMA ENFORCEMENT (ROOT FIX)               │
│  ringkasan sebagai REQUIRED parameter - AI TIDAK BISA panggil tool tanpa   │
│  field ringkasan                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LAYER 1: AI Instructions                             │
│  13/13 stages dengan RINGKASAN WAJIB section                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                   LAYER 2: Tool Description                                 │
│  AUTO-STAGE + format data (referensiAwal/pendukung wajib object)            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                   LAYER 3: updateStageData WARNING                          │
│  Returns warning if ringkasan missing (safety net)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                   LAYER 4: submitForValidation GUARD                        │
│  Throws error if ringkasan missing                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 5: approveStage GUARD                            │
│  Final fallback - blocks UI approval                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer Effectiveness

| Layer | Type | Can AI Bypass? | When Active |
|-------|------|----------------|-------------|
| 0 - Zod Schema | Hard enforcement | **Partial** (masih bisa kirim string kosong) | Tool call time |
| 1 - Stage Instructions | Text advisory | Yes | Prompt injection |
| 2 - Tool Description | Text advisory | Yes | Tool definition |
| 3 - updateStageData Warning | Soft warning | Yes (can ignore) | After save |
| 4 - submitForValidation Guard | Hard error | No | Before validation panel |
| 5 - approveStage Guard | Hard error | No | Before stage transition |

---

## Arsitektur Layer

### Layer 0: Zod Schema Enforcement (ROOT FIX)

**File:** `src/lib/ai/paper-tools.ts:97-107`

```typescript
inputSchema: z.object({
    // NOTE: stage dihapus (auto-fetch dari session.currentStage)
    ringkasan: z.string().max(280).describe(
        "WAJIB! Keputusan utama yang DISEPAKATI dengan user untuk tahap ini. Max 280 karakter. " +
        "Contoh: 'Disepakati angle: dampak AI terhadap pendidikan tinggi Indonesia, gap: belum ada studi di kampus swasta'"
    ),
    data: z.record(z.string(), z.any()).optional().describe(
        "Objek data draf lainnya (selain ringkasan). PENTING: referensiAwal/referensiPendukung harus ARRAY OF OBJECTS!"
    ),
}),
```

**Catatan:** Zod memastikan field `ringkasan` ada, tapi non-empty dijaga oleh warning + guard backend.

**Execute function merge:**

```typescript
execute: async ({ ringkasan, data }) => {
    // Merge ringkasan (required by schema) into data object
    const mergedData = { ...(data || {}), ringkasan };

    // Auto-fetch stage from session.currentStage
    const stage = session.currentStage;

    const result = await fetchMutation(api.paperSessions.updateStageData, {
        sessionId: session._id,
        stage,
        data: mergedData,
    });
    // ...
}
```

### Layer 1: Stage Instructions

**Files:** `src/lib/ai/paper-stages/*.ts` (4 files, 13 stages)

Setiap stage mendapat section:

```
═══════════════════════════════════════════════════════════════════════════════
⚠️ RINGKASAN WAJIB - APPROVAL AKAN GAGAL TANPA INI!
═══════════════════════════════════════════════════════════════════════════════

- Format: String, max 280 karakter
- Konten: [Stage-specific content description]
- Contoh: "[Stage-specific example]"
- ⚠️ WARNING: Jika lo tidak menyertakan field 'ringkasan', user TIDAK BISA approve tahap ini!

═══════════════════════════════════════════════════════════════════════════════
REMINDER - LINEAR FLOW:
═══════════════════════════════════════════════════════════════════════════════

- Lo HANYA bisa update data untuk tahap SAAT INI ([stage-name])
- Untuk lanjut ke tahap berikutnya, user HARUS klik "Approve & Lanjut"
- JANGAN coba update tahap yang belum aktif - akan ERROR
```

### Layer 3: updateStageData Warning

**File:** `convex/paperSessions.ts:404-416`

```typescript
const hasRingkasan = typeof finalStageData.ringkasan === "string"
    && finalStageData.ringkasan.trim() !== "";

return {
    success: true,
    stage: args.stage,
    warning: hasRingkasan ? undefined :
        "PERINGATAN: Ringkasan belum diisi. Tahap ini TIDAK BISA di-approve tanpa ringkasan. " +
        "Panggil updateStageData lagi dengan field 'ringkasan' yang berisi keputusan utama yang disepakati (max 280 karakter).",
};
```

### Layer 4: submitForValidation Guard

**File:** `convex/paperSessions.ts:439-446`

```typescript
const currentStageData = session.stageData?.[currentStage] as Record<string, unknown> | undefined;
const ringkasan = currentStageData?.ringkasan as string | undefined;

if (!ringkasan || ringkasan.trim() === "") {
    throw new Error(
        "submitForValidation gagal: Ringkasan wajib diisi terlebih dahulu. " +
        "Gunakan updateStageData untuk menambahkan ringkasan sebelum submit."
    );
}
```

### Layer 5: approveStage Guard

**File:** `convex/paperSessions.ts:485-493`

```typescript
const currentStageData = session.stageData?.[currentStage] as Record<string, unknown> | undefined;
const ringkasan = currentStageData?.ringkasan as string | undefined;

if (!ringkasan || ringkasan.trim() === "") {
    throw new Error(
        "approveStage gagal: Ringkasan wajib diisi. " +
        "Gunakan updateStageData untuk menambahkan ringkasan."
    );
}
```

---

## Alur Data

### Happy Path (Normal Flow)

```
User: "Gimana menurut lo tentang angle ini?"
          │
          ▼
AI: "Setuju! Gue simpan draftnya ya."
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ AI calls updateStageData({                                   │
│   ringkasan: "Disepakati angle: ML untuk personalisasi...",  │  ← REQUIRED by Zod
│   data: {                                                    │
│     ideKasar: "...",                                         │
│     analisis: "...",                                         │
│     angle: "...",                                            │
│   }                                                          │
│ })                                                           │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ paper-tools.ts execute():                                    │
│   const mergedData = { ...data, ringkasan };                 │
│   const stage = session.currentStage;                        │
│   // ringkasan merged into data object                       │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ convex/paperSessions.ts updateStageData():                   │
│   stageData.gagasan.ringkasan = "Disepakati angle: ML..."    │
│   return { success: true, stage: "gagasan" }                 │
│   // No warning because ringkasan exists                     │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
AI: "Draft tersimpan. Gimana, udah oke?"
User: "Oke, submit aja"
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ AI calls submitStageForValidation()                          │
│   → Guard passes (ringkasan exists)                          │
│   → stageStatus = "pending_validation"                       │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
UI: Validation panel appears
User: Clicks "Approve & Lanjut"
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ approveStage()                                               │
│   → Guard passes (ringkasan exists)                          │
│   → currentStage = "topik"                                   │
│   → stageStatus = "drafting"                                 │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
✅ Success! Stage transition complete.
```

### Error Path (Missing ringkasan - Current)

```
AI: "Gue simpan draftnya ya."
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ AI calls updateStageData({                                   │
│   data: {                                                    │
│     ideKasar: "...",                                         │
│     // NO ringkasan!                                         │
│   }                                                          │
│ })                                                           │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
❌ Zod validation ERROR!
   (error default Zod untuk field ringkasan yang hilang)

AI tidak bisa lanjut tanpa mengirim ringkasan.
```

---

## Error Messages

### From Zod Schema (Layer 0)

```
(pesan default Zod untuk field ringkasan yang hilang)
```

Muncul saat AI tidak menyertakan `ringkasan` parameter.

### From submitForValidation (Layer 4)

```
submitForValidation gagal: Ringkasan wajib diisi terlebih dahulu. Gunakan updateStageData untuk menambahkan ringkasan sebelum submit.
```

### From approveStage (Layer 5)

```
approveStage gagal: Ringkasan wajib diisi. Gunakan updateStageData untuk menambahkan ringkasan.
```

### Warning from updateStageData (Layer 3)

```
PERINGATAN: Ringkasan belum diisi. Tahap ini TIDAK BISA di-approve tanpa ringkasan. Panggil updateStageData lagi dengan field 'ringkasan' yang berisi keputusan utama yang disepakati (max 280 karakter).
```

---

## Testing

### Manual Testing Steps

1. **Start dev servers:**
   ```bash
   npm run dev
   npm run convex:dev
   ```

2. **Start new paper session** via chat

3. **Observe AI behavior:**
   - AI HARUS include `ringkasan` di setiap `updateStageData` call
   - Zod will reject jika ringkasan missing

4. **Click "Approve & Lanjut":**
   - Harus succeed jika ringkasan ada
   - Harus error jika ringkasan missing (fallback guard)

5. **Verify stage transition:**
   - currentStage harus berubah ke tahap berikutnya

### Edge Case Testing

1. **Session tanpa ringkasan (legacy):**
   - Buka Convex Dashboard
   - Manually remove ringkasan dari stageData
   - Click "Approve & Lanjut"
   - Harus muncul error dari approveStage guard

2. **Empty string ringkasan:**
   - Set ringkasan = "" atau "   " (whitespace)
   - Harus rejected oleh guards

---

## Rujukan File

### Core Files

| File | Purpose |
|------|---------|
| `src/lib/ai/paper-tools.ts` | Schema enforcement + tool definition |
| `convex/paperSessions.ts` | Backend guards + warning system |

### Stage Instruction Files

| File | Stages |
|------|--------|
| `src/lib/ai/paper-stages/foundation.ts` | gagasan, topik |
| `src/lib/ai/paper-stages/core.ts` | abstrak, pendahuluan, tinjauan_literatur, metodologi |
| `src/lib/ai/paper-stages/results.ts` | hasil, diskusi, kesimpulan |
| `src/lib/ai/paper-stages/finalization.ts` | outline, daftar_pustaka, lampiran, judul |

### Related Documentation

| Path | Content |
|------|---------|
| `.references/paper-workflow/` | Paper workflow overview |
| `.references/paper-workflow/README.md` | Complete workflow documentation |

---

## Changelog

### 2026-01-10: Initial Implementation

- Added `ringkasan` as REQUIRED parameter in Zod schema
- Added warning return from `updateStageData`
- Added guard in `submitForValidation`
- Added guard in `approveStage`
- Added RINGKASAN WAJIB section to all 13 stages
- Added LINEAR FLOW REMINDER to all 13 stages

---

*Last updated: 2026-01-14*
