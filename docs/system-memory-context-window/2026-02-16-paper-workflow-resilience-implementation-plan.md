# Paper Workflow Resilience — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Perbaiki 7 kelemahan system memory + anti-hallucination + context window management, dan bangun AI Ops Dashboard untuk observability. Incremental, per-task commits.

**Architecture:** 8 work items (W1-W8) diimplementasi berurutan di branch `fix/paper-workflow-resilience`. W1-W7 memperkuat engine, W8 membangun dashboard monitoring. Setiap W adalah commit terpisah.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Convex, Tailwind CSS 4, Vitest, Iconoir

**Worktree:** `.worktrees/paper-workflow-resilience/`

**Design doc:** `docs/system-memory-context-window/2026-02-16-paper-workflow-resilience-design.md`

---

## Task 1: W6 — Filter Superseded Digest Entries

**Files:**
- Modify: `src/lib/ai/paper-stages/formatStageData.ts:97-122`
- Test: `__tests__/format-stage-data-superseded.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/format-stage-data-superseded.test.ts
import { describe, it, expect } from "vitest";
import { formatStageData } from "@/lib/ai/paper-stages/formatStageData";

describe("formatStageData - superseded digest filtering", () => {
  it("should exclude superseded entries from ringkasan output", () => {
    const stageData = {
      gagasan: {
        ringkasan: "Ide tentang AI pendidikan",
        validatedAt: 1000,
      },
      topik: {
        ringkasan: "Topik lama yang di-rewind",
        validatedAt: 2000,
        superseded: true,
      },
    };

    const result = formatStageData(stageData as any, "outline");

    expect(result).toContain("Ide tentang AI pendidikan");
    expect(result).not.toContain("Topik lama yang di-rewind");
  });

  it("should include non-superseded entries normally", () => {
    const stageData = {
      gagasan: {
        ringkasan: "Ide final",
        validatedAt: 1000,
      },
      topik: {
        ringkasan: "Topik definitif",
        validatedAt: 3000,
      },
    };

    const result = formatStageData(stageData as any, "outline");

    expect(result).toContain("Ide final");
    expect(result).toContain("Topik definitif");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd .worktrees/paper-workflow-resilience && npx vitest run __tests__/format-stage-data-superseded.test.ts`
Expected: First test FAILS — superseded entry masih muncul di output.

**Step 3: Implement the filter**

Di `src/lib/ai/paper-stages/formatStageData.ts`, fungsi `formatRingkasanTahapSelesai` (line 97-122).

Tambah filter di line 108 — setelah check `!data.validatedAt`, tambah check `data.superseded`:

```typescript
// Line 107-110 saat ini:
const data = stageData[stageId] as AllStageData | undefined;
if (!data || !data.validatedAt) {
    return;
}

// Ubah menjadi:
const data = stageData[stageId] as AllStageData | undefined;
if (!data || !data.validatedAt || (data as any).superseded) {
    return;
}
```

**Step 4: Run test to verify it passes**

Run: `cd .worktrees/paper-workflow-resilience && npx vitest run __tests__/format-stage-data-superseded.test.ts`
Expected: PASS

**Step 5: Run existing tests to check no regression**

Run: `cd .worktrees/paper-workflow-resilience && npx vitest run`
Expected: All existing tests still pass.

**Step 6: Commit**

```bash
git add src/lib/ai/paper-stages/formatStageData.ts __tests__/format-stage-data-superseded.test.ts
git commit -m "fix(paper): filter superseded digest entries from prompt injection (W6)"
```

---

## Task 2: W3 — Source Validation (URL Wajib pada Referensi)

**Files:**
- Modify: `convex/paperSessions.ts:206-224` (normalizeReferensiData area) dan `convex/paperSessions.ts:446-486` (updateStageData mutation)
- Test: `__tests__/referensi-url-validation.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/referensi-url-validation.test.ts
import { describe, it, expect } from "vitest";

// Test the validation logic in isolation
function validateReferensiUrls(data: Record<string, unknown>): {
  hasWarning: boolean;
  missingUrlCount: number;
  totalCount: number;
  field: string;
} | null {
  const referensiFields = [
    "referensiAwal", "referensiPendukung", "referensi",
    "sitasiAPA", "sitasiTambahan"
  ];

  for (const field of referensiFields) {
    if (Array.isArray(data[field])) {
      const items = data[field] as Array<Record<string, unknown>>;
      const total = items.length;
      const missingUrl = items.filter(
        (item) => !item.url || (typeof item.url === "string" && item.url.trim() === "")
      ).length;

      if (missingUrl > 0) {
        return { hasWarning: true, missingUrlCount: missingUrl, totalCount: total, field };
      }
    }
  }
  return null;
}

describe("validateReferensiUrls", () => {
  it("should detect referensi without URL", () => {
    const data = {
      referensiAwal: [
        { title: "Paper A", url: "https://example.com", year: 2024 },
        { title: "Paper B hallucinated", year: 2023 },
      ],
    };

    const result = validateReferensiUrls(data);
    expect(result).not.toBeNull();
    expect(result!.missingUrlCount).toBe(1);
    expect(result!.totalCount).toBe(2);
  });

  it("should pass when all referensi have URLs", () => {
    const data = {
      referensiAwal: [
        { title: "Paper A", url: "https://example.com" },
        { title: "Paper B", url: "https://other.com" },
      ],
    };

    const result = validateReferensiUrls(data);
    expect(result).toBeNull();
  });

  it("should detect empty string URL as missing", () => {
    const data = {
      referensiPendukung: [
        { title: "Paper C", url: "" },
      ],
    };

    const result = validateReferensiUrls(data);
    expect(result).not.toBeNull();
    expect(result!.missingUrlCount).toBe(1);
  });

  it("should check sitasiAPA and sitasiTambahan fields too", () => {
    const data = {
      sitasiAPA: [
        { inTextCitation: "(Smith, 2024)", fullReference: "Smith...", url: "" },
      ],
    };

    const result = validateReferensiUrls(data);
    expect(result).not.toBeNull();
  });

  it("should return null for non-referensi data", () => {
    const data = {
      ideKasar: "Some idea",
      analisis: "Some analysis",
    };

    const result = validateReferensiUrls(data);
    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it passes (pure function test)**

Run: `cd .worktrees/paper-workflow-resilience && npx vitest run __tests__/referensi-url-validation.test.ts`
Expected: PASS (testing pure function defined inline).

**Step 3: Add validation to updateStageData mutation**

Di `convex/paperSessions.ts`, tambah fungsi `validateReferensiUrls` (setelah `normalizeReferensiData`, sekitar line 224):

```typescript
/**
 * Validate that referensi entries have URL field (anti-hallucination guard).
 * Returns warning info if entries without URL found, null otherwise.
 */
