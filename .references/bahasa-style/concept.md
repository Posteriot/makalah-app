
  Analisis Kritis: Bahasa Style Tool

  1. Ringkasan Konsep

  Tool ini dirancang sebagai "Ruthless Linter" untuk tulisan akademis Bahasa Indonesia dengan tujuan:
  - Menghilangkan pola tulisan AI yang monoton
  - Mendeteksi "Indonenglish" (struktur Inggris yang diterjemahkan mentah)
  - Memaksa variasi irama kalimat (burstiness)
  - Membatasi kata-kata "kruk" (crutches) via budget system

  ★ Insight ─────────────────────────────────────
  Filosofi "Constraint Satisfaction Problem": Tool ini memperlakukan gaya penulisan bukan sebagai suggestion tapi sebagai hard constraint yang bisa di-binary check (Pass/Fail). Ini berbeda dari approach umum yang cuma kasih system prompt ke LLM dan berharap model nurut.

  3-Phase Pipeline (belum terimplementasi penuh):
  1. Structural Planning - Generate sentence plan (JSON intent + length target)
  2. Constrained Generation - Generate per-sentence dengan logit bias
  3. Ruthless Linter - Post-processing deterministic check
  ─────────────────────────────────────────────────

  ---
  2. Status Implementasi Saat Ini
  ┌───────────────────────────────────┬────────────────────┬───────────────────────────────────────────────┐
  │               Fitur               │       Status       │                     Notes                     │
  ├───────────────────────────────────┼────────────────────┼───────────────────────────────────────────────┤
  │ Sentence Variance Check           │ ✅ Implemented     │ Deteksi 3 kalimat monoton                     │
  ├───────────────────────────────────┼────────────────────┼───────────────────────────────────────────────┤
  │ Forbidden Patterns (Indonenglish) │ ✅ Implemented     │ dimana, tidak hanya...tetapi juga, tergantung │
  ├───────────────────────────────────┼────────────────────┼───────────────────────────────────────────────┤
  │ Budgeted Words                    │ ✅ Implemented     │ namun (1), oleh karena itu (0), dll           │
  ├───────────────────────────────────┼────────────────────┼───────────────────────────────────────────────┤
  │ Bad Placement Check               │ ✅ Implemented     │ "Ini" di awal kalimat                         │
  ├───────────────────────────────────┼────────────────────┼───────────────────────────────────────────────┤
  │ Efficiency Check                  │ ✅ Implemented     │ adalah, bahwa (warning saja)                  │
  ├───────────────────────────────────┼────────────────────┼───────────────────────────────────────────────┤
  │ Sentence Length Cap               │ ✅ Implemented     │ >12 kata = long, max 10%                      │
  ├───────────────────────────────────┼────────────────────┼───────────────────────────────────────────────┤
  │ CLI Tool                          │ ✅ Implemented     │ cli_check.ts                                  │
  ├───────────────────────────────────┼────────────────────┼───────────────────────────────────────────────┤
  │ Suggester                         │ ⚠️ Placeholder     │ Belum ada logic                               │
  ├───────────────────────────────────┼────────────────────┼───────────────────────────────────────────────┤
  │ Structural Planning (Phase 1)     │ ❌ Not Implemented │ JSON sentence intent                          │
  ├───────────────────────────────────┼────────────────────┼───────────────────────────────────────────────┤
  │ Constrained Generation (Phase 2)  │ ❌ Not Implemented │ Logit bias per-sentence                       │
  ├───────────────────────────────────┼────────────────────┼───────────────────────────────────────────────┤
  │ Sinonim Dinamis                   │ ❌ Not Implemented │ Disebut di v2.0 recommendation                │
  └───────────────────────────────────┴────────────────────┴───────────────────────────────────────────────┘
  ---
  3. Analisis Kritis

  A. Kekuatan

  1. Rule-Based + Deterministic: Tidak bergantung LLM untuk validasi. Regex + word count = cepat dan consistent.
  2. Severity System: Ada CRITICAL vs WARNING, jadi bisa filter mana yang hard-fail vs soft-suggest.
  3. Config Customizable: StyleConfig interface memungkinkan tuning parameter tanpa ubah logic.
  4. Budget System Clever: Daripada ban total, kasih kuota. "Namun" boleh 1x, bukan 0x. Ini lebih realistis.

  B. Kelemahan & Risiko

  1. Tokenizer Dependency pada natural Library
  // core/tokenizer.ts:2
  import natural from 'natural';
  1. Library natural ini besar dan primary untuk English NLP. Ada fallback ke simple split, tapi hasilnya bisa kurang akurat untuk Indonesian sentence boundary.
  2. False Positive Risk pada "adalah" dan "bahwa"
  Tool ini selalu flag "adalah" dan "bahwa" sebagai INEFFICIENT_COPULA, padahal kadang emang perlu. Contoh:
    - "Definisi X adalah..." → valid akademis
    - "Fakta bahwa..." → proper Indonesian
  3. Regex Limitations
  Pattern /\btergantung\b(?!\s+pada)/i gak sempurna. Kalimat seperti "Tergantung kondisi lapangan, kita akan..." masih lolos padahal harusnya "Bergantung pada kondisi...".
  4. Scoring System Terlalu Simplistic
  score: Math.max(0, 100 - (issues.length * 10))
  4. Setiap issue = -10 poin, regardless severity. 10 warning = 0 score, padahal harusnya CRITICAL lebih berat dari WARNING.
  5. Belum Ada Position Context
  Tool cuma detect keberadaan pattern, bukan posisinya. "Namun" di tengah kalimat (intra-sentence) harusnya lebih acceptable daripada di awal (inter-sentence), tapi tool ini gak distinguish.
  6. Suggester Kosong
  modules/suggester.ts cuma placeholder. Potensi untuk contextual synonym rotation belum digarap.

  ---
  4. Potensi Implementasi di Aplikasi Makalah

  Sekarang pertanyaan pentingnya: gimana tool ini bisa diterapkan di paper workflow yang existing?

  Opsi 1: Real-Time Linting di Chat (Warning Mode)

  Ide: Setiap AI generate response untuk stage paper, validasi hasilnya via BahasaStyle.validate(), lalu inject warning ke UI.

  Flow:
  AI Response → BahasaStyle.validate() → Jika issues > 0 → Show inline warnings

  Pro: Non-blocking, educational untuk user
  Con: AI bakal sering di-flag karena model gak "aware" sama constraint

  Opsi 2: Pre-Submit Validation (Gate Mode)

  Ide: Sebelum submitStageForValidation tool dipanggil, cek dulu via linter. Kalau ada CRITICAL issue, tolak submit.

  submitStageForValidation → Pre-check dengan BahasaStyle → Block if invalid

  Pro: Enforce quality sebelum stage progress
  Con: Bisa frustrating kalau terlalu strict

  Opsi 3: System Prompt Injection + Post-Validation (Recommended)

  Ide: Kombinasi 2 approach:
  1. Inject style rules ke paper-mode system prompt supaya AI "aware"
  2. Post-validate hasil dengan linter
  3. Kalau fail, auto-regenerate dengan specific feedback

  AI Generate → Validate → Fail? → Inject feedback ke AI → Regenerate

  Pro: AI belajar constraint, ada recovery mechanism
  Con: Latency tambahan kalau harus regenerate

  Opsi 4: Artifact-Level Validation

  Ide: Karena paper workflow udah punya artifact system, linter bisa jadi bagian dari artifact creation.

  type artifact.content → BahasaStyle.validate() → Store validation_score di artifact metadata

  Pro: Track quality improvement over versions
  Con: Need schema change di artifact