# Branch Review Handoff

> Baca ini PERTAMA sebelum mulai kerja di sesi baru.
> Branch: `feature/paper-ui-harness-rev-enforcement`
> Worktree: `.worktrees/plan-task-queue-components` (directory name unchanged)
> Renamed from: `feature/plan-task-queue-components`

## Scope Branch Ini

Branch ini BUKAN hanya UI components. Scope mencakup:

1. **UI layer** — UnifiedProcessCard, task derivation, plan card, CoT indicator
2. **Harness layer** — incremental save, mature save mode, auto-present validation
3. **Integration layer** — route.ts wiring, prepareStep chain, system notes
4. **Contract layer** — prompt wording migration (explicit-confirm → auto-present)
5. **Safety layer** — artifact guard, OCC fix, queue/dedup

Semua layer saling terkait. Review harus per-layer, bukan per-file.

## Status

- 83 commits dari main (termasuk 1 WIP commit terakhir: `e8d62d79`)
- 63 files changed, 11,228 insertions, 173 deletions
- 72 tests pass
- Runtime behavior: **BELUM VERIFIED end-to-end**
- Known crash (normalizeChoiceSpec null) sudah di-fix
- Known OCC storm sudah di-fix (queue/dedup)
- Known anomali: model output 577 chars di search turn, model output code text instead of tool call — **root cause belum ditemukan**

## Dua Kategori Perubahan

### Kategori 1: UI (task-plan-cot-queue)
Komponen visual: UnifiedProcessCard, task derivation, plan card, CoT indicator.
**Relatif safe** — mostly self-contained React components.

Commits (chronological):
```
25b5f168 feat: add plan/task progress, chain-of-thought, and queue sidebar
401b1b41 refactor: unify ChainOfThought as universal indicator wrapper
c2b83b7f feat: upgrade TaskProgress to Plan card with stage description
ded4eed8 feat: add PLAN FIRST instruction to paper mode general rules
020e7d60 fix: reorder gagasan tasks to match actual flow
80c5e8bc refactor: independent field check, remove "active" status
13ebbedb fix: paginate deleteAllConversations to avoid 16MB read limit
32ea00d3 fix: Plan card shows per-message stage, not global currentStage
d01cdc28 feat: add UnifiedProcessCard component
08ce261a feat: wire UnifiedProcessCard into MessageBubble, remove TaskProgress + ChainOfThought
06c08ec2 refactor: share ProcessTool and SearchStatusData types
31feec25 fix(test): use getAllByText for duplicate text matches
8e38e082 fix: resolve lint error and test failures from UnifiedProcessCard migration
03885550 fix: prevent empty PROSES label when search status not rendered
c327895d fix: remove restrictive guard from UnifiedProcess debug logs
c534d856 fix: default UnifiedProcessCard to collapsed state
17702fa9 fix: 4 UI polish fixes
f64d96db fix: muted stage label color and larger chevron
d84e95e6 fix: replace triangle chevrons with NavArrowUp/Down icons
5795d4d8 fix: hide all pending loading indicators in paper mode
f6777b9e feat: integrate loading indicator into UnifiedProcessCard header
ccabea0a fix: amber gradient dots with sequential pulse animation
a71ec2df fix: suppress duplicate loading indicator in paper starter flow
57495083 fix: suppress standalone pending indicator during paper session loading
a8e3da52 fix: remove duplicate "Memproses..." label in UnifiedProcessCard header
```

Key files:
- `src/components/chat/UnifiedProcessCard.tsx` (new)
- `src/lib/paper/task-derivation.ts` (new)
- `src/lib/paper/__tests__/task-derivation.test.ts` (new)
- `src/components/chat/MessageBubble.tsx` (UI parts)
- `src/components/chat/ChatWindow.tsx` (UI parts)

### Kategori 2: Integrasi Fungsional (MASALAH BESAR)
Perubahan yang menyentuh runtime: route.ts, paper-tools.ts, harness, prompts, database.
**Ini sumber konflik** — tabrakan dengan search orchestrator, json-renderer yaml,
tools calling, Convex OCC.

