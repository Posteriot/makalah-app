# Header (Layout)

Komponen header untuk layout aplikasi (marketing + dashboard) dan dropdown user.

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan sumber konten tanpa baca semua file satu per satu. Semua poin di bawah ini sesuai dengan isi file di `src/components/layout/header`.

## Struktur

```
header/
├── index.ts          # Re-exports semua komponen
├── GlobalHeader.tsx  # Header global (nav + auth + mobile menu)
├── UserDropdown.tsx  # Dropdown user (desktop)
└── README.md         # Dokumentasi ini
```

## Penggunaan

```tsx
import { GlobalHeader } from "@/components/layout/header"
```

Integrasi utama:
- `src/app/(marketing)/layout.tsx`
- `src/app/(dashboard)/layout.tsx`

`UserDropdown` juga dipakai di `src/components/chat/shell/ShellHeader.tsx`.

## Ekspor (index.ts)

- `GlobalHeader`
- `UserDropdown`

## Komponen dan Tanggung Jawab

- `GlobalHeader.tsx`: header global, memuat logo + nav + auth state + theme toggle + mobile menu + settings modal.
- `UserDropdown.tsx`: dropdown user di desktop (akun, subskripsi, admin panel, sign out) + settings modal.

## Perilaku Ringkas

**GlobalHeader**
- Scroll behavior:
  - Header tersembunyi saat scroll turun setelah `SCROLL_THRESHOLD` (100px).
  - Header muncul saat scroll naik (lebih sensitif).
  - Delta: `SCROLL_DOWN_DELTA = 8`, `SCROLL_UP_DELTA = 2`.
- Nav links aktif bila `pathname === href` atau `pathname.startsWith(href + "/")`.
- Theme toggle hanya tampil saat `SignedIn`.
- Desktop:
  - `SignedOut` menampilkan tombol "Masuk" (`/sign-in`).
  - `SignedIn` menampilkan `UserDropdown`.
- Mobile menu:
  - Toggle via ikon hamburger.
  - Menu tertutup saat klik di luar `.global-header`.
  - Menu memuat auth section berbasis `Accordion`.
  - Tombol "Atur Akun" membuka `UserSettingsModal`.
- Sign out:
  - `signOut()` dari Clerk.
  - Jika gagal, tampil toast error "Gagal keluar. Silakan coba lagi."

**UserDropdown**
- Render hanya setelah mount (`mounted`) untuk mencegah hydration mismatch.
- Tertutup saat klik di luar dropdown atau tekan ESC.
- Menu berisi:
  - "Atur Akun" → membuka `UserSettingsModal`.
  - "Subskripsi" → `/subscription/overview`.
  - "Admin Panel" → `/dashboard` (hanya jika role admin/superadmin).
  - "Sign out" → `signOut()` dengan loading state.

## Data & Konstanta

**GlobalHeader**
- `NAV_LINKS`:
  - `/pricing` → "Harga"
  - `/chat` → "Chat"
  - `/blog` → "Blog"
  - `/documentation` → "Dokumentasi"
  - `/about` → "Tentang"
- `SCROLL_THRESHOLD = 100`
- `SCROLL_DOWN_DELTA = 8`
- `SCROLL_UP_DELTA = 2`
- `SegmentType`: `"gratis" | "bpp" | "pro"`
- `SEGMENT_CONFIG`: label + className untuk avatar di mobile menu.
- `getSegmentFromUser(role, subscriptionStatus)`:
  - Admin/superadmin diperlakukan sebagai `pro`.
  - `subscriptionStatus` "pro" → `pro`, "bpp" → `bpp`, default `gratis`.

## Konten yang Ditampilkan

**GlobalHeader**
- Logo (light/dark) dari folder `/public/logo/*`.
- Brand text (light/dark) dari `/public/logo-makalah-ai-*.svg`.
- Menu desktop dengan label: Harga, Chat, Blog, Dokumentasi, Tentang.
- Tombol "Masuk" untuk `SignedOut`.
- Mobile menu:
  - Link navigasi sama seperti desktop.
  - CTA "Masuk" saat `SignedOut`.
  - Section auth saat `SignedIn` berisi nama user, avatar berwarna sesuai segment, dan menu akun.

**UserDropdown**
- Trigger menampilkan nama user (desktop).
- Menu item: Atur Akun, Subskripsi, Admin Panel (conditional), Sign out.

## Styling

Kelas utama (sebagian dipakai di `src/app/globals.css`):

- Header wrapper: `.global-header`, `.header-inner`, `.header-left`, `.header-right`, `.header-bottom-line`
- Navigasi: `.header-nav`, `.nav-link`, `.nav-link.active`
- Mobile menu: `.mobile-menu`, `.mobile-menu__link`, `.mobile-menu__link--active`, `.mobile-menu__cta`
- Mobile auth: `.mobile-menu__auth-section`, `.mobile-menu__auth-bg-stripes`, `.mobile-menu__auth-bg-dots`, `.mobile-menu__auth-content`
- Mobile accordion: `.mobile-menu__user-accordion*`, `.mobile-menu__user-menu-item`, `.mobile-menu__user-signout`
- Theme toggle: `.theme-toggle` (desktop)

Catatan:
- `SegmentBadge` hanya muncul di desktop (samping logo) saat `SignedIn`.
- Avatar warna di mobile menu memakai `SEGMENT_CONFIG`.

## Client Components

Komponen yang memakai `"use client"`:
- `GlobalHeader.tsx`
- `UserDropdown.tsx`

## Dependencies

- `next/link`, `next/image`
- `next-themes` (`useTheme`)
- `@clerk/nextjs` (`SignedIn`, `SignedOut`, `useUser`, `useClerk`)
- `next/navigation` (`usePathname`)
- `lucide-react`
- `sonner` (`toast`)
- `@/components/ui/accordion`
- `@/components/ui/SegmentBadge`
- `@/components/settings/UserSettingsModal`
- `@/lib/hooks/useCurrentUser`
- `@/lib/utils` (`cn`)
