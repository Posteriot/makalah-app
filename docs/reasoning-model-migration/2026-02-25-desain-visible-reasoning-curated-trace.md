# Desain Implementasi Reasoning Migration

Tanggal: 25 Februari 2026  
Status: Draft Desain (siap lanjut ke implementation plan)  
Scope: Chat runtime pada worktree `feature/paper-prompt-compression`

---

## 1) Tujuan

1. Migrasi bertahap ke mode reasoning untuk `Gemini 2.5 Flash`.
2. Menampilkan "Apa yang dipikirkan model" di UI chat sebagai nilai transparansi dan marketing.
3. Menjaga keamanan prompt internal dengan prinsip:
   - **visible reasoning = curated trace**
   - **bukan raw chain-of-thought (CoT)**.

---

## 2) Prinsip Produk

1. Panel **"Apa yang dipikirkan model" default terbuka** saat AI sedang memproses respons.
2. Isi panel adalah **ringkasan proses terstruktur** (curated trace), bukan token pikiran mentah model.
3. Panel harus membantu user memahami progres kerja AI, bukan menampilkan isi internal prompt.
4. Pada mode paper workflow, trace harus konsisten dengan stage aktif dan aturan tools.

---

## 3) Non-Goal

1. Tidak membuka raw reasoning/thought token langsung ke user.
2. Tidak menampilkan instruksi system prompt, hidden rules, atau policy internal provider.
3. Tidak menambah MCP `Sequential Thinking` ke runtime chat utama pada fase ini.
4. Tidak mengganti provider default ke Gemini 3 di fase ini.

---

## 4) Desain UX

## 4.1 Panel Reasoning

1. Lokasi: area status processing di atas chat input (mengikuti pola loading/progress yang sudah ada).
2. Keadaan default: **expanded (terbuka)**.
3. User control:
   - tombol collapse/expand.
   - state preferensi user disimpan lokal (mis. localStorage) setelah interaksi pertama.
4. Saat AI selesai merespons, panel berubah ke status ringkas:
   - `Selesai`
   - dapat tetap dibuka untuk melihat jejak proses ringkas terakhir.

## 4.2 Konten Curated Trace

Format langkah (contoh):
1. `Memahami permintaan user`
2. `Cek konteks stage paper`
3. `Menentukan apakah perlu web search`
4. `Mengambil dan validasi sumber`
5. `Menyusun jawaban`
6. `Menyimpan output/tool action`

Setiap langkah punya:
1. status: `pending | running | done | skipped | error`
2. timestamp relatif
3. metadata aman (contoh: jumlah sumber valid, mode stage, jenis tool yang dipakai)

---

## 5) Desain Arsitektur

## 5.1 Layering

1. **Reasoning Engine (model/provider)**
   - reasoning/thinking aktif di backend dengan budget terkontrol.
2. **Reasoning Trace Mapper (server-side)**
   - mengubah event mentah runtime menjadi curated trace event.
   - melakukan sanitasi sebelum dikirim ke client stream.
3. **UI Trace Renderer (client-side)**
   - merender event stream menjadi timeline panel.

## 5.2 Data Contract Event (Server -> Client)

Gunakan event data stream baru, contoh: `data-reasoning-trace`.

Payload minimal:
1. `id: string`
2. `stepKey: string`
3. `label: string`
4. `status: "pending" | "running" | "done" | "skipped" | "error"`
5. `progress?: number` (0-100)
6. `meta?: { sourceCount?: number; toolName?: string; stage?: string; note?: string }`
7. `ts: number`

## 5.3 Sanitasi Wajib

Sebelum event dikirim ke UI:
1. hapus raw thought text dari provider.
2. hapus potensi kebocoran prompt internal/tool credentials.
3. whitelist field `meta`.
4. enforce panjang maksimum per event.

---

## 6) Desain Konfigurasi Reasoning

Tambahan konfigurasi (admin-level):
1. `reasoningEnabled` (boolean)
2. `thinkingBudgetPrimary` (number, opsional)
3. `thinkingBudgetFallback` (number, opsional)
4. `reasoningTraceMode` = `off | curated` (default: `curated`)

Default rekomendasi awal:
1. `reasoningEnabled = true`
2. `thinkingBudgetPrimary = rendah-menengah` (aman untuk tool calling)
3. `reasoningTraceMode = curated`

---

## 7) Integrasi dengan Workflow Paper

1. Trace harus aware terhadap `paperModePrompt` dan stage aktif.
2. Untuk stage yang butuh referensi:
   - tampilkan langkah validasi sumber sebagai step wajib.
3. Untuk turn yang memaksa tool tertentu (mis. submit validation):
   - tampilkan alasan decision dalam bentuk curated note, bukan isi deliberasi model.

---

## 8) Risiko dan Mitigasi

1. Risiko: user salah paham menganggap trace = "kebenaran mutlak".  
   Mitigasi: labelkan sebagai "ringkasan proses", bukan "pikiran mentah".

2. Risiko: kebocoran internal reasoning/prompt.  
   Mitigasi: sanitasi whitelist + no raw CoT policy.

3. Risiko: biaya token/latency naik.  
   Mitigasi: thinking budget bertahap + monitor telemetry per mode.

4. Risiko: UI jadi noisy.  
   Mitigasi: batasi jumlah step aktif, gabungkan step minor.

---

## 9) Acceptance Criteria Desain

Desain dianggap siap lanjut implementation plan jika:
1. Panel reasoning default terbuka dan bisa collapse.
2. Tidak ada raw CoT yang tampil ke user.
3. Curated trace mencakup minimal 5 step inti runtime.
4. Kontrak event streaming terdefinisi jelas.
5. Guardrail keamanan dan biaya reasoning tercantum.

---

## 10) Keputusan Desain

1. Mengadopsi **visible reasoning berbasis curated trace**.
2. Menolak raw chain-of-thought untuk user-facing UI.
3. Menjadikan reasoning migration sebagai evolusi dari pipeline tool-calling saat ini, bukan rewrite total.
