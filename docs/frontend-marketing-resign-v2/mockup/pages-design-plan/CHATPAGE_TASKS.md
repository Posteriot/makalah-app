# Tasks: ChatPage Mockup Implementation

Tanggal: 24 April 2026
Worktree: `/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2`
Primary execution plan: `docs/frontend-marketing-resign-v2/mockup/pages-design-plan/CHATPAGE_IMPLEMENTATION_PLAN.md`

## Tujuan Dokumen

Dokumen ini menurunkan implementation plan `ChatPage` menjadi task list operasional yang dapat dieksekusi satu per satu tanpa kehilangan scope halaman chat.

Setiap task di bawah wajib:

1. dikerjakan dengan **multiagents orchestration dispatch**
2. diselesaikan penuh sebelum task berikutnya dimulai
3. melalui review + audit task-level sebelum commit final task
4. di-commit segera setelah task dinyatakan clean
5. hasil review/audit task dicatat sebagai bukti task completion
6. baru lanjut ke task berikutnya setelah hasil review/audit task sebelumnya dibaca dan dianggap aman

Tidak boleh menggabungkan beberapa task besar menjadi satu batch implementasi dan satu commit besar.

## Aturan Eksekusi Wajib

### Multiagents Orchestration

Setiap task harus memakai pola orchestrator + specialist agents.

Peran minimum:

1. **Orchestrator**
   - memegang konteks penuh
   - memilih task aktif
   - membagi write scope
   - mengintegrasikan hasil
   - menjalankan verifikasi
   - menilai readiness sebelum commit

2. **Implementation agent**
   - mengerjakan perubahan kode/task aktif
   - hanya pada write scope yang ditetapkan

3. **Reviewer agent**
   - review hasil implementasi task
   - fokus bug, visual regression risk, missing state, structural mismatch terhadap plan

4. **Auditor agent**
   - audit compliance terhadap handoff, runtime constraints, scope boundaries, dan definition of done task

### Ownership Dan Write Scope Rules

Setiap task wajib menetapkan ownership file/area secara eksplisit sebelum dispatch implementation agent.

Aturan wajib:

1. Satu implementation agent hanya boleh memegang satu write scope utama pada satu waktu.
2. Jangan kirim dua implementation agent untuk mengedit file yang sama pada task yang sama.
3. Reviewer agent dan auditor agent tidak boleh mengedit file.
4. Jika satu task hanya menyentuh satu file utama, implementation tetap boleh dikerjakan satu agent saja.
5. Jika satu task butuh beberapa agent implementasi, write scope harus dibagi per file atau per area yang tidak overlap.

Format minimal yang harus dipakai orchestrator per task:

- `Task owner`
- `Write scope`
- `Read-only review scope`

### Commit Discipline

Untuk setiap task:

1. implement task
2. verifikasi task
3. dispatch reviewer agent
4. dispatch auditor agent
5. baca hasil review/audit
6. jika ada revisi, perbaiki dalam task yang sama
7. ulangi verifikasi task bila perlu
8. commit final task setelah status task clean
9. catat bukti commit + review + audit
10. hanya setelah task clean, lanjut task berikutnya

Jangan menunda commit sampai beberapa task selesai.

Catatan:

- Model ini sengaja menghindari commit “sementara” sebelum review/audit agar riwayat branch tidak pecah tanpa alasan.
- Jika user secara eksplisit meminta commit checkpoint mentah sebelum review, itu harus dianggap exception, bukan aturan default.

### Review/Audit Discipline

Setiap task selesai wajib melalui dua jalur:

1. **Reviewer agent**
   - mengecek kualitas implementasi task
   - mencari gap surface, bug state, dan regression risk

2. **Auditor agent**
   - mengecek apakah task patuh pada:
     - `HANDOFF_PROMPT.md`
     - `CHATPAGE_IMPLEMENTATION_PLAN.md`
     - runtime UMD + Babel
     - larangan edit `src/`
     - aturan `chat-style.css`

Task berikutnya tidak boleh dimulai sebelum kedua hasil ini dibaca oleh orchestrator.

## Global Task Completion Rules

