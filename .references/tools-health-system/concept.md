# Tools Health Monitoring System - Concept

> **Status:** Concept Draft
> **Created:** 2026-01-14

## 1. Overview

Sistem monitoring untuk memantau kesehatan AI Function Tools yang digunakan dalam chat. Tujuannya adalah memberikan visibility ke admin tentang status tools, mendeteksi masalah lebih awal, dan memastikan semua tools berada di state yang benar.

## 2. Scope

### Tools yang Di-monitor

| # | Tool | Type | Dependencies |
|---|------|------|--------------|
| 1 | `startPaperSession` | Paper Tool | `paperSessions.create` |
| 2 | `getCurrentPaperState` | Paper Tool | `paperSessions.getByConversation` |
| 3 | `updateStageData` | Paper Tool | `paperSessions.getByConversation`, `paperSessions.updateStageData` |
| 4 | `submitStageForValidation` | Paper Tool | `paperSessions.getByConversation`, `paperSessions.submitForValidation` |
| 5 | `createArtifact` | Artifact Tool | `artifacts.create` |
| 6 | `updateArtifact` | Artifact Tool | `artifacts.update` |
| 7 | `renameConversationTitle` | Chat Tool | `conversations.getConversation`, `conversations.updateConversationTitleFromAI` |
| 8 | `google_search` | Provider Tool | Google AI API, API Key |
| 9 | `:online` (OpenRouter) | Provider Tool | OpenRouter API, `fallbackWebSearchEnabled` config |

### Health Dimensions

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOOL HEALTH DIMENSIONS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. DEPENDENCY AVAILABLE                                        │
│     └─ Apakah Convex functions yang di-depend responsive?       │
│     └─ Apakah external APIs (Google) reachable?                 │
│                                                                 │
│  2. LAST CALL SUCCESS                                           │
│     └─ Kapan terakhir tool dipanggil?                          │
│     └─ Apa hasilnya? (success/error)                           │
│     └─ Berapa lama execution time?                             │
│                                                                 │
│  3. ERROR RATE                                                  │
│     └─ Berapa % error dalam 1 jam terakhir?                    │
│     └─ Berapa % error dalam 24 jam terakhir?                   │
│     └─ Trend naik atau turun?                                  │
│                                                                 │
│  4. CONFIG VALID                                                │
│     └─ Apakah required API keys ter-set?                       │
│     └─ Apakah database configs valid?                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Health Dimensions: `:online` (OpenRouter Web Search)

```
┌─────────────────────────────────────────────────────────────────┐
│           :ONLINE SPECIFIC HEALTH DIMENSIONS                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. DEPENDENCY AVAILABLE                                        │
│     └─ OpenRouter API reachable?                                │
│     └─ Model supports :online suffix?                           │
│                                                                 │
│  2. LAST CALL SUCCESS                                           │
│     └─ Kapan terakhir :online dipanggil?                       │
│     └─ Apa hasilnya? (success/error/fallback-to-non-search)    │
│     └─ Berapa annotations/citations yang returned?              │
│                                                                 │
│  3. ERROR RATE                                                  │
│     └─ :online specific failures (bukan OpenRouter general)    │
│     └─ Graceful degradation count (retry tanpa :online)        │
│     └─ Citation extraction failures                             │
│                                                                 │
│  4. CONFIG VALID                                                │
│     └─ `fallbackWebSearchEnabled` is set in aiProviderConfigs? │
│     └─ `fallbackWebSearchEngine` valid value?                   │
│     └─ `fallbackWebSearchMaxResults` dalam range 1-10?          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Architecture

### High-Level Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           DATA COLLECTION                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐         ┌─────────────────┐                        │
│  │  PASSIVE LOG    │         │  ACTIVE PROBE   │                        │
│  │                 │         │                 │                        │
│  │  Every tool     │         │  Periodic       │                        │
│  │  execution      │         │  synthetic      │                        │
│  │  gets logged    │         │  health check   │                        │
│  │                 │         │  (configurable) │                        │
│  └────────┬────────┘         └────────┬────────┘                        │
│           │                           │                                  │
│           └───────────┬───────────────┘                                  │
│                       ▼                                                  │
│           ┌─────────────────────┐                                       │
│           │   toolHealthLogs    │  ◄── New Convex Table                 │
│           │   (Convex DB)       │                                       │
│           └──────────┬──────────┘                                       │
│                      │                                                   │
└──────────────────────┼───────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           AGGREGATION                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Convex Query: aggregateToolHealth                              │    │
│  │                                                                 │    │
│  │  - Group by toolName                                            │    │
│  │  - Calculate error rate (1h, 24h)                               │    │
│  │  - Get last execution status                                    │    │
│  │  - Check config validity                                        │    │
│  │  - Determine overall health status                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Admin Panel: ToolsHealthDashboard                              │    │
│  │                                                                 │    │
│  │  - Real-time status per tool                                    │    │
│  │  - Visual indicators (green/yellow/red)                         │    │
│  │  - Drill-down untuk detail logs                                 │    │
│  │  - Alert integration dengan systemAlerts                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## 4. Data Model

### New Table: `toolHealthLogs`

```typescript
// convex/schema.ts (addition)

