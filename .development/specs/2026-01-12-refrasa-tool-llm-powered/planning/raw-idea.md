# Refrasa Tool - LLM Powered

## Konsep Utama
Tool "Refrasa" untuk memperbaiki gaya penulisan akademis Bahasa Indonesia, sepenuhnya ditenagai oleh LLM (bukan programmatic detection).

## Arsitektur
- LLM yang detect DAN refrasa sekaligus
- Guided by Style Constitution yang editable di admin panel
- Tidak ada hardcoded regex/rules/thresholds
- Simple dan flexible

## Keputusan Desain
1. Score: LLM output score 0-100 + issues + refrasedText
2. Code location: `src/tools/refrasa` (baru, bukan bahasa_style)
3. Validation timing: Hanya saat user klik tombol Refrasa (bukan saat load artifact)
4. Constitution structure: Single document dengan structured markdown template, editable di admin panel

## User Flow
1. User buka artifact di ArtifactViewer
2. User klik tombol "Refrasa" di toolbar
3. API fetch Style Constitution dari DB + kirim content ke LLM
4. LLM analisis + perbaiki berdasarkan constitution
5. LLM return: { score, issues, refrasedText }
6. Dialog konfirmasi dengan before/after comparison
7. User accept → artifact di-update

## Admin Flow
1. Admin buka Admin Panel → Tab "Style Constitution"
2. Admin edit markdown document (filosofi, aturan, contoh)
3. Admin simpan → versioning seperti system prompt
4. Perubahan langsung berlaku untuk semua refrasa berikutnya

## Key Components
- styleConstitutions table (DB) - mirip systemPrompts
- POST /api/refrasa endpoint
- StyleConstitutionManager component (admin)
- RefrasaButton, RefrasaConfirmDialog components
- Integration ke ArtifactViewer

## Referensi
- `.references/bahasa-style/llm-powered.md` - arsitektur discussion
- `.development/knowledge-base/writing_style_tool/makalah-style-constitution.md` - default constitution content
