# Paper Workflow Resilience — Design Document

**Goal:** Perbaiki system memory, anti-hallucination, context window management, dan observability pada 13-stage paper writing workflow. Incremental approach — ship per fitur, tanpa refactor besar.

**Branch:** `fix/paper-workflow-resilience`
**Worktree:** `.worktrees/paper-workflow-resilience/`

**Scope:**
- 7 kelemahan teridentifikasi (W1-W7) + 1 fitur baru (W8)
- Fokus: fix pain points sekarang + antisipasi masalah masa depan
- Constraint: tidak mengubah flow utama paper workflow, hanya memperkuat infrastruktur pendukung

**Key References:**
- Riset workflow: `docs/paper-writing-workflow/README.md`
- Riset memory & context: `docs/system-memory-context-window/sistem_memory_strategi_konteks_window.md`
- Paper workflow code: `src/lib/ai/paper-stages/`, `src/lib/ai/paper-tools.ts`, `src/lib/ai/paper-mode-prompt.ts`
- Backend: `convex/paperSessions.ts`, `convex/paperSessions/constants.ts`, `convex/artifacts.ts`
- Admin panel: `src/components/admin/`, `src/app/(dashboard)/dashboard/page.tsx`

---

## Daftar Kelemahan & Solusi

| # | Kelemahan | Solusi | Effort | Impact |
|---|-----------|--------|--------|--------|
| W1 | Artifact content tidak auto-injected ke context tahap selanjutnya | Artifact Summary Injection | Medium | High |
| W2 | Tidak ada message windowing / token budget tracking | Context Budget Monitor + Soft Window | Medium | Medium |
| W3 | Web search guard berbasis regex, bypassable | Source Validation di backend | Low | High |
| W4 | isDirty flag tidak dipakai di UI | Warning Banner di Validation Panel | Low | Medium |
| W5 | Ringkasan extreme compression (200 char) kehilangan nuansa | Dual-Layer Ringkasan | Medium | High |
| W6 | Paper Memory Digest tidak pernah di-prune | Filter superseded saat format prompt | Low | Low |
| W7 | Stage data field tidak ada size limit | Truncate di mutation + warning | Low | Low |
| W8 | Tidak ada observability untuk engine health | AI Ops Dashboard (halaman terpisah) | High | High |

**Urutan implementasi** (highest impact + lowest effort first):

1. W6 — Filter superseded digest entries
2. W3 — Source validation (URL wajib pada referensi)
3. W4 — isDirty warning banner
4. W7 — Field size truncation
5. W1 — Artifact summary injection
6. W5 — Dual-layer ringkasan
7. W2 — Context budget monitor + soft window
8. W8 — AI Ops Dashboard

W8 sengaja terakhir karena dashboard consume data dari W2, W3, W4. Infrastruktur harus jalan dulu sebelum ada yang di-monitor.

---

## W1: Artifact Summary Injection

**Masalah:** AI di tahap 10 tidak bisa baca konten artifact dari tahap 4. Hanya punya ringkasan 200 char dari digest. Detail penting (outline lengkap, draft abstrak, daftar pustaka) hilang dari "ingatan" AI.

**Solusi:** Saat format stageData untuk prompt injection, auto-fetch artifact content dari tahap yang sudah selesai, truncate ke 500 char per artifact, inject ke prompt.

**Files yang dimodifikasi:**
- `src/lib/ai/paper-stages/formatStageData.ts` — Tambah fungsi `formatArtifactSummaries()`
- `src/lib/ai/paper-mode-prompt.ts` — Include artifact summaries dalam prompt assembly

**Mekanisme:**
1. `formatStageData()` iterasi semua tahap selesai yang punya `artifactId`
2. Untuk setiap artifact, fetch `content` dari database
3. Truncate content ke 500 char, append label tahap
4. Inject sebagai section "RINGKASAN ARTIFACT TAHAP SELESAI" di prompt

**Format output di prompt:**
```
RINGKASAN ARTIFACT TAHAP SELESAI:
- [Gagasan Paper] "Ide: dampak AI terhadap metode pembelajaran di perguruan tinggi Indonesia, dengan fokus pada..."
- [Menyusun Outline] "BAB 1: Pendahuluan (1500 kata) — 1.1 Latar Belakang, 1.2 Rumusan Masalah..."
- [Penyusunan Abstrak] "Penelitian ini bertujuan menganalisis dampak penerapan AI dalam proses..."
```

