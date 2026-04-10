# `src/agent/` Managed Mirror and Runtime Composition Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Membangun `src/agent/` sebagai repo-managed runtime architecture dan `src/agent/managed/` sebagai exported mirror untuk `system prompts` dan `stage skills`, tanpa mengubah DB sebagai canonical source of truth.

**Architecture:** Plan ini mengikuti desain dua-lajur: runtime access tetap membaca canonical content dari Convex melalui adapter, sementara `src/agent/managed/` hanya memuat snapshot exported mirror dengan sync pipeline surface-specific. Composition dipusatkan bertahap ke `src/agent/compose/` setelah prompt assets, adapters, dan managed mirror boundary stabil.

**Tech Stack:** Next.js App Router, TypeScript, Convex, Markdown docs, Git worktree, Vitest

---

## Scope dan Aturan Eksekusi

Plan ini menurunkan:

- `2026-04-09-design-doc-src-agent-managed-mirror-and-runtime-composition-v1.md`
- `2026-04-08-decision-record-final-migration-boundaries-v1.md`
- `2026-04-09-mirror-architecture-db-admin-agent-managed-runtime-v2.md`
- `2026-04-08-implementation-checklist-src-agent-migration-v1.md`

Aturan yang tidak boleh dilanggar:

1. DB tetap canonical untuk `systemPrompts`, `stageSkills`, dan `styleConstitutions`.
2. `src/agent/managed/` tidak boleh dibaca runtime sebagai authority prompt.
3. Importer `system prompts` dan `stage skills` wajib terpisah.
4. `style constitutions` tetap adapter-backed dan tidak masuk mirror scope awal.
5. `stage skills` harus mempertahankan markdown + frontmatter.

## PR Sequencing Rules

Plan ini harus dieksekusi sebagai **serangkaian PR kecil**, bukan satu branch dump besar.

Aturan PR:

1. satu PR hanya boleh punya satu tujuan arsitektural utama,
2. jangan campur `chat runtime`, `search runtime`, `paper mode`, `managed mirror`, dan `Refrasa` dalam satu PR kalau tidak mutlak perlu,
3. jangan gabungkan adapter core chat dengan adapter Refrasa dalam satu PR,
4. jangan gabungkan managed mirror pipeline dengan compose centralization dalam satu PR,
5. final verification boleh lintas-PR, tetapi commit implementasi harus tetap sempit dan bisa di-rollback.

Urutan PR terbaik:

1. namespace foundation
2. pure prompt asset moves per subdomain
3. runtime adapters untuk chat, paper, dan Refrasa constitution
4. inline prompt contract extraction
5. managed mirror foundation
6. system prompt mirror pipeline
7. stage skill mirror pipeline
8. compose centralization per flow
9. Refrasa prompt extraction and tool-contract follow-up

## Prasyarat

### Task 0: Baseline Verification dan Branch Hygiene

**Files:**
- Read: `docs/unified-prompts-skills-instructions/README.md`
- Read: `docs/unified-prompts-skills-instructions/2026-04-09-design-doc-src-agent-managed-mirror-and-runtime-composition-v1.md`
- Read: `docs/unified-prompts-skills-instructions/2026-04-08-implementation-checklist-src-agent-migration-v1.md`

**Step 1: Verifikasi dokumen anchor**

Pastikan tiga dokumen di atas dibaca penuh sebelum menyentuh kode.

**Step 2: Verifikasi worktree bersih dari perubahan implementasi yang bertabrakan**

Run:

```powershell
git status --short
```

Expected:

- hanya perubahan yang memang disengaja untuk task ini,
- tidak ada implementasi lain yang mengubah area `src/lib/ai/*`, `src/app/api/chat/route.ts`, `convex/systemPrompts.ts`, atau `convex/stageSkills.ts` tanpa ditinjau.

**Step 3: Verifikasi baseline static checks**

Run:

```powershell
npm run typecheck
npm run lint
```

Expected:

- baseline lulus, atau daftar failure saat ini tercatat jelas sebelum pekerjaan mulai.

