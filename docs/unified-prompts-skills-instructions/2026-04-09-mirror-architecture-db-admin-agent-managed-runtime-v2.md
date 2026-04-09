# Mirror Architecture v2: DB, Admin Panel, `src/agent/managed`, and Runtime

## Tujuan

Dokumen ini menetapkan bentuk arsitektur mirror yang **sesuai dengan codebase aktual** untuk `system prompt` utama dan `stage skills` yang saat ini dikelola lewat database dan admin panel.

Target dokumen ini:

- menjelaskan boundary antara DB, admin panel, file mirror, dan runtime,
- memisahkan secara tegas model `system prompt` dan `stage skills`,
- memberi diagram ASCII lengkap yang bisa dipakai sebagai acuan implementasi,
- memberi skema folder final untuk area mirror,
- mencegah rancu antara canonical content, derived export metadata, dan runtime augmentation.

Dokumen ini **tidak** mencoba mendesain seluruh target `src/agent/` untuk prompts, skills, registry, contracts, atau compose layer lain di luar kebutuhan mirror. Itu harus dibahas di dokumen terpisah.

## Rekomendasi Tunggal

Rekomendasi terbaik adalah:

**DB tetap menjadi canonical operational source of truth, sedangkan `src/agent/managed/` menjadi exported mirror yang disinkronkan secara eksplisit melalui import/export pipeline terpisah untuk `system prompts` dan `stage skills`.**

Alasan:

1. model data `system prompt` dan `stage skills` memang berbeda di codebase,
2. lifecycle admin tetap utuh: activate untuk prompt, serta draft/publish/activate/rollback untuk stage skill,
3. file mirror tetap tersedia untuk review, diff git, backup, dan dokumentasi,
4. runtime tidak kehilangan boundary antara content canonical dan augmentation behavior,
5. risiko dual source of truth lebih rendah dibanding auto-sync dua arah yang liar.

## Keadaan Nyata di Codebase

### 1. System Prompt Utama

Model saat ini:

- disimpan di tabel `systemPrompts`,
- setiap update membuat row versi baru,
- status yang native hanya `isActive`,
- tidak ada lifecycle `draft/published/archived`.

Implikasi:

- system prompt harus dimirror sebagai **version chain + active marker**,
- jangan diperlakukan seperti stage skill yang punya status per versi.

### 2. Stage Skills

Model saat ini:

- katalog skill disimpan di `stageSkills`,
- konten versi disimpan di `stageSkillVersions`,
- status native per versi adalah `draft`, `published`, `active`, `archived`,
- enable/disable hidup di row katalog `stageSkills`.

Implikasi:

- stage skills harus dimirror sebagai **catalog metadata + per-version status snapshot**,
- importer dan exporter untuk stage skill harus memahami lifecycle ini.

### 3. Runtime Augmentation

Runtime stage skill tidak memakai raw DB content secara mentah.

Contoh nyata:

- `resolveStageInstructions()` mengambil `activeSkill.content`,
- lalu menambahkan `ARTIFACT_CREATION_FOOTER`,
- baru setelah itu hasil final masuk ke runtime prompt stack.

Implikasi:

- yang dimirror adalah **canonical DB content sebelum augmentation runtime**,
- hasil final runtime tidak boleh dipakai sebagai source mirror.

## Prinsip Boundary

### 1. Yang canonical tetap DB

Yang dianggap canonical secara operasional:

- `systemPrompts`
- `stageSkills`
- `stageSkillVersions`

Admin panel tetap jalur utama untuk operasi produksi.

### 2. `src/agent/managed/` adalah exported mirror

Isi `src/agent/managed/` harus merepresentasikan:

- content canonical yang ada di DB,
- metadata sinkronisasi,
- derived export metadata yang berguna untuk diff dan audit.

Tetapi file mirror **bukan** source of truth baru.

### 3. Runtime augmentation tidak ikut dimirror sebagai source content

Yang **tidak** boleh dianggap bagian dari mirrored canonical content:

- fallback activation wiring,
- resolver footer injection seperti `ARTIFACT_CREATION_FOOTER`,
- precedence rules di route atau orchestrator,
- attachment notes,
- exact-source notes,
- search compose ordering,
- runtime-generated message stack.

### 4. Sync harus eksplisit dan dipisah per surface

Arsitektur yang sehat:

- admin edit -> DB update -> export ke file mirror,
- developer edit file mirror -> import sesuai surface -> DB membuat versi baru atau draft baru -> admin lifecycle berjalan seperti biasa.

Yang harus dihindari:

- satu importer generik yang menyamakan semua managed content,
- file berubah lalu active DB langsung ditimpa otomatis,
- admin edit memicu overwrite liar tanpa diff dan validation.

## Mapping Nyata yang Sudah Ada di Codebase

### System Prompt Utama

Sisi DB:

- tabel `systemPrompts`
- content aktif dibaca dari query `getActiveSystemPrompt`
- chat runtime mengakses via `getSystemPrompt()`

Sisi admin:

- `SystemPromptsManager`
- `SystemPromptFormDialog`
- `VersionHistoryDialog`

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
- `StageSkillVersionHistoryDialog`

Sisi referensi non-DB:

- `.references/system-prompt-skills-active/updated-3/01-gagasan-skill.md`
- ...
- `.references/system-prompt-skills-active/updated-3/14-judul-skill.md`

Catatan penting:

- form admin `stage skill` menyimpan markdown penuh dengan frontmatter,
- format itu dibangun lewat `buildSkillMarkdown()` dan diparse lewat `parseSkillMarkdown()`,
- importer/exporter mirror harus menjaga format ini tetap stabil.

## Diagram ASCII Lengkap

```text
                                  ┌─────────────────────────────┐
                                  │         Admin Panel         │
                                  │                             │
                                  │ SystemPromptsManager        │
                                  │ StageSkillsManager          │
                                  │ SystemPromptFormDialog      │
                                  │ StageSkillFormDialog        │
                                  │ VersionHistoryDialog        │
                                  │ StageSkillVersionHistory    │
                                  └──────────────┬──────────────┘
                                                 │
                                                 │ create/update/activate
                                                 │ create-draft/publish/
                                                 │ activate/rollback/disable
                                                 v
┌────────────────────────────────────────────────────────────────────────────────────┐
│                                   Convex / DB                                      │
│                                                                                    │
│  systemPrompts                                                                     │
│  ├── version chain                                                                 │
│  ├── active flag (isActive)                                                        │
│  └── no native draft/published/archived                                            │
│                                                                                    │
│  stageSkills                                                                       │
│  ├── catalog row                                                                   │
│  ├── allowedTools                                                                  │
│  ├── isEnabled                                                                     │
│  └── stageScope/skillId/name/description                                           │
│                                                                                    │
│  stageSkillVersions                                                                │
│  ├── draft                                                                         │
│  ├── published                                                                     │
│  ├── active                                                                        │
│  └── archived                                                                      │
│                                                                                    │
│  stageSkillAuditLogs                                                               │
│  systemAlerts                                                                      │
└───────────────────────────────┬───────────────────────────────┬────────────────────┘
                                │                               │
                                │ explicit export               │ runtime fetch
                                │                               │
                                v                               v
                 ┌──────────────────────────────┐    ┌──────────────────────────────┐
                 │      src/agent/sync/         │    │     runtime adapters          │
                 │                              │    │                              │
                 │ exportSystemPrompts()        │    │ getSystemPrompt()            │
                 │ importSystemPrompts()        │    │ resolveStageInstructions()   │
                 │ exportStageSkills()          │    │                              │
                 │ importStageSkills()          │    └──────────────┬───────────────┘
                 │ diffManagedVsDb()            │                   │
                 └──────────────┬───────────────┘                   │ canonical DB content
                                │                                   v
                                │ writes mirror      ┌──────────────────────────────┐
                                v                    │     runtime augmentation      │
         ┌───────────────────────────────────────┐   │                              │
         │        src/agent/managed/             │   │ system prompt fallback       │
         │                                       │   │ stage-skill footer injection │
         │ system-prompts/                       │   │ route/orchestrator precedence │
         │ └── <prompt-chain>/                   │   │ exact-source notes           │
         │     ├── current.content.md            │   │ attachment notes             │
         │     ├── meta.json                     │   └──────────────┬───────────────┘
         │     └── versions/                     │                  │
         │         ├── v1.md                     │                  │ prompt final
         │         ├── v2.md                     │                  v
         │         └── ...                       │   ┌──────────────────────────────┐
         │                                       │   │       Runtime / Route         │
         │ stage-skills/                         │   │                              │
         │ ├── gagasan/                          │   │ src/app/api/chat/route.ts    │
         │ │   ├── current.active.md            │   │ src/lib/ai/paper-mode-       │
         │ │   ├── meta.json                     │   │ prompt.ts                    │
         │ │   └── versions/                     │   │ src/lib/ai/web-search/       │
         │ │       ├── v1.draft.md               │   │ orchestrator.ts              │
         │ │       ├── v2.published.md           │   └──────────────────────────────┘
         │ │       └── v3.active.md              │
         │ ├── topik/                            │
         │ ├── outline/                          │
         │ ├── abstrak/                          │
         │ ├── pendahuluan/                      │
         │ ├── tinjauan-literatur/               │
         │ ├── metodologi/                       │
         │ ├── hasil/                            │
         │ ├── diskusi/                          │
         │ ├── kesimpulan/                       │
         │ ├── pembaruan-abstrak/                │
         │ ├── daftar-pustaka/                   │
         │ ├── lampiran/                         │
         │ └── judul/                            │
         └───────────────────────────────────────┘
                                ^
                                │
                                │ edit file mirror + explicit import
                                │
                    ┌──────────────────────────────┐
                    │ Developer / Git Workflow     │
                    │                              │
                    │ review diff                  │
                    │ edit content/meta            │
                    │ run surface-specific import  │
                    │ inspect diff + validation    │
                    └──────────────────────────────┘
```