Commits (chronological, termasuk docs dan WIP):
```
a8e917ac feat: force updateStageData after search via prepareStep
8565c7b0 fix: enforce save-after-search and elaborate compose output
77eced0b feat: add draft save field allowlist helpers for gagasan/topik
6a66a808 feat: add saveStageDraft tool with hard-gate, allowlist, and warning filter
ed87f960 feat: add buildIncrementalSavePrepareStep targeting saveStageDraft
9dc25356 feat: integrate incremental save harness into route.ts with gate wiring
c3390dad refactor: remove dead maxToolSteps/fallbackMaxToolSteps variables
b1a1cf59 feat: update prompt for incremental harness-driven saves
906e285c fix: address 3 review findings — prompt scope, exact-source priority, fallback safety
e088cfcf fix: remove availableExactSources guard that blocked incremental harness
99c85eaf fix: stop incremental harness after one draft save (REVERTED by 131b1ac7)
131b1ac7 Revert "fix: stop incremental harness after one draft save"
77104c4b fix: system note must instruct model to continue natural discussion after save
ca08c5a9 fix: don't restrict activeTools in step 1
c74cf040 fix: add stable key to JsonRendererChoiceBlock to prevent remount
866e4ba7 feat: harness enforces mature save when all draft fields complete
de865305 fix: add artifact readiness guard to submitForValidation mutation
ac93c7db docs(prompt): update submitStageForValidation contract — auto-present
fb912ca7 docs(prompt): align gagasan/topik stage instructions
9665b953 docs(prompt): align core stage instructions
70f54527 docs(prompt): align results stage instructions
3469f979 docs(prompt): align finalization stage instructions
20a1a51f test: update fixtures to reflect auto-present validation contract
98683b54 docs: clarify regex guard validity under auto-present contract
04db1441 fix: align migration seed text to auto-present validation contract
34f675d8 fix: catch 3 missed remnants in foundation.ts + 1 in resolver test
39be0367 feat: add [AutoPresent] observability logs for manual UI testing
e8d62d79 wip: uncommitted work from parallel sessions — needs review
```

Key files yang berisiko (runtime impact):
- `src/app/api/chat/route.ts` — prepareStep chain, system notes, tool wiring
- `src/lib/ai/paper-tools.ts` — saveStageDraft tool, queue/dedup
- `src/lib/ai/incremental-save-harness.ts` — harness logic + validationSubmit
- `src/lib/ai/paper-mode-prompt.ts` — prompt wording + activeStageArtifactContext
- `src/lib/ai/paper-stages/foundation.ts` — gagasan/topik instructions
- `src/lib/ai/paper-stages/core.ts` — 4 stage instructions
- `src/lib/ai/paper-stages/results.ts` — 3 stage instructions
- `src/lib/ai/paper-stages/finalization.ts` — 5 stage instructions
- `convex/paperSessions.ts` — artifact guard
- `src/lib/json-render/choice-payload.ts` — normalizeChoiceSpec
- `src/lib/chat/choice-request.ts` — isValidationChoiceInteractionEvent

## Known Integration Conflicts

1. **Harness vs Search Orchestrator**: Harness gak aktif saat enableWebSearch=true
   (guard ada). Tapi prompt wording yang changed (paper-mode-prompt + stage
   instructions) tetap di-load di search turn karena itu bagian dari system prompt
   paper mode. paperModePrompt sendiri EXCLUDED dari compose phase (line 553
   orchestrator.ts), tapi stage instructions masuk via skillInstructions.
   VERIFIED: skill instructions (`src/lib/ai/skills/`) dan orchestrator
   (`src/lib/ai/web-search/orchestrator.ts`) TIDAK berubah antara main dan branch
   ini (zero diff). Compose path untuk search turn identical dengan main.
   Anomali 577 chars kemungkinan dari conversation history (turn 1 garbage
   masuk compose context), bukan dari perubahan compose path.

2. **saveStageDraft vs Convex OCC**: Harness force saveStageDraft multiple kali.
   Setiap call → updateStageData mutation → OCC kalau parallel. FIXED: queue/dedup
   di paper-tools.ts serialize calls per conversation + dedup identical field+value.
   72 tests pass termasuk regression tests.

