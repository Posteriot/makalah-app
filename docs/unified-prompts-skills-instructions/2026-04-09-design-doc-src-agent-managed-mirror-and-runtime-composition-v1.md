# Design Doc: `src/agent/` Managed Mirror and Runtime Composition

## Status

- Date: 9 April 2026
- Status: draft-for-implementation
- Scope: desain arsitektur target untuk `src/agent/`, `src/agent/managed/`, adapter runtime, compose layer, dan sync boundary
- Out of scope in this doc: checklist rinci eksekusi file-per-file dan implementation plan detail

## Tujuan

Dokumen ini menyatukan keputusan desain yang tersebar di seri dokumen `unified-prompts-skills-instructions` menjadi satu design doc implementasi tingkat arsitektur.

Tujuan utamanya:

- menetapkan bentuk target `src/agent/` yang akan diimplementasikan,
- memisahkan tegas repo-managed prompt architecture dari managed mirror DB-managed content,
- menjelaskan flow runtime, flow sync, dan ownership per surface,
- menjadi jembatan antara dokumen keputusan dan implementation plan yang akan ditulis terpisah.

Dokumen ini harus dibaca konsisten dengan:

- `docs/unified-prompts-skills-instructions/2026-04-08-as-is-state-unified-prompts-skills-instructions.md`
- `docs/unified-prompts-skills-instructions/2026-04-08-decision-record-final-migration-boundaries-v1.md`
- `docs/unified-prompts-skills-instructions/2026-04-08-prompt-surface-classification-matrix-v1.md`
- `docs/unified-prompts-skills-instructions/2026-04-08-unified-target-concept-prompts-skills-instructions-v1.md`
- `docs/unified-prompts-skills-instructions/2026-04-08-implementation-checklist-src-agent-migration-v1.md`
- `docs/unified-prompts-skills-instructions/2026-04-09-mirror-architecture-db-admin-agent-managed-runtime-v2.md`

Jika ada konflik boundary:

1. codebase aktual menang untuk current-state,
2. decision record menang untuk migration boundary,
3. mirror `v2` menang untuk managed mirror design.

## Best Recommendation

Rekomendasi terbaik adalah:

**implementasikan arsitektur dua-lajur yang tegas: `src/agent/` sebagai repo-managed runtime architecture, dan `src/agent/managed/` sebagai exported mirror untuk content DB-managed yang tetap canonical di Convex.**

Kenapa ini yang terbaik:

1. sesuai dengan current-state codebase yang memang sudah memisahkan `systemPrompts`, `stageSkills`, dan `styleConstitutions`,
2. menjaga admin lifecycle tetap utuh,
3. memungkinkan prompt assets code-managed dirapikan tanpa membuat dual source of truth,
4. membuat runtime composition lebih eksplisit,
5. membuat sync file-to-DB mungkin dilakukan tanpa merusak authority DB.

## Problem Statement

Current-state codebase punya empat masalah arsitektural yang saling terkait:

1. prompt assets code-managed tersebar di beberapa namespace,
2. DB-managed content belum dibungkus oleh adapter runtime yang seragam,
3. route dan orchestrator masih memegang precedence runtime secara implicit,
4. belum ada boundary resmi antara canonical DB content dan mirror file export.

Akibatnya:

- audit prompt stack mahal,
- perubahan prompt riskan menggeser behavior runtime,
- ownership per surface mudah kabur,
- desain unified `src/agent/` rawan kebablasan jadi dump folder,
- desain mirror rawan berubah jadi source of truth baru kalau boundary-nya tidak dipaku dulu.

## Current-State Constraints

Desain ini dibatasi oleh fakta codebase berikut:

### 1. `systemPrompts` dan `stageSkills` beda model

`systemPrompts`:

- version chain
- `isActive`
- tidak punya status `draft/published/archived`

`stageSkills`:

- catalog row di `stageSkills`
- version rows di `stageSkillVersions`
- status `draft/published/active/archived`
- `isEnabled` di level catalog

Konsekuensi desain:

- importer dan exporter untuk dua surface ini harus dipisah,
- metadata mirror tidak boleh dipaksa satu bentuk generik.

### 2. Stage skill content bukan plain text

