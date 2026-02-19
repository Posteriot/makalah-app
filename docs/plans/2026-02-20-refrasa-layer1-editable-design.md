# Refrasa Layer 1 Editable via Admin Panel

**Date:** 2026-02-20
**Status:** Approved
**Approach:** A — Tambah `type` field ke `styleConstitutions` table

## Problem

Layer 1 (Core Naturalness Criteria) hardcoded di `src/lib/refrasa/prompt-builder.ts` dan tidak bisa di-override dari admin panel. Admin panel hanya bisa mengelola Layer 2 (Style Constitution). Ini menyulitkan karena admin perlu mengatur naturalness criteria tanpa deploy ulang.

## Decision

Hardcoded Layer 1 menjadi **fallback**. Primary source: database (editable via admin panel). Reuse tabel `styleConstitutions` yang sudah ada dengan tambahan `type` field.

## Design

### 1. Schema Change

`convex/schema.ts` — `styleConstitutions` table:

- Tambah field: `type: v.optional(v.union(v.literal("naturalness"), v.literal("style")))`
- `v.optional` untuk backward-compat — record lama tanpa `type` di-treat sebagai `"style"`
- Tambah index: `.index("by_active_type", ["isActive", "type"])`

### 2. Convex Queries/Mutations

`convex/styleConstitutions.ts`:

- **New query** `getActiveNaturalness` — fetch active constitution where `type === "naturalness"`
- **Update** `activate` — single-active constraint per type (deactivate hanya sesama type)
- **Update** `list` — include `type` field di response
- **Update** `create` — terima optional `type` param (default `"style"`)

### 3. Prompt Builder

`src/lib/refrasa/prompt-builder.ts`:

- `LAYER_1_CORE_NATURALNESS` constant tetap sebagai **fallback**
- `buildRefrasaPrompt(content, style?, naturalness?)` — terima 2 optional constitution params
- `naturalness` null → pakai hardcoded fallback
- `naturalness` ada → pakai dari DB
- `ACADEMIC_ESCAPE_CLAUSE` tetap hardcoded (safety rule, bukan editable content)

### 4. API Route

`src/app/api/refrasa/route.ts`:

- Fetch kedua active constitutions in parallel
- Pass ke `buildRefrasaPrompt(content, style, naturalness)`

### 5. Admin Panel

`src/components/admin/StyleConstitutionManager.tsx`:

- Hapus info box "Layer 1 hardcoded"
- Tambah section "Naturalness Constitution" (filtered by type)
- Reuse komponen CRUD/versioning yang sama
- Seed migration: insert hardcoded Layer 1 sebagai naturalness constitution v1

### 6. Fallback Flow

```
Naturalness:
  DB ada active naturalness? → pakai dari DB
  DB kosong/error?           → pakai LAYER_1_CORE_NATURALNESS hardcoded

Style:
  DB ada active style? → pakai dari DB
  DB kosong/error?     → skip (optional, behavior existing)
```

## Files Modified

| File | Change |
|------|--------|
| `convex/schema.ts` | Tambah `type` field + `by_active_type` index |
| `convex/styleConstitutions.ts` | New `getActiveNaturalness`, update `activate`/`create`/`list` |
| `src/lib/refrasa/prompt-builder.ts` | Update signature, hardcoded jadi fallback |
| `src/app/api/refrasa/route.ts` | Fetch both constitutions, pass to builder |
| `src/components/admin/StyleConstitutionManager.tsx` | Tambah naturalness section, hapus hardcoded notice |
| `convex/migrations/seedNaturalnessConstitution.ts` | New: seed Layer 1 ke DB |
