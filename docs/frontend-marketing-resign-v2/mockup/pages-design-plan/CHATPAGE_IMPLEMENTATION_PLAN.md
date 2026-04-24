# Implementation Plan: ChatPage Mockup

Tanggal: 24 April 2026
Worktree: `/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2`
Primary handoff source: `docs/frontend-marketing-resign-v2/HANDOFF_PROMPT.md`
Related planning sources:

- `docs/frontend-marketing-resign-v2/mockup/pages-design-plan/DESIGN_DOC.md`
- `docs/frontend-marketing-resign-v2/mockup/pages-design-plan/AUDIT.md`
- `docs/frontend-marketing-resign-v2/mockup/pages-design-plan/IMPLEMENTATION_PLAN.md`

## Tujuan

Dokumen ini menjadi implementation plan khusus untuk unit berikutnya:

```text
ChatPage mockup
```

Targetnya adalah membuat halaman chat mockup yang:

1. Mengikuti struktur visual utama production chat di `src/` sebagai referensi.
2. Tetap diimplementasikan sepenuhnya di runtime mockup statis.
3. Memperlihatkan state normal, hidden, dan error secara sengaja untuk keperluan review visual.
4. Tidak mengubah production app source di `src/`.

## Scope Dan Batasan Wajib

Semua implementasi hanya boleh mengubah:

```text
docs/frontend-marketing-resign-v2/mockup/
docs/frontend-marketing-resign-v2/HANDOFF_PROMPT.md
```

Jangan mengubah:

```text
src/
```

Production `src/` hanya boleh dibaca sebagai referensi struktur, visual direction, dan state penting.

Jangan menambahkan:

- bundler
- ES module `import` / `export`
- TypeScript
- Next.js APIs
- Convex queries
- `fetch`
- dependency runtime baru
- path alias

Runtime mockup harus tetap:

- static HTML
- React UMD + Babel
- script-loaded via `MakalahAI.html`
- global registration via `Object.assign(window, { ... })`

## Prinsip Eksekusi

1. **Reviewability lebih penting daripada runtime realism.** Chat mockup harus memperlihatkan surface yang biasanya tersembunyi jika itu membantu audit visual.
2. **Production chat adalah referensi visual, bukan sumber kode untuk disalin mentah.** Mockup harus diterjemahkan ke pola statis yang cocok dengan runtime sekarang.
3. **Shell layout wajib dipertahankan.** Chat bukan marketing page dan tidak boleh tampil dengan global marketing header/footer.
4. **State controls harus jelas terpisah dari UI produk.** Controls adalah tooling review mockup, bukan bagian dari chat production surface.
5. **Styling harus domain-specific dan mudah diaudit.** Semua style chat ditempatkan di file khusus `chat-style.css`.
6. **Abstraction secukupnya.** Unit pertama boleh menaruh subkomponen di `ChatPage.jsx` selama itu mempercepat stabilisasi dan audit.

## Target File Plan

### Add

```text
docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx
docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css
```

### Modify

```text
docs/frontend-marketing-resign-v2/mockup/src/app/MockRouter.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/MarketingLayoutMock.jsx
docs/frontend-marketing-resign-v2/mockup/MakalahAI.html
```

### Do Not Modify

```text
src/
docs/frontend-marketing-resign-v2/screenshots/
```

## Route Dan Layout Plan

### Route Registry

`MockRouter.jsx` harus menambah:

```text
"/chat"
```

Route ini harus merender:

```jsx
<ChatPage />
```

### Shell Route Detection

`MarketingLayoutMock.jsx` harus diperlakukan ulang agar `#/chat` masuk keluarga shell route, bersama:

- `#/documentation`
- `#/report-issue*`

Konsekuensinya:

- `#/chat` tidak boleh memakai `GlobalHeaderMock`
- `#/chat` tidak boleh memakai `FooterMock`
- `#/chat` harus masuk class/layout treatment shell route

### Script Loading

`MakalahAI.html` harus:

1. Memuat `styles/chat-style.css`.
2. Memuat `src/app/pages/ChatPage.jsx`.
3. Menjaga urutan script agar dependency global tersedia sebelum `MockRouter` dan `render.jsx`.

