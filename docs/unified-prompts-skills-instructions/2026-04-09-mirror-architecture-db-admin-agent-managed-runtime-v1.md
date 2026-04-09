# Mirror Architecture: DB, Admin Panel, `src/agent/managed`, and Runtime

## Tujuan

Dokumen ini menetapkan bentuk arsitektur mirror untuk `system prompt` utama dan `stage skills` yang saat ini dikelola lewat database dan admin panel.

Target dokumen ini:

- menjelaskan boundary antara DB, admin panel, file mirror, dan runtime,
- memberi diagram ASCII lengkap yang bisa dipakai sebagai acuan,
- memberi skema folder final sampai level file,
- mencegah rancu antara canonical content dan runtime augmentation.

Dokumen ini tidak mengganti decision boundary sebelumnya bahwa source of truth operasional tetap berada di DB. Dokumen ini menambahkan model organisasi mirror yang aman.

## Rekomendasi Tunggal

Rekomendasi terbaik adalah:

**DB tetap menjadi canonical operational source of truth, sedangkan `src/agent/managed/` menjadi mirrored canonical content yang disinkronkan secara eksplisit melalui import/export pipeline, bukan true free two-way auto-sync.**

Alasan:

1. lifecycle admin tetap utuh: draft, publish, activate, rollback, enable/disable,
2. file tree tetap tersedia untuk review, diff git, backup, dan dokumentasi,
3. runtime tidak kehilangan boundary antara content dan composition behavior,
4. risiko dual source of truth jauh lebih rendah.

## Prinsip Boundary

### 1. Yang canonical tetap DB

Yang dianggap canonical secara operasional:

- `systemPrompts`
- `stageSkills`
- `stageSkillVersions`

Admin panel tetap jalur utama untuk operasi produksi.

### 2. `src/agent/managed/` adalah mirror canonical content

Isi `src/agent/managed/` harus merepresentasikan content canonical yang ada di DB, beserta metadata sinkronisasi yang dibutuhkan untuk audit dan diff.

### 3. Runtime augmentation tidak ikut dimirror sebagai source content

Yang **tidak** boleh dianggap bagian dari mirrored canonical content:

- fallback activation wiring,
- resolver footer injection seperti `ARTIFACT_CREATION_FOOTER`,
- precedence rules di route atau orchestrator,
- attachment notes,
- exact-source notes,
- search compose ordering,
- runtime-generated message stack.

Itu semua tetap hidup di `adapters/`, `compose/`, dan caller runtime yang relevan.

### 4. Sync harus eksplisit

Arsitektur yang sehat:

- admin edit -> DB update -> export ke file mirror,
- developer edit file mirror -> import ke DB -> DB membuat version/draft baru -> admin publish/activate bila perlu.

Bukan:

- file berubah -> active DB langsung ditimpa otomatis,
- admin edit -> file overwrite -> runtime auto ganti tanpa lifecycle yang jelas.

## Mapping Nyata yang Sudah Ada di Codebase

### System Prompt Utama

Sisi DB:

- tabel `systemPrompts`
- content aktif dibaca dari query `getActiveSystemPrompt`
- chat runtime mengakses via `getSystemPrompt()`

Sisi admin:

- `SystemPromptsManager`
- `SystemPromptFormDialog`
- version history dialog

Sisi referensi non-DB:

- `.references/system-prompt-skills-active/updated-3/system-prompt.md`

### Stage Skills

Sisi DB:

- katalog skill di `stageSkills`
- konten versi di `stageSkillVersions`
- status lifecycle: `draft`, `published`, `active`, `archived`

Sisi admin:

- `StageSkillsManager`
- `StageSkillFormDialog`
- version history dialog

Sisi referensi non-DB:

- `.references/system-prompt-skills-active/updated-3/01-gagasan-skill.md`
- ...
- `.references/system-prompt-skills-active/updated-3/14-judul-skill.md`

Catatan penting:

- form admin `stage skill` memang bekerja dengan markdown content,
- resolver runtime menambahkan footer lokal setelah content DB diambil,
- maka yang dimirror adalah **content DB sebelum augmentation runtime**.

## Diagram ASCII Lengkap

