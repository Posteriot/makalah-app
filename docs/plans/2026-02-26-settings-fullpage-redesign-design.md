# Settings Fullpage Redesign

**Date:** 2026-02-26
**Status:** Approved

## Goal

Redesign halaman Settings ("Atur Akun") dari card-based centered layout ke fullpage layout yang mirror arsitektur Admin Panel. Konsistensi visual dan navigasi antara area konfigurasi app.

## Decisions

| Keputusan | Pilihan | Alasan |
|-----------|---------|--------|
| Layout shell | GlobalHeader + Footer via `(dashboard)` layout | Navigasi global konsisten |
| Background | DottedPattern fullpage breakout | Mirror admin panel |
| Mobile nav | Sheet (slide-in drawer) | Ganti accordion, konsisten dgn admin |
| Route | `(dashboard)/settings/page.tsx` | URL tetap `/settings`, layout gratis |
| "Kembali" button | Dihapus | GlobalHeader sudah cukup |

## Route & Access

- `proxy.ts` hanya cek `ba_session` cookie — semua user yang login bisa akses semua non-public route
- `(dashboard)/layout.tsx` hanya wrap GlobalHeader + Footer — tidak ada role check
- Role check hanya di page level (`/dashboard` cek admin role)
- Settings accessible oleh semua tier/role — aman di `(dashboard)`

## Architecture

### Desktop Layout

```
GlobalHeader
├── DottedPattern bg (w-screen breakout)
│   └── max-w-7xl grid-cols-16
│       ├── Sidebar (col-span-4)
│       │   └── rounded-shell border-hairline bg-card/90 dark:bg-slate-900
│       │       └── "PENGATURAN AKUN" + nav items (Profil, Keamanan, Status)
│       └── Content (col-span-12)
│           └── rounded-shell border-hairline bg-card/90 dark:bg-slate-900
│               ├── Icon + Title + Description (dynamic per tab)
│               └── Active tab content (ProfileTab | SecurityTab | StatusTab)
Footer
```

### Mobile Layout

- Hamburger toggle (SidebarExpand/SidebarCollapse icon) di atas content
- Sheet drawer (slide-in dari kanan) berisi nav items
- Klik item → tutup sheet + switch tab
- Content area full-width single column

### Config Structure

`src/components/settings/settingsConfig.ts`:

```ts
type SettingsTabId = "profile" | "security" | "status"

const SETTINGS_SIDEBAR_ITEMS = [
  { id: "profile", label: "Profil", icon: UserIcon, headerTitle: "Profil", headerDescription: "...", headerIcon: UserIcon },
  { id: "security", label: "Keamanan", icon: Shield, headerTitle: "Keamanan", headerDescription: "...", headerIcon: Shield },
  { id: "status", label: "Status Akun", icon: BadgeCheck, headerTitle: "Status Akun", headerDescription: "...", headerIcon: BadgeCheck },
]
```

## File Changes

| Action | File |
|--------|------|
| DELETE | `src/app/(account)/layout.tsx` |
| DELETE | `src/app/(account)/settings/page.tsx` |
| CREATE | `src/app/(dashboard)/settings/page.tsx` |
| CREATE | `src/components/settings/settingsConfig.ts` |
| CREATE | `src/components/settings/SettingsContainer.tsx` |
| CREATE | `src/components/settings/SettingsSidebar.tsx` |
| CREATE | `src/components/settings/SettingsContentSection.tsx` |
| KEEP | `src/components/settings/ProfileTab.tsx` |
| KEEP | `src/components/settings/SecurityTab.tsx` |
| KEEP | `src/components/settings/StatusTab.tsx` |

## Reference Components (Mirror)

| Settings Component | Admin Mirror |
|-------------------|-------------|
| SettingsContainer | AdminPanelContainer |
| SettingsSidebar | AdminSidebar + AdminMobileSidebar |
| SettingsContentSection | AdminContentSection |
| settingsConfig.ts | adminPanelConfig.ts |