toolHealthLogs: defineTable({
  // Identity
  toolName: v.string(),           // "startPaperSession", "createArtifact", etc.
  toolType: v.string(),           // "paper", "artifact", "chat", "provider"

  // Execution Context
  executionId: v.string(),        // Unique ID per execution
  conversationId: v.optional(v.id("conversations")),
  userId: v.optional(v.id("users")),

  // Result
  status: v.string(),             // "success" | "error" | "timeout"
  errorMessage: v.optional(v.string()),
  errorCode: v.optional(v.string()),

  // Timing
  startedAt: v.number(),
  completedAt: v.number(),
  durationMs: v.number(),

  // Source
  source: v.string(),             // "passive" | "probe"

  // Metadata
  metadata: v.optional(v.object({
    inputSize: v.optional(v.number()),
    outputSize: v.optional(v.number()),
    retryCount: v.optional(v.number()),
  })),
})
.index("by_tool", ["toolName", "startedAt"])
.index("by_status", ["status", "startedAt"])
.index("by_conversation", ["conversationId", "startedAt"])
```

### Aggregated Health Status (Query Result)

```typescript
interface ToolHealthStatus {
  toolName: string
  toolType: "paper" | "artifact" | "chat" | "provider"

  // Overall Status
  status: "healthy" | "degraded" | "unhealthy" | "unknown"

  // Dependency Check
  dependencyStatus: {
    available: boolean
    lastCheckedAt: number
    dependencies: Array<{
      name: string
      available: boolean
    }>
  }

  // Last Execution
  lastExecution: {
    status: "success" | "error" | "timeout"
    timestamp: number
    durationMs: number
    errorMessage?: string
  } | null

  // Error Rates
  errorRates: {
    last1h: { total: number; errors: number; rate: number }
    last24h: { total: number; errors: number; rate: number }
    trend: "improving" | "stable" | "degrading"
  }

  // Config
  configStatus: {
    valid: boolean
    missingConfigs: string[]
  }
}
```

## 5. Health Status Logic

### Status Determination

```
┌─────────────────────────────────────────────────────────────────┐
│                    STATUS DETERMINATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HEALTHY (Green)                                                │
│  ├─ Dependency available: YES                                   │
│  ├─ Last execution: SUCCESS (within 24h)                        │
│  ├─ Error rate 1h: < 5%                                         │
│  └─ Config: VALID                                               │
│                                                                 │
│  DEGRADED (Yellow)                                              │
│  ├─ Dependency available: YES                                   │
│  ├─ Last execution: SUCCESS or ERROR                            │
│  ├─ Error rate 1h: 5% - 20%                                     │
│  └─ Config: VALID                                               │
│                                                                 │
│  UNHEALTHY (Red)                                                │
│  ├─ Dependency available: NO                                    │
│  │  OR                                                          │
│  ├─ Last execution: ERROR (3+ consecutive)                      │
│  │  OR                                                          │
│  ├─ Error rate 1h: > 20%                                        │
│  │  OR                                                          │
│  └─ Config: INVALID (missing required)                          │
│                                                                 │
│  UNKNOWN (Gray)                                                 │
│  └─ No executions recorded yet                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Thresholds (Configurable)