## Struktur Halaman Yang Wajib Ada

`ChatPage.jsx` harus dibangun sebagai satu orchestrator state mockup, dengan dua lapisan besar:

1. `ChatMockStateControls`
2. `ChatMockShell`

Urutan rendering:

```jsx
<section className="chat-mock-page">
  <ChatMockStateControls />
  <ChatMockShell />
</section>
```

`ChatMockStateControls` bukan bagian dari surface chat production. Ia harus tampil sebagai review strip di atas konten chat.

## Komponen Yang Harus Ada Di ChatPage.jsx

Komponen boleh tetap berada di file yang sama pada unit pertama. Minimal harus ada komponen berikut:

### Orchestrator

- `ChatPage`
- `ChatMockStateControls`
- `ChatMockShell`

### Shell Desktop

- `ChatMockActivityBar`
- `ChatMockSidebar`
- `ChatMockTopBar`
- `ChatMockMain`
- `ChatMockArtifactPanel`

### Shell Mobile

- `ChatMockMobileFrame`
- `ChatMockMobileHeader`
- `ChatMockMobileSidebarSheet`

### Main Content States

- `ChatMockEmptyState`
- `ChatMockLoadingState`
- `ChatMockNotFoundState`
- `ChatMockConversationView`

### Conversation Surface

- `ChatMockAlertLayer`
- `ChatMockMessageList`
- `ChatMockMessageBubble`
- `ChatMockPendingAssistantIndicator`
- `ChatMockComposer`
- `ChatMockProcessBar`
- `ChatMockSourcesSheet`
- `ChatMockReasoningPanel`

### Panel / Detail Surface

- `ChatMockArtifactTabs`
- `ChatMockArtifactToolbar`
- `ChatMockArtifactContent`

Jika naming internal sedikit berbeda tidak masalah, tetapi seluruh surface di atas wajib tercakup.

## Data Mock Yang Wajib Disiapkan

Semua data mock disarankan sebagai konstanta lokal di `ChatPage.jsx` untuk unit pertama.

### Navigation / Shell Data

- `CHAT_MOCK_CONVERSATIONS`
- `CHAT_MOCK_PROGRESS_ITEMS`
- `CHAT_MOCK_USER_SUMMARY`
- `CHAT_MOCK_CREDIT_SUMMARY`

### Empty / Starter Data

- `CHAT_MOCK_TEMPLATES`

### Message Preset Data

- `CHAT_MOCK_MESSAGES_DEFAULT`
- `CHAT_MOCK_MESSAGES_PROCESSING`
- `CHAT_MOCK_MESSAGES_VALIDATION`
- `CHAT_MOCK_MESSAGES_ERROR`
- `CHAT_MOCK_MESSAGES_HIGHLIGHTED`

### Composer / Attachment Data

- `CHAT_MOCK_ATTACHMENTS`
- `CHAT_MOCK_CONTEXT_FILES`

### Sources Data

- `CHAT_MOCK_SOURCES`

### Artifact Data

- `CHAT_MOCK_ARTIFACT_TABS`
- `CHAT_MOCK_ARTIFACT_ACTIVE`
- `CHAT_MOCK_ARTIFACT_EMPTY`
- `CHAT_MOCK_ARTIFACT_MISSING`

### Reasoning / Process Data

- `CHAT_MOCK_REASONING_STEPS`
- `CHAT_MOCK_PROCESS_SUMMARIES`

### Alert / Error Copy Data

- `CHAT_MOCK_ALERTS`

## State Controls Exact Yang Wajib Dipasang

State controls harus eksplisit, route-local, dan mudah dipakai reviewer. Exact control set yang wajib ada:

### Primary Selectors

- `viewport`
  - `desktop`
  - `mobile`
- `conversationState`
  - `landing`
  - `loading`
  - `active`
  - `notFound`
- `sidebarState`
  - `expanded`
  - `collapsed`
  - `mobileSheetOpen`
- `sidebarPanel`
  - `history`
  - `progress`
- `composerState`
  - `idle`
  - `withContext`
  - `generating`
  - `mobileFullscreen`
