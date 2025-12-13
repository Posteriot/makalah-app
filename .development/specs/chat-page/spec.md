# Specification: MVP Basic Chat Feature - Makalah App

## 1. Overview

### 1.1 Tujuan
Membangun fitur halaman chat sebagai workspace utama untuk user berinteraksi dengan AI dalam menyusun paper akademik berbahasa Indonesia. Halaman chat ini adalah core feature dari konsep "Chat to make a paper" di Makalah App.

### 1.2 Scope MVP Basic
**In Scope:**
- Chat interface dengan real-time streaming responses
- System prompt configuration untuk akademik Indonesia
- Chat history persistence di Convex
- File upload (dokumen & gambar) untuk analisis
- Edit user message & resend functionality
- Quick actions: Copy, Insert to Paper, Save
- ChatGPT-style UI dengan sidebar dan main area
- Authentication dengan Clerk (authenticated users only)

**Out of Scope:**
- Multi-paper context switching
- Citation management
- Export PDF/DOCX
- Advanced search & tags
- Templates & collaborative features
- Share links & version control
- RAG/embeddings implementation
- Custom model selection (fixed to default)
- Voice input/output
- Image generation
- Plagiarism/grammar checker
- Auto-citation
- Subscription limits enforcement

### 1.3 User Story
Sebagai user Makalah App, saya ingin berinteraksi dengan AI assistant dalam menyusun paper akademik saya melalui percakapan natural, dimana saya bisa:
- Memulai chat baru atau melanjutkan chat sebelumnya
- Mengirim pertanyaan/instruksi tentang paper saya
- Upload dokumen atau gambar untuk dianalisis
- Melihat AI response secara real-time (streaming)
- Edit pertanyaan saya dan kirim ulang
- Menyimpan/copy/insert response AI ke paper saya

---

## 2. Technical Architecture

### 2.1 Tech Stack
- **Frontend:** Next.js 16 App Router, React 19, TypeScript
- **UI Components:** shadcn/ui (Button, Dialog, Form, Input, Label, Textarea)
- **Styling:** Tailwind CSS 4
- **Backend:** Convex (real-time database)
- **Authentication:** Clerk
- **AI Provider:** Vercel AI SDK dengan Gateway (primary) + OpenRouter (fallback)
- **State Management:** React hooks (useState, useEffect)
- **Real-time Streaming:** Vercel AI SDK's useChat hook

### 2.2 Project Structure
```
src/
├── app/
│   └── chat/
│       ├── page.tsx                    # Main chat page (authenticated)
│       └── layout.tsx                  # Chat-specific layout (optional)
├── components/
│   ├── chat/
│   │   ├── ChatSidebar.tsx            # Sidebar dengan history & new chat
│   │   ├── ChatWindow.tsx             # Main conversation display
│   │   ├── ChatInput.tsx              # Input area dengan upload & send
│   │   ├── MessageBubble.tsx          # Individual message component
│   │   ├── QuickActions.tsx           # Copy/Insert/Save buttons
│   │   └── FileUploadButton.tsx       # Upload doc/img button
│   └── ui/                            # shadcn/ui components
├── lib/
│   ├── ai/
│   │   ├── client.ts                  # Existing AI client
│   │   ├── chat-config.ts             # System prompt & config
│   │   └── streaming.ts               # Streaming utilities
│   └── convex/
│       └── chat-helpers.ts            # Helper functions
└── convex/
    ├── schema.ts                      # Updated with chat tables
    ├── conversations.ts               # Conversation queries/mutations
    ├── messages.ts                    # Message queries/mutations
    └── files.ts                       # File upload handling

app/
└── api/
    └── chat/
        └── route.ts                   # Chat streaming API endpoint
```

### 2.3 System Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT SIDE                          │
│  ┌────────────────┐          ┌─────────────────────┐        │
│  │  ChatSidebar   │          │    ChatWindow       │        │
│  │  - History     │          │  - MessageBubble[]  │        │
│  │  - New Chat    │          │  - QuickActions     │        │
│  │  - User Info   │          │  - ChatInput        │        │
│  └────────────────┘          └─────────────────────┘        │
│         │                              │                     │
│         └──────────────┬───────────────┘                     │
│                        │                                     │
│                        ↓                                     │
│              ┌──────────────────┐                            │
│              │  useChat Hook    │                            │
│              │  (Vercel AI SDK) │                            │
│              └──────────────────┘                            │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
│              /api/chat/route.ts                              │
│              - Validate auth (Clerk)                         │
│              - Get/create conversation                       │
│              - Stream AI response                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
           ┌──────────┴──────────┐
           │                     │
           ↓                     ↓