Stage skill current-state disimpan sebagai markdown penuh dengan frontmatter yang dibentuk lewat `buildSkillMarkdown()` dan dibaca lewat `parseSkillMarkdown()` di `src/components/admin/StageSkillFormDialog.tsx`.

Fields frontmatter yang ada di content:

- `name`
- `description`
- `stageScope`
- `searchPolicy` (`"active"` | `"passive"`)
- `metadataInternal` (nested `metadata:` block dengan key `internal`)

Catatan tambahan:

- `stageScope` di DB schema memakai underscore (contoh: `tinjauan_literatur`), tetapi `skillId` dan folder naming convention memakai hyphen (referensi konversi: `toSkillId()` di `convex/stageSkills/constants.ts`),
- search policy defaults per stage tersedia di `getExpectedSearchPolicy()` di file yang sama.

Konsekuensi desain:

- sync pipeline untuk stage skills harus menjaga bentuk markdown + frontmatter tetap stabil termasuk semua fields di atas,
- body-only serialization tidak boleh jadi format authority,
- exporter harus normalize stageScope underscore ke hyphen untuk folder naming di mirror.

### 3. Runtime menambahkan augmentation lokal

Contoh paling jelas:

- `resolveStageInstructions()` mengambil `activeSkill.content`,
- lalu menambahkan `ARTIFACT_CREATION_FOOTER`,
- baru hasil finalnya dipakai runtime.

Konsekuensi desain:

- content canonical dan prompt final runtime harus dipisah di desain,
- managed mirror hanya boleh memuat canonical content sebelum augmentation runtime.

### 4. Style constitutions belum masuk scope mirror awal

`styleConstitutions` tetap DB-managed dan dipakai Refrasa, tetapi belum diputuskan ikut exported mirror scope awal.

Konsekuensi desain:

- desain target harus tetap menyediakan adapter untuk constitution,
- tetapi tidak boleh mengasumsikan `src/agent/managed/style-constitutions/` pada phase awal.

## Design Principles

### 1. Pisahkan canonical content, mirror export, dan prompt final runtime

Harus ada tiga boundary berbeda:

- **canonical content**: DB-managed source of truth
- **mirror export**: snapshot file untuk audit, diff, dan sync eksplisit
- **prompt final runtime**: hasil composition + augmentation lokal

### 2. Pisahkan repo-managed architecture dari managed mirror

`src/agent/` dan `src/agent/managed/` harus diperlakukan sebagai dua sublayer yang berbeda:

- `src/agent/` untuk runtime architecture
- `src/agent/managed/` untuk exported mirror

### 3. Pisahkan pure prompt asset dari hybrid contract surface

Pure asset boleh direlokasi lebih cepat.

Hybrid surface harus dipecah dulu menjadi:

- text contract
- runtime logic
- composition boundary

### 4. Precedence runtime harus jadi concern eksplisit

Desain ini tidak boleh berhenti di relokasi file. Outcome utamanya harus:

- precedence message stack terdokumentasi,
- route tidak lagi jadi prompt warehouse,
- orchestrator tidak lagi menyimpan contract precedence secara implicit.

### 5. Adapter harus tipis, composer harus eksplisit

Adapter:

- membaca canonical source
- tidak membuat authority baru
- tidak menyimpan shadow state

Composer:

- merakit stack dan precedence
- boleh menerima content dari adapter dan prompt assets
- tidak boleh mengambil authority dari file mirror

## Chosen Architecture

### A. High-Level Layout

```text
src/
└── agent/
    ├── managed/        # exported mirror only
    ├── sync/           # import/export/diff for managed mirror
    ├── prompts/        # repo-managed prompt assets
    ├── skills/         # repo-managed file-based skills
    ├── adapters/       # runtime access to DB-managed content
    ├── compose/        # message-stack assembly and precedence
    ├── contracts/      # prompt/ownership/status taxonomy
    └── registry/       # prompt/skill/mirror metadata registration
```

### B. `src/agent/managed/`

Tanggung jawab:

- menampung exported mirror untuk `system prompts` dan `stage skills`,
- menyediakan snapshot yang bisa dibaca Git, manusia, dan sync tool,
- menyimpan metadata sync dan export snapshot.

Bukan tanggung jawab:

