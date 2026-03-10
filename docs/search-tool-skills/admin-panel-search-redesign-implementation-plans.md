# Admin Panel — Web Search Retrievers Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace toggle+text web search UI in admin panel with dropdown presets that write `webSearchRetrievers` array, enabling all 4 retriever types and proving the orchestrator architecture works end-to-end.

**Architecture:** Fixed dropdown presets map to retriever registry entries. Admin panel writes `webSearchRetrievers` array to DB. Existing `fromRetrieverArray()` in config-builder reads it. Legacy two-slot fields remain as fallback for old configs.

**Tech Stack:** React 19, Convex mutations, shadcn/ui Select, existing retriever-registry

**Design Doc:** `docs/search-tool-skills/admin-panel-search-redesign-design.md`

---

### Task 1: Rename config-builder functions

**Files:**
- Modify: `src/lib/ai/web-search/config-builder.ts`

**Step 1: Rename functions**

In `src/lib/ai/web-search/config-builder.ts`:
- Line 30: `fromNewFormat(input)` → `fromRetrieverArray(input)`
- Line 35: `function fromNewFormat(` → `function fromRetrieverArray(`
- Line 69: `function fromLegacyFormat(` → `function fromTwoSlotFields(`
- Line 31: `fromLegacyFormat(input)` → `fromTwoSlotFields(input)`

No external callers reference these names — they're private functions. Only `buildRetrieverChain()` is exported.

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Run existing tests**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills && npx vitest run src/lib/ai/search-execution-mode.test.ts`
Expected: All 8 tests pass (these test `resolveSearchExecutionMode`, not config-builder, but verify nothing broke)

**Step 4: Commit**

```bash
git add src/lib/ai/web-search/config-builder.ts
git commit -m "refactor: rename config-builder functions for clarity

fromNewFormat() → fromRetrieverArray()
fromLegacyFormat() → fromTwoSlotFields()"
```

---

### Task 2: Add `webSearchRetrievers` to `AIProviderConfig` interface (Gap 1 fix)

**Files:**
- Modify: `src/lib/ai/config-cache.ts`

**Step 1: Add field to interface**

In `AIProviderConfig` interface (around line 35, after `webSearchFallbackModel`), add:

```ts
  // N-retriever array config (takes precedence over two-slot fields when present)
  webSearchRetrievers?: Array<{
    name: string
    enabled: boolean
    modelId: string
    priority: number
    providerOptions?: { maxResults?: number; engine?: string }
  }>
```

**Step 2: Remove `as any` cast in `getWebSearchConfig()`**

In `src/lib/ai/streaming.ts` around line 167, replace:

```ts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webSearchRetrievers: (config as any).webSearchRetrievers as
      | Array<{ name: string; enabled: boolean; modelId: string; priority: number; providerOptions?: { maxResults?: number; engine?: string } }>
      | undefined,
```

With:

```ts
    webSearchRetrievers: config.webSearchRetrievers,
```

**Step 3: Verify TypeScript compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/ai/config-cache.ts src/lib/ai/streaming.ts
git commit -m "fix: add webSearchRetrievers to AIProviderConfig interface

Removes unsafe 'as any' cast in getWebSearchConfig()"
```

---

### Task 3: Add `webSearchRetrievers` to Convex mutations + preserve in swapProviders (Gap 2+3 fix)

**Files:**
- Modify: `convex/aiProviderConfigs.ts`

**Step 1: Define the validator**

Add a reusable validator constant near the top of the file (after the existing constants around line 7):

```ts
const webSearchRetrieverValidator = v.object({
  name: v.string(),
  enabled: v.boolean(),
  modelId: v.string(),
  priority: v.number(),
  providerOptions: v.optional(v.object({
    maxResults: v.optional(v.number()),
    engine: v.optional(v.string()),
  })),
})
```

**Step 2: Add to `createConfig` mutation args**

In `createConfig` args (around line 179, after `webSearchFallbackModel`), add:

