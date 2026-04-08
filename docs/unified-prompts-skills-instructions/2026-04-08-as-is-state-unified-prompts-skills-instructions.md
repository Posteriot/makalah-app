# Keadaan Sekarang: Prompt, Skill, dan Hardcoded Instructions

## Tujuan Dokumen

Dokumen ini memetakan keadaan aktual arsitektur prompt, skill, dan hardcoded instructions di codebase Makalah App per 8 April 2026. Fokusnya bukan proposal solusi, tetapi inventaris sumber instruksi yang benar-benar dipakai runtime, titik coupling, dan masalah organisasi yang muncul dari struktur saat ini.

## Ringkasan Eksekutif

Saat ini sistem instruksi AI tidak berada dalam satu source of truth tunggal. Ia tersebar ke beberapa lapisan yang masing-masing punya fungsi berbeda:

1. Konten yang dikelola admin dan disimpan di database Convex.
2. Konten fallback dan helper prompt yang hardcoded di `src/lib`.
3. Skill berbasis file `SKILL.md`.
4. Prompt dan note inline yang dibangun langsung di flow runtime, terutama di `src/app/api/chat/route.ts` dan orchestrator web search.
5. Tool descriptions dan feature-specific prompt builders yang juga berfungsi sebagai instruction layer.

Masalah utamanya bukan sekadar "file tercecer", tetapi:

- ownership instruksi belum dibedakan dengan tegas,
- source of truth berbeda-beda tergantung jenis instruksi,
- perakitan final system messages masih tersebar,
- audit drift antar layer cukup mahal,
- route besar menanggung terlalu banyak tanggung jawab prompt composition.

## Peta Lapisan Instruksi Saat Ini

### 1. Database-Managed Prompt

Lapisan ini adalah prompt yang memang didesain untuk bisa dikelola admin, di-versioning, diaktifkan, dinonaktifkan, dan diaudit.

#### Global system prompt

