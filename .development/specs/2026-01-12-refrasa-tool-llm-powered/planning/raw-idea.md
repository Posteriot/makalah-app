# Refrasa Tool - LLM Powered

## Konsep Utama
Tool "Refrasa" untuk memperbaiki gaya penulisan akademis Bahasa Indonesia, sepenuhnya ditenagai oleh LLM (bukan deteksi programatik).

## Dual Goal
1. **Humanize Writing Standard** - Standar penulisan akademis yang natural dan manusiawi
2. **Target Anti-Deteksi LLM (upaya terbaik)** - Upaya mengurangi pola deteksi AI (tanpa jaminan lolos detektor)

## Arsitektur: Separation of Concerns

### Insight Kunci
- **Target Anti-Deteksi LLM = heuristik upaya terbaik** - berbasis instruksi prompt yang di-hardcode (bukan enforcement)
- **Humanize/Academic Style = ART** - subjektif, bisa berbeda per konteks → EDITABLE

### Two-Layer Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    PROMPT BUILDER                        │
├─────────────────────────────────────────────────────────┤
│  Layer 1: CORE NATURALNESS CRITERIA (Hardcoded)         │
│  ─────────────────────────────────────────────────────  │
│  • Vocabulary diversity (QUALITATIVE instructions)      │
│  • Sentence pattern variance                            │
│  • Paragraph rhythm                                     │
│  • Hedging balance                                      │
│  • Burstiness (human writing pattern)                   │
│  ⚠️  TIDAK BISA DI-OVERRIDE ADMIN                       │
│  ⚠️  ESCAPE CLAUSE: Preserve technical terminology      │
├─────────────────────────────────────────────────────────┤
│  Layer 2: STYLE CONSTITUTION (Editable via Admin)       │
│  ─────────────────────────────────────────────────────  │
│  • Academic writing style rules                         │
│  • Language-specific conventions                        │
│  • Institution-specific requirements                    │
│  • Tone and formality guidelines                        │
│  ✏️  FULLY CUSTOMIZABLE BY ADMIN                        │
└─────────────────────────────────────────────────────────┘
```

### Core Naturalness Criteria (Anti-Detection) - QUALITATIVE
**PENTING: Gunakan instruksi KUALITATIF, bukan kuantitatif (LLM buruk dalam counting)**

1. **Vocabulary Diversity**
   - ❌ JANGAN: "No word >3x per 500 words"
   - ✅ GUNAKAN: "Strictly avoid repeating non-technical vocabulary close together. Use synonyms aggressively."
   - **ESCAPE CLAUSE:** Technical terms (istilah teknis) boleh diulang untuk konsistensi akademik

2. **Sentence Pattern Variance**
   - ❌ JANGAN: "Mix lengths (short <10, medium 10-20, long >20 words)"
   - ✅ GUNAKAN: "Vary sentence structures naturally. Mix short punchy sentences with longer explanatory ones. Avoid starting consecutive sentences with the same word."

3. **Paragraph Rhythm**
   - ❌ JANGAN: "Vary 2-6 sentences per paragraph"
   - ✅ GUNAKAN: "Create natural paragraph flow. Some paragraphs should be brief for emphasis, others more developed for explanation."

4. **Hedging Balance**
   - ✅ GUNAKAN: "Include appropriate academic hedging language where claims are not absolute. Use markers like 'cenderung', 'kemungkinan', 'tampaknya', 'dapat diargumentasikan'."

5. **Burstiness**
   - ✅ GUNAKAN: "Write with variable complexity like humans do. Mix technical precision with accessible explanations. Maintain academic formality throughout."

### Academic Escape Clause (CRITICAL)
```
SELALU PERTAHANKAN:
- Technical terminology consistency (istilah teknis tidak diganti sinonim)
- Academic rigor and formality
- Markdown formatting structure (heading, list, bold/italic, link, code block, blockquote)
- Citation/reference formatting
- Citation keys ([@...], [1], [2])
- Discipline-specific conventions
- Proper nouns and named entities

Jika ragu apakah kata ini istilah teknis atau bukan,
pilih untuk MENGULANG. Konsistensi > variasi.

