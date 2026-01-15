# System Prompt Revision Report

**Report Date:** 2026-01-08
**Revision Type:** Fallback Monitoring System Implementation
**Status:** ✅ Completed and Deployed

---

## Executive Summary

Implementasi sistem monitoring untuk mendeteksi dan menginformasikan admin ketika sistem fallback prompt aktif. Perubahan ini mengganti hardcoded full prompt dengan minimal fallback prompt yang:
1. Tetap fungsional (agent tahu tools dan workflow)
2. Menginformasikan user tentang mode terbatas
3. Log alert ke database untuk visibilitas admin
4. Tampil di admin panel sebagai monitoring dashboard

---

## Daftar Isi

1. [Problem Statement](#problem-statement)
2. [Solution Architecture](#solution-architecture)
3. [Files Changed](#files-changed)
4. [Database Changes](#database-changes)
5. [New Components](#new-components)
6. [API Changes](#api-changes)
7. [Admin Panel Integration](#admin-panel-integration)
8. [Dependencies Added](#dependencies-added)
9. [Verification](#verification)
10. [Related Migrations](#related-migrations)

---

## Problem Statement

### Masalah yang Diatasi

1. **Hardcoded Full Prompt Redundant**
   - `src/lib/ai/chat-config.ts` memiliki full hardcoded prompt (~120 baris)
   - `convex/migrations/seedDefaultSystemPrompt.ts` juga punya full prompt
   - Duplikasi menyebabkan maintenance burden

2. **Fallback Tidak Termonitor**
   - Ketika fallback aktif, tidak ada notifikasi ke admin
   - Admin tidak tahu jika database bermasalah
   - User experience degraded tanpa awareness

3. **Outdated Content**
   - Hardcoded fallback content outdated (masih pakai struktur lama)
   - Tidak sync dengan database prompt yang sudah di-update via migrations

### Keputusan Desain

| Aspek | Keputusan |
|-------|-----------|
| Fallback Content | Minimal tapi fungsional (bukan full content) |
| Alert Storage | Convex table `systemAlerts` |
| Admin UI | Merge ke existing "System Prompts" tab |
| Seed Migration | Keep as-is + add clarifying comment |

---

## Solution Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FALLBACK MONITORING ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────────┘

User sends chat message
         │
         ▼
┌─────────────────────────────────────┐
│ src/lib/ai/chat-config.ts           │
│ getSystemPrompt()                   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ fetchQuery(getActiveSystemPrompt)   │
└────────────┬────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
   SUCCESS        FAIL
      │             │
      ▼             ▼
┌─────────┐  ┌──────────────────────────────┐
│ Return  │  │ logFallbackActivation()      │
│ DB      │  │  ├─ Log to systemAlerts      │
│ Prompt  │  │  │  (severity: critical)     │
└─────────┘  │  └─ Console warn             │
             └──────────────┬───────────────┘
                            │
                            ▼
                   ┌────────────────────┐
                   │ Return Minimal     │
                   │ Fallback Prompt    │
                   └────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Admin Panel (/dashboard → Tab "System Prompts")                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ SystemHealthPanel                                                        │ │
│ │  ├─ Status: 🟢 NORMAL atau 🔴 FALLBACK MODE                            │ │
│ │  ├─ Alert Summary (critical/warning/info counts)                        │ │
│ │  └─ Recent Alerts (with resolve action)                                 │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ SystemPromptsManager (existing)                                          │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Fallback Trigger Conditions

| Condition | Trigger | Severity |
|-----------|---------|----------|
| No active prompt in database | `no_active_prompt` | critical |
| Database fetch error | `database_error` | critical |
| Network/connection failure | `database_error` | critical |

---

## Files Changed

### Summary

| Category | Files Modified | Files Created |
|----------|---------------|---------------|
| Backend (Convex) | 1 | 1 |
| API Layer | 1 | 0 |
| Admin UI | 1 | 1 |
| Migrations | 1 | 0 |
| **Total** | **4** | **2** |

---

### Backend Changes

#### 1. convex/schema.ts (Modified)

**Lines Added:** 149-167

```typescript
// System Alerts for monitoring (admin panel)
systemAlerts: defineTable({
  alertType: v.string(), // "fallback_activated", "prompt_missing", "database_error", etc.
  severity: v.union(
    v.literal("info"),
    v.literal("warning"),
    v.literal("critical")
  ),
  message: v.string(),
  source: v.string(), // "chat-api", "admin-panel", etc.
  resolved: v.boolean(),
  resolvedAt: v.optional(v.number()),
  resolvedBy: v.optional(v.id("users")),
  metadata: v.optional(v.any()), // Additional context (reason, error, etc.)
  createdAt: v.number(),
})
  .index("by_type", ["alertType", "createdAt"])
  .index("by_severity", ["severity", "resolved", "createdAt"])
  .index("by_resolved", ["resolved", "createdAt"]),
```

#### 2. convex/systemAlerts.ts (Created)

**Total Lines:** 278

| Function | Line | Type | Auth Required | Description |
|----------|------|------|---------------|-------------|
| `getUnresolvedAlerts` | 13 | Query | Admin | Get all unresolved alerts |
| `getUnresolvedAlertCount` | 32 | Query | Admin | Get count by severity |
| `getRecentAlerts` | 55 | Query | Admin | Get recent alerts (limit 50) |
| `getAlertsByType` | 74 | Query | Admin | Filter by alertType |
| `isFallbackActive` | 97 | Query | Admin | Check if fallback_activated unresolved |
| `createAlert` | 128 | Mutation | None | Create new alert (for chat API) |
| `createAlertInternal` | 158 | Internal | None | Internal mutation for server-side |
| `resolveAlert` | 189 | Mutation | Admin | Mark single alert resolved |
| `resolveAlertsByType` | 220 | Mutation | Admin | Resolve all of specific type |
| `cleanupOldAlerts` | 254 | Mutation | Admin | Delete old resolved alerts |

---

### API Layer Changes

#### 3. src/lib/ai/chat-config.ts (Modified)

**Total Lines:** 112

| Function | Lines | Description |
|----------|-------|-------------|
| `getMinimalFallbackPrompt()` | 13-46 | Minimal fallback prompt (NEW) |
| `logFallbackActivation()` | 52-74 | Log alert to database (NEW) |
| `getSystemPrompt()` | 85-103 | Updated with fallback logging |
| `CHAT_CONFIG` | 105-112 | Unchanged |

**Key Changes:**

```typescript
// OLD: Full hardcoded prompt (~120 lines)
export function getHardcodedSystemPrompt(): string {
    return `Anda adalah asisten AI untuk Makalah App...
    [Full 120-line prompt]`
}

// NEW: Minimal fallback (~30 lines)
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

// NEW: Alert logging function
async function logFallbackActivation(reason: string, error?: unknown): Promise<void> {
    try {
        await fetchMutation(api.systemAlerts.createAlert, {
            alertType: "fallback_activated",
            severity: "critical",
            message: `System prompt fallback activated: ${reason}`,
            source: "chat-api",
            metadata: { reason, error, timestamp: new Date().toISOString() },
        })
    } catch (logError) {
        console.error("[chat-config] CRITICAL: Fallback activated AND failed to log")
    }
}
```

---

### Admin UI Changes

#### 4. src/components/admin/SystemHealthPanel.tsx (Created)

**Total Lines:** 298

**Features:**
- System Prompt Status (NORMAL vs FALLBACK MODE)
- Fallback activation timestamp
- Alert Summary (critical/warning/info counts)
- Recent Alerts list with resolve action
- Bulk resolve for fallback alerts

**Dependencies Used:**
- `useQuery` / `useMutation` (convex/react)
- `formatDistanceToNow` (date-fns)
- `id as localeId` (date-fns/locale)
- Icons: AlertCircle, CheckCircle2, AlertTriangle, Info, RefreshCw, Trash2 (lucide-react)

**Queries Used:**
```typescript
const activePrompt = useQuery(api.systemPrompts.getActiveSystemPrompt)
const alertCount = useQuery(api.systemAlerts.getUnresolvedAlertCount, { requestorUserId: userId })
const recentAlerts = useQuery(api.systemAlerts.getRecentAlerts, { requestorUserId: userId, limit: 10 })
const fallbackStatus = useQuery(api.systemAlerts.isFallbackActive, { requestorUserId: userId })
```

**Mutations Used:**
```typescript
const resolveAlert = useMutation(api.systemAlerts.resolveAlert)
const resolveAllFallback = useMutation(api.systemAlerts.resolveAlertsByType)
```

#### 5. src/components/admin/AdminPanelContainer.tsx (Modified)

**Lines Modified:** 8, 56-59

```tsx
// Line 8: New import
import { SystemHealthPanel } from "./SystemHealthPanel"

// Lines 56-59: Tab content updated
<TabsContent value="system-prompts" className="space-y-4">
  <SystemHealthPanel userId={userId} />      {/* NEW */}
  <SystemPromptsManager userId={userId} />   {/* Existing */}
</TabsContent>
```

---

### Migration Changes

#### 6. convex/migrations/seedDefaultSystemPrompt.ts (Modified)

**Lines Modified:** 3-39 (Added clarifying comment block)

```typescript
/**
 * Migration script to seed the default system prompt
 * Run via: npx convex run migrations:seedDefaultSystemPrompt
 *
 * ============================================================================
 * IMPORTANT NOTES:
 * ============================================================================
 *
 * 1. INITIAL BOOTSTRAP ONLY
 *    - This migration is ONLY for fresh database installs
 *    - The guard at line 74-80 prevents re-running if any prompt exists
 *    - Subsequent prompt updates should be done via:
 *      a) Admin Panel → System Prompts Manager
 *      b) New migration files (like updatePromptWithPaperWorkflow.ts)
 *
 * 2. CONTENT MAY BE OUTDATED
 *    - The DEFAULT_PROMPT_CONTENT below is a LEGACY version
 *    - Production database likely has newer versions via migrations:
 *      - v5: updatePromptWithPaperWorkflow.ts (13-stage workflow)
 *      - v6: removeOldPaperWorkflowSection.ts
 *      - v7: fix14TahapReference.ts
 *      - v8: fixAgentPersonaAndCapabilities.ts
 *    - After seeding, admin should review and update via panel if needed
 *
 * 3. RELATIONSHIP WITH FALLBACK (src/lib/ai/chat-config.ts)
 *    - chat-config.ts has a MINIMAL fallback prompt (getMinimalFallbackPrompt)
 *    - Fallback only activates when database fetch fails or no active prompt
 *    - Fallback triggers alerts in systemAlerts table → visible in admin panel
 *    - This seed provides the FULL prompt; fallback is intentionally minimal
 *
 * 4. WHY NOT UPDATE THIS FILE?
 *    - Guard prevents re-running, so content updates here won't take effect
 *    - Keeping original content shows historical v1 for documentation
 *    - Use migration pattern for production prompt updates
 *
 * ============================================================================
 */
```

---

## Database Changes

### New Table: systemAlerts

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

### Indexes Purpose

| Index | Fields | Usage |
|-------|--------|-------|
| `by_type` | `alertType, createdAt` | Filter alerts by type (e.g., "fallback_activated") |
| `by_severity` | `severity, resolved, createdAt` | Filter by priority |
| `by_resolved` | `resolved, createdAt` | Get unresolved alerts for badge count |

---

## Dependencies Added

### package.json (Line 40)

```json
"date-fns": "^4.1.0"
```

**Usage:**
- `formatDistanceToNow()` - Human-readable time formatting ("5 menit yang lalu")
- `id` locale - Indonesian localization

**Files Using:**
- `src/components/admin/SystemHealthPanel.tsx:16-17`

---

## Admin Panel Integration

### Access Path

```
/dashboard → Admin Panel → Tab "System Prompts"
```

### UI Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Admin Panel                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ [User Management] [System Prompts] [AI Providers] [Statistik]               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ System Health                                          [3 Alerts]      │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  System Prompt Status                                                  │ │
│  │  ┌────────────────────────────────────────────────────────────────┐   │ │
│  │  │ 🟢 NORMAL - Database Prompt Aktif                              │   │ │
│  │  │ Name: Default Academic Assistant                               │   │ │
│  │  │ Version: 8                                                     │   │ │
│  │  │ Last Updated: 2 jam yang lalu                                  │   │ │
│  │  └────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                        │ │
│  │  Alert Summary                                                         │ │
│  │  🔴 1 Critical  ⚠️ 2 Warning  ℹ️ 0 Info                               │ │
│  │                                                                        │ │
│  │  Recent Alerts                                                         │ │
│  │  ┌────────────────────────────────────────────────────────────────┐   │ │
│  │  │ [Critical] Fallback activated: database_error                  │   │ │
│  │  │ Source: chat-api | 5 menit yang lalu              [✓ Resolve]  │   │ │
│  │  └────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ System Prompts Manager (existing component)                            │ │
│  │ ...                                                                    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### When Fallback Active

```
┌────────────────────────────────────────────────────────────────┐
│ 🔴 FALLBACK MODE AKTIF                           (border-red)  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ⚠️ System prompt utama tidak tersedia.                       │
│  Chat menggunakan prompt minimal.                              │
│                                                                │
│  Fallback aktif sejak: 5 menit yang lalu                       │
│                                                                │
│  [Mark as Resolved]                                            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Verification

### Deployment

```bash
$ npm run convex -- deploy --yes

✔ Added table indexes:
  [+] systemAlerts.by_resolved   resolved, createdAt, _creationTime
  [+] systemAlerts.by_severity   severity, resolved, createdAt, _creationTime
  [+] systemAlerts.by_type   alertType, createdAt, _creationTime
✔ Deployed Convex functions to https://basic-oriole-337.convex.cloud
```

### Build

```bash
$ npm run build

✓ Compiled successfully in 23.3s
✓ Generating static pages using 7 workers (15/15) in 1698.2ms
```

### Type Check

No TypeScript errors.

---

## Related Migrations

### System Prompt Version History

| Version | Migration File | Description |
|---------|---------------|-------------|
| v1 | `seedDefaultSystemPrompt.ts` | Initial seed (legacy content) |
| v2-v4 | (manual edits) | Various updates via admin panel |
| v5 | `updatePromptWithPaperWorkflow.ts` | Added 13-stage paper workflow |
| v6 | `removeOldPaperWorkflowSection.ts` | Removed duplicate 14-tahap section |
| v7 | `fix14TahapReference.ts` | Fixed remaining "14-tahap" references |
| v8 | `fixAgentPersonaAndCapabilities.ts` | Fixed agent persona and tool rules |

---

## Quick Reference: Line Numbers

### Backend

| File | Lines | Description |
|------|-------|-------------|
| `convex/schema.ts` | 150-167 | systemAlerts table definition |
| `convex/systemAlerts.ts` | 1-278 | All queries/mutations |
| `convex/systemAlerts.ts` | 13 | getUnresolvedAlerts |
| `convex/systemAlerts.ts` | 32 | getUnresolvedAlertCount |
| `convex/systemAlerts.ts` | 55 | getRecentAlerts |
| `convex/systemAlerts.ts` | 97 | isFallbackActive |
| `convex/systemAlerts.ts` | 128 | createAlert |
| `convex/systemAlerts.ts` | 189 | resolveAlert |
| `convex/systemAlerts.ts` | 220 | resolveAlertsByType |

### API Layer

| File | Lines | Description |
|------|-------|-------------|
| `src/lib/ai/chat-config.ts` | 13-46 | getMinimalFallbackPrompt() |
| `src/lib/ai/chat-config.ts` | 52-74 | logFallbackActivation() |
| `src/lib/ai/chat-config.ts` | 85-103 | getSystemPrompt() |

### Admin UI

| File | Lines | Description |
|------|-------|-------------|
| `src/components/admin/SystemHealthPanel.tsx` | 1-298 | Full component |
| `src/components/admin/AdminPanelContainer.tsx` | 8 | Import SystemHealthPanel |
| `src/components/admin/AdminPanelContainer.tsx` | 56-59 | Tab content integration |

### Migrations

| File | Lines | Description |
|------|-------|-------------|
| `convex/migrations/seedDefaultSystemPrompt.ts` | 3-39 | Clarifying comment block |

---

## Rollback Plan

Jika perlu rollback:

1. **Revert chat-config.ts** - Restore old `getHardcodedSystemPrompt()` function
2. **Remove SystemHealthPanel** - Delete component and remove import from AdminPanelContainer
3. **Keep systemAlerts table** - Data cleanup optional, table tidak mengganggu

**Note:** Rollback tidak recommended karena sistem sudah stabil dan memberikan visibility yang lebih baik.

---

*Report generated: 2026-01-08*
*Verified against codebase: ✅ All line numbers confirmed accurate*
