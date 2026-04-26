# Spec Implementasi — Anomaly A1

**Branch:** `durable-agent-harness`
**Tanggal:** 2026-04-26
**Status:** Spec — belum dieksekusi
**Predecessor:** `01-stage-gagasan-audit.md`
**Ruang lingkup:** Anomaly A1 saja (3 tool plan absen) + integrasi json-renderer untuk plan UI
**Diluar ruang lingkup:** A2, A4, A8, A10, A11, A12, A13, A14, A15 — dispec terpisah

---

## Bagian 0 — Tujuan dan Ruang Lingkup

**Tujuan:** Membuat tiga fungsi (tool) yang saat ini disebut di instruksi AI namun tidak ada di kode, sehingga ketika AI mengikuti instruksi, panggilannya berhasil bukan menghasilkan error. Sekaligus memindahkan tampilan rencana dari komponen standalone ke kerangka json-renderer.

**Anomaly yang diselesaikan:** A1 dan konsekuensi fungsionalnya yang langsung (skema task baru untuk dukung tool, migrasi data lama supaya tool tidak menolak sesi lama, reset tahap supaya `createStagePlan` dapat dipanggil ulang setelah reset).

**Anomaly yang TIDAK diselesaikan disini:**
- A2 (paradigma konflik dengan `pipePlanCapture`) — dispec terpisah.
- A4 (plan-gate enforcer silent skip) — dispec terpisah.
- A8 (STAGE_LIMITS untuk 13 tahap lain) — menunggu audit per-tahap.
- A10 (system prompt internal inconsistency) — dispec terpisah.
- A11 (verifier circular logic) — bergantung pada A4, dispec terpisah.
- A12 (plan locking semantic doc cleanup) — dispec terpisah.
- A13 sebagian, A14, A15 — dispec terpisah.

---

## Bagian 1 — Skema Data

### 1.1 Skema Task Baru

Lokasi: `src/lib/ai/harness/plan-spec.ts`. Schema lama digantikan.

```ts
import { z } from "zod"

export const planTaskSchema = z.object({
  id: z.string().min(1),                              // nanoid, opaque
  label: z.string().min(1).max(120),
  status: z.enum(["pending", "in-progress", "complete"]),
  kind: z.enum(["work", "artifact_validation"]),
})

export const planSpecSchema = z.object({
  stage: z.string().min(1),
  summary: z.string().min(1).max(280),
  tasks: z.array(planTaskSchema).min(1).max(10),      // batas global tetap 10
  finalized: z.boolean().default(false),
})

export type PlanTask = z.infer<typeof planTaskSchema>
export type PlanSpec = z.infer<typeof planSpecSchema>
```

Schema Convex untuk `stageData[stage]._plan` saat ini `v.optional(v.any())`, sehingga tidak butuh migrasi schema Convex. Cukup migrasi data existing.

### 1.2 Dependency Baru

```bash
npm install nanoid@^5
```

---

## Bagian 2 — Definisi Tool

Lokasi: `src/lib/ai/paper-tools.ts`. Tambah tiga tool baru.

### 2.1 `createStagePlan`

```ts
export const createStagePlanTool = tool({
  description: `Create the work plan for the current stage. Call ONCE at stage start, before any discussion. Plan is locked after creation — task labels and count cannot be changed except via resetToStage which clears the plan first.

Provide 1-N work tasks. The system auto-appends 1 terminal task ("Membuat artifak & Validasi pindah stage ke user", kind: artifact_validation) — do NOT include it in your input.

Returns task IDs you must use when calling markTaskDone.`,
  inputSchema: z.object({
    tasks: z.array(z.object({
      label: z.string().min(1).max(120),
    })).min(1).max(10),
  }),
  execute: async ({ tasks }, { paperStageScope, paperToolTracker, paperSessionId }) => {
    const workTasks = tasks.map(t => ({
      id: nanoid(),
      label: t.label,
      status: "pending" as const,
      kind: "work" as const,
    }))
    const terminalTask = {
      id: nanoid(),
      label: "Membuat artifak & Validasi pindah stage ke user",
      status: "pending" as const,
      kind: "artifact_validation" as const,
    }

    const result = await fetchMutation(api.paperSessions.createStagePlan, {
      sessionId: paperSessionId,
      stage: paperStageScope,
      summary: `${paperStageScope} plan: ${tasks.length} work + 1 terminal`,
      tasks: [...workTasks, terminalTask],
    })

    if (!result.ok) return result

    paperToolTracker.sawCreateStagePlan = true
    return {
      ok: true,
      taskIds: workTasks.map(t => t.id),
      terminalTaskId: terminalTask.id,
    }
  },
})
```

