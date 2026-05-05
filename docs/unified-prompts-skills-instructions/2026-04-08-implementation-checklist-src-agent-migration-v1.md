# Checklist Implementasi `src/agent/` Migration dan Managed Mirror

## Tujuan

Dokumen ini menurunkan decision record, matriks klasifikasi, proposal migrasi bertahap, dan boundary mirror menjadi checklist implementasi yang bisa dipakai langsung saat refactor.

Dokumen acuan utama yang harus dibaca bersama:

- `docs/unified-prompts-skills-instructions/2026-04-08-decision-record-final-migration-boundaries-v1.md`
- `docs/unified-prompts-skills-instructions/2026-04-08-prompt-surface-classification-matrix-v1.md`
- `docs/unified-prompts-skills-instructions/2026-04-09-mirror-architecture-db-admin-agent-managed-runtime-v2.md`

Jika ada item checklist yang bertentangan dengan decision record atau mirror architecture `v2`, ikuti dua dokumen itu.

Checklist ini sengaja dikoreksi supaya:

- tidak menyamakan migrasi repo-managed dengan managed mirror export,
- tidak menyamakan lifecycle `system prompts` dengan lifecycle `stage skills`,
- tidak memperlakukan `src/agent/managed/` sebagai source of truth runtime,
- tidak memaksa `style constitutions` masuk scope mirror awal,
- tetap mewajibkan verification parity pada area yang rawan regression.

## Cara Pakai

- Centang item saat implementasi selesai.
- Jangan kerjakan item `keep local` dan `keep in DB` sebagai relokasi ke `src/agent/`.
- Untuk item `wrap with adapter`, fokusnya adalah membuat layer akses runtime di `src/agent/adapters/`, bukan memindahkan source of truth.
- Untuk item `export mirror`, fokusnya adalah membuat snapshot terkontrol di `src/agent/managed/` dan pipeline sync eksplisit di `src/agent/sync/`.
- Untuk item `extract contract first`, jangan pindah seluruh modul sebelum text contract dan runtime logic dipisah.

## Definisi Status

- `move asset now`: relokasi asset instruksi yang cukup bersih ke `src/agent/`
- `extract contract first`: pecah text contract dari runtime logic sebelum relokasi
- `wrap with adapter`: buat adapter `src/agent/` untuk surface DB-managed
- `export mirror`: ekspor snapshot DB-managed ke `src/agent/managed/` lewat sync eksplisit
- `keep local`: tetap di feature atau domain sekarang
- `keep in DB`: tetap canonical di Convex DB atau migrations

## Phase 0: Fondasi Namespace dan Kontrak

- [ ] Buat folder `src/agent/`
- [ ] Buat folder `src/agent/prompts/`
- [ ] Buat folder `src/agent/skills/`
- [ ] Buat folder `src/agent/compose/`
- [ ] Buat folder `src/agent/adapters/`
- [ ] Buat folder `src/agent/contracts/`
- [ ] Buat folder `src/agent/registry/`
- [ ] Tambahkan `src/agent/contracts/prompt-kinds.ts`
- [ ] Tambahkan `src/agent/contracts/ownership.ts`
- [ ] Tambahkan `src/agent/contracts/prompt-surface-status.ts`
- [ ] Tambahkan `src/agent/registry/prompt-registry.ts`
- [ ] Tambahkan metadata status `export mirror` di taxonomy yang relevan
- [ ] Pastikan taxonomy ownership membedakan `repo-managed`, `admin-managed`, `derived-from-db`, `runtime-generated`, dan `ops-managed`

## Phase 1: Relokasi Asset `move asset now`

### Global

- [ ] Pisahkan text fallback prompt dari side effect logging di `src/lib/ai/chat-config.ts`
- [ ] Pindahkan text fallback prompt hasil ekstraksi ke `src/agent/prompts/global/fallback-system-prompt.ts`
- [ ] Pindahkan reminder dari `src/lib/ai/paper-workflow-reminder.ts` ke `src/agent/prompts/global/paper-workflow-reminder.ts`

### Paper Stage Fallbacks