| Metric | Healthy | Degraded | Unhealthy |
|--------|---------|----------|-----------|
| Error Rate 1h | < 5% | 5-20% | > 20% |
| Error Rate 24h | < 10% | 10-30% | > 30% |
| Consecutive Errors | 0-1 | 2 | 3+ |
| Response Time | < 2s | 2-5s | > 5s |

## 6. Data Collection

### Passive Logging

Setiap tool execution di `src/app/api/chat/route.ts` di-wrap dengan logging:

```typescript
// Pseudocode - wrapper untuk tool execution

async function executeToolWithLogging<T>(
  toolName: string,
  toolType: string,
  context: { conversationId?, userId? },
  executor: () => Promise<T>
): Promise<T> {
  const executionId = generateId()
  const startedAt = Date.now()

  try {
    const result = await executor()

    // Log success
    await logToolExecution({
      toolName,
      toolType,
      executionId,
      ...context,
      status: "success",
      startedAt,
      completedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      source: "passive",
    })

    return result
  } catch (error) {
    // Log error
    await logToolExecution({
      toolName,
      toolType,
      executionId,
      ...context,
      status: "error",
      errorMessage: error.message,
      startedAt,
      completedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      source: "passive",
    })

    throw error
  }
}
```

### Active Probing

Periodic health check yang jalan di background (bisa via Convex scheduled function atau external cron):

```typescript
// Pseudocode - synthetic probe

async function probeToolHealth(toolName: string): Promise<ProbeResult> {
  switch (toolName) {
    case "startPaperSession":
      // Check: Can we call paperSessions.create with test data?
      // Note: Use dry-run mode atau dedicated test user
      break

    case "google_search":
      // Check: Is Google API key valid? Can we make minimal request?
      break

    case "createArtifact":
      // Check: Can we call artifacts.create?
      break
  }
}
```

**Probe Frequency Options:**
- Every 5 minutes (aggressive)
- Every 15 minutes (balanced)
- Every 1 hour (conservative)
- On-demand only

