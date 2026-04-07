# Regex Revision System

## Tujuan

Dokumen ini merangkum seluruh penggunaan regex yang relevan untuk area chat + paper session di worktree `validation-panel-artifact-consistency`.

Scope:

- runtime chat page
- orchestration `POST /api/chat`
- paper session state dan lifecycle
- parser/sanitizer bibliografi dan stage data
- markdown/rendering pendukung chat
- fallback guard, observability guard, dan validator skill stage

Dokumen ini dibagi menjadi dua bagian:

- `README.md` ini: peta sistem dan ringkasan kategori regex
- `FILE-INVENTORY.md`: inventaris detail per file berisi regex, dampak bisnis, dan level risiko

## Ringkasan Arsitektur Chat + Paper Session

Entry page chat ada di:

- `src/app/chat/page.tsx`
- `src/app/chat/[conversationId]/page.tsx`

Keduanya merender `ChatContainer`, lalu runtime utamanya bergerak seperti ini:

1. `ChatContainer` mengelola auth redirect, layout shell, artifact panel, deep link artifact, dan validasi ID conversation.
2. `ChatWindow` mengelola `useChat`, sinkronisasi history, process UI, choice card, artifact focus/open, dan integrasi `usePaperSession`.
3. `POST /api/chat` menjadi orchestrator utama untuk auth, quota, attachment context, paper mode, search router, tool execution, persist message, guard, dan fallback.
4. `convex/paperSessions.ts` menyimpan state paper session, stage data, validasi, approval, revision, rewind, dan normalisasi data.

Implikasi penting:

- primary decision path sekarang tidak lagi mengandalkan regex untuk memutuskan search/revision intent utama
- regex masih dipakai cukup banyak sebagai fallback heuristic, parser, sanitizer, renderer, validator, dan observability guard

## Kategori Regex Yang Dipakai

### 1. Workflow Decision dan Guard Paper Session

File utama:

- `src/app/api/chat/route.ts`
- `src/lib/ai/completed-session.ts`
- `src/lib/ai/exact-source-followup.ts`
- `src/lib/ai/internal-thought-separator.ts`
- `src/lib/ai/web-search/reference-presentation.ts`
- `src/lib/ai/curated-trace.ts`

Pola penggunaan:

- fallback heuristic untuk completed session
- exact-source follow-up detection
- pemisahan internal thought vs public answer
- deteksi mode presentasi sumber
- observability guard saat tool chain tidak lengkap
- sanitasi persisted content saat output model bocor/off-context
- klasifikasi trace reasoning ke step UI

Status risiko:

- paling rawan false positive / false negative
- terutama berisiko bila regex memengaruhi handling user turn atau mengganti persisted content

### 2. Parser dan Normalizer Data Paper Session

File utama:

- `convex/paperSessions.ts`
- `convex/paperSessions/daftarPustakaCompiler.ts`
- `convex/paperSessions/stageDataWhitelist.ts`

Pola penggunaan:

- parse citation string menjadi object
- ekstraksi year / URL / author
- URL dedup dan DOI normalization
- title cleanup
- coercion numeric range
- weak citation/reference detection

Status risiko:

- relatif aman sebagai parser/sanitizer
- tetap ada risiko parse yang tidak akurat pada input yang formatnya bebas

### 3. Renderer dan Parser Presentasi Chat

File utama:

- `src/components/chat/MarkdownRenderer.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/ChatContainer.tsx`

Pola penggunaan:

- strip inline markdown
- deteksi citation marker dan table separator
- bare URL autolink
- line ending normalization
- validasi format Convex ID

Status risiko:

- mayoritas aman
- dampaknya lebih ke rendering/UX, bukan ke lifecycle paper session

### 4. Validator Kontrak Skill Paper Stage

File utama:

- `src/lib/ai/stage-skill-validator.ts`

Pola penggunaan:

- validasi section wajib
- validasi search policy
- forbidden runtime override phrase detection
- choice card contract detection
- artifact lifecycle contract detection

Status risiko:

- menengah
- tidak langsung mengubah turn user, tetapi bisa salah reject skill content jika terlalu kaku

## Peta Risiko Tingkat Tinggi

### Risiko Tinggi

- `src/app/api/chat/route.ts`
- `src/lib/ai/completed-session.ts`

Alasan:

- regex di sini bisa mengubah handling runtime atau persisted content
- regex bekerja pada natural language bebas
- konteks user prompt sering ambigu

### Risiko Menengah

- `src/lib/ai/exact-source-followup.ts`
- `src/lib/ai/internal-thought-separator.ts`
- `src/lib/ai/web-search/reference-presentation.ts`
- `src/lib/ai/curated-trace.ts`
- `src/lib/ai/stage-skill-validator.ts`
- `convex/paperSessions.ts` untuk parser citation tertentu

Alasan:

- regex memengaruhi mode, interpretasi follow-up, atau kualitas presentasi
- regex belum tentu merusak data inti, tetapi bisa menyebabkan salah tafsir

### Risiko Rendah

- `convex/paperSessions/daftarPustakaCompiler.ts`
- `convex/paperSessions/stageDataWhitelist.ts`
- `src/components/chat/MarkdownRenderer.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/ChatContainer.tsx`

Alasan:

- regex cenderung deterministik
- berperan sebagai parser, sanitizer, atau format validator

## Mana yang Aman vs Mana yang Rawan

### Relatif Aman Sebagai Parser / Sanitizer

- URL cleanup `utm_*`
- whitespace normalization
- DOI normalization
- citation marker detection untuk renderer
- table separator detection
- Convex ID format validation
- numeric range coercion

Karakteristik:

- domain sempit
- input shape cukup jelas
- hasilnya lokal dan mudah diprediksi

### Rawan False Positive / False Negative

- revision-like intent fallback
- completed-session fallback handling
- artifact recall detection dari prompt natural language
- exact-source follow-up resolution
- leakage / off-context output detection
- fallback title extraction dari model prose
- mode detection seperti `reference_inventory`

Karakteristik:

- bekerja pada natural language terbuka
- sangat bergantung pada wording
- mudah rusak saat model atau user mengubah phrasing

## Prinsip Pembacaan Inventaris

Lihat `FILE-INVENTORY.md` untuk detail per file.

Kolom mental model yang dipakai:

- `Regex / Pola`: bentuk regex atau keluarga pattern yang dipakai
- `Fungsi`: untuk apa regex itu digunakan
- `Dampak bisnis`: apa yang berubah di sisi workflow, data, atau UX
- `Risiko`: Low / Medium / High
- `Catatan`: aman sebagai parser atau rawan heuristic language

## Rekomendasi Umum

1. Biarkan regex parser/sanitizer yang deterministik tetap sederhana dan lokal.
2. Hindari memindahkan heuristic regex kembali ke primary decision path.
3. Untuk area workflow, prioritaskan structured state, tool result, dan classifier/router daripada pattern matching natural language.
4. Jika regex tetap dipakai sebagai fallback, batasi dampaknya ke observability atau non-destructive recovery sebisa mungkin.