```ts
    webSearchRetrievers: v.optional(v.array(webSearchRetrieverValidator)),
```

In the `createConfig` handler, where the `ctx.db.insert` call builds the document (search for the insert call), add `webSearchRetrievers: args.webSearchRetrievers` to the inserted object.

**Step 3: Add to `updateConfig` mutation args**

In `updateConfig` args (around line 297, after `webSearchFallbackModel`), add:

```ts
    webSearchRetrievers: v.optional(v.array(webSearchRetrieverValidator)),
```

In the `updateConfig` handler, add merge logic after the web search settings block (around line 356):

```ts
    const webSearchRetrievers =
      args.webSearchRetrievers !== undefined ? args.webSearchRetrievers : oldConfig.webSearchRetrievers
```

And include `webSearchRetrievers` in the `ctx.db.insert` call for the new version.

**Step 4: Preserve `webSearchRetrievers` in `swapProviders` mutation (Gap 3)**

Find the `swapProviders` mutation (around line 487). In the `ctx.db.insert` call (around line 519-560), add after `webSearchFallbackModel`:

```ts
      webSearchRetrievers: config.webSearchRetrievers,
```

This preserves the array when AI providers are swapped. Search retriever config is independent of AI provider config — it should not be affected by provider swap.

**Step 5: Verify Convex types**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors (the schema already has this field, so the insert should type-check)

**Step 6: Commit**

```bash
git add convex/aiProviderConfigs.ts
git commit -m "fix: add webSearchRetrievers to mutations + preserve in swapProviders

- createConfig: accept webSearchRetrievers arg
- updateConfig: accept + merge with old config
- swapProviders: preserve array in new version (Gap 2+3 fix)"
```

---

### Task 4: Create retriever presets constant

**Files:**
- Create: `src/components/admin/web-search-presets.ts`

**Step 1: Create the presets file**

```ts
export const RETRIEVER_PRESETS = [
  { key: "perplexity",       label: "Perplexity Sonar",        modelId: "perplexity/sonar",   provider: "openrouter" },
  { key: "grok",             label: "Grok Mini",               modelId: "x-ai/grok-3-mini",   provider: "openrouter" },
  { key: "google-grounding", label: "Google Grounding Gemini",  modelId: "gemini-2.5-flash",   provider: "google-ai-studio" },
  { key: "openai-search",    label: "OpenAI GPT-4o Mini",      modelId: "openai/gpt-4o-mini", provider: "openrouter" },
] as const

export type RetrieverPresetKey = typeof RETRIEVER_PRESETS[number]["key"]

export function getPresetByKey(key: string) {
  return RETRIEVER_PRESETS.find((p) => p.key === key)
}

export function getModelIdForKey(key: string): string {
  return getPresetByKey(key)?.modelId ?? ""
}

export function getLabelForKey(key: string): string {
  return getPresetByKey(key)?.label ?? key
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/admin/web-search-presets.ts
git commit -m "feat: add retriever presets constant for admin panel dropdowns"
```

---

### Task 5: Replace web search UI section in AIProviderConfigEditor

**Files:**
- Modify: `src/components/admin/AIProviderConfigEditor.tsx`

This is the largest task. Replace the entire web search section (lines ~1189-1334) with dropdown+swap UI.

**Step 1: Replace state variables**

Find the 6 web search state variables (around lines 171-177):

```ts
  const [primaryWebSearchEnabled, setPrimaryWebSearchEnabled] = useState(...)
  const [fallbackWebSearchEnabled, setFallbackWebSearchEnabled] = useState(...)
  const [fallbackWebSearchEngine, setFallbackWebSearchEngine] = useState(...)
  const [fallbackWebSearchMaxResults, setFallbackWebSearchMaxResults] = useState(...)
  const [webSearchModel, setWebSearchModel] = useState(...)
  const [webSearchFallbackModel, setWebSearchFallbackModel] = useState(...)
```