Semua task harus menjaga aturan berikut:

- hanya edit file di `docs/frontend-marketing-resign-v2/mockup/`
- jangan edit `src/`
- jangan tambah `import`, `export`, TypeScript, Next.js API, Convex, `fetch`, atau dependency baru
- semua style chat harus masuk `chat-style.css`
- `#/chat` harus tetap shell route
- state controls harus tetap di luar `ChatMockShell`
- hidden/error states harus tetap dipaksa visible lewat controls, bukan disembunyikan demi realism

### CSS Discipline

Aturan `chat-style.css` berlaku dari task pertama, bukan baru saat task styling consolidation.

Artinya:

1. Semua style baru yang khusus untuk chat harus langsung ditulis ke `chat-style.css`.
2. Task 14 bukan legalisasi style yang tercecer, tetapi audit + rapikan + konsolidasi final atas selector yang memang sejak awal sudah berada di `chat-style.css`.
3. Jika selama task berjalan ditemukan style chat tercecer ke file lain, itu dianggap defect yang harus dibereskan sebelum task dinyatakan clean.

## Bukti Task Completion

Setiap task wajib menghasilkan catatan bukti minimal:

- `Task ID`
- `Task owner`
- `Write scope`
- `Verification status`
- `Reviewer result`
- `Auditor result`
- `Final commit hash`

Catatan ini boleh disimpan di session log, PR notes, atau artefak kerja terstruktur lain, tetapi orchestrator wajib bisa menunjukkannya saat Task 15.

## Task 1: Runtime Wiring Dan Entry Registration

### Tujuan

Menyiapkan pondasi runtime agar `ChatPage` bisa dirender sebagai shell route yang sah.

### Scope

- tambah file `ChatPage.jsx`
- register `#/chat`
- update shell-route detection
- register `chat-style.css`
- register script `ChatPage.jsx`

### Ownership

- Task owner: orchestrator + 1 implementation agent
- Write scope:
  - `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/src/app/MockRouter.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/src/app/MarketingLayoutMock.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/MakalahAI.html`
  - `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css`
- Read-only review scope:
  - `docs/frontend-marketing-resign-v2/HANDOFF_PROMPT.md`

### Subtasks

1. Buat file `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx` dengan skeleton minimal dan expose global component.
2. Tambahkan route `"/chat"` ke `MockRouter.jsx`.
3. Pastikan route registry merender `<ChatPage />`.
4. Update `MarketingLayoutMock.jsx` agar `#/chat` masuk shell route family.
5. Tambahkan `<link rel="stylesheet" href="styles/chat-style.css?...">` di `MakalahAI.html`.
6. Tambahkan script include `src/app/pages/ChatPage.jsx?...` di `MakalahAI.html` dengan urutan yang benar.
7. Buat file `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css` dengan placeholder domain header agar audit awal mudah.

### Deliverables

- `#/chat` sudah valid di router
- `ChatPage` bisa dirender
- chat tidak memakai marketing header/footer
- `chat-style.css` sudah terdaftar

### Acceptance Criteria

- route `#/chat` terdaftar di route keys dan route registry
- `ChatPage` diexpose via global registration
- `MarketingLayoutMock` memperlakukan `#/chat` sebagai shell route
- `MakalahAI.html` memuat `chat-style.css` dan `ChatPage.jsx`
- tidak ada perubahan di `src/`

### Verification

- `git diff --check`
- `git diff --name-only -- src`
- parse JSX mockup dengan Babel parser
- `rg -n "\"/chat\"|ChatPage" docs/frontend-marketing-resign-v2/mockup/src docs/frontend-marketing-resign-v2/mockup/MakalahAI.html`
- `rg -n "chat-style.css" docs/frontend-marketing-resign-v2/mockup/MakalahAI.html`

### Commit Rule

Commit segera setelah runtime wiring lolos verifikasi.

### Mandatory Post-Task Dispatch

- dispatch implementation reviewer
- dispatch compliance auditor

## Task 2: ChatPage Skeleton Dan Review Strip

### Tujuan

Membangun struktur halaman utama yang memisahkan tooling review dari surface chat.

