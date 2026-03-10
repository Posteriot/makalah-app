# Global Header Improvement Design

**Status:** Approved design
**Branch:** `marketing-pages-ui-design`
**Date:** 2026-03-09

## Goal

Desain ini disusun untuk memperbaiki `GlobalHeader` dan `UserDropdown` berdasarkan findings audit yang sudah dicatat di [`audit-findings.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/audit-findings.md).

Tujuan utamanya:

- menghilangkan stale auth UI di header
- membuat perilaku menu auth deterministik pada load, refocus, route change, dan sign-out
- menjaga header tetap konsisten dengan bahasa visual `home` dan token `core` di `globals-new.css`
- menyiapkan header untuk redesign visual berikutnya tanpa membawa race condition lama

## Scope

Scope utama desain ini:

- [`src/components/layout/header/GlobalHeader.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx)
- [`src/components/layout/header/UserDropdown.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/UserDropdown.tsx)
- kontrak data auth/user yang dipakai header dari [`useCurrentUser.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/lib/hooks/useCurrentUser.ts) dan auth client

Scope perilaku yang harus diperbaiki:

- desktop auth CTA
- desktop user dropdown
- mobile menu
- mobile auth accordion
- sign-out flow
- redirect preservation untuk CTA login

Non-scope desain ini:

- perubahan schema CMS header
- perubahan footer
- redesign visual besar di luar kebutuhan memperjelas perilaku dan state header

## Architecture Decision

### Single auth render contract in `GlobalHeader`

Keputusan desain utama:

- `GlobalHeader` menjadi orchestrator auth view state
- `UserDropdown` menjadi komponen presentasional dan action menu
- keputusan render auth tidak lagi tersebar di beberapa komponen dengan cache state terpisah

Header harus punya satu kontrak state render yang eksplisit:

- `loading`
- `authenticated`
- `unauthenticated`
- `signingOut`

Makna kontrak ini:

- `loading`: auth belum cukup pasti untuk merender UI final
- `authenticated`: user boleh melihat badge, dropdown, menu akun, dan route yang bergantung pada login
- `unauthenticated`: user melihat CTA masuk dan jalur signed-out
- `signingOut`: menu auth dibekukan, menu ditutup, dan header masuk state transisi tunggal

Implikasi desain:

- `GlobalHeader` tidak lagi memakai latch authenticated permanen yang tidak pernah reset
- `UserDropdown` tidak lagi memakai session cache internal sebagai sumber keputusan render final
- status cache `lastKnownUser` di `useCurrentUser` harus diputuskan secara eksplisit agar tidak menjadi sumber stale auth UI tambahan
- keputusan `signed-in` vs `signed-out` berasal dari satu sumber kontrak yang sama

### Position of `useCurrentUser`

`useCurrentUser` tidak boleh menjadi sumber keputusan auth final untuk header secara implisit.

Keputusan desain untuk hook ini:

- hook boleh tetap membantu mengurangi flicker data user
- tetapi cache `lastKnownUser` tidak boleh membuat header tetap terlihat authenticated ketika kontrak auth final sudah berubah ke `unauthenticated`
- perilaku cache user harus tunduk ke kontrak auth render dari `GlobalHeader`

Artinya, data user cache hanya boleh membantu mengisi detail presentasi ketika state masih valid, bukan mempertahankan status signed-in sendirian.

## Interaction Design

### Desktop navigation

- link navigasi biasa tetap stateless
- CTA `Masuk` dan `UserDropdown` harus mutual-exclusive
- route `Chat` harus di-resolve berdasarkan auth state final, bukan state transisi yang stale

### Mobile menu

- mobile menu tetap punya state open/close sendiri
- mobile menu harus force-close saat:
  - route berubah
  - auth berubah ke `unauthenticated`
  - sign-out dimulai
- auth accordion mobile hanya muncul saat state final `authenticated`
- saat `loading`, area auth mobile hanya boleh menampilkan placeholder tunggal yang konsisten

### User dropdown

- dropdown hanya boleh terbuka saat state `authenticated`
- saat sign-out dimulai, dropdown harus force-close
- action menu dibekukan selama `signingOut`
- close via click-outside dan `Escape` tetap dipertahankan, tetapi close behavior harus idempotent

### Theme toggle

Theme toggle harus mengikuti kontrak auth dan visibilitas yang konsisten lintas breakpoint.

Aturan yang diinginkan:

- aturan tampil/sembunyi theme toggle tidak boleh berbeda secara arbitrer antara desktop dan mobile
- theme toggle tidak boleh tertinggal pada state auth lama saat header sudah berpindah state
- selama `signingOut`, perilaku theme toggle harus tetap deterministik dan tidak menimbulkan kombinasi UI auth yang kontradiktif

