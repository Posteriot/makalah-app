# AI Telemetry & Health Dashboard — Design Document

**Tanggal:** 2026-02-23
**Status:** Approved
**Approach:** A — `aiTelemetry` table + aggregation queries

## Latar Belakang

Monitoring AI performance di Makalah App saat ini berat ke paper workflow (`/ai-ops`), sementara chat model performance — khususnya tool reliability (web search, dll) dan provider failover — hampir nggak termonitor. Ketika terjadi kegagalan transient (contoh: google_search crash), admin nggak punya visibility kenapa.

## Tujuan

1. Monitoring real-time kesehatan semua AI tool dan provider
2. Tracking success/failure rate, latency, dan failover events
3. Report visual berbahasa Indonesia yang mudah dipahami di admin dashboard
4. Auto-alerting ketika health menurun di bawah threshold

## Arsitektur

Approach A: Setiap AI call (streamText) di `route.ts` log satu record ke tabel `aiTelemetry` di Convex. Dashboard baca dari raw data via aggregation queries. Cleanup cron hapus data > 30 hari.

```
POST /api/chat
  │
  ├─ streamText (primary) ─── success ──┐
  │   └─ fail ─── streamText (fallback) ┤
  │                 ├─ success ──────────┤
  │                 └─ fail ─────────────┤
  │                                      ▼
  │                            logAiTelemetry()
  │                            (fire-and-forget)
  │                                      │
  │                                      ▼
  │                            convex/aiTelemetry.log()
  │                                      │
  │                         ┌────────────┼────────────┐
  │                         ▼            ▼            ▼
  │                    /dashboard    /ai-ops     systemAlerts
  │                    (report)     (detail)    (auto-alert)
```

---

## Section 1: Data Schema — `aiTelemetry` Table

```typescript
// convex/schema.ts
aiTelemetry: defineTable({
  // Request identity
  userId: v.id("users"),
  conversationId: v.optional(v.id("conversations")),

  // Provider info
  provider: v.union(v.literal("vercel-gateway"), v.literal("openrouter")),
  model: v.string(),
  isPrimaryProvider: v.boolean(),
  failoverUsed: v.boolean(),

  // Tool info
  toolUsed: v.optional(v.string()),
  mode: v.union(v.literal("normal"), v.literal("websearch"), v.literal("paper")),

  // Result
  success: v.boolean(),
  errorType: v.optional(v.string()),
  errorMessage: v.optional(v.string()),

  // Performance
  latencyMs: v.number(),
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
})
  .index("by_created", ["createdAt"])
  .index("by_provider", ["provider", "createdAt"])
  .index("by_tool", ["toolUsed", "createdAt"])
  .index("by_success", ["success", "createdAt"])
```

---

## Section 2: Instrumentation — Chat API Route

### Prinsip
- **Non-blocking** — telemetry mutation dipanggil TANPA `await` (fire-and-forget)
- **Fail-safe** — telemetry error di-catch dan di-log ke console, NGGAK boleh crash chat request
- **Minimal overhead** — satu mutation call per AI request

### Helper: `src/lib/ai/telemetry.ts`

```typescript
export function logAiTelemetry(params: {
  token: string
  provider: string
  model: string
  isPrimary: boolean
  failoverUsed: boolean
  toolUsed?: string
  mode: "normal" | "websearch" | "paper"
  success: boolean
  errorType?: string
  errorMessage?: string
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
  conversationId?: string
}) {
  fetchMutation(api.aiTelemetry.log, { ... }, { token })
    .catch(err => console.error("[Telemetry] Failed to log:", err))
}
```

### Instrumentation Points di `route.ts`

```
1. TELEMETRY START — const startTime = Date.now()
2. PRIMARY SUCCESS — log via onFinish callback (includes token counts)
3. PRIMARY FAIL + FALLBACK SUCCESS — log with failoverUsed=true via onFinish
4. BOTH FAIL — log failure before throwing error
```

Error type classification:
- `timeout` — request exceeded time limit
- `api_error` — provider returned error response
- `rate_limit` — 429 status
- `auth` — API key invalid/expired
- `network` — connection failure
- `unknown` — unclassified error

---

## Section 3: Aggregation Queries — `convex/aiTelemetry.ts`

Semua queries require admin/superadmin.