### Scope

- `ChatPage`
- `ChatMockStateControls`
- `ChatMockShell`
- state default
- preset base

### Ownership

- Task owner: orchestrator + 1 implementation agent
- Write scope:
  - `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css`
- Read-only review scope:
  - `CHATPAGE_IMPLEMENTATION_PLAN.md`

### Subtasks

1. Buat struktur root `chat-mock-page`.
2. Tambahkan `ChatMockStateControls` sebagai review strip di atas shell.
3. Tambahkan `ChatMockShell` di bawah controls.
4. Definisikan `DEFAULT_CHAT_MOCK_STATE`.
5. Definisikan preset minimum:
   - `Default Chat`
   - `Processing`
   - `Artifact Review`
   - `Source Review`
   - `Error Review`
   - `Quota Blocked`
   - `Landing`
   - `Not Found`
   - `Mobile Review`
6. Tambahkan helper update state untuk review strip.
7. Styling dasar review strip dipindahkan ke `chat-style.css`.

### Deliverables

- review strip tampil jelas di atas shell
- preset bisa mengubah state utama
- state controls tidak menyaru sebagai top bar chat

### Acceptance Criteria

- `ChatMockStateControls` dirender sebelum `ChatMockShell`
- root state default tersedia dan dipakai
- seluruh preset minimum tersedia sebagai tombol/selector yang eksplisit
- styling review strip berada di `chat-style.css`

### Verification

- parse JSX
- cek selector `chat-mock-controls` / `chat-mock-page` / `chat-mock-shell`
- audit visual structure secara kode

### Commit Rule

Commit setelah skeleton root dan review strip stabil.

### Mandatory Post-Task Dispatch

- dispatch implementation reviewer
- dispatch compliance auditor

## Task 3: Desktop Shell Layout

### Tujuan

Membangun struktur shell desktop yang meniru arsitektur visual production chat.

### Scope

- `ChatMockActivityBar`
- `ChatMockSidebar`
- `ChatMockTopBar`
- desktop main shell grid
- desktop artifact panel slot

### Ownership

- Task owner: orchestrator + 1 implementation agent
- Write scope:
  - `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css`
- Read-only review scope:
  - `src/components/chat/layout/ChatLayout.tsx`
  - `src/components/chat/shell/ActivityBar.tsx`
  - `src/components/chat/shell/TopBar.tsx`
  - `src/components/chat/ChatSidebar.tsx`

### Subtasks

1. Buat grid desktop shell.
2. Implement activity bar kiri.
3. Implement sidebar desktop.
4. Implement top bar desktop.
5. Tambahkan slot artifact panel kanan.
6. Tambahkan variant `sidebar expanded`.
7. Tambahkan variant `sidebar collapsed`.
8. Tambahkan artifact count visual di top bar.
9. Tambahkan footer summary sidebar untuk credit/user summary.

### Deliverables

- shell desktop lengkap
- sidebar collapse state terbaca
- top bar tidak bercampur dengan review strip

### Acceptance Criteria

- desktop shell menampilkan activity bar, sidebar, main, dan slot artifact panel
- variant sidebar expanded/collapsed bisa diganti dari state
- top bar punya artifact count visual
- tidak ada elemen review strip yang masuk ke shell desktop

### Verification

- parse JSX
- audit shell structure terhadap production mapping
- cek class selector desktop shell di `chat-style.css`

### Commit Rule

Commit setelah desktop shell stabil walau main content masih placeholder.

### Mandatory Post-Task Dispatch

- dispatch implementation reviewer
- dispatch compliance auditor

## Task 4: Mobile Shell Layout

### Tujuan

Menyediakan representasi mobile chat surface yang reviewable.

### Scope

- `ChatMockMobileFrame`
- `ChatMockMobileHeader`
- `ChatMockMobileSidebarSheet`

### Ownership

- Task owner: orchestrator + 1 implementation agent
- Write scope:
  - `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css`
- Read-only review scope:
  - `src/components/chat/layout/ChatLayout.tsx`
  - `src/components/chat/ChatWindow.tsx`

