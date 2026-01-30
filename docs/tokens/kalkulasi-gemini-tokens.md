# Kalkulasi Proses Tokens & Sistem Kredit

## Scope

| Aspek | Nilai |
|-------|-------|
| **Model** | Gemini 2.5 Flash (Primary Provider) |
| **Provider** | Vercel AI Gateway |
| **Fallback** | Lihat: `docs/tokens/kalkulasi-fallback-gpt51.md` |

> **Catatan:** Dokumen ini khusus untuk kalkulasi dengan **Gemini 2.5 Flash** sebagai primary AI provider. Untuk fallback provider (GPT-4o), lihat dokumen terpisah karena pricing structure berbeda.

---

## Ringkasan

Dokumen ini menjelaskan sistem kredit Makalah AI untuk fitur "Bayar Per Paper" (BPP) menggunakan **Gemini 2.5 Flash** sebagai primary AI provider. Sistem ini mengabstraksi konsep teknis "tokens" menjadi "kredit" yang lebih mudah dipahami pengguna awam.

---

## Konsep Dasar

### Mengapa "Kredit" Bukan "Tokens"?

**Tokens** adalah unit teknis yang digunakan model AI untuk memproses teks. Istilah ini asing bagi pengguna awam dan sulit dikomunikasikan.

**Kredit** adalah abstraksi yang lebih familiar:
- Mirip konsep pulsa telepon
- Mirip saldo e-wallet
- Mirip kredit game

Dengan menggunakan "kredit", pengguna lebih mudah memahami:
- Berapa resource yang mereka miliki
- Berapa yang sudah terpakai
- Kapan perlu isi ulang

### Konversi

| Unit | Nilai |
|------|-------|
| 1 kredit | 1.000 tokens |
| 1 paper | 300 kredit |
| 300 kredit | 300.000 tokens |

---

## Spesifikasi Paper

### Target Output

| Aspek | Spesifikasi |
|-------|-------------|
| Panjang maksimal | 15 halaman A4 |
| Spasi | 1 (single space) |
| Font | 12pt |
| Estimasi kata | 7.500 - 9.000 kata |

### Workflow

Paper disusun melalui 13 tahap:

1. Gagasan
2. Topik
3. Outline
4. Abstrak
5. Pendahuluan
6. Tinjauan Literatur
7. Metodologi
8. Hasil
9. Diskusi
10. Kesimpulan
11. Daftar Pustaka
12. Lampiran
13. Judul

---

## Kalkulasi Token

### Estimasi Token per Paper

#### Output Tokens (Artifact + Chat)

| Komponen | Estimasi |
|----------|----------|
| Artifact content (13 stages) | ~11.300 tokens |
| Chat responses (dialog, penjelasan) | ~15.600 tokens |
| Tool calls (JSON structured) | ~2.000 tokens |
| Revisi (average 20% rework) | ~5.850 tokens |
| **Total Output** | **~35.000 tokens** |

#### Total Tokens (Input + Output)

| Skenario | Input | Output | Total |
|----------|-------|--------|-------|
| Normal (60:40) | 180.000 | 120.000 | 300.000 |
| Heavy revision (50:50) | 150.000 | 150.000 | 300.000 |
| Max output (40:60) | 120.000 | 180.000 | 300.000 |

### Soft Cap

**Soft cap: 300.000 tokens (300 kredit) per paper**

Nilai ini dipilih karena:
- Cukup untuk normal usage dengan margin aman
- Mengakomodasi revisi berat
- Fair untuk pengguna

---

## Pricing Structure

### Paket Utama

| Paket | Kredit | Harga | Rate/kredit | Use Case |
|-------|--------|-------|-------------|----------|
| **Paper** | 300 | Rp 80.000 | Rp 267 | Mulai paper baru |

### Paket Extension

| Paket | Kredit | Harga | Rate/kredit | Use Case |
|-------|--------|-------|-------------|----------|
| **Extension S** | 50 | Rp 25.000 | Rp 500 | Revisi ringan |
| **Extension M** | 100 | Rp 50.000 | Rp 500 | Revisi berat |

### Catatan Pricing

- Paket Paper memiliki rate terbaik (Rp 267/kredit)
- Paket Extension memiliki premium ~87% (Rp 500/kredit)
- Premium mendorong pengguna membeli paket Paper dari awal
- Extension sebagai "convenience fee" untuk fleksibilitas

---

## Cost Structure (Internal)

### Model: Gemini 2.5 Flash (Primary Provider)

> Model ID: `google/gemini-2.5-flash`
> Provider: Vercel AI Gateway
>
> **Catatan:** Model ID aktual dikonfigurasi via Admin Panel dan disimpan di database `aiProviderConfigs`. Cek Admin Panel untuk nilai terkini.

| Tipe Token | Rate USD | Rate IDR (1 USD = Rp 16.000) |
|------------|----------|------------------------------|
| Input | $0.30/1M | Rp 4,80/1K tokens |
| Output | $2.50/1M | Rp 40,00/1K tokens |

> **Sumber:** [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) (Januari 2026)

### Cost per Paket

