# Task Breakdown: MVP Basic Chat Feature

## Overview
**Total Tasks:** 47 tasks across 6 phases
**Total Estimated Time:** 16-22 hours
**Critical Path:** Phase 1 → Phase 2 → Phase 3 → Phase 6
**Parallel Opportunities:** Phase 4 & 5 dapat dilakukan bersamaan dengan Phase 3

---

## Task List

### Phase 1: Database & API Setup
**Priority:** HIGH
**Estimated Time:** 2-3 hours
**Dependencies:** None

#### Task Group 1.1: Convex Schema Migration
**Dependencies:** None

- [x] **CHAT-001:** Update Convex schema dengan conversations table
  - **Time:** 15 min
  - **Priority:** HIGH
  - **Files to Modify:**
    - `convex/schema.ts`
  - **Success Criteria:**
    - conversations table defined dengan fields: userId, title, createdAt, updatedAt, lastMessageAt
    - Indexes: by_user, by_user_updated
    - Schema validates tanpa error
  - **Details:**
    ```typescript
    conversations: defineTable({
      userId: v.id("users"),
      title: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      lastMessageAt: v.number(),
    })
      .index("by_user", ["userId", "lastMessageAt"])
      .index("by_user_updated", ["userId", "updatedAt"])
    ```

- [x] **CHAT-002:** Update Convex schema dengan messages table
  - **Time:** 15 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-001
  - **Files to Modify:**
    - `convex/schema.ts`
  - **Success Criteria:**
    - messages table defined dengan fields: conversationId, role, content, createdAt, fileIds, metadata
    - Indexes: by_conversation, by_conversation_role
    - Schema validates tanpa error
  - **Details:**
    ```typescript
    messages: defineTable({
      conversationId: v.id("conversations"),
      role: v.string(), // "user" | "assistant" | "system"
      content: v.string(),
      createdAt: v.number(),
      fileIds: v.optional(v.array(v.id("files"))),
      metadata: v.optional(v.object({
        model: v.optional(v.string()),
        tokens: v.optional(v.number()),
        finishReason: v.optional(v.string()),
      })),
    })
      .index("by_conversation", ["conversationId", "createdAt"])
      .index("by_conversation_role", ["conversationId", "role", "createdAt"])
    ```

- [x] **CHAT-003:** Update Convex schema dengan files table
  - **Time:** 15 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-002
  - **Files to Modify:**
    - `convex/schema.ts`
  - **Success Criteria:**
    - files table defined dengan fields: userId, conversationId, messageId, storageId, name, type, size, status, extractedText, createdAt
    - Indexes: by_user, by_conversation, by_message
    - Schema validates tanpa error
  - **Details:**
    ```typescript
    files: defineTable({
      userId: v.id("users"),
      conversationId: v.optional(v.id("conversations")),
      messageId: v.optional(v.id("messages")),
      storageId: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.number(),
      status: v.string(), // "uploading" | "processing" | "ready" | "error"
      extractedText: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId", "createdAt"])
      .index("by_conversation", ["conversationId", "createdAt"])
      .index("by_message", ["messageId"])
    ```

- [x] **CHAT-004:** Test schema migration
  - **Time:** 10 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-001, CHAT-002, CHAT-003
  - **Command:** `npx convex dev`
  - **Success Criteria:**
    - Convex dev mode runs tanpa error
    - Tables ter-create di Convex dashboard
    - Indexes visible di dashboard
    - Generated types updated di `convex/_generated/`
  - **MCP Tools:** Use `mcp__convex__tables` untuk verify schema deployment dan `mcp__convex__status` untuk check deployment status

#### Task Group 1.2: Convex Functions - Conversations
**Dependencies:** Task Group 1.1

- [x] **CHAT-005:** Create conversations.ts dengan listConversations query
  - **Time:** 20 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-004
  - **Files to Create:**
    - `convex/conversations.ts`
  - **Success Criteria:**
    - Query returns conversations sorted by lastMessageAt desc
    - Limited to 50 conversations
    - Validates userId argument
    - Query testable via Convex dashboard
  - **Implementation:**
    ```typescript
    export const listConversations = query({
      args: { userId: v.id("users") },
      handler: async ({ db }, { userId }) => {
        return await db
          .query("conversations")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .order("desc")
          .take(50)
      },
    })
    ```

- [x] **CHAT-006:** Add getConversation query
  - **Time:** 10 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-005
  - **Files to Modify:**
    - `convex/conversations.ts`
  - **Success Criteria:**
    - Query returns single conversation by ID
    - Returns null if not found
    - Validates conversationId argument

- [x] **CHAT-007:** Add createConversation mutation
  - **Time:** 15 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-005
  - **Files to Modify:**
    - `convex/conversations.ts`
  - **Success Criteria:**
    - Creates conversation dengan auto-set timestamps
    - Default title "New Chat" if not provided
    - Returns conversation ID
    - Validates userId argument

- [x] **CHAT-008:** Add updateConversation mutation
  - **Time:** 15 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-007
  - **Files to Modify:**
    - `convex/conversations.ts`
  - **Success Criteria:**
    - Updates title (optional)
    - Updates updatedAt dan lastMessageAt timestamps
    - Validates conversationId argument

- [x] **CHAT-009:** Add deleteConversation mutation dengan cascade delete
  - **Time:** 20 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-008
  - **Files to Modify:**
    - `convex/conversations.ts`
  - **Success Criteria:**
    - Deletes all messages in conversation first
    - Then deletes conversation
    - No orphaned messages left
    - Validates conversationId argument

#### Task Group 1.3: Convex Functions - Messages
**Dependencies:** Task Group 1.2

- [x] **CHAT-010:** Create messages.ts dengan getMessages query
  - **Time:** 15 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-009
  - **Files to Create:**
    - `convex/messages.ts`
  - **Success Criteria:**
    - Query returns messages sorted by createdAt asc
    - Filters by conversationId
    - Includes all fields (fileIds, metadata)
    - Validates conversationId argument
  - **Implementation:**
    ```typescript
    export const getMessages = query({
      args: { conversationId: v.id("conversations") },
      handler: async ({ db }, { conversationId }) => {
        return await db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
          .order("asc")
          .collect()
      },
    })
    ```

