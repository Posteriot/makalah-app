# Sidebar & ActivityBar Visual Refinement - Current State

> Dokumentasi konteks refinement visual shell kiri chat (`/chat`, `/chat/[conversationId]`) setelah iterasi slate-first, kontras panel, tooltip label Indonesia, dan penyesuaian separator ke main area.

## Scope Dokumen

Dokumen ini mencakup komponen shell kiri yang aktif di codebase saat ini.

**Tercakup:**
- `ActivityBar` visual surface, icon state, tooltip label
- `ChatSidebar` surface, header section, tombol `Percakapan Baru`, label section
- `SidebarChatHistory` spacing, selected/hover state, tooltip judul penuh
- Separator antar panel melalui `PanelResizer` (kiri/kanan main)

**Tidak tercakup:**
- Isi detail `SidebarPaperSessions` dan `SidebarProgress`
- Logic AI/chat streaming
- Artifact panel content

---

## Tujuan Refinement

1. Mempertegas hierarki shell kiri dengan palette netral slate.
2. Menjaga kontras light/dark mode untuk state aktif dan hover.
3. Menyamakan terminologi UI sidebar ke bahasa Indonesia yang dipakai saat ini.
4. Mengurangi jarak visual antar panel tanpa menghapus kemampuan resize.

---

## Komponen dan Hasil Terkini

### 1. ActivityBar (`src/components/chat/shell/ActivityBar.tsx`)

**Hasil utama:**
- Base surface:
  - light: `bg-slate-300`
  - dark: `bg-slate-900`
- Border kanan kolom:
  - light: `border-slate-400/20`
  - dark: `border-slate-700/90`
- Row logo:
  - tinggi `h-11`
  - ada border bawah
- Navigation stack mulai dari `mt-3`
- Tooltip label menu:
  - `Sesi paper`
  - `Linimasa progres`

### 2. ChatSidebar (`src/components/chat/ChatSidebar.tsx`)

**Hasil utama:**
- Sidebar surface:
  - light: `bg-slate-200`
  - dark: `bg-slate-800`
- Border panel kanan:
  - light: `border-slate-300/50`
  - dark: `border-slate-700/80`
- Header collapse row:
  - tinggi `h-11`
  - border bawah aktif
- Section tombol `Percakapan Baru`:
  - wrapper `px-3 pb-3 pt-3` (tanpa `border-y`)
- Tombol `Percakapan Baru`:
  - light: `bg-slate-600 text-slate-100 border-slate-500/60`
  - dark: `bg-slate-900/90 text-slate-100 border-slate-700`
- Label section history:
  - dari `Riwayat Chat` menjadi `Riwayat`

### 3. SidebarChatHistory (`src/components/chat/sidebar/SidebarChatHistory.tsx`)

**Hasil utama:**
- Item spacing dibuat lebih lega:
  - `px-2.5 py-2.5`
  - row title `pb-0.5`
- Selected state:
  - light: `bg-slate-50 border-slate-300/90`
  - dark: `bg-slate-900/60 border-slate-700`
- Hover state:
  - light: `hover:bg-slate-300`
  - dark: `hover:bg-slate-600/60`
- Tooltip judul percakapan aktif untuk title yang terpotong

### 4. PanelResizer (`src/components/chat/layout/PanelResizer.tsx`)

**Hasil utama:**
- Resizer tetap ada (tidak dihapus)
- Lebar kolom grid resizer jadi `2px` (di `ChatLayout`)
- Tone separator:
  - light: `bg-slate-50`
  - dark: `bg-slate-900`
- Hover/drag:
  - light: `bg-sky-300`
  - dark: `bg-sky-700`
- Hit area drag tetap `12px` (`w-3 -left-1`)

---

## Token Mapping Ringkas

| Area | Light Mode | Dark Mode |
|------|------------|-----------|
| ActivityBar base | `bg-slate-300` | `bg-slate-900` |
| ActivityBar border right | `border-slate-400/20` | `border-slate-700/90` |
| Sidebar base | `bg-slate-200` | `bg-slate-800` |
| Sidebar border right | `border-slate-300/50` | `border-slate-700/80` |
| New chat button | `bg-slate-600` | `bg-slate-900/90` |
| History selected | `bg-slate-50` | `bg-slate-900/60` |
| Resizer base | `bg-slate-50` | `bg-slate-900` |
| Resizer hover | `bg-sky-300` | `bg-sky-700` |

---

## Aturan Implementasi yang Dipertahankan

- Fokus perubahan ada di color, border, spacing, dan shape.
- Tidak mengubah logic query/mutation data sidebar.
- Tidak mengubah behavior routing chat.

---

## File Index

- `src/components/chat/shell/ActivityBar.tsx`
- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/sidebar/SidebarChatHistory.tsx`
- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/layout/PanelResizer.tsx`