- Runtime fetch prompt aktif: [src/lib/ai/chat-config.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/chat-config.ts#L90)
- Query/mutation prompt di Convex: [convex/systemPrompts.ts](/C:/Users/eriks/Desktop/makalahapp/convex/systemPrompts.ts#L14)
- Schema storage prompt: [convex/schema.ts](/C:/Users/eriks/Desktop/makalahapp/convex/schema.ts#L281)
- Admin manager UI: [src/components/admin/SystemPromptsManager.tsx](/C:/Users/eriks/Desktop/makalahapp/src/components/admin/SystemPromptsManager.tsx#L66)

#### Stage skills per stage paper workflow

- Resolver runtime: [src/lib/ai/stage-skill-resolver.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/stage-skill-resolver.ts#L81)
- Validator konten skill: [src/lib/ai/stage-skill-validator.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/stage-skill-validator.ts#L136)
- Query/mutation lifecycle skill: [convex/stageSkills.ts](/C:/Users/eriks/Desktop/makalahapp/convex/stageSkills.ts#L105)
- Schema stage skill: [convex/schema.ts](/C:/Users/eriks/Desktop/makalahapp/convex/schema.ts#L298)
- Admin manager UI: [src/components/admin/StageSkillsManager.tsx](/C:/Users/eriks/Desktop/makalahapp/src/components/admin/StageSkillsManager.tsx#L41)

#### Implikasi arsitektural

- DB bukan sekadar cache. Ia adalah source of truth operasional untuk prompt global dan stage skills.
- Karena ada UI admin, versioning, activate/deactivate, publish, rollback, dan validation, storage ini punya peran domain-level yang nyata.
- Artinya, upaya unifikasi tidak boleh secara sembrono memindahkan semua source of truth ke filesystem.

### 2. Code-Managed Fallback Prompt dan Helper Prompt

Lapisan ini berisi prompt yang dikelola lewat code, bukan admin UI.

#### Fallback global system prompt

- Fallback minimal ketika DB gagal atau tidak ada active prompt: [src/lib/ai/chat-config.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/chat-config.ts#L13)

Peran:

- menjaga chat tetap hidup,
- memberi sinyal limited mode,
- menyalakan alert operasional.

#### Fallback stage instructions

- Registry fallback stage instruction: [src/lib/ai/paper-stages/index.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/paper-stages/index.ts#L34)
- Dipakai saat stage skill aktif tidak ada atau gagal validasi: [src/lib/ai/paper-mode-prompt.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/paper-mode-prompt.ts#L125)

Peran:

- baseline local fallback,
- guard terhadap broken DB content,
- transisi historis sebelum semua stage skill hidup stabil di DB.

#### Search retriever prompt

- Prompt retriever model: [src/lib/ai/search-system-prompt.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/search-system-prompt.ts#L12)

Peran:

- mengajar model retriever cara mencari,
- membedakan phase retriever dari compose,
- memberi priority-source guidance.

#### Prompt lain yang code-owned

- Paper workflow reminder: [src/lib/ai/paper-workflow-reminder.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/paper-workflow-reminder.ts#L15)
- Choice card YAML system prompt: [src/lib/json-render/choice-yaml-prompt.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/json-render/choice-yaml-prompt.ts#L12)
- Compaction prompts: [src/lib/ai/compaction-prompts.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/compaction-prompts.ts#L12)

#### Implikasi arsitektural

- Lapisan ini legitimate untuk tetap ada di code.
- Masalahnya bukan bahwa mereka hardcoded, tetapi bahwa penempatannya belum punya satu namespace organisasi yang jelas.

### 3. File-Based Skill

Saat ini skill web search quality sudah memakai pola `SKILL.md`.

- Skill content: [src/lib/ai/skills/web-search-quality/SKILL.md](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/skills/web-search-quality/SKILL.md#L1)
- Runtime parser dan composer: [src/lib/ai/skills/web-search-quality/index.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/skills/web-search-quality/index.ts#L23)
- Public entrypoint skill: [src/lib/ai/skills/index.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/skills/index.ts#L4)

Peran:

- quality judgment di phase compose,
- source scoring/checking,
- natural-language policy layer untuk search response.

#### Implikasi arsitektural

- Ini sudah paling dekat ke pola "unified prompt assets".
- Tapi dia masih hidup di `src/lib/ai/skills`, sementara prompt lain ada di lokasi lain.

### 4. Inline Runtime Instructions

Ini lapisan paling berat dari sisi coupling.

#### Chat route menyusun banyak system messages

- Base assembly: [src/app/api/chat/route.ts](/C:/Users/eriks/Desktop/makalahapp/src/app/api/chat/route.ts#L788)
- Dynamic note injection: [src/app/api/chat/route.ts](/C:/Users/eriks/Desktop/makalahapp/src/app/api/chat/route.ts#L2729)
- Router prompt inline: [src/app/api/chat/route.ts](/C:/Users/eriks/Desktop/makalahapp/src/app/api/chat/route.ts#L1145)
- Search decision note flow: [src/app/api/chat/route.ts](/C:/Users/eriks/Desktop/makalahapp/src/app/api/chat/route.ts#L2287)

Jenis instruksi yang masih inline:

- router prompt,
- workflow response discipline note,
- completed-session override,
- search/tool mode notes,
- missing artifact note,
- exact-source routing notes,
- attachment-first-response note.

#### Web search orchestrator juga punya directive sendiri

- Compose phase directive: [src/lib/ai/web-search/orchestrator.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/web-search/orchestrator.ts#L47)

Peran:

- override perilaku model pada compose phase,
- mencegah promise-to-search,
- memutus interference dari prompt lain.

#### Implikasi arsitektural

- Inline prompt semacam ini sering valid secara fungsi, tapi buruk untuk maintainability jika jumlahnya besar.
- Saat satu route memegang too many prompt strings, review drift jadi susah.
- Reuse rendah karena note menjadi "terkunci" di route tertentu.

### 5. Tool Description dan Feature-Specific Instruction Builders

Lapisan ini sebelumnya belum disebut eksplisit, padahal secara nyata ikut membentuk perilaku model.

#### Tool descriptions sebagai instruction surface

Tool descriptions di AI SDK bukan metadata pasif. Mereka adalah bagian dari instruction layer yang dibaca model untuk memutuskan kapan dan bagaimana tool dipakai.

- Tool factory paper workflow: [src/lib/ai/paper-tools.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/paper-tools.ts#L58)
- Contoh deskripsi `startPaperSession`: [src/lib/ai/paper-tools.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/paper-tools.ts#L68)
- Contoh deskripsi `updateStageData`: [src/lib/ai/paper-tools.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/paper-tools.ts#L125)
- Contoh deskripsi `compileDaftarPustaka`: [src/lib/ai/paper-tools.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/paper-tools.ts#L273)

Peran:

- memberi instruksi operasional ke model,
- mendefinisikan auto-stage behavior,
- menjelaskan format data yang diharapkan,
- menjadi guardrail tool calling di luar system prompt utama.

#### Search compose context builder

- Search results context builder: [src/lib/ai/search-results-context.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/search-results-context.ts#L63)

Peran:

- membentuk instruction-bearing context untuk compose phase,
- mengatur mode `synthesis`, `reference_inventory`, dan `mixed`,
- menentukan bagaimana raw findings dikirim ke model.

Ini bukan sekadar formatter. Ia adalah instruction layer karena teks yang dibangunnya berisi perintah langsung seperti "You MUST synthesize these sources in your response."

#### Feature-specific prompt builder di luar chat utama

- Refrasa prompt builder: [src/lib/refrasa/prompt-builder.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/refrasa/prompt-builder.ts#L112)

Peran:

- membangun system prompt dan prompt user untuk flow Refrasa,
- menyimpan academic escape clause hardcoded,
- menjadi contoh nyata bahwa codebase punya prompt architecture lain di luar chat route utama.

#### Implikasi arsitektural

- Jika bicara "prompt, skills, dan hardcoded instructions" secara 100% codebase-compliant, layer ini wajib masuk inventaris.
- Tanpa memasukkan tool descriptions dan feature-specific builders, audit akan bias ke chat flow saja.

## Alur Runtime Saat Ini

### Normal chat

1. Chat route fetch global system prompt aktif dari DB lewat `getSystemPrompt()`.
2. Jika ada paper session, route build paper mode prompt lewat `getPaperModeSystemPrompt()`.
3. Route menyusun message stack dengan tambahan file context, source context, choice context, dan runtime notes.
4. Jika search aktif, flow pindah ke orchestrator.

Referensi:

- [src/app/api/chat/route.ts](/C:/Users/eriks/Desktop/makalahapp/src/app/api/chat/route.ts#L352)
- [src/lib/ai/paper-mode-prompt.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/paper-mode-prompt.ts#L80)

### Paper mode

1. Resolver mencoba ambil active stage skill dari DB.
2. Jika skill invalid atau tidak ada, fallback ke `paper-stages`.
3. Paper mode prompt menggabungkan stage instructions, memory digest, artifact summaries, invalidated artifacts, status notes, dan global rules.

Referensi:

- [src/lib/ai/stage-skill-resolver.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/stage-skill-resolver.ts#L93)
- [src/lib/ai/paper-mode-prompt.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/paper-mode-prompt.ts#L120)

### Web search

1. Router memutuskan search vs non-search lewat prompt inline.
2. Retriever phase memakai `getSearchSystemPrompt()`.
3. Compose phase memakai SKILL.md + compose directive orchestrator + `search-results-context`.

Referensi:

- [src/app/api/chat/route.ts](/C:/Users/eriks/Desktop/makalahapp/src/app/api/chat/route.ts#L1145)
- [src/lib/ai/search-system-prompt.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/search-system-prompt.ts#L12)
- [src/lib/ai/web-search/orchestrator.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/web-search/orchestrator.ts#L59)
- [src/lib/ai/search-results-context.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/search-results-context.ts#L63)

### Refrasa dan feature prompt lain

1. Refrasa memiliki prompt builder sendiri di luar chat route utama.
2. Prompt tersebut menyatukan constitution optional, hardcoded escape clause, dan output format JSON.

Referensi:

- [src/lib/refrasa/prompt-builder.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/refrasa/prompt-builder.ts#L21)
- [src/app/api/refrasa/route.ts](/C:/Users/eriks/Desktop/makalahapp/src/app/api/refrasa/route.ts#L72)

### Prompt surface utilitarian non-chat

Ada prompt surface lain yang bukan bagian dari chat orchestration utama, tetapi tetap nyata di codebase:

- Title generation prompt: [src/lib/ai/title-generator.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/title-generator.ts#L14)
- OCR image extraction instruction: [src/lib/file-extraction/image-ocr.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/file-extraction/image-ocr.ts#L131)
- Provider validation test prompt: [src/app/api/admin/validate-provider/route.ts](/C:/Users/eriks/Desktop/makalahapp/src/app/api/admin/validate-provider/route.ts#L117)
- Model compatibility verification prompts: [src/app/api/admin/verify-model-compatibility/route.ts](/C:/Users/eriks/Desktop/makalahapp/src/app/api/admin/verify-model-compatibility/route.ts#L117)
- Context compaction summarization prompts: [src/lib/ai/context-compaction.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/context-compaction.ts#L143), [src/lib/ai/compaction-prompts.ts](/C:/Users/eriks/Desktop/makalahapp/src/lib/ai/compaction-prompts.ts#L12)

Karakteristik lapisan ini:

- sebagian adalah utility prompt,
- sebagian adalah verification/test prompt,
- sebagian adalah feature-local prompt yang tidak cocok diperlakukan sebagai system prompt utama.

Implikasinya, unified architecture nanti harus membedakan prompt agentic vs prompt utilitarian.

## Titik Ketersebaran Utama

### Ketersebaran berdasarkan ownership

- Admin-managed content ada di DB.
- Code-managed reusable prompts ada di `src/lib/ai` dan `src/lib/json-render`.
- Code-managed prompt builders juga ada di feature lain seperti `src/lib/refrasa`.
- Search skill file ada di `src/lib/ai/skills`.
- Runtime notes masih inline di route/orchestrator.
- Tool descriptions menambah instruction layer yang tersebar di factory tools.
- Ada juga utility/test prompts di title generation, OCR, provider validation, dan compatibility verification.

### Ketersebaran berdasarkan purpose

- "system prompt" tidak berarti satu file atau satu sumber.
- Ada prompt yang sifatnya base, ada yang contextual, ada yang phase-specific, ada yang emergency fallback.
- Ada juga instruksi yang sifatnya tool-scoped dan feature-scoped.
- Ada juga prompt yang sifatnya utilitarian dan tidak perlu masuk prompt stack agent utama.
- Karena taxonomy ini belum eksplisit, semua terasa seperti "prompt tercecer".

### Ketersebaran berdasarkan assembly

- Tempat penyimpanan instruksi berbeda.
- Tempat perakitan final message stack juga tersebar.
- Sebagian instruction bahkan tidak tampil sebagai "prompt file", melainkan sebagai `description`, context builder, atau prompt-builder feature.
- Ini membuat audit sebuah perilaku model butuh melacak banyak file sekaligus.

## Masalah Arsitektural yang Nyata

### 1. Prompt composition terlalu dekat ke route logic

`src/app/api/chat/route.ts` memegang terlalu banyak tanggung jawab:

- auth,
- conversation lifecycle,
- attachment state,
- router search decision,
- prompt composition,
- tool orchestration,
- fallback provider flow,
- persistence.

Akibatnya, prompt-related reasoning bercampur dengan application flow.

### 2. Ownership belum eksplisit

Saat ini belum ada jawaban eksplisit yang sederhana untuk pertanyaan berikut:

- prompt mana yang boleh diedit admin,
- prompt mana yang harus immutable di code,
- note mana yang reusable,
- note mana yang benar-benar local ke satu flow,
- tool descriptions mana yang dianggap bagian dari contract AI,
- prompt builder feature mana yang masuk scope unified architecture.

### 3. Drift antar layer mudah terjadi

Contoh drift yang secara arsitektural mungkin:

- system prompt aktif di DB bilang A,
- stage skill aktif bilang B,
- fallback stage instruction bilang C,
- route inline note bilang D.

Validator sudah membantu untuk stage skill, tetapi belum ada prompt registry terpusat yang membuat drift antarlayer lebih mudah terlihat.

### 4. Search stack sudah semi-unified, tapi belum full

Search stack sebenarnya paling maju:

- retriever prompt terpisah,
- compose skill pakai `SKILL.md`,
- orchestrator punya directive sendiri,
- context builder compose ada di `search-results-context.ts`.

Tetapi ketiganya masih tidak duduk di namespace arsitektural yang sama.

### 5. Migrasi historis masih meninggalkan jejak yang menyebar

Contoh:

- seed default system prompt: [convex/migrations/seedDefaultSystemPrompt.ts](/C:/Users/eriks/Desktop/makalahapp/convex/migrations/seedDefaultSystemPrompt.ts#L103)
- banyak migration update prompt dan skill di `convex/migrations`

Ini penting secara histori, tapi menambah biaya mental saat orang mencoba menjawab "prompt sebenarnya ada di mana".

## Kesimpulan As-Is

Keadaan sekarang bisa dirangkum begini:

- Secara fungsional, arsitektur ini sudah bekerja karena tiap lapisan punya peran nyata.
- Secara organisasi, arsitektur ini belum unified.
- Problem terbesarnya bukan bahwa prompt berada di lebih dari satu tempat, tetapi bahwa tidak ada direktori dan kontrak ownership yang menyatukan cara kita memahami semuanya.

Kalau dibiarkan seperti sekarang, risiko jangka menengahnya adalah:

- review prompt makin mahal,
- perubahan perilaku model makin susah diaudit,
- route dan orchestrator makin gemuk,
- tool descriptions dan feature prompt builders sulit diinventaris kalau taxonomy tetap kabur,
- tim sulit membedakan content asset vs runtime assembly logic.
