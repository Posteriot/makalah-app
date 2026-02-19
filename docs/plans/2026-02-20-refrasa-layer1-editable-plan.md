# Refrasa Layer 1 Editable — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Layer 1 (Core Naturalness Criteria) editable via admin panel, with hardcoded version as fallback.

**Architecture:** Add `type` field to existing `styleConstitutions` table to distinguish naturalness vs style constitutions. Each type has independent single-active constraint. Prompt builder accepts both and falls back to hardcoded Layer 1 when no DB naturalness constitution exists.

**Tech Stack:** Convex (schema, queries, mutations), Next.js API route, React admin panel

---

### Task 1: Schema — Add `type` field to `styleConstitutions`

**Files:**
- Modify: `convex/schema.ts:153-167`

**Step 1: Add `type` field and index**

In `convex/schema.ts`, update the `styleConstitutions` table definition:

```typescript
styleConstitutions: defineTable({
    name: v.string(),
    content: v.string(),
    description: v.optional(v.string()),
    version: v.number(),
    isActive: v.boolean(),
    type: v.optional(v.union(v.literal("naturalness"), v.literal("style"))),
    parentId: v.optional(v.id("styleConstitutions")),
    rootId: v.optional(v.id("styleConstitutions")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["isActive"])
    .index("by_active_type", ["isActive", "type"])
    .index("by_root", ["rootId", "version"])
    .index("by_createdAt", ["createdAt"]),
```

Key: `v.optional` so existing records (which have no `type`) remain valid and are treated as `"style"`.

**Step 2: Verify Convex accepts schema**

Run: `npx convex dev` (should sync without errors, check terminal output)
Expected: Schema pushed successfully, no migration errors.

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(refrasa): add type field to styleConstitutions schema"
```

---

### Task 2: Convex — New `getActiveNaturalness` query + update `activate` per-type constraint

**Files:**
- Modify: `convex/styleConstitutions.ts:110-120` (getActive stays, add new query)
- Modify: `convex/styleConstitutions.ts:404-438` (activate mutation)
- Modify: `convex/styleConstitutions.ts:258-295` (create mutation)

**Step 1: Add `getActiveNaturalness` query**

After the existing `getActive` query (~line 120), add:

```typescript
/**
 * Get the currently active naturalness constitution (Layer 1)
 * Used by Refrasa API - no auth required for reading
 * If none exists, API falls back to hardcoded Layer 1
 */
export const getActiveNaturalness = queryGeneric({
  args: {},
  handler: async ({ db }) => {
    const active = await db
      .query("styleConstitutions")
      .withIndex("by_active_type", (q) => q.eq("isActive", true).eq("type", "naturalness"))
      .first()

    return active
  },
})
```

**Step 2: Update `activate` to scope deactivation per type**

In the `activate` mutation handler, replace the deactivation block:

```typescript
// OLD: Deactivates ALL active constitutions
// NEW: Deactivate only same-type active constitutions (per-type single-active)
const targetType = targetConstitution.type ?? "style"

const activeConstitutions = await db
  .query("styleConstitutions")
  .withIndex("by_active_type", (q) => q.eq("isActive", true).eq("type", targetType))
  .collect()

// Also check records with undefined type (legacy style records)
if (targetType === "style") {
  const legacyActive = await db
    .query("styleConstitutions")
    .withIndex("by_active_type", (q) => q.eq("isActive", true).eq("type", undefined))
    .collect()
  activeConstitutions.push(...legacyActive)
}