Jika toggle tetap dibatasi hanya untuk user authenticated, aturan itu harus identik di desktop dan mobile.
Jika toggle diubah menjadi tersedia untuk semua user, aturan itu juga harus identik di desktop dan mobile.

Desain ini tidak memilih salah satu opsi visual secara sepihak, tetapi mewajibkan konsistensi kontraknya.

### Sign-out transition

Sign-out diperlakukan sebagai satu event global untuk header:

1. semua menu auth ditutup
2. trigger auth dinonaktifkan
3. state visual masuk ke `signingOut`
4. redirect dieksekusi setelah flow logout selesai sesuai kontrak final

Target utamanya adalah mencegah:

- dropdown lama masih terlihat
- CTA masuk muncul terlalu cepat
- badge user masih tampak pada window logout
- action menu masih bisa dipicu pada frame transisi

### Redirect preservation

CTA `Masuk` harus mempertahankan context URL yang relevan, tidak hanya `pathname`.
Context yang perlu ikut dipertahankan:

- query string
- hash

Ini penting untuk page seperti:

- `documentation`
- `blog`

## Visual Direction

### Visual principle

Redesign visual header di fase ini bersifat evolusioner, bukan penggantian identitas total.

Header diposisikan sebagai:

- instrument panel ringan
- presisi
- tenang
- teknikal
- minim noise

### Relationship with `home`

Header tetap harus konsisten dengan shell `home`:

- grid `max-w-7xl`
- spacing yang selaras dengan marketing shell
- `text-narrative` untuk elemen navigasi
- token `core` sebagai basis warna, border, hover, dan active state

### Relationship with `chat`

Header tidak menyalin tampilan `chat`, tetapi mengikuti disiplin token dan kejelasan state dari `chat`.
Artinya:

- state visual harus jelas
- kontras state harus tegas
- tidak ada affordance ambigu yang bergantung pada stale state

### Allowed visual refinement in this design

- memperjelas active nav state
- menyatukan family visual antara theme toggle, auth CTA, dan dropdown trigger
- memperjelas hierarchy mobile auth section
- memperkuat affordance signed-in trigger tanpa bergantung pada stale state tricks

### Visual limits

- tidak mengubah identitas logo dan brand
- tidak mengubah total struktur navigasi
- tidak memperkenalkan token visual baru jika token `core` yang ada sudah cukup
- tidak memperluas redesign ke area di luar kebutuhan audit header

## Testing Strategy

Header dianggap selesai hanya jika perilakunya dibuktikan lewat test, bukan hanya lewat pengecekan visual manual.

### Render-state tests

Test minimal yang dibutuhkan:

- `loading`
- `authenticated`
- `unauthenticated`
- `signingOut`

Yang harus diverifikasi:

- CTA `Masuk` dan `UserDropdown` selalu mutual-exclusive
- mobile auth section hanya muncul pada state yang benar
- badge user tidak muncul pada state yang salah

### Interaction tests

Interaksi minimal yang harus diuji:

- buka dan tutup mobile menu
- buka dan tutup dropdown
- close via click-outside
- close via `Escape`
- route change menutup menu yang relevan

### Auth transition tests

Yang harus dipastikan:

- revalidation singkat tidak memunculkan kombinasi UI yang kontradiktif
- sign-out langsung menutup semua menu auth
- selama `signingOut`, action auth tidak tetap aktif
- redirect login mempertahankan query string dan hash
- cache user di hook tidak mempertahankan state signed-in ketika auth final sudah berubah
- visibilitas theme toggle konsisten antara desktop dan mobile

### Regression targets

- nav `Chat` resolve sesuai auth state final
- badge atau indicator user tidak muncul setelah logout
- varian dropdown `default` dan `compact` punya kontrak interaksi yang konsisten

## Done Criteria

Desain ini dianggap terpenuhi jika:

- ada kontrak auth tunggal untuk header
- tidak ada lagi latch auth permanen tanpa reset
- `UserDropdown` tidak lagi menentukan session final sendiri
- `useCurrentUser` tidak lagi bisa mempertahankan authenticated header secara implisit lewat cache user
- mobile menu dan dropdown punya aturan close/open yang eksplisit
- theme toggle punya kontrak visibilitas yang konsisten lintas breakpoint
- redirect login mempertahankan context URL
- tersedia coverage test minimal untuk transisi auth dan interaksi utama
- styling tetap mengikuti token `core` dan bahasa visual `home`

## Related Docs

- [`readme-header.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/readme-header.md)
- [`audit-findings.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/audit-findings.md)
- [`context.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/context.md)