### 2.2 `markTaskDone`

```ts
export const markTaskDoneTool = tool({
  description: `Mark a plan task as complete. Call after the task topic has been discussed with the user.

Returns allDone: true when all WORK tasks are complete (terminal task is not included — it completes via confirmStageFinalization + tool chain).`,
  inputSchema: z.object({
    taskId: z.string().min(1),
  }),
  execute: async ({ taskId }, { paperStageScope, paperToolTracker, paperSessionId }) => {
    const result = await fetchMutation(api.paperSessions.markTaskDone, {
      sessionId: paperSessionId,
      stage: paperStageScope,
      taskId,
    })

    if (!result.ok) return result

    paperToolTracker.sawMarkTaskDone = true
    if (result.allWorkTasksDone) paperToolTracker.allTasksDone = true

    return { ok: true, allDone: result.allWorkTasksDone }
  },
})
```

### 2.3 `confirmStageFinalization`

```ts
export const confirmStageFinalizationTool = tool({
  description: `Lock the plan and signal readiness for artifact creation. Call after ALL work tasks are markTaskDone AND user has clicked the finalize_stage choice card.

After this returns ok, you MUST call: updateStageData → createArtifact → submitStageForValidation in the SAME turn.`,
  inputSchema: z.object({
    summary: z.string().max(500).optional(),
  }),
  execute: async ({ summary }, { paperStageScope, paperToolTracker, paperSessionId }) => {
    const result = await fetchMutation(api.paperSessions.confirmStageFinalization, {
      sessionId: paperSessionId,
      stage: paperStageScope,
      summary,
    })

    if (!result.ok) return result

    paperToolTracker.sawConfirmStageFinalization = true
    return { ok: true }
  },
})
```

---

## Bagian 3 — Mutation Convex

### 3.1 `createStagePlan`

Lokasi: `convex/paperSessions/createStagePlan.ts`.

```ts
import { mutation } from "../_generated/server"
import { v } from "convex/values"

export default mutation({
  args: {
    sessionId: v.id("paperSessions"),
    stage: v.string(),
    summary: v.string(),
    tasks: v.array(v.object({
      id: v.string(),
      label: v.string(),
      status: v.union(v.literal("pending"), v.literal("in-progress"), v.literal("complete")),
      kind: v.union(v.literal("work"), v.literal("artifact_validation")),
    })),
  },
  handler: async (ctx, { sessionId, stage, summary, tasks }) => {
    const session = await ctx.db.get(sessionId)
    if (!session) throw new Error("session_not_found")

    const stageData = (session.stageData as Record<string, Record<string, unknown>>) ?? {}
    const currentPlan = stageData[stage]?._plan

    if (currentPlan) {
      return {
        ok: false as const,
        error: "plan_exists" as const,
        message: `Plan for stage "${stage}" already exists. Call resetToStage first.`,
      }
    }

    await ctx.db.patch(sessionId, {
      stageData: {
        ...stageData,
        [stage]: {
          ...(stageData[stage] ?? {}),
          _plan: { stage, summary, tasks, finalized: false },
        },
      },
    })

    return { ok: true as const }
  },
})
```

### 3.2 `markTaskDone`

Lokasi: `convex/paperSessions/markTaskDone.ts`.