**Overhead estimasi:**
- Per artifact: ~500 char + ~50 char label = ~550 char
- Tahap akhir (13 artifacts max): ~7.150 char (~1.788 token)
- Dibanding Gemini 1M window: ~0.17% — negligible

**Approach yang ditolak:**
- On-Demand Retrieval (tambah tool `getArtifactContent`): AI harus "ingat" untuk panggil — sering lupa
- Full Artifact Injection: Bisa 50.000+ char, wasteful

---

## W2: Context Budget Monitor + Soft Window

**Masalah:** Semua pesan conversation dikirim ke model tanpa pruning atau tracking. Tidak ada estimasi seberapa dekat ke context limit. Saat ini aman (Gemini 1M), tapi fragile kalau switch model atau session sangat panjang.

**Solusi:** Hitung estimasi token sebelum kirim ke model. Kalau melebihi threshold, prune pesan lama tapi pertahankan system prompt + paper context + N pesan terakhir. Log pruning events.

**Files yang dimodifikasi:**
- `src/app/api/chat/route.ts` — Tambah pre-flight context budget check
- `src/lib/ai/context-budget.ts` — File baru: token estimator + pruning logic
- `convex/systemAlerts.ts` — Tambah alert types baru

**Mekanisme:**

1. **Token Estimator**
   - Fungsi `estimateTokenCount(messages, systemPrompt, paperContext)`
   - Estimasi sederhana: total chars / 4 (rata-rata bahasa Indonesia)
   - Return: `{ totalTokens, breakdown: { system, paper, messages } }`

2. **Budget Threshold**
   - Configurable per model (default: 80% of model context window)
   - Gemini 2.5 Flash: threshold = 800.000 tokens
   - GPT-5.1 fallback: threshold = 800.000 tokens
   - Bisa di-override via `aiProviderConfigs` table

3. **Soft Window (pruning)**
   - Kalau `totalTokens > threshold`:
     - Keep: system prompt + paper context (selalu utuh)
     - Keep: 50 pesan terakhir (configurable)
     - Prune: pesan lebih lama dari 50 terakhir
   - Paper Memory Digest menjadi pengganti natural untuk pesan yang di-prune
   - Log event ke `systemAlerts` dengan type `context_pruning_executed`

4. **Warning tanpa pruning**
   - Kalau `totalTokens > 60% threshold`: log `context_budget_warning` (info severity)
   - Tidak ada aksi, hanya logging untuk observability (W8)

**Kenapa bukan progressive summarization:**
- Butuh extra LLM call per pruning event
- Tambah latency dan cost
- Paper Memory Digest sudah jadi "natural summary" — nggak perlu summarize lagi

---

## W3: Source Validation di Backend

**Masalah:** 3-layer web search protection berbasis regex pada natural language. AI bisa bypass dengan phrasing yang tidak tertangkap pattern. Referensi bisa di-hallucinate tanpa terdeteksi.

**Solusi:** Validasi di backend bahwa setiap referensi yang disimpan via `updateStageData` punya field `url` yang non-empty. Referensi tanpa URL menghasilkan warning.

**Files yang dimodifikasi:**
- `convex/paperSessions.ts` — Tambah validasi di `updateStageData` mutation
- `convex/systemAlerts.ts` — Log referensi tanpa URL

**Mekanisme:**

1. **Deteksi field referensi**
   - Field yang dicek: `referensiAwal`, `referensiPendukung`, `referensi`, `sitasiAPA`, `sitasiTambahan`
   - Cek dilakukan setelah `normalizeReferensiData()` (yang sudah parse string → object)

2. **Validasi per entry**
   - Setiap object dalam array referensi harus punya `url` yang non-empty string
   - Entry tanpa URL: tidak di-reject (biar nggak block flow), tapi ditandai

3. **Response ke AI**
   - Kalau ada entry tanpa URL: return warning message bersama success
   - Warning: "Referensi tanpa URL terdeteksi ([count] dari [total]). Semua referensi WAJIB dari google_search."
   - AI menerima feedback langsung bahwa referensinya suspect

4. **Logging**
   - Log ke `systemAlerts` dengan type `reference_no_url_rejected`, severity `warning`
   - Metadata: sessionId, stage, count referensi tanpa URL