**Step 4: Commit checkpoint bila perlu**

```bash
git commit --allow-empty -m "chore: mark baseline before src-agent migration"
```

## Phase 0

### Task 1: Bangun Namespace Foundation `src/agent/`

**Files:**
- Create: `src/agent/contracts/prompt-kinds.ts`
- Create: `src/agent/contracts/ownership.ts`
- Create: `src/agent/contracts/prompt-surface-status.ts`
- Create: `src/agent/contracts/managed-content.ts`
- Create: `src/agent/registry/prompt-registry.ts`
- Create: `src/agent/registry/skill-registry.ts`
- Create: `src/agent/registry/tool-instruction-registry.ts`
- Create: `src/agent/registry/managed-content-registry.ts`

**Step 1: Buat folder target**

Create:

- `src/agent/prompts/`
- `src/agent/skills/`
- `src/agent/adapters/`
- `src/agent/compose/`
- `src/agent/contracts/`
- `src/agent/registry/`
- `src/agent/managed/`
- `src/agent/sync/`

Catatan:

- pada task ini `managed/` dan `sync/` hanya dibuat sebagai placeholder namespace,
- jangan implementasikan semantics mirror, manifest, atau importer/exporter sampai Phase 3.

**Step 2: Definisikan taxonomy**

Pastikan contracts minimal mencakup:

- prompt kind
- prompt ownership
- prompt surface status
- managed content kind

Status wajib:

- `move_asset_now`
- `extract_contract_first`
- `wrap_with_adapter`
- `export_mirror`
- `keep_local`
- `keep_in_db`

Ownership wajib:

- `repo-managed`
- `admin-managed`
- `derived-from-db`
- `runtime-generated`
- `ops-managed`

**Step 3: Buat registry minimal**

Registry harus bisa mencatat:

- id surface
- current path
- target path
- ownership
- source
- migration status
- mirror scope bila relevan

**Step 4: Verifikasi typecheck**

Run:

```powershell
npm run typecheck
```

Expected:

- file contracts dan registry ter-compile tanpa memaksa caller lama pindah dulu.

**Step 5: Commit**

```bash
git add src/agent/contracts src/agent/registry
git commit -m "feat: add src-agent taxonomy and registries"
```

## Phase 1

### Task 2: Re-home Pure Prompt Assets

**Files:**
- Modify: `src/lib/ai/chat-config.ts`
- Modify: `src/lib/ai/paper-workflow-reminder.ts`
- Modify: `src/lib/ai/search-system-prompt.ts`
- Modify: `src/lib/ai/search-results-context.ts`
- Modify: `src/lib/ai/web-search/orchestrator.ts`
- Modify: `src/lib/ai/exact-source-guardrails.ts`
- Modify: `src/lib/json-render/choice-yaml-prompt.ts`
- Modify: `src/lib/ai/compaction-prompts.ts`
- Modify: `src/lib/ai/paper-stages/index.ts`
- Create: `src/agent/prompts/global/fallback-system-prompt.ts`
- Create: `src/agent/prompts/global/paper-workflow-reminder.ts`
- Create: `src/agent/prompts/search/retriever-system-prompt.ts`
- Create: `src/agent/prompts/search/retriever-user-augmentation.ts`
- Create: `src/agent/prompts/search/compose-phase-directive.ts`
- Create: `src/agent/prompts/search/search-results-context-prompt.ts`
- Create: `src/agent/prompts/runtime-notes/exact-source-inspection-rules.ts`
- Create: `src/agent/prompts/runtime-notes/source-provenance-rules.ts`
- Create: `src/agent/prompts/ui/choice-card-system-prompt.ts`
- Create: `src/agent/prompts/compaction/compaction-prompts.ts`
- Create: `src/agent/prompts/paper-stage-fallbacks/index.ts`

**Step 1: Pisahkan fallback system prompt dari side effect logging**

Hanya text prompt yang pindah ke `src/agent/prompts/global/fallback-system-prompt.ts`.

`logFallbackActivation()` tetap tinggal di `src/lib/ai/chat-config.ts`.

