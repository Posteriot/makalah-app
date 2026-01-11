Status Saat Ini

  Yang SUDAH ada di code (definitions.ts):
  ┌────────────────────┬────────┬───────────────────────────────────┐
  │        Tipe        │ Jumlah │                Isi                │
  ├────────────────────┼────────┼───────────────────────────────────┤
  │ FORBIDDEN_PATTERNS │ 6      │ Regex + generic suggestion        │
  ├────────────────────┼────────┼───────────────────────────────────┤
  │ BUDGETED_WORDS     │ 10     │ Word + limit + generic suggestion │
  ├────────────────────┼────────┼───────────────────────────────────┤
  │ EFFICIENCY_TARGETS │ 2      │ "adalah", "bahwa"                 │
  └────────────────────┴────────┴───────────────────────────────────┘
  Contoh suggestion yang ada:
  'oleh karena itu': {
    limit: 0,
    suggestion: 'Hapus (biarkan logika mengalir) atau gunakan "Dengan demikian"'
  }

  Yang SUDAH ada di knowledge base (makalah-style-constitution.md):
  - Contoh BURUK vs BAIK (tapi belum ter-codify)
  - Filosofi dan "mengapa" (untuk pemahaman)
  - Guidelines istilah asing

  ---
  Analisis: Apa yang Kurang?
  ┌─────────────────────────┬─────────────────────────────────────────────┬───────────────────────┐
  │          Aspek          │                Current State                │          Gap          │
  ├─────────────────────────┼─────────────────────────────────────────────┼───────────────────────┤
  │ Detection               │ ✅ Regex patterns lengkap                   │ -                     │
  ├─────────────────────────┼─────────────────────────────────────────────┼───────────────────────┤
  │ "Apa yang salah"        │ ✅ Message jelas                            │ -                     │
  ├─────────────────────────┼─────────────────────────────────────────────┼───────────────────────┤
  │ "Kenapa salah"          │ ⚠️ Partial (di constitution, bukan di code) │ Belum integrated      │
  ├─────────────────────────┼─────────────────────────────────────────────┼───────────────────────┤
  │ "Gimana benernya"       │ ⚠️ Generic suggestions                      │ Kurang contoh konkret │
  ├─────────────────────────┼─────────────────────────────────────────────┼───────────────────────┤
  │ Transformation Examples │ ❌ Tidak ada                                │ Perlu                 │
  └─────────────────────────┴─────────────────────────────────────────────┴───────────────────────┘
  ---
  Dua Opsi

  Opsi A: Cukup dengan Aturan Boleh/Tidak Boleh (Minimalis)

  Approach:
  - Keep current definitions.ts as-is
  - AI refrasing pakai general prompt + constitution sebagai context
  - Tidak ada kamus/dictionary tambahan

  Pro:
  - Simpler, faster to implement
  - AI model (Gemini) sudah punya knowledge Bahasa Indonesia
  - Avoid scope creep

  Con:
  - AI mungkin generate replacement yang sama buruknya
  - Inconsistent output karena prompt terlalu loose
  - User gak belajar "yang bagus gimana"

  ---
  Opsi B: Enriched Rules dengan Transformation Examples (Recommended)

  Approach:
  Bukan kamus grammar lengkap, tapi enrichment dari rules yang sudah ada:

  // BEFORE (current)
  {
    pattern: /oleh karena itu/i,
    message: 'Kata penghubung klise.',
    suggestion: 'Hapus atau gunakan "Dengan demikian"'
  }

  // AFTER (enriched)
  {
    pattern: /oleh karena itu/i,
    message: 'Kata penghubung klise yang sering menjadi "kruk" AI.',
    suggestion: 'Hapus dan biarkan logika mengalir.',
    examples: [
      {
        bad: 'Hujan turun deras. Oleh karena itu, jalanan banjir.',
        good: 'Hujan turun deras. Jalanan pun mulai tergenang.',
        explanation: 'Hubungan sebab-akibat tersirat dari konteks.'
      }
    ],
    // Untuk AI prompt
    transformationHint: 'Hapus connector, sambungkan dengan kata "pun" atau biarkan implicit.'
  }

  Pro:
  - AI punya concrete examples untuk generate better output
  - Consistent transformations
  - Educational value untuk user (lihat before/after)
  - Prompt lebih terarah

  Con:
  - Perlu effort untuk codify examples dari constitution
  - Sedikit tambahan maintenance

  ---
  Rekomendasi Gue

  Opsi B (Enriched Rules) dengan scope yang terbatas:

  1. TIDAK perlu kamus grammar Bahasa Indonesia lengkap - AI sudah punya
  2. PERLU enrichment untuk rules yang sudah ada - tambah examples dan transformationHint
  3. Constitution jadi basis AI prompt - bukan hardcoded rules

  Konkretnya:
  ┌──────────────────────────────┬──────────────────────────────────────────────┐
  │             Item             │                    Action                    │
  ├──────────────────────────────┼──────────────────────────────────────────────┤
  │ FORBIDDEN_PATTERNS (6 items) │ Tambah 1-2 contoh per pattern                │
  ├──────────────────────────────┼──────────────────────────────────────────────┤
  │ BUDGETED_WORDS (10 items)    │ Tambah transformationHint                    │
  ├──────────────────────────────┼──────────────────────────────────────────────┤
  │ EFFICIENCY_TARGETS (2 items) │ Tambah contoh before/after                   │
  ├──────────────────────────────┼──────────────────────────────────────────────┤
  │ Constitution                 │ Dijadikan prompt template untuk AI refrasing │
  └──────────────────────────────┴──────────────────────────────────────────────┘
  Effort estimate: ~1-2 jam untuk enrichment, bukan days/weeks untuk bikin kamus lengkap.


  ---


  Analisis Detail

  1. Secara Teknis: BISA

  // Current structure allows extension
  export const FORBIDDEN_PATTERNS: Array<{...}> = [...]  // Array = appendable
  export const BUDGETED_WORDS: Record<string, {...}> = {...}  // Object = extendable
  export const EFFICIENCY_TARGETS: string[] = [...]  // Array = appendable

  Tidak ada hardcoded limit. Lo bisa tambah 100 patterns kalau mau.

  ---
  2. Tapi Ada RISIKO Kalau Tidak Terkontrol
  ┌──────────────────────────┬───────────────────────────────────────────────────────────┬────────────────────────────────────────────┐
  │          Risiko          │                        Penjelasan                         │                   Dampak                   │
  ├──────────────────────────┼───────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
  │ False Positive Explosion │ Makin banyak rules = makin banyak "salah tangkap"         │ User frustasi, tool jadi gak dipercaya     │
  ├──────────────────────────┼───────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
  │ Conflicting Rules        │ Rule A bilang "hapus X", Rule B bilang "ganti X dengan Y" │ AI bingung, output inconsistent            │
  ├──────────────────────────┼───────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
  │ Over-correction          │ Terlalu banyak rules = tulisan jadi "sterilized"          │ Kehilangan personality, semua tulisan sama │
  ├──────────────────────────┼───────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
  │ Performance Degradation  │ Regex matching O(n) per pattern                           │ Slow validation untuk text panjang         │
  ├──────────────────────────┼───────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
  │ Maintenance Burden       │ Siapa yang maintain? Siapa yang test rule baru?           │ Technical debt                             │
  ├──────────────────────────┼───────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
  │ Prompt Bloat             │ Constitution terlalu panjang = token limit issue          │ AI gak bisa process semua rules            │
  └──────────────────────────┴───────────────────────────────────────────────────────────┴────────────────────────────────────────────┘
  ---
  3. Recommended Guardrails

  A. Soft Limits per Category
  ┌───────────────────────┬─────────┬─────────────────┬──────────────────────────────────┐
  │       Category        │ Current │ Recommended Max │              Alasan              │
  ├───────────────────────┼─────────┼─────────────────┼──────────────────────────────────┤
  │ FORBIDDEN_PATTERNS    │ 6       │ 15-20           │ Regex heavy, performance concern │
  ├───────────────────────┼─────────┼─────────────────┼──────────────────────────────────┤
  │ BUDGETED_WORDS        │ 10      │ 20-25           │ Simple lookup, bisa lebih banyak │
  ├───────────────────────┼─────────┼─────────────────┼──────────────────────────────────┤
  │ EFFICIENCY_TARGETS    │ 2       │ 5-10            │ Warning only, low impact         │
  ├───────────────────────┼─────────┼─────────────────┼──────────────────────────────────┤
  │ Constitution sections │ 6       │ 8-10            │ Token limit untuk AI prompt      │
  └───────────────────────┴─────────┴─────────────────┴──────────────────────────────────┘
  B. Rule Quality Requirements

  Setiap rule baru HARUS punya:

  interface QualityRule {
    // WAJIB
    pattern: RegExp              // Apa yang di-detect
    message: string              // Pesan error
    severity: 'CRITICAL' | 'WARNING'

    // WAJIB untuk rule baru
    examples: {
      bad: string                // Contoh yang salah
      good: string               // Contoh yang benar
      context?: string           // Kapan rule ini apply
    }[]

    // OPTIONAL tapi recommended
    transformationHint?: string  // Guidance untuk AI
    testCases?: string[]         // Untuk automated testing
  }

  C. Conflict Detection

  Sebelum tambah rule baru, check:
  1. Apakah overlap dengan existing rule?
  2. Apakah contradict existing rule?
  3. Apakah ada false positive yang obvious?

  ---
  4. Customization Options (Future)

  Untuk v1: Hardcoded rules saja (simpler)

  Untuk v2, bisa consider:
  ┌───────────────────┬────────────┬──────────────────────────────────────────────┐
  │      Option       │ Complexity │                   Benefit                    │
  ├───────────────────┼────────────┼──────────────────────────────────────────────┤
  │ Config File       │ Low        │ Rules di JSON/YAML, bisa edit tanpa redeploy │
  ├───────────────────┼────────────┼──────────────────────────────────────────────┤
  │ Admin UI          │ Medium     │ Non-technical user bisa manage rules         │
  ├───────────────────┼────────────┼──────────────────────────────────────────────┤
  │ Per-User Profiles │ High       │ User bisa pilih strictness level             │
  ├───────────────────┼────────────┼──────────────────────────────────────────────┤
  │ Database-driven   │ High       │ Full CRUD untuk rules, versioning            │
  └───────────────────┴────────────┴──────────────────────────────────────────────┘
  ---
  5. Constitution: Special Consideration

  Constitution BERBEDA dari code rules:
  ┌─────────────────┬─────────────────────┬──────────────────────────────────┐
  │     Aspect      │     Code Rules      │           Constitution           │
  ├─────────────────┼─────────────────────┼──────────────────────────────────┤
  │ Purpose         │ Detection & Scoring │ AI Guidance & Education          │
  ├─────────────────┼─────────────────────┼──────────────────────────────────┤
  │ Format          │ Structured data     │ Prose/narrative                  │
  ├─────────────────┼─────────────────────┼──────────────────────────────────┤
  │ Size constraint │ Performance         │ Token limit (~4000 tokens ideal) │
  ├─────────────────┼─────────────────────┼──────────────────────────────────┤
  │ Extensibility   │ Tambah items        │ Tambah sections                  │
  └─────────────────┴─────────────────────┴──────────────────────────────────┘
  Recommendation untuk Constitution:
  - Keep concise — setiap section max 200-300 kata
  - Prioritize — most important rules first (AI might truncate)
  - Examples > Explanations — AI learns better from examples

  ---
  Summary: Safe Extension Guidelines

  ┌─────────────────────────────────────────────────────────────────┐
  │  SAFE TO ADD                                                    │
  │  ✅ Rules dengan clear examples                                 │
  │  ✅ Rules yang address NEW problem (bukan duplicate)            │
  │  ✅ WARNING-level rules (low risk)                              │
  │  ✅ Rules yang sudah di-test dengan sample texts                │
  ├─────────────────────────────────────────────────────────────────┤
  │  RISKY TO ADD                                                   │
  │  ⚠️ CRITICAL rules tanpa thorough testing                       │
  │  ⚠️ Broad regex yang bisa match unintended text                 │
  │  ⚠️ Rules yang overlap dengan existing                          │
  ├─────────────────────────────────────────────────────────────────┤
  │  AVOID                                                          │
  │  ❌ Rules tanpa examples                                        │
  │  ❌ Rules yang contradict existing                              │
  │  ❌ More than 50 total rules (diminishing returns)              │
  │  ❌ Constitution > 5000 tokens                                  │
  └─────────────────────────────────────────────────────────────────┘
