# Error States & System Guardrails

Dokumen ini menjelaskan bagaimana Makalah AI menangani kondisi kegagalan, batasan sistem, dan fitur untuk menjaga integritas sesi chat berdasarkan audit forensik codebase.

## 1. Manajemen Kuota (Quota Management)

Sistem memiliki pembatas penggunaan yang dikelola via [chat-quota-error.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/chat-quota-error.ts).

- **Quota Warning Banner**: Dikelola di [QuotaWarningBanner.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/QuotaWarningBanner.tsx). Muncul saat penggunaan mencapai 70% (Warning), 90% (Critical), atau 100% (Depleted).
- **Quota Error Handling**: Jika permintaan ditolak karena kuota habis, sistem menggunakan `resolveQuotaOffer` untuk menampilkan pesan instruksi dan tombol CTA (Beli Kredit/Upgrade) untuk melanjutkan proses.

---

## 2. Kegagalan Tool & Proses (Tool Failures)

Saat AI gagal mengeksekusi sebuah perintah teknis, sistem memberikan indikasi visual di dalam [UnifiedProcessCard.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/UnifiedProcessCard.tsx):

- **Warning Indicator**: Langkah yang gagal akan ditandai dengan ikon [WarningCircle](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ToolStateIndicator.tsx) berwarna merah (`destructive`).
- **Error Context**: Sistem menampilkan pesan "Galat pada [nama tool]" atau teks error spesifik jika tersedia dari backend.
- **Non-blocking Recovery**: Kegagalan pada langkah pendukung biasanya tidak menghentikan jawaban AI sepenuhnya.

---

## 3. Fitur Diagnostik (Technical Report)

Untuk membantu tim pengembang dalam mendebug masalah yang kompleks, tersedia fitur laporan teknis via [ChatTechnicalReportButton.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/technical-report/ChatTechnicalReportButton.tsx).

- **Snapshot Mechanism**: Sistem mengambil cuplikan status internal secara otomatis via [chatSnapshot.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/technical-report/chatSnapshot.ts). Snapshot mencakup: `chatStatus`, `errorMessage`, `model`, `searchStatus`, dan `toolStates`. 
- **Privacy Note**: Snapshot **tidak** menyertakan isi pesan percakapan utuh secara otomatis demi privasi, kecuali yang diinput User secara manual di form deskripsi.

---

## 4. Integritas Koneksi & Sesi

- **Auth Stuck Recovery**: Di dalam [ChatWindow.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ChatWindow.tsx), terdapat mekanisme *circuit breaker* yang mendeteksi jika autentikasi Convex tertahan (*stuck*) selama lebih dari 8 detik. Sistem akan **otomatis melakukan muat ulang (*reload*)** halaman untuk memulihkan koneksi.
- **Auto-Rescue Signal**: Logika penyelamatan stage transisi ilegal dikelola di [auto-rescue-policy.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/chat-harness/shared/auto-rescue-policy.ts), yang secara otonom memindahkan sesi ke mode `revision` jika tool dipanggil pada status yang salah.

---

**File Source Code Utama:**
- `src/components/chat/QuotaWarningBanner.tsx`: UI peringatan batasan penggunaan/kuota.
- `src/components/chat/chat-quota-error.ts`: Logika deteksi dan penanganan error kuota.
- `src/components/technical-report/ChatTechnicalReportButton.tsx`: Trigger laporan diagnostik sistem.
- `src/lib/chat-harness/shared/auto-rescue-policy.ts`: Kebijakan penyelamatan otonom untuk kegagalan transisi stage.
- `src/lib/technical-report/chatSnapshot.ts`: Mesin ekstraksi snapshot diagnostik chat.