┌──────────────────┐   ┌──────────────────┐
│  CONVEX DB       │   │  AI PROVIDERS    │
│  - conversations │   │  - AI Gateway    │
│  - messages      │   │  - OpenRouter    │
│  - files         │   │    (fallback)    │
└──────────────────┘   └──────────────────┘
```

---

## 3. Database Schema (Convex)

### 3.1 Schema Definition

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Existing tables
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    subscriptionStatus: v.string(),
    createdAt: v.number(),
  }).index("by_clerkUserId", ["clerkUserId"]),

  papers: defineTable({
    userId: v.id("users"),
    title: v.string(),
    abstract: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId", "createdAt"]),

  // New chat tables
  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(), // Auto-generated dari first message atau user-set
    createdAt: v.number(),
    updatedAt: v.number(),
    lastMessageAt: v.number(),
  })
    .index("by_user", ["userId", "lastMessageAt"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.string(), // "user" | "assistant" | "system"
    content: v.string(),
    createdAt: v.number(),

    // Optional fields
    fileIds: v.optional(v.array(v.id("files"))), // Untuk user messages dengan file
    metadata: v.optional(v.object({
      model: v.optional(v.string()),
      tokens: v.optional(v.number()),
      finishReason: v.optional(v.string()),
    })), // Untuk assistant messages
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_conversation_role", ["conversationId", "role", "createdAt"]),

  files: defineTable({
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    messageId: v.optional(v.id("messages")),

    // File info
    storageId: v.string(), // Convex storage ID
    name: v.string(),
    type: v.string(), // MIME type
    size: v.number(), // bytes

    // Processing status
    status: v.string(), // "uploading" | "processing" | "ready" | "error"
    extractedText: v.optional(v.string()), // OCR atau extracted text

    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_message", ["messageId"]),
})
```

### 3.2 Data Flow
1. **New Conversation:** User klik "New Chat" → create conversation record
2. **Send Message:** User kirim message → create message record (role: "user")
3. **AI Response:** Stream AI response → create message record (role: "assistant")
4. **File Upload:** User upload file → create file record → attach to message
5. **Update Conversation:** Setiap message baru → update conversation.lastMessageAt

### 3.3 Indexing Strategy
- `by_user` index untuk query conversations dan files by userId
- `by_conversation` index untuk query messages chronologically
- `lastMessageAt` untuk sorting recent conversations
- Compound index untuk efficient filtering

---

## 4. API Design

### 4.1 Chat Streaming API

**Endpoint:** `POST /api/chat/route.ts`

**Request Body:**
```typescript
{
  messages: Array<{
    role: "user" | "assistant" | "system",
    content: string
  }>,
  conversationId?: string, // Optional, untuk continue existing conversation
  fileIds?: string[] // Optional, IDs dari uploaded files
}
```

**Response:** Server-Sent Events (SSE) stream
```typescript
// Streaming chunks
data: {"content": "Halo, saya", "role": "assistant"}
data: {"content": " akan membantu", "role": "assistant"}
data: {"content": " Anda", "role": "assistant"}
data: [DONE]
```

**Implementation:**
```typescript
// app/api/chat/route.ts
import { auth } from "@clerk/nextjs/server"
import { streamText } from "ai"
import { getGatewayModel, getOpenRouterModel } from "@/lib/ai/client"
import { getSystemPrompt } from "@/lib/ai/chat-config"

export async function POST(req: Request) {
  // 1. Authenticate
  const { userId } = await auth()
  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  // 2. Parse request
  const { messages, conversationId, fileIds } = await req.json()

  // 3. Get/create conversation in Convex
  // ... Convex operations to save user message

  // 4. Prepare system prompt
  const systemPrompt = getSystemPrompt()
  const fullMessages = [
    { role: "system", content: systemPrompt },
    ...messages
  ]

  // 5. Stream AI response
  try {
    const model = getGatewayModel()
    const result = await streamText({
      model,
      messages: fullMessages,
      temperature: 0.7,
      maxTokens: 2048,
    })

    // 6. Save assistant message to Convex as streaming completes
    // ... Convex mutation

    return result.toDataStreamResponse()
  } catch (error) {
    // Fallback to OpenRouter
    const fallbackModel = getOpenRouterModel()
    const result = await streamText({
      model: fallbackModel,
      messages: fullMessages,
      temperature: 0.7,
      maxTokens: 2048,
    })
    return result.toDataStreamResponse()
  }
}
```