Replace with 2 state variables that read from `webSearchRetrievers` array if present, else derive from old fields:

```ts
  // Web search retriever dropdowns
  const initPrimaryRetriever = (() => {
    const retrievers = config?.webSearchRetrievers as Array<{ name: string; enabled: boolean; priority: number }> | undefined
    if (retrievers && retrievers.length > 0) {
      const primary = retrievers.find((r) => r.priority === 0) ?? retrievers[0]
      return primary.enabled ? primary.name : ""
    }
    // Fallback: derive from old two-slot fields
    if (config?.primaryWebSearchEnabled === false) return ""
    return "perplexity"
  })()
  const initFallbackRetriever = (() => {
    const retrievers = config?.webSearchRetrievers as Array<{ name: string; enabled: boolean; priority: number }> | undefined
    if (retrievers && retrievers.length > 0) {
      const fallback = retrievers.find((r) => r.priority === 1) ?? (retrievers.length > 1 ? retrievers[1] : undefined)
      return fallback?.enabled ? fallback.name : ""
    }
    if (config?.fallbackWebSearchEnabled === false) return ""
    return "grok"
  })()

  const [primaryRetriever, setPrimaryRetriever] = useState(initPrimaryRetriever)
  const [fallbackRetriever, setFallbackRetriever] = useState(initFallbackRetriever)
```

Add import at top of file:

```ts
import { RETRIEVER_PRESETS, getModelIdForKey, getLabelForKey } from "./web-search-presets"
```

**Step 2: Replace web search UI section**

Replace the entire web search section (from `{/* ── Web Search Settings ──` to its closing `</div>`) with:

```tsx
            {/* ── Web Search Retrievers ────────────────────────────────── */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-narrative text-base font-medium tracking-tight text-foreground">
                  Web Search Retrievers
                </h3>
                <p className="text-interface text-xs text-muted-foreground">
                  Pilih retriever untuk pencarian web. Primary dicoba pertama, fallback jika gagal.
                </p>
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-2.5 rounded-action border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950/30">
                <InfoCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                <p className="text-interface text-xs text-sky-700 dark:text-sky-300">
                  Pencarian web via OpenRouter atau Google Grounding Gemini
                </p>
              </div>

              <div className="space-y-4">
                {/* Primary Search Retriever */}
                <div className="space-y-2">
                  <Label htmlFor="primaryRetriever" className="text-interface text-xs font-medium">
                    Primary Search Retriever
                  </Label>
                  <Select
                    value={primaryRetriever}
                    onValueChange={setPrimaryRetriever}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="primaryRetriever" className="rounded-action">
                      <SelectValue placeholder="Disabled" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Disabled</SelectItem>
                      {RETRIEVER_PRESETS.map((p) => (
                        <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {primaryRetriever && (
                    <p className="text-interface text-[10px] text-muted-foreground">
                      Model: {getModelIdForKey(primaryRetriever)}
                    </p>
                  )}
                </div>

                {/* Duplicate validation */}
                {primaryRetriever && fallbackRetriever && primaryRetriever === fallbackRetriever && (
                  <p className="text-interface text-[10px] text-destructive">
                    Primary dan fallback tidak boleh sama
                  </p>
                )}

                {/* Swap Button */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setPrimaryRetriever(fallbackRetriever)
                      setFallbackRetriever(primaryRetriever)
                    }}
                    disabled={isLoading || (!primaryRetriever && !fallbackRetriever)}
                    className="inline-flex h-7 items-center gap-1 rounded-action border border-border px-3 font-mono text-[10px] font-medium text-sky-600 transition-colors hover:bg-muted disabled:opacity-50 dark:text-sky-400"
                  >
                    <DataTransferBoth className="h-4 w-4" />
                    <span>Tukar Posisi</span>
                  </button>
                </div>

                {/* Fallback Search Retriever */}
                <div className="space-y-2">
                  <Label htmlFor="fallbackRetriever" className="text-interface text-xs font-medium">
                    Fallback Search Retriever
                  </Label>
                  <Select
                    value={fallbackRetriever}
                    onValueChange={setFallbackRetriever}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="fallbackRetriever" className="rounded-action">
                      <SelectValue placeholder="Disabled" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Disabled</SelectItem>
                      {RETRIEVER_PRESETS.map((p) => (
                        <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fallbackRetriever && (
                    <p className="text-interface text-[10px] text-muted-foreground">
                      Model: {getModelIdForKey(fallbackRetriever)}
                    </p>
                  )}
                </div>
              </div>
            </div>
```