### Subtasks

1. Buat mobile frame wrapper.
2. Implement mobile header.
3. Implement mobile sidebar sheet visual.
4. Tambahkan variant `mobileSheetOpen`.
5. Tambahkan state `mobileFullscreen` untuk composer compatibility.
6. Pastikan mobile shell memakai state controls yang sama dengan desktop.

### Deliverables

- mobile review preset bekerja
- mobile header dan mobile sidebar sheet terlihat jelas

### Acceptance Criteria

- state `viewport = mobile` menghasilkan shell mobile yang berbeda dari desktop
- state `sidebarState = mobileSheetOpen` menampilkan sidebar sheet mobile
- mobile header terlihat sebagai surface mobile-only
- `composerState = mobileFullscreen` bisa direpresentasikan secara visual

### Verification

- parse JSX
- audit state branching mobile vs desktop
- audit CSS mobile selectors

### Commit Rule

Commit setelah mobile shell visual sudah utuh.

### Mandatory Post-Task Dispatch

- dispatch implementation reviewer
- dispatch compliance auditor

## Task 5: Main Content States

### Tujuan

Menyelesaikan semua state utama halaman sebelum detail conversation diisi.

### Scope

- `ChatMockEmptyState`
- `ChatMockLoadingState`
- `ChatMockNotFoundState`
- `ChatMockConversationView` placeholder

### Ownership

- Task owner: orchestrator + 1 implementation agent
- Write scope:
  - `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css`
- Read-only review scope:
  - `src/components/chat/ChatWindow.tsx`

### Subtasks

1. Implement landing empty state dengan starter templates.
2. Implement persistent composer di landing state.
3. Implement loading skeleton state.
4. Implement not found state.
5. Implement active conversation container placeholder.
6. Hubungkan semua state dengan `conversationState`.

### Deliverables

- `landing`
- `loading`
- `active`
- `notFound`

semua sudah bisa ditampilkan dari controls.

### Acceptance Criteria

- `conversationState` memiliki empat branch eksplisit
- landing state punya starter templates
- loading state punya skeleton
- not found state punya pesan error yang jelas
- active state sudah punya container conversation yang siap diisi task berikutnya

### Verification

- parse JSX
- cek branch `conversationState`
- audit apakah semua state utama tersedia dan mutually exclusive

### Commit Rule

Commit setelah empat state utama sudah lengkap.

### Mandatory Post-Task Dispatch

- dispatch implementation reviewer
- dispatch compliance auditor

## Task 6: Sidebar Modes Dan Shell Data

### Tujuan

Melengkapi data mock dan representasi shell kiri agar tidak hanya dekoratif.

### Scope

- data conversations
- data progress items
- sidebar mode history/progress

### Ownership

- Task owner: orchestrator + 1 implementation agent
- Write scope:
  - `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css`
- Read-only review scope:
  - `src/components/chat/ChatSidebar.tsx`
  - `src/components/chat/sidebar/SidebarChatHistory.tsx`
  - `src/components/chat/sidebar/SidebarQueueProgress.tsx`

### Subtasks

1. Definisikan `CHAT_MOCK_CONVERSATIONS`.
2. Definisikan `CHAT_MOCK_PROGRESS_ITEMS`.
3. Definisikan `CHAT_MOCK_USER_SUMMARY`.
4. Definisikan `CHAT_MOCK_CREDIT_SUMMARY`.
5. Implement sidebar mode `history`.
6. Implement sidebar mode `progress`.
7. Tambahkan active conversation styling.
8. Tambahkan tombol `Percakapan Baru`.

### Deliverables

- sidebar history terasa penuh
- sidebar progress punya isi nyata
- shell kiri reviewable

### Acceptance Criteria

- mode `history` dan `progress` sama-sama punya isi mock yang jelas
- active conversation terbaca secara visual
- tombol `Percakapan Baru` tampil di sidebar history
- footer summary sidebar tetap terlihat

### Verification

- parse JSX
- audit mock data shape
- audit mode switch `history` vs `progress`

### Commit Rule

Commit setelah dua mode sidebar berfungsi penuh secara visual.