```ts
export default mutation({
  args: {
    sessionId: v.id("paperSessions"),
    stage: v.string(),
    taskId: v.string(),
  },
  handler: async (ctx, { sessionId, stage, taskId }) => {
    const session = await ctx.db.get(sessionId)
    if (!session) throw new Error("session_not_found")

    const stageData = (session.stageData as Record<string, Record<string, unknown>>) ?? {}
    const plan = stageData[stage]?._plan as { tasks: PlanTask[] } | undefined

    if (!plan) return { ok: false as const, error: "no_plan" as const }

    const task = plan.tasks.find(t => t.id === taskId)
    if (!task) return { ok: false as const, error: "task_not_found" as const }
    if (task.kind === "artifact_validation") {
      return { ok: false as const, error: "task_is_terminal" as const }
    }

    const updatedTasks = plan.tasks.map(t =>
      t.id === taskId ? { ...t, status: "complete" as const } : t
    )

    await ctx.db.patch(sessionId, {
      stageData: {
        ...stageData,
        [stage]: {
          ...(stageData[stage] ?? {}),
          _plan: { ...plan, tasks: updatedTasks },
        },
      },
    })

    const allWorkTasksDone = updatedTasks
      .filter(t => t.kind === "work")
      .every(t => t.status === "complete")

    return { ok: true as const, allWorkTasksDone }
  },
})
```

### 3.3 `confirmStageFinalization`

Lokasi: `convex/paperSessions/confirmStageFinalization.ts`.

```ts
export default mutation({
  args: {
    sessionId: v.id("paperSessions"),
    stage: v.string(),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, stage, summary }) => {
    const session = await ctx.db.get(sessionId)
    if (!session) throw new Error("session_not_found")

    const stageData = (session.stageData as Record<string, Record<string, unknown>>) ?? {}
    const plan = stageData[stage]?._plan as PlanSpec | undefined

    if (!plan) return { ok: false as const, error: "no_plan" as const }

    const pendingWorkTasks = plan.tasks
      .filter(t => t.kind === "work")
      .filter(t => t.status !== "complete")

    if (pendingWorkTasks.length > 0) {
      return {
        ok: false as const,
        error: "tasks_pending" as const,
        missingTasks: pendingWorkTasks.map(t => t.id),
      }
    }

    const updatedTasks = plan.tasks.map(t =>
      t.kind === "artifact_validation" ? { ...t, status: "in-progress" as const } : t
    )

    await ctx.db.patch(sessionId, {
      stageData: {
        ...stageData,
        [stage]: {
          ...(stageData[stage] ?? {}),
          _plan: {
            ...plan,
            tasks: updatedTasks,
            finalized: true,
            finalizedSummary: summary,
            finalizedAt: Date.now(),
          },
        },
      },
    })

    return { ok: true as const }
  },
})
```

### 3.4 Ekstensi `resetToStage`

Mutation existing `resetToStage` di Convex perlu ditambah perilaku: clear `_plan` untuk tahap target dan tahap setelahnya.

```ts
const stageData = session.stageData ?? {}
const cleared = { ...stageData }
for (const stageName of stagesToReset) {
  if (cleared[stageName]) {
    cleared[stageName] = { ...cleared[stageName], _plan: null }
  }
}
await ctx.db.patch(sessionId, { stageData: cleared })
```

Tanpa ini, `createStagePlan` setelah reset akan ditolak `plan_exists`.

---

## Bagian 4 — Ekstensi PaperToolTracker

Lokasi: `src/lib/ai/paper-tools.ts`. Tambah field baru pada tipe `PaperToolTracker` dan factory.

```ts
export type PaperToolTracker = {
  // Field existing tetap dipertahankan...
  sawCreateStagePlan: boolean
  sawMarkTaskDone: boolean
  sawConfirmStageFinalization: boolean
  allTasksDone: boolean
}

export function createPaperToolTracker(): PaperToolTracker {
  return {
    // ... field existing ...
    sawCreateStagePlan: false,
    sawMarkTaskDone: false,
    sawConfirmStageFinalization: false,
    allTasksDone: false,
  }
}
```

Field-field baru ini dipakai oleh tool execute callback (Bagian 2) untuk merekam keberhasilan panggilan.

---

## Bagian 5 — Skrip Migrasi Data Lama

Lokasi baru: `scripts/migrate-plan-shape.mjs`.

Sesi lama di basis data dev memiliki `_plan.tasks` berbentuk `{label, status}` saja. Tool `markTaskDone` butuh `id` dan `kind` agar dapat memvalidasi. Skrip migrasi menambahkan keduanya.

