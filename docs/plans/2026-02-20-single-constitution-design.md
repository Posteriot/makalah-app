# Single Constitution Refactor — Design

**Goal**: Simplify Refrasa dari two-layer constitution (naturalness + style) jadi single constitution.

**Motivation**: Two-layer tidak memberikan manfaat. Isi constitution v3 sudah menggabungkan naturalness + style rules dalam satu dokumen. Mempertahankan dua layer hanya menambah overhead tanpa fungsi.

**Approach**: Simplify in-place. Field `type` tetap di schema (optional, backward-compat) tapi kode tidak memakainya lagi. Data lama dihapus manual via Convex Dashboard.

---

## Changes

### 1. prompt-builder.ts
- Hapus `LAYER_1_CORE_NATURALNESS` hardcoded constant
- Hapus parameter `naturalnessConstitution`
- Signature: `buildRefrasaPrompt(content, constitution?)` → `{ system, prompt }`
- Jika ada constitution → inject sebagai aturan di system
- Jika tidak ada → instruksi minimal "perbaiki naturalness saja"
- Hapus semua referensi "Layer 1" / "Layer 2"
- Hapus `buildRefrasaPromptLayer1Only()`
- Academic Escape Clause + Output format tetap

### 2. route.ts
- Fetch satu query `getActive` (bukan dua parallel)
- Pass satu `constitution` ke builder

### 3. convex/styleConstitutions.ts
- Hapus `getActiveNaturalness` query
- Simplify `getActive`: ambil aktif pertama tanpa filter type
- Simplify `activate`: single-active globally
- `create`: hapus/ignore `type` param
- Hapus `DEFAULT_CONSTITUTION_CONTENT`

### 4. StyleConstitutionManager.tsx
- Satu section "Refrasa Constitution"
- Hapus split Naturalness/Style
- Hapus `createType` state dan type filtering
- Simplified dialog text

### 5. seedNaturalnessConstitution.ts
- Hapus file

### 6. docs/refrasa/README.md
- Update ke single constitution

## Unchanged
- convex/schema.ts (field `type` tetap optional)
- Academic Escape Clause (hardcoded safety)
- Output format spec
- System/prompt split architecture
