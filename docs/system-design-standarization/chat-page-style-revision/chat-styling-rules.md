# Chat Page Styling Rules

> Dokumen justifikasi aturan tegas untuk seluruh komponen dalam `[data-chat-scope]`.
> Disusun dari hikmah koreksi mikro visual QA session 23–24 Feb 2026 + mobile redesign session 24 Feb 2026.
> Digunakan sebagai checklist deteksi anomali dan panduan implementasi.

## 1. Token Architecture

### 1.1 Satu Sumber Kebenaran: `globals-new.css`

Semua nilai warna chat page didefinisikan di `src/app/globals-new.css` dalam dua blok:
- `[data-chat-scope]` — light mode
- `.dark [data-chat-scope]` — dark mode

**DILARANG:**
- Hardcode nilai OKLCH di className komponen (e.g. `bg-[oklch(0.869_0.022_252.894)]`)
- Override dark mode di komponen dengan `dark:bg-*`, `dark:text-*`, `dark:border-*`
- Bypass token dengan Tailwind color utilities (e.g. `bg-slate-300`, `text-gray-500`)

**DIBOLEHKAN:**
- Referensi token via `var(--chat-*)` (e.g. `bg-[var(--chat-muted)]`)
- Hardcode OKLCH **hanya** untuk hover solid step di `hover:bg-[oklch(...)]` ketika tidak ada token yang cocok — dan hanya jika didokumentasikan di file ini
- Hardcode OKLCH untuk elemen dekoratif spesifik (progress dot/line) yang bukan bagian dari token system

### 1.2 Hover Solid Steps (Hardcode yang Diizinkan)

Untuk hover state yang butuh satu step lebih gelap/terang dari token, gunakan nilai berikut:

| Konteks | Light Mode | Dark Mode |
|---------|-----------|-----------|
| `--chat-secondary` hover | `oklch(0.869 0.022 252.894)` (slate-300) | `oklch(0.372 0.022 257.287)` (slate-700 halved) |

Nilai ini harus selalu dipasangkan: `hover:bg-[oklch(...)] dark:hover:bg-[oklch(...)]`.

### 1.3 Token Tidak Boleh Ditambah Sembarangan

Sebelum menambah token baru di globals-new.css, cek apakah token yang ada sudah cukup.
33 token yang ada dirancang mencakup seluruh kebutuhan. Penambahan harus dijustifikasi.

---

## 2. Color Palette Rules

### 2.1 OKLCH Per-Step (Bukan Seragam)

Setiap lightness step menggunakan chroma dan hue native Tailwind CSS v4 Slate.
**DILARANG** menggunakan chroma/hue seragam untuk semua level.

| Step | Lightness | Light Chroma | Dark Chroma | Hue |
|------|-----------|-------------|-------------|-----|
| slate-50 | 0.984 | 0.003 | — | 247.858 |
| slate-100 | 0.968 | 0.007 | — | 247.896 |
| slate-200 | 0.929 | 0.013 | — | 255.508 |
| slate-300 | 0.869 | 0.022 | — | 252.894 |
| slate-400 | 0.704 | — | 0.020 | 256.788 |
| slate-500 | 0.554 | 0.046 | — | 257.417 |
| slate-600 | 0.446 | 0.043 | — | 257.281 |
| slate-700 | 0.372 | — | 0.022 | 257.287 |
| slate-800 | 0.279 | — | 0.020 | 260.031 |
| slate-900 | 0.208 | — | 0.021 | 265.755 |
| slate-950 | 0.129 | — | 0.021 | 264.695 |

### 2.2 Dark Mode Chroma = Setengah Native

Native Tailwind slate dark steps punya chroma ~0.042 — terlalu biru di monitor.
Dark mode surfaces menggunakan **chroma ~0.020–0.022** (setengah native).
Dark mode foreground (teks terang) tetap native rendah (0.003–0.007).

### 2.3 State Colors Sama di Kedua Mode

Warna state (destructive, success, warning, info) **identik** di light dan dark mode
karena semuanya medium-lightness (~0.6):