```js
import { ConvexHttpClient } from "convex/browser"
import { nanoid } from "nanoid"
import { api } from "../convex/_generated/api.js"

const client = new ConvexHttpClient("https://wary-ferret-59.convex.cloud")

async function main() {
  const sessions = await client.query(api.paperSessions.listAllWithPlan, {})
  let migrated = 0
  let skipped = 0

  for (const session of sessions) {
    const stageData = session.stageData ?? {}
    let modified = false
    const newStageData = { ...stageData }

    for (const [stage, data] of Object.entries(stageData)) {
      const plan = data?._plan
      if (!plan?.tasks) continue
      if (plan.tasks[0]?.id) continue   // sudah dimigrasi

      const migratedTasks = plan.tasks.map((t, idx) => ({
        id: nanoid(),
        label: t.label,
        status: t.status,
        kind: idx === plan.tasks.length - 1 ? "artifact_validation" : "work",
      }))

      newStageData[stage] = {
        ...data,
        _plan: { ...plan, tasks: migratedTasks, finalized: plan.finalized ?? false },
      }
      modified = true
    }

    if (modified) {
      await client.mutation(api.paperSessions.adminMigratePlanShape, {
        sessionId: session._id,
        stageData: newStageData,
      })
      migrated++
    } else {
      skipped++
    }
  }

  console.log(`Done: ${migrated} migrated, ${skipped} skipped`)
}

main().catch(e => { console.error(e); process.exit(1) })
```

Prasyarat dua endpoint Convex baru, scope sempit:
- `paperSessions.listAllWithPlan` — query admin-guarded, return sesi yang punya `_plan`.
- `paperSessions.adminMigratePlanShape` — mutation admin-guarded, terima `sessionId` dan `stageData` baru. Validasi shape `_plan` baru sebelum write.

Pola admin guard mengikuti `scripts/deploy-skills-dev.py:8` (ADMIN_ID hardcoded). Saat eksekusi, verifikasi pola tersebut benar-benar berfungsi melalui test panggilan tunggal sebelum loop migrasi.

Skrip idempotent: aman dijalankan ulang. Sesi yang sudah punya `id` di task pertama akan dilewati.

---

## Bagian 6 — Integrasi json-renderer untuk Plan UI

### 6.1 Latar Belakang

Saat ini plan dirender oleh komponen standalone `src/components/chat/UnifiedProcessCard.tsx`. Choice card sudah memakai json-renderer (`src/lib/json-render/`). Plan adalah Generative UI canonical (catalog tertutup, struktur terbatas), cocok dipindah ke kerangka json-renderer untuk konsistensi pipeline.

Referensi konsep: `docs/what-is-makalah/references/json-renderer/json-renderer-vercel.md`.

### 6.2 Catalog Plan

Lokasi baru: `src/lib/json-render/plan-catalog.ts`.

Definisikan komponen catalog dengan props Zod yang mirror `planTaskSchema` (Bagian 1.1):

```ts
import { defineCatalog } from "@json-render/core"
import { schema } from "@json-render/react/schema"
import { z } from "zod"

export const planCardPropsSchema = z.object({
  stage: z.string(),
  summary: z.string(),
  finalized: z.boolean(),
})

export const planTaskItemPropsSchema = z.object({
  taskId: z.string(),
  label: z.string(),
  status: z.enum(["pending", "in-progress", "complete"]),
  kind: z.enum(["work", "artifact_validation"]),
})

export const planCatalog = defineCatalog(schema, {
  components: {
    PlanCard: { props: planCardPropsSchema, slots: ["default"] },
    PlanTaskItem: { props: planTaskItemPropsSchema },
  },
})
```

### 6.3 Compile Spec dari `_plan`

Lokasi baru: `src/lib/json-render/compile-plan-spec.ts`.

Fungsi murni yang mengubah `PlanSpec` (Convex `_plan`) menjadi json-render spec sesuai catalog di 6.2:

```ts
export function compilePlanSpec(plan: PlanSpec): JsonRenderSpec {
  const taskElements = Object.fromEntries(
    plan.tasks.map(t => [`task-${t.id}`, {
      type: "PlanTaskItem",
      props: { taskId: t.id, label: t.label, status: t.status, kind: t.kind },
    }])
  )

  return {
    root: "plan-root",
    elements: {
      "plan-root": {
        type: "PlanCard",
        props: { stage: plan.stage, summary: plan.summary, finalized: plan.finalized },
        children: plan.tasks.map(t => `task-${t.id}`),
      },
      ...taskElements,
    },
  }
}
```