### 4.2 Convex Queries & Mutations

**conversations.ts:**
```typescript
// List conversations for user
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

// Get single conversation
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async ({ db }, { conversationId }) => {
    return await db.get(conversationId)
  },
})

// Create new conversation
export const createConversation = mutation({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
  },
  handler: async ({ db }, { userId, title }) => {
    const now = Date.now()
    return await db.insert("conversations", {
      userId,
      title: title ?? "New Chat",
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    })
  },
})

// Update conversation title and timestamp
export const updateConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.optional(v.string()),
  },
  handler: async ({ db }, { conversationId, title }) => {
    const now = Date.now()
    const updates: any = {
      updatedAt: now,
      lastMessageAt: now,
    }
    if (title) {
      updates.title = title
    }
    await db.patch(conversationId, updates)
  },
})

// Delete conversation (cascade delete messages)
export const deleteConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async ({ db }, { conversationId }) => {
    // Delete all messages first
    const messages = await db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect()

    for (const message of messages) {
      await db.delete(message._id)
    }

    // Delete conversation
    await db.delete(conversationId)
  },
})
```

**messages.ts:**
```typescript
// Get messages for conversation
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

// Create message
export const createMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.string(),
    content: v.string(),
    fileIds: v.optional(v.array(v.id("files"))),
    metadata: v.optional(v.object({
      model: v.optional(v.string()),
      tokens: v.optional(v.number()),
      finishReason: v.optional(v.string()),
    })),
  },
  handler: async ({ db }, args) => {
    const now = Date.now()
    const messageId = await db.insert("messages", {
      ...args,
      createdAt: now,
    })

    // Update conversation lastMessageAt
    await db.patch(args.conversationId, {
      lastMessageAt: now,
      updatedAt: now,
    })

    return messageId
  },
})

// Update message (for edit functionality)
export const updateMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async ({ db }, { messageId, content }) => {
    await db.patch(messageId, { content })
  },
})
```

**files.ts:**
```typescript
// Upload file mutation (returns file ID)
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

// Update file status after processing
export const updateFileStatus = mutation({
  args: {
    fileId: v.id("files"),
    status: v.string(),
    extractedText: v.optional(v.string()),
  },
  handler: async ({ db }, { fileId, status, extractedText }) => {
    await db.patch(fileId, { status, extractedText })
  },
})

// Get file by ID
export const getFile = query({
  args: { fileId: v.id("files") },
  handler: async ({ db }, { fileId }) => {
    return await db.get(fileId)
  },
})
```

---

## 5. Component Architecture

### 5.1 Page Component

**src/app/chat/page.tsx:**
```typescript
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ChatContainer } from "@/components/chat/ChatContainer"

export default async function ChatPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in?redirect_url=/chat")
  }

  return <ChatContainer />
}
```

### 5.2 Container Component

**src/components/chat/ChatContainer.tsx:**
```typescript
"use client"

import { useState } from "react"
import { ChatSidebar } from "./ChatSidebar"
import { ChatWindow } from "./ChatWindow"
import { useConversations } from "@/lib/hooks/useConversations"

export function ChatContainer() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const { conversations, createNewConversation } = useConversations()

  const handleNewChat = async () => {
    const newId = await createNewConversation()
    setCurrentConversationId(newId)
  }

  return (
    <div className="flex h-[calc(100vh-80px)]">
      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={setCurrentConversationId}
        onNewChat={handleNewChat}
      />
      <ChatWindow conversationId={currentConversationId} />
    </div>
  )
}
```

### 5.3 Sidebar Component

**src/components/chat/ChatSidebar.tsx:**
```typescript
"use client"

import { Button } from "@/components/ui/button"
import { PlusIcon, MessageSquareIcon } from "lucide-react"

interface ChatSidebarProps {
  conversations: Array<{
    _id: string
    title: string
    lastMessageAt: number
  }>
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
}

export function ChatSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
}: ChatSidebarProps) {
  return (
    <aside className="w-64 border-r bg-card/40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquareIcon className="h-5 w-5" />
          <span className="font-semibold">Makalah Chat</span>
        </div>
        <Button onClick={onNewChat} className="w-full" size="sm">
          <PlusIcon className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.map((conv) => (
          <button
            key={conv._id}
            onClick={() => onSelectConversation(conv._id)}
            className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
              currentConversationId === conv._id
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            }`}
          >
            <div className="font-medium text-sm truncate">{conv.title}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(conv.lastMessageAt).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>

      {/* Footer (User Info) */}
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground">
          {/* Clerk UserButton or user info */}
        </div>
      </div>
    </aside>
  )
}
```

### 5.4 Chat Window Component

**src/components/chat/ChatWindow.tsx:**
```typescript
"use client"