### Mandatory Post-Task Dispatch

- dispatch implementation reviewer
- dispatch compliance auditor

## Task 7: Message Presets Dan Bubble System

### Tujuan

Membangun surface percakapan utama agar production chat anatomy terbaca.

### Scope

- `ChatMockMessageList`
- `ChatMockMessageBubble`
- pending assistant indicator
- message presets

### Ownership

- Task owner: orchestrator + 1 implementation agent
- Write scope:
  - `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css`
- Read-only review scope:
  - `src/components/chat/ChatWindow.tsx`
  - `src/components/chat/MessageBubble.tsx`

### Subtasks

1. Definisikan `CHAT_MOCK_MESSAGES_DEFAULT`.
2. Definisikan `CHAT_MOCK_MESSAGES_PROCESSING`.
3. Definisikan `CHAT_MOCK_MESSAGES_VALIDATION`.
4. Definisikan `CHAT_MOCK_MESSAGES_ERROR`.
5. Definisikan `CHAT_MOCK_MESSAGES_HIGHLIGHTED`.
6. Implement user bubble.
7. Implement assistant bubble.
8. Implement source indicator visual.
9. Implement artifact indicator visual.
10. Implement highlighted message state.
11. Implement pending assistant lane indicator.
12. Hubungkan semua ke `messagePreset`.

### Deliverables

- anatomy message list lengkap
- preset conversation penting bisa diganti dari controls

### Acceptance Criteria

- seluruh `messagePreset` terdefinisi dan bisa dirender
- ada representasi user bubble dan assistant bubble
- source indicator terlihat pada minimal satu preset
- artifact indicator terlihat pada minimal satu preset
- highlighted state terlihat pada preset khusus
- pending assistant indicator terlihat pada preset processing

### Verification

- parse JSX
- audit seluruh `messagePreset`
- audit apakah highlight, sources, artifact, pending indicator semua tersedia

### Commit Rule

Commit setelah message system lengkap secara visual.

### Mandatory Post-Task Dispatch

- dispatch implementation reviewer
- dispatch compliance auditor

## Task 8: Composer Dan Context Tray

### Tujuan

Menyelesaikan area input sebagai elemen paling kritis di surface chat.

### Scope

- `ChatMockComposer`
- attachment/context tray
- generating state
- mobile fullscreen visual state

### Ownership

- Task owner: orchestrator + 1 implementation agent
- Write scope:
  - `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css`
- Read-only review scope:
  - `src/components/chat/ChatInput.tsx`

### Subtasks

1. Definisikan `CHAT_MOCK_ATTACHMENTS`.
2. Definisikan `CHAT_MOCK_CONTEXT_FILES`.
3. Implement composer idle state.
4. Implement composer with context chips state.
5. Implement generating state dengan tombol stop.
6. Implement attach/context action row.
7. Implement mobile fullscreen composer visual.
8. Hubungkan semuanya ke `composerState`.

### Deliverables

- composer idle / withContext / generating / mobileFullscreen lengkap

### Acceptance Criteria

- `composerState` punya empat branch eksplisit
- withContext state menampilkan chips/context tray
- generating state menampilkan tombol stop
- mobileFullscreen state terbaca berbeda dari idle desktop

### Verification

- parse JSX
- audit branching `composerState`
- audit visual tray context files

### Commit Rule

Commit setelah semua variant composer selesai.

### Mandatory Post-Task Dispatch

- dispatch implementation reviewer
- dispatch compliance auditor

## Task 9: Process Bar Dan Reasoning Surface

### Tujuan

Memperlihatkan hidden process UI dan reasoning UI secara eksplisit.

### Scope

- `ChatMockProcessBar`
- `ChatMockReasoningPanel`
- reasoning mock data

### Ownership

- Task owner: orchestrator + 1 implementation agent
- Write scope:
  - `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css`
- Read-only review scope:
  - `src/components/chat/ChatProcessStatusBar.tsx`
  - `src/components/chat/ReasoningActivityPanel.tsx`

### Subtasks

