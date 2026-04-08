# Keadaan Sekarang: Prompt, Skill, dan Hardcoded Instructions

## Tujuan Dokumen

Dokumen ini memetakan keadaan aktual arsitektur prompt, skill, dan hardcoded instructions di codebase Makalah App per 8 April 2026.

Decision anchor untuk implementasi lanjut ada di `docs/unified-prompts-skills-instructions/2026-04-08-decision-record-final-migration-boundaries-v1.md`. Jika ada konflik interpretasi, decision record itu yang menang.

Fokus dokumen ini:

1. menginventaris surface instruksi yang benar-benar aktif di runtime,
2. membedakan ownership dan source of truth tiap surface,
3. menunjukkan coupling yang membuat migrasi tidak bisa diperlakukan sebagai relokasi file semata,
4. memberi baseline yang akurat untuk proposal migrasi ke `src/agent/`.

Dokumen ini bukan proposal solusi final. Ini adalah peta realita codebase saat ini.

## Ringkasan Eksekutif

Saat ini sistem instruksi AI tidak punya satu source of truth tunggal. Ia terbagi ke beberapa lapisan dengan tanggung jawab yang berbeda:

1. konten operasional yang memang DB-managed,
2. prompt dan note code-managed,
3. skill file-based,
4. prompt assembly inline di route dan orchestrator,
5. tool descriptions yang berfungsi sebagai contract aktif ke model,
6. feature-local prompt builders di luar chat utama.

Masalah utamanya bukan sekadar "prompt tersebar", tetapi:

- ownership antar surface belum dibedakan cukup tegas,
- beberapa surface adalah hybrid antara text contract dan runtime logic,
- route besar masih menanggung terlalu banyak prompt composition,
- audit drift antar layer mahal,
- ada beberapa augmentasi instruksi yang terjadi saat runtime dan bukan di source utama.

## Peta Lapisan Instruksi Saat Ini

### 1. Database-Managed Prompt

Lapisan ini adalah prompt yang memang didesain untuk dikelola admin, di-versioning, diaktifkan, dinonaktifkan, dipublish, dan diaudit.

#### Global system prompt

- Runtime fetch prompt aktif: `src/lib/ai/chat-config.ts`
- Query dan mutation prompt: `convex/systemPrompts.ts`
- Schema storage prompt: `convex/schema.ts`
- Admin manager UI: `src/components/admin/SystemPromptsManager.tsx`

Implikasi:

- DB adalah source of truth operasional untuk global system prompt.
- DB bukan cache.
- Migrasi ke `src/agent/` tidak boleh memindahkan ownership ini ke filesystem.

#### Stage skills per stage paper workflow

- Resolver runtime: `src/lib/ai/stage-skill-resolver.ts`
- Validator konten skill: `src/lib/ai/stage-skill-validator.ts`
- Query dan mutation lifecycle skill: `convex/stageSkills.ts`
- Schema stage skill: `convex/schema.ts`
- Admin manager UI: `src/components/admin/StageSkillsManager.tsx`

Implikasi:

- Stage skills adalah DB-managed operational content.
- Runtime tetap boleh mengakses lewat adapter nantinya.
- Source of truth tetap harus di Convex.

### 2. Code-Managed Fallback Prompt dan Helper Prompt

Lapisan ini berisi prompt yang dikelola lewat code, bukan admin UI.

#### Fallback global system prompt

- Fallback text: `src/lib/ai/chat-config.ts`

Peran:

- menjaga chat tetap hidup saat DB gagal,
- memberi sinyal limited mode,
- memicu alert operasional.

Catatan penting:

- prompt fallback ini tidak berdiri sendiri,
- ia terikat ke `logFallbackActivation()` di modul yang sama,
- jadi migrasinya aman hanya jika text dipisah dari side effect logging.

#### Fallback stage instructions

- Registry fallback stage instruction: `src/lib/ai/paper-stages/index.ts`
- Dipakai saat active stage skill tidak ada atau gagal validasi: `src/lib/ai/paper-mode-prompt.ts`

Peran:

- baseline local fallback,
- guard terhadap broken DB content,
- legacy safety net saat stage skills DB tidak valid.

#### Search retriever prompt

- Prompt retriever model: `src/lib/ai/search-system-prompt.ts`

Peran:

- mengajar retriever cara mencari,
- membedakan retriever phase dari compose phase,
- memberi augmentation hints ke user message.

#### Prompt code-managed lain

- Paper workflow reminder: `src/lib/ai/paper-workflow-reminder.ts`
- Choice card YAML system prompt: `src/lib/json-render/choice-yaml-prompt.ts`
- Compaction prompts: `src/lib/ai/compaction-prompts.ts`

Implikasi arsitektural:

- lapisan ini legitimate untuk tetap ada di code,
- sebagian besar cocok dipusatkan di namespace baru,
- tetapi pemisahan text dari caller harus tetap menjaga behavior yang sama.

### 3. File-Based Skill

Saat ini skill web search quality sudah memakai pola `SKILL.md`.

- Skill content: `src/lib/ai/skills/web-search-quality/SKILL.md`
- Runtime parser dan composer: `src/lib/ai/skills/web-search-quality/index.ts`
- Public entrypoint skill: `src/lib/ai/skills/index.ts`

Peran:

- quality judgment di compose phase,
- source scoring dan checking,
- natural-language policy layer untuk response web search.

Implikasi:

- ini adalah kandidat paling bersih untuk di-rehome ke `src/agent/skills/`,
- coupling utamanya ada di loader path dan importer runtime, bukan di behavior domain.

### 4. Inline Runtime Instructions

Ini lapisan paling berat dari sisi coupling.

#### Chat route menyusun banyak system messages

- Base assembly: `src/app/api/chat/route.ts`
- Router prompt inline: `src/app/api/chat/route.ts`
- Attachment-first instruction: `src/app/api/chat/route.ts`
- Dynamic note injection dan search decision notes: `src/app/api/chat/route.ts`

Jenis instruksi yang masih inline:

- router prompt,
- workflow response discipline note,
- completed-session override,
- search/tool mode notes,
- missing artifact note,
- exact-source routing notes,
- attachment-first-response note.

Implikasi:

- beberapa string memang bisa diekstrak,
- tetapi route saat ini bukan sekadar gudang string; ia juga menentukan precedence, timing injeksi, dan kondisi kapan note dipasang,
- maka refactor yang aman harus memindahkan composition boundary, bukan hanya memindahkan string.

#### Web search orchestrator punya directive sendiri

- Compose phase directive: `src/lib/ai/web-search/orchestrator.ts`
- Search results context builder: `src/lib/ai/search-results-context.ts`

Peran:

- override perilaku model pada compose phase,
- mencegah promise-to-search,
- memberi phase semantics,
- membentuk instruction-bearing context dari hasil retriever.

Catatan penting:

- compose directive dan search-results context saling berinteraksi,
- keduanya harus diperlakukan sebagai satu contract precedence,
- jika dipisah sembarangan ke registry tanpa urutan eksplisit, perilaku compose bisa drift.

### 5. Tool Descriptions dan Feature-Specific Instruction Builders

Lapisan ini sering tidak terlihat sebagai prompt architecture, padahal secara nyata membentuk perilaku model.

#### Tool descriptions sebagai instruction surface

- Tool factory paper workflow: `src/lib/ai/paper-tools.ts`
- Tool descriptions inline di chat route: `src/app/api/chat/route.ts`

Peran:

- memberi instruksi operasional ke model,
- mendefinisikan urutan tool chain,
- menjelaskan shape data yang diharapkan,
- menjadi guardrail aktif untuk tool calling.

Catatan penting:

- tool descriptions di `paper-tools.ts` bukan string pasif,
- mereka nempel ke schema, sequencing, dan contract hasil tool,
- jadi migrasinya harus dimulai dari ekstraksi text contract, bukan memindahkan seluruh modul tool.

#### Search results context builder

- Builder: `src/lib/ai/search-results-context.ts`

Peran:

- membentuk instruction-bearing context untuk compose phase,
- menentukan mode `synthesis`, `reference_inventory`, dan `mixed`,
- mengatur fallback saat source kosong.

Catatan penting:

- ini bukan pure prompt asset,
- modul ini juga memegang branching mode dan fallback behavior,
- lebih tepat dipisah menjadi contract text + builder logic.

#### Refrasa prompt builder

- Prompt builder: `src/lib/refrasa/prompt-builder.ts`
- Caller route: `src/app/api/refrasa/route.ts`

Peran:

- membangun system prompt dan user prompt untuk flow Refrasa,
- menyatukan constitution optional, escape clause, dan output format.

Catatan penting:

- Refrasa jelas bagian dari prompt architecture,
- tetapi `prompt-builder.ts` adalah builder domain, bukan asset string murni,
- migrasi aman berarti memisahkan text contract dari builder, bukan memindahkan seluruh file tanpa pemecahan tanggung jawab.

### 6. Prompt Surface Utilitarian Non-Chat

Ada prompt surface lain yang nyata di repo, tetapi tidak semuanya perlu dimasukkan ke pusat arsitektur agent.

- Title generation prompt: `src/lib/ai/title-generator.ts`
- OCR image extraction instruction: `src/lib/file-extraction/image-ocr.ts`
- Provider validation test prompt: `src/app/api/admin/validate-provider/route.ts`
- Model compatibility verification prompts: `src/app/api/admin/verify-model-compatibility/route.ts`
- Context compaction summarization prompts: `src/lib/ai/context-compaction.ts`, `src/lib/ai/compaction-prompts.ts`

