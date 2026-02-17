# Task Checklist — Get-Started Gate User Gratis (Per Login)

## Status Proyek
- Branch kerja: `feature/free-login-gate-get-started`
- Scope: routing auth + gate `/get-started` + hardening onboarding route
- Model progres: checklist per phase, wajib isi bukti setiap task selesai

## Cara Pakai Dokumen Ini
1. Kerjakan task sesuai urutan phase.
2. Jangan centang task tanpa bukti.
3. Isi kolom bukti singkat (command output/ringkasan uji).
4. Jika task gagal, tulis blocker dan next action.

## Phase 0 — Baseline & Persiapan
- [x] T0.1 Petakan flow login existing (email, google, OTP) sampai landing route.
Bukti:
- Default callback auth saat ini mengarah ke `/get-started`:
  - `sign-in`: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:70`
  - `sign-up`: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:108`
  - `verify-2fa`: `src/app/(auth)/verify-2fa/page.tsx:28`
- Protected route tanpa session diarahkan ke `/sign-in?redirect_url=...`: `src/proxy.ts:42-46`
- `redirect_url` divalidasi lewat allowlist: `src/lib/utils/redirectAfterAuth.ts:9-16` dan fallback ke default saat path tidak valid `src/lib/utils/redirectAfterAuth.ts:58`
- Pricing CTA untuk signed-out user menyuntikkan `redirect_url` dari `ctaHref`: `src/components/marketing/pricing/PricingCard.tsx:34-37`

- [x] T0.2 Catat perilaku existing untuk user free vs non-free.
Bukti:
- Eligibility saat ini tidak berdasarkan `subscriptionStatus`; masih berbasis onboarding flag:
  - hook status: `src/lib/hooks/useOnboardingStatus.ts:17-29`
  - backend query/mutation: `convex/users.ts:150-170`, `convex/users.ts:175-195`
  - schema flag: `convex/schema.ts:65`
- Di `/get-started`, user dengan `hasCompletedOnboarding=true` langsung ke home: `src/app/(onboarding)/get-started/page.tsx:65-69`
- `/get-started` punya auth timeout 8 detik yang bisa redirect ke `/sign-in`: `src/app/(onboarding)/get-started/page.tsx:11`, `src/app/(onboarding)/get-started/page.tsx:58-63`
- Checkout route menandai onboarding selesai otomatis (bisa bypass welcome intent):
  - BPP: `src/app/(onboarding)/checkout/bpp/page.tsx:132-137`
  - PRO: `src/app/(onboarding)/checkout/pro/page.tsx:21-27`
- Hero CTA juga masih berbasis onboarding flag (bukan tier): `src/components/marketing/hero/HeroCTA.tsx:18-30`

- [x] T0.3 Tetapkan matrix skenario uji final (minimal 10 skenario).
Bukti:
- Matrix final ditetapkan di section `Matrix Uji Manual (Wajib Diisi)` dengan 10 skenario `M1` s.d. `M10`.
- Baseline pre-implementasi untuk matrix:
  - M1-M3: default callback auth ke `/get-started` (lihat bukti T0.1), lalu outcome tergantung `hasCompletedOnboarding`.
  - M4: setelah lewat `/get-started` dan `completeOnboarding`, user tidak dipaksa balik per menu karena tidak ada gate per-login global saat ini.
  - M5: login ulang user yang sudah complete onboarding cenderung tidak melihat `/get-started` lagi (`hasCompletedOnboarding` persist).
  - M6: non-free belum dipisah eksplisit; behavior tetap bergantung onboarding flag.
  - M7-M8: intent checkout bisa langsung lolos karena `/checkout/bpp` dan `/checkout/pro` ada di allowlist (`src/lib/utils/redirectAfterAuth.ts:11-12`).
  - M9: protected route inject `redirect_url` dari proxy (`src/proxy.ts:44-45`).
  - M10: tidak ada loop eksplisit yang deterministic di kode saat ini, tapi ada risiko false-redirect dari timeout auth di `/get-started`.