import { useChat } from "ai/react"
import { useEffect, useRef } from "react"
import { MessageBubble } from "./MessageBubble"
import { ChatInput } from "./ChatInput"
import { useMessages } from "@/lib/hooks/useMessages"

interface ChatWindowProps {
  conversationId: string | null
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages: historyMessages } = useMessages(conversationId)

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: {
      conversationId,
    },
    initialMessages: historyMessages,
  })

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MessageSquareIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Pilih chat atau mulai chat baru</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            conversationId={conversationId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput
        input={input}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        conversationId={conversationId}
      />
    </div>
  )
}
```

### 5.5 Message Bubble Component

**src/components/chat/MessageBubble.tsx:**
```typescript
"use client"

import { useState } from "react"
import { Message } from "ai"
import { QuickActions } from "./QuickActions"
import { Button } from "@/components/ui/button"
import { PencilIcon } from "lucide-react"

interface MessageBubbleProps {
  message: Message
  conversationId: string
}

export function MessageBubble({ message, conversationId }: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const isUser = message.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        {/* Message Content */}
        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* Actions */}
        {!isUser && (
          <QuickActions
            content={message.content}
            conversationId={conversationId}
          />
        )}

        {/* Edit Button for User Messages */}
        {isUser && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="mt-2"
          >
            <PencilIcon className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
      </div>
    </div>
  )
}
```

### 5.6 Quick Actions Component

**src/components/chat/QuickActions.tsx:**
```typescript
"use client"

import { Button } from "@/components/ui/button"
import { CopyIcon, FileTextIcon, BookmarkIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QuickActionsProps {
  content: string
  conversationId: string
}

export function QuickActions({ content, conversationId }: QuickActionsProps) {
  const { toast } = useToast()

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    toast({
      title: "Copied to clipboard",
      description: "Content copied successfully",
    })
  }

  const handleInsertToPaper = () => {
    // TODO: Implement insert to paper functionality
    toast({
      title: "Insert to Paper",
      description: "This will be implemented in paper integration phase",
    })
  }

  const handleSave = () => {
    // TODO: Implement save to favorites/snippets
    toast({
      title: "Saved",
      description: "Content saved to your snippets",
    })
  }

  return (
    <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
      <Button variant="ghost" size="sm" onClick={handleCopy}>
        <CopyIcon className="h-3 w-3 mr-1" />
        Copy
      </Button>
      <Button variant="ghost" size="sm" onClick={handleInsertToPaper}>
        <FileTextIcon className="h-3 w-3 mr-1" />
        Insert to Paper
      </Button>
      <Button variant="ghost" size="sm" onClick={handleSave}>
        <BookmarkIcon className="h-3 w-3 mr-1" />
        Save
      </Button>
    </div>
  )
}
```

### 5.7 Chat Input Component

**src/components/chat/ChatInput.tsx:**
```typescript
"use client"

import { FormEvent, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { FileUploadButton } from "./FileUploadButton"
import { SendIcon, StopCircleIcon } from "lucide-react"

interface ChatInputProps {
  input: string
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  conversationId: string
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  isLoading,
  conversationId,
}: ChatInputProps) {
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e as any)
    }
  }

  return (
    <div className="border-t bg-background p-4">
      <form onSubmit={onSubmit} className="max-w-4xl mx-auto">
        <div className="flex gap-2 items-end">
          {/* File Upload */}
          <FileUploadButton
            conversationId={conversationId}
            onFileUploaded={(fileId) => setUploadedFileIds([...uploadedFileIds, fileId])}
          />

          {/* Text Input */}
          <Textarea
            value={input}
            onChange={onInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pertanyaan atau instruksi tentang paper Anda..."
            className="min-h-[60px] max-h-[200px] resize-none"
            disabled={isLoading}
          />

          {/* Send/Stop Button */}
          <Button
            type={isLoading ? "button" : "submit"}
            size="icon"
            disabled={!input.trim() && !isLoading}
          >
            {isLoading ? (
              <StopCircleIcon className="h-5 w-5" />
            ) : (
              <SendIcon className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Uploaded Files Display */}
        {uploadedFileIds.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {uploadedFileIds.length} file(s) attached
          </div>
        )}
      </form>
    </div>
  )
}
```

### 5.8 File Upload Component

**src/components/chat/FileUploadButton.tsx:**
```typescript
"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { PaperclipIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FileUploadButtonProps {
  conversationId: string
  onFileUploaded: (fileId: string) => void
}

