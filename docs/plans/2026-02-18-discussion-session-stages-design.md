# Discussion Session — Design Document

**Date:** 2026-02-18
**Status:** Approved (all 7 sections reviewed + audit revisions)

## Problem Statement

Makalah AI punya dua mode percakapan:
- **Paper mode**: Terdeteksi intent paper → session aktif dengan 13 stage, progress tracking, memory digest, artifact management
- **Non-paper mode**: Tidak ada session → pesan mentah tanpa konteks terstruktur

Masalah: percakapan non-paper yang panjang kehilangan konteks. Tidak ada mekanisme untuk menyimpan kesepakatan, melacak progres diskusi, atau membangun artifact dari diskusi akademik.

**Solusi**: Semua percakapan non-paper otomatis mendapat **Discussion Session** (Sesi Diskusi) — binary system, tidak ada "plain chat".

## Design Principles

1. **Mirror paper mechanics** — database, tools, artifacts, memory digest, context injection — semua ditiru
2. **Non-linear** — user bebas bolak-balik antar fase (berbeda dari paper yang linear)
3. **Soft checkpoint** — non-blocking (berbeda dari paper yang validation-gated)
4. **Akademik & science only** — Makalah AI = mitra intelektual, bukan chatbot casual
5. **Compact** — 4 fase kognitif, bukan 13 stage
6. **Kredit universal** — tidak ada cap per session, semua konsumsi kredit sama rata

---

## Section 1: Phase Order & Definitions

### 4 Cognitive Phases (Siklus Inquiry Ilmiah)

```typescript
export const DISCUSSION_PHASE_ORDER = [
    "orientasi",
    "investigasi",
    "sintesis",
    "konstruksi",
] as const;

export type DiscussionPhaseId = typeof DISCUSSION_PHASE_ORDER[number];
```

| # | Phase | Label | Deskripsi | Contoh Aktivitas |
|---|-------|-------|-----------|------------------|
| 1 | `orientasi` | Orientasi | Pemetaan masalah, framing pertanyaan, identifikasi scope | "Apa yang ingin kita bahas?", definisi istilah, batasan topik |
| 2 | `investigasi` | Investigasi | Eksplorasi literatur, analisis data, pengujian argumen | Web search, review jurnal, evaluasi bukti, counter-argument |
| 3 | `sintesis` | Sintesis | Menghubungkan temuan, membangun framework, menyimpulkan pola | Menghubungkan teori A+B, menemukan pola, membangun model mental |
| 4 | `konstruksi` | Konstruksi | Membangun output: ringkasan, framework, rekomendasi | Dokumen ringkasan, framework analisis, action items |

### Non-Linear Navigation

Berbeda dari paper (linear, gated), discussion phases bebas diakses:

```
orientasi ⟷ investigasi ⟷ sintesis ⟷ konstruksi
     ↕              ↕              ↕
     └──────────────┴──────────────┘
           (bebas bolak-balik)
```

**Phase transition** di-trigger oleh:
1. AI auto-detect berdasarkan aktivitas user
2. User eksplisit minta pindah fase
3. Tool `transitionPhase` dipanggil AI

### Helper Functions

```typescript
// Non-linear: semua fase bisa diakses dari mana saja
export function canTransitionTo(
    current: DiscussionPhaseId,
    target: DiscussionPhaseId
): boolean {
    return current !== target;
}

export function getPhaseLabel(phase: DiscussionPhaseId): string {
    const labels: Record<DiscussionPhaseId, string> = {
        orientasi: "Orientasi",
        investigasi: "Investigasi",
        sintesis: "Sintesis",
        konstruksi: "Konstruksi",
    };
    return labels[phase];
}

export function getPhaseDescription(phase: DiscussionPhaseId): string {
    const descriptions: Record<DiscussionPhaseId, string> = {
        orientasi: "Pemetaan masalah dan framing pertanyaan",
        investigasi: "Eksplorasi literatur dan analisis argumen",
        sintesis: "Menghubungkan temuan dan membangun framework",
        konstruksi: "Membangun output: ringkasan, framework, rekomendasi",
    };
    return descriptions[phase];
}
```

---

## Section 2: Phase Data Types

### Key Whitelist per Phase

