# Reference Inventory Contract Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Membangun kontrak permanen untuk `reference inventory response` supaya body response, source panel, dan aturan evidence selalu sinkron, tanpa lagi menghasilkan `Link:` kosong atau klaim misleading.

**Architecture:** Ekstrak kontrak presentasi sumber ke helper backend yang kecil dan teruji, pakai helper itu di orchestrator untuk menentukan `responseMode` dan membangun payload stream terstruktur, lalu ubah UI agar membaca payload presentasi yang sama untuk body dan panel. Jangan menjadikan formatter sebagai solusi utama; formatter hanya safety net.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vercel AI SDK v5, Vitest, existing web-search orchestrator/UI message stream.

---

## Context

Dokumen desain sumber:

- [reference-inventory-contract-design.md](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/docs/search-fetch-rag-jsonRenderer-reinforcement/stream-delivery-gap/reference-inventory-contract-design.md)

Problem yang harus ditutup:

- `data-cited-text` dan `data-cited-sources` sekarang terpisah kontraknya
- body response dirender dari text backend bebas
- panel `Rujukan` dirender dari source list terpisah
- prompt compose saat ini didesain untuk `synthesis`, bukan `reference inventory`
- hasilnya model bisa menulis `Link:` kosong sementara panel punya URL valid

Prinsip implementasi:

1. Jangan tambahkan scoring/filtering pintar di tool pipeline.
2. Bedakan `reference pointer` dari `claimable evidence`.
3. Body dan panel harus membaca payload presentasi yang sama.
4. Orchestrator harus jadi tempat enforcement utama.
5. UI tetap punya fallback legacy, tapi payload baru menjadi kontrak utama.

## Target Files

### New files

- `src/lib/ai/web-search/reference-presentation.ts`
- `__tests__/reference-presentation.test.ts`
- `__tests__/search-results-context-reference-inventory.test.ts`
- `src/components/chat/MessageBubble.reference-inventory.test.tsx`

### Modified files

- `src/lib/ai/web-search/orchestrator.ts`
- `src/lib/ai/web-search/types.ts`
- `src/lib/ai/search-results-context.ts`
- `src/lib/ai/internal-thought-separator.ts`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/SourcesPanel.tsx`
- `src/components/chat/SourcesIndicator.tsx`
- `src/components/chat/ChatWindow.tsx`
- `__tests__/api/chat-internal-thought-separation.test.ts`
- `__tests__/search-results-context.test.ts`
- `src/components/chat/MessageBubble.search-status.test.tsx`

## Task 1: Introduce Shared Reference Presentation Contract

**Files:**
- Create: `src/lib/ai/web-search/reference-presentation.ts`
- Create: `__tests__/reference-presentation.test.ts`
- Modify: `src/lib/ai/web-search/types.ts`

**Step 1: Write the failing tests**

Tambah test untuk kontrak berikut:

```ts
import { describe, expect, it } from "vitest"
import {
  buildReferencePresentationSources,
  inferSearchResponseMode,
  type ReferencePresentationSource,
} from "@/lib/ai/web-search/reference-presentation"

describe("reference presentation contract", () => {
  it("marks verified sources as claimable", () => {
    const sources = buildReferencePresentationSources({
      citations: [
        { url: "https://example.com/paper", title: "Paper A" },
      ],
      fetchedContent: [
        {
          url: "https://example.com/paper",
          resolvedUrl: "https://example.com/paper",
          title: "Paper A",
          publishedAt: null,
          documentKind: "pdf",
          pageContent: "Verified content",
          fullContent: "Verified content",
          fetchMethod: "tavily",
          exactMetadataAvailable: false,
          paragraphs: null,
          documentText: null,
          rawTitle: null,
          author: null,
          siteName: null,
        },
      ],
    })

    expect(sources[0].verificationStatus).toBe("verified_content")
    expect(sources[0].referenceAvailable).toBe(true)
    expect(sources[0].claimable).toBe(true)
  })

  it("keeps unverified URLs displayable but not claimable", () => {
    const sources = buildReferencePresentationSources({
      citations: [
        { url: "https://example.com/file.pdf", title: "Paper PDF" },
      ],
      fetchedContent: [],
    })

    expect(sources[0].verificationStatus).toBe("unverified_link")
    expect(sources[0].referenceAvailable).toBe(true)
    expect(sources[0].claimable).toBe(false)
  })

  it("switches to reference_inventory mode for explicit link/pdf requests", () => {
    const mode = inferSearchResponseMode({
      lastUserMessage: "carikan link PDF dan paper akademiknya",
    })

    expect(mode).toBe("reference_inventory")
  })
})
```

**Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run __tests__/reference-presentation.test.ts
```