export function FileUploadButton({
  conversationId,
  onFileUploaded,
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type and size
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/gif",
      "text/plain",
    ]

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, DOC, DOCX, or image files",
        variant: "destructive",
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      // TODO: Implement Convex file upload
      // 1. Upload to Convex storage
      // 2. Create file record
      // 3. Return file ID

      toast({
        title: "File uploaded",
        description: file.name,
      })

      // onFileUploaded(fileId)
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload file",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        <PaperclipIcon className="h-5 w-5" />
      </Button>
    </>
  )
}
```

---

## 6. AI Configuration

### 6.1 System Prompt Configuration

**src/lib/ai/chat-config.ts:**
```typescript
export function getSystemPrompt(): string {
  return `Anda adalah asisten AI untuk Makalah App, sebuah aplikasi yang membantu pengguna menyusun paper akademik dalam Bahasa Indonesia.

PERSONA & TONE:
- Gunakan bahasa Indonesia formal dan akademik
- Bersikap profesional namun ramah
- Jelaskan konsep dengan jelas dan terstruktur
- Gunakan contoh konkret saat diperlukan

KEMAMPUAN UTAMA:
1. Membantu brainstorming topik dan outline paper
2. Menyusun struktur paper akademik (pendahuluan, tinjauan pustaka, metodologi, hasil, pembahasan, kesimpulan)
3. Memberikan saran untuk memperbaiki penulisan akademik
4. Membantu merumuskan pertanyaan penelitian dan hipotesis
5. Memberikan feedback konstruktif pada draft yang diunggah
6. Membantu merangkum dan menganalisis dokumen/gambar yang diunggah

FORMAT PAPER AKADEMIK:
- Judul
- Abstrak
- Pendahuluan (Latar Belakang, Rumusan Masalah, Tujuan Penelitian)
- Tinjauan Pustaka
- Metodologi Penelitian
- Hasil dan Pembahasan
- Kesimpulan dan Saran
- Daftar Pustaka

GUIDELINES:
- Fokus pada kualitas akademik dan struktur yang baik
- Dorong critical thinking dan analisis mendalam
- Ingatkan pentingnya sitasi dan menghindari plagiarisme (tanpa melakukan checking)
- Bantu user memecah tugas besar menjadi langkah-langkah kecil
- Jika user upload file, analisis isinya dan berikan feedback spesifik

BATASAN:
- Tidak menulis keseluruhan paper untuk user (hanya membantu dan membimbing)
- Tidak mengecek plagiarisme atau grammar secara otomatis
- Tidak menghasilkan sitasi otomatis (hanya memberi panduan format)
- Fokus pada academic writing berbahasa Indonesia

Selalu respons dengan helpful, terstruktur, dan actionable.`
}

export const CHAT_CONFIG = {
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
}
```

### 6.2 AI Client Enhancement

**src/lib/ai/streaming.ts:**
```typescript
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

const aiGatewayUrl = process.env.AI_GATEWAY_URL
const aiGatewayApiKey = process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_AI_GATEWAY_TOKEN
const openRouterApiKey = process.env.OPENROUTER_API_KEY

export function getGatewayModel() {
  if (!aiGatewayUrl || !aiGatewayApiKey) {
    throw new Error("AI Gateway is not configured")
  }

  const gatewayOpenAI = createOpenAI({
    apiKey: aiGatewayApiKey,
    baseURL: aiGatewayUrl,
  })

  return gatewayOpenAI("gpt-4o-mini")
}

export function getOpenRouterModel() {
  if (!openRouterApiKey) {
    throw new Error("OpenRouter API key is not configured")
  }

  const openRouterOpenAI = createOpenAI({
    apiKey: openRouterApiKey,
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "Makalah App",
    },
  })

  return openRouterOpenAI("gpt-4o-mini")
}