### Mutations

| Function | Deskripsi |
|----------|-----------|
| `log()` | Insert telemetry record (public, untuk server) |

### Queries

| Function | Return | Deskripsi |
|----------|--------|-----------|
| `getOverviewStats(period)` | `{ totalRequests, successRate, avgLatencyMs, failoverCount, failoverRate, totalInputTokens, totalOutputTokens }` | Headline metrics |
| `getProviderHealth(period)` | `[{ provider, totalRequests, successCount, failureCount, successRate, avgLatencyMs }]` | Per-provider breakdown |
| `getToolHealth(period)` | `[{ tool, totalCalls, successCount, failureCount, successRate, avgLatencyMs, lastFailure? }]` | Per-tool breakdown |
| `getLatencyDistribution(period)` | `{ p50, p75, p95, p99, max, buckets[] }` | Percentile + histogram |
| `getRecentFailures(limit)` | `[{ provider, model, toolUsed, mode, errorType, errorMessage, failoverUsed, latencyMs, createdAt }]` | Last N failures |
| `getFailoverTimeline(period)` | `[{ createdAt, provider, model, errorType, latencyMs }]` | Failover events timeline |
| `getDashboardReport()` | Combined data for admin dashboard report (Section 4B) | Single query for 4 panels + summary |

Period options: `"1h" | "24h" | "7d"`

### Scheduled

| Function | Schedule | Deskripsi |
|----------|----------|-----------|
| `cleanupOldTelemetry()` | Daily 03:00 WIB | Hapus records > 30 hari, batch 200 |

---

## Section 4: AI Ops Dashboard — Panels di `/ai-ops`

Extend halaman existing dengan section baru **"MODEL & TOOL HEALTH"** di bawah paper workflow panels, dipisahkan oleh `border-hairline`.

### Panel Baru

| Component | File | Deskripsi |
|-----------|------|-----------|
| `ModelHealthSection` | `src/components/ai-ops/ModelHealthSection.tsx` | Container, period selector, fetch queries |
| `OverviewStatsPanel` | `src/components/ai-ops/panels/OverviewStatsPanel.tsx` | 4 headline cards |
| `ProviderHealthPanel` | `src/components/ai-ops/panels/ProviderHealthPanel.tsx` | Per-provider row |
| `ToolHealthPanel` | `src/components/ai-ops/panels/ToolHealthPanel.tsx` | Table per-tool + last failure |
| `LatencyDistributionPanel` | `src/components/ai-ops/panels/LatencyDistributionPanel.tsx` | Percentiles + bar histogram |
| `RecentFailuresPanel` | `src/components/ai-ops/panels/RecentFailuresPanel.tsx` | Last 20 failures expandable |
| `FailoverTimelinePanel` | `src/components/ai-ops/panels/FailoverTimelinePanel.tsx` | Dot timeline + cluster detection |

### Period Selector
Toggle `[1h] [24h] [7d]` di header. Default: `24h`. State di `ModelHealthSection`, propagate sebagai prop.

### Design System
- Cards: `rounded-shell`, `border-main`
- Angka: `font-mono`, labels: `text-signal`
- Success ≥95%: `--ds-state-success-fg`, <95%: `--ds-state-warning-fg`, <80%: `--ds-state-danger-fg`
- Period selector: `rounded-action`, active = `bg-primary text-primary-foreground`
- Icons: Iconoir (`Activity`, `Globe`, `Timer`, `WarningTriangle`, `Server`)

---

## Section 4B: Report Overview di Admin Dashboard

Visual report dengan chart di `AdminOverviewContent.tsx` — di bawah stats pengguna, di atas shortcut card AI OPS.

### 4 Panel Visual (Bahasa Indonesia Awam)

| Panel | Chart | Label Awam |
|-------|-------|------------|
| **Tingkat Keberhasilan** | Sparkline SVG 7 hari + angka besar | "342 permintaan, 5 gagal" |
| **Kecepatan Respons** | Horizontal bar 3 tier | "rata-rata 1.2 detik" (cepat/sedang/lambat) |
| **Kesehatan Alat** | Progress bar per tool group | "Pencarian Web: 3 dari 45 gagal" |
| **Perpindahan Server** | Dot timeline + rangkuman | "5 kali dalam 7 hari, penyebab utama: timeout" |

