# User Settings Page - Styling Extraction

Tanggal: 11 Februari 2026  
Scope: Seluruh CSS/Tailwind class, utility custom, inline style, dan design token yang terimplementasi pada halaman user settings (`/settings`) termasuk shared component yang dipakai langsung.

Source files utama:
- `src/app/(account)/layout.tsx`
- `src/app/(account)/settings/page.tsx`
- `src/components/settings/ProfileTab.tsx`
- `src/components/settings/SecurityTab.tsx`
- `src/components/settings/StatusTab.tsx`

Source files shared/dependensi styling:
- `src/components/ui/accordion.tsx`
- `src/components/admin/RoleBadge.tsx`
- `src/components/ui/SegmentBadge.tsx`
- `src/app/globals.css`

---

## 1. Metode Ekstraksi (Best Practice)

Metode yang dipakai untuk memastikan tidak ada styling yang tertinggal:

1. Tentukan boundary rendering page settings (layout route + page + semua tab).
2. Petakan dependency styling langsung (shared UI yang dipakai oleh tab/page).
3. Inventaris seluruh `className` statis dan conditional class (`cn(...)`, ternary string).
4. Inventaris utility custom yang dipakai, lalu trace definisinya ke `globals.css`.
5. Trace semantic token (`bg-background`, `border-border`, `text-foreground`, dst) ke variabel `:root` dan `.dark`.
6. Catat inline style (gradient/pattern) karena ini bukan Tailwind class tapi tetap styling aktif.
7. Validasi coverage per file (target + shared) dengan checklist eksplisit.

Metode ini repeatable dan bisa dipakai ulang untuk halaman lain.

---

## 2. Dependency Styling Map

| Layer | File | Peran Styling |
|------|------|------|
| Route wrapper | `src/app/(account)/layout.tsx` | Shell layout, grid background pattern, viewport behavior |
| Page shell | `src/app/(account)/settings/page.tsx` | Split layout desktop/mobile, nav tabs, accordion container, tab mounting area |
| Tab content | `src/components/settings/ProfileTab.tsx` | Card profile/email, form field, tombol aksi stripes |
| Tab content | `src/components/settings/SecurityTab.tsx` | Card password, input password reveal, checkbox area, tombol aksi |
| Tab content | `src/components/settings/StatusTab.tsx` | Card status, role/tier display, tombol upgrade |
| Shared UI | `src/components/ui/accordion.tsx` | Base accordion trigger/content animation + icon treatment |
| Shared UI | `src/components/admin/RoleBadge.tsx` | Badge role variant (`superadmin/admin/user`) |
| Shared UI | `src/components/ui/SegmentBadge.tsx` | Badge tier variant (`gratis/bpp/pro`) |
| Design tokens + utility | `src/app/globals.css` | Definisi token warna/radius dan utility custom (`focus-ring`, `btn-stripes-pattern`, dll) |

---

## 3. Inventory Class - `src/app/(account)/layout.tsx`

Class yang dipakai:

```txt
min-h-dvh relative bg-background text-foreground flex items-start md:items-center justify-center p-0 md:p-6
absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] z-[1]
relative z-10 w-full max-w-none md:max-w-5xl flex md:justify-center
```

Inline style aktif:

```css
background-image:
  linear-gradient(var(--border-hairline) 1px, transparent 1px),
  linear-gradient(90deg, var(--border-hairline) 1px, transparent 1px);
background-size: 48px 48px;
```

Sumber:
- `src/app/(account)/layout.tsx:58`
- `src/app/(account)/layout.tsx:61`
- `src/app/(account)/layout.tsx:63`
- `src/app/(account)/layout.tsx:73`

---

## 4. Inventory Class - `src/app/(account)/settings/page.tsx`

### 4.1 Wrapper dan panel

```txt
text-interface text-sm text-muted-foreground
relative w-full h-auto flex flex-col md:flex-row bg-transparent shadow-none md:max-w-4xl md:h-[80vh] md:overflow-hidden md:rounded-xl md:border md:border-border md:bg-card
hidden md:flex md:w-4/12 bg-slate-200 dark:bg-slate-950 p-6 md:p-8 relative flex-col
absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.05]
relative z-10 flex flex-col flex-grow
md:w-8/12 p-4 md:p-8 flex flex-col bg-slate-200 dark:bg-slate-950 relative overflow-visible md:overflow-y-auto md:bg-[color:var(--slate-100)] md:dark:bg-slate-800
md:hidden absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]
w-full relative z-10
hidden md:block
hidden
```