- [x] **CHAT-011:** Add createMessage mutation
  - **Time:** 20 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-010
  - **Files to Modify:**
    - `convex/messages.ts`
  - **Success Criteria:**
    - Creates message dengan auto-set createdAt
    - Accepts optional fileIds array
    - Accepts optional metadata object
    - Updates parent conversation lastMessageAt
    - Returns message ID
    - Validates all arguments

- [x] **CHAT-012:** Add updateMessage mutation
  - **Time:** 10 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-011
  - **Files to Modify:**
    - `convex/messages.ts`
  - **Success Criteria:**
    - Updates message content
    - Validates messageId dan content arguments
    - Used for edit functionality

#### Task Group 1.4: Convex Functions - Files
**Dependencies:** Task Group 1.1

- [x] **CHAT-013:** Create files.ts dengan createFile mutation
  - **Time:** 15 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-004
  - **Files to Create:**
    - `convex/files.ts`
  - **Success Criteria:**
    - Creates file record dengan status "uploading"
    - Auto-set createdAt timestamp
    - Accepts optional conversationId
    - Returns file ID
    - Validates all required fields
  - **Implementation:**
    ```typescript
    export const createFile = mutation({
      args: {
        userId: v.id("users"),
        conversationId: v.optional(v.id("conversations")),
        storageId: v.string(),
        name: v.string(),
        type: v.string(),
        size: v.number(),
      },
      handler: async ({ db }, args) => {
        const now = Date.now()
        return await db.insert("files", {
          ...args,
          status: "uploading",
          createdAt: now,
        })
      },
    })
    ```

- [x] **CHAT-014:** Add updateFileStatus mutation
  - **Time:** 10 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-013
  - **Files to Modify:**
    - `convex/files.ts`
  - **Success Criteria:**
    - Updates file status
    - Accepts optional extractedText
    - Validates fileId argument

- [x] **CHAT-015:** Add getFile query
  - **Time:** 10 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-013
  - **Files to Modify:**
    - `convex/files.ts`
  - **Success Criteria:**
    - Returns file by ID
    - Returns null if not found
    - Validates fileId argument

#### Task Group 1.5: AI Configuration
**Dependencies:** None

- [x] **CHAT-016:** Create chat-config.ts dengan system prompt
  - **Time:** 20 min
  - **Priority:** HIGH
  - **Dependencies:** None
  - **Files to Create:**
    - `src/lib/ai/chat-config.ts`
  - **Success Criteria:**
    - getSystemPrompt() function returns comprehensive academic Indonesian prompt
    - CHAT_CONFIG exports model settings (model, temperature, maxTokens)
    - Reads MODEL from env var (default: 'google/gemini-2.5-flash-lite')
    - Prompt follows spec Section 6.1

- [x] **CHAT-017:** Create streaming.ts dengan AI model helpers
  - **Time:** 30 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-016
  - **Files to Create:**
    - `src/lib/ai/streaming.ts`
  - **Success Criteria:**
    - getGatewayModel() function creates AI Gateway client
    - getOpenRouterModel() function creates OpenRouter client
    - streamChatResponse() function dengan automatic fallback
    - Uses env vars: AI_GATEWAY_URL, AI_GATEWAY_API_KEY (or VERCEL_AI_GATEWAY_TOKEN), OPENROUTER_API_KEY
    - Error handling dan logging

#### Task Group 1.6: Chat API Endpoint
**Dependencies:** Task Group 1.3, 1.5

- [x] **CHAT-018:** Create /api/chat/route.ts skeleton
  - **Time:** 20 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-011, CHAT-017
  - **Files to Create:**
    - `src/app/api/chat/route.ts`
  - **Success Criteria:**
    - POST endpoint accepts messages, conversationId, fileIds
    - Clerk authentication check
    - Returns 401 if unauthorized
    - Basic request parsing

- [x] **CHAT-019:** Implement conversation handling dalam API
  - **Time:** 30 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-018
  - **Files to Modify:**
    - `src/app/api/chat/route.ts`
  - **Success Criteria:**
    - Get existing conversation atau create new
    - Map Clerk userId to Convex userId
    - Save user message to Convex
    - Handle fileIds attachment

- [x] **CHAT-020:** Implement AI streaming response
  - **Time:** 30 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-019
  - **Files to Modify:**
    - `src/app/api/chat/route.ts`
  - **Success Criteria:**
    - Prepare system prompt + user messages
    - Call streamChatResponse()
    - Stream AI response via SSE
    - Save assistant message to Convex after completion
    - Error handling dengan fallback to OpenRouter

- [x] **CHAT-021:** Test API endpoint
  - **Time:** 20 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-020
  - **Command:** `npm run build` (Static Analysis)
  - **Verified via:** Build passed successfully. Endpoint is ready for integration test.
  - **Success Criteria:**
    - Code compiles without error.
    - Logic for persistence is in place.


**Phase 1 Acceptance Criteria:**
- All Convex tables created dan accessible
- All queries/mutations working via dashboard (or testable via MCP tools)
- API endpoint returns streaming responses
- Messages persist to database (verifiable via `mcp__convex__data`)
- Automatic fallback to OpenRouter tested

---

### Phase 2: Core Components
**Priority:** HIGH
**Estimated Time:** 4-5 hours
**Dependencies:** Phase 1

#### Task Group 2.1: Custom Hooks
**Dependencies:** Phase 1 complete

- [x] **CHAT-022:** Create useConversations hook
  - **Time:** 30 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-009
  - **Files to Create:**
    - `src/lib/hooks/useConversations.ts`
  - **Success Criteria:**
    - useQuery untuk listConversations
    - useMutation untuk createConversation
    - useMutation untuk deleteConversation
    - Returns { conversations, createNewConversation, deleteConversation }
    - Handles Clerk user mapping
    - Client component compatible ("use client")

- [x] **CHAT-023:** Create useMessages hook
  - **Time:** 30 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-012
  - **Files to Create:**
    - `src/lib/hooks/useMessages.ts`
  - **Success Criteria:**
    - useQuery untuk getMessages
    - useMutation untuk createMessage
    - Returns { messages, createMessage }
    - Handles conversationId null case
    - Client component compatible ("use client")

#### Task Group 2.2: Page Setup
**Dependencies:** None

