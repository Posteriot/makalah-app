# System Prompt Management - Files Index

Quick reference untuk lokasi semua files terkait System Prompt Management.

## Quick Jump

| Category | Count | Files |
|----------|-------|-------|
| [Backend (Convex)](#backend-convex) | 9 | Schema, queries/mutations, alerts, migrations |
| [API Layer](#api-layer) | 2 | chat-config, chat route |
| [Admin UI](#admin-ui) | 5 | Container, manager, dialogs, health panel |
| **Total** | **16** | |

---

## Backend (Convex)

```
convex/
├── schema.ts                         # systemPrompts (91-105) + systemAlerts (150-167)
├── systemPrompts.ts                  # All CRUD queries & mutations
├── systemAlerts.ts                   # Alert monitoring queries & mutations (NEW)
└── migrations/
    ├── seedDefaultSystemPrompt.ts    # Initial seed migration (with clarifying comment)
    ├── updatePromptWithPaperWorkflow.ts # Add paper workflow section
    ├── updatePromptWithArtifactGuidelines.ts # Add artifact guidelines
    ├── removeOldPaperWorkflowSection.ts # Remove duplicate workflow section
    ├── fix14TahapReference.ts        # Fix "14 tahap" references
    └── fixAgentPersonaAndCapabilities.ts # Fix persona and tool rules
```

### Schema Definition: systemPrompts (convex/schema.ts:91-105)

```typescript
systemPrompts: defineTable({
    name: v.string(),
    content: v.string(),
    description: v.optional(v.string()),
    version: v.number(),
    isActive: v.boolean(),
    parentId: v.optional(v.id("systemPrompts")),
    rootId: v.optional(v.id("systemPrompts")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
})
    .index("by_active", ["isActive"])
    .index("by_root", ["rootId", "version"])
    .index("by_createdAt", ["createdAt"]),
```

### Queries (convex/systemPrompts.ts)

| Function | Line | Auth | Description |
|----------|------|------|-------------|
| `getActiveSystemPrompt` | 14 | None | Get active prompt for chat |
| `listSystemPrompts` | 30 | Admin | List latest versions |
| `getPromptVersionHistory` | 79 | Admin | Get version chain |
| `getSystemPromptById` | 132 | Admin | Get single prompt |

### Mutations (convex/systemPrompts.ts)

| Function | Line | Auth | Description |
|----------|------|------|-------------|
| `createSystemPrompt` | 162 | Admin | Create new v1 prompt |
| `updateSystemPrompt` | 205 | Admin | Create new version |
| `activateSystemPrompt` | 263 | Admin | Set active |
| `deactivateSystemPrompt` | 304 | Admin | Set inactive |
| `deleteSystemPrompt` | 333 | Admin | Delete single version |
| `deletePromptChain` | 363 | Admin | Delete all versions |

### Schema Definition: systemAlerts (convex/schema.ts:150-167)

```typescript
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

### Queries (convex/systemAlerts.ts)

| Function | Line | Auth | Description |
|----------|------|------|-------------|
| `getUnresolvedAlerts` | 13 | Admin | Get all unresolved alerts |
| `getUnresolvedAlertCount` | 32 | Admin | Get count by severity |
| `getRecentAlerts` | 55 | Admin | Get recent alerts (limit 50) |
| `getAlertsByType` | 74 | Admin | Filter by alertType |
| `isFallbackActive` | 97 | Admin | Check if fallback unresolved |

### Mutations (convex/systemAlerts.ts)

| Function | Line | Auth | Description |
|----------|------|------|-------------|
| `createAlert` | 128 | None | Create alert (for chat API) |
| `createAlertInternal` | 158 | Internal | Server-side alert creation |
| `resolveAlert` | 189 | Admin | Mark single alert resolved |
| `resolveAlertsByType` | 220 | Admin | Resolve all of specific type |
| `cleanupOldAlerts` | 254 | Admin | Delete old resolved alerts |

---

## API Layer

```
src/
├── lib/ai/
│   └── chat-config.ts                # getSystemPrompt() + fallback
└── app/api/chat/
    └── route.ts                      # Import & usage (lines 7, 129, 200)
```

### Key Functions (src/lib/ai/chat-config.ts)

| Function | Line | Description |
|----------|------|-------------|
| `getMinimalFallbackPrompt()` | 13 | Minimal fallback prompt (~30 lines) |
| `logFallbackActivation()` | 52 | Log alert to systemAlerts table |
| `getSystemPrompt()` | 85 | Async fetch with fallback + logging |
| `CHAT_CONFIG` | 105 | Model configuration constants |

### Chat API Integration (src/app/api/chat/route.ts)

```typescript
// Line 7: Import
import { getSystemPrompt } from "@/lib/ai/chat-config"

// Line 129: Fetch
const systemPrompt = await getSystemPrompt()

// Line 200: Usage in messages
const fullMessagesBase = [
    { role: "system" as const, content: systemPrompt },
    // ...
]
```

---

## Admin UI

```
src/components/admin/
├── AdminPanelContainer.tsx           # Tab container (lines 47, 56-58)
├── SystemHealthPanel.tsx             # Fallback monitoring panel (NEW, 298 lines)
├── SystemPromptsManager.tsx          # Main manager component
├── SystemPromptFormDialog.tsx        # Create/Edit dialog
└── VersionHistoryDialog.tsx          # Version history viewer
```

### Component Props

```typescript
// SystemHealthPanel (NEW)
{ userId: Id<"users"> }

// SystemPromptsManager
{ userId: Id<"users"> }

// SystemPromptFormDialog
{
    open: boolean,
    prompt: SystemPrompt | null,  // null = create, object = edit
    userId: Id<"users">,
    onClose: () => void
}

// VersionHistoryDialog
{
    prompt: SystemPrompt | null,
    userId: Id<"users">,
    onClose: () => void
}
```

### Admin Panel Integration

```tsx
// src/components/admin/AdminPanelContainer.tsx

// Line 8: Import (NEW)
import { SystemHealthPanel } from "./SystemHealthPanel"

// Line 47: Tab trigger
<TabsTrigger value="system-prompts">System Prompts</TabsTrigger>

// Lines 56-58: Tab content (UPDATED)
<TabsContent value="system-prompts" className="space-y-4">
    <SystemHealthPanel userId={userId} />      {/* NEW */}
    <SystemPromptsManager userId={userId} />
</TabsContent>
```

---

## Database Indexes

### systemPrompts

| Index | Fields | Usage |
|-------|--------|-------|
| `by_active` | `["isActive"]` | `getActiveSystemPrompt()` - fetch active |
| `by_root` | `["rootId", "version"]` | `getPromptVersionHistory()` - version chain |
| `by_createdAt` | `["createdAt"]` | `listSystemPrompts()` - chronological list |

### systemAlerts (NEW)

| Index | Fields | Usage |
|-------|--------|-------|
| `by_type` | `["alertType", "createdAt"]` | Filter alerts by type |
| `by_severity` | `["severity", "resolved", "createdAt"]` | Filter by priority |
| `by_resolved` | `["resolved", "createdAt"]` | Get unresolved for badge |

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN FLOW                                         │
│                                                                             │
│  /dashboard → AdminPanelContainer → Tab "System Prompts"                   │
│                    │                                                        │
│                    ├── SystemHealthPanel → systemAlerts queries            │
│                    └── SystemPromptsManager → systemPrompts mutations      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           CHAT FLOW (WITH MONITORING)                        │
│                                                                             │
│  /api/chat → getSystemPrompt() → fetchQuery(getActiveSystemPrompt)         │
│                    │                                                        │
│               ┌────┴────┐                                                   │
│            SUCCESS    FAIL                                                  │
│               │         │                                                   │
│               ▼         ▼                                                   │
│           Return    logFallbackActivation() → systemAlerts.createAlert     │
│           DB            │                                                   │
│           Prompt        ▼                                                   │
│                    Return getMinimalFallbackPrompt()                        │
│                         │                                                   │
│                         ▼                                                   │
│                    Admin sees 🔴 FALLBACK MODE in SystemHealthPanel        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Search Patterns

```bash
# Find all system prompt related files
grep -r "systemPrompt\|SystemPrompt" src/ convex/ --include="*.ts" --include="*.tsx"

# Find where getSystemPrompt is used
grep -r "getSystemPrompt" src/

# Find admin panel system prompt integration
grep -r "system-prompts\|SystemPromptsManager" src/components/admin/
```

---

## Quick Reference: Key Lines

### systemPrompts

| File | Line(s) | What's There |
|------|---------|--------------|
| `convex/schema.ts` | 91-105 | systemPrompts table definition |
| `convex/systemPrompts.ts` | 14-24 | `getActiveSystemPrompt` query |
| `convex/systemPrompts.ts` | 162-198 | `createSystemPrompt` mutation |
| `convex/systemPrompts.ts` | 263-297 | `activateSystemPrompt` mutation |

### systemAlerts (NEW)

| File | Line(s) | What's There |
|------|---------|--------------|
| `convex/schema.ts` | 150-167 | systemAlerts table definition |
| `convex/systemAlerts.ts` | 13 | `getUnresolvedAlerts` query |
| `convex/systemAlerts.ts` | 32 | `getUnresolvedAlertCount` query |
| `convex/systemAlerts.ts` | 97 | `isFallbackActive` query |
| `convex/systemAlerts.ts` | 128 | `createAlert` mutation |
| `convex/systemAlerts.ts` | 189 | `resolveAlert` mutation |

### API Layer

| File | Line(s) | What's There |
|------|---------|--------------|
| `src/lib/ai/chat-config.ts` | 13-46 | `getMinimalFallbackPrompt()` |
| `src/lib/ai/chat-config.ts` | 52-74 | `logFallbackActivation()` |
| `src/lib/ai/chat-config.ts` | 85-103 | `getSystemPrompt()` |
| `src/app/api/chat/route.ts` | 7 | Import statement |
| `src/app/api/chat/route.ts` | 129 | Fetch call |
| `src/app/api/chat/route.ts` | 200 | Usage in messages |

### Admin UI

| File | Line(s) | What's There |
|------|---------|--------------|
| `src/components/admin/SystemHealthPanel.tsx` | 1-298 | Full component |
| `src/components/admin/AdminPanelContainer.tsx` | 8 | Import SystemHealthPanel |
| `src/components/admin/AdminPanelContainer.tsx` | 47 | Tab trigger |
| `src/components/admin/AdminPanelContainer.tsx` | 56-58 | Tab content with SystemHealthPanel |

---

*Last updated: 2026-01-08*
