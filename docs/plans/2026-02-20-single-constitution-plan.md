# Single Constitution Refactor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify Refrasa dari two-layer constitution (naturalness + style) jadi single constitution.

**Architecture:** Hapus konsep Layer 1/Layer 2. Satu tabel `styleConstitutions` dengan satu query `getActive`, satu constitution aktif secara global. Prompt builder terima satu `constitution` optional. Academic Escape Clause tetap hardcoded sebagai safety rule.

**Tech Stack:** TypeScript, Convex, React, Next.js, Vercel AI SDK

---

### Task 1: Simplify Convex queries and mutations

**Files:**
- Modify: `convex/styleConstitutions.ts`

**Step 1: Simplify `getActive` query**

Replace lines 110-121 with:

```typescript
export const getActive = queryGeneric({
  args: {},
  handler: async ({ db }) => {
    return await db
      .query("styleConstitutions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()
  },
})
```

No more filtering by type. Just return the first active constitution.

**Step 2: Delete `getActiveNaturalness` query**

Delete lines 128-138 entirely (the `getActiveNaturalness` export).

**Step 3: Simplify `activate` mutation**

In the `activate` mutation handler (around line 425-468), replace the per-type filtering logic:

```typescript
// OLD: per-type single-active
const targetType = targetConstitution.type ?? "style"
const allActive = await db.query("styleConstitutions")...
const sameTypeActive = allActive.filter(...)
for (const constitution of sameTypeActive) { ... }
```

With global single-active:

```typescript
const now = Date.now()

// Deactivate ALL currently active constitutions (global single-active)
const allActive = await db
  .query("styleConstitutions")
  .withIndex("by_active", (q) => q.eq("isActive", true))
  .collect()

for (const constitution of allActive) {
  await db.patch(constitution._id, { isActive: false, updatedAt: now })
}

// Activate target
await db.patch(constitutionId, { isActive: true, updatedAt: now })
```

**Step 4: Remove `type` parameter from `create` mutation**

In the `create` mutation args, remove:
```typescript
type: v.optional(v.union(v.literal("naturalness"), v.literal("style"))),
```

In the handler, change `type: type ?? "style"` to just remove the `type` field from the insert call (or keep as `type: undefined` — field is optional in schema).

**Step 5: Delete `DEFAULT_CONSTITUTION_CONTENT`**

Delete lines 17-99 (the entire `DEFAULT_CONSTITUTION_CONTENT` constant and its export).

**Step 6: Update deactivate message**

In `deactivate` mutation, change the success message from:
```
"Constitution berhasil dinonaktifkan. Refrasa akan menggunakan Layer 1 (Core Naturalness) saja."
```
To:
```
"Constitution berhasil dinonaktifkan. Refrasa akan berjalan tanpa constitution."
```

**Step 7: Verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Type errors in `route.ts` (references `getActiveNaturalness`) and `StyleConstitutionManager.tsx` (references `seedDefault` and type-related code). This is expected — we fix those in subsequent tasks.

**Step 8: Commit**

```bash
git add convex/styleConstitutions.ts
git commit -m "refactor(refrasa): simplify constitution to single-active global model"
```

---

### Task 2: Simplify prompt builder

**Files:**
- Modify: `src/lib/refrasa/prompt-builder.ts`

**Step 1: Delete hardcoded LAYER_1_CORE_NATURALNESS**

Delete lines 30-63 (the entire `LAYER_1_CORE_NATURALNESS` constant).

**Step 2: Rewrite `buildRefrasaPrompt` signature and body**

Replace the entire function (lines 168-234) with:

```typescript
/**
 * Build the Refrasa prompt split into system (instructions) and prompt (user input).
 *
 * system role = constitution + instructions → highest LLM compliance
 * prompt role = user text to analyze → treated as input data
 *
 * @param content - The text to analyze and refrasa
 * @param constitution - Optional constitution content from DB
 * @returns { system, prompt } for separate passing to generateObject()
 */
export function buildRefrasaPrompt(
  content: string,
  constitution?: string | null
): { system: string; prompt: string } {
  // ── SYSTEM: All instructions, constitution, output format ──
  const systemParts: string[] = []

  systemParts.push(`# Refrasa: Perbaikan Gaya Penulisan Akademis

Anda adalah Refrasa, asisten perbaikan gaya penulisan akademis Bahasa Indonesia.

**Tugas Anda:**
1. Analisis teks input untuk menemukan masalah naturalness dan style
2. Perbaiki masalah yang ditemukan
3. Kembalikan daftar issues dan teks yang sudah diperbaiki

**Dual Goal:**
1. **Humanize Writing** - Standar penulisan akademis yang natural dan manusiawi
2. **Anti-Deteksi LLM** - Upaya mengurangi pola deteksi AI (tanpa jaminan lolos)
`)

  // Constitution from DB (optional)
  if (constitution && constitution.trim()) {
    systemParts.push(`## CONSTITUTION (ATURAN WAJIB)