```text
                                  ┌─────────────────────────────┐
                                  │         Admin Panel         │
                                  │                             │
                                  │ SystemPromptsManager        │
                                  │ StageSkillsManager          │
                                  │ SystemPromptFormDialog      │
                                  │ StageSkillFormDialog        │
                                  └──────────────┬──────────────┘
                                                 │
                                                 │ create/update/publish/activate
                                                 v
┌────────────────────────────────────────────────────────────────────────────────────┐
│                                   Convex / DB                                      │
│                                                                                    │
│  systemPrompts                                                                     │
│  ├── name                                                                          │
│  ├── description                                                                   │
│  ├── content                                                                       │
│  ├── version                                                                       │
│  ├── isActive                                                                      │
│  ├── parentId/rootId                                                               │
│  └── createdBy, createdAt, updatedAt                                               │
│                                                                                    │
│  stageSkills                                                                       │
│  ├── skillId                                                                       │
│  ├── stageScope                                                                    │
│  ├── name                                                                          │
│  ├── description                                                                   │
│  ├── allowedTools                                                                  │
│  └── isEnabled                                                                     │
│                                                                                    │
│  stageSkillVersions                                                                │
│  ├── skillRefId                                                                    │
│  ├── version                                                                       │
│  ├── content                                                                       │
│  ├── status: draft | published | active | archived                                │
│  └── changeNote, timestamps                                                        │
│                                                                                    │
│  stageSkillAuditLogs                                                               │
│  systemAlerts                                                                      │
└───────────────────────────────┬───────────────────────────────┬────────────────────┘
                                │                               │
                                │ export canonical snapshot     │ runtime fetch
                                │                               │
                                v                               v
                 ┌──────────────────────────────┐    ┌──────────────────────────────┐
                 │      src/agent/sync/         │    │     src/agent/adapters/      │
                 │                              │    │                              │
                 │ export-db-to-agent-files     │    │ system-prompts.ts            │
                 │ import-agent-files-to-db     │    │ stage-skills.ts              │
                 │ diff-agent-vs-db             │    │ style-constitutions.ts       │
                 │ manifest/hash helpers        │    └──────────────┬───────────────┘
                 └──────────────┬───────────────┘                   │
                                │                                   │ normalized data
                                │ writes mirror                     v
                                v                    ┌──────────────────────────────┐
         ┌───────────────────────────────────────┐   │      src/agent/compose/     │
         │        src/agent/managed/             │   │                              │
         │                                       │   │ build-chat-system-messages   │
         │ system-prompts/                       │   │ build-paper-mode-message-    │
         │ └── default-academic-assistant/       │   │ stack                        │
         │     ├── content.md                    │   │ build-search-compose-        │
         │     ├── meta.json                     │   │ messages                     │
         │     └── versions/                     │   │ build-search-results-context │
         │         ├── v1.md                     │   │ build-choice-context-note    │
         │         ├── v2.md                     │   │ build-refrasa-prompts        │
         │         └── ...                       │   └──────────────┬───────────────┘
         │                                       │                  │
         │ stage-skills/                         │                  │ message stack
         │ ├── gagasan/                          │                  v
         │ │   ├── content.active.md             │   ┌──────────────────────────────┐
         │ │   ├── meta.json                     │   │       Runtime / Route         │
         │ │   └── versions/                     │   │                              │
         │ │       ├── v1.draft.md               │   │ src/app/api/chat/route.ts    │
         │ │       ├── v2.published.md           │   │ src/lib/ai/paper-mode-       │
         │ │       └── v3.active.md              │   │ prompt.ts                    │
         │ ├── topik/                            │   │ src/lib/ai/web-search/       │
         │ ├── outline/                          │   │ orchestrator.ts              │
         │ ├── abstrak/                          │   │                              │
         │ ├── pendahuluan/                      │   │ runtime augmentation:         │
         │ ├── tinjauan-literatur/               │   │ - fallback prompt            │
         │ ├── metodologi/                       │   │ - artifact footer            │
         │ ├── hasil/                            │   │ - exact-source notes         │
         │ ├── diskusi/                          │   │ - attachment notes           │
         │ ├── kesimpulan/                       │   │ - router/search precedence   │
         │ ├── pembaruan-abstrak/                │   └──────────────────────────────┘
         │ ├── daftar-pustaka/                   │
         │ ├── lampiran/                         │
         │ └── judul/                            │
         └───────────────────────────────────────┘
                                ^
                                │
                                │ edit in repo + explicit import
                                │
                    ┌──────────────────────────────┐
                    │ Developer / Git Workflow     │
                    │                              │
                    │ review diffs                 │
                    │ edit content.md/meta.json    │
                    │ run import-to-db             │
                    │ create draft/version in DB   │
                    └──────────────────────────────┘
```

## Flow Sinkronisasi

### A. Admin Panel ke DB ke File Mirror

```text
Admin edit
-> Convex mutation
-> DB row/version berubah
-> export-db-to-agent-files
-> src/agent/managed diperbarui
-> git diff / dokumentasi / audit bisa membaca snapshot terbaru
```

### B. File Mirror ke DB