### Ringkasan Auto-Generated

Kalimat bahasa Indonesia yang di-generate dari data:
- successRate ≥99%: "Sistem AI berjalan sangat baik..."
- successRate ≥95%: "Sistem AI berjalan baik secara keseluruhan..."
- successRate ≥80%: "Sistem AI mengalami beberapa gangguan..."
- successRate <80%: "⚠️ Sistem AI mengalami gangguan serius..."

Ditambah konteks per-tool, failover, dan latency assessment.

### Komponen Baru

| Component | File |
|-----------|------|
| `AiPerformanceReport` | `src/components/admin/AiPerformanceReport.tsx` |
| `SuccessRateChart` | `src/components/admin/charts/SuccessRateChart.tsx` |
| `LatencyOverviewChart` | `src/components/admin/charts/LatencyOverviewChart.tsx` |
| `ToolHealthBars` | `src/components/admin/charts/ToolHealthBars.tsx` |
| `FailoverTimeline` | `src/components/admin/charts/FailoverTimeline.tsx` |
| `AiSummaryNarrative` | `src/components/admin/charts/AiSummaryNarrative.tsx` |

### Chart Implementation
Pure CSS/SVG — tanpa chart library external:
- Sparkline: SVG `<polyline>` (7 data points)
- Progress bars: Tailwind `w-[%]` + transition
- Timeline dots: flex layout + pseudo-elements

---

## Section 5: Cleanup & Maintenance

### Retention Policy

| Data | Retensi | Alasan |
|------|---------|--------|
| `aiTelemetry` | 30 hari | Pattern detection + diagnosa |
| `systemAlerts` | 90 hari | Existing, nggak diubah |
| `usageEvents` | Permanent | Billing audit trail |

### Error Budget Alert

Inline check di `logAiTelemetry` — setiap N-th write (50 records), hitung failure rate 1 jam terakhir:

| Threshold | Alert Type | Severity |
|-----------|-----------|----------|
| successRate < 90% | `ai_health_degraded` | warning |
| successRate < 70% | `ai_health_critical` | critical |

Alert muncul di `SystemHealthPanel` yang sudah ada di admin dashboard.

---

## File Inventory

### Baru

| File | Tipe |
|------|------|
| `convex/aiTelemetry.ts` | Backend: mutations + queries + scheduled cleanup |
| `src/lib/ai/telemetry.ts` | Helper: fire-and-forget logger |
| `src/components/ai-ops/ModelHealthSection.tsx` | UI: container + period selector |
| `src/components/ai-ops/panels/OverviewStatsPanel.tsx` | UI: headline cards |
| `src/components/ai-ops/panels/ProviderHealthPanel.tsx` | UI: per-provider breakdown |
| `src/components/ai-ops/panels/ToolHealthPanel.tsx` | UI: per-tool table |
| `src/components/ai-ops/panels/LatencyDistributionPanel.tsx` | UI: percentiles + histogram |
| `src/components/ai-ops/panels/RecentFailuresPanel.tsx` | UI: failure list |
| `src/components/ai-ops/panels/FailoverTimelinePanel.tsx` | UI: timeline |
| `src/components/admin/AiPerformanceReport.tsx` | UI: dashboard report container |
| `src/components/admin/charts/SuccessRateChart.tsx` | UI: sparkline chart |
| `src/components/admin/charts/LatencyOverviewChart.tsx` | UI: latency bars |
| `src/components/admin/charts/ToolHealthBars.tsx` | UI: tool progress bars |
| `src/components/admin/charts/FailoverTimeline.tsx` | UI: dot timeline |
| `src/components/admin/charts/AiSummaryNarrative.tsx` | UI: auto-generated text |

### Modified

| File | Perubahan |
|------|-----------|
| `convex/schema.ts` | Tambah `aiTelemetry` table definition |
| `convex/crons.ts` | Tambah `cleanupOldTelemetry` schedule |
| `src/app/api/chat/route.ts` | Instrument telemetry logging di 4 titik |
| `src/components/ai-ops/AiOpsContainer.tsx` | Tambah `ModelHealthSection` di bawah existing panels |
| `src/components/admin/AdminOverviewContent.tsx` | Tambah `AiPerformanceReport` di overview |
