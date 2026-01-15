# HITL Ringkasan Enforcement - Indeks File

Rujukan cepat lokasi file terkait fitur HITL (Human In The Loop) Ringkasan Enforcement untuk Paper Workflow.

## Lompat Cepat

| Kategori | Jumlah | Isi |
|----------|--------|-----|
| [Core Enforcement](#core-enforcement) | 2 | Zod schema + backend guards |
| [Stage Instructions](#stage-instructions) | 4 | RINGKASAN WAJIB + LINEAR FLOW |
| [Backend Mutations](#backend-mutations) | 1 | paperSessions.ts |
| [Titik Integrasi](#titik-integrasi) | 1 | chat route.ts |
| **Total** | **8** | |

---

## Core Enforcement

```
src/lib/ai/
└── paper-tools.ts                # Schema enforcement + tool definition

convex/
└── paperSessions.ts              # Backend guards + warning system
```

### File Kunci: paper-tools.ts

**Lokasi:** `src/lib/ai/paper-tools.ts:97-107`

**Schema Enforcement:**
```typescript
inputSchema: z.object({
    ringkasan: z.string().max(280).describe("WAJIB!..."),  // REQUIRED
    data: z.record(z.string(), z.any()).optional(),
}),
```

**Execute Function:** `src/lib/ai/paper-tools.ts:108-144`
- Auto-fetch `stage` dari `session.currentStage`
- Merge ringkasan ke data object sebelum kirim ke backend
- Parse warning dari backend (safety net)

---

## Stage Instructions

```
src/lib/ai/paper-stages/
├── foundation.ts                 # Tahap 1-2: gagasan, topik
├── core.ts                       # Tahap 4-7: abstrak, pendahuluan, tinjauan_literatur, metodologi
├── results.ts                    # Tahap 8-10: hasil, diskusi, kesimpulan
└── finalization.ts               # Tahap 3 + 11-13: outline, daftar_pustaka, lampiran, judul
```

### Pola Penambahan per Stage

Setiap stage instruction mendapat 2 section baru:

**1. RINGKASAN WAJIB Section:**
```
═══════════════════════════════════════════════════════════════════════════════
⚠️ RINGKASAN WAJIB - APPROVAL AKAN GAGAL TANPA INI!
═══════════════════════════════════════════════════════════════════════════════

- Format: String, max 280 karakter
- Konten: [Stage-specific content description]
- Contoh: "[Stage-specific example]"
- ⚠️ WARNING: Jika lo tidak menyertakan field 'ringkasan', user TIDAK BISA approve tahap ini!
```

**2. LINEAR FLOW REMINDER Section:**
```
═══════════════════════════════════════════════════════════════════════════════
REMINDER - LINEAR FLOW:
═══════════════════════════════════════════════════════════════════════════════

- Lo HANYA bisa update data untuk tahap SAAT INI ([stage-name])
- Untuk lanjut ke tahap berikutnya, user HARUS klik "Approve & Lanjut"
- JANGAN coba update tahap yang belum aktif - akan ERROR
```

### Pemetaan Stage ke File

| No | Stage ID | File | Ringkasan Konten |
|----|----------|------|------------------|
| 1 | gagasan | foundation.ts | Angle/sudut pandang yang DISEPAKATI |
| 2 | topik | foundation.ts | Judul definitif dan research gap |
| 3 | outline | finalization.ts | Struktur outline (jumlah section) |
| 4 | abstrak | core.ts | Keywords yang DISEPAKATI |
| 5 | pendahuluan | core.ts | Rumusan masalah dan tujuan |
| 6 | tinjauan_literatur | core.ts | Kerangka teoretis |
| 7 | metodologi | core.ts | Pendekatan penelitian |
| 8 | hasil | results.ts | Temuan utama |
| 9 | diskusi | results.ts | Interpretasi utama |
| 10 | kesimpulan | results.ts | Jawaban rumusan masalah |
| 11 | daftar_pustaka | finalization.ts | Jumlah referensi dan status |
| 12 | lampiran | finalization.ts | Item lampiran atau status tidak ada |
| 13 | judul | finalization.ts | Judul terpilih dan alasannya |

---

## Backend Mutations

```
convex/
└── paperSessions.ts              # Guards + warning system
```

### Fungsi dengan Guard Ringkasan

| Fungsi | Line | Guard Type | Behavior |
|--------|------|------------|----------|
| `updateStageData` | 404-416 | Warning | Return warning jika ringkasan missing |
| `submitForValidation` | 439-446 | Hard Error | Throw error jika ringkasan missing |
| `approveStage` | 485-493 | Hard Error | Throw error jika ringkasan missing |

### Warning dari updateStageData

**Lokasi:** `convex/paperSessions.ts:404-416`

```typescript
return {
    success: true,
    stage: args.stage,
    warning: hasRingkasan ? undefined :
        "PERINGATAN: Ringkasan belum diisi. Tahap ini TIDAK BISA di-approve tanpa ringkasan. " +
        "Panggil updateStageData lagi dengan field 'ringkasan'...",
};
```

### Guard di submitForValidation

**Lokasi:** `convex/paperSessions.ts:439-446`

```typescript
if (!ringkasan || ringkasan.trim() === "") {
    throw new Error(
        "submitForValidation gagal: Ringkasan wajib diisi terlebih dahulu. " +
        "Gunakan updateStageData untuk menambahkan ringkasan sebelum submit."
    );
}
```

### Guard di approveStage

**Lokasi:** `convex/paperSessions.ts:485-493`

```typescript
if (!ringkasan || ringkasan.trim() === "") {
    throw new Error(
        "approveStage gagal: Ringkasan wajib diisi. " +
        "Gunakan updateStageData untuk menambahkan ringkasan."
    );
}
```

---

## Titik Integrasi

```
src/app/api/chat/
└── route.ts                      # Tool injection point (872-876)
```

Paper tools diinjeksi di route.ts dan AI memanggil tools via function calling. Schema enforcement aktif di level tool definition sebelum request ke backend.

---

## Pola Pencarian

```bash
# Cari ringkasan enforcement di paper-tools
rg "ringkasan" src/lib/ai/paper-tools.ts

# Cari guard di backend
rg "Ringkasan wajib" convex/paperSessions.ts

# Cari RINGKASAN WAJIB di stage instructions
rg "RINGKASAN WAJIB" src/lib/ai/paper-stages

# Cari LINEAR FLOW reminder
rg "LINEAR FLOW" src/lib/ai/paper-stages
```

---

*Last updated: 2026-01-14*