export async function streamChatResponse(
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number
    maxTokens?: number
  }
) {
  try {
    const model = getGatewayModel()
    return await streamText({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 2048,
    })
  } catch (error) {
    // Fallback to OpenRouter
    console.error("Gateway failed, falling back to OpenRouter:", error)
    const fallbackModel = getOpenRouterModel()
    return await streamText({
      model: fallbackModel,
      messages,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 2048,
    })
  }
}
```

---

## 7. Custom Hooks

### 7.1 useConversations Hook

**src/lib/hooks/useConversations.ts:**
```typescript
"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useUser } from "@clerk/nextjs"
import { Id } from "../../../convex/_generated/dataModel"

export function useConversations() {
  const { user } = useUser()
  const userId = user?.id // This should map to Convex user ID

  // Query conversations
  const conversations = useQuery(
    api.conversations.listConversations,
    userId ? { userId: userId as Id<"users"> } : "skip"
  )

  // Create conversation mutation
  const createConversationMutation = useMutation(api.conversations.createConversation)
  const deleteConversationMutation = useMutation(api.conversations.deleteConversation)

  const createNewConversation = async () => {
    if (!userId) return null
    const id = await createConversationMutation({
      userId: userId as Id<"users">,
      title: "New Chat",
    })
    return id
  }

  const deleteConversation = async (conversationId: Id<"conversations">) => {
    await deleteConversationMutation({ conversationId })
  }

  return {
    conversations: conversations ?? [],
    createNewConversation,
    deleteConversation,
  }
}
```

### 7.2 useMessages Hook

**src/lib/hooks/useMessages.ts:**
```typescript
"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

export function useMessages(conversationId: string | null) {
  const messages = useQuery(
    api.messages.getMessages,
    conversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip"
  )

  const createMessageMutation = useMutation(api.messages.createMessage)

  const createMessage = async (
    conversationId: Id<"conversations">,
    role: "user" | "assistant",
    content: string,
    fileIds?: Id<"files">[]
  ) => {
    return await createMessageMutation({
      conversationId,
      role,
      content,
      fileIds,
    })
  }

  return {
    messages: messages ?? [],
    createMessage,
  }
}
```

---

## 8. User Flows

### 8.1 Flow: Start New Chat
```
1. User lands on /chat page
2. System authenticates via Clerk
3. ChatContainer loads, shows sidebar with history
4. User clicks "New Chat" button
5. System creates new conversation in Convex
6. ChatWindow displays empty state with input ready
7. User dapat mulai mengetik
```

### 8.2 Flow: Send Message
```
1. User mengetik message di ChatInput
2. (Optional) User upload file via FileUploadButton
3. User tekan Enter atau klik Send button
4. System:
   a. Validate authentication
   b. Create user message record in Convex
   c. Call /api/chat endpoint
   d. Stream AI response in real-time
   e. Create assistant message record in Convex
5. MessageBubble displays both user & AI messages
6. QuickActions shown on AI response
```

### 8.3 Flow: Edit & Resend Message
```
1. User clicks Edit button on their message
2. MessageBubble switches to edit mode (textarea)
3. User modifies message text
4. User clicks Send/Save
5. System:
   a. Update message record in Convex
   b. Delete subsequent messages (AI response + following)
   c. Resend edited message to AI
   d. Stream new AI response
```

### 8.4 Flow: Upload File
```
1. User clicks Paperclip button
2. File picker opens
3. User selects file (PDF/DOC/IMG)
4. System validates:
   - File type (allowed types)
   - File size (max 10MB)
5. System uploads to Convex storage
6. System creates file record
7. File attached to next message
8. When message sent, AI receives file context
9. AI analyzes file and responds accordingly
```

### 8.5 Flow: Quick Actions
```
COPY:
1. User clicks Copy button on AI response
2. System copies content to clipboard
3. Toast notification confirms

INSERT TO PAPER:
1. User clicks Insert to Paper
2. (Future: Opens paper selector dialog)
3. (Future: Inserts content to selected paper section)
4. Toast notification confirms

