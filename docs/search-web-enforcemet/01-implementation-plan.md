# Search Web Enforcement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menjamin request yang butuh data faktual tidak pernah diam-diam turun ke non-search saat `google_search` unavailable.

**Architecture:** Pisahkan keputusan menjadi dua layer: (1) apakah search dibutuhkan (existing router/stage policy), (2) mode eksekusi search berdasarkan availability tool (`primary`, `fallback`, `blocked`, `off`). Tool availability dibuat typed (bukan `null`) agar route bisa fail-closed dan fallback dengan reason code yang terukur.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vercel AI SDK v6 (`ai@6`), `@ai-sdk/google`, Vitest, Convex telemetry.

---

**Referenced skills:** `@ai-engineer`, `@logic-thinker`, `@code-reviewer`

### Task 1: Typed Google Search Availability Contract

**Files:**
- Create: `src/lib/ai/google-search-tool.ts`
- Modify: `src/lib/ai/streaming.ts`
- Test: `src/lib/ai/google-search-tool.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest"
import { initGoogleSearchTool } from "@/lib/ai/google-search-tool"

describe("initGoogleSearchTool", () => {
  it("returns unavailable when factory is missing", async () => {
    const result = await initGoogleSearchTool(async () => ({ google: { tools: {} } }))
    expect(result.status).toBe("unavailable")
    expect(result.reason).toBe("factory_missing")
  })

  it("returns ready when factory returns tool instance", async () => {
    const result = await initGoogleSearchTool(async () => ({
      google: { tools: { googleSearch: () => ({ type: "provider-defined" }) } },
    }))
    expect(result.status).toBe("ready")
    expect(result.tool).toBeTruthy()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ai/google-search-tool.test.ts -v`
Expected: FAIL karena file/fungsi belum ada.

**Step 3: Write minimal implementation**

```ts
export type GoogleSearchToolInitResult =
  | { status: "ready"; tool: unknown; reason: "ok" }
  | {
      status: "unavailable"
      tool: null
      reason: "import_failed" | "factory_missing" | "factory_init_failed"
      errorMessage?: string
    }

export async function initGoogleSearchTool(
  loader: () => Promise<unknown> = () => import("@ai-sdk/google")
): Promise<GoogleSearchToolInitResult> {
  try {
    const mod = (await loader()) as { google?: { tools?: { googleSearch?: unknown } } }
    const toolFactory = mod.google?.tools?.googleSearch
    if (!toolFactory) {
      return { status: "unavailable", tool: null, reason: "factory_missing" }
    }
    if (typeof toolFactory === "function") {
      try {
        return { status: "ready", tool: (toolFactory as (args: object) => unknown)({}), reason: "ok" }
      } catch (error) {
        return {
          status: "unavailable",
          tool: null,
          reason: "factory_init_failed",
          errorMessage: error instanceof Error ? error.message : String(error),
        }
      }
    }
    return { status: "ready", tool: toolFactory, reason: "ok" }
  } catch (error) {
    return {
      status: "unavailable",
      tool: null,
      reason: "import_failed",
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}
```

Update `streaming.ts` agar `getGoogleSearchTool()` tetap backward-compatible:

```ts
export async function getGoogleSearchTool() {
  const result = await initGoogleSearchTool()
  return result.status === "ready" ? result.tool : null
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ai/google-search-tool.test.ts -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/ai/google-search-tool.ts src/lib/ai/google-search-tool.test.ts src/lib/ai/streaming.ts
git commit -m "feat(ai): add typed google_search availability contract"
```

### Task 2: Deterministic Search Execution Mode Resolver

**Files:**
- Create: `src/lib/ai/search-execution-mode.ts`
- Test: `src/lib/ai/search-execution-mode.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest"
import { resolveSearchExecutionMode } from "@/lib/ai/search-execution-mode"

describe("resolveSearchExecutionMode", () => {
  it("selects primary when search required and primary tool available", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      primaryToolReady: true,
      fallbackOnlineEnabled: true,
      fallbackProvider: "openrouter",
    })
    expect(mode).toBe("primary_google_search")
  })

  it("selects fallback when primary unavailable but fallback online available", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      primaryToolReady: false,
      fallbackOnlineEnabled: true,
      fallbackProvider: "openrouter",
    })
    expect(mode).toBe("fallback_online_search")
  })

  it("blocks when search required but no engine available", () => {
    const mode = resolveSearchExecutionMode({
      searchRequired: true,
      primaryToolReady: false,
      fallbackOnlineEnabled: false,
      fallbackProvider: "openrouter",
    })
    expect(mode).toBe("blocked_unavailable")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ai/search-execution-mode.test.ts -v`
Expected: FAIL karena resolver belum ada.

