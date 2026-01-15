 DOKUMENTASI LENGKAP TOOLS & API - MAKALAHAPP

  ★ Insight ─────────────────────────────────────
  Codebase ini menggunakan multi-layer architecture:
  1. AI Function Tools - Tools yang dipanggil LLM (paper workflow + artifact)
  2. Next.js API Routes - HTTP endpoints untuk streaming & file processing
  3. Convex Backend - Real-time database dengan queries/mutations
  4. External Integrations - AI providers, auth, email

  Pattern unik: Router-based tool switching - AI SDK tidak bisa mix google_search (provider-defined) dengan function tools dalam 1 request, jadi ada router yang decide mode per request.
  ─────────────────────────────────────────────────

  ---
  1. AI FUNCTION TOOLS (untuk LLM)

  1.1 Paper Writing Tools

  File: src/lib/ai/paper-tools.ts
  ┌──────────────────────────┬────────────────────────────────────────────────────┬─────────────────────────────────────────────────────┐
  │           Tool           │                      Purpose                       │                     Parameters                      │
  ├──────────────────────────┼────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
  │ startPaperSession        │ Inisialisasi sesi penulisan paper baru             │ initialIdea? (string, optional)                     │
  ├──────────────────────────┼────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
  │ getCurrentPaperState     │ Ambil status terbaru sesi paper                    │ (none)                                              │
  ├──────────────────────────┼────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
  │ updateStageData          │ Simpan progres draf ke tahap SAAT INI (auto-stage) │ ringkasan (required, max 280 chars), data? (object) │
  ├──────────────────────────┼────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
  │ submitStageForValidation │ Kirim draf untuk approval user                     │ (none)                                              │
  └──────────────────────────┴────────────────────────────────────────────────────┴─────────────────────────────────────────────────────┘
  1.2 General Chat Tools

  File: src/app/api/chat/route.ts (lines 651-861)
  ┌─────────────────────────┬───────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────┐
  │          Tool           │                                Purpose                                │                      Parameters                       │
  ├─────────────────────────┼───────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ createArtifact          │ Buat artifact baru (outline, section, code, table, citation, formula) │ type, title, content, format?, description?, sources? │
  ├─────────────────────────┼───────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ updateArtifact          │ Update artifact yang sudah ada (versioning)                           │ artifactId, content, title?, sources?                 │
  ├─────────────────────────┼───────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ renameConversationTitle │ Update judul conversation (max 2x oleh AI)                            │ title (3-50 chars)                                    │
  └─────────────────────────┴───────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────┘
  1.3 Provider-Defined Tool

  File: src/lib/ai/streaming.ts → getGoogleSearchTool()
  ┌───────────────┬───────────────────────┬────────────────┐
  │     Tool      │        Purpose        │    Provider    │
  ├───────────────┼───────────────────────┼────────────────┤
  │ google_search │ Web search via Google │ @ai-sdk/google │
  └───────────────┴───────────────────────┴────────────────┘
  ⚠️ CONSTRAINT: Cannot mix dengan function tools dalam 1 request.

  ---
  2. NEXT.JS API ROUTES

  2.1 Chat Streaming
  ┌────────────────┬───────────────────────────┬──────────────────────────────────────┐
  │    Endpoint    │           File            │               Purpose                │
  ├────────────────┼───────────────────────────┼──────────────────────────────────────┤
  │ POST /api/chat │ src/app/api/chat/route.ts │ Main chat streaming dengan AI SDK v5 │
  └────────────────┴───────────────────────────┴──────────────────────────────────────┘
  Features:
  - Automatic conversation creation & title generation
  - File context injection
  - Paper mode detection & prompt injection
  - Web search decision router
  - Inline citations [1], [2]
  - Dual provider fallback (Gateway → OpenRouter)

  2.2 File Extraction
  ┌────────────────────────┬───────────────────────────────────┬─────────────────────────┐
  │        Endpoint        │               File                │         Purpose         │
  ├────────────────────────┼───────────────────────────────────┼─────────────────────────┤
  │ POST /api/extract-file │ src/app/api/extract-file/route.ts │ Extract text dari files │
  └────────────────────────┴───────────────────────────────────┴─────────────────────────┘
  Supported formats: TXT, PDF, DOCX, XLSX, Images (OCR)

  2.3 Text Analysis (Refrasa)
  ┌───────────────────┬──────────────────────────────┬───────────────────────────────────────┐
  │     Endpoint      │             File             │                Purpose                │
  ├───────────────────┼──────────────────────────────┼───────────────────────────────────────┤
  │ POST /api/refrasa │ src/app/api/refrasa/route.ts │ LLM-powered text naturalness analysis │
  └───────────────────┴──────────────────────────────┴───────────────────────────────────────┘
  2.4 Document Export
  ┌───────────────────────┬──────────────────────────────────┬──────────────────────────────┐
  │       Endpoint        │               File               │           Purpose            │
  ├───────────────────────┼──────────────────────────────────┼──────────────────────────────┤
  │ POST /api/export/word │ src/app/api/export/word/route.ts │ Export paper ke Word (.docx) │
  ├───────────────────────┼──────────────────────────────────┼──────────────────────────────┤
  │ POST /api/export/pdf  │ src/app/api/export/pdf/route.ts  │ Export paper ke PDF          │
  └───────────────────────┴──────────────────────────────────┴──────────────────────────────┘
  2.5 Admin Endpoints
  ┌────────────────────────────────────────────┬───────────────────────────────────────────────────────┬─────────────────────────────┐
  │                  Endpoint                  │                         File                          │           Purpose           │
  ├────────────────────────────────────────────┼───────────────────────────────────────────────────────┼─────────────────────────────┤
  │ POST /api/admin/validate-provider          │ src/app/api/admin/validate-provider/route.ts          │ Test AI provider connection │
  ├────────────────────────────────────────────┼───────────────────────────────────────────────────────┼─────────────────────────────┤
  │ POST /api/admin/verify-model-compatibility │ src/app/api/admin/verify-model-compatibility/route.ts │ Verify model compatibility  │
  └────────────────────────────────────────────┴───────────────────────────────────────────────────────┴─────────────────────────────┘
  2.6 Webhook
  ┌──────────────────────────┬─────────────────────────────────────┬────────────────────────────┐
  │         Endpoint         │                File                 │          Purpose           │
  ├──────────────────────────┼─────────────────────────────────────┼────────────────────────────┤
  │ POST /api/webhooks/clerk │ src/app/api/webhooks/clerk/route.ts │ Handle Clerk auth webhooks │
  └──────────────────────────┴─────────────────────────────────────┴────────────────────────────┘
  ---
  3. CONVEX BACKEND FUNCTIONS

  3.1 Messages (convex/messages.ts)

  Queries:
  ┌──────────────────────────────────┬─────────────────────────────────┬────────────────────────┐
  │             Function             │             Purpose             │       Parameters       │
  ├──────────────────────────────────┼─────────────────────────────────┼────────────────────────┤
  │ getMessages                      │ Get messages untuk conversation │ conversationId         │
  ├──────────────────────────────────┼─────────────────────────────────┼────────────────────────┤
  │ countMessagePairsForConversation │ Hitung pasang pesan             │ conversationId, userId │
  ├──────────────────────────────────┼─────────────────────────────────┼────────────────────────┤
  │ getRecentSources                 │ Get recent web search sources   │ conversationId, limit? │
  └──────────────────────────────────┴─────────────────────────────────┴────────────────────────┘
  Mutations:
  ┌───────────────┬────────────────────────┬──────────────────────────────────────────────────────────────┐
  │   Function    │        Purpose         │                          Parameters                          │
  ├───────────────┼────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ createMessage │ Buat message baru      │ conversationId, role, content, fileIds?, metadata?, sources? │
  ├───────────────┼────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ updateMessage │ Update message content │ messageId, content                                           │
  └───────────────┴────────────────────────┴──────────────────────────────────────────────────────────────┘
  3.2 Conversations (convex/conversations.ts)

  Queries:
  ┌───────────────────┬──────────────────────────────────┬────────────────┐
  │     Function      │             Purpose              │   Parameters   │
  ├───────────────────┼──────────────────────────────────┼────────────────┤
  │ listConversations │ List conversations user (max 50) │ userId         │
  ├───────────────────┼──────────────────────────────────┼────────────────┤
  │ getConversation   │ Get single conversation          │ conversationId │
  └───────────────────┴──────────────────────────────────┴────────────────┘
  Mutations:
  ┌───────────────────────────────┬────────────────────────┬─────────────────────────────────────────────────────┐
  │           Function            │        Purpose         │                     Parameters                      │
  ├───────────────────────────────┼────────────────────────┼─────────────────────────────────────────────────────┤
  │ createConversation            │ Buat conversation baru │ userId, title?                                      │
  ├───────────────────────────────┼────────────────────────┼─────────────────────────────────────────────────────┤
  │ updateConversation            │ Update conversation    │ conversationId, title?                              │
  ├───────────────────────────────┼────────────────────────┼─────────────────────────────────────────────────────┤
  │ updateConversationTitleFromAI │ Update title by AI     │ conversationId, userId, title, nextTitleUpdateCount │
  └───────────────────────────────┴────────────────────────┴─────────────────────────────────────────────────────┘
  3.3 Files (convex/files.ts)

  Queries:
  ┌───────────────┬────────────────────┬────────────┐
  │   Function    │      Purpose       │ Parameters │
  ├───────────────┼────────────────────┼────────────┤
  │ getFile       │ Get file by ID     │ fileId     │
  ├───────────────┼────────────────────┼────────────┤
  │ getFileUrl    │ Get file URL       │ storageId  │
  ├───────────────┼────────────────────┼────────────┤
  │ getFilesByIds │ Get multiple files │ fileIds[]  │
  └───────────────┴────────────────────┴────────────┘
  Mutations:
  ┌────────────────────────┬──────────────────────────┬─────────────────────────────────────────────────────────────────────────┐
  │        Function        │         Purpose          │                               Parameters                                │
  ├────────────────────────┼──────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ createFile             │ Create file record       │ conversationId?, storageId, name, type, size                            │
  ├────────────────────────┼──────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ updateFileStatus       │ Update extraction status │ fileId, status, extractedText?                                          │
  ├────────────────────────┼──────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ updateExtractionResult │ Update extraction result │ fileId, extractedText?, extractionStatus, extractionError?, processedAt │
  ├────────────────────────┼──────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ deleteFile             │ Delete file              │ fileId                                                                  │
  └────────────────────────┴──────────────────────────┴─────────────────────────────────────────────────────────────────────────┘
  3.4 Artifacts (convex/artifacts.ts)

  Queries:
  ┌────────────────────┬────────────────────────────────┬───────────────────────────────┐
  │      Function      │            Purpose             │          Parameters           │
  ├────────────────────┼────────────────────────────────┼───────────────────────────────┤
  │ get                │ Get artifact by ID             │ artifactId, userId            │
  ├────────────────────┼────────────────────────────────┼───────────────────────────────┤
  │ listByConversation │ List artifacts in conversation │ conversationId, userId, type? │
  ├────────────────────┼────────────────────────────────┼───────────────────────────────┤
  │ listByUser         │ List all user's artifacts      │ userId, type?, limit?         │
  └────────────────────┴────────────────────────────────┴───────────────────────────────┘
  Mutations:
  ┌───────────────────┬───────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
  │     Function      │                Purpose                │                                  Parameters                                   │
  ├───────────────────┼───────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ create            │ Create new artifact                   │ conversationId, userId, type, title, content, format?, description?, sources? │
  ├───────────────────┼───────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ update            │ Update artifact (creates new version) │ artifactId, userId, content, title?, sources?                                 │
  ├───────────────────┼───────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ clearInvalidation │ Clear invalidation flag               │ artifactId                                                                    │
  └───────────────────┴───────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘
  3.5 Paper Sessions (convex/paperSessions.ts)

  Queries:
  ┌───────────────────┬─────────────────────────────┬────────────────┐
  │     Function      │           Purpose           │   Parameters   │
  ├───────────────────┼─────────────────────────────┼────────────────┤
  │ getByConversation │ Get session by conversation │ conversationId │
  ├───────────────────┼─────────────────────────────┼────────────────┤
  │ getById           │ Get session by ID           │ sessionId      │
  ├───────────────────┼─────────────────────────────┼────────────────┤
  │ getSessionHistory │ Get user's session history  │ userId, limit? │
  └───────────────────┴─────────────────────────────┴────────────────┘
  Mutations:
  ┌───────────────────────────┬─────────────────────────────┬──────────────────────────────────────┐
  │         Function          │           Purpose           │              Parameters              │
  ├───────────────────────────┼─────────────────────────────┼──────────────────────────────────────┤
  │ create                    │ Create new paper session    │ userId, conversationId, initialIdea? │
  ├───────────────────────────┼─────────────────────────────┼──────────────────────────────────────┤
  │ updateStageData           │ Update stage data           │ sessionId, stage, data               │
  ├───────────────────────────┼─────────────────────────────┼──────────────────────────────────────┤
  │ submitForValidation       │ Submit for user validation  │ sessionId                            │
  ├───────────────────────────┼─────────────────────────────┼──────────────────────────────────────┤
  │ approveStage              │ Approve current stage       │ sessionId, userId                    │
  ├───────────────────────────┼─────────────────────────────┼──────────────────────────────────────┤
  │ reviseStage               │ Request revision            │ sessionId                            │
  ├───────────────────────────┼─────────────────────────────┼──────────────────────────────────────┤
  │ markStageComplete         │ Mark stage complete         │ sessionId, userId                    │
  ├───────────────────────────┼─────────────────────────────┼──────────────────────────────────────┤
  │ moveToNextStage           │ Advance to next stage       │ sessionId, userId                    │
  ├───────────────────────────┼─────────────────────────────┼──────────────────────────────────────┤
  │ rewindToStage             │ Rewind to previous stage    │ sessionId, userId, targetStage       │
  ├───────────────────────────┼─────────────────────────────┼──────────────────────────────────────┤
  │ clearArtifactInvalidation │ Clear artifact invalidation │ sessionId, artifactId                │
  └───────────────────────────┴─────────────────────────────┴──────────────────────────────────────┘
  3.6 Users (convex/users.ts)

  Queries:
  ┌───────────────────┬─────────────────────────────┬─────────────────┐
  │     Function      │           Purpose           │   Parameters    │
  ├───────────────────┼─────────────────────────────┼─────────────────┤
  │ getUserByClerkId  │ Get user by Clerk ID        │ clerkUserId     │
  ├───────────────────┼─────────────────────────────┼─────────────────┤
  │ getUserRole       │ Get user's role             │ userId          │
  ├───────────────────┼─────────────────────────────┼─────────────────┤
  │ checkIsAdmin      │ Check if admin              │ userId          │
  ├───────────────────┼─────────────────────────────┼─────────────────┤
  │ checkIsSuperAdmin │ Check if superadmin         │ userId          │
  ├───────────────────┼─────────────────────────────┼─────────────────┤
  │ listAllUsers      │ List all users (admin only) │ requestorUserId │
  └───────────────────┴─────────────────────────────┴─────────────────┘
  Mutations:
  ┌────────────────┬──────────────────────────┬───────────────────────────────────────────┐
  │    Function    │         Purpose          │                Parameters                 │
  ├────────────────┼──────────────────────────┼───────────────────────────────────────────┤
  │ ensureUser     │ Get or create user       │ clerkUserId, email, firstName?, lastName? │
  ├────────────────┼──────────────────────────┼───────────────────────────────────────────┤
  │ updateUserRole │ Update user role         │ requestorUserId, targetUserId, newRole    │
  ├────────────────┼──────────────────────────┼───────────────────────────────────────────┤
  │ deleteUser     │ Delete user (superadmin) │ requestorUserId, userId                   │
  └────────────────┴──────────────────────────┴───────────────────────────────────────────┘
  3.7 Papers (convex/papers.ts)

  Queries:
  ┌───────────────────┬────────────────────┬────────────┐
  │     Function      │      Purpose       │ Parameters │
  ├───────────────────┼────────────────────┼────────────┤
  │ listPapersForUser │ List user's papers │ userId     │
  └───────────────────┴────────────────────┴────────────┘
  Mutations:
  ┌─────────────────────┬───────────────────────┬──────────────────────────┐
  │      Function       │        Purpose        │        Parameters        │
  ├─────────────────────┼───────────────────────┼──────────────────────────┤
  │ createPaperMetadata │ Create paper metadata │ userId, title, abstract? │
  └─────────────────────┴───────────────────────┴──────────────────────────┘
  3.8 Admin User Management (convex/adminUserManagement.ts)

  Mutations:
  ┌────────────────┬─────────────────────────────────────────┬──────────────┐
  │    Function    │                 Purpose                 │  Parameters  │
  ├────────────────┼─────────────────────────────────────────┼──────────────┤
  │ promoteToAdmin │ Promote user to admin (superadmin only) │ targetUserId │
  ├────────────────┼─────────────────────────────────────────┼──────────────┤
  │ demoteToUser   │ Demote admin to user (superadmin only)  │ targetUserId │
  └────────────────┴─────────────────────────────────────────┴──────────────┘
  3.9 Admin Manual User Creation (convex/adminManualUserCreation.ts)

  Mutations:
  ┌─────────────────┬──────────────────────────────────────┬──────────────────────────────────┐
  │    Function     │               Purpose                │            Parameters            │
  ├─────────────────┼──────────────────────────────────────┼──────────────────────────────────┤
  │ createAdminUser │ Create pending admin/superadmin user │ email, role, firstName, lastName │
  └─────────────────┴──────────────────────────────────────┴──────────────────────────────────┘
  3.10 System Prompts (convex/systemPrompts.ts)

  Queries:
  ┌─────────────────────────┬──────────────────────────┬─────────────────────────┐
  │        Function         │         Purpose          │       Parameters        │
  ├─────────────────────────┼──────────────────────────┼─────────────────────────┤
  │ getActiveSystemPrompt   │ Get active system prompt │ (none)                  │
  ├─────────────────────────┼──────────────────────────┼─────────────────────────┤
  │ listSystemPrompts       │ List all prompts (admin) │ requestorUserId         │
  ├─────────────────────────┼──────────────────────────┼─────────────────────────┤
  │ getPromptVersionHistory │ Get version history      │ requestorUserId, rootId │
  └─────────────────────────┴──────────────────────────┴─────────────────────────┘
  Mutations:
  ┌──────────────────────┬─────────────────────────────────────┬──────────────────────────────────────────────────┐
  │       Function       │               Purpose               │                    Parameters                    │
  ├──────────────────────┼─────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ createSystemPrompt   │ Create new prompt                   │ requestorUserId, name, content, description?     │
  ├──────────────────────┼─────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ updateSystemPrompt   │ Update prompt (creates new version) │ requestorUserId, promptId, content, description? │
  ├──────────────────────┼─────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ activateSystemPrompt │ Activate prompt                     │ requestorUserId, promptId                        │
  ├──────────────────────┼─────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ deleteSystemPrompt   │ Delete prompt                       │ requestorUserId, promptId                        │
  └──────────────────────┴─────────────────────────────────────┴──────────────────────────────────────────────────┘
  3.11 Style Constitutions (convex/styleConstitutions.ts)

  Queries:
  ┌────────────────────────┬────────────────────────────────┬─────────────────────────┐
  │        Function        │            Purpose             │       Parameters        │
  ├────────────────────────┼────────────────────────────────┼─────────────────────────┤
  │ getActive              │ Get active style constitution  │ (none)                  │
  ├────────────────────────┼────────────────────────────────┼─────────────────────────┤
  │ listStyleConstitutions │ List all constitutions (admin) │ requestorUserId         │
  ├────────────────────────┼────────────────────────────────┼─────────────────────────┤
  │ getHistoryForRoot      │ Get version history            │ requestorUserId, rootId │
  └────────────────────────┴────────────────────────────────┴─────────────────────────┘
  Mutations:
  ┌───────────────────────────┬─────────────────────────┬────────────────────────────────────────────────────────┐
  │         Function          │         Purpose         │                       Parameters                       │
  ├───────────────────────────┼─────────────────────────┼────────────────────────────────────────────────────────┤
  │ createStyleConstitution   │ Create new constitution │ requestorUserId, name, content, description?           │
  ├───────────────────────────┼─────────────────────────┼────────────────────────────────────────────────────────┤
  │ updateStyleConstitution   │ Update constitution     │ requestorUserId, constitutionId, content, description? │
  ├───────────────────────────┼─────────────────────────┼────────────────────────────────────────────────────────┤
  │ activateStyleConstitution │ Activate constitution   │ requestorUserId, constitutionId                        │
  └───────────────────────────┴─────────────────────────┴────────────────────────────────────────────────────────┘
  3.12 AI Provider Configs (convex/aiProviderConfigs.ts)

  Queries:
  ┌──────────────────┬──────────────────────────┬─────────────────────────┐
  │     Function     │         Purpose          │       Parameters        │
  ├──────────────────┼──────────────────────────┼─────────────────────────┤
  │ getActiveConfig  │ Get active AI config     │ (none)                  │
  ├──────────────────┼──────────────────────────┼─────────────────────────┤
  │ listConfigs      │ List all configs (admin) │ requestorUserId         │
  ├──────────────────┼──────────────────────────┼─────────────────────────┤
  │ getConfigHistory │ Get version history      │ requestorUserId, rootId │
  └──────────────────┴──────────────────────────┴─────────────────────────┘
  Mutations:
  Function: createConfig
  Purpose: Create new config
  Parameters: requestorUserId, name, primaryProvider, primaryModel, primaryApiKey, fallbackProvider, fallbackModel, fallbackApiKey, temperature, topP?, maxTokens?, description?
  ────────────────────────────────────────
  Function: updateConfig
  Purpose: Update config
  Parameters: requestorUserId, configId, ...
  ────────────────────────────────────────
  Function: activateConfig
  Purpose: Activate config
  Parameters: requestorUserId, configId
  3.13 System Alerts (convex/systemAlerts.ts)

  Queries:
  ┌─────────────────────────┬───────────────────────────────┬──────────────────────────┐
  │        Function         │            Purpose            │        Parameters        │
  ├─────────────────────────┼───────────────────────────────┼──────────────────────────┤
  │ isFallbackActive        │ Check if fallback mode active │ (none)                   │
  ├─────────────────────────┼───────────────────────────────┼──────────────────────────┤
  │ getUnresolvedAlertCount │ Count unresolved alerts       │ (none)                   │
  ├─────────────────────────┼───────────────────────────────┼──────────────────────────┤
  │ getRecentAlerts         │ Get recent alerts             │ limit?, type?, severity? │
  └─────────────────────────┴───────────────────────────────┴──────────────────────────┘
  Mutations:
  ┌──────────────┬──────────────────┬─────────────────────────────────────────────────┐
  │   Function   │     Purpose      │                   Parameters                    │
  ├──────────────┼──────────────────┼─────────────────────────────────────────────────┤
  │ createAlert  │ Create new alert │ alertType, severity, message, source, metadata? │
  ├──────────────┼──────────────────┼─────────────────────────────────────────────────┤
  │ resolveAlert │ Resolve alert    │ alertId, userId                                 │
  └──────────────┴──────────────────┴─────────────────────────────────────────────────┘
  3.14 Chat Helpers (convex/chatHelpers.ts)

  Queries:
  ┌───────────┬───────────────────────────┬─────────────┐
  │ Function  │          Purpose          │ Parameters  │
  ├───────────┼───────────────────────────┼─────────────┤
  │ getUserId │ Get user ID from Clerk ID │ clerkUserId │
  └───────────┴───────────────────────────┴─────────────┘
  3.15 Permissions (convex/permissions.ts)

  Note: Helper module (bukan exported Convex functions)
  ┌──────────────┬─────────────────────────┬──────────────────────────┐
  │   Function   │         Purpose         │        Parameters        │
  ├──────────────┼─────────────────────────┼──────────────────────────┤
  │ hasRole      │ Check if user has role  │ db, userId, requiredRole │
  ├──────────────┼─────────────────────────┼──────────────────────────┤
  │ requireRole  │ Throw if no permission  │ db, userId, requiredRole │
  ├──────────────┼─────────────────────────┼──────────────────────────┤
  │ isSuperAdmin │ Check if superadmin     │ db, userId               │
  ├──────────────┼─────────────────────────┼──────────────────────────┤
  │ isAdmin      │ Check if at least admin │ db, userId               │
  └──────────────┴─────────────────────────┴──────────────────────────┘
  ---
  4. CONVEX MIGRATIONS (convex/migrations/)
  ┌────────────────────────────────────┬────────────────────────────────────────┐
  │             Migration              │                Purpose                 │
  ├────────────────────────────────────┼────────────────────────────────────────┤
  │ seedDefaultSystemPrompt            │ Seed default system prompt             │
  ├────────────────────────────────────┼────────────────────────────────────────┤
  │ seedDefaultAIConfig                │ Seed default AI provider config        │
  ├────────────────────────────────────┼────────────────────────────────────────┤
  │ seedDefaultStyleConstitution       │ Seed default style constitution        │
  ├────────────────────────────────────┼────────────────────────────────────────┤
  │ addRoleToExistingUsers             │ Add role field to existing users       │
  ├────────────────────────────────────┼────────────────────────────────────────┤
  │ updatePromptWithPaperWorkflow      │ Update prompt with paper workflow      │
  ├────────────────────────────────────┼────────────────────────────────────────┤
  │ updatePromptWithArtifactGuidelines │ Update prompt with artifact guidelines │
  ├────────────────────────────────────┼────────────────────────────────────────┤
  │ updatePromptWithArtifactSources    │ Update prompt with artifact sources    │
  ├────────────────────────────────────┼────────────────────────────────────────┤
  │ updateAIConfigForToolCalling       │ Update AI config for tool calling      │
  ├────────────────────────────────────┼────────────────────────────────────────┤
  │ updateToGPT4oForToolCalling        │ Update to GPT-4o for tool calling      │
  ├────────────────────────────────────┼────────────────────────────────────────┤
  │ removeOldPaperWorkflowSection      │ Remove old paper workflow section      │
  ├────────────────────────────────────┼────────────────────────────────────────┤
  │ fix14TahapReference                │ Fix 14 tahap reference (should be 13)  │
  ├────────────────────────────────────┼────────────────────────────────────────┤
  │ fixAgentPersonaAndCapabilities     │ Fix agent persona and capabilities     │
  └────────────────────────────────────┴────────────────────────────────────────┘
  ---
  5. HELPER FUNCTIONS & UTILITIES

  5.1 AI Streaming (src/lib/ai/streaming.ts)
  ┌─────────────────────┬──────────────────────────────────────────────┐
  │      Function       │                   Purpose                    │
  ├─────────────────────┼──────────────────────────────────────────────┤
  │ streamChatResponse  │ Stream chat response with AI SDK             │
  ├─────────────────────┼──────────────────────────────────────────────┤
  │ getGatewayModel     │ Get Vercel AI Gateway model instance         │
  ├─────────────────────┼──────────────────────────────────────────────┤
  │ getOpenRouterModel  │ Get OpenRouter model instance (fallback)     │
  ├─────────────────────┼──────────────────────────────────────────────┤
  │ getProviderSettings │ Get temperature, topP, maxTokens from config │
  ├─────────────────────┼──────────────────────────────────────────────┤
  │ getModelNames       │ Get primary & fallback model names           │
  ├─────────────────────┼──────────────────────────────────────────────┤
  │ getGoogleSearchTool │ Get Google Search tool instance              │
  └─────────────────────┴──────────────────────────────────────────────┘
  5.2 AI Config (src/lib/ai/chat-config.ts)
  ┌──────────────────────────┬────────────────────────────────────────┐
  │         Function         │                Purpose                 │
  ├──────────────────────────┼────────────────────────────────────────┤
  │ getSystemPrompt          │ Get active system prompt with fallback │
  ├──────────────────────────┼────────────────────────────────────────┤
  │ getMinimalFallbackPrompt │ Get minimal fallback prompt            │
  └──────────────────────────┴────────────────────────────────────────┘
  5.3 Config Cache (src/lib/ai/config-cache.ts)
  ┌─────────────┬────────────────────────────────────────┐
  │   Export    │                Purpose                 │
  ├─────────────┼────────────────────────────────────────┤
  │ configCache │ Singleton cache for AI provider config │
  └─────────────┴────────────────────────────────────────┘
  5.4 Title Generator (src/lib/ai/title-generator.ts)
  ┌───────────────┬───────────────────────────────────────────┐
  │   Function    │                  Purpose                  │
  ├───────────────┼───────────────────────────────────────────┤
  │ generateTitle │ Generate conversation title from messages │
  └───────────────┴───────────────────────────────────────────┘
  5.5 Paper Intent Detector (src/lib/ai/paper-intent-detector.ts)
  ┌───────────────────────┬─────────────────────────────────────────────┐
  │       Function        │                   Purpose                   │
  ├───────────────────────┼─────────────────────────────────────────────┤
  │ detectPaperIntent     │ Detect paper writing intent (detailed)      │
  ├───────────────────────┼─────────────────────────────────────────────┤
  │ hasPaperWritingIntent │ Check if message has paper intent (boolean) │
  └───────────────────────┴─────────────────────────────────────────────┘
  5.6 Paper Mode Prompt (src/lib/ai/paper-mode-prompt.ts)
  ┌──────────────────────────┬────────────────────────────────────────────┐
  │         Function         │                  Purpose                   │
  ├──────────────────────────┼────────────────────────────────────────────┤
  │ getPaperModeSystemPrompt │ Get system prompt injection for paper mode │
  └──────────────────────────┴────────────────────────────────────────────┘
  5.7 Paper Stage Instructions (src/lib/ai/paper-stages/)
  ┌────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │        File        │                                                 Exports                                                  │
  ├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ foundation.ts      │ GAGASAN_INSTRUCTIONS, TOPIK_INSTRUCTIONS                                                                 │
  ├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ core.ts            │ ABSTRAK_INSTRUCTIONS, PENDAHULUAN_INSTRUCTIONS, TINJAUAN_LITERATUR_INSTRUCTIONS, METODOLOGI_INSTRUCTIONS │
  ├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ results.ts         │ HASIL_INSTRUCTIONS, DISKUSI_INSTRUCTIONS, KESIMPULAN_INSTRUCTIONS                                        │
  ├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ finalization.ts    │ DAFTAR_PUSTAKA_INSTRUCTIONS, LAMPIRAN_INSTRUCTIONS, JUDUL_INSTRUCTIONS, OUTLINE_INSTRUCTIONS             │
  ├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ index.ts           │ getStageInstructions                                                                                     │
  ├────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ formatStageData.ts │ formatStageData                                                                                          │
  └────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
  5.8 Paper Workflow Reminder (src/lib/ai/paper-workflow-reminder.ts)
  ┌───────────────────────────────┬─────────────────────────────────────┐
  │            Export             │               Purpose               │
  ├───────────────────────────────┼─────────────────────────────────────┤
  │ PAPER_WORKFLOW_REMINDER       │ Full paper workflow reminder prompt │
  ├───────────────────────────────┼─────────────────────────────────────┤
  │ PAPER_WORKFLOW_REMINDER_SHORT │ Short version                       │
  └───────────────────────────────┴─────────────────────────────────────┘
  5.9 Citations (src/lib/citations/)
  ┌─────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────┐
  │    File     │                                             Functions                                             │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ apaWeb.ts   │ normalizeWebSearchUrl, deriveSiteNameFromUrl, getApaWebReferenceParts, getWebCitationDisplayParts │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ webTitle.ts │ fetchWebPageMetadata, fetchWebPageTitle, enrichSourcesWithFetchedTitles                           │
  └─────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────┘
  5.10 Refrasa (src/lib/refrasa/)
  ┌─────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │        File         │                                                             Functions/Exports                                                              │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ prompt-builder.ts   │ buildRefrasaPrompt, buildRefrasaPromptLayer1Only                                                                                           │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ schemas.ts          │ RefrasaIssueTypeSchema, RefrasaIssueCategorySchema, RefrasaIssueSeveritySchema, RefrasaIssueSchema, RefrasaOutputSchema, RequestBodySchema │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ loading-messages.ts │ LOADING_MESSAGES, LOADING_ROTATION_INTERVAL, getRandomLoadingMessage, getLoadingMessageByIndex                                             │
  └─────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
  5.11 File Extraction (src/lib/file-extraction/)
  ┌───────────────────┬────────────────────────────────────────────┐
  │       File        │                  Purpose                   │
  ├───────────────────┼────────────────────────────────────────────┤
  │ txt-extractor.ts  │ Extract text from TXT files                │
  ├───────────────────┼────────────────────────────────────────────┤
  │ pdf-extractor.ts  │ Extract text from PDF files                │
  ├───────────────────┼────────────────────────────────────────────┤
  │ docx-extractor.ts │ Extract text from DOCX files               │
  ├───────────────────┼────────────────────────────────────────────┤
  │ xlsx-extractor.ts │ Extract data from XLSX files               │
  ├───────────────────┼────────────────────────────────────────────┤
  │ image-ocr.ts      │ Extract text from images via OpenAI Vision │
  └───────────────────┴────────────────────────────────────────────┘
  5.12 Document Export (src/lib/export/)
  ┌─────────────────────┬────────────────────────────────────────┐
  │        File         │                Purpose                 │
  ├─────────────────────┼────────────────────────────────────────┤
  │ word-builder.ts     │ Build Word document from paper session │
  ├─────────────────────┼────────────────────────────────────────┤
  │ pdf-builder.ts      │ Build PDF from paper session           │
  ├─────────────────────┼────────────────────────────────────────┤
  │ content-compiler.ts │ Compile paper content for export       │
  ├─────────────────────┼────────────────────────────────────────┤
  │ validation.ts       │ Validate paper session for export      │
  └─────────────────────┴────────────────────────────────────────┘
  5.13 React Hooks (src/lib/hooks/)
  ┌──────────────────┬─────────────────────────────────────────┐
  │       Hook       │                 Purpose                 │
  ├──────────────────┼─────────────────────────────────────────┤
  │ useCurrentUser   │ Get current user with loading state     │
  ├──────────────────┼─────────────────────────────────────────┤
  │ usePermissions   │ Get user permissions                    │
  ├──────────────────┼─────────────────────────────────────────┤
  │ useMessages      │ Get messages for conversation           │
  ├──────────────────┼─────────────────────────────────────────┤
  │ useConversations │ Get user's conversations                │
  ├──────────────────┼─────────────────────────────────────────┤
  │ usePaperSession  │ Get paper session with rewind functions │
  ├──────────────────┼─────────────────────────────────────────┤
  │ useRefrasa       │ Text analysis with refrasa API          │
  └──────────────────┴─────────────────────────────────────────┘
  ---
  6. EXTERNAL SERVICE INTEGRATIONS

  6.1 AI Providers
  ┌──────────────────────┬─────────────────────────────────┬──────────────────────────┐
  │       Provider       │               SDK               │         Purpose          │
  ├──────────────────────┼─────────────────────────────────┼──────────────────────────┤
  │ Vercel AI Gateway    │ @ai-sdk/gateway                 │ Primary AI provider      │
  ├──────────────────────┼─────────────────────────────────┼──────────────────────────┤
  │ OpenRouter           │ @ai-sdk/openai (custom baseURL) │ Fallback AI provider     │
  ├──────────────────────┼─────────────────────────────────┼──────────────────────────┤
  │ Google Generative AI │ @ai-sdk/google                  │ Google Search tool       │
  ├──────────────────────┼─────────────────────────────────┼──────────────────────────┤
  │ OpenAI               │ openai                          │ Image OCR via Vision API │
  └──────────────────────┴─────────────────────────────────┴──────────────────────────┘
  6.2 Auth & Email
  ┌─────────┬──────────────────────────────────┐
  │ Service │             Purpose              │
  ├─────────┼──────────────────────────────────┤
  │ Clerk   │ Authentication & user management │
  ├─────────┼──────────────────────────────────┤
  │ Resend  │ Email sending (welcome emails)   │
  └─────────┴──────────────────────────────────┘
  ---
  RINGKASAN STATISTIK
  ┌───────────────────────┬───────┐
  │       Kategori        │ Count │
  ├───────────────────────┼───────┤
  │ AI Function Tools     │ 7     │
  ├───────────────────────┼───────┤
  │ API Routes            │ 8     │
  ├───────────────────────┼───────┤
  │ Convex Queries        │ 25    │
  ├───────────────────────┼───────┤
  │ Convex Mutations      │ 42    │
  ├───────────────────────┼───────┤
  │ Convex Migrations     │ 12    │
  ├───────────────────────┼───────┤
  │ Helper Functions      │ 45+   │
  ├───────────────────────┼───────┤
  │ React Hooks           │ 6     │
  ├───────────────────────┼───────┤
  │ External Integrations │ 6     │
  └───────────────────────┴───────┘
  Total: 150+ tools/functions/endpoints

  ---

⏺ ★ Insight ─────────────────────────────────────
  Codebase ini punya pattern menarik yang jarang ditemukan:
  1. AUTO-STAGE Pattern di updateStageData - Stage otomatis diambil dari session, mencegah AI error specify stage yang salah
  2. Dual-provider fallback - Gateway → OpenRouter dengan automatic failover
  3. Router-based tool switching - Request pertama decide apakah pakai google_search atau function tools