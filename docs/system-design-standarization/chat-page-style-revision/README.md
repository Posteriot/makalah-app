# Chat Page Style Revision — Context & Migration Guide

> Dokumen ini merangkum hasil penataan token dan styling di halaman chat,
> serta menjadi panduan untuk melanjutkan migrasi ke halaman lain.

## Status

| Halaman | Token System | Status |
|---------|-------------|--------|
| Chat (`/chat`) | `--chat-*` via `globals-new.css` | **Selesai** — 38 komponen ter-migrasi, visual QA done |
| Marketing (`/`) | `globals.css` legacy | Belum dimulai |
| Auth (`/sign-in`, `/sign-up`) | `globals.css` legacy | Belum dimulai |
| Dashboard | `globals.css` legacy | Belum dimulai |
| Onboarding | `globals.css` legacy | Belum dimulai |
| Account | `globals.css` legacy | Belum dimulai |
| CMS (`/cms`) | `globals.css` legacy | Belum dimulai |

## Arsitektur Saat Ini

```
src/app/
├── layout.tsx          ← import globals.css + globals-new.css
├── globals.css         ← 1940 baris, token lama (--background, --foreground, dll)
├── globals-new.css     ← 192 baris, 34 token --chat-* scoped ke [data-chat-scope]
└── chat/
    └── layout.tsx      ← satu-satunya yg punya data-chat-scope
```

**Cara kerjanya:**
- `globals.css` loaded untuk semua halaman (base Tailwind, shadcn/ui tokens, utilities)
- `globals-new.css` loaded untuk semua halaman tapi token `--chat-*` hanya resolve di dalam `[data-chat-scope]`
- Halaman chat: pakai keduanya — base dari `globals.css`, warna dari `--chat-*`
- Halaman lain: hanya `globals.css` yang efektif

## Apa yang Sudah Diselesaikan di Chat

### Token Migration
- 130+ token `--ds-*` (custom, tidak terstruktur) → 34 token `--chat-*` (shadcn/ui pattern)
- Single-layer architecture: setiap token langsung berisi nilai OKLCH, tanpa alias/reference layer
- Scoped ke `[data-chat-scope]` untuk isolasi dari halaman lain selama staging

### Visual QA (23-24 Feb 2026)
- Slate-dominant: semua teks, icon, border pakai varian slate. Warna non-slate hanya untuk badge kecil
- Focus ring: `ring-1 ring-[var(--chat-border)]` — lembut, konsisten
- Border strategy: tab wrapper owns `border-b`, toolbar owns `border-b`, no double borders
- Container stripping: hapus border berlebih di artifact viewer/fullscreen
- URL clickability: bare URLs dan backtick-wrapped URLs clickable di chat context
- Citation chips: tanpa container, plain text sky color
- SourcesIndicator: inline collapsible tanpa container
- Responsive toolbar: 2-layer layout (context + actions) konsisten di ArtifactToolbar dan RefrasaToolbar
- Dark mode: OKLCH per-step hue native Tailwind, chroma halved untuk surface gelap

### Hard Rules yang Berlaku
1. **No transparency** — kecuali shadow dan modal backdrop
2. **No thin contrast** — minimum 4-step gap di skala 50-950
3. **No hue manipulation** — pakai palette values as-is
4. **No component-specific tokens** — komponen pakai generic token + Tailwind utilities
5. **No dark: override di komponen** — dark mode ditangani oleh token di CSS
6. **No state color untuk teks/icon/border standalone** — hanya di dalam badge

## Dokumen di Folder Ini

| File | Isi |
|------|-----|
| `design.md` | Arsitektur token, value mapping light/dark, migration strategy, promotion plan |
| `implementation-plan.md` | Step-by-step migration per wave (W1-W5), per-file method |
| `chat-styling-rules.md` | Aturan tegas styling + checklist deteksi anomali (grep patterns) |
| `global-css-template.css` | Template final `globals.css` tanpa prefix `chat-` (target promosi) |

## Rencana Promosi ke Global

Setelah chat stable, token `--chat-*` dipromosikan jadi token app-wide:

### Step 1: Rename token
Hapus prefix `chat-` dari `globals-new.css`:
```
--chat-background  →  --background
--chat-foreground  →  --foreground
--chat-border      →  --border
...
```

### Step 2: Ganti selector
```css
/* Dari */
[data-chat-scope] { --background: ...; }
.dark [data-chat-scope] { --background: ...; }

/* Ke */
:root { --background: ...; }
.dark { --background: ...; }
```

### Step 3: Merge ke globals.css
Timpa section semantic token di `globals.css` dengan token baru.
Hapus `globals-new.css`.

### Step 4: Update chat components
```
var(--chat-background)  →  var(--background)
bg-[var(--chat-muted)]  →  bg-muted
```
Atau lebih baik: pakai Tailwind class langsung (`bg-background`, `text-foreground`) karena `@theme inline` bridge sudah ada.

### Step 5: Hapus data-chat-scope
Attribute tidak diperlukan lagi karena token sudah global.

### Step 6: Migrasi halaman lain
Setiap halaman di-migrasi dengan method yang sama:

1. **Scan** — cari hardcoded color, `dark:` prefix, token lama
2. **Map** — ganti ke semantic token (`--background`, `--muted`, dll)
3. **Validate** — `grep "var(--ds-"`, `grep "dark:(bg|text|border)"` harus 0
4. **Visual check** — screenshot light + dark mode

### Urutan Migrasi yang Direkomendasikan

| Prioritas | Halaman | Alasan |
|-----------|---------|--------|
| 1 | CMS (`/cms`) | Admin panel, komponen mirip chat (form, card, table) |
| 2 | Auth (`/sign-in`, `/sign-up`) | Halaman publik, kecil, cepat |
| 3 | Onboarding | Flow pendek, komponen terbatas |
| 4 | Dashboard | Komponen lebih kompleks (chart, stats) |
| 5 | Account | Settings page, form-based |
| 6 | Marketing (`/`) | Landing page, paling banyak custom styling |

## Template globals.css Target

File `global-css-template.css` di folder ini berisi template final tanpa prefix `chat-`. Gunakan sebagai referensi saat promosi.

## Catatan Penting

- **Jangan langsung promosi** sebelum semua halaman chat 100% visual QA passed
- **Popover citation** masih pakai light theme di portal — perlu di-address sebelum promosi
- `@theme inline` bridge di `globals-new.css` memungkinkan Tailwind utilities (`bg-chat-muted`, `text-chat-foreground`) — bridge ini harus dipertahankan atau diganti saat merge ke `globals.css`
- Portal elements (Radix Select, HoverCard) render di luar `[data-chat-scope]` — perlu hardcode slate values atau tambahkan `data-chat-scope` attribute. Masalah ini hilang setelah promosi ke `:root`