### 6.4 Komponen React

Lokasi baru:
- `src/components/json-render/PlanCard.tsx` — wrapper card dengan summary + finalize indicator.
- `src/components/json-render/PlanTaskItem.tsx` — satu baris task dengan checkbox status visual.

Bind ke catalog via registry. Pattern mirror dengan registry choice card existing di `src/lib/json-render/`.

### 6.5 Integrasi ke Pesan

Lokasi yang disentuh:
- `src/components/chat/MessageBubble.tsx:320-353` — ganti pemanggilan `UnifiedProcessCard` dengan render json-render spec hasil `compilePlanSpec`.
- `src/components/chat/sidebar/SidebarQueueProgress.tsx:305-325` — sama, ganti pembacaan `_plan` direct dengan render via json-render.

### 6.6 Reactive Update

Plan adalah living display: setiap `markTaskDone` mengubah `_plan` di Convex. Convex reactive query akan mengirim update ke client. Komponen pemegang `compilePlanSpec(plan)` akan re-render otomatis. Verifikasi melalui Test 1 (Bagian 8).

### 6.7 Hapus UnifiedProcessCard

Setelah Bagian 6.5 selesai dan ter-test, hapus berkas `src/components/chat/UnifiedProcessCard.tsx` beserta test dan import yang menggantung.

---

## Bagian 7 — Skill DB dan Deploy

### 7.1 Skill DB

Tiga tool sudah disebut di seluruh 14 berkas skill `docs/what-is-makalah/references/agent-harness/system-prompt-skills-active/updated-9/0X-*-skill.md`. Verifikasi semantic match dengan tool baru:
- Nama tool persis sama.
- Argumen `taskId` di `markTaskDone` adalah string opaque.
- Return value `allDone` boolean.
- `confirmStageFinalization` menerima optional `summary`.

Edit minor jika ditemukan diskrepansi (misal: skill menyebut `markTaskDone({id: ...})` padahal tool pakai `taskId`).

### 7.2 Deploy

Sebelum deploy, fix `scripts/deploy-skills-dev.py:9-10`:
- `SRC_DIR = "docs/what-is-makalah/references/agent-harness/system-prompt-skills-active/updated-9"`
- `CHANGE_NOTE = "A1: implement createStagePlan, markTaskDone, confirmStageFinalization"`

Setelah fix, jalankan `python scripts/deploy-skills-dev.py`. Verifikasi log `Passed: 14/14`.

---

## Bagian 8 — Pengujian End-to-End

Tiga skenario, semua di tahap Gagasan.

### Test 1 — Tahap Gagasan jalan normal

1. Buka percakapan baru di dev (`pnpm dev`).
2. Kirim ide: "saya ingin menulis paper tentang AI di pendidikan".
3. Verifikasi: AI memanggil `createStagePlan({tasks: [...]})` dan emit choice card "Cari referensi awal".
4. Verifikasi: PlanCard (json-render) terlihat dengan 4-5 task semua status `pending`.
5. Klik "Cari referensi awal".
6. Verifikasi: search berjalan, AI present findings + choice card.
7. Klik opsi arah.
8. Verifikasi: AI memanggil `markTaskDone({taskId})`. PlanTaskItem berubah status `complete` reactive.
9. Ulangi untuk semua task.
10. Klik finalize_stage choice card.
11. Verifikasi: AI memanggil `confirmStageFinalization` → `updateStageData` → `createArtifact` → `submitStageForValidation`. Validation panel muncul.

### Test 2 — Cek penolakan finalize prematur

1. Sama dengan Test 1 sampai langkah 8.
2. Skip task 2-4. Klik finalize_stage.
3. Verifikasi: AI memanggil `confirmStageFinalization` → mutation menolak `tasks_pending` → AI merespons dengan choice card "selesaikan task X dulu".
4. Verifikasi: tidak ada artifact terbentuk.

### Test 3 — Reset path

1. Setelah Test 1 selesai (di tahap Topik).
2. Kirim "kembali ke gagasan".
3. Verifikasi: AI memanggil `resetToStage({targetStage: "gagasan"})` → mutation clear `_plan` → AI memanggil `createStagePlan` baru.
4. Verifikasi: PlanCard menampilkan plan baru, bukan plan lama yang complete.