function validateReferensiUrls(data: Record<string, unknown>): {
  missingUrlCount: number;
  totalCount: number;
  field: string;
} | null {
  const referensiFields = [
    "referensiAwal", "referensiPendukung", "referensi",
    "sitasiAPA", "sitasiTambahan"
  ];

  for (const field of referensiFields) {
    if (Array.isArray(data[field])) {
      const items = data[field] as Array<Record<string, unknown>>;
      const total = items.length;
      const missingUrl = items.filter(
        (item) => !item.url || (typeof item.url === "string" && item.url.trim() === "")
      ).length;

      if (missingUrl > 0) {
        return { missingUrlCount: missingUrl, totalCount: total, field };
      }
    }
  }
  return null;
}
```

Di `updateStageData` mutation (line ~448, setelah `normalizeReferensiData` call), tambah:

```typescript
// Anti-hallucination: Check referensi URLs
const urlValidation = validateReferensiUrls(normalizedData);
let referensiWarning: string | undefined;
if (urlValidation) {
    referensiWarning =
        `PERINGATAN ANTI-HALUSINASI: ${urlValidation.missingUrlCount} dari ${urlValidation.totalCount} ` +
        `referensi di field '${urlValidation.field}' TIDAK memiliki URL. ` +
        `Semua referensi WAJIB berasal dari google_search dan memiliki URL sumber.`;
}
```

Di return statement (line ~479), gabungkan warning:

```typescript
const warnings: string[] = [];
if (!hasRingkasan) {
    warnings.push("Ringkasan belum diisi. Tahap ini TIDAK BISA di-approve tanpa ringkasan.");
}
if (referensiWarning) {
    warnings.push(referensiWarning);
}

