ANALISIS KOMPREHENSIF: TOOL CALLING PER STAGE

  Understanding Core Constraint

  ★ Insight ─────────────────────────────────────
  AI SDK Fundamental Limitation:
  1. google_search adalah provider-defined tool dari Google - tidak bisa custom
  2. Function tools (createArtifact, updateStageData, dll) adalah user-defined tools
  3. TIDAK BISA MIX dalam satu request → Router harus pilih SATU mode
  4. maxSteps bisa enable multi-step, tapi semua steps dalam 1 request pakai tool-set yang SAMA
  ─────────────────────────────────────────────────

  ---
  📋 ANALISIS PER STAGE
  ┌─────┬────────────────────┬─────────────────┬──────────────────────────────────────────────┬────────────────────────┐
  │  #  │       Stage        │ Web Search Mode │                  Ideal Flow                  │     Current Issue      │
  ├─────┼────────────────────┼─────────────────┼──────────────────────────────────────────────┼────────────────────────┤
  │ 1   │ Gagasan            │ AKTIF           │ search → [turn] → artifact + updateStageData │ ✅ Multi-turn enforced │
  ├─────┼────────────────────┼─────────────────┼──────────────────────────────────────────────┼────────────────────────┤
  │ 2   │ Topik              │ AKTIF           │ search → [turn] → artifact + updateStageData │ ✅ Multi-turn enforced │
  ├─────┼────────────────────┼─────────────────┼──────────────────────────────────────────────┼────────────────────────┤
  │ 3   │ Outline            │ PASIF           │ artifact + updateStageData langsung          │ ⚠️ Potential issue     │
  ├─────┼────────────────────┼─────────────────┼──────────────────────────────────────────────┼────────────────────────┤
  │ 4   │ Abstrak            │ PASIF           │ artifact + updateStageData langsung          │ ⚠️ Potential issue     │
  ├─────┼────────────────────┼─────────────────┼──────────────────────────────────────────────┼────────────────────────┤
  │ 5   │ Pendahuluan        │ AKTIF           │ search → [turn] → artifact + updateStageData │ ✅ Multi-turn enforced │
  ├─────┼────────────────────┼─────────────────┼──────────────────────────────────────────────┼────────────────────────┤
  │ 6   │ Tinjauan Literatur │ AKTIF           │ search → [turn] → artifact + updateStageData │ ✅ Multi-turn enforced │
  ├─────┼────────────────────┼─────────────────┼──────────────────────────────────────────────┼────────────────────────┤
  │ 7   │ Metodologi         │ AKTIF           │ search → [turn] → artifact + updateStageData │ ✅ Multi-turn enforced │
  ├─────┼────────────────────┼─────────────────┼──────────────────────────────────────────────┼────────────────────────┤
  │ 8   │ Hasil              │ PASIF           │ artifact + updateStageData langsung          │ ⚠️ Potential issue     │
  ├─────┼────────────────────┼─────────────────┼──────────────────────────────────────────────┼────────────────────────┤
  │ 9   │ Diskusi            │ AKTIF           │ search → [turn] → artifact + updateStageData │ ✅ Multi-turn enforced │
  ├─────┼────────────────────┼─────────────────┼──────────────────────────────────────────────┼────────────────────────┤
  │ 10  │ Kesimpulan         │ PASIF           │ artifact + updateStageData langsung          │ ⚠️ Potential issue     │
  ├─────┼────────────────────┼─────────────────┼──────────────────────────────────────────────┼────────────────────────┤
  │ 11  │ Daftar Pustaka     │ PASIF           │ artifact + updateStageData langsung          │ ⚠️ Potential issue     │
  ├─────┼────────────────────┼─────────────────┼──────────────────────────────────────────────┼────────────────────────┤
  │ 12  │ Lampiran           │ PASIF           │ artifact + updateStageData langsung          │ ⚠️ Potential issue     │
  ├─────┼────────────────────┼─────────────────┼──────────────────────────────────────────────┼────────────────────────┤
  │ 13  │ Judul              │ PASIF           │ artifact + updateStageData langsung          │ ⚠️ Potential issue     │
  └─────┴────────────────────┴─────────────────┴──────────────────────────────────────────────┴────────────────────────┘
  ---
  🔍 DETAIL ANALISIS PER STAGE

  STAGE 1-2: GAGASAN & TOPIK (Foundation Phase)

  Current Instructions:
  - google_search → WAJIB pakai untuk mencari referensi akademik
  - CATATAN MODE TOOL: Jika pakai google_search, jangan panggil
    updateStageData/createArtifact/submitStageForValidation di turn yang sama

  Analysis:
  - ✅ SUDAH IDEAL - Instructions sudah enforce multi-turn pattern
  - ✅ Web search digunakan di awal untuk eksplorasi literatur
  - ✅ Setelah search selesai, baru panggil function tools di turn berikutnya

  Typical Flow:
  Turn 1: User kasih ide
  Turn 2: AI tanya clarifying questions
  Turn 3: AI pakai google_search (MODE: websearch)
  Turn 4: AI rangkum temuan + updateStageData + createArtifact (MODE: normal)
  Turn 5: AI pakai submitStageForValidation (MODE: normal)

  ---
  STAGE 3: OUTLINE (Structure Phase)

  Current Instructions:
  - google_search → MODE PASIF: HANYA jika user meminta eksplisit

  Analysis:
  - ⚠️ POTENTIAL ISSUE - Jika user tiba-tiba minta search contoh outline
  - Flow bisa terganggu karena AI harus switch mode mid-stage

  Recommended Flow:
  Turn 1: AI propose outline structure (MODE: normal)
  Turn 2: User minta cari contoh outline paper serupa
  Turn 3: AI pakai google_search (MODE: websearch)
  Turn 4: AI refine outline + updateStageData + createArtifact (MODE: normal)

  ---
  STAGE 4: ABSTRAK (Core Phase)

  Current Instructions:
  - google_search → MODE PASIF: HANYA jika user meminta eksplisit
  - Abstrak adalah compile dari data Phase 1

  Analysis:
  - ✅ SUDAH IDEAL - Search tidak diperlukan karena ini compile phase
  - Tapi ada gap: bagaimana jika user minta improve abstrak dengan contoh dari paper lain?

  ---
  STAGE 5: PENDAHULUAN (Core Phase)

  Current Instructions:
  - google_search → Cari data/fakta pendukung urgensi
  - CATATAN MODE TOOL: Jika pakai google_search, jangan panggil
    updateStageData/createArtifact/submitStageForValidation di turn yang sama

  Analysis:
  - ✅ SUDAH IDEAL - Multi-turn enforced
  - Stage ini butuh banyak data faktual → search di awal

  ---
  STAGE 6: TINJAUAN LITERATUR (Core Phase)

  Current Instructions:
  - google_search → Target pendalaman (3-5 queries)
  - CATATAN MODE TOOL: ...multi-turn enforced

  Analysis:
  - ✅ SUDAH IDEAL - Ini stage paling intensif web search
  - Multiple search queries → Multiple turns
  - Concern: Router decision latency bisa bikin UX lambat

  Potential Bottleneck:
  Setiap kali user reply, router harus decide mode:
  - Jika AI mau search lagi → websearch mode
  - Jika AI mau draft → normal mode

  Router decision di SETIAP turn bisa memperlambat

  ---
  STAGE 7: METODOLOGI (Core Phase)

  Current Instructions:
  - google_search → Cari referensi/contoh metodologi sejenis (1-2 kali)

  Analysis:
  - ✅ SUDAH IDEAL - Search jarang dibutuhkan
  - Tapi bisa jadi issue kalau AI perlu compare methodology di paper lain

  ---
  STAGE 8: HASIL (Results Phase)

  Current Instructions:
  - google_search → MODE PASIF: HANYA jika user minta benchmark/pembanding
  - Hasil harus dari data AKTUAL user

  Analysis:
  - ⚠️ POTENTIAL ISSUE - Bagaimana jika AI ingin:
    a. Cari benchmark data untuk comparison
    b. SEKALIGUS update artifact hasil

  Dengan constraint saat ini: TIDAK BISA dalam 1 turn

  ---
  STAGE 9: DISKUSI (Results Phase)

  Current Instructions:
  - google_search → opsional untuk referensi pembanding
  - CATATAN MODE TOOL: ...multi-turn enforced

  Analysis:
  - ✅ SUDAH IDEAL - Cross-reference dengan literatur butuh search
  - Multi-turn pattern sudah di-enforce

  ---
  STAGE 10-13: KESIMPULAN, DAFTAR PUSTAKA, LAMPIRAN, JUDUL (Finalization)

  Current Instructions:
  - google_search → MODE PASIF untuk semua stage finalization

  Analysis:
  - ⚠️ POTENTIAL ISSUE - Stage ini mostly compile, tapi:
    - Daftar Pustaka: bisa perlu enrich metadata referensi incomplete
    - Judul: bisa perlu cari inspirasi dari paper serupa

  Jika user minta search → flow terganggu

  ---

