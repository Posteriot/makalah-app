# Admin Panel Page - Styling Extraction

Tanggal: 11 Februari 2026  
Scope: Seluruh CSS/Tailwind class, utility custom, inline style, dan token yang aktif di area Dashboard (Admin Panel), termasuk shared component yang dipakai langsung oleh halaman.

Source files utama:
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

Source files shared/dependensi styling:
- `src/components/marketing/SectionBackground/DottedPattern.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/card.tsx`
- `src/app/globals.css`
- `src/components/layout/header/GlobalHeader.tsx`
- `src/components/layout/footer/Footer.tsx`
- `src/components/paper/PaperSessionsContainer.tsx`

---

## 1. Metode Ekstraksi (Best Practice)

Metode yang dipakai untuk memastikan coverage styling tetap akurat walau file besar:

1. Tetapkan boundary render dari route admin (`layout` + `dashboard/page` + `dashboard/papers/page`) lalu turunkan ke seluruh komponen admin yang dirender dinamis via tab.
2. Petakan dependency styling langsung (shared background, shared ui, shell layout, dan container turunan seperti `PaperSessionsContainer`).
3. Lakukan inventory class secara gabungan:
   - pembacaan kode manual per file,
   - ekstraksi string class mentah dengan regex dari semua file scope,
   - validasi silang antara hasil manual vs output ekstraksi.
4. Trace utility custom yang muncul di komponen (`text-interface`, `rounded-shell`, `focus-ring`, dll) ke definisi di `globals.css`.
5. Trace semantic class (`bg-background`, `text-foreground`, `border-border`, dll) ke token `:root` dan `.dark` di `globals.css`.
6. Catat inline style non-Tailwind (gradient, mask, background pattern) karena tetap memengaruhi render.
7. Tutup dengan checklist coverage file-by-file + lampiran inventory raw agar bisa diaudit ulang.

Metode ini repeatable dan aman untuk section besar karena ada bukti ekstraksi otomatis, bukan observasi visual saja.

---

## 2. Checklist Eksekusi

- [x] C1. Finalisasi peta file + dependency styling admin panel
- [x] C2. Audit perilaku/logic tiap file target
- [x] C3. Tulis `src/components/admin/README.md`
- [x] C4. Ekstraksi styling lengkap + token mapping
- [x] C5. Tulis `docs/tailwind-styling-consistency/admin-panel-page/admin-panel-page-style.md`
- [x] C6. Review silang coverage + bukti source/dependency

---

## 3. Dependency Styling Map

| Layer | File | Peran Styling |
|------|------|------|
| Route shell | `src/app/(dashboard)/layout.tsx` | Wrapper `dashboard-main`, integrasi `GlobalHeader` + `Footer` |
| Route gate | `src/app/(dashboard)/dashboard/page.tsx` | Alert state auth/error, container fallback |
| Route page | `src/app/(dashboard)/dashboard/papers/page.tsx` | Hero card papers + mount `PaperSessionsContainer` |
| Admin shell | `src/components/admin/AdminPanelContainer.tsx` | Full-bleed panel, `DottedPattern`, grid 16-col, mobile sidebar trigger |
| Admin nav | `src/components/admin/AdminSidebar.tsx` | Sidebar desktop + `Sheet` mobile |
| Admin content switch | `src/components/admin/AdminContentSection.tsx` | Surface utama + state placeholder statistik |
| Data panels | `src/components/admin/*.tsx` (overview/users/prompts/providers/refrasa/waitlist) | Semua card/table/dialog/action style admin |
| Shared background | `src/components/marketing/SectionBackground/DottedPattern.tsx` | Dot overlay radial + mask |
| Shared primitives | `src/components/ui/*` | Base style dialog/sheet/button/input/select/switch/alert/badge/card |
| Design tokens | `src/app/globals.css` | Definisi token warna/radius/typography/utilitas custom |
| Shared shell eksternal | `src/components/layout/header/GlobalHeader.tsx`, `src/components/layout/footer/Footer.tsx` | Header/footer global yang selalu ikut di layout dashboard |
| Shared paper | `src/components/paper/PaperSessionsContainer.tsx` | Styling card/skeleton di route `/dashboard/papers` |

---

## 4. Token dan Utility Sumber Utama

### 4.1 Token warna dan semantic alias (`globals.css`)

Token yang paling sering dipakai panel admin:
- Semantic: `--background`, `--foreground`, `--card`, `--muted`, `--muted-foreground`, `--border`, `--ring`.
- Status color: `--destructive`, `--success`, `--warning`, `--info`.
- Palette utilitarian: `--slate-*`, `--amber-*`, `--emerald-*`, `--sky-*`, `--rose-*`.
- Hairline: `--border-hairline`, `--border-hairline-soft`.
- Section alt background: `--section-bg-alt` (dipakai container admin).

Referensi:
- `src/app/globals.css:500`
- `src/app/globals.css:548`
- `src/app/globals.css:631`
- `src/app/globals.css:1258`

### 4.2 Utility custom yang dipakai admin

Utility class custom dari `@layer utilities` yang dipakai luas di admin:
- Typography: `text-narrative`, `text-interface`, `text-signal`
- Radius: `rounded-shell`, `rounded-action`, `rounded-badge`
- Border: `border-hairline`, `border-main`
- Spacing helper: `p-comfort`, `gap-comfort`
- Focus state: `focus-ring`
- Pattern helper: `btn-stripes-pattern`

Referensi:
- `src/app/globals.css:1516`
- `src/app/globals.css:1531`
- `src/app/globals.css:1544`
- `src/app/globals.css:1577`
- `src/app/globals.css:1589`
- `src/app/globals.css:1659`

### 4.3 Layout-specific custom class

- `dashboard-main` dipakai sebagai wrapper utama area dashboard.
- `dashboard-main:has(.admin-container)` override padding saat admin aktif.
- `.admin-container` disiapkan untuk full-width admin shell.

Referensi:
- `src/app/globals.css:1258`
- `src/app/globals.css:1306`
- `src/app/globals.css:1312`

---

## 5. Pola Styling Utama di Admin Panel

### 5.1 Surface pattern konsisten

Pattern card/surface admin yang berulang:
- `rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90`
- Header section: `border-b border-border bg-slate-200/45 ... dark:bg-slate-900/50`
- Table header: `bg-slate-300/70 dark:bg-slate-800/95`
- Left sticky-ish visual lane di tabel: `bg-slate-200/35 ... dark:bg-slate-900/55`

Komponen yang memakai pattern ini:
- `AdminContentSection`, `AdminOverviewContent`, `UserList`, `SystemPromptsManager`, `AIProviderManager`, `StyleConstitutionManager`, `WaitlistManager`, `SystemHealthPanel`.

### 5.2 Typography hierarchy

- Label/heading operational: `text-interface` (mono feel)
- Isi naratif/deskripsi: `text-narrative`
- Signal/label kecil uppercase: `text-signal` + `tracking-*`

### 5.3 Interaction pattern

- Hampir semua tombol actionable memakai `focus-ring`.
- Action icon button diseragamkan `h-8 w-8 rounded-action border-main border border-border` + warna semantic per aksi.
- Status badge dipakai lintas modul dengan style semantic (`emerald`, `amber`, `sky`, `rose`).

### 5.4 Background composition

- Admin shell memakai `DottedPattern` (`spacing=24`, `withRadialMask=false`, `opacity-100`) di `AdminPanelContainer`.
- Footer shell memakai `DiagonalStripes` (shared global footer).
- Route papers pakai card gelap custom (`bg-slate-900/50`) + card/list dari `PaperSessionsContainer`.

---

## 6. Shared Component Styling Source (Wajib)

### 6.1 Shared UI primitives

- `alert-dialog.tsx`: overlay hitam `bg-black/50`, content center modal (`fixed`, `translate`, `rounded-lg`, `shadow-lg`) dan animasi state open/close.
- `dialog.tsx`: struktur modal setara alert-dialog + close button corner.
- `sheet.tsx`: drawer mobile (`side=right` dipakai admin) dengan slide animation.
- `button.tsx`: variant `default/destructive/outline/secondary/ghost/link` via `cva`.
- `input.tsx` dan `textarea.tsx`: border/input/focus/invalid state berbasis token.
- `select.tsx`: trigger/content/item + state animation Radix.
- `switch.tsx`: track/thumb state checked/unchecked berbasis token.
- `alert.tsx`: variant `default/destructive/warning`.
- `badge.tsx`: badge variant generic.
- `card.tsx`: primitive card base.

### 6.2 Shared marketing background

- `DottedPattern.tsx`:
  - base `absolute inset-0 pointer-events-none z-[1]`
  - background radial dots light/dark
  - opsional radial mask + `will-change: mask-image`

### 6.3 Shared layout yang ikut render

- `GlobalHeader.tsx` dan `Footer.tsx` tetap aktif di `(dashboard)/layout.tsx`.
- Untuk detail inventory header/footer, dokumen induk terpisah:
  - `docs/tailwind-styling-consistency/global-header/global-header-style.md`
  - `docs/tailwind-styling-consistency/footer/footer-style.md`

Dokumen ini tetap mencantumkan kelas yang muncul langsung pada file shared tersebut (lihat lampiran raw inventory) sebagai jejak dependensi.

---

## 7. Ringkasan Inventory per Area

### 7.1 Route-level

- `dashboard/page.tsx`: style alert fallback (`max-w-2xl`, `p-6`, `inline-flex`, `rounded-md`, dsb).
- `dashboard/papers/page.tsx`: header card (`rounded-shell`, `border-hairline`, `bg-slate-900/50`, `text-slate-*`).
- `layout.tsx`: wrapper `min-h-screen bg-background text-foreground` + `main.dashboard-main`.

### 7.2 Shell admin