Setiap fase punya field spesifik (mirroring paper's typed stageData validators).

```typescript
// convex/discussionSessions/types.ts

import { v } from "convex/values";

const WebSearchReferenceShape = {
    url: v.string(),
    title: v.string(),
    publishedAt: v.optional(v.number()),
};

// Phase 1: Orientasi — Pemetaan masalah
export const OrientasiData = v.object({
    ringkasan: v.optional(v.string()),
    ringkasanDetail: v.optional(v.string()),
    pertanyaanUtama: v.optional(v.string()),
    konteks: v.optional(v.string()),
    batasanTopik: v.optional(v.array(v.string())),
    definisiKunci: v.optional(v.array(v.object({
        istilah: v.string(),
        definisi: v.string(),
    }))),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    checkpointAt: v.optional(v.number()),
    acknowledged: v.optional(v.boolean()),
});

// Phase 2: Investigasi — Eksplorasi & analisis
export const InvestigasiData = v.object({
    ringkasan: v.optional(v.string()),
    ringkasanDetail: v.optional(v.string()),
    temuanLiteratur: v.optional(v.array(v.object({
        judul: v.string(),
        poin: v.string(),
        sumber: v.optional(v.string()),
    }))),
    argumenPro: v.optional(v.array(v.string())),
    argumenKontra: v.optional(v.array(v.string())),
    buktiPendukung: v.optional(v.array(v.object({
        klaim: v.string(),
        bukti: v.string(),
        kekuatan: v.optional(v.union(
            v.literal("kuat"),
            v.literal("sedang"),
            v.literal("lemah")
        )),
    }))),
    referensi: v.optional(v.array(v.object({
        title: v.string(),
        authors: v.optional(v.string()),
        year: v.optional(v.number()),
        url: v.optional(v.string()),
        publishedAt: v.optional(v.number()),
        inTextCitation: v.optional(v.string()),
    }))),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    checkpointAt: v.optional(v.number()),
    acknowledged: v.optional(v.boolean()),
});

// Phase 3: Sintesis — Koneksi & framework
export const SintesisData = v.object({
    ringkasan: v.optional(v.string()),
    ringkasanDetail: v.optional(v.string()),
    polaDitemukan: v.optional(v.array(v.string())),
    koneksiAntarTemuan: v.optional(v.array(v.object({
        temuan1: v.string(),
        temuan2: v.string(),
        relasi: v.string(),
    }))),
    frameworkMental: v.optional(v.string()),
    kesimpulanSementara: v.optional(v.array(v.string())),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    checkpointAt: v.optional(v.number()),
    acknowledged: v.optional(v.boolean()),
});

// Phase 4: Konstruksi — Output building
export const KonstruksiData = v.object({
    ringkasan: v.optional(v.string()),
    ringkasanDetail: v.optional(v.string()),
    tipeOutput: v.optional(v.union(
        v.literal("ringkasan_eksekutif"),
        v.literal("framework_analisis"),
        v.literal("rekomendasi"),
        v.literal("catatan_diskusi"),
        v.literal("lainnya")
    )),
    kontenOutput: v.optional(v.string()),
    actionItems: v.optional(v.array(v.object({
        item: v.string(),
        prioritas: v.optional(v.union(
            v.literal("tinggi"),
            v.literal("sedang"),
            v.literal("rendah")
        )),
    }))),
    pertanyaanTerbuka: v.optional(v.array(v.string())),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    checkpointAt: v.optional(v.number()),
    acknowledged: v.optional(v.boolean()),
});
```

### Key Whitelist Pattern

Hanya field yang ada di validator yang bisa di-update:

```typescript
export const DISCUSSION_PHASE_KEYS: Record<DiscussionPhaseId, string[]> = {
    orientasi: [
        "ringkasan", "ringkasanDetail", "pertanyaanUtama", "konteks",
        "batasanTopik", "definisiKunci", "webSearchReferences", "artifactId",
        "checkpointAt", "acknowledged",
    ],
    investigasi: [
        "ringkasan", "ringkasanDetail", "temuanLiteratur", "argumenPro",
        "argumenKontra", "buktiPendukung", "referensi",
        "webSearchReferences", "artifactId", "checkpointAt", "acknowledged",
    ],
    sintesis: [
        "ringkasan", "ringkasanDetail", "polaDitemukan", "koneksiAntarTemuan",
        "frameworkMental", "kesimpulanSementara",
        "webSearchReferences", "artifactId", "checkpointAt", "acknowledged",
    ],
    konstruksi: [
        "ringkasan", "ringkasanDetail", "tipeOutput", "kontenOutput",
        "actionItems", "pertanyaanTerbuka",
        "webSearchReferences", "artifactId", "checkpointAt", "acknowledged",
    ],
};
```

### Field Truncation Limits

```typescript
export const DISCUSSION_FIELD_LIMITS: Record<string, number> = {
    ringkasan: 500,
    ringkasanDetail: 2000,
    pertanyaanUtama: 500,
    konteks: 2000,
    frameworkMental: 3000,
    kontenOutput: 5000,
};
```

---

## Section 3: Database Schema

### discussionSessions Table

```typescript
// In convex/schema.ts

discussionSessions: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),

    // Phase tracking (non-linear)
    currentPhase: v.union(
        v.literal("orientasi"),
        v.literal("investigasi"),
        v.literal("sintesis"),
        v.literal("konstruksi")
    ),
    phaseStatus: v.union(
        v.literal("active"),
        v.literal("checkpoint_pending")
    ),

    // Phase data — typed per phase
    phaseData: v.object({
        orientasi: v.optional(OrientasiData),
        investigasi: v.optional(InvestigasiData),
        sintesis: v.optional(SintesisData),
        konstruksi: v.optional(KonstruksiData),
    }),

    // Memory digest — persistent summary across phases
    memoryDigest: v.optional(v.array(v.object({
        phase: v.union(
            v.literal("orientasi"),
            v.literal("investigasi"),
            v.literal("sintesis"),
            v.literal("konstruksi")
        ),
        ringkasan: v.string(),
        timestamp: v.number(),
        acknowledged: v.boolean(),
    }))),

    // Phase transition audit trail
    phaseTransitions: v.optional(v.array(v.object({
        fromPhase: v.string(),
        toPhase: v.string(),
        timestamp: v.number(),
        trigger: v.union(
            v.literal("ai_auto"),
            v.literal("user_explicit"),
            v.literal("tool_call")
        ),
    }))),

    // Discussion metadata
    discussionTitle: v.optional(v.string()),
    topicTags: v.optional(v.array(v.string())),

    // Lifecycle
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
})
    .index("by_userId", ["userId"])
    .index("by_conversationId", ["conversationId"])
    .index("by_userId_active", ["userId", "archivedAt"]),
```

### Soft Checkpoint Mechanism

Paper punya **validation gate** (blocking). Discussion punya **soft checkpoint** (non-blocking).

**Flow:**
1. AI merasa fase sudah matang → panggil `submitCheckpoint`
2. `phaseStatus` → `"checkpoint_pending"`
3. UI menampilkan **CheckpointCard** inline di chat (bukan modal blocking)
4. User punya 2 opsi:
   - **"Catat"** (acknowledge): `acknowledged: true`, entry masuk `memoryDigest`
   - **"Lewati"** (skip): `phaseStatus` → `"active"`, chat lanjut tanpa interupsi
5. Chat TETAP aktif selama checkpoint pending (non-blocking)

| Aspect | Paper Session | Discussion Session |
|--------|--------------|-------------------|
| Gate type | Blocking (must approve) | Non-blocking (can skip) |
| UI | ValidationPanel (full panel) | CheckpointCard (inline card) |
| Status flow | drafting → pending_validation → approved | active → checkpoint_pending → active |
| Required | Yes, mandatory per stage | No, optional per phase |
| Phase lock | Yes (approved = locked) | No (always editable) |

### Schema Change: usageEvents Analytics Field

Tambah field baru di `usageEvents` untuk admin analytics per discussion session:

```typescript
// Di usageEvents table — tambah field (backward-compatible, optional)
discussionSessionId: v.optional(v.id("discussionSessions")),
```

Ini memungkinkan admin query: "berapa total token yang dipakai di discussion session X?" tanpa mengubah billing/enforcement logic apapun. Kredit tetap universal — field ini murni untuk observasi.

---

## Section 4: AI Tools & Convex Mutations

### 5 AI Tools

Di `src/lib/ai/discussion-tools.ts`:

#### Tool 1: `startDiscussionSession`

```typescript
startDiscussionSession: tool({
    description: "Mulai sesi diskusi akademik baru. Panggil saat percakapan terdeteksi sebagai diskusi non-paper.",
    parameters: z.object({
        initialTopic: z.string().optional()
            .describe("Topik awal diskusi jika sudah teridentifikasi"),
    }),
    execute: async ({ initialTopic }) => {
        // 1. Check existing session for conversation
        // 2. If exists, return existing session
        // 3. Create new session with currentPhase: "orientasi"
        // 4. Return session state
    },
});
```

#### Tool 2: `updatePhaseData` (AUTO-PHASE)

```typescript
updatePhaseData: tool({
    description: "Simpan data fase diskusi saat ini. Fase otomatis dari session (AUTO-PHASE).",
    parameters: z.object({
        ringkasan: z.string()
            .describe("Ringkasan singkat progres fase ini (wajib setiap update)"),
        data: z.record(z.any()).optional()
            .describe("Data spesifik fase (sesuai phase schema)"),
    }),
    execute: async ({ ringkasan, data }) => {
        // 1. Fetch session → get currentPhase (AUTO-PHASE, no phase param)
        // 2. Whitelist filter keys against DISCUSSION_PHASE_KEYS[phase]
        // 3. Truncate string fields against DISCUSSION_FIELD_LIMITS
        // 4. Merge into phaseData[phase]
        // 5. Return updated state
    },
});
```

#### Tool 3: `submitCheckpoint`

```typescript
submitCheckpoint: tool({
    description: "Ajukan soft checkpoint untuk fase saat ini. User bisa acknowledge atau skip.",
    parameters: z.object({}),
    execute: async () => {
        // 1. Fetch session
        // 2. Set phaseStatus = "checkpoint_pending"
        // 3. Set checkpointAt on current phase data
        // 4. Return checkpoint state
    },
});
```

#### Tool 4: `getCurrentDiscussionState`

```typescript
getCurrentDiscussionState: tool({
    description: "Ambil state lengkap sesi diskusi saat ini.",
    parameters: z.object({}),
    execute: async () => {
        // Return full session: phase, status, phaseData, memoryDigest, transitions
    },
});
```

#### Tool 5: `transitionPhase`

```typescript
transitionPhase: tool({
    description: "Pindah ke fase diskusi lain. Diskusi non-linear: semua fase bisa diakses kapan saja.",
    parameters: z.object({
        targetPhase: z.enum(["orientasi", "investigasi", "sintesis", "konstruksi"]),
        reason: z.string().describe("Alasan transisi fase"),
    }),
    execute: async ({ targetPhase, reason }) => {
        // 1. Validate targetPhase !== currentPhase
        // 2. Record transition in phaseTransitions array
        // 3. Update currentPhase
        // 4. Reset phaseStatus to "active"
        // 5. Return new state
    },
});
```

### Convex Mutations

Di `convex/discussionSessions.ts`:

| Mutation | Deskripsi |
|----------|-----------|
| `create` | Initialize session with orientasi phase |
| `updatePhaseData` | Whitelist → coerce → truncate → merge (mirrors paper pipeline) |
| `submitCheckpoint` | Set phaseStatus = "checkpoint_pending" |
| `acknowledgeCheckpoint` | Set acknowledged, append to memoryDigest, reset to active |
| `skipCheckpoint` | Reset phaseStatus to active, no memoryDigest entry |
| `transitionPhase` | Validate target, record audit, update currentPhase |
| `appendSearchReferences` | Append to phaseData[currentPhase].webSearchReferences, dedup by URL |

### Queries

| Query | Deskripsi |
|-------|-----------|
| `getByConversationId` | Get session by conversation (like paper's `getByConversation`) |
| `getActiveByUserId` | List active (non-archived) sessions for user |

---

## Section 5: Prompt Injection & Context Management

### System Prompt Assembly

```typescript
// src/lib/ai/discussion-mode-prompt.ts

export function getDiscussionModeSystemPrompt(
    session: DiscussionSession,
    phaseInstructions: string,
    formattedPhaseData: string,
    memoryDigestChunk: string,
): string {
    return [
        DISCUSSION_BASE_PROMPT,
        phaseInstructions,
        formattedPhaseData,
        memoryDigestChunk,
        DISCUSSION_TOOL_USAGE_PROMPT,
        CHECKPOINT_BEHAVIOR_PROMPT,
    ].filter(Boolean).join("\n\n");
}
```

### Phase Instructions

```
src/lib/ai/discussion-phases/
├── index.ts              // Barrel + getPhaseInstructions router
├── orientasi.ts          // Orientasi phase instructions
├── investigasi.ts        // Investigasi phase instructions
├── sintesis.ts           // Sintesis phase instructions
└── konstruksi.ts         // Konstruksi phase instructions
```

### Context Data Formatting (3-Layer)

```typescript
// src/lib/ai/discussion-phases/formatPhaseData.ts

export function formatPhaseData(session: DiscussionSession): string {
    const parts: string[] = [];

    // Layer 1: Completed phases — ringkasan only
    for (const phase of DISCUSSION_PHASE_ORDER) {
        if (phase === session.currentPhase) continue;
        const data = session.phaseData[phase];
        if (data?.ringkasan) {
            parts.push(`[${getPhaseLabel(phase)} — Selesai]: ${data.ringkasan}`);
        }
    }

    // Layer 2: Current phase — full data (minus webSearchReferences)
    const currentData = session.phaseData[session.currentPhase];
    if (currentData) {
        const { webSearchReferences, ...rest } = currentData;
        parts.push(`[${getPhaseLabel(session.currentPhase)} — Aktif]:\n${JSON.stringify(rest, null, 2)}`);
    }

    // Layer 3: Memory digest — acknowledged entries
    if (session.memoryDigest?.length) {
        const acknowledged = session.memoryDigest.filter(d => d.acknowledged);
        if (acknowledged.length) {
            parts.push("=== MEMORY DIGEST (Tersepakati) ===");
            for (const entry of acknowledged) {
                parts.push(`- [${getPhaseLabel(entry.phase)}]: ${entry.ringkasan}`);
            }
        }
    }

    return parts.join("\n\n");
}
```

### Web Search Policy

Sama dengan paper — auto-persist web search references via `appendSearchReferences` mutation di `onFinish` callback. Route.ts perlu diupdate agar auto-persist juga jalan untuk discussion session (lihat Section 8: Route Integration).

### Context Budget

Menggunakan `checkContextBudget()` yang sama dengan paper. Threshold 80% → prune ke 50 messages.

---

## Section 6: UI Components & Hooks

### React Hook

```typescript
// src/lib/hooks/useDiscussionSession.ts

export function useDiscussionSession(conversationId: Id<"conversations"> | null) {
    const session = useQuery(
        api.discussionSessions.getByConversationId,
        conversationId ? { conversationId } : "skip"
    );

    const acknowledgeCheckpointMut = useMutation(api.discussionSessions.acknowledgeCheckpoint);
    const skipCheckpointMut = useMutation(api.discussionSessions.skipCheckpoint);
    const transitionPhaseMut = useMutation(api.discussionSessions.transitionPhase);

    return {
        session,
        isLoading: session === undefined,
        isActive: session !== null && session !== undefined && !session.archivedAt,
        currentPhase: session?.currentPhase ?? null,
        phaseStatus: session?.phaseStatus ?? null,
        acknowledgeCheckpoint: async () => { /* ... */ },
        skipCheckpoint: async () => { /* ... */ },
        transitionPhase: async (targetPhase: string, trigger: string) => { /* ... */ },
    };
}
```

### DiscussionPhaseProgress Component

4-badge horizontal layout (berbeda dari paper's 13-stage vertical timeline):

```
┌──────────────────────────────────────────────────────┐
│  [Orientasi]  [Investigasi]  [Sintesis]  [Konstruksi] │
│      ●             ○              ○           ○        │
│   (active)      (visited)                              │
└──────────────────────────────────────────────────────┘
```

- Lokasi: di atas chat area (horizontal bar), bukan sidebar
- Badge clickable → trigger `transitionPhase` (user_explicit)
- Active phase = filled dot + bold label
- Visited phase (punya data) = outlined dot
- Unvisited = empty dot

### CheckpointCard Component

Inline card di dalam chat stream (bukan modal/panel):

```
┌─ ✓ Checkpoint: Orientasi ────────────────────────────┐
│                                                       │
│  Ringkasan: Pertanyaan utama sudah teridentifikasi.   │
│  Batasan topik sudah disepakati.                      │
│                                                       │
│            [Catat]      [Lewati]                      │
└───────────────────────────────────────────────────────┘
```

- Muncul saat `phaseStatus === "checkpoint_pending"`
- **"Catat"** → `acknowledgeCheckpoint()` → masuk memory digest
- **"Lewati"** → `skipCheckpoint()` → chat lanjut
- Chat input TETAP aktif (non-blocking)

### DiscussionSidebarPanel

Collapsible panel di sidebar (bawah conversation list):

```
┌─ Sesi Diskusi ────────────────────┐
│                                    │
│  Fase: Investigasi                 │
│  Status: Active                    │
│                                    │
│  Memory Digest:                    │
│  ✓ Orientasi: "Pertanyaan utama    │
│    tentang dampak AI..."           │
│  ○ Investigasi: (sedang aktif)     │
│                                    │
│  Tags: #AI #etika #regulasi        │
└────────────────────────────────────┘
```

### Edit Permissions

Lebih lenient dari paper (3-turn window, bukan 2-turn):

```typescript
// src/lib/utils/discussionPermissions.ts

export function isEditAllowed(params: {
    messageIndex: number;
    totalMessages: number;
    isUserMessage: boolean;
}): { allowed: boolean; reason?: string } {
    if (!params.isUserMessage) {
        return { allowed: false, reason: "Hanya pesan user yang bisa diedit" };
    }
    // Max 3 user turns back (more lenient than paper's 2)
    // No phase-lock check (non-linear, always editable)
    return { allowed: true };
}
```

---

## Section 7: Intent Detection & Session Lifecycle

### Inverted Intent Detection

Discussion TIDAK butuh detector baru. Logikanya inverted dari paper:

```typescript
// In chat route (src/app/api/chat/route.ts)

const paperDetection = detectPaperIntent(userMessage);
if (paperDetection.hasPaperIntent) {
    // → Paper session mode
} else {
    // → Discussion session mode (SEMUA non-paper)
}
```

### Auto-Start Flow

1. User kirim pesan pertama di conversation baru
2. `detectPaperIntent()` → false
3. AI auto-receive `DISCUSSION_START_REMINDER`:

```typescript
const DISCUSSION_START_REMINDER = `Percakapan ini adalah diskusi akademik.
Gunakan tool startDiscussionSession untuk memulai sesi diskusi.
Kamu akan memulai di fase Orientasi — bantu user memetakan pertanyaan dan scope diskusi.`;
```

4. AI panggil `startDiscussionSession` → session created
5. Phase instructions injected → diskusi dimulai

### Paper Upgrade Reminder

Edge case: user mulai diskusi, lalu ingin menulis paper.

```typescript
const PAPER_UPGRADE_REMINDER = `User menunjukkan keinginan untuk menulis paper akademik.
Sesi ini saat ini adalah diskusi. Tanyakan apakah user ingin:
1. Beralih ke mode paper writing (13-stage workflow)
2. Tetap di mode diskusi

Jika user pilih paper, gunakan tool startPaperSession.`;
```

### Session Lifecycle

```
New Conversation
       │
       ▼
  detectPaperIntent()
       │
  ┌────┴────┐
  │ paper   │ not paper
  │ intent  │
  ▼         ▼
Paper    Discussion
Session  Session
  │         │
  │    ┌────┴────────────────┐
  │    │ Active: phases      │
  │    │ cycle freely        │
  │    │                     │
  │    │ Paper intent later? │
  │    │ → UPGRADE_REMINDER  │
  │    └─────────────────────┘
  │         │
  ▼         ▼
Completed  Archived
(13 stages) (on conversation archive)
```

### Billing

- Discussion session menggunakan `operationType: "chat_message"` (multiplier 1.0x)
- Tidak ada multiplier tambahan, tidak ada cap per session
- Kredit universal: semua input/output di-deduct sama dari pool kredit user per tier

### Session Archive

Discussion session di-archive ketika conversation di-archive oleh user. Tidak ada "completed" state seperti paper.

---

## Section 8: Route Integration Strategy (Audit Revision)

### Problem: Binary Assumption di route.ts

`src/app/api/chat/route.ts` saat ini punya hardcoded binary logic: `isPaperMode` (true/false). Penambahan discussion session memerlukan refactor menjadi **mode-aware routing**.

### Integration Points yang Perlu Diubah

| Line Range | Current Logic | Required Change |
|-----------|--------------|-----------------|
| 230-238 | Fetch paper session only | Fetch both: paper + discussion session |
| 241-243 | `if (paperSession)` → billing `paper_generation` | Discussion tetap `chat_message`, no change needed |
| 254-256 | Paper intent → `PAPER_WORKFLOW_REMINDER` | Add: `!paperIntent && !discussionSession` → `DISCUSSION_START_REMINDER` |
| 412 | `const isPaperMode = !!paperModePrompt` | Add: `const isDiscussionMode = !!discussionModePrompt` |
| 452-456 | Inject paper system prompt | Add slot for discussion system prompt |
| 1080-1084 | `...createPaperTools(...)` | Add: `...createDiscussionTools(...)` |
| 1186-1219 | LLM router — no discussion context | Add discussion mode context to router |
| 1329, 1783 | `sessionId: paperSession?._id` | Add: `discussionSessionId: discussionSession?._id` |
| 1744-1761 | Auto-persist references only for paper | Add: `if (discussionSession)` → auto-persist to discussion session |

### Session Detection Order

```typescript
// 1. Fetch both session types
const paperModePrompt = await getPaperModeSystemPrompt(conversationId, convexToken);
const paperSession = paperModePrompt ? await fetchQuery(...) : null;

const discussionModePrompt = !paperModePrompt
    ? await getDiscussionModeSystemPrompt(conversationId, convexToken)
    : "";
const discussionSession = discussionModePrompt
    ? await fetchQuery(api.discussionSessions.getByConversationId, { conversationId })
    : null;

// 2. Determine mode
const isPaperMode = !!paperModePrompt;
const isDiscussionMode = !!discussionModePrompt;

// 3. Tool set
const tools = {
    ...baseTools,                                           // createArtifact, updateArtifact, renameTitle
    ...(isPaperMode ? createPaperTools({...}) : {}),       // Paper tools
    ...(isDiscussionMode ? createDiscussionTools({...}) : {}), // Discussion tools
};
```

### Web Search Decision for Discussion Mode

Discussion mode uses the existing **LLM router** (`decideWebSearchMode()`) — same as paper's passive/none stages. No deterministic 3-layer logic needed because discussion doesn't have "active research stages" like paper.

---

## Section 9: Pre-Session State Handling (Audit Revision)

### Problem

Ada gap antara "user kirim pesan pertama" dan "AI membuat session". Selama gap ini:
- Session belum ada di database
- UI menampilkan state "plain chat" (no session indicators)
- Hooks return `null` / `isLoading`

Ini berlaku untuk **kedua tipe session** (paper dan discussion).

### Current State (Paper)

Paper workflow mengandalkan:
1. AI dipaksa panggil `startPaperSession` via `PAPER_WORKFLOW_REMINDER`
2. Gap singkat karena tool call terjadi di first AI response
3. Convex reactivity langsung update UI begitu session dibuat

Tapi tidak ada UI indicator selama gap (no loading state, no "preparing session" message).

### Design for Both Paper + Discussion

#### Option: Optimistic UI Indicator

Ketika pesan pertama dikirim di conversation baru:
1. Route.ts mendeteksi intent (paper/discussion)
2. Sebelum AI respond, inject metadata ke stream: `{ sessionType: "paper" | "discussion", preparing: true }`
3. UI menampilkan subtle indicator: "Menyiapkan sesi..." di area progress bar
4. Begitu session dibuat (via tool call), indicator berubah jadi actual session UI

#### Implementation

```typescript
// Di ChatWindow.tsx
const { session: paperSession, isPaperMode } = usePaperSession(conversationId);
const { session: discussionSession, isDiscussionMode } = useDiscussionSession(conversationId);

// Pre-session state: conversation exists, but no session yet
const isPreSession = conversationId && !paperSession && !discussionSession;
const isSessionLoading = paperSession === undefined || discussionSession === undefined;

// Render
if (isSessionLoading) {
    // Queries still loading — show nothing extra
}
if (isPreSession && !isSessionLoading) {
    // Both queries returned null — session not yet created
    // Show subtle "Menyiapkan sesi..." indicator
}
```

**Catatan:** Ini adalah utang teknis yang berlaku untuk paper dan discussion. Implementasi bisa dilakukan bersamaan dengan discussion session feature.

---

## Section 10: Credit Universalization (Audit Revision)

### Problem: Dead Code — Credit Soft-Cap per Paper Session

`paperSessions` table punya 5 field credit tracking yang merupakan **dead code**:

```typescript
// convex/schema.ts lines 511-515
creditAllotted: v.optional(v.number()),    // Default 300
creditUsed: v.optional(v.number()),
creditRemaining: v.optional(v.number()),   // Computed
isSoftBlocked: v.optional(v.boolean()),
softBlockedAt: v.optional(v.number()),
```

**Temuan audit:**
- Field-field ini **hanya ditulis** di `convex/billing/credits.ts:223-239`
- **Tidak pernah dibaca** untuk gating/blocking decision di route, enforcement, atau frontend
- `isSoftBlocked` ada di type `QuotaCheckResult` tapi tidak pernah di-set atau di-check
- Actual credit enforcement menggunakan `creditBalances` per user (global), bukan per session

### Decision: Hapus dan Universalkan

Kredit di Makalah AI bersifat universal:
- Semua input/output di chat mengkonsumsi kredit dari pool yang sama
- Tidak ada bedanya apakah user di paper session, discussion session, atau web search
- Per-session cap tidak dibutuhkan dan tidak ditegakkan

### Changes Required

1. **Hapus 5 field** dari `paperSessions` di `convex/schema.ts` (lines 511-515)
2. **Hapus blok code** di `convex/billing/credits.ts:223-239` (session credit tracking write)
3. **Hapus `isSoftBlocked`** dari interface `QuotaCheckResult` di `src/lib/billing/enforcement.ts:32`
4. **Update docs** yang mention credit soft-cap per session:
   - `docs/paper-writing-workflow/README.md`
   - `docs/billing-tier-enforcement/README.md`
   - `docs/pricing/bayar-per-paper-update.md`
   - `docs/tokens/kalkulasi-gemini-tokens.md`

**Impact: ZERO** — no UI, route, or enforcement logic will break. Pure dead code cleanup.

---

## File Structure Summary

```
convex/
├── discussionSessions.ts              // Mutations & queries
├── discussionSessions/
│   ├── constants.ts                   // DISCUSSION_PHASE_ORDER, helpers
│   └── types.ts                       // OrientasiData, InvestigasiData, etc.

src/lib/ai/
├── discussion-tools.ts                // 5 AI tools
├── discussion-mode-prompt.ts          // System prompt assembly
├── discussion-intent.ts               // DISCUSSION_START_REMINDER, PAPER_UPGRADE_REMINDER
├── discussion-phases/
│   ├── index.ts                       // Barrel + getPhaseInstructions
│   ├── orientasi.ts
│   ├── investigasi.ts
│   ├── sintesis.ts
│   ├── konstruksi.ts
│   └── formatPhaseData.ts            // 3-layer context injection

src/lib/hooks/
├── useDiscussionSession.ts            // React hook

src/lib/utils/
├── discussionPermissions.ts           // Edit permission rules

src/components/discussion/
├── DiscussionPhaseProgress.tsx         // 4-badge horizontal bar
├── CheckpointCard.tsx                  // Inline checkpoint card
└── DiscussionSidebarPanel.tsx          // Sidebar info panel
```

---

## Comparison: Paper vs Discussion

| Aspect | Paper Session | Discussion Session |
|--------|--------------|-------------------|
| Stages/Phases | 13 stages (linear) | 4 phases (non-linear) |
| Navigation | Sequential + rewind (max 2 back) | Free-form (any phase anytime) |
| Gate mechanism | Validation gate (blocking) | Soft checkpoint (non-blocking) |
| Status flow | drafting → pending_validation → approved → revision | active ↔ checkpoint_pending |
| Memory digest | Accumulates per approved stage | Accumulates per acknowledged checkpoint |
| Phase lock | Approved = locked | Never locked |
| Intent detection | Keyword-based (PAPER_INTENT_KEYWORDS) | Inverted (!hasPaperIntent) |
| Edit window | 2 turns back | 3 turns back |
| Completion | 13 stages done → "completed" | No completion, archived with conversation |
| UI progress | 13-step vertical timeline in sidebar | 4-badge horizontal bar above chat |
| Billing multiplier | 1.5x (paper_generation) | 1.0x (chat_message) |
| Credit cap per session | None (removed — universal credits) | None (universal credits) |
| Artifact support | Yes (per stage, with invalidation) | Yes (per phase, no invalidation) |
| Web search auto-persist | Yes | Yes |
| Context budget | Shared checkContextBudget() | Shared checkContextBudget() |

---

## Compatibility Audit Results

Audit dilakukan terhadap 5 area sistem sebelum finalisasi design:

### Area 1: Chat Route — NEEDS REFACTOR
- Binary `isPaperMode` assumption di 7+ titik
- Perlu mode-aware routing (Section 8)

### Area 2: Database Schema — COMPATIBLE WITH ADDITIONS
- `usageEvents.sessionId` hardcoded ke `paperSessions` → tambah `discussionSessionId` field
- `artifacts` table conversation-scoped → fully compatible, zero changes
- No unique constraints blocking dual session types

### Area 3: UI Components — NEEDS BRANCHING
- ChatWindow, MessageBubble, Sidebar perlu ternary session detection
- Paper components untouched — create parallel discussion components

### Area 4: Billing — FULLY COMPATIBLE
- Discussion = `chat_message` (1.0x) — zero changes to enforcement
- Credit universalization removes per-session tracking entirely

### Area 5: Artifact System — FULLY COMPATIBLE
- Artifacts linked via `conversationId`, not session ID
- Invalidation fields optional, gracefully undefined for discussion
- All queries and mutations reusable as-is