### 4.2 Logo, heading, nav, dan tombol back

```txt
flex flex-col
block h-7 w-7 dark:hidden
hidden h-7 w-7 dark:block
mt-6 md:mt-8
text-narrative font-medium text-xl
mt-1 text-sm font-normal text-slate-800 dark:text-slate-400
mt-6 flex flex-col gap-1 max-md:flex-row max-md:flex-wrap
relative inline-flex items-center gap-3 rounded-action px-3 py-2.5 text-left text-interface text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring
bg-slate-50 text-foreground dark:bg-slate-800 dark:text-slate-50
mt-auto pt-6
inline-flex items-center gap-2 text-sm font-normal text-slate-800 dark:text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-100 hover:underline focus-ring w-fit
h-4 w-4
```

### 4.3 Mobile header + accordion override

```txt
md:hidden relative z-10 mb-3 flex items-center justify-between px-3 py-2
flex items-center gap-2
block h-6 w-6 dark:hidden
hidden h-6 w-6 dark:block
md:hidden relative z-10
rounded-md border border-slate-300 bg-slate-50 px-3 dark:border-slate-600 dark:bg-slate-900
border-slate-300 dark:border-slate-600
py-3 hover:no-underline
inline-flex items-center gap-2 text-interface text-sm
pb-0
```

Inline style aktif (stripes):

```css
background-image: repeating-linear-gradient(
  45deg,
  currentColor 0,
  currentColor 1px,
  transparent 1px,
  transparent 8px
);
```

Sumber:
- `src/app/(account)/settings/page.tsx:38`
- `src/app/(account)/settings/page.tsx:61`
- `src/app/(account)/settings/page.tsx:63`
- `src/app/(account)/settings/page.tsx:66`
- `src/app/(account)/settings/page.tsx:68`
- `src/app/(account)/settings/page.tsx:81`
- `src/app/(account)/settings/page.tsx:88`
- `src/app/(account)/settings/page.tsx:93`
- `src/app/(account)/settings/page.tsx:94`
- `src/app/(account)/settings/page.tsx:95`
- `src/app/(account)/settings/page.tsx:101`
- `src/app/(account)/settings/page.tsx:104`
- `src/app/(account)/settings/page.tsx:105`
- `src/app/(account)/settings/page.tsx:142`
- `src/app/(account)/settings/page.tsx:152`
- `src/app/(account)/settings/page.tsx:155`
- `src/app/(account)/settings/page.tsx:157`
- `src/app/(account)/settings/page.tsx:163`
- `src/app/(account)/settings/page.tsx:170`
- `src/app/(account)/settings/page.tsx:177`
- `src/app/(account)/settings/page.tsx:183`
- `src/app/(account)/settings/page.tsx:191`
- `src/app/(account)/settings/page.tsx:196`
- `src/app/(account)/settings/page.tsx:198`
- `src/app/(account)/settings/page.tsx:199`
- `src/app/(account)/settings/page.tsx:200`
- `src/app/(account)/settings/page.tsx:205`
- `src/app/(account)/settings/page.tsx:240`
- `src/app/(account)/settings/page.tsx:241`
- `src/app/(account)/settings/page.tsx:258`

---

## 5. Inventory Class - `src/components/settings/ProfileTab.tsx`

```txt
mb-6
flex items-center gap-2 text-narrative font-medium text-xl
h-5 w-5 text-slate-800 dark:text-slate-200
mt-1 text-narrative text-sm text-muted-foreground
mb-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900
border-b border-slate-300 dark:border-slate-600 px-4 py-3 text-narrative text-md font-medium
p-4 bg-slate-50 dark:bg-slate-800
grid grid-cols-[120px_1fr_auto] items-center gap-3 max-sm:grid-cols-1 max-sm:items-start
text-interface text-xs text-muted-foreground
min-w-0 flex items-center gap-3 text-interface text-sm text-foreground max-sm:w-full
inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground text-sm font-semibold
h-full w-full object-cover
truncate text-interface text-sm font-medium
group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-2 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring
btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0
relative z-10
w-full
mb-4 text-interface text-sm font-semibold
flex flex-col gap-5
flex items-center gap-3 max-sm:flex-col max-sm:items-start
inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground text-base font-semibold
flex flex-col gap-1
group relative overflow-hidden inline-flex w-fit items-center justify-center gap-2 rounded-action px-3 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed
text-narrative text-xs text-muted-foreground
hidden
grid grid-cols-2 gap-3 max-sm:grid-cols-1
flex flex-1 flex-col gap-1.5
text-interface text-xs font-medium text-foreground
h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600
mt-5 flex justify-end gap-4 border-t border-border pt-4 max-sm:flex-col-reverse max-sm:items-stretch
group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-4 py-1 text-narrative text-xs font-medium border border-transparent bg-transparent text-slate-800 hover:text-slate-800 hover:border-slate-600 dark:text-slate-100 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed
group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-4 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed
min-w-0 text-interface text-sm text-foreground
inline-flex rounded-badge border border-slate-300 bg-slate-100 px-2 py-0.5 text-signal text-[10px] dark:border-slate-600 dark:bg-slate-700
```