SAVE:
1. User clicks Save button
2. (Future: Saves to user's snippets/favorites)
3. Toast notification confirms
```

### 8.6 Flow: Continue Existing Chat
```
1. User clicks conversation from sidebar
2. System loads conversation messages from Convex
3. ChatWindow displays message history
4. User can continue conversation from last message
5. Auto-scroll to bottom of conversation
```

---

## 9. Implementation Plan

### Phase 1: Database & API Setup (Priority: HIGH)
**Estimated Time:** 2-3 hours

**Tasks:**
1. Update Convex schema dengan tables: conversations, messages, files
2. Implement Convex queries & mutations:
   - conversations.ts (list, get, create, update, delete)
   - messages.ts (get, create, update)
   - files.ts (create, update, get)
3. Create /api/chat/route.ts streaming endpoint
4. Setup AI configuration file (chat-config.ts)
5. Test API endpoint dengan Postman/curl

**Deliverables:**
- Working Convex schema
- Functional API endpoints
- Basic AI streaming response

### Phase 2: Core Components (Priority: HIGH)
**Estimated Time:** 4-5 hours

**Tasks:**
1. Create custom hooks:
   - useConversations
   - useMessages
2. Build core components:
   - ChatContainer (layout)
   - ChatSidebar (navigation)
   - ChatWindow (main area)
   - MessageBubble (message display)
   - ChatInput (input area)
3. Integrate Vercel AI SDK's useChat hook
4. Implement real-time message streaming
5. Add auto-scroll functionality

**Deliverables:**
- Functional chat UI
- Real-time streaming messages
- Conversation management

### Phase 3: File Upload & Processing (Priority: MEDIUM)
**Estimated Time:** 3-4 hours

**Tasks:**
1. Implement FileUploadButton component
2. Setup Convex file storage integration
3. Add file validation (type, size)
4. Create file processing logic (extract text for context)
5. Integrate file context into AI prompts
6. Display uploaded files in messages

**Deliverables:**
- Working file upload
- File context in AI responses
- Visual file indicators

### Phase 4: Advanced Features (Priority: MEDIUM)
**Estimated Time:** 3-4 hours

**Tasks:**
1. Implement QuickActions component:
   - Copy to clipboard
   - Insert to Paper (placeholder)
   - Save to snippets (placeholder)
2. Add Edit & Resend functionality for user messages
3. Auto-generate conversation titles from first message
4. Add loading states and error handling
5. Implement conversation deletion

**Deliverables:**
- Full quick actions
- Edit & resend working
- Better UX with loading states

### Phase 5: Polish & Optimization (Priority: LOW)
**Estimated Time:** 2-3 hours

**Tasks:**
1. Add responsive design (mobile-friendly)
2. Improve accessibility (keyboard navigation, ARIA labels)
3. Add toast notifications
4. Optimize performance (virtualized lists for long conversations)
5. Add empty states and error messages
6. Write user documentation

**Deliverables:**
- Polished UI/UX
- Mobile responsive
- Accessible interface

### Phase 6: Testing & Deployment (Priority: HIGH)
**Estimated Time:** 2-3 hours

**Tasks:**
1. Manual testing all user flows
2. Test error scenarios (network failure, auth issues)
3. Test fallback to OpenRouter
4. Load testing (multiple conversations, long history)
5. Deploy to staging
6. QA review
7. Deploy to production

**Deliverables:**
- Tested feature
- Production deployment
- Bug fixes

**Total Estimated Time:** 16-22 hours

---

## 10. Success Criteria

### 10.1 Functional Requirements
- [ ] User dapat membuat chat baru
- [ ] User dapat mengirim message dan menerima AI response
- [ ] AI response streaming real-time
- [ ] Chat history persisted di Convex
- [ ] User dapat melanjutkan chat sebelumnya
- [ ] User dapat upload file (PDF, DOC, IMG)
- [ ] User dapat edit dan resend message mereka
- [ ] Quick actions (Copy, Insert, Save) berfungsi
- [ ] Conversation title auto-generated
- [ ] User dapat delete conversation

### 10.2 Technical Requirements
- [ ] Authentication via Clerk working
- [ ] Convex database schema implemented correctly
- [ ] API endpoint streaming responses properly
- [ ] AI Gateway with OpenRouter fallback working
- [ ] File upload max 10MB enforced
- [ ] Allowed file types validated
- [ ] Real-time UI updates without page refresh
- [ ] Error handling for failed requests
- [ ] Loading states shown appropriately

### 10.3 UX Requirements
- [ ] ChatGPT-style UI implemented
- [ ] Sidebar shows recent conversations
- [ ] Auto-scroll to bottom on new messages
- [ ] Responsive design (desktop & mobile)
- [ ] Toast notifications for user actions
- [ ] Empty states when no conversation selected
- [ ] Clear visual distinction between user & AI messages
- [ ] Keyboard shortcuts (Enter to send, Shift+Enter for newline)

### 10.4 Performance Requirements
- [ ] Initial page load < 2 seconds
- [ ] Message send latency < 500ms (excluding AI response)
- [ ] Smooth scrolling with 100+ messages
- [ ] File upload progress indicator
- [ ] No UI blocking during AI streaming

### 10.5 Security Requirements
- [ ] Only authenticated users can access /chat
- [ ] Users can only see their own conversations
- [ ] File uploads scanned for malicious content
- [ ] API endpoints protected by authentication
- [ ] No sensitive data in client-side logs

---

## 11. Future Enhancements (Post-MVP)

### 11.1 Phase 2 Features
- Integration dengan paper workflow (insert content directly to paper sections)
- Multi-paper context (reference multiple papers in one chat)
- Advanced search dalam chat history
- Tags dan categories untuk conversations
- Export chat to PDF/TXT

### 11.2 Phase 3 Features
- Citation management integration
- Templates untuk common academic tasks
- Collaborative chat (share with mentor/peer)
- Voice input/output
- RAG implementation (semantic search dalam papers)

### 11.3 AI Enhancements
- Custom model selection per conversation
- Fine-tuned model khusus bahasa Indonesia akademik
- Multi-modal input (gambar + text analysis)
- Auto-citation suggestions
- Grammar & plagiarism checking integration

---

## 12. Dependencies & Prerequisites

### 12.1 Environment Variables Required
```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_***
CLERK_SECRET_KEY=sk_***
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Convex
CONVEX_DEPLOYMENT=***
NEXT_PUBLIC_CONVEX_URL=https://***

# AI Providers
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/***
AI_GATEWAY_API_KEY=*** (or VERCEL_AI_GATEWAY_TOKEN)
OPENROUTER_API_KEY=***
APP_URL=https://makalah-app.vercel.app
```

### 12.2 NPM Packages (Already Installed)
- `ai` (Vercel AI SDK)
- `@ai-sdk/openai`
- `convex`
- `@clerk/nextjs`
- `lucide-react` (icons)
- `tailwindcss`
- `shadcn/ui` components

### 12.3 Additional Packages Needed
```bash
# For toast notifications (if not already installed)
npm install sonner
# or use radix-ui toast component

# For file type detection
npm install file-type
```

---

## 13. Risk Mitigation

### 13.1 Technical Risks

**Risk:** AI Gateway downtime
- **Mitigation:** OpenRouter fallback implemented
- **Monitoring:** Log all fallback instances

**Risk:** Convex rate limits exceeded
- **Mitigation:** Implement client-side throttling
- **Monitoring:** Track API usage

**Risk:** Large file uploads causing performance issues
- **Mitigation:** 10MB file size limit, async processing
- **Monitoring:** File upload success/failure rates

### 13.2 UX Risks

**Risk:** Slow AI response frustrating users
- **Mitigation:** Show streaming response immediately, loading indicators
- **Monitoring:** Track average response times

**Risk:** Lost messages due to network issues
- **Mitigation:** Implement retry logic, show error states clearly
- **Monitoring:** Track message send failures

### 13.3 Security Risks

**Risk:** Unauthorized access to conversations
- **Mitigation:** Server-side auth checks on all API endpoints
- **Monitoring:** Audit logs for access attempts

**Risk:** Malicious file uploads
- **Mitigation:** File type validation, size limits, virus scanning (future)
- **Monitoring:** Track rejected uploads

---

## 14. Appendix

### 14.1 API Response Examples

**Successful Chat Stream:**
```
POST /api/chat
{
  "messages": [
    { "role": "user", "content": "Bantu saya outline paper tentang AI ethics" }
  ],
  "conversationId": "k123456"
}

Response (SSE):
data: {"content": "Baik", "role": "assistant"}
data: {"content": ", saya akan", "role": "assistant"}
data: {"content": " membantu Anda", "role": "assistant"}
...
data: [DONE]
```

**Error Response:**
```json
{
  "error": "Unauthorized",
  "message": "User not authenticated"
}
```

### 14.2 Convex Query Examples

**Get Conversations:**
```typescript
const conversations = await db
  .query("conversations")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .order("desc")
  .take(50)
```

**Get Messages:**
```typescript
const messages = await db
  .query("messages")
  .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
  .order("asc")
  .collect()
```

### 14.3 System Prompt Template
See Section 6.1 for full system prompt.

### 14.4 Color Scheme (Tailwind)
```css
/* Already defined in globals.css via Tailwind */
--background: 0 0% 100%
--foreground: 222.2 84% 4.9%
--card: 0 0% 100%
--muted: 210 40% 96.1%
--accent: 210 40% 96.1%
--primary: 222.2 47.4% 11.2%
```

---

## 15. Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-13 | Spec Team | Initial specification document |

---

**END OF SPECIFICATION DOCUMENT**
