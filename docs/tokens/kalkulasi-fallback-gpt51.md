# Kalkulasi Proses Tokens & Sistem Kredit (Fallback: GPT-5.1)

## Scope

| Aspek | Nilai |
|-------|-------|
| **Model** | GPT-5.1 (Fallback Provider) |
| **Provider** | OpenRouter |
| **Primary** | Lihat: `docs/tokens/kalkulasi-gemini-tokens.md` |

> **Catatan:** Dokumen ini khusus untuk kalkulasi dengan **GPT-5.1 via OpenRouter** sebagai fallback AI provider. Fallback diaktifkan otomatis saat Vercel AI Gateway (primary) gagal.

---

## Kapan Fallback Aktif?

Fallback ke GPT-5.1 terjadi ketika:
1. Vercel AI Gateway tidak tersedia (downtime)
2. Primary model (Gemini 2.5 Flash) error/timeout
3. Rate limit tercapai di Gateway

Secara normal, mayoritas request akan menggunakan primary provider (Gemini). Fallback hanya untuk kondisi darurat.

---

## Mengapa GPT-5.1?

### Perbandingan Model OpenAI (Januari 2026)

| Model | Input/1M | Output/1M | Reasoning Tokens? | Cocok untuk Fallback? |
|-------|----------|-----------|-------------------|----------------------|
| **GPT-5.1** | **$1.25** | **$10.00** | ❌ No | ✅ **RECOMMENDED** |
| GPT-4o | $2.50 | $10.00 | ❌ No | ⚠️ OK, tapi lebih mahal |
| GPT-5.2 Instant | $1.75 | $14.00 | ❌ No | ❌ Output mahal |
| o3 | $2.00 | $8.00 | ⚠️ **ALWAYS** | ❌ Hidden cost |

### Kenapa BUKAN o3?

o3 adalah **reasoning model** yang SELALU menggunakan reasoning tokens:
- Reasoning tokens **tidak terlihat** tapi **dihitung sebagai output**
- Bisa generate **ratusan hingga puluhan ribu** reasoning tokens per request
- Cost jadi **unpredictable** dan bisa 3-10x lebih mahal dari yang terlihat

### Kenapa BUKAN GPT-5.2?

GPT-5.2 punya output cost **40% lebih mahal** ($14 vs $10):
- Untuk paper writing yang output-heavy, ini significant
- GPT-5.1 lebih hemat untuk use case kita

### Kenapa GPT-5.1 > GPT-4o?

- Input **50% lebih murah** ($1.25 vs $2.50)
- Output **sama** ($10.00)
- Model lebih baru dengan capability lebih baik
- **Save 10% cost** per paper

---

## Perbandingan Pricing: Primary vs Fallback

| Model | Input/1M | Output/1M | Relative Cost |
|-------|----------|-----------|---------------|
| **Gemini 2.5 Flash** (Primary) | $0.30 | $2.50 | 1x (baseline) |
| **GPT-5.1** (Fallback) | $1.25 | $10.00 | **~4x input, ~4x output** |

> **Implikasi:** Jika fallback sering aktif, cost akan meningkat signifikan. Monitor fallback rate di logs.

---

## Cost Structure (Internal)

### Model: GPT-5.1 (Fallback Provider)

> Model ID: `openai/gpt-5.1`
> Provider: OpenRouter
>
> **Catatan:** Model ID aktual dikonfigurasi via Admin Panel dan disimpan di database `aiProviderConfigs`. Cek Admin Panel untuk nilai terkini.

| Tipe Token | Rate USD | Rate IDR (1 USD = Rp 16.000) |
|------------|----------|------------------------------|
| Input | $1.25/1M | Rp 20,00/1K tokens |
| Output | $10.00/1M | Rp 160,00/1K tokens |