Sumber:
- `src/components/settings/ProfileTab.tsx:94`
- `src/components/settings/ProfileTab.tsx:95`
- `src/components/settings/ProfileTab.tsx:96`
- `src/components/settings/ProfileTab.tsx:99`
- `src/components/settings/ProfileTab.tsx:104`
- `src/components/settings/ProfileTab.tsx:105`
- `src/components/settings/ProfileTab.tsx:106`
- `src/components/settings/ProfileTab.tsx:108`
- `src/components/settings/ProfileTab.tsx:109`
- `src/components/settings/ProfileTab.tsx:110`
- `src/components/settings/ProfileTab.tsx:111`
- `src/components/settings/ProfileTab.tsx:118`
- `src/components/settings/ProfileTab.tsx:126`
- `src/components/settings/ProfileTab.tsx:131`
- `src/components/settings/ProfileTab.tsx:136`
- `src/components/settings/ProfileTab.tsx:139`
- `src/components/settings/ProfileTab.tsx:143`
- `src/components/settings/ProfileTab.tsx:144`
- `src/components/settings/ProfileTab.tsx:145`
- `src/components/settings/ProfileTab.tsx:146`
- `src/components/settings/ProfileTab.tsx:147`
- `src/components/settings/ProfileTab.tsx:172`
- `src/components/settings/ProfileTab.tsx:174`
- `src/components/settings/ProfileTab.tsx:180`
- `src/components/settings/ProfileTab.tsx:185`
- `src/components/settings/ProfileTab.tsx:192`
- `src/components/settings/ProfileTab.tsx:200`
- `src/components/settings/ProfileTab.tsx:201`
- `src/components/settings/ProfileTab.tsx:202`
- `src/components/settings/ProfileTab.tsx:205`
- `src/components/settings/ProfileTab.tsx:221`
- `src/components/settings/ProfileTab.tsx:223`
- `src/components/settings/ProfileTab.tsx:235`
- `src/components/settings/ProfileTab.tsx:252`
- `src/components/settings/ProfileTab.tsx:257`
- `src/components/settings/ProfileTab.tsx:259`

---

## 6. Inventory Class - `src/components/settings/SecurityTab.tsx`

```txt
mb-6
flex items-center gap-2 text-narrative font-medium text-xl
h-5 w-5 text-slate-800 dark:text-slate-200
mt-1 text-narrative text-sm text-muted-foreground
mb-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900
border-b border-slate-300 dark:border-slate-600 px-4 py-3 text-narrative text-md font-medium
p-4 bg-slate-50 dark:bg-slate-800
grid grid-cols-[120px_1fr_auto] items-center gap-3 max-sm:grid-cols-1 max-sm:items-start
text-interface text-xs text-muted-foreground
min-w-0 text-interface text-sm text-foreground
tracking-[0.2em] text-muted-foreground
group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-2 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring
btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0
relative z-10
w-full
mb-4 text-interface text-sm font-semibold
flex flex-col gap-5
flex w-full flex-1 flex-col gap-1.5
sr-only
relative flex items-center
h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 pr-10 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600
absolute right-2 inline-flex h-7 w-7 items-center justify-center text-muted-foreground dark:text-slate-300 transition-colors hover:text-foreground dark:hover:text-slate-100 focus:outline-none
h-4 w-4
flex items-start gap-2.5
mt-0.5 size-[18px] shrink-0 accent-slate-200
flex flex-col gap-0.5
text-interface text-xs font-medium text-foreground
text-narrative text-xs leading-5 text-muted-foreground
mt-5 flex justify-end gap-4 border-t border-border pt-4 max-sm:flex-col-reverse max-sm:items-stretch
group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-4 py-1 text-narrative text-xs font-medium border border-transparent bg-transparent text-slate-800 hover:text-slate-800 hover:border-slate-600 dark:text-slate-100 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed
group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-4 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed
```

