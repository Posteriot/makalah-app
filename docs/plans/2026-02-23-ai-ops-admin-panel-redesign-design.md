# AI Ops Admin Panel Redesign — Design Document

**Tanggal:** 2026-02-23
**Status:** Approved

## Latar Belakang

AI Ops dashboard (`/ai-ops`) sekarang terlalu panjang — 15+ panel dalam single scroll setelah penambahan Model & Tool Health. Dua domain berbeda (Paper Workflow + Model Health) digabung flat tanpa navigasi internal, bikin cognitive load tinggi.

## Tujuan

Restructure AI Ops ke layout admin panel style (sidebar + tabbed content) agar:
1. Navigasi langsung ke section yang relevan tanpa scroll
2. Visual konsisten dengan admin panel `/dashboard`
3. Existing panel components di-reuse tanpa rewrite

## Constraint

- **Route tetap `/ai-ops`** — bukan dipindah ke `/dashboard`
- **Styling tokens hardcoded** dari admin panel components, BUKAN dari `globals.css`
- **13 panel files di `panels/` tidak diubah** — reuse as-is

---

## Section 1: Layout & Navigation Structure

**Shell:** 16-col grid, sidebar col-span-4, content col-span-12. DottedPattern background. Mobile Sheet sidebar.

### Sidebar Tabs

```
AI OPS
├── Overview          → Quick summary: 3 stats cards + health indicator + mini insights
├── Paper Workflow    (parent, default → paper.sessions)
│   ├── Sesi          → Session list table + detail dialog
│   ├── Memory        → Memory health + dropped keys
│   └── Artefak       → Artifact sync panel
└── Model Health      (parent, default → model.overview)
    ├── Ringkasan     → Overview stats + provider health + period selector
    ├── Tool & Latensi → Tool health table + latency distribution
    └── Kegagalan     → Recent failures + failover timeline
```

### Styling Tokens (hardcoded dari admin panel)

| Element | Classes |
|---------|---------|
| Sidebar container | `rounded-shell border-hairline bg-card/90 p-comfort backdrop-blur-[1px] dark:bg-slate-900` |
| Content container | `rounded-shell border-hairline bg-card/90 px-5 py-6 backdrop-blur-[1px] dark:bg-slate-900` |
| Active tab | `bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100` |
| Inactive tab | `text-muted-foreground hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-500 dark:hover:text-slate-50` |
| Content header | `text-narrative text-2xl font-medium tracking-tight` |
| Background | `DottedPattern spacing={24} withRadialMask={false}` |
| Child items (active) | `text-foreground font-medium` |
| Child items (inactive) | `text-muted-foreground hover:text-foreground` |

---

## Section 2: Tab Content Mapping

| Tab ID | Content | Reused Components |
|--------|---------|-------------------|
| `overview` | 3-col stats + InsightBanner | `MemoryHealthPanel`, `WorkflowProgressPanel`, `ArtifactSyncPanel`, `InsightBanner` |
| `paper.sessions` | Session list + detail dialog | `SessionListPanel` |
| `paper.memory` | Memory health detail + dropped keys | `MemoryHealthPanel`, `DroppedKeysPanel` |
| `paper.artifacts` | Artifact sync detail | `ArtifactSyncPanel` |
| `model.overview` | Period selector + overview stats + provider health | `OverviewStatsPanel`, `ProviderHealthPanel` |
| `model.tools` | Tool health table + latency distribution | `ToolHealthPanel`, `LatencyDistributionPanel` |
| `model.failures` | Recent failures + failover timeline | `RecentFailuresPanel`, `FailoverTimelinePanel` |

### Period State

Period state (`"1h" | "24h" | "7d"`) di-manage di `AiOpsContainer` level. Period selector muncul di header area tab `model.*`. Di-pass sebagai prop ke content.

### Query Strategy

- Queries hanya dipanggil saat tab aktif (Convex `"skip"` pattern)
- `overview`: `getMemoryHealthStats`, `getWorkflowProgressStats`, `getArtifactSyncStats`
- `paper.*`: fetch sesuai kebutuhan per sub-tab
- `model.*`: fetch 6 telemetry queries dengan `requestorUserId`

---

## Section 3: File Structure

### File Baru

| File | Deskripsi |
|------|-----------|
| `src/components/ai-ops/aiOpsConfig.ts` | Tab config (mirror `adminPanelConfig.ts`) |
| `src/components/ai-ops/AiOpsSidebar.tsx` | Sidebar + mobile Sheet (mirror `AdminSidebar.tsx`) |
| `src/components/ai-ops/AiOpsContentSection.tsx` | Content router + header (mirror `AdminContentSection.tsx`) |

### File Dimodifikasi

| File | Perubahan |
|------|-----------|
| `src/components/ai-ops/AiOpsContainer.tsx` | Rewrite — dari single scroll jadi shell grid (sidebar + content). Period state, DottedPattern, mobile toggle. |

### File Dihapus

| File | Alasan |
|------|--------|
| `src/components/ai-ops/ModelHealthSection.tsx` | Fungsinya dipecah ke tab `model.*`. Period selector + query fetching pindah ke `AiOpsContentSection`. |

### File Tidak Diubah (reuse as-is)

Semua 13 panel files di `src/components/ai-ops/panels/` tetap utuh.

### Config Structure

```typescript
export type AiOpsTabId =
  | "overview"
  | "paper.sessions"
  | "paper.memory"
  | "paper.artifacts"
  | "model.overview"
  | "model.tools"
  | "model.failures"

export const AI_OPS_SIDEBAR_ITEMS = [
  { id: "overview", label: "Overview", icon: Dashboard },
  { id: "paper", label: "Paper Workflow", icon: Page,
    defaultChildId: "paper.sessions",
    children: [
      { id: "paper.sessions", label: "Sesi", icon: List },
      { id: "paper.memory", label: "Memory", icon: Brain },
      { id: "paper.artifacts", label: "Artefak", icon: Code },
    ]
  },
  { id: "model", label: "Model Health", icon: Activity,
    defaultChildId: "model.overview",
    children: [
      { id: "model.overview", label: "Ringkasan", icon: StatsReport },
      { id: "model.tools", label: "Tool & Latensi", icon: Timer },
      { id: "model.failures", label: "Kegagalan", icon: WarningTriangle },
    ]
  },
]
```

---

## Section 4: URL State & Navigation

- Tab state sync ke URL via `?tab=` param. Default: `overview`.
- `/ai-ops` → overview
- `/ai-ops?tab=paper.sessions` → session list
- `/ai-ops?tab=model.tools` → tool health + latency
- Back link `← Admin Panel` menuju `/dashboard` tetap.
- Link dari `AdminOverviewContent.tsx` ke `/ai-ops` tetap jalan tanpa perubahan.
- Mobile: Sheet sidebar via hamburger button (mirror `AdminMobileSidebar`).