- `AdminPanelContainer.tsx`: `admin-container` full bleed + `max-w-7xl` content + trigger mobile icon button.
- `AdminSidebar.tsx`: sidebar card + active/inactive nav state + mobile `SheetContent`.
- `AdminContentSection.tsx`: panel utama, heading per tab, placeholder statistik.

### 7.3 Panel data admin

- `AdminOverviewContent.tsx`: card metrik + mini bar komposisi role + tier list.
- `UserList.tsx`: tabel desktop/mobile + rotasi kolom + badge/action state.
- `WaitlistManager.tsx`: tabel + filter + bulk invite dialog + status badge.
- `SystemHealthPanel.tsx`: split panel monitoring + history alert.
- `SystemPromptsManager.tsx`: tabel + action prompt + dialog chain.
- `AIProviderManager.tsx`: tabel config provider + action activate/swap/delete.
- `StyleConstitutionManager.tsx`: status refrasa + tabel constitution + form dialog.

### 7.4 Dialog dan badge

- `SystemPromptFormDialog.tsx`, `VersionHistoryDialog.tsx`, `StyleConstitutionVersionHistoryDialog.tsx`, `AIProviderFormDialog.tsx`.
- `RoleBadge.tsx` dan `WaitlistStatusBadge.tsx`.

Semua class mentah per file (termasuk shared) tersedia di lampiran agar bisa di-cross-check ulang.

---

## 8. Dependency Chain (Asal-usul Styling)

1. `src/app/(dashboard)/layout.tsx`
2. `src/components/layout/header/GlobalHeader.tsx`
3. `src/components/layout/footer/Footer.tsx`
4. `src/app/(dashboard)/dashboard/page.tsx`
5. `src/components/admin/AdminPanelContainer.tsx`
6. `src/components/marketing/SectionBackground/DottedPattern.tsx`
7. `src/components/admin/AdminSidebar.tsx` + `src/components/ui/sheet.tsx`
8. `src/components/admin/AdminContentSection.tsx`
9. Semua tab manager/dialog/badge admin
10. Primitive style foundation dari `src/components/ui/*`
11. Token + utility root dari `src/app/globals.css`

Chain ini dipakai untuk memastikan tiap class punya asal yang jelas (komponen langsung vs shared primitive vs token global).

---

## 9. Catatan Akurasi

- Dokumen ini disusun dari pembacaan kode aktual + ekstraksi regex inventory lintas file.
- Karena beberapa komponen shared punya dokumen dedicated sendiri (Global Header/Footer), detail visual mikro pada komponen itu dipertahankan di dokumen dedicated agar tidak duplikasi konflik.
- Untuk audit ulang cepat, lampiran raw inventory bisa dipakai sebagai baseline diff.

---

## 10. Lampiran - Raw Class Inventory (Target + Shared)

Sumber lampiran ini dihasilkan dari ekstraksi string class pada seluruh file scope.

