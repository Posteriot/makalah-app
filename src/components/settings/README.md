# Settings Page

Halaman pengaturan akun user untuk route `/settings` (dalam route group `(dashboard)`).

## Scope

README ini mendokumentasikan struktur, perilaku, data flow, dan dependensi untuk area settings berikut:
- `src/app/(dashboard)/settings/page.tsx`
- `src/components/settings/settingsConfig.ts`
- `src/components/settings/SettingsContainer.tsx`
- `src/components/settings/SettingsSidebar.tsx`
- `src/components/settings/SettingsContentSection.tsx`
- `src/components/settings/ProfileTab.tsx`
- `src/components/settings/SecurityTab.tsx`
- `src/components/settings/StatusTab.tsx`

## Struktur

```txt
(dashboard)/
├── layout.tsx                    # Server layout, GlobalHeader + Footer
└── settings/
    └── page.tsx                  # Client page, auth guard, renders SettingsContainer

components/settings/
├── settingsConfig.ts             # Tab config, types, resolver (mirrors adminPanelConfig.ts)
├── SettingsContainer.tsx          # Fullpage layout, DottedPattern bg, grid, mobile toggle
├── SettingsSidebar.tsx            # Desktop aside (col-span-4) + mobile Sheet drawer
├── SettingsContentSection.tsx     # Dynamic header + tab content routing
├── ProfileTab.tsx                 # Ubah profil (nama + avatar) + info email
├── SecurityTab.tsx                # Ubah/buat password + 2FA + akun terhubung
├── StatusTab.tsx                  # Ringkasan email, role, tier subscription
└── README.md                     # Dokumentasi ini
```

Dependensi UI/data langsung:
- `src/components/marketing/SectionBackground.tsx` (DottedPattern)
- `src/components/ui/sheet.tsx`
- `src/components/admin/RoleBadge.tsx`
- `src/components/ui/SegmentBadge.tsx`
- `src/lib/hooks/useCurrentUser.ts`
- `src/lib/utils/subscription.ts`

## Arsitektur

Layout mengikuti pola Admin Panel (`AdminPanelContainer`):

```txt
GlobalHeader (dari dashboard layout)
├── DottedPattern bg (w-screen breakout)
│   └── max-w-7xl grid-cols-16
│       ├── SettingsSidebar (col-span-4, desktop only)
│       └── SettingsContentSection (col-span-12)
│           └── Active tab content (ProfileTab | SecurityTab | StatusTab)
├── SettingsMobileSidebar (Sheet drawer, mobile only)
Footer (dari dashboard layout)
```

## Komponen dan Tanggung Jawab

- `settingsConfig.ts`:
  - Definisi `SettingsSidebarItem` interface dan `SettingsTabId` type.
  - Array `SETTINGS_SIDEBAR_ITEMS` dengan 3 tab: profile, security, status.
  - `resolveSettingsTab()` validasi query param `tab`, fallback ke `profile`.
  - `findSettingsTabConfig()` lookup config by tab ID.

- `SettingsContainer.tsx` (client component):
  - Fullpage breakout layout (`w-screen`, `DottedPattern`).
  - URL-based tab sync via `useSearchParams` + `useEffect`.
  - Mobile sidebar toggle state (`sidebarOpen`).
  - Grid 16 kolom: sidebar + content.

- `SettingsSidebar.tsx`:
  - `SettingsSidebar` — desktop `<aside>` col-span-4, `rounded-shell border-hairline`.
  - `SettingsMobileSidebar` — Sheet drawer slide-in dari kanan.
  - `SidebarNav` — shared nav component, heading "PENGATURAN AKUN".

- `SettingsContentSection.tsx` (client component):
  - Dynamic header (icon + title + description) dari `settingsConfig`.
  - Fetches session + Convex user data, passes ke tab components.
  - Conditional rendering active tab.

- `ProfileTab.tsx` (client component):
  - Edit mode untuk nama depan/belakang.
  - Save via Convex mutation `updateProfile` + BetterAuth `updateUser`.

- `SecurityTab.tsx` (client component):
  - Password management (create/change).
  - 2FA enable/disable via BetterAuth.
  - Connected accounts display.

- `StatusTab.tsx` (client component):
  - Email, role badge, tier badge, credit meter.
  - Upgrade link untuk gratis/bpp tiers.

## Data dan Konstanta

- `SETTINGS_SIDEBAR_ITEMS` di `settingsConfig.ts`: 3 tab config.
- `TIER_CONFIG` di `StatusTab.tsx`: kontrol visibilitas tombol upgrade.
- `getEffectiveTier()` di `src/lib/utils/subscription.ts`:
  - `admin/superadmin` selalu dianggap `pro`.
  - `subscriptionStatus` lain dipetakan ke `pro`, `bpp`, default `gratis`.

## Dependencies

Auth dan user data:
- `@/lib/auth-client` (`useSession`, `authClient`, `changePassword`, `twoFactor`)

Backend:
- `convex/react` (`useMutation`, `useQuery` via `useCurrentUser`)
- `@convex/_generated/api`

UI:
- `@/components/ui/sheet` (mobile sidebar)
- `iconoir-react`
- `next/image`, `next/link`
- `sonner` (`toast`)

Utility internal:
- `src/lib/utils.ts` (`cn`)
- `src/lib/hooks/useCurrentUser.ts`
- `src/lib/utils/subscription.ts`