- [ ] Audit semua submodule di `src/lib/ai/paper-stages/`
- [ ] Pindahkan fallback stage instructions ke `src/agent/prompts/paper-stage-fallbacks/`
- [ ] Sisakan resolver atau domain logic di modul lama bila masih dibutuhkan

### Search Prompt Assets

- [ ] Pindahkan retriever prompt dari `src/lib/ai/search-system-prompt.ts` ke `src/agent/prompts/search/retriever-system-prompt.ts`
- [ ] Pindahkan augmentation hints dari `src/lib/ai/search-system-prompt.ts` ke `src/agent/prompts/search/retriever-user-augmentation.ts`
- [ ] Pindahkan compose directive dari `src/lib/ai/web-search/orchestrator.ts` ke `src/agent/prompts/search/compose-phase-directive.ts`
- [ ] Pisahkan text guidance di `src/lib/ai/search-results-context.ts` dari branching logic-nya
- [ ] Pindahkan text guidance hasil pemisahan ke `src/agent/prompts/search/search-results-context-prompt.ts`

### Guardrails dan Runtime Prompt Assets

- [ ] Pindahkan exact-source inspection rules dari `src/lib/ai/exact-source-guardrails.ts` ke `src/agent/prompts/runtime-notes/exact-source-inspection-rules.ts`
- [ ] Pindahkan source provenance rules dari `src/lib/ai/exact-source-guardrails.ts` ke `src/agent/prompts/runtime-notes/source-provenance-rules.ts`
- [ ] Pindahkan choice card YAML prompt dari `src/lib/json-render/choice-yaml-prompt.ts` ke `src/agent/prompts/ui/choice-card-system-prompt.ts`
- [ ] Pindahkan compaction prompts dari `src/lib/ai/compaction-prompts.ts` ke `src/agent/prompts/compaction/compaction-prompts.ts`

### Skills

- [ ] Pindahkan `src/lib/ai/skills/web-search-quality/SKILL.md` ke `src/agent/skills/search/web-search-quality/SKILL.md`
- [ ] Pindahkan `src/lib/ai/skills/web-search-quality/index.ts` ke `src/agent/skills/search/web-search-quality/index.ts`
- [ ] Perbarui semua import dan runtime loader yang menunjuk ke lokasi skill lama

### Registry

- [ ] Daftarkan fallback prompt di `src/agent/registry/prompt-registry.ts`
- [ ] Daftarkan search prompt assets di `src/agent/registry/prompt-registry.ts`
- [ ] Daftarkan guardrails dan compaction prompts di `src/agent/registry/prompt-registry.ts`
- [ ] Daftarkan web search quality skill di registry skill yang relevan

## Phase 2: `wrap with adapter` dan Ekstraksi Inline Prompt

### DB Adapters untuk Runtime Access

- [ ] Tambahkan `src/agent/adapters/system-prompts.ts`
- [ ] Bungkus akses runtime ke global active system prompt melalui adapter
- [ ] Tambahkan `src/agent/adapters/stage-skills.ts`
- [ ] Bungkus akses runtime ke active stage skill melalui adapter
- [ ] Tambahkan `src/agent/adapters/style-constitutions.ts`
- [ ] Bungkus akses runtime ke active style constitution melalui adapter
- [ ] Pastikan adapter tidak membuat fallback liar, shadow state, atau authority runtime baru

### Chat Route Inline Prompt Extraction

- [ ] Ekstrak search router prompt dari `src/app/api/chat/route.ts` ke `src/agent/prompts/router/search-mode-router-prompt.ts`
- [ ] Ekstrak attachment first-response instruction dari `src/app/api/chat/route.ts` ke `src/agent/prompts/runtime-notes/attachment-notes.ts`
- [ ] Ganti caller di `src/app/api/chat/route.ts` agar mengimpor prompt-prompt ini dari namespace `src/agent/`

### Choice Context Contract Extraction

- [ ] Pisahkan text contract `buildChoiceContextNote()` dari validation dan finalize heuristics di `src/lib/chat/choice-request.ts`
- [ ] Pindahkan text contract hasil pemisahan ke `src/agent/prompts/runtime-notes/choice-context-notes.ts`
- [ ] Pertahankan validation, parsing event, dan heuristics finalize di modul domain yang tepat

