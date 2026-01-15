Arsitektur Solusi

  1. Fallback Prompt (Minimal tapi Fungsional)

  export function getMinimalFallbackPrompt(): string {
      return `[⚠️ MODE FALLBACK - System Prompt Utama Tidak Aktif]

  Anda adalah MOKA, asisten AI Makalah App dalam MODE TERBATAS.

  INFORMASI PENTING:
  System prompt utama dari database tidak tersedia. Anda beroperasi dengan instruksi dasar.
  Informasikan user bahwa sistem sedang dalam mode terbatas jika relevan.

  KEMAMPUAN YANG TETAP TERSEDIA:
  1. **Paper Writing Workflow** (13 tahap: gagasan → judul)
     - Tools: startPaperSession, updateStageData, submitStageForValidation
  2. **Web Search** (google_search) - untuk referensi dan literatur
  3. **Artifact Creation** (createArtifact) - untuk output konten
  4. **File Reading** - membaca file yang diupload user

  ATURAN TOOL:
  - google_search dan paper tools TIDAK bisa dipakai bersamaan dalam satu request
  - Artifact bisa dibuat kapan saja

  CATATAN UNTUK USER:
  "Maaf, sistem sedang dalam mode terbatas. Fitur dasar tetap tersedia, 
  namun beberapa instruksi detail mungkin tidak optimal. 
  Silakan hubungi administrator jika masalah berlanjut."

  Bantu user sebaik mungkin dengan kemampuan yang ada.`
  }

  Kenapa ini?
  - Agent tetap fungsional (tahu tools, workflow)
  - Agent sadar sedang fallback mode
  - User diinformasikan ada limitasi
  - Tidak duplikasi full prompt content

  ---
  2. Logging Mechanism (Convex)

  New Table: systemAlerts

  // convex/schema.ts
  systemAlerts: defineTable({
    alertType: v.string(),        // "fallback_activated", "prompt_missing", etc.
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    message: v.string(),
    source: v.string(),           // "chat-api", "admin-panel", etc.
    resolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
    metadata: v.optional(v.any()), // Additional context
    createdAt: v.number(),
  })
    .index("by_type", ["alertType", "createdAt"])
    .index("by_severity", ["severity", "resolved", "createdAt"])
    .index("by_resolved", ["resolved", "createdAt"])

  New Mutations:

  // convex/systemAlerts.ts
  export const createAlert = mutation({...})
  export const resolveAlert = mutation({...})
  export const getUnresolvedAlerts = query({...})
  export const getRecentAlerts = query({...})

  ---
  3. Chat API Integration

  // src/lib/ai/chat-config.ts
  export async function getSystemPrompt(): Promise<string> {
      try {
          const activePrompt = await fetchQuery(api.systemPrompts.getActiveSystemPrompt)

          if (activePrompt?.content) {
              return activePrompt.content
          }

          // No active prompt - log alert and use fallback
          await logFallbackActivation("no_active_prompt")
          return getMinimalFallbackPrompt()
      } catch (error) {
          // Database error - log alert and use fallback
          await logFallbackActivation("database_error", error)
          return getMinimalFallbackPrompt()
      }
  }

  async function logFallbackActivation(reason: string, error?: unknown) {
      try {
          await fetchMutation(api.systemAlerts.createAlert, {
              alertType: "fallback_activated",
              severity: "critical",
              message: `System prompt fallback activated: ${reason}`,
              source: "chat-api",
              metadata: { reason, error: error?.toString() }
          })
      } catch {
          // If even logging fails, at least console.error
          console.error("[CRITICAL] Fallback activated AND failed to log:", reason)
      }
  }

  ---
  4. Admin Panel UI

  Lokasi: /dashboard/admin → Tab baru "System Health"

  ┌─────────────────────────────────────────────────────────┐
  │ System Health                                            │
  ├─────────────────────────────────────────────────────────┤
  │                                                          │
  │  ┌─────────────────────────────────────────────────┐    │
  │  │ 🟢 System Prompt Status: ACTIVE                 │    │
  │  │    Name: Default Academic Assistant             │    │
  │  │    Version: 8                                   │    │
  │  │    Last Updated: 2026-01-08 15:30               │    │
  │  └─────────────────────────────────────────────────┘    │
  │                                                          │
  │  ┌─────────────────────────────────────────────────┐    │
  │  │ ⚠️ Recent Alerts (0 unresolved)                 │    │
  │  │                                                 │    │
  │  │ No alerts - system operating normally           │    │
  │  └─────────────────────────────────────────────────┘    │
  │                                                          │
  └─────────────────────────────────────────────────────────┘

  Saat Fallback Aktif:

  ┌─────────────────────────────────────────────────────────┐
  │ System Health                                            │
  ├─────────────────────────────────────────────────────────┤
  │                                                          │
  │  ┌─────────────────────────────────────────────────┐    │
  │  │ 🔴 System Prompt Status: FALLBACK MODE          │    │
  │  │    ⚠️ Main prompt not loading - check database  │    │
  │  │    Fallback activated: 2026-01-08 15:45         │    │
  │  └─────────────────────────────────────────────────┘    │
  │                                                          │
  │  ┌─────────────────────────────────────────────────┐    │
  │  │ 🔴 Recent Alerts (1 unresolved)                 │    │
  │  │                                                 │    │
  │  │ [CRITICAL] Fallback activated: database_error   │    │
  │  │ Source: chat-api | 5 minutes ago                │    │
  │  │ [Mark Resolved]                                 │    │
  │  └─────────────────────────────────────────────────┘    │
  │                                                          │
  └─────────────────────────────────────────────────────────┘

  ---
  5. Alamat Masalah Redundansi

  Current State:
  chat-config.ts          → getHardcodedSystemPrompt() [FULL CONTENT]
  seedDefaultSystemPrompt.ts → DEFAULT_PROMPT_CONTENT  [FULL CONTENT - DUPLICATE]

  Proposed State:
  chat-config.ts          → getMinimalFallbackPrompt() [MINIMAL - fallback only]
  seedDefaultSystemPrompt.ts → [HAPUS atau MINIMAL]

  Strategi Seed:
  - Seed migration sudah dijalankan (database sudah punya prompt)
  - Tidak perlu maintain seed content lagi
  - Bisa hapus atau ganti dengan instruksi "configure via admin panel"

  ---
  Flow Diagram

  User sends message
         │
         ▼
  ┌─────────────────┐
  │ getSystemPrompt │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────────────┐
  │ fetchQuery(database)    │
  └────────┬────────────────┘
           │
      ┌────┴────┐
      │         │
   SUCCESS    FAIL
      │         │
      ▼         ▼
  ┌────────┐ ┌──────────────────┐
  │ Return │ │ Log to           │
  │ DB     │ │ systemAlerts     │
  │ Prompt │ │ (severity:critical)
  └────────┘ └────────┬─────────┘
                      │
                      ▼
             ┌────────────────┐
             │ Return Minimal │
             │ Fallback       │
             └────────────────┘
                      │
                      ▼
             Admin Panel shows 🔴
             "FALLBACK MODE"