# Header (Layout)

Komponen header untuk layout aplikasi (marketing + dashboard) dan dropdown user.

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan sumber konten tanpa baca semua file satu per satu. Semua poin di bawah ini sesuai dengan isi file di `src/components/layout/header`.

## Struktur

```
header/
├── index.ts          # Re-exports semua komponen
├── GlobalHeader.tsx  # Header global (nav + auth + mobile menu)
├── UserDropdown.tsx  # Dropdown user (desktop + ShellHeader)
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

- `GlobalHeader.tsx`: header global, memuat logo + nav + auth state + theme toggle + mobile menu. Hidden otomatis di route `/chat/*`.
- `UserDropdown.tsx`: dropdown user di desktop (akun, subskripsi, admin panel, sign out). Trigger dengan diagonal stripes animation.

## Perilaku Ringkas

**GlobalHeader**
- **Route hiding**: Return `null` saat `pathname.startsWith("/chat")` — mengikuti Zero Chrome rule dari Mechanical Grace design system.
- Scroll behavior:
  - Header tersembunyi saat scroll turun setelah `SCROLL_THRESHOLD` (100px).
  - Header muncul saat scroll naik (lebih sensitif).
  - Delta: `SCROLL_DOWN_DELTA = 8`, `SCROLL_UP_DELTA = 2`.
- Nav links aktif bila `pathname === href` atau `pathname.startsWith(href + "/")`.
- Theme toggle hanya tampil saat `SignedIn`.
- Desktop:
  - `SignedOut` menampilkan tombol "Masuk" (`/sign-in?redirect_url=<pathname>`).
  - `SignedIn` menampilkan `UserDropdown`.
- Mobile menu:
  - Toggle via ikon hamburger (Menu/Xmark dari iconoir).
  - Menu tertutup saat klik di luar elemen `[data-global-header]`.
  - Menu memuat auth section berbasis `Accordion`.
  - "Atur Akun" → navigasi ke `/settings`.
  - "Subskripsi" → `/subscription/overview`.
  - "Admin Panel" → `/dashboard` (hanya jika role admin/superadmin).
- SegmentBadge:
  - Muncul di samping logo saat `SignedIn` (mobile dan desktop).
  - Menampilkan spinner `RefreshDouble` selama Convex user loading.
- Sign out:
  - `signOut()` dari Clerk.
  - Loading state dengan spinner + disabled button.
  - Jika gagal, tampil toast error "Gagal keluar. Silakan coba lagi."

**UserDropdown**
- Render hanya setelah mount (`mounted`) untuk mencegah hydration mismatch.
- Tertutup saat klik di luar dropdown atau tekan ESC.
- Trigger button:
  - Menampilkan nama user (hidden di bawah breakpoint `sm`).
  - Chevron `NavArrowDown` dengan rotasi 180° saat terbuka.
  - Diagonal stripes animation (`btn-stripes-pattern`) pada hover dan expanded state.
  - Theme-aware styling: dark button (light mode) / light button (dark mode).
- Menu berisi:
  - "Atur Akun" → navigasi ke `/settings`.
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
- `EffectiveTier`: `"gratis" | "bpp" | "pro"` (dari `@/lib/utils/subscription`)
- `SEGMENT_CONFIG`: Record<EffectiveTier, { className }> untuk avatar warna di mobile menu.
- `getEffectiveTier(role, subscriptionStatus)` (dari `@/lib/utils/subscription`):
  - Admin/superadmin diperlakukan sebagai `pro`.
  - `subscriptionStatus` "pro" → `pro`, "bpp" → `bpp`, default `gratis`.

## Konten yang Ditampilkan

**GlobalHeader**
- Logo (light/dark) dari folder `/public/logo/*`.
- Brand text (light/dark) dari `/public/logo-makalah-ai-*.svg`.
- Menu desktop dengan label: Harga, Chat, Blog, Dokumentasi, Tentang.
- Tombol "Masuk" untuk `SignedOut` (dengan redirect_url ke pathname saat ini).
- `SegmentBadge` di samping logo saat `SignedIn` (semua breakpoint).
- Mobile menu:
  - Link navigasi sama seperti desktop.
  - CTA "Masuk" saat `SignedOut`.
  - Section auth saat `SignedIn` berisi nama user, avatar berwarna sesuai segment, dan menu akun.

**UserDropdown**
- Trigger menampilkan nama user + chevron (nama hidden di mobile via `hidden sm:block`).
- Menu item: Atur Akun, Subskripsi, Admin Panel (conditional), Sign out.

## Styling

Komponen menggunakan Tailwind utility classes secara langsung (bukan custom CSS class).

Pola styling utama:
- Header wrapper: `data-global-header` attribute, `fixed top-0`, `z-drawer`, `h-[54px]`, `bg-[var(--header-background)]`.
- Grid: `grid-cols-16` dengan `max-w-7xl`.
- Scroll hide: `transition-transform duration-200`, `-translate-y-full` saat tersembunyi.
- Nav links: `text-narrative text-xs uppercase` dengan dotted underline animation on hover.
- Theme toggle: `btn-stripes-pattern` overlay (45° diagonal stripes dari `globals.css`), inverted color scheme (dark button di light mode, sebaliknya).
- Mobile menu: `absolute top-full`, `bg-background border-b border-hairline`.
- UserDropdown trigger: `btn-stripes-pattern` overlay + `aria-expanded` state styling.
- UserDropdown menu: `rounded-md border-border bg-popover shadow-md z-drawer`.

Catatan:
- `SegmentBadge` muncul di mobile dan desktop (samping logo) saat `SignedIn`.
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
- `iconoir-react` (`Menu`, `Xmark`, `SunLight`, `HalfMoon`, `User`, `CreditCard`, `Settings`, `LogOut`, `RefreshDouble`, `NavArrowDown`)
- `sonner` (`toast`)
- `@/components/ui/accordion`
- `@/components/ui/SegmentBadge`
- `@/lib/hooks/useCurrentUser`
- `@/lib/utils` (`cn`)
- `@/lib/utils/subscription` (`getEffectiveTier`, `EffectiveTier`)
