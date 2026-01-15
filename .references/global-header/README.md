# Header Global - Referensi Teknis

Dokumentasi ini ngerangkum header global Makalah App yang dirender di `RootLayout`. Fokusnya cuma elemen yang bener-bener muncul di header pada semua halaman.

## Daftar Isi

1. [Ikhtisar](#ikhtisar)
2. [Struktur UI](#struktur-ui)
3. [Perilaku Autentikasi](#perilaku-autentikasi)
4. [Rute yang Dipakai](#rute-yang-dipakai)
5. [Responsif](#responsif)
6. [Integrasi Clerk](#integrasi-clerk)
7. [Rujukan File](#rujukan-file)

---

## Ikhtisar

Header global didefinisikan langsung di `src/app/layout.tsx`. Isi utama: merek `Makalah App`, slogan `AI-assisted papers`, navigasi utama, dan blok autentikasi (`HeaderAuthNav`).

---

## Struktur UI

Struktur visual utama:
- **Kiri:** merek + slogan
- **Kanan:** menu navigasi + autentikasi

Hierarki ringkas:
```
header
└── wadah (max-w-5xl)
    ├── merek + slogan
    └── nav (Home, Pricing, About, Chat, HeaderAuthNav)
```

---

## Perilaku Autentikasi

`HeaderAuthNav` membagi tampilan jadi dua status:

**SignedIn:**
- Tautan `Dashboard` → `/dashboard`
- `UserButton` dengan:
  - Entri menu `Papers` → `/dashboard/papers`
  - Halaman profil `Status Akun` (render `AccountStatusPage`)

**SignedOut:**
- Tautan `Sign in` → `/sign-in`
- Tombol `Sign up` → `/sign-up`

---

## Rute yang Dipakai

Rute yang langsung dipakai di header:
- `/` (merek + menu Home)
- `/pricing`
- `/about`
- `/chat`
- `/sign-in`
- `/sign-up`
- `/dashboard`
- `/dashboard/papers`

---

## Responsif

Perilaku responsif berdasarkan kelas Tailwind:
- Slogan `AI-assisted papers` hanya tampil di `sm` ke atas.
- Tautan `About` hanya tampil di `sm` ke atas.
- Tautan `Dashboard` (SignedIn) hanya tampil di `sm` ke atas.

---

## Integrasi Clerk

Implementasi `HeaderAuthNav` bergantung ke komponen Clerk:
- `SignedIn` / `SignedOut` untuk pemilah tampilan.
- `UserButton` untuk menu akun.
- `afterSignOutUrl="/"` untuk pengalihan setelah keluar.
- `UserButton.UserProfilePage` dengan label "Status Akun".

---

## Rujukan File

- `.references/global-header/files-index.md`
- `src/app/layout.tsx`
- `src/components/layout/HeaderAuthNav.tsx`
- `src/components/user/AccountStatusPage.tsx`