**Kenapa warning bukan hard error:**
- Ada edge case legitimate: user manually kasih referensi tanpa URL
- Hard error bisa block workflow unnecessarily
- Warning cukup sebagai signal ke AI + logging ke admin

---

## W4: isDirty Warning Banner

**Masalah:** `isDirty` flag di-track di backend (set true saat user edit/regenerate pesan setelah stageData disimpan), tapi tidak ada UI indicator. User tidak tahu stageData sudah desync dengan chat.

**Solusi:** Tampilkan warning banner di validation panel saat `isDirty === true`.

**Files yang dimodifikasi:**
- Komponen validation panel di `src/components/paper/` — Tambah conditional warning banner
- Opsional: `convex/systemAlerts.ts` — Log kalau stage di-approve saat dirty

**Mekanisme:**

1. **Kondisi tampil**
   - `session.isDirty === true` DAN `session.stageStatus === "pending_validation"`
   - Banner muncul di atas tombol Approve/Revise

2. **Konten banner**
   - Icon warning + teks: "Percakapan telah berubah sejak data tahap terakhir disimpan. Sebaiknya minta AI menyinkronkan data sebelum menyetujui."
   - Tombol opsional: "Minta AI Sinkronkan" (kirim pesan otomatis ke AI)

3. **Behavior**
   - Banner bersifat **advisory**, tidak blocking
   - Tombol Approve tetap aktif — user boleh approve meskipun dirty (keputusannya di tangan user)
   - Kalau user approve saat dirty: log ke `systemAlerts` type `session_dirty_approved`

4. **Clear isDirty**
   - Setelah AI call `updateStageData` → isDirty otomatis reset ke false (sudah ada di backend)

---

## W5: Dual-Layer Ringkasan

**Masalah:** Ringkasan 200 char (di digest) dan 280 char (di stageData) kehilangan nuansa diskusi. AI di tahap akhir tidak ingat detail keputusan dari tahap awal.

**Solusi:** Pertahankan `ringkasan` (short, 280 char) untuk digest. Tambah field `ringkasanDetail` (long, max 1.000 char) yang di-inject selektif ke prompt.

**Files yang dimodifikasi:**
- `convex/paperSessions/types.ts` — Tambah field `ringkasanDetail` di setiap stage data type
- `convex/paperSessions.ts` — Update `STAGE_KEY_WHITELIST` untuk include `ringkasanDetail`
- `src/lib/ai/paper-tools.ts` — Update tool description untuk encourage AI mengisi field baru
- `src/lib/ai/paper-stages/formatStageData.ts` — Inject `ringkasanDetail` selektif

**Mekanisme:**

1. **Field baru: `ringkasanDetail`**
   - Optional string, max 1.000 char
   - Konten: elaborasi dari ringkasan — detail keputusan, alasan pemilihan angle, nuansa yang disepakati
   - Tidak wajib untuk approval (hanya ringkasan yang wajib)

2. **Tool description update**
   - `updateStageData` tool description ditambah:
     "Field ringkasanDetail (opsional, max 1000 char): Elaborasi detail dari ringkasan. Jelaskan MENGAPA keputusan ini diambil, nuansa yang disepakati, dan konteks penting yang tidak muat di ringkasan 280 char."

3. **Selective injection di prompt**
   - Tidak inject ringkasanDetail dari SEMUA tahap (hemat token)
   - Inject hanya untuk **3 tahap terakhir** yang selesai sebelum tahap aktif
   - Contoh: di tahap 8 (Hasil), inject detail dari tahap 5, 6, 7
   - Alasan: tahap yang lebih dekat lebih relevan; tahap jauh cukup ringkasan short

4. **Format di prompt**
   ```
   RINGKASAN TAHAP SELESAI:
   - Gagasan Paper: [ringkasan 280 char]
   - Penentuan Topik: [ringkasan 280 char]
   - Menyusun Outline: [ringkasan 280 char]
   - Penyusunan Abstrak: [ringkasan 280 char]
   - Pendahuluan (DETAIL): [ringkasanDetail 1000 char]
   - Tinjauan Literatur (DETAIL): [ringkasanDetail 1000 char]
   - Metodologi (DETAIL): [ringkasanDetail 1000 char]
   === TAHAP 8: Hasil Penelitian [DALAM PROSES] ===
   ```