| Token | Nilai | Foreground |
|-------|-------|-----------|
| `--chat-destructive` | `oklch(0.586 0.253 17.585)` rose-600 | **white** (kedua mode) |
| `--chat-success` | `oklch(0.6 0.118 184.704)` teal-600 | **white** (kedua mode) |
| `--chat-warning` | `oklch(0.666 0.179 58.318)` amber-600 | **white** (kedua mode) |
| `--chat-info` | `oklch(0.588 0.158 241.966)` sky-600 | **white** (kedua mode) |

**DILARANG** set `*-foreground` state ke hitam di dark mode.
Logika: background sama → foreground sama.

---

## 3. Aturan Dominasi Slate

### 3.1 Prinsip Utama

> **Seluruh teks, icon, dan border di chat page menggunakan varian slate.**
> Warna non-slate (teal, sky, amber, rose) hanya untuk elemen dekoratif kecil
> yang memerlukan identitas warna spesifik.

### 3.2 Teks — Selalu Slate

| Hierarki | Token | Contoh |
|----------|-------|--------|
| Primary text | `--chat-foreground` | Judul, body text, stage label aktif |
| Secondary text | `--chat-secondary-foreground` | Teks di atas secondary bg |
| Muted text | `--chat-muted-foreground` | Timestamp, status "Sedang berjalan", metadata |
| Disabled text | `--chat-muted-foreground` | Placeholder, item belum aktif |

**DILARANG:**
- `text-[var(--chat-success)]` untuk teks biasa (e.g. "Selesai")
- `text-[var(--chat-info)]` untuk label/judul
- `text-[var(--chat-warning)]` untuk status "in progress"
- Warna state sebagai teks **hanya** dibolehkan di dalam badge berlatar state color

### 3.3 Icon — Default Slate, Kecuali Badge

| Konteks | Token |
|---------|-------|
| Icon toolbar (copy, delete, download, expand) | `--chat-muted-foreground` |
| Icon sidebar (folder, edit, chevron) | `--chat-muted-foreground` |
| Icon di dalam badge berlatar state color | `white` (ikut foreground badge) |
| Checkmark di "Sources found" header | `--chat-muted-foreground` |

**DILARANG:**
- `text-[var(--chat-info)]` untuk folder icon
- `text-[var(--chat-success)]` untuk checkmark biasa
- Warna state untuk icon standalone

### 3.4 Border — Slate-300 Minimum di Light Mode

| Konteks | Token |
|---------|-------|
| Border umum (card, input, divider) | `--chat-border` (slate-300 light, slate-700 dark) |
| Border sidebar (header, footer, panel edge) | `--chat-sidebar-border` (slate-300 light, slate-700 dark) |

**DILARANG:**
- Border state color pada container biasa (e.g. `border-[color:var(--chat-success)]`)
- `border-l-4` atau thick accent border ("strip") — norak
- Border slate-200 di light mode — tidak terlihat terhadap sidebar bg

### 3.5 Selection & Focus Border — Lembut, Bukan Tegas

| Konteks | Token |
|---------|-------|
| Selected item border (artifact, sidebar item) | `--chat-border` (slate-300 light, slate-700 dark) |
| Hover border (list item, card) | `--chat-border` |
| Keyboard focus ring | `--chat-ring` (sky-600 — biarkan vivid untuk a11y) |

Selection state cukup dibedakan via **background shift** (`--chat-accent`) + border halus (`--chat-border`).

**DILARANG:**
- `border-[color:var(--chat-primary)]` untuk selection/hover border — terlalu gelap (slate-800), njomplang
- `--chat-primary` hanya boleh untuk: background CTA button, text link, badge primer
- Border selected item tidak boleh lebih gelap dari `--chat-border`

**Logika:** Border slate-800 di antara elemen slate-300 menciptakan kontras visual yang mengganggu.
Cukup gunakan `--chat-border` + `bg-[var(--chat-accent)]` untuk membedakan item terpilih.

### 3.6 Background — Slate Tokens Only