## Phase 1 — Implementasi Gate Inti
- [x] T1.1 Buat helper util untuk marker sesi login (fingerprint + read/write marker).
File target: `src/lib/utils/freeLoginGate.ts`
Bukti:
- File baru dibuat: `src/lib/utils/freeLoginGate.ts`
- Helper tersedia:
  - `getFreeLoginSessionFingerprint()`
  - `hasSeenFreeLoginGateForSession()`
  - `markFreeLoginGateSeenForSession()`
  - `clearFreeLoginGateSessionMarker()`
  - `isFreeTierForLoginGate()`

- [x] T1.2 Buat komponen gate global untuk redirect user free ke `/get-started` 1x/sesi.
File target: `src/components/onboarding/FreeLoginGate.tsx`
Bukti:
- File baru dibuat: `src/components/onboarding/FreeLoginGate.tsx`
- Logic utama:
  - clear marker saat session hilang (logout),
  - cek tier gratis via `isFreeTierForLoginGate`,
  - redirect `router.replace(\"/get-started\")` jika belum pernah tampil di sesi login,
  - mark as seen saat berada di `/get-started`.

- [x] T1.3 Pasang gate di provider global.
File target: `src/app/providers.tsx`
Bukti:
- Import + mount `FreeLoginGate` ditambahkan di dalam `ConvexBetterAuthProvider` pada `src/app/providers.tsx`.

- [x] T1.4 Tambahkan guard anti-loop pada route `/get-started`.
Bukti:
- Guard anti-loop ditambahkan di gate:
  - jika `pathname === \"/get-started\"`, gate hanya menandai marker sesi lalu return (tanpa redirect ulang).
- Guard route ditambah di halaman:
  - `src/app/(onboarding)/get-started/page.tsx` sekarang hanya untuk free-tier; non-free diarahkan ke `/chat`.
- Verifikasi lint target file Phase 1: pass
  - command: `npm run lint -- src/app/providers.tsx src/components/onboarding/FreeLoginGate.tsx src/lib/utils/freeLoginGate.ts 'src/app/(onboarding)/get-started/page.tsx'`

## Phase 2 — Perbaikan Redirect Auth & Route Safety
- [x] T2.1 Ubah default callback auth ke route netral (`/chat`).
File target:
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- `src/app/(auth)/verify-2fa/page.tsx`
Bukti:
- Updated callback default:
  - `sign-in` -> `getRedirectUrl(searchParams, "/chat")`
  - `sign-up` -> `getRedirectUrl(searchParams, "/chat")`
  - `verify-2fa` -> `getRedirectUrl(searchParams, "/chat")`

- [x] T2.2 Sinkronkan whitelist redirect path dengan route aktif aktual.
File target: `src/lib/utils/redirectAfterAuth.ts`
Bukti:
- Allowlist/prefix disinkronkan dan ditambah `"/subscription"` agar intent route subscription valid tidak jatuh ke fallback.
- Matching diubah dari `startsWith` mentah ke boundary-safe:
  - exact match (`pathname === prefix`) atau subpath (`pathname.startsWith(prefix + "/")`).
- Normalisasi path ditambah:
  - tolak non-relative path (`//...`),
  - parse via `URL(..., "http://localhost")`,
  - tangani `decodeURIComponent` malformed dengan safe fallback `null`.

- [x] T2.3 Verifikasi tidak ada open redirect dan intent valid tidak jatuh ke fallback salah.
Bukti:
- Guard open redirect:
  - hanya menerima relative path yang dimulai `/` dan bukan `//`,
  - URL external tidak lolos normalisasi/allowlist.
- Guard intent valid:
  - route subscription sekarang lolos karena prefix `"/subscription"`.
- Validasi lint file Phase 2: pass (tanpa error)
  - command: `npm run lint -- src/lib/utils/redirectAfterAuth.ts 'src/app/(auth)/sign-in/[[...sign-in]]/page.tsx' 'src/app/(auth)/sign-up/[[...sign-up]]/page.tsx' 'src/app/(auth)/verify-2fa/page.tsx'`
  - catatan: ada 2 warning existing non-scope di `verify-2fa/page.tsx`.