**Overhead estimasi:**
- 3 tahap × 1.000 char = 3.000 char (~750 token)
- Tahap lain tetap pakai ringkasan short (280 char)

**Kenapa bukan naikkan limit ringkasan saja:**
- Naikkan ke 800 char untuk semua tahap = bloat di digest (13 × 800 = 10.400 char)
- Dual-layer: digest tetap compact, detail hanya di-inject saat relevan

---

## W6: Filter Superseded Digest Entries

**Masalah:** Paper Memory Digest tidak pernah di-prune. Entries dari rewind (ditandai `superseded: true`) tetap dikirim ke AI. Multiple rewind cycles bisa accumulate 20+ entries, AI melihat keputusan lama dan baru sekaligus.

**Solusi:** Filter entries dengan `superseded: true` saat format digest untuk prompt injection. Data tetap di database untuk audit trail.

**Files yang dimodifikasi:**
- `src/lib/ai/paper-stages/formatStageData.ts` — Filter di `formatRingkasanTahapSelesai()`

**Mekanisme:**

1. Di fungsi yang render digest ke prompt, tambah filter:
   - Sebelum render, exclude entries dimana `superseded === true`
   - Hanya keputusan current yang muncul di prompt AI

2. Data di database tidak berubah:
   - Superseded entries tetap di `paperMemoryDigest` array
   - Tersedia untuk audit trail dan AI Ops Dashboard (W8)

**Scope perubahan:** Satu filter condition di satu fungsi.

---

## W7: Field Size Truncation

**Masalah:** AI bisa save teks sangat panjang ke field stageData (e.g., `analisis`, `ideKasar`). Tidak ada char limit di backend. Risiko: database bloat + prompt overflow saat field di-inject.

**Solusi:** Truncate field teks ke max 2.000 char di `updateStageData` mutation. Return warning ke AI kalau truncation terjadi.

**Files yang dimodifikasi:**
- `convex/paperSessions.ts` — Tambah truncation logic di `updateStageData` mutation

**Mekanisme:**

1. **Setelah key whitelist validation**, iterasi setiap field di `data` object
2. **Untuk string fields** (bukan array, bukan ID, bukan number):
   - Kalau `field.length > 2000`: truncate ke 2.000 char
   - Catat field mana yang kena truncate
3. **Exception:** `ringkasan` sudah punya Zod validation 280 char, `ringkasanDetail` max 1.000 char — limit terpisah
4. **Return warning:** Kalau ada truncation:
   - "Field [fieldName] di-truncate dari [original] ke 2000 karakter."
   - AI menerima feedback langsung

**Kenapa 2.000 char:**
- Cukup besar untuk konten substantif (sekitar 300 kata)
- Prompt injection via `formatStageData` sudah truncate ke 1.000 char (`SUMMARY_CHAR_LIMIT`)
- 2.000 char di database memberi ruang untuk future use tanpa bloat

---

## W8: AI Ops Dashboard

**Masalah:** Tidak ada observability untuk kesehatan engine paper workflow. Admin tidak bisa monitor memory state, context usage, anti-hallucination effectiveness, atau workflow health tanpa buka database langsung.

**Solusi:** Halaman dashboard terpisah di route `/ai-ops`, accessible dari user dropdown menu (admin/superadmin) dan link di admin panel overview.

### Arsitektur

**Route:** `/ai-ops` — top-level route, protected untuk admin/superadmin
**Layout:** Full-width, tanpa sidebar admin panel
**Akses:**
1. User dropdown menu — menu item "AI Ops" (hanya admin/superadmin)
2. Admin Panel overview — card link "AI Ops Dashboard"
3. Header AI Ops — link kembali ke Admin Panel

### Struktur File

```
src/app/(dashboard)/ai-ops/
└── page.tsx

src/components/ai-ops/
├── AiOpsContainer.tsx
├── AiOpsOverview.tsx
├── panels/
│   ├── MemoryHealthPanel.tsx
│   ├── ContextBudgetPanel.tsx
│   ├── AntiHallucinationPanel.tsx
│   ├── ArtifactSyncPanel.tsx
│   └── WorkflowProgressPanel.tsx
└── drill-down/
    ├── SessionDrillDown.tsx
    ├── SessionTimeline.tsx
    ├── SessionDigestViewer.tsx
    ├── SessionContextChart.tsx
    ├── SessionStageInspector.tsx
    └── SessionRewindHistory.tsx
```