| Konteks | Token |
|---------|-------|
| Page background | `--chat-background` |
| Card / elevated surface | `--chat-card` |
| Muted container (chat bubble, status card) | `--chat-muted` |
| Subtle highlight | `--chat-accent` |
| Button secondary | `--chat-secondary` |
| Sidebar content area | `--chat-accent` |
| Activity bar | `--chat-sidebar` |

**DILARANG:**
- `bg-[var(--chat-success)]` untuk container biasa (hanya untuk badge kecil)
- `bg-[var(--chat-info)]` untuk container
- State color sebagai background hanya untuk: badge kecil, dot, progress indicator

---

## 4. Komponen Pattern Rules

### 4.1 Status Card (Tahap Disetujui, Permintaan Revisi)

```
Container: bg-[var(--chat-muted)], rounded-action, no border
Layout: vertikal
  1. Icon (muted) + Label (foreground, semibold, uppercase)
  2. Metadata (muted-foreground, 10px)
  3. Stage label (foreground, semibold, 14px)
  4. Follow-up text (foreground, mono, 12px)
```

**DILARANG:** border state color, badge inline, horizontal layout campur badge.

### 4.2 Badge (PaperSessionBadge, status tag)

```
Container: bg-[var(--chat-info/success/warning)], rounded-badge
Text: menggunakan token foreground state (e.g. --chat-info-foreground) → selalu white
Icon: white (ikut foreground)
```

Badge adalah **satu-satunya tempat** state color boleh jadi background.

### 4.3 Sources Indicator

```
Header: bg-[var(--chat-muted)], rounded-badge
  Icon: muted-foreground
  Text: foreground, mono uppercase
Collapsible list: bg-[var(--chat-muted)], border chat-border
```

**DILARANG:** border-l-4 strip, state color background, state color text.

### 4.4 Progress Timeline (SidebarProgress)

```
Dot completed: teal-400 oklch(0.777 0.152 181.912)
Dot current: teal-600 var(--chat-success) + ring
Dot pending: transparent, border muted-foreground
Line: gradient teal-400→teal-600→border (muda ke tua)
Text title: foreground (semibold completed/current, medium pending)
Text status: foreground (completed "Selesai"), muted-foreground (current)
```

Gradasi **muda→tua** (atas→bawah). Teks selalu slate.

### 4.5 Toolbar Button (Terapkan, action buttons)

```
Default: bg-[var(--chat-secondary)], text-[var(--chat-secondary-foreground)]
Hover: solid OKLCH step (lihat Section 1.2)
Applied: bg-[var(--chat-success)], text-[var(--chat-success-foreground)]
Icon buttons: muted-foreground, hover bg-accent
```

**DILARANG:** bg-[var(--chat-primary)] untuk action button (terlalu kontras).

### 4.6 Resizer (PanelResizer)

```
Default: bg-transparent (tidak terlihat)
Hover/drag: bg-[var(--chat-info)] (sky-600 interactive affordance)
```

Panel border 1px sudah cukup sebagai separator visual.

---

## 5. Transparency Rules

### 5.1 DILARANG

- `opacity-*` pada interactive elements (button, link, badge)
- Color opacity `/50`, `/60` etc. (e.g. `bg-slate-500/50`)
- `backdrop-blur` pada chat content area
- Transparent hover states

### 5.2 DIBOLEHKAN

- `opacity-50` pada disabled state (element-level, bukan color)
- Shadow dengan alpha: `shadow-[0_1px_2px_oklch(0_0_0/0.05)]`
- Backdrop pada modal overlay

---

## 6. Checklist Deteksi Anomali

Gunakan checklist ini untuk scan komponen secara batch:

### Pattern Grep untuk Anomali