Add `DataTransferBoth` to the iconoir-react import at the top of the file if not already imported.

**Step 3: Update save logic**

In the save handler (around lines 480-540), find the block that conditionally adds web search fields to `updateArgs`. Replace ALL 6 web search conditional blocks:

```ts
        if (primaryWebSearchEnabled !== ...) { ... }
        if (fallbackWebSearchEnabled !== ...) { ... }
        if (fallbackWebSearchEngine !== ...) { ... }
        if (fallbackWebSearchMaxResults !== ...) { ... }
        if (webSearchModel !== ...) { ... }
        if (webSearchFallbackModel !== ...) { ... }
```

With a single block that builds and saves the `webSearchRetrievers` array:

```ts
        // Build webSearchRetrievers array from dropdown selections
        const newRetrievers: Array<{ name: string; enabled: boolean; modelId: string; priority: number }> = []
        if (primaryRetriever) {
          newRetrievers.push({
            name: primaryRetriever,
            enabled: true,
            modelId: getModelIdForKey(primaryRetriever),
            priority: 0,
          })
        }
        if (fallbackRetriever) {
          newRetrievers.push({
            name: fallbackRetriever,
            enabled: true,
            modelId: getModelIdForKey(fallbackRetriever),
            priority: 1,
          })
        }
        updateArgs.webSearchRetrievers = newRetrievers
```

Do the same for the CREATE path (around lines 516-541) — add `webSearchRetrievers` to the `createMutation` call. Remove the 6 old web search fields from the create call and replace with:

```ts
          webSearchRetrievers: (() => {
            const arr: Array<{ name: string; enabled: boolean; modelId: string; priority: number }> = []
            if (primaryRetriever) arr.push({ name: primaryRetriever, enabled: true, modelId: getModelIdForKey(primaryRetriever), priority: 0 })
            if (fallbackRetriever) arr.push({ name: fallbackRetriever, enabled: true, modelId: getModelIdForKey(fallbackRetriever), priority: 1 })
            return arr
          })(),
```

**Step 4: Update `hasChanges` detection**

In the `hasChanges` computed value (around lines 554-579), replace the 6 web search comparisons:

```ts
      primaryWebSearchEnabled !== (config.primaryWebSearchEnabled ?? true) ||
      fallbackWebSearchEnabled !== (config.fallbackWebSearchEnabled ?? true) ||
      ...
```

With:

```ts
      primaryRetriever !== initPrimaryRetriever ||
      fallbackRetriever !== initFallbackRetriever ||
```

**Step 5: Add duplicate validation to save**

At the top of the save handler, add validation:

```ts
    if (primaryRetriever && fallbackRetriever && primaryRetriever === fallbackRetriever) {
      toast.error("Primary dan fallback retriever tidak boleh sama")
      return
    }
```

**Step 6: Verify TypeScript compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 7: Commit**

```bash
git add src/components/admin/AIProviderConfigEditor.tsx
git commit -m "feat: replace web search toggles with retriever dropdown presets

- Dropdown with 4 presets + Disabled option
- Swap button to exchange primary/fallback
- Writes webSearchRetrievers array to DB
- Reads from array on edit, falls back to old fields"
```

---

### Task 6: Update WebSearchChip display in AIProviderManager

**Files:**
- Modify: `src/components/admin/AIProviderManager.tsx`

**Step 1: Update WebSearchChip component**

