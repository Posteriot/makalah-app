# Admin Panel

Area admin panel untuk route `/dashboard` (khusus role `admin` dan `superadmin`) serta route turunan `/dashboard/papers`.

## Scope

README ini mendokumentasikan struktur, perilaku, data flow, dependensi, dan audit untuk file berikut:

- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/papers/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/components/admin/AdminContentSection.tsx`
- `src/components/admin/AdminOverviewContent.tsx`
- `src/components/admin/adminPanelConfig.ts`
- `src/components/admin/AdminPanelContainer.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/AIProviderFormDialog.tsx`
- `src/components/admin/AIProviderManager.tsx`
- `src/components/admin/RoleBadge.tsx`
- `src/components/admin/StyleConstitutionManager.tsx`
- `src/components/admin/StyleConstitutionVersionHistoryDialog.tsx`
- `src/components/admin/SystemHealthPanel.tsx`
- `src/components/admin/SystemPromptFormDialog.tsx`
- `src/components/admin/SystemPromptsManager.tsx`
- `src/components/admin/UserList.tsx`
- `src/components/admin/VersionHistoryDialog.tsx`
- `src/components/admin/WaitlistManager.tsx`
- `src/components/admin/WaitlistStatusBadge.tsx`

## Struktur

```txt
app/(dashboard)/
├── layout.tsx                        # Shell dashboard + sync BetterAuth -> Convex
└── dashboard/
    ├── page.tsx                      # Gate admin + entry point admin panel
    └── papers/page.tsx               # Daftar paper sessions