| Paket | Kredit | Tokens | Input (50%) | Output (50%) | Total Cost |
|-------|--------|--------|-------------|--------------|------------|
| Paper | 300 | 300.000 | Rp 720 | Rp 6.000 | Rp 6.720 |
| Extension S | 50 | 50.000 | Rp 120 | Rp 1.000 | Rp 1.120 |
| Extension M | 100 | 100.000 | Rp 240 | Rp 2.000 | Rp 2.240 |

*Worst case = 50:50 input:output ratio*

### Margin Analysis

| Paket | Revenue | Cost | Gross Margin |
|-------|---------|------|--------------|
| Paper | Rp 80.000 | Rp 6.720 | **91,6%** |
| Extension S | Rp 25.000 | Rp 1.120 | **95,5%** |
| Extension M | Rp 50.000 | Rp 2.240 | **95,5%** |

> **Catatan:** Margin tetap sangat sehat (>90%). Output tokens jauh lebih mahal dari input, sehingga skenario dengan banyak output akan meningkatkan cost.

---

## User Flow

### Happy Path

```
User beli Paket Paper (300 kredit = Rp 80.000)
                    │
                    ▼
User mulai menyusun paper (13 tahap)
    • Kredit berkurang seiring usage
    • UI: "Sisa kredit: 245 / 300"
                    │
                    ▼
Paper selesai dengan kredit tersisa ✓
    • Sisa kredit TETAP TERSIMPAN (rollover)
    • Bisa dipakai untuk paper berikutnya
    • User puas, dapat paper lengkap
```

### Soft Block Path

```
User beli Paket Paper (300 kredit = Rp 80.000)
                    │
                    ▼
User menyusun paper dengan banyak revisi
                    │
                    ▼
Kredit habis di tengah proses (misal stage 10)
                    │
                    ▼
SOFT BLOCK
    • UI: "Kredit habis. Tambah kredit untuk melanjutkan."
    • Tawarkan: Extension S (50kr/Rp 25rb) atau M (100kr/Rp 50rb)
                    │
                    ▼
User topup extension
                    │
                    ▼
Lanjut paper → Selesai ✓
```

---

## Implementasi Teknis

### Database Fields

```typescript
// Tabel: paperSessions
{
  creditAllotted: number,    // Kredit yang dialokasikan (300 untuk Paper)
  creditUsed: number,        // Kredit yang sudah terpakai
  creditRemaining: number,   // Sisa kredit (computed: allotted - used)
  isSoftBlocked: boolean,    // True jika kredit habis
}

// Tabel: creditPurchases
{
  userId: Id<"users">,
  sessionId: Id<"paperSessions">,
  packageType: "paper" | "extension_s" | "extension_m",
  creditAmount: number,      // 300, 50, atau 100
  priceIDR: number,          // 80000, 25000, atau 50000
  purchasedAt: number,
}
```

### Konversi Token ke Kredit

```typescript
// convex/billing/constants.ts
export const TOKENS_PER_CREDIT = 1000

export function tokensToCredits(tokens: number): number {
  return Math.ceil(tokens / TOKENS_PER_CREDIT)
}

export function creditsToTokens(credits: number): number {
  return credits * TOKENS_PER_CREDIT
}
```

### Deduct Credits setelah AI Response

```typescript
// Pseudocode
async function onAIResponseComplete(sessionId, tokensUsed) {
  const creditsUsed = tokensToCredits(tokensUsed)

  await updateSession(sessionId, {
    creditUsed: increment(creditsUsed),
    creditRemaining: decrement(creditsUsed),
  })

  const session = await getSession(sessionId)
  if (session.creditRemaining <= 0) {
    await updateSession(sessionId, { isSoftBlocked: true })
  }
}
```

---

## UI/UX Guidelines

### Terminologi

| Internal | User-Facing |
|----------|-------------|
| tokens | kredit |
| soft cap | batas kredit paper |
| soft block | kredit habis |
| topup | tambah kredit |
| extension | perpanjangan |

### Display Kredit

```
┌─────────────────────────────────────────┐
│ Kredit Paper                            │
│ ████████████░░░░░░░░ 245 / 300 kredit  │
│                                         │
│ Estimasi sisa: ~2-3 tahap lagi          │
└─────────────────────────────────────────┘
```

### Soft Block UI

```
┌─────────────────────────────────────────┐
│ ⚠️ Kredit Habis                         │
│                                         │
│ Paper Anda belum selesai dan kredit     │
│ sudah habis. Tambah kredit untuk        │
│ melanjutkan penyusunan.                 │
│                                         │
│ ┌─────────────┐  ┌─────────────┐       │
│ │ +50 kredit  │  │ +100 kredit │       │
│ │  Rp 25.000  │  │  Rp 50.000  │       │
│ └─────────────┘  └─────────────┘       │
│                                         │
│ [Tambah Kredit]                         │
└─────────────────────────────────────────┘
```

---

## Referensi

- Model pricing: [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- Paper workflow: `docs/paper-workflow/`
- Billing system: `docs/pricing/bayar-per-paper.md`

---

## Changelog

| Tanggal | Perubahan |
|---------|-----------|
| 2026-01-30 | Fix pricing: koreksi rate Gemini 2.5 Flash sesuai harga resmi Google ($0.30/$2.50 per 1M tokens) |
| 2025-01-30 | Initial version - sistem kredit BPP v2 |