Ubah isi teks, jangan ubah struktur.
```

## Keputusan Desain
1. **Output: Issues + RefrasedText** (tanpa score - lihat Known Limitations)
2. **Bahasa output:** issues/suggestion/refrasedText wajib Bahasa Indonesia (kecuali istilah teknis/rujukan)
3. Code location: `src/lib/refrasa` (types, schemas, prompt-builder)
4. Validation timing: Hanya saat user klik tombol Refrasa
5. Constitution: Style guidance only (naturalness hardcoded in prompt builder)
6. Issues categorized: 'naturalness' | 'style' untuk transparency
7. **Prompt instructions: QUALITATIVE, not quantitative** (LLM limitation)
8. **Constitution fallback:** Jika tidak ada active constitution, proceed dengan Layer 1 only
9. **UI indicator:** "X masalah terdeteksi → Tinjau hasil perbaikan" (tanpa klaim semua diperbaiki)
10. **Timeout config:** `export const maxDuration = 300` di route (Vercel Functions)
11. **Catatan dependency:** Durasi efektif tergantung status fluid compute di Vercel
12. **Batas kata (batas lunak):** 2.000 kata, peringatan sebelum klik Refrasa, tidak memblokir

## User Flow
1. User buka artifact di ArtifactViewer
2. User klik tombol "Refrasa" di toolbar (atau right-click context menu)
3. **Educational loading state** ("Menganalisis pola kalimat...", "Memperkaya variasi kosa kata...")
4. API fetch Style Constitution dari DB (fallback: proceed tanpa constitution)
5. LLM analisis berdasarkan CORE CRITERIA (hardcoded) + CONSTITUTION (dynamic/optional)
6. LLM return: `{ issues: RefrasaIssue[], refrasedText: string }` (issues/suggestion Bahasa Indonesia)
7. Dialog konfirmasi dengan before/after comparison + issues list (grouped by category) + indicator "X masalah terdeteksi → Tinjau hasil perbaikan"
8. User accept → artifact di-update

## Admin Flow
1. Admin buka Admin Panel → Tab "Style Constitution"
2. Admin edit markdown document (style rules, conventions, guidelines)
3. Admin simpan → versioning seperti system prompt
4. Perubahan berlaku untuk STYLE evaluation (naturalness tetap hardcoded)

## Key Components
- styleConstitutions table (DB) - mirip systemPrompts
- POST /api/refrasa endpoint
- StyleConstitutionManager component (admin)
- RefrasaButton, RefrasaConfirmDialog components
- Integration ke ArtifactViewer (toolbar + context menu)
- **prompt-builder.ts dengan two-layer structure + qualitative instructions**

## Known Limitations

### 1. "Hardcoded" = Prompt Instructions, Bukan Enforcement
- Core Naturalness Criteria di-hardcode di prompt, tapi tidak ada mekanisme yang **memaksa** LLM comply
- Ini inherent limitation dari LLM-first approach
- Mitigasi: Accept limitation untuk v1, future bisa tambah post-processing validation

### 2. Self-Grading Bias → Score Dihapus
- Awalnya ada `score` dan `newScore` untuk before/after comparison
- **Problem:** Model yang sama analyze + rewrite + re-analyze = bias (selalu kasih skor lebih tinggi untuk output sendiri)
- **Keputusan:** Hapus score, fokus ke issues list yang konkret dan verifiable
- **UI alternative:** "X masalah terdeteksi → Tinjau hasil perbaikan" (issue count, bukan arbitrary score)

### 3. Constitution Dependency
- Jika tidak ada Style Constitution aktif, API tetap jalan dengan Layer 1 only
- Style Constitution adalah enhancement, bukan requirement

### 4. Target Anti-Deteksi LLM = Upaya Terbaik
- Tidak ada jaminan lolos detektor AI eksternal
- Tujuan hanya mengurangi pola tulisan yang terlalu "LLM-like"

### 5. Issue List Tidak Menjamin Semua Teratasi
- Issues bisa kosong atau sebagian tidak terselesaikan
- User tetap harus review sebelum apply

### 6. Risiko Timeout Teks Panjang
- Durasi efektif tergantung status fluid compute di Vercel
- Teks sangat panjang tetap berisiko timeout meski `maxDuration` diset

## Referensi
- `.references/bahasa-style/llm-powered.md` - arsitektur discussion
- `.development/knowledge-base/writing_style_tool/makalah-style-constitution.md` - default constitution content