- `processState`
  - `hidden`
  - `processing`
  - `completeCollapsed`
  - `completeExpanded`
  - `error`
- `alertState`
  - `none`
  - `quotaWarning`
  - `technicalReport`
  - `quotaBlocked`
  - `sendError`
- `artifactPanelState`
  - `closed`
  - `openLoaded`
  - `openLoading`
  - `openEmpty`
  - `openMissing`
- `messagePreset`
  - `default`
  - `processing`
  - `validation`
  - `error`
  - `highlighted`

### Boolean Toggles

- `sourcesPanelOpen`
- `reasoningPanelOpen`
- `showHighlightedMessage`

### Numeric / Derived Display Controls

- `topBarArtifactCount`

### Required Presets

- `Default Chat`
- `Processing`
- `Artifact Review`
- `Source Review`
- `Error Review`
- `Quota Blocked`
- `Landing`
- `Not Found`
- `Mobile Review`

## Scope Audit Checklist Per Surface

Berikut checklist seluruh scope halaman chat agar tidak ada surface yang tertinggal.

### A. Outer Review Layer

- review strip tampil di atas shell
- preset buttons tampil jelas
- grouped controls tampil wrap-friendly
- controls tidak tercampur dengan `TopBar`
- controls tidak merusak tinggi/layout chat

### B. Desktop Shell Layout

- activity bar kiri
- sidebar desktop
- top bar desktop
- main chat area
- artifact panel kanan
- state sidebar collapsed
- state artifact panel tertutup
- state artifact panel terbuka

### C. Mobile Shell Layout

- mobile header
- mobile sidebar sheet
- active conversation mobile
- landing mobile
- not found mobile
- composer fullscreen visual state

### D. Sidebar Scope

- history mode
- progress mode
- active item styling
- new chat button
- footer credit summary
- compact user summary

### E. Top Bar Scope

- expand sidebar button ketika collapsed
- theme toggle visual
- artifact count indicator
- compact user trigger visual

### F. Empty / Loading / Not Found Scope

- empty state dengan starter templates
- persistent composer di bawah
- loading skeleton state
- conversation not found state

### G. Conversation Scope

- user bubble
- assistant bubble
- assistant bubble dengan source indicator
- assistant bubble dengan artifact indicator
- highlighted source-focus state
- pending assistant lane
- list layout dengan spacing yang stabil

### H. Composer Scope

- idle state
- with context chips
- generating state
- stop button state
- attach/context tray visual
- mobile/fullscreen variant

### I. Process / Reasoning Scope

- hidden state
- processing state dengan progress bar
- complete collapsed state
- complete expanded state
- error process state
- reasoning panel open state

### J. Alerts / Failure Scope

- quota warning banner
- technical report trigger banner
- quota blocked overlay
- generic send error overlay
- retry CTA
- report issue CTA

### K. Sources Scope

- sources sheet open
- verified source rows
- unverified source rows
- unavailable source row
- desktop and mobile visual compatibility

### L. Artifact Panel Scope

- loaded state
- loading state
- empty state
- missing artifact state
- tabs
- toolbar
- content preview area

### M. Paper-Adjacent Review Scope

Walau mockup tetap statis, surface berikut harus punya representasi visual minimal karena production chat menampilkannya:

- validation/pending review card
- choice-card style message block
- workflow/progress context in sidebar

## Implementasi Bertahap

Execution plan per checkpoint:

### Step 1: Route And Runtime Wiring

1. Tambah `ChatPage.jsx`.
2. Register route `#/chat`.
3. Update shell-route detection di `MarketingLayoutMock.jsx`.
4. Tambah include `chat-style.css` dan script `ChatPage.jsx` di `MakalahAI.html`.

Checkpoint outcome:

- `#/chat` bisa dibuka
- chat berada di shell layout
- belum perlu visual lengkap

### Step 2: Shell Skeleton

1. Implement review strip.
2. Implement desktop shell grid.
3. Implement mobile frame.
4. Implement sidebar, top bar, dan artifact panel skeleton.

Checkpoint outcome:

- struktur shell lengkap
- desktop/mobile variants sudah terbaca

