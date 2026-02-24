"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  NavArrowLeft,
  CheckCircle,
  XmarkCircle,
  WarningTriangle,
  Shield,
  ShieldCheck,
  ShieldXmark,
} from "iconoir-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Id } from "@convex/_generated/dataModel"
import { useGatewayModels } from "@/lib/hooks/useGatewayModels"
import { DottedPattern } from "@/components/marketing/SectionBackground"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROVIDER_OPTIONS = [
  { value: "vercel-gateway", label: "Vercel AI Gateway" },
  { value: "openrouter", label: "OpenRouter" },
]

const MIN_THINKING_BUDGET = 0
const MAX_THINKING_BUDGET = 32768
const DEFAULT_THINKING_BUDGET_PRIMARY = 256
const DEFAULT_THINKING_BUDGET_FALLBACK = 128

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AIProviderConfig {
  _id: Id<"aiProviderConfigs">
  name: string
  description?: string
  primaryProvider: string
  primaryModel: string
  fallbackProvider: string
  fallbackModel: string
  gatewayApiKey?: string
  openrouterApiKey?: string
  temperature: number
  topP?: number
  maxTokens?: number
  reasoningEnabled?: boolean
  thinkingBudgetPrimary?: number
  thinkingBudgetFallback?: number
  reasoningTraceMode?: "off" | "curated"
  primaryContextWindow?: number
  fallbackContextWindow?: number
  primaryWebSearchEnabled?: boolean
  fallbackWebSearchEnabled?: boolean
  fallbackWebSearchEngine?: string
  fallbackWebSearchMaxResults?: number
  version: number
}

interface CompatibilityResult {
  test: string
  passed: boolean
  duration: number
  error?: string
  details?: string
}

interface CompatibilityVerificationResult {
  success: boolean
  model: string
  compatibility: {
    full: boolean
    minimal: boolean
    level: "full" | "partial" | "incompatible"
  }
  results: CompatibilityResult[]
  supportedFeatures: {
    chat: boolean
    simpleTool: boolean
    complexTool: boolean
    structuredOutput: boolean
  }
  featureSupport: Record<string, boolean>
  recommendation: string
  totalDuration: number
}

