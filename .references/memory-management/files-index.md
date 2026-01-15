# Memory Management - Files Index

Daftar lengkap file yang terlibat dalam arsitektur memory management Makalah App.

## Daftar Isi

1. [Database Layer (Convex)](#database-layer-convex)
2. [Context Injection Layer](#context-injection-layer)
3. [Chat Flow Layer](#chat-flow-layer)
4. [Model & Provider Layer](#model--provider-layer)
5. [UI Components](#ui-components)
6. [Hooks](#hooks)
7. [Diagram Dependensi](#diagram-dependensi)

---

## Database Layer (Convex)

### Schema Definition

```
convex/
├── schema.ts                    # Definisi semua tabel
│   ├── paperSessions (L204-352) # Paper workflow state + stageData
│   ├── messages (L50-68)        # Chat history
│   ├── artifacts (L108-147)     # Output detail (offloaded)
│   ├── conversations (L37-48)   # Conversation metadata
│   └── files (L70-88)           # Uploaded files
│
├── paperSessions.ts             # CRUD untuk paper sessions
│   ├── getById                  # Query by session ID
│   ├── getByConversation        # Query by conversation ID
│   ├── getByUser                # Query by user ID
│   ├── create                   # Create new session
│   ├── updateStageData          # Update current stage data
│   ├── submitForValidation      # Set status to pending_validation
│   ├── approveStage             # Approve dan advance ke next stage
│   └── requestRevision          # Set status to revision
│
├── paperSessions/
│   ├── constants.ts             # STAGE_ORDER, getStageLabel, getNextStage
│   └── types.ts                 # Convex validators untuk stageData
│
└── messages.ts                  # CRUD untuk messages
    ├── getMessages (L5-14)      # Query ALL messages (no limit)
    ├── createMessage            # Create new message
    └── editAndTruncateConversation  # Edit & truncate for regeneration
```

### Fungsi Kunci

| File | Fungsi | Line | Deskripsi |
|------|--------|------|-----------|
| `convex/messages.ts` | `getMessages` | 5-14 | Query SEMUA messages tanpa limit |
| `convex/paperSessions.ts` | `getByConversation` | 102 | Ambil session untuk context injection |
| `convex/paperSessions.ts` | `updateStageData` | 247 | Update stageData termasuk ringkasan |
| `convex/paperSessions.ts` | `approveStage` | 319 | Set validatedAt, advance stage |
| `convex/paperSessions.ts` | `markStageAsDirty` | 656 | Set dirty flag saat edit/regenerate |

---

## Context Injection Layer

### Summarization & Formatting

```
src/lib/ai/paper-stages/
├── index.ts                     # Router getStageInstructions()
├── formatStageData.ts           # KUNCI: Summarization logic
│   ├── formatStageData()        # Main entry point
│   ├── formatRingkasanTahapSelesai()  # Ringkasan 280 char max
│   ├── formatActiveStageData()  # Detail tahap aktif 1000 char max
│   └── formatOutlineChecklist() # Checklist outline
│
├── foundation.ts                # Instruksi tahap 1-2
├── core.ts                      # Instruksi tahap 4-7
├── results.ts                   # Instruksi tahap 8-10
└── finalization.ts              # Instruksi tahap 3, 11-13
```

### Prompt Injection

```
src/lib/ai/
├── paper-mode-prompt.ts         # getPaperModeSystemPrompt()
│   └── Calls formatStageData() untuk context injection
│
├── paper-intent-detector.ts     # hasPaperWritingIntent()
│   └── Deteksi intent dari messages
│
├── paper-workflow-reminder.ts   # PAPER_WORKFLOW_REMINDER constant
│   └── Reminder untuk start session jika belum ada
│
├── paper-tools.ts               # createPaperTools()
│   ├── startPaperSession        # Tool untuk init session
│   ├── getCurrentPaperState     # Tool untuk get state
│   ├── updateStageData          # Tool untuk update data
│   └── submitStageForValidation # Tool untuk submit
│
└── chat-config.ts               # getSystemPrompt() + fallback
    ├── getSystemPrompt()        # Fetch dari Convex atau fallback
    ├── getMinimalFallbackPrompt() # Fallback prompt
    └── CHAT_CONFIG              # Model settings
```

### Konstanta Kunci

| File | Konstanta | Nilai | Fungsi |
|------|-----------|-------|--------|
| `formatStageData.ts:25` | `SUMMARY_CHAR_LIMIT` | 1000 | Max char untuk field detail |
| `formatStageData.ts:26` | `RINGKASAN_CHAR_LIMIT` | 280 | Max char untuk ringkasan |
| `formatStageData.ts:592` | `MAX_OUTLINE_SECTIONS` | 10 | Max sections di outline checklist |
| `formatStageData.ts:593` | `MAX_OUTLINE_DEPTH` | 2 | Max depth level di outline |
| `route.ts:172` | `MAX_FILE_CONTEXT_CHARS_PER_FILE` | 6000 | Max chars per file (paper mode) |
| `route.ts:173` | `MAX_FILE_CONTEXT_CHARS_TOTAL` | 20000 | Max total file context chars |
| `route.ts:230` | `MAX_CHAT_HISTORY_PAIRS` | 20 | Max chat pairs di paper mode |
| `config-cache.ts:32` | `TTL` | 300000 (5 min) | Config cache TTL |
| `chat-config.ts:108` | `maxTokens` | 2048 | Konstanta (belum dipakai di route chat) |

---

## Chat Flow Layer

### API Route

```
src/app/api/chat/
└── route.ts                     # Main chat endpoint
    ├── POST handler (L18-...)
    │   ├── Auth (L20-24)
    │   ├── Parse body (L27-28)    # messages, conversationId, fileIds
    │   ├── Get system prompt (L?)
    │   ├── Get paper mode prompt (L?)
    │   ├── Convert messages (L224) # convertToModelMessages()
    │   ├── Build full messages (L251-263)
    │   │   └── [systemPrompt, paperModePrompt?, reminder?, fileContext?, ...trimmedModelMessages]
    │   ├── Route decision (L279-339) # google_search vs function tools
    │   └── Stream response
    │
    └── Message assembly pattern:
        const fullMessagesBase = [
            { role: "system", content: systemPrompt },
            ...(paperModePrompt ? [...] : []),
            ...(paperWorkflowReminder ? [...] : []),
            ...(fileContext ? [...] : []),
            ...trimmedModelMessages,  // di paper mode sudah di-trim; selain itu = semua history
        ]
```

### Key Lines in route.ts

| Line | Code | Fungsi |
|------|------|--------|
| 224 | `convertToModelMessages(messages)` | Convert UI messages ke model format |
| 251-263 | `fullMessagesBase = [...]` | Assemble semua context |
| 279-339 | `decideWebSearchMode()` | Router: google_search vs tools |

---

## Model & Provider Layer

### Streaming & Model Creation

```
src/lib/ai/
├── streaming.ts                 # Model helpers
│   ├── getProviderConfig()      # Load config dari cache/DB
│   ├── createProviderModel()    # Create AI SDK model instance
│   ├── getGatewayModel()        # Get primary model
│   ├── getOpenRouterModel()     # Get fallback model
│   ├── getProviderSettings()    # Get temperature, topP
│   └── getGoogleSearchTool()    # Get google_search tool
│
└── config-cache.ts              # AI config caching
    ├── ConfigCache class
    │   ├── get()                # Get cached or fetch fresh
    │   ├── invalidate()         # Force refresh
    │   └── getState()           # Debug info
    └── configCache singleton
```

### Provider Configuration

| Provider | Model | Source |
|----------|-------|--------|
| Primary (fallback) | `google/gemini-2.5-flash-lite` | Vercel AI Gateway (fallback di `streaming.ts`) |
| Fallback (fallback) | `google/gemini-2.5-flash-lite` | OpenRouter (fallback di `streaming.ts`) |
| Active (DB) | Dinamis | `aiProviderConfigs` via `config-cache.ts` |

---

## UI Components

### Chat Components

```
src/components/chat/
├── ChatWindow.tsx               # Main chat container
│   ├── useMessages() hook       # Fetch history
│   ├── useChat() hook           # AI SDK chat
│   ├── History sync effect      # Sync Convex → useChat
│   └── sendMessage()            # Send via transport
│
├── ChatInput.tsx                # Input area
├── MessageBubble.tsx            # Message display
└── ChatSidebar.tsx              # Conversation list
```

### Paper Components

```
src/components/paper/
├── PaperStageProgress.tsx       # Progress bar 13 tahap
├── PaperValidationPanel.tsx     # Approve/Revise panel
├── PaperSessionBadge.tsx        # Badge (x/13)
└── PaperSessionCard.tsx         # Session card
```

---

## Hooks

```
src/lib/hooks/
├── useMessages.ts               # Query messages dari Convex
│   └── Returns: { messages, createMessage, isLoading }
│
├── usePaperSession.ts           # Paper session state
│   └── Returns: { isPaperMode, currentStage, stageStatus, stageLabel, ... }
│
└── useCurrentUser.ts            # Current user
    └── Returns: { user, isLoading }
```

---

## Diagram Dependensi

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DEPENDENCY GRAPH                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ChatWindow.tsx                                                          │
│       │                                                                  │
│       ├─→ useMessages() ─→ convex/messages.ts ─→ Convex DB              │
│       │                                                                  │
│       ├─→ usePaperSession() ─→ convex/paperSessions.ts ─→ Convex DB     │
│       │                                                                  │
│       └─→ useChat() ─→ DefaultChatTransport                             │
│                              │                                           │
│                              ▼                                           │
│                    /api/chat/route.ts                                    │
│                              │                                           │
│       ┌──────────────────────┼──────────────────────┐                   │
│       │                      │                      │                   │
│       ▼                      ▼                      ▼                   │
│  getSystemPrompt()    getPaperModeSystemPrompt()   hasPaperWritingIntent()
│       │                      │                                           │
│       │                      └─→ formatStageData()                      │
│       │                              │                                   │
│       │                              └─→ formatRingkasanTahapSelesai()  │
│       │                              └─→ formatActiveStageData()         │
│       │                              └─→ formatOutlineChecklist()        │
│       │                                                                  │
│       └─→ systemPrompts.getActiveSystemPrompt() ─→ Convex DB            │
│                                                                          │
│  Model Layer:                                                            │
│  ─────────────                                                           │
│  getGatewayModel() ─→ configCache.get() ─→ aiProviderConfigs ─→ Convex DB
│       │                                                                  │
│       └─→ createProviderModel() ─→ AI SDK model instance                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tipe Data Kunci

### StageData Interface

**File:** `src/lib/paper/stage-types.ts`

```typescript
// Semua interface untuk 13 tahap
export interface GagasanData {
    ringkasan?: string          // ← SUMMARIZATION FIELD
    ideKasar?: string
    analisis?: string
    angle?: string
    novelty?: string
    referensiAwal?: ReferensiAwal[]
    artifactId?: string
    validatedAt?: number
    revisionCount?: number
}

// Pattern yang sama untuk:
// TopikData, OutlineData, AbstrakData, PendahuluanData,
// TinjauanLiteraturData, MetodologiData, HasilData,
// DiskusiData, KesimpulanData, DaftarPustakaData,
// LampiranData, JudulData
```

### Message Format

**Client (UI Message):**
```typescript
interface UIMessage {
    id: string
    role: "user" | "assistant" | "system"
    content: string
    parts?: Array<{ type: string; text?: string }>
    sources?: Array<{ url: string; title: string }>
}
```

**Server (Model Message):**
```typescript
// Setelah convertToModelMessages()
interface CoreMessage {
    role: "user" | "assistant" | "system"
    content: string | Array<ContentPart>
}
```

---

## Environment Variables

| Variable | Fungsi | Layer |
|----------|--------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL | Database |
| `VERCEL_AI_GATEWAY_API_KEY` | AI Gateway API key | Model |
| `OPENROUTER_API_KEY` | OpenRouter fallback API key | Model |
| `MODEL` | Override model (optional) | Model |
| `APP_URL` | App URL for OpenRouter header | Model |

---

*Last updated: 2026-01-08*