1. Definisikan `CHAT_MOCK_REASONING_STEPS`.
2. Definisikan `CHAT_MOCK_PROCESS_SUMMARIES`.
3. Implement process hidden state.
4. Implement processing state.
5. Implement complete collapsed state.
6. Implement complete expanded state.
7. Implement error state.
8. Implement reasoning panel open state.
9. Hubungkan ke `processState` dan `reasoningPanelOpen`.

### Deliverables

- seluruh process state bisa dipaksa visible
- reasoning panel bisa dibuka untuk audit

### Acceptance Criteria

- seluruh nilai `processState` punya visual berbeda
- processing state menampilkan progress bar
- completeExpanded menampilkan narasi/summary terbuka
- error process state terlihat jelas
- `reasoningPanelOpen` benar-benar menampilkan panel reasoning

### Verification

- parse JSX
- audit seluruh `processState`
- audit reasoning panel open/close state

### Commit Rule

Commit setelah process/reasoning coverage lengkap.

### Mandatory Post-Task Dispatch

- dispatch implementation reviewer
- dispatch compliance auditor

## Task 10: Sources Sheet

### Tujuan

Memastikan rujukan/sources surface bisa diaudit sebagai panel tersendiri.

### Scope

- `ChatMockSourcesSheet`
- source rows
- verified/unverified/unavailable visual states

### Ownership

- Task owner: orchestrator + 1 implementation agent
- Write scope:
  - `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css`
- Read-only review scope:
  - `src/components/chat/SourcesPanel.tsx`

### Subtasks

1. Definisikan `CHAT_MOCK_SOURCES`.
2. Implement sources sheet layout.
3. Implement source row verified.
4. Implement source row unverified.
5. Implement source row unavailable.
6. Implement desktop visual behavior.
7. Implement mobile visual behavior.
8. Hubungkan ke `sourcesPanelOpen`.

### Deliverables

- sources sheet reviewable
- variasi source status terlihat

### Acceptance Criteria

- `sourcesPanelOpen` menampilkan sheet/panel sources
- ada minimal satu row verified
- ada minimal satu row unverified
- ada minimal satu row unavailable
- sources sheet tetap terbaca di desktop dan mobile

### Verification

- parse JSX
- audit source data coverage
- audit source row status variants

### Commit Rule

Commit setelah sources sheet stabil.

### Mandatory Post-Task Dispatch

- dispatch implementation reviewer
- dispatch compliance auditor

## Task 11: Artifact Panel Variants

### Tujuan

Menyelesaikan panel kanan yang menjadi bagian kunci visual production chat.

### Scope

- `ChatMockArtifactPanel`
- tabs
- toolbar
- content
- loading / empty / missing states

### Ownership

- Task owner: orchestrator + 1 implementation agent
- Write scope:
  - `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css`
- Read-only review scope:
  - `src/components/chat/ArtifactPanel.tsx`
  - `src/components/chat/ArtifactTabs.tsx`
  - `src/components/chat/ArtifactToolbar.tsx`

### Subtasks

1. Definisikan `CHAT_MOCK_ARTIFACT_TABS`.
2. Definisikan `CHAT_MOCK_ARTIFACT_ACTIVE`.
3. Definisikan `CHAT_MOCK_ARTIFACT_EMPTY`.
4. Definisikan `CHAT_MOCK_ARTIFACT_MISSING`.
5. Implement artifact panel loaded state.
6. Implement artifact panel loading state.
7. Implement artifact panel empty state.
8. Implement artifact panel missing state.
9. Implement tabs.
10. Implement toolbar.
11. Hubungkan ke `artifactPanelState`.

### Deliverables

- seluruh state panel kanan tersedia
- artifact review preset valid

### Acceptance Criteria

- seluruh `artifactPanelState` punya branch eksplisit
- loaded state menampilkan tabs + toolbar + content
- loading state menampilkan loading panel
- empty state menampilkan placeholder empty
- missing state menampilkan placeholder missing

### Verification

- parse JSX
- audit seluruh `artifactPanelState`
- audit tabs + toolbar + content area presence

### Commit Rule

Commit setelah artifact panel coverage lengkap.