for (const constitution of activeConstitutions) {
  await db.patch(constitution._id, { isActive: false, updatedAt: now })
}
```

**Step 3: Update `create` to accept `type` param**

In `create` mutation args, add:

```typescript
type: v.optional(v.union(v.literal("naturalness"), v.literal("style"))),
```

In the `db.insert` call, add `type`:

```typescript
const constitutionId = await db.insert("styleConstitutions", {
  name: name.trim(),
  content: content.trim(),
  description: description?.trim(),
  version: 1,
  isActive: false,
  type: type ?? "style",
  parentId: undefined,
  rootId: undefined,
  createdBy: requestorUserId,
  createdAt: now,
  updatedAt: now,
})
```

**Step 4: Update `update` mutation to propagate type**

In the `update` mutation, propagate `type` from the old constitution to the new version:

```typescript
const newConstitutionId = await db.insert("styleConstitutions", {
  name: oldConstitution.name,
  content: content.trim(),
  description: description?.trim() ?? oldConstitution.description,
  version: newVersion,
  isActive: oldConstitution.isActive,
  type: oldConstitution.type,  // ADD THIS LINE
  parentId: constitutionId,
  rootId: rootId,
  createdBy: requestorUserId,
  createdAt: now,
  updatedAt: now,
})
```

**Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 6: Commit**

```bash
git add convex/styleConstitutions.ts
git commit -m "feat(refrasa): add getActiveNaturalness query, per-type activate constraint"
```

---

### Task 3: Prompt Builder — Hardcoded becomes fallback

**Files:**
- Modify: `src/lib/refrasa/prompt-builder.ts:165-224`

**Step 1: Update `buildRefrasaPrompt` signature and logic**

Change the function signature and body:

```typescript
/**
 * Build the complete Refrasa prompt with two-layer architecture
 *
 * @param content - The text to analyze and refrasa
 * @param constitution - Optional Style Constitution content (Layer 2)
 * @param naturalnessConstitution - Optional Naturalness Constitution from DB (Layer 1)
 *                                  If null/undefined, falls back to hardcoded LAYER_1_CORE_NATURALNESS
 * @returns Complete prompt string for LLM
 */
export function buildRefrasaPrompt(
  content: string,
  constitution?: string | null,
  naturalnessConstitution?: string | null
): string {
  const parts: string[] = []

  // System introduction
  parts.push(`# Refrasa: Perbaikan Gaya Penulisan Akademis

Anda adalah Refrasa, asisten perbaikan gaya penulisan akademis Bahasa Indonesia.

**Tugas Anda:**
1. Analisis teks input untuk menemukan masalah naturalness dan style
2. Perbaiki masalah yang ditemukan
3. Kembalikan daftar issues dan teks yang sudah diperbaiki

**Dual Goal:**
1. **Humanize Writing** - Standar penulisan akademis yang natural dan manusiawi
2. **Anti-Deteksi LLM** - Upaya mengurangi pola deteksi AI (tanpa jaminan lolos)
`)

  // Layer 1: Naturalness — from DB if available, else hardcoded fallback
  if (naturalnessConstitution && naturalnessConstitution.trim()) {
    parts.push(`## LAYER 1: Core Naturalness Criteria (KRITERIA UTAMA - TIDAK BISA DI-OVERRIDE)

${naturalnessConstitution.trim()}
`)
  } else {
    parts.push(LAYER_1_CORE_NATURALNESS)
  }

  // Academic Escape Clause (ALWAYS included, hardcoded safety rule)
  parts.push(ACADEMIC_ESCAPE_CLAUSE)

  // Layer 2: Style Constitution (Optional, dynamic from database)
  if (constitution && constitution.trim()) {
    parts.push(`
## LAYER 2: Style Constitution (PANDUAN GAYA TAMBAHAN)

${constitution.trim()}

**PENTING:** Style Constitution memberikan panduan gaya TAMBAHAN. Jika ada konflik dengan Layer 1 Core Naturalness, Layer 1 SELALU menang.
`)
  } else {
    parts.push(`
## LAYER 2: Style Constitution

*Tidak ada Style Constitution aktif. Gunakan hanya Layer 1 Core Naturalness.*
`)
  }

  // Output format specification
  parts.push(OUTPUT_FORMAT_SPEC)

  // Content to analyze
  parts.push(`
## TEKS INPUT UNTUK DIANALISIS DAN DIPERBAIKI

\`\`\`
${content}
\`\`\`

Analisis teks di atas menggunakan kriteria Layer 1 ${constitution ? "dan Layer 2 " : ""}kemudian berikan output dalam format JSON yang diminta.
`)

  return parts.join("\n\n")
}
```

**Step 2: Update `buildRefrasaPromptLayer1Only` for consistency**

```typescript
export function buildRefrasaPromptLayer1Only(content: string): string {
  return buildRefrasaPrompt(content, null, null)
}
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 4: Commit**

```bash
git add src/lib/refrasa/prompt-builder.ts
git commit -m "feat(refrasa): make Layer 1 fallback, accept DB naturalness constitution"
```

---

### Task 4: API Route — Fetch both constitutions

**Files:**
- Modify: `src/app/api/refrasa/route.ts:60-76`

**Step 1: Fetch both active constitutions in parallel**

Replace the existing constitution fetch block:

```typescript
// 3. Fetch active constitutions (Layer 1: Naturalness, Layer 2: Style)
let naturalnessContent: string | null = null
let styleContent: string | null = null

try {
  const [activeNaturalness, activeStyle] = await Promise.all([
    fetchQuery(api.styleConstitutions.getActiveNaturalness),
    fetchQuery(api.styleConstitutions.getActive),
  ])

  if (activeNaturalness?.content) {
    naturalnessContent = activeNaturalness.content
  }
  if (activeStyle?.content) {
    styleContent = activeStyle.content
  }
} catch (error) {
  console.error("[Refrasa API] Failed to fetch constitutions:", error)
  // Continue with hardcoded fallbacks
}

// 4. Build two-layer prompt
const prompt = buildRefrasaPrompt(content, styleContent, naturalnessContent)
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 3: Commit**

```bash
git add src/app/api/refrasa/route.ts
git commit -m "feat(refrasa): fetch both naturalness and style constitutions in API route"
```

---

### Task 5: Migration — Seed hardcoded Layer 1 as naturalness constitution

**Files:**
- Create: `convex/migrations/seedNaturalnessConstitution.ts`

**Step 1: Create seed migration**

```typescript
import { internalMutation } from "../_generated/server"
import { LAYER_1_CORE_NATURALNESS_CONTENT, ACADEMIC_ESCAPE_CLAUSE_CONTENT } from "../styleConstitutions"

/**
 * Migration: Seed hardcoded Layer 1 (Core Naturalness Criteria) as editable DB record
 * Run via: npx convex run migrations:seedNaturalnessConstitution
 *
 * This inserts the previously-hardcoded Layer 1 content as a naturalness-type
 * constitution so it can be edited via admin panel.
 * Hardcoded version in prompt-builder.ts remains as fallback.
 */
export const seedNaturalnessConstitution = internalMutation({
  handler: async ({ db }) => {
    // Check if a naturalness constitution already exists
    const existing = await db
      .query("styleConstitutions")
      .withIndex("by_active_type", (q) => q.eq("isActive", true).eq("type", "naturalness"))
      .first()

    if (existing) {
      return {
        success: false,
        message: "Naturalness constitution sudah ada. Migration dibatalkan.",
      }
    }

    // Find superadmin user
    const superadmin = await db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "superadmin"))
      .first()

    if (!superadmin) {
      return {
        success: false,
        message: "Superadmin user tidak ditemukan.",
      }
    }

    const now = Date.now()

    const constitutionId = await db.insert("styleConstitutions", {
      name: "Core Naturalness Criteria",
      content: LAYER_1_CORE_NATURALNESS_CONTENT + "\n\n" + ACADEMIC_ESCAPE_CLAUSE_CONTENT,
      description: "Layer 1: Kriteria naturalness utama untuk anti-deteksi AI. Sebelumnya hardcoded, sekarang editable.",
      version: 1,
      isActive: true,
      type: "naturalness",
      parentId: undefined,
      rootId: undefined,
      createdBy: superadmin._id,
      createdAt: now,
      updatedAt: now,
    })

    return {
      success: true,
      constitutionId,
      message: "Naturalness constitution berhasil dibuat dan diaktifkan.",
    }
  },
})
```

**Step 2: Export constants from `convex/styleConstitutions.ts`**

At the top of `convex/styleConstitutions.ts`, after `DEFAULT_CONSTITUTION_CONTENT`, add exported constants for the Layer 1 content. Copy the exact content from `src/lib/refrasa/prompt-builder.ts` constants `LAYER_1_CORE_NATURALNESS` and `ACADEMIC_ESCAPE_CLAUSE`:

```typescript
/**
 * Layer 1 Core Naturalness content — exported for migration seed.
 * Source of truth remains in prompt-builder.ts (hardcoded fallback).
 * This copy is used only for initial DB seeding.
 */
export const LAYER_1_CORE_NATURALNESS_CONTENT = `## LAYER 1: Core Naturalness Criteria ...`
// (paste full content from prompt-builder.ts LAYER_1_CORE_NATURALNESS constant)

export const ACADEMIC_ESCAPE_CLAUSE_CONTENT = `## ACADEMIC ESCAPE CLAUSE ...`
// (paste full content from prompt-builder.ts ACADEMIC_ESCAPE_CLAUSE constant)
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 4: Commit**

