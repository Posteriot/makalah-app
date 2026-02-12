# Sidebar & ActivityBar Visual Refinement - Current State

> Dokumentasi konteks perbaikan visual pada shell kiri halaman chat (`/chat`, `/chat/[conversationId]`) setelah iterasi kontras slate-only. Fokus dokumen ini ada di `ActivityBar`, `ChatSidebar`, dan `SidebarChatHistory`.

## Scope Dokumen

Dokumen ini mencakup **perbaikan visual komponen kiri chat shell** dengan fokus warna, border, bentuk, spacing, dan kontras light/dark mode.

**Tercakup:**
- ActivityBar visual hierarchy (base surface, active/hover state, border pemisah kolom)
- ChatSidebar surface, section divider, dan tombol `Percakapan Baru`
- SidebarChatHistory list item spacing, selected/hover state, dan kepadatan konten
- Dominasi tone netral `slate` untuk shell kiri, dengan badge status paper berwarna `emerald`

**Tidak tercakup:**
- Layout grid dan resize behavior (tetap dari `ChatLayout`)
- Sidebar konten non-history (`SidebarPaperSessions`, `SidebarProgress`)
- Perubahan copy/teks
- Logic data, query Convex, routing, dan state business

---

## Tujuan Refinement

Refinement ini dibuat untuk menjawab tiga kebutuhan visual utama:

1. **Kontras kolom kiri lebih tegas**
   Activity bar harus terbaca sebagai zona yang lebih dalam daripada panel sidebar.
2. **Section tombol `Percakapan Baru` lebih jelas**
   Batas atas-bawah section harus terlihat di light dan dark mode.
3. **List history lebih nyaman dibaca**
   Item dengan badge tidak terasa mepet, dan state selected/hover mudah dibedakan.

---

## Komponen dan Hasil

### 1. ActivityBar (`src/components/chat/shell/ActivityBar.tsx`)

Refinement pada ActivityBar difokuskan ke separation dan kontrol state icon.

**Hasil utama:**
- Base surface: `bg-slate-300` (light) dan `dark:bg-slate-950`.
- Border pemisah ke kanan: `border-r border-slate-400/90` (light), `dark:border-slate-700/90`.
- Active item: `border-slate-500/80 bg-slate-200` (light), `dark:border-slate-600 dark:bg-slate-800`.
- Hover item/logo: slate-only (`hover:bg-slate-200/80` untuk light).
- Separator di bawah logo dihapus untuk tampilan lebih bersih.
- Header logo disetarakan tinggi dengan row toggle (`h-11`) dan diberi `border-b`.
- Jarak dari border bawah logo ke icon pertama diatur ulang (`mt-3`) untuk alignment vertikal yang konsisten.

### 2. ChatSidebar (`src/components/chat/ChatSidebar.tsx`)

Refinement pada ChatSidebar difokuskan ke tone panel dan section header tombol.

**Hasil utama:**
- Sidebar surface: `bg-slate-200` (light), `dark:bg-slate-800`.
- Border panel kanan: `border-r border-slate-300/90`.
- Header tombol `Percakapan Baru`: `border-y border-slate-400/95` (light), `dark:border-slate-600/90`.
- Tombol `Percakapan Baru` pakai style negatif moderat:
  - Light: `bg-slate-600 text-slate-100 border-slate-500/60`
  - Dark: `dark:bg-slate-500/80 dark:text-slate-100 dark:border-slate-700`

### 3. SidebarChatHistory (`src/components/chat/sidebar/SidebarChatHistory.tsx`)

Refinement pada history list difokuskan ke density dan readability.

**Hasil utama:**
- Item padding ditambah: `py-2.5`.
- Spasi row title+badge ditambah: `pb-0.5`.
- Selected state (light): `border-slate-300/90 bg-slate-50`.
- Hover state (light): `hover:bg-slate-300`.
- Selected/hover dark dipertahankan agar kontras tetap aman.

---

## Token Mapping Light vs Dark

| Area | Light Mode | Dark Mode |
|------|------------|-----------|
| ActivityBar base | `bg-slate-300` | `bg-slate-950` |
| ActivityBar border right | `border-slate-400/90` | `border-slate-700/90` |
| ActivityBar active item | `bg-slate-200 border-slate-500/80` | `bg-slate-800 border-slate-600` |
| ActivityBar logo row | `h-11 + border-b` | `h-11 + border-b` |
| ActivityBar top spacing to first icon | `mt-3` | `mt-3` |
| Sidebar base | `bg-slate-200` | `bg-slate-800` |
| New chat section divider | `border-slate-400/95` | `border-slate-600/90` |
| New chat button | `bg-slate-600 text-slate-100 border-slate-500/60` | `bg-slate-500/80 text-slate-100 border-slate-700` |
| History selected | `bg-slate-50 border-slate-300/90` | `bg-slate-900/60 border-slate-700` |
| History hover | `bg-slate-300` | `bg-slate-600/60` |
| Paper stage badge | `bg-emerald-700 text-white border-emerald-800/80` | `bg-emerald-600 text-white border-emerald-500/90` |

---

## State Behavior Ringkas

### Expand vs Collapse
- Saat sidebar expand, ActivityBar + ChatSidebar membentuk dua lapis tone (`slate-300` vs `slate-200`) sehingga batas kolom kebaca.
- Saat sidebar collapse, ActivityBar tetap punya kontras mandiri lewat surface + active state icon.

### Active vs Hover di History
- Active item memakai kombinasi background lebih terang (`slate-50`) + border halus.
- Hover item memakai layer `slate-300` agar tetap terlihat meski tanpa border.

---

## Aturan Implementasi yang Dipertahankan

- Perubahan hanya visual: color, border, bentuk, spacing.
- Tidak ada perubahan teks/copy.
- Tidak ada perubahan logic/state management.
- Palette utama shell kiri: netral `slate` (badge stage paper memakai `emerald`).

---

## File Index

| File | Peran |
|------|-------|
| `src/components/chat/shell/ActivityBar.tsx` | Visual refinement activity bar (surface, active/hover, border) |
| `src/components/chat/ChatSidebar.tsx` | Sidebar panel tone + section tombol `Percakapan Baru` |
| `src/components/chat/sidebar/SidebarChatHistory.tsx` | Density dan state visual list riwayat |

---

## Catatan Lanjutan

Dokumen ini sengaja fokus ke shell kiri chat. Untuk konteks layout 6-kolom dan orchestration penuh, tetap rujuk:

- `docs/plans/chatpage-redesign-mechanical-grace/chat-page-layout-structure-shell/README.md`
