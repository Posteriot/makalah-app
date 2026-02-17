# Search Reference Auto-Persist — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-persist google_search results to paper stageData so reference data survives across turns, eliminating citation hallucination.

**Architecture:** Server-side auto-persist in the web search finish handler. A new `webSearchReferences` field is added to all 13 stage schemas. A new `appendSearchReferences` Convex mutation appends references with URL dedup. For gagasan/topik, references also populate the native `referensiAwal`/`referensiPendukung` fields. The `formatStageData()` function formats persisted references prominently in the system prompt.

**Tech Stack:** Convex (schema + mutation), Next.js API route (finish handler), TypeScript

---

### Task 1: Add `webSearchReferences` to Client-Side Stage Types

**Files:**
- Modify: `src/lib/paper/stage-types.ts`

**Step 1: Add `WebSearchReference` interface and field to all stage types**

Add this interface at the top of the file (after existing imports/interfaces):

```ts
export interface WebSearchReference {
  url: string
  title: string
  publishedAt?: number
}
```

Then add `webSearchReferences?: WebSearchReference[]` to ALL 13 stage data interfaces: `GagasanData`, `TopikData`, `AbstrakData`, `PendahuluanData`, `TinjauanLiteraturData`, `MetodologiData`, `HasilData`, `DiskusiData`, `KesimpulanData`, `DaftarPustakaData`, `LampiranData`, `JudulData`, `OutlineData`.

**Step 2: Verify no TypeScript errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/paper-workflow-resilience && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors (existing errors may be present)

**Step 3: Commit**

```bash
git add src/lib/paper/stage-types.ts
git commit -m "feat(paper): add WebSearchReference type to all stage interfaces"
```

---

### Task 2: Add `webSearchReferences` to Convex Validators (types.ts)

**Files:**
- Modify: `convex/paperSessions/types.ts`

**Step 1: Add `webSearchReferences` validator to every stage**

Define the reusable shape once near the top (after `SitasiAPAShape`):

```ts
const WebSearchReferenceShape = {
    url: v.string(),
    title: v.string(),
    publishedAt: v.optional(v.number()),
};
```

Then add this field to ALL 13 stage validators (`GagasanData`, `TopikData`, `AbstrakData`, `PendahuluanData`, `TinjauanLiteraturData`, `MetodologiData`, `HasilData`, `DiskusiData`, `KesimpulanData`, `DaftarPustakaData`, `LampiranData`, `JudulData`, `OutlineData`):

```ts
webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
```

Insert it BEFORE `artifactId` in each validator for consistency.

**Step 2: Verify no TypeScript errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/paper-workflow-resilience && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors

**Step 3: Commit**

```bash
git add convex/paperSessions/types.ts
git commit -m "feat(schema): add webSearchReferences validator to all 13 stage types"
```

---

### Task 3: Add `webSearchReferences` to Convex Schema Inline Definitions

**Files:**
- Modify: `convex/schema.ts:317-432` (the inline stageData definitions for gagasan, topik, abstrak, pendahuluan, tinjauan_literatur, metodologi)

**Step 1: Add field to 6 inline stage definitions**

For each of the 6 stages that have inline definitions in schema.ts (gagasan, topik, abstrak, pendahuluan, tinjauan_literatur, metodologi), add BEFORE the `artifactId` line:

```ts
        webSearchReferences: v.optional(v.array(v.object({
          url: v.string(),
          title: v.string(),
          publishedAt: v.optional(v.number()),
        }))),
```

The remaining 7 stages (outline, hasil, diskusi, kesimpulan, daftar_pustaka, lampiran, judul) use imported validators from types.ts, so they automatically get the field from Task 2.

**Step 2: Verify Convex schema syncs**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/paper-workflow-resilience && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add webSearchReferences to 6 inline stage definitions"
```

---

### Task 4: Add `webSearchReferences` to Stage Key Whitelist

**Files:**
- Modify: `convex/paperSessions.ts:25-83` (the `STAGE_KEY_WHITELIST`)

**Step 1: Add `"webSearchReferences"` to ALL 13 entries in `STAGE_KEY_WHITELIST`**

For each stage array, add `"webSearchReferences"` — place it right before `"artifactId"` for consistency.

Example for gagasan (line 26-29):
```ts
    gagasan: [
        "ringkasan", "ringkasanDetail", "ideKasar", "analisis", "angle", "novelty",
        "referensiAwal", "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
    ],
