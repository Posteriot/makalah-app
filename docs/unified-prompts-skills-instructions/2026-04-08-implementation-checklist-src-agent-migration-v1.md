# Checklist Implementasi `src/agent/` Migration

## Tujuan

Dokumen ini mengubah proposal migrasi bertahap menjadi checklist implementasi file-per-file yang bisa langsung dipakai saat refactor.

## Cara Pakai

- Centang item saat implementasi selesai.
- Jangan kerjakan item `keep local` dan `keep in DB` sebagai relokasi ke `src/agent/`.
- Untuk item `wrap with adapter`, fokusnya adalah membuat layer akses di `src/agent/adapters/`, bukan memindahkan source of truth.

## Definisi Status

- `move now`: relokasi asset instruksi ke `src/agent/`
- `wrap with adapter`: buat adapter `src/agent/` untuk surface DB-managed
- `keep local`: tetap di feature/domain sekarang
- `keep in DB`: tetap di Convex DB dan migrations

## Phase 0: Fondasi Namespace

- [ ] Buat folder `src/agent/`
- [ ] Buat folder `src/agent/prompts/`
- [ ] Buat folder `src/agent/skills/`
- [ ] Buat folder `src/agent/compose/`
- [ ] Buat folder `src/agent/adapters/`
- [ ] Buat folder `src/agent/contracts/`
- [ ] Buat folder `src/agent/registry/`
- [ ] Tambahkan `src/agent/contracts/prompt-kinds.ts`
- [ ] Tambahkan `src/agent/contracts/ownership.ts`
- [ ] Tambahkan `src/agent/registry/prompt-registry.ts`

## Phase 1: Relokasi Asset `move now` yang Aman

### Global

- [ ] Pindahkan fallback prompt dari `src/lib/ai/chat-config.ts` ke `src/agent/prompts/global/fallback-system-prompt.ts`
- [ ] Pindahkan reminder dari `src/lib/ai/paper-workflow-reminder.ts` ke `src/agent/prompts/global/paper-workflow-reminder.ts`

### Paper Stage Fallbacks

- [ ] Audit semua submodule di `src/lib/ai/paper-stages/`
- [ ] Pindahkan fallback stage instructions ke `src/agent/prompts/paper-stage-fallbacks/`
- [ ] Sisakan resolver/domain logic di modul lama bila masih dibutuhkan

### Search Prompt Assets

- [ ] Pindahkan retriever prompt dari `src/lib/ai/search-system-prompt.ts` ke `src/agent/prompts/search/retriever-system-prompt.ts`
- [ ] Pindahkan augmentation hints dari `src/lib/ai/search-system-prompt.ts` ke `src/agent/prompts/search/retriever-user-augmentation.ts`
- [ ] Pindahkan compose directive dari `src/lib/ai/web-search/orchestrator.ts` ke `src/agent/prompts/search/compose-phase-directive.ts`
- [ ] Pindahkan instruction-bearing context dari `src/lib/ai/search-results-context.ts` ke `src/agent/prompts/search/search-results-context-prompt.ts`

### Guardrails dan Runtime Prompt Assets

- [ ] Pindahkan exact-source inspection rules dari `src/lib/ai/exact-source-guardrails.ts` ke `src/agent/prompts/runtime-notes/exact-source-inspection-rules.ts`
- [ ] Pindahkan source provenance rules dari `src/lib/ai/exact-source-guardrails.ts` ke `src/agent/prompts/runtime-notes/source-provenance-rules.ts`
- [ ] Pindahkan choice card YAML prompt dari `src/lib/json-render/choice-yaml-prompt.ts` ke `src/agent/prompts/ui/choice-card-system-prompt.ts`
- [ ] Pindahkan compaction prompts dari `src/lib/ai/compaction-prompts.ts` ke `src/agent/prompts/compaction/compaction-prompts.ts`

### Skills

- [ ] Pindahkan `src/lib/ai/skills/web-search-quality/SKILL.md` ke `src/agent/skills/search/web-search-quality/SKILL.md`
- [ ] Pindahkan `src/lib/ai/skills/web-search-quality/index.ts` ke `src/agent/skills/search/web-search-quality/index.ts`
- [ ] Perbarui semua import/runtime loader yang menunjuk ke lokasi skill lama

### Registry

- [ ] Daftarkan fallback prompt di `src/agent/registry/prompt-registry.ts`
- [ ] Daftarkan search prompt assets di `src/agent/registry/prompt-registry.ts`
- [ ] Daftarkan guardrails dan compaction prompts di `src/agent/registry/prompt-registry.ts`
- [ ] Daftarkan web search quality skill di registry skill yang relevan

## Phase 2: `wrap with adapter` dan Ekstraksi Inline Route Prompts

### DB Adapters

- [ ] Tambahkan `src/agent/adapters/system-prompts.ts`
- [ ] Bungkus akses ke global active system prompt melalui adapter
- [ ] Tambahkan `src/agent/adapters/stage-skills.ts`
- [ ] Bungkus akses ke active stage skill melalui adapter

### Chat Route Inline Prompt Extraction

- [ ] Ekstrak search router prompt dari `src/app/api/chat/route.ts` ke `src/agent/prompts/router/search-mode-router-prompt.ts`
- [ ] Ekstrak attachment first-response instruction dari `src/app/api/chat/route.ts` ke `src/agent/prompts/runtime-notes/attachment-notes.ts`
- [ ] Ekstrak choice context note builder dari `src/lib/chat/choice-request.ts` ke `src/agent/prompts/runtime-notes/choice-context-notes.ts`
- [ ] Ganti caller di `src/app/api/chat/route.ts` agar import dari namespace `src/agent/`