> **Sumber:** [OpenAI Pricing](https://openai.com/api/pricing/) (Januari 2026)

### Cost per Paket (Fallback)

| Paket | Kredit | Tokens | Input (50%) | Output (50%) | Total Cost |
|-------|--------|--------|-------------|--------------|------------|
| Paper | 300 | 300.000 | Rp 3.000 | Rp 24.000 | Rp 27.000 |
| Extension S | 50 | 50.000 | Rp 500 | Rp 4.000 | Rp 4.500 |
| Extension M | 100 | 100.000 | Rp 1.000 | Rp 8.000 | Rp 9.000 |

*Worst case = 50:50 input:output ratio*

### Margin Analysis (Fallback)

| Paket | Revenue | Cost | Gross Margin |
|-------|---------|------|--------------|
| Paper | Rp 80.000 | Rp 27.000 | **66,3%** |
| Extension S | Rp 25.000 | Rp 4.500 | **82,0%** |
| Extension M | Rp 50.000 | Rp 9.000 | **82,0%** |

> **Catatan:** Margin lebih baik dibanding GPT-4o (Paper: 66,3% vs 62,5%). Masih profitable dengan buffer yang cukup.

---

## Perbandingan Cost: Primary vs Fallback

### Paket Paper (300K tokens)

| Provider | Cost | Margin | vs Primary |
|----------|------|--------|------------|
| Gemini 2.5 Flash | Rp 6.720 | 91,6% | baseline |
| GPT-5.1 | Rp 27.000 | 66,3% | +302% |
| ~~GPT-4o~~ | ~~Rp 30.000~~ | ~~62,5%~~ | ~~+346%~~ |

### Paket Extension S (50K tokens)

| Provider | Cost | Margin | vs Primary |
|----------|------|--------|------------|
| Gemini 2.5 Flash | Rp 1.120 | 95,5% | baseline |
| GPT-5.1 | Rp 4.500 | 82,0% | +302% |

### Paket Extension M (100K tokens)

| Provider | Cost | Margin | vs Primary |
|----------|------|--------|------------|
| Gemini 2.5 Flash | Rp 2.240 | 95,5% | baseline |
| GPT-5.1 | Rp 9.000 | 82,0% | +302% |

---

## Savings vs GPT-4o (Previous Fallback)

| Paket | GPT-4o Cost | GPT-5.1 Cost | Savings |
|-------|-------------|--------------|---------|
| Paper | Rp 30.000 | Rp 27.000 | **Rp 3.000 (10%)** |
| Extension S | Rp 5.000 | Rp 4.500 | **Rp 500 (10%)** |
| Extension M | Rp 10.000 | Rp 9.000 | **Rp 1.000 (10%)** |

---

## Rekomendasi Operasional

### 1. Monitor Fallback Rate

```
Target: Fallback rate < 5% dari total requests
```

Jika fallback rate tinggi:
- Investigasi masalah di primary provider
- Pertimbangkan switch primary model
- Hubungi Vercel support jika Gateway issue

### 2. Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Fallback rate | > 5% | > 15% |
| Daily fallback cost | > Rp 100.000 | > Rp 500.000 |

### 3. Fallback Budget

Alokasikan buffer untuk fallback costs:
- Normal month: ~2-5% dari AI cost budget
- Worst case: ~20% dari AI cost budget (jika primary down extended)

---

## Catatan Teknis

### Web Search di Fallback

Saat fallback aktif, web search menggunakan OpenRouter `:online` suffix:
- Model ID menjadi: `openai/gpt-5.1:online`
- Citations dari OpenRouter annotations
- Lihat `src/lib/ai/streaming.ts` → `getOpenRouterModel()`

### Logging

Fallback events di-log dengan prefix `[Fallback]`:
```
[Fallback] Primary failed, switching to OpenRouter
[Fallback] Web search config: { engine: "auto", maxResults: 5 }
```

---

## Referensi

- Model pricing: [OpenAI Pricing](https://openai.com/api/pricing/)
- OpenRouter: [OpenRouter Pricing](https://openrouter.ai/models)
- Primary provider: `docs/tokens/kalkulasi-gemini-tokens.md`
- Billing system: `docs/pricing/bayar-per-paper.md`

---

## Changelog

| Tanggal | Perubahan |
|---------|-----------|
| 2026-01-30 | Switch dari GPT-4o ke GPT-5.1 (10% lebih hemat) |
| 2026-01-30 | Initial version - dokumentasi fallback |