Sumber:
- `src/components/settings/SecurityTab.tsx:74`
- `src/components/settings/SecurityTab.tsx:75`
- `src/components/settings/SecurityTab.tsx:76`
- `src/components/settings/SecurityTab.tsx:79`
- `src/components/settings/SecurityTab.tsx:84`
- `src/components/settings/SecurityTab.tsx:85`
- `src/components/settings/SecurityTab.tsx:86`
- `src/components/settings/SecurityTab.tsx:88`
- `src/components/settings/SecurityTab.tsx:89`
- `src/components/settings/SecurityTab.tsx:90`
- `src/components/settings/SecurityTab.tsx:92`
- `src/components/settings/SecurityTab.tsx:100`
- `src/components/settings/SecurityTab.tsx:105`
- `src/components/settings/SecurityTab.tsx:108`
- `src/components/settings/SecurityTab.tsx:114`
- `src/components/settings/SecurityTab.tsx:115`
- `src/components/settings/SecurityTab.tsx:118`
- `src/components/settings/SecurityTab.tsx:120`
- `src/components/settings/SecurityTab.tsx:121`
- `src/components/settings/SecurityTab.tsx:124`
- `src/components/settings/SecurityTab.tsx:129`
- `src/components/settings/SecurityTab.tsx:136`
- `src/components/settings/SecurityTab.tsx:144`
- `src/components/settings/SecurityTab.tsx:210`
- `src/components/settings/SecurityTab.tsx:213`
- `src/components/settings/SecurityTab.tsx:218`
- `src/components/settings/SecurityTab.tsx:220`
- `src/components/settings/SecurityTab.tsx:225`
- `src/components/settings/SecurityTab.tsx:232`
- `src/components/settings/SecurityTab.tsx:234`
- `src/components/settings/SecurityTab.tsx:246`

---

## 7. Inventory Class - `src/components/settings/StatusTab.tsx`

```txt
mb-6
flex items-center gap-2 text-narrative font-medium text-xl
h-5 w-5 text-slate-800 dark:text-slate-200
mt-1 text-narrative text-sm text-muted-foreground
mb-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900
border-b border-slate-300 dark:border-slate-600 px-4 py-3 text-narrative text-md font-medium
p-4 bg-slate-50 dark:bg-slate-800
grid grid-cols-[120px_1fr_auto] items-center gap-3 max-sm:grid-cols-1 max-sm:items-start
text-interface text-xs text-muted-foreground
min-w-0 text-interface text-sm text-foreground
text-interface text-sm text-muted-foreground
flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-3
group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-4 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring
btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0
relative z-10 inline-flex items-center gap-1.5
h-4 w-4
```

Sumber:
- `src/components/settings/StatusTab.tsx:25`
- `src/components/settings/StatusTab.tsx:26`
- `src/components/settings/StatusTab.tsx:27`
- `src/components/settings/StatusTab.tsx:30`
- `src/components/settings/StatusTab.tsx:36`
- `src/components/settings/StatusTab.tsx:37`
- `src/components/settings/StatusTab.tsx:38`
- `src/components/settings/StatusTab.tsx:39`
- `src/components/settings/StatusTab.tsx:40`
- `src/components/settings/StatusTab.tsx:41`
- `src/components/settings/StatusTab.tsx:55`
- `src/components/settings/StatusTab.tsx:82`
- `src/components/settings/StatusTab.tsx:90`
- `src/components/settings/StatusTab.tsx:93`
- `src/components/settings/StatusTab.tsx:96`
- `src/components/settings/StatusTab.tsx:97`

---

## 8. Shared Component Styling yang Terpakai

### 8.1 `src/components/ui/accordion.tsx`

Base class dari shared accordion:

```txt
border-b last:border-b-0
flex
focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180
icon-interface text-muted-foreground pointer-events-none shrink-0 translate-y-0.5 transition-transform duration-200
data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm
pt-0 pb-4
```

Kelas override dari settings page:

```txt
rounded-md border border-slate-300 bg-slate-50 px-3 dark:border-slate-600 dark:bg-slate-900
border-slate-300 dark:border-slate-600
py-3 hover:no-underline
pb-0
```