```

Do this for all 13 stages: gagasan, topik, outline, abstrak, pendahuluan, tinjauan_literatur, metodologi, hasil, diskusi, kesimpulan, daftar_pustaka, lampiran, judul.

**Step 2: Verify no TypeScript errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/paper-workflow-resilience && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors

**Step 3: Commit**

```bash
git add convex/paperSessions.ts
git commit -m "feat(paper): add webSearchReferences to stage key whitelist"
```

---

### Task 5: Implement `appendSearchReferences` Mutation

**Files:**
- Modify: `convex/paperSessions.ts` (add new mutation after `updateStageData` mutation around line 683)

**Step 1: Add URL normalization helper**

Add this helper function near the top of the file (after `STAGE_KEY_WHITELIST`):

```ts
/**
 * Normalize URL for dedup: strip UTM params, trailing slash, hash.
 */
function normalizeUrlForDedup(raw: string): string {
    try {
        const u = new URL(raw);
        for (const key of Array.from(u.searchParams.keys())) {
            if (/^utm_/i.test(key)) u.searchParams.delete(key);
        }
        u.hash = "";
        const out = u.toString();
        return out.endsWith("/") ? out.slice(0, -1) : out;
    } catch {
        return raw;
    }
}
```

**Step 2: Add the stage-to-native-field mapping**

```ts
/**
 * Map stages to their native reference fields (for dual-write).
 * Only stages with compatible schemas (all-optional fields) are included.
 */
const STAGE_NATIVE_REF_FIELD: Record<string, string | null> = {
    gagasan: "referensiAwal",
    topik: "referensiPendukung",
    // Other stages have required fields in their reference schemas,
    // so we only write to webSearchReferences for them.
};
```

**Step 3: Add the mutation**

```ts
export const appendSearchReferences = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        references: v.array(v.object({
            url: v.string(),
            title: v.string(),
            publishedAt: v.optional(v.number()),
        })),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            console.error("[appendSearchReferences] Session not found:", args.sessionId);
            return;
        }

        const stage = session.currentStage;
        if (!STAGE_ORDER.includes(stage as PaperStageId)) {
            console.error("[appendSearchReferences] Unknown stage:", stage);
            return;
        }

        const stageDataObj = (session.stageData ?? {}) as Record<string, Record<string, unknown>>;
        const currentData = { ...(stageDataObj[stage] ?? {}) };

        // 1. Append to webSearchReferences (all stages) with URL dedup
        const existingWebRefs = (currentData.webSearchReferences ?? []) as Array<{
            url: string; title: string; publishedAt?: number;
        }>;
        const existingUrls = new Set(existingWebRefs.map(r => normalizeUrlForDedup(r.url)));

        const newRefs = args.references.filter(
            r => !existingUrls.has(normalizeUrlForDedup(r.url))
        );

        if (newRefs.length === 0) {
            return; // All refs already exist, no-op
        }

        currentData.webSearchReferences = [
            ...existingWebRefs,
            ...newRefs.map(r => ({
                url: r.url,
                title: r.title,
                ...(r.publishedAt !== undefined ? { publishedAt: r.publishedAt } : {}),
            })),
        ];

        // 2. Dual-write to native reference field for gagasan/topik
        const nativeField = STAGE_NATIVE_REF_FIELD[stage];
        if (nativeField) {
            const existingNativeRefs = (currentData[nativeField] ?? []) as Array<{
                title: string; url?: string; [key: string]: unknown;
            }>;
            const existingNativeUrls = new Set(
                existingNativeRefs
                    .filter(r => r.url)
                    .map(r => normalizeUrlForDedup(r.url!))
            );

            const newNativeRefs = newRefs
                .filter(r => !existingNativeUrls.has(normalizeUrlForDedup(r.url)))
                .map(r => ({
                    title: r.title,
                    url: r.url,
                    ...(r.publishedAt !== undefined ? { publishedAt: r.publishedAt } : {}),
                }));

            if (newNativeRefs.length > 0) {
                currentData[nativeField] = [...existingNativeRefs, ...newNativeRefs];
            }
        }

        // 3. Patch stageData
        await ctx.db.patch(args.sessionId, {
            stageData: {
                ...session.stageData,
                [stage]: currentData,
            },
            updatedAt: Date.now(),
        });

        console.log(
            `[appendSearchReferences] Appended ${newRefs.length} refs to stage ${stage}` +
            (nativeField ? ` (also to ${nativeField})` : "")
        );
    },
});
```

**Step 4: Verify no TypeScript errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/paper-workflow-resilience && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors

**Step 5: Commit**

```bash
git add convex/paperSessions.ts
git commit -m "feat(paper): add appendSearchReferences mutation with URL dedup and dual-write"
```

---

### Task 6: Auto-Persist in Primary Web Search Finish Handler

**Files:**
- Modify: `src/app/api/chat/route.ts` (~line 1707, after `saveAssistantMessage` in primary web search finish handler)

**Step 1: Add auto-persist call after `saveAssistantMessage`**

Find the line (around 1707):
```ts
await saveAssistantMessage(textWithInlineCitations, persistedSources, modelNames.primary.model)
```

Add immediately AFTER it (before the title update block):

```ts
                                    // ──── Auto-persist search references to paper stageData ────
                                    if (paperSession && persistedSources && persistedSources.length > 0) {
                                        try {
                                            await fetchMutationWithToken(api.paperSessions.appendSearchReferences, {
                                                sessionId: paperSession._id,
                                                references: persistedSources.map(s => ({
                                                    url: s.url,
                                                    title: s.title,
                                                    ...(typeof s.publishedAt === "number" && Number.isFinite(s.publishedAt)
                                                        ? { publishedAt: s.publishedAt }
                                                        : {}),
                                                })),
                                            })
                                            console.log(`[Paper] Auto-persisted ${persistedSources.length} search refs to stageData`)
                                        } catch (err) {
                                            console.error("[Paper] Failed to auto-persist search references:", err)
                                            // Non-blocking: don't fail the response stream
                                        }
                                    }
                                    // ───────────────────────────────────────────────────────────