interface AIProviderConfigEditorProps {
  userId: Id<"users">
  /** undefined = create mode, defined = edit mode */
  config?: AIProviderConfig
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIProviderConfigEditor({
  userId,
  config,
}: AIProviderConfigEditorProps) {
  const router = useRouter()
  const isEditing = !!config

  // Dynamic model lists from Gateway API
  const { gatewayModels, openrouterModels, isLoading: modelsLoading } = useGatewayModels()

  const getModelsForProvider = useCallback((provider: string) => {
    if (provider === "vercel-gateway") {
      return gatewayModels
    }
    return openrouterModels
  }, [gatewayModels, openrouterModels])

  // Form state
  const [name, setName] = useState(config?.name ?? "")
  const [description, setDescription] = useState(config?.description ?? "")

  // Primary provider
  const [primaryProvider, setPrimaryProvider] = useState(config?.primaryProvider ?? "vercel-gateway")
  const [primaryModel, setPrimaryModel] = useState(config?.primaryModel ?? "gemini-2.5-flash")
  const [primaryModelPreset, setPrimaryModelPreset] = useState(config?.primaryModel ?? "gemini-2.5-flash")

  // Fallback provider
  const [fallbackProvider, setFallbackProvider] = useState(config?.fallbackProvider ?? "openrouter")
  const [fallbackModel, setFallbackModel] = useState(config?.fallbackModel ?? "openai/gpt-5.1")
  const [fallbackModelPreset, setFallbackModelPreset] = useState(config?.fallbackModel ?? "openai/gpt-5.1")
  const [gatewayApiKey, setGatewayApiKey] = useState("")
  const [openrouterApiKey, setOpenrouterApiKey] = useState("")
  const [gatewayUseEnvKey, setGatewayUseEnvKey] = useState(false)
  const [openrouterUseEnvKey, setOpenrouterUseEnvKey] = useState(false)

  // AI settings
  const [temperature, setTemperature] = useState(config?.temperature ?? 0.7)
  const [topP, setTopP] = useState<number | undefined>(config?.topP)
  const [maxTokens, setMaxTokens] = useState<number | undefined>(config?.maxTokens)
  const [reasoningEnabled, setReasoningEnabled] = useState(config?.reasoningEnabled ?? true)
  const [thinkingBudgetPrimary, setThinkingBudgetPrimary] = useState<number | undefined>(
    config?.thinkingBudgetPrimary ?? DEFAULT_THINKING_BUDGET_PRIMARY
  )
  const [thinkingBudgetFallback, setThinkingBudgetFallback] = useState<number | undefined>(
    config?.thinkingBudgetFallback ?? DEFAULT_THINKING_BUDGET_FALLBACK
  )
  const [reasoningTraceMode, setReasoningTraceMode] = useState<"off" | "curated">(
    config?.reasoningTraceMode ?? "curated"
  )

  // Context window settings
  const [primaryContextWindow, setPrimaryContextWindow] = useState<number | undefined>(config?.primaryContextWindow)
  const [fallbackContextWindow, setFallbackContextWindow] = useState<number | undefined>(config?.fallbackContextWindow)

  // Web search settings
  const [primaryWebSearchEnabled, setPrimaryWebSearchEnabled] = useState(config?.primaryWebSearchEnabled ?? true)
  const [fallbackWebSearchEnabled, setFallbackWebSearchEnabled] = useState(config?.fallbackWebSearchEnabled ?? true)
  const [fallbackWebSearchEngine, setFallbackWebSearchEngine] = useState(config?.fallbackWebSearchEngine ?? "auto")
  const [fallbackWebSearchMaxResults, setFallbackWebSearchMaxResults] = useState(config?.fallbackWebSearchMaxResults ?? 5)

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [isTestingPrimary, setIsTestingPrimary] = useState(false)
  const [isTestingFallback, setIsTestingFallback] = useState(false)
  const [primaryValidation, setPrimaryValidation] = useState<"idle" | "success" | "error">("idle")
  const [fallbackValidation, setFallbackValidation] = useState<"idle" | "success" | "error">("idle")

  // Compatibility verification state
  const [isVerifyingCompatibility, setIsVerifyingCompatibility] = useState(false)
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityVerificationResult | null>(null)

  const createMutation = useMutation(api.aiProviderConfigs.createConfig)
  const updateMutation = useMutation(api.aiProviderConfigs.updateConfig)

  const backUrl = "/dashboard?tab=providers"

  // Sync model presets with gateway models once loaded
  useEffect(() => {
    if (config && !modelsLoading) {
      const primaryModels = getModelsForProvider(config.primaryProvider)
      setPrimaryModelPreset(
        primaryModels.find((p) => p.value === config.primaryModel) ? config.primaryModel : "custom"
      )
      const fallbackModels = getModelsForProvider(config.fallbackProvider)
      setFallbackModelPreset(
        fallbackModels.find((p) => p.value === config.fallbackModel) ? config.fallbackModel : "custom"
      )
    }
  }, [config, modelsLoading, getModelsForProvider])

  // ---- Handlers ------------------------------------------------------------

  function handleBack() {
    router.push(backUrl)
  }

  const handlePrimaryProviderChange = (provider: string) => {
    setPrimaryProvider(provider)
    const models = getModelsForProvider(provider)
    const defaultModel = models[0]?.value ?? ""
    setPrimaryModel(defaultModel)
    setPrimaryModelPreset(defaultModel)
    setPrimaryValidation("idle")
  }

  const handleFallbackProviderChange = (provider: string) => {
    setFallbackProvider(provider)
    const models = getModelsForProvider(provider)
    const defaultModel = models[0]?.value ?? ""
    setFallbackModel(defaultModel)
    setFallbackModelPreset(defaultModel)
    setFallbackValidation("idle")
    setCompatibilityResult(null)
  }

  const handlePrimaryModelPresetChange = (value: string) => {
    setPrimaryModelPreset(value)
    if (value !== "custom") {
      setPrimaryModel(value)
      const models = getModelsForProvider(primaryProvider)
      const selected = models.find((m) => m.value === value)
      if (selected && selected.context > 0) {
        setPrimaryContextWindow(selected.context)
      }
    }
  }

  const handleFallbackModelPresetChange = (value: string) => {
    setFallbackModelPreset(value)
    if (value !== "custom") {
      setFallbackModel(value)
      const models = getModelsForProvider(fallbackProvider)
      const selected = models.find((m) => m.value === value)
      if (selected && selected.context > 0) {
        setFallbackContextWindow(selected.context)
      }
    }
    setCompatibilityResult(null)
  }

  const handleGatewayUseEnvChange = (value: boolean) => {
    setGatewayUseEnvKey(value)
    if (value) {
      setGatewayApiKey("")
    }
  }

  const handleOpenRouterUseEnvChange = (value: boolean) => {
    setOpenrouterUseEnvKey(value)
    if (value) {
      setOpenrouterApiKey("")
    }
  }

  const getApiKeyForProvider = (provider: string) => {
    if (provider === "vercel-gateway") return gatewayApiKey
    if (provider === "openrouter") return openrouterApiKey
    return ""
  }

  const handleTestPrimary = async () => {
    if (!primaryProvider || !primaryModel) {
      toast.error("Lengkapi semua field primary provider terlebih dahulu")
      return
    }

    const apiKey = getApiKeyForProvider(primaryProvider)
    setIsTestingPrimary(true)
    setPrimaryValidation("idle")

    try {
      const response = await fetch("/api/admin/validate-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: primaryProvider,
          model: primaryModel,
          apiKey,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setPrimaryValidation("success")
        toast.success("Primary provider berhasil divalidasi!")
      } else {
        setPrimaryValidation("error")
        toast.error(result.error || "Validasi gagal")
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setPrimaryValidation("error")
      toast.error(error.message || "Terjadi kesalahan saat validasi")
    } finally {
      setIsTestingPrimary(false)
    }
  }

  const handleTestFallback = async () => {
    if (!fallbackProvider || !fallbackModel) {
      toast.error("Lengkapi semua field fallback provider terlebih dahulu")
      return
    }

    const apiKey = getApiKeyForProvider(fallbackProvider)
    setIsTestingFallback(true)
    setFallbackValidation("idle")

    try {
      const response = await fetch("/api/admin/validate-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: fallbackProvider,
          model: fallbackModel,
          apiKey,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setFallbackValidation("success")
        toast.success("Fallback provider berhasil divalidasi!")
      } else {
        setFallbackValidation("error")
        toast.error(result.error || "Validasi gagal")
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setFallbackValidation("error")
      toast.error(error.message || "Terjadi kesalahan saat validasi")
    } finally {
      setIsTestingFallback(false)
    }
  }

  const handleVerifyCompatibility = async () => {
    if (!fallbackModel) {
      toast.error("Lengkapi fallback model terlebih dahulu")
      return
    }

    if (fallbackProvider !== "openrouter") {
      toast.info("Compatibility verification hanya diperlukan untuk OpenRouter fallback")
      return
    }

    setIsVerifyingCompatibility(true)
    setCompatibilityResult(null)

    try {
      const response = await fetch("/api/admin/verify-model-compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: fallbackModel,
          apiKey: openrouterApiKey,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setCompatibilityResult(result)
        if (result.compatibility.level === "full") {
          toast.success("Model fully compatible! Semua fitur didukung.")
        } else if (result.compatibility.level === "partial") {
          toast.warning("Model partially compatible. Beberapa fitur mungkin tidak berfungsi.")
        } else {
          toast.error("Model NOT compatible. Tidak disarankan untuk fallback.")
        }
      } else {
        toast.error(result.error || "Verification gagal")
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan saat verifikasi"
      toast.error(errorMessage)
    } finally {
      setIsVerifyingCompatibility(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!name.trim()) {
      toast.error("Nama config tidak boleh kosong")
      return
    }

    if (temperature < 0 || temperature > 2) {
      toast.error("Temperature harus antara 0 dan 2")
      return
    }

    if (topP !== undefined && (topP < 0 || topP > 1)) {
      toast.error("Top P harus antara 0 dan 1")
      return
    }

    if (maxTokens !== undefined && maxTokens <= 0) {
      toast.error("Max Tokens harus lebih dari 0")
      return
    }
    if (
      thinkingBudgetPrimary !== undefined &&
      (thinkingBudgetPrimary < MIN_THINKING_BUDGET || thinkingBudgetPrimary > MAX_THINKING_BUDGET)
    ) {
      toast.error(`Thinking Budget Primary harus antara ${MIN_THINKING_BUDGET} dan ${MAX_THINKING_BUDGET}`)
      return
    }
    if (
      thinkingBudgetFallback !== undefined &&
      (thinkingBudgetFallback < MIN_THINKING_BUDGET || thinkingBudgetFallback > MAX_THINKING_BUDGET)
    ) {
      toast.error(`Thinking Budget Fallback harus antara ${MIN_THINKING_BUDGET} dan ${MAX_THINKING_BUDGET}`)
      return
    }

    if (fallbackWebSearchMaxResults < 1 || fallbackWebSearchMaxResults > 10) {
      toast.error("Max Search Results harus antara 1 dan 10")
      return
    }

    setIsLoading(true)

    try {
      if (isEditing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateArgs: any = {
          requestorUserId: userId,
          configId: config._id,
          temperature,
          topP,
          maxTokens,
          reasoningEnabled,
          thinkingBudgetPrimary,
          thinkingBudgetFallback,
          reasoningTraceMode,
        }

        if (name !== config.name) updateArgs.name = name
        if (description !== (config.description ?? "")) updateArgs.description = description
        if (primaryProvider !== config.primaryProvider) updateArgs.primaryProvider = primaryProvider
        if (primaryModel !== config.primaryModel) updateArgs.primaryModel = primaryModel
        if (fallbackProvider !== config.fallbackProvider) updateArgs.fallbackProvider = fallbackProvider
        if (fallbackModel !== config.fallbackModel) updateArgs.fallbackModel = fallbackModel

        if (gatewayApiKey.trim()) updateArgs.gatewayApiKey = gatewayApiKey
        if (openrouterApiKey.trim()) updateArgs.openrouterApiKey = openrouterApiKey
        if (gatewayUseEnvKey) updateArgs.gatewayApiKeyClear = true
        if (openrouterUseEnvKey) updateArgs.openrouterApiKeyClear = true

        if (primaryContextWindow !== config.primaryContextWindow) {
          updateArgs.primaryContextWindow = primaryContextWindow
        }
        if (fallbackContextWindow !== config.fallbackContextWindow) {
          updateArgs.fallbackContextWindow = fallbackContextWindow
        }
        if (reasoningEnabled !== (config.reasoningEnabled ?? true)) {
          updateArgs.reasoningEnabled = reasoningEnabled
        }
        if (thinkingBudgetPrimary !== (config.thinkingBudgetPrimary ?? DEFAULT_THINKING_BUDGET_PRIMARY)) {
          updateArgs.thinkingBudgetPrimary = thinkingBudgetPrimary
        }
        if (thinkingBudgetFallback !== (config.thinkingBudgetFallback ?? DEFAULT_THINKING_BUDGET_FALLBACK)) {
          updateArgs.thinkingBudgetFallback = thinkingBudgetFallback
        }
        if (reasoningTraceMode !== (config.reasoningTraceMode ?? "curated")) {
          updateArgs.reasoningTraceMode = reasoningTraceMode
        }

        if (primaryWebSearchEnabled !== (config.primaryWebSearchEnabled ?? true)) {
          updateArgs.primaryWebSearchEnabled = primaryWebSearchEnabled
        }
        if (fallbackWebSearchEnabled !== (config.fallbackWebSearchEnabled ?? true)) {
          updateArgs.fallbackWebSearchEnabled = fallbackWebSearchEnabled
        }
        if (fallbackWebSearchEngine !== (config.fallbackWebSearchEngine ?? "auto")) {
          updateArgs.fallbackWebSearchEngine = fallbackWebSearchEngine
        }
        if (fallbackWebSearchMaxResults !== (config.fallbackWebSearchMaxResults ?? 5)) {
          updateArgs.fallbackWebSearchMaxResults = fallbackWebSearchMaxResults
        }

        const result = await updateMutation(updateArgs)
        toast.success(result.message)
      } else {
        const result = await createMutation({
          requestorUserId: userId,
          name: name.trim(),
          description: description.trim() || undefined,
          primaryProvider,
          primaryModel,
          fallbackProvider,
          fallbackModel,
          gatewayApiKey,
          openrouterApiKey,
          temperature,
          topP,
          maxTokens,
          reasoningEnabled,
          thinkingBudgetPrimary,
          thinkingBudgetFallback,
          reasoningTraceMode,
          primaryContextWindow,
          fallbackContextWindow,
          primaryWebSearchEnabled,
          fallbackWebSearchEnabled,
          fallbackWebSearchEngine,
          fallbackWebSearchMaxResults,
        })
        toast.success(result.message)
      }

      router.push(backUrl)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const hasChanges = isEditing
    ? name !== config.name ||
      description !== (config.description ?? "") ||
      primaryProvider !== config.primaryProvider ||
      primaryModel !== config.primaryModel ||
      fallbackProvider !== config.fallbackProvider ||
      fallbackModel !== config.fallbackModel ||
      temperature !== config.temperature ||
      topP !== config.topP ||
      maxTokens !== config.maxTokens ||
      reasoningEnabled !== (config.reasoningEnabled ?? true) ||
      thinkingBudgetPrimary !== (config.thinkingBudgetPrimary ?? DEFAULT_THINKING_BUDGET_PRIMARY) ||
      thinkingBudgetFallback !== (config.thinkingBudgetFallback ?? DEFAULT_THINKING_BUDGET_FALLBACK) ||
      reasoningTraceMode !== (config.reasoningTraceMode ?? "curated") ||
      primaryContextWindow !== config.primaryContextWindow ||
      fallbackContextWindow !== config.fallbackContextWindow ||
      primaryWebSearchEnabled !== (config.primaryWebSearchEnabled ?? true) ||
      fallbackWebSearchEnabled !== (config.fallbackWebSearchEnabled ?? true) ||
      fallbackWebSearchEngine !== (config.fallbackWebSearchEngine ?? "auto") ||
      fallbackWebSearchMaxResults !== (config.fallbackWebSearchMaxResults ?? 5) ||
      gatewayApiKey.trim() !== "" ||
      openrouterApiKey.trim() !== "" ||
      gatewayUseEnvKey ||
      openrouterUseEnvKey
    : name.trim() !== ""

  // ---- Render --------------------------------------------------------------
  return (
    <div className="admin-container relative isolate left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[color:var(--section-bg-alt)]">
      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-6 pt-4 md:px-8">
        {/* Back link */}
        <button
          type="button"
          onClick={handleBack}
          className="text-interface mb-4 flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <NavArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Kembali ke AI Providers
        </button>

        {/* Card */}
        <div className="mx-auto w-full max-w-5xl rounded-shell border-hairline bg-card/90 px-5 py-6 backdrop-blur-[1px] dark:bg-slate-900 md:px-8">
          {/* Header: title + action buttons */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-narrative text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                {isEditing
                  ? `Edit: ${config.name} (v${config.version})`
                  : "Buat Config Baru"}
              </h1>
              <p className="text-narrative text-sm text-muted-foreground">
                {isEditing
                  ? "Update konfigurasi AI provider. API key per provider; kosong = tetap pakai key lama."
                  : "Buat konfigurasi baru untuk AI provider. API key boleh kosong, akan pakai ENV."}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="focus-ring inline-flex h-8 items-center rounded-action border-main border border-border px-3 py-1.5 text-xs font-mono font-medium text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                form="ai-config-form"
                disabled={!hasChanges || isLoading}
                className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-100 transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {isLoading
                  ? "Menyimpan..."
                  : isEditing
                    ? `Simpan (Buat v${config.version + 1})`
                    : "Buat Config"}
              </button>
            </div>
          </div>

          <form id="ai-config-form" onSubmit={handleSubmit} className="space-y-6">
            {/* ── Basic Info ───────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="config-name" className="text-interface text-xs">
                  Nama Config <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="config-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Production Config"
                  disabled={isLoading}
                  className="rounded-action"
                />
              </div>

              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="config-description" className="text-interface text-xs">
                  Deskripsi (Opsional)
                </Label>
                <Input
                  id="config-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat tentang config ini"
                  disabled={isLoading}
                  className="rounded-action"
                />
              </div>
            </div>

            {/* Divider */}
            <hr className="border-hairline" />

            {/* ── Primary Provider ─────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-narrative text-base font-medium tracking-tight text-foreground">
                  Primary Provider
                </h3>
                {primaryValidation !== "idle" && (
                  <div className="flex items-center gap-2">
                    {primaryValidation === "success" && (
                      <div className="flex items-center gap-1 text-green-600 text-xs font-mono">
                        <CheckCircle className="h-4 w-4" />
                        <span>Tervalidasi</span>
                      </div>
                    )}
                    {primaryValidation === "error" && (
                      <div className="flex items-center gap-1 text-destructive text-xs font-mono">
                        <XmarkCircle className="h-4 w-4" />
                        <span>Validasi Gagal</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryProvider" className="text-interface text-xs">Provider</Label>
                  <Select value={primaryProvider} onValueChange={handlePrimaryProviderChange}>
                    <SelectTrigger id="primaryProvider" disabled={isLoading} className="rounded-action">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryModelPreset" className="text-interface text-xs">Model</Label>
                  <Select value={primaryModelPreset} onValueChange={handlePrimaryModelPresetChange}>
                    <SelectTrigger id="primaryModelPreset" disabled={isLoading || modelsLoading} className="rounded-action">
                      <SelectValue placeholder={modelsLoading ? "Loading models..." : undefined} />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelsForProvider(primaryProvider).map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {primaryModelPreset === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="primaryModel" className="text-interface text-xs">Custom Model ID</Label>
                  <Input
                    id="primaryModel"
                    value={primaryModel}
                    onChange={(e) => setPrimaryModel(e.target.value)}
                    placeholder={primaryProvider === "vercel-gateway" ? "model-name" : "provider/model-name"}
                    disabled={isLoading}
                    className="rounded-action"
                  />
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleTestPrimary}
                  disabled={isLoading || isTestingPrimary}
                  className="focus-ring inline-flex h-8 items-center rounded-action border-main border border-border px-3 py-1.5 text-xs font-mono font-medium text-foreground transition-colors hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-slate-800"
                >
                  {isTestingPrimary ? (
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Test"
                  )}
                </button>
              </div>
            </div>

            <hr className="border-hairline" />

            {/* ── Fallback Provider ────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-narrative text-base font-medium tracking-tight text-foreground">
                  Fallback Provider
                </h3>
                {fallbackValidation !== "idle" && (
                  <div className="flex items-center gap-2">
                    {fallbackValidation === "success" && (
                      <div className="flex items-center gap-1 text-green-600 text-xs font-mono">
                        <CheckCircle className="h-4 w-4" />
                        <span>Tervalidasi</span>
                      </div>
                    )}
                    {fallbackValidation === "error" && (
                      <div className="flex items-center gap-1 text-destructive text-xs font-mono">
                        <XmarkCircle className="h-4 w-4" />
                        <span>Validasi Gagal</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fallbackProvider" className="text-interface text-xs">Provider</Label>
                  <Select value={fallbackProvider} onValueChange={handleFallbackProviderChange}>
                    <SelectTrigger id="fallbackProvider" disabled={isLoading} className="rounded-action">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fallbackModelPreset" className="text-interface text-xs">Model</Label>
                  <Select value={fallbackModelPreset} onValueChange={handleFallbackModelPresetChange}>
                    <SelectTrigger id="fallbackModelPreset" disabled={isLoading || modelsLoading} className="rounded-action">
                      <SelectValue placeholder={modelsLoading ? "Loading models..." : undefined} />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelsForProvider(fallbackProvider).map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {fallbackModelPreset === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="fallbackModel" className="text-interface text-xs">Custom Model ID</Label>
                  <Input
                    id="fallbackModel"
                    value={fallbackModel}
                    onChange={(e) => setFallbackModel(e.target.value)}
                    placeholder={fallbackProvider === "vercel-gateway" ? "model-name" : "provider/model-name"}
                    disabled={isLoading}
                    className="rounded-action"
                  />
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleTestFallback}
                  disabled={isLoading || isTestingFallback}
                  className="focus-ring inline-flex h-8 items-center rounded-action border-main border border-border px-3 py-1.5 text-xs font-mono font-medium text-foreground transition-colors hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-slate-800"
                >
                  {isTestingFallback ? (
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Test"
                  )}
                </button>
              </div>

              {/* Tool Compatibility Verification (OpenRouter only) */}
              {fallbackProvider === "openrouter" && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleVerifyCompatibility}
                      disabled={isLoading || isVerifyingCompatibility || fallbackValidation !== "success"}
                      className="focus-ring inline-flex h-8 w-full items-center justify-center gap-2 rounded-action bg-slate-100 px-3 py-1.5 text-xs font-mono font-medium text-foreground transition-colors hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      {isVerifyingCompatibility ? (
                        <>
                          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Verifying Tool Compatibility...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4" />
                          Verify Tool Compatibility
                        </>
                      )}
                    </button>
                  </div>

                  {fallbackValidation === "success" && !compatibilityResult && !isVerifyingCompatibility && (
                    <p className="text-interface text-xs text-muted-foreground">
                      Klik tombol di atas untuk memverifikasi apakah model mendukung tool calling (createArtifact, Paper Tools, dll).
                    </p>
                  )}

                  {/* Compatibility Results Panel */}
                  {compatibilityResult && (
                    <Alert variant={
                      compatibilityResult.compatibility.level === "full" ? "default" :
                      compatibilityResult.compatibility.level === "partial" ? "default" : "destructive"
                    } className={
                      compatibilityResult.compatibility.level === "full" ? "border-green-500 bg-green-50 dark:bg-green-950" :
                      compatibilityResult.compatibility.level === "partial" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950" : ""
                    }>
                      {compatibilityResult.compatibility.level === "full" && (
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                      )}
                      {compatibilityResult.compatibility.level === "partial" && (
                        <WarningTriangle className="h-4 w-4 text-yellow-600" />
                      )}
                      {compatibilityResult.compatibility.level === "incompatible" && (
                        <ShieldXmark className="h-4 w-4" />
                      )}
                      <AlertTitle className="flex items-center gap-2">
                        {compatibilityResult.compatibility.level === "full" && "Fully Compatible"}
                        {compatibilityResult.compatibility.level === "partial" && "Partially Compatible"}
                        {compatibilityResult.compatibility.level === "incompatible" && "Not Compatible"}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({compatibilityResult.totalDuration}ms)
                        </span>
                      </AlertTitle>
                      <AlertDescription className="mt-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(compatibilityResult.featureSupport).map(([feature, supported]) => (
                            <div key={feature} className="flex items-center gap-2">
                              {supported ? (
                                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                              ) : (
                                <XmarkCircle className="h-3.5 w-3.5 text-red-500" />
                              )}
                              <span className={supported ? "" : "text-muted-foreground"}>{feature}</span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {compatibilityResult.recommendation}
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>

            <hr className="border-hairline" />

            {/* ── Kunci Provider ───────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-narrative text-base font-medium tracking-tight text-foreground">
                  Kunci Provider
                </h3>
                <p className="text-interface text-xs text-muted-foreground">
                  Kunci berlaku per provider, bukan per slot primary/fallback.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gatewayApiKey" className="text-interface text-xs">
                    API Key Vercel AI Gateway {isEditing ? "(kosongkan jika tidak ingin ubah)" : "(boleh kosong untuk pakai ENV)"}
                  </Label>
                  <Input
                    id="gatewayApiKey"
                    type="password"
                    value={gatewayApiKey}
                    onChange={(e) => setGatewayApiKey(e.target.value)}
                    placeholder={isEditing ? "Kosongkan untuk tetap pakai key lama" : "Kosongkan untuk pakai ENV"}
                    disabled={isLoading || (isEditing && gatewayUseEnvKey)}
                    className="rounded-action"
                  />
                  {isEditing && (
                    <div className="flex items-center justify-between rounded-action border-main border border-border px-3 py-2">
                      <div className="space-y-1">
                        <p className="text-interface text-xs font-medium">Pakai ENV</p>
                        <p className="text-interface text-[10px] text-muted-foreground">
                          Hapus key tersimpan, pakai env var server.
                        </p>
                      </div>
                      <Switch checked={gatewayUseEnvKey} onCheckedChange={handleGatewayUseEnvChange} />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openrouterApiKey" className="text-interface text-xs">
                    API Key OpenRouter {isEditing ? "(kosongkan jika tidak ingin ubah)" : "(boleh kosong untuk pakai ENV)"}
                  </Label>
                  <Input
                    id="openrouterApiKey"
                    type="password"
                    value={openrouterApiKey}
                    onChange={(e) => setOpenrouterApiKey(e.target.value)}
                    placeholder={isEditing ? "Kosongkan untuk tetap pakai key lama" : "Kosongkan untuk pakai ENV"}
                    disabled={isLoading || (isEditing && openrouterUseEnvKey)}
                    className="rounded-action"
                  />
                  {isEditing && (
                    <div className="flex items-center justify-between rounded-action border-main border border-border px-3 py-2">
                      <div className="space-y-1">
                        <p className="text-interface text-xs font-medium">Pakai ENV</p>
                        <p className="text-interface text-[10px] text-muted-foreground">
                          Hapus key tersimpan, pakai env var server.
                        </p>
                      </div>
                      <Switch checked={openrouterUseEnvKey} onCheckedChange={handleOpenRouterUseEnvChange} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-hairline" />

            {/* ── AI Settings ──────────────────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-narrative text-base font-medium tracking-tight text-foreground">
                AI Settings
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temperature" className="text-interface text-xs">
                    Temperature (0-2) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    disabled={isLoading}
                    className="rounded-action"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topP" className="text-interface text-xs">Top P (0-1, Opsional)</Label>
                  <Input
                    id="topP"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={topP ?? ""}
                    onChange={(e) =>
                      setTopP(e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    placeholder="Opsional"
                    disabled={isLoading}
                    className="rounded-action"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTokens" className="text-interface text-xs">Max Tokens (Opsional)</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    step="100"
                    min="1"
                    value={maxTokens ?? ""}
                    onChange={(e) =>
                      setMaxTokens(e.target.value ? parseInt(e.target.value, 10) : undefined)
                    }
                    placeholder="Opsional"
                    disabled={isLoading}
                    className="rounded-action"
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-action border-main border border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-interface text-sm font-medium">Reasoning Settings</h4>
                    <p className="text-interface text-[10px] text-muted-foreground">
                      Kontrol mode thinking model dan trace mode user-facing.
                    </p>
                  </div>
                  <Switch
                    id="reasoningEnabled"
                    checked={reasoningEnabled}
                    onCheckedChange={setReasoningEnabled}
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="thinkingBudgetPrimary" className="text-interface text-xs">
                      Thinking Budget Primary
                    </Label>
                    <Input
                      id="thinkingBudgetPrimary"
                      type="number"
                      step="1"
                      min={MIN_THINKING_BUDGET}
                      max={MAX_THINKING_BUDGET}
                      value={thinkingBudgetPrimary ?? ""}
                      onChange={(e) =>
                        setThinkingBudgetPrimary(e.target.value ? parseInt(e.target.value, 10) : undefined)
                      }
                      placeholder={`${DEFAULT_THINKING_BUDGET_PRIMARY}`}
                      disabled={isLoading || !reasoningEnabled}
                      className="rounded-action"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="thinkingBudgetFallback" className="text-interface text-xs">
                      Thinking Budget Fallback
                    </Label>
                    <Input
                      id="thinkingBudgetFallback"
                      type="number"
                      step="1"
                      min={MIN_THINKING_BUDGET}
                      max={MAX_THINKING_BUDGET}
                      value={thinkingBudgetFallback ?? ""}
                      onChange={(e) =>
                        setThinkingBudgetFallback(e.target.value ? parseInt(e.target.value, 10) : undefined)
                      }
                      placeholder={`${DEFAULT_THINKING_BUDGET_FALLBACK}`}
                      disabled={isLoading || !reasoningEnabled}
                      className="rounded-action"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reasoningTraceMode" className="text-interface text-xs">
                      Reasoning Trace Mode
                    </Label>
                    <Select
                      value={reasoningTraceMode}
                      onValueChange={(value) => setReasoningTraceMode(value as "off" | "curated")}
                      disabled={isLoading || !reasoningEnabled}
                    >
                      <SelectTrigger id="reasoningTraceMode" className="rounded-action">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="curated">Curated</SelectItem>
                        <SelectItem value="off">Off</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Context Window Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryContextWindow" className="text-interface text-xs">
                    Primary Context Window (tokens)
                  </Label>
                  <Input
                    id="primaryContextWindow"
                    type="number"
                    step="1"
                    min="1000"
                    value={primaryContextWindow ?? ""}
                    onChange={(e) =>
                      setPrimaryContextWindow(e.target.value ? parseInt(e.target.value, 10) : undefined)
                    }
                    placeholder="e.g., 1048576 (Gemini 2.5 Flash)"
                    disabled={isLoading}
                    className="rounded-action"
                  />
                  <p className="text-interface text-[10px] text-muted-foreground">
                    Ukuran context window model primary. Digunakan oleh Context Budget Monitor.
                    Kosong = default 128K tokens.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fallbackContextWindow" className="text-interface text-xs">
                    Fallback Context Window (tokens)
                  </Label>
                  <Input
                    id="fallbackContextWindow"
                    type="number"
                    step="1"
                    min="1000"
                    value={fallbackContextWindow ?? ""}
                    onChange={(e) =>
                      setFallbackContextWindow(e.target.value ? parseInt(e.target.value, 10) : undefined)
                    }
                    placeholder="e.g., 1047576 (GPT-5.1)"
                    disabled={isLoading}
                    className="rounded-action"
                  />
                  <p className="text-interface text-[10px] text-muted-foreground">
                    Ukuran context window model fallback. Kosong = default 128K tokens.
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-hairline" />

            {/* ── Web Search Settings ──────────────────────────────────── */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-narrative text-base font-medium tracking-tight text-foreground">
                  Web Search Settings
                </h3>
                <p className="text-interface text-xs text-muted-foreground">
                  Kontrol fitur web search untuk primary dan fallback provider.
                </p>
              </div>

              <div className="space-y-4">
                {/* Primary Web Search Toggle */}
                <div className="flex items-center justify-between rounded-action border-main border border-border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="primaryWebSearchEnabled" className="text-interface text-xs font-medium">
                      Enable Primary Web Search
                    </Label>
                    <p className="text-interface text-[10px] text-muted-foreground">
                      Aktifkan google_search tool untuk primary provider (Vercel AI Gateway)
                    </p>
                  </div>
                  <Switch
                    id="primaryWebSearchEnabled"
                    checked={primaryWebSearchEnabled}
                    onCheckedChange={setPrimaryWebSearchEnabled}
                    disabled={isLoading}
                  />
                </div>

                {/* Fallback Web Search Toggle */}
                <div className="flex items-center justify-between rounded-action border-main border border-border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="fallbackWebSearchEnabled" className="text-interface text-xs font-medium">
                      Enable Fallback Web Search
                    </Label>
                    <p className="text-interface text-[10px] text-muted-foreground">
                      Aktifkan :online suffix untuk fallback provider (OpenRouter)
                    </p>
                  </div>
                  <Switch
                    id="fallbackWebSearchEnabled"
                    checked={fallbackWebSearchEnabled}
                    onCheckedChange={setFallbackWebSearchEnabled}
                    disabled={isLoading}
                  />
                </div>

                {/* Fallback Search Engine + Max Results */}
                {fallbackWebSearchEnabled && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                    <div className="space-y-2">
                      <Label htmlFor="fallbackWebSearchEngine" className="text-interface text-xs">
                        Fallback Search Engine
                      </Label>
                      <Select
                        value={fallbackWebSearchEngine}
                        onValueChange={setFallbackWebSearchEngine}
                        disabled={isLoading}
                      >
                        <SelectTrigger id="fallbackWebSearchEngine" className="rounded-action">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (OpenRouter Default)</SelectItem>
                          <SelectItem value="native">Native</SelectItem>
                          <SelectItem value="exa">Exa</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-interface text-[10px] text-muted-foreground">
                        Engine untuk OpenRouter :online suffix
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fallbackWebSearchMaxResults" className="text-interface text-xs">
                        Max Search Results
                      </Label>
                      <Input
                        id="fallbackWebSearchMaxResults"
                        type="number"
                        min="1"
                        max="10"
                        value={fallbackWebSearchMaxResults}
                        onChange={(e) => setFallbackWebSearchMaxResults(parseInt(e.target.value, 10) || 5)}
                        disabled={isLoading}
                        className="rounded-action"
                      />
                      <p className="text-interface text-[10px] text-muted-foreground">
                        Jumlah hasil pencarian (1-10)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
