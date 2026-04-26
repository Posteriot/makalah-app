# BetterAuth: Sistem Autentikasi Modern

Makalah AI mengimplementasikan **BetterAuth** (via `@convex-dev/better-auth`) sebagai solusi autentikasi terpusat. Arsitektur ini dirancang untuk mendukung sesi lintas domain dan integrasi mendalam dengan basis data Convex, memberikan keamanan tingkat tinggi tanpa mengorbankan pengalaman pengguna.

## Arsitektur Lintas Domain
Karena Makalah AI beroperasi di beberapa subdomain (`makalah.ai`, `dev.makalah.ai`) dan lingkungan lokal, sistem autentikasi dikonfigurasi dengan **Cross-Domain Plugin**:
- **Penyimpanan Sesi**: Sesi utama disimpan di *localStorage* melalui `crossDomainClient` untuk mendukung persistensi lintas domain.
- **ba_session (Cookie Bridge)**: Untuk mendukung *Server-Side Rendering* (SSR), aplikasi menggunakan komponen `SessionCookieSync` yang menyinkronkan token sesi dari *localStorage* ke *cookie* browser (`ba_session`). Hal ini memungkinkan Server Components di Next.js untuk memverifikasi identitas pengguna secara langsung melalui header HTTP.

## Fitur & Plugin Utama
1. **Google OAuth**: Integrasi utama untuk pendaftaran dan masuk cepat menggunakan akun Google.
2. **Magic Link**: Metode masuk tanpa kata sandi (*passwordless*) yang dikirimkan melalui email Resend untuk kemudahan akses.
3. **Two-Factor Authentication (2FA)**: Lapisan keamanan tambahan menggunakan OTP (*One-Time Password*) yang dikirimkan via email. Terdapat plugin khusus `twoFactorCrossDomainBypass` untuk optimasi alur kerja lintas domain.
4. **Convex Integration**: Sinkronisasi otomatis antara status autentikasi dan data model Convex melalui plugin `convex`, memastikan profil pengguna selalu akurat.

## Mekanisme Keamanan Lanjut
- **Trusted Origins**: Daftar domain yang diizinkan untuk melakukan autentikasi dikelola secara ketat dalam `convex/authOrigins.ts`, mencakup domain produksi, pengembangan, dan lingkungan lokal.
- **Cross-Tab Synchronization**: Melalui `CrossTabSessionSync`, aplikasi memantau perubahan pada *localStorage*. Jika pengguna keluar (*sign out*) di satu tab, seluruh tab aplikasi lainnya akan diarahkan kembali ke halaman login secara otomatis.
- **OTP Protection**: Sesi `ba_session` tidak akan dibuat selama proses verifikasi 2FA masih tertunda (`pending_2fa`), mencegah akses ke rute terlindungi sebelum kode OTP divalidasi.

---
**Rujukan Kode:**
- [convex/auth.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/auth.ts): Konfigurasi pusat server BetterAuth dan definisi plugin keamanan.
- [src/lib/auth-client.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/auth-client.ts): Inisialisasi klien autentikasi dan ekspor metode `signIn`/`signOut`.
- [src/app/providers.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/app/providers.tsx): Implementasi sinkronisasi sesi ke *cookie* dan manajemen keamanan lintas tab.
- [convex/authOrigins.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/authOrigins.ts): Definisi domain dan kebijakan CORS yang dipercaya.