```

**Step 2: Verify no TypeScript errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/paper-workflow-resilience && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(paper): auto-persist search references in primary web search handler"
```

---

### Task 7: Auto-Persist in Fallback Web Search Finish Handler

**Files:**
- Modify: `src/app/api/chat/route.ts` (~line 1985-1997, in the fallback :online finish handler)

**Step 1: Add auto-persist call after fallback `saveAssistantMessage`**

Find the block (around line 1984-1997) where fallback saves with citations:
```ts
                                    // Task 2.5: Save to database with fallback metadata
                                    await saveAssistantMessage(
                                        textWithCitations,
                                        persistedSources,
                                        `${modelNames.fallback.model}:online`
                                    )
```

Add immediately AFTER the `saveAssistantMessage` call (inside the `if (hasAnyCitations)` block, before the closing `}` of that block):

```ts
                                    // ──── Auto-persist search references to paper stageData ────
                                    if (paperSession && persistedSources.length > 0) {
                                        try {
                                            await fetchMutationWithToken(api.paperSessions.appendSearchReferences, {
                                                sessionId: paperSession._id,
                                                references: persistedSources.map(s => ({
                                                    url: s.url,
                                                    title: s.title,
                                                    ...(typeof s.publishedAt === "number" && Number.isFinite(s.publishedAt)
                                                        ? { publishedAt: s.publishedAt }
                                                        : {}),
                                                })),
                                            })
                                            console.log(`[Paper][Fallback] Auto-persisted ${persistedSources.length} search refs to stageData`)
                                        } catch (err) {
                                            console.error("[Paper][Fallback] Failed to auto-persist search references:", err)
                                        }
                                    }
                                    // ───────────────────────────────────────────────────────────
```

**Step 2: Verify no TypeScript errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/paper-workflow-resilience && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(paper): auto-persist search references in fallback web search handler"
```

---

### Task 8: Format `webSearchReferences` in Prompt Injection

**Files:**
- Modify: `src/lib/ai/paper-stages/formatStageData.ts`

**Step 1: Add `formatWebSearchReferences` helper function**

Add this function before `formatStageData()` (around line 65):

```ts
/**
 * Format webSearchReferences from the ACTIVE stage into a prominent block.
 * This ensures AI has structured reference data available every turn.
 */