```bash
# 1. Hardcode dark: override di komponen chat
grep -rn "dark:" src/components/chat/ --include="*.tsx" | grep -v "node_modules"

# 2. State color sebagai teks (bukan di badge)
grep -rn "text-\[var(--chat-success)\]\|text-\[var(--chat-warning)\]\|text-\[var(--chat-info)\]" src/components/chat/ --include="*.tsx"

# 3. State color sebagai border container
grep -rn "border-\[color:var(--chat-success)\]\|border-\[color:var(--chat-warning)\]\|border-\[color:var(--chat-info)\]" src/components/chat/ --include="*.tsx"

# 4. Border-l-4 atau thick accent strip
grep -rn "border-l-[2-9]\|border-l-\[" src/components/chat/ --include="*.tsx"

# 5. Hardcode OKLCH tanpa dokumentasi
grep -rn "oklch(" src/components/chat/ --include="*.tsx" | grep -v "hover:"

# 6. Transparency violations
grep -rn "opacity-[0-9]\|/[0-9][0-9]\]" src/components/chat/ --include="*.tsx" | grep -v "disabled\|opacity-0\|group-hover:opacity"

# 7. Old amber/warning untuk in-progress
grep -rn "chat-warning" src/components/chat/ --include="*.tsx"

# 8. Black foreground di state token (globals-new.css)
grep -n "oklch(0 0 0)" src/app/globals-new.css

# 9. Selection/hover border pakai --chat-primary (harus --chat-border)
grep -rn "chat-primary" src/components/chat/ --include="*.tsx" | grep "border-\[color"

# 10. Sheet/Portal tanpa data-chat-scope (mobile token leak)
grep -rn "SheetContent" src/components/chat/ --include="*.tsx" | grep -v "data-chat-scope"

# 11. Card-style per-item di conversation list (harus flat)
grep -rn "rounded-action\|border-transparent\|shadow-\[inset" src/components/chat/sidebar/ --include="*.tsx"

# 12. font-mono untuk judul (harus font-sans)
grep -rn "font-mono.*truncate\|font-mono.*title\|font-mono.*conv\.title" src/components/chat/ --include="*.tsx"

# 13. hover: state di mobile-only komponen (harus active:)
grep -rn "hover:bg-\|hover:text-\|hover:opacity" src/components/chat/ --include="*.tsx" | grep -v "md:\|lg:\|hidden"

# 14. Toolbar row terpisah di bawah textarea (harus inline)
grep -rn "flex-col.*textarea\|flex-col.*px-3.*py-2" src/components/chat/ChatInput.tsx | grep -v "DESKTOP\|hidden md"

# 15. ChatInput tanpa shrink-0 (akan hilang saat keyboard muncul)
grep -rn "ChatInput" src/components/chat/ChatWindow.tsx | grep -v "shrink-0\|import\|//"

# 16. AlertDialogContent tanpa data-chat-scope (portal token leak)
grep -rn "AlertDialogContent" src/components/chat/ --include="*.tsx" | grep -v "data-chat-scope"

# 17. Pewarnaan semantik pada action items (destructive/success sebagai teks)
grep -rn "chat-destructive\|chat-success\|chat-warning" src/components/chat/mobile/ --include="*.tsx"

# 18. Artifact count tanpa deduplikasi (raw length vs sidebar logic)
grep -rn "artifacts.*length\|artifactCount" src/components/chat/mobile/ --include="*.tsx" | grep -v "latest\|Map\|size"
```

### Setiap Temuan Harus Dijawab:

1. **Apakah warna non-slate ini ada di dalam badge?** → Boleh jika ya.
2. **Apakah ini elemen dekoratif kecil (dot, line)?** → Boleh jika ya, dokumentasikan.
3. **Apakah ini teks/icon standalone?** → Harus slate. Ganti.
4. **Apakah ini border container?** → Harus `--chat-border` atau `--chat-sidebar-border`. Ganti.
5. **Apakah ada `dark:` override?** → Pindahkan ke globals-new.css sebagai token.
6. **Apakah ada transparency?** → Ganti ke solid color step.

---

## 7. Mobile Adaptation Rules

> Aturan khusus untuk komponen mobile di dalam `[data-chat-scope]`.
> Prinsip utama: **Mobile adalah turunan desktop, bukan desain terpisah.**

### 7.1 Prinsip Derivasi

Mobile sidebar, landing page, dan semua komponen chat mobile **HARUS** merupakan adaptasi visual dari desktop.
Bukan desain baru. Bukan "web yang di-mobile-kan". Tapi desain desktop yang di-app-kan.