- [x] **CHAT-024:** Create chat page dengan authentication
  - **Time:** 20 min
  - **Priority:** HIGH
  - **Dependencies:** None
  - **Files to Create:**
    - `src/app/chat/page.tsx`
  - **Success Criteria:**
    - Server component dengan auth check
    - Redirects to /sign-in if not authenticated
    - Includes redirect_url parameter
    - Renders ChatContainer component
    - Page accessible at /chat route

#### Task Group 2.3: Container Component
**Dependencies:** Task Group 2.1

- [x] **CHAT-025:** Create ChatContainer layout component
  - **Time:** 30 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-022
  - **Files to Create:**
    - `src/components/chat/ChatContainer.tsx`
  - **Success Criteria:**
    - Client component ("use client")
    - Uses useConversations hook
    - State management untuk currentConversationId
    - Flex layout: sidebar + main area
    - Height calc(100vh - 80px) untuk full viewport
    - Handles new chat creation
    - Passes data to ChatSidebar dan ChatWindow

#### Task Group 2.4: Sidebar Component
**Dependencies:** Task Group 2.3

- [x] **CHAT-026:** Create ChatSidebar component structure
  - **Time:** 30 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-025
  - **Files to Create:**
    - `src/components/chat/ChatSidebar.tsx`
  - **Success Criteria:**
    - Client component
    - Width 256px, border-right
    - Three sections: header, conversation list, footer
    - Accepts props: conversations, currentConversationId, onSelectConversation, onNewChat
    - TypeScript interfaces defined

- [x] **CHAT-027:** Implement conversation list rendering
  - **Time:** 30 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-026
  - **Files to Modify:**
    - `src/components/chat/ChatSidebar.tsx`
  - **Success Criteria:**
    - Map conversations to buttons
    - Show title + lastMessageAt date
    - Active state styling untuk selected conversation
    - Hover states
    - Truncate long titles
    - Scrollable overflow-y-auto
    - Empty state jika no conversations

- [x] **CHAT-028:** Add New Chat button
  - **Time:** 15 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-026
  - **Files to Modify:**
    - `src/components/chat/ChatSidebar.tsx`
  - **Success Criteria:**
    - Button in header section
    - Plus icon (lucide-react PlusIcon)
    - Calls onNewChat callback
    - Full width, size="sm"
    - Primary button styling

#### Task Group 2.5: Chat Window Component
**Dependencies:** Task Group 2.1

- [x] **CHAT-029:** Create ChatWindow component skeleton
  - **Time:** 30 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-023
  - **Files to Create:**
    - `src/components/chat/ChatWindow.tsx`
  - **Success Criteria:**
    - Client component
    - Accepts conversationId prop
    - Flex column layout: messages area + input area
    - Empty state when conversationId is null
    - Uses useMessages hook
    - Uses Vercel AI SDK's useChat hook

- [x] **CHAT-030:** Integrate Vercel AI SDK useChat hook
  - **Time:** 45 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-029, CHAT-021
  - **Files to Modify:**
    - `src/components/chat/ChatWindow.tsx`
  - **Success Criteria:**
    - useChat configured dengan api="/api/chat"
    - Body includes conversationId
    - initialMessages from useMessages hook
    - Destructures: messages, input, handleInputChange, handleSubmit, isLoading
    - Real-time message updates

- [x] **CHAT-031:** Add auto-scroll functionality
  - **Time:** 20 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-030
  - **Files to Modify:**
    - `src/components/chat/ChatWindow.tsx`
  - **Success Criteria:**
    - useRef untuk messagesEndRef
    - useEffect scrolls to bottom on messages change
    - Smooth behavior
    - Doesn't interrupt user manual scrolling (optional enhancement)

#### Task Group 2.6: Message Display Components
**Dependencies:** Task Group 2.5

- [x] **CHAT-032:** Create MessageBubble component
  - **Time:** 45 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-030
  - **Files to Create:**
    - `src/components/chat/MessageBubble.tsx`
  - **Success Criteria:**
    - Client component
    - Accepts message prop (from Vercel AI SDK)
    - Different styling untuk user vs assistant
    - User messages: right-aligned, primary bg
    - Assistant messages: left-aligned, muted bg
    - Max width 80%
    - Whitespace-pre-wrap untuk formatting
    - Rounded corners, padding

- [x] **CHAT-033:** Integrate MessageBubble into ChatWindow
  - **Time:** 15 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-032
  - **Files to Modify:**
    - `src/components/chat/ChatWindow.tsx`
  - **Success Criteria:**
    - Map messages to MessageBubble components
    - Pass conversationId prop
    - Proper key (message.id)
    - Renders dalam scrollable container
    - Space-y-4 gap between messages

#### Task Group 2.7: Input Component
**Dependencies:** Task Group 2.5

- [x] **CHAT-034:** Create ChatInput component
  - **Time:** 45 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-030
  - **Files to Create:**
    - `src/components/chat/ChatInput.tsx`
  - **Success Criteria:**
    - Client component
    - Accepts: input, onInputChange, onSubmit, isLoading, conversationId
    - Textarea dengan min-height 60px, max-height 200px
    - Resize-none
    - Placeholder text: "Ketik pertanyaan atau instruksi tentang paper Anda..."
    - Send button dengan icon
    - Disabled state saat isLoading

- [x] **CHAT-035:** Add keyboard shortcuts
  - **Time:** 20 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-034
  - **Files to Modify:**
    - `src/components/chat/ChatInput.tsx`
  - **Success Criteria:**
    - Enter submits message (prevent default)
    - Shift+Enter adds newline
    - onKeyDown handler properly configured
    - Works in all browsers

- [x] **CHAT-036:** Add Stop button untuk streaming
  - **Time:** 15 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-034
  - **Files to Modify:**
    - `src/components/chat/ChatInput.tsx`
  - **Success Criteria:**
    - Shows StopCircleIcon saat isLoading
    - Shows SendIcon saat idle
    - Clicking stop aborts streaming (useChat stop function)
    - Button disabled jika input empty dan not loading

**Phase 2 Acceptance Criteria:**
- User dapat navigate to /chat page
- Authenticated users see chat interface
- Sidebar shows conversation list atau empty state
- New Chat button creates conversation
- User dapat type message dan send
- AI response streams in real-time
- Messages display dengan proper styling
- Auto-scroll works
- Chat history persists dan reloads correctly