---

## Bagian 9 — Sprint Breakdown

| Sprint | Output | Acceptance |
|---|---|---|
| **S1: Schema + Mutations** | `plan-spec.ts` baru, 3 Convex mutations, dependency nanoid | Mutation diuji manual via `npx convex run` |
| **S2: Tools + Tracker** | 3 tool defs di `paper-tools.ts`, ekstensi `PaperToolTracker`, wiring registry | Tool callable, tracker fields ter-update |
| **S3: Migrasi Data** | `paperSessions.listAllWithPlan` + `adminMigratePlanShape` + skrip `migrate-plan-shape.mjs` | Skrip jalan, log `legacy: 0` setelah migrasi |
| **S4: json-renderer Plan UI** | `plan-catalog.ts`, `compile-plan-spec.ts`, komponen `PlanCard` + `PlanTaskItem`, integrasi ke `MessageBubble.tsx` dan `SidebarQueueProgress.tsx`, hapus `UnifiedProcessCard.tsx` | Plan terlihat di UI via json-render, reactive update jalan |
| **S5: Skill alignment + Deploy** | Verifikasi 14 skill DB, fix deploy script, deploy ke dev | `Passed: 14/14` |
| **S6: E2E Test** | Test 1, 2, 3 dijalankan manual | Semua test pass |

---

## Bagian 10 — Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Sesi lama di dev DB punya `_plan` shape lama | Skrip migrasi (Bagian 5) idempotent. Jalankan sebelum deploy skill baru. |
| Pola admin guard di `deploy-skills-dev.py` belum terverifikasi | Test panggilan tunggal sebelum loop migrasi. Apabila pola tidak berfungsi, fallback ke `npx convex run` manual per sesi. |
| Migrasi UI ke json-render menimbulkan regresi visual | Visual diff manual antara `UnifiedProcessCard` lama dan `PlanCard` baru. Skenario yang dicek: status pending/in-progress/complete, terminal task vs work task. |
| Reactive update json-render terlambat | Verifikasi via Test 1 langkah 8. Apabila terlambat, cek apakah `compilePlanSpec` di-memo dengan benar. |
| Tool baru tidak disebut konsisten di 14 skill DB | Sprint S5 verifikasi semantic match per skill, edit minor jika ditemukan diskrepansi. |

---

## Lampiran — Daftar File yang Disentuh

| Layer | Path | Aksi |
|---|---|---|
| Schema | `src/lib/ai/harness/plan-spec.ts` | Replace |
| Tools | `src/lib/ai/paper-tools.ts` | Tambah 3 tool defs + ekstensi tracker |
| Mutations | `convex/paperSessions/createStagePlan.ts` | Baru |
| Mutations | `convex/paperSessions/markTaskDone.ts` | Baru |
| Mutations | `convex/paperSessions/confirmStageFinalization.ts` | Baru |
| Mutations | `convex/paperSessions/resetToStage.ts` (existing) | Ekstensi clear `_plan` |
| Mutations admin | `convex/paperSessions/adminMigratePlanShape.ts` | Baru |
| Query admin | `convex/paperSessions/listAllWithPlan.ts` | Baru |
| Wiring | `src/lib/chat-harness/executor/build-tool-registry.ts` | Wire 3 tool baru |
| Migration | `scripts/migrate-plan-shape.mjs` | Baru |
| json-render catalog | `src/lib/json-render/plan-catalog.ts` | Baru |
| json-render compile | `src/lib/json-render/compile-plan-spec.ts` | Baru |
| Komponen | `src/components/json-render/PlanCard.tsx` | Baru |
| Komponen | `src/components/json-render/PlanTaskItem.tsx` | Baru |
| Integrasi | `src/components/chat/MessageBubble.tsx:320-353` | Replace pemanggilan UnifiedProcessCard |
| Integrasi | `src/components/chat/sidebar/SidebarQueueProgress.tsx:305-325` | Replace pemanggilan UnifiedProcessCard |
| Hapus | `src/components/chat/UnifiedProcessCard.tsx` | Delete |
| Deploy | `scripts/deploy-skills-dev.py:9-10` | Fix SRC_DIR + CHANGE_NOTE |
| Dependency | `package.json` | Tambah `nanoid@^5` |

---

**EOF**
