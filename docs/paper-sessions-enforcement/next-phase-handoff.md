# Next Phase Handoff — Paper Sessions Enforcement

> Branch: rename ke `feature/paper-sessions-enforcement`
> Previous: `feature/paper-ui-harness-rev-enforcement`
> Date: 2026-04-02

## What Was Done

### Stabilization (commit d1cdac55)
- Backend dipersamakan dengan current main — harness code dihapus
- UI components (UnifiedProcessCard, SidebarQueueProgress, task-derivation) dipertahankan
- Artifact guard on submitForValidation dipertahankan

### Runtime Fixes (commits 4bafb6b0 → f1017bac)
- Error banner stuck selamanya → fixed (chatStatus recovery check)
- Missing currentStage prop → fixed (UnifiedProcessCard invisible)
- Transient Convex error → fixed (retryQuery)
- Task ordering mismatch → fixed (referensiAwal first)
- Missing choice card after search → fixed (mandatory prompt rule)
- Task label wrong → fixed ("Rumuskan topik definitif")
- Search ref delay → fixed (await appendSearchReferences)
- Inline reference inventory in paper mode → fixed (suppress)
- Deprecated message.content → fixed (parts-first)
- Raw setTimeout in route.ts → fixed (retryDelay utility)

### Still Open
- Finding #3: Choice card tetap interaktif setelah dikonfirmasi (intermittent, needs deeper investigation)

## What Needs To Be Done — Enforcement Targets

### Target 1: Agentic Flow — Autonomous Draft Generation

**Problem:** Setelah gagasan + topik settled, agent masih bertele-tele tanya permission di setiap step. Seharusnya lebih otonom.

**Expected behavior:**
- Stage outline sampai finalization: agent otomatis generate draft dari bahan yang sudah ada
- Plan/task update otomatis berdasarkan progress
- User hanya review + approve/revise di artifact panel
- Chat hanya untuk diskusi dan keputusan strategis, bukan permission loop

**How:** Harness redesign yang paham conversational state. Bukan prepareStep force tool (yang gagal di attempt pertama), tapi system notes yang instruct model: "All materials available. Generate draft in artifact, update task progress, present for review."

### Target 2: Artifact-First Drafting

**Problem:** Model tulis draft panjang di chat window, lalu create artifact di akhir sebagai "barang jadi". Chat jadi tempat draft — user scroll panjang. Artifact cuma jadi display case.

**Expected behavior:**
- Artifact dibuat lebih awal sebagai draft workspace
- Model update artifact incrementally (updateArtifact) saat diskusi progresses
- Chat hanya berisi diskusi, keputusan, dan pointers ke artifact
- User baca draft di artifact panel, bukan di chat scroll

**How:** Ubah stage instructions: "Create artifact EARLY as working draft. Use chat for discussion only. Update artifact as discussion matures. Do NOT write full draft content in chat messages."

### Target 3: Plan/Task Auto-Update

**Problem:** UnifiedProcessCard task progress hanya update dari stageData fields. Tapi banyak progress yang terjadi di chat (diskusi, keputusan) yang gak reflected di task card karena model gak call updateStageData.

**Expected behavior:**
- Task progress update seiring diskusi, bukan hanya saat explicit save
- Model proactively save partial progress ke stageData setelah setiap keputusan
- Card reflect real-time progress, bukan stale state

**How:** Ini butuh incremental save yang benar — bukan harness force (sudah gagal), tapi prompt instruction yang lebih kuat + model compliance enforcement.

## Target 4: Stage Role Architecture — Search & Discussion Allocation

**Problem:** Sekarang setiap stage pakai pola yang sama: diskusi → search → diskusi lagi → draft. Ini bikin flow bertele-tele dan fungsi agentik gak jalan. UX jelek karena user harus babysit di setiap stage.

**Design Decision:**

### Gagasan = Hub Stage (diskusi + search maksimal)
- **Diskusi dimaksimalkan di sini** — eksplorasi ide, debat angle, tentukan arah
- **Search dua macam:**
  - Non-akademik: berita, opini, data populer (untuk konteks dan feasibility)
  - Akademik: jurnal, paper, studi (untuk referensi awal dan gap identification)
- Semua bahan research ditumpuk di gagasan — ini jadi fondasi seluruh paper
- Ini satu-satunya stage yang benar-benar interaktif/diskusi

### Topik = Derivasi (tanpa search)
- Search di topik **tidak efektif** — bahan sudah ada dari gagasan
- Topik cuma merumuskan dari bahan yang sudah dikumpulkan
- Agent derive, user review

### Outline → Kesimpulan = Review Mode (agent generate, user review)
- Agent generate draft otomatis dari bahan gagasan + topik
- User review dan approve/revise di artifact
- **Bukan diskusi** — agent sudah punya semua bahan, tinggal execute
- Pengecualian: tinjauan literatur boleh search tambahan (pendalaman akademik)

### Tinjauan Literatur = Search Pendalaman
- Search akademik yang lebih dalam dari gagasan
- Focus: jurnal spesifik, studi empiris, theoretical frameworks
- Ini satu-satunya stage selain gagasan yang butuh search signifikan

### Impact ke Stage Instructions
- `foundation.ts` gagasan: tambah dual-search instruction (non-akademik + akademik)
- `foundation.ts` topik: hapus search trigger, mode derivasi
- `core.ts` + `results.ts` + `finalization.ts`: ubah ke review mode — "generate draft, present for review"
- `core.ts` tinjauan_literatur: pertahankan search, perkuat academic focus
- `paper-mode-prompt.ts`: general rule yang distinguish discussion stage vs review stage

---

## Files Reference

Key files untuk enforcement:
- `src/lib/ai/paper-mode-prompt.ts` — general rules, enforcement instructions
- `src/lib/ai/paper-stages/*.ts` — per-stage flow instructions
- `src/app/api/chat/route.ts` — backend orchestration
- `src/lib/paper/task-derivation.ts` — task definitions
- `src/components/chat/UnifiedProcessCard.tsx` — task progress UI

Design docs yang masih valid:
- `docs/agent-harness/anomaly-findings.md` — 6 findings dari harness attempt
- `docs/agent-harness/global-auto-present-design.md` — auto-present design (needs revision)
- `docs/agent-harness/readiness-evaluator-spec.md` — readiness evaluator (reference)