## Phase 3 — Hardening `/get-started` + Checkout
- [x] T3.1 Refactor timeout/redirect di `/get-started` agar tidak false-redirect.
File target: `src/app/(onboarding)/get-started/page.tsx`
Bukti:
- Removed hard auth-timeout redirect path dari `/get-started` (tidak ada lagi `AUTH_TIMEOUT_MS` + `router.replace("/sign-in")` saat timeout semu).
- Feedback loading tetap dipertahankan via delay timer `FEEDBACK_DELAY_MS` tanpa pemaksaan redirect.

- [x] T3.2 Refactor CTA action di `/get-started` menjadi fail-safe (mutasi error tidak deadlock UI).
File target: `src/app/(onboarding)/get-started/page.tsx`
Bukti:
- Ditambah helper `completeThenNavigate(targetPath)`:
  - tetap `router.push(targetPath)` di `finally`,
  - mutasi `completeOnboarding()` dibungkus `try/catch` + `console.error`.
- Ditambah guard `isNavigating` untuk mencegah klik ganda saat transisi.
- Tombol `Skip` dan `Beli Kredit` dibuat `disabled` saat `isNavigating`.

- [x] T3.3 Tambahkan error handling untuk auto-complete onboarding di checkout BPP.
File target: `src/app/(onboarding)/checkout/bpp/page.tsx`
Bukti:
- `completeOnboarding()` di effect checkout BPP diubah menjadi:
  - `void completeOnboarding().catch(...)`
  - logging error: `"[CheckoutBPP] completeOnboarding failed:"`

- [x] T3.4 Tambahkan error handling untuk auto-complete onboarding di checkout PRO.
File target: `src/app/(onboarding)/checkout/pro/page.tsx`
Bukti:
- `completeOnboarding()` di effect checkout PRO diubah menjadi:
  - `void completeOnboarding().catch(...)`
  - logging error: `"[CheckoutPRO] completeOnboarding failed:"`

- Verifikasi lint target file Phase 3: pass
  - command: `npm run lint -- 'src/app/(onboarding)/get-started/page.tsx' 'src/app/(onboarding)/checkout/bpp/page.tsx' 'src/app/(onboarding)/checkout/pro/page.tsx'`

## Phase 4 — Validasi Teknis
- [x] T4.1 Jalankan lint untuk memastikan tidak ada error baru dari scope perubahan.
Command: `npm run lint`
Bukti:
- Eksekusi: `npm run lint` (global)
- Hasil: **gagal** karena existing non-scope errors di file lain (contoh: `convex/migrations/enableTwoFactorAllUsers.ts`, `convex/twoFactorHttp.ts`, `src/app/(dashboard)/subscription/overview/page.tsx`, `src/app/api/webhooks/xendit/route.ts`).
- Validasi scope perubahan tetap aman:
  - Phase 1 lint scope pass: `npm run lint -- src/app/providers.tsx src/components/onboarding/FreeLoginGate.tsx src/lib/utils/freeLoginGate.ts 'src/app/(onboarding)/get-started/page.tsx'`
  - Phase 2 lint scope pass (dengan warning existing non-scope di verify-2fa): `npm run lint -- src/lib/utils/redirectAfterAuth.ts 'src/app/(auth)/sign-in/[[...sign-in]]/page.tsx' 'src/app/(auth)/sign-up/[[...sign-up]]/page.tsx' 'src/app/(auth)/verify-2fa/page.tsx'`
  - Phase 3 lint scope pass: `npm run lint -- 'src/app/(onboarding)/get-started/page.tsx' 'src/app/(onboarding)/checkout/bpp/page.tsx' 'src/app/(onboarding)/checkout/pro/page.tsx'`

- [x] T4.2 Jalankan test terkait auth/routing jika tersedia.
Command: `npm run test`
Bukti:
- Eksekusi: `npm run test`
- Hasil: pass, `2` test files, `36` tests passed.

