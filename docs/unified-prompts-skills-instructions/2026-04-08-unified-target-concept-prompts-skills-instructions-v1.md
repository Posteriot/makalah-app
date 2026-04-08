# Konsep Unified: Prompt, Skill, dan Hardcoded Instructions

## Tujuan Dokumen

Dokumen ini menyusun konsep target untuk menyatukan organisasi prompt, skill, dan hardcoded instructions di Makalah App tanpa merusak model operasional yang sudah benar, terutama source of truth di database untuk system prompt dan stage skills yang memang admin-managed.

## Rekomendasi Terbaik

Rekomendasi terbaik adalah:

**membangun unified prompt architecture di `src/agent/` sebagai layer organisasi dan composition, tanpa memindahkan source of truth database-managed content ke filesystem.**

Artinya:

- yang disatukan adalah struktur, taxonomy, dan composition flow,
- bukan semua persistence dipaksa menjadi file di `src/`.

Ini pilihan terbaik karena:

1. menghormati arsitektur admin-managed yang sudah ada,
2. mengurangi prompt scattering di runtime,
3. membuat ownership jelas,
4. tetap memungkinkan audit dan testing yang lebih rapi,
5. menghindari duplikasi source of truth.

## Prinsip Desain

### 1. Pisahkan storage dari composition

Harus dibedakan antara:

- tempat konten disimpan,
- tempat konten dirakit menjadi runtime messages.

Storage bisa tetap hybrid:

- DB untuk admin-managed prompt/skill,
- file untuk code-owned prompt assets.

Tapi composition harus terpusat secara arsitektural.

### 2. Bedakan jenis instruksi secara eksplisit

Struktur target harus membedakan:

- base prompt,
- fallback prompt,
- runtime contextual prompt,
- router/classifier prompt,
- retriever prompt,
- compose skill,
- tool description contract,
- feature-specific prompt builder,
- local note yang hanya valid pada flow tertentu.

### 3. Jangan jadikan route sebagai prompt warehouse

Route boleh memutuskan kapan instruksi dipakai, tetapi tidak boleh menjadi tempat utama menyimpan teks instruksi panjang.

### 4. Pertahankan DB untuk domain yang memang operasional

Tetap pertahankan:

- `systemPrompts` sebagai source of truth prompt global aktif,
- `stageSkills` dan `stageSkillVersions` sebagai source of truth skill per stage.

Kalau ini dipindahkan ke file, lo bakal kehilangan:

- lifecycle admin,
- activate/deactivate,
- publish/rollback,
- audit log,
- runtime validation berbasis DB.

### 5. File-based prompts harus hidup di namespace yang sama

Prompt code-owned yang sekarang tersebar di `src/lib/ai` dan `src/lib/json-render` harus dikonsolidasikan secara namespace, walau implementasi logiknya masih bisa tetap di modul masing-masing.

### 6. Bedakan prompt agentic vs prompt utilitarian

Tidak semua prompt yang ada di repo harus masuk `src/agent/`.

Yang cocok masuk `src/agent/`:

- prompt yang membentuk perilaku agent,
- prompt yang reusable lintas flow,
- prompt yang menjadi instruction contract untuk message stack, tools, skills, atau router.

Yang tidak perlu dipaksa masuk `src/agent/`:

- prompt utilitarian feature-local,
- prompt test/verification,
- prompt satu-fungsi yang hanya dipakai untuk helper teknis seperti OCR atau title generation.

Kalau semua prompt utilitarian ikut dipindah, `src/agent/` justru akan menjadi folder campur-aduk baru.

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
        compose-phase-directive.ts
        search-results-context-prompt.ts
      tools/
        paper-tool-descriptions.ts
      ui/
        choice-card-system-prompt.ts
      compaction/
        compaction-prompts.ts
      runtime-notes/
        artifact-notes.ts
        search-mode-notes.ts
        completed-session-notes.ts
        attachment-notes.ts
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
    compose/
      build-chat-system-messages.ts
      build-paper-mode-message-stack.ts
      build-search-compose-messages.ts
      build-router-messages.ts
    contracts/
      prompt-kinds.ts
      ownership.ts
      message-stack.ts
      tool-instruction-kinds.ts
