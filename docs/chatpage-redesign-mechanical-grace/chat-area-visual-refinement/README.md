# Chat Area Visual Refinement - Current State

> Dokumentasi konteks refinement area percakapan (message stream + state UI proses) di branch `feat/chatpage-redesign-mechanical-grace`.

## Scope Dokumen

Dokumen ini fokus ke area chat utama tempat user prompt dan respons agent tampil.

**Tercakup:**
- Surface/background chat area
- Spacing horizontal message list dan state UI
- State tampilan (`landing`, `active`, `not found`, `error`, `loading`)
- Relasi `ChatWindow` dengan `TopBar` dan `ChatLayout`

**Tidak tercakup:**
- Detail sidebar left panel
- Detail artifact panel kanan
- Logika model/provider AI

---

## Arsitektur Surface

### 1. Root route chat (`src/app/chat/layout.tsx`)

- Root wrapper: `min-h-screen bg-background text-foreground`
- `bg-dots` sudah dihapus khusus route `/chat`

### 2. Main chat column (`src/components/chat/layout/ChatLayout.tsx`)

- Background utama area chat saat ini dikontrol di elemen `<main>`:
  - light: `bg-slate-50`
  - dark: `bg-slate-900`

### 3. Top bar (`src/components/chat/shell/TopBar.tsx`)

- Top bar disamakan dengan surface chat:
  - light: `bg-slate-50`
  - dark: `bg-slate-900`

### 4. ChatWindow (`src/components/chat/ChatWindow.tsx`)

- Wrapper `ChatWindow` bersifat netral (tanpa class background khusus)
- Surface visual diambil dari parent `main` agar konsisten

---

## Boundary & Spacing

Semua boundary horizontal di area pesan disinkronkan ke variable `--chat-input-pad-x`:

- Loading skeleton
- Empty state template
- Setiap item `MessageBubble`
- Footer `Virtuoso` (thinking + validation)
- Error overlay kiri/kanan

Implementasi sinkron ada di:
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/layout/ChatLayout.tsx`

Nilai variable:
- `10rem` saat sidebar collapse + artifact panel closed
- `5rem` untuk state lainnya

---

## State UI di Chat Area

### 1. Landing (`conversationId === null`)
- Welcome empty state + starter prompt CTA
- `ChatInput` tetap tampil di bawah

### 2. Active conversation
- Message area via `Virtuoso` (jika sudah ada pesan)
- Empty message state via `TemplateGrid` (jika percakapan masih kosong)
- `QuotaWarningBanner` di atas message area
- `ChatInput` persisten

### 3. Not found conversation
- Error state `Percakapan tidak ditemukan`

### 4. Loading
- Skeleton message placeholders

### 5. Error send
- Overlay error dengan tombol retry

---

## Catatan Integrasi Shell

### Resizer antar panel (`src/components/chat/layout/PanelResizer.tsx`)

- Lebar kolom resizer di grid: `2px`
- Tone resizer:
  - light: `bg-slate-50`
  - dark: `bg-slate-900`
- Hover/drag:
  - light: `bg-sky-300`
  - dark: `bg-sky-700`

Ini menjaga batas antar panel tetap terlihat tanpa gap besar.

---

## File Index

- `src/app/chat/layout.tsx`
- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/shell/TopBar.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/layout/PanelResizer.tsx`