```text
Developer edit src/agent/managed
-> import-agent-files-to-db
-> importer validasi content + metadata
-> DB membuat draft/version baru
-> admin publish/activate jika dibutuhkan
-> export ulang untuk menyamakan snapshot final
```

### C. Runtime

```text
Runtime
-> adapters membaca DB canonical content
-> compose layer menyusun message stack
-> runtime menambahkan augmentation lokal jika memang dibutuhkan
-> model menerima prompt final
```

## Tree Final yang Diusulkan

```text
src/
└── agent/
    ├── managed/
    │   ├── README.md
    │   ├── manifest.json
    │   ├── system-prompts/
    │   │   └── default-academic-assistant/
    │   │       ├── content.md
    │   │       ├── meta.json
    │   │       └── versions/
    │   │           ├── v1.md
    │   │           ├── v2.md
    │   │           └── v3.md
    │   ├── stage-skills/
    │   │   ├── gagasan/
    │   │   │   ├── content.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   │       ├── v1.draft.md
    │   │   │       ├── v2.published.md
    │   │   │       └── v3.active.md
    │   │   ├── topik/
    │   │   │   ├── content.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── outline/
    │   │   │   ├── content.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── abstrak/
    │   │   │   ├── content.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── pendahuluan/
    │   │   │   ├── content.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── tinjauan-literatur/
    │   │   │   ├── content.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── metodologi/
    │   │   │   ├── content.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── hasil/
    │   │   │   ├── content.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── diskusi/
    │   │   │   ├── content.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── kesimpulan/
    │   │   │   ├── content.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── pembaruan-abstrak/
    │   │   │   ├── content.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── daftar-pustaka/
    │   │   │   ├── content.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── lampiran/
    │   │   │   ├── content.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   └── judul/
    │   │       ├── content.active.md
    │   │       ├── meta.json
    │   │       └── versions/
    │   └── checksums/
    │       ├── system-prompts.json
    │       └── stage-skills.json
    ├── prompts/
    │   ├── global/
    │   │   ├── fallback-system-prompt.ts
    │   │   └── paper-workflow-reminder.ts
    │   ├── paper-stage-fallbacks/
    │   │   ├── gagasan.ts
    │   │   ├── topik.ts
    │   │   ├── outline.ts
    │   │   ├── abstrak.ts
    │   │   ├── pendahuluan.ts
    │   │   ├── tinjauan-literatur.ts
    │   │   ├── metodologi.ts
    │   │   ├── hasil.ts
    │   │   ├── diskusi.ts
    │   │   ├── kesimpulan.ts
    │   │   ├── pembaruan-abstrak.ts
    │   │   ├── daftar-pustaka.ts
    │   │   ├── lampiran.ts
    │   │   ├── judul.ts
    │   │   └── index.ts
    │   ├── router/
    │   │   └── search-mode-router-prompt.ts
    │   ├── search/
    │   │   ├── retriever-system-prompt.ts
    │   │   ├── retriever-user-augmentation.ts
    │   │   ├── compose-phase-directive.ts
    │   │   └── search-results-context-prompt.ts
    │   ├── tools/
    │   │   ├── paper-tool-descriptions.ts
    │   │   └── chat-tool-descriptions.ts
    │   ├── ui/
    │   │   └── choice-card-system-prompt.ts
    │   ├── features/
    │   │   └── refrasa-system-prompt.ts
    │   ├── compaction/
    │   │   └── compaction-prompts.ts
    │   └── runtime-notes/
    │       ├── attachment-notes.ts
    │       ├── choice-context-notes.ts
    │       ├── exact-source-inspection-rules.ts
    │       └── source-provenance-rules.ts
    ├── skills/
    │   └── search/
    │       └── web-search-quality/
    │           ├── SKILL.md
    │           ├── index.ts
    │           └── scripts/
    ├── adapters/
    │   ├── system-prompts.ts
    │   ├── stage-skills.ts
    │   ├── style-constitutions.ts
    │   └── types.ts
    ├── compose/
    │   ├── build-chat-system-messages.ts
    │   ├── build-paper-mode-message-stack.ts
    │   ├── build-search-compose-messages.ts
    │   ├── build-search-results-context.ts
    │   ├── build-choice-context-note.ts
    │   └── build-refrasa-prompts.ts
    ├── contracts/
    │   ├── prompt-kinds.ts
    │   ├── ownership.ts
    │   ├── prompt-surface-status.ts
    │   ├── message-stack.ts
    │   ├── tool-instruction-kinds.ts
    │   └── managed-content.ts
    ├── registry/
    │   ├── prompt-registry.ts
    │   ├── skill-registry.ts
    │   ├── tool-instruction-registry.ts
    │   └── managed-content-registry.ts
    └── sync/
        ├── export-db-to-agent-files.ts
        ├── import-agent-files-to-db.ts
        ├── diff-agent-vs-db.ts
        ├── compute-content-hash.ts
        ├── parse-stage-skill-file.ts
        ├── serialize-stage-skill-file.ts
        ├── parse-system-prompt-file.ts
        ├── serialize-system-prompt-file.ts
        └── sync-types.ts
```