```

## Makna Tiap Folder

### `src/agent/prompts/`

Tempat semua prompt asset yang code-owned.

Isi:

- string prompt reusable,
- note reusable,
- directive phase-specific,
- prompt router,
- feature-specific prompt assets yang memang code-owned.

Bukan tempat:

- business logic berat,
- DB fetch logic,
- tool execution,
- prompt utilitarian yang hanya hidup untuk helper teknis lokal.

### `src/agent/skills/`

Tempat skill file-based yang memang natural-language driven.

Untuk fase awal, cukup pindahkan atau re-home:

- `src/lib/ai/skills/web-search-quality/*`

ke namespace baru yang lebih jelas.

### `src/agent/registry/`

Layer registry untuk menjawab:

- prompt mana tersedia,
- skill mana tersedia,
- tool instruction mana tersedia,
- ownership-nya apa,
- source-nya DB atau file,
- dipakai di mode apa.

Contoh tanggung jawab:

- mendaftarkan `fallback-system-prompt`,
- mendaftarkan `search-retriever-system-prompt`,
- mendaftarkan `web-search-quality-skill`,
- mendaftarkan `paper-tool-descriptions`.

### `src/agent/compose/`

Ini layer paling penting. Semua perakitan runtime messages harus masuk sini.

Target fungsi:

- `buildChatSystemMessages()`
- `buildPaperModeMessageStack()`
- `buildSearchComposeMessages()`
- `buildRouterMessages()`

Route memanggil builder ini, bukan menyusun string panjang sendiri.

### `src/agent/contracts/`

Tempat kontrak taxonomy.

Contoh definisi yang perlu eksplisit:

- `PromptKind`
- `PromptSource`
- `PromptOwnership`
- `MessageStackLayer`

Ini penting supaya unified architecture bukan cuma soal folder, tapi juga soal bahasa konseptual yang sama di seluruh codebase.

## Ownership Model yang Diusulkan

### A. DB-managed content

Tetap di DB:

- global system prompt aktif,
- stage skills per stage.

Masuk registry sebagai:

- `source: "convex-db"`
- `ownership: "admin-managed"`

### B. Code-managed reusable prompts

Pindah atau direlokasi ke `src/agent/prompts/`:

- fallback global prompt,
- search retriever prompt,
- compose phase directive,
- search results context guidance,
- paper workflow reminder,
- choice card prompt,
- compaction prompts,
- feature prompt builders seperti Refrasa,
- reusable runtime notes.

Masuk registry sebagai:

- `source: "code"`
- `ownership: "repo-managed"`

### C. File-based skills

Tetap file-based, tapi berada di namespace `src/agent/skills/`.

Masuk registry sebagai:

- `source: "file"`
- `ownership: "repo-managed"`

### D. Tool description instructions

Tetap berasal dari definisi tool, tetapi diinventaris dan diorganisasikan sebagai instruction contract.

Masuk registry sebagai:

- `source: "code"`
- `ownership: "repo-managed"`
- `kind: "tool-description"`

### E. Utility and verification prompts

Tetap boleh tinggal dekat feature masing-masing.

Contoh yang saat ini lebih tepat tetap local:

- title generation prompt di `src/lib/ai/title-generator.ts`,
- OCR extraction instruction di `src/lib/file-extraction/image-ocr.ts`,
- admin provider validation prompt di `src/app/api/admin/validate-provider/route.ts`,
- admin model compatibility verification prompts di `src/app/api/admin/verify-model-compatibility/route.ts`.

Mereka bisa didaftarkan dalam inventaris dokumentasi, tetapi tidak harus menjadi bagian dari runtime prompt registry agent utama.

## Mapping dari Struktur Lama ke Struktur Target

### Prompt/fallback/helper

- `src/lib/ai/chat-config.ts`
  - `getMinimalFallbackPrompt()` pindah ke `src/agent/prompts/global/fallback-system-prompt.ts`
  - DB fetch logic tetap bisa stay di `chat-config.ts` atau dipindah ke adapter tipis

- `src/lib/ai/search-system-prompt.ts`
  - pindah ke `src/agent/prompts/search/retriever-system-prompt.ts`

- `src/lib/ai/paper-workflow-reminder.ts`
  - pindah ke `src/agent/prompts/global/paper-workflow-reminder.ts`

- `src/lib/json-render/choice-yaml-prompt.ts`
  - pindah ke `src/agent/prompts/ui/choice-card-system-prompt.ts`

- `src/lib/ai/compaction-prompts.ts`
  - pindah ke `src/agent/prompts/compaction/compaction-prompts.ts`

- `src/lib/ai/search-results-context.ts`
  - logic instruction-bearing string dipindah ke `src/agent/prompts/search/search-results-context-prompt.ts`
  - builder tipis bisa tetap tinggal dekat search stack bila perlu

- `src/lib/refrasa/prompt-builder.ts`
  - asset prompt-nya dipisahkan ke `src/agent/prompts/features/refrasa-system-prompt.ts`
  - builder domain Refrasa tetap bisa tinggal di modul feature

### Search skill

- `src/lib/ai/skills/web-search-quality/`
  - pindah ke `src/agent/skills/search/web-search-quality/`

### Tool descriptions

- instruction-rich descriptions dari `src/lib/ai/paper-tools.ts`
  - tidak harus dipindah seluruh logic tool-nya,
  - tetapi template deskripsinya idealnya diekstrak ke `src/agent/prompts/tools/` atau registry sejenis
  - factory tools tinggal mengimpor string atau formatter description dari sana

### Inline prompts di route

Harus diekstrak bertahap:

- router prompt dari [src/app/api/chat/route.ts](/C:/Users/eriks/Desktop/makalahapp/src/app/api/chat/route.ts#L1145) ke `src/agent/prompts/router/search-mode-router-prompt.ts`
- completed-session override ke `src/agent/prompts/runtime-notes/completed-session-notes.ts`
- workflow response discipline note ke `src/agent/prompts/runtime-notes/artifact-notes.ts`
- search/tool mode notes ke `src/agent/prompts/runtime-notes/search-mode-notes.ts`
- attachment note ke `src/agent/prompts/runtime-notes/attachment-notes.ts`

### Message composition

- logic assembly dari `chat/route.ts` dipindah ke `src/agent/compose/build-chat-system-messages.ts`
- logic assembly websearch compose dari orchestrator dipindah ke `src/agent/compose/build-search-compose-messages.ts`

## Yang Sengaja Tidak Dipindahkan

### 1. `systemPrompts` dan `stageSkills` di Convex

Ini harus tetap ada. Alasan:

- mereka domain object operasional,
- ada lifecycle admin,
- ada schema, validation, dan audit,
- sudah dipakai UI operasional.

### 2. Business logic resolver

Contoh:

- `resolveStageInstructions()`
- validation flow
- publish/activate/rollback
- execute function tool
- feature route logic seperti Refrasa

Logic seperti ini tidak perlu pindah ke `src/agent/prompts/`. Yang berubah adalah lokasi asset instruksinya, bukan semua service logic.

### 3. Flow-specific logic yang memang procedural

Prompt builder bisa dipusatkan, tapi flow control tetap boleh tinggal di route/orchestrator kalau memang di situlah dependency runtime tersedia.

### 4. Utility prompts yang feature-local

Prompt helper seperti title generation, OCR, atau admin verification test boleh tetap tinggal di feature masing-masing selama:

- tidak ikut membentuk message stack chat utama,
- tidak reusable lintas mode agent,
- tidak menjadi source of truth perilaku agent.

## Bentuk Runtime Setelah Unified

### Chat route

Chat route idealnya hanya melakukan:

1. fetch context runtime,
2. panggil prompt/message builders,
3. panggil model,
4. handle tool flow dan persistence.

Bukan:

- menyimpan banyak string prompt panjang,
- menyusun banyak note inline secara manual.

### Search orchestrator

Orchestrator idealnya:

1. menjalankan retriever phase,
2. meminta `buildSearchComposeMessages()` untuk compose phase,
3. menjalankan compose model.

Ia tetap punya flow control, tapi bukan prompt warehouse.

## Kontrak Taxonomy yang Disarankan

Contoh taxonomy yang perlu dipakai secara konsisten:

### Prompt kind

- `global-base`
- `global-fallback`
- `paper-context`
- `search-retriever`
- `search-compose-directive`
- `router`
- `ui-visual-language`
- `runtime-note`
- `compaction`
- `tool-description`
- `feature-system-prompt`

### Ownership

- `admin-managed`
- `repo-managed`
- `runtime-generated`

### Source

- `convex-db`
- `code-module`
- `file-skill`
- `computed`
- `feature-local`

### Assembly layer

- `base`
- `context`
- `guardrail`
- `phase-override`
- `ui-contract`

Dengan ini, setiap prompt baru punya tempat konseptual yang jelas.

## Tahapan Implementasi yang Paling Aman

### Tahap 1. Buat namespace baru tanpa ubah perilaku

- buat `src/agent/`
- pindahkan prompt code-owned yang tidak menyentuh DB
- buat registry sederhana
- inventaris tool descriptions yang mengandung instruction contract
- tandai prompt utilitarian yang sengaja tetap tinggal di feature-local modules

Tujuan:

- dapat folder unified dulu,
- tanpa risiko mengubah behavior model.

### Tahap 2. Extract inline prompt strings

- pindahkan router prompt,
- pindahkan runtime notes yang reusable,
- ganti route agar import dari registry/prompt modules

Tujuan:

- kurangi coupling di route,
- behavior tetap sama.

### Tahap 3. Centralize message composition

- buat builders di `src/agent/compose/`
- route/orchestrator cukup panggil builder

Tujuan:

- audit jadi mudah,
- testing assembly lebih mudah.

### Tahap 4. Rapikan search skill namespace

- re-home `web-search-quality`
- satukan prompt search, search results context, dan skill search dalam satu subtree agent

Tujuan:

- search stack jadi coherent.

### Tahap 5. Rapikan prompt builder feature dan tool descriptions

- ekstrak asset prompt Refrasa dan feature lain yang sejenis
- ekstrak string tool descriptions yang panjang ke registry/template layer

Tujuan:

- semua instruction-bearing assets punya taxonomy yang sama

### Tahap 6. Tambahkan dokumentasi ownership

- definisikan prompt mana admin-managed,
- prompt mana repo-managed,
- prompt mana runtime-generated,
- tool description mana yang dianggap contract AI.

Tujuan:

- menghindari drift organisasi di masa depan.

## Risiko Jika Unified Dilakukan dengan Cara yang Salah

### Risiko 1. Merusak admin operations

Kalau global prompt dan stage skill dipindah jadi file static, admin panel kehilangan fungsi operasionalnya.

### Risiko 2. Muncul dual source of truth baru

Kalau file di `src/agent/` dan DB sama-sama dianggap master, hasilnya lebih buruk daripada sekarang.

### Risiko 3. Refactor folder tanpa refactor composition

Kalau cuma memindahkan file ke folder baru, tapi route tetap menyimpan prompt inline, masalah inti tidak selesai.

### Risiko 4. Over-centralization

Kalau title generation, OCR, provider validation, dan verification prompts ikut dipaksa masuk `src/agent/`, hasilnya:

- namespace agent jadi bising,
- boundary agentic vs utilitarian kabur,
- biaya refactor lebih besar daripada manfaatnya.

## Keputusan Konseptual Final

### Yang harus jadi pusat

`src/agent/` harus menjadi pusat untuk:

- taxonomy,
- registry,
- prompt assets yang code-owned,
- skill assets yang file-owned,
- builder/composer untuk runtime messages.

### Yang tidak boleh dipusatkan secara paksa

`src/agent/` tidak boleh dijadikan satu-satunya tempat persistence untuk:

- system prompt aktif yang dikelola admin,
- stage skills aktif yang dikelola admin.

## Kesimpulan

Unified architecture yang ideal untuk repo ini adalah model berikut:

- **DB tetap jadi source of truth untuk content yang operasional dan editable**
- **`src/agent/` jadi source of organization dan composition**
- **route/orchestrator berhenti menyimpan prompt panjang secara inline**
- **semua prompt/skill baru wajib masuk taxonomy dan registry yang sama**
- **prompt utilitarian non-agentic boleh tetap feature-local dengan taxonomy yang jelas**

Kalau target ini diikuti, hasil akhirnya bukan sekadar "lebih rapi foldernya", tetapi:

- lebih mudah diaudit,
- lebih mudah dites,
- lebih mudah dipelihara,
- lebih sulit drift,
- dan tetap kompatibel dengan admin workflow yang sudah ada.