**Step 3: Write minimal implementation**

```ts
export type SearchExecutionMode =
  | "primary_google_search"
  | "fallback_online_search"
  | "blocked_unavailable"
  | "off"

export function resolveSearchExecutionMode(input: {
  searchRequired: boolean
  primaryToolReady: boolean
  fallbackOnlineEnabled: boolean
  fallbackProvider: "openrouter" | "vercel-gateway" | string
}): SearchExecutionMode {
  if (!input.searchRequired) return "off"
  if (input.primaryToolReady) return "primary_google_search"
  if (input.fallbackOnlineEnabled && input.fallbackProvider === "openrouter") {
    return "fallback_online_search"
  }
  return "blocked_unavailable"
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ai/search-execution-mode.test.ts -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/ai/search-execution-mode.ts src/lib/ai/search-execution-mode.test.ts
git commit -m "feat(ai): add deterministic search execution mode resolver"
```

### Task 3: Integrate Resolver in Chat Route (No Silent Downgrade)

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Test: `src/lib/ai/search-execution-mode.test.ts` (extend cases)

**Step 1: Write the failing test (extend existing resolver test)**

```ts
it("never returns off when searchRequired is true", () => {
  const mode = resolveSearchExecutionMode({
    searchRequired: true,
    primaryToolReady: false,
    fallbackOnlineEnabled: false,
    fallbackProvider: "openrouter",
  })
  expect(mode).not.toBe("off")
})
```

**Step 2: Run test to verify it fails (if resolver still permissive)**

Run: `npx vitest run src/lib/ai/search-execution-mode.test.ts -v`
Expected: FAIL sebelum route integration final (jika kondisi belum ketat).

**Step 3: Write minimal implementation in route**

Patch utama `route.ts`:

```ts
const googleSearchInit = await initGoogleSearchTool()
const primaryToolReady = googleSearchInit.status === "ready"
const wrappedGoogleSearchTool = primaryToolReady ? googleSearchInit.tool : null

const searchRequired =
  !!paperModePrompt
    ? stagePolicyAllowsSearch && (webSearchDecision.enableWebSearch || explicitSearchRequest || explicitSearchFallback)
    : (webSearchDecision.enableWebSearch || explicitSearchRequest)

const executionMode = resolveSearchExecutionMode({
  searchRequired,
  primaryToolReady,
  fallbackOnlineEnabled: webSearchConfig.fallbackEnabled,
  fallbackProvider: modelNames.fallback.provider,
})

if (executionMode === "primary_google_search") {
  enableWebSearch = true
} else if (executionMode === "fallback_online_search") {
  enableWebSearch = true
  throw new SearchToolUnavailableError(googleSearchInit.reason)
} else if (executionMode === "blocked_unavailable") {
  enableWebSearch = false
  searchUnavailableReason = "search_required_but_unavailable"
} else {
  enableWebSearch = false
}
```

Catatan implementasi:
- `SearchToolUnavailableError` adalah error internal terkontrol untuk lompat ke fallback branch.
- Jangan ubah policy stage; hanya ubah capability handling.

**Step 4: Run tests to verify**

Run:
- `npx vitest run src/lib/ai/search-execution-mode.test.ts -v`
- `npx tsc --noEmit`

Expected: PASS + no type errors.

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts src/lib/ai/search-execution-mode.ts src/lib/ai/search-execution-mode.test.ts src/lib/ai/google-search-tool.ts
 git commit -m "fix(chat): enforce deterministic websearch mode when primary tool unavailable"
```

### Task 4: Fallback Behavior + Telemetry Reason Codes

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/lib/ai/telemetry.ts` (type only jika dibutuhkan)
- Modify: `convex/aiTelemetry.ts` (hanya jika reason enum/type perlu eksplisit)

**Step 1: Write failing test for reason mapping**

```ts
import { describe, it, expect } from "vitest"
import { mapSearchToolReasonToFallbackReason } from "@/lib/ai/search-execution-mode"

describe("mapSearchToolReasonToFallbackReason", () => {
  it("maps factory_missing to telemetry reason", () => {
    expect(mapSearchToolReasonToFallbackReason("factory_missing")).toBe("google_search_tool_factory_missing")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ai/search-execution-mode.test.ts -v`
Expected: FAIL.

**Step 3: Write minimal implementation**

Tambahkan mapper:

```ts
export function mapSearchToolReasonToFallbackReason(reason: string): string {
  if (reason === "import_failed") return "google_search_tool_import_failed"
  if (reason === "factory_missing") return "google_search_tool_factory_missing"
  if (reason === "factory_init_failed") return "google_search_tool_factory_init_failed"
  return "google_search_tool_unknown_unavailable"
}
```