Sumber:
- `src/components/ui/accordion.tsx:22`
- `src/components/ui/accordion.tsx:34`
- `src/components/ui/accordion.tsx:38`
- `src/components/ui/accordion.tsx:44`
- `src/components/ui/accordion.tsx:58`
- `src/components/ui/accordion.tsx:61`
- `src/app/(account)/settings/page.tsx:196`
- `src/app/(account)/settings/page.tsx:198`
- `src/app/(account)/settings/page.tsx:199`
- `src/app/(account)/settings/page.tsx:205`

### 8.2 `src/components/admin/RoleBadge.tsx`

Base class:

```txt
inline-flex items-center px-2.5 py-1 rounded-badge text-[10px] font-mono font-bold uppercase tracking-wide
```

Variant class:

```txt
superadmin: bg-rose-500/15 text-rose-400 border border-rose-500/30
admin:      bg-amber-500/15 text-amber-400 border border-amber-500/30
user:       border border-border bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100
```

Sumber:
- `src/components/admin/RoleBadge.tsx:14`
- `src/components/admin/RoleBadge.tsx:18`
- `src/components/admin/RoleBadge.tsx:23`
- `src/components/admin/RoleBadge.tsx:32`

### 8.3 `src/components/ui/SegmentBadge.tsx`

Base class:

```txt
inline-flex items-center px-2 py-0.5 rounded-badge
text-signal text-[10px] font-bold
```

Variant class:

```txt
gratis: bg-segment-gratis text-white
bpp:    bg-segment-bpp text-white
pro:    bg-segment-pro text-black
```

Sumber:
- `src/components/ui/SegmentBadge.tsx:17`
- `src/components/ui/SegmentBadge.tsx:21`
- `src/components/ui/SegmentBadge.tsx:25`
- `src/components/ui/SegmentBadge.tsx:57`
- `src/components/ui/SegmentBadge.tsx:58`

---

## 9. Utility Custom dari `globals.css` yang Dipakai Langsung

| Utility | Definisi | Sumber |
|------|------|------|
| `text-narrative` | `font-family: var(--font-sans)` | `src/app/globals.css:1516` |
| `text-interface` | `font-family: var(--font-mono)` | `src/app/globals.css:1520` |
| `text-signal` | mono + uppercase + `letter-spacing: 0.1em` | `src/app/globals.css:1524` |
| `rounded-action` | `border-radius: var(--radius-sm)` | `src/app/globals.css:1535` |
| `rounded-badge` | `border-radius: var(--radius-s-md)` | `src/app/globals.css:1539` |
| `focus-ring` | `outline: 2px solid var(--ring)` + `outline-offset: 2px` | `src/app/globals.css:1659` |
| `btn-stripes-pattern` | repeating diagonal stripe pattern (light/dark override) | `src/app/globals.css:1671`, `src/app/globals.css:1683` |
| `icon-interface` | `width: 16px; height: 16px` | `src/app/globals.css:1603` |

---

## 10. Token Mapping yang Aktif di Settings

### 10.1 Semantic tokens yang dipakai class settings

| Tailwind token class | CSS variable |
|------|------|
| `bg-background` | `--background` |
| `text-foreground` | `--foreground` |
| `bg-card` | `--card` |
| `border-border` | `--border` |
| `hover:bg-accent` | `--accent` |
| `text-muted-foreground` | `--muted-foreground` |
| `bg-primary` | `--primary` |
| `text-primary-foreground` | `--primary-foreground` |
| `focus-visible:border-ring` / `focus-visible:ring-ring/50` | `--ring` |
| `bg-segment-gratis` | `--segment-gratis` |
| `bg-segment-bpp` | `--segment-bpp` |
| `bg-segment-pro` | `--segment-pro` |

Sumber mapping theme:
- `src/app/globals.css:322`
- `src/app/globals.css:323`
- `src/app/globals.css:324`
- `src/app/globals.css:325`
- `src/app/globals.css:472`
- `src/app/globals.css:475`
- `src/app/globals.css:476`
- `src/app/globals.css:482`
- `src/app/globals.css:490`
- `src/app/globals.css:494`
- `src/app/globals.css:502`
- `src/app/globals.css:504`
- `src/app/globals.css:597`
- `src/app/globals.css:600`
- `src/app/globals.css:601`
- `src/app/globals.css:615`
- `src/app/globals.css:619`
- `src/app/globals.css:627`

### 10.2 Token warna raw yang dipakai tidak langsung