**Proses desain mobile:**
1. Baca kode desktop komponen yang sama
2. Identifikasi token, font, spacing, layout yang dipakai desktop
3. Adaptasi ke mobile: touch target lebih besar, `active:` ganti `hover:`, layout single-column
4. JANGAN mengarang elemen, warna, atau layout yang tidak ada di desktop

**DILARANG:**
- Menambah border/rounded/shadow per-item yang tidak ada di desktop
- Menggunakan font berbeda dari desktop (e.g. mono untuk judul padahal desktop pakai sans)
- Membuat layout card-based ketika desktop flat list
- Menambah elemen dekoratif (branding, tagline) yang tidak ada di desktop

### 7.2 Sheet/Portal Token Scope

Radix UI Sheet (dan semua Portal-based component) render di `document.body` level — **di luar** `data-chat-scope` div di `chat/layout.tsx`.

**WAJIB:** Tambahkan `data-chat-scope=""` pada `SheetContent` atau container Portal manapun yang membutuhkan `--chat-*` tokens.

```tsx
// BENAR
<SheetContent data-chat-scope="">

// SALAH — tokens fallback ke globals.css
<SheetContent>
```

**Tanpa ini:** Semua `var(--chat-*)` gagal resolve, komponen mengambil dari `globals.css` (e.g. `--primary` = amber, bukan `--chat-sidebar-primary` = neutral).

### 7.3 Font Rules (Sidebar)

| Elemen | Font | Class |
|--------|------|-------|
| Judul percakapan | Geist Sans | `font-sans font-medium text-xs` |
| Timestamp | Geist Mono | `font-mono text-[11px]` |
| Section label (RIWAYAT) | Geist Mono | `font-mono font-bold text-[10px] uppercase tracking-widest` |
| Button label | Geist Sans | `font-sans font-medium text-sm` |
| Tab label (mobile) | Geist Mono | `font-mono font-bold text-[10px] uppercase tracking-widest` |

**DILARANG:**
- `font-mono` untuk judul percakapan
- `font-sans` untuk timestamp atau angka
- Mengambil font class dari `globals.css` token (e.g. `text-interface`, `text-narrative`) — gunakan Tailwind langsung

### 7.4 Flat List Pattern (Conversation Items)

Desktop conversation list menggunakan flat list tanpa dekorasi per-item.

**BENAR (ikuti desktop):**
```tsx
const itemClasses = cn(
  "group flex w-full items-center px-4 py-3.5 text-left transition-colors duration-150",
  isActive
    ? "bg-[var(--chat-accent)]"
    : "active:bg-[var(--chat-sidebar-accent)]"
)
```

**SALAH (jangan buat card-based):**
```tsx
// DILARANG — border, rounded, shadow per-item
"mx-1 my-0.5 rounded-action border border-transparent"
"shadow-[inset_0_1px_0_var(--chat-border)]"
```

### 7.5 Touch Interaction

Mobile menggunakan `active:` state, bukan `hover:`.

| Desktop | Mobile |
|---------|--------|
| `hover:bg-[var(--chat-sidebar-accent)]` | `active:bg-[var(--chat-sidebar-accent)]` |
| `hover:text-[var(--chat-foreground)]` | `active:text-[var(--chat-sidebar-foreground)]` |
| `hover:opacity-90` | ❌ DILARANG — gunakan `active:bg-*` |

`transition-colors duration-150` tetap dipakai di mobile untuk feedback visual halus.

### 7.6 Button Sizing (Sidebar)

```
Container: px-3 pt-5 pb-2.5
Button: h-9, rounded-action, border border-[color:var(--chat-sidebar-border)]
Background: bg-[var(--chat-sidebar-primary)]
Text: text-[var(--chat-sidebar-primary-foreground)]
Active: active:bg-[var(--chat-sidebar-accent)]
```

`pt-5` memberikan jarak yang cukup antara mobile tabs dan button.
Jangan kurangi — jarak yang sempit membuat UI terasa sesak.

### 7.7 Mobile Tab Bar — DEPRECATED (v3 Redesign)