### Level 1: Overview Panels

5 panel ringkasan yang langsung terlihat saat buka halaman:

**Panel 1: Memory Health**
| Metric | Data Source |
|--------|------------|
| Total active paper sessions | `paperSessions` count where `completedAt` null |
| Avg digest entries per session | `paperMemoryDigest` array length |
| Sessions with superseded entries | Count sessions with `superseded: true` in digest |
| Sessions with isDirty flag | Count sessions with `isDirty === true` |

**Panel 2: Context Budget**
| Metric | Data Source |
|--------|------------|
| Avg estimated context size (tokens) | Dari W2 logging |
| Sessions approaching threshold (>60%) | Dari W2 warning logs |
| Pruning events (last 7 days) | `systemAlerts` type `context_pruning_executed` |
| Largest context session | Max estimated tokens across active sessions |

**Panel 3: Anti-Hallucination**
| Metric | Data Source |
|--------|------------|
| Referensi tanpa URL (last 7 days) | `systemAlerts` type `reference_no_url_rejected` |
| Stages with incomplete research | `paperSessions` where referensi count < minimum |
| Web search guard trigger rate | Dari W3 logging |

**Panel 4: Artifact Sync**
| Metric | Data Source |
|--------|------------|
| Artifacts pending update (invalidated) | `artifacts` where `invalidatedAt` not null |
| Orphaned artifacts (no stage link) | `artifacts` without matching `artifactId` in any stageData |
| Avg artifact versions per session | `artifacts` version field average |

**Panel 5: Workflow Progress**
| Metric | Data Source |
|--------|------------|
| Active sessions by current stage | Group by `currentStage` |
| Completion rate (completed / total) | `completedAt` not null / total |
| Avg rewinds per session | `rewindHistory` count per session |
| Sessions in revision status | `stageStatus === "revision"` count |

### Level 2: Per-Session Drill-Down

Halaman overview menampilkan list active paper sessions. Klik session membuka drill-down view:

**Section 1: Session Timeline**
- Visual horizontal timeline 13 stages
- Warna per status: approved (hijau), current/drafting (amber), future (abu-abu), invalidated (merah dashed)
- Rewind events ditandai sebagai "jump back" arrows

**Section 2: Digest Viewer**
- Tabel semua digest entries: stage, decision text, timestamp
- Entries superseded ditandai warna berbeda (strikethrough atau opacity rendah)
- Current entries di-highlight

**Section 3: Context Size Tracker**
- Estimasi token breakdown per komponen: system prompt, paper context, messages
- Threshold line (80% capacity)
- Indicator kalau pernah pruning

**Section 4: Stage Data Inspector**
- Per-stage accordion: ringkasan, ringkasanDetail, field sizes (char count), artifact link, isDirty status
- Flag field yang mendekati truncation limit

**Section 5: Rewind History**
- Timeline rewind events: from stage → to stage
- List invalidated artifacts per rewind
- Timestamps

**Section 6: Referensi Audit**
- Per-stage: jumlah referensi, berapa yang punya URL, berapa yang tidak
- Flag tahap yang belum memenuhi minimum referensi requirement

### Alert Types Baru

Dashboard consume data dari `systemAlerts`. Alert types yang perlu ditambahkan oleh W2, W3, W4:

| Alert Type | Severity | Trigger | Source |
|------------|----------|---------|--------|
| `context_budget_warning` | info | Context > 60% threshold | W2 |
| `context_pruning_executed` | warning | Messages pruned | W2 |
| `reference_no_url_rejected` | warning | Referensi tanpa URL terdeteksi | W3 |
| `stage_research_incomplete` | info | Stage di-submit tapi referensi belum cukup | W3 |
| `session_dirty_approved` | warning | Stage di-approve saat isDirty true | W4 |
| `artifact_orphaned` | info | Artifact tanpa stage link | W8 (periodic check) |

### Backend Queries (Convex)

File baru: `convex/aiOps.ts` — query functions khusus untuk dashboard