## 7. UI Concept

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TOOLS HEALTH DASHBOARD                                    [Refresh 🔄] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Overall Status: ● 7/8 Healthy   ● 1 Degraded   ○ 0 Unhealthy          │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  PAPER TOOLS                                                     │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  ● startPaperSession      Healthy    Last: 2m ago    Err: 0%    │   │
│  │  ● getCurrentPaperState   Healthy    Last: 5m ago    Err: 0%    │   │
│  │  ● updateStageData        Healthy    Last: 1m ago    Err: 2%    │   │
│  │  ● submitStageForValidation Healthy  Last: 10m ago   Err: 0%    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ARTIFACT TOOLS                                                  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  ● createArtifact         Healthy    Last: 3m ago    Err: 1%    │   │
│  │  ● updateArtifact         Healthy    Last: 15m ago   Err: 0%    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  CHAT TOOLS                                                      │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  ● renameConversationTitle Degraded  Last: 1h ago    Err: 8%    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  PROVIDER TOOLS                                                  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  ● google_search          Healthy    Last: 30s ago   Err: 3%    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Drill-down View (Click on Tool)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back    updateStageData                              Status: Healthy │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  HEALTH SUMMARY                                                         │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐             │
│  │ Dependency  │ Last Call   │ Error Rate  │ Config      │             │
│  │ ● Available │ ● Success   │ 2% (1h)     │ ● Valid     │             │
│  └─────────────┴─────────────┴─────────────┴─────────────┘             │
│                                                                         │
│  DEPENDENCIES                                                           │
│  ├─ paperSessions.getByConversation  ● Available                       │
│  └─ paperSessions.updateStageData    ● Available                       │
│                                                                         │
│  ERROR RATE TREND (24h)                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  5% │                                                            │   │
│  │     │    ╭─╮                                                     │   │
│  │  2% │ ───╯  ╰────────────────────────────────────────────────   │   │
│  │  0% │                                                            │   │
│  │     └────────────────────────────────────────────────────────   │   │
│  │       00:00    06:00    12:00    18:00    Now                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  RECENT EXECUTIONS                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Time       │ Status  │ Duration │ User              │ Conv      │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │ 1m ago     │ ✓       │ 245ms    │ user_123...       │ conv_abc  │  │
│  │ 3m ago     │ ✓       │ 189ms    │ user_456...       │ conv_def  │  │
│  │ 5m ago     │ ✗       │ 1200ms   │ user_789...       │ conv_ghi  │  │
│  │ 8m ago     │ ✓       │ 201ms    │ user_123...       │ conv_jkl  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 8. Alert Integration

Integrate dengan existing `systemAlerts` table:

```typescript
// Alert types untuk tools health
type ToolHealthAlertType =
  | "tool_unhealthy"           // Tool status jadi unhealthy
  | "tool_degraded"            // Tool status jadi degraded
  | "tool_recovered"           // Tool kembali healthy
  | "tool_high_error_rate"     // Error rate exceed threshold
  | "tool_dependency_down"     // Dependency tidak available
  | "tool_config_invalid"      // Missing required config
```

**Alert Flow:**
1. Health aggregation query detect status change
2. Create alert di `systemAlerts` table
3. Alert muncul di existing SystemHealthPanel
4. Admin resolve alert setelah fix

## 9. Implementation Phases

### Phase 1: Foundation
- [ ] Add `toolHealthLogs` table ke schema
- [ ] Create logging wrapper function
- [ ] Integrate wrapper ke existing tools di route.ts

### Phase 2: Aggregation
- [ ] Create `getToolHealthStatus` query
- [ ] Implement status determination logic
- [ ] Create `getToolHealthHistory` query

### Phase 3: UI
- [ ] Create `ToolsHealthDashboard` component
- [ ] Create `ToolHealthCard` component
- [ ] Create `ToolHealthDetail` component (drill-down)
- [ ] Add tab ke admin panel

### Phase 4: Alerts
- [ ] Define tool health alert types
- [ ] Create alert trigger logic
- [ ] Integrate dengan SystemHealthPanel

### Phase 5: Active Probing (Optional)
- [ ] Create probe functions per tool type
- [ ] Setup scheduled function atau cron
- [ ] Add probe frequency configuration

## 10. Considerations

### Performance
- Log retention: Berapa lama simpan logs? (suggest: 7 days, then aggregate)
- Query optimization: Index yang tepat untuk aggregation queries
- Real-time vs polling: WebSocket untuk real-time atau polling interval?

### Privacy
- Jangan log sensitive data (user input, API keys)
- Sanitize error messages sebelum store

### Resource Usage
- Active probing consume API quota (especially google_search)
- Consider rate limiting untuk probe frequency

### Extensibility
- Design untuk mudah add tool baru
- Configuration-driven thresholds

---

## Next Steps

Setelah concept ini di-review dan approved:

1. **Spec Detail** - Tulis technical spec dengan exact implementation details
2. **Schema Migration** - Add new table ke Convex schema
3. **Implementation** - Follow phases di atas
4. **Testing** - Unit tests untuk health logic, integration tests untuk UI

---

*Concept created: 2026-01-14*