> **DIHAPUS di v3 redesign (24 Feb 2026).** Mobile sidebar tidak lagi punya tabs. Sidebar hanya menampilkan riwayat chat. Paper sessions dipindahkan ke bottom sheet (`MobilePaperSessionsSheet`). Progress dipindahkan ke inline bar (`MobileProgressBar`).

Mobile sidebar sekarang = `SidebarChatHistory` + `CreditMeter` + "Atur Akun" link. Tidak ada panel switching.

### 7.8 Globals.css vs Globals-new.css

| Scope | File | Tokens |
|-------|------|--------|
| Chat page (`/chat/*`) | `globals-new.css` | `--chat-*` via `[data-chat-scope]` |
| Marketing, admin, auth | `globals.css` | `--primary`, `--background`, dll |

**DILARANG** menggunakan `globals.css` tokens di dalam komponen chat:
- `--primary` (amber) — gunakan `--chat-primary` atau `--chat-sidebar-primary`
- `--background` — gunakan `--chat-background`
- `--foreground` — gunakan `--chat-foreground`
- `--muted` — gunakan `--chat-muted`

Jika button berwarna amber/orange di mobile sidebar, **pasti** token bocor ke `globals.css` karena `data-chat-scope` tidak terpasang.

### 7.9 Mobile ChatInput (3-State)

Mobile ChatInput memiliki 3 state: collapsed, expanded, fullscreen.

**State 1 — Collapsed (idle, tanpa teks):**
```
┌─────────────────────────────────────────┐
│  📎  Kirim percakapan...          ▶     │
└─────────────────────────────────────────┘
```

**State 2 — Expanded (sedang mengetik, max 6 baris):**
```
┌─────────────────────────────────────────┐
│  📎  Teks yang diketik...      ⛶  ▶    │
└─────────────────────────────────────────┘
```

**State 3 — Fullscreen (overlay fixed untuk teks panjang).**

**ATURAN KRITIS — Inline Layout:**

Semua button (attach, expand, send) **HARUS** inline dengan textarea dalam satu `flex items-end` row.

```tsx
// BENAR — inline, tidak pernah ter-clip keyboard
<div className="flex w-full items-end gap-1 rounded-lg border ...">
  <FileUploadButton />       {/* kiri, self-end */}
  <textarea className="flex-1" />  {/* tengah, grows */}
  <div className="flex items-center gap-0.5">  {/* kanan, self-end */}
    <ExpandButton />
    <SendButton />
  </div>
</div>
```

```tsx
// SALAH — toolbar di row terpisah di bawah textarea
// iOS keyboard akan clip row ini karena berada di luar viewport
<div className="flex flex-col">
  <textarea />
  <div className="flex justify-between mt-1">  {/* ← AKAN TER-CLIP */}
    <FileUploadButton />
    <SendButton />
  </div>
</div>
```

**Alasan:** Ketika iOS keyboard muncul, viewport menyusut drastis. Jika toolbar ada di baris terpisah di bawah textarea, `overflow-hidden` pada parent chain akan clip toolbar tersebut — membuat send button dan attach button tidak terlihat.

**Container:**
```
Border: rounded-lg (12px), border border-[color:var(--chat-border)]
Background: bg-[var(--chat-card)]
Padding: px-2 py-1.5
Outer wrapper: px-3 py-2, shrink-0
```

### 7.10 iOS Keyboard Layout Survival

Ketika virtual keyboard iOS muncul, `dvh` menyusut dan konten yang rigid akan ter-clip.

**Aturan parent container:**

| Elemen | Harus | Jangan |
|--------|-------|--------|
| ChatInput wrapper | `shrink-0` | `flex-1` (ikut shrink = hilang) |
| Content area (TemplateGrid, messages) | `flex-1 min-h-0 overflow-y-auto` | `flex-1` tanpa `min-h-0` (rigid, nggak bisa shrink) |
| Header/nav | `shrink-0` | tanpa shrink-0 (ikut terdorong keluar viewport) |