### Mandatory Post-Task Dispatch

- dispatch implementation reviewer
- dispatch compliance auditor

## Task 12: Alerts, Failure Surface, Dan Technical Report States

### Tujuan

Menuntaskan seluruh warning/error/support surface yang harus dipaksa visible untuk review.

### Scope

- `ChatMockAlertLayer`
- quota warning
- technical report trigger
- quota blocked overlay
- send error overlay

### Ownership

- Task owner: orchestrator + 1 implementation agent
- Write scope:
  - `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css`
- Read-only review scope:
  - `src/components/chat/QuotaWarningBanner.tsx`
  - `src/components/technical-report/ChatTechnicalReportButton.tsx`
  - `src/components/chat/ChatWindow.tsx`

### Subtasks

1. Definisikan `CHAT_MOCK_ALERTS`.
2. Implement `alertState = none`.
3. Implement `alertState = quotaWarning`.
4. Implement `alertState = technicalReport`.
5. Implement `alertState = quotaBlocked`.
6. Implement `alertState = sendError`.
7. Tambahkan CTA visual untuk retry/report issue.
8. Pastikan overlay tidak merusak composer.

### Deliverables

- seluruh failure/support state tampil jelas
- handoff requirement hidden/error surface terpenuhi

### Acceptance Criteria

- seluruh nilai `alertState` punya branch eksplisit
- quota warning tampil sebagai banner
- technical report tampil sebagai trigger banner/support layer
- quota blocked tampil sebagai overlay blocker
- send error tampil sebagai overlay error dengan CTA retry/report

### Verification

- parse JSX
- audit semua branch `alertState`
- audit overlay placement relative to main/content/composer

### Commit Rule

Commit setelah semua alert/failure states lengkap.

### Mandatory Post-Task Dispatch

- dispatch implementation reviewer
- dispatch compliance auditor

## Task 13: Paper-Adjacent Review Surface

### Tujuan

Menyediakan representasi visual minimal untuk paper-oriented surface yang memang muncul di production chat.

### Scope

- validation card / pending review block
- choice-card style message block
- workflow/progress context reinforcement

### Ownership

- Task owner: orchestrator + 1 implementation agent
- Write scope:
  - `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx`
  - `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css`
- Read-only review scope:
  - `src/components/chat/ChatWindow.tsx`
  - `src/components/chat/json-renderer/components/ChoiceCardShell.tsx`

### Subtasks

1. Tambahkan validation/pending review card di preset yang sesuai.
2. Tambahkan choice-card style block pada message preset validation.
3. Pastikan sidebar progress dan validation surface saling koheren.
4. Pastikan state ini tetap statis dan reviewable.

### Deliverables

- paper-adjacent chat state terbaca
- tidak ada gap besar terhadap production chat surface

### Acceptance Criteria

- preset validation benar-benar memunculkan validation/pending review surface
- choice-card style message block terlihat sebagai surface tersendiri
- sidebar progress dan validation message tidak saling bertabrakan secara visual

### Verification

- parse JSX
- audit presence of validation + choice-card visual state

### Commit Rule

Commit setelah paper-adjacent surface selesai.

### Mandatory Post-Task Dispatch

- dispatch implementation reviewer
- dispatch compliance auditor

## Task 14: Styling Consolidation Di chat-style.css

### Tujuan

Memastikan seluruh style chat terkonsolidasi bersih di file auditable tunggal.

### Scope

- migrasi/rapikan semua selector chat ke `chat-style.css`
- hilangkan style chat yang tercecer

### Ownership

- Task owner: orchestrator + 1 implementation agent
- Write scope:
  - `docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css`
  - `docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx`
- Read-only review scope:
  - seluruh file style mockup yang terkait

### Subtasks

1. Audit selector chat yang dipakai `ChatPage.jsx`.
2. Pastikan seluruh selector itu berada di `chat-style.css`.
3. Pastikan tidak ada style chat baru yang disebar ke file domain lain.
4. Rapikan grouping selector:
   - review strip
   - shell
   - sidebar
   - top bar
   - main
   - messages
   - composer
   - process
   - panels
   - alerts