### Step 3: Main State Coverage

1. Implement landing state.
2. Implement loading state.
3. Implement not found state.
4. Implement active conversation state.

Checkpoint outcome:

- seluruh state utama halaman sudah tersedia

### Step 4: Conversation Detail Coverage

1. Implement message presets.
2. Implement composer variants.
3. Implement process bar variants.
4. Implement highlighted message state.

Checkpoint outcome:

- surface inti chat bisa diaudit

### Step 5: Hidden And Error Surface Coverage

1. Implement sources sheet forced-visible.
2. Implement reasoning panel forced-visible.
3. Implement quota warning / technical report / send error / quota blocked states.
4. Implement artifact panel variants.

Checkpoint outcome:

- seluruh hidden and error UI sudah bisa dipaksa terlihat

### Step 6: Polish And Audit Pass

1. Rapikan spacing, hierarchy, border, and shell consistency.
2. Rapikan mobile layout.
3. Pastikan controls tidak mengotori surface review.
4. Jalankan verifikasi.

Checkpoint outcome:

- unit siap direview user

## Styling Plan: chat-style.css

Semua styling chat mockup harus dipusatkan di:

```text
docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css
```

### Styling Responsibilities

`chat-style.css` harus menangani:

- review strip
- shell grid
- activity bar
- sidebar
- top bar
- mobile header
- message list
- message bubbles
- composer
- process bar
- alert banners
- overlays
- sources panel
- artifact panel
- reasoning panel

### Styling Guardrails

- reuse token dari `tokens.css` dan shell/layout yang ada bila cocok
- jangan menyebarkan selector chat ke `docs.css`, `support.css`, atau `marketing-shared.css`
- selector harus jelas domain-prefixed, misalnya:
  - `.chat-mock-*`
  - `.chat-shell-*`
  - `.chat-review-*`

## Verification Plan

Minimal verifikasi setelah implementasi:

```bash
git diff --check
git diff --name-only -- src
node -e 'const fs=require("fs"); const parser=require("@babel/parser"); const files=process.argv.slice(1); for (const f of files) parser.parse(fs.readFileSync(f,"utf8"), {sourceType:"script", plugins:["jsx"]}); console.log(`parsed ${files.length} jsx files`);' $(find docs/frontend-marketing-resign-v2/mockup/src -name "*.jsx" | sort)
```

Tambahan verifikasi khusus unit chat:

```bash
rg -n "\"/chat\"|ChatPage" docs/frontend-marketing-resign-v2/mockup/src docs/frontend-marketing-resign-v2/mockup/MakalahAI.html
rg -n "chat-style.css" docs/frontend-marketing-resign-v2/mockup/MakalahAI.html
rg -n "GlobalHeaderMock|FooterMock" docs/frontend-marketing-resign-v2/mockup/src/app/MarketingLayoutMock.jsx
```

Manual inspection checklist:

1. `#/chat` masuk shell layout, bukan marketing chrome.
2. review strip tampil di atas shell.
3. preset dapat mengganti state penting.
4. desktop dan mobile sama-sama terbaca.
5. artifact panel dan sources panel bisa dipaksa visible.
6. quota/error/report states bisa dipaksa visible.

## Definition Of Done

Unit `ChatPage mockup` dianggap selesai jika:

1. `#/chat` terdaftar dan bisa dirender dari runtime mockup.
2. Chat tampil sebagai shell/product page, bukan marketing page.
3. `ChatPage.jsx` mencakup seluruh surface utama production chat yang relevan untuk review visual.
4. Hidden UI dan error UI bisa dipaksa visible lewat state controls.
5. Styling chat terpisah di `chat-style.css`.
6. Tidak ada file production `src/` yang berubah.
7. JSX parse check dan `git diff --check` lolos.

## Out Of Scope

Hal-hal berikut tidak masuk scope unit ini kecuali diminta eksplisit:

- mengubah production chat di `src/`
- membuat chat mockup benar-benar interaktif seperti production
- menghubungkan data real
- menjalankan AI/chat backend
- migrasi Tailwind untuk mockup
- browser automation / screenshot generation
- refactor page mockup lain yang sudah accepted