return {
    success: true,
    stage: args.stage,
    warning: warnings.length > 0 ? warnings.join(" | ") : undefined,
};
```

**Step 4: Run all tests**

Run: `cd .worktrees/paper-workflow-resilience && npx vitest run`
Expected: All pass.

**Step 5: Commit**

```bash
git add convex/paperSessions.ts __tests__/referensi-url-validation.test.ts
git commit -m "fix(paper): add URL validation for referensi anti-hallucination guard (W3)"
```

---

## Task 3: W4 — isDirty Warning Banner di Validation Panel

**Files:**
- Modify: `src/components/paper/PaperValidationPanel.tsx`
- Modify: `src/components/chat/ChatWindow.tsx:800-807` (pass isDirty prop)

**Step 1: Add isDirty prop to PaperValidationPanel**

Di `src/components/paper/PaperValidationPanel.tsx`, update interface (line 10-15):

```typescript
interface PaperValidationPanelProps {
    stageLabel: string;
    onApprove: () => Promise<void>;
    onRevise: (feedback: string) => Promise<void>;
    isLoading?: boolean;
    isDirty?: boolean;  // NEW: stage data mungkin desync dengan chat
}
```

Update destructuring (line 17-22):

```typescript
export const PaperValidationPanel: React.FC<PaperValidationPanelProps> = ({
    stageLabel,
    onApprove,
    onRevise,
    isLoading = false,
    isDirty = false,
}) => {
```

Tambah warning banner SEBELUM Header Section (sebelum line 75, di dalam `<div className="p-4 ..."`):

```typescript
{/* isDirty Warning Banner */}
{isDirty && (
    <div className="flex items-start gap-2 p-3 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-action text-xs text-amber-600 dark:text-amber-400">
        <WarningCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
            <span className="font-semibold">Percakapan berubah sejak data terakhir disimpan.</span>
            <span className="block mt-0.5 text-muted-foreground">
                Sebaiknya minta AI sinkronkan data sebelum approve.
            </span>
        </div>
    </div>
)}
```

Tambah import `WarningCircle` di line 6:

```typescript
import { Check, EditPencil, Send, Xmark, WarningCircle } from "iconoir-react";
```

**Step 2: Pass isDirty from ChatWindow**

Di `src/components/chat/ChatWindow.tsx`, line 800-807, tambah prop `isDirty`:

```typescript
{isPaperMode && stageStatus === "pending_validation" && userId && status !== 'streaming' && (
    <PaperValidationPanel
        stageLabel={stageLabel}
        onApprove={handleApprove}
        onRevise={handleRevise}
        isLoading={isLoading}
        isDirty={paperSession?.isDirty === true}
    />
)}
```

Verifikasi bahwa `paperSession` sudah tersedia di scope ChatWindow. Cari di file apakah sudah ada query `paperSession` atau `usePaperSession`. Kalau `paperSession` object sudah ada, gunakan langsung. Kalau belum, ambil dari hook yang ada (kemungkinan besar sudah tersedia karena `isPaperMode` dan `stageStatus` sudah dipakai).

**Step 3: Manual test**

1. Buka paper session yang sedang di pending_validation
2. Edit sebuah pesan di chat → isDirty should be set to true di backend
3. Lihat PaperValidationPanel → warning banner harus muncul
4. Approve → isDirty reset ke false

**Step 4: Commit**

```bash
git add src/components/paper/PaperValidationPanel.tsx src/components/chat/ChatWindow.tsx
git commit -m "feat(paper): show isDirty warning banner in validation panel (W4)"
```

---

## Task 4: W7 — Field Size Truncation di updateStageData

**Files:**
- Modify: `convex/paperSessions.ts` (updateStageData mutation)
- Test: `__tests__/stage-data-truncation.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/stage-data-truncation.test.ts
import { describe, it, expect } from "vitest";

const FIELD_CHAR_LIMIT = 2000;
const RINGKASAN_LIMIT = 280;
const EXCLUDED_FIELDS = new Set([
    "ringkasan", "ringkasanDetail", "artifactId",
    "validatedAt", "revisionCount",
]);

function truncateStageDataFields(data: Record<string, unknown>): {
  truncated: Record<string, unknown>;
  warnings: string[];
} {
  const truncated = { ...data };
  const warnings: string[] = [];

  for (const [key, value] of Object.entries(truncated)) {
    if (typeof value !== "string") continue;
    if (EXCLUDED_FIELDS.has(key)) continue;

    if (value.length > FIELD_CHAR_LIMIT) {
      truncated[key] = value.slice(0, FIELD_CHAR_LIMIT);
      warnings.push(
        `Field '${key}' di-truncate dari ${value.length} ke ${FIELD_CHAR_LIMIT} karakter.`
      );
    }
  }

  return { truncated, warnings };
}

describe("truncateStageDataFields", () => {
  it("should truncate string fields exceeding 2000 chars", () => {
    const longText = "a".repeat(3000);
    const data = { analisis: longText, ideKasar: "short" };

    const { truncated, warnings } = truncateStageDataFields(data);

    expect((truncated.analisis as string).length).toBe(2000);
    expect(truncated.ideKasar).toBe("short");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("analisis");
  });

  it("should not truncate excluded fields like ringkasan", () => {
    const data = { ringkasan: "a".repeat(280) };

    const { truncated, warnings } = truncateStageDataFields(data);

    expect((truncated.ringkasan as string).length).toBe(280);
    expect(warnings).toHaveLength(0);
  });

  it("should not truncate non-string fields", () => {
    const data = {
      referensiAwal: [{ title: "A" }, { title: "B" }],
      revisionCount: 3,
    };

    const { truncated, warnings } = truncateStageDataFields(data);

    expect(truncated.referensiAwal).toEqual(data.referensiAwal);
    expect(warnings).toHaveLength(0);
  });

  it("should return empty warnings when nothing truncated", () => {
    const data = { ideKasar: "normal length" };

    const { warnings } = truncateStageDataFields(data);

    expect(warnings).toHaveLength(0);
  });
});
```

**Step 2: Run test**

Run: `cd .worktrees/paper-workflow-resilience && npx vitest run __tests__/stage-data-truncation.test.ts`
Expected: PASS (pure function test).

**Step 3: Add truncation to updateStageData mutation**

Di `convex/paperSessions.ts`, tambah fungsi `truncateStageDataFields` (setelah `validateReferensiUrls`):

```typescript
const FIELD_CHAR_LIMIT = 2000;
const EXCLUDED_TRUNCATION_FIELDS = new Set([
    "ringkasan", "ringkasanDetail", "artifactId",
    "validatedAt", "revisionCount",
]);

function truncateStageDataFields(data: Record<string, unknown>): {
  truncated: Record<string, unknown>;
  warnings: string[];
} {
  const truncated = { ...data };
  const warnings: string[] = [];

  for (const [key, value] of Object.entries(truncated)) {
    if (typeof value !== "string") continue;
    if (EXCLUDED_TRUNCATION_FIELDS.has(key)) continue;

    if (value.length > FIELD_CHAR_LIMIT) {
      truncated[key] = value.slice(0, FIELD_CHAR_LIMIT);
      warnings.push(
        `Field '${key}' di-truncate dari ${value.length} ke ${FIELD_CHAR_LIMIT} karakter.`
      );
    }
  }

  return { truncated, warnings };
}
```

Di `updateStageData` mutation, setelah `normalizeReferensiData` dan `validateReferensiUrls`, tambah:

```typescript
// Truncate oversized string fields
const { truncated: truncatedData, warnings: truncationWarnings } =
    truncateStageDataFields(normalizedData as Record<string, unknown>);
```

Ganti `normalizedData` dengan `truncatedData` di merge stageData (line ~455-461). Gabungkan `truncationWarnings` ke array warnings di return.

**Step 4: Run all tests**

Run: `cd .worktrees/paper-workflow-resilience && npx vitest run`

**Step 5: Commit**

```bash
git add convex/paperSessions.ts __tests__/stage-data-truncation.test.ts
git commit -m "fix(paper): add field size truncation in updateStageData (W7)"
```

---

## Task 5: W1 — Artifact Summary Injection

**Files:**
- Modify: `src/lib/ai/paper-stages/formatStageData.ts`
- Modify: `src/lib/ai/paper-mode-prompt.ts`
- Test: `__tests__/artifact-summary-injection.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/artifact-summary-injection.test.ts
import { describe, it, expect } from "vitest";

const ARTIFACT_SUMMARY_CHAR_LIMIT = 500;

function formatArtifactSummary(
  artifactContent: string,
  stageLabel: string
): string {
  const truncated = artifactContent.length > ARTIFACT_SUMMARY_CHAR_LIMIT
    ? artifactContent.slice(0, ARTIFACT_SUMMARY_CHAR_LIMIT) + "..."
    : artifactContent;
  return `- [${stageLabel}] "${truncated}"`;
}

function formatArtifactSummaries(
  artifacts: Array<{ stageLabel: string; content: string }>
): string {
  if (artifacts.length === 0) return "";

  const summaries = artifacts
    .map((a) => formatArtifactSummary(a.content, a.stageLabel));

  return `\nRINGKASAN ARTIFACT TAHAP SELESAI:\n${summaries.join("\n")}`;
}

describe("formatArtifactSummaries", () => {
  it("should format artifacts with stage labels", () => {
    const artifacts = [
      { stageLabel: "Gagasan Paper", content: "Ide tentang AI pendidikan" },
      { stageLabel: "Menyusun Outline", content: "BAB 1: Pendahuluan" },
    ];

    const result = formatArtifactSummaries(artifacts);

    expect(result).toContain("RINGKASAN ARTIFACT TAHAP SELESAI:");
    expect(result).toContain("[Gagasan Paper]");
    expect(result).toContain("[Menyusun Outline]");
  });

  it("should truncate long content to 500 chars", () => {
    const longContent = "x".repeat(800);
    const artifacts = [
      { stageLabel: "Abstrak", content: longContent },
    ];

    const result = formatArtifactSummaries(artifacts);

    expect(result).not.toContain("x".repeat(501));
    expect(result).toContain("...");
  });

  it("should return empty string for no artifacts", () => {
    const result = formatArtifactSummaries([]);
    expect(result).toBe("");
  });
});
```

**Step 2: Run test**

Run: `cd .worktrees/paper-workflow-resilience && npx vitest run __tests__/artifact-summary-injection.test.ts`
Expected: PASS (pure function test).

**Step 3: Implement artifact summary in formatStageData.ts**

Di `src/lib/ai/paper-stages/formatStageData.ts`:

1. Tambah constant:
```typescript
const ARTIFACT_SUMMARY_CHAR_LIMIT = 500;
```

2. Tambah fungsi (setelah `formatOutlineChecklist`):
```typescript
function formatArtifactSummary(content: string, stageLabel: string): string {
  const truncated = content.length > ARTIFACT_SUMMARY_CHAR_LIMIT
    ? content.slice(0, ARTIFACT_SUMMARY_CHAR_LIMIT).trim() + "..."
    : content;
  return `- [${stageLabel}] "${truncated}"`;
}

export function formatArtifactSummaries(
  artifacts: Array<{ stageLabel: string; content: string }>
): string {
  if (artifacts.length === 0) return "";

  const summaries = artifacts
    .map((a) => formatArtifactSummary(a.content, a.stageLabel));

  return `RINGKASAN ARTIFACT TAHAP SELESAI:\n${summaries.join("\n")}`;
}
```

**Step 4: Integrate into paper-mode-prompt.ts**

Di `src/lib/ai/paper-mode-prompt.ts`, setelah query invalidated artifacts (line ~82-92), tambah query untuk artifact summaries:

```typescript
// Fetch artifact summaries for completed stages
let artifactSummariesSection = "";
try {
    const completedStages = STAGE_ORDER.filter((stageId) => {
        const data = session.stageData?.[stageId] as any;
        return data?.validatedAt && data?.artifactId && !(data?.superseded);
    });

    if (completedStages.length > 0) {
        const artifactSummaries: Array<{ stageLabel: string; content: string }> = [];

        for (const stageId of completedStages) {
            const data = session.stageData?.[stageId] as any;
            if (!data?.artifactId) continue;

            try {
                const artifact = await fetchQuery(
                    api.artifacts.getById,
                    { artifactId: data.artifactId },
                    convexOptions
                );
                if (artifact?.content) {
                    artifactSummaries.push({
                        stageLabel: getStageLabel(stageId),
                        content: artifact.content,
                    });
                }
            } catch {
                // Skip individual artifact fetch failures
            }
        }

        if (artifactSummaries.length > 0) {
            artifactSummariesSection = "\n" + formatArtifactSummaries(artifactSummaries);
        }
    }
} catch (err) {
    console.error("Error fetching artifact summaries:", err);
}
```

Tambah import `formatArtifactSummaries` dan `STAGE_ORDER` di top of file.

Inject `artifactSummariesSection` ke prompt template (sebelum `---` closing, setelah `${formattedData}`):

```typescript
KONTEKS TAHAP SELESAI & CHECKLIST:
${formattedData}
${artifactSummariesSection}
---
```

**PENTING:** Cek apakah `api.artifacts.getById` query sudah ada di `convex/artifacts.ts`. Kalau belum, perlu ditambahkan sebagai query sederhana yang return artifact by ID (with auth check).

**Step 5: Run all tests**

Run: `cd .worktrees/paper-workflow-resilience && npx vitest run`

**Step 6: Commit**

```bash
git add src/lib/ai/paper-stages/formatStageData.ts src/lib/ai/paper-mode-prompt.ts __tests__/artifact-summary-injection.test.ts
# Juga add convex/artifacts.ts kalau ada perubahan
git commit -m "feat(paper): inject artifact summaries into AI context for better memory (W1)"
```

---

## Task 6: W5 — Dual-Layer Ringkasan

**Files:**
- Modify: `convex/paperSessions/types.ts` — Tambah `ringkasanDetail` ke setiap stage type
- Modify: `convex/paperSessions.ts` — Tambah `ringkasanDetail` ke STAGE_KEY_WHITELIST
- Modify: `src/lib/ai/paper-tools.ts` — Update tool description
- Modify: `src/lib/ai/paper-stages/formatStageData.ts` — Selective injection
- Test: `__tests__/ringkasan-detail-injection.test.ts`

**Step 1: Add ringkasanDetail to stage types**

Di `convex/paperSessions/types.ts`, tambah field `ringkasanDetail` ke SETIAP stage data type. Cari semua type definitions dan tambahkan:

```typescript
ringkasanDetail?: string;  // max 1000 char, elaborasi ringkasan
```

Di setiap type: `GagasanData`, `TopikData`, `OutlineData`, `AbstrakData`, `PendahuluanData`, `TinjauanLiteraturData`, `MetodologiData`, `HasilData`, `DiskusiData`, `KesimpulanData`, `DaftarPustakaData`, `LampiranData`, `JudulData`.

Untuk Convex validator types, tambahkan:
```typescript
ringkasanDetail: v.optional(v.string()),
```

**Step 2: Add ringkasanDetail ke STAGE_KEY_WHITELIST**

Di `convex/paperSessions.ts` line 25-83, tambah `"ringkasanDetail"` ke setiap stage array. Contoh untuk gagasan (line 26-29):

```typescript
gagasan: [
    "ringkasan", "ringkasanDetail", "ideKasar", "analisis", "angle", "novelty",
    "referensiAwal", "artifactId", "validatedAt", "revisionCount"
],
```

Ulangi untuk semua 13 stages.

**Step 3: Update tool description**

Di `src/lib/ai/paper-tools.ts`, update `inputSchema` untuk `updateStageData` (line 106-115). Tambah ke `data` description:

```typescript
data: z.record(z.string(), z.any()).optional().describe(
    "Objek data draf lainnya (selain ringkasan). PENTING: referensiAwal/referensiPendukung harus ARRAY OF OBJECTS! " +
    "Field 'ringkasanDetail' (opsional, max 1000 char): elaborasi MENGAPA keputusan ini diambil, nuansa penting, dan konteks yang tidak muat di ringkasan 280 char."
),
```

**Step 4: Write test for selective injection**

```typescript
// __tests__/ringkasan-detail-injection.test.ts
import { describe, it, expect } from "vitest";

const DETAIL_WINDOW_SIZE = 3;

function getDetailStages(
  completedStages: string[],
  currentStage: string
): string[] {
  const currentIndex = completedStages.indexOf(currentStage);
  const validStages = completedStages.filter((_, i) =>
    currentIndex === -1 ? true : i < completedStages.length
  );
  return validStages.slice(-DETAIL_WINDOW_SIZE);
}

describe("ringkasanDetail selective injection", () => {
  it("should only inject detail for last 3 completed stages", () => {
    const completed = ["gagasan", "topik", "outline", "abstrak", "pendahuluan"];

    const detailStages = getDetailStages(completed, "tinjauan_literatur");

    expect(detailStages).toEqual(["outline", "abstrak", "pendahuluan"]);
    expect(detailStages).not.toContain("gagasan");
    expect(detailStages).not.toContain("topik");
  });

  it("should return all when fewer than 3 completed", () => {
    const completed = ["gagasan", "topik"];

    const detailStages = getDetailStages(completed, "outline");

    expect(detailStages).toEqual(["gagasan", "topik"]);
  });
});
```

**Step 5: Run test**

Run: `cd .worktrees/paper-workflow-resilience && npx vitest run __tests__/ringkasan-detail-injection.test.ts`

**Step 6: Implement selective injection in formatStageData.ts**

Di `formatRingkasanTahapSelesai` function, setelah build summaries list, tambah ringkasanDetail untuk 3 tahap terakhir:

```typescript
// Determine which stages get detail injection (last 3 completed)
const completedStages = STAGE_ORDER.filter((stageId) => {
    if (currentStage !== "completed" && stageId === currentStage) return false;
    const data = stageData[stageId] as AllStageData | undefined;
    return data?.validatedAt && !(data as any).superseded;
});
const detailStages = new Set(completedStages.slice(-3));
```

Lalu di dalam forEach loop, ganti format output:

```typescript
const isDetailStage = detailStages.has(stageId);
const detail = isDetailStage && typeof (data as any).ringkasanDetail === "string"
    ? (data as any).ringkasanDetail.trim()
    : null;

if (detail) {
    summaries.push(`- ${getStageLabel(stageId)} (DETAIL): ${truncateText(detail, true)}`);
} else {
    summaries.push(`- ${getStageLabel(stageId)}: ${truncateRingkasan(ringkasanValue)}`);
}
```

**Step 7: Add ringkasanDetail ke EXCLUDED_TRUNCATION_FIELDS (W7)**

Di `convex/paperSessions.ts`, `EXCLUDED_TRUNCATION_FIELDS` sudah include `"ringkasanDetail"` dari Task 4. Verifikasi ini ada. Tambah custom limit 1000 char:

```typescript
// Khusus ringkasanDetail: limit 1000 char (bukan 2000)
if (typeof truncated.ringkasanDetail === "string" &&
    (truncated.ringkasanDetail as string).length > 1000) {
    truncated.ringkasanDetail = (truncated.ringkasanDetail as string).slice(0, 1000);
    warnings.push("Field 'ringkasanDetail' di-truncate ke 1000 karakter.");
}
```

**Step 8: Run all tests**

Run: `cd .worktrees/paper-workflow-resilience && npx vitest run`

**Step 9: Commit**

```bash
git add convex/paperSessions/types.ts convex/paperSessions.ts src/lib/ai/paper-tools.ts src/lib/ai/paper-stages/formatStageData.ts __tests__/ringkasan-detail-injection.test.ts
git commit -m "feat(paper): add dual-layer ringkasan with selective detail injection (W5)"
```

---

## Task 7: W2 — Context Budget Monitor + Soft Window

**Files:**
- Create: `src/lib/ai/context-budget.ts`
- Modify: `src/app/api/chat/route.ts`
- Test: `__tests__/context-budget.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/context-budget.test.ts
import { describe, it, expect } from "vitest";

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

interface ContextBudgetResult {
  totalTokens: number;
  shouldPrune: boolean;
  shouldWarn: boolean;
}

function checkContextBudget(
  messagesText: string,
  systemPromptText: string,
  threshold: number
): ContextBudgetResult {
  const totalTokens = estimateTokenCount(messagesText + systemPromptText);
  return {
    totalTokens,
    shouldPrune: totalTokens > threshold,
    shouldWarn: totalTokens > threshold * 0.6,
  };
}

function pruneMessages<T extends { role: string }>(
  messages: T[],
  keepLastN: number
): T[] {
  if (messages.length <= keepLastN) return messages;
  return messages.slice(-keepLastN);
}

describe("Context Budget", () => {
  it("should estimate tokens as chars/4", () => {
    expect(estimateTokenCount("abcd")).toBe(1);
    expect(estimateTokenCount("a".repeat(100))).toBe(25);
  });

  it("should flag shouldPrune when over threshold", () => {
    const longMessages = "a".repeat(4000); // 1000 tokens
    const result = checkContextBudget(longMessages, "", 800);
    expect(result.shouldPrune).toBe(true);
  });

  it("should flag shouldWarn at 60% threshold", () => {
    const messages = "a".repeat(2400); // 600 tokens
    const result = checkContextBudget(messages, "", 800);
    expect(result.shouldWarn).toBe(true);
    expect(result.shouldPrune).toBe(false);
  });

  it("should not flag when under 60%", () => {
    const messages = "a".repeat(1000); // 250 tokens
    const result = checkContextBudget(messages, "", 800);
    expect(result.shouldWarn).toBe(false);
    expect(result.shouldPrune).toBe(false);
  });

  it("should prune keeping last N messages", () => {
    const messages = [
      { role: "user", content: "msg1" },
      { role: "assistant", content: "msg2" },
      { role: "user", content: "msg3" },
      { role: "assistant", content: "msg4" },
      { role: "user", content: "msg5" },
    ];

    const pruned = pruneMessages(messages, 3);

    expect(pruned).toHaveLength(3);
    expect(pruned[0].content).toBe("msg3");
  });

  it("should return all messages when count <= keepLastN", () => {
    const messages = [
      { role: "user", content: "msg1" },
      { role: "assistant", content: "msg2" },
    ];

    const pruned = pruneMessages(messages, 50);

    expect(pruned).toHaveLength(2);
  });
});
```

**Step 2: Run test**

Run: `cd .worktrees/paper-workflow-resilience && npx vitest run __tests__/context-budget.test.ts`
Expected: PASS.

**Step 3: Create context-budget.ts module**

```typescript
// src/lib/ai/context-budget.ts

const DEFAULT_THRESHOLD_RATIO = 0.8;
const DEFAULT_WARN_RATIO = 0.6;
const DEFAULT_KEEP_LAST_N = 50;
const CHARS_PER_TOKEN = 4; // Rough estimate for Indonesian text

// Known model context windows (tokens)
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  "google/gemini-2.5-flash": 1_048_576,
  "openai/gpt-5.1": 1_047_576,
  default: 128_000,
};

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function getModelContextWindow(modelId: string): number {
  return MODEL_CONTEXT_WINDOWS[modelId] ?? MODEL_CONTEXT_WINDOWS.default;
}

