# Specification: Bahasa Style Refrasa Tool

## Goal

Mengintegrasikan linter `bahasa_style` yang sudah ada ke dalam aplikasi sebagai fitur "Refrasa" yang user-triggered untuk memperbaiki gaya penulisan akademis Bahasa Indonesia. Tool ini berfungsi sebagai "Ruthless Linter" dengan pendekatan Constraint Satisfaction Problem untuk menghilangkan pola tulisan AI monoton, Indonenglish, dan kata-kata "kruk". Pass/Fail dipakai internal untuk `needsRefrasa`, UI tetap non-blocking.

## User Stories

- Sebagai penulis makalah, saya ingin melihat skor gaya penulisan artifact saya agar tahu kualitas tulisan saya secara langsung.
- Sebagai penulis makalah, saya ingin meng-klik tombol Refrasa untuk mendapat saran perbaikan tulisan agar tulisan saya lebih natural dan tidak terkesan AI-generated.

## Specific Requirements

**Tombol Refrasa di Artifact Viewer Toolbar**
- Posisi: sebelum tombol "Salin" di footer toolbar ArtifactViewer
- Icon: `WandSparkles` atau `Paintbrush` dari lucide-react
- State disabled: jika artifact null, loading, atau sedang dalam mode editing
- Klik tombol memicu request ke API `/api/refrasa` dengan mode "full"
- Tampilkan loading spinner saat proses berlangsung

**Score Badge di Toolbar Header**
- Posisi: di samping badge type artifact (setelah badge "outline", "section", dll)
- Format: "Skor: {value}" dengan nilai 0-100
- Color coding: hijau (80-100), kuning (60-79), merah (<60)
- Gunakan kombinasi warna dan icon agar accessible (tidak hanya warna sebagai indikator)
- Score dikalkulasi saat artifact di-load dan di-update setelah refrasa

**Text Selection Context Menu**
- Gunakan Radix UI ContextMenu untuk implementasi
- Opsi menu: "Refrasa seleksi ini"
- Track selection range untuk partial replacement
- Kirim selected text sebagai `content` dan surrounding text sebagai `context` ke API
- Mode: "selection"

**API Endpoint POST /api/refrasa**
- Path: `src/app/api/refrasa/route.ts`
- Request body di-validasi dengan Zod schema
- Proses: (1) validasi input dengan BahasaStyle.validate(), (2) jika ada issues, panggil AI untuk refrasa, (3) validasi ulang hasil refrasa
- AI refrasing menggunakan provider yang sama dengan chat (Vercel AI Gateway primary, OpenRouter fallback)
- Prompt AI harus include: original text, issues yang terdeteksi, instruksi pertahankan makna asli
- Response sesuai contract: needsRefrasa, original (text/score/issues), refrasad (text/score/issues), mode
- Skor saat load wajib lewat jalur validasi-only (tanpa AI)

**Confirmation Dialog (RefrasaConfirmDialog)**
- Dialog muncul setelah API response diterima dan needsRefrasa = true
- Layout: side-by-side atau diff view untuk before/after comparison
- Tampilkan score comparison dengan visual yang jelas (misal: "45 --> 92")
- List issues yang diperbaiki dengan color coding (merah = CRITICAL, kuning = WARNING)
- Tombol aksi: "Terima Perubahan" (primary) dan "Batal" (outline)
- Jika needsRefrasa = false, tampilkan toast sukses ("Tulisan sudah bagus!")

**Apply Changes ke Artifact**
- Gunakan mutation `api.artifacts.update` yang sudah ada
- Untuk mode "full": replace seluruh content
- Untuk mode "selection": replace hanya bagian yang di-select (perlu logic untuk merge)
- Version increment ditangani oleh mutation existing
- Setelah save: update score badge, tampilkan toast sukses

**Issues Highlighting dalam Dialog**
- CRITICAL issues: background merah/pink dengan text yang kontras
- WARNING issues: background kuning dengan text gelap
- Setiap issue memiliki tooltip dengan detail message dan suggestion
- Tampilkan snippet teks yang bermasalah
- Tidak ada inline highlight di teks utama (v1)

**Improved Scoring Formula**
- Update logic di linter: `100 - (CRITICAL_count * 15) - (WARNING_count * 5)`
- Minimum score: 0
- Score dihitung di server-side (API route) untuk menghindari import `natural` di client bundle

**Enriched Rule Structure**
- Upgrade existing rules di `definitions.ts` dengan structure baru
- Setiap rule WAJIB punya `examples` array dengan before/after transformations
- Tambah `transformationHint` untuk guidance AI refrasing
- Tambah `category` untuk grouping rules ('indonenglish', 'connector', 'placement', 'certainty')
- Structure baru:
  ```typescript
  interface EnrichedForbiddenPattern {
    pattern: RegExp
    message: string
    suggestion: string
    severity: 'CRITICAL' | 'WARNING'
    category: string
    examples: Array<{ bad: string; good: string; explanation?: string }>
    transformationHint: string
  }
  ```
- Backward compatible: existing linter logic tetap berfungsi

**AI Prompt Template**
- Buat prompt template di `src/lib/refrasa/prompt-template.ts`
- Template berbasis `makalah-style-constitution.md`
- Include detected issues + examples dari enriched rules
- Max ~2000 tokens untuk prompt template (exclude input text), diukur dengan batas karakter/kata sederhana
- Function: `buildRefrasaPrompt(originalText, detectedIssues, rules): string`