5. Rapikan mobile section.

### Deliverables

- `chat-style.css` menjadi single source untuk styling chat mockup

### Acceptance Criteria

- seluruh selector chat aktif berada di `chat-style.css`
- tidak ada selector chat baru di file domain style lain
- `ChatPage.jsx` tidak bergantung pada style inline yang seharusnya domain CSS

### Verification

- audit selector chat terhadap file CSS
- cek tidak ada leakage ke file style lain

### Commit Rule

Commit setelah consolidation CSS selesai.

### Mandatory Post-Task Dispatch

- dispatch implementation reviewer
- dispatch compliance auditor

## Task 15: Final Verification Dan Readiness Audit

### Tujuan

Melakukan penutupan unit `ChatPage mockup` secara disiplin sebelum dianggap siap review user.

### Scope

- verification commands
- definition of done audit
- final readiness checkpoint

### Ownership

- Task owner: orchestrator
- Write scope:
  - tidak ada write scope wajib
- Read-only review scope:
  - seluruh file yang disentuh task 1-14

### Subtasks

1. Jalankan `git diff --check`.
2. Jalankan `git diff --name-only -- src`.
3. Jalankan JSX parse check.
4. Jalankan grep khusus route/chat-style/shell route.
5. Audit seluruh preset dan state controls.
6. Audit seluruh scope checklist:
   - review strip
   - desktop shell
   - mobile shell
   - main states
   - message presets
   - composer variants
   - process/reasoning
   - sources
   - artifact panel
   - alert/error surface
7. Pastikan task sebelumnya semua sudah pernah melalui commit + review + audit.

### Deliverables

- unit siap dikirim untuk review user
- tidak ada scope halaman chat yang tertinggal

### Acceptance Criteria

- seluruh task 1-14 punya bukti verification + review + audit + final commit hash
- verification commands lulus
- tidak ada file `src/` yang berubah
- seluruh state control utama masih tersedia
- definition of done dari plan utama terpenuhi

### Verification

Gunakan seluruh command dari `CHATPAGE_IMPLEMENTATION_PLAN.md`.

### Commit Rule

Commit final readiness pass jika task ini menghasilkan perubahan.

### Mandatory Post-Task Dispatch

- dispatch final implementation reviewer
- dispatch final compliance auditor

## Task Order Wajib

Urutan task tidak boleh diacak:

1. [x] Task 1: Runtime Wiring Dan Entry Registration
2. [x] Task 2: ChatPage Skeleton Dan Review Strip
3. [x] Task 3: Desktop Shell Layout
4. [ ] Task 4: Mobile Shell Layout
5. [ ] Task 5: Main Content States
6. [ ] Task 6: Sidebar Modes Dan Shell Data
7. Task 7: Message Presets Dan Bubble System
8. Task 8: Composer Dan Context Tray
9. Task 9: Process Bar Dan Reasoning Surface
10. Task 10: Sources Sheet
11. Task 11: Artifact Panel Variants
12. Task 12: Alerts, Failure Surface, Dan Technical Report States
13. Task 13: Paper-Adjacent Review Surface
14. Task 14: Styling Consolidation Di chat-style.css
15. Task 15: Final Verification Dan Readiness Audit

## Stop Conditions

Eksekusi harus berhenti dan minta keputusan baru jika:

1. ada kebutuhan edit `src/`
2. ada konflik dengan accepted behavior page lain
3. shell route `#/chat` ternyata butuh perubahan fondasi yang melampaui scope mockup
4. reviewer atau auditor menemukan mismatch besar terhadap handoff
5. ada perubahan user yang bentrok dengan task aktif

## Definition Of Done Dokumen Tasks

Dokumen tasks ini dianggap berhasil dipakai jika:

1. setiap task dikerjakan satu per satu
2. setiap task punya subtasks jelas
3. setiap task memakai multiagents orchestration dispatch
4. setiap task di-commit setelah selesai
5. setiap task wajib melalui reviewer + auditor dispatch sebelum lanjut
6. tidak ada satupun surface halaman chat yang tertinggal dari execution sequence