```txt
### src/app/(dashboard)/dashboard/papers/page.tsx
5:    <div className="space-y-6">
6:      <div className="rounded-shell border border-hairline bg-slate-900/50 p-4">
7:        <h1 className="text-interface text-2xl font-bold tracking-tight text-slate-100">Paper Sessions</h1>
8:        <p className="text-slate-400 mt-1">

### src/app/(dashboard)/dashboard/page.tsx
50:      <div className="max-w-2xl mx-auto p-6">
52:          <WarningCircle className="h-4 w-4" />
69:      <div className="max-w-2xl mx-auto p-6">
71:          <WarningCircle className="h-4 w-4" />
79:              className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
96:      <div className="max-w-2xl mx-auto p-6">
98:          <WarningCircle className="h-4 w-4" />

### src/app/(dashboard)/layout.tsx
50:      console.error("[ensureConvexUser] currentUser failed:", error)
82:    console.error("[ensureConvexUser] Sync failed:", error)
94:    <div className="min-h-screen bg-background text-foreground">
96:      <main className="dashboard-main">{children}</main>

### src/components/admin/AdminContentSection.tsx
33:    <main className="col-span-1 pt-4 md:col-span-12">
34:      <div className="mx-auto w-full max-w-4xl rounded-shell border-hairline bg-card/90 px-5 py-6 backdrop-blur-[1px] dark:bg-slate-900 md:px-8">
35:        <div className="mb-6 space-y-2">
36:          <h1 className="text-narrative flex items-center gap-2 text-2xl font-medium tracking-tight text-foreground md:text-3xl">
37:            <HeaderIcon className="h-6 w-6 text-foreground" />
40:          <p className="text-narrative text-sm text-muted-foreground">
54:          <div className="space-y-6">
61:          <div className="space-y-6">
67:          <div className="space-y-6">
75:          <div className="rounded-shell border-main border border-border bg-card/60">
76:            <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
77:              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-shell border-main border border-border bg-card">
78:                <StatsReport className="h-7 w-7 text-muted-foreground" />
80:              <h3 className="text-interface mb-2 text-base font-medium text-foreground">
83:              <p className="text-narrative mb-4 max-w-md text-sm text-muted-foreground">
87:              <span className="text-signal rounded-badge border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 text-[10px] font-bold text-sky-500">

### src/components/admin/AdminOverviewContent.tsx
36:    <div className="space-y-4">
37:      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
38:        <div className="rounded-shell border-main border border-border bg-card/90 p-4 dark:bg-slate-900/90">
39:          <div className="flex items-start justify-between">
41:              <p className="text-signal text-[10px] font-bold tracking-wider text-muted-foreground">
44:              <div className="mt-1.5 flex items-center gap-2">
45:                <span className="rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
49:              <p className="text-narrative mt-2 text-xs text-muted-foreground">
53:            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
58:            className="focus-ring text-signal mt-3 inline-flex items-center gap-1.5 rounded-action px-1 py-1 text-[10px] font-bold tracking-wider text-muted-foreground transition-colors hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-800"
60:            <Page className="h-4 w-4" />
65:        <div className="rounded-shell border-main border border-border bg-card/90 p-4 dark:bg-slate-900/90">
66:          <div className="flex items-start justify-between">
68:              <p className="text-signal text-[10px] font-bold tracking-wider text-muted-foreground">
71:              <p className="text-interface mt-1 text-2xl font-medium text-foreground">
74:              <p className="text-narrative mt-1 text-xs text-muted-foreground">
78:            <Group className="h-5 w-5 text-muted-foreground" />
83:            className="focus-ring text-interface mt-3 inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
85:            <Settings className="h-3.5 w-3.5" />
91:      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
92:        <div className="border-b border-border bg-slate-200/45 px-4 py-3 dark:bg-slate-900/50">
93:          <div className="flex items-center justify-between">
94:            <h2 className="text-interface text-base font-medium text-foreground">
97:            <span className="text-signal text-[10px] font-bold tracking-wide text-muted-foreground">
103:        <div className="p-4">
104:          <div className="relative mb-3 h-2 overflow-hidden rounded-full bg-muted">
108:                  className="absolute inset-y-0 left-0 bg-rose-500"
112:                  className="absolute inset-y-0 bg-amber-500"
119:                  className="absolute inset-y-0 bg-slate-500"
129:          <div className="grid grid-cols-3 gap-3 text-xs">
130:            <div className="flex items-center gap-2 rounded-action border-main border border-border bg-card/70 px-3 py-2 dark:bg-slate-900/70">
131:              <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
132:              <div className="text-narrative">
133:                <span className="font-medium text-foreground">{superadminCount}</span>
134:                <span className="ml-1 text-muted-foreground">Super</span>
137:            <div className="flex items-center gap-2 rounded-action border-main border border-border bg-card/70 px-3 py-2 dark:bg-slate-900/70">
138:              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
139:              <div className="text-narrative">
140:                <span className="font-medium text-foreground">{adminCount}</span>
141:                <span className="ml-1 text-muted-foreground">Admin</span>
144:            <div className="flex items-center gap-2 rounded-action border-main border border-border bg-card/70 px-3 py-2 dark:bg-slate-900/70">
145:              <div className="h-2.5 w-2.5 rounded-full bg-slate-500" />
146:              <div className="text-narrative">
147:                <span className="font-medium text-foreground">{userCount}</span>
148:                <span className="ml-1 text-muted-foreground">User</span>
155:      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
156:        <div className="border-b border-border bg-slate-200/45 px-4 py-3 dark:bg-slate-900/50">
157:          <h2 className="text-interface text-base font-medium text-foreground">
161:        <div className="divide-y divide-border">
162:          <div className="flex items-center justify-between px-4 py-3">
163:            <div className="flex items-center gap-3">
164:              <span className="rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
167:              <span className="text-narrative text-xs text-muted-foreground">
171:            <span className="text-interface text-sm font-medium text-foreground">
175:          <div className="flex items-center justify-between px-4 py-3">
176:            <div className="flex items-center gap-3">
177:              <span className="rounded-badge border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-500">
180:              <span className="text-narrative text-xs text-muted-foreground">
184:            <span className="text-interface text-sm font-medium text-foreground">
188:          <div className="flex items-center justify-between px-4 py-3">
189:            <div className="flex items-center gap-3">
190:              <span className="rounded-badge border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500">
193:              <span className="text-narrative text-xs text-muted-foreground">
197:            <span className="text-interface text-sm font-medium text-foreground">
204:      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
205:        <div className="border-b border-border bg-slate-200/45 px-4 py-3 dark:bg-slate-900/50">
206:          <h3 className="text-interface text-base font-medium text-foreground">
210:        <div className="p-4">
211:          <ul className="space-y-2 text-sm text-muted-foreground">
212:            <li className="flex items-start gap-2">
213:              <span className="text-signal text-[10px] font-bold text-muted-foreground">
217:                <strong className="text-foreground">User Management:</strong>{" "}
221:            <li className="flex items-start gap-2">
222:              <span className="text-signal text-[10px] font-bold text-muted-foreground">
226:                <strong className="text-foreground">System Prompts:</strong>{" "}
230:            <li className="flex items-start gap-2">
231:              <span className="text-signal text-[10px] font-bold text-muted-foreground">
235:                <strong className="text-foreground">AI Providers:</strong>{" "}
239:            <li className="flex items-start gap-2">
240:              <span className="text-signal text-[10px] font-bold text-muted-foreground">
244:                <strong className="text-foreground">Refrasa:</strong> Kelola style
248:            <li className="flex items-start gap-2">
249:              <span className="text-signal text-[10px] font-bold text-muted-foreground">
253:                <strong className="text-foreground">Statistik:</strong> Pantau
258:          <div className="mt-4 flex items-center gap-2 rounded-action border-main border border-border bg-card px-3 py-2 dark:bg-slate-900">
259:            <Cpu className="h-4 w-4 text-muted-foreground" />
260:            <p className="text-narrative text-xs text-muted-foreground">
264:          <div className="mt-2 flex items-center gap-2 rounded-action border-main border border-border bg-card px-3 py-2 dark:bg-slate-900">
265:            <StatsReport className="h-4 w-4 text-muted-foreground" />
266:            <p className="text-narrative text-xs text-muted-foreground">

### src/components/admin/adminPanelConfig.ts
83:export type AdminTabId = (typeof ADMIN_SIDEBAR_ITEMS)[number]["id"]

### src/components/admin/AdminPanelContainer.tsx
22:  const [activeTab, setActiveTab] = useState<AdminTabId>("overview")
28:      <div className="admin-container relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-[color:var(--section-bg-alt)]">
29:        <div className="animate-pulse space-y-4 p-6">
30:          <div className="h-8 w-1/3 rounded bg-muted" />
31:          <div className="h-64 rounded bg-muted" />
38:    <div className="admin-container relative isolate left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[color:var(--section-bg-alt)]">
39:      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />
40:      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-6 lg:px-8">
41:        <div className="md:hidden flex justify-end py-3">
46:            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-action p-1 text-foreground transition-colors hover:text-foreground/70"
49:              <SidebarCollapse className="h-7 w-7" strokeWidth={1.5} />
51:              <SidebarExpand className="h-7 w-7" strokeWidth={1.5} />
56:        <div className="grid grid-cols-1 gap-comfort pb-2 md:grid-cols-16">

### src/components/admin/AdminSidebar.tsx
22:    <nav className="space-y-6">
24:        <h3 className="text-signal text-[10px] font-bold text-muted-foreground">
27:        <ul className="mt-3 space-y-1">
41:                    "text-interface flex w-full items-center gap-3 rounded-action px-3 py-2 text-sm transition-colors",
43:                      ? "bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100"
44:                      : "text-muted-foreground hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-500 dark:hover:text-slate-50"
47:                  <Icon className="h-4 w-4 shrink-0" />
48:                  <span className="flex-1 truncate text-left">
51:                  {isActive && <NavArrowRight className="h-4 w-4 shrink-0" />}
64:    <aside className="hidden md:col-span-4 md:block">
65:      <div className="mt-4 rounded-shell border-hairline bg-card/90 p-comfort backdrop-blur-[1px] dark:bg-slate-900">
80:      <SheetContent side="right" className="w-72 p-0">
81:        <SheetHeader className="border-b border-border px-5 py-4 pr-12">
82:          <SheetTitle className="text-interface font-mono text-sm font-medium text-foreground">
86:        <div className="overflow-y-auto px-5 py-5">

### src/components/admin/AIProviderFormDialog.tsx
45:  { value: "gemini-2.5-flash-lite", label: "Google Gemini 2.5 Flash Lite" },
49:  { value: "gemini-2.0-flash-lite", label: "Google Gemini 2.0 Flash Lite" },
83:  { value: "google/gemini-2.5-flash-lite", label: "Google Gemini 2.5 Flash Lite" },
86:  { value: "google/gemini-2.0-flash-001", label: "Google Gemini 2.0 Flash" },
87:  { value: "google/gemini-2.0-flash-lite-001", label: "Google Gemini 2.0 Flash Lite" },
209:  const [primaryProvider, setPrimaryProvider] = useState("vercel-gateway")
210:  const [primaryModel, setPrimaryModel] = useState("gemini-2.5-flash-lite")
211:  const [primaryModelPreset, setPrimaryModelPreset] = useState("gemini-2.5-flash-lite")
214:  const [fallbackProvider, setFallbackProvider] = useState("openrouter")
215:  const [fallbackModel, setFallbackModel] = useState("google/gemini-2.5-flash-lite")
216:  const [fallbackModelPreset, setFallbackModelPreset] = useState("google/gemini-2.5-flash-lite")
230:  const [fallbackWebSearchEngine, setFallbackWebSearchEngine] = useState("auto")
237:  const [primaryValidation, setPrimaryValidation] = useState<"idle" | "success" | "error">("idle")
238:  const [fallbackValidation, setFallbackValidation] = useState<"idle" | "success" | "error">("idle")
285:        setPrimaryModel("gemini-2.5-flash-lite") // Vercel Gateway format
286:        setPrimaryModelPreset("gemini-2.5-flash-lite")
288:        setFallbackModel("google/gemini-2.5-flash-lite") // OpenRouter format
289:        setFallbackModelPreset("google/gemini-2.5-flash-lite")
621:      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
633:        <form onSubmit={handleSubmit} className="space-y-6">
635:          <div className="space-y-4">
636:            <div className="space-y-2">
638:                Nama Config <span className="text-destructive">*</span>
649:            <div className="space-y-2">
665:          <div className="space-y-4">
666:            <div className="flex items-center justify-between">
667:              <h3 className="text-lg font-semibold">Primary Provider</h3>
669:                <div className="flex items-center gap-2">
671:                    <div className="flex items-center gap-1 text-green-600 text-sm">
672:                      <CheckCircle className="h-4 w-4" />
677:                    <div className="flex items-center gap-1 text-destructive text-sm">
678:                      <XmarkCircle className="h-4 w-4" />
686:            <div className="grid grid-cols-2 gap-4">
687:              <div className="space-y-2">
703:              <div className="space-y-2">
721:              <div className="space-y-2">
733:            <div className="flex justify-end">
741:                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
752:          <div className="space-y-4">
753:            <div className="flex items-center justify-between">
754:              <h3 className="text-lg font-semibold">Fallback Provider</h3>
756:                <div className="flex items-center gap-2">
758:                    <div className="flex items-center gap-1 text-green-600 text-sm">
759:                      <CheckCircle className="h-4 w-4" />
764:                    <div className="flex items-center gap-1 text-destructive text-sm">
765:                      <XmarkCircle className="h-4 w-4" />
773:            <div className="grid grid-cols-2 gap-4">
774:              <div className="space-y-2">
790:              <div className="space-y-2">
808:              <div className="space-y-2">
820:            <div className="flex justify-end">
828:                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
837:              <div className="space-y-3 pt-2">
838:                <div className="flex items-center gap-2">
844:                    className="w-full"
848:                        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
853:                        <Shield className="h-4 w-4 mr-2" />
861:                  <p className="text-xs text-muted-foreground">
872:                    compatibilityResult.compatibility.level === "full" ? "border-green-500 bg-green-50 dark:bg-green-950" :
873:                    compatibilityResult.compatibility.level === "partial" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950" : ""
876:                      <ShieldCheck className="h-4 w-4 text-green-600" />
879:                      <WarningTriangle className="h-4 w-4 text-yellow-600" />
882:                      <ShieldXmark className="h-4 w-4" />
884:                    <AlertTitle className="flex items-center gap-2">
888:                      <span className="text-xs font-normal text-muted-foreground">
893:                      <div className="grid grid-cols-2 gap-2 text-sm">
895:                          <div key={feature} className="flex items-center gap-2">
897:                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
899:                              <XmarkCircle className="h-3.5 w-3.5 text-red-500" />
901:                            <span className={supported ? "" : "text-muted-foreground"}>{feature}</span>
905:                      <p className="mt-2 text-xs text-muted-foreground">
918:          <div className="space-y-4">
919:            <h3 className="text-lg font-semibold">Kunci Provider</h3>
920:            <p className="text-sm text-muted-foreground">
924:            <div className="space-y-4">
925:              <div className="space-y-2">
938:                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
939:                    <div className="space-y-1">
940:                      <p className="text-sm font-medium">Pakai ENV</p>
941:                      <p className="text-xs text-muted-foreground">
950:              <div className="space-y-2">
963:                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
964:                    <div className="space-y-1">
965:                      <p className="text-sm font-medium">Pakai ENV</p>
966:                      <p className="text-xs text-muted-foreground">
980:          <div className="space-y-4">
981:            <h3 className="text-lg font-semibold">AI Settings</h3>
983:            <div className="grid grid-cols-3 gap-4">
984:              <div className="space-y-2">
986:                  Temperature (0-2) <span className="text-destructive">*</span>
1000:              <div className="space-y-2">
1017:              <div className="space-y-2">
1038:          <div className="space-y-4">
1039:            <h3 className="text-lg font-semibold">Web Search Settings</h3>
1040:            <p className="text-sm text-muted-foreground">
1044:            <div className="space-y-4">
1046:              <div className="flex items-center justify-between rounded-lg border p-4">
1047:                <div className="space-y-0.5">
1048:                  <Label htmlFor="primaryWebSearchEnabled" className="text-base">
1051:                  <p className="text-sm text-muted-foreground">
1064:              <div className="flex items-center justify-between rounded-lg border p-4">
1065:                <div className="space-y-0.5">
1066:                  <Label htmlFor="fallbackWebSearchEnabled" className="text-base">
1069:                  <p className="text-sm text-muted-foreground">
1083:                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
1084:                  <div className="space-y-2">
1100:                    <p className="text-xs text-muted-foreground">
1105:                  <div className="space-y-2">
1116:                    <p className="text-xs text-muted-foreground">

### src/components/admin/AIProviderManager.tsx
207:    <div className="flex flex-col items-start gap-1">
208:      <span className="text-narrative text-xs font-medium capitalize text-foreground">
211:      <span className="inline-flex items-center rounded-badge border border-border bg-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-700 dark:bg-slate-700 dark:text-slate-100">
218:    <div className="flex items-center justify-center gap-1">
220:        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-muted-foreground transition-colors hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-800"
224:        <EditPencil className="h-4 w-4" />
227:        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-sky-600 transition-colors hover:bg-slate-200 dark:text-sky-400 dark:hover:bg-slate-800"
231:        <DataTransferBoth className="h-4 w-4" />
235:          className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-action border-main border border-border text-emerald-500/45 dark:text-emerald-400/45"
239:          <SwitchOn className="h-4 w-4" />
244:            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-emerald-600 transition-colors hover:bg-slate-200 dark:text-emerald-400 dark:hover:bg-slate-800"
248:            <SwitchOn className="h-4 w-4" />
251:            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
255:            <Trash className="h-4 w-4" />
276:        <span className="text-interface font-mono text-xs text-foreground">
284:        <span className="inline-flex items-center rounded-badge border border-border bg-slate-200 px-2.5 py-1 text-[10px] font-bold tracking-wide text-slate-700 uppercase dark:bg-slate-700 dark:text-slate-100">
292:        <span className="inline-flex items-center rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
296:        <span className="inline-flex items-center rounded-badge border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-600 uppercase dark:text-amber-400">
304:        <span className="text-narrative text-xs text-muted-foreground">
315:      <div className="rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
316:        <div className="p-6">
317:          <div className="animate-pulse space-y-4">
318:            <div className="h-8 w-1/3 rounded bg-muted" />
319:            <div className="h-64 rounded bg-muted" />
328:      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
329:        <div className="border-b border-border px-4 py-4 md:px-6">
330:          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
331:            <div className="space-y-1">
332:              <div className="flex items-center gap-2">
333:                <Settings className="h-4 w-4 text-muted-foreground" />
334:                <h3 className="text-interface text-sm font-semibold text-foreground">
338:              <p className="text-narrative text-xs text-muted-foreground">
343:            <div className="flex flex-wrap gap-2">
345:                className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border px-3 py-1.5 text-xs font-mono text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
348:                <Refresh className="h-4 w-4" />
352:                className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
355:                <Plus className="h-4 w-4" />
362:        <div className="hidden md:block">
363:          <table className="text-interface w-full table-fixed border-collapse text-left text-sm">
364:            <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
366:                <th className="text-signal h-12 w-[26%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
369:                <th className="h-12 w-[8%] border-l border-border bg-slate-200/75 px-2 py-2 dark:bg-slate-900/85">
370:                  <div className="flex items-center justify-center gap-1">
375:                      className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
377:                      <NavArrowLeft className="h-4 w-4" />
383:                      className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
385:                      <NavArrowRight className="h-4 w-4" />
392:                    className="text-signal h-12 w-[22%] px-4 py-3 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
399:            <tbody className="divide-y divide-border">
402:                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
403:                    <div className="flex flex-col items-center gap-2">
404:                      <Settings className="h-8 w-8 opacity-20" />
405:                      <span className="text-narrative">
414:                  <tr key={config._id} className="group transition-colors hover:bg-muted/50">
415:                    <td className="bg-slate-200/35 px-4 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
416:                      <div className="text-narrative font-medium text-foreground">
420:                        <div className="text-narrative mt-0.5 line-clamp-2 text-xs text-muted-foreground">
425:                    <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-2 py-3 group-hover:from-slate-300/65 group-hover:to-muted/40 dark:from-slate-900/80 dark:to-slate-900/40 dark:group-hover:from-slate-800/95 dark:group-hover:to-slate-800/50" />
427:                      <td key={`${config._id}-${column.key}`} className="px-4 py-3 text-center align-top">
428:                        <div className="inline-flex items-center justify-center">
440:        <div className="md:hidden">
441:          <table className="text-interface w-full table-fixed border-collapse text-left text-xs">
442:            <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
444:                <th className="text-signal h-11 w-[44%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
447:                <th className="h-11 w-[18%] border-l border-border bg-slate-200/75 px-1 py-1 dark:bg-slate-900/85">
448:                  <div className="flex items-center justify-center gap-1">
453:                      className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
455:                      <NavArrowLeft className="h-4 w-4" />
461:                      className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
463:                      <NavArrowRight className="h-4 w-4" />
470:                    className="text-signal h-11 w-[38%] px-2 py-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
477:            <tbody className="divide-y divide-border">
480:                  <td colSpan={3} className="py-10 text-center text-muted-foreground">
481:                    <div className="flex flex-col items-center gap-2">
482:                      <Settings className="h-8 w-8 opacity-20" />
483:                      <span className="text-narrative">
492:                  <tr key={config._id} className="group transition-colors hover:bg-muted/50">
493:                    <td className="bg-slate-200/35 px-2 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
494:                      <div className="text-narrative text-xs font-medium text-foreground">
498:                        <div className="text-narrative mt-1 line-clamp-2 text-[11px] text-muted-foreground">
503:                    <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-1 py-3 dark:from-slate-900/80 dark:to-slate-900/40" />
505:                      <td key={`${config._id}-mobile-${column.key}`} className="px-2 py-3 text-center align-top">
506:                        <div className="inline-flex items-center justify-center">
518:        <div className="border-t border-border bg-slate-200/25 p-4 dark:bg-slate-900/25 md:p-6">
519:          <div className="flex items-start gap-3">
520:            <Settings className="mt-0.5 h-4 w-4 text-muted-foreground" />
521:            <div className="space-y-1">
522:              <span className="text-interface block text-sm font-medium text-foreground">
525:              <p className="text-narrative text-xs leading-relaxed text-muted-foreground">
611:              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"

### src/components/admin/RoleBadge.tsx
14:      className: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
18:      className: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
23:        "border border-border bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100",
32:        "inline-flex items-center px-2.5 py-1 rounded-badge text-[10px] font-mono font-bold uppercase tracking-wide",

### src/components/admin/StyleConstitutionManager.tsx
323:    <div className="flex items-center justify-center gap-1">
328:        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-muted-foreground transition-colors hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-800"
330:        <EditPencil className="h-4 w-4" />
336:        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-sky-600 transition-colors hover:bg-slate-200 dark:text-sky-400 dark:hover:bg-slate-800"
338:        <ClockRotateRight className="h-4 w-4" />
345:          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
347:          <SwitchOff className="h-4 w-4" />
355:            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-emerald-600 transition-colors hover:bg-slate-200 dark:text-emerald-400 dark:hover:bg-slate-800"
357:            <SwitchOn className="h-4 w-4" />
363:            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
365:            <Trash className="h-4 w-4" />
378:        <span className="inline-flex items-center rounded-badge border border-border bg-slate-200 px-2.5 py-1 text-[10px] font-bold tracking-wide text-slate-700 uppercase dark:bg-slate-700 dark:text-slate-100">
386:        <span className="inline-flex items-center rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
390:        <span className="inline-flex items-center rounded-badge border border-slate-500/30 bg-slate-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-slate-600 uppercase dark:text-slate-300">
398:        <span className="text-narrative text-xs text-muted-foreground">
406:        <span className="text-narrative text-xs text-muted-foreground">
417:      <div className="rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
418:        <div className="p-6">
419:          <div className="animate-pulse space-y-4">
420:            <div className="h-8 w-1/3 rounded bg-muted" />
421:            <div className="h-64 rounded bg-muted" />
431:      <div className="mb-4 overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
432:        <div className="border-b border-border bg-slate-200/45 px-4 py-3 dark:bg-slate-900/50">
433:          <h3 className="text-interface flex items-center gap-2 text-base font-medium text-foreground">
434:            <Settings className="h-4 w-4 text-muted-foreground" />
439:          <div className="flex items-center justify-between gap-4">
440:            <div className="space-y-1">
441:              <Label htmlFor="refrasa-toggle" className="text-sm font-medium">
444:              <p className="text-xs text-muted-foreground">
456:            <div className="mt-3 rounded-action border border-amber-500/30 bg-amber-500/10 p-2">
457:              <p className="text-xs text-amber-700 dark:text-amber-300">
466:      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
467:        <div className="border-b border-border px-4 py-4 md:px-6">
468:          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
469:            <div className="space-y-1">
470:              <h3 className="text-interface flex items-center gap-2 text-sm font-semibold text-foreground">
471:                <Journal className="h-4 w-4 text-muted-foreground" />
474:              <p className="text-narrative text-xs text-muted-foreground">
481:              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
483:              <Plus className="h-4 w-4" />
489:        <div className="p-4 md:p-6">
491:          <div className="mb-4 flex items-start gap-2 rounded-action border border-sky-500/30 bg-sky-500/10 p-3">
492:            <InfoCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600 dark:text-sky-400" />
493:            <p className="text-sm text-sky-700 dark:text-sky-300">
500:            <div className="rounded-shell border-main border border-border bg-card/80 px-4 py-10 text-center dark:bg-slate-900/80">
501:              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
502:                <WarningCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
504:              <h3 className="text-interface mb-2 text-lg font-semibold text-foreground">
507:              <p className="text-narrative mx-auto mb-6 max-w-md text-sm text-muted-foreground">
510:              <div className="flex flex-col justify-center gap-3 sm:flex-row">
515:                  className="focus-ring inline-flex h-8 items-center justify-center gap-1.5 rounded-action border-main border border-border bg-card px-3 py-1.5 text-xs font-mono text-foreground transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-900 dark:hover:bg-slate-800"
517:                  <Download className="h-4 w-4" />
523:                  className="focus-ring inline-flex h-8 items-center justify-center gap-1.5 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
525:                  <Plus className="h-4 w-4" />
531:            <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
532:              <div className="hidden md:block">
533:                <table className="text-interface w-full table-fixed border-collapse text-left text-sm">
534:                  <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
536:                      <th className="text-signal h-12 w-[36%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
539:                      <th className="h-12 w-[8%] border-l border-border bg-slate-200/75 px-2 py-2 dark:bg-slate-900/85">
540:                        <div className="flex items-center justify-center gap-1">
545:                            className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
547:                            <NavArrowLeft className="h-4 w-4" />
553:                            className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
555:                            <NavArrowRight className="h-4 w-4" />
562:                          className="text-signal h-12 w-[28%] px-4 py-3 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
569:                  <tbody className="divide-y divide-border">
571:                      <tr key={constitution._id} className="group transition-colors hover:bg-muted/50">
572:                        <td className="bg-slate-200/35 px-4 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
573:                          <div className="text-narrative font-medium text-foreground">
577:                            <div className="text-narrative mt-0.5 break-words text-xs text-muted-foreground">
582:                        <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-2 py-3 group-hover:from-slate-300/65 group-hover:to-muted/40 dark:from-slate-900/80 dark:to-slate-900/40 dark:group-hover:from-slate-800/95 dark:group-hover:to-slate-800/50" />
584:                          <td key={`${constitution._id}-${column.key}`} className="px-4 py-3 text-center align-top">
585:                            <div className="inline-flex items-center justify-center">
596:              <div className="md:hidden">
597:                <table className="text-interface w-full table-fixed border-collapse text-left text-xs">
598:                  <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
600:                      <th className="text-signal h-11 w-[44%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
603:                      <th className="h-11 w-[18%] border-l border-border bg-slate-200/75 px-1 py-1 dark:bg-slate-900/85">
604:                        <div className="flex items-center justify-center gap-1">
609:                            className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
611:                            <NavArrowLeft className="h-4 w-4" />
617:                            className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
619:                            <NavArrowRight className="h-4 w-4" />
626:                          className="text-signal h-11 w-[38%] px-2 py-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
633:                  <tbody className="divide-y divide-border">
635:                      <tr key={constitution._id} className="group transition-colors hover:bg-muted/50">
636:                        <td className="bg-slate-200/35 px-2 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
637:                          <div className="text-narrative text-xs font-medium text-foreground">
641:                            <div className="text-narrative mt-1 break-words text-[11px] text-muted-foreground">
646:                        <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-1 py-3 dark:from-slate-900/80 dark:to-slate-900/40" />
648:                          <td key={`${constitution._id}-mobile-${column.key}`} className="px-2 py-3 text-center align-top">
649:                            <div className="inline-flex items-center justify-center">
663:            <p className="text-narrative mt-4 text-xs text-muted-foreground">
675:        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
689:          <form onSubmit={handleFormSubmit} className="space-y-4">
691:              <div className="space-y-2">
703:            <div className="space-y-2">
714:            <div className="space-y-2">
722:                className="font-mono text-sm"
725:              <p className="text-xs text-muted-foreground">
821:              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"

### src/components/admin/StyleConstitutionVersionHistoryDialog.tsx
101:      <DialogContent className="max-w-4xl max-h-[90vh]">
107:          <div className="animate-pulse space-y-4">
108:            <div className="h-32 bg-muted rounded"></div>
109:            <div className="h-32 bg-muted rounded"></div>
112:          <p className="text-center text-muted-foreground py-8">
116:          <div className="max-h-[70vh] overflow-y-auto pr-4 space-y-4">
121:                className={version.isActive ? "border-green-500" : ""}
124:                  <div className="flex items-center justify-between">
125:                    <CardTitle className="text-base flex items-center gap-2">
128:                        <Badge variant="default" className="bg-green-600">
133:                    <div className="flex items-center gap-3">
134:                      <div className="text-sm text-muted-foreground">
143:                        className="text-destructive hover:text-destructive"
145:                        <Trash className="h-4 w-4" />
150:                    <p className="text-sm text-muted-foreground">
156:                  <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md overflow-x-auto max-h-[300px] overflow-y-auto">
183:              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"

### src/components/admin/SystemHealthPanel.tsx
66:        return <WarningCircle className="h-4 w-4 text-destructive" />
68:        return <WarningTriangle className="h-4 w-4 text-yellow-500" />
70:        return <InfoCircle className="h-4 w-4 text-blue-500" />
77:      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
78:        <div className="border-b border-border bg-slate-200/45 px-6 py-5 dark:bg-slate-900/50">
79:          <div className="flex items-center gap-2">
80:            <Refresh className="h-4 w-4 animate-spin text-muted-foreground" />
81:            <h3 className="text-interface text-sm font-semibold text-foreground">System Health</h3>
84:        <div className="p-6">
85:          <div className="animate-pulse space-y-4">
86:            <div className="h-20 bg-muted rounded"></div>
87:            <div className="h-32 bg-muted rounded"></div>
98:    <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
99:      <div className="border-b border-border bg-slate-200/45 px-6 py-5 dark:bg-slate-900/50">
100:        <div className="flex items-start justify-between gap-3">
102:            <div className="flex items-center gap-2 mb-1">
104:                <WarningCircle className="h-4 w-4 text-destructive" />
106:                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
108:              <h3 className="text-interface text-sm font-semibold text-foreground">System Health Monitoring</h3>
110:            <p className="text-xs text-muted-foreground">
115:            <span className="inline-flex items-center px-2.5 py-1 rounded-badge text-[10px] font-mono font-bold uppercase tracking-wide bg-destructive text-white animate-pulse">
122:      <div className="p-0">
123:        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-border">
125:          <div className="p-6 md:p-10 flex flex-col h-full">
126:            <h4 className="text-signal text-[10px] font-bold text-slate-500 mb-8 flex items-center gap-2">
127:              <Refresh className="h-3 w-3" />
131:            <div className="flex-1">
133:                <div className="space-y-4">
134:                  <div className="flex items-center gap-2">
135:                    <WarningCircle className="h-5 w-5 text-destructive" />
136:                    <span className="font-bold text-destructive text-lg">FALLBACK MODE AKTIF</span>
138:                  <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
142:                    <div className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded inline-block">
148:                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-action border border-hairline text-xs font-mono text-slate-300 hover:bg-slate-800 disabled:opacity-50 focus-ring"
153:                        <Refresh className="h-4 w-4 animate-spin" />
155:                        <CheckCircle className="h-4 w-4" />
162:                <div className="space-y-6">
163:                  <div className="flex items-center gap-3">
164:                    <CheckCircle className="h-6 w-6 text-success" />
165:                    <span className="font-bold text-success text-xl uppercase tracking-tight">Normal</span>
169:                    <div className="space-y-6">
170:                      <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-4 text-sm">
171:                        <span className="text-muted-foreground font-medium border-r border-border/10 pr-2">Database Prompt</span>
172:                        <span className="text-foreground font-semibold uppercase">{activePrompt.name}</span>
174:                        <span className="text-muted-foreground font-medium border-r border-border/10 pr-2">Versi Sistem</span>
175:                        <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded w-fit border border-border/50">v{activePrompt.version}</span>
177:                        <span className="text-muted-foreground font-medium border-r border-border/10 pr-2">Update Terakhir</span>
178:                        <span className="text-foreground text-xs">
186:                      <p className="text-[11px] text-muted-foreground opacity-60 leading-relaxed italic border-t border-border/10 pt-4">
197:          <div className="p-6 md:p-10 flex flex-col h-full bg-accent/[0.01]">
198:            <h4 className="text-signal text-[10px] font-bold text-slate-500 mb-8 flex items-center gap-2">
199:              <WarningTriangle className="h-3 w-3" />
203:            <div className="flex-1 overflow-hidden">
205:                <div className="space-y-6 overflow-y-auto pr-3 max-h-[400px] scrollbar-thin scrollbar-thumb-accent">
210:                        "group relative flex items-start gap-4 transition-all pb-6 border-b border-border/5 last:border-0",
211:                        alert.resolved ? "opacity-30" : "opacity-100"
215:                      <div className="space-y-2 flex-1 min-w-0">
216:                        <div className="flex items-center gap-2 flex-wrap">
217:                          <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-[0.2em] bg-muted/40 px-1.5 py-0.5 rounded">
221:                            <span className="text-[9px] text-success font-bold flex items-center gap-1 border border-success/30 px-1.5 rounded bg-success/[0.02]">
226:                        <p className="text-foreground text-sm leading-relaxed break-words">{alert.message}</p>
227:                        <span className="text-[10px] text-muted-foreground block font-medium">
237:                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 inline-flex items-center justify-center h-8 w-8 rounded-action border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800 hover:border-border focus-ring"
242:                            <Refresh className="h-3.5 w-3.5 animate-spin" />
244:                            <CheckCircle className="h-3.5 w-3.5" />
252:                <div className="flex flex-col items-center justify-center p-12 text-center h-full opacity-10 border-2 border-dashed rounded-xl border-border">
253:                  <CheckCircle className="h-16 w-16 mb-4" />
254:                  <p className="text-lg font-bold tracking-widest">CLEAR</p>
255:                  <p className="text-xs">Sistem beroperasi tanpa anomali.</p>

### src/components/admin/SystemPromptFormDialog.tsx
125:      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
139:        <form onSubmit={handleSubmit} className="space-y-4">
141:            <div className="space-y-2">
153:          <div className="space-y-2">
164:          <div className="space-y-2">
172:              className="font-mono text-sm"
175:            <p className="text-xs text-muted-foreground">

### src/components/admin/SystemPromptsManager.tsx
186:    <div className="flex items-center justify-center gap-1">
191:        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-muted-foreground transition-colors hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-800"
193:        <EditPencil className="h-4 w-4" />
199:        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-sky-600 transition-colors hover:bg-slate-200 dark:text-sky-400 dark:hover:bg-slate-800"
201:        <ClockRotateRight className="h-4 w-4" />
208:          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
210:          <SwitchOff className="h-4 w-4" />
218:            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-emerald-600 transition-colors hover:bg-slate-200 dark:text-emerald-400 dark:hover:bg-slate-800"
220:            <SwitchOn className="h-4 w-4" />
226:            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
228:            <Trash className="h-4 w-4" />
241:        <span className="inline-flex items-center rounded-badge border border-border bg-slate-200 px-2.5 py-1 text-[10px] font-bold tracking-wide text-slate-700 uppercase dark:bg-slate-700 dark:text-slate-100">
249:        <span className="inline-flex items-center rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
253:        <span className="inline-flex items-center rounded-badge border border-slate-500/30 bg-slate-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-slate-600 uppercase dark:text-slate-300">
261:        <span className="text-narrative text-xs text-muted-foreground">
269:        <span className="text-narrative text-xs text-muted-foreground">
280:      <div className="rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
281:        <div className="p-6">
282:          <div className="animate-pulse space-y-4">
283:            <div className="h-8 w-1/3 rounded bg-muted" />
284:            <div className="h-64 rounded bg-muted" />
293:      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
294:        <div className="border-b border-border px-4 py-4 md:px-6">
295:          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
296:            <div className="space-y-1">
297:              <div className="flex items-center gap-2">
298:                <Page className="h-4 w-4 text-muted-foreground" />
299:                <h3 className="text-interface text-sm font-semibold text-foreground">
303:              <p className="text-narrative text-xs text-muted-foreground">
310:              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
312:              <Plus className="h-4 w-4" />
318:        <div className="hidden md:block">
319:          <table className="text-interface w-full table-fixed border-collapse text-left text-sm">
320:            <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
322:                <th className="text-signal h-12 w-[36%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
325:                <th className="h-12 w-[8%] border-l border-border bg-slate-200/75 px-2 py-2 dark:bg-slate-900/85">
326:                  <div className="flex items-center justify-center gap-1">
331:                      className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
333:                      <NavArrowLeft className="h-4 w-4" />
339:                      className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
341:                      <NavArrowRight className="h-4 w-4" />
348:                    className="text-signal h-12 w-[28%] px-4 py-3 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
355:            <tbody className="divide-y divide-border">
358:                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
364:                  <tr key={prompt._id} className="group transition-colors hover:bg-muted/50">
365:                    <td className="bg-slate-200/35 px-4 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
366:                      <div className="text-narrative font-medium text-foreground">
370:                        <div className="text-narrative mt-0.5 line-clamp-2 text-xs text-muted-foreground">
375:                    <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-2 py-3 group-hover:from-slate-300/65 group-hover:to-muted/40 dark:from-slate-900/80 dark:to-slate-900/40 dark:group-hover:from-slate-800/95 dark:group-hover:to-slate-800/50" />
377:                      <td key={`${prompt._id}-${column.key}`} className="px-4 py-3 text-center align-top">
378:                        <div className="inline-flex items-center justify-center">
390:        <div className="md:hidden">
391:          <table className="text-interface w-full table-fixed border-collapse text-left text-xs">
392:            <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
394:                <th className="text-signal h-11 w-[44%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
397:                <th className="h-11 w-[18%] border-l border-border bg-slate-200/75 px-1 py-1 dark:bg-slate-900/85">
398:                  <div className="flex items-center justify-center gap-1">
403:                      className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
405:                      <NavArrowLeft className="h-4 w-4" />
411:                      className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
413:                      <NavArrowRight className="h-4 w-4" />
420:                    className="text-signal h-11 w-[38%] px-2 py-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
427:            <tbody className="divide-y divide-border">
430:                  <td colSpan={3} className="py-10 text-center text-muted-foreground">
436:                  <tr key={prompt._id} className="group transition-colors hover:bg-muted/50">
437:                    <td className="bg-slate-200/35 px-2 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
438:                      <div className="text-narrative text-xs font-medium text-foreground">
442:                        <div className="text-narrative mt-1 line-clamp-2 text-[11px] text-muted-foreground">
447:                    <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-1 py-3 dark:from-slate-900/80 dark:to-slate-900/40" />
449:                      <td key={`${prompt._id}-mobile-${column.key}`} className="px-2 py-3 text-center align-top">
450:                        <div className="inline-flex items-center justify-center">
462:        <div className="border-t border-border bg-slate-200/25 p-4 dark:bg-slate-900/25 md:p-6">
463:          <p className="text-narrative text-xs text-muted-foreground">
550:              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"

### src/components/admin/UserList.tsx
180:      if (user.role === "user") return ["promote", "delete"]
181:      if (user.role === "admin") return ["demote", "delete"]
186:      return ["delete"]
209:          className="focus-ring inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-action border-main border border-border px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
213:          <ArrowUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
222:          className="focus-ring inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-action border-main border border-border px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
226:          <ArrowDown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
232:    return <span className="text-narrative text-muted-foreground">-</span>
239:        className="focus-ring inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-action border-main border border-border px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
243:          <Trash className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
249:    return <span className="text-narrative text-muted-foreground">-</span>
261:          className="focus-ring inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-action border-main border border-border text-emerald-600 transition-colors hover:bg-slate-200 dark:text-emerald-400 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
263:          <ArrowUp className="h-4 w-4" />
275:          className="focus-ring inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-action border-main border border-border text-amber-600 transition-colors hover:bg-slate-200 dark:text-amber-400 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
277:          <ArrowDown className="h-4 w-4" />
282:    return <span className="text-muted-foreground">-</span>
293:          className="focus-ring inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-action border-main border border-border text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
295:          <Trash className="h-4 w-4" />
300:    return <span className="text-muted-foreground">-</span>
319:        <span className="inline-flex items-center rounded-badge border border-border bg-slate-200 px-2.5 py-1 text-[10px] font-bold tracking-wide text-slate-700 uppercase dark:bg-slate-700 dark:text-slate-100">
327:        <span className="inline-flex items-center rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
331:        <span className="inline-flex items-center rounded-badge border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-600 uppercase dark:text-amber-400">
346:      <span className="inline-flex items-center rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
350:      <span className="inline-flex items-center rounded-badge border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-600 uppercase dark:text-amber-400">
358:      <div className="hidden overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 md:block">
359:        <table className="text-interface w-full table-fixed border-collapse text-left text-sm">
360:          <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
362:              <th className="text-signal h-12 w-[16%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">Nama</th>
363:              <th className="text-signal h-12 w-[20%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">Email</th>
364:              <th className="h-12 w-[6%] border-l border-border bg-slate-200/75 px-2 py-2 dark:bg-slate-900/85">
365:                <div className="flex items-center justify-center gap-1">
370:                    className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
372:                    <NavArrowLeft className="h-4 w-4" />
378:                    className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
380:                    <NavArrowRight className="h-4 w-4" />
387:                  className="text-signal h-12 w-[16%] px-4 py-3 text-center text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase"
394:          <tbody className="divide-y divide-border">
397:                <td colSpan={5} className="text-narrative py-10 text-center text-muted-foreground">
403:                <tr key={user._id} className="group transition-colors hover:bg-muted/50">
404:                  <td className="text-narrative bg-slate-200/35 px-4 py-3 text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">{getFullName(user)}</td>
405:                  <td className="text-narrative break-all bg-slate-200/35 px-4 py-3 text-muted-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">{user.email}</td>
406:                  <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-2 py-3 group-hover:from-slate-300/65 group-hover:to-muted/40 dark:from-slate-900/80 dark:to-slate-900/40 dark:group-hover:from-slate-800/95 dark:group-hover:to-slate-800/50" />
408:                    <td colSpan={2} className="px-4 py-3 text-center">
409:                      <span className="text-narrative inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] tracking-wide text-slate-500 dark:text-slate-400">
410:                        <NoAccessIcon className="h-3.5 w-3.5 text-rose-500" />
416:                      <td key={`${user._id}-${column.key}`} className="px-4 py-3 text-center">
417:                        <div className="inline-flex items-center justify-center">
430:      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 md:hidden">
431:        <table className="text-interface w-full table-fixed border-collapse text-left text-xs">
432:          <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
434:              <th className="text-signal h-11 w-[28%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">
437:              <th className="text-signal h-11 w-[36%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">
440:              <th className="h-11 w-[16%] border-l border-border bg-slate-200/75 px-1 py-1 dark:bg-slate-900/85">
441:                <div className="flex items-center justify-center gap-1">
446:                    className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
448:                    <NavArrowLeft className="h-4 w-4" />
454:                    className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
456:                    <NavArrowRight className="h-4 w-4" />
463:                  className="text-signal h-11 w-[20%] px-2 py-2 text-center text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase"
470:          <tbody className="divide-y divide-border">
473:                <td colSpan={4} className="text-narrative py-10 text-center text-muted-foreground">
479:                <tr key={user._id} className="group transition-colors hover:bg-muted/50">
480:                  <td className="text-narrative bg-slate-200/35 px-2 py-3 align-top text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
483:                  <td className="text-narrative break-all bg-slate-200/35 px-2 py-3 align-top text-muted-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
486:                  <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-1 py-3 dark:from-slate-900/80 dark:to-slate-900/40" />
488:                    <td key={`${user._id}-mobile-${column.key}`} className="px-2 py-3 text-center align-top">
489:                      <div className="inline-flex items-center justify-center">
493:                              <span className="inline-flex items-center justify-center text-rose-500">
494:                                <NoAccessIcon className="h-4 w-4" />
501:                                <span className="inline-flex items-center justify-center text-rose-500">
502:                                  <NoAccessIcon className="h-4 w-4" />

### src/components/admin/VersionHistoryDialog.tsx
57:      <DialogContent className="max-w-4xl max-h-[90vh]">
63:          <div className="animate-pulse space-y-4">
64:            <div className="h-32 bg-muted rounded"></div>
65:            <div className="h-32 bg-muted rounded"></div>
68:          <p className="text-center text-muted-foreground py-8">
72:          <div className="max-h-[70vh] overflow-y-auto pr-4 space-y-4">
77:                className={version.isActive ? "border-green-500" : ""}
80:                  <div className="flex items-center justify-between">
81:                    <CardTitle className="text-base flex items-center gap-2">
84:                        <Badge variant="default" className="bg-green-600">
89:                    <div className="text-sm text-muted-foreground">
94:                    <p className="text-sm text-muted-foreground">
100:                  <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md overflow-x-auto max-h-[300px] overflow-y-auto">

### src/components/admin/WaitlistManager.tsx
56:  const [selectedIds, setSelectedIds] = useState<Set<Id<"waitlistEntries">>>(
61:  const [deleteEntryId, setDeleteEntryId] = useState<Id<"waitlistEntries"> | null>(
79:  const pendingEntries = entries?.filter((e) => e.status === "pending") ?? []
226:    <div className="flex items-center justify-center gap-1">
232:          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-sky-600 transition-colors hover:bg-slate-200 dark:text-sky-400 dark:hover:bg-slate-800"
234:          <Refresh className="h-4 w-4" />
241:        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
243:        <Trash className="h-4 w-4" />
260:        <div className="text-center">
261:          <div className="text-narrative text-xs text-muted-foreground">
265:            <div className="text-signal mt-1 text-[10px] text-muted-foreground">
278:      <div className="animate-pulse space-y-4">
279:        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
280:          <div className="h-20 rounded-shell bg-muted" />
281:          <div className="h-20 rounded-shell bg-muted" />
282:          <div className="h-20 rounded-shell bg-muted" />
283:          <div className="h-20 rounded-shell bg-muted" />
285:        <div className="h-56 rounded-shell bg-muted" />
291:    <div className="space-y-4">
292:      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
293:        <div className="rounded-shell border-main border border-border bg-card/90 p-3 dark:bg-slate-900/90">
294:          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
295:            <Group className="h-3.5 w-3.5" />
296:            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">Total</span>
298:          <p className="text-interface text-xl font-mono font-semibold text-foreground">{stats.total}</p>
300:        <div className="rounded-shell border-main border border-border bg-card/90 p-3 dark:bg-slate-900/90">
301:          <div className="mb-1 flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
302:            <Clock className="h-3.5 w-3.5" />
303:            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">Menunggu</span>
305:          <p className="text-interface text-xl font-mono font-semibold text-foreground">{stats.pending}</p>
307:        <div className="rounded-shell border-main border border-border bg-card/90 p-3 dark:bg-slate-900/90">
308:          <div className="mb-1 flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
309:            <Send className="h-3.5 w-3.5" />
310:            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">Diundang</span>
312:          <p className="text-interface text-xl font-mono font-semibold text-foreground">{stats.invited}</p>
314:        <div className="rounded-shell border-main border border-border bg-card/90 p-3 dark:bg-slate-900/90">
315:          <div className="mb-1 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
316:            <CheckCircle className="h-3.5 w-3.5" />
317:            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">Terdaftar</span>
319:          <p className="text-interface text-xl font-mono font-semibold text-foreground">{stats.registered}</p>
323:      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
324:        <div className="flex items-center gap-2">
325:          <span className="text-signal text-xs font-mono text-muted-foreground">Filter:</span>
335:            className="focus-ring h-8 rounded-action border-main border border-border bg-card px-3 text-xs font-mono text-foreground dark:bg-slate-900"
349:            className="focus-ring inline-flex h-8 items-center gap-2 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-100 transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
352:              <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
354:              <Mail className="h-3.5 w-3.5" />
361:      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
362:        <div className="hidden md:block">
363:          <table className="text-interface w-full table-fixed border-collapse text-left text-sm">
364:            <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
366:                <th className="h-12 w-[8%] bg-slate-200/75 px-3 py-2 text-left dark:bg-slate-900/85">
375:                    className="h-3.5 w-3.5 rounded border-border bg-card dark:bg-slate-900"
378:                <th className="text-signal h-12 w-[34%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
381:                <th className="h-12 w-[8%] border-l border-border bg-slate-200/75 px-2 py-2 dark:bg-slate-900/85">
382:                  <div className="flex items-center justify-center gap-1">
387:                      className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
389:                      <NavArrowLeft className="h-4 w-4" />
395:                      className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
397:                      <NavArrowRight className="h-4 w-4" />
404:                    className="text-signal h-12 w-[25%] px-4 py-3 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
411:            <tbody className="divide-y divide-border">
414:                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
420:                  <tr key={entry._id} className="group transition-colors hover:bg-muted/50">
421:                    <td className="bg-slate-200/35 px-3 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
427:                        className="h-3.5 w-3.5 rounded border-border bg-card disabled:opacity-30 dark:bg-slate-900"
430:                    <td className="bg-slate-200/35 px-4 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
431:                      <span className="text-narrative break-all text-xs font-mono text-foreground">
435:                    <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-2 py-3 group-hover:from-slate-300/65 group-hover:to-muted/40 dark:from-slate-900/80 dark:to-slate-900/40 dark:group-hover:from-slate-800/95 dark:group-hover:to-slate-800/50" />
437:                      <td key={`${entry._id}-${column.key}`} className="px-4 py-3 text-center align-top">
438:                        <div className="inline-flex items-center justify-center">
450:        <div className="md:hidden">
451:          <table className="text-interface w-full table-fixed border-collapse text-left text-xs">
452:            <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
454:                <th className="h-11 w-[10%] bg-slate-200/75 px-2 py-2 text-left dark:bg-slate-900/85">
463:                    className="h-3.5 w-3.5 rounded border-border bg-card dark:bg-slate-900"
466:                <th className="text-signal h-11 w-[34%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
469:                <th className="h-11 w-[18%] border-l border-border bg-slate-200/75 px-1 py-1 dark:bg-slate-900/85">
470:                  <div className="flex items-center justify-center gap-1">
475:                      className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
477:                      <NavArrowLeft className="h-4 w-4" />
483:                      className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
485:                      <NavArrowRight className="h-4 w-4" />
492:                    className="text-signal h-11 w-[38%] px-2 py-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
499:            <tbody className="divide-y divide-border">
502:                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
508:                  <tr key={entry._id} className="group transition-colors hover:bg-muted/50">
509:                    <td className="bg-slate-200/35 px-2 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
515:                        className="h-3.5 w-3.5 rounded border-border bg-card disabled:opacity-30 dark:bg-slate-900"
518:                    <td className="bg-slate-200/35 px-2 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
519:                      <span className="text-narrative break-all text-[11px] font-mono text-foreground">
523:                    <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-1 py-3 dark:from-slate-900/80 dark:to-slate-900/40" />
525:                      <td key={`${entry._id}-mobile-${column.key}`} className="px-2 py-3 text-center align-top">
526:                        <div className="inline-flex items-center justify-center">
575:              className="bg-rose-500 text-white hover:bg-rose-600 font-mono text-xs"

### src/components/admin/WaitlistStatusBadge.tsx
11:    className: "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400",
15:    className: "border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-400",
19:    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
33:        "inline-flex items-center rounded-badge border px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase",

### src/components/marketing/SectionBackground/DottedPattern.tsx
42:        "absolute inset-0 pointer-events-none z-[1]",
44:        "dark:[background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)]",
46:        "[background-image:radial-gradient(rgba(0,0,0,0.12)_1px,transparent_1px)]",
48:        withRadialMask && "[will-change:mask-image]",

### src/components/ui/alert-dialog.tsx
39:        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
57:          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
73:      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
87:        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
102:      className={cn("text-lg font-semibold", className)}
115:      className={cn("text-muted-foreground text-sm", className)}

### src/components/ui/dialog.tsx
41:        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
63:          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg",
72:            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
75:            <span className="sr-only">Close</span>
87:      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
98:        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
113:      className={cn("text-lg leading-none font-semibold", className)}
126:      className={cn("text-muted-foreground text-sm", className)}

### src/components/ui/sheet.tsx
39:        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
61:          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
63:            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
65:            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
67:            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
69:            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
75:        <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
77:          <span className="sr-only">Close</span>
88:      className={cn("flex flex-col gap-1.5 p-4", className)}
98:      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
111:      className={cn("text-foreground font-semibold", className)}
124:      className={cn("text-muted-foreground text-sm", className)}

### src/components/ui/button.tsx
8:  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
12:        default: "bg-primary text-primary-foreground hover:bg-primary/90",
14:          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
16:          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
18:          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
20:          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
21:        link: "text-primary underline-offset-4 hover:underline",
24:        default: "h-9 px-4 py-2 has-[>svg]:px-3",
25:        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
26:        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",

### src/components/ui/input.tsx
11:        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
12:        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
13:        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",

### src/components/ui/label.tsx
16:        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",

### src/components/ui/textarea.tsx
10:        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",

### src/components/ui/select.tsx
40:        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
47:        <NavArrowDown className="size-4 opacity-50" />
56:  position = "item-aligned",
65:          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
67:            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
77:            "p-1",
79:              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
97:      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
112:        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
118:        data-slot="select-item-indicator"
119:        className="absolute right-2 flex size-3.5 items-center justify-center"
137:      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
149:      data-slot="select-scroll-up-button"
151:        "flex cursor-default items-center justify-center py-1",
169:        "flex cursor-default items-center justify-center py-1",

### src/components/ui/separator.tsx
20:        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",

### src/components/ui/switch.tsx
16:        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
22:        data-slot="switch-thumb"
24:          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"

### src/components/ui/alert.tsx
7:  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
11:        default: "bg-card text-card-foreground",
13:          "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
15:          "border-amber-500/50 bg-amber-500/10 text-amber-500 [&>svg]:text-amber-500 *:data-[slot=alert-description]:text-amber-400/90",
44:        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
60:        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",

### src/components/ui/badge.tsx
8:  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
13:          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
15:          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
17:          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
19:          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",

### src/components/ui/card.tsx
10:        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
23:        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
35:      className={cn("leading-none font-semibold", className)}
45:      className={cn("text-muted-foreground text-sm", className)}
56:        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
78:      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}

### src/app/globals.css
2:@import "tw-animate-css";
1382:  .sidebar-nav-item[data-state="active"] {
1388:  .sidebar-nav-item[data-state="active"]::before {
1417:  .content-panel[data-state="inactive"] {
1456:  .sidebar-nav-item[data-state="active"]::before {
1729:[class*="cl-footer"],
1730:[class*="cl-internal"],
1731:[class*="footer"] [class*="cl-"] {
2015:[data-virtuoso-scroller="true"] {
2020:[data-virtuoso-scroller="true"]::-webkit-scrollbar {
2024:[data-virtuoso-scroller="true"]::-webkit-scrollbar-track {
2028:[data-virtuoso-scroller="true"]::-webkit-scrollbar-thumb {
2033:[data-virtuoso-scroller="true"]::-webkit-scrollbar-thumb:hover {

### src/components/layout/header/GlobalHeader.tsx
55:  gratis: { className: "bg-segment-gratis text-white" },
56:  bpp: { className: "bg-segment-bpp text-white" },
57:  pro: { className: "bg-segment-pro text-white" },
168:        "fixed top-0 left-0 right-0 z-drawer h-[54px] bg-[var(--header-background)]",
169:        "flex items-center transition-transform duration-200",
170:        isHidden && "-translate-y-full"
174:      <div className="mx-auto grid w-full max-w-7xl grid-cols-16 items-center gap-4 px-4 py-3 lg:px-8">
176:        <div className="col-span-8 md:col-span-4 flex items-center gap-dense flex-nowrap">
177:          <Link href="/" className="flex items-center gap-3 shrink-0">
184:              className="h-6 w-6 rounded-[4px] hidden dark:block"
192:              className="h-6 w-6 rounded-[4px] block dark:hidden"
196:              src="/logo-makalah-ai-white.svg"
200:              className="h-[18px] w-auto hidden dark:block"
204:              src="/logo-makalah-ai-black.svg"
208:              className="h-[18px] w-auto block dark:hidden"
214:              <RefreshDouble className="icon-interface animate-spin text-muted-foreground" />
226:        <div className="col-span-8 md:col-span-12 flex items-center justify-end gap-comfort">
228:          <nav className="hidden md:flex items-center gap-4">
236:                    "relative px-2.5 py-1.5 text-narrative text-xs uppercase",
237:                    "text-foreground transition-colors hover:text-muted-foreground",
238:                    "after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-1",
239:                    "after:border-b after:border-dotted after:border-current after:scale-x-0 after:origin-left after:transition-transform",
240:                    "hover:after:scale-x-100",
241:                    isActive && "text-muted-foreground after:scale-x-100"
255:                "group relative overflow-hidden",
257:                "md:hidden inline-flex h-6 w-6 items-center justify-center rounded-action mr-2",
259:                "border border-transparent bg-slate-800 text-slate-100",
261:                "hover:text-slate-800 hover:border-slate-600",
263:                "dark:bg-slate-100 dark:text-slate-800",
265:                "dark:hover:text-slate-100 dark:hover:border-slate-400",
267:                "transition-colors focus-ring"
275:              <span className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0" aria-hidden="true" />
277:              <span className="relative z-10">
279:                  <SunLight className="h-3.5 w-3.5" />
281:                  <HalfMoon className="h-3.5 w-3.5" />
290:            className="md:hidden inline-flex h-9 w-9 items-center justify-center text-foreground transition-opacity hover:opacity-70"
308:                "group relative overflow-hidden",
310:                "hidden md:inline-flex h-7.5 w-7.5 items-center justify-center rounded-action",
312:                "border border-transparent bg-slate-800 text-slate-100",
314:                "hover:text-slate-800 hover:border-slate-600",
316:                "dark:bg-slate-100 dark:text-slate-800",
318:                "dark:hover:text-slate-100 dark:hover:border-slate-400",
320:                "transition-colors focus-ring"
326:              <span className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0" aria-hidden="true" />
328:              <SunLight className="relative z-10 icon-interface block dark:hidden" />
329:              <HalfMoon className="relative z-10 icon-interface hidden dark:block" />
337:              className="hidden md:inline-flex items-center justify-center gap-2 rounded-action border-main border-slate-950 bg-slate-950 px-2 py-1 text-xs font-medium text-narrative uppercase text-slate-50 transition-colors hover:bg-slate-900 dark:border-slate-50 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200 focus-ring"
344:            <div className="hidden md:block">
354:        <nav className="absolute top-full left-0 right-0 md:hidden flex flex-col bg-background border-b border-hairline p-4">
363:                  "block px-3 py-2 text-narrative text-[11px] uppercase tracking-wider rounded-action",
364:                  "text-foreground hover:bg-accent transition-colors",
365:                  isActive && "text-muted-foreground"
378:              className="mt-2 inline-flex items-center justify-center rounded-action border-main border-border px-3 py-2 text-signal text-[11px] font-bold uppercase tracking-widest text-foreground hover:bg-accent transition-colors"
387:            <div className="mt-3 rounded-shell border-hairline bg-slate-100 dark:bg-slate-900 p-3">
389:                <AccordionItem value="user" className="border-none">
390:                  <AccordionTrigger className="p-0 hover:no-underline">
391:                    <div className="flex items-center gap-3 w-full text-left px-2 py-2 rounded-action hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
392:                      <div className={cn("h-7 w-7 rounded-action flex items-center justify-center text-[12px] font-semibold", segmentConfig.className)}>
395:                      <span className="text-narrative text-[11px] font-medium text-foreground flex-1">
404:                      className="w-full flex items-center gap-3 px-2 py-2 text-[11px] text-narrative text-foreground rounded-action hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
412:                      className="w-full flex items-center gap-3 px-2 py-2 text-[11px] text-narrative text-foreground rounded-action hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
422:                        className="w-full flex items-center gap-3 px-2 py-2 text-[11px] text-narrative text-foreground rounded-action hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
434:                        "w-full flex items-center gap-3 px-2 py-2 text-[11px] text-narrative rounded-action transition-colors",
436:                          ? "text-muted-foreground cursor-not-allowed"
437:                          : "text-rose-500 hover:bg-rose-500/10"
442:                        <RefreshDouble className="icon-interface animate-spin" />

### src/components/layout/footer/Footer.tsx
33:    <div id="footer" className="bg-background text-foreground">
34:      <footer className="relative overflow-hidden bg-[color:var(--footer-background)]">
36:        <DiagonalStripes className="opacity-40" />
39:        <div className="relative z-[1] mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
41:          <div className="mb-10 grid grid-cols-16 gap-comfort text-center md:mb-16">
43:            <div className="col-span-16 flex items-center justify-center md:col-span-4 md:items-start md:justify-start">
50:                className="hidden dark:block"
58:                className="block dark:hidden"
63:            <div className="col-span-16 grid grid-cols-1 justify-items-center gap-comfort md:col-span-7 md:col-start-10 md:grid-cols-3 md:items-start md:justify-items-center">
65:              <div className="text-center md:text-left">
66:                <h4 className="text-narrative mb-3 text-[14px] font-medium text-foreground">
73:                    className="text-narrative mb-3 block text-[14px] font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground"
81:              <div className="text-center md:text-left">
82:                <h4 className="text-narrative mb-3 text-[14px] font-medium text-foreground">
89:                    className="text-narrative mb-3 block text-[14px] font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground"
97:              <div className="text-center md:text-left">
98:                <h4 className="text-narrative mb-3 text-[14px] font-medium text-foreground">
105:                    className="text-narrative mb-3 block text-[14px] font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground"
114:          <div className="h-[0.5px] w-full bg-[color:var(--border-hairline)]" />
117:          <div className="flex flex-col items-center gap-6 pt-6 text-center md:flex-row md:justify-between md:text-left">
118:            <p className="text-interface m-0 text-[12px] text-muted-foreground">
121:            <div className="flex justify-center gap-6">
129:                  className="flex items-center justify-center text-muted-foreground transition-colors duration-300 hover:text-foreground"

### src/components/paper/PaperSessionsContainer.tsx
16:  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
17:  const [sortBy, setSortBy] = useState<SortBy>("updatedAt")
43:      <div className="text-center py-12 text-slate-500 rounded-shell border border-hairline bg-slate-900/50">
74:    <div className="space-y-4 rounded-shell border border-hairline bg-slate-900/50 p-4">
76:      <div className="flex gap-2">
77:        <Skeleton className="h-9 w-20" />
78:        <Skeleton className="h-9 w-28" />
79:        <Skeleton className="h-9 w-24" />
80:        <Skeleton className="h-9 w-24" />
84:      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
86:          <div key={i} className="border border-hairline rounded-shell p-6 space-y-4 bg-slate-900/40">
87:            <Skeleton className="h-5 w-3/4" />
88:            <Skeleton className="h-4 w-1/2" />
89:            <div className="flex gap-2">
90:              <Skeleton className="h-6 w-16" />
91:              <Skeleton className="h-6 w-12" />
93:            <div className="flex gap-2 pt-2">
94:              <Skeleton className="h-9 w-24" />
95:              <Skeleton className="h-9 w-9" />

```