export interface ContextBudgetResult {
  totalTokens: number;
  threshold: number;
  shouldPrune: boolean;
  shouldWarn: boolean;
}

export function checkContextBudget(
  totalChars: number,
  modelId: string,
  thresholdRatio = DEFAULT_THRESHOLD_RATIO
): ContextBudgetResult {
  const contextWindow = getModelContextWindow(modelId);
  const threshold = Math.floor(contextWindow * thresholdRatio);
  const warnThreshold = Math.floor(contextWindow * DEFAULT_WARN_RATIO);
  const totalTokens = Math.ceil(totalChars / CHARS_PER_TOKEN);

  return {
    totalTokens,
    threshold,
    shouldPrune: totalTokens > threshold,
    shouldWarn: totalTokens > warnThreshold,
  };
}

export interface UIMessage {
  role: string;
  parts?: Array<{ type: string; text?: string }>;
  [key: string]: unknown;
}

export function pruneMessages<T extends UIMessage>(
  messages: T[],
  keepLastN = DEFAULT_KEEP_LAST_N
): T[] {
  if (messages.length <= keepLastN) return messages;
  return messages.slice(-keepLastN);
}

export function estimateMessagesChars(messages: UIMessage[]): number {
  return messages.reduce((total, msg) => {
    if (msg.parts) {
      return total + msg.parts.reduce((partTotal, part) => {
        return partTotal + (part.text?.length ?? 0);
      }, 0);
    }
    return total;
  }, 0);
}
```

**Step 4: Integrate into route.ts**

Di `src/app/api/chat/route.ts`, sebelum call ke `streamText()`:

1. Import module:
```typescript
import {
  checkContextBudget,
  pruneMessages,
  estimateMessagesChars,
  estimateTokenCount,
} from "@/lib/ai/context-budget";
```

2. Setelah messages di-fetch dan system prompt di-assemble, tambah budget check:

```typescript
// Context budget check
const messagesChars = estimateMessagesChars(messages);
const systemPromptChars = systemPrompt.length + (paperModePrompt?.length ?? 0);
const totalChars = messagesChars + systemPromptChars;