${constitution.trim()}
`)
  } else {
    systemParts.push(`## CONSTITUTION

*Tidak ada constitution aktif. Perbaiki naturalness teks secara umum: variasi kosakata, pola kalimat, ritme paragraf, dan hedging akademik.*
`)
  }

  // Academic Escape Clause (ALWAYS included, hardcoded safety)
  systemParts.push(ACADEMIC_ESCAPE_CLAUSE)

  // Output format specification
  systemParts.push(OUTPUT_FORMAT_SPEC)

  const system = systemParts.join("\n\n")

  // ── PROMPT: Only the user's text input ──
  const prompt = `## TEKS INPUT UNTUK DIANALISIS DAN DIPERBAIKI

\`\`\`
${content}
\`\`\`

Analisis teks di atas menggunakan constitution${constitution ? " " : " (instruksi umum) "}kemudian berikan output dalam format JSON yang diminta.`

  return { system, prompt }
}
```

**Step 3: Delete `buildRefrasaPromptLayer1Only`**

Delete the function at lines 240-242.

**Step 4: Update file header comment**

Replace lines 1-12 with:

```typescript
/**
 * Prompt Builder for Refrasa Tool
 *
 * ARCHITECTURE:
 * - Constitution: Single, editable via admin panel (optional)
 * - Academic Escape Clause: HARDCODED safety rule (always included)
 * - System/prompt split: constitution in system role, user text in prompt role
 */
```

**Step 5: Update OUTPUT_FORMAT_SPEC**

In the `OUTPUT_FORMAT_SPEC` constant, change the issue categories section:

Replace:
```
### Issue Categories:
- **naturalness**: Masalah dari Layer 1 (vocabulary_repetition, sentence_pattern, paragraph_rhythm, hedging_balance, burstiness)
- **style**: Masalah dari Layer 2 Style Constitution (style_violation)
```

With:
```
### Issue Categories:
- **naturalness**: Masalah naturalness (vocabulary_repetition, sentence_pattern, paragraph_rhythm, hedging_balance, burstiness)
- **style**: Masalah gaya penulisan dari constitution (style_violation)
```

**Step 6: Verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Errors in `route.ts` (still passes 3 args to `buildRefrasaPrompt`) and possibly `index.ts` (exports `buildRefrasaPromptLayer1Only`). Expected — fixed next.

**Step 7: Commit**

```bash
git add src/lib/refrasa/prompt-builder.ts
git commit -m "refactor(refrasa): simplify prompt builder to single constitution"
```

---

### Task 3: Update route and refrasa index

**Files:**
- Modify: `src/app/api/refrasa/route.ts`
- Modify: `src/lib/refrasa/index.ts`

**Step 1: Simplify route.ts fetch logic**

Replace lines 60-82 (the constitution fetch + build section) with:

```typescript
    // 3. Fetch active constitution
    let constitutionContent: string | null = null

    try {
      const activeConstitution = await fetchQuery(api.styleConstitutions.getActive)
      if (activeConstitution?.content) {
        constitutionContent = activeConstitution.content
      }
    } catch (error) {
      console.error("[Refrasa API] Failed to fetch constitution:", error)
      // Continue without constitution
    }

    // 4. Build prompt (split: system instructions + user input)
    const { system, prompt } = buildRefrasaPrompt(content, constitutionContent)
```

**Step 2: Update route.ts JSDoc header**

Replace the comment block at lines 19-31:

```typescript
/**
 * POST /api/refrasa
 *
 * Analyze and improve text using Refrasa constitution.
 * Constitution is optional — if none active, basic naturalness rules apply.
 *
 * Request body:
 * - content: string (min 50 chars) - Text to analyze
 * - artifactId?: string - Optional artifact ID for tracking
 *
 * Response:
 * - issues: RefrasaIssue[] - List of issues found and fixed
 * - refrasedText: string - Improved text
 */
```

**Step 3: Update refrasa index.ts exports**

In `src/lib/refrasa/index.ts`, remove the `buildRefrasaPromptLayer1Only` export:

```typescript
// Prompt builder
export {
  buildRefrasaPrompt,
} from "./prompt-builder"
```

**Step 4: Verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Errors only in `StyleConstitutionManager.tsx` (references `seedDefault`, type filtering). Fixed next task.

**Step 5: Commit**

```bash
git add src/app/api/refrasa/route.ts src/lib/refrasa/index.ts
git commit -m "refactor(refrasa): simplify route to single constitution fetch"
```

---

### Task 4: Simplify admin panel

**Files:**
- Modify: `src/components/admin/StyleConstitutionManager.tsx`

This is the largest change. The current file has two separate table sections (Naturalness + Style) with type filtering. Simplify to one section.

**Step 1: Remove type-related state and filtering**

Remove these lines/concepts:
- `const naturalnessConstitutions = ...filter(type === "naturalness")` (line 89-91)
- `const styleConstitutions = ...filter(type !== "naturalness")` (line 92-94)
- `const [createType, setCreateType] = useState<"naturalness" | "style">("style")` (line 96)
- All references to `createType` and `setCreateType`

Replace with just using `constitutions` directly (already fetched from `useQuery`).

**Step 2: Remove the Naturalness Constitution section**

Delete the entire "Naturalness Constitution Manager (Layer 1)" `<div>` block (lines 476-659). This is the first card with the naturalness table.

**Step 3: Simplify the Style Constitution section**

Rename "Refrasa - Style Constitution" to "Refrasa Constitution". Update description. Remove all "Layer 2" references.

Change header (around line 662-672):
```tsx
<h3 className="text-interface flex items-center gap-2 text-sm font-semibold text-foreground">
  <Journal className="h-4 w-4 text-muted-foreground" />
  Refrasa Constitution
