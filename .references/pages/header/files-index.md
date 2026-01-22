# Indeks File - Header Global

## File utama (rute/layout)
- `src/app/layout.tsx` - header global (brand + navigasi + area autentikasi).

## Komponen layout
- `src/components/layout/HeaderAuthNav.tsx` - area autentikasi di header (SignedIn/SignedOut + UserButton).

## Komponen pendukung
- `src/components/user/AccountStatusPage.tsx` - halaman profil custom "Status Akun" di UserButton.
- `src/components/admin/RoleBadge.tsx` - badge role (Superadmin/Admin/User).

## Label navigasi header
- Brand: "Makalah App" (`/`) + teks kecil "AI-assisted papers".
- Navigasi utama: "Home" (`/`), "Pricing" (`/pricing`), "About" (`/about`), "Chat" (`/chat`).
- Navigasi autentikasi:
  - SignedIn: "Dashboard" (`/dashboard`), item menu "Papers" (`/dashboard/papers`), halaman profil "Status Akun".
  - SignedOut: "Sign in" (`/sign-in`).

## Komponen UI eksternal
- Next.js: `Link`.
- Clerk: `SignedIn`, `SignedOut`, `UserButton`, `UserButton.MenuItems`, `UserButton.Link`, `UserButton.UserProfilePage`.
- Lucide React: `FileText`, `User`.

## UI primitif (src/components/ui) yang kepake di header
- `src/components/ui/badge.tsx`
