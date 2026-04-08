# Konsep Unified: Prompt, Skill, dan Hardcoded Instructions

## Tujuan Dokumen

Dokumen ini menyusun konsep target untuk menyatukan organisasi prompt, skill, dan hardcoded instructions di Makalah App tanpa merusak model operasional yang sudah benar, terutama source of truth di database untuk system prompt dan stage skills yang memang admin-managed.

Decision anchor untuk konsep target ini ada di `docs/unified-prompts-skills-instructions/2026-04-08-decision-record-final-migration-boundaries-v1.md`. Dokumen konsep ini harus ditafsirkan sesuai boundary final di decision record.

Versi ini menegaskan satu hal penting:

**yang disatukan bukan sekadar lokasi file, tetapi ownership, contract text, composition boundary, dan precedence runtime.**

## Rekomendasi Terbaik

Rekomendasi terbaik adalah:

**membangun unified prompt architecture di `src/agent/` sebagai layer organisasi, contracts, adapters, dan composition, tanpa memindahkan source of truth database-managed content ke filesystem dan tanpa memindahkan mentah-mentah modul hybrid yang masih bercampur dengan runtime logic.**

Artinya:

- yang disatukan adalah struktur, taxonomy, contracts, dan composition flow,
- bukan semua persistence dipaksa menjadi file di `src/`,
- bukan semua file yang mengandung string instruksi langsung dipindah ke `src/agent/`.

Ini pilihan terbaik karena:

1. menghormati arsitektur admin-managed yang sudah ada,
2. mengurangi prompt scattering di runtime,
3. membuat ownership jelas,
4. membuat verification lebih rapi,
5. menghindari duplikasi source of truth,
6. mencegah `src/agent/` menjadi dump folder baru untuk modul campuran.

## Prinsip Desain

### 1. Pisahkan storage dari composition

Harus dibedakan antara:

- tempat konten disimpan,
- tempat konten dirakit menjadi runtime messages.

Storage bisa tetap hybrid:

- DB untuk admin-managed prompt atau skill,
- file untuk code-owned prompt assets dan skills.

Tetapi composition harus dipusatkan secara arsitektural.

### 2. Pisahkan text contract dari runtime logic

Ini prinsip yang belum eksplisit di versi awal.

Harus dibedakan antara:

- string atau text instruction,
- builder yang menambahkan context dinamis,
- resolver yang fetch data,
- orchestrator yang menentukan urutan dan precedence.

Surface seperti ini wajib dipecah dulu sebelum dianggap "berhasil dimigrasi":

- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/ai/search-results-context.ts`
- `src/lib/chat/choice-request.ts`
- `src/lib/ai/paper-tools.ts`
- `src/lib/refrasa/prompt-builder.ts`

### 3. Bedakan jenis instruksi secara eksplisit

Struktur target harus membedakan:

- base prompt,
- fallback prompt,
- runtime contextual prompt,
- router atau classifier prompt,
- retriever prompt,
- compose skill,
- tool description contract,
- feature-specific prompt contract,
- local runtime note yang valid hanya pada flow tertentu.

### 4. Jangan jadikan route sebagai prompt warehouse

Route boleh memutuskan kapan instruksi dipakai, tetapi tidak boleh menjadi tempat utama menyimpan teks instruksi panjang atau precedence rules implisit.

### 5. Pertahankan DB untuk domain yang memang operasional

Tetap pertahankan:

- `systemPrompts` sebagai source of truth prompt global aktif,
- `stageSkills` dan `stageSkillVersions` sebagai source of truth skill per stage,
- `styleConstitutions` sebagai source of truth constitution Refrasa.

Kalau ini dipindahkan ke file, lo bakal kehilangan:

- lifecycle admin,
- activate atau deactivate,
- publish atau rollback,
- audit log,
- runtime validation berbasis DB.

### 6. File-based prompts harus hidup di namespace yang sama

Prompt code-owned yang tersebar di `src/lib/ai`, `src/lib/json-render`, dan subdomain lain harus dikonsolidasikan secara namespace, walau caller atau domain logic-nya belum tentu ikut pindah.

### 7. Bedakan prompt agentic vs prompt utilitarian

Tidak semua prompt yang ada di repo harus masuk `src/agent/`.

Yang cocok masuk `src/agent/`:

- prompt yang membentuk perilaku agent,
- prompt yang reusable lintas flow,
- prompt yang menjadi instruction contract untuk message stack, tools, skills, atau router.

Yang tidak perlu dipaksa masuk `src/agent/`:

- prompt utilitarian feature-local,
- prompt test atau verification,
- prompt satu-fungsi yang hanya dipakai helper teknis seperti OCR atau title generation.

## Struktur Ideal yang Diusulkan

```text
src/
  agent/
    prompts/
      global/
        fallback-system-prompt.ts
        paper-workflow-reminder.ts
      features/
        refrasa-system-prompt.ts
      router/
        search-mode-router-prompt.ts
      search/
        retriever-system-prompt.ts
        retriever-user-augmentation.ts
        compose-phase-directive.ts
        search-results-context-prompt.ts
      tools/
        paper-tool-descriptions.ts
        chat-tool-descriptions.ts
      ui/
        choice-card-system-prompt.ts
      compaction/
        compaction-prompts.ts
      runtime-notes/
        attachment-notes.ts
        choice-context-notes.ts
        exact-source-inspection-rules.ts
        source-provenance-rules.ts
    skills/
      search/
        web-search-quality/
          SKILL.md
          index.ts
          scripts/
    registry/
      prompt-registry.ts
      skill-registry.ts
      tool-instruction-registry.ts
    adapters/
      system-prompts.ts
      stage-skills.ts
      style-constitutions.ts
    compose/
      build-chat-system-messages.ts
      build-paper-mode-message-stack.ts
      build-search-compose-messages.ts
      build-search-results-context.ts
      build-choice-context-note.ts
      build-refrasa-prompts.ts
    contracts/
      prompt-kinds.ts
      ownership.ts
      prompt-surface-status.ts
      message-stack.ts
      tool-instruction-kinds.ts