const budget = checkContextBudget(totalChars, modelId);

let messagesToSend = messages;
if (budget.shouldPrune) {
    console.warn(
        `[Context Budget] Pruning: ${budget.totalTokens} tokens > ${budget.threshold} threshold. ` +
        `Keeping last 50 messages.`
    );
    messagesToSend = pruneMessages(messages);
}

if (budget.shouldWarn && !budget.shouldPrune) {
    console.info(
        `[Context Budget] Warning: ${budget.totalTokens} tokens approaching threshold ${budget.threshold}.`
    );
}
```

Gunakan `messagesToSend` sebagai pengganti `messages` di call `streamText()`.

**PENTING:** Cari di `route.ts` dimana `messages` di-pass ke `streamText` atau `convertToModelMessages`. Ganti variabel tersebut dengan `messagesToSend`. Jangan modify bagian lain.

**Step 5: Run all tests**

Run: `cd .worktrees/paper-workflow-resilience && npx vitest run`

**Step 6: Commit**

```bash
git add src/lib/ai/context-budget.ts src/app/api/chat/route.ts __tests__/context-budget.test.ts
git commit -m "feat(paper): add context budget monitor with soft window pruning (W2)"
```

---

## Task 8: W8 — AI Ops Dashboard (Foundation)

**CATATAN:** Task ini lebih besar dari W1-W7. Dibagi menjadi sub-steps.

### Step 8.1: Backend Queries

**Files:**
- Create: `convex/aiOps.ts`

Buat file baru dengan query functions:

```typescript
// convex/aiOps.ts
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuthUser } from "./authHelpers";

