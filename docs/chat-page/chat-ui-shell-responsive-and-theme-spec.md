# Chat UI Shell Responsive and Theme Spec

Dokumen ini mendefinisikan spesifikasi perilaku UI shell halaman chat untuk desktop/mobile dan dark/light mode berdasarkan implementasi runtime saat ini.

## 1. Scope

- Halaman: `/chat`, `/chat/[conversationId]`.
- Fokus:
- shell layout (activity bar, sidebar, main, artifact panel)
- responsive behavior per breakpoint
- mode tema dark/light yang berlaku di runtime
- sinkronisasi spacing lintas message list, status bar, dan input

## 2. Struktur Shell Utama

Root shell dibangun oleh `ChatLayout` sebagai grid 6 kolom.

- File: `src/components/chat/layout/ChatLayout.tsx`
- Struktur kolom desktop:
- kolom 1: Activity Bar (`48px`)
- kolom 2: Sidebar (default `280px`, resizable)
- kolom 3: Resizer kiri (`2px` saat aktif)
- kolom 4: Main content (`1fr`)
- kolom 5: Resizer kanan (`2px` saat panel artifact aktif)
- kolom 6: Artifact panel (default `360px`, resizable)

Grid columns runtime dihitung dinamis via `getGridTemplateColumns()`.

## 3. Responsive Contract

## 3.1 Breakpoint Utama

- Breakpoint fungsional: `md` (`min-width: 768px`) dipakai sebagai pemisah desktop vs mobile.

## 3.2 Desktop (`md` ke atas)

- Sidebar kiri selalu dirender di grid (class `hidden md:flex`).
- Artifact panel kanan dirender di grid (class `hidden md:flex`).
- Dua resizer aktif via mouse + keyboard:
- kiri: sidebar width
- kanan: artifact panel width
- Mobile sheet tidak dipakai.

## 3.3 Mobile (`< md`)

- Sidebar grid disembunyikan (`hidden md:flex`).
- Navigation sidebar dipindahkan ke `Sheet` kiri (`w-[300px]`) dengan source komponen yang sama (`ChatSidebar`).
- Header mobile di area chat (`ChatWindow`) muncul untuk:
- state landing
- state invalid conversation
- state conversation aktif
- Tombol menu mobile memanggil `onMobileMenuClick`.

## 3.4 Perilaku Collapse dan Width

- Sidebar auto-collapse saat `conversationId === null` (landing).
- Sidebar auto-expand saat ada conversation aktif.
- Constraint width:
- sidebar min `180px`, max `50vw`
- panel artifact min `280px`, max `50vw`
- threshold collapse sidebar: `< 100px`
- Double click pada resizer mengembalikan width default.

## 4. Spatial Contract (Padding dan Alignment)

`ChatLayout` menetapkan CSS variable:

- `--chat-input-pad-x`
- nilai default: `5rem`
- menjadi `10rem` jika kedua side panel collapse (`isSidebarCollapsed && !isArtifactPanelOpen`)

Variable ini dipakai konsisten oleh:

- `ChatInput` (container input)
- message list wrapper (`Virtuoso` item container di `ChatWindow`)
- loading skeleton
- empty state container
- process status bar
- error overlay kiri/kanan

Hasilnya: batas horizontal konten chat tetap sejajar walau layout shell berubah.

## 5. Komponen Shell dan Peran UI

## 5.1 Activity Bar

- File: `src/components/chat/shell/ActivityBar.tsx`
- Peran:
- switch panel sidebar: `chat-history | paper | progress`
- auto-expand sidebar jika user klik panel saat sidebar collapse
- keyboard navigation: Arrow, Home, End
- Tema:
- memiliki class dark/light eksplisit untuk background, border, hover, active

## 5.2 Sidebar

- File: `src/components/chat/ChatSidebar.tsx`
- Peran:
- container multi-panel (`SidebarChatHistory`, `SidebarPaperSessions`, `SidebarProgress`)
- new chat CTA (khusus panel history)
- credit meter footer
- Responsif:
- dipakai ulang pada desktop grid dan mobile sheet