| Token | Nilai |
|------|------|
| `--slate-50` | `oklch(0.984 0 0)` |
| `--slate-100` | `oklch(0.968 0 0)` |
| `--slate-200` | `oklch(0.929 0 0)` |
| `--slate-300` | `oklch(0.869 0 0)` |
| `--slate-400` | `oklch(0.704 0 0)` |
| `--slate-500` | `oklch(0.554 0 0)` |
| `--slate-600` | `oklch(0.446 0 0)` |
| `--slate-700` | `oklch(0.372 0 0)` |
| `--slate-800` | `oklch(0.279 0 0)` |
| `--slate-900` | `oklch(0.208 0 0)` |
| `--slate-950` | `oklch(0.129 0 0)` |
| `--amber-500` | `oklch(.769 .188 70.08)` |
| `--emerald-600` | `oklch(.596 .145 163.225)` |
| `--sky-600` | `oklch(.588 .158 241.966)` |
| `--neutral-0` | `oklch(1 0 0)` |
| `--neutral-50` | `oklch(0.95 0 0)` |
| `--neutral-950` | `oklch(0.15 0 0)` |
| `--neutral-0-a10` | `oklch(1 0 0 / 0.10)` |
| `--neutral-0-a15` | `oklch(1 0 0 / 0.15)` |

Sumber:
- `src/app/globals.css:23`
- `src/app/globals.css:24`
- `src/app/globals.css:25`
- `src/app/globals.css:26`
- `src/app/globals.css:27`
- `src/app/globals.css:28`
- `src/app/globals.css:29`
- `src/app/globals.css:30`
- `src/app/globals.css:31`
- `src/app/globals.css:32`
- `src/app/globals.css:33`
- `src/app/globals.css:54`
- `src/app/globals.css:68`
- `src/app/globals.css:107`
- `src/app/globals.css:114`
- `src/app/globals.css:115`
- `src/app/globals.css:127`
- `src/app/globals.css:131`
- `src/app/globals.css:132`

### 10.3 Radius token yang aktif

| Utility | Radius token |
|------|------|
| `rounded-action` | `--radius-sm: 4px` |
| `rounded-badge` | `--radius-s-md: 6px` |
| `rounded-shell` (tidak dipakai langsung di settings, tapi satu keluarga utility) | `--radius-xl: 16px` |

Sumber:
- `src/app/globals.css:392`
- `src/app/globals.css:393`
- `src/app/globals.css:396`
- `src/app/globals.css:1535`
- `src/app/globals.css:1539`

---

## 11. Inline Style Non-Tailwind yang Aktif

1. `layout.tsx` - industrial grid background:
- 2 layer `linear-gradient` memakai `var(--border-hairline)`.
- `backgroundSize: 48px 48px`.

2. `settings/page.tsx` - diagonal stripes overlay (desktop left panel + mobile right panel):
- `repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 8px)`.

Sumber:
- `src/app/(account)/layout.tsx:63`
- `src/app/(account)/layout.tsx:67`
- `src/app/(account)/settings/page.tsx:68`
- `src/app/(account)/settings/page.tsx:157`

---

## 12. Coverage Checklist (Validasi Kelengkapan)

- [x] `src/app/(account)/layout.tsx` - class + inline style tercakup.
- [x] `src/app/(account)/settings/page.tsx` - desktop/mobile wrapper, nav, accordion override, class conditional tercakup.
- [x] `src/components/settings/ProfileTab.tsx` - view mode, edit mode, form, tombol stripes, badge email tercakup.
- [x] `src/components/settings/SecurityTab.tsx` - password card, reveal button, checkbox, action buttons tercakup.
- [x] `src/components/settings/StatusTab.tsx` - account/role/subscription card + tombol upgrade tercakup.
- [x] Shared styling `Accordion`, `RoleBadge`, `SegmentBadge` tercakup.
- [x] Utility custom (`focus-ring`, `btn-stripes-pattern`, typography/radius utility) tercakup.
- [x] Token semantic dan raw color yang dipakai tercakup.

---

## 13. Ringkasan

Ekstraksi ini sudah mencakup seluruh styling aktif di halaman user settings beserta sumbernya:
- Tailwind classes per file.
- Class conditional dan variant dari shared component.
- Utility custom dari `globals.css`.
- Token mapping semantic ke raw color.
- Inline gradient pattern yang tidak terwakili sebagai utility class.

Dengan struktur ini, asal-usul styling bisa ditelusuri jelas dari halaman utama sampai shared component dan token level.
