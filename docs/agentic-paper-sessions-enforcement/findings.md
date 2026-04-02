# Findings — Paper Sessions Enforcement

> Source: `context-verified-state.md` (audited 2026-04-03)
> Semua line number diverifikasi terhadap kode aktual.

---

## Masalah Utama

6 masalah, diorganisasi dari perspektif produk — bukan dari perspektif kode.

```
┌─────────────────────────────────────────────────────────────────────┐
│  F1: Ringkasan Redundant                                            │
│  Fondasi teknis — harus selesai duluan supaya instruction rewrite    │
│  di F2-F4 gak conflict dengan ringkasan requirement                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│  F2: Gagasan Belum Jadi Hub                                         │
│  Stage gagasan harus dimaksimalkan sebagai pusat diskusi +           │
│  pencarian referensi (non-akademik + akademik).                     │
│  Topik harus derivation-only (hapus search).                        │
│  Tinjauan literatur harus deep academic search.                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│  F3: Fungsi Agentic Tidak Jalan                                     │
│  Post-gagasan+topik, agent harus otonom: generate draft,            │
│  update progress, present for review. Sekarang masih minta          │
│  permission di setiap langkah.                                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│  F4: Artifact Bukan Workspace                                       │
│  Artifact harus jadi tempat kerja (v1 draft → v2 revisi → ...).     │
│  Sekarang cuma display case di akhir. Tools exist, instructions     │
│  yang salah arah.                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  F5: Task Progress Blind to Chat                    [independent]   │
│  Task card cuma update dari stageData fields.                       │
│  Benefits dari F1 selesai (incremental save tanpa ringkasan).       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  F6: Choice Card Stays Interactive                  [independent]   │
│  Buttons gak disabled setelah user confirm.                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Urutan Pengerjaan

| # | Finding | Layer | Scope | Kenapa urutan ini |
|---|---------|-------|-------|-------------------|
| 1 | **F1: Ringkasan Redundant** | Data + Backend | Medium | Fondasi — menyederhanakan tool schema sebelum instruction rewrite |
| 2 | **F2: Gagasan Belum Jadi Hub** | Instructions | Large | Defines search allocation + stage roles yang jadi dasar F3+F4 |
| 3 | **F3: Fungsi Agentic Tidak Jalan** | Instructions | Medium | Depends on stage roles dari F2 |
| 4 | **F4: Artifact Bukan Workspace** | Instructions | Medium | Depends on agentic flow dari F3 |
| 5 | **F5: Task Progress** | Data + UI | Medium | Benefits dari F1 (no ringkasan in partial saves) |
| 6 | **F6: Choice Card** | UI | Small | Independent, kapan saja |

---

## F1: Ringkasan Redundant

**Status:** Not started

### Problem

Model harus generate 3 output per stage: artifact content, ringkasan (280 chars), ringkasanDetail (1000 chars). Ringkasan adalah versi pendek dari artifact yang sama — redundant. Boros token, boros effort model. Dan selama ringkasan masih required di `updateStageData`, setiap perubahan lain (agentic flow, incremental saves) harus tetap generate ringkasan.

### Evidence

| Component | Location | Current behavior |
|-----------|----------|-----------------|
| Tool schema | paper-tools.ts:147 | `ringkasan: z.string().max(280)` — **REQUIRED** |
| Tool schema | paper-tools.ts:151 | `ringkasanDetail: z.string().max(1000)` — optional |
| Submit guard | paperSessions.ts:996 | Blocks if ringkasan empty |
| Submit guard | paperSessions.ts:1007 | Blocks if artifactId missing |
| Context builder | formatStageData.ts:177 | Reads `data.ringkasan` for completed stage summaries |
| Context builder | formatStageData.ts (15+ lines) | Every stage formatter outputs `data.ringkasan` |
| Artifact summaries | paper-mode-prompt.ts:239 → formatStageData.ts:761 | Also injects artifact title+content — redundant with ringkasan |
| Stage instructions | All paper-stages/*.ts | "RINGKASAN REQUIRED — APPROVAL WILL FAIL WITHOUT IT!" |
| compileDaftarPustaka | paper-tools.ts:260-261 | Also requires ringkasan for persist mode |

### Expected outcome

- `ringkasan` dan `ringkasanDetail` dihapus dari `updateStageData` tool schema
- Submit guard cukup cek artifact exists (hapus ringkasan guard)
- `formatStageData` derive completed stage context dari artifact (title + truncated content)
- Stage instructions dihapus warning "RINGKASAN REQUIRED"
- `compileDaftarPustaka` persist mode gak perlu ringkasan

### Files to modify

- `src/lib/ai/paper-tools.ts` — remove ringkasan from schema
- `convex/paperSessions.ts` — remove ringkasan guard from submitForValidation
- `src/lib/ai/paper-stages/formatStageData.ts` — refactor to read artifact content
- `src/lib/ai/paper-stages/foundation.ts` — remove ringkasan warnings
- `src/lib/ai/paper-stages/core.ts` — remove ringkasan warnings
- `src/lib/ai/paper-stages/results.ts` — remove ringkasan warnings
- `src/lib/ai/paper-stages/finalization.ts` — remove ringkasan warnings
- `src/lib/ai/paper-mode-prompt.ts` — remove ringkasan references in general rules
- `src/lib/paper/stage-types.ts` — remove ringkasan from type definitions
- `convex/paperSessions.test.ts` — update tests

### Risk

- Breaking change: existing sessions di DB punya ringkasan tapi mungkin belum punya artifact. `formatStageData` harus gracefully handle: prefer artifact, fallback ke ringkasan kalau artifact belum ada.

---

## F2: Gagasan Belum Jadi Hub

**Status:** Not started

### Problem

Stage gagasan seharusnya jadi pusat dari seluruh paper — tempat diskusi dimaksimalkan dan referensi dikumpulkan. Tapi sekarang gagasan diperlakukan sama seperti stage lain: optional search, generic flow. Akibatnya:

1. **Gagasan dangkal** — search cuma "if needed", bukan proactive. Padahal kalau gagasan lemah, seluruh paper lemah.
2. **Topik masih ada search** (foundation.ts:219) — padahal topik cuma merumuskan dari bahan gagasan. Search di topik buang waktu dan token.
3. **Tinjauan literatur generic** — pola search-nya sama persis dengan stage lain (core.ts:362). Padahal ini satu-satunya stage selain gagasan yang butuh deep search.
4. **Stage lain punya search** — pendahuluan, metodologi, dll punya instruksi search padahal gak perlu. Semua bahan harusnya sudah tersedia dari gagasan + tinjauan literatur.

### Evidence

**Key fact (context-verified-state.md Section 2):** "All search instructions use the same pattern. No differentiation between 'dual search', 'academic-only', or 'no search' modes." — semua stage diperlakukan identik.

**Current search tools available to model** (defined in paper-tools.ts, post-search only):

| Tool | Location | Purpose |
|------|----------|---------|
| `inspectSourceDocument` | paper-tools.ts:416 | Query specific indexed source |
| `quoteFromSource` | paper-tools.ts:504 | Search within indexed source |
| `searchAcrossSources` | paper-tools.ts:548 | Semantic search across all indexed sources |

These tools operate on ALREADY-INDEXED sources (from web search results). The model cannot initiate new web searches via tools — it requests search via chat, and the system triggers web search externally. This means search allocation is entirely instruction-driven.

**Current per-stage search instructions:**

| Stage | Location | Current search instruction | Expected |
|-------|----------|---------------------------|----------|
| gagasan | foundation.ts:78,105-110 | "If needed... request a web search for literature exploration" | **Dual search proactive**: non-akademik (berita, opini, data) + akademik (jurnal, paper) |
| topik | foundation.ts:219,246-251 | "request a web search for more specific literature" | **No search** — derivation only |
| pendahuluan | core.ts:216 | "Request a web search if additional supporting data is needed" | **No search** — bahan dari gagasan |
| tinjauan_literatur | core.ts:362 | "Request a web search for deeper literature exploration" | **Deep academic search** — proactive, teori, framework |
| metodologi | core.ts:490-503 | No explicit search in flow | **No search** — correct as-is |
| hasil → kesimpulan | results.ts | Passive/optional | **No search** — correct as-is |
| finalization | finalization.ts | Passive | **No search** — correct as-is |

### Expected outcome — 4 Stage Modes

**Mode 1: Discussion + Dual Search (gagasan only)**
- Diskusi dimaksimalkan — brainstorming, eksplorasi ide, debat angle
- Search proactive dua macam:
  - Non-akademik: berita, opini, data populer (konteks + feasibility)
  - Akademik: jurnal, paper, studi (referensi awal + gap identification)
- Semua bahan research ditumpuk di sini — ini fondasi seluruh paper

**Mode 2: Derivation (topik only)**
- Hapus search — bahan sudah ada dari gagasan
- Agent derive topik definitif dari bahan yang sudah dikumpulkan
- User review dan confirm

**Mode 3: Review (abstrak, pendahuluan, metodologi, hasil, diskusi, kesimpulan, all finalization)**
- Agent generate draft otomatis dari bahan gagasan + topik + stage sebelumnya
- User review dan approve/revise di artifact
- Bukan diskusi — agent sudah punya semua bahan, tinggal execute
- Tidak ada search

**Mode 4: Deep Academic Search (tinjauan_literatur only)**
- Search akademik yang lebih dalam dari gagasan
- Focus: jurnal spesifik, studi empiris, theoretical frameworks
- Proactive — agent inisiasi search, bukan tunggu user minta

### Files to modify

- `src/lib/ai/paper-stages/foundation.ts` — gagasan: dual search proactive; topik: hapus search, mode derivasi
- `src/lib/ai/paper-stages/core.ts` — abstrak/pendahuluan/metodologi: review mode; tinjauan_literatur: deep academic search
- `src/lib/ai/paper-stages/results.ts` — semua review mode
- `src/lib/ai/paper-stages/finalization.ts` — semua review mode
- `src/lib/ai/paper-mode-prompt.ts` — general rule yang distinguish 4 modes

### Risk

- Instruction rewrite besar — 14 stage instructions. Harus di-test manual per stage.
- Depends on F1: kalau ringkasan masih required, review mode instructions conflict (model harus generate ringkasan sebelum bisa submit, menghambat flow otonom).

---

## F3: Fungsi Agentic Tidak Jalan

**Status:** Not started

### Problem

Setelah gagasan + topik settle, agent seharusnya bisa generate draft secara otonom. Tapi sekarang agent masih minta permission di setiap langkah. Flow yang terjadi:

```
Current:  Agent draft → "What do you think?" → User responds → Agent draft lagi → "What do you think?" → ...
Expected: Agent generate draft ke artifact → Present for review → User approve/revise → Next stage
```

### Evidence

| Component | Location | Current behavior |
|-----------|----------|-----------------|
| System rule | paper-mode-prompt.ts:284 | "DISCUSS FIRST before drafting" — applies to ALL stages |
| System rule | paper-mode-prompt.ts:297 | "submitStageForValidation() ONLY after user EXPLICITLY confirms" |
| Stage flows | All EXPECTED FLOW blocks | "Ask: What do you think?" at every stage |
| PROACTIVE COLLABORATION | 14 occurrences across all stage files | "Draft X, then ask for feedback" — every stage |

### Root cause

Dua lapisan instruction yang enforce permission:
1. **System-wide** (paper-mode-prompt.ts) — "DISCUSS FIRST" applies tanpa kecuali
2. **Per-stage** (EXPECTED FLOW + PROACTIVE COLLABORATION) — every stage template includes "ask for feedback"

Tidak ada mekanisme untuk membedakan stage yang butuh diskusi (gagasan) vs stage yang harusnya otonom (review mode stages).

### Expected outcome

- **Discussion stages** (gagasan, topik): permission required — diskusi dulu, user involved
- **Review stages** (semua setelah topik, kecuali tinjauan_literatur search phase): agent generates autonomously
  - Generate draft langsung ke artifact (v1)
  - Update task progress
  - Present for review — user approve, revise, atau reject
  - Tidak ada "What do you think?" loop
- **Deep search stage** (tinjauan_literatur): agent proactively search, then generate review

### Interaction with F2

F2 defines the 4 stage modes. F3 implements the behavioral consequence:
- Mode 1 (Discussion) → permission loop OK
- Mode 2 (Derivation) → semi-autonomous (derive, present for confirm)
- Mode 3 (Review) → fully autonomous (generate, present)
- Mode 4 (Deep Search) → autonomous search + generate

### Files to modify

- `src/lib/ai/paper-mode-prompt.ts` — make "DISCUSS FIRST" conditional on stage mode, not universal
- `src/lib/ai/paper-stages/core.ts` — remove "Ask: What do you think?" from review mode stages
- `src/lib/ai/paper-stages/results.ts` — same
- `src/lib/ai/paper-stages/finalization.ts` — same
- `src/lib/ai/paper-stages/foundation.ts` — topik: semi-autonomous derive+confirm

### Risk

- Tightly coupled with F2 (stage roles define which stages are autonomous).
- Model compliance: even with instructions changed, model might still ask permission out of habit (training bias toward helpfulness/asking). Perlu enforcement wording yang kuat.

---

## F4: Artifact Bukan Workspace

**Status:** Not started

### Problem

Artifact seharusnya jadi tempat kerja — di-create early sebagai working draft (v1), di-update seiring diskusi (v2, v3...). Tapi sekarang artifact cuma display case: dibuat di akhir sebagai copy dari apa yang sudah ditulis di chat.

Masalahnya bukan tools — `createArtifact` (route.ts:1400) dan `updateArtifact` (route.ts:1554) ada dan functional. Versioning backend (version field, parentId chain, getVersionHistory) ready. **Yang salah adalah instructions yang mengarahkan model untuk draft di chat dulu.**

### Evidence

| Component | Location | Current behavior |
|-----------|----------|-----------------|
| System rule | paper-mode-prompt.ts:284 | "DISCUSS FIRST before drafting" |
| System rule | paper-mode-prompt.ts:294 | "Artifact is the FINAL OUTPUT reviewed by user" |
| Stage flows | All EXPECTED FLOW blocks | Discuss → Draft in chat → Iterate → Save → createArtifact at end |
| createArtifact | route.ts:1400 | Tool exists, functional |
| updateArtifact | route.ts:1554 | Tool exists, functional |
| Versioning | convex/artifacts.ts:519 | version increment + parentId chain works |
| Artifact reminder | route.ts:2203-2206 | Only fires when save/submit intent detected without artifact — too late |
| Auto-patch | route.ts:1523-1535 | `createArtifact` auto-links `artifactId` to stageData via `updateStageData` — model doesn't need to do this manually |

**Key infrastructure fact:** `createArtifact` already auto-patches `artifactId` into stageData (route.ts:1523-1535). This means once the model calls `createArtifact`, the artifact is automatically linked to the stage. The model only needs to call `updateArtifact` for subsequent revisions. Infrastructure is ready — instructions are the bottleneck.

### Expected outcome

- **Review mode stages**: Agent create artifact IMMEDIATELY as v1 working draft
- Diskusi di chat → revisi artifact via `updateArtifact` → v2, v3, ...
- Chat berisi diskusi pendek + pointer ke artifact, BUKAN draft panjang
- Final artifact version = input untuk stage berikutnya (read by `formatStageData`)
- "Artifact is the WORKING DRAFT", bukan "Artifact is the FINAL OUTPUT"

### Interaction with F3

F3 makes the agent autonomous → F4 defines WHERE the autonomous output goes (artifact, not chat).

Tanpa F4, agent yang otonom (F3) akan dump draft panjang di chat — lebih parah dari sekarang. F3 dan F4 harus dikerjakan berurutan.

### Files to modify

- `src/lib/ai/paper-mode-prompt.ts` — rewrite "DISCUSS FIRST before drafting" dan "Artifact is the FINAL OUTPUT"
- `src/lib/ai/paper-stages/*.ts` — rewrite all EXPECTED FLOW blocks: createArtifact early, updateArtifact on revision
- `src/lib/ai/paper-stages/formatStageData.ts` — read artifact content for next stage context (if not already done in F1)

### Risk

- Depends on F3: autonomous agent harus tahu output ke artifact, bukan chat.
- Model compliance: perlu testing apakah model benar-benar create artifact early vs fall back ke chat drafting.
- Interaction with artifact reminder (route.ts:2203-2206): may need revision since artifact should be created earlier now, not just before submit.

---

## F5: Task Progress Blind to Chat

**Status:** Not started

### Problem

Task card hanya update saat `updateStageData()` dipanggil. User bisa diskusi 10 turn tanpa task card berubah. UX-nya bikin user gak tahu sudah sejauh mana.

### Evidence

| Component | Location | Current behavior |
|-----------|----------|-----------------|
| Task derivation | task-derivation.ts:155 | `deriveTaskList(stageId, stageData)` — fields only |
| Trigger | MessageBubble.tsx:255 | useMemo on stageData change only |
| UI | UnifiedProcessCard.tsx | Renders from taskSummary.tasks — "complete" or "pending" |

### Expected outcome

- Task progress update lebih sering
- Model proactively call `updateStageData` dengan partial progress setelah setiap keputusan penting

### Recommended approach

**Instruction-driven** (simpler, sesuai prinsip "tools simple, skills provide intelligence"):
- Tambah instruction di paper-mode-prompt.ts: "Call updateStageData after every significant decision to reflect progress"
- Ini jadi jauh lebih feasible setelah F1 selesai — tanpa ringkasan sebagai required field, `updateStageData` bisa dipanggil ringan untuk partial saves

### Files to modify

- `src/lib/ai/paper-mode-prompt.ts` — add incremental save rule
- `src/lib/ai/paper-stages/*.ts` — add specific incremental save points per stage

### Risk

- Depends on F1: kalau ringkasan masih required, setiap partial save butuh model generate ringkasan — terlalu berat untuk incremental updates.
- Model compliance: instruction-driven approach bergantung pada model patuh. Tapi ini sesuai prinsip CLAUDE.md: "Tools must be simple executors. Skills provide intelligence."

---

## F6: Choice Card Stays Interactive

**Status:** Not started

### Problem

Setelah user confirm pilihan di choice card, semua button tetap clickable. User bisa re-click, potentially causing state confusion.

### Evidence

| Component | Location | Current behavior |
|-----------|----------|-----------------|
| Card builder | compile-choice-spec.ts:132 | `disabled: false` hardcoded |
| Button component | ChoiceOptionButton.tsx:23 | `disabled` passed through, never set to true |

### Expected outcome

- Setelah user submit pilihan, semua option buttons disabled
- Visual feedback: selected option highlighted, others grayed out

### Files to modify

- `src/lib/json-render/compile-choice-spec.ts` — conditional disable logic
- `src/components/chat/json-renderer/components/ChoiceOptionButton.tsx` — disabled styling

### Risk

- Minimal. Isolated UI change. Independent dari semua finding lain.
