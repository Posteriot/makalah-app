# Raw Idea: Bahasa Style Refrasa Tool

## Sumber Diskusi
- `.references/bahasa-style/concept.md`
- `.references/bahasa-style/implementaion-recommendation.md`
- `.development/knowledge-base/writing_style_tool/bahasa_style_capabilities.md`
- `.development/knowledge-base/writing_style_tool/makalah-stylist-concept.md`
- `.development/knowledge-base/writing_style_tool/makalah-style-constitution.md`

## Existing Implementation
Source code sudah ada di `src/tools/bahasa_style/` tapi belum terintegrasi ke aplikasi:
- `index.ts` - Entry point `BahasaStyle.validate(text)`
- `core/types.ts` - Type definitions (ValidationResult, ValidationIssue)
- `core/definitions.ts` - Rules (budgeted words, forbidden patterns)
- `core/tokenizer.ts` - Sentence splitting & word counting
- `modules/linter.ts` - Main validation logic
- `modules/suggester.ts` - Placeholder untuk suggestion engine
- `cli_check.ts` - CLI tool untuk testing

## Konsep Utama

### Tujuan Tool
"Ruthless Linter" untuk tulisan akademis Bahasa Indonesia:
- Menghilangkan pola tulisan AI yang monoton
- Mendeteksi "Indonenglish" (struktur Inggris yang diterjemahkan mentah)
- Memaksa variasi irama kalimat (burstiness)
- Membatasi kata-kata "kruk" (crutches) via budget system

### Filosofi
Memperlakukan gaya penulisan sebagai **Constraint Satisfaction Problem** untuk menentukan `needsRefrasa` (Pass/Fail internal), tapi UI tetap non-blocking dan user tetap pegang kontrol.

## Keputusan dari Diskusi

### 1. Trigger Mechanism
**Keputusan: UI-Triggered (Tombol Refrasa)**
- Bukan integrated/auto-enforcement
- User klik tombol untuk trigger refrasa
- Non-blocking, user-controlled

### 2. Integration Point
**Keputusan: Artifact Viewer sebagai Primary**
- Tombol "Refrasa" di toolbar artifact
- Context menu untuk text selection

### 3. Scope Support
**Keputusan: V1 hanya full + selection**
- Full artifact content
- Selected text (user highlight)

### 4. Strictness
**Keputusan: Non-blocking, warning-based**
- CRITICAL = highlight merah + strong recommendation
- WARNING = highlight kuning + soft suggestion
- Tidak blocking user action

### 5. Scoring
**Keputusan: Display-only indicator**
- Score 0-100 untuk visibility
- Bukan gate/blocker
- Improved formula: CRITICAL = -15, WARNING = -5

### 6. Dependency
**Keputusan: Keep `natural` library untuk MVP**
- Optimize nanti kalau bundle size jadi issue

### 7. Validasi-only untuk skor
**Keputusan: Pisahkan validasi-only dari refrasa**
- Skor saat load pakai jalur validate-only (tanpa AI)
- Refrasa hanya saat user klik tombol

### 8. Auth & Ownership
**Keputusan: Wajib auth**
- Jika `artifactId` ada, cek kepemilikan sebelum proses
- Jika tanpa `artifactId`, proses hanya pada `content` yang dikirim

### 9. Ketersediaan Tool untuk Agent
**Keputusan: Selalu bisa dipanggil**
- Tool bisa dipanggil agent saat paper-workflow aktif
- Tool juga bisa dipanggil agent di percakapan bebas di luar workflow
- Tidak tergantung state workflow

## Arsitektur yang Disetujui

```
┌─────────────────────────────────────────────────────────────────┐
│  ARTIFACT VIEWER                                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  [✏️ Edit] [📋 Copy] [🎨 Refrasa] [📊 Skor: 72]           │  │
│  └───────────────────────────────────────────────────────────┘  │
│  Content area... (selectable untuk context menu refrasa)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  API ROUTE: POST /api/refrasa                                   │
│  Request: { mode, content, context?, artifactId? }              │
│  Response: { original, refrasad, needsRefrasa }                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CONFIRMATION DIALOG                                            │
│  Score: 45 → 92                                                 │
│  Before/After comparison                                        │
│  [Terima Perubahan] [Batal]                                     │
└─────────────────────────────────────────────────────────────────┘
```

## API Contract (Proposed)

```typescript
// Request
interface RefrasaRequest {
  mode: 'full' | 'selection'
  content: string           // Text to refrasa
  context?: string          // Surrounding text for AI context
  artifactId?: string       // For tracking/versioning
}

// Response
interface RefrasaResponse {
  needsRefrasa: boolean
  original: {
    text: string
    score: number
    issues: ValidationIssue[]
  }
  refrasad?: {
    text: string
    score: number
    issues: ValidationIssue[]
  }
  mode: 'full' | 'selection'
}
```

## Rules yang Sudah Implemented di Linter

1. **Sentence Variance** - Deteksi 3 kalimat monoton berturut-turut
2. **Forbidden Patterns** - dimana, tidak hanya...tetapi juga, tergantung
3. **Budgeted Words** - namun (max 1), oleh karena itu (0), jadi (0), dll
4. **Bad Placement** - "Ini" di awal kalimat
5. **Efficiency Check** - adalah, bahwa (warning untuk hapus)
6. **Sentence Length Cap** - >12 kata = long, max 10% dari total

## Out of Scope (v1)

- Auto-enforcement di paper workflow
- Structural Planning (JSON sentence intent)
- Constrained Generation (logit bias)
- Sinonim Dinamis
- Custom tokenizer (tetap pakai `natural` library)
- Per-paragraph mode
- Highlight inline di teks utama (butuh data posisi/range)