Queries yang dibutuhkan:
1. `getMemoryHealthStats()` — Agregasi paper session memory metrics
2. `getContextBudgetStats()` — Agregasi context usage dari alerts
3. `getAntiHallucinationStats()` — Agregasi referensi validation dari alerts
4. `getArtifactSyncStats()` — Artifact invalidation dan orphan metrics
5. `getWorkflowProgressStats()` — Stage distribution dan completion metrics
6. `getSessionList({ filter? })` — List sessions untuk drill-down selection
7. `getSessionDrillDown({ sessionId })` — Full detail satu session

### Route Protection

Di `src/proxy.ts`, tambah `/ai-ops` ke daftar protected routes dengan requirement `admin` atau `superadmin` role.

### Navigation Integration

1. **User dropdown** (`src/components/` — komponen header/user menu):
   - Tambah menu item "AI Ops" dengan icon (misal: Activity dari Iconoir)
   - Conditional render: hanya tampil kalau `user.role === "admin" || user.role === "superadmin"`

2. **Admin Panel overview** (`src/components/admin/AdminOverviewContent.tsx`):
   - Tambah card link: "AI Ops Dashboard — Monitor kesehatan paper workflow engine"
   - Link ke `/ai-ops`

---

## Dependency Graph

```
W6 (filter superseded)
 └── standalone, no dependencies

W3 (source validation)
 └── standalone, no dependencies

W4 (isDirty banner)
 └── standalone, no dependencies

W7 (field truncation)
 └── standalone, no dependencies

W1 (artifact summary injection)
 └── standalone, no dependencies

W5 (dual-layer ringkasan)
 └── depends on: W7 (truncation guard should exist before adding new fields)

W2 (context budget monitor)
 └── benefits from: W1, W5, W6 (accurate context size after these optimizations)

W8 (AI Ops Dashboard)
 └── depends on: W2 (context budget data), W3 (referensi validation logs), W4 (isDirty logs)
 └── benefits from: all W1-W7 being in place
```

---

## Estimasi Context Budget Setelah Semua Perbaikan

Perbandingan total context yang di-inject ke prompt AI, sebelum dan sesudah perbaikan:

**Tahap akhir (stage 10+), skenario terburuk:**

| Komponen | Sebelum | Sesudah | Delta |
|----------|---------|---------|-------|
| Base paper mode prompt | ~1.100 chars | ~1.100 chars | 0 |
| Stage instructions (current only) | ~3.000 chars | ~3.000 chars | 0 |
| Ringkasan tahap selesai | ~2.500 chars | ~2.500 chars | 0 |
| RingkasanDetail (3 tahap terakhir) | — | +3.000 chars | +3.000 |
| Artifact summaries (semua tahap) | — | +7.150 chars | +7.150 |
| Active stage data | ~2.000 chars | ~2.000 chars | 0 |
| **Total** | **~8.600 chars** | **~18.750 chars** | **+10.150** |
| **Estimasi token** | **~2.150** | **~4.688** | **+2.538** |

Total ~4.688 token di tahap akhir — masih hanya ~0.47% dari Gemini 1M window. Overhead sangat aman.

---

## Testing Strategy

Setiap W harus punya validasi sebelum merge:

| W | Validasi |
|---|----------|
| W6 | Unit test: formatRingkasan excludes superseded entries |
| W3 | Unit test: updateStageData returns warning for URL-less referensi |
| W4 | Manual test: isDirty banner muncul saat expected |
| W7 | Unit test: field truncation + warning message |
| W1 | Unit test: formatArtifactSummaries output format + truncation |
| W5 | Unit test: ringkasanDetail injection hanya 3 tahap terakhir |
| W2 | Unit test: estimateTokenCount accuracy, pruning threshold logic |
| W8 | Manual test: dashboard renders, drill-down works, data accurate |

---

## Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| W1/W5 menambah prompt size | Estimasi menunjukkan overhead ~2.500 token — aman di 1M window. W2 (budget monitor) sebagai safety net |
| W3 warning (bukan hard error) bisa diabaikan AI | Logging ke systemAlerts memastikan admin tahu. Bisa di-escalate ke hard error kalau pattern terus terjadi |
| W5 ringkasanDetail tidak diisi AI | Field optional — kalau kosong, fallback ke ringkasan short. Tidak blocking |
| W8 banyak queries bisa impact performance | Queries read-only, bisa di-cache. Pagination di session list. Dashboard hanya diakses admin |
| Perubahan schema stageData (W5) perlu migration | ringkasanDetail optional field — backward compatible, data existing tetap valid |
