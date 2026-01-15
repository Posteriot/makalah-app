# Header Global - Indeks File

Rujukan cepat buat lo soal lokasi file header global yang tampil di semua halaman lewat `RootLayout`.

## Lompat Cepat

| Kategori | Jumlah | Isi |
|----------|--------|-----|
| [Layout Root](#layout-root) | 1 | RootLayout + markup header |
| [Komponen Header](#komponen-header) | 1 | HeaderAuthNav (autentikasi di header) |
| [Komponen Status Akun](#komponen-status-akun) | 1 | AccountStatusPage (halaman profil Clerk) |
| **Total** | **3** | |

---

## Layout Root

```
src/app/
└── layout.tsx                    # RootLayout + struktur header global
```

### Struktur Header di RootLayout

Elemen kunci:
- `<header className="border-b bg-card/40">`
- Wadah: `max-w-5xl`, `px-6`, `py-4`
- Kiri: merek `Makalah App` (tautan ke `/`) + slogan `AI-assisted papers`
- Kanan: navigasi `Home`, `Pricing`, `About`, `Chat`, lalu `HeaderAuthNav`

Catatan responsif:
- Slogan `AI-assisted papers` disembunyikan di layar kecil (`hidden` + `sm:inline-block`).
- Tautan `About` juga disembunyikan di layar kecil (`hidden` + `sm:inline-block`).

---

## Komponen Header

```
src/components/layout/
└── HeaderAuthNav.tsx             # Nav autentikasi di header
```

### Perilaku SignedIn / SignedOut

**SignedIn:**
- Tautan `Dashboard` ke `/dashboard` (disembunyikan di layar kecil).
- `UserButton` dari Clerk dengan entri menu tambahan:
  - `Papers` → `/dashboard/papers`
  - Halaman profil `Status Akun` → `AccountStatusPage`

**SignedOut:**
- Tautan `Sign in` → `/sign-in`
- Tombol `Sign up` → `/sign-up`

---

## Komponen Status Akun

```
src/components/user/
└── AccountStatusPage.tsx         # Halaman status akun di profil Clerk
```

Ringkasan isi:
- `useCurrentUser()` untuk data pengguna.
- `RoleBadge` untuk label peran.
- Kondisi:
  - Memuat: teks "Memuat..."
  - Tidak ada pengguna: teks "Data tidak tersedia. Silakan refresh halaman."
  - Normal: Email, Role, Subscription.

---

## Pola Pencarian

```bash
# Lokasi header global
rg "<header|HeaderAuthNav|Makalah App|AI-assisted papers" src/app/layout.tsx

# Nav autentikasi header
rg "HeaderAuthNav|SignedIn|SignedOut|UserButton" src/components/layout/HeaderAuthNav.tsx

# Halaman status akun di menu profil
rg "AccountStatusPage|Status Akun|useCurrentUser" src/components/user/AccountStatusPage.tsx
```