Expected:

- FAIL karena module/helper belum ada

**Step 3: Write minimal implementation**

Buat `src/lib/ai/web-search/reference-presentation.ts` dengan shape minimal:

```ts
export type SearchResponseMode = "synthesis" | "reference_inventory" | "mixed"

export type ReferenceVerificationStatus =
  | "verified_content"
  | "unverified_link"
  | "unavailable"

export interface ReferencePresentationSource {
  id: string
  url: string | null
  title: string
  publishedAt?: number | null
  documentKind: "html" | "pdf" | "unknown"
  routeKind?: "html_standard" | "pdf_or_download" | "academic_wall_risk" | "proxy_or_redirect_like"
  verificationStatus: ReferenceVerificationStatus
  referenceAvailable: boolean
  claimable: boolean
  fetchMethod?: "fetch" | "tavily" | null
  failureReason?: string
  citedText?: string
}

export function inferSearchResponseMode(params: {
  lastUserMessage: string
}): SearchResponseMode {
  const text = params.lastUserMessage.toLowerCase()
  if (
    text.includes("pdf") ||
    text.includes("link") ||
    text.includes("tautan") ||
    text.includes("daftar sumber") ||
    text.includes("referensi")
  ) {
    return "reference_inventory"
  }
  return "synthesis"
}
```

Lalu implement `buildReferencePresentationSources()` dengan aturan:

- source dari citation selalu menghasilkan candidate
- kalau fetched content dengan `pageContent` ada => `verified_content`, `claimable = true`
- kalau URL ada tapi page content tidak ada => `unverified_link`, `claimable = false`
- jangan drop source hanya karena unverified

Update `src/lib/ai/web-search/types.ts` untuk memakai type baru di hasil orchestrator.

**Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run __tests__/reference-presentation.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add src/lib/ai/web-search/reference-presentation.ts src/lib/ai/web-search/types.ts __tests__/reference-presentation.test.ts
git commit -m "feat: add reference presentation contract"
```

## Task 2: Add Response-Mode-Aware Search Context

**Files:**
- Modify: `src/lib/ai/search-results-context.ts`
- Create: `__tests__/search-results-context-reference-inventory.test.ts`
- Modify: `__tests__/search-results-context.test.ts`
- Modify: `__tests__/search-results-context-page-content.test.ts`

**Step 1: Write the failing tests**

Tambahkan test bahwa `buildSearchResultsContext()` berubah perilaku saat `responseMode = "reference_inventory"`:

```ts
import { buildSearchResultsContext } from "@/lib/ai/search-results-context"

it("builds reference inventory context that distinguishes displayable links from claimable content", () => {
  const result = buildSearchResultsContext(
    [
      {
        url: "https://example.com/a.pdf",
        title: "Paper A",
        documentKind: "pdf",
        verificationStatus: "unverified_link",
        referenceAvailable: true,
        claimable: false,
      },
      {
        url: "https://example.com/b",
        title: "Paper B",
        pageContent: "Verified content",
        documentKind: "html",
        verificationStatus: "verified_content",
        referenceAvailable: true,
        claimable: true,
      },
    ],
    undefined,
    { responseMode: "reference_inventory" }
  )

  expect(result).toContain("REFERENCE INVENTORY MODE")
  expect(result).toContain("display the URL when available")
  expect(result).toContain("do not make factual claims from unverified links")
})
```

**Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run __tests__/search-results-context.test.ts __tests__/search-results-context-page-content.test.ts __tests__/search-results-context-reference-inventory.test.ts
```