### Registry dan Contracts

- [ ] Daftarkan router prompt di registry
- [ ] Daftarkan attachment notes di registry
- [ ] Daftarkan choice context notes di registry
- [ ] Tambahkan metadata ownership `admin-managed` untuk adapter-backed surfaces

## Phase 3: Centralize Composition

### Compose Layer

- [ ] Tambahkan `src/agent/compose/build-chat-system-messages.ts`
- [ ] Tambahkan `src/agent/compose/build-paper-mode-message-stack.ts`
- [ ] Tambahkan `src/agent/compose/build-search-compose-messages.ts` bila search compose masih tersebar

### Migration ke Compose Layer

- [ ] Pindahkan logic dari `src/lib/ai/paper-mode-prompt.ts` ke `src/agent/compose/build-paper-mode-message-stack.ts`
- [ ] Ubah `src/app/api/chat/route.ts` agar memakai builder composition, bukan menyusun prompt panjang inline
- [ ] Ubah search orchestrator agar memakai builder composition untuk compose phase

### Verification

- [ ] Verifikasi urutan message stack sebelum dan sesudah refactor tetap sama
- [ ] Verifikasi fallback prompt masih dipakai saat DB prompt tidak tersedia
- [ ] Verifikasi stage skill aktif masih resolve dari DB

## Phase 4: Tool Contracts dan Feature Prompt Subdomains

### Tool Description Contracts

- [ ] Ekstrak instruction-heavy descriptions dari `src/lib/ai/paper-tools.ts` ke `src/agent/prompts/tools/paper-tool-descriptions.ts`
- [ ] Ekstrak tool descriptions inline dari `src/app/api/chat/route.ts` ke `src/agent/prompts/tools/chat-tool-descriptions.ts`
- [ ] Ganti factory/tool registration agar mengimpor description dari prompt namespace baru

### Refrasa

- [ ] Pisahkan prompt assets dari `src/lib/refrasa/prompt-builder.ts` ke `src/agent/prompts/features/refrasa-system-prompt.ts`
- [ ] Sisakan builder domain Refrasa di modul feature bila masih dibutuhkan
- [ ] Tambahkan `src/agent/adapters/style-constitutions.ts`
- [ ] Bungkus akses ke active style constitution lewat adapter

### Registry

- [ ] Daftarkan tool-description contracts di registry
- [ ] Daftarkan Refrasa prompt assets di registry
- [ ] Daftarkan style constitution sebagai adapter-backed surface

## Tidak Dimigrasikan ke `src/agent/`

### `keep local`

- [ ] Biarkan `src/lib/ai/title-generator.ts` tetap lokal
- [ ] Biarkan `src/lib/file-extraction/image-ocr.ts` tetap lokal
- [ ] Biarkan `src/app/api/admin/validate-provider/route.ts` tetap lokal
- [ ] Biarkan `src/app/api/admin/verify-model-compatibility/route.ts` tetap lokal
- [ ] Biarkan `src/lib/ai/completed-session.ts` tetap lokal
- [ ] Biarkan `src/lib/ai/exact-source-followup.ts` tetap lokal
- [ ] Biarkan `src/lib/chat/attachment-health.ts` tetap lokal

### `keep in DB`

- [ ] Biarkan `convex/systemPrompts.ts` tetap source of truth global prompt aktif
- [ ] Biarkan `convex/stageSkills.ts` dan schema terkait tetap source of truth stage skills
- [ ] Biarkan `convex/styleConstitutions.ts` tetap source of truth style constitution
- [ ] Biarkan semua file di `convex/migrations/` tetap sebagai artefak histori dan ops

## Checklist Caller Update

- [ ] Audit semua import lama dari `src/lib/ai/search-system-prompt.ts`
- [ ] Audit semua import lama dari `src/lib/ai/compaction-prompts.ts`
- [ ] Audit semua import lama dari `src/lib/json-render/choice-yaml-prompt.ts`
- [ ] Audit semua import lama dari `src/lib/ai/paper-workflow-reminder.ts`
- [ ] Audit semua pembacaan skill path lama untuk `web-search-quality`
- [ ] Audit semua inline prompt string di `src/app/api/chat/route.ts` yang belum diekstrak
- [ ] Audit semua builder yang masih menggabungkan text instructions di luar `src/agent/compose/`

## Checklist Verifikasi

- [ ] Jalankan typecheck setelah setiap phase besar
- [ ] Jalankan lint setelah setiap phase besar
- [ ] Uji chat normal flow
- [ ] Uji paper mode flow
- [ ] Uji search routing flow
- [ ] Uji search compose flow
- [ ] Uji exact-source flow
- [ ] Uji admin-managed prompt fallback behavior
- [ ] Uji stage skill resolution behavior
- [ ] Uji Refrasa flow setelah Phase 4

## Definition of Done

- [ ] `src/agent/` menjadi pusat prompt assets agentic, skills file-based, adapters, registry, dan compose builders
- [ ] Surface `keep in DB` tidak dipindah ke file static
- [ ] Surface `keep local` tidak ikut mencemari namespace `src/agent/`
- [ ] Route dan orchestrator tidak lagi menjadi prompt warehouse
- [ ] Ownership per surface tetap jelas: `repo-managed`, `admin-managed`, atau `runtime-generated`
- [ ] Tidak ada dual source of truth baru

## Kesimpulan

Checklist ini sengaja disusun supaya implementasi bisa dimulai dari relokasi yang aman, lalu lanjut ke adapter, lalu ke composition, lalu ke tool contracts dan feature subdomains. Urutan ini yang paling rendah risikonya dan paling cepat menghasilkan `src/agent/` yang benar-benar berguna.
