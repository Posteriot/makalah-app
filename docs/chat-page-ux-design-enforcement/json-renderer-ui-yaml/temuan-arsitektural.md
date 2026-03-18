Temuan Arsitektural

 ★ Insight ─────────────────────────────────────
  json-render BUKAN didesain untuk tool calling.
  Arsitektur yang benar:
  1. Model output YAML spec sebagai teks di dalam code
  fence (```yaml-spec)
  2. pipeYamlRender() transform intercept teks di stream
  3. Transform parse YAML → emit JSON patches → frontend
  render UI progressively

  Gue paksa model call tool emitChoiceCard — ini melawan
  desain json-render. Makanya model nggak proaktif — tool
  calling bukan cara natural model "express" UI. Yang
  natural: model nulis spec sebagai bagian dari teks
  response-nya.
  ─────────────────────────────────────────────────

  Ini root cause sebenarnya. Gue bikin arsitektur
  tool-based yang melawan cara kerja framework.
  json-render didesain supaya model menulis spec di prose
  (sebagai YAML dalam code fence), bukan call tool yang
  return spec.



  Cara kerja json-render yang benar:

  1. Model menulis prose biasa + YAML spec dalam code
  fence (```yaml-spec) di satu response
  2. pipeYamlRender() intercept text stream — prose lewat
  apa adanya, YAML code fence di-parse jadi patches
  3. Frontend render patches secara progressive — card
  muncul inline di antara prose
  4. Model nggak perlu call tool — dia cukup nulis YAML
  sebagai bagian dari teks

  Kenapa tool-based approach gagal:
  - Tool calling adalah aksi eksplisit yang model harus
  putuskan secara deliberate
  - Model default behavior: nulis teks → Gemini lebih
  prefer nulis prose daripada call tool
  - YAML-in-text adalah cara natural model express UI —
  sama kayak nulis code block, bukan keputusan terpisah

  Yang perlu berubah:

  ┌─────────────────────────┬─────────────────────────┐
  │  Sekarang (tool-based)  │     Harusnya (YAML      │
  │                         │       text-based)       │
  ├─────────────────────────┼─────────────────────────┤
  │ Model call              │ Model tulis             │
  │ emitChoiceCard tool     │ ```yaml-spec di prose   │
  ├─────────────────────────┼─────────────────────────┤
  │ Tool execute compile    │ pipeYamlRender() parse  │
  │ spec                    │ YAML dari stream        │
  ├─────────────────────────┼─────────────────────────┤
  │ route.ts intercept      │ pipeYamlRender()        │
  │ tool-output-available   │ otomatis intercept text │
  ├─────────────────────────┼─────────────────────────┤
  │ System prompt bilang    │ yamlPrompt(catalog)     │
  │ "call the choice card   │ generate catalog        │
  │ tool"                   │ description, model tau  │
  │                         │ format YAML             │
  ├─────────────────────────┼─────────────────────────┤
  │ Tool harus di-register  │ Nggak perlu — model     │
  │ per stage               │ tulis YAML kapanpun dia │
  │                         │  mau                    │
  └─────────────────────────┴─────────────────────────┘

  Yang NGGAK berubah:
  - Frontend components (ChoiceCardShell,
  ChoiceOptionButton, etc.) — sama
  - Catalog definition — sama
  - Payload schema — sama
  - Persistence — sama (capture dari stream, simpan ke DB)
  - History rehydration — sama
  - Submit flow — sama