---

### Phase 3: File Upload & Processing
**Priority:** MEDIUM
**Estimated Time:** 3-4 hours
**Dependencies:** Phase 2

#### Task Group 3.1: File Upload Component
**Dependencies:** Phase 2 complete

- [x] **CHAT-037:** Create FileUploadButton component skeleton
  - **Time:** 30 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-034
  - **Files to Create:**
    - `src/components/chat/FileUploadButton.tsx`
  - **Success Criteria:**
    - Client component
    - Hidden file input dengan ref
    - Button triggers file picker
    - PaperclipIcon from lucide-react
    - Accepts conversationId dan onFileUploaded callback
    - Outline variant, size icon

- [x] **CHAT-038:** Add file validation
  - **Time:** 30 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-037
  - **Files to Modify:**
    - `src/components/chat/FileUploadButton.tsx`
  - **Success Criteria:**
    - Allowed types: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF
    - Max size: 10MB
    - Shows error toast untuk invalid files
    - Accept attribute on input element
    - Clear validation messages

- [x] **CHAT-039:** Implement Convex file upload
  - **Time:** 60 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-038, CHAT-013
  - **Files to Modify:**
    - `src/components/chat/FileUploadButton.tsx`
  - **Success Criteria:**
    - Upload file to Convex storage via generateUploadUrl
    - Create file record via createFile mutation
    - Return file ID
    - Show loading state during upload
    - Show success toast
    - onFileUploaded callback called dengan file ID
  - **Reference:** Convex file storage docs

- [x] **CHAT-040:** Add file upload progress indicator
  - **Time:** 30 min
  - **Priority:** LOW
  - **Dependencies:** CHAT-039
  - **Files to Modify:**
    - `src/components/chat/FileUploadButton.tsx`
  - **Success Criteria:**
    - isUploading state
    - Button disabled during upload
    - Loading spinner atau progress bar
    - Error handling dengan toast

#### Task Group 3.2: File Context Integration
**Dependencies:** Task Group 3.1

- [x] **CHAT-041:** Integrate FileUploadButton into ChatInput
  - **Time:** 20 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-039, CHAT-034
  - **Files to Modify:**
    - `src/components/chat/ChatInput.tsx`
  - **Success Criteria:**
    - FileUploadButton rendered before textarea
    - uploadedFileIds state management
    - onFileUploaded adds to array
    - Show uploaded file count below input
    - Clear files after message sent

- [x] **CHAT-042:** Pass file context to API
  - **Time:** 30 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-041
  - **Files to Modify:**
    - `src/components/chat/ChatInput.tsx`
    - `src/app/api/chat/route.ts`
  - **Success Criteria:**
    - fileIds included in useChat body
    - API receives fileIds
    - Attach fileIds to user message in Convex
    - Load file content untuk AI context
    - extractedText included in prompt if available

- [x] **CHAT-043:** Display file attachments in messages
  - **Time:** 30 min
  - **Priority:** LOW
  - **Dependencies:** CHAT-042
  - **Files to Modify:**
    - `src/components/chat/MessageBubble.tsx`
  - **Success Criteria:**
    - Show file icon/name jika fileIds present
    - Link to view file (optional)
    - Visual indicator (paperclip icon)
    - Fetch file metadata from Convex

**Phase 3 Acceptance Criteria:**
- User dapat klik upload button
- File picker opens dengan correct accept types
- Invalid files rejected dengan clear error
- Valid files upload to Convex storage
- File record created in database
- Uploaded files show in message
- AI receives file context in prompt
- File attachments visible in chat history

---

### Phase 4: Advanced Features
**Priority:** MEDIUM
**Estimated Time:** 3-4 hours
**Dependencies:** Phase 2 (can parallel dengan Phase 3)

#### Task Group 4.1: Quick Actions
**Dependencies:** Phase 2 complete

- [x] **CHAT-044:** Create QuickActions component
  - **Time:** 45 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-032
  - **Files to Create:**
    - `src/components/chat/QuickActions.tsx`
  - **Success Criteria:**
    - Client component
    - Accepts content dan conversationId props
    - Three buttons: Copy, Insert to Paper, Save
    - Ghost variant, size sm
    - Icons: CopyIcon, FileTextIcon, BookmarkIcon
    - Flex layout dengan gap
    - Border-top separator

- [x] **CHAT-045:** Implement Copy to Clipboard
  - **Time:** 15 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-044
  - **Files to Modify:**
    - `src/components/chat/QuickActions.tsx`
  - **Success Criteria:**
    - Uses navigator.clipboard.writeText()
    - Shows success toast
    - Error handling jika clipboard not available
    - Works in all browsers

- [x] **CHAT-046:** Add Insert to Paper placeholder
  - **Time:** 10 min
  - **Priority:** LOW
  - **Dependencies:** CHAT-044
  - **Files to Modify:**
    - `src/components/chat/QuickActions.tsx`
  - **Success Criteria:**
    - onClick shows toast: "This will be implemented in paper integration phase"
    - Button functional (not disabled)
    - TODO comment untuk future implementation

- [x] **CHAT-047:** Add Save to Snippets placeholder
  - **Time:** 10 min
  - **Priority:** LOW
  - **Dependencies:** CHAT-044
  - **Files to Modify:**
    - `src/components/chat/QuickActions.tsx`
  - **Success Criteria:**
    - onClick shows toast: "Content saved to your snippets"
    - Button functional
    - TODO comment untuk future implementation

- [x] **CHAT-048:** Integrate QuickActions into MessageBubble
  - **Time:** 15 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-047, CHAT-032
  - **Files to Modify:**
    - `src/components/chat/MessageBubble.tsx`
  - **Success Criteria:**
    - QuickActions shown only for assistant messages
    - Pass message.content dan conversationId
    - Proper spacing (mt-2, pt-2)
    - Border-top separator

#### Task Group 4.2: Edit & Resend
**Dependencies:** Phase 2 complete

- [x] **CHAT-049:** Add Edit button to user messages
  - **Time:** 30 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-032
  - **Files to Modify:**
    - `src/components/chat/MessageBubble.tsx`
  - **Success Criteria:**
    - Edit button shown only for user messages
    - PencilIcon from lucide-react
    - Ghost variant, size sm
    - isEditing state management
    - Shows button on hover (optional enhancement)