**Step 2: Pindahkan pure prompt assets lain**

Pindahkan dan update imports untuk:

- paper workflow reminder
- retriever prompt
- retriever augmentation
- compose phase directive
- exact-source rules
- source provenance rules
- choice card YAML prompt
- compaction prompts

Catatan batching:

- jangan jadikan task ini satu PR raksasa,
- pecah minimal menjadi tiga PR kecil:
  - PR A: `global/` + `paper-stage-fallbacks/`
  - PR B: `search/` assets
  - PR C: `runtime-notes/`, `ui/`, dan `compaction/`

**Step 3: Ekstrak text contract dari search-results context**

Jangan pindah branching logic-nya penuh. Pindahkan hanya text guidance ke `search-results-context-prompt.ts`.

**Step 3b: Audit paper-stages submodules sebelum relokasi**

Sebelum memindahkan fallback stage instructions, audit semua submodule di `src/lib/ai/paper-stages/` untuk memastikan:

- setiap stage yang terdaftar di `STAGE_SCOPE_VALUES` (`convex/stageSkills/constants.ts`) punya fallback instruction yang tidak undefined,
- switch statement di `paper-stages/index.ts` tidak silent-fail ke string kosong kalau stage name berubah,
- hasil audit dicatat sebelum relokasi supaya post-relokasi parity test bisa dibandingkan.

**Step 4: Ekstrak fallback stage instruction set**

Pindahkan text assets ke `src/agent/prompts/paper-stage-fallbacks/`, tetapi pertahankan resolver/domain logic yang masih dibutuhkan.

**Step 5: Daftarkan surface di prompt registry**

Tambahkan entries registry untuk semua asset yang dipindah.

**Step 6: Verifikasi targeted runtime**

Run:

```powershell
npm run typecheck
npm run lint
```

**Step 7: Verifikasi test kritikal**

Run:

```powershell
npx vitest run src/lib/ai/chat-exact-source-guardrails.test.ts src/lib/ai/web-search/orchestrator.exact-persist.test.ts
```

Expected:

- rules dan compose phase lama tetap parity.

**Step 8: Commit**

```bash
git add src/agent/prompts/global src/agent/prompts/paper-stage-fallbacks src/lib/ai/chat-config.ts src/lib/ai/paper-workflow-reminder.ts src/lib/ai/paper-stages
git commit -m "feat: move global and paper fallback prompt assets into src-agent"
```

Lanjutkan PR berikutnya dengan commit terpisah untuk `search/`, lalu commit terpisah lagi untuk `runtime-notes/`, `ui/`, dan `compaction/`.

### Task 3: Re-home File-Based Skill

**Files:**
- Modify: `src/lib/ai/skills/index.ts`
- Modify: runtime callers yang memuat `web-search-quality`
- Create: `src/agent/skills/search/web-search-quality/SKILL.md`
- Create: `src/agent/skills/search/web-search-quality/index.ts`

**Step 1: Pindahkan skill directory**

Pindahkan `web-search-quality` ke `src/agent/skills/search/web-search-quality/`.

Catatan FS dependency: `src/lib/ai/skills/web-search-quality/index.ts` memakai `fs.readFileSync` untuk load `SKILL.md` saat runtime. Pastikan path FS loader ikut di-update ke lokasi baru dan test loader tetap hijau setelah pindah.

**Step 2: Update loader**

Semua loader harus mengarah ke namespace baru tanpa mengubah behavior skill.

**Step 3: Daftarkan di registry**

Tambahkan skill entry ke registry terkait.

**Step 4: Verifikasi**

Run:

```powershell
npm run typecheck
npm run lint
```

**Step 5: Commit**

```bash
git add src/agent/skills src/lib/ai/skills
git commit -m "feat: move web search quality skill into src-agent"
```

## Phase 2

### Task 4: Tambahkan Runtime Adapters untuk DB-Managed Content

**Files:**
- Create: `src/agent/adapters/system-prompts.ts`
- Create: `src/agent/adapters/stage-skills.ts`
- Create: `src/agent/adapters/style-constitutions.ts`
- Modify: `src/lib/ai/chat-config.ts`
- Modify: `src/lib/ai/stage-skill-resolver.ts`
- Modify: `src/app/api/refrasa/route.ts`

**Step 1: Buat adapter system prompt**

Adapter harus membungkus akses ke active system prompt tanpa mengubah authority DB.

**Step 2: Buat adapter stage skill**

Adapter harus membedakan:

- fetch canonical skill content
- validation / augmentation yang tetap jadi concern runtime

Jangan pindahkan `ARTIFACT_CREATION_FOOTER` ke adapter.

**Step 3: Update consumers**

Update caller agar:

- `chat-config.ts` pakai adapter
- `stage-skill-resolver.ts` pakai adapter untuk fetch active skill

**Step 3b: Buat adapter style constitution dan update Refrasa route**

Adapter `src/agent/adapters/style-constitutions.ts` membungkus akses ke `getActiveConstitution` di `convex/styleConstitutions.ts` tanpa menyentuh mirror scope (constitution tetap di luar scope mirror awal).

Update `src/app/api/refrasa/route.ts` supaya memakai adapter ini, bukan direct Convex query. Jangan pindahkan prompt builder atau composition logic Refrasa di task ini — itu tetap ditunda ke Task 10.

Alasan constitution adapter masuk task ini: checklist Phase 2 eksplisit menaruh `src/agent/adapters/style-constitutions.ts` bareng adapter DB-managed lain. Boundary adapter harus uniform supaya compose centralization di Phase 4 tidak terblokir oleh adapter yang belum ada.

**Step 4: Verifikasi**

Run:

```powershell
npm run typecheck
npx vitest run src/lib/ai/stage-skill-resolver.test.ts src/lib/ai/stage-skill-validator.test.ts
```

**Step 5: Commit**

```bash
git add src/agent/adapters/system-prompts.ts src/agent/adapters/stage-skills.ts src/agent/adapters/style-constitutions.ts src/lib/ai/chat-config.ts src/lib/ai/stage-skill-resolver.ts src/app/api/refrasa/route.ts
git commit -m "feat: add runtime adapters for chat, paper, and refrasa constitution"
```

Catatan batching:

- constitution adapter masuk task ini karena boundary DB-managed adapter harus uniform dan tidak boleh tertunda,
- Refrasa prompt extraction dan tool-contract follow-up tetap ditunda ke Task 10,
- jangan mencampur Refrasa compose builder atau prompt contract extraction di task ini.

