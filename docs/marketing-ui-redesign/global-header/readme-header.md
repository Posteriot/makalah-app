# Header Audit Context

Dokumen konteks awal untuk audit `GlobalHeader` dan `UserDropdown` pada branch `marketing-pages-ui-design`.

## Tujuan

Dokumen ini disiapkan sebagai pijakan awal untuk task:

- audit global header
- mendeteksi masalah perilaku, state flow, dan race condition pada menu-menu header
- memberi konteks awal sebelum redesign header dilakukan bila audit menemukan masalah

Perhatian khusus pada audit ini:

- global header secara keseluruhan
- semua menu navigasi header
- mobile menu
- dropdown user/auth
- alur sign-in dan sign-out
- potensi race condition pada auth menu dan user dropdown

## Komponen yang Diamati

Komponen utama yang relevan:

- [`src/components/layout/header/GlobalHeader.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx)
- [`src/components/layout/header/UserDropdown.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/UserDropdown.tsx)
- [`src/components/layout/header/README.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/README.md)

Dependensi auth dan user state yang ikut memengaruhi perilaku header:

- [`src/lib/auth-client.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/lib/auth-client.ts)
- [`src/lib/hooks/useCurrentUser.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/lib/hooks/useCurrentUser.ts)

Integrasi layout yang memanggil header:

- [`src/app/(marketing)/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(marketing)/layout.tsx)
- dashboard layout sesuai re-export header yang dipakai aplikasi

## Peran Komponen

### GlobalHeader

`GlobalHeader` adalah shell navigasi global untuk area non-chat.

Tanggung jawab utamanya:

- merender logo dan brand
- merender nav links desktop
- merender toggle theme
- merender CTA auth atau `UserDropdown`
- merender mobile menu
- menyembunyikan header pada route `/chat*`
- mengatur perilaku hide/show saat scroll

### UserDropdown

`UserDropdown` adalah menu akun yang dipakai dari header dan context lain yang membutuhkan trigger compact.

Tanggung jawab utamanya:

- menampilkan trigger user
- membuka dan menutup dropdown menu
- menyediakan link akun, subscription, support, admin tools
- menjalankan sign-out flow

## State dan Data Flow yang Terlihat

### GlobalHeader

State yang menonjol:

- `isHidden` untuk hide/show saat scroll
- `mobileMenuState` berisi `isOpen` dan `pathname`
- `isSigningOut` untuk sign-out mobile menu
- `hasBeenAuthenticated` untuk menahan auth skeleton saat re-auth singkat

Sumber data yang dipakai:

- `useConvexAuth()` untuk `isAuthenticated` dan `isLoading`
- `useSession()` dari Better Auth
- `useCurrentUser()` untuk data user Convex
- `useQuery(api.siteConfig.getConfig, { key: "header" })` untuk konfigurasi header dari CMS

Flow auth yang terlihat:

1. Header membaca auth state dari Convex.
2. Header membaca session Better Auth.
3. Header membaca user Convex.
4. Header menahan tampilan authenticated UI lewat `hasBeenAuthenticated` saat terjadi re-auth singkat.
5. Header merender skeleton, CTA sign-in, atau UI user sesuai kombinasi state tersebut.

### UserDropdown

State yang menonjol:

- `isOpen`
- `isSigningOut`
- `hasMounted`
- `lastSession`

Sumber data yang dipakai:

- `useSession()` untuk session auth
- `useCurrentUser()` untuk role dan profile user

Flow auth yang terlihat:

1. Komponen sengaja menunggu mount lewat `hasMounted` untuk menghindari hydration mismatch.
2. Session terakhir disimpan di `lastSession` agar dropdown tidak langsung flash ke skeleton saat Better Auth melakukan revalidation singkat.
3. `stableSession = session ?? lastSession` dipakai sebagai basis render.
4. Jika belum mount atau belum ada `stableSession`, komponen merender skeleton.
5. Setelah session stabil, trigger dan dropdown menu dirender.

## Perilaku Penting yang Sudah Terlihat

### Routing dan visibilitas

- Header return `null` pada path `/chat*`.
- Nav link `chat` diarahkan lewat `resolveChatEntryHref()` dan bisa membuka tab baru.
- Mobile menu disimpan per-path lewat `mobileMenuState.pathname`.

### Scroll behavior

- Header punya threshold `100px`.
- Scroll turun lebih agresif dipakai untuk hide.
- Scroll naik lebih sensitif dipakai untuk show.

### Theme behavior

- Toggle theme hanya aktif jika tema sudah siap (`resolvedTheme !== undefined`).
- Theme toggle tidak selalu muncul di semua state auth yang sama antara mobile dan desktop.

### Auth behavior

- Header menahan authenticated UI dengan `hasBeenAuthenticated`.
- `UserDropdown` menahan session lewat `lastSession`.
- `useCurrentUser()` juga menahan `lastKnownUser` untuk mencegah flash saat query Convex reload.

### Sign-out behavior

Baik `GlobalHeader` maupun `UserDropdown` memakai pola serupa:

- guard `if (isSigningOut) return`
- clear cookie `ba_session` lebih dulu
- panggil `signOut()`
- ignore catch jika request terputus atau komponen unmount
- redirect paksa ke `/` via `window.location.href`

## Hotspot Audit

Area yang layak diaudit lebih dulu:

- sinkronisasi state antara `useConvexAuth`, `useSession`, dan `useCurrentUser`
- transisi skeleton → authenticated UI → signed-out UI
- perilaku mobile menu saat route berubah
- perilaku dropdown saat klik luar, ESC, dan action menu
- sign-out flow yang melakukan cookie clear manual + async signOut + hard redirect
- konsistensi tampilan antara desktop header, mobile header, dan dropdown compact

## Potensi Race Condition yang Terlihat dari Kode

Temuan di bawah ini masih berupa konteks audit awal, bukan vonis bug final.

### 1. Tiga sumber auth state hidup bersamaan

Header mengandalkan:

- `useConvexAuth()`
- `useSession()`
- `useCurrentUser()`

Karena tiga sumber state ini bisa berubah di waktu yang berbeda, ada potensi tampilan menu dan CTA auth berada pada state transisi yang tidak sinkron, terutama saat:

- page load awal
- tab refocus
- session refresh
- sign-out

### 2. Stabilization state dilakukan di beberapa layer

Ada beberapa mekanisme penahan state:

- `hasBeenAuthenticated` di `GlobalHeader`
- `lastSession` di `UserDropdown`
- `lastKnownUser` di `useCurrentUser`

Secara konteks audit, ini berarti ada lebih dari satu lapisan cache/stabilizer UI. Kombinasi ini bisa membantu mencegah flicker, tapi juga bisa membuat menu tetap terlihat “authenticated” lebih lama daripada sumber state dasarnya.

### 3. Sign-out melakukan perubahan state sinkron dan asinkron sekaligus

Pola sign-out saat ini:

1. set `isSigningOut`
2. close menu
3. hapus cookie manual
4. `await signOut()`
5. `window.location.href = "/"`

Karena `crossDomainClient` dan auth client bisa mengubah state lebih awal dari resolusi request, alur ini perlu diaudit untuk memastikan tidak ada:

- double render yang membingungkan
- menu kembali terbuka sesaat
- skeleton singkat yang salah konteks
- action menu yang masih bisa ditekan pada frame transisi tertentu

### 4. Outside click dan open/close menu memakai event listener document

`GlobalHeader` dan `UserDropdown` sama-sama memasang listener document untuk close behavior.

Ini layak diaudit untuk interaksi seperti:

- klik trigger lalu klik luar sangat cepat
- dropdown terbuka bersamaan dengan mobile menu
- route change saat listener masih aktif

### 5. Tidak ada test khusus header/dropdown yang ditemukan

Dari pencarian test file di repo saat ini, tidak ditemukan coverage test yang spesifik untuk:

- `GlobalHeader`
- `UserDropdown`

Ini berarti konteks audit perlu menganggap area ini belum punya safety net test yang eksplisit.

## Konteks Desain Saat Ini

Header sudah berada di shell desain marketing yang mengikuti:

- grid `max-w-7xl`
- utility semantik seperti `text-narrative`, `rounded-action`, `gap-comfort`
- token core dari `globals-new.css`

Namun dokumen ini belum masuk ke usulan redesign visual. Pada tahap ini, desain hanya dicatat sebagai konteks yang sedang berjalan.

## Keluaran yang Diharapkan dari Audit Berikutnya

Dokumen ini disiapkan supaya audit tahap berikutnya bisa menjawab:

- apakah ada bug perilaku nyata pada global header
- apakah ada race condition nyata pada menu auth dan dropdown user
- apakah desain header sekarang masih solid atau perlu redesign
- bagian mana yang sekadar noisy, dan bagian mana yang benar-benar perlu dirombak

Dokumen ini belum menjawab pertanyaan-pertanyaan tersebut. Dokumen ini hanya menjadi fondasi konteks awal.
