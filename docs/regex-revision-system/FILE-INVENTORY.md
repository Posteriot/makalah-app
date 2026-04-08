# Regex Inventory for Chat + Paper Session

## Cara Baca

- `Low`: parser/sanitizer/validator sempit, dampak lokal
- `Medium`: bisa memengaruhi mode, interpretasi, atau kualitas presentasi
- `High`: bisa mengubah workflow, persisted content, atau handling user turn

## 1. `src/app/api/chat/route.ts`

### Regex yang dipakai

- stripping fence output:
  - ```` ```json ```` / ```` ``` ```` / ```` ```yaml-spec ... ``` ````
- whitespace collapse dan newline normalization:
  - `\s+`
  - `\n{3,}`
- observability guard:
  - `panel validasi|approve|revisi`
  - `aku akan menyusun|draf ini akan|berikut adalah draf`
  - `kesalahan teknis|maafkan aku|saya akan coba|memperbaiki|mohon tunggu|coba lagi|ada kendala`
- revision fallback:
  - `\b(revisi|edit|ubah|ganti|perbaiki|resend|generate ulang|tulis ulang|koreksi|buat ulang|ulangi|dari awal)\b`
- completed-session corruption guard:
  - `tool_code|sekarang kita masuk ke tahap|yaml-spec|```yaml`
- fallback title extraction:
  - `judulTerpilih["\s:]*"([^"]+)"`
  - `judul[^"]*"([^"]{20,})"`
  - `["""]([^"""]{20,})["""]`
- sanitasi tool name:
  - `[^a-zA-Z0-9:_-]`
- reasoning trace security sanitization (PRESERVE — security guard, bukan language heuristic):
  - `system\s+prompt`
  - `developer\s+prompt`
  - `chain[-\s]?of[-\s]?thought`
  - `\bcot\b`
  - `api[\s_-]?key`
  - `bearer\s+[a-z0-9._-]+`
  - `\btoken\b`
  - `\bsecret\b`
  - `\bpassword\b`
  - `\bcredential\b`
  - `internal\s+policy`
  - `tool\s+schema`
- reasoning text cleanup (PRESERVE — bagian dari sanitizeReasoningText):
  - `` ```[\s\S]*?``` `` (fence stripping reasoning)
  - `` `([^`]+)` `` (inline code stripping reasoning)

### Fungsi

- membersihkan output model sebelum dipersist
- mendeteksi apakah model melakukan prose-only response padahal seharusnya tool chain jalan
- mengganti persisted content yang dianggap noisy
- mengambil judul terpilih dari prose fallback jika model gagal tool call
- menjaga completed session tidak menyimpan output off-context
- sanitasi reasoning trace: mendeteksi dan mengganti konten yang memuat istilah sensitif (system prompt, API key, bearer token, secret, credential, tool schema) agar tidak bocor ke user-facing output

### Dampak bisnis

- dapat mengubah isi message yang dipersist
- dapat menentukan warning / observability untuk broken tool chain
- dapat menyelamatkan lifecycle tahap `judul` dan beberapa fallback tahap akhir
- dapat menahan output aneh saat session sudah selesai

### Risiko

- `High`

### Catatan

- ini regex paling sensitif di seluruh area chat + paper
- sebagian masih observability-only, tetapi beberapa sudah punya efek langsung ke persisted content
- sangat rawan saat pola bahasa berubah
- reasoning trace security sanitizers (`FORBIDDEN_REASONING_PATTERNS`) harus dipertahankan — ini bukan language heuristic melainkan security guard yang mencegah leakage istilah sensitif ke user

## 2. `src/lib/ai/completed-session.ts`

### Regex yang dipakai

- revision verb:
  - `\b(revisi|ubah|edit|koreksi|perbaiki)\b`
- informational pattern:
  - `\b(di\s*mana|bagaimana|export|unduh|download|apa\b|apakah)\b`
- continue-like prompt:
  - `^(lanjut|oke?|ya|setuju|ok|next|done|selesai|yes|yep|yap|sip|gas|mantap|ayo|go|continue)$`
- artifact recall detection:
  - display verb: `\b(lihat|tampilkan|munculkan|buka|tunjukkan|perlihatkan|show|open|display)\b`
  - target stage/artifact: `\b(artifact|artefak|gagasan|topik|outline|abstrak|pendahuluan|tinjauan.?literatur|metodologi|hasil|diskusi|kesimpulan|pembaruan.?abstrak|daftar.?pustaka|lampiran|judul)\b`
  - question exclusion: `^(di\s*mana|bagaimana|apa\b|apakah|kenapa|mengapa)`
- router reason retrieval hint:
  - `\bartifact\b`
  - `\b(retrieve|re-?display|display|show|previously generated artifact|existing artifact)\b`
- recall target stage:
  - `tinjauan.?literatur`
  - `pembaruan.?abstrak`
  - `daftar.?pustaka`
  - dynamic `new RegExp(\`\\b${keyword}\\b\`)`

### Fungsi

- menentukan bagaimana completed session harus menangani prompt user
- membedakan short closing, allow normal AI, atau server-owned artifact recall
- menentukan stage artifact yang diminta user untuk direcall

### Dampak bisnis

- memengaruhi langsung handling user turn saat paper session sudah `completed`
- memengaruhi apakah user diarahkan ke artifact recall atau ditutup dengan message sistem

### Risiko

- `High`

### Catatan

- walau fallback-only, file ini sudah dekat ke decision layer
- prompt ambigu pendek seperti “yang tadi”, “lihat hasil”, “lanjut” mudah salah tafsir

## 3. `src/lib/ai/exact-source-followup.ts`

### Regex yang dipakai

- exact-source intent:
  - `\bjudul\b`
  - `\bjudul lengkap(?:nya)?\b`
  - `\bpenulis\b`
  - `\bauthor\b`
  - `\btanggal\b`
  - `\bterbit\b`
  - `\bpublished\b`
  - `\bparagraf\b`
  - `\bverbatim\b`
  - `\bkutip(?:an)?\b`
  - `\bsecara persis\b`
  - `\bkata demi kata\b`
- non-exact summary:
  - `\bringkas\b`
  - `\brangkum\b`
  - `\bsimpulkan\b`
  - `\binti\b`
  - `\bgambaran\b`
  - `\bdampak\b`
- continuation prompt:
  - `^lengkapnya\??$`
  - `^judul lengkapnya\??$`
  - `^yang itu\??$`
  - `^yang itu tadi\??$`
  - `^yang tadi\??$`
  - `^yang mana\??$`
  - `^itu tadi\??$`
- text normalization:
  - `[\u0300-\u036f]`
  - `https?:\/\/`
  - `www\.`
  - `[^\p{L}\p{N}\s./-]+`
  - `\s+`
- source candidate boundary:
  - dynamic `new RegExp(\`\\b${escapeRegExp(candidate)}\\b\`, "u")`

### Fungsi

- mendeteksi apakah user meminta detail exact dari sumber tertentu
- resolve source mana yang dimaksud berdasarkan pesan terakhir dan konteks sebelumnya

### Dampak bisnis

- dapat memaksa mode inspect sumber tertentu
- dapat mengubah apakah sistem meminta klarifikasi atau langsung inspect source

### Risiko

- `Medium-High`

### Catatan

- sangat bergantung pada konteks percakapan pendek
- rawan salah resolve ketika ada beberapa sumber mirip

## 4. `src/lib/ai/internal-thought-separator.ts`

### Regex yang dipakai

- internal-thought patterns:
  - `\b(bentar|sebentar|tunggu|mohon\s+tunggu)\b`
  - `\b(aku|saya|gue)\s+(akan|mau|ingin|coba)?\s*(cari|mencari|search|cek)\b`
  - `\b(aku|saya|gue)\s+cari\s+dulu\b`
  - `\b(aku|saya|gue)\s+sudah\s+melakukan\s+pencarian\b`
  - `\bizinkan\s+(aku|saya)\s+(untuk\s+)?(mencari|search)\b`
  - `\blet\s+me\s+(search|check)\b`
- line split:
  - `\r?\n`
- strip empty reference lines:
  - `^\s*(link|url):\s*$`
- sentence boundary helper:
  - `\s`
  - `[A-Z0-9]`

### Fungsi

- memisahkan bagian “internal thought” dari teks user-facing, terutama pada search response mode

### Dampak bisnis

- memengaruhi apa yang user lihat di UI
- mencegah teks seperti “sebentar saya cari dulu” ikut tampil sebagai jawaban final

### Risiko

- `Medium`

### Catatan

- aman selama hanya memengaruhi presentasi
- berisiko jika model sengaja memakai kalimat serupa sebagai public response yang valid

## 5. `src/lib/ai/web-search/reference-presentation.ts`

### Regex yang dipakai

- tracking params:
  - `^utm_`
- document kind / route kind:
  - `\.pdf(?:$|[?#])`
- weak fallback title:
  - `^source-\d+$`
  - `^https?:\/\/`
  - `^www\.`
- response mode `reference_inventory`:
  - `\blink\b`
  - `\bpdf\b`
  - `\bsumbernya\b`
  - `\bseluruh\s+sumber\b`
  - `\bsemua\s+sumber\b`
  - `\bdaftar\s+sumber\b`
  - `\btampilkan(?:\s+lagi)?(?:\s+\w+){0,4}\s+sumber\b`
  - `\btunjukkan(?:\s+lagi)?(?:\s+\w+){0,4}\s+sumber\b`
  - `\bkasih(?:kan)?(?:\s+lagi)?(?:\s+\w+){0,4}\s+sumber\b`
  - `\brujukan\b`
  - `\bdaftar pustaka\b`
  - `\breferensi\b`
  - `\bcitation\b`
  - `\bcitations\b`

### Fungsi

- menormalisasi URL referensi
- menentukan apakah jawaban harus jadi daftar sumber atau synthesis biasa
- membedakan PDF vs HTML

### Dampak bisnis

- memengaruhi bentuk presentasi hasil web search
- memengaruhi kualitas title dan inventory sumber di UI

### Risiko

- `Medium`

### Catatan

- parser URL relatif aman
- intent mode `reference_inventory` lebih heuristic dan bisa miss

## 6. `src/lib/ai/curated-trace.ts`

### Regex yang dipakai

- keyword bucket untuk tiap step:
  - `intent-analysis`: `user|ingin|minta|butuh|pertanyaan|maksud|memahami|kebutuhan`
  - `paper-context-check`: `paper|sesi|stage|tahap|workflow|makalah`
  - `search-decision`: `cari|search|web|referensi|sumber|internet|google`
  - `source-validation`: `validasi|sumber|kredibel|sitasi|jurnal|verifikasi`
  - `tool-action`: `tool|function|panggil|jalankan|aksi|simpan`
  - `response-compose`: `jawab|susun|tulis|respons|sampaikan|rangkum`
- sentence split:
  - `(?<=[.!?])\s+`

### Fungsi

- mengelompokkan reasoning model ke step trace UI

### Dampak bisnis

- tidak mengubah workflow inti
- memengaruhi keterbacaan dan kredibilitas trace reasoning UI

### Risiko

- `Medium`

### Catatan

- salah klasifikasi tidak merusak data
- tetapi bisa membuat trace terasa misleading

## 7. `src/lib/ai/paper-intent-detector.ts`

### Regex yang dipakai

- normalisasi whitespace:
  - `\s+`

### Fungsi

- menormalkan teks sebelum keyword `includes` dipakai untuk mendeteksi intent paper writing

### Dampak bisnis

- kecil di level regex
- dampak utama file ini justru berasal dari keyword heuristic `includes`, bukan regex

### Risiko

- `Low` untuk regex

### Catatan

- file ini penting di workflow, tetapi regex di dalamnya tidak berisiko tinggi

## 8. `convex/paperSessions.ts`

### Regex yang dipakai

- URL dedup:
  - `^utm_`
- title normalization:
  - `\s+`
- citation parsing:
  - `\((\d{4})\)|\b(19|20)\d{2}\b`
  - `https?:\/\/[^\s]+`
  - `[.,;]+$`
  - `^([^(]+?)\s*\(\d{4}\)`
- year parsing:
  - `\b(19|20)\d{2}\b`
- artifact draft prefix:
  - `^draf(?:t)?\b`
  - `^draf(?:t)?\b\s*`

### Fungsi

- dedup referensi berbasis URL
- normalisasi title paper
- parse citation string menjadi object referensi
- membersihkan prefix `draf`/`draft` dari judul artifact

### Dampak bisnis

- memperbaiki kualitas data referensi yang disimpan di stage data
- membantu konsistensi title artifact/paper

### Risiko

- `Medium` untuk parser citation
- `Low` untuk normalization lainnya

### Catatan

- aman dipertahankan sebagai parser best-effort
- jangan dipromosikan jadi classifier intent

## 9. `convex/paperSessions/daftarPustakaCompiler.ts`

### Regex yang dipakai

- compact whitespace:
  - `\s+`
- URL cleanup:
  - `^utm_`
- DOI normalization:
  - `^https?:\/\/doi\.org\/`
  - `^doi:\s*`
- key normalization:
  - `\s+`
  - `[\p{P}\p{S}]+`
- ensure period:
  - `[.!?]$`
- year extraction:
  - `\b(19|20)\d{2}\b`
- derive title from URL:
  - `\/+$`
  - `[-_]+`
  - `\.[a-z0-9]+$`
  - `\b\w`
- weak citation detection:
  - `\(".*", n\.d\.\)`
  - `\(unknown,\s*n\.d\.\)`
- weak full reference detection:
  - `unknown author`
  - `\(n\.d\.\)`

### Fungsi

- normalisasi candidate bibliografi
- dedup entry
- generate in-text citation dan full reference fallback
- mendeteksi reference yang masih lemah / belum lengkap

### Dampak bisnis

- memengaruhi kualitas daftar pustaka yang dikompilasi dari banyak stage
- dapat memengaruhi dedup dan completeness count

### Risiko

- `Low-Medium`

### Catatan

- relatif aman sebagai parser dan formatter
- risiko utamanya salah dedup atau penilaian “weak” yang terlalu sederhana

## 10. `convex/paperSessions/stageDataWhitelist.ts`

### Regex yang dipakai

- numeric range coercion:
  - `^(\d+)\s*[-–]\s*(\d+)$`

### Fungsi

- mengubah string range seperti `150-250` menjadi midpoint number saat sanitize nested array fields

### Dampak bisnis

- mencegah error schema validation
- menjaga nested stage data lebih konsisten

### Risiko

- `Low`

### Catatan

- parser sempit dan deterministik

## 11. `src/components/chat/MarkdownRenderer.tsx`

### Regex yang dipakai

- strip inline markdown:
  - `\[([^\]]+)\]\([^)]+\)`
  - `\*\*(.+?)\*\*`
  - `__(.+?)__`
  - `\*(.+?)\*`
  - `_(.+?)_`
  - `` `(.+?)` ``
- table row cleanup:
  - `\s*\[\d+(?:\s*,\s*\d+)*\]\s*$`
- table separator:
  - `^:?-{2,}:?$`
- blockquote trim:
  - `^ `
- line ending normalization:
  - `\r\n`
- bare URL regex:
  - `\bhttps?:\/\/[^\s<>()\[\]{}"']+`
- stage label normalization:
  - `\s+`
- domain cleanup:
  - `^www\.`
- whitespace scan:
  - `\s`
- direct URL check:
  - `^https?:\/\/`
- inline citation parse:
  - `^\[(\d+(?:\s*,\s*\d+)*)\]`
- citation marker presence:
  - `\[\d+(?:\s*,\s*\d+)*\]`

### Fungsi

- parsing markdown chat/artifact
- merender citation chip, tables, bare links, dan copy-safe text

### Dampak bisnis

- memengaruhi kualitas render chat dan artifact
- tidak mengubah state workflow paper session

### Risiko

- `Low-Medium`

### Catatan

- aman sebagai renderer parser
- error biasanya muncul sebagai salah render, bukan salah workflow

## 12. `src/components/chat/ChatWindow.tsx`

### Regex yang dipakai

- Convex ID validation:
  - `^[a-z0-9]{32}$`

### Fungsi

- membedakan ID Convex valid dari client-generated ID atau stale ID

### Dampak bisnis

- mencegah lookup/focus ke message yang salah
- menjaga edit/focus/fallback message resolution tetap aman

### Risiko

- `Low`

### Catatan

- format validator yang jelas dan aman

## 13. `src/components/chat/ChatContainer.tsx`

### Regex yang dipakai

- Convex ID validation:
  - `^[a-z0-9]{32}$`

### Fungsi

- memastikan `conversationId` valid sebelum dipakai untuk query Convex

### Dampak bisnis

- mencegah query dengan ID invalid
- menjaga deep-link artifact / source focus tidak berjalan di conversation invalid

### Risiko

- `Low`

### Catatan

- format validator yang aman

## 14. `src/lib/ai/stage-skill-validator.ts`

### Regex yang dipakai

- section name normalization:
  - `\s+` (whitespace to underscore for key matching)
- escape regex helper:
  - `[.*+?^${}()|[\]\\]`
- mandatory section heading:
  - dynamic `^##\\s+${sectionName}\\s*$`
- next heading:
  - `^##\s+`
- output key extraction:
  - `^\s*-\s*([a-zA-Z_][a-zA-Z0-9_]*)\b`
- search policy:
  - `searchPolicy:\s*(active|passive)\b`
  - `^Policy:\s*(active|passive)\b`
  - `google_search\s*\((active|passive)\s+mode`
- persist compile instruction:
  - `compileDaftarPustaka\s*\(\s*\{[^}]*mode\s*:\s*["']persist["']`
  - `mode\s*:\s*["']persist["']`
- dangerous overrides:
  - `ignore stage lock`
  - `bypass stage lock`
  - `override tool routing`
  - `ignore tool routing`
  - `call\s+(web\s+search|function\s+tools)\s+and\s+(updateStageData|web\s+search)\s+in\s+the\s+same\s+turn`
  - `submit without user confirmation`
- visual language contract:
  - `interactive choice card`
  - `PaperValidationPanel`
- contradictory choice card phrases:
  - `no choice card decision point needed`
  - `do not use choice cards for content decisions`
  - `disallowed: ... emitChoiceCard`
- outline lifecycle guard:
  - `checkedAt`
  - `checkedBy`
  - `editHistory`
- function tool mentions:
  - `createArtifact`
  - `requestRevision`
  - `updateArtifact`

### Fungsi

- memvalidasi konten skill per stage agar sesuai runtime contract paper workflow

### Dampak bisnis

- mencegah skill stage berisi instruksi yang menabrak runtime guard
- menjaga paper workflow tetap konsisten lintas stage

### Risiko

- `Medium`

### Catatan

- validator statis ini penting, tetapi wording-based
- rawan false reject jika format skill berubah

## Ringkasan Prioritas Risiko

### High

- `src/app/api/chat/route.ts`
- `src/lib/ai/completed-session.ts`

### Medium

- `src/lib/ai/exact-source-followup.ts`
- `src/lib/ai/internal-thought-separator.ts`
- `src/lib/ai/web-search/reference-presentation.ts`
- `src/lib/ai/curated-trace.ts`
- `src/lib/ai/stage-skill-validator.ts`
- sebagian parser citation di `convex/paperSessions.ts`

### Low

- `convex/paperSessions/daftarPustakaCompiler.ts`
- `convex/paperSessions/stageDataWhitelist.ts`
- `src/components/chat/MarkdownRenderer.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/ChatContainer.tsx`
- regex normalization di `src/lib/ai/paper-intent-detector.ts`

## Final Status (Post-Implementation)

### Replaced with semantic classifiers

- `completed-session.ts` — ALL language heuristic regex → `classifyCompletedSessionIntent()` ✅
- `exact-source-followup.ts` — ALL intent regex → `classifyExactSourceIntent()` ✅
- `reference-presentation.ts` — `inferSearchResponseMode()` 14 patterns → `classifySearchResponseMode()` ✅
- `route.ts` — revision intent regex → `classifyRevisionIntent()` (observability-only) ✅
- `internal-thought-separator.ts` — instruction-based fix + regex kept as fallback ⚠️

### Preserved as-is (deterministic / low-risk)

- `route.ts` — security sanitizers, corruption guard, fallback title extraction, observability guards, fence stripping, whitespace collapse, tool name sanitization
- `paperSessions.ts` — URL dedup, citation parsing, year extraction
- `daftarPustakaCompiler.ts` — DOI normalization, key normalization, weak citation detection
- `stageDataWhitelist.ts` — numeric range coercion
- `MarkdownRenderer.tsx` — markdown rendering, citation markers
- `ChatWindow.tsx`, `ChatContainer.tsx` — Convex ID validation
- `stage-skill-validator.ts` — technical document validator
- `paper-intent-detector.ts` — keyword `.includes()` (deferred)
- `curated-trace.ts` — keyword bucket scoring (keep as-is)

### Prinsip refactor bila dibutuhkan

1. Jangan memindahkan heuristic regex kembali ke primary router.
2. Untuk workflow state, prioritaskan structured state dan tool result.
3. Gunakan regex hanya sebagai fallback non-destructive atau observability jika memungkinkan.