⏺ ---
  🚨 MASALAH & BOTTLENECK YANG TERIDENTIFIKASI

  MASALAH 1: Router Decision Overhead

  Setiap turn, chat route harus:
  1. Run decideWebSearchMode() dengan LLM call (temperature 0.2)
  2. Tunggu response
  3. Baru proceed dengan streamText()

  Impact: Latency tambahan di SETIAP turn

  Current Flow:
  User message → Router LLM call (~1-2s) → Main LLM call
                      ↑
                Extra latency

  ---
  MASALAH 2: Tidak Ada "Force Mode" untuk Stage-Specific Behavior

  Stage instructions bilang:
  - Gagasan: "google_search WAJIB pakai"
  - Abstrak: "google_search MODE PASIF"

  Tapi router tidak aware tentang current stage. Router decide berdasarkan:
  - Conversation history (8 pesan terakhir)
  - Content of messages

  Potential Bug: Router bisa salah decide di stage yang harusnya AKTIF/PASIF.

  ---
  MASALAH 3: Multi-Turn UX Friction

  User expect:
  "Cari referensi dan langsung bikin outline-nya"

  Reality:
  Turn 1: AI search (websearch mode)
  Turn 2: AI harus respond dulu dengan rangkuman
  Turn 3: AI baru bisa bikin artifact (normal mode)

  User Perception: "Kenapa butuh 3 turn untuk 1 task?"

  ---
  MASALAH 4: No Parallel Tool Execution

  AI SDK v5 dengan maxSteps bisa multi-step, tapi:
  - All steps use SAME tool set
  - Cannot parallel execute google_search + createArtifact

  Limitation dari Gemini provider:
  "Provider-defined tools cannot be mixed with other tools"

  ---
  MASALAH 5: Inconsistent Search Need per Stage
  ┌──────────────┬─────────────────────┬────────────────────────────┐
  │    Stage     │   Expected Search   │   Actual Router Behavior   │
  ├──────────────┼─────────────────────┼────────────────────────────┤
  │ Gagasan      │ SELALU di awal      │ Depends on router decision │
  ├──────────────┼─────────────────────┼────────────────────────────┤
  │ Abstrak      │ HAMPIR TIDAK PERNAH │ Depends on router decision │
  ├──────────────┼─────────────────────┼────────────────────────────┤
  │ Tinjauan Lit │ SERING (3-5x)       │ Depends on router decision │
  ├──────────────┼─────────────────────┼────────────────────────────┤
  │ Judul        │ JARANG              │ Depends on router decision │
  └──────────────┴─────────────────────┴────────────────────────────┘
  Router tidak punya "stage context" untuk inform decision.

  ---