```bash
git add convex/migrations/seedNaturalnessConstitution.ts convex/styleConstitutions.ts
git commit -m "feat(refrasa): add migration to seed naturalness constitution from hardcoded Layer 1"
```

---

### Task 6: Admin Panel — Add naturalness section, remove hardcoded notice

**Files:**
- Modify: `src/components/admin/StyleConstitutionManager.tsx`

**Step 1: Update `StyleConstitution` interface**

Add `type` field:

```typescript
interface StyleConstitution {
  _id: Id<"styleConstitutions">
  name: string
  content: string
  description?: string
  version: number
  isActive: boolean
  type?: "naturalness" | "style"
  createdBy: Id<"users">
  createdAt: number
  updatedAt: number
  creatorEmail: string
}
```

**Step 2: Split constitutions by type**

After the `constitutions` query, derive two filtered lists:

```typescript
const naturalnessConstitutions = (constitutions ?? []).filter(
  (c) => c.type === "naturalness"
)
const styleConstitutions = (constitutions ?? []).filter(
  (c) => c.type !== "naturalness" // undefined or "style" both → style
)
```

**Step 3: Remove the hardcoded info box**

Delete the info box block (lines 491-497):

```tsx
{/* DELETE THIS ENTIRE BLOCK */}
<div className="mb-4 flex items-start gap-2 rounded-action border border-sky-500/30 bg-sky-500/10 p-3">
  <InfoCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600 dark:text-sky-400" />
  <p className="text-sm text-sky-700 dark:text-sky-300">
    <strong>Catatan:</strong> Constitution hanya untuk style rules (Layer 2).
    Naturalness criteria (Layer 1) sudah hardcoded dan tidak bisa di-override.
  </p>
</div>
```

**Step 4: Add naturalness constitution section**

Before the existing Style Constitution Manager section, add a new section for naturalness constitutions. Reuse the same table/card structure but with `naturalnessConstitutions` data. Key differences:
- Header: "Refrasa - Naturalness Constitution" with description "Kelola kriteria naturalness (Layer 1). Jika tidak ada yang aktif, menggunakan kriteria default."
- "Buat Constitution Baru" button passes `type: "naturalness"` when creating
- Table renders `naturalnessConstitutions` list
- Separate from style section visually (own card)

**Step 5: Update create handler to pass type**

Add state for which type is being created:

```typescript
const [createType, setCreateType] = useState<"naturalness" | "style">("style")
```

When opening create dialog from naturalness section, set `createType = "naturalness"`. Pass to mutation:

```typescript
const result = await createMutation({
  requestorUserId: userId,
  name: formName.trim(),
  content: formContent.trim(),
  description: formDescription.trim() || undefined,
  type: createType,
})
```

**Step 6: Update bottom note**

Change the note at bottom from:
"Jika tidak ada constitution aktif, Refrasa hanya menggunakan Layer 1 (Core Naturalness Criteria)."

To:
"Jika tidak ada naturalness constitution aktif, Refrasa menggunakan kriteria naturalness default (hardcoded). Jika tidak ada style constitution aktif, Layer 2 dilewati."

**Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 8: Commit**

```bash
git add src/components/admin/StyleConstitutionManager.tsx
git commit -m "feat(refrasa): add naturalness constitution section to admin panel"
```

---

### Task 7: Verify end-to-end

**Step 1: Run seed migration**

```bash
npx convex run migrations:seedNaturalnessConstitution
```

Expected: `"Naturalness constitution berhasil dibuat dan diaktifkan."`

**Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 3: Manual verification checklist**

- [ ] Admin panel shows two sections: Naturalness Constitution and Style Constitution
- [ ] Naturalness section shows seeded "Core Naturalness Criteria" as active
- [ ] Creating new constitution in naturalness section has `type: "naturalness"`
- [ ] Activating a naturalness constitution only deactivates other naturalness, not style
- [ ] Activating a style constitution only deactivates other style, not naturalness
- [ ] Refrasa API uses DB naturalness content (edit in admin → refrasa output changes)
- [ ] Deactivating all naturalness constitutions → refrasa uses hardcoded fallback
- [ ] Old style constitutions (no `type` field) still work correctly

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(refrasa): make Layer 1 naturalness editable via admin panel

Layer 1 (Core Naturalness Criteria) is now editable from admin panel.
Hardcoded version serves as fallback when no DB record is active.
Uses same styleConstitutions table with new type field."
```
