# Chat Page Audit Baseline - File Map dan Relasi Komponen

Scope: Halaman `/chat` dan `/chat/[conversationId]`  
Tujuan: Baseline awal untuk audit dan perbaikan seluruh fitur chat, konsistensi styling, mode dark/light, dan desktop/mobile.

## Ringkasan Baseline

- Total file aktif yang ter-trace dari entry route chat: **81 file**.
- Metode: transitive import tracing dari:
  - `src/app/chat/page.tsx`
  - `src/app/chat/[conversationId]/page.tsx`
  - `src/app/chat/layout.tsx`
- Baseline ini fokus pada:
  - Pemetaan parent-child komponen
  - Pengelompokan file berdasarkan fungsi
  - Daftar file aktif yang benar-benar ikut runtime halaman chat

## Entry Route

- `src/app/chat/page.tsx`
- `src/app/chat/[conversationId]/page.tsx`
- `src/app/chat/layout.tsx`

## Relasi Parent-Child Utama

```text
/chat page + /chat/[conversationId] page
  -> ChatContainer
    -> ChatLayout
      -> ActivityBar
      -> ChatSidebar
         -> SidebarChatHistory | SidebarPaperSessions | SidebarProgress
      -> TopBar
      -> PanelResizer
      -> children: ChatWindow
      -> artifactPanel: ArtifactPanel
    -> ChatWindow
      -> TemplateGrid
      -> MessageBubble
         -> MarkdownRenderer
            -> InlineCitationChip
               -> ai-elements/inline-citation
         -> QuickActions / ToolStateIndicator / SearchStatusIndicator / SourcesIndicator / ArtifactIndicator
      -> ChatInput
         -> FileUploadButton
      -> ChatProcessStatusBar
      -> QuotaWarningBanner
      -> PaperValidationPanel
    -> ArtifactPanel
      -> ArtifactTabs
      -> ArtifactToolbar
      -> ArtifactViewer
         -> ArtifactEditor / ChartRenderer / MarkdownRenderer / SourcesIndicator / Refrasa*
      -> FullsizeArtifactModal
```

## Kategori File Aktif

### 1) Entry Route Chat

- `src/app/chat/page.tsx`
- `src/app/chat/[conversationId]/page.tsx`
- `src/app/chat/layout.tsx`

### 2) Orkestrasi Layout dan Navigasi

- `src/components/chat/ChatContainer.tsx`
- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/layout/PanelResizer.tsx`
- `src/components/chat/shell/ActivityBar.tsx`
- `src/components/chat/shell/TopBar.tsx`
- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/sidebar/SidebarChatHistory.tsx`
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/chat/sidebar/SidebarProgress.tsx`

### 3) Area Percakapan (Message Flow)

- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/FileUploadButton.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/QuickActions.tsx`
- `src/components/chat/ChatProcessStatusBar.tsx`
- `src/components/chat/QuotaWarningBanner.tsx`
- `src/components/chat/messages/TemplateGrid.tsx`
- `src/components/chat/SearchStatusIndicator.tsx`
- `src/components/chat/ToolStateIndicator.tsx`
- `src/components/chat/ArtifactIndicator.tsx`
- `src/components/chat/SourcesIndicator.tsx`
- `src/components/chat/MarkdownRenderer.tsx`
- `src/components/chat/InlineCitationChip.tsx`
- `src/components/ai-elements/inline-citation.tsx`

### 4) Workspace Artifak

- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/ArtifactTabs.tsx`
- `src/components/chat/ArtifactToolbar.tsx`
- `src/components/chat/ArtifactViewer.tsx`
- `src/components/chat/ArtifactEditor.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/components/chat/ChartRenderer.tsx`

### 5) Integrasi Paper Workflow

- `src/components/paper/PaperValidationPanel.tsx`
- `src/components/paper/RewindConfirmationDialog.tsx`
- `src/components/paper/index.ts`
- `src/lib/hooks/usePaperSession.ts`
- `src/lib/paper/title-resolver.ts`
- `src/lib/utils/paperPermissions.ts`
- `convex/paperSessions/constants.ts`

### 6) Integrasi Refrasa

- `src/components/refrasa/index.ts`
- `src/components/refrasa/RefrasaTabContent.tsx`
- `src/components/refrasa/RefrasaToolbar.tsx`
- `src/components/refrasa/RefrasaIssueItem.tsx`
- `src/components/refrasa/RefrasaLoadingIndicator.tsx`
- `src/lib/hooks/useRefrasa.ts`
- `src/lib/refrasa/types.ts`
- `src/lib/refrasa/loading-messages.ts`

### 7) Hook, Auth, Data Access, dan Util Inti

- `src/lib/auth-client.ts`
- `src/lib/hooks/useCurrentUser.ts`
- `src/lib/hooks/useConversations.ts`
- `src/lib/hooks/useCleanupEmptyConversations.ts`
- `src/lib/hooks/useMessages.ts`
- `src/lib/hooks/useArtifactTabs.ts`
- `src/lib/hooks/useCreditMeter.ts`
- `src/lib/date/formatters.ts`
- `src/lib/citations/apaWeb.ts`
- `src/lib/utils/mermaid.ts`
- `src/lib/utils/subscription.ts`
- `src/lib/utils.ts`
- `convex/_generated/api.js`
- `convex/billing/constants.ts`

### 8) Shared UI yang Dipakai Halaman Chat

- `src/components/billing/CreditMeter.tsx`
- `src/components/layout/header/index.ts`
- `src/components/ui/button.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/tooltip.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/SegmentBadge.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/context-menu.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/collapsible.tsx`
- `src/components/ui/carousel.tsx`
- `src/components/ui/hover-card.tsx`

## Catatan Boundary Scope

File dalam `src/components/chat` yang saat ini ada di codebase tetapi belum masuk tree aktif runtime dari entry route chat (berdasarkan trace ini):

- `src/components/chat/ArtifactList.tsx`
- `src/components/chat/ChatMiniFooter.tsx`
- `src/components/chat/MermaidRenderer.tsx`
- `src/components/chat/ThinkingIndicator.tsx`
- `src/components/chat/VersionHistoryDialog.tsx`
- `src/components/chat/layout/useResizer.ts`