# Settings Page

Halaman pengaturan akun user untuk route `/settings` (dalam route group `(account)`).

## Scope

README ini mendokumentasikan struktur, perilaku, data flow, dan dependensi untuk area settings berikut:
- `src/app/(account)/layout.tsx`
- `src/app/(account)/settings/page.tsx`
- `src/components/settings/ProfileTab.tsx`
- `src/components/settings/SecurityTab.tsx`
- `src/components/settings/StatusTab.tsx`

Semua poin di bawah ditulis dari pembacaan kode aktual, termasuk dependensi langsung yang dipakai oleh file-file tersebut.

## Struktur

```txt
(account)/
├── layout.tsx                    # Server layout, sinkronisasi Clerk -> Convex + shell wrapper
└── settings/
    └── page.tsx                  # Client page, state tab, desktop nav, mobile accordion

components/settings/
├── ProfileTab.tsx                # Ubah profil (nama + avatar) + info email
├── SecurityTab.tsx               # Ubah/buat password + kontrol sign out session lain
├── StatusTab.tsx                 # Ringkasan email, role, tier subscription
└── README.md                     # Dokumentasi ini
```

Dependensi UI/data langsung:
- `src/components/ui/accordion.tsx`
- `src/components/admin/RoleBadge.tsx`
- `src/components/ui/SegmentBadge.tsx`
- `src/lib/hooks/useCurrentUser.ts`
- `src/lib/utils/subscription.ts`

## Integrasi

Route settings diintegrasikan lewat App Router:
- `src/app/(account)/layout.tsx` membungkus semua halaman account.
- `src/app/(account)/settings/page.tsx` adalah entry point halaman settings.

Halaman ini memakai kombinasi data:
- BetterAuth (`useSession`) untuk data akun auth (nama, email, session).
- Convex (`useCurrentUser`) untuk role + subscription status.

## Komponen dan Tanggung Jawab

- `layout.tsx` (server component):
  - Menjalankan `ensureConvexUser()` sebelum render children.
  - Mengambil auth BetterAuth session, generate token, lalu trigger `fetchMutation(api.users.createUser, ...)` dengan timeout 5 detik.
  - Menyediakan shell visual account page (grid background + container centering).

- `page.tsx` (client component):
  - Definisi tab: `profile | security | status`.
  - `parseTabParam()` validasi query param `tab`, fallback ke `profile`.
  - Menyimpan `activeTab` dalam state lokal.
  - Desktop: sidebar kiri untuk logo, judul, nav tombol, back button.
  - Mobile: accordion single-panel untuk 3 tab.
  - Merender tab konten (`ProfileTab`, `SecurityTab`, `StatusTab`).

- `ProfileTab.tsx` (client component):
  - Menampilkan detail profil dan email utama.
  - Edit mode untuk nama depan/belakang.
  - Menyimpan perubahan via Convex mutation hanya jika nilai benar-benar berubah.
  - Menangani feedback sukses/gagal dengan `toast`.

- `SecurityTab.tsx` (client component):
  - Menangani flow update password via BetterAuth (`changePassword`).
  - Validasi lokal: password baru wajib, konfirmasi harus sama, current password wajib jika akun sudah punya password.
  - Connected accounts section (Google, GitHub) dengan link/unlink.
  - Toggle visibilitas input password (show/hide).

- `StatusTab.tsx` (client component):
  - Menampilkan email, role, dan status tier subscription.
  - Menentukan tier via `getEffectiveTier(role, subscriptionStatus)`.
  - Menampilkan tombol upgrade untuk `gratis` dan `bpp`, menyembunyikan untuk `pro`.
  - Menampilkan `RoleBadge` dan `SegmentBadge` dari shared components.

## Client dan Server Boundary

Client components (`"use client"`):
- `src/app/(account)/settings/page.tsx`
- `src/components/settings/ProfileTab.tsx`
- `src/components/settings/SecurityTab.tsx`
- `src/components/settings/StatusTab.tsx`

Server component:
- `src/app/(account)/layout.tsx`

## Perilaku Ringkas

**Inisialisasi dan tab state (`page.tsx`)**
- Initial tab dibaca dari `searchParams.get("tab")`, lalu divalidasi terhadap `VALID_TABS`.
- Jika invalid/null, fallback ke `profile`.
- Mobile accordion memakai `value={activeTab}` + `onValueChange` untuk sinkron tab.

**ProfileTab**
- State awal nama diisi dari Convex user saat data berubah.
- Saat save:
  - Diff dulu field firstName/lastName.
  - Panggil Convex mutation `updateProfile` jika ada perubahan.