### Task 5: Ekstrak Inline Prompt Contracts dari Chat Route dan Choice Flow

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/lib/chat/choice-request.ts`
- Create: `src/agent/prompts/router/search-mode-router-prompt.ts`
- Create: `src/agent/prompts/runtime-notes/attachment-notes.ts`
- Create: `src/agent/prompts/runtime-notes/choice-context-notes.ts`
- Create: `src/agent/compose/build-choice-context-note.ts`

**Step 1: Ekstrak router prompt**

Pindahkan string router prompt ke `search-mode-router-prompt.ts`.

**Step 2: Ekstrak attachment note**

Pindahkan attachment first-response instruction ke `attachment-notes.ts`.

**Step 3: Pisahkan choice context contract**

Pindahkan text contract dari `buildChoiceContextNote()` ke `choice-context-notes.ts`.

Validation dan finalize heuristics tetap di modul domain.

**Step 4: Tambahkan builder compose bila dibutuhkan**

Kalau choice context sudah cukup besar, buat `build-choice-context-note.ts` sebagai compose helper.

**Step 5: Verifikasi**

Run:

```powershell
npm run typecheck
npx vitest run src/lib/chat/__tests__/choice-request.test.ts
```

**Step 6: Commit**

```bash
git add src/agent/prompts/router src/agent/prompts/runtime-notes src/agent/compose/build-choice-context-note.ts src/app/api/chat/route.ts src/lib/chat/choice-request.ts
git commit -m "feat: extract inline route and choice prompt contracts"
```

## Phase 3

### Task 6: Implement Managed Mirror Foundation

**Files:**
- Create: `src/agent/managed/README.md`
- Create: `src/agent/managed/manifest.json`
- Create: `src/agent/managed/checksums/system-prompts.json`
- Create: `src/agent/managed/checksums/stage-skills.json`
- Create: `src/agent/sync/sync-types.ts`
- Create: `src/agent/sync/compute-content-hash.ts`
- Create: `src/agent/sync/diff-managed-vs-db.ts`

**Step 1: Buat structure mirror root**

Struktur minimal:

- `managed/README.md`
- `managed/manifest.json`
- `managed/checksums/*`

**Step 2: Definisikan sync types**

Type minimal:

- system prompt export shape
- stage skill export shape
- sync metadata shape
- checksum manifest shape

Sync metadata shape wajib include (per design doc Section 6 Sync Invariants):

- `creatorEmail` (string) — durable audit trail; bukan hanya user id Convex (6.2).
- `createdAt`, `updatedAt`, `publishedAt`, `activatedAt` — ISO timestamps original dari DB (6.1).
- `version` (number) — dengan uniqueness constraint per `rootId` untuk system prompts atau per `skillRefId` untuk stage skills (6.3).
- `sourceEntity` — pembeda `systemPrompt` vs `stageSkill`.

**Step 3: Tambahkan diff utility**

`diff-managed-vs-db.ts` harus bisa membandingkan snapshot mirror dengan hasil baca canonical DB.

**Step 4: Verifikasi**

Run:

```powershell
npm run typecheck
```

**Step 5: Commit**

```bash
git add src/agent/managed src/agent/sync
git commit -m "feat: add managed mirror foundation"
```

### Task 7: Implement System Prompt Mirror Pipeline

**Files:**
- Create: `src/agent/sync/parse-system-prompt-file.ts`
- Create: `src/agent/sync/serialize-system-prompt-file.ts`
- Create: `src/agent/sync/export-system-prompts.ts`
- Create: `src/agent/sync/import-system-prompts.ts`
- Modify: `src/agent/managed/manifest.json`

**Step 1: Implement parser dan serializer**

Format authority mirror:

- `current.content.md`
- `meta.json`
- `versions/*.md`

**Step 2: Implement exporter**

Exporter harus membaca:

- active chain
- version chain
- metadata canonical: `createdAt`, `updatedAt`, `creatorEmail` (resolved dari `createdBy` user id ke email untuk durable audit trail)

Per design doc Section 6.1 dan 6.2, exporter wajib menulis timestamps original dan `creatorEmail` ke `meta.json`. Timestamps tidak boleh direset; `createdBy` tidak boleh hanya disimpan sebagai user id Convex karena user id tidak durable di file mirror.

**Step 3: Implement importer**

Rules importer (per design doc Section 6 Sync Invariants):

- transaction-scoped per `rootId` untuk cegah version race pada concurrent import (6.3).
- validate `version` uniqueness sebelum write; abort surface dan lapor ke operator kalau conflict terdeteksi (6.3).
- create version row baru di `systemPrompts` dengan `isActive: false` (6.4).
- tidak menambahkan status `draft/published/archived` (system prompts tidak punya lifecycle itu).
- tidak auto-activate tanpa rule eksplisit operator (6.4).
- preserve timestamps dari `meta.json` kalau ada; kalau tidak ada, stamp dengan timestamp operasi import (6.1).
- stamp `createdBy` dengan identity operator yang menjalankan import job; `creatorEmail` dari file hanya disimpan sebagai audit trail historis, bukan sebagai auth context (6.2).

**Step 4: Verifikasi structure**

Expected output:

- `src/agent/managed/system-prompts/<prompt-chain>/current.content.md`
- `meta.json`
- `versions/`

**Step 5: Verifikasi runtime boundary**

Pastikan tidak ada runtime caller yang membaca file mirror.

**Step 6: Commit**

```bash
git add src/agent/sync src/agent/managed
git commit -m "feat: add system prompt mirror pipeline"
```

### Task 8: Implement Stage Skill Mirror Pipeline

**Files:**
- Create: `src/agent/sync/parse-stage-skill-file.ts`
- Create: `src/agent/sync/serialize-stage-skill-file.ts`
- Create: `src/agent/sync/export-stage-skills.ts`
- Create: `src/agent/sync/import-stage-skills.ts`
- Modify: `src/agent/managed/manifest.json`

**Step 1: Implement parser dan serializer**

Stage skill parser harus mempertahankan markdown + frontmatter.

Reference implementation untuk format frontmatter: `buildSkillMarkdown()` dan `parseSkillMarkdown()` di `src/components/admin/StageSkillFormDialog.tsx`.

Fields frontmatter yang harus dipreserve:

- `name`
- `description`
- `stageScope`
- `searchPolicy` (`"active"` | `"passive"`)
- `metadataInternal` (nested `metadata:` block dengan key `internal`)

Verified di codebase: `parseSkillMarkdown()` baris 100-111 di `src/components/admin/StageSkillFormDialog.tsx` membaca `metadata:` block dan extract key `internal` ke field `metadataInternal`. `buildSkillMarkdown()` baris 147-148 emit balik ke markdown. Parser serializer mirror wajib preserve kelima field ini.

**Step 2: Implement exporter**

Exporter harus membaca:

- catalog row `stageSkills`
- version rows `stageSkillVersions`
- active/published/draft snapshots
- per version: `createdAt`, `updatedAt`, `publishedAt`, `activatedAt`, dan `creatorEmail` (resolved dari `createdBy` user id)

Per design doc Section 6.1 dan 6.2, exporter wajib menulis semua timestamps lifecycle dan `creatorEmail` per version ke `meta.json`. Ini wajib untuk durability audit trail dan round-trip equivalence di level content + version number.

Catatan penting:

- `stageScope` di DB memakai underscore (contoh: `tinjauan_literatur`)
- folder mirror harus memakai hyphen (contoh: `tinjauan-literatur/`)
- referensi mapping: `toSkillId()` di `convex/stageSkills/constants.ts`
- `searchPolicy` defaults per stage ada di `getExpectedSearchPolicy()` di file yang sama

**Step 3: Implement importer**

Rules importer (per design doc Section 6 Sync Invariants):

- transaction-scoped per `skillRefId` untuk cegah version race pada concurrent import (6.3).
- validate `version` uniqueness per `skillRefId` sebelum write; abort surface dan lapor ke operator kalau conflict terdeteksi (6.3).
- menjaga perbedaan catalog row vs version row.
- membuat draft baru dengan `status: draft`; jangan auto-promote ke `published` atau `active` (6.4).
- tidak overwrite active version langsung.
- preserve timestamps dari `meta.json` kalau ada; kalau tidak ada, stamp dengan timestamp operasi import (6.1).
- stamp `createdBy` dengan identity operator yang menjalankan import job; `creatorEmail` dari file hanya disimpan sebagai audit trail historis, bukan sebagai auth context (6.2).

**Step 4: Verifikasi structure**

Expected output:

- `src/agent/managed/stage-skills/<stage-scope>/current.active.md` (folder pakai hyphen, bukan underscore)
- `meta.json` (termasuk field `searchPolicy`)
- `versions/*.draft.md|*.published.md|*.active.md`

**Step 5: Verifikasi format byte-identical roundtrip**

Tulis test yang:

1. Ambil sample stage skill content yang dibangun oleh `buildSkillMarkdown()` (reference: `src/components/admin/StageSkillFormDialog.tsx` baris 134-155).
2. Parse lewat mirror parser baru (`parse-stage-skill-file.ts`).
3. Serialize kembali lewat mirror serializer baru (`serialize-stage-skill-file.ts`).
4. Bandingkan hasil serializer byte-by-byte dengan output `buildSkillMarkdown()` untuk input yang sama.

Test harus fail kalau ada drift sekecil apapun di whitespace, quoting, urutan field, atau field yang hilang (khususnya `metadataInternal` yang disimpan sebagai nested `metadata:` block). Verifikasi field-level saja tidak cukup karena admin form sensitif ke format exact.

**Step 6: Commit**

```bash
git add src/agent/sync src/agent/managed
git commit -m "feat: add stage skill mirror pipeline"
```

## Phase 4

### Task 9A: Centralize Paper Mode Composition

**Files:**
- Create: `src/agent/compose/build-paper-mode-message-stack.ts`
- Modify: `src/lib/ai/paper-mode-prompt.ts`

**Step 1: Pecah `paper-mode-prompt.ts`**

Pisahkan:

- resolver data
- compose stack

**Step 2: Verifikasi parity**

Run:

```powershell
npm run typecheck
npx vitest run src/lib/ai/stage-skill-resolver.test.ts src/lib/ai/stage-skill-validator.test.ts
```

**Step 3: Manual behavior check**

Uji:

- paper mode
- stage skill fallback
- artifact footer behavior

**Step 4: Commit**

```bash
git add src/agent/compose/build-paper-mode-message-stack.ts src/lib/ai/paper-mode-prompt.ts
git commit -m "feat: centralize paper mode prompt composition"
```

### Task 9B: Centralize Search Composition

**Files:**
- Create: `src/agent/compose/build-search-compose-messages.ts`
- Create: `src/agent/compose/build-search-results-context.ts`
- Modify: `src/lib/ai/web-search/orchestrator.ts`
- Modify: `src/lib/ai/search-results-context.ts`

**Step 1: Pusatkan search compose**

Pisahkan:

- search results context text contract
- branching logic builder
- compose phase message assembly

**Step 2: Verifikasi parity**

Run:

```powershell
npm run typecheck
npx vitest run src/lib/ai/web-search/orchestrator.exact-persist.test.ts
```

**Step 3: Manual behavior check**

Uji:

- search routing
- search compose
- exact-source related compose behavior

**Step 4: Commit**

```bash
git add src/agent/compose/build-search-compose-messages.ts src/agent/compose/build-search-results-context.ts src/lib/ai/web-search/orchestrator.ts src/lib/ai/search-results-context.ts
git commit -m "feat: centralize search prompt composition"
```

### Task 9C: Centralize Chat System Message Assembly

**Files:**
- Create: `src/agent/compose/build-chat-system-messages.ts`
- Modify: `src/app/api/chat/route.ts`

**Step 1: Pusatkan chat system messages**

`route.ts` harus berhenti menyusun prompt panjang inline.

**Step 2: Verifikasi parity**

Run:

```powershell
npm run typecheck
```

**Step 3: Manual behavior check**

Uji:

- chat normal
- attachment first-response
- router prompt behavior

**Step 4: Commit**

```bash
git add src/agent/compose/build-chat-system-messages.ts src/app/api/chat/route.ts
git commit -m "feat: centralize chat system message assembly"
```

## Phase 5

### Task 10: Tool Contracts dan Refrasa Prompt Subdomain

**Files:**
- Modify: `src/lib/ai/paper-tools.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/lib/refrasa/prompt-builder.ts`
- Create: `src/agent/prompts/tools/paper-tool-descriptions.ts`
- Create: `src/agent/prompts/tools/chat-tool-descriptions.ts`
- Create: `src/agent/prompts/features/refrasa-system-prompt.ts`
- Create: `src/agent/compose/build-refrasa-prompts.ts`

Catatan: `src/agent/adapters/style-constitutions.ts` dan modifikasi `src/app/api/refrasa/route.ts` sudah dilakukan di Task 4. Task ini fokus ke prompt extraction dan tool-contract saja.

**Step 1: Ekstrak tool descriptions**

Pindahkan text contract saja, bukan schema dan execute logic.

**Step 2: Pisahkan Refrasa prompt contracts**

Pindahkan prompt assets yang code-managed ke `features/refrasa-system-prompt.ts`.

Builder domain boleh tetap lokal bila itu lebih bersih.

**Step 3: Verifikasi**

Run:

```powershell
npm run typecheck
npx vitest run src/lib/ai/paper-tools.inspect-source.test.ts src/lib/ai/paper-tools.compileDaftarPustaka.test.ts
```

**Step 4: Manual behavior check**

Uji flow Refrasa untuk memastikan adapter constitution tetap benar dan tidak menyentuh mirror scope awal.

**Step 5: Commit**

```bash
git add src/agent/prompts/tools src/agent/prompts/features src/agent/compose/build-refrasa-prompts.ts src/lib/ai/paper-tools.ts src/lib/refrasa/prompt-builder.ts src/app/api/chat/route.ts
git commit -m "feat: extract tool contracts and refrasa prompt subdomain"
```

## Final Verification

### Task 11: Full Parity, Mirror Integrity, dan Docs Sync

**Files:**
- Modify as needed: docs di `docs/unified-prompts-skills-instructions/`

**Step 1: Static verification**

Run:

```powershell
npm run typecheck
npm run lint
```

**Step 2: Required tests**

Run:

```powershell
npx vitest run src/lib/ai/stage-skill-resolver.test.ts src/lib/ai/stage-skill-validator.test.ts src/lib/ai/web-search/orchestrator.exact-persist.test.ts src/lib/chat/__tests__/choice-request.test.ts src/lib/ai/paper-tools.inspect-source.test.ts src/lib/ai/paper-tools.compileDaftarPustaka.test.ts src/lib/ai/chat-exact-source-guardrails.test.ts
```

**Step 3: Mirror verification**

Verifikasi:

- `system prompts` export menghasilkan `current.content.md`, `meta.json`, `versions/`
- `stage skills` export menghasilkan `current.active.md`, `meta.json`, `versions/`
- `style constitutions` tidak ikut scope mirror awal
- importers terpisah
- stage skill frontmatter tidak drift (semua lima field termasuk `metadataInternal` preserved byte-identical)

**Step 3b: Audit boundary runtime vs mirror**

Run:

```bash
rg "src/agent/managed" src/ --type ts
```

Expected:

- zero hits di luar `src/agent/sync/`.
- kalau ada caller runtime di `src/lib/`, `src/app/`, atau subdomain lain yang import dari `src/agent/managed/`, itu violation boundary core (mirror jadi runtime authority) dan harus dihapus sebelum task dianggap selesai.

**Step 4: Runtime verification**

Uji:

- normal chat
- paper mode
- search routing
- search compose
- exact-source
- stage skill resolution
- admin-managed prompt fallback
- Refrasa

**Step 5: Docs sync**

Kalau ada drift dari plan, update:

- `README.md`
- `implementation-checklist`
- dokumen lain yang benar-benar perlu

**Step 6: Final commit**

```bash
git add docs/unified-prompts-skills-instructions
git commit -m "docs: finalize src-agent migration docs after implementation"
```

Catatan batching:

- jangan pakai `git add src docs` sebagai commit penutup,
- implementasi sudah harus selesai di commit-commit task sebelumnya,
- commit final hanya untuk sinkronisasi dokumen atau patch parity kecil yang benar-benar tersisa.

## Definition of Done

Pekerjaan dianggap selesai hanya jika:

1. `src/agent/` memegang prompt assets, adapters, compose layer, contracts, dan registry yang benar-benar dipakai runtime.
2. `src/agent/managed/` hanya memegang exported mirror untuk `system prompts` dan `stage skills`.
3. DB tetap canonical source untuk content admin-managed.
4. `style constitutions` tetap adapter-backed dan tidak ikut scope mirror awal.
5. Route dan orchestrator tidak lagi menjadi prompt warehouse utama.
6. Runtime parity tetap terjaga.
7. Mirror integrity dan importer separation terverifikasi.

## Handoff

Plan complete and saved to `docs/unified-prompts-skills-instructions/2026-04-09-implementation-plan-src-agent-managed-mirror-and-runtime-composition-v1.md`.

Best next step:

- gunakan plan ini bersama design doc sebagai acuan eksekusi bertahap,
- jangan lompat ke compose centralization sebelum adapters dan managed mirror boundary stabil.