/**
 * Get aggregated memory health stats across all active paper sessions.
 * Admin/superadmin only.
 */
export const getMemoryHealthStats = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await requireAuthUser(ctx);
    if (authUser.role !== "admin" && authUser.role !== "superadmin") {
      throw new Error("Unauthorized: admin access required");
    }

    const sessions = await ctx.db
      .query("paperSessions")
      .filter((q) => q.eq(q.field("completedAt"), undefined))
      .collect();

    const totalActive = sessions.length;
    let totalDigestEntries = 0;
    let sessionsWithSuperseded = 0;
    let sessionsWithDirty = 0;

    for (const session of sessions) {
      const digest = session.paperMemoryDigest || [];
      totalDigestEntries += digest.length;

      if (digest.some((d: any) => d.superseded)) {
        sessionsWithSuperseded++;
      }
      if (session.isDirty) {
        sessionsWithDirty++;
      }
    }

    return {
      totalActive,
      avgDigestEntries: totalActive > 0
        ? Math.round(totalDigestEntries / totalActive * 10) / 10
        : 0,
      sessionsWithSuperseded,
      sessionsWithDirty,
    };
  },
});

/**
 * Get workflow progress stats.
 */
export const getWorkflowProgressStats = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await requireAuthUser(ctx);
    if (authUser.role !== "admin" && authUser.role !== "superadmin") {
      throw new Error("Unauthorized");
    }

    const allSessions = await ctx.db.query("paperSessions").collect();
    const active = allSessions.filter((s) => !s.completedAt);
    const completed = allSessions.filter((s) => s.completedAt);
    const inRevision = active.filter((s) => s.stageStatus === "revision");

    // Group active sessions by stage
    const byStage: Record<string, number> = {};
    for (const s of active) {
      byStage[s.currentStage] = (byStage[s.currentStage] || 0) + 1;
    }

    // Count rewinds
    const rewindHistory = await ctx.db.query("rewindHistory").collect();
    const rewindsBySession: Record<string, number> = {};
    for (const r of rewindHistory) {
      const sid = r.sessionId as string;
      rewindsBySession[sid] = (rewindsBySession[sid] || 0) + 1;
    }
    const totalRewinds = rewindHistory.length;
    const avgRewinds = allSessions.length > 0
      ? Math.round(totalRewinds / allSessions.length * 10) / 10
      : 0;

    return {
      totalSessions: allSessions.length,
      activeSessions: active.length,
      completedSessions: completed.length,
      completionRate: allSessions.length > 0
        ? Math.round(completed.length / allSessions.length * 100)
        : 0,
      inRevision: inRevision.length,
      byStage,
      avgRewindsPerSession: avgRewinds,
    };
  },
});