### Registry dan Contracts

- [ ] Daftarkan router prompt di registry
- [ ] Daftarkan attachment notes di registry
- [ ] Daftarkan choice context note contract di registry
- [ ] Tambahkan metadata ownership `admin-managed` untuk adapter-backed surfaces
- [ ] Pastikan `style constitution` hanya ditandai `wrap with adapter`, bukan `export mirror`

## Phase 3: Managed Mirror Boundary dan Sync Pipeline

### Struktur `src/agent/managed/`

- [ ] Buat folder `src/agent/managed/`
- [ ] Buat `src/agent/managed/README.md`
- [ ] Buat `src/agent/managed/manifest.json`
- [ ] Buat `src/agent/managed/system-prompts/`
- [ ] Buat `src/agent/managed/stage-skills/`
- [ ] Buat `src/agent/managed/checksums/`

### Struktur `src/agent/sync/`

- [ ] Buat folder `src/agent/sync/`
- [ ] Tambahkan `src/agent/sync/export-system-prompts.ts`
- [ ] Tambahkan `src/agent/sync/import-system-prompts.ts`
- [ ] Tambahkan `src/agent/sync/export-stage-skills.ts`
- [ ] Tambahkan `src/agent/sync/import-stage-skills.ts`
- [ ] Tambahkan `src/agent/sync/diff-managed-vs-db.ts`
- [ ] Tambahkan `src/agent/sync/compute-content-hash.ts`
- [ ] Tambahkan `src/agent/sync/parse-system-prompt-file.ts`
- [ ] Tambahkan `src/agent/sync/serialize-system-prompt-file.ts`
- [ ] Tambahkan `src/agent/sync/parse-stage-skill-file.ts`
- [ ] Tambahkan `src/agent/sync/serialize-stage-skill-file.ts`
- [ ] Tambahkan `src/agent/sync/sync-types.ts`

### Mirror Export untuk System Prompts

- [ ] Definisikan format folder `src/agent/managed/system-prompts/<prompt-chain>/`
- [ ] Tambahkan `current.content.md` untuk snapshot versi terkini
- [ ] Tambahkan `meta.json` untuk metadata chain dan sync
- [ ] Tambahkan `versions/` untuk export history yang relevan
- [ ] Pastikan exporter `system prompts` memakai model `version chain + isActive`
- [ ] Pastikan importer `system prompts` tidak memaksakan status `draft/published/archived`
- [ ] Pastikan importer `system prompts` tidak auto-activate tanpa rule eksplisit

### Mirror Export untuk Stage Skills

- [ ] Definisikan format folder `src/agent/managed/stage-skills/<stage-scope>/`
- [ ] Tambahkan `current.active.md` untuk snapshot active version
- [ ] Tambahkan `meta.json` untuk metadata catalog dan sync
- [ ] Tambahkan `versions/` dengan suffix status seperti `.draft`, `.published`, `.active`
- [ ] Pastikan exporter `stage skills` membaca `stageSkills` dan `stageSkillVersions` secara terpisah
- [ ] Pastikan importer `stage skills` menjaga perbedaan catalog row vs version row
- [ ] Pastikan importer `stage skills` membuat draft baru, bukan overwrite aktif langsung
- [ ] Pastikan importer/exporter menjaga markdown penuh + frontmatter yang dibangun `buildSkillMarkdown()` dan diparse `parseSkillMarkdown()` di `src/components/admin/StageSkillFormDialog.tsx` — fields frontmatter wajib: `name`, `description`, `stageScope`, `searchPolicy`, `metadataInternal` (nested `metadata:` block dengan key `internal`)

### Registry dan Boundary Mirror

- [ ] Daftarkan `system prompt mirror export` sebagai `export mirror`
- [ ] Daftarkan `stage skill mirror export` sebagai `export mirror`
- [ ] Tandai mirror sebagai `derived-from-db`, bukan authority runtime
- [ ] Pastikan runtime tidak membaca `src/agent/managed/` sebagai source prompt final
- [ ] Pastikan `style constitutions` tidak ikut `src/agent/managed/` pada scope implementasi awal