- [ ] T4.3 Validasi manual matrix skenario (isi semua hasil pass/fail + catatan).
Bukti:
- Status: belum bisa dituntaskan penuh di environment ini karena butuh login real untuk akun free/non-free (email/google/2FA) dan verifikasi behavior runtime end-to-end.
- Yang sudah divalidasi saat ini:
  - code-path inspection untuk rule gate (`src/components/onboarding/FreeLoginGate.tsx`),
  - callback auth default (`/chat`) dan redirect sanitizer/allowlist (`src/lib/utils/redirectAfterAuth.ts`),
  - hardening `/get-started` + checkout onboarding completion error handling.

## Matrix Uji Manual (Wajib Diisi)
- [ ] M1 User free login email dari `/sign-in` => wajib masuk `/get-started` 1x.
Hasil: Post-implementasi (code-path): expected pass. Callback default auth ke `/chat`, lalu `FreeLoginGate` redirect free-tier ke `/get-started` sekali per sesi. Butuh verifikasi login real.

- [ ] M2 User free login google dari `/sign-in` => wajib masuk `/get-started` 1x.
Hasil: Post-implementasi (code-path): expected pass dengan mekanisme gate yang sama. Butuh verifikasi login Google real.

- [ ] M3 User free login 2FA => wajib masuk `/get-started` 1x.
Hasil: Post-implementasi (code-path): expected pass. Callback 2FA default ke `/chat`, lalu gate free-tier aktif. Butuh verifikasi 2FA real.

- [ ] M4 User free setelah lewat `/get-started` pindah menu `/chat` => tidak dipaksa balik.
Hasil: Post-implementasi (code-path): expected pass. Marker sesi diset saat di `/get-started`, sehingga tidak redirect ulang pada sesi yang sama.

- [ ] M5 User free logout lalu login lagi => `/get-started` muncul lagi.
Hasil: Post-implementasi (code-path): expected pass. Marker gate dibersihkan saat session null (logout), login baru akan trigger gate lagi.

- [ ] M6 User non-free login => tidak diarahkan ke `/get-started`.
Hasil: Post-implementasi (code-path): expected pass. Gate hanya aktif untuk `getEffectiveTier(...) === "gratis"`.

- [ ] M7 User free login dengan intent `/checkout/bpp` => tetap lihat `/get-started` dulu.
Hasil: Post-implementasi (code-path): expected pass. Intent boleh lolos sanitizer, tapi gate global tetap override sekali ke `/get-started`.

- [ ] M8 User free login dengan intent `/checkout/pro` => tetap lihat `/get-started` dulu.
Hasil: Post-implementasi (code-path): expected pass dengan alasan yang sama seperti M7.

- [ ] M9 User free akses protected route tanpa login => kembali ke auth, lalu gate berjalan normal setelah login.
Hasil: Post-implementasi (code-path): expected pass. Proxy tetap inject `redirect_url`, callback auth resolve, lalu gate free-tier aktif.

- [ ] M10 Tidak ada loop redirect pada `/get-started`.
Hasil: Post-implementasi (code-path): expected pass. Anti-loop guard ada di `FreeLoginGate` untuk path `/get-started`, dan timeout redirect palsu dari `/get-started` sudah dihapus.

## Guardrails Eksekusi
- [ ] G1 Jangan ubah behavior user non-free selain perbaikan redirect default.
- [ ] G2 Jangan pakai flag onboarding permanen sebagai trigger gate per login.
- [ ] G3 Semua redirect wajib lewat path validasi aman.
- [ ] G4 Jangan merge jika matrix manual belum lengkap.

## Catatan Blocker
- Blocker 1: Validasi manual end-to-end M1-M10 belum bisa dituntaskan penuh tanpa akun uji real (free/non-free, Google OAuth, 2FA OTP).
- Dampak: T4.3 masih pending.
- Rencana solusi: Jalankan smoke manual dengan akun staging/dev (1 akun free + 1 akun non-free + jalur OTP/Google), lalu update status pass/fail per matrix.

## Ringkasan Selesai Implementasi
- Commit hash:
- Ringkasan perubahan:
- Risiko sisa:
- Keputusan siap PR: Ya / Tidak
