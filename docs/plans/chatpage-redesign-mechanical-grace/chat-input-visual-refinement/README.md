# Chat Input Visual Refinement - Current State

> Dokumentasi konteks refinement komponen input chat setelah iterasi redesign di branch `feat/chatpage-redesign-mechanical-grace`.

## Scope Dokumen

Dokumen ini mencakup perubahan visual dan struktur pada input chat di bawah area percakapan.

**Tercakup:**
- Struktur layout input (textarea + attach + send dalam satu kontainer)
- Spacing, radius, border, dan tipografi
- Sinkronisasi batas horizontal input dengan message area
- Perilaku auto-resize textarea

**Tidak tercakup:**
- Logika AI streaming
- Message bubble rendering
- Sidebar dan artifact panel

---

## Komponen Inti

### `ChatInput` (`src/components/chat/ChatInput.tsx`)

Refinement yang aktif saat ini:

1. Kontainer input memakai layout grid 3 kolom:
- `grid-cols-[auto_1fr_auto]`
- `gap-x-2 gap-y-1`
- `rounded-lg`
- `border border-slate-300/60 dark:border-slate-700/60`
- `bg-card/90`
- `px-3 py-1.5`

2. Textarea:
- `rows={3}`
- `min-h-[72px]`
- `text-sm leading-relaxed text-foreground`
- placeholder: `Kirim percakapan...`
- auto-resize maksimum `200px`

3. Section attach + send:
- berada di row terpisah dalam kontainer yang sama (`col-span-3`)
- punya pemisah atas: `border-t border-slate-800`
- spacing section: `mt-0.5 pt-1`
- tombol send: `w-10 h-10 rounded-lg`

4. Wrapper luar input:
- `py-4 bg-transparent`
- horizontal padding mengikuti CSS variable:
  - `paddingInline: var(--chat-input-pad-x, 5rem)`

---

## Sinkronisasi Batas Horizontal

Batas kanan-kiri input saat ini dikontrol dari `ChatLayout` lewat variable `--chat-input-pad-x`:

- kedua panel samping collapse: `10rem`
- selain itu: `5rem`

Implementasi ada di:
- `src/components/chat/layout/ChatLayout.tsx`

Dengan pola ini, batas input selalu konsisten dengan message area yang juga memakai variable yang sama.

---

## Perilaku dan State

1. Saat file sudah diupload (belum submit), muncul chip `File attached`.
2. Tombol send nonaktif saat input kosong atau loading.
3. Enter tanpa Shift akan submit form.
4. Enter + Shift tetap untuk baris baru.

---

## File Index

- `src/components/chat/ChatInput.tsx`
- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/FileUploadButton.tsx`