## Phase 4: Centralize Composition

### Compose Layer

- [ ] Tambahkan `src/agent/compose/build-chat-system-messages.ts`
- [ ] Tambahkan `src/agent/compose/build-paper-mode-message-stack.ts`
- [ ] Tambahkan `src/agent/compose/build-search-compose-messages.ts`
- [ ] Tambahkan `src/agent/compose/build-search-results-context.ts` bila builder context dipisah
- [ ] Tambahkan `src/agent/compose/build-choice-context-note.ts` bila kontrak choice dipusatkan

### Migration ke Compose Layer

- [ ] Pecah `src/lib/ai/paper-mode-prompt.ts` menjadi resolver data dan compose layer
- [ ] Pindahkan logic composition yang relevan ke `src/agent/compose/build-paper-mode-message-stack.ts`
- [ ] Ubah `src/app/api/chat/route.ts` agar memakai builder composition, bukan menyusun prompt panjang inline
- [ ] Ubah search orchestrator agar memakai builder composition untuk compose phase
- [ ] Pastikan composer bekerja di atas adapter/runtime content canonical, bukan file mirror

### Precedence dan Ownership

- [ ] Definisikan urutan system messages yang eksplisit untuk chat flow
- [ ] Definisikan urutan system messages yang eksplisit untuk search compose flow
- [ ] Pastikan adapter-backed content, fallback text, dan runtime notes tidak saling membuat source of truth bayangan
- [ ] Pastikan runtime augmentation seperti `ARTIFACT_CREATION_FOOTER` tetap terjadi setelah content canonical diambil dari DB

## Phase 5: Tool Contracts dan Feature Prompt Subdomains

### Tool Description Contracts

- [ ] Pisahkan text contract instruction-heavy dari `src/lib/ai/paper-tools.ts`
- [ ] Pindahkan text contract hasil pemisahan ke `src/agent/prompts/tools/paper-tool-descriptions.ts`
- [ ] Pisahkan tool descriptions inline dari `src/app/api/chat/route.ts`
- [ ] Pindahkan hasil pemisahan ke `src/agent/prompts/tools/chat-tool-descriptions.ts`
- [ ] Ganti factory atau tool registration agar mengimpor descriptions dari prompt namespace baru

### Refrasa

- [ ] Pisahkan prompt assets dari `src/lib/refrasa/prompt-builder.ts`
- [ ] Pindahkan prompt assets hasil pemisahan ke `src/agent/prompts/features/refrasa-system-prompt.ts`
- [ ] Tambahkan `src/agent/compose/build-refrasa-prompts.ts` bila builder baru dibutuhkan
- [ ] Sisakan builder domain Refrasa di modul feature bila masih dibutuhkan
- [ ] Daftarkan style constitution sebagai adapter-backed surface
- [ ] Pastikan tidak ada checklist yang mengimplikasikan constitution ikut mirror awal

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
- [ ] Audit semua caller runtime yang masih mengakses DB-managed content tanpa adapter
- [ ] Audit bahwa tidak ada caller runtime yang membaca `src/agent/managed/` sebagai authority prompt

## Checklist Verifikasi

### Static Verification

- [ ] Jalankan typecheck setelah setiap phase besar
- [ ] Jalankan lint setelah setiap phase besar

### Parity Tests Wajib

- [ ] Jalankan test terkait `src/lib/ai/stage-skill-resolver.test.ts`
- [ ] Jalankan test terkait `src/lib/ai/stage-skill-validator.test.ts`
- [ ] Jalankan test terkait `src/lib/ai/web-search/orchestrator.exact-persist.test.ts`
- [ ] Jalankan test terkait `src/lib/chat/__tests__/choice-request.test.ts`
- [ ] Jalankan test terkait `src/lib/ai/paper-tools.inspect-source.test.ts`
- [ ] Jalankan test terkait `src/lib/ai/paper-tools.compileDaftarPustaka.test.ts`
- [ ] Jalankan test terkait `src/lib/ai/chat-exact-source-guardrails.test.ts`

### Managed Mirror Verification