```

## Makna Tiap Folder

### `src/agent/prompts/`

Tempat semua prompt asset yang code-owned atau hasil ekstraksi contract text.

Isi:

- string prompt reusable,
- note reusable,
- directive phase-specific,
- router prompt,
- feature-specific prompt contracts yang memang code-owned.

Bukan tempat:

- business logic berat,
- DB fetch logic,
- tool execution,
- heuristics non-prompt,
- classifier runtime,
- prompt utilitarian yang hanya hidup untuk helper teknis lokal.

### `src/agent/skills/`

Tempat skill file-based yang memang natural-language driven.

Fase awal paling realistis:

- re-home `src/lib/ai/skills/web-search-quality/*`.

### `src/agent/registry/`

Layer registry untuk menjawab:

- prompt mana tersedia,
- skill mana tersedia,
- tool instruction mana tersedia,
- ownership-nya apa,
- source-nya apa,
- status migrasinya apa,
- dipakai di mode apa.

### `src/agent/adapters/`

Layer adapter untuk surface yang source of truth-nya tetap di DB.

Prinsip adapter:

- tipis,
- eksplisit,
- tidak membuat source of truth baru,
- tidak menyimpan shadow state.

### `src/agent/compose/`

Ini layer paling penting.

Semua perakitan runtime messages harus bergerak ke sini secara bertahap.

Target fungsi:

- `buildChatSystemMessages()`
- `buildPaperModeMessageStack()`
- `buildSearchComposeMessages()`
- `buildSearchResultsContext()`
- `buildChoiceContextNote()`
- `buildRefrasaPrompts()`

Catatan:

- composer boleh menerima hasil query atau adapter,
- composer tidak harus menjadi tempat query data mentah.

### `src/agent/contracts/`

Tempat kontrak taxonomy.

Contoh definisi yang perlu eksplisit:

- `PromptKind`
- `PromptSource`
- `PromptOwnership`
- `PromptSurfaceStatus`
- `MessageStackLayer`
- `ToolInstructionKind`

Ini penting supaya unified architecture bukan cuma soal folder, tapi juga bahasa konseptual yang sama di seluruh codebase.

## Ownership Model yang Diusulkan

### A. DB-managed content

Tetap di DB:

- global system prompt aktif,
- stage skills per stage,
- style constitutions untuk Refrasa.

Masuk registry sebagai:

- `source: "convex-db"`
- `ownership: "admin-managed"`

### B. Code-managed prompt assets

Pindah atau direlokasi ke `src/agent/prompts/`:

- paper workflow reminder,
- search retriever prompt,
- search compose directive,
- choice card prompt,
- compaction prompts,
- exact-source rules strings,
- runtime notes inline yang cukup bersih.

Masuk registry sebagai:

- `source: "code"`
- `ownership: "repo-managed"`

### C. Hybrid prompt surfaces

Masuk jalur `extract contract first`:

- paper mode builder,
- search results context builder,
- choice context note builder,
- tool descriptions,
- Refrasa prompt builder.

Masuk registry sebagai:

- `source: "code"`
- `ownership: "repo-managed"`
- `status: "extract-contract-first"`

### D. File-based skills

Tetap file-based, tetapi berada di namespace `src/agent/skills/`.

Masuk registry sebagai:

- `source: "filesystem"`
- `ownership: "repo-managed"`

### E. Local utilities dan ops artifacts

Tetap di domain lokal atau migrations:

- title generation,
- OCR extraction,
- admin verification prompts,
- migration prompt assets,
- stage skill migration templates.

## Alur Runtime Target

### Chat flow target

1. Route mengambil data dan state yang diperlukan.
2. Route memanggil adapter untuk surface DB-managed.
3. Route memanggil compose layer untuk menyusun system messages.
4. Route mengeksekusi model dengan message stack yang sudah dirakit composer.

### Paper mode target

1. Resolver atau adapter menyediakan active stage skill atau fallback.
2. Composer paper mode merakit memory digest, artifact summaries, invalidated artifacts, status note, dan stage instruction.
3. Route tidak lagi memegang prompt string panjang atau precedence implicit.

### Web search target

1. Router prompt jadi asset terpisah.
2. Retriever prompt dan augmentation jadi asset terpisah.
3. Search results context builder memegang branching mode secara eksplisit.
4. Search compose messages disusun di compose layer dengan precedence yang terdokumentasi.

### Refrasa target

1. Constitution tetap diambil dari DB lewat adapter.
2. Prompt contracts Refrasa hidup di namespace `src/agent/prompts/features/`.
3. Builder domain Refrasa tetap boleh lokal bila memang lebih sehat.

## Risiko Arsitektural yang Harus Diantisipasi

### 1. Relokasi palsu

Risiko:

- file dipindah ke `src/agent/`,
- tetapi tanggung jawab asli tidak berubah,
- hasilnya cuma import path baru.

Mitigasi:

- pakai status `extract contract first`,
- jangan pindah modul hybrid mentah-mentah.

### 2. Dual source of truth terselubung

Risiko:

- adapter diam-diam menyimpan fallback baru,
- text contract hasil ekstraksi menyimpang dari DB-managed content,
- prompt final tidak jelas authority-nya.

Mitigasi:

- adapter harus tipis,
- registry wajib mencatat ownership dan source,
- composer hanya menyusun, bukan menyimpan source baru.

### 3. Drift precedence

Risiko:

- search directive, runtime notes, dan tool instructions berubah urutan,
- output model bergeser walau text prompt sama.

Mitigasi:

- precedence system messages harus didefinisikan eksplisit,
- parity verification wajib mengecek urutan stack, bukan cuma keberadaan file baru.

### 4. Verification yang dangkal

Risiko:

- migrasi dinyatakan selesai karena lint dan typecheck lolos,
- padahal behavior tool calling dan search compose berubah.

Mitigasi:

- wajib jalankan parity tests dan flow checks untuk area kritikal.

## Aturan Adopsi

### Boleh dilakukan segera

- relokasi asset yang pure,
- relokasi skill file-based,
- ekstraksi string inline yang jelas.

### Harus menunggu pemisahan kontrak

- paper mode builder,
- search results context builder,
- choice context builder,
- tool descriptions,
- Refrasa prompt builder.

### Tidak perlu dipaksakan masuk

- utility prompts satu-fungsi,
- verification prompts,
- migration assets,
- non-prompt heuristics.

## Kesimpulan

Unified prompt architecture yang benar untuk repo ini adalah:

- **DB tetap memegang content operasional yang memang admin-managed,**
- **`src/agent/` memegang prompt assets, skills, adapters, contracts, dan composition,**
- **surface hybrid dipecah dulu menjadi text contract dan runtime logic,**
- **composer memegang precedence runtime secara eksplisit.**

Itu versi yang paling realistis, paling aman, dan paling sesuai dengan bentuk codebase saat ini.