Expected:

- FAIL karena function signature/context baru belum ada

**Step 3: Write minimal implementation**

Ubah `buildSearchResultsContext()` supaya menerima parameter ketiga:

```ts
type SearchResultsContextOptions = {
  responseMode?: "synthesis" | "reference_inventory" | "mixed"
}
```

Tambahkan branch:

- `synthesis` => perilaku lama
- `reference_inventory` => tambahkan instruksi eksplisit:
  - URL boleh ditampilkan saat tersedia
  - unverified links tidak boleh dipakai untuk factual claims
  - model harus menyusun inventory, bukan analisis umum
- `mixed` => kombinasi inventory + summary singkat

Jangan hilangkan instruksi anti-fabrication lama; cukup pisahkan tujuan response.

**Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run __tests__/search-results-context.test.ts __tests__/search-results-context-page-content.test.ts __tests__/search-results-context-reference-inventory.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add src/lib/ai/search-results-context.ts __tests__/search-results-context.test.ts __tests__/search-results-context-page-content.test.ts __tests__/search-results-context-reference-inventory.test.ts
git commit -m "feat: add reference inventory context mode"
```

## Task 3: Make Orchestrator Build Structured Reference Payloads

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts`
- Modify: `src/lib/ai/web-search/types.ts`
- Modify: `src/lib/ai/internal-thought-separator.ts`
- Test: `__tests__/api/chat-internal-thought-separation.test.ts`

**Step 1: Write the failing tests**

Tambahkan unit test untuk payload builder baru di `internal-thought-separator`:

```ts
import { buildUserFacingSearchPayload } from "@/lib/ai/internal-thought-separator"

it("returns structured inventory payload without empty links", () => {
  const payload = buildUserFacingSearchPayload({
    text: "placeholder",
    responseMode: "reference_inventory",
    referenceItems: [
      {
        title: "Paper A",
        url: "https://example.com/a.pdf",
        verificationStatus: "unverified_link",
      },
      {
        title: "Paper B",
        url: null,
        verificationStatus: "unavailable",
      },
    ],
  })

  expect(payload.referenceInventory).toBeDefined()
  expect(payload.referenceInventory?.items[0].url).toBe("https://example.com/a.pdf")
  expect(payload.referenceInventory?.items[1].url).toBeNull()
  expect(payload.citedText).not.toContain("Link:")
})
```

**Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run __tests__/api/chat-internal-thought-separation.test.ts
```

Expected:

- FAIL karena helper masih string-only

**Step 3: Write minimal implementation**

Ubah `buildUserFacingSearchPayload()` jadi menerima object config:

```ts
type BuildUserFacingSearchPayloadInput = {
  text: string
  responseMode: SearchResponseMode
  referenceItems?: ReferenceInventoryItem[]
}
```

Target payload:

```ts
type UserFacingSearchPayload = {
  citedText: string
  internalThoughtText: string
  responseMode: SearchResponseMode
  referenceInventory?: {
    introText: string
    items: ReferenceInventoryItem[]
  }
}
```

Di `orchestrator.ts`:

1. Ambil `lastUserMessage`
2. Panggil `inferSearchResponseMode()`
3. Bangun `ReferencePresentationSource[]`
4. Bangun `ReferenceInventoryItem[]`
5. Kirim `responseMode` ke `buildSearchResultsContext()`
6. Emit stream payload baru:

```ts
writer.write({
  type: "data-reference-inventory",
  id: referenceInventoryId,
  data: {
    responseMode,
    items: referenceInventoryItems,
  },
})
```

7. Tambahkan guard:
   - kalau `responseMode === "reference_inventory"`, jangan izinkan `citedText` mengandung placeholder `Link:` kosong
   - fallback aman: hapus line kosong atau ganti dengan intro text yang jujur

**Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run __tests__/api/chat-internal-thought-separation.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts src/lib/ai/web-search/types.ts src/lib/ai/internal-thought-separator.ts __tests__/api/chat-internal-thought-separation.test.ts
git commit -m "feat: emit structured reference inventory payloads"
```