Find the `WebSearchChip` component (around lines 487-511). Update it to read from `webSearchRetrievers` array first, falling back to old fields:

```tsx
function WebSearchChip({
  config,
}: {
  config: {
    primaryWebSearchEnabled?: boolean
    fallbackWebSearchEnabled?: boolean
    webSearchModel?: string
    webSearchFallbackModel?: string
    webSearchRetrievers?: Array<{ name: string; enabled: boolean; modelId: string; priority: number }>
  }
}) {
  let primaryLabel = "off"
  let fallbackLabel = "off"

  if (config.webSearchRetrievers && config.webSearchRetrievers.length > 0) {
    const sorted = [...config.webSearchRetrievers].sort((a, b) => a.priority - b.priority)
    const primary = sorted[0]
    const fallback = sorted[1]
    if (primary?.enabled) primaryLabel = primary.name
    if (fallback?.enabled) fallbackLabel = fallback.name
  } else {
    if (config.primaryWebSearchEnabled ?? true) primaryLabel = config.webSearchModel ?? "perplexity/sonar"
    if (config.fallbackWebSearchEnabled ?? true) fallbackLabel = config.webSearchFallbackModel ?? "x-ai/grok-3-mini"
  }

  return (
    <div className="flex items-center gap-1.5">
      <Globe className="h-3 w-3 text-slate-400 dark:text-slate-500" />
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        Search
      </span>
      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
        P: {primaryLabel}{"  "}F: {fallbackLabel}
      </span>
    </div>
  )
}
```

**Step 2: Update the call site**

Find where `WebSearchChip` is called (around lines 391-396). Replace the individual props with the config object:

```tsx
        <WebSearchChip config={config} />
```

**Step 3: Verify TypeScript compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/admin/AIProviderManager.tsx
git commit -m "feat: update WebSearchChip to read from webSearchRetrievers array"
```

---

### Task 7: Handle AIProviderFormDialog (if it exists as separate form)

**Files:**
- Modify: `src/components/admin/AIProviderFormDialog.tsx` (if web search fields exist here too)

**Step 1: Check if AIProviderFormDialog has web search UI**

The research showed this file also has `primaryWebSearchEnabled` state and save logic. Apply the same changes as Task 4:
- Replace state variables with `primaryRetriever`/`fallbackRetriever`
- Replace web search UI section with dropdown+swap
- Update save logic to write `webSearchRetrievers` array
- Update `hasChanges` detection

Follow the exact same pattern as Task 5. The code is nearly identical between the two files.

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/admin/AIProviderFormDialog.tsx
git commit -m "feat: update AIProviderFormDialog with retriever dropdown presets"
```

---

### Task 8: Add `retrieverName` to telemetry (Gap 4 fix)

**Files:**
- Modify: `src/lib/ai/telemetry.ts`
- Modify: `convex/schema.ts`
- Modify: `src/app/api/chat/route.ts`

**Step 1: Add `retrieverName` to telemetry type**

In `src/lib/ai/telemetry.ts`, find the `TelemetryParams` type (around line 6). Add after `attemptedRetrievers`:

```ts
  retrieverName?: string
```

**Step 2: Add `retrieverName` to Convex schema**

In `convex/schema.ts`, find the `aiTelemetry` table definition. Add after `attemptedRetrievers`:

```ts
    retrieverName: v.optional(v.string()),
```

**Step 3: Log `retrieverName` in route.ts telemetry call**

In `src/app/api/chat/route.ts`, find the `logAiTelemetry` call inside the orchestrator `onFinish` callback (around line 2253). Add:

```ts
          retrieverName: result.retrieverName,
```

**Step 4: Verify TypeScript compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 5: Commit**

```bash
git add src/lib/ai/telemetry.ts convex/schema.ts src/app/api/chat/route.ts
git commit -m "feat: log retrieverName in telemetry (Gap 4 fix)

Now logs which retriever actually succeeded (e.g., 'perplexity', 'grok'),
not just the provider it maps to."
```