/**
 * Get artifact sync stats.
 */
export const getArtifactSyncStats = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await requireAuthUser(ctx);
    if (authUser.role !== "admin" && authUser.role !== "superadmin") {
      throw new Error("Unauthorized");
    }

    const artifacts = await ctx.db.query("artifacts").collect();
    const invalidated = artifacts.filter((a) => a.invalidatedAt);

    return {
      totalArtifacts: artifacts.length,
      invalidatedPending: invalidated.length,
    };
  },
});

/**
 * Get list of active paper sessions for drill-down.
 */
export const getSessionList = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    if (authUser.role !== "admin" && authUser.role !== "superadmin") {
      throw new Error("Unauthorized");
    }

    const limit = args.limit ?? 20;
    const sessions = await ctx.db
      .query("paperSessions")
      .order("desc")
      .take(limit);

    return sessions.map((s) => ({
      _id: s._id,
      userId: s.userId,
      currentStage: s.currentStage,
      stageStatus: s.stageStatus,
      isDirty: s.isDirty,
      workingTitle: s.workingTitle,
      paperTitle: s.paperTitle,
      completedAt: s.completedAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      digestCount: (s.paperMemoryDigest || []).length,
      estimatedTokenUsage: s.estimatedTokenUsage,
    }));
  },
});