Karakteristik:

- ada yang benar-benar utilitarian dan sebaiknya tetap lokal,
- ada yang support agent runtime dan masih layak masuk orbit `src/agent/`,
- ada yang test atau verification-only sehingga tidak boleh dipaksa masuk namespace pusat.

## Alur Runtime Saat Ini

### Normal chat

1. Chat route fetch global system prompt aktif dari DB lewat `getSystemPrompt()`.
2. Jika ada paper session, route build paper mode prompt lewat `getPaperModeSystemPrompt()`.
3. Route menyusun message stack dengan tambahan file context, source context, choice context, dan runtime notes.
4. Jika search aktif, flow pindah ke orchestrator.

### Paper mode

1. Resolver mencoba ambil active stage skill dari DB.
2. Jika skill invalid atau tidak ada, fallback ke `paper-stages`.
3. Resolver aktif juga menambahkan footer artifact rules ke hasil skill.
4. Paper mode prompt menggabungkan stage instructions, memory digest, artifact summaries, invalidated artifacts, dan status notes.

File utama:

- `src/lib/ai/stage-skill-resolver.ts`
- `src/lib/ai/paper-mode-prompt.ts`

### Web search

1. Router di chat route memutuskan search vs non-search.
2. Retriever phase memakai `getSearchSystemPrompt()`.
3. Compose phase memakai SKILL.md + compose directive + search-results context.

File utama:

- `src/app/api/chat/route.ts`
- `src/lib/ai/search-system-prompt.ts`
- `src/lib/ai/web-search/orchestrator.ts`
- `src/lib/ai/search-results-context.ts`

### Refrasa

1. Refrasa memiliki prompt builder sendiri di luar chat route utama.
2. Prompt builder menyatukan constitution optional, hardcoded clause, dan output format.

File utama:

- `src/lib/refrasa/prompt-builder.ts`
- `src/app/api/refrasa/route.ts`

## Temuan Struktural Penting

### 1. Hybrid surfaces lebih banyak dari yang terlihat

Beberapa modul bukan murni prompt asset dan bukan murni business logic. Mereka adalah hybrid:

- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/chat/choice-request.ts`
- `src/lib/ai/search-results-context.ts`
- `src/lib/refrasa/prompt-builder.ts`
- `src/lib/ai/paper-tools.ts`

Konsekuensi:

- klasifikasi "tinggal move" terlalu menyederhanakan realita,
- migrasi aman harus mulai dari pemisahan `text contract` vs `runtime logic`.

### 2. Runtime augmentation adalah fakta penting

Beberapa surface DB-managed atau code-managed mengalami augmentasi lokal saat runtime:

- active stage skill ditambah `ARTIFACT_CREATION_FOOTER` di `src/lib/ai/stage-skill-resolver.ts`,
- fallback global prompt terkait side effect logging di `src/lib/ai/chat-config.ts`,
- exact-source guardrails menghasilkan lebih dari satu jenis note di `src/lib/ai/exact-source-guardrails.ts`.

Konsekuensi:

- adapter ke depan tidak boleh jadi pass-through buta,
- tetapi juga tidak boleh menjadi source of truth baru.

### 3. Route dan orchestrator masih jadi pusat precedence

Masalah terbesar saat ini bukan bahwa semua prompt tersebar di file berbeda, tetapi bahwa aturan precedence masih implicit di caller besar:

- `src/app/api/chat/route.ts`
- `src/lib/ai/web-search/orchestrator.ts`

Konsekuensi:

- kalau cuma memindahkan string tanpa memindahkan composition boundary,
- route besar tetap menjadi prompt warehouse dengan import baru saja.

## Implikasi untuk Proposal Migrasi

Migrasi ke `src/agent/` tetap masuk akal dan realistis, tetapi harus mematuhi boundary berikut:

1. `DB-managed content` tetap di DB.
2. `Pure prompt assets` boleh dipindah lebih cepat.
3. `Hybrid surfaces` harus melewati tahap `extract contract first`.
4. `Compose precedence` harus dipusatkan secara eksplisit.
5. `Verification` harus memeriksa parity behavior, bukan cuma typecheck dan lint.

## Kesimpulan

Keadaan sekarang cukup jelas menunjukkan bahwa unified architecture memang dibutuhkan.

Tetapi fakta pentingnya adalah:

- persoalannya bukan sekadar lokasi file,
- persoalannya adalah ownership, composition, runtime augmentation, dan precedence.

Karena itu, target `src/agent/` tetap valid sebagai pusat organisasi baru, tetapi implementasinya harus dibangun sebagai:

- namespace untuk prompt assets dan skills,
- adapter untuk surface DB-managed,
- compose layer untuk precedence,
- contract layer untuk memisahkan text instructions dari runtime logic.