**SecurityTab**
- Flow gagal cepat (early return) untuk validasi input.
- Jika sukses, reset state form dan keluar dari mode edit.
- Connected accounts management via BetterAuth social linking API.

**StatusTab**
- Loading state Convex: tampilkan `Memuat...`.
- Role badge:
  - `superadmin`, `admin`, `user` (fallback ke `user` jika role tidak dikenali).
- Tier badge:
  - `gratis`, `bpp`, `pro` via `getEffectiveTier`.

## Data dan Konstanta Penting

- `VALID_TABS` di `page.tsx`: `profile`, `security`, `status`.
- `TIER_CONFIG` di `StatusTab.tsx`: kontrol visibilitas tombol upgrade.
- `getEffectiveTier()` di `src/lib/utils/subscription.ts`:
  - `admin/superadmin` selalu dianggap `pro`.
  - `subscriptionStatus` lain dipetakan ke `pro`, `bpp`, default `gratis`.

## Styling Ringkas

Pola styling dominan:
- Utility Tailwind langsung di komponen.
- Utility class custom dari `globals.css`:
  - `text-narrative`, `text-interface`, `text-signal`
  - `rounded-action`, `rounded-badge`
  - `focus-ring`, `btn-stripes-pattern`
- Card style konsisten antar tab:
  - Light: `bg-slate-200` + `bg-slate-50`
  - Dark: `dark:bg-slate-900` + `dark:bg-slate-800`
- Mobile behavior:
  - Konten utama berbasis `Accordion`.
- Desktop behavior:
  - Sidebar kiri + konten kanan (`md:flex-row`, `md:w-4/12`, `md:w-8/12`).

Detail lengkap seluruh class dan token ada di:
- `docs/tailwind-styling-consistency/user-settings-page/user-settings-page-style.md`

## Dependencies

Auth dan user data:
- `@/lib/auth-client` (`useSession`, `changePassword`, `linkSocial`, `unlinkAccount`)

Backend:
- `convex/nextjs` (`fetchMutation`)
- `convex/react` (`useQuery` via `useCurrentUser`)
- `@convex/_generated/api`

UI:
- `@radix-ui/react-accordion`
- `iconoir-react`
- `next/image`, `next/link`
- `sonner` (`toast`)

Utility internal:
- `src/lib/utils.ts` (`cn`)
- `src/lib/hooks/useCurrentUser.ts`
- `src/lib/utils/subscription.ts`

## Audit Temuan (Task 1)

1. `tab` query param hanya dipakai saat inisialisasi state, tidak sinkron saat URL berubah.
- Bukti: `useState(() => parseTabParam(searchParams.get("tab")))` tanpa `useEffect` sinkronisasi lanjutan di `src/app/(account)/settings/page.tsx:49`.

2. Klik tab tidak memperbarui query param URL, jadi state tab tidak shareable/reproducible lewat URL.
- Bukti: aksi nav hanya `setActiveTab(...)` tanpa `router.push/replace` di `src/app/(account)/settings/page.tsx:107`, `src/app/(account)/settings/page.tsx:118`, `src/app/(account)/settings/page.tsx:129`.

3. Semua tab desktop tetap dirender meski hidden, sehingga ada render tersembunyi yang tidak perlu (terutama di mobile karena accordion juga merender konten aktif).
- Bukti: `ProfileTab`, `SecurityTab`, `StatusTab` tetap dipanggil dalam wrapper `hidden` di `src/app/(account)/settings/page.tsx:241`, `src/app/(account)/settings/page.tsx:245`, `src/app/(account)/settings/page.tsx:249`.

4. Label aksesibilitas tombol show/hide password statis (`"Tampilkan ..."`) walau state sudah visible.
- Bukti: `aria-label` tidak berubah dinamis pada tiga tombol di `src/components/settings/SecurityTab.tsx:141`, `src/components/settings/SecurityTab.tsx:169`, `src/components/settings/SecurityTab.tsx:200`.

## Daftar File Terkait

- `src/app/(account)/layout.tsx`
- `src/app/(account)/settings/page.tsx`
- `src/components/settings/ProfileTab.tsx`
- `src/components/settings/SecurityTab.tsx`
- `src/components/settings/StatusTab.tsx`
- `src/components/ui/accordion.tsx`
- `src/components/admin/RoleBadge.tsx`
- `src/components/ui/SegmentBadge.tsx`
- `src/lib/hooks/useCurrentUser.ts`
- `src/lib/utils/subscription.ts`
- `src/app/globals.css`