- [ ] Verifikasi export `system prompts` menghasilkan `current.content.md`, `meta.json`, dan `versions/` yang konsisten
- [ ] Verifikasi export `stage skills` menghasilkan `current.active.md`, `meta.json`, dan `versions/` yang konsisten
- [ ] Verifikasi `meta.json` untuk `system prompts` tidak memuat status `draft/published/archived`
- [ ] Verifikasi `meta.json` untuk `stage skills` membedakan field canonical katalog vs snapshot turunan
- [ ] Verifikasi importer `system prompts` dan importer `stage skills` benar-benar terpisah
- [ ] Verifikasi stage skill export/import menjaga markdown + frontmatter tanpa drift
- [ ] Verifikasi mapping `stageScope` underscore (DB) ke folder name hyphen (filesystem) konsisten — referensi: `toSkillId()` di `convex/stageSkills/constants.ts`
- [ ] Verifikasi `meta.json` stage skill menyertakan `searchPolicy` yang di-derive dari frontmatter content
- [ ] Verifikasi `style constitutions` tidak ikut scope mirror awal

### Runtime Behavior Verification

- [ ] Verifikasi urutan message stack sebelum dan sesudah refactor tetap sama untuk chat normal
- [ ] Verifikasi urutan message stack sebelum dan sesudah refactor tetap sama untuk search compose
- [ ] Verifikasi fallback prompt masih dipakai saat DB prompt tidak tersedia
- [ ] Verifikasi stage skill aktif masih resolve dari DB
- [ ] Verifikasi footer tambahan pada active stage skill tetap muncul bila memang masih diwajibkan
- [ ] Verifikasi exact-source flow tetap memakai rules dan router note yang sama
- [ ] Verifikasi choice context masih menghasilkan next-action instruction yang sama
- [ ] Verifikasi tool descriptions tetap memberi sequencing yang sama ke model
- [ ] Verifikasi file mirror tidak mengubah authority runtime

### End-to-End Flow Checks

- [ ] Uji chat normal flow
- [ ] Uji paper mode flow
- [ ] Uji search routing flow
- [ ] Uji search compose flow
- [ ] Uji exact-source flow
- [ ] Uji admin-managed prompt fallback behavior
- [ ] Uji stage skill resolution behavior
- [ ] Uji Refrasa flow setelah Phase 5

## Definition of Done

- [ ] `src/agent/` menjadi pusat prompt assets agentic, skills file-based, adapters, contracts, registry, dan compose builders
- [ ] `src/agent/managed/` menjadi exported mirror untuk scope awal yang diputuskan
- [ ] Surface `keep in DB` tidak dipindah ke file static sebagai authority baru
- [ ] Surface `keep local` tidak ikut mencemari namespace `src/agent/`
- [ ] Surface hybrid tidak dipindah mentah-mentah; ia dipecah dulu menjadi text contract dan runtime logic
- [ ] Route dan orchestrator tidak lagi menjadi prompt warehouse
- [ ] Ownership per surface tetap jelas: `repo-managed`, `admin-managed`, `derived-from-db`, `runtime-generated`, atau `ops-managed`
- [ ] Tidak ada dual source of truth baru
- [ ] `system prompts` dan `stage skills` tidak dipaksa masuk satu lifecycle mirror yang sama
- [ ] `style constitutions` tetap adapter-backed dan belum dianggap bagian scope mirror awal
- [ ] Verification mencakup parity behavior dan mirror integrity, bukan cuma lolos lint dan typecheck

## Kesimpulan

Checklist ini sengaja disusun supaya implementasi berjalan dari yang paling aman ke yang paling sensitif:

1. fondasi namespace dan taxonomy dulu,
2. asset yang pure dulu,
3. adapter runtime untuk DB-managed surfaces,
4. boundary managed mirror dengan sync pipeline terpisah,
5. centralize composition,
6. tool contracts dan feature subdomains,
7. verification parity dan mirror integrity di setiap phase penting.

Urutan ini paling masuk akal kalau targetnya bukan sekadar memindahkan file, tetapi benar-benar memperbaiki arsitektur prompt sambil menjaga boundary mirror yang sesuai dengan codebase aktual.