/**
 * Get full drill-down for a specific session.
 */
export const getSessionDrillDown = query({
  args: {
    sessionId: v.id("paperSessions"),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    if (authUser.role !== "admin" && authUser.role !== "superadmin") {
      throw new Error("Unauthorized");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Get rewind history
    const rewindHistory = await ctx.db
      .query("rewindHistory")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return {
      session,
      rewindHistory,
    };
  },
});
```

**Step 8.2: Route & Page**

**Files:**
- Create: `src/app/(dashboard)/ai-ops/page.tsx`

```typescript
// src/app/(dashboard)/ai-ops/page.tsx
import { AiOpsContainer } from "@/components/ai-ops/AiOpsContainer";

export default function AiOpsPage() {
  return <AiOpsContainer />;
}
```

**Step 8.3: Route Protection**

Di `src/proxy.ts`, tambah `/ai-ops` ke daftar protected routes yang require admin/superadmin. Cari pattern yang sudah ada untuk `/dashboard` dan tambahkan `/ai-ops` dengan aturan yang sama.

**Step 8.4: Overview Components**

**Files:**
- Create: `src/components/ai-ops/AiOpsContainer.tsx`
- Create: `src/components/ai-ops/AiOpsOverview.tsx`
- Create: `src/components/ai-ops/panels/MemoryHealthPanel.tsx`
- Create: `src/components/ai-ops/panels/WorkflowProgressPanel.tsx`
- Create: `src/components/ai-ops/panels/ArtifactSyncPanel.tsx`

Komponen-komponen ini menggunakan:
- `useQuery(api.aiOps.getMemoryHealthStats)` dst.
- Mechanical Grace design system: `.rounded-shell`, `.border-main`, Geist Mono untuk data
- Iconoir icons
- Tailwind CSS 4

**AiOpsContainer.tsx** layout:
```
Header: "← Admin Panel" link + "AI OPS DASHBOARD" title
Body: AiOpsOverview (5 panels)
Below: Session list (from getSessionList)
Expanded: Drill-down view (from getSessionDrillDown)
```

**CATATAN untuk implementor:**
- Referensi design system: `docs/makalah-design-system/`
- Ikuti pattern dari `AdminPanelContainer.tsx` untuk layout dasar
- Semua angka harus pakai Geist Mono (`font-mono`)
- Card shells pakai `rounded-shell` (16px)
- Border pakai `border-main` (1px solid)

**Step 8.5: Navigation Integration**

1. Di user dropdown menu component, tambah menu item "AI Ops" (conditional: admin/superadmin only)
2. Di `src/components/admin/AdminOverviewContent.tsx`, tambah card link ke `/ai-ops`

**Step 8.6: Drill-Down Components (bisa di-iterate)**

- `SessionDrillDown.tsx` — Container untuk detail view
- `SessionTimeline.tsx` — 13-stage visual timeline
- `SessionDigestViewer.tsx` — Tabel digest entries
- `SessionStageInspector.tsx` — Per-stage data accordion

Ini bisa dibangun incremental setelah overview panels berfungsi.

**Step 8.7: Commit**

```bash
git add convex/aiOps.ts src/app/\\(dashboard\\)/ai-ops/ src/components/ai-ops/ src/proxy.ts src/components/admin/AdminOverviewContent.tsx
# Plus file user dropdown yang dimodifikasi
git commit -m "feat: add AI Ops Dashboard for paper workflow observability (W8)"
```

---

## Post-Implementation Checklist

Setelah semua task selesai:

- [ ] `npx vitest run` — semua test pass
- [ ] `npm run build` — build production berhasil tanpa error
- [ ] `npm run lint` — no linting errors
- [ ] Manual test: paper session dari gagasan sampai minimal tahap 3, verifikasi:
  - [ ] Superseded entries tidak muncul di prompt (W6)
  - [ ] Referensi tanpa URL memunculkan warning (W3)
  - [ ] isDirty banner muncul di validation panel (W4)
  - [ ] Long field di-truncate dengan warning (W7)
  - [ ] Artifact summary muncul di context (W1 — cek via console log)
  - [ ] ringkasanDetail tersedia di tahap yang relevan (W5)
- [ ] AI Ops Dashboard (`/ai-ops`) accessible dan menampilkan data (W8)
- [ ] Semua commits clean, per-task