**Rule Extension Guidelines**
- Soft limits: FORBIDDEN_PATTERNS max 15-20, BUDGETED_WORDS max 20-25
- Rule baru WAJIB punya examples dan transformationHint
- Conflict check sebelum menambah rule baru
- Dokumentasi lengkap di `planning/requirements.md`

**Authorization**
- Endpoint refrasa wajib auth
- Jika `artifactId` dikirim, cek ownership sebelum proses

**Akses Agent di Semua Kondisi**
- Tool harus bisa dipanggil agent saat paper-workflow aktif
- Tool harus bisa dipanggil agent di percakapan bebas di luar workflow
- Tidak tergantung state workflow

## Existing Code to Leverage

**src/tools/bahasa_style/**
- Entry point: `BahasaStyle.validate(text): ValidationResult`
- Types: `ValidationResult`, `ValidationIssue`, `IssueType`, `StyleConfig`
- Rules sudah implemented: Sentence Variance, Forbidden Patterns, Budgeted Words, Bad Placement, Efficiency Check, Sentence Length Cap
- Perlu update:
  - Scoring formula di `modules/linter.ts`
  - Rule structure di `core/definitions.ts` dengan examples dan transformationHint
  - Type definitions di `core/types.ts` untuk EnrichedRule types

**makalah-style-constitution.md**
- Path: `.development/knowledge-base/writing_style_tool/makalah-style-constitution.md`
- Berisi filosofi dan aturan penulisan akademis
- Akan dijadikan basis prompt template untuk AI refrasing
- Sections: Filosofi Induktif, Struktur Kalimat, Diksi & Frasa, Istilah Asing, Kepastian Akademis

**src/components/chat/ArtifactViewer.tsx**
- Footer toolbar pattern dengan Button components (Edit, Copy, Download)
- State management: `isEditing`, `isSaving`, `copied`
- Header dengan badge type artifact dan version dropdown
- Gunakan pattern yang sama untuk tombol Refrasa dan Score Badge
- Integration point utama untuk fitur ini

**src/components/chat/VersionHistoryDialog.tsx**
- Pattern untuk Dialog dengan trigger button
- Loading state dengan Loader2Icon
- List items dengan visual indicators
- Bisa diadaptasi untuk RefrasaConfirmDialog

**src/components/ui/**
- Dialog, Button, Badge, Tooltip components dari shadcn/ui
- Pattern untuk ContextMenu tersedia di Radix UI

**src/lib/ai/streaming.ts**
- `getGatewayModel()` dan `getOpenRouterModel()` untuk AI provider
- Try-catch pattern untuk fallback antar provider

## Architecture Independence

Tool ini didesain dengan **loosely coupled architecture** untuk memungkinkan portability dan reusability.

### Layer Separation

```
┌─────────────────────────────────────────────────────────────────┐
│  CORE LINTER (Independent)                                      │
│  Location: src/tools/bahasa_style/                              │
│  - Pure TypeScript, zero framework dependency                   │
│  - Entry: BahasaStyle.validate(text) → ValidationResult         │
│  - Bisa di-extract jadi standalone NPM package                  │
└─────────────────────────────────────────────────────────────────┘
                              │ import
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  API WRAPPER (Next.js Specific)                                 │
│  Location: src/app/api/refrasa/                                 │
│  - HTTP interface untuk core linter                             │
│  - AI refrasing via Vercel AI SDK                               │
│  - Logic portable ke Express/Fastify/Hono                       │
└─────────────────────────────────────────────────────────────────┘
                              │ fetch
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  UI COMPONENTS (React Specific)                                 │
│  Location: src/components/refrasa/                              │
│  - Consume API, display results                                 │
│  - Bisa reimplementasi di Vue/Svelte/etc                        │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles

| ID | Principle | Rationale |
|----|-----------|-----------|
| AR-1 | Core linter TIDAK BOLEH import dari `src/app/`, `src/components/`, `src/lib/` | Menjaga independence |
| AR-2 | Core linter TIDAK BOLEH depend pada environment variables | Portable tanpa config |
| AR-3 | API wrapper hanya HTTP interface, semua logic di core | Separation of concerns |
| AR-4 | UI components consume API, tidak direct import core (kecuali types) | Decoupling |

### Future Portability

Core linter (`src/tools/bahasa_style/`) bisa di-reuse untuk:
- **NPM Package**: Publish `@makalah/bahasa-style` untuk project lain
- **CLI Tool**: Expand `cli_check.ts` yang sudah ada
- **VS Code Extension**: Import core, bikin UI di extension API
- **Standalone Web App**: Import core, bikin API + UI sendiri
- **Mobile App**: Import core via React Native atau compile ke WASM

## Out of Scope

- Auto-enforcement di paper workflow stages (validasi otomatis saat submit stage)
- Structural Planning dengan JSON sentence intent
- Constrained Generation dengan logit bias
- Sinonim Dinamis (advanced synonym rotation - rules punya alternatives tapi bukan dynamic)
- Custom tokenizer (tetap pakai `natural` library)
- Real-time validation saat user mengetik
- Refrasa history atau undo functionality
- Batch refrasa untuk multiple artifacts sekaligus
- Export refrasa report ke file
- Per-paragraph mode (hanya full dan selection untuk v1)
- Inline highlight di teks utama (butuh data posisi/range)
- Admin UI untuk manage rules (v1 = hardcoded rules)
- Database-driven rules (rules tetap di code)
- User-customizable strictness profiles