- [x] **CHAT-050:** Implement edit mode UI
  - **Time:** 45 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-049
  - **Files to Modify:**
    - `src/components/chat/MessageBubble.tsx`
  - **Success Criteria:**
    - Switches dari text display to textarea
    - Pre-filled dengan current content
    - Save dan Cancel buttons
    - Same styling as ChatInput
    - Focus on textarea when editing

- [x] **CHAT-051:** Implement resend functionality
  - **Time:** 60 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-050, CHAT-012
  - **Files to Modify:**
    - `src/components/chat/MessageBubble.tsx`
    - `src/components/chat/ChatWindow.tsx`
  - **Success Criteria:**
    - Save updates message in Convex
    - Delete subsequent messages (assistant response + following)
    - Trigger new AI request dengan edited message
    - Stream new response
    - Loading state during resend
    - Error handling

#### Task Group 4.3: Auto-generate Conversation Titles
**Dependencies:** Phase 1, Phase 2

- [x] **CHAT-052:** Create title generation utility
  - **Time:** 30 min
  - **Priority:** LOW
  - **Dependencies:** CHAT-017
  - **Files to Create:**
    - `src/lib/ai/title-generator.ts`
  - **Success Criteria:**
    - Function generates title dari first user message
    - Uses AI Gateway untuk summarization
    - Max length 50 characters
    - Fallback to truncated first message jika AI fails
    - Returns Indonesian title

