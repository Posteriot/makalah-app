# Auth Fullpage Redesign - Implementation Doc

Tanggal: 26 Februari 2026  
Status: Rencana Implementasi  
Dependensi utama: `auth-fullpage-redesign-design-doc.md`

## 1. Tujuan Implementasi

1. Implement fullpage auth tanpa card.
2. Migrasi styling auth ke cluster baru di `src/app/globals-new.css`.
3. Menjaga parity flow auth lama (functional parity).
4. Menutup migrasi dengan cleanup token auth legacy di `src/app/globals.css`.

## 2. Scope File

## 2.1 Wajib diubah

1. `src/app/globals-new.css`
2. `src/app/(auth)/layout.tsx`
3. `src/components/auth/AuthWideCard.tsx` (refactor besar atau ganti peran)
4. `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
5. `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
6. `src/app/(auth)/verify-2fa/page.tsx`
7. `src/app/(auth)/waitinglist/page.tsx`
8. `src/components/auth/WaitlistForm.tsx`
9. `src/components/auth/TurnstileWidget.tsx` (theme & container parity)

## 2.2 Potensial ikut disesuaikan

1. `src/components/ui/input.tsx` (jika perlu variant auth khusus)
2. `src/components/ui/section-cta.tsx` (jika class utility auth dipusatkan)

## 3. Fase Implementasi

## Fase 0 - Baseline & Guardrail

1. Catat baseline screenshot:
   - `/sign-in`
   - `/sign-up`
   - `/verify-2fa`
   - `/waitinglist`
2. Catat baseline behavior:
   - waitlist mode on/off
   - dark mode default untuk unauthenticated
   - mode switch sign-in (magic/forgot/reset).

Output: baseline visual + checklist behavior sebelum refactor.

## Fase 1 - Tambah Cluster Auth di `globals-new.css`

1. Tambah scope `[data-auth-scope]` untuk light mode.
2. Tambah scope `.dark [data-auth-scope]` untuk dark mode.
3. Definisikan token `--auth-*` (surface, border, ring, feedback, spacing, radius).
4. Tambah utility class auth berbasis token (shell, section, input, cta, feedback).

Rule:

1. Jangan pindahkan token lama dari `globals.css` di fase ini.
2. Jangan ubah chat scope yang sudah ada.

Output: cluster auth siap dipakai tanpa memutus chat token.

## Fase 2 - Refactor Layout Auth Fullpage

1. `src/app/(auth)/layout.tsx`:
   - apply `data-auth-scope`.
   - ubah menjadi fullpage shell.
   - tambahkan top row area untuk tombol `<-- kembali` + utility control.
2. `src/components/auth/AuthWideCard.tsx`:
   - ubah peran dari `card shell` menjadi `auth split shell` tanpa card.
   - desktop split kiri/kanan tetap dipertahankan.
   - mobile stack tetap rapi.

Output: kerangka fullpage siap, belum final per mode.

## Fase 3 - Migrasi Semua Mode Auth ke Shell Baru

1. Sign-in page:
   - pindahkan semua class hardcoded yang relevan ke utility auth baru.
   - jaga parity flow waitlist mode.
2. Sign-up page:
   - samakan struktur input/feedback dengan pattern baru.
3. Verify 2FA page:
   - jaga UX OTP (auto focus/paste/backspace) tanpa regresi.
4. Waitinglist + WaitlistForm:
   - sinkronkan style ke utility auth baru.
5. Tombol `<-- kembali>`:
   - tampil konsisten di semua mode fullpage.

Output: seluruh route auth pakai styling cluster auth di `globals-new.css`.

## Fase 4 - Dark/Light & Responsive QA Fix

1. Uji manual breakpoint:
   - 375, 768, 1024, 1440.
2. Uji mode:
   - dark (unauthenticated default).
   - light (ketika theme diganti).
3. Uji kontras:
   - text normal, secondary text, error, success, focus ring.
4. Uji interaksi:
   - keyboard tab, enter submit, focus visible, disabled state.

Output: issue list ditutup sebelum cleanup token lama.

## Fase 5 - Cleanup `globals.css` Token Legacy Auth

1. Identifikasi utility/token auth lama yang sudah tidak dipakai.
2. Hapus yang spesifik auth dari `globals.css`.
3. Pastikan komponen non-auth tidak terdampak.
4. Jalankan final regression visual auth + halaman lain yang terkait.

Output: auth styling source of truth ada di `globals-new.css`.

## 4. Risk & Mitigasi

## Risiko 1: Light mode auth tidak konsisten

Mitigasi:

1. Semua auth class refer ke `--auth-*`, hindari hardcoded slate di page.
2. Validasi per mode pada setiap fase.

## Risiko 2: Waitlist mode regression

Mitigasi:

1. QA skenario waitlist on/off sebagai gate wajib.
2. Pastikan branch logic di sign-in tidak disentuh behavior-nya.

## Risiko 3: 2FA OTP UI rusak

Mitigasi:

1. Jangan ubah logic event OTP.
2. Refactor hanya struktur visual/class.

## Risiko 4: Cleanup `globals.css` mempengaruhi page lain

Mitigasi:

1. Cleanup di fase paling akhir.
2. Hapus token/utilitas setelah bukti tidak direferensikan.

## 5. QA Matrix Wajib

## 5.1 Route Matrix

1. `/sign-in`
2. `/sign-up`
3. `/verify-2fa`
4. `/waitinglist`
5. `/sign-in?token=...` (reset mode)

## 5.2 State Matrix

1. sign-in default
2. magic-link
3. forgot-password
4. reset-password
5. magic-link-sent
6. reset-sent
7. reset-success
8. 2FA otp
9. 2FA backup
10. waitinglist idle
11. waitinglist success

## 5.3 Viewport & Theme Matrix

1. Mobile dark/light
2. Tablet dark/light
3. Desktop dark/light

## 5.4 Accessibility Matrix

1. Label input valid.
2. Error announceable (`role="alert"` / `aria-live`).
3. Focus ring visible.
4. Touch target >= 44px untuk kontrol utama mobile.

## 6. Definition of Done

1. Layout auth sudah fullpage no-card pada semua flow.
2. Token/style auth aktif dari `globals-new.css` cluster auth.
3. `globals.css` tidak lagi jadi sumber token auth legacy.
4. Tidak ada regression behavior pada waitlist mode dan 2FA.
5. Lolos QA matrix mobile/desktop + dark/light.