3. **prepareStep chain**: 4+ levels (exactSource → sync → validationSubmit →
   incrementalSave) plus forcedToolChoice terpisah. Semua gated by `!enableWebSearch`
   dan mutual exclusion checks. Tapi interaction belum fully tested end-to-end.

4. **normalizeChoiceSpec**: Function baru di choice-payload.ts. Had null crash
   saat value di elements map = null. FIXED: null guard added. 8 tests pass.
   Tapi function ini baru dan belum battle-tested di semua spec variants.

5. **Model behavior anomali**: Pada saat UI test terakhir, model output cuma 577
   chars di search turn (seharusnya ribuan) dan model output code text instead of
   tool call di turn 1. Root cause belum ditemukan. Semua compose inputs di search
   path identical dengan main (verified via code analysis). Kemungkinan: interaksi
   antara conversation history (turn 1 garbage → turn 2 compose confused) atau
   perubahan di WIP commit yang belum di-isolate.

## Mekanisme Review

### Prinsip
- Review per-commit, dari tua ke baru
- Group by kategori: UI dulu, integrasi setelahnya
- Selang-seling drive: Claude atau user bisa memimpin review per stream
- Setiap finding harus berbasis evidence, bukan tebakan

### 3 Layer Verifikasi Per Commit/Stream

**Layer 1: Diff Review**
- Baca diff commit vs parent
- Identifikasi: apa yang berubah, file mana, lines mana
- Flag risiko: apakah perubahan ini menyentuh shared runtime path?
- Verdict awal: LIKELY SAFE / NEEDS TESTING / HIGH RISK

**Layer 2: Runtime Verify**
- Jalankan app, test di UI halaman chat
- Monitor terminal output untuk errors, OCC, anomali
- Khusus Kategori 2: test paper flow end-to-end
  - Start paper → session created
  - Search → output normal length (bukan 577 chars)
  - Harness → saveStageDraft tanpa OCC storm
  - Validation panel → muncul bersamaan artifact
  - yaml-spec cards → render normal
  - Choice buttons → gak reset setelah save

**Layer 3: Regression Check**
- `npx vitest run` targeted tests setelah setiap batch
- Minimal: semua test files yang related ke perubahan
- Full suite kalau perubahan touch shared modules (route.ts, paper-tools.ts)

### Deliverable Per Stream

Setelah review satu stream, hasilnya:
- **KEEP** — perubahan stable, bisa dipertahankan
- **REVISE** — konsep benar tapi implementasi perlu perbaikan. Tulis apa yang harus berubah.
- **DROP** — perubahan broken atau gak worth risikonya. Tulis kenapa dan impact ke stream lain.

### Urutan Review

```
1. Kategori 1: UI stream
   - Stream 1: Plan/Task/Queue/CoT (25b5f168 → 32ea00d3)
   - Stream 3: UnifiedProcessCard (d01cdc28 → ccabea0a)
   - Stream 3b: Pending indicator fixes (a71ec2df → a8e3da52)

2. Kategori 2: Integrasi stream
   - Stream 2: Backend revert + choice fix (4a6b7d73 → 28df4fb6)
   - Stream 4a: Early harness attempts (a8e917ac → 8565c7b0)
   - Stream 4b: Incremental save harness v1 (77eced0b → 866e4ba7)
   - Stream 5: Auto-present contract migration (ac93c7db → 39be0367)
   - Stream 6: WIP parallel session work (e8d62d79)
```

### Siapa Drive Apa

- **Claude**: diff review, code analysis, test execution, risk assessment
- **User**: UI testing, terminal monitoring, final verdict per stream, scope decisions

## Design Docs di Branch Ini

Referensi yang tetap valid terlepas dari review outcome:
- `docs/agent-harness/README.md` — harness status doc
- `docs/agent-harness/auto-present-validation-contract.md` — contract migration plan
- `docs/agent-harness/global-auto-present-design.md` — future global auto-present design
- `docs/agent-harness/branch-inventory.md` — full branch inventory
- `docs/agent-harness/readiness-evaluator-spec.md` — readiness evaluator spec
- `docs/plans/` — implementation plans (historical reference)