**Pattern yang benar untuk mobile page:**
```tsx
<div className="flex-1 flex flex-col min-h-0">
  <header className="shrink-0">...</header>
  <div className="flex-1 min-h-0 overflow-y-auto">
    {/* Konten yang bisa scroll/shrink saat keyboard muncul */}
  </div>
  <ChatInput />  {/* shrink-0: selalu terlihat di atas keyboard */}
</div>
```

**DILARANG:**
- `overflow-hidden` pada container yang memuat ChatInput (pakai `overflow-y-auto` atau `min-h-0`)
- `flex-1` pada ChatInput wrapper (harus tetap compact, tidak ikut shrink)
- Menaruh button/toolbar di row terpisah di bawah textarea (lihat 7.9)

### 7.11 Radius Scale (Sumber Kebenaran: Kode)

Nilai radius aktual di `globals.css`, **BUKAN** dari dokumentasi CLAUDE.md (yang bisa mismatch):

| Variable | Value | Tailwind Class |
|----------|-------|----------------|
| `--radius-xs` | 2px | `rounded-xs` |
| `--radius-sm` | 4px | `rounded-sm` |
| `--radius-s-md` | 6px | — |
| `--radius-md` | 8px | `rounded-md` |
| `--radius-lg` | 12px | `rounded-lg` |
| `--radius-xl` | 16px | `rounded-xl` |

**Custom utility classes:**

| Class | Variable | Value |
|-------|----------|-------|
| `rounded-action` | `--radius-sm` | **4px** |
| `rounded-badge` | `--radius-s-md` | **6px** |
| `rounded-shell` | `--radius-xl` | **16px** |

**PENTING:** Jangan percaya nilai pixel di dokumentasi tanpa verifikasi ke `globals.css`. Selalu cek kode sebagai sumber kebenaran.

### 7.12 MobileEditDeleteSheet (Pengganti MobileActionSheet)

> **v3 redesign:** `MobileActionSheet` dihapus. Diganti oleh `MobileEditDeleteSheet` (edit/hapus) dan `MobilePaperSessionsSheet` (paper sessions). Pemicu berubah: edit/hapus dipicu oleh tap pada judul di header, bukan 3-dot menu.

Bottom sheet kecil untuk rename dan delete percakapan. Dipicu oleh tap pada judul percakapan di mobile header.

**Semua aturan portal, font, dan pewarnaan dari versi sebelumnya tetap berlaku:**

- `data-chat-scope=""` pada SheetContent DAN AlertDialogContent
- `font-sans` untuk semua teks (kecuali signal label: `font-mono uppercase tracking-widest`)
- Tidak ada pewarnaan semantik — semua action items pakai `--chat-foreground`
- AlertDialog button: `bg-[var(--chat-foreground)] text-[var(--chat-background)]` (bukan merah)

### 7.13 MobilePaperSessionsSheet

Bottom sheet yang menampilkan folder paper session dan artifact tree. Dipicu oleh `FastArrowRightSquare` icon di header.

**Derivasi dari:** `SidebarPaperSessions.tsx` (desktop sidebar paper panel).

| Aspek | Aturan |
|-------|--------|
| Portal scope | `data-chat-scope=""` pada SheetContent |
| Max height | `max-h-[70vh]` — tidak menutupi seluruh layar |
| Font | `font-sans` untuk display text, `font-mono` untuk badges dan metadata |
| Touch | `active:bg-[var(--chat-accent)]` pada semua item |
| Artifact count | Deduplikasi per `type-title` (sama dengan sidebar) |
| Edit/delete | **TIDAK ADA** — read-only browse |
| Artifact tap | `onArtifactSelect(id)` + close sheet |

**Artifact tree icons:**
- Paper artifact: `Page` icon
- Refrasa artifact: `R` badge (sky background)
- Version: `v{N}` badge (`rounded-badge`, `font-mono`)
- Status: `FINAL` (success) atau `REVISI` (muted)

### 7.14 MobileProgressBar (Pengganti MobilePaperMiniBar)

Horizontal progress timeline dengan number pills. Posisi: sticky di atas ChatInput, hanya terlihat saat paper session aktif.

