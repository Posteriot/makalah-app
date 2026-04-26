# OpenRouter: Fallback Provider & Agnostic Web Search

Makalah AI menggunakan **OpenRouter** sebagai *Fallback Provider* utama. Arsitektur ini memastikan aplikasi tetap berjalan meskipun *primary provider* (Vercel AI Gateway) mengalami kegagalan, sekaligus memberikan akses ke ekosistem model LLM yang lebih luas.

## 1. Mekanisme Failover Dinamis

Dalam modul `src/lib/ai/streaming.ts`, OpenRouter dikonfigurasi menggunakan library `@openrouter/ai-sdk-provider`. Pilihan model dan API Key dikelola sepenuhnya melalui *database* Makalah AI, bukan *hardcoded*.

- **Dynamic Routing**: Jika pemanggilan ke *primary model* gagal, sistem akan menangkap error tersebut dan secara otomatis mengalihkan permintaan ke OpenRouter menggunakan model yang dikonfigurasi di Admin Panel.
- **Provider Parity**: OpenRouter dipilih karena dukungannya terhadap berbagai arsitektur model (OpenAI, Anthropic, Meta, dll.) dengan antarmuka yang seragam, memudahkan transisi *failover* tanpa perlu menulis ulang logika pengiriman pesan.

## 2. Agnostic Web Search (`:online`)

Fitur paling unik dari integrasi OpenRouter di Makalah AI adalah pemanfaatan *suffix* `:online` untuk memberikan kapabilitas penelusuran web pada model apa pun secara otomatis.

- **Model-Agnostic**: Berbeda dengan Google Grounding yang spesifik Gemini, `:online` di OpenRouter dapat ditambahkan ke model mana pun (contoh: `openai/gpt-4o:online`).
- **Logika Implementasi**: Di dalam fungsi `getOpenRouterModel`, sistem mengecek apakah `enableWebSearch` bernilai true. Jika ya, sistem menyuntikkan *suffix* tersebut ke ID model sebelum diinisialisasi.
- **Reliabilitas**: Ini berfungsi sebagai jalur penelusuran cadangan jika *Google Search Grounding* tidak tersedia atau tidak diinginkan untuk turn tertentu.

## 3. Penanganan Bug Reasoning Model

Makalah AI menggunakan `@openrouter/ai-sdk-provider` secara spesifik untuk menghindari masalah teknis yang ada pada provider `@ai-sdk/openai` standar terkait deteksi model.

- **Masalah**: Library OpenAI standar sering kali salah mendeteksi model dengan prefix (seperti `openai/gpt-4o`) sebagai *reasoning model*, yang dapat memicu perilaku internal SDK yang tidak diinginkan.
- **Solusi**: Provider OpenRouter menangani ID model secara lebih bersih dan menggunakan metode `.chat(model)` secara eksplisit untuk memastikan model diperlakukan sebagai model chat standar kecuali ditentukan lain.

## 4. Konfigurasi Kunci & Keamanan

Sesuai dengan prinsip *Single Source of Truth* di Makalah AI:
- **Priority**: Sistem memprioritaskan kunci API yang ada di database (`config.openrouterApiKey`). 
- **Fallback**: Jika tidak ada di database, sistem akan mengambil dari *environment variable* `OPENROUTER_API_KEY`.
- **Validation**: Seluruh permintaan divalidasi untuk memastikan kunci tersedia sebelum inisialisasi model dilakukan (`createProviderModel`).

---
**Rujukan Kode:**
- [src/lib/ai/streaming.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/streaming.ts): Implementasi `getOpenRouterModel` dan logika `:online` suffix.
- [convex/schema.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/schema.ts): Definisi tabel `aiProviderConfigs` untuk manajemen model fallback.
