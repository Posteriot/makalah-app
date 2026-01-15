# Web Search - Files Index

Quick reference untuk lokasi semua files terkait Web Search / Google Search.

## Quick Jump

| Category | Count | Files |
|----------|-------|-------|
| [Core Backend](#core-backend) | 2 | Chat route, streaming |
| [Citations Processing](#citations-processing) | 2 | URL normalization, metadata fetch |
| [UI Components](#ui-components) | 6 | Message bubble, indicators, chips |
| [Database](#database) | 2 | Schema, messages |
| [Paper Workflow Prompts](#paper-workflow-prompts) | 4 | Stage instructions |
| **Total** | **16** | |

---

## Core Backend

```
src/
├── app/api/chat/
│   └── route.ts                      # Main chat endpoint + web search router
└── lib/ai/
    └── streaming.ts                  # Provider models + getGoogleSearchTool()
```

### Chat Route (src/app/api/chat/route.ts)

| Line | What's There |
|------|--------------|
| 11 | Import `normalizeWebSearchUrl` |
| 12 | Import `enrichSourcesWithFetchedTitles` |
| 153-171 | `isExplicitSearchRequest()` |
| 174-197 | `ACTIVE_SEARCH_STAGES`, `PASSIVE_SEARCH_STAGES`, `getStageSearchPolicy()` |
| 376-413 | `getSearchEvidenceFromStageData()` |
| 431-457 | `hasPreviousSearchResults()` |
| 459-482 | `isUserConfirmationMessage()` (<= 400) |
| 485-619 | `decideWebSearchMode()` router function |
| 865-869 | Get Google Search tool |
| 871-873 | **Critical constraint comment** |
| 875-933 | Router decision + `shouldForceSubmitValidation` |
| 935-954 | Web search behavior system note |
| 964-966 | Tool set selection (web search vs function tools) |
| 967-969 | `maxToolSteps` (web search = 1) |
| 976-983 | `streamText()` call + `toolChoice` |
| 985-1031 | onFinish (mode normal): simpan sources (opsional) |
| 1034-1461 | `createUIMessageStream()` for web search mode |
| 1059-1110 | `data-search` status awal + penutupan status |
| 1091-1093 | Deteksi `source-url` → `hasAnySource` |
| 1118-1153 | Type definitions + grounding helpers |
| 1155-1199 | URL filtering helpers + canonicalization |
| 1219-1286 | `insertInlineCitations()` function |
| 1292-1305 | Provider metadata extraction with timeout |
| 1353-1399 | URL enrichment, dedup, low-value filtering |
| 1407-1434 | Stream `data-cited-text`, `data-cited-sources`, `saveAssistantMessage()` |
| 1441-1451 | Forward chunk error/abort + return UI stream response |

### Streaming Helpers (src/lib/ai/streaming.ts)

| Line | What's There |
|------|--------------|
| 210-233 | `getGoogleSearchTool()` function |
| 212 | Import `@ai-sdk/google` |
| 215 | Access `google.tools?.googleSearch` factory |
| 223-225 | Call factory to get tool instance |

---

## Citations Processing

```
src/lib/citations/
├── apaWeb.ts                         # URL normalization, APA formatting
└── webTitle.ts                       # Web page metadata fetching
```

### URL Normalization (src/lib/citations/apaWeb.ts)

| Line | Function | Description |
|------|----------|-------------|
| 7-12 | `GOOGLE_PROXY_HOSTS` | Set of proxy hostnames |
| 28-41 | `tryParseAbsoluteUrl()` | Safe URL parsing |
| 43-55 | `decodeUrlMaybe()` | Decode URL-encoded strings |
| 86-89 | `isGoogleProxyHost()` | Check if proxy URL |
| 91-116 | `unwrapGoogleProxyUrl()` | Extract real URL from proxy |
| 118-124 | `normalizeWebSearchUrl()` | Main normalization function |
| 244-255 | `deriveSiteNameFromUrl()` | Extract site name for citations |
| 335-379 | `getApaWebReferenceParts()` | Get APA formatted parts |
| 395-410 | `getWebCitationDisplayParts()` | Get display-friendly parts |

### Metadata Fetching (src/lib/citations/webTitle.ts)

| Line | Function | Description |
|------|----------|-------------|
| 23-37 | `extractMetaContent()` | Parse meta tags from HTML |
| 39-42 | `extractTitleTag()` | Extract `<title>` content |
| 115-122 | `isDisallowedHost()` | Skip localhost, private IPs |
| 124-127 | `isGoogleGroundingRedirectHost()` | Detect Vertex proxy |
| 166-195 | `parseDateFromUrl()` | Extract date from URL path |
| 197-211 | `parseIsoDateTimeToMs()` | Parse ISO date strings |
| 213-244 | `extractPublishedAtFromHtml()` | Get published date from HTML |
| 246-361 | `fetchWebPageMetadata()` | Main fetch function |
| 368-387 | `enrichSourcesWithFetchedTitles()` | Enrich sources array |

---

## UI Components

```
src/components/
├── chat/
│   ├── MessageBubble.tsx             # Container with extraction logic
│   ├── MarkdownRenderer.tsx          # Markdown + citation rendering
│   ├── InlineCitationChip.tsx        # Hover card citation chip
│   ├── SearchStatusIndicator.tsx     # "Mencari..." indicator
│   ├── SourcesIndicator.tsx          # Collapsible sources list
│   └── ToolStateIndicator.tsx        # Tool state display
└── ai-elements/
    └── inline-citation.tsx           # Reusable citation primitives
```

### MessageBubble (src/components/chat/MessageBubble.tsx)

| Line | Function | Description |
|------|----------|-------------|
| 159-173 | `extractSearchStatus()` | Get status from `data-search` part |
| 180-188 | `extractCitedText()` | Get text from `data-cited-text` part |
| 191-213 | `extractCitedSources()` | Get sources from `data-cited-sources` part |
| 261-262 | Search tools extraction | Separate search from non-search tools |
| 264-270 | Sources extraction | `data-cited-sources` → annotations → message.sources |
| 371-375 | MarkdownRenderer usage | Pass citedText dan sources |
| 378-382 | SearchStatusIndicator | Show search status |
| 413-417 | SourcesIndicator | Show sources list |

### MarkdownRenderer (src/components/chat/MarkdownRenderer.tsx)

| Line | Function | Description |
|------|----------|-------------|
| 4 | Import `InlineCitationChip` | Citation chip component |
| 12-16 | `CitationSource` type | Source type definition |
| 232-395 | `renderInline()` | Parse inline markdown |
| 286-317 | Citation detection | Match `[1]`, `[1,2]` patterns |
| 297-306 | Source selection | Map numbers to sources |
| 307-314 | Render `InlineCitationChip` | With selected sources |
| 533-542 | `MarkdownRenderer` | Main component |
| 535-537 | Citation marker detection | Tambah fallback chip jika `sources` ada tapi marker kosong |

### InlineCitationChip (src/components/chat/InlineCitationChip.tsx)

| Line | Description |
|------|-------------|
| 1-26 | Imports and types |
| 27-31 | `CitationSource` type |
| 33-44 | `formatDateId()` - Indonesian date format |
| 46-53 | `formatHostname()` - Clean hostname |
| 55-67 | `useIsMobile()` hook |
| 69-132 | `InlineCitationChip` component |
| 78-97 | Carousel content |
| 99-119 | Mobile: Sheet with carousel |
| 122-131 | Desktop: HoverCard with carousel |

### SearchStatusIndicator (src/components/chat/SearchStatusIndicator.tsx)

| Line | Description |
|------|-------------|
| 6 | `SearchStatus` type export |
| 8-10 | Props interface |
| 12-37 | Component implementation |
| 13 | Filter: only show "searching" or "error" |
| 29-33 | Icon: GlobeIcon or AlertCircleIcon |

### SourcesIndicator (src/components/chat/SourcesIndicator.tsx)

| Line | Description |
|------|-------------|
| 13 | Import `getWebCitationDisplayParts` |
| 16-20 | `Source` interface |
| 26-109 | `SourcesIndicator` component |
| 32-35 | Pagination: 5 items initially |
| 38-68 | Collapsible container |
| 71-95 | Source list with formatted parts |
| 97-106 | "Show more" button |

### Inline Citation Primitives (src/components/ai-elements/inline-citation.tsx)

| Line | Component | Description |
|------|-----------|-------------|
| 27-29 | `InlineCitation` | Wrapper span |
| 31-34 | `InlineCitationText` | Text with hover highlight |
| 36-39 | `InlineCitationCard` | HoverCard wrapper |
| 54-74 | `InlineCitationCardTrigger` | Badge trigger |
| 76-79 | `InlineCitationCardBody` | HoverCard content |
| 81-96 | `InlineCitationCarousel` | Carousel with API context |
| 125-157 | `InlineCitationCarouselIndex` | "1/3" counter |
| 160-181 | `InlineCitationCarouselPrev` | Previous button |
| 183-204 | `InlineCitationCarouselNext` | Next button |
| 206-251 | `InlineCitationSource` | Source card content |

---

## Database

```
convex/
├── schema.ts                         # Messages table with sources field
└── messages.ts                       # Message CRUD operations
```

### Schema (convex/schema.ts)

| Line | What's There |
|------|--------------|
| 50-66 | `messages` table definition |
| 61-65 | `sources` field (optional array) |

```typescript
// Lines 61-65
sources: v.optional(v.array(v.object({
  url: v.string(),
  title: v.string(),
  publishedAt: v.optional(v.number()),
}))),
```

### Messages Mutations (convex/messages.ts)

| Line | What's There |
|------|--------------|
| 52-85 | `createMessage` mutation |
| 64-68 | `sources` arg (optional array) |

`createMessage` menerima `sources` untuk menyimpan sitasi ke tabel `messages`.

---

## Paper Workflow Prompts

```
src/lib/ai/paper-stages/
├── foundation.ts                     # Gagasan & Topik (web search kondisional)
├── core.ts                           # Pendahuluan/Tinjauan/Metodologi (web search opsional/pendalaman)
├── results.ts                        # Hasil/Diskusi/Kesimpulan (web search selektif)
└── finalization.ts                   # Outline/Daftar Pustaka/Lampiran/Judul (mode pasif)
```

### Stage Instructions

| File | Fokus |
|------|-------|
| `foundation.ts` | Instruksi gagasan/topik + kewajiban `google_search` untuk referensi |
| `core.ts` | Pendalaman literatur + contoh metodologi |
| `results.ts` | Referensi pembanding (selektif) |
| `finalization.ts` | Verifikasi/enrichment referensi & template (pasif) |

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WEB SEARCH FLOW                                    │
│                                                                             │
│  User message → /api/chat → Router decision → streamText with google_search │
│       │                                                │                    │
│       └─────────────────────────────────────────────────┘                   │
│                                    │                                         │
│                                    ▼                                         │
│              groundingMetadata → URL enrichment → Citation insertion         │
│                                    │                                         │
│                                    ▼                                         │
│              Stream data parts → MessageBubble → MarkdownRenderer           │
│                                    │                                         │
│                                    ▼                                         │
│              [1], [2] markers → InlineCitationChip → HoverCard/Sheet        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Search Patterns

```bash
# Find all web search related files
rg "google_search|googleSearch|groundingMetadata" src/ convex/ -g "*.ts" -g "*.tsx"

# Find where getGoogleSearchTool is used
rg "getGoogleSearchTool" src/

# Find citation processing
rg "InlineCitationChip|CitationSource|citedText" src/components/

# Find URL normalization
rg "normalizeWebSearchUrl|enrichSourcesWithFetchedTitles" src/

# Find search status handling
rg "data-search|SearchStatus|searchStatus" src/
```

---

## Quick Reference: Key Lines

| File | Line(s) | What's There |
|------|---------|--------------|
| `src/app/api/chat/route.ts` | 485-619 | Router function |
| `src/app/api/chat/route.ts` | 871-873 | Critical constraint comment |
| `src/app/api/chat/route.ts` | 964-966 | Tool set selection |
| `src/app/api/chat/route.ts` | 1219-1286 | Inline citation insertion |
| `src/lib/ai/streaming.ts` | 210-233 | `getGoogleSearchTool()` |
| `src/lib/citations/apaWeb.ts` | 118-124 | `normalizeWebSearchUrl()` |
| `src/lib/citations/webTitle.ts` | 368-387 | `enrichSourcesWithFetchedTitles()` |
| `src/components/chat/MessageBubble.tsx` | 159-213 | Data extraction functions |
| `src/components/chat/MarkdownRenderer.tsx` | 286-317 | Citation pattern matching |
| `src/components/chat/InlineCitationChip.tsx` | 69-132 | Chip component |
| `convex/schema.ts` | 61-65 | Sources field definition |

---

*Last updated: 2026-01-14*