## Task 4: Bind UI Body and Sources Sheet to the Same Contract

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `src/components/chat/SourcesPanel.tsx`
- Modify: `src/components/chat/SourcesIndicator.tsx`
- Modify: `src/components/chat/ChatWindow.tsx`
- Create: `src/components/chat/MessageBubble.reference-inventory.test.tsx`
- Modify: `src/components/chat/MessageBubble.search-status.test.tsx`

**Step 1: Write the failing tests**

Tambahkan test UI yang membuktikan:

1. body inventory menampilkan URL nyata
2. body tidak merender `Link:` kosong
3. panel `Rujukan` membaca source yang sama

Contoh:

```tsx
it("renders reference inventory items from streamed payload", () => {
  const message = {
    id: "m-ref-inventory",
    role: "assistant",
    parts: [
      { type: "text", text: "placeholder" },
      {
        type: "data-reference-inventory",
        data: {
          responseMode: "reference_inventory",
          items: [
            {
              sourceId: "s1",
              title: "Paper A",
              url: "https://example.com/a.pdf",
              verificationStatus: "unverified_link",
            },
            {
              sourceId: "s2",
              title: "Paper B",
              url: null,
              verificationStatus: "unavailable",
            },
          ],
        },
      },
      {
        type: "data-cited-sources",
        data: {
          sources: [
            { url: "https://example.com/a.pdf", title: "Paper A" },
          ],
        },
      },
    ],
  }

  render(<MessageBubble message={message as any} />)

  expect(screen.getByText("Paper A")).toBeInTheDocument()
  expect(screen.getByText("https://example.com/a.pdf")).toBeInTheDocument()
  expect(screen.queryByText(/^Link:\\s*$/i)).not.toBeInTheDocument()
})
```

**Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run src/components/chat/MessageBubble.reference-inventory.test.tsx src/components/chat/MessageBubble.search-status.test.tsx
```

Expected:

- FAIL karena `data-reference-inventory` belum dibaca UI

**Step 3: Write minimal implementation**

Di `MessageBubble.tsx`:

- tambahkan extractor `data-reference-inventory`
- jika `responseMode === "reference_inventory"` dan items ada:
  - render inventory block khusus
  - jangan render body markdown inventaris dari text bebas
- tetap pertahankan fallback lama untuk pesan lama

Di `SourcesPanel.tsx` dan `SourcesIndicator.tsx`:

- terima source contract yang sedikit lebih kaya, minimal:
  - `verificationStatus`
  - `documentKind`
- tampilkan label jujur untuk source unverified bila tersedia

Di `ChatWindow.tsx`:

- pastikan `sourcesForSheet` tetap menerima source list dari payload baru tanpa memutus compat lama

**Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run src/components/chat/MessageBubble.reference-inventory.test.tsx src/components/chat/MessageBubble.search-status.test.tsx
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add src/components/chat/MessageBubble.tsx src/components/chat/SourcesPanel.tsx src/components/chat/SourcesIndicator.tsx src/components/chat/ChatWindow.tsx src/components/chat/MessageBubble.reference-inventory.test.tsx src/components/chat/MessageBubble.search-status.test.tsx
git commit -m "feat: render reference inventory from structured payload"
```