⏺ ---
  📝 RANGKUMAN & REKOMENDASI

  CURRENT STATE ASSESSMENT
  ┌────────────────────────┬───────────┬────────────────────────────┐
  │         Aspect         │  Rating   │           Notes            │
  ├────────────────────────┼───────────┼────────────────────────────┤
  │ Multi-turn enforcement │ ✅ Good   │ Instructions sudah enforce │
  ├────────────────────────┼───────────┼────────────────────────────┤
  │ Router accuracy        │ ⚠️ Medium │ No stage context           │
  ├────────────────────────┼───────────┼────────────────────────────┤
  │ UX smoothness          │ ⚠️ Medium │ Extra turns needed         │
  ├────────────────────────┼───────────┼────────────────────────────┤
  │ Latency                │ ⚠️ Medium │ Router overhead            │
  ├────────────────────────┼───────────┼────────────────────────────┤
  │ Error handling         │ ✅ Good   │ Fallback in place          │
  └────────────────────────┴───────────┴────────────────────────────┘
  ---
  REKOMENDASI IMPROVEMENT

  Option A: Stage-Aware Router (Low Effort)

  Inject currentStage ke router prompt:

  // Pseudo-code improvement
  const routerPrompt = `
  Current paper stage: ${session?.currentStage || 'none'}
  Stage search behavior: ${getStageSearchBehavior(session?.currentStage)}

  // AKTIF stages: Gagasan, Topik, Pendahuluan, Tinjauan Literatur, Metodologi, Diskusi
  // PASIF stages: Outline, Abstrak, Hasil, Kesimpulan, Daftar Pustaka, Lampiran, Judul
  `

  Benefit: Router jadi aware tentang expected search behavior per stage.

  ---
  Option B: Explicit Search Tool (Medium Effort)

  Buat custom searchLiterature function tool yang:
  1. Internally call google_search
  2. Return results ke AI
  3. Allow AI to continue with other tools

  // Hypothetical - TIDAK BISA dengan current AI SDK
  // karena google_search adalah provider-defined

  Reality Check: Ini TIDAK FEASIBLE karena google_search adalah provider-defined tool dari Google. Kita tidak bisa wrap-nya.

  ---
  Option C: Pre-fetch Search Pattern (Medium Effort)

  Untuk stage AKTIF, proactively run search di background SEBELUM AI respond:

  // Pseudo-code
  if (isActiveSearchStage(currentStage)) {
    // Background search dengan query yang di-extract dari last message
    const searchResults = await prefetchSearch(lastUserMessage)
    // Inject ke system prompt sebagai context
    systemPrompt += `\n\nPre-fetched search results:\n${searchResults}`
  }

  Benefit: AI dapat search results sebagai context, tidak perlu call tool.
  Concern: Gimana tau query apa yang harus di-search?

  ---
  Option D: Accept Multi-Turn as Feature (Zero Effort)

  Reframe multi-turn pattern sebagai deliberate UX choice:

  "AI butuh diskusi dengan user sebelum finalisasi. Ini bukan bug, ini fitur kolaboratif."

  Current instructions sudah align dengan ini:
  - Dialog-first principle
  - Iterasi sampai matang
  - Jangan langsung generate

  Benefit: Tidak perlu engineering changes.
  Concern: User yang expect instant results mungkin frustrated.

  ---
  FINAL VERDICT

  ★ Insight ─────────────────────────────────────
  Kesimpulan Analisis:

  1. Tool separation adalah HARD CONSTRAINT - tidak bisa di-bypass tanpa ganti provider atau architecture fundamental
  2. Current implementation SUDAH OPTIMAL given the constraints - multi-turn pattern adalah workaround terbaik yang ada
  3. Improvement yang realistic:
    - Stage-aware router (Option A) → Low effort, medium impact
    - Accept multi-turn as feature (Option D) → Zero effort, requires UX education
  4. Stage-specific search behavior sudah di-enforce di instructions, tapi router tidak aware → Ini gap yang bisa di-fix
  ─────────────────────────────────────────────────

  ---