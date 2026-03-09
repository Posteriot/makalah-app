# Search Tool Skills — Insights & Lessons Learned

## Insight Utama: Tools Sederhana, Skills Cerdas

Prinsip ini terbukti melalui eksperimen iteratif di branch `search-tool-skills`:

> **Tools yang ruwet membatasi kecerdasan LLM. Biarkan tools sederhana, berikan kecerdasan melalui skills.**

### Apa Bedanya?

| Layer | Peran | Contoh |
|-------|-------|--------|
| **Tool** | Eksekutor sederhana — ambil data, nggak menilai | Perplexity retrieve sources, Grok search web |
| **Skill** | Layer pengetahuan — ajarkan LLM BAGAIMANA menilai | SKILL.md: evaluasi kredibilitas, blocklist, narasi |
| **Code Pipeline** | Transformasi deterministik minimal | Normalize URL, format citation |

### Kenapa Ini Penting?

Sebelumnya, pipeline search kita 6 langkah:
```
Perplexity → normalize → score by domain tier → enrich titles →
filter unreachable → dedup by final URL → Gemini
```

Hasilnya: **50% source hilang** (12 → 6). Setiap langkah code = potensi kehilangan data.

Setelah simplifikasi:
```
Perplexity → normalize → pass ALL to Gemini + SKILL.md
```

Hasilnya: **14 source terpakai, 0 blocked domain dikutip.**

## Prinsip #1: Tools Harus Bebas

> "AI works better when you give tools and freedom instead of forcing them into rigid, hand-designed workflows" — Boris Cherny

**Jangan batasi apa yang tool bisa kumpulkan.** Perplexity yang diberi blocklist di system prompt-nya = Perplexity yang retrieval-nya terkekang. Perplexity yang bebas = lebih banyak source, lebih beragam.

Praktiknya:
- ❌ Blocklist di system prompt Perplexity (membatasi retrieval)
- ❌ Domain name spesifik di instruksi ("cari di BPS, World Bank, McKinsey")
- ✅ Diversity hint generik di user message ("search broadly, cite 10+ sources")
- ✅ Perplexity/Grok bebas retrieve dari mana saja

## Prinsip #2: Skills Memberikan Kecerdasan

**Judgment kualitas = tugas LLM, bukan tugas code.**

LLM seperti Gemini dilatih untuk mengikuti instruksi. Blocklist yang ditulis "NEVER cite wikipedia.org" di SKILL.md sama efektifnya dengan `isBlockedSourceDomain()` di code — tapi tanpa risiko kehilangan source di pipeline.

Praktiknya:
- ❌ `isBlockedSourceDomain()` filter di code pipeline
- ❌ Domain tier scoring (academic: 90, news: 70, blog: 30)
- ❌ Diversity enforcement algoritma
- ✅ Blocklist sebagai natural language di SKILL.md
- ✅ Instruksi evaluasi kredibilitas (primary data, authorship, methodology)
- ✅ Instruksi diversifikasi ("mix data, news, expert analysis")

## Prinsip #3: Code Pipeline Harus Minimal

**Setiap langkah code antara output tool dan input LLM = potensi kehilangan data.**

Code hanya untuk transformasi yang benar-benar deterministik dan tidak mengurangi data:
- ✅ Normalize URL format
- ✅ Normalize citation format (Perplexity format → standard format)
- ❌ Score/rank sources
- ❌ Enrich titles via fetch (timeout = source loss)
- ❌ Dedup by final URL (redirect resolution = false dedup)
- ❌ Filter by reachability (slow servers ≠ bad sources)

## Prinsip #4: Perplexity Behavior

Hal spesifik tentang Perplexity Sonar yang perlu dipahami:

1. **System prompt mempengaruhi TEXT response, BUKAN retrieval.** Perplexity search independently dari system prompt.
2. **User message = search query basis.** Diversity hints di user message langsung mempengaruhi apa yang Perplexity cari.
3. **Nama domain spesifik di instruksi = penjara.** "Cari di BPS, McKinsey" = Perplexity hanya ambil dari situ.
4. **Instruksi generik lebih efektif.** "Search broadly, include domestic and international sources" > "Search BPS and World Bank".

## Prinsip #5: Pisahkan Concern

| Concern | Tempat | Contoh |
|---------|--------|--------|
| **Search quality** | `web-search-quality` skill | Evaluasi sumber, blocklist, narasi, integritas |
| **Workflow control** | route.ts + paper-search-helpers | Kapan search boleh jalan, mode switching |
| **Tool execution** | streaming.ts | Model mana yang dipanggil, API key, config |

Jangan campur. Search quality nggak peduli apakah konteksnya paper atau chat. Paper workflow nggak peduli bagaimana sumber dinilai.

## Timeline Eksperimen

| Commit | Perubahan | Hasil |
|--------|-----------|-------|
| Awal | 6-step pipeline (normalize → score → enrich → filter → dedup → Gemini) | 6 sources, banyak source hilang |
| Simplifikasi | 3-step (normalize → blacklist code → Gemini) | 12 sources |
| SKILL.md blocklist | 2-step (normalize → Gemini + SKILL.md blocklist) | 14 sources, 0 blocked cited |

## Referensi

- Anthropic: "The Complete Guide to Building Skills for Claude"
- Boris Cherny: tools + freedom > rigid workflows
- `architecture-constraints.md` — aturan teknis (bahasa, scope, separasi)
- `web-search-quality-skill-design.md` — detail arsitektur skill
- `future-paper-workflow-skill-notes.md` — catatan untuk paper workflow skill

## Files

| File | Deskripsi |
|------|-----------|
| `README.md` | Dokumen ini — insight dan prinsip |
| `architecture-constraints.md` | Aturan arsitektur: bahasa, scope, tools vs skills |
| `web-search-quality-skill-design.md` | Detail desain skill web-search-quality |
| `future-paper-workflow-skill-notes.md` | Catatan system notes untuk paper workflow skill |