Lalu di `route.ts` saat throw fallback / blocked:

```ts
const fallbackReason = mapSearchToolReasonToFallbackReason(googleSearchInit.reason)
// pass ke logAiTelemetry(... fallbackReason)
```

**Step 4: Run verification**

Run:
- `npx vitest run src/lib/ai/search-execution-mode.test.ts -v`
- `npm run lint`

Expected: PASS + lint clean.

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts src/lib/ai/search-execution-mode.ts src/lib/ai/search-execution-mode.test.ts src/lib/ai/telemetry.ts convex/aiTelemetry.ts
git commit -m "chore(ai-telemetry): add explicit websearch tool availability reason codes"
```

### Task 5: Surface Search Error Message to UI

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `src/components/chat/SearchStatusIndicator.tsx` (gunakan props yang sudah ada)
- Test: `src/components/chat/MessageBubble.search-status.test.tsx`

**Step 1: Write failing UI test**

```tsx
import { render, screen } from "@testing-library/react"
import { MessageBubble } from "@/components/chat/MessageBubble"

it("renders custom search error message from data-search", () => {
  const message = {
    id: "m1",
    role: "assistant",
    parts: [{ type: "data-search", data: { status: "error", message: "Tool pencarian tidak tersedia" } }],
  }

  render(<MessageBubble message={message as any} isLoading={false} isLastMessage={true} />)
  expect(screen.getByText("Tool pencarian tidak tersedia")).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/chat/MessageBubble.search-status.test.tsx -v`
Expected: FAIL karena parser saat ini hanya ambil `status`.

**Step 3: Write minimal implementation**

- Ubah extractor di `MessageBubble` dari `SearchStatus | null` menjadi `{ status: SearchStatus; message?: string } | null`.
- Teruskan `message` ke `<SearchStatusIndicator status={...} message={...} />`.
- Di `route.ts`, saat mode `blocked_unavailable`, emit `data-search` dengan payload:

```ts
{ status: "error", message: "Pencarian web tidak tersedia saat ini. Coba lagi beberapa saat." }
```

**Step 4: Run test to verify it passes**

Run:
- `npx vitest run src/components/chat/MessageBubble.search-status.test.tsx -v`
- `npm run test`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts src/components/chat/MessageBubble.tsx src/components/chat/SearchStatusIndicator.tsx src/components/chat/MessageBubble.search-status.test.tsx
git commit -m "feat(chat-ui): show explicit websearch availability error message"
```

### Task 6: End-to-End Verification Checklist (Mandatory)

**Files:**
- Modify (documentation only): `docs/search-web-enforcemet/verification-report.md`

**Step 1: Prepare E2E scenarios**

Tambahkan checklist 4 skenario:
1. factual prompt + primary tool ready -> `primary_google_search`
2. factual prompt + primary unavailable + fallback enabled -> fallback online search
3. factual prompt + all unavailable -> blocked + explicit error status
4. non-factual prompt -> mode off (behavior lama)

**Step 2: Run verification commands**

Run:
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run dev` lalu uji manual via UI chat

Expected:
- Semua command PASS.
- Skenario 1-4 sesuai expected.

**Step 3: Capture evidence**

Isi `verification-report.md` dengan:
- timestamp
- commit SHA
- hasil command
- screenshot path
- observed telemetry reason code

**Step 4: Final sanity**

Run: `git status --short`
Expected: hanya file yang memang terkait feature ini.

**Step 5: Commit**

```bash
git add docs/search-web-enforcemet/verification-report.md
git commit -m "docs(search-web-enforcement): add end-to-end verification evidence"
```

### Task 7: Final Integration Commit (Squash optional by maintainer)

**Files:**
- No new file (repo state)

**Step 1: Re-run full gate**

Run:
- `npm run lint`
- `npm run build`
- `npm run test`

Expected: all PASS.

**Step 2: Generate change summary**

Run: `git log --oneline -n 10`
Expected: terlihat rangkaian commit Task 1-6.

**Step 3: Ensure no silent downgrade path remains**

Run:

```bash
rg -n "\?\? null|!!wrappedGoogleSearchTool|search_required_but_unavailable|fallback_online_search|primary_google_search" src/app/api/chat/route.ts src/lib/ai
```

Expected:
- Tidak ada lagi jalur yang menurunkan `searchRequired=true` langsung ke mode off tanpa reason.

**Step 4: Tag release note draft**

Tuliskan ringkasan internal:
- apa yang diperbaiki
- impact ke AI SDK v6
- cara rollback

**Step 5: Commit**

```bash
git add -A
git commit -m "fix(ai): enforce websearch availability with deterministic fallback and fail-closed guard"
```