function formatWebSearchReferences(stageData: StageData, currentStage: PaperStageId | "completed"): string {
    if (currentStage === "completed") return "";

    const data = stageData[currentStage] as AllStageData | undefined;
    if (!data) return "";

    const refs = (data as Record<string, unknown>).webSearchReferences as
        Array<{ url: string; title: string; publishedAt?: number }> | undefined;

    if (!refs || refs.length === 0) return "";

    const lines = refs.map((ref, i) => {
        const date = ref.publishedAt
            ? ` (${new Date(ref.publishedAt).getFullYear()})`
            : "";
        return `  ${i + 1}. "${ref.title}"${date} — ${ref.url}`;
    });

    return [
        `📚 REFERENSI WEB SEARCH TERSIMPAN (WAJIB gunakan, JANGAN fabricate):`,
        ...lines,
        ``,
        `⚠️ SEMUA sitasi in-text HARUS merujuk ke referensi di atas.`,
        `Jika butuh referensi tambahan, MINTA user untuk search dulu.`,
    ].join("\n");
}
```

**Step 2: Integrate into `formatStageData()`**

In `formatStageData()` (around line 67-87), add the web search references block. Insert it AFTER `formatActiveStageData` and BEFORE `formatOutlineChecklist`:

```ts
export function formatStageData(
    stageData: StageData,
    currentStage: PaperStageId | "completed"
): string {
    const sections: string[] = [];

    sections.push(formatRingkasanTahapSelesai(stageData, currentStage));

    const activeStageBlock = formatActiveStageData(stageData, currentStage);
    if (activeStageBlock) {
        sections.push(activeStageBlock);
    }

    // NEW: Web search references block (prominent, for anti-hallucination)
    const webRefsBlock = formatWebSearchReferences(stageData, currentStage);
    if (webRefsBlock) {
        sections.push(webRefsBlock);
    }

    sections.push(formatOutlineChecklist(stageData.outline, currentStage));

    if (sections.length === 0) {
        return "Belum ada data dari tahap sebelumnya.";
    }

    return sections.join("\n\n");
}
```

**Step 3: Verify no TypeScript errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/paper-workflow-resilience && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/lib/ai/paper-stages/formatStageData.ts
git commit -m "feat(paper): format webSearchReferences prominently in prompt injection"
```

---

### Task 9: Fix Abort Path — Save Message on Stream Interruption

**Files:**
- Modify: `src/app/api/chat/route.ts` (~line 1752-1756, the abort handler in primary web search stream)

**Step 1: Find the abort handler**

Locate the block around line 1752:
```ts
                            if (chunk.type === "abort") {
                                closeSearchStatus(hasAnySource ? "done" : "off")
                                writer.write(chunk)
```

**Step 2: Add saveAssistantMessage in abort path**

Replace the abort block with:

```ts
                            if (chunk.type === "abort") {
                                closeSearchStatus(hasAnySource ? "done" : "off")
                                // Save partial message on abort to prevent data loss
                                if (streamedText.trim()) {
                                    try {
                                        await saveAssistantMessage(streamedText, undefined, modelNames.primary.model)
                                        console.log("[Chat API] Saved partial message on stream abort")
                                    } catch (err) {
                                        console.error("[Chat API] Failed to save partial message on abort:", err)
                                    }
                                }
                                writer.write(chunk)
```

**Step 3: Verify no TypeScript errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/paper-workflow-resilience && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "fix(chat): save partial message on web search stream abort"
```

---

### Task 10: Verify Build

**Step 1: Run full TypeScript check**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/paper-workflow-resilience && npx tsc --noEmit --pretty 2>&1 | tail -20`
Expected: No new errors from our changes

**Step 2: Run lint**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/paper-workflow-resilience && npm run lint 2>&1 | tail -20`
Expected: No new lint errors from our changes

**Step 3: Run existing tests**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/paper-workflow-resilience && npm run test 2>&1 | tail -20`
Expected: All existing tests still pass

---

### Task 11: Manual Integration Test

**Prerequisites:** Both `npm run dev` and `npm run convex:dev` running against the worktree.

**Test 1: Web search in paper mode → verify stageData updated**

1. Start a new conversation
2. Trigger paper mode (e.g. "Saya mau menulis makalah tentang dampak AI pada pendidikan")
3. AI starts paper session → stage = gagasan
4. User requests search (e.g. "Cari referensi awal tentang topik ini")
5. AI performs google_search → returns results with URLs
6. **Verify:** Open AI Ops Dashboard → find session → expand gagasan stage
7. **Expected:** `webSearchReferences` field populated with URLs from search
8. **Expected:** `referensiAwal` also populated (dual-write for gagasan)

**Test 2: References survive across turns**

1. Continue from Test 1
2. In next turn, ask AI to draft (e.g. "Buatkan analisis kelayakan")
3. **Verify:** AI uses references from stageData, NOT hallucinated citations
4. **Verify:** No "(Kuanta.id, t.t.)" or similar domain-as-author citations

**Test 3: Dedup on repeated search**

1. Ask AI to search again (e.g. "Cari lagi referensi tambahan")
2. **Verify:** New unique references appended, duplicates skipped
3. **Verify:** AI Ops Dashboard shows combined list without dupes
