# AI Ops Dashboard Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tambah pagination dan insight/suggestion banner ke AI Ops Dashboard.

**Architecture:** 2 task independen. Pagination pakai client-side (data sudah di-fetch). Suggestion banner analisis data dari 3 panel overview dan tampilkan actionable insights.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Convex, Iconoir

**Worktree:** `.worktrees/paper-workflow-resilience/`

---

## Task 1: Pagination Session List (per 10)

**Files:**
- Modify: `src/components/ai-ops/panels/SessionListPanel.tsx`

**Step 1: Read current SessionListPanel**
Read file, pahami struktur data dan rendering.

**Step 2: Add pagination state dan logic**
- `const [page, setPage] = useState(0)`
- `const PAGE_SIZE = 10`
- `const totalPages = Math.ceil(sessions.length / PAGE_SIZE)`
- `const paginatedSessions = sessions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)`

**Step 3: Render paginated data**
- Ganti `sessions.map(...)` dengan `paginatedSessions.map(...)`
- Tambah pagination controls di bawah list:
  - "← Prev" button (disabled kalau page 0)
  - "Page X of Y" text (font-mono)
  - "Next →" button (disabled kalau last page)
- Styling: flex justify-between, text-xs, buttons pakai rounded-action

**Step 4: Update header count**
- Ubah "20 SESSIONS" jadi `{sessions.length} SESSIONS` (dynamic)

**Step 5: Run tests**
```bash
cd .worktrees/paper-workflow-resilience && npx vitest run
```

**Step 6: Commit**
```bash
git add src/components/ai-ops/panels/SessionListPanel.tsx
git commit -m "feat(ai-ops): add pagination to session list (10 per page)"
```

---

## Task 2: Insight/Suggestion Banner

**Files:**
- Create: `src/components/ai-ops/panels/InsightBanner.tsx`
- Modify: `src/components/ai-ops/AiOpsContainer.tsx`

**Step 1: Design insight rules**

Analisis data dari 3 panel dan generate suggestions:

| Kondisi | Severity | Pesan |
|---------|----------|-------|
| dirty > 0 | warning | "X sesi memiliki data yang tidak sinkron (dirty). User sebaiknya minta AI menyimpan ulang data sebelum approve." |
| sessionsWithSuperseded > 0 | info | "X sesi memiliki digest entries yang sudah di-supersede oleh rewind. Entries ini sudah difilter dari prompt AI." |
| completionRate < 10 && totalSessions > 5 | warning | "Completion rate rendah (X%). Banyak sesi yang tidak dilanjutkan user." |
| invalidatedPending > 0 | info | "X artifact menunggu update setelah rewind. Artifact lama masih tersimpan tapi ditandai invalidated." |
| inRevision > 3 | warning | "X sesi dalam status revision. Kemungkinan user kesulitan di tahap tertentu." |

**Step 2: Create InsightBanner component**

```typescript
// src/components/ai-ops/panels/InsightBanner.tsx
"use client";

interface Insight {
  severity: "warning" | "info";
  message: string;
}

interface InsightBannerProps {
  memoryHealth: { ... } | undefined;
  workflowProgress: { ... } | undefined;
  artifactSync: { ... } | undefined;
}

export function InsightBanner({ memoryHealth, workflowProgress, artifactSync }: InsightBannerProps) {
  // Generate insights from data
  // Return null if no insights
  // Render list of insight items with severity-based styling
}
```

Styling:
- Container: `rounded-shell border border-border p-4`
- Header: "INSIGHTS" label (signal style)
- Warning items: amber-500 left border
- Info items: sky-500 left border
- Icon: WarningTriangle (warning), InfoCircle (info) dari iconoir-react

**Step 3: Integrate into AiOpsContainer**
- Import InsightBanner
- Render ANTARA overview panels dan session list
- Pass ketiga data props

**Step 4: Run tests**
```bash
cd .worktrees/paper-workflow-resilience && npx vitest run
```

**Step 5: Commit**
```bash
git add src/components/ai-ops/panels/InsightBanner.tsx src/components/ai-ops/AiOpsContainer.tsx
git commit -m "feat(ai-ops): add insight/suggestion banner with actionable recommendations"
```

---

## Post-Implementation
- Verify di browser: `localhost:3000/ai-ops`
- Pagination: session list per 10, prev/next berfungsi
- Insight banner: muncul kalau ada dirty/superseded/low completion/etc