**Collapsed state:** Single line: `GitBranch` icon + nama stage + "N/13" counter + chevron.
**Expanded state:** Horizontal scrollable row dengan 13 number pills terhubung garis.

| Elemen | Styling |
|--------|---------|
| Collapsed bar | `bg-[var(--chat-muted)] border-t border-[color:var(--chat-border)]` |
| Stage name | `font-sans text-xs font-semibold` |
| Counter | `font-mono text-xs tabular-nums` |
| Pill (completed) | `bg-[var(--chat-success)] text-[var(--chat-background)]` |
| Pill (current) | `bg-[var(--chat-success)] text-[var(--chat-background)] ring-2 ring-[var(--chat-success)]/30` |
| Pill (pending) | `bg-transparent border border-[color:var(--chat-border)]` |
| Connecting line | `h-px w-3`, success antara completed, border untuk sisanya |
| Tooltip | Absolute positioned, `bg-[var(--chat-foreground)] text-[var(--chat-background)]` |

**Rewind:** Completed pills dalam jarak 2 stage dari current bisa di-tap. Trigger `RewindConfirmationDialog`.

### 7.15 Mobile Header Layout (v3)

Header baru untuk conversation aktif:

```
┌──────────────────────────────────────┐
│  ☰  │  Judul ▾  │  [+💬]  [»]      │
└──────────────────────────────────────┘
```

| Elemen | Icon | Action |
|--------|------|--------|
| Hamburger | `Menu` | Buka sidebar (riwayat only) |
| Judul ▾ | — + `NavArrowDown` | Tap → buka MobileEditDeleteSheet |
| +💬 | `ChatPlusIn` | Navigate ke `/chat` (new chat) |
| » | `FastArrowRightSquare` | Buka MobilePaperSessionsSheet |

**Styling:**
- `font-sans font-medium text-sm` untuk judul (BUKAN `font-mono`)
- `h-5 w-5` untuk semua header icons
- `rounded-action` untuk semua button
- `active:bg-[var(--chat-accent)]` untuk touch feedback
- Container: `h-11 gap-1`

Landing page header: `☰ | "Makalah" (font-sans)`
Not-found header: `☰ | "Makalah" (font-sans)`

---

## 8. File Reference

| File | Peran |
|------|-------|
| `src/app/globals-new.css` | Satu sumber kebenaran token warna `--chat-*` |
| `src/app/globals.css` | Global app tokens (admin, marketing) — JANGAN pakai di chat |
| `src/app/chat/layout.tsx` | `data-chat-scope` attribute boundary |
| `src/components/chat/layout/ChatLayout.tsx` | Grid orchestrator + mobile Sheet (harus ada `data-chat-scope` di SheetContent) |
| `src/components/chat/ChatSidebar.tsx` | Sidebar container (desktop + mobile shared) |
| `src/components/chat/sidebar/SidebarChatHistory.tsx` | Conversation list — flat list pattern |
| `src/components/chat/shell/ActivityBar.tsx` | Desktop-only vertical nav (mobile pakai tabs di ChatSidebar) |
| `src/components/chat/ChatInput.tsx` | 3-state mobile input (collapsed/expanded/fullscreen) + desktop input |
| `src/components/chat/mobile/MobileEditDeleteSheet.tsx` | Edit/hapus sheet (pengganti MobileActionSheet) |
| `src/components/chat/mobile/MobilePaperSessionsSheet.tsx` | Paper session browser sheet |
| `src/components/chat/mobile/MobileProgressBar.tsx` | Horizontal progress timeline (pengganti MobilePaperMiniBar) |
| Dokumen ini | Panduan deteksi + justifikasi aturan |

---

*Dokumen ini adalah living document. Update setiap kali ditemukan pola anomali baru.*
*Last updated: 24 Feb 2026 — v3 redesign: replaced MobileActionSheet with MobileEditDeleteSheet + MobilePaperSessionsSheet, replaced MobilePaperMiniBar with MobileProgressBar, deprecated mobile sidebar tabs (7.7), added 7.13-7.15.*
