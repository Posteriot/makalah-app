# Sentry: Observability & Error Monitoring

Makalah AI menggunakan **Sentry** sebagai infrastruktur utama untuk memantau kesehatan aplikasi secara *real-time*. Sentry membantu tim pengembang mendeteksi, mendiagnosis, dan memperbaiki masalah mulai dari kegagalan API hingga *crash* pada *browser* pengguna.

## 1. Integrasi Sentry SDK

Aplikasi ini menggunakan `@sentry/nextjs` yang terintegrasi secara mendalam dengan fitur-fitur Next.js (App Router, Server Actions, API Routes).

- **Global Error Handling**: File `src/app/global-error.tsx` menangkap seluruh *uncaught exceptions* pada level aplikasi dan mengirimkannya ke Sentry secara otomatis.
- **Client-Side Monitoring**: Sentry menangkap error pada UI komponen, seperti kegagalan render atau masalah pada *event handlers*.

## 2. Pemantauan Pipeline AI & Web Search

Karena pipeline AI bersifat stokastik dan kompleks, Sentry digunakan untuk memantau kegagalan pada setiap tahap orkestrasi.

- **AI Route Protection**: Di `src/app/api/chat/route.ts`, setiap kegagalan model (timeout, limit, atau API error) ditangkap menggunakan `Sentry.captureException`.
- **Metadata Context**: Saat terjadi error, sistem menyertakan metadata tambahan seperti ID percakapan atau nama *retriever* yang gagal, memudahkan proses *debugging*.

## 3. Validasi & Integritas Pembayaran

Pada sistem pembayaran yang sensitif, Sentry berperan sebagai penjaga integritas data.

- **Webhook Failures**: Jika terjadi kegagalan saat memproses webhook Xendit (misalnya database tidak merespons), Sentry akan mengirimkan notifikasi instan.
- **Critical Alerts**: Pesan fatal dikirim menggunakan `Sentry.captureMessage` jika konfigurasi kunci keamanan (`CONVEX_INTERNAL_KEY`) tidak ditemukan, yang dapat melumpuhkan seluruh sistem pembayaran.

## 4. Korelasi Identitas Pengguna (User Context)

Untuk mempercepat investigasi error yang spesifik terjadi pada pengguna tertentu, Makalah AI melakukan sinkronisasi identitas di komponen `ChatWindow.tsx`.

- **`Sentry.setUser()`**: Saat pengguna masuk (login), ID unik pengguna dari Convex akan diset ke dalam *scope* Sentry.
- **Privacy First**: Hanya ID pengguna yang dikirim, memastikan privasi data sensitif tetap terjaga sambil memberikan konteks yang cukup untuk reproduksi error.

## 5. Deteksi Error Otomatis (Technical Report)

Aplikasi memiliki fitur deteksi dini untuk masalah UX yang disebabkan oleh kendala teknis.

- **Warning Alerts**: Jika sistem mendeteksi pola kegagalan berulang pada *chat* (misalnya stream terputus berkali-kali), sistem memicu `Sentry.captureMessage("Chat error auto-detected")` sebagai peringatan *low-severity* sebelum menjadi masalah besar bagi pengguna.

---
**Rujukan Kode:**
- [src/app/global-error.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/app/global-error.tsx): Penanganan error global.
- [src/app/api/chat/route.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/app/api/chat/route.ts): Logging pada pipeline AI.
- [src/components/chat/ChatWindow.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ChatWindow.tsx): Manajemen konteks user dan deteksi error UI.