## Bentuk File yang Disarankan

### `system-prompts/*/meta.json`

```json
{
  "entity": "systemPrompt",
  "name": "Default Academic Assistant",
  "description": "Primary production system prompt",
  "rootId": "systemPrompts:xxxxx",
  "activeVersion": 3,
  "isActive": true,
  "lastSyncedAt": "2026-04-09T00:00:00.000Z",
  "contentHash": "sha256:..."
}
```

### `stage-skills/*/meta.json`

```json
{
  "entity": "stageSkill",
  "skillId": "gagasan-skill",
  "stageScope": "gagasan",
  "name": "Gagasan Skill",
  "description": "Shape rough idea into feasible direction",
  "allowedTools": [
    "updateStageData",
    "createArtifact",
    "requestRevision",
    "updateArtifact",
    "submitStageForValidation",
    "compileDaftarPustaka",
    "emitChoiceCard"
  ],
  "isEnabled": true,
  "activeVersion": 3,
  "publishedVersion": 2,
  "draftVersion": 4,
  "lastSyncedAt": "2026-04-09T00:00:00.000Z",
  "contentHash": "sha256:..."
}
```

## Guardrail Implementasi

1. Jangan jadikan file mirror sebagai auto-active runtime source.
2. Jangan mirror hasil final prompt yang sudah ditambah runtime footer atau notes.
3. Jangan hilangkan lifecycle `draft -> published -> active -> rollback`.
4. Jangan izinkan sync menimpa content tanpa diff dan validation.
5. Jangan bikin source of truth baru di `src/agent/managed/`.

## Daftar File Terkait

### Runtime dan Resolver

- `src/lib/ai/chat-config.ts`
- `src/lib/ai/stage-skill-resolver.ts`
- `src/lib/ai/paper-mode-prompt.ts`
- `src/app/api/chat/route.ts`

### Admin Panel

- `src/components/admin/SystemPromptsManager.tsx`
- `src/components/admin/SystemPromptFormDialog.tsx`
- `src/components/admin/StageSkillsManager.tsx`
- `src/components/admin/StageSkillFormDialog.tsx`

### Convex

- `convex/schema.ts`
- `convex/systemPrompts.ts`
- `convex/stageSkills.ts`

### Referensi Non-DB Saat Ini

- `.references/system-prompt-skills-active/updated-3/system-prompt.md`
- `.references/system-prompt-skills-active/updated-3/01-gagasan-skill.md`
- `.references/system-prompt-skills-active/updated-3/02-topik-skill.md`
- `.references/system-prompt-skills-active/updated-3/03-outline-skill.md`
- `.references/system-prompt-skills-active/updated-3/04-abstrak-skill.md`
- `.references/system-prompt-skills-active/updated-3/05-pendahuluan-skill.md`
- `.references/system-prompt-skills-active/updated-3/06-tinjauan-literatur-skill.md`
- `.references/system-prompt-skills-active/updated-3/07-metodologi-skill.md`
- `.references/system-prompt-skills-active/updated-3/08-hasil-skill.md`
- `.references/system-prompt-skills-active/updated-3/09-diskusi-skill.md`
- `.references/system-prompt-skills-active/updated-3/10-kesimpulan-skill.md`
- `.references/system-prompt-skills-active/updated-3/11-pembaruan-abstrak-skill.md`
- `.references/system-prompt-skills-active/updated-3/12-daftar-pustaka-skill.md`
- `.references/system-prompt-skills-active/updated-3/13-lampiran-skill.md`
- `.references/system-prompt-skills-active/updated-3/14-judul-skill.md`

## Kesimpulan

Arsitektur mirror yang benar untuk repo ini adalah:

- **DB tetap canonical operational source,**
- **admin panel tetap jalur lifecycle utama,**
- **`src/agent/managed/` menjadi mirror canonical content untuk diff dan sinkronisasi eksplisit,**
- **runtime tetap membaca content dari DB lalu menyusun prompt final melalui adapter dan compose layer.**

Dengan boundary ini, penyatuan ke `src/agent/` tetap rapi tanpa merusak kontrol operasional yang sudah ada.