---

### Task 9: Update console log format for array config (Gap 5 fix)

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1: Update SearchExecution console log**

Find the console log at line 2017:

```ts
console.log(
    `[SearchExecution] mode=${searchExecutionMode}, searchRequired=${searchRequestedByPolicy}, primaryEnabled=${webSearchConfig.primaryEnabled}, fallbackEnabled=${webSearchConfig.fallbackEnabled}`
)
```

Replace with:

```ts
console.log(
    `[SearchExecution] mode=${searchExecutionMode}, searchRequired=${searchRequestedByPolicy}`,
    webSearchConfig.webSearchRetrievers
        ? `retrievers=[${webSearchConfig.webSearchRetrievers.map((r: { name: string; enabled: boolean }) => `${r.name}:${r.enabled}`).join(",")}]`
        : `primaryEnabled=${webSearchConfig.primaryEnabled}, fallbackEnabled=${webSearchConfig.fallbackEnabled}`
)
```

This shows retriever array info when available, falls back to legacy field display.

**Step 2: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "fix: update SearchExecution console log for array config format (Gap 5 fix)"
```

---

### Task 10: End-to-end smoke test — Perplexity path

**Files:** None (manual testing)

**Step 1: Start dev servers**

Run in separate terminals:
- `npm run dev` (Next.js)
- `npm run convex:dev` (Convex — if not already running)

**Step 2: Open admin panel, edit active config**

1. Navigate to admin panel → AI Providers
2. Edit the active configuration
3. Verify web search section shows new dropdown UI
4. Verify Primary = Perplexity Sonar, Fallback = Grok Mini (derived from old fields or defaults)
5. Save without changes — verify save succeeds

**Step 3: Test Perplexity search**

1. Open chat, ask a factual question requiring web search (e.g., "Apa berita terbaru hari ini?")
2. Verify terminal shows:
   - `[SearchExecution] mode=perplexity`
   - `[Orchestrator] perplexity: text=Xchars, rawCitations=Y, sources=Z`
3. Verify citations appear in response

**Step 4: Verify DB has `webSearchRetrievers` array**

Check Convex dashboard — the active config should now have `webSearchRetrievers` field with 2 entries after save.

---

### Task 11: End-to-end smoke test — Grok failover via swap

**Files:** None (manual testing)

**Step 1: Swap retrievers in admin panel**

1. Edit active config
2. Click "Tukar Posisi" button — Primary becomes Grok Mini, Fallback becomes Perplexity Sonar
3. Save

**Step 2: Test Grok as primary**

1. Open chat, ask a factual question
2. Verify terminal shows:
   - `[SearchExecution] mode=grok`
   - `[Orchestrator] grok: text=Xchars, rawCitations=Y, sources=Z`
3. Verify citations appear in response

**Step 3: Swap back**

Restore Perplexity as Primary, Grok as Fallback. Save.

---

### Task 12: End-to-end smoke test — Disabled primary (Grok only)

**Files:** None (manual testing)

**Step 1: Disable primary in admin panel**

1. Edit active config
2. Set Primary to "Disabled", keep Fallback as Grok Mini
3. Save

**Step 2: Test Grok as sole retriever**

1. Ask a factual question
2. Verify terminal shows mode=grok and citations work
3. Verify chain has only 1 entry

**Step 3: Restore**

Set Primary back to Perplexity Sonar. Save.

---

### Task 13: Cleanup — remove debug log from orchestrator (Gap 6 fix)

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts`

**Step 1: Remove debug log**

In `orchestrator.ts` around line 80, remove:

```ts
      console.info(`[Orchestrator] ${retriever.name}: text=${searchText.length}chars, rawCitations=${rawCitations.length}, sources=${sources.length}`)
```

This was a development debug log. The orchestrator should be silent on success (errors still log via catch block).

**Step 2: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts
git commit -m "chore: remove debug log from orchestrator"
```
