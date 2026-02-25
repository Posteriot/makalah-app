"use client"

import { useState, useEffect, useCallback } from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
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

const PROVIDER_OPTIONS = [
  { value: "vercel-gateway", label: "Vercel AI Gateway" },
  { value: "openrouter", label: "OpenRouter" },
]

const MIN_THINKING_BUDGET = 0
const MAX_THINKING_BUDGET = 32768
const DEFAULT_THINKING_BUDGET_PRIMARY = 256
const DEFAULT_THINKING_BUDGET_FALLBACK = 128

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
  reasoningTraceMode?: "off" | "curated" | "transparent"
  // Context window settings
  primaryContextWindow?: number
  fallbackContextWindow?: number
  // Web search settings (with defaults from getActiveConfig)
  primaryWebSearchEnabled?: boolean
  fallbackWebSearchEnabled?: boolean
  fallbackWebSearchEngine?: string
  fallbackWebSearchMaxResults?: number
  version: number
}

// Compatibility verification result types
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

interface AIProviderFormDialogProps {
  open: boolean
  config: AIProviderConfig | null
  userId: Id<"users">
  onClose: () => void
}

export function AIProviderFormDialog({
  open,
  config,
  userId,
  onClose,
}: AIProviderFormDialogProps) {
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
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  // Primary provider (default: Vercel Gateway)
  const [primaryProvider, setPrimaryProvider] = useState("vercel-gateway")
  const [primaryModel, setPrimaryModel] = useState("gemini-2.5-flash")
  const [primaryModelPreset, setPrimaryModelPreset] = useState("gemini-2.5-flash")

  // Fallback provider (default: OpenRouter)
  const [fallbackProvider, setFallbackProvider] = useState("openrouter")
  const [fallbackModel, setFallbackModel] = useState("openai/gpt-5.1")
  const [fallbackModelPreset, setFallbackModelPreset] = useState("openai/gpt-5.1")
  const [gatewayApiKey, setGatewayApiKey] = useState("")
  const [openrouterApiKey, setOpenrouterApiKey] = useState("")
  const [gatewayUseEnvKey, setGatewayUseEnvKey] = useState(false)
  const [openrouterUseEnvKey, setOpenrouterUseEnvKey] = useState(false)

  // AI settings
  const [temperature, setTemperature] = useState(0.7)
  const [topP, setTopP] = useState<number | undefined>(undefined)
  const [maxTokens, setMaxTokens] = useState<number | undefined>(undefined)
  const [reasoningEnabled, setReasoningEnabled] = useState(true)
  const [thinkingBudgetPrimary, setThinkingBudgetPrimary] = useState<number | undefined>(DEFAULT_THINKING_BUDGET_PRIMARY)
  const [thinkingBudgetFallback, setThinkingBudgetFallback] = useState<number | undefined>(DEFAULT_THINKING_BUDGET_FALLBACK)
  const [reasoningTraceMode, setReasoningTraceMode] = useState<"off" | "curated" | "transparent">("curated")

  // Context window settings
  const [primaryContextWindow, setPrimaryContextWindow] = useState<number | undefined>(undefined)
  const [fallbackContextWindow, setFallbackContextWindow] = useState<number | undefined>(undefined)

  // Web search settings
  const [primaryWebSearchEnabled, setPrimaryWebSearchEnabled] = useState(true)
  const [fallbackWebSearchEnabled, setFallbackWebSearchEnabled] = useState(true)
  const [fallbackWebSearchEngine, setFallbackWebSearchEngine] = useState("auto")
  const [fallbackWebSearchMaxResults, setFallbackWebSearchMaxResults] = useState(5)

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [isTestingPrimary, setIsTestingPrimary] = useState(false)
  const [isTestingFallback, setIsTestingFallback] = useState(false)
  const [primaryValidation, setPrimaryValidation] = useState<"idle" | "success" | "error">("idle")
  const [fallbackValidation, setFallbackValidation] = useState<"idle" | "success" | "error">("idle")

  // Compatibility verification state (for fallback provider)
  const [isVerifyingCompatibility, setIsVerifyingCompatibility] = useState(false)
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityVerificationResult | null>(null)

  const createMutation = useMutation(api.aiProviderConfigs.createConfig)
  const updateMutation = useMutation(api.aiProviderConfigs.updateConfig)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (config) {
        // Edit mode: populate existing data
        setName(config.name)
        setDescription(config.description ?? "")
        setPrimaryProvider(config.primaryProvider)
        setPrimaryModel(config.primaryModel)
        // Check if model exists in the provider's preset list
        const primaryModels = getModelsForProvider(config.primaryProvider)
        setPrimaryModelPreset(
          primaryModels.find((p) => p.value === config.primaryModel) ? config.primaryModel : "custom"
        )
        setFallbackProvider(config.fallbackProvider)
        setFallbackModel(config.fallbackModel)
        const fallbackModels = getModelsForProvider(config.fallbackProvider)
        setFallbackModelPreset(
          fallbackModels.find((p) => p.value === config.fallbackModel) ? config.fallbackModel : "custom"
        )
        setTemperature(config.temperature)
        setTopP(config.topP)
        setMaxTokens(config.maxTokens)
        setReasoningEnabled(config.reasoningEnabled ?? true)
        setThinkingBudgetPrimary(config.thinkingBudgetPrimary ?? DEFAULT_THINKING_BUDGET_PRIMARY)
        setThinkingBudgetFallback(config.thinkingBudgetFallback ?? DEFAULT_THINKING_BUDGET_FALLBACK)
        setReasoningTraceMode(config.reasoningTraceMode ?? "curated")
        // Context window settings
        setPrimaryContextWindow(config.primaryContextWindow)
        setFallbackContextWindow(config.fallbackContextWindow)
        // Web search settings (use defaults if not set)
        setPrimaryWebSearchEnabled(config.primaryWebSearchEnabled ?? true)
        setFallbackWebSearchEnabled(config.fallbackWebSearchEnabled ?? true)
        setFallbackWebSearchEngine(config.fallbackWebSearchEngine ?? "auto")
        setFallbackWebSearchMaxResults(config.fallbackWebSearchMaxResults ?? 5)
        // API keys: tidak di-populate (security)
        setGatewayApiKey("")
        setOpenrouterApiKey("")
        setGatewayUseEnvKey(false)
        setOpenrouterUseEnvKey(false)
      } else {
        // Create mode: reset to defaults
        setName("")
        setDescription("")
        setPrimaryProvider("vercel-gateway")
        setPrimaryModel("gemini-2.5-flash") // Vercel Gateway format
        setPrimaryModelPreset("gemini-2.5-flash")
        setFallbackProvider("openrouter")
        setFallbackModel("openai/gpt-5.1") // OpenRouter format
        setFallbackModelPreset("openai/gpt-5.1")
        setGatewayApiKey("")
        setOpenrouterApiKey("")
        setGatewayUseEnvKey(false)
        setOpenrouterUseEnvKey(false)
        setTemperature(0.7)
        setTopP(undefined)
        setMaxTokens(undefined)
        setReasoningEnabled(true)
        setThinkingBudgetPrimary(DEFAULT_THINKING_BUDGET_PRIMARY)
        setThinkingBudgetFallback(DEFAULT_THINKING_BUDGET_FALLBACK)
        setReasoningTraceMode("curated")
        // Context window defaults
        setPrimaryContextWindow(undefined)
        setFallbackContextWindow(undefined)
        // Web search settings defaults
        setPrimaryWebSearchEnabled(true)
        setFallbackWebSearchEnabled(true)
        setFallbackWebSearchEngine("auto")
        setFallbackWebSearchMaxResults(5)
      }
      // Reset validation state
      setPrimaryValidation("idle")
      setFallbackValidation("idle")
      setCompatibilityResult(null)
    }
  }, [open, config, getModelsForProvider])

  // Reset model when provider changes
  const handlePrimaryProviderChange = (provider: string) => {
    setPrimaryProvider(provider)
    // Reset to first model in new provider's list
    const models = getModelsForProvider(provider)
    const defaultModel = models[0]?.value ?? ""
    setPrimaryModel(defaultModel)
    setPrimaryModelPreset(defaultModel)
    setPrimaryValidation("idle") // Reset validation
  }

  const handleFallbackProviderChange = (provider: string) => {
    setFallbackProvider(provider)
    // Reset to first model in new provider's list
    const models = getModelsForProvider(provider)
    const defaultModel = models[0]?.value ?? ""
    setFallbackModel(defaultModel)
    setFallbackModelPreset(defaultModel)
    setFallbackValidation("idle") // Reset validation
    setCompatibilityResult(null) // Reset compatibility
  }

  const handlePrimaryModelPresetChange = (value: string) => {
    setPrimaryModelPreset(value)
    if (value !== "custom") {
      setPrimaryModel(value)
      // Auto-fill context window from model metadata
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
      // Auto-fill context window from model metadata
      const models = getModelsForProvider(fallbackProvider)
      const selected = models.find((m) => m.value === value)
      if (selected && selected.context > 0) {
        setFallbackContextWindow(selected.context)
      }
    }
    setCompatibilityResult(null) // Reset compatibility when model changes
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

  // Verify model compatibility for tool calling (OpenRouter fallback)
  const handleVerifyCompatibility = async () => {
    if (!fallbackModel) {
      toast.error("Lengkapi fallback model terlebih dahulu")
      return
    }

    // Only verify for OpenRouter fallback (the provider that needs tool compatibility check)
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
        // Update existing config
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

        // Only update fields that changed
        if (name !== config.name) updateArgs.name = name
        if (description !== (config.description ?? "")) updateArgs.description = description
        if (primaryProvider !== config.primaryProvider) updateArgs.primaryProvider = primaryProvider
        if (primaryModel !== config.primaryModel) updateArgs.primaryModel = primaryModel
        if (fallbackProvider !== config.fallbackProvider) updateArgs.fallbackProvider = fallbackProvider
        if (fallbackModel !== config.fallbackModel) updateArgs.fallbackModel = fallbackModel

        // API keys: only if changed (not empty)
        if (gatewayApiKey.trim()) updateArgs.gatewayApiKey = gatewayApiKey
        if (openrouterApiKey.trim()) updateArgs.openrouterApiKey = openrouterApiKey
        if (gatewayUseEnvKey) updateArgs.gatewayApiKeyClear = true
        if (openrouterUseEnvKey) updateArgs.openrouterApiKeyClear = true

        // Context window settings
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

        // Web search settings
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
        // Create new config
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
          // Context window settings
          primaryContextWindow,
          fallbackContextWindow,
          // Web search settings
          primaryWebSearchEnabled,
          fallbackWebSearchEnabled,
          fallbackWebSearchEngine,
          fallbackWebSearchMaxResults,
        })
        toast.success(result.message)
      }

      onClose()
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

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit Config: ${config.name}` : "Buat Config Baru"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update konfigurasi AI provider. API key per provider; kosong = tetap pakai key lama."
              : "Buat konfigurasi baru untuk AI provider. API key boleh kosong, akan pakai ENV."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nama Config <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Production Config"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi singkat tentang config ini"
                rows={2}
                disabled={isLoading}
              />
            </div>
          </div>

          <Separator />

          {/* Primary Provider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Primary Provider</h3>
              {primaryValidation !== "idle" && (
                <div className="flex items-center gap-2">
                  {primaryValidation === "success" && (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span>Tervalidasi</span>
                    </div>
                  )}
                  {primaryValidation === "error" && (
                    <div className="flex items-center gap-1 text-destructive text-sm">
                      <XmarkCircle className="h-4 w-4" />
                      <span>Validasi Gagal</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryProvider">Provider</Label>
                <Select value={primaryProvider} onValueChange={handlePrimaryProviderChange}>
                  <SelectTrigger id="primaryProvider" disabled={isLoading}>
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
                <Label htmlFor="primaryModelPreset">Model</Label>
                <Select value={primaryModelPreset} onValueChange={handlePrimaryModelPresetChange}>
                  <SelectTrigger id="primaryModelPreset" disabled={isLoading || modelsLoading}>
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
                <Label htmlFor="primaryModel">Custom Model ID</Label>
                <Input
                  id="primaryModel"
                  value={primaryModel}
                  onChange={(e) => setPrimaryModel(e.target.value)}
                  placeholder={primaryProvider === "vercel-gateway" ? "model-name" : "provider/model-name"}
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestPrimary}
                disabled={isLoading || isTestingPrimary}
              >
                {isTestingPrimary ? (
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Test"
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Fallback Provider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Fallback Provider</h3>
              {fallbackValidation !== "idle" && (
                <div className="flex items-center gap-2">
                  {fallbackValidation === "success" && (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span>Tervalidasi</span>
                    </div>
                  )}
                  {fallbackValidation === "error" && (
                    <div className="flex items-center gap-1 text-destructive text-sm">
                      <XmarkCircle className="h-4 w-4" />
                      <span>Validasi Gagal</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fallbackProvider">Provider</Label>
                <Select value={fallbackProvider} onValueChange={handleFallbackProviderChange}>
                  <SelectTrigger id="fallbackProvider" disabled={isLoading}>
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
                <Label htmlFor="fallbackModelPreset">Model</Label>
                <Select value={fallbackModelPreset} onValueChange={handleFallbackModelPresetChange}>
                  <SelectTrigger id="fallbackModelPreset" disabled={isLoading || modelsLoading}>
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
                <Label htmlFor="fallbackModel">Custom Model ID</Label>
                <Input
                  id="fallbackModel"
                  value={fallbackModel}
                  onChange={(e) => setFallbackModel(e.target.value)}
                  placeholder={fallbackProvider === "vercel-gateway" ? "model-name" : "provider/model-name"}
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestFallback}
                disabled={isLoading || isTestingFallback}
              >
                {isTestingFallback ? (
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Test"
                )}
              </Button>
            </div>

            {/* Tool Compatibility Verification (OpenRouter only) */}
            {fallbackProvider === "openrouter" && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleVerifyCompatibility}
                    disabled={isLoading || isVerifyingCompatibility || fallbackValidation !== "success"}
                    className="w-full"
                  >
                    {isVerifyingCompatibility ? (
                      <>
                        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Verifying Tool Compatibility...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Verify Tool Compatibility
                      </>
                    )}
                  </Button>
                </div>

                {fallbackValidation === "success" && !compatibilityResult && !isVerifyingCompatibility && (
                  <p className="text-xs text-muted-foreground">
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

          <Separator />

          {/* Kunci Provider */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Kunci Provider</h3>
            <p className="text-sm text-muted-foreground">
              Kunci berlaku per provider, bukan per slot primary/fallback.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gatewayApiKey">
                  API Key Vercel AI Gateway {isEditing ? "(kosongkan jika tidak ingin ubah)" : "(boleh kosong untuk pakai ENV)"}
                </Label>
                <Input
                  id="gatewayApiKey"
                  type="password"
                  value={gatewayApiKey}
                  onChange={(e) => setGatewayApiKey(e.target.value)}
                  placeholder={isEditing ? "Kosongkan untuk tetap pakai key lama" : "Kosongkan untuk pakai ENV"}
                  disabled={isLoading || (isEditing && gatewayUseEnvKey)}
                />
                {isEditing && (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Pakai ENV</p>
                      <p className="text-xs text-muted-foreground">
                        Hapus key tersimpan, pakai env var server.
                      </p>
                    </div>
                    <Switch checked={gatewayUseEnvKey} onCheckedChange={handleGatewayUseEnvChange} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="openrouterApiKey">
                  API Key OpenRouter {isEditing ? "(kosongkan jika tidak ingin ubah)" : "(boleh kosong untuk pakai ENV)"}
                </Label>
                <Input
                  id="openrouterApiKey"
                  type="password"
                  value={openrouterApiKey}
                  onChange={(e) => setOpenrouterApiKey(e.target.value)}
                  placeholder={isEditing ? "Kosongkan untuk tetap pakai key lama" : "Kosongkan untuk pakai ENV"}
                  disabled={isLoading || (isEditing && openrouterUseEnvKey)}
                />
                {isEditing && (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Pakai ENV</p>
                      <p className="text-xs text-muted-foreground">
                        Hapus key tersimpan, pakai env var server.
                      </p>
                    </div>
                    <Switch checked={openrouterUseEnvKey} onCheckedChange={handleOpenRouterUseEnvChange} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* AI Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">AI Settings</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topP">Top P (0-1, Opsional)</Label>
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens (Opsional)</Label>
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
                />
              </div>
            </div>

            <div className="space-y-4 rounded-md border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-medium">Reasoning Settings</h4>
                  <p className="text-xs text-muted-foreground">
                    Toggle reasoning/thinking model dan trace mode user-facing.
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
                  <Label htmlFor="thinkingBudgetPrimary">Thinking Budget Primary</Label>
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thinkingBudgetFallback">Thinking Budget Fallback</Label>
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reasoningTraceMode">Reasoning Trace Mode</Label>
                  <Select
                    value={reasoningTraceMode}
                    onValueChange={(value) => setReasoningTraceMode(value as "off" | "curated" | "transparent")}
                    disabled={isLoading || !reasoningEnabled}
                  >
                    <SelectTrigger id="reasoningTraceMode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transparent">Transparent</SelectItem>
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
                <Label htmlFor="primaryContextWindow">Primary Context Window (tokens)</Label>
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
                />
                <p className="text-xs text-muted-foreground">
                  Ukuran context window model primary. Digunakan oleh Context Budget Monitor.
                  Kosong = default 128K tokens.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fallbackContextWindow">Fallback Context Window (tokens)</Label>
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
                />
                <p className="text-xs text-muted-foreground">
                  Ukuran context window model fallback. Kosong = default 128K tokens.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Web Search Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Web Search Settings</h3>
            <p className="text-sm text-muted-foreground">
              Kontrol fitur web search untuk primary dan fallback provider.
            </p>

            <div className="space-y-4">
              {/* Primary Web Search Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="primaryWebSearchEnabled" className="text-base">
                    Enable Primary Web Search
                  </Label>
                  <p className="text-sm text-muted-foreground">
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
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="fallbackWebSearchEnabled" className="text-base">
                    Enable Fallback Web Search
                  </Label>
                  <p className="text-sm text-muted-foreground">
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

              {/* Fallback Search Engine + Max Results (only show if fallback enabled) */}
              {fallbackWebSearchEnabled && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="fallbackWebSearchEngine">Fallback Search Engine</Label>
                    <Select
                      value={fallbackWebSearchEngine}
                      onValueChange={setFallbackWebSearchEngine}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="fallbackWebSearchEngine">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (OpenRouter Default)</SelectItem>
                        <SelectItem value="native">Native</SelectItem>
                        <SelectItem value="exa">Exa</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Engine untuk OpenRouter :online suffix
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fallbackWebSearchMaxResults">Max Search Results</Label>
                    <Input
                      id="fallbackWebSearchMaxResults"
                      type="number"
                      min="1"
                      max="10"
                      value={fallbackWebSearchMaxResults}
                      onChange={(e) => setFallbackWebSearchMaxResults(parseInt(e.target.value, 10) || 5)}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Jumlah hasil pencarian (1-10)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={!hasChanges || isLoading}>
              {isLoading ? "Menyimpan..." : isEditing ? "Update" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
