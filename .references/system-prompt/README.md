# System Prompt Management - Technical Reference

Dokumentasi lengkap tentang sistem pengelolaan System Prompt di Makalah App.

## Daftar Isi

1. [Overview](#overview)
2. [Rationale](#rationale)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Integration](#api-integration)
6. [Admin Dashboard](#admin-dashboard)
7. [Files & Locations](#files--locations)
8. [Key Functions](#key-functions)
9. [Design Patterns](#design-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Overview

System Prompt Management adalah fitur yang memungkinkan admin untuk mengelola system prompt AI melalui database, bukan hardcoded di source code. Fitur ini memberikan fleksibilitas untuk mengubah perilaku AI tanpa deployment ulang.

### Key Features

- **Database-Driven**: System prompt disimpan di Convex database
- **Versioning**: Setiap perubahan membuat versi baru, history tersimpan
- **Single Active**: Hanya satu prompt yang bisa aktif pada satu waktu
- **Fallback Safety**: Jika DB fail, pakai minimal fallback + log alert
- **Fallback Monitoring**: Alert dicatat di `systemAlerts` table, visible di admin panel
- **Admin UI**: Kelola via dashboard admin (`/dashboard` → Tab "System Prompts")
- **Role-Based Access**: Hanya admin/superadmin yang bisa mengelola

---

## Rationale

### Mengapa Database-Driven?

1. **Flexibility**: Ubah behavior AI tanpa code change atau deployment
2. **A/B Testing**: Mudah switch antara prompt versions untuk testing
3. **Audit Trail**: Track siapa yang mengubah prompt dan kapan
4. **Rollback**: Bisa kembali ke versi sebelumnya jika ada masalah
5. **Non-Technical Access**: Admin bisa edit prompt tanpa akses code

### Mengapa Versioning?

1. **Safety Net**: Perubahan tidak menghapus versi lama
2. **Comparison**: Bisa bandingkan versi untuk melihat apa yang berubah
3. **Accountability**: Setiap versi tercatat siapa yang buat
4. **Recovery**: Mudah restore versi sebelumnya jika prompt baru bermasalah

### Mengapa Single Active?

1. **Consistency**: Semua chat session pakai prompt yang sama
2. **Simplicity**: Tidak ada confusion tentang prompt mana yang aktif
3. **Predictability**: Behavior AI konsisten dan predictable

### Mengapa Fallback?

1. **Reliability**: App tetap jalan meski DB bermasalah
2. **Zero Downtime**: Tidak ada downtime karena prompt missing
3. **Default Behavior**: Ada baseline prompt yang selalu tersedia

### Mengapa Fallback Monitoring?

1. **Visibility**: Admin tahu ketika sistem degraded
2. **Proactive Response**: Alert segera saat fallback aktif
3. **Audit Trail**: Semua fallback activation tercatat dengan timestamp
4. **Quick Resolution**: Admin bisa resolve alert setelah fix masalah

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM PROMPT ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │  Admin Dashboard │
                              │  /dashboard      │
                              └────────┬────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────┐
                    │      AdminPanelContainer         │
                    │  Tab: "System Prompts"           │
                    └──────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
┌──────────────────────────────────┐   ┌──────────────────────────────────┐
│      SystemHealthPanel (NEW)      │   │     SystemPromptsManager         │
│  - System Status (NORMAL/FALLBACK)│   │  - List prompts (latest versions)│
│  - Alert Summary (counts)         │   │  - Activate / Deactivate         │
│  - Recent Alerts (with resolve)   │   │  - Delete prompt chain           │
└──────────────────────────────────┘   └──────────────────────────────────┘
                           │              │
              ┌────────────┘              └────────────┐
              ▼                                        ▼
┌─────────────────────────┐              ┌─────────────────────────┐
│ SystemPromptFormDialog  │              │  VersionHistoryDialog   │
│ - Create new prompt     │              │  - View all versions    │
│ - Edit (create version) │              │  - Compare changes      │
└─────────────────────────┘              └─────────────────────────┘
              │                                        │
              └────────────────┬───────────────────────┘
                               ▼
                    ┌──────────────────────────────────┐
                    │     Convex Backend               │
                    │     convex/systemPrompts.ts      │
                    │  - Queries: getActive, list, etc │
                    │  - Mutations: create, update,    │
                    │    activate, delete              │
                    └──────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────────────────┐
                    │     Convex Database              │
                    │     systemPrompts table          │
                    │  - name, content, version        │
                    │  - isActive, parentId, rootId    │
                    └──────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
┌─────────────────────────┐      ┌─────────────────────────┐
│   Chat API              │      │   Fallback + Monitoring │
│   /api/chat/route.ts    │      │   (jika DB fail atau    │
│                         │      │    no active prompt)    │
│   getSystemPrompt()     │      │                         │
│   - Fetch active prompt │      │ 1. Log to systemAlerts  │
│   - Inject ke messages  │─────▶│ 2. Return minimal       │
│   - Inject fileContext  │      │    fallback prompt      │
└─────────────────────────┘      └─────────────────────────┘
                                            │
                                            ▼
                                ┌─────────────────────────┐
                                │   Convex Database       │
                                │   systemAlerts table    │
                                │  - alertType, severity  │
                                │  - message, resolved    │
                                └─────────────────────────┘
                                            │
                                            ▼
                                ┌─────────────────────────┐
                                │   Admin Panel           │
                                │   SystemHealthPanel     │
                                │  - Shows 🔴 FALLBACK    │
                                │  - Recent alerts list   │
                                └─────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   AI Model (Gemini/etc)                                                      │
│   System prompt menjadi context pertama dalam conversation                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Admin Edit Prompt

```
Admin clicks "Edit" on prompt
         │
         ▼
SystemPromptFormDialog opens
         │
         ▼
Admin modifies content, clicks "Simpan"
         │
         ▼
updateSystemPrompt mutation called
         │
         ▼
┌─────────────────────────────────────┐
│ Convex Backend:                     │
│ 1. Validate content not empty       │
│ 2. Get old prompt data              │
│ 3. Create NEW document with:        │
│    - version = oldVersion + 1       │
│    - parentId = oldPrompt._id       │
│    - rootId = oldPrompt.rootId      │
│    - isActive = oldPrompt.isActive  │
│ 4. If old was active, deactivate it │
│ 5. Return success                   │
└─────────────────────────────────────┘
         │
         ▼
UI refreshes, shows new version
```

### Data Flow: Chat Uses Prompt

```
User sends message to /api/chat
         │
         ▼
┌─────────────────────────────────────┐
│ Chat API Route:                     │
│ 1. Authenticate user                │
│ 2. Call getSystemPrompt()           │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ getSystemPrompt():                  │
│ try {                               │
│   activePrompt = fetchQuery(        │
│     api.systemPrompts.              │
│     getActiveSystemPrompt           │
│   )                                 │
│   if (activePrompt?.content)        │
│     return activePrompt.content     │
│                                    │
│   logFallbackActivation(           │
│     "no_active_prompt"             │
│   )                                │
│   return getMinimalFallbackPrompt()│
│ } catch (error) {                  │
│   logFallbackActivation(           │
│     "database_error", error        │
│   )                                │
│   return getMinimalFallbackPrompt()│
│ }                                   │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Build messages array:               │
│ [                                   │
│   { role: "system",                 │
│     content: systemPrompt },        │
│   { role: "system",                 │
│     content: paperModePrompt },     │
│   { role: "system",                 │
│     content: "File Context:..." },  │
│   ...userMessages                   │
│ ]                                   │
└─────────────────────────────────────┘
         │
         ▼
Send to AI model via streamText()
```

### File Context States

Saat `fileContext` dibangun, ada tiga kondisi status yang ditangani:

- **⏳ pending**: File sedang diproses, belum bisa dibaca oleh AI
- **✅ success**: Teks hasil ekstraksi dimasukkan ke context
- **❌ failed**: Error message disertakan dalam context

---

## Database Schema

### Table: systemPrompts

```typescript
// convex/schema.ts:91-105

systemPrompts: defineTable({
    // Identity & Content
    name: v.string(),                           // Display name, e.g., "Academic Assistant"
    content: v.string(),                        // Full prompt text (can be very long)
    description: v.optional(v.string()),        // Optional short description

    // Versioning
    version: v.number(),                        // 1, 2, 3, ... (increments on edit)
    parentId: v.optional(v.id("systemPrompts")),// Link to previous version (null for v1)
    rootId: v.optional(v.id("systemPrompts")),  // Link to first version (null for v1)

    // Activation
    isActive: v.boolean(),                      // Only ONE can be true at a time

    // Audit Trail
    createdBy: v.id("users"),                   // Admin who created this version
    createdAt: v.number(),                      // Timestamp
    updatedAt: v.number(),                      // Timestamp
})
    .index("by_active", ["isActive"])           // Fast lookup for active prompt
    .index("by_root", ["rootId", "version"])    // Query version history
    .index("by_createdAt", ["createdAt"]),      // List chronologically
```

### Version Chain Example

```
Prompt "Academic Assistant" versions:

┌──────────────────────────────────────────────────────────────────┐
│ v1 (Root)                                                        │
│ _id: "abc123"                                                    │
│ name: "Academic Assistant"                                       │
│ version: 1                                                       │
│ rootId: undefined (null for v1)                                  │
│ parentId: undefined (null for v1)                                │
│ isActive: false                                                  │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼ (edit creates new version)
┌──────────────────────────────────────────────────────────────────┐
│ v2                                                               │
│ _id: "def456"                                                    │
│ name: "Academic Assistant"                                       │
│ version: 2                                                       │
│ rootId: "abc123" (points to v1)                                  │
│ parentId: "abc123" (points to v1)                                │
│ isActive: false                                                  │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼ (edit creates new version)
┌──────────────────────────────────────────────────────────────────┐
│ v3 (Current Active)                                              │
│ _id: "ghi789"                                                    │
│ name: "Academic Assistant"                                       │
│ version: 3                                                       │
│ rootId: "abc123" (still points to v1)                            │
│ parentId: "def456" (points to v2)                                │
│ isActive: true ← Currently active                                │
└──────────────────────────────────────────────────────────────────┘
```

### Indexes Explained

| Index | Fields | Purpose |
|-------|--------|---------|
| `by_active` | `["isActive"]` | Fast lookup: `q.eq("isActive", true)` untuk get active prompt |
| `by_root` | `["rootId", "version"]` | Query version history: semua versi dengan rootId yang sama |
| `by_createdAt` | `["createdAt"]` | List prompts chronologically untuk admin list |

### Table: systemAlerts

```typescript
// convex/schema.ts:150-167

systemAlerts: defineTable({
    alertType: v.string(),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    message: v.string(),
    source: v.string(),
    resolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
})
    .index("by_type", ["alertType", "createdAt"])
    .index("by_severity", ["severity", "resolved", "createdAt"])
    .index("by_resolved", ["resolved", "createdAt"])
```

---

## API Integration

### File: src/lib/ai/chat-config.ts

```typescript
/**
 * Minimal fallback system prompt (NEW)
 * Used when database fetch fails or no active prompt exists
 * Intentionally minimal to indicate degraded state
 */
export function getMinimalFallbackPrompt(): string {
    return `[⚠️ MODE FALLBACK - System Prompt Utama Tidak Aktif]

Anda adalah MOKA, asisten AI Makalah App dalam MODE TERBATAS.

KEMAMPUAN YANG TETAP TERSEDIA:
1. **Paper Writing Workflow** (13 tahap: gagasan → judul)
2. **Web Search** (google_search)
3. **Artifact Creation** (createArtifact)
4. **File Reading**
...`
}

/**
 * Log fallback activation to systemAlerts table (NEW)
 */
async function logFallbackActivation(reason: string, error?: unknown): Promise<void> {
    try {
        await fetchMutation(api.systemAlerts.createAlert, {
            alertType: "fallback_activated",
            severity: "critical",
            message: `System prompt fallback activated: ${reason}`,
            source: "chat-api",
            metadata: {
                reason,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
            },
        })
    } catch (logError) {
        console.error("[chat-config] CRITICAL: Fallback activated AND failed to log")
    }
}

/**
 * Main function to get system prompt
 * Now with fallback monitoring
 */
export async function getSystemPrompt(): Promise<string> {
    try {
        const activePrompt = await fetchQuery(api.systemPrompts.getActiveSystemPrompt)

        if (activePrompt?.content) {
            return activePrompt.content
        }

        // No active prompt - log alert and use fallback
        await logFallbackActivation("no_active_prompt")
        return getMinimalFallbackPrompt()

    } catch (error) {
        // Database error - log alert and use fallback
        await logFallbackActivation("database_error", error)
        return getMinimalFallbackPrompt()
    }
}
```

### File: src/app/api/chat/route.ts

```typescript
// Import
import { getSystemPrompt } from "@/lib/ai/chat-config"

// Inside POST handler (~line 129)
const systemPrompt = await getSystemPrompt()

// Build messages (~line 200)
const fullMessagesBase = [
    { role: "system" as const, content: systemPrompt },
    // Paper mode prompt (if paper session exists)
    ...(paperModePrompt
        ? [{ role: "system" as const, content: paperModePrompt }]
        : []),
    // Paper workflow reminder (if intent detected)
    ...(paperWorkflowReminder
        ? [{ role: "system" as const, content: paperWorkflowReminder }]
        : []),
    // File context (if fileIds provided)
    ...(fileContext
        ? [{ role: "system" as const, content: `File Context:\n\n${fileContext}` }]
        : []),
    // User messages...
]
```

---

## Admin Dashboard

### Access Path

```
/dashboard → Tab "System Prompts" → SystemHealthPanel + SystemPromptsManager
```

### Component Hierarchy

```
AdminPanelContainer
└── Tabs
    └── TabsContent value="system-prompts"
        ├── SystemHealthPanel (NEW)
        │   ├── Status: NORMAL / FALLBACK MODE
        │   ├── Alert Summary (critical/warning/info)
        │   └── Recent Alerts (with resolve action)
        └── SystemPromptsManager
            ├── Table (list prompts)
            │   └── Row actions: Edit, History, Activate, Deactivate, Delete
            ├── SystemPromptFormDialog (create/edit)
            └── VersionHistoryDialog (view history)
```

### SystemHealthPanel Features (NEW)

| Feature | Description | Query/Mutation Used |
|---------|-------------|---------------------|
| System Status | Show NORMAL or FALLBACK MODE | `getActiveSystemPrompt`, `isFallbackActive` |
| Active Prompt Info | Name, version, last updated | `getActiveSystemPrompt` |
| Alert Summary | Count by severity (critical/warning/info) | `getUnresolvedAlertCount` |
| Recent Alerts | List 10 alert terbaru | `getRecentAlerts` |
| Resolve Single | Mark individual alert resolved | `resolveAlert` |
| Resolve All Fallback | Resolve all fallback_activated alerts | `resolveAlertsByType` |

### SystemPromptsManager Features

| Feature | Description | Mutation/Query Used |
|---------|-------------|---------------------|
| List Prompts | Show latest version of each prompt chain | `listSystemPrompts` |
| Create New | Open form dialog for new prompt | `createSystemPrompt` |
| Edit | Open form dialog, creates new version | `updateSystemPrompt` |
| View History | Show all versions of a prompt | `getPromptVersionHistory` |
| Activate | Set prompt as active (deactivates others) | `activateSystemPrompt` |
| Deactivate | Set prompt as inactive | `deactivateSystemPrompt` |
| Delete | Delete entire prompt chain | `deletePromptChain` |

### UI States

#### SystemHealthPanel - Normal Mode
```
┌────────────────────────────────────────────────────────────────┐
│ System Health                                                   │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  System Prompt Status                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🟢 NORMAL - Database Prompt Aktif                        │  │
│  │ Name: Default Academic Assistant                         │  │
│  │ Version: 8                                               │  │
│  │ Last Updated: 2 jam yang lalu                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Recent Alerts                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Tidak ada alert - sistem beroperasi normal               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

#### SystemHealthPanel - Fallback Mode
```
┌────────────────────────────────────────────────────────────────┐
│ System Health                                    [3 Alerts]    │ ← border-red
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  System Prompt Status                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🔴 FALLBACK MODE AKTIF                      (bg-red)      │  │
│  │ ⚠️ System prompt utama tidak tersedia.                    │  │
│  │ Chat menggunakan prompt minimal.                          │  │
│  │                                                           │  │
│  │ Fallback aktif sejak: 5 menit yang lalu                   │  │
│  │ [Mark as Resolved]                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Alert Summary                                                  │
│  🔴 1 Critical  ⚠️ 2 Warning  ℹ️ 0 Info                        │
│                                                                 │
│  Recent Alerts                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [Critical] Fallback activated: database_error             │  │
│  │ Source: chat-api | 5 menit yang lalu        [✓ Resolve]   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

#### SystemPromptsManager
```
┌─────────────────────────────────────────────────────────────────┐
│ System Prompts                              [+ Buat Prompt Baru]│
├─────────────────────────────────────────────────────────────────┤
│ Nama              │ Versi │ Status      │ Dibuat Oleh │ Actions │
├───────────────────┼───────┼─────────────┼─────────────┼─────────┤
│ Academic Assistant│ v8    │ [Aktif]     │ admin@...   │ ✏️ 📜 ⏻ │
│ Casual Helper     │ v1    │ [Tidak Aktif│ admin@...   │ ✏️ 📜 ⏼ 🗑│
└─────────────────────────────────────────────────────────────────┘

Legend:
✏️ = Edit (creates new version)
📜 = View version history
⏻ = Deactivate (only for active prompts)
⏼ = Activate (only for inactive prompts)
🗑 = Delete (only for inactive prompts)
```

---

## Files & Locations

### Backend (Convex)

| File | Path | Description |
|------|------|-------------|
| **schema.ts** | `convex/schema.ts:91-105` | systemPrompts table |
| **schema.ts** | `convex/schema.ts:150-167` | systemAlerts table (NEW) |
| **systemPrompts.ts** | `convex/systemPrompts.ts` | Prompt queries & mutations |
| **systemAlerts.ts** | `convex/systemAlerts.ts` | Alert queries & mutations (NEW) |
| **seedDefaultSystemPrompt.ts** | `convex/migrations/seedDefaultSystemPrompt.ts` | Initial seed (with comment) |
| **updatePromptWithPaperWorkflow.ts** | `convex/migrations/updatePromptWithPaperWorkflow.ts` | Tambah bagian paper workflow |
| **updatePromptWithArtifactGuidelines.ts** | `convex/migrations/updatePromptWithArtifactGuidelines.ts` | Tambah panduan artifact |
| **removeOldPaperWorkflowSection.ts** | `convex/migrations/removeOldPaperWorkflowSection.ts` | Hapus section workflow lama |
| **fix14TahapReference.ts** | `convex/migrations/fix14TahapReference.ts` | Perbaiki referensi "14 tahap" |
| **fixAgentPersonaAndCapabilities.ts** | `convex/migrations/fixAgentPersonaAndCapabilities.ts` | Perbaiki persona dan aturan tool |

### API Layer

| File | Path | Description |
|------|------|-------------|
| **chat-config.ts** | `src/lib/ai/chat-config.ts:13` | `getMinimalFallbackPrompt()` (NEW) |
| **chat-config.ts** | `src/lib/ai/chat-config.ts:52` | `logFallbackActivation()` (NEW) |
| **chat-config.ts** | `src/lib/ai/chat-config.ts:85` | `getSystemPrompt()` |
| **route.ts** | `src/app/api/chat/route.ts:7,129,200` | Usage in chat API |

### Admin UI Components

| File | Path | Description |
|------|------|-------------|
| **AdminPanelContainer.tsx** | `src/components/admin/AdminPanelContainer.tsx` | Container with tabs |
| **SystemHealthPanel.tsx** | `src/components/admin/SystemHealthPanel.tsx` | Fallback monitoring (NEW) |
| **SystemPromptsManager.tsx** | `src/components/admin/SystemPromptsManager.tsx` | Main manager |
| **SystemPromptFormDialog.tsx** | `src/components/admin/SystemPromptFormDialog.tsx` | Create/Edit form |
| **VersionHistoryDialog.tsx** | `src/components/admin/VersionHistoryDialog.tsx` | History viewer |

---

## Key Functions

### Queries (convex/systemPrompts.ts)

| Function | Auth Required | Description |
|----------|---------------|-------------|
| `getActiveSystemPrompt` | No | Get prompt where `isActive=true` |
| `listSystemPrompts` | Admin | List latest version of each chain |
| `getPromptVersionHistory` | Admin | Get all versions of a prompt |
| `getSystemPromptById` | Admin | Get single prompt by ID |

### Mutations (convex/systemPrompts.ts)

| Function | Auth Required | Description |
|----------|---------------|-------------|
| `createSystemPrompt` | Admin | Create new v1 prompt |
| `updateSystemPrompt` | Admin | Create new version (edit) |
| `activateSystemPrompt` | Admin | Set active, deactivate others |
| `deactivateSystemPrompt` | Admin | Set inactive |
| `deleteSystemPrompt` | Admin | Delete single version |
| `deletePromptChain` | Admin | Delete all versions |

### Queries (convex/systemAlerts.ts) - NEW

| Function | Auth Required | Description |
|----------|---------------|-------------|
| `getUnresolvedAlerts` | Admin | Get all unresolved alerts |
| `getUnresolvedAlertCount` | Admin | Get count by severity |
| `getRecentAlerts` | Admin | Get recent alerts (limit) |
| `getAlertsByType` | Admin | Filter by alertType |
| `isFallbackActive` | Admin | Check fallback_activated unresolved |

### Mutations (convex/systemAlerts.ts) - NEW

| Function | Auth Required | Description |
|----------|---------------|-------------|
| `createAlert` | None | Create alert (for chat API) |
| `createAlertInternal` | Internal | Server-side alert creation |
| `resolveAlert` | Admin | Mark single alert resolved |
| `resolveAlertsByType` | Admin | Resolve all of specific type |
| `cleanupOldAlerts` | Admin | Delete old resolved alerts |

### Helper Functions

| Function | File | Description |
|----------|------|-------------|
| `getSystemPrompt()` | `src/lib/ai/chat-config.ts:85` | Async fetch with fallback + logging |
| `getMinimalFallbackPrompt()` | `src/lib/ai/chat-config.ts:13` | Minimal fallback prompt (NEW) |
| `logFallbackActivation()` | `src/lib/ai/chat-config.ts:52` | Log to systemAlerts (NEW) |

---

## Design Patterns

### 1. Versioning Pattern

Setiap edit membuat dokumen baru, bukan mengubah dokumen lama:

```typescript
// updateSystemPrompt mutation
const newPromptId = await db.insert("systemPrompts", {
    name: oldPrompt.name,           // Keep same name
    content: newContent,            // New content
    version: oldPrompt.version + 1, // Increment version
    parentId: promptId,             // Link to old version
    rootId: rootId,                 // Link to root (v1)
    isActive: oldPrompt.isActive,   // Inherit active status
    createdBy: requestorUserId,
    createdAt: now,
    updatedAt: now,
})

// Deactivate old version if it was active
if (oldPrompt.isActive) {
    await db.patch(promptId, { isActive: false })
}
```

### 2. Single Active Pattern

Hanya satu prompt bisa aktif:

```typescript
// activateSystemPrompt mutation

// Step 1: Deactivate ALL currently active
const activePrompts = await db
    .query("systemPrompts")
    .withIndex("by_active", (q) => q.eq("isActive", true))
    .collect()

for (const prompt of activePrompts) {
    await db.patch(prompt._id, { isActive: false })
}

// Step 2: Activate target
await db.patch(promptId, { isActive: true })
```

### 3. Fallback Pattern with Monitoring (UPDATED)

Fallback + logging ke systemAlerts table:

```typescript
export async function getSystemPrompt(): Promise<string> {
    try {
        const activePrompt = await fetchQuery(api.systemPrompts.getActiveSystemPrompt)
        if (activePrompt?.content) {
            return activePrompt.content  // DB success
        }
        // No active prompt - log alert and use fallback
        await logFallbackActivation("no_active_prompt")
        return getMinimalFallbackPrompt()
    } catch (error) {
        // DB error - log alert and use fallback
        await logFallbackActivation("database_error", error)
        return getMinimalFallbackPrompt()
    }
}

async function logFallbackActivation(reason: string, error?: unknown) {
    await fetchMutation(api.systemAlerts.createAlert, {
        alertType: "fallback_activated",
        severity: "critical",
        message: `System prompt fallback activated: ${reason}`,
        source: "chat-api",
        metadata: {
            reason,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
        },
    })
}
```

### 4. Role-Based Access Pattern

Semua mutations require admin role:

```typescript
export const createSystemPrompt = mutationGeneric({
    args: {
        requestorUserId: v.id("users"),
        // ...
    },
    handler: async ({ db }, args) => {
        // First line: check permission
        await requireRole(db, args.requestorUserId, "admin")

        // Rest of the logic...
    },
})
```

---

## Troubleshooting

### Prompt tidak berubah setelah edit

1. **Cek apakah versi baru sudah aktif**: Edit creates new version, tapi inherit `isActive` dari versi lama
2. **Pastikan prompt ter-activate**: Klik tombol "Aktifkan" jika perlu
3. **Clear browser cache**: Kadang cache bisa menyimpan response lama

### Fallback prompt selalu digunakan

1. **Cek Convex connection**: Pastikan `NEXT_PUBLIC_CONVEX_URL` benar
2. **Cek ada prompt aktif**: Buka admin panel, pastikan ada prompt dengan badge "Aktif"
3. **Cek SystemHealthPanel**: Lihat status di admin panel → Tab "System Prompts"
4. **Cek console log**: Lihat `[chat-config]` messages

### SystemHealthPanel menunjukkan FALLBACK MODE

1. **Cek database connection**: Pastikan Convex dev server jalan
2. **Cek active prompt**: Pastikan ada prompt yang di-activate
3. **Resolve alerts**: Setelah fix, klik "Mark as Resolved" di panel
4. **Cek Recent Alerts**: Lihat detail error di metadata

### Alert tidak muncul di panel

1. **Admin role required**: Pastikan user adalah admin/superadmin
2. **Real-time sync**: Tunggu beberapa detik untuk sync
3. **Cek Convex dashboard**: Pastikan table systemAlerts ada

### Tidak bisa menghapus prompt

1. **Prompt sedang aktif**: Deactivate dulu sebelum delete
2. **Permission denied**: Pastikan user memiliki role admin/superadmin

### Version history tidak muncul

1. **Prompt adalah v1**: v1 prompts tidak memiliki history (belum pernah di-edit)
2. **Query error**: Cek Convex dashboard untuk error logs

---

## Related Documentation

- **CLAUDE.md**: Section "System Prompt Management"
- **Admin Panel**: `/dashboard` → Tab "System Prompts"
- **Revision Report**: `.references/system-prompt/revision-report.md`
- **Files Index**: `.references/system-prompt/files-index.md`
- **Fallback Design**: `.references/system-prompt/fallback-alert.md`

---

*Last updated: 2026-01-08*
*Revision: Added fallback monitoring system (systemAlerts + SystemHealthPanel)*