## Task 5: Add Contract-Level Guardrails and Legacy Safety Nets

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts`
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `src/lib/citations/legacy-source-extractor.ts` only if necessary
- Test: `src/components/chat/MessageBubble.search-status.test.tsx`
- Test: `__tests__/reference-presentation.test.ts`

**Step 1: Write the failing tests**

Tambahkan test guard untuk memastikan:

- `reference_inventory` tidak pernah render `Link:` kosong
- legacy messages tetap aman
- synthesis mode tidak berubah

Contoh:

```ts
it("drops empty placeholder link lines in reference inventory fallback", () => {
  const payload = sanitizeReferenceInventoryText(`
  1. Paper A
  Link:
  `)

  expect(payload).not.toContain("Link:")
})
```

**Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run __tests__/reference-presentation.test.ts src/components/chat/MessageBubble.search-status.test.tsx
```

Expected:

- FAIL karena guard belum ada

**Step 3: Write minimal implementation**

Tambahkan guard kecil, tapi jangan jadikan ini solusi utama:

- di orchestrator, sanitize line placeholder kosong untuk `reference_inventory`
- di UI, kalau item inventory punya `url = null`, render note status, bukan field link kosong
- jangan sentuh rendering `synthesis` biasa

**Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run __tests__/reference-presentation.test.ts src/components/chat/MessageBubble.search-status.test.tsx
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts src/components/chat/MessageBubble.tsx __tests__/reference-presentation.test.ts src/components/chat/MessageBubble.search-status.test.tsx
git commit -m "fix: enforce non-empty link invariant for reference inventory"
```

## Task 6: Full Verification

**Files:**
- No new code

**Step 1: Run targeted tests**

Run:

```bash
npx vitest run __tests__/reference-presentation.test.ts __tests__/search-results-context.test.ts __tests__/search-results-context-page-content.test.ts __tests__/search-results-context-reference-inventory.test.ts __tests__/api/chat-internal-thought-separation.test.ts src/components/chat/MessageBubble.search-status.test.tsx src/components/chat/MessageBubble.reference-inventory.test.tsx
```

Expected:

- semua PASS

**Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected:

- PASS

**Step 3: Run runtime verification**

Jalankan skenario UI:

1. chat yang sudah punya search lama
2. prompt: `carikan lagi paper akademik dalam bentuk PDF`
3. cek:
   - body menampilkan daftar source dengan URL nyata
   - tidak ada `Link:` kosong
   - panel `Rujukan` sinkron dengan body
   - source unverified diberi label jujur

**Step 4: Commit verification note**

```bash
git add .
git commit -m "test: verify reference inventory contract end-to-end"
```

## Acceptance Criteria

Plan ini dianggap berhasil kalau implementasinya nanti memenuhi semua hal berikut:

1. Request `PDF/link/tautan/referensi` menghasilkan `responseMode = "reference_inventory"` atau `mixed`, bukan synthesis generik.
2. Body response dan panel `Rujukan` membaca daftar source dari kontrak yang sama.
3. Tidak ada lagi `Link:` kosong.
4. Source unverified tetap boleh tampil sebagai pointer/reference.
5. Source unverified tetap tidak boleh dipakai untuk factual claims.
6. Legacy synthesis mode tetap aman dan tidak regress.

## Risks To Watch

1. Jangan sampai detector `responseMode` terlalu agresif lalu semua search berubah jadi inventory.
2. Jangan jadikan UI sebagai tempat menyusun kebenaran baru; source of truth tetap backend payload.
3. Jangan hilangkan fallback lama terlalu cepat, karena pesan lama/history masih bisa pakai format lama.
4. Jangan menambah pipeline scoring atau filtering baru.

## Best Recommendation

Urutan terbaik tetap:

1. kontrak helper dulu
2. context/prompt mode
3. orchestrator payload
4. UI binding
5. guardrails
6. verification

Itu paling aman karena memaksa perubahan berjalan dari source of truth ke presentation, bukan sebaliknya.