- runtime source,
- prompt final,
- fallback authority,
- precedence rules,
- composer input authority.

### C. `src/agent/sync/`

Tanggung jawab:

- export DB -> files
- import files -> DB
- diff files vs DB
- parse/serialize format surface-specific

Rules:

- `system prompts` punya sync pipeline terpisah,
- `stage skills` punya sync pipeline terpisah,
- importer wajib melakukan validation sebelum write-back.

### D. `src/agent/prompts/`

Tanggung jawab:

- prompt assets code-managed
- fallback prompt text hasil ekstraksi
- router prompts
- runtime notes yang sudah dipisah dari logic
- tool instruction contracts hasil ekstraksi

Rules:

- tidak menyimpan heavy runtime logic,
- tidak menyimpan DB fetch logic,
- tidak menyimpan canonical DB-managed content.

### E. `src/agent/skills/`

Tanggung jawab:

- menyimpan skills file-based yang memang natural-language driven,
- dimulai dari `web-search-quality`.

### F. `src/agent/adapters/`

Tanggung jawab:

- menyatukan akses runtime ke:
  - active system prompt
  - active stage skill
  - active style constitution

Rules:

- tetap tipis,
- tidak auto-fallback liar,
- tidak menyamakan lifecycle antar surface.

### G. `src/agent/compose/`

Tanggung jawab:

- menyusun chat system messages
- menyusun paper mode message stack
- menyusun search compose messages
- menyusun search results context contract
- menyusun choice context note bila dipecah
- menyusun Refrasa prompt composition bila dibutuhkan

Rules:

- composer bekerja di atas canonical content dari adapter dan prompt assets code-managed,
- composer tidak membaca mirror file sebagai authority runtime.

### H. `src/agent/contracts/` dan `src/agent/registry/`

`contracts/`:

- bahasa taxonomy bersama untuk ownership, source, prompt kinds, message layers, managed content kinds

`registry/`:

- indeks metadata surface
- status migrasi
- ownership
- source
- scope mirror vs runtime

## Runtime Design

### 1. Chat Runtime

Flow target:

1. route mengambil state dan context request
2. route memanggil adapter untuk DB-managed content
3. route memanggil compose layer untuk stack assembly
4. compose layer menggabungkan:
   - active system prompt
   - fallback text bila relevan
   - stage instruction
   - runtime notes
   - search/tool/router notes
5. model menerima stack final

Design intent:

- `route.ts` berhenti jadi tempat penyimpanan string panjang,
- precedence berpindah ke compose layer,
- runtime behavior tetap parity dengan current-state.

### 2. Paper Mode Runtime

Flow target:

1. adapter atau resolver mengambil active stage skill atau fallback
2. composer paper mode merakit stage instruction, memory digest, artifact summaries, invalidated artifacts, dan status notes
3. runtime augmentation seperti `ARTIFACT_CREATION_FOOTER` tetap diterapkan setelah canonical content diambil

Design intent:

- fallback behavior tetap aman,
- augmentation runtime tetap eksplisit,
- canonical DB content tidak tercampur dengan prompt final.

### 3. Search Runtime

Flow target:

1. router prompt dipisah jadi prompt asset
2. retriever prompt dan augmentation dipisah jadi prompt assets
3. search-results context contract dipisah dari branching logic
4. compose phase directive dan search context digabung eksplisit di compose layer

Design intent:

- precedence compose phase menjadi dapat diaudit,
- orchestrator fokus ke flow control, bukan prompt warehousing.

### 4. Refrasa Runtime

Flow target:

1. adapter mengambil active style constitution dari DB
2. prompt contracts Refrasa dipisahkan dari builder domain
3. builder domain tetap boleh lokal bila masih lebih sehat

Design intent:

- Refrasa ikut taxonomy yang sama,
- tetapi tidak dipaksa ikut mirror scope awal.

## Managed Mirror Design

### 1. Scope Awal

Managed mirror awal hanya untuk:

- `system prompts`
- `stage skills`

Bukan untuk:

- `style constitutions`
- runtime notes
- fallback wiring
- prompt final runtime

### 2. System Prompt Mirror

Bentuk yang diinginkan:

```text
src/agent/managed/system-prompts/<prompt-chain>/
├── current.content.md
├── meta.json
└── versions/
```

Aturan:

- representasikan version chain + `isActive`
- jangan menambahkan lifecycle `draft/published/archived`
- importer tidak boleh auto-activate tanpa rule eksplisit

### 3. Stage Skill Mirror

Bentuk yang diinginkan:

```text
src/agent/managed/stage-skills/<stage-scope>/
├── current.active.md
├── meta.json
└── versions/
```

Aturan:

- representasikan catalog metadata + version snapshots
- version snapshots boleh memakai suffix status `.draft`, `.published`, `.active`
- importer harus menjaga perbedaan catalog row dan version row
- importer harus membuat draft baru, bukan overwrite active langsung

### 4. Sync Flow

Admin -> DB -> mirror:

```text
admin action
-> Convex mutation
-> canonical DB update
-> explicit export
-> managed mirror refresh
```

Mirror -> DB:

```text
developer edit mirror file
-> explicit import
-> validation + diff
-> DB row/version update
-> admin lifecycle berjalan sesuai surface
-> export ulang
```

### 5. Guardrails

1. file mirror tidak boleh jadi runtime authority
2. importer `system prompts` dan `stage skills` wajib terpisah
3. stage skill markdown + frontmatter wajib dipertahankan
4. mirror hanya memuat canonical content sebelum augmentation runtime

### 6. Sync Invariants

Keempat invariant ini wajib dipegang oleh semua importer dan exporter mirror, apapun surface-nya. Dokumen ini menetapkan invariant secara eksplisit karena tidak ada anchor doc sebelumnya yang membahas keempat hal ini secara sistematis.

#### 6.1 Timestamps preservation

Aturan:

- `createdAt`, `updatedAt`, `publishedAt`, `activatedAt` tidak boleh direset pada round-trip `export → edit → import`.
- Exporter wajib menulis timestamps original ke `meta.json`.
- Importer wajib merestore timestamps dari `meta.json` kalau ada, atau menandai entri baru dengan timestamp operasi import kalau tidak ada.
- Round-trip equivalence didefinisikan di level content dan version number, bukan byte-identical di level timestamp.

#### 6.2 `createdBy` durability

Aturan:

- Exporter wajib menulis `creatorEmail` (bukan hanya user id Convex) ke `meta.json` sebagai audit trail durable.
- Importer wajib menerima `creatorEmail` sebagai data historis, dan meng-stamp entri baru dengan identity operator yang menjalankan import.
- Identitas operator import tidak boleh diwariskan dari file; file mirror tidak membawa auth context.

#### 6.3 Version number race protection

Aturan:

- Importer wajib transaction-scoped per entitas (`rootId` untuk system prompts, `skillRefId` untuk stage skills).
- Importer wajib validate `version` uniqueness sebelum write untuk cegah dua import paralel menulis version number yang sama.
- Kalau conflict terdeteksi, importer wajib abort surface tersebut dan melapor ke operator, bukan overwrite.

#### 6.4 Activation uniqueness dan auto-activate ban

Aturan:

- Importer tidak boleh auto-activate untuk kedua surface. `isActive` hanya boleh berubah lewat admin lifecycle atau rule aktivasi eksplisit dari operator.
- Untuk stage skills, importer wajib create entry baru sebagai `status: draft`, bukan `published` atau `active`.
- Untuk system prompts, importer wajib create version baru dengan `isActive: false`.
- `isActive` adalah global per chain untuk system prompts dan global per skill catalog untuk stage skills. Importer tidak boleh menghasilkan state dengan dua `isActive: true` untuk entitas yang sama.

## Migration Slices

Design ini memecah implementasi ke lima slice besar:

### Slice 1. Namespace Foundation

Outcome:

- contracts
- registry
- folder target `src/agent/`

### Slice 2. Pure Prompt Asset Re-Homing

Outcome:

- prompt assets code-managed mulai terkonsolidasi
- skill file-based mulai berpindah ke namespace baru

### Slice 3. Adapter Runtime Boundary

Outcome:

- runtime access ke DB-managed content diseragamkan
- caller tidak lagi tahu detail storage DB

### Slice 4. Managed Mirror Boundary

Outcome:

- `src/agent/managed/` dan `src/agent/sync/` terbentuk
- explicit export/import tersedia
- mirror integrity bisa diverifikasi

### Slice 5. Compose Centralization

Outcome:

- precedence message stack jadi eksplisit
- route/orchestrator mengecil
- parity runtime lebih mudah diaudit

Tool contracts dan feature subdomains seperti Refrasa masuk setelah lima slice ini stabil.

## Risks

### 1. Relokasi palsu

Risiko:

- file pindah,
- tanggung jawab tetap sama,
- arsitektur tidak membaik.

Mitigasi:

- pertahankan status `extract contract first` untuk hybrid surfaces.

### 2. Dual source of truth

Risiko:

- adapter membuat fallback liar,
- mirror dibaca sebagai runtime source,
- prompt authority jadi kabur.

Mitigasi:

- pisahkan authority canonical, mirror export, dan prompt final runtime.

### 3. Lifecycle drift

Risiko:

- `system prompts` dan `stage skills` dipaksa satu workflow,
- importer generik merusak model data salah satu surface.

Mitigasi:

- surface-specific sync pipeline,
- metadata mirror surface-specific,
- verification per surface.

### 4. Precedence drift

Risiko:

- prompt text sama tetapi urutan stack berubah,
- output model bergeser.

Mitigasi:

- compose layer eksplisit,
- parity verification wajib berbasis order dan behavior.

## Verification Strategy

Design ini dianggap benar hanya kalau implementasinya nanti memverifikasi empat hal:

1. **parity runtime**
   - chat normal
   - paper mode
   - search compose
   - Refrasa

2. **mirror integrity**
   - export structure benar
   - importers terpisah
   - stage skill frontmatter stabil

3. **ownership integrity**
   - DB tetap canonical
   - mirror tetap derived-from-db
   - style constitution tetap di luar mirror scope awal

4. **precedence integrity**
   - message stack order setara dengan behavior yang diharapkan

## Non-Goals

Dokumen ini tidak menetapkan:

- implementation plan file-per-file yang rinci
- detail commit batching
- rollout sequencing per PR
- keputusan mirror untuk `style constitutions`
- penghapusan semua prompt local utility dari domain asalnya

Semua itu harus masuk ke implementation plan terpisah.

## Related Files and Modules

### Current-State Evidence

- `src/lib/ai/chat-config.ts`
- `convex/systemPrompts.ts`
- `src/lib/ai/stage-skill-resolver.ts`
- `convex/stageSkills.ts`
- `src/components/admin/StageSkillFormDialog.tsx`
- `convex/styleConstitutions.ts`
- `src/app/api/chat/route.ts`
- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/ai/web-search/orchestrator.ts`
- `src/lib/ai/search-results-context.ts`
- `src/lib/refrasa/prompt-builder.ts`
- `src/app/api/refrasa/route.ts`

### Design Anchors

- `docs/unified-prompts-skills-instructions/2026-04-08-as-is-state-unified-prompts-skills-instructions.md`
- `docs/unified-prompts-skills-instructions/2026-04-08-decision-record-final-migration-boundaries-v1.md`
- `docs/unified-prompts-skills-instructions/2026-04-08-prompt-surface-classification-matrix-v1.md`
- `docs/unified-prompts-skills-instructions/2026-04-08-unified-target-concept-prompts-skills-instructions-v1.md`
- `docs/unified-prompts-skills-instructions/2026-04-08-implementation-checklist-src-agent-migration-v1.md`
- `docs/unified-prompts-skills-instructions/2026-04-09-mirror-architecture-db-admin-agent-managed-runtime-v2.md`

## Kesimpulan

Desain yang paling tepat untuk repo ini adalah desain yang:

- merapikan prompt architecture ke `src/agent/`,
- tetap menjaga DB sebagai canonical source untuk content admin-managed,
- menambahkan `src/agent/managed/` hanya sebagai exported mirror,
- memindahkan precedence runtime ke compose layer,
- menjaga perbedaan model `system prompts`, `stage skills`, dan `style constitutions`.

Implementation plan harus ditulis sesudah design doc ini dan harus menurunkan desain ini menjadi urutan kerja yang bisa dieksekusi tanpa melanggar boundary tersebut.
