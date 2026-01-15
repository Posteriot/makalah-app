# Memory Management & Context Persistence - Referensi Teknis

Dokumentasi ini menjelaskan arsitektur memory management dalam Makalah App, khususnya bagaimana agent AI "mengingat" konteks sepanjang sesi paper writing workflow yang terdiri dari 13 tahap.

## Daftar Isi

1. [Ringkasan Eksekutif](#ringkasan-eksekutif)
2. [Arsitektur Memory 3-Layer](#arsitektur-memory-3-layer)
3. [Layer 1: Database Persistence (Convex)](#layer-1-database-persistence-convex)
4. [Layer 2: Context Injection (Summarization)](#layer-2-context-injection-summarization)
5. [Layer 3: Chat History](#layer-3-chat-history)
6. [Backend Guards](#backend-guards)
7. [Context Limits (Paper Mode)](#context-limits-paper-mode)
8. [Sync Mechanism](#sync-mechanism)
9. [Alur Request Lengkap](#alur-request-lengkap)
10. [Estimasi Context Window Usage](#estimasi-context-window-usage)
11. [Strategi Summarization Built-in](#strategi-summarization-built-in)
12. [Artifact System sebagai External Storage](#artifact-system-sebagai-external-storage)
13. [Evaluasi: Kebutuhan External Memory](#evaluasi-kebutuhan-external-memory)
14. [Potensi Improvement](#potensi-improvement)
15. [Rujukan File](#rujukan-file)

---

## Ringkasan Eksekutif

### Pertanyaan Utama
> Bagaimana agent AI tetap "mengingat" hasil setiap stage dalam paper workflow yang panjang (13 tahap)?

### Catatan Compliance
Dokumen ini sudah dicek ulang terhadap codebase dan dinyatakan **compliant** per 2026-01-08.

### Jawaban Singkat
Makalah App menggunakan **arsitektur memory 3-layer** yang menggabungkan:
1. **Database Persistence** - Full data disimpan di Convex
2. **Summarization Strategy** - Hanya ringkasan yang diinjeksi ke context
3. **Artifact Offloading** - Output detail disimpan terpisah

### Kesimpulan: External Memory?
**TIDAK DIPERLUKAN SAAT INI** karena:
- Built-in summarization via field `ringkasan` per tahap (max 280 char)
- Context window Gemini 2.5 Flash (~1M tokens) sangat besar
- Export mengambil data dari database, bukan dari "ingatan" AI

---

## Arsitektur Memory 3-Layer

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MEMORY ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ LAYER 1: DATABASE PERSISTENCE (Convex)                          │    │
│  │ ─────────────────────────────────────────────────────────────── │    │
│  │ - paperSessions.stageData: FULL data semua 13 tahap            │    │
│  │ - messages: FULL chat history tanpa limit                       │    │
│  │ - artifacts: Output detail (draf, tabel, sitasi)               │    │
│  │ - Persistent selamanya, source of truth                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ LAYER 2: CONTEXT INJECTION (Summarization)                      │    │
│  │ ─────────────────────────────────────────────────────────────── │    │
│  │ - formatStageData() mengambil dari Layer 1                      │    │
│  │ - HANYA ringkasan tahap selesai (max 280 char per tahap)       │    │
│  │ - Data detail HANYA untuk tahap AKTIF (max 1000 char per field)│    │
│  │ - Outline checklist selalu visible                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ LAYER 3: CHAT HISTORY (Messages)                                │    │
│  │ ─────────────────────────────────────────────────────────────── │    │
│  │ - Semua messages dari conversation dikirim ke API               │    │
│  │ - Di paper mode: server trim ke 20 pairs terakhir               │    │
│  │ - Non-paper mode: full history tetap dikirim                    │    │
│  │ - Potensi bottleneck berkurang karena trimming                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ AI MODEL (Gemini 2.5 Flash Lite)                                │    │
│  │ ─────────────────────────────────────────────────────────────── │    │
│  │ - Context window: ~1,000,000 tokens                             │    │
│  │ - Receives: System prompt + Paper context + Chat history        │    │
│  │ - Typical usage: ~5-10% of context window                       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Database Persistence (Convex)

### Tabel Utama: `paperSessions`

**File:** `convex/schema.ts:204-352`

```typescript
paperSessions: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),

    // Workflow State
    currentStage: v.string(),  // "gagasan" | "topik" | ... | "completed"
    stageStatus: v.string(),   // "drafting" | "pending_validation" | "revision" | "approved"

    // KUNCI: Accumulated data untuk semua 13 tahap
    stageData: v.object({
        gagasan: v.optional(v.object({
            ringkasan: v.optional(v.string()),  // ← SUMMARIZATION FIELD
            ideKasar: v.optional(v.string()),
            analisis: v.optional(v.string()),
            angle: v.optional(v.string()),
            novelty: v.optional(v.string()),
            referensiAwal: v.optional(v.array(...)),
            artifactId: v.optional(v.id("artifacts")),
            validatedAt: v.optional(v.number()),
            revisionCount: v.optional(v.number()),
        })),
        topik: v.optional(v.object({ ringkasan, definitif, ... })),
        outline: v.optional(OutlineData),
        abstrak: v.optional(v.object({ ringkasan, ... })),
        pendahuluan: v.optional(v.object({ ringkasan, ... })),
        tinjauan_literatur: v.optional(v.object({ ringkasan, ... })),
        metodologi: v.optional(v.object({ ringkasan, ... })),
        hasil: v.optional(HasilData),
        diskusi: v.optional(DiskusiData),
        kesimpulan: v.optional(KesimpulanData),
        daftar_pustaka: v.optional(DaftarPustakaData),
        lampiran: v.optional(LampiranData),
        judul: v.optional(JudulData),
    }),

    paperTitle: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
})
```

### Pola Umum per Tahap

Setiap tahap dalam `stageData` memiliki field standar:

| Field | Tipe | Fungsi |
|-------|------|--------|
| `ringkasan` | `string?` | **KUNCI SUMMARIZATION** - ringkasan 1-2 kalimat |
| `artifactId` | `Id<"artifacts">?` | Referensi ke artifact output detail |
| `validatedAt` | `number?` | Timestamp saat user approve |
| `revisionCount` | `number?` | Jumlah revisi yang diminta |

### Tabel Pendukung: `messages`

**File:** `convex/schema.ts:50-68` dan `convex/messages.ts:5-14`

```typescript
messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.string(),      // "user" | "assistant" | "system"
    content: v.string(),
    createdAt: v.number(),
    fileIds: v.optional(v.array(v.id("files"))),
    sources: v.optional(v.array(v.object({...}))),  // Inline citations
})

// Query: SEMUA messages, TANPA limit
export const getMessages = query({
    args: { conversationId: v.id("conversations") },
    handler: async ({ db }, { conversationId }) => {
        return await db
            .query("messages")
            .withIndex("by_conversation", q => q.eq("conversationId", conversationId))
            .order("asc")
            .collect()  // ← TIDAK ada .take(N)
    },
})
```

### Tabel Pendukung: `artifacts`

**File:** `convex/schema.ts:108-147`

```typescript
artifacts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    messageId: v.optional(v.id("messages")),

    type: v.union(
        v.literal("code"),
        v.literal("outline"),
        v.literal("section"),    // ← Paper sections
        v.literal("table"),
        v.literal("citation"),
        v.literal("formula")
    ),
    title: v.string(),
    content: v.string(),        // ← Full content disimpan di sini
    format: v.optional(v.union(...)),

    version: v.number(),
    parentId: v.optional(v.id("artifacts")),
})
```

**Fungsi:** Menyimpan output detail (draf section, tabel data, dll) TERPISAH dari context chat.

---

## Layer 2: Context Injection (Summarization)

### File Utama: `src/lib/ai/paper-stages/formatStageData.ts`

### Konstanta Truncation

```typescript
const SUMMARY_CHAR_LIMIT = 1000;     // Field detail di tahap aktif
const RINGKASAN_CHAR_LIMIT = 280;   // Ringkasan per tahap selesai
```

### Fungsi Utama: `formatStageData()`

```typescript
export function formatStageData(
    stageData: StageData,
    currentStage: PaperStageId | "completed"
): string {
    const sections: string[] = [];

    // 1. Ringkasan SEMUA tahap yang sudah selesai (validated)
    sections.push(formatRingkasanTahapSelesai(stageData, currentStage));

    // 2. Data DETAIL untuk tahap AKTIF saja
    const activeStageBlock = formatActiveStageData(stageData, currentStage);
    if (activeStageBlock) {
        sections.push(activeStageBlock);
    }

    // 3. Outline checklist (selalu visible sebagai roadmap)
    sections.push(formatOutlineChecklist(stageData.outline, currentStage));

    return sections.join("\n\n");
}
```

### Detail: `formatRingkasanTahapSelesai()`

**Hanya mengambil `ringkasan` dari tahap yang sudah `validatedAt`:**

```typescript
function formatRingkasanTahapSelesai(
    stageData: StageData,
    currentStage: PaperStageId | "completed"
): string {
    const summaries: string[] = [];

    STAGE_ORDER.forEach((stageId) => {
        // Skip tahap aktif
        if (currentStage !== "completed" && stageId === currentStage) return;

        const data = stageData[stageId];
        // HANYA tahap yang sudah DISETUJUI (validatedAt)
        if (!data || !data.validatedAt) return;

        const ringkasanValue = data.ringkasan?.trim() || "Ringkasan belum tersedia.";
        // TRUNCATE ke max 280 karakter
        summaries.push(`- ${getStageLabel(stageId)}: ${truncateRingkasan(ringkasanValue)}`);
    });

    return `RINGKASAN TAHAP SELESAI:\n${summaries.join("\n")}`;
}

function truncateRingkasan(text: string): string {
    if (text.length <= RINGKASAN_CHAR_LIMIT) return text;
    return `${text.slice(0, RINGKASAN_CHAR_LIMIT).trim()}...`;
}
```

### Detail: `formatActiveStageData()`

**Data detail HANYA untuk tahap yang sedang aktif:**

```typescript
function formatActiveStageData(
    stageData: StageData,
    currentStage: PaperStageId | "completed"
): string | null {
    if (currentStage === "completed") return null;

    const data = stageData[currentStage];
    if (!data || !hasContent(data)) return null;

    // Router ke formatter spesifik per tahap
    switch (currentStage) {
        case "gagasan": return formatGagasanData(data, true);
        case "topik": return formatTopikData(data, true);
        case "outline": return formatOutlineData(data, true);
        // ... dst untuk 13 tahap
    }
}

function truncateText(text: string, summaryMode: boolean): string {
    if (!summaryMode || text.length <= SUMMARY_CHAR_LIMIT) return text;
    return `${text.slice(0, SUMMARY_CHAR_LIMIT).trim()}...`;  // Max 1000 char
}
```

### Contoh Output `formatStageData()`

Saat di tahap 7 (Metodologi) dengan 6 tahap sebelumnya sudah selesai:

```
RINGKASAN TAHAP SELESAI:
- Gagasan Paper: Penelitian tentang dampak AI generatif pada produktivitas...
- Penentuan Topik: Fokus pada sektor pendidikan tinggi di Indonesia...
- Menyusun Outline: Struktur 5 bab dengan fokus metodologi mixed-method...
- Penyusunan Abstrak: Penelitian ini menginvestigasi penggunaan AI...
- Pendahuluan: Latar belakang perkembangan AI sejak 2022...
- Tinjauan Literatur: Kerangka teoretis berbasis Technology Acceptance Model...

=== TAHAP 7: Metodologi [DALAM PROSES] ===
Ringkasan: Pendekatan mixed-method dengan survei dan wawancara...
Pendekatan: MIXED
Desain Penelitian: Sequential explanatory design...
Metode Perolehan Data: Survei online (n=200) + wawancara mendalam (n=15)...
Teknik Analisis: Analisis statistik deskriptif + tematik coding...

CHECKLIST OUTLINE (TAHAP 3: Menyusun Outline) [DISETUJUI]:
[OK] Pendahuluan
[OK] Tinjauan Literatur
[~] Metodologi  ← sedang dikerjakan
[_] Hasil
[_] Diskusi
[_] Kesimpulan
[_] Daftar Pustaka
[_] Lampiran
```

---

## Layer 3: Chat History

### Client Side: `src/components/chat/ChatWindow.tsx`

```typescript
// 1. Fetch SEMUA history dari Convex
const { messages: historyMessages, isLoading } = useMessages(conversationId)

// 2. Sync ke useChat state
useEffect(() => {
    if (conversationId && !isLoading && historyMessages) {
        const mappedMessages = historyMessages.map(msg => ({
            id: msg._id,
            role: msg.role,
            content: msg.content,
            // ...
        }))
        setMessages(mappedMessages)  // ← SEMUA messages
    }
}, [conversationId, historyMessages, isLoading, setMessages])

// 3. Kirim via DefaultChatTransport
const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    body: { conversationId, fileIds },
}), [conversationId, uploadedFileIds])

const { messages, sendMessage, ... } = useChat({ transport })
```

### Server Side: `src/app/api/chat/route.ts`

```typescript
// 1. Parse request body
const { messages, conversationId, fileIds } = body

// 2. Convert ke format model
const modelMessages = convertToModelMessages(messages)

// 2.1 Paper mode trimming (soft trim)
const MAX_CHAT_HISTORY_PAIRS = 20
const isPaperMode = !!paperModePrompt
const trimmedModelMessages = isPaperMode && modelMessages.length > MAX_CHAT_HISTORY_PAIRS * 2
    ? modelMessages.slice(-MAX_CHAT_HISTORY_PAIRS * 2)
    : modelMessages

// 3. Gabungkan dengan system prompts
const fullMessagesBase = [
    { role: "system", content: systemPrompt },           // Base system prompt
    ...(paperModePrompt ? [{ role: "system", content: paperModePrompt }] : []),
    ...(paperWorkflowReminder ? [{ role: "system", content: paperWorkflowReminder }] : []),
    ...(fileContext ? [{ role: "system", content: `File Context:\n\n${fileContext}` }] : []),
    ...trimmedModelMessages,  // ← di paper mode sudah di-trim
]
```

**PENTING:** Di paper mode, chat history sekarang **di-trim** ke 20 pairs terakhir (40 messages). Lihat [Context Limits](#context-limits-paper-mode).

---

## Backend Guards

Mulai 2026-01-08, backend mutations dilengkapi guards untuk mencegah inkonsistensi data:

### Guard 1: updateStageData - Pending Validation Block

**File:** `convex/paperSessions.ts:264-268`

```typescript
if (session.stageStatus === "pending_validation") {
    throw new Error(
        "updateStageData gagal: Stage sedang pending validation. " +
        "Minta revisi dulu jika ingin mengubah draft."
    );
}
```

**Fungsi:** Mencegah AI overwrite data yang sudah di-submit untuk validasi user.

### Guard 2: approveStage - Ringkasan Enforcement

**File:** `convex/paperSessions.ts:340-347`

```typescript
const ringkasan = currentStageData?.ringkasan as string | undefined;

if (!ringkasan || ringkasan.trim() === "") {
    throw new Error(
        "approveStage gagal: Ringkasan wajib diisi. " +
        "Gunakan updateStageData untuk menambahkan ringkasan."
    );
}
```

**Fungsi:** Memastikan setiap tahap yang di-approve punya ringkasan untuk context injection.

### Guard 3: approveStage - Budget Enforcement

**File:** `convex/paperSessions.ts:373-382`

```typescript
const outlineBudgetChars = outlineTotalWordCount ? outlineTotalWordCount * 6 : undefined;

// Soft warning: Only enforce if outline has budget and content exceeds 150%
if (outlineBudgetChars && totalContentChars > outlineBudgetChars * 1.5) {
    throw new Error(
        `approveStage gagal: Konten melebihi budget outline. ` +
        `Estimasi: ${Math.ceil(totalContentChars / 6)} kata, ` +
        `Budget: ${outlineTotalWordCount} kata. ` +
        `Pertimbangkan untuk meringkas konten.`
    );
}
```

**Fungsi:** Mencegah approve jika total konten melebihi 150% dari budget outline.

### Guard 4: StageData Key Validation

**File:** `convex/paperSessions.ts:5-83`

Setiap tahap punya whitelist keys yang diperbolehkan. Keys yang tidak dikenal akan ditolak dengan error jelas.

---

## Context Limits (Paper Mode)

Limits ini hanya aktif di **paper mode** (saat ada paperSession). Non-paper mode tetap tanpa limit.

### Chat History Trimming

**File:** `src/app/api/chat/route.ts:230-237`

| Konstanta | Nilai | Fungsi |
|-----------|-------|--------|
| `MAX_CHAT_HISTORY_PAIRS` | 20 | Maksimum 20 pairs (40 messages) |

```typescript
const MAX_CHAT_HISTORY_PAIRS = 20
const isPaperMode = !!paperModePrompt

let trimmedModelMessages = modelMessages
if (isPaperMode && modelMessages.length > MAX_CHAT_HISTORY_PAIRS * 2) {
    trimmedModelMessages = modelMessages.slice(-MAX_CHAT_HISTORY_PAIRS * 2)
}
```

**Catatan:** System prompts dan stage summaries TIDAK terkena trimming.

### Outline Checklist Limiter

**File:** `src/lib/ai/paper-stages/formatStageData.ts:589-630`

| Konstanta | Nilai | Fungsi |
|-----------|-------|--------|
| `MAX_OUTLINE_SECTIONS` | 10 | Maksimum 10 sections ditampilkan |
| `MAX_OUTLINE_DEPTH` | 2 | Hanya level 1-2 yang ditampilkan |

Jika ada sections yang dipotong, output akan menunjukkan:
```
...dan X section lainnya
```

### File Context Limiter

**File:** `src/app/api/chat/route.ts:172-211`

| Konstanta | Nilai | Fungsi |
|-----------|-------|--------|
| `MAX_FILE_CONTEXT_CHARS_PER_FILE` | 6,000 | Maksimum chars per file |
| `MAX_FILE_CONTEXT_CHARS_TOTAL` | 20,000 | Maksimum total chars semua files |

Limits ini **soft trim** - tidak ada warning ke user.

---

## Sync Mechanism

Fitur sync untuk menjaga konsistensi antara chat dan stageData.

### Dirty Flag

**Schema:** `convex/schema.ts:331`

```typescript
isDirty: v.optional(v.boolean())
```

**Trigger:** Set `true` saat user edit/regenerate message di paper mode.
**Reset:** Set `false` saat approveStage berhasil.

**File:** `src/components/chat/ChatWindow.tsx:219-239, 447`

```typescript
const handleRegenerate = (options?: { markDirty?: boolean }) => {
    if (isPaperMode && options?.markDirty !== false) {
        markStageAsDirty()
    }
    regenerate()
}

// Di handleEdit
if (isPaperMode) {
    markStageAsDirty()
}
```

### Paper Memory Digest

**Schema:** `convex/schema.ts:336-340`

```typescript
paperMemoryDigest: v.optional(v.array(v.object({
    stage: v.string(),
    decision: v.string(),  // ringkasan.slice(0, 200)
    timestamp: v.number(),
})))
```

Array ini diisi saat setiap tahap di-approve, disimpan sebagai ringkasan keputusan. Saat ini belum diinjeksi ke prompt (tersedia untuk konteks AI/monitoring).

### Estimated Content Tracking

**Schema:** `convex/schema.ts:345-346`

```typescript
estimatedContentChars: v.optional(v.number())  // Total chars dari semua ringkasan
estimatedTokenUsage: v.optional(v.number())    // Estimasi tokens (chars / 4)
```

Diupdate setiap approveStage untuk tracking budget.

---

## Alur Request Lengkap

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          ALUR REQUEST CHAT                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. USER MENGIRIM PESAN                                                       │
│     └─> ChatWindow.tsx: sendMessage({ text: input })                         │
│                                                                               │
│  2. CLIENT MENGIRIM KE API                                                    │
│     └─> DefaultChatTransport: POST /api/chat                                 │
│         Body: { messages: [ALL_HISTORY], conversationId, fileIds }           │
│                                                                               │
│  3. API ROUTE MEMPROSES                                                       │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ a. Authenticate (Clerk)                                              │  │
│     │ b. Fetch system prompt:                                              │  │
│     │    getSystemPrompt() → Convex systemPrompts.getActiveSystemPrompt    │  │
│     │ c. Fetch paper session:                                              │  │
│     │    getPaperModeSystemPrompt(conversationId)                          │  │
│     │    └─> Convex paperSessions.getByConversation                        │  │
│     │    └─> formatStageData(session.stageData, session.currentStage)      │  │
│     │ d. Check paper intent:                                               │  │
│     │    hasPaperWritingIntent(messages)                                   │  │
│     │ e. Build full messages:                                              │  │
│     │    [systemPrompt, paperModePrompt?, reminder?, fileContext?, ...msgs]│  │
│     └─────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  4. ROUTE KE MODEL                                                           │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ Router decides: google_search mode OR function tools mode            │  │
│     │                                                                      │  │
│     │ If function tools mode:                                              │  │
│     │ - Tools available: createArtifact, renameConversationTitle,          │  │
│     │   startPaperSession, getCurrentPaperState, updateStageData,          │  │
│     │   submitStageForValidation                                           │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  5. STREAMING RESPONSE                                                        │
│     └─> streamText({ model, messages: fullMessages, tools, ... })            │
│                                                                               │
│  6. PERSIST TO DATABASE                                                       │
│     └─> onFinish: createMessage() untuk user & assistant messages            │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Estimasi Context Window Usage

### Model Configuration

**File:** `src/lib/ai/streaming.ts:19-57`

```typescript
// Sumber utama: config dari DB via configCache
const config = await configCache.get()

// Fallback jika tidak ada config aktif di DB
if (!config) {
  return {
    primary: { provider: "vercel-gateway", model: "google/gemini-2.5-flash-lite" },
    fallback: { provider: "openrouter", model: "google/gemini-2.5-flash-lite" },
    temperature: 0.7,
    topP: undefined,
  }
}
```

**Catatan:** Chat route hanya meneruskan `temperature` dan `topP` dari config aktif. `maxTokens` tidak diset di route (mengandalkan default provider).

**Gemini 2.5 Flash Lite Context Window:** ~1,000,000 tokens

### Breakdown Context per Request

| Komponen | Estimasi Char | Estimasi Token |
|----------|---------------|----------------|
| System prompt base | ~2,000 | ~500 |
| Paper mode header + rules | ~1,200 | ~300 |
| Stage instructions (per tahap) | ~1,600 | ~400 |
| Ringkasan tahap selesai (12 × 280 char) | ~3,360 | ~840 |
| Active stage data | ~1,200 | ~300 |
| Outline checklist | ~800 | ~200 |
| **Subtotal Paper Context** | **~10,160** | **~2,540** |

### Chat History Estimasi (Setelah Limits)

Dengan `MAX_CHAT_HISTORY_PAIRS = 20`, chat history sekarang **capped** di paper mode:

| Skenario | Exchanges | Capped? | Actual Tokens |
|----------|-----------|---------|---------------|
| Minimal (65 exchanges) | 65 | Ya → 40 | 12,000 |
| Normal (195 exchanges) | 195 | Ya → 40 | 12,000 |
| Heavy (390 exchanges) | 390 | Ya → 40 | 12,000 |

### Outline Checklist Estimasi (Setelah Limits)

Dengan `MAX_OUTLINE_SECTIONS = 10` dan `MAX_OUTLINE_DEPTH = 2`:

| Outline Size | Before Limit | After Limit |
|--------------|--------------|-------------|
| 5 sections (level 1-2) | ~200 tokens | ~200 tokens |
| 15 sections (level 1-2) | ~600 tokens | ~400 tokens |
| 30 sections (level 1-3) | ~1200 tokens | ~400 tokens |

### File Context Estimasi (Setelah Limits)

Dengan `MAX_FILE_CONTEXT_CHARS_TOTAL = 20,000`:

| Files | Before Limit | After Limit |
|-------|--------------|-------------|
| 1 large (50k chars) | ~12,500 tokens | ~5,000 tokens |
| 5 medium (10k each) | ~12,500 tokens | ~5,000 tokens |

### Total Context Usage (Dengan Limits)

| Komponen | Before Limits | After Limits | Savings |
|----------|---------------|--------------|---------|
| Chat history | ~117,000 | ~12,000 | 90% |
| Outline checklist | ~1,200 | ~400 | 67% |
| File context | ~12,500 | ~5,000 | 60% |
| **Worst case total** | ~133,240 | ~19,940 | **85%** |

| Skenario | Paper Context | Chat History | File Context | Total | % of 1M |
|----------|---------------|--------------|--------------|-------|---------|
| Light | 2,540 | 6,000 | 2,500 | 11,040 | 1.1% |
| Normal | 2,540 | 12,000 | 5,000 | 19,540 | 2.0% |
| Heavy (capped) | 2,540 | 12,000 | 5,000 | 19,540 | 2.0% |

**Kesimpulan:** Dengan limits, worst case turun dari 12% ke 2% - sangat aman.

---

## Strategi Summarization Built-in

### Mengapa `ringkasan` Field Penting?

1. **Compression Ratio**
   - Full tahap data: ~2,000-5,000 char
   - Ringkasan: max 280 char
   - Compression: ~10-20x

2. **Semantic Preservation**
   - AI diminta membuat ringkasan yang mencakup keputusan kunci
   - Cukup untuk konteks tahap berikutnya

3. **Validation-Gated**
   - `ringkasan` hanya diinjeksi jika `validatedAt` terisi
   - Artinya user sudah approve konten tersebut

### Instruksi AI untuk Membuat Ringkasan

Di setiap stage instruction (file `src/lib/ai/paper-stages/*.ts`):

```
SETIAP TAHAP WAJIB:
1. Diskusi dulu dengan user
2. updateStageData() dengan field `ringkasan` yang merangkum keputusan kunci
3. createArtifact() untuk output detail
4. submitStageForValidation() setelah user konfirmasi puas
```

### Contoh Ringkasan yang Baik

```typescript
// Tahap Gagasan
ringkasan: "Penelitian tentang dampak AI generatif (ChatGPT, Gemini) pada produktivitas mahasiswa. Angle: perbandingan sebelum-sesudah adopsi. Novelty: konteks Indonesia."

// Tahap Metodologi
ringkasan: "Mixed-method dengan survei online (n=200) dan wawancara mendalam (n=15). Sequential explanatory design. Analisis: statistik deskriptif + tematik coding."
```

---

## Artifact System sebagai External Storage

### Fungsi Artifact dalam Memory Management

```
┌────────────────────────────────────────────────────────────────┐
│                    ARTIFACT OFFLOADING                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TANPA ARTIFACT:                                                │
│  Chat context = system prompt + FULL draf pendahuluan (3000    │
│  words) + FULL tinjauan literatur (5000 words) + chat history  │
│  → Context membengkak, costly, slow                             │
│                                                                 │
│  DENGAN ARTIFACT:                                               │
│  Chat context = system prompt + ringkasan pendahuluan (280     │
│  char) + ringkasan tinjauan (280 char) + chat history          │
│  → Context lean, full content tetap accessible via UI          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Alur Penyimpanan Artifact

```typescript
// Di paper-tools.ts atau saat AI call createArtifact
const artifact = await createArtifact({
    conversationId,
    userId,
    type: "section",
    title: "Draf Pendahuluan",
    content: fullDraftContent,  // 3000+ words
    format: "markdown"
})

// Di stageData, hanya simpan referensi
await updateStageData({
    stage: "pendahuluan",
    data: {
        ringkasan: "Latar belakang perkembangan AI...",  // 280 char
        artifactId: artifact._id,  // Referensi ke full content
        // Field lain...
    }
})
```

### Akses Artifact di UI

- `ArtifactPanel` component menampilkan artifact
- User bisa buka artifact kapan saja tanpa load ke context
- Edit artifact tidak mempengaruhi context chat

---

## Evaluasi: Kebutuhan External Memory

### Tabel Evaluasi

| Aspek | Status | Keterangan |
|-------|--------|------------|
| Context window capacity | ✅ Cukup | ~12% usage worst case |
| Long-term persistence | ✅ Database | Convex menyimpan selamanya |
| Cross-session continuity | ✅ Supported | Session di-load dari DB |
| Semantic recall | ✅ Built-in | `ringkasan` + checklist |
| Output detail storage | ✅ Artifacts | Offloaded ke tabel terpisah |
| Export consistency | ✅ Database | Ambil dari stageData, bukan AI |

### Mengapa TIDAK Perlu External Memory (Vector DB, etc)?

1. **Summarization Strategy Efektif**
   - `ringkasan` field = built-in semantic compression
   - 280 char cukup untuk konteks antar-tahap

2. **Context Window Modern Sangat Besar**
   - Gemini: ~1M tokens
   - GPT-4 Turbo: 128K tokens
   - Claude: 200K tokens
   - Bahkan percakapan heavy hanya 12% usage

3. **Export Tidak Bergantung AI Memory**
   - `content-compiler.ts` ambil langsung dari `stageData`
   - Konsistensi terjamin tanpa retrieval dari AI

4. **Workflow Linear, Bukan Random Access**
   - Paper workflow maju linear (tahap 1 → 13)
   - Tidak perlu "retrieve memory from arbitrary past"
   - Outline checklist cukup sebagai roadmap

### Kapan External Memory MUNGKIN Diperlukan?

1. **Chat history sangat panjang (>500 exchanges)**
   - Bisa implement conversation summarization
   - Atau truncate old messages

2. **Multi-paper research hub**
   - Jika user punya 10+ paper dan mau cross-reference
   - Vector DB bisa bantu semantic search antar paper

3. **Real-time collaboration**
   - Multiple AI agents working on same paper
   - Shared memory store might be needed

---

## Potensi Improvement

### 1. Chat History Truncation ✅ IMPLEMENTED

**Status:** Diimplementasi di 2026-01-08

Sekarang chat history di-trim ke 20 pairs (40 messages) di paper mode.
Lihat [Context Limits](#context-limits-paper-mode) untuk detail.

### 2. Conversation Summarization (Future Enhancement)

```typescript
// Summarize setiap 30 pesan
if (messages.length > 30 && messages.length % 15 === 0) {
    const oldMessages = messages.slice(0, -15)
    const summary = await summarizeConversation(oldMessages)

    // Inject summary sebagai system message
    const newMessages = [
        { role: "system", content: `Ringkasan percakapan sebelumnya:\n${summary}` },
        ...messages.slice(-15)
    ]
}
```

**Status:** Belum diimplementasi, tapi dengan trimming sudah tidak urgent.

### 3. Per-Stage Conversation Reset (Alternative)

Setiap approve tahap, clear chat history tapi keep:
- System prompt
- Paper mode prompt (dengan ringkasan lengkap)
- Pesan terbaru saja

**Pro:** Context selalu fresh
**Con:** User kehilangan kemampuan scroll back

**Status:** Tidak dibutuhkan dengan trimming saat ini.

### 4. Outline Section Limiting ✅ IMPLEMENTED

**Status:** Diimplementasi di 2026-01-08

Outline checklist dibatasi ke 10 sections, depth ≤ 2.
Lihat [Context Limits](#context-limits-paper-mode) untuk detail.

### 5. File Context Limiting ✅ IMPLEMENTED

**Status:** Diimplementasi di 2026-01-08

File context dibatasi 6k per file, 20k total.
Lihat [Context Limits](#context-limits-paper-mode) untuk detail.

### 6. Content Budget Enforcement ✅ IMPLEMENTED

**Status:** Diimplementasi di 2026-01-08

approveStage sekarang enforce budget berdasarkan outline.totalWordCount.
Lihat [Backend Guards](#backend-guards) untuk detail.

---

## Rujukan File

### Database Layer

| File | Fungsi |
|------|--------|
| `convex/schema.ts:204-356` | Schema `paperSessions` dengan `stageData` |
| `convex/schema.ts:50-68` | Schema `messages` |
| `convex/schema.ts:108-147` | Schema `artifacts` |
| `convex/paperSessions.ts` | CRUD operations untuk paper sessions |
| `convex/messages.ts:5-14` | `getMessages` query (tanpa limit) |

### Context Injection Layer

| File | Fungsi |
|------|--------|
| `src/lib/ai/paper-mode-prompt.ts` | `getPaperModeSystemPrompt()` |
| `src/lib/ai/paper-stages/formatStageData.ts` | Summarization logic |
| `src/lib/ai/paper-stages/index.ts` | `getStageInstructions()` router |
| `src/lib/ai/chat-config.ts` | `getSystemPrompt()` + fallback |

### Chat Flow

| File | Fungsi |
|------|--------|
| `src/app/api/chat/route.ts:251-263` | Message assembly |
| `src/components/chat/ChatWindow.tsx:62-149` | History sync ke useChat |
| `src/lib/hooks/useMessages.ts` | Query messages dari Convex |

### Model Configuration

| File | Fungsi |
|------|--------|
| `src/lib/ai/streaming.ts` | Provider model creation |
| `src/lib/ai/config-cache.ts` | AI config caching (5 min TTL) |

### Konstanta Penting

| Konstanta | File | Nilai |
|-----------|------|-------|
| `SUMMARY_CHAR_LIMIT` | `formatStageData.ts:25` | 1000 |
| `RINGKASAN_CHAR_LIMIT` | `formatStageData.ts:26` | 280 |
| `ConfigCache.TTL` | `config-cache.ts:32` | 5 menit |
| `CHAT_CONFIG.maxTokens` | `chat-config.ts:108` | 2048 (konstanta, belum dipakai di route chat) |

---

*Last updated: 2026-01-08*
*Updated: Added Backend Guards, Context Limits, and Sync Mechanism sections*