## 5.3 Top Bar

- File: `src/components/chat/shell/TopBar.tsx`
- Peran:
- toggle expand sidebar (saat collapse)
- toggle panel artifact (dengan badge count)
- theme toggle
- user dropdown
- Guard:
- tombol panel artifact disabled jika artifact count = 0
- theme toggle ditampilkan saat user sudah ada (`!isLoading && user`)

## 5.4 Chat Window

- File: `src/components/chat/ChatWindow.tsx`
- Peran:
- message runtime + state-specific UI (loading/empty/not-found/error)
- mobile header per state
- message virtualization (`react-virtuoso`)
- quota banner, process status bar, input area

## 5.5 Artifact Panel

- File: `src/components/chat/ArtifactPanel.tsx`
- Peran:
- tabs, toolbar, viewer, fullscreen modal
- hidden total saat `isOpen === false` (tidak render null-state shell saat panel ditutup)

## 6. Theme Contract (Dark/Light)

## 6.1 Provider dan Policy

- Theme provider: `ThemeProvider` (`next-themes`) di `src/app/providers.tsx`
- setting:
- `attribute="class"`
- `defaultTheme="dark"`
- `enableSystem={false}`
- `disableTransitionOnChange`

## 6.2 Access Rule Tema

- `ThemeEnforcer` (`src/components/theme/ThemeEnforcer.tsx`) memaksa `dark` saat user belum login.
- Implikasi runtime:
- light mode efektif hanya tersedia untuk user authenticated
- logout akan mengembalikan tema ke dark walau sebelumnya light

## 6.3 Implementasi Styling Tema di Chat

- Komponen shell chat memakai class utility `dark:*` langsung.
- Tidak ada satu token map terpusat khusus chat shell; pattern saat ini adalah class pairing per komponen (contoh `bg-white dark:bg-slate-900`).
- Elemen visual dengan state signal (warning/error/success/search) juga punya pair dark/light masing-masing.

## 7. Interaction Contract per Device

## 7.1 Desktop

- Sidebar collapse/expand:
- via tombol di TopBar dan tombol collapse dalam ChatSidebar
- Panel artifact:
- dibuka/tutup via tombol di TopBar
- bisa resize via resizer kanan
- panel hilang dari grid jika closed (`width 0 + border removed`)

## 7.2 Mobile

- Sidebar dibuka via tombol menu di header mobile (`ChatWindow`).
- Sidebar ditutup lewat `onCloseMobile` atau close sheet.
- Artifact panel tidak punya varian mobile full panel di shell; workspace artifact fokus pada desktop split view.

## 8. Accessibility Contract yang Sudah Ada

- Resizer:
- `role="separator"`, keyboard Arrow + Home
- Activity bar:
- `role="navigation"` + `role="tablist"` + `aria-pressed`
- Button penting:
- menu, send, stop, expand/collapse punya `aria-label`
- Mobile sheet:
- memiliki `SheetHeader`/`SheetTitle` (sr-only) untuk struktur dialog

## 9. Known Runtime Constraints

- `--chat-input-pad-x` memakai nilai tetap `5rem/10rem`, belum adaptive granular per viewport sempit.
- Theme behavior bukan murni preference user global karena ada policy dark-only untuk guest.
- Responsif shell bertumpu pada satu breakpoint utama (`md`), belum ada split behavior tambahan untuk tablet intermediate.

## 10. File Referensi

- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/layout/PanelResizer.tsx`
- `src/components/chat/shell/ActivityBar.tsx`
- `src/components/chat/shell/TopBar.tsx`
- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/ChatProcessStatusBar.tsx`
- `src/components/chat/ArtifactPanel.tsx`
- `src/components/theme/ThemeEnforcer.tsx`
- `src/app/providers.tsx`