## Flow Sinkronisasi

### A. Admin Panel ke DB ke File Mirror

```text
Admin edit
-> Convex mutation
-> DB row/version berubah
-> explicit export job dijalankan
-> src/agent/managed diperbarui
-> git diff / dokumentasi / audit membaca snapshot terbaru
```

### B. File Mirror ke DB untuk System Prompt

```text
Developer edit src/agent/managed/system-prompts/*
-> importSystemPrompts()
-> importer validasi content + metadata
-> DB membuat row versi baru di systemPrompts
-> active flag dikelola sesuai rule importer/admin
-> export ulang untuk menyamakan snapshot final
```

Catatan:

- flow ini **tidak** memakai status `draft/published/archived`,
- kalau aktivasi mau dipertahankan manual, importer tidak boleh auto-activate.

### C. File Mirror ke DB untuk Stage Skills

```text
Developer edit src/agent/managed/stage-skills/*
-> importStageSkills()
-> importer menjaga markdown + frontmatter
-> DB membuat draft baru di stageSkillVersions
-> admin publish/activate jika dibutuhkan
-> export ulang untuk menyamakan snapshot final
```

Catatan:

- stage skill importer harus memahami perbedaan catalog row vs version row,
- importer tidak boleh merusak lifecycle `draft -> published -> active -> archived`.

### D. Runtime

```text
Runtime
-> adapter/runtime fetch membaca DB canonical content
-> runtime augmentation menambahkan behavior lokal bila dibutuhkan
-> model menerima prompt final
```

## Tree Final Mirror yang Diusulkan

```text
src/
└── agent/
    ├── managed/
    │   ├── README.md
    │   ├── manifest.json
    │   ├── system-prompts/
    │   │   └── default-academic-assistant/
    │   │       ├── current.content.md
    │   │       ├── meta.json
    │   │       └── versions/
    │   │           ├── v1.md
    │   │           ├── v2.md
    │   │           └── v3.md
    │   ├── stage-skills/
    │   │   ├── gagasan/
    │   │   │   ├── current.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   │       ├── v1.draft.md
    │   │   │       ├── v2.published.md
    │   │   │       └── v3.active.md
    │   │   ├── topik/
    │   │   │   ├── current.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── outline/
    │   │   │   ├── current.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── abstrak/
    │   │   │   ├── current.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── pendahuluan/
    │   │   │   ├── current.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── tinjauan-literatur/
    │   │   │   ├── current.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── metodologi/
    │   │   │   ├── current.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── hasil/
    │   │   │   ├── current.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── diskusi/
    │   │   │   ├── current.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── kesimpulan/
    │   │   │   ├── current.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── pembaruan-abstrak/
    │   │   │   ├── current.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── daftar-pustaka/
    │   │   │   ├── current.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   ├── lampiran/
    │   │   │   ├── current.active.md
    │   │   │   ├── meta.json
    │   │   │   └── versions/
    │   │   └── judul/
    │   │       ├── current.active.md
    │   │       ├── meta.json
    │   │       └── versions/
    │   └── checksums/
    │       ├── system-prompts.json
    │       └── stage-skills.json
    └── sync/
        ├── export-system-prompts.ts
        ├── import-system-prompts.ts
        ├── export-stage-skills.ts
        ├── import-stage-skills.ts
        ├── diff-managed-vs-db.ts
        ├── compute-content-hash.ts
        ├── parse-stage-skill-file.ts
        ├── serialize-stage-skill-file.ts
        ├── parse-system-prompt-file.ts
        ├── serialize-system-prompt-file.ts
        └── sync-types.ts
```

