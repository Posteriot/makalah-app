import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ChatWindow } from "./ChatWindow"

const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockSetTheme = vi.fn()
const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
const mockSetMessages = vi.fn()
const mockUseMessages = vi.fn()
const conversationId = "a".repeat(32)

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}))

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: [],
    sendMessage: vi.fn(),
    status: "ready",
    setMessages: mockSetMessages,
    regenerate: vi.fn(),
    stop: vi.fn(),
    error: null,
  }),
}))

vi.mock("ai", () => ({
  DefaultChatTransport: class DefaultChatTransport {},
}))

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useConvexAuth: () => ({
    isAuthenticated: true,
  }),
}))

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    conversations: {
      getConversation: "conversations.getConversation",
      createConversation: "conversations.createConversation",
    },
    chatHelpers: {
      getMyUserId: "chatHelpers.getMyUserId",
    },
    conversationAttachmentContexts: {
      getByConversation: "conversationAttachmentContexts.getByConversation",
      upsertByConversation: "conversationAttachmentContexts.upsertByConversation",
      clearByConversation: "conversationAttachmentContexts.clearByConversation",
    },
    files: {
      getFilesByIds: "files.getFilesByIds",
    },
    messages: {
      editAndTruncateConversation: "messages.editAndTruncateConversation",
    },
  },
}))

vi.mock("@/lib/hooks/useMessages", () => ({
  useMessages: (...args: unknown[]) => mockUseMessages(...args),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: {
      _id: "user-1",
      role: "user",
      subscriptionStatus: "gratis",
    },
    isLoading: false,
  }),
}))

vi.mock("@/lib/hooks/usePaperSession", () => ({
  usePaperSession: () => ({
    session: {
      _id: "paper-1",
      currentStage: "topik",
    },
    isPaperMode: true,
    currentStage: "topik",
    stageStatus: "drafting",
    stageLabel: "Topik",
    stageData: {},
    approveStage: vi.fn(),
    requestRevision: vi.fn(),
    markStageAsDirty: vi.fn(),
    rewindToStage: vi.fn(async () => ({ success: true })),
    getStageStartIndex: () => 0,
  }),
}))

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "auth-user-1",
      },
    },
  }),
}))

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
    setTheme: mockSetTheme,
  }),
}))

vi.mock("./MessageBubble", () => ({
  MessageBubble: () => <div data-testid="message-bubble" />,
}))

vi.mock("./ChatInput", () => ({
  ChatInput: () => <div data-testid="chat-input" />,
}))

vi.mock("./ChatProcessStatusBar", () => ({
  ChatProcessStatusBar: () => null,
}))

vi.mock("../paper/PaperValidationPanel", () => ({
  PaperValidationPanel: () => <div data-testid="paper-validation-panel" />,
}))

vi.mock("./messages/TemplateGrid", () => ({
  TemplateGrid: () => <div data-testid="template-grid" />,
}))

vi.mock("./QuotaWarningBanner", () => ({
  QuotaWarningBanner: () => null,
}))

vi.mock("./mobile/MobileEditDeleteSheet", () => ({
  MobileEditDeleteSheet: () => null,
}))

vi.mock("../paper/RewindConfirmationDialog", () => ({
  RewindConfirmationDialog: () => null,
}))

vi.mock("@/components/technical-report", () => ({
  ChatTechnicalReportButton: () => null,
}))

vi.mock("@/lib/technical-report/chatSnapshot", () => ({
  extractChatDiagnosticSnapshot: () => ({}),
  extractToolStatesFromReasoning: () => [],
  shouldShowTechnicalReportTrigger: () => false,
}))

vi.mock("@/lib/technical-report/searchStatus", () => ({
  resolveTechnicalReportSearchStatus: () => "idle",
}))

vi.mock("./chat-quota-error", () => ({
  buildChatQuotaOfferFromError: () => null,
  isQuotaExceededChatError: () => false,
}))

vi.mock("@sentry/nextjs", () => ({
  setUser: vi.fn(),
  withScope: (callback: (scope: { setTag: (...args: unknown[]) => void; setContext: (...args: unknown[]) => void }) => void) =>
    callback({
      setTag: vi.fn(),
      setContext: vi.fn(),
    }),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock("react-virtuoso", () => ({
  Virtuoso: () => null,
}))

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// SourcesPanel uses window.matchMedia which jsdom doesn't provide
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe("ChatWindow mobile workspace alignment", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    mockPush.mockReset()
    mockReplace.mockReset()
    mockSetTheme.mockReset()
    mockSetMessages.mockReset()
    mockUseMessages.mockReset()
    mockUseMessages.mockReturnValue({
      messages: [],
      isLoading: false,
    })
    mockUseMutation.mockReset()
    mockUseMutation.mockReturnValue(vi.fn(async () => null))
    mockUseQuery.mockReset()
    mockUseQuery.mockImplementation((query: string, args: unknown) => {
      if (args === "skip") return undefined

      switch (query) {
        case "conversations.getConversation":
          return {
            _id: conversationId,
            title: "Percakapan riset",
          }
        case "chatHelpers.getMyUserId":
          return "user-1"
        case "conversationAttachmentContexts.getByConversation":
          return {
            activeFileIds: [],
          }
        case "files.getFilesByIds":
          return []
        default:
          return undefined
      }
    })
  })

  it("menghapus tombol paper sessions dari header mobile agar drawer jadi entry point workspace tunggal", () => {
    render(
      <ChatWindow
        conversationId={conversationId}
        onMobileMenuClick={vi.fn()}
      />
    )

    expect(screen.getByRole("button", { name: /open sidebar/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /chat baru/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /paper sessions/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId("mobile-progress-bar")).not.toBeInTheDocument()
  })

  it("tetap merehydrate semua history messages saat ada reasoning trace tersimpan", () => {
    const persistedReasoningTrace = Object.freeze({
      headline: "Menelusuri sumber",
      steps: [
        {
          stepKey: "search-decision",
          label: "Menentukan kebutuhan web search",
          status: "done",
          progress: 100,
          ts: 1710000000000,
        },
      ],
      rawReasoning: "Butuh web search buat verifikasi referensi.",
    })

    mockUseMessages.mockReturnValue({
      messages: [
        {
          _id: "msg-user-1",
          _creationTime: 1710000000000,
          role: "user",
          content: "Cari jurnal terbaru",
          fileIds: [],
          attachmentMode: "none",
        },
        {
          _id: "msg-assistant-1",
          _creationTime: 1710000005000,
          role: "assistant",
          content: "Ini hasil pencariannya.",
          fileIds: [],
          attachmentMode: "none",
          reasoningTrace: persistedReasoningTrace,
        },
      ],
      isLoading: false,
    })

    render(
      <ChatWindow
        conversationId={conversationId}
        onMobileMenuClick={vi.fn()}
      />
    )

    expect(mockSetMessages).toHaveBeenCalledTimes(1)
    const [mappedMessages] = mockSetMessages.mock.calls[0]
    expect(mappedMessages).toHaveLength(2)
    expect(mappedMessages[0]).toMatchObject({
      id: "msg-user-1",
      role: "user",
      content: "Cari jurnal terbaru",
    })
    expect(mappedMessages[1]).toMatchObject({
      id: "msg-assistant-1",
      role: "assistant",
      content: "Ini hasil pencariannya.",
      reasoningTrace: persistedReasoningTrace,
    })
  })
})
