# Temuan Arsitektural: Mengapa Tool-Based Emission Gagal

Date: 2026-03-19
Status: post-mortem dari v2 tool-based approach

## Kronologi

V2 menggunakan `emitChoiceCard` tool — model harus secara eksplisit call tool untuk menampilkan choice card. Pipeline teknis berhasil 100%: tool execute, stream intercept, persist, frontend render.

**Tapi model tidak mau proaktif call tool.**

Model hanya call tool ketika user secara eksplisit minta ("bagaimana rekomendasimu?"). Pada turn normal, model menulis opsi sebagai bullet list di prose — persis yang seharusnya diganti oleh choice card.

## Root Cause

### 1. Tool calling bukan cara natural model "express" UI

Tool calling adalah aksi deliberate — model harus memutuskan "saya akan call tool ini sekarang." Ini cocok untuk side-effects (save data, submit validation) tapi TIDAK cocok untuk "saya ingin menunjukkan sesuatu secara visual."

Menulis teks adalah cara natural model berkomunikasi. Ketika model ingin present opsi, instinct-nya menulis prose — bukan call tool.

### 2. Web search compose step tidak punya tools

Turn paling kritis (setelah riset, saat opsi paling natural muncul) adalah web search turn. Di arsitektur orchestrator, compose step `streamText()` dipanggil TANPA tools. Model tidak bisa call `emitChoiceCard` meskipun tool registered.

Setelah turn ini lewat (model sudah tulis opsi di prose), turn berikutnya model tidak merasa perlu present ulang opsi yang sama.

### 3. Prompt engineering tidak cukup

4 iterasi system prompt (dari rules-based sampai identity-based "visual language") tidak mengubah behavior. Gemini tetap prefer menulis prose. Ini bukan masalah prompt wording — ini masalah arsitektural.

## Temuan: json-render Didesain untuk Text-Based Emission

Dari riset `https://github.com/vercel-labs/json-render`:

- `@json-render/yaml` package menyediakan `pipeYamlRender()` — transform yang intercept YAML code fences dari text stream
- Model output YAML spec sebagai **teks biasa** di dalam code fence `yaml-spec`
- `yamlPrompt(catalog)` generate system prompt yang mengajarkan model format YAML dari catalog yang didefinisikan
- Mode `inline`: model menulis prose biasa, lalu embed YAML spec di code fence — keduanya di response yang sama
- Transform otomatis parse YAML → emit patches → frontend render progressively

**Ini persis paradigm "visual language" yang diinginkan:**
- Model tidak perlu call tool — cukup MENULIS spec sebagai bagian dari teks
- Menulis YAML code fence sama natural-nya dengan menulis code block
- Prose dan card hidup di response yang sama — tidak ada duplikasi
- Bekerja di semua path termasuk web search compose (karena ini teks, bukan tool)

## Implikasi untuk Redesign

| Aspek | Tool-Based (gagal) | YAML Text-Based (proposed) |
|-------|--------------------|-----------------------------|
| Trigger | Model harus deliberate call tool | Model nulis YAML di prose — natural |
| Web search compat | Tidak — compose step nggak punya tools | Ya — YAML adalah teks biasa |
| Skip logic | Nol (tool registration gating) | Nol (model decide kapan nulis YAML) |
| Extra LLM calls | Nol | Nol |
| Stream handling | Intercept `tool-output-available` + toolCallId mapping | `pipeYamlRender()` — drop-in transform |
| Prompt | Complex instruction tentang kapan call tool | `yamlPrompt(catalog)` — auto-generated dari catalog |

## Apa yang Bisa Dipertahankan dari V2

- Frontend components (ChoiceCardShell, ChoiceOptionButton, etc.)
- Catalog definition (`choice-catalog.ts`)
- Registry + JSONUIProvider + Renderer pattern
- Persistence schema (jsonRendererChoice field di messages)
- History rehydration pattern
- Submit flow (interactionEvent, context note)
- Read-only lock after submission
- choice-submit.ts, choice-request.ts contracts

## Apa yang Harus Diganti

- `emitChoiceCard` tool di paper-tools.ts → HAPUS
- Stream loop interception (`tool-output-available`) → GANTI dengan `pipeYamlRender()`
- CHOICE_CARD_INSTRUCTION system prompt → GANTI dengan `yamlPrompt(catalog)` output
- Tool registration gating → HAPUS (tidak perlu)