## Bentuk File yang Disarankan

### `system-prompts/*/meta.json`

Tujuan file ini:

- menyimpan metadata canonical yang memang ada di DB,
- plus metadata export yang bersifat turunan untuk sinkronisasi.

Contoh:

```json
{
  "entity": "systemPrompt",
  "name": "Default Academic Assistant",
  "description": "Primary production system prompt",
  "rootId": "systemPrompts:xxxxx",
  "currentVersion": 3,
  "isActive": true,
  "lastSyncedAt": "2026-04-09T00:00:00.000Z",
  "contentHash": "sha256:..."
}
```

Catatan:

- `currentVersion` dan `isActive` konsisten dengan model data saat ini,
- jangan tambahkan field status ala `draft/published/archived` untuk system prompt.

### `stage-skills/*/meta.json`

Tujuan file ini:

- menyimpan metadata katalog yang canonical di `stageSkills`,
- plus snapshot turunan dari status versi yang berguna untuk export.

Contoh:

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

Catatan:

- `allowedTools` dan `isEnabled` merepresentasikan katalog canonical,
- `activeVersion`, `publishedVersion`, `draftVersion` adalah **derived export snapshot**,
- importer harus tetap mengambil source authority dari DB rows yang relevan.

## Guardrail Implementasi

1. Jangan jadikan file mirror sebagai auto-active runtime source.
2. Jangan mirror hasil final prompt yang sudah ditambah runtime footer atau notes.
3. Jangan menyamakan lifecycle `system prompt` dengan lifecycle `stage skill`.
4. Jangan izinkan sync menimpa content tanpa diff dan validation.
5. Jangan bikin satu importer generik yang menghapus perbedaan surface.
6. Jangan bikin source of truth baru di `src/agent/managed/`.
7. Jangan buang format markdown + frontmatter milik stage skill saat export/import.

## Hal yang Sengaja Tidak Ditetapkan di Dokumen Ini

Dokumen ini **tidak** menetapkan:

- struktur penuh `src/agent/prompts/`,
- struktur penuh `src/agent/skills/`,
- registry target untuk seluruh prompt architecture,
- compose layer final di luar kebutuhan boundary mirror,
- adapter namespace final untuk seluruh `src/agent/`.

Itu harus dibahas di dokumen arsitektur penyatuan `src/agent/` yang terpisah, supaya scope mirror tidak melebar menjadi proposal migrasi total.

## Daftar File Terkait

### Runtime dan Resolver

- `src/lib/ai/chat-config.ts`
- `src/lib/ai/stage-skill-resolver.ts`
- `src/lib/ai/paper-mode-prompt.ts`
- `src/app/api/chat/route.ts`

### Admin Panel

- `src/components/admin/SystemPromptsManager.tsx`
- `src/components/admin/SystemPromptFormDialog.tsx`
- `src/components/admin/VersionHistoryDialog.tsx`
- `src/components/admin/StageSkillsManager.tsx`
- `src/components/admin/StageSkillFormDialog.tsx`
- `src/components/admin/StageSkillVersionHistoryDialog.tsx`

### Convex

- `convex/schema.ts`
- `convex/systemPrompts.ts`
- `convex/stageSkills.ts`
- `convex/stageSkills/constants.ts`

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
- **`src/agent/managed/` menjadi exported mirror untuk diff dan sinkronisasi eksplisit,**
- **jalur sync `system prompt` dan `stage skills` dipisah karena model datanya berbeda,**
- **runtime tetap membaca content canonical dari DB lalu membentuk prompt final lewat augmentation lokal yang tidak ikut dimirror.**

Dengan boundary ini, mirror bisa diimplementasikan tanpa merusak kontrol operasional yang sudah ada dan tanpa menyamarkan perbedaan penting antara `systemPrompts` dan `stageSkills`.