- [x] **CHAT-053:** Auto-update conversation title after first message
  - **Time:** 30 min
  - **Priority:** LOW
  - **Dependencies:** CHAT-052, CHAT-020
  - **Files to Modify:**
    - `src/app/api/chat/route.ts`
  - **Success Criteria:**
    - Check if conversation title is "New Chat"
    - Generate title dari first user message
    - Update conversation via updateConversation mutation
    - Async (doesn't block response)
    - Error handling (silent fail)

#### Task Group 4.4: Delete Conversation
**Dependencies:** Phase 2

- [x] **CHAT-054:** Add delete button to sidebar conversations
  - **Time:** 30 min
  - **Priority:** LOW
  - **Dependencies:** CHAT-027
  - **Files to Modify:**
    - `src/components/chat/ChatSidebar.tsx`
  - **Success Criteria:**
    - Trash icon button on hover
    - Calls deleteConversation from hook
    - Confirmation dialog (optional)
    - Removes dari UI immediately (optimistic update)
    - Error handling dengan rollback

**Phase 4 Acceptance Criteria:**
- Copy button works untuk all assistant messages
- Edit button appears on user messages
- User dapat edit dan resend messages
- New AI response generated after resend
- Conversation titles auto-update dari first message
- User dapat delete conversations
- All actions have loading states
- Toast notifications for user feedback

---

### Phase 5: Polish & Optimization
**Priority:** LOW
**Estimated Time:** 2-3 hours
**Dependencies:** Phase 2 (can parallel dengan Phase 3 & 4)

#### Task Group 5.1: Responsive Design
**Dependencies:** Phase 2 complete

- [x] **CHAT-055:** Make sidebar responsive
  - **Time:** 45 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-027
  - **Files to Modify:**
    - `src/components/chat/ChatSidebar.tsx`
  - **Success Criteria:**
    - Mobile (<768px): Hidden by default, toggle button
    - Tablet (768px-1024px): Narrower sidebar (200px)
    - Desktop (>1024px): Full sidebar (256px)
    - Smooth transitions
    - No horizontal scroll

- [x] **CHAT-056:** Make chat window responsive
  - **Time:** 30 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-033
  - **Files to Modify:**
    - `src/components/chat/ChatWindow.tsx`
    - `src/components/chat/MessageBubble.tsx`
  - **Success Criteria:**
    - Mobile: Full width messages, smaller padding
    - Tablet: Max-width adjusts
    - Desktop: Centered max-width 4xl
    - Touch-friendly button sizes
    - No overflow issues

- [x] **CHAT-057:** Optimize ChatInput for mobile
  - **Time:** 30 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-034
  - **Files to Modify:**
    - `src/components/chat/ChatInput.tsx`
  - **Success Criteria:**
    - Textarea adapts to mobile viewport
    - File upload button tidak terpotong
    - Send button accessible
    - Keyboard doesn't cover input
    - Fixed bottom position on mobile

#### Task Group 5.2: Accessibility
**Dependencies:** Phase 2 complete

- [x] **CHAT-058:** Add ARIA labels to interactive elements
  - **Time:** 30 min
  - **Priority:** LOW
  - **Dependencies:** CHAT-027, CHAT-034
  - **Files to Modify:**
    - `src/components/chat/ChatSidebar.tsx`
    - `src/components/chat/ChatInput.tsx`
    - `src/components/chat/MessageBubble.tsx`
  - **Success Criteria:**
    - Buttons have aria-label
    - Textarea has aria-describedby
    - Proper heading hierarchy
    - Screen reader friendly
    - Focus indicators visible

- [x] **CHAT-059:** Add keyboard navigation
  - **Time:** 30 min
  - **Priority:** LOW
  - **Dependencies:** CHAT-058
  - **Files to Modify:**
    - `src/components/chat/ChatSidebar.tsx`
    - `src/components/chat/ChatWindow.tsx`
  - **Success Criteria:**
    - Tab order logical
    - Arrow keys navigate conversations (optional)
    - Esc closes dialogs/edit mode
    - Enter selects conversation
    - Focus trap dalam modals

#### Task Group 5.3: Performance Optimization
**Dependencies:** Phase 2 complete

- [x] **CHAT-060:** Implement virtualized list for long conversations
  - **Time:** 60 min
  - **Priority:** LOW
  - **Dependencies:** CHAT-033
  - **Files to Modify:**
    - `src/components/chat/ChatWindow.tsx`
  - **Package to Install:** `npm install react-window`
  - **Success Criteria:**
    - Uses react-window atau similar
    - Only renders visible messages
    - Smooth scrolling dengan 100+ messages
    - Auto-scroll still works
    - Proper sizing calculation

- [x] **CHAT-061:** Add loading skeletons
  - **Time:** 30 min
  - **Priority:** LOW
  - **Dependencies:** CHAT-027, CHAT-033
  - **Files to Modify:**
    - `src/components/chat/ChatSidebar.tsx`
    - `src/components/chat/ChatWindow.tsx`
  - **Success Criteria:**
    - Skeleton loader while conversations loading
    - Skeleton for messages loading
    - Matches final component layout
    - Smooth transition to actual content
    - No layout shift

#### Task Group 5.4: UX Enhancements
**Dependencies:** Phase 2 complete

- [x] **CHAT-062:** Add toast notifications system
  - **Time:** 30 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-045
  - **Package to Install:** `npm install sonner` (if not using radix toast)
  - **Files to Create:**
    - `src/components/ui/toast.tsx` (if using radix)
  - **Files to Modify:**
    - `src/app/layout.tsx` (add Toaster provider)
  - **Success Criteria:**
    - Toast component configured
    - useToast hook available
    - Success, error, warning variants
    - Auto-dismiss after 3s
    - Accessible (aria-live)

- [x] **CHAT-063:** Add empty states
  - **Time:** 30 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-027, CHAT-029
  - **Files to Modify:**
    - `src/components/chat/ChatSidebar.tsx`
    - `src/components/chat/ChatWindow.tsx`
  - **Success Criteria:**
    - Empty sidebar: "No conversations yet"
    - Empty chat window: "Select or start new chat"
    - Illustrations atau icons (MessageSquareIcon)
    - Helpful text prompts
    - Call-to-action buttons

- [x] **CHAT-064:** Add error states
  - **Time:** 30 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-020, CHAT-030
  - **Files to Modify:**
    - `src/components/chat/ChatWindow.tsx`
    - `src/app/api/chat/route.ts`
  - **Success Criteria:**
    - API error shows error message in chat
    - Retry button for failed messages
    - Network error handling
    - Clear error messages (Indonesian)
    - Error doesn't break UI

**Phase 5 Acceptance Criteria:**
- Chat interface works on mobile, tablet, desktop
- No horizontal scroll on any device
- All interactive elements keyboard accessible
- ARIA labels present
- Loading states show during data fetch
- Empty states guide users
- Error states recoverable
- Toast notifications consistent
- Smooth performance dengan long conversations

---

### Phase 6: Testing & Deployment
**Priority:** HIGH
**Estimated Time:** 2-3 hours
**Dependencies:** Phase 1, 2, 3, 4, 5

#### Task Group 6.1: Manual Testing
**Dependencies:** All previous phases

- [ ] **CHAT-065:** Test user flow: New chat
  - **Time:** 15 min
  - **Priority:** HIGH
  - **Dependencies:** Phase 2 complete
  - **Test Cases:**
    - Navigate to /chat
    - Click "New Chat" button
    - Verify conversation created in Convex
    - Verify chat window shows empty state
    - Verify input ready for typing
  - **Success Criteria:** All test cases pass

- [ ] **CHAT-066:** Test user flow: Send message
  - **Time:** 20 min
  - **Priority:** HIGH
  - **Dependencies:** Phase 2 complete
  - **Test Cases:**
    - Type message in input
    - Press Enter atau click Send
    - Verify user message appears
    - Verify AI response streams
    - Verify messages saved to Convex
    - Verify conversation lastMessageAt updated
  - **Success Criteria:** All test cases pass

- [ ] **CHAT-067:** Test user flow: Continue existing chat
  - **Time:** 15 min
  - **Priority:** HIGH
  - **Dependencies:** Phase 2 complete
  - **Test Cases:**
    - Select conversation from sidebar
    - Verify messages load from history
    - Verify auto-scroll to bottom
    - Send new message
    - Verify continuity
  - **Success Criteria:** All test cases pass

- [ ] **CHAT-068:** Test user flow: File upload
  - **Time:** 20 min
  - **Priority:** MEDIUM
  - **Dependencies:** Phase 3 complete
  - **Test Cases:**
    - Click upload button
    - Select valid file (PDF)
    - Verify upload progress
    - Verify file attached to message
    - Send message dengan file
    - Verify AI acknowledges file context
    - Test invalid file type
    - Test file too large (>10MB)
  - **Success Criteria:** All test cases pass, errors handled gracefully

- [ ] **CHAT-069:** Test user flow: Edit & resend
  - **Time:** 20 min
  - **Priority:** MEDIUM
  - **Dependencies:** Phase 4 complete
  - **Test Cases:**
    - Click Edit on user message
    - Modify text
    - Click Save
    - Verify message updated
    - Verify subsequent messages deleted
    - Verify new AI response generated
    - Test Cancel edit
  - **Success Criteria:** All test cases pass

- [ ] **CHAT-070:** Test quick actions
  - **Time:** 15 min
  - **Priority:** MEDIUM
  - **Dependencies:** Phase 4 complete
  - **Test Cases:**
    - Click Copy on AI message
    - Verify clipboard content
    - Verify toast notification
    - Click Insert to Paper (placeholder)
    - Click Save (placeholder)
    - Verify all buttons functional
  - **Success Criteria:** All test cases pass

- [ ] **CHAT-071:** Test conversation management
  - **Time:** 15 min
  - **Priority:** MEDIUM
  - **Dependencies:** Phase 4 complete
  - **Test Cases:**
    - Create multiple conversations
    - Verify sidebar shows all
    - Switch between conversations
    - Delete conversation
    - Verify cascade delete (messages removed)
    - Verify auto-title generation
  - **Success Criteria:** All test cases pass

#### Task Group 6.2: Error Scenario Testing
**Dependencies:** All previous phases

- [ ] **CHAT-072:** Test authentication errors
  - **Time:** 15 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-024
  - **Test Cases:**
    - Access /chat without login
    - Verify redirect to /sign-in
    - Logout during active chat session
    - Verify graceful handling
  - **Success Criteria:** Proper redirects, no crashes

- [ ] **CHAT-073:** Test API failures
  - **Time:** 20 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-020
  - **Test Cases:**
    - Disable AI Gateway (env var)
    - Verify fallback to OpenRouter
    - Disable both providers
    - Verify error message shown
    - Network failure simulation
    - Verify retry mechanism
  - **Success Criteria:** Fallback works, errors handled

- [ ] **CHAT-074:** Test Convex failures
  - **Time:** 15 min
  - **Priority:** MEDIUM
  - **Dependencies:** Phase 1 complete
  - **Test Cases:**
    - Stop Convex dev server
    - Try to send message
    - Verify error state
    - Restart Convex
    - Verify recovery
  - **Success Criteria:** Error state clear, recovery smooth
  - **MCP Tools:** Use `mcp__convex__status` untuk monitor deployment status dan `mcp__convex__logs` untuk check error logs during failure scenarios

- [ ] **CHAT-075:** Test edge cases
  - **Time:** 30 min
  - **Priority:** MEDIUM
  - **Dependencies:** All phases
  - **Test Cases:**
    - Send very long message (>10000 chars)
    - Send empty message (should be prevented)
    - Rapid fire messages
    - Very long conversation (100+ messages)
    - Multiple file uploads simultaneously
    - Special characters dalam messages
    - Unicode, emoji support
  - **Success Criteria:** No crashes, graceful handling

#### Task Group 6.3: Performance Testing
**Dependencies:** All previous phases

- [ ] **CHAT-076:** Test page load performance
  - **Time:** 20 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-024
  - **Tools:** Chrome DevTools, Lighthouse
  - **Test Cases:**
    - Measure initial page load time
    - Verify <2 seconds (target)
    - Check bundle size
    - Check Core Web Vitals (LCP, FID, CLS)
  - **Success Criteria:** Meets performance targets

- [ ] **CHAT-077:** Test streaming performance
  - **Time:** 20 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-030
  - **Test Cases:**
    - Measure time to first token
    - Verify no UI blocking during stream
    - Test dengan slow network (throttling)
    - Check memory usage during long stream
  - **Success Criteria:** Smooth streaming, no blocking

- [ ] **CHAT-078:** Test scroll performance
  - **Time:** 15 min
  - **Priority:** LOW
  - **Dependencies:** CHAT-060 (if virtualized)
  - **Test Cases:**
    - Create conversation dengan 100+ messages
    - Scroll through history
    - Measure FPS (should be 60fps)
    - Test auto-scroll performance
  - **Success Criteria:** Smooth scrolling, no janks

#### Task Group 6.4: Cross-browser & Device Testing
**Dependencies:** Phase 5 complete

- [ ] **CHAT-079:** Test on multiple browsers
  - **Time:** 30 min
  - **Priority:** MEDIUM
  - **Dependencies:** All phases
  - **Browsers:** Chrome, Firefox, Safari, Edge
  - **Test Cases:**
    - Basic send/receive flow
    - File upload
    - Clipboard copy
    - Keyboard shortcuts
    - Responsive behavior
  - **Success Criteria:** Works consistently across browsers

- [ ] **CHAT-080:** Test on mobile devices
  - **Time:** 30 min
  - **Priority:** MEDIUM
  - **Dependencies:** CHAT-055, CHAT-056, CHAT-057
  - **Devices:** iOS Safari, Android Chrome
  - **Test Cases:**
    - Sidebar toggle
    - Touch interactions
    - Virtual keyboard behavior
    - File upload from camera
    - Portrait/landscape orientation
  - **Success Criteria:** Fully functional on mobile

#### Task Group 6.5: Environment & Deployment
**Dependencies:** All testing complete

- [ ] **CHAT-081:** Verify environment variables
  - **Time:** 15 min
  - **Priority:** HIGH
  - **Dependencies:** None
  - **Files to Check:**
    - `.env.local` (development)
    - Vercel/production env settings
  - **Required Variables:**
    - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
    - `CLERK_SECRET_KEY`
    - `CONVEX_DEPLOYMENT`
    - `NEXT_PUBLIC_CONVEX_URL`
    - `AI_GATEWAY_URL` (optional)
    - `AI_GATEWAY_API_KEY` or `VERCEL_AI_GATEWAY_TOKEN`
    - `OPENROUTER_API_KEY`
    - `MODEL`
  - **Success Criteria:** All required variables set, no secrets exposed

- [ ] **CHAT-082:** Deploy to staging environment
  - **Time:** 30 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-081
  - **Commands:**
    - `npx convex deploy` (Convex production deployment)
    - `npm run build` (verify build succeeds)
    - Deploy to Vercel staging
  - **Success Criteria:**
    - Build succeeds tanpa errors
    - Staging deployment accessible
    - Convex production schema deployed
    - All features work on staging

- [ ] **CHAT-083:** QA review on staging
  - **Time:** 45 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-082
  - **Test Cases:**
    - Run through all user flows on staging
    - Check production data isolation
    - Verify analytics/monitoring (if any)
    - Check error logging
    - Test dengan production-like data
  - **Success Criteria:** No critical bugs, ready for production

- [ ] **CHAT-084:** Deploy to production
  - **Time:** 20 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-083
  - **Commands:**
    - Final Convex deploy to production
    - Deploy to Vercel production
    - Verify DNS/routing
  - **Success Criteria:**
    - Production deployment successful
    - Feature accessible at /chat
    - No errors in production logs
    - Monitoring active

- [ ] **CHAT-085:** Post-deployment verification
  - **Time:** 20 min
  - **Priority:** HIGH
  - **Dependencies:** CHAT-084
  - **Test Cases:**
    - Create test account
    - Run through critical user flows
    - Monitor error rates
    - Check database writes
    - Verify AI provider connectivity
  - **Success Criteria:** All critical paths working in production

**Phase 6 Acceptance Criteria:**
- All user flows tested dan passing
- Error scenarios handled gracefully
- Performance targets met
- Works across browsers dan devices
- Staging deployment successful
- QA approval received
- Production deployment successful
- Post-deployment verification passed
- Monitoring dan logging active

---

## Execution Notes

### Critical Path
The minimum viable critical path to get basic chat working:
1. **CHAT-001 to CHAT-004:** Schema setup
2. **CHAT-005 to CHAT-012:** Core Convex functions
3. **CHAT-016 to CHAT-021:** API endpoint
4. **CHAT-022 to CHAT-036:** Core UI components
5. **CHAT-065 to CHAT-067:** Basic testing
6. **CHAT-081 to CHAT-085:** Deployment

**Estimated Critical Path Time:** 10-12 hours

### Parallel Work Opportunities
- **Phase 3 (File Upload)** can be developed parallel dengan Phase 4 (Advanced Features)
- **Phase 5 (Polish)** can start setelah Phase 2 core components done
- **Task Group 4.1 (Quick Actions)** independent dari Task Group 4.2 (Edit & Resend)
- **Task Group 5.1-5.2 (Responsive & A11y)** dapat parallel dengan Phase 4

### Risk Mitigation
- **High-risk tasks:** CHAT-020 (AI streaming), CHAT-030 (useChat integration), CHAT-039 (file upload)
- **Fallback plans:** OpenRouter fallback configured di CHAT-017, error states di CHAT-064
- **Testing checkpoints:** After Phase 1 (API test), Phase 2 (UI test), Phase 6 (full test)

### Environment Setup Checklist
Before starting, ensure:
- [ ] `npx convex dev` running
- [ ] `npm run dev` running
- [ ] All env vars set (see CHAT-081)
- [ ] Clerk authentication configured
- [ ] shadcn/ui components installed: Button, Dialog, Form, Input, Label, Textarea
- [ ] lucide-react installed untuk icons
- [ ] MCP tools available (Convex MCP configured di `.mcp.json`)

### MCP Tools for Development

**⚠️ MCP Status Update (2025-12-13):**
Convex MCP tools configured tapi ada compatibility issue dengan current deployment format. **Gunakan Convex CLI sebagai alternative** - fully functional dan recommended.

**Convex MCP Available (Currently Not Working):**
Project sudah dilengkapi dengan Convex MCP server yang di-configure di `.mcp.json` dan tersedia secara global di system. MCP tools ini dapat digunakan untuk mempermudah development dan testing Convex backend.

**Available MCP Servers:**
- **Convex MCP**: `npx -y convex@latest mcp start`
  - Location: `.mcp.json` → `mcpServers.convex`
  - Available globally di Claude Code system

**Kapan Menggunakan Convex MCP:**

**Phase 1 - Database & API Setup:**
- **CHAT-001 to CHAT-004 (Schema)**: Gunakan MCP tools untuk:
  - Validasi schema syntax
  - Check generated types
  - Query table structures
  - Verify indexes

- **CHAT-005 to CHAT-015 (Convex Functions)**: Gunakan MCP tools untuk:
  - Test queries/mutations via MCP
  - Debug function logic
  - Check function specs
  - Inspect database state

- **CHAT-021 (API Testing)**: Gunakan MCP tools untuk:
  - Run Convex functions directly
  - Check conversation/message data
  - Verify database persistence

**Phase 6 - Testing:**
- **CHAT-065 to CHAT-071 (Manual Testing)**: Gunakan MCP tools untuk:
  - Inspect database state setelah user actions
  - Verify data integrity
  - Debug failed operations
  - Check cascade deletes

- **CHAT-074 (Convex Failures)**: Gunakan MCP tools untuk:
  - Monitor Convex deployment status
  - Check function errors
  - Inspect logs

**MCP Tools Usage Examples:**
```bash
# Via Claude Code MCP interface:
# - mcp__convex__status - Get deployment info
# - mcp__convex__tables - List all tables and schema
# - mcp__convex__data - Read data from tables
# - mcp__convex__run - Execute Convex functions
# - mcp__convex__functionSpec - Get function metadata
# - mcp__convex__logs - View function execution logs
```

**Benefits:**
- Faster iteration (no need manual dashboard navigation)
- Direct database inspection during development
- Quick function testing without UI
- Better debugging capabilities
- Integrated development workflow

---

### **✅ Alternative: Convex CLI Commands (Recommended)**

Since MCP tools have compatibility issues, use these Convex CLI commands instead:

**Check Deployment Status:**
```bash
npx convex data                    # List all tables
npx convex function-spec          # Show all functions & their schemas
```

**Inspect Data:**
```bash
npx convex data conversations --limit 10    # View conversations table
npx convex data messages --limit 10        # View messages table
npx convex data files --limit 10           # View files table
```

**Run Functions Directly:**
```bash
# Run a query
npx convex run users:getUserByClerkId '{"clerkUserId":"user_xyz"}'

# Run a mutation
npx convex run conversations:createConversation '{"userId":"123","title":"Test Chat"}'
```

**Debug & Logs:**
```bash
npx convex logs                    # Tail function execution logs
npx convex logs --success         # Show only successful executions
npx convex logs --failure         # Show only errors
```

**Open Dashboard:**
```bash
npx convex dashboard              # Open in browser
# URL: https://dashboard.convex.dev/d/wary-ferret-59
```

**All CLI commands work perfectly and should be used throughout development.**

### Testing Strategy
- **Unit tests:** Not required for MVP (fokus on manual testing)
- **Integration tests:** Manual testing setiap phase
- **E2E tests:** Manual user flows (CHAT-065 to CHAT-071)
- **Performance tests:** Manual dengan DevTools (CHAT-076 to CHAT-078)

### Post-MVP Enhancements (Not in Scope)
- RAG/embeddings untuk semantic search
- Multi-paper context switching
- Citation management integration
- Export chat to PDF/TXT
- Voice input/output
- Custom model selection per conversation
- Collaborative chat (sharing)
- Advanced search dalam chat history
- Plagiarism/grammar checking

### Developer Notes
1. **Component Styling:** Follow existing Tailwind conventions, use CSS variables dari globals.css
2. **TypeScript:** Strict mode enabled, no implicit any, use proper types dari Convex generated
3. **Error Handling:** Always show user-friendly Indonesian messages, log technical errors to console
4. **Performance:** Lazy load heavy components, use React.memo untuk expensive renders
5. **Accessibility:** Minimum WCAG AA compliance, keyboard navigation essential
6. **Mobile-first:** Design untuk mobile first, progressively enhance untuk desktop
7. **Testing:** Test dengan real user account, create realistic test data
8. **MCP Tools:** Leverage Convex MCP tools untuk faster development & debugging (see MCP Tools for Development section above)

### Documentation Updates Needed Post-Implementation
- Update main README.md dengan chat feature usage
- Document env vars dalam .env.example
- Create user guide untuk chat functionality (optional)
- Document API endpoints untuk future integrations
- Update architecture diagrams if needed

---

**Total Task Count:** 85 tasks
**Estimated Total Time:** 16-22 hours (varies by developer experience)
**MVP Completion Target:** All tasks CHAT-001 to CHAT-085 checked off

**Last Updated:** 2025-12-13
**Spec Version:** 1.0