</h3>
<p className="text-narrative text-xs text-muted-foreground">
  Kelola constitution untuk Refrasa tool. Hanya satu constitution yang bisa aktif.
</p>
```

**Step 4: Update the table to use all constitutions**

Replace `styleConstitutions.map(...)` with `(constitutions ?? []).map(...)` in both desktop and mobile table bodies. Cast if needed: `((constitutions ?? []) as StyleConstitution[])`.

Replace `styleConstitutions.length === 0` with `(constitutions ?? []).length === 0` for the empty state check.

**Step 5: Simplify empty state**

Remove the "Gunakan Default" seed button (no more `seedDefaultMutation` / `handleSeedDefault`). Just keep "Buat Sendiri" button.

Remove these from the component:
- `const seedDefaultMutation = useMutation(api.styleConstitutions.seedDefault)`
- `const [isSeedingDefault, setIsSeedingDefault] = useState(false)`
- `handleSeedDefault` function

**Step 6: Simplify "Buat Constitution Baru" button**

The header button no longer sets `createType`:
```tsx
<button onClick={() => setIsCreateDialogOpen(true)} ...>
```

**Step 7: Simplify Create/Edit dialog**

Remove type-aware description. Change:
```tsx
<DialogDescription>
  {isEditing
    ? "Perubahan akan membuat versi baru. Versi sebelumnya tetap tersimpan di riwayat."
    : "Buat constitution baru untuk Refrasa. Constitution baru akan tidak aktif secara default."}
</DialogDescription>
```

Remove `type: createType` from `createMutation` call in `handleFormSubmit`.

Remove type-aware helper text under textarea:
```tsx
<p className="text-xs text-muted-foreground">
  Gunakan format Markdown. Constitution berisi aturan gaya penulisan untuk Refrasa.
</p>
```

**Step 8: Simplify deactivate dialog text**

Change:
```
Refrasa akan menggunakan hanya Layer 1 (Core Naturalness Criteria).
```
To:
```
Refrasa akan berjalan tanpa constitution.
```

**Step 9: Remove bottom note**

Delete the note about "kriteria naturalness default (hardcoded)" and "Layer 2 dilewati" (lines 855-859).

**Step 10: Remove `handleCloseFormDialog` reset of createType**

In `handleCloseFormDialog`, remove `setCreateType("style")`.

**Step 11: Remove `type` from StyleConstitution interface**

Remove `type?: "naturalness" | "style"` from the interface (line 55).

**Step 12: Verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Zero errors.

**Step 13: Commit**

```bash
git add src/components/admin/StyleConstitutionManager.tsx
git commit -m "refactor(refrasa): simplify admin panel to single constitution section"
```

---

### Task 5: Delete migration file and update docs

**Files:**
- Delete: `convex/migrations/seedNaturalnessConstitution.ts`
- Modify: `docs/refrasa/README.md`

**Step 1: Delete the migration file**

```bash
rm convex/migrations/seedNaturalnessConstitution.ts
```

**Step 2: Update README**

Rewrite `docs/refrasa/README.md` sections related to constitution:
- Section 7 (Prompting): Remove "Two-Layer Architecture", describe single constitution
- Section 8 (Constitution Data Model): Remove type field discussion, per-type constraint
- Section 14 (Kontrol Admin): Remove Naturalness/Style split description
- Section 15 (Dependencies): Remove `getActiveNaturalness`, `seedNaturalnessConstitution`
- Section 16 (Known Gaps): Update accordingly

**Step 3: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Zero errors.

**Step 4: Commit**

```bash
git add -A && git commit -m "refactor(refrasa): delete naturalness migration, update docs for single constitution"
```

---

### Task 6: Final verification

**Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 2: Run existing tests**

Run: `npm run test 2>&1 | tail -20`
Expected: All tests pass (no refrasa-specific tests should break since prompt-builder tests reference old flow).

**Step 3: Lint check**

Run: `npm run lint 2>&1 | tail -20`
Expected: No new errors.
