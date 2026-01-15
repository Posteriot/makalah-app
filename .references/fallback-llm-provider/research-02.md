Model-Agnostic Fallback Compatibility Analysis

  Perspektif yang Benar

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                    FALLBACK PROVIDER ARCHITECTURE                            │
  │                                                                             │
  │   Provider: OpenRouter (FIXED)                                              │
  │   Model: ANY model dari OpenRouter yang support tool calling                │
  │                                                                             │
  │   Verification: Model harus di-test sebelum digunakan                       │
  └─────────────────────────────────────────────────────────────────────────────┘

  AI SDK Features yang Digunakan di Codebase
  ┌──────────────────┬───────────────────────────────────────┬───────────────────┬───────────────────────────┐
  │     Feature      │                 File                  │      Purpose      │     Model Requirement     │
  ├──────────────────┼───────────────────────────────────────┼───────────────────┼───────────────────────────┤
  │ streamText()     │ chat/route.ts                         │ Chat streaming    │ Basic LLM                 │
  ├──────────────────┼───────────────────────────────────────┼───────────────────┼───────────────────────────┤
  │ generateText()   │ title-generator.ts, validate-provider │ Text generation   │ Basic LLM                 │
  ├──────────────────┼───────────────────────────────────────┼───────────────────┼───────────────────────────┤
  │ generateObject() │ refrasa/route.ts                      │ Structured output │ Structured Output Support │
  ├──────────────────┼───────────────────────────────────────┼───────────────────┼───────────────────────────┤
  │ tool()           │ chat/route.ts, paper-tools.ts         │ Function calling  │ Tool Calling Support      │
  └──────────────────┴───────────────────────────────────────┴───────────────────┴───────────────────────────┘
  OpenRouter Model Requirements

  Untuk bisa jadi fallback model, model di OpenRouter HARUS memiliki supported_parameters yang mencakup:

  // MINIMUM REQUIREMENTS untuk fallback model
  const REQUIRED_PARAMETERS = [
    "tools",              // Function calling (WAJIB)
    "tool_choice",        // Tool selection control (WAJIB)
  ]

  // RECOMMENDED untuk full compatibility
  const RECOMMENDED_PARAMETERS = [
    "tools",
    "tool_choice",
    "structured_outputs", // Untuk generateObject (Refrasa)
  ]

  Cara Cek Model Compatibility di OpenRouter

  URL Filter: https://openrouter.ai/models?supported_parameters=tools

  Dari dokumentasi OpenRouter:
  "You can find models that support tool calling by filtering on openrouter.ai/models?supported_parameters=tools"

  Codebase Tool Definitions Analysis

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOLS YANG HARUS DIDUKUNG OLEH FALLBACK MODEL
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. createArtifact - Zod schema dengan nested objects
  tool({
    inputSchema: z.object({
      type: z.enum(["code", "outline", "section", "table", "citation", "formula"]),
      title: z.string().max(200),
      content: z.string().min(10),
      format: z.enum([...]).optional(),
      description: z.string().optional(),
    })
  })

  // 2. updateArtifact - Zod schema
  tool({
    inputSchema: z.object({
      artifactId: z.string(),
      content: z.string().min(10),
      description: z.string().optional(),
    })
  })

  // 3. renameConversationTitle - Simple schema
  tool({
    inputSchema: z.object({
      title: z.string().min(3).max(50),
    })
  })

  // 4. Paper Tools - Complex nested schemas
  tool({
    inputSchema: z.object({
      ringkasan: z.string().max(280),
      data: z.record(z.string(), z.any()).optional(), // COMPLEX: record type
    })
  })

  // 5. Refrasa - generateObject dengan complex schema
  RefrasaOutputSchema = z.object({
    issues: z.array(z.object({
      type: z.enum([...]),
      category: z.enum([...]),
      message: z.string(),
      severity: z.enum([...]),
      suggestion: z.string().optional(),
    })),
    refrasedText: z.string(),
  })

  Model Compatibility Checklist

  Sebelum menggunakan model X sebagai fallback, verifikasi:

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                    MODEL COMPATIBILITY CHECKLIST                             │
  │                                                                             │
  │ ☐ 1. Model ada di OpenRouter models listing                                 │
  │                                                                             │
  │ ☐ 2. Model support "tools" parameter                                        │
  │      → Check: openrouter.ai/models?supported_parameters=tools               │
  │                                                                             │
  │ ☐ 3. Model support "tool_choice" parameter                                  │
  │      → Needed for: tool selection control                                   │
  │                                                                             │
  │ ☐ 4. Model support complex Zod schemas                                      │
  │      → Test dengan: nested objects, enums, arrays, optional fields          │
  │                                                                             │
  │ ☐ 5. Model support generateObject() / structured output                     │
  │      → Needed for: Refrasa feature                                          │
  │      → Check: openrouter.ai/models?supported_parameters=structured_outputs  │
  │                                                                             │
  │ ☐ 6. Test dengan validate-provider endpoint                                 │
  │      → POST /api/admin/validate-provider                                    │
  │                                                                             │
  │ ☐ 7. E2E test: Chat dengan artifact creation                                │
  │                                                                             │
  │ ☐ 8. E2E test: Paper workflow (complex tools)                               │
  │                                                                             │
  │ ☐ 9. E2E test: Refrasa (generateObject)                                     │
  │                                                                             │
  └─────────────────────────────────────────────────────────────────────────────┘

  Known Model Categories di OpenRouter

  Berdasarkan research, model yang BIASANYA support tool calling:
  ┌───────────┬──────────────────────────────────┬──────────────┬───────────────────┐
  │ Provider  │              Models              │ Tool Calling │ Structured Output │
  ├───────────┼──────────────────────────────────┼──────────────┼───────────────────┤
  │ OpenAI    │ gpt-4o, gpt-4o-mini, gpt-4-turbo │ ✅ Excellent │ ✅ Native         │
  ├───────────┼──────────────────────────────────┼──────────────┼───────────────────┤
  │ Anthropic │ claude-3.5-sonnet, claude-3-opus │ ✅ Good      │ ✅ Via JSON mode  │
  ├───────────┼──────────────────────────────────┼──────────────┼───────────────────┤
  │ Google    │ gemini-2.0-flash, gemini-1.5-pro │ ✅ Good      │ ✅ Native         │
  ├───────────┼──────────────────────────────────┼──────────────┼───────────────────┤
  │ Meta      │ llama-3.1-70b, llama-3.1-405b    │ ⚠️ Varies    │ ⚠️ Varies         │
  ├───────────┼──────────────────────────────────┼──────────────┼───────────────────┤
  │ Mistral   │ mistral-large, mixtral           │ ⚠️ Varies    │ ⚠️ Varies         │
  └───────────┴──────────────────────────────────┴──────────────┴───────────────────┘
  ⚠️ PENTING: Tabel di atas hanya referensi umum. SELALU verifikasi langsung di OpenRouter karena support bisa berubah.

  Verification Protocol

  // Proposed: Add verification function
  async function verifyModelCompatibility(model: string): Promise<{
    compatible: boolean
    issues: string[]
  }> {
    const issues: string[] = []

    // Test 1: Basic generation
    try {
      await generateText({ model, prompt: "Say OK" })
    } catch (e) {
      issues.push("Basic generation failed")
    }

    // Test 2: Tool calling
    try {
      await generateText({
        model,
        prompt: "Create a test artifact",
        tools: { testTool: tool({ inputSchema: z.object({ name: z.string() }), execute: async () => ({}) }) }
      })
    } catch (e) {
      issues.push("Tool calling failed")
    }

    // Test 3: Structured output
    try {
      await generateObject({
        model,
        schema: z.object({ test: z.string() }),
        prompt: "Return test data"
      })
    } catch (e) {
      issues.push("Structured output failed")
    }

    return {
      compatible: issues.length === 0,
      issues
    }
  }

  Gap Analysis: Current vs Required
  ┌───────────────────┬────────────────────────┬──────────────────────────┐
  │      Aspect       │     Current State      │         Required         │
  ├───────────────────┼────────────────────────┼──────────────────────────┤
  │ Model flexibility │ Hardcoded di migration │ Configurable via Admin   │
  ├───────────────────┼────────────────────────┼──────────────────────────┤
  │ Verification      │ Manual testing         │ Automated verification   │
  ├───────────────────┼────────────────────────┼──────────────────────────┤
  │ Documentation     │ Model-specific         │ Model-agnostic checklist │
  ├───────────────────┼────────────────────────┼──────────────────────────┤
  │ Fallback testing  │ Ad-hoc                 │ Systematic protocol      │
  └───────────────────┴────────────────────────┴──────────────────────────┘
  ---
  Sources:
  - https://openrouter.ai/docs/guides/features/tool-calling
  - https://openrouter.ai/models?supported_parameters=tools
  - https://openrouter.ai/docs/api/reference/parameters
  - https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling

  ---
  ★ Insight ─────────────────────────────────────
  Key Takeaways:
  1. OpenRouter adalah aggregator - model yang tersedia dan kapabilitasnya bisa berubah
  2. supported_parameters adalah kunci - filter ?supported_parameters=tools di OpenRouter listing
  3. Verification wajib per-model - jangan assume, harus test
  4. Refrasa butuh structured output - ini requirement tambahan di luar tool calling