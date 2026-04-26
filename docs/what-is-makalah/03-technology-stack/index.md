# Kategori 03: Technology Stack

Dokumen ini merangkum seluruh ekosistem teknologi yang digunakan untuk membangun Makalah AI. Infrastruktur ini dipilih untuk mendukung performa tinggi, sinkronisasi *real-time*, dan orkestrasi AI yang kompleks.

## 🏗️ Core Application Stack

Blok teknologi utama yang menjalankan logika aplikasi dan antarmuka:
- **[Next.js (App Router)](./01-nextjs.md)**: Framework utama untuk React, Server Components, dan optimasi performa.
- **[Convex (Reactive Database)](./02-convex.md)**: Backend as a Service (BaaS) untuk sinkronisasi data *real-time*, *state management*, dan *cron jobs*.
- **[Better Auth](./03-better-auth.md)**: Solusi autentikasi modern yang terintegrasi dengan ekosistem Next.js.
- **[Tailwind CSS v4](./04-tailwindcss.md)**: Mesin styling utility-first untuk desain premium dan responsif.
- **[UI Ecosystem](./05-ui-ecosystem.md)**: Komponen berbasis Radix UI dan Shadcn/UI untuk konsistensi visual.

## 🧠 AI Infrastructure & Orchestration

Komponen yang bertanggung jawab atas kecerdasan buatan dan pengambilan data eksternal:
- **[AI SDK (Vercel)](./06-ai-sdk.md)**: Framework orkestrasi LLM, streaming UI, dan penanganan tools calling.
- **[AI Gateway](./07-ai-gateway.md)**: Lapisan manajemen request LLM untuk keamanan, logging, dan *cost control*.
- **[OpenRouter](./08-openrouter.md)**: Agregator model LLM (Claude, GPT, Gemini) untuk fleksibilitas provider.
- **[Tavily Search](./09-tavily.md)**: Mesin pencari web yang dioptimalkan khusus untuk LLM/Agent.
- **[Search Orchestration](./10-search-orchestration.md)**: Logika penggabungan pencarian akademik dan umum.
- **[File Extraction](./11-file-extraction.md)**: Mekanisme parsing konten dari file PDF/Dokumen yang di-upload user.

## 💰 Payments & Integrations

Layanan pihak ketiga untuk operasional bisnis dan keamanan:
- **[Xendit](./12-xendit.md)**: Gateway pembayaran untuk transaksi lokal (Virtual Account, E-Wallet, QRIS).
- **[Cloudflare Turnstile](./13-cloudflare-turnstile.md)**: Proteksi bot dan spam pada form publik tanpa friksi CAPTCHA tradisional.
- **[Resend](./14-resend.md)**: Infrastruktur pengiriman email transaksional dan notifikasi.
- **[Sentry](./15-sentry.md)**: Monitoring error dan performa aplikasi di sisi klien dan server.

---

## 📚 Referensi Teknis (Technical References)

Untuk detil implementasi mendalam mengenai infrastruktur AI, rujuk ke folder referensi berikut:
- 👉 **[AI Gateway Implementation](../references/ai-gateway/ai-gateway.md)**
- 👉 **[AI SDK Cookbooks & Providers](../references/aisdk/)**

---

## 🤖 Panduan untuk Model LLM (LLM Navigation)

Jika Anda bekerja dengan infrastruktur Makalah AI:
1. **Prioritaskan SDK**: Gunakan `06-ai-sdk.md` untuk memahami pola *streaming* dan *tool calling* yang digunakan di aplikasi ini.
2. **Cek Database Schema**: Selalu rujuk ke `02-convex.md` sebelum melakukan mutasi atau query data.
3. **Pahami Routing**: Gunakan `01-nextjs.md` untuk memahami arsitektur folder `src/app` dan penggunaan *Middleware*.
4. **Keamanan**: Rujuk `13-cloudflare-turnstile.md` dan `03-better-auth.md` saat menyentuh bagian sensitif seperti autentikasi atau form submission.

---
> [!NOTE]
> Seluruh stack ini dipilih dengan prinsip **"Minimum Code, Maximum Output"**, mengandalkan layanan *managed* yang *scalable* untuk memastikan tim bisa fokus pada produk AI, bukan infrastruktur.