components/admin/
├── adminPanelConfig.ts               # Definisi tab + metadata header
├── AdminPanelContainer.tsx           # Shell admin (background, sidebar, content)
├── AdminSidebar.tsx                  # Sidebar desktop + sheet mobile
├── AdminContentSection.tsx           # Router konten berdasarkan activeTab
├── AdminOverviewContent.tsx          # Ringkasan sistem/user/tier
├── UserList.tsx                      # Manajemen role user + delete user
├── RoleBadge.tsx                     # Badge role
├── SystemHealthPanel.tsx             # Monitoring fallback + alert system
├── SystemPromptsManager.tsx          # CRUD/activate/deactivate prompt
├── SystemPromptFormDialog.tsx        # Form create/edit prompt
├── VersionHistoryDialog.tsx          # Riwayat versi prompt
├── AIProviderManager.tsx             # CRUD/activate/swap provider config
├── AIProviderFormDialog.tsx          # Form provider + validasi + compatibility
├── StyleConstitutionManager.tsx      # CRUD constitution refrasa + toggle refrasa
├── StyleConstitutionVersionHistoryDialog.tsx # Riwayat versi constitution
├── WaitlistManager.tsx               # Kelola waiting list + bulk invite
├── WaitlistStatusBadge.tsx           # Badge status waitlist
└── README.md                         # Dokumentasi ini
```

## Integrasi

- Entry utama admin ada di `src/app/(dashboard)/dashboard/page.tsx`.
- Page ini validasi auth BetterAuth, ambil token Convex, cek user Convex, lalu cek admin permission via `api.users.checkIsAdmin`.
- Jika lolos, render `AdminPanelContainer`.
- Shell route group `(dashboard)` disediakan oleh `src/app/(dashboard)/layout.tsx` (`GlobalHeader` + `main.dashboard-main` + `Footer`).

## Komponen dan Tanggung Jawab

- `dashboard/page.tsx`
  - Validasi akses dan fallback error UI (auth/token/sync/permission).
  - Menjaga query string saat redirect login (`redirect_url`).
- `layout.tsx`
  - Menyediakan shell layout dashboard (GlobalHeader + main + Footer).
  - User sync dilakukan client-side via `useCurrentUser` hook.
- `dashboard/papers/page.tsx`
  - Wrapper heading + `PaperSessionsContainer`.
- `AdminPanelContainer.tsx`
  - Menyimpan `activeTab` dan state `sidebarOpen` mobile.
  - Query `api.users.listAllUsers` sebagai basis data overview + user management.
  - Menyusun background `DottedPattern`, sidebar, dan content panel.
- `AdminSidebar.tsx`
  - Render nav dari `ADMIN_SIDEBAR_ITEMS`.
  - Desktop sidebar + mobile drawer (`Sheet`).
- `AdminContentSection.tsx`
  - Router konten per tab: `overview`, `users`, `prompts`, `providers`, `refrasa`, `waitlist`, `stats`.
  - Header title/description/icon diambil dari config tab aktif.
- `AdminOverviewContent.tsx`
  - Agregasi user berdasarkan role dan tier.
  - Menyediakan shortcut navigasi cepat ke tab penting.
- `UserList.tsx`
  - Promote/demote berbasis Convex mutation.
  - Delete user via endpoint `POST /api/admin/users/delete`.
  - Policy aksi berbasis role operator (`superadmin`/`admin`).
- `RoleBadge.tsx`
  - Badge visual role (`superadmin/admin/user`).
- `SystemHealthPanel.tsx`
  - Tampilkan fallback mode, active prompt, unresolved alert, history alert.
  - Resolve alert individual dan bulk resolve fallback alert.
- `SystemPromptsManager.tsx`
  - List + create + edit + activate + deactivate + delete chain prompt.
  - Integrasi dialog form dan dialog riwayat versi.
- `SystemPromptFormDialog.tsx`
  - Form create/edit prompt dengan validasi dasar.
  - Update mode menghasilkan versi baru.
- `VersionHistoryDialog.tsx`
  - Menampilkan semua versi prompt dari chain yang sama.
- `AIProviderManager.tsx`
  - List config provider + activate/swap/delete.
  - Reload cache info untuk operator.
- `AIProviderFormDialog.tsx`
  - Form detail provider (primary/fallback), model preset, API key, AI settings.
  - Validasi provider endpoint + verifikasi compatibility fallback tool-calling.
- `StyleConstitutionManager.tsx`
  - CRUD style constitution untuk Refrasa.
  - Toggle global `refrasaEnabled`.
  - Seed default constitution.
- `StyleConstitutionVersionHistoryDialog.tsx`
  - Riwayat versi constitution + delete per versi (non-active).
- `WaitlistManager.tsx`
  - Filter status waitlist, bulk invite, resend invite, delete entry.
  - Integrasi action kirim email undangan.
- `WaitlistStatusBadge.tsx`
  - Badge status `pending/invited/registered`.

## Client dan Server Boundary

Client components (`"use client"`):
- Semua file di `src/components/admin/*` kecuali `adminPanelConfig.ts`.

Server components:
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/papers/page.tsx`

## Perilaku Ringkas

### Akses dan sinkronisasi user

- Jika user belum login, `dashboard/page.tsx` redirect ke sign-in sambil mempertahankan `redirect_url`.
- Jika token Convex gagal, page menampilkan alert konfigurasi.
- Jika user Convex belum ada, page menampilkan alert sinkronisasi.
- Jika user bukan admin/superadmin, page menampilkan alert akses ditolak.
- `layout.tsx` tetap mencoba sync user Convex di background tanpa memblok render jika gagal.

### Navigasi tab admin

- Tab metadata tunggal ada di `ADMIN_SIDEBAR_ITEMS`.
- UI sidebar desktop dan mobile mengambil sumber data yang sama.
- `AdminContentSection` mengikat tab metadata (title/description/icon) dengan konten aktual.

### Pola tabel data dinamis

Komponen `UserList`, `SystemPromptsManager`, `AIProviderManager`, `StyleConstitutionManager`, dan `WaitlistManager` memakai pola yang sama:

- Tabel desktop + tabel mobile terpisah.
- Kolom “dinamis” diputar kiri/kanan dengan `dynamicColumnStart`.
- Action dibungkus tombol icon agar tetap usable di layar sempit.

### Pola dialog konfirmasi

Semua aksi mutasi sensitif (activate/deactivate/delete/promote/demote/invite) memakai `AlertDialog` dengan state lokal:

- target entity disimpan di state (`deleteConfig`, `activatePrompt`, dst).
- loading state men-disable tombol aksi agar idempotent.

## Data dan Konstanta Penting

- `ADMIN_SIDEBAR_ITEMS` (`adminPanelConfig.ts`) sebagai satu sumber konfigurasi tab admin.
- Dynamic column arrays:
  - `DYNAMIC_COLUMNS` (`UserList.tsx`)
  - `PROMPT_DYNAMIC_COLUMNS` (`SystemPromptsManager.tsx`)
  - `PROVIDER_DYNAMIC_COLUMNS` (`AIProviderManager.tsx`)
  - `CONSTITUTION_DYNAMIC_COLUMNS` (`StyleConstitutionManager.tsx`)
  - `WAITLIST_DYNAMIC_COLUMNS` (`WaitlistManager.tsx`)
- Model preset AI provider:
  - `VERCEL_GATEWAY_MODELS`
  - `OPENROUTER_MODELS`
  - keduanya ada di `AIProviderFormDialog.tsx`.

## Styling Ringkas

Pola styling admin panel:

- Shell penuh lebar: `.admin-container` + background `DottedPattern`.
- Surface konsisten: `rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90`.
- Typography custom utility:
  - `text-interface`
  - `text-narrative`
  - `text-signal`
- Interaction utility:
  - `focus-ring`
  - badge utility `rounded-badge`
  - button/input shell utility `rounded-action`

Dokumen styling lengkap (class + token + dependency source) ada di:
- `docs/tailwind-styling-consistency/admin-panel-page/admin-panel-page-style.md`

## Dependencies

Backend/data:
- `convex/react`
- `convex/nextjs`
- `@convex/_generated/api`
- `@convex/_generated/dataModel`

Auth:
- `@/lib/auth-server` (BetterAuth server utilities)

UI & util:
- `iconoir-react`
- `sonner`
- `date-fns`
- `@/components/ui/*` (alert, alert-dialog, dialog, sheet, button, input, label, textarea, select, separator, switch, badge, card)
- `@/components/marketing/SectionBackground` (`DottedPattern`)

Shared shell:
- `src/components/layout/header/GlobalHeader.tsx`
- `src/components/layout/footer/Footer.tsx`
- `src/components/paper/PaperSessionsContainer.tsx` (khusus `/dashboard/papers`)

## Audit Temuan (Task 1)

1. Tab `Statistik` sudah tampil di sidebar tapi kontennya masih placeholder “coming soon”.
- Bukti: `src/components/admin/adminPanelConfig.ts:74`, `src/components/admin/AdminContentSection.tsx:74`, `src/components/admin/AdminContentSection.tsx:88`.

2. Header `dashboard/papers` hardcoded ke palet gelap (`bg-slate-900/50`, `text-slate-100`, `text-slate-400`) sehingga kurang konsisten dengan token theme umum.
- Bukti: `src/app/(dashboard)/dashboard/papers/page.tsx:6`, `src/app/(dashboard)/dashboard/papers/page.tsx:7`, `src/app/(dashboard)/dashboard/papers/page.tsx:8`.

3. Preset model AI provider ditulis hardcoded dalam file komponen, sehingga maintenance cepat usang saat daftar model provider berubah.
- Bukti: `src/components/admin/AIProviderFormDialog.tsx:43`, `src/components/admin/AIProviderFormDialog.tsx:81`.

4. Beberapa data manager masih load keseluruhan list tanpa pagination/virtualization di level UI admin (berpotensi berat saat data membesar).
- Bukti: `src/components/admin/AdminPanelContainer.tsx:24`, `src/components/admin/SystemPromptsManager.tsx:67`, `src/components/admin/AIProviderManager.tsx:75`, `src/components/admin/StyleConstitutionManager.tsx:84`, `src/components/admin/WaitlistManager.tsx:66`.

## Daftar File Terkait

- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/papers/page.tsx`
- `src/components/admin/adminPanelConfig.ts`
- `src/components/admin/AdminPanelContainer.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/AdminContentSection.tsx`
- `src/components/admin/AdminOverviewContent.tsx`
- `src/components/admin/UserList.tsx`
- `src/components/admin/RoleBadge.tsx`
- `src/components/admin/SystemHealthPanel.tsx`
- `src/components/admin/SystemPromptsManager.tsx`
- `src/components/admin/SystemPromptFormDialog.tsx`
- `src/components/admin/VersionHistoryDialog.tsx`
- `src/components/admin/AIProviderManager.tsx`
- `src/components/admin/AIProviderFormDialog.tsx`
- `src/components/admin/StyleConstitutionManager.tsx`
- `src/components/admin/StyleConstitutionVersionHistoryDialog.tsx`
- `src/components/admin/WaitlistManager.tsx`
- `src/components/admin/WaitlistStatusBadge.tsx`
- `src/components/marketing/SectionBackground/DottedPattern.tsx`
- `src/components/layout/header/GlobalHeader.tsx`
- `src/components/layout/footer/Footer.tsx`
- `src/components/paper/PaperSessionsContainer.tsx`
- `src/app/globals.css`
