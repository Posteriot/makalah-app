"use client"

import { useState, useEffect } from "react"
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
import { CheckCircle2, XCircle, Loader2, AlertTriangle, Shield, ShieldCheck, ShieldX } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Id } from "@convex/_generated/dataModel"

// Model presets per provider
// Vercel AI Gateway: model ID tanpa prefix provider
// OpenRouter: model ID dengan prefix provider/model

const VERCEL_GATEWAY_MODELS = [
  // Google
  { value: "gemini-2.5-flash-lite", label: "Google Gemini 2.5 Flash Lite" },
  { value: "gemini-2.5-flash", label: "Google Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Google Gemini 2.5 Pro" },
  { value: "gemini-2.0-flash", label: "Google Gemini 2.0 Flash" },
  { value: "gemini-2.0-flash-lite", label: "Google Gemini 2.0 Flash Lite" },
  // OpenAI
  { value: "gpt-4o", label: "OpenAI GPT-4o" },
  { value: "gpt-4o-mini", label: "OpenAI GPT-4o Mini" },
  { value: "gpt-4.1", label: "OpenAI GPT-4.1" },
  { value: "gpt-4.1-mini", label: "OpenAI GPT-4.1 Mini" },
  { value: "gpt-4-turbo", label: "OpenAI GPT-4 Turbo" },
  { value: "o1", label: "OpenAI o1" },
  { value: "o3-mini", label: "OpenAI o3 Mini" },
  // Anthropic
  { value: "claude-sonnet-4", label: "Anthropic Claude Sonnet 4" },
  { value: "claude-3.7-sonnet", label: "Anthropic Claude 3.7 Sonnet" },
  { value: "claude-3.5-sonnet", label: "Anthropic Claude 3.5 Sonnet" },
  { value: "claude-3.5-haiku", label: "Anthropic Claude 3.5 Haiku" },
  { value: "claude-opus-4", label: "Anthropic Claude Opus 4" },
  // Meta Llama
  { value: "llama-3.3-70b", label: "Meta Llama 3.3 70B" },
  { value: "llama-4-scout", label: "Meta Llama 4 Scout" },
  { value: "llama-4-maverick", label: "Meta Llama 4 Maverick" },
  // DeepSeek
  { value: "deepseek-v3", label: "DeepSeek V3" },
  { value: "deepseek-r1", label: "DeepSeek R1" },
  // Mistral
  { value: "mistral-large", label: "Mistral Large" },
  { value: "mistral-small", label: "Mistral Small" },
  // Qwen
  { value: "qwen3-max", label: "Qwen 3 Max" },
  { value: "qwen3-coder", label: "Qwen 3 Coder" },
  // Custom
  { value: "custom", label: "Custom (input manual)" },
]

const OPENROUTER_MODELS = [
  // Google Gemini (from https://openrouter.ai/models)
  { value: "google/gemini-2.5-flash-lite", label: "Google Gemini 2.5 Flash Lite" },
  { value: "google/gemini-2.5-flash", label: "Google Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-pro", label: "Google Gemini 2.5 Pro" },
  { value: "google/gemini-2.0-flash-001", label: "Google Gemini 2.0 Flash" },
  { value: "google/gemini-2.0-flash-lite-001", label: "Google Gemini 2.0 Flash Lite" },
  // OpenAI
  { value: "openai/gpt-4o", label: "OpenAI GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "OpenAI GPT-4o Mini" },
  { value: "openai/gpt-4.1", label: "OpenAI GPT-4.1" },
  { value: "openai/gpt-4.1-mini", label: "OpenAI GPT-4.1 Mini" },
  { value: "openai/gpt-4-turbo", label: "OpenAI GPT-4 Turbo" },
  { value: "openai/chatgpt-4o-latest", label: "OpenAI ChatGPT-4o Latest" },
  // Anthropic Claude
  { value: "anthropic/claude-sonnet-4", label: "Anthropic Claude Sonnet 4" },
  { value: "anthropic/claude-3.7-sonnet", label: "Anthropic Claude 3.7 Sonnet" },
  { value: "anthropic/claude-3.5-sonnet", label: "Anthropic Claude 3.5 Sonnet" },
  { value: "anthropic/claude-3.5-haiku", label: "Anthropic Claude 3.5 Haiku" },
  { value: "anthropic/claude-opus-4", label: "Anthropic Claude Opus 4" },
  // Meta Llama
  { value: "meta-llama/llama-3.3-70b-instruct", label: "Meta Llama 3.3 70B" },
  { value: "meta-llama/llama-4-scout", label: "Meta Llama 4 Scout" },
  { value: "meta-llama/llama-4-maverick", label: "Meta Llama 4 Maverick" },
  { value: "meta-llama/llama-3.1-405b-instruct", label: "Meta Llama 3.1 405B" },
  // DeepSeek
  { value: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
  { value: "deepseek/deepseek-r1", label: "DeepSeek R1" },
  { value: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2" },
  // Mistral
  { value: "mistralai/mistral-large", label: "Mistral Large" },
  { value: "mistralai/ministral-8b", label: "Ministral 8B" },
  { value: "mistralai/codestral-2508", label: "Codestral" },
  // Qwen
  { value: "qwen/qwen-2.5-72b-instruct", label: "Qwen 2.5 72B" },
  { value: "qwen/qwen-2.5-coder-32b-instruct", label: "Qwen 2.5 Coder 32B" },
  { value: "qwen/qwen3-235b-a22b", label: "Qwen 3 235B" },
  { value: "qwen/qwen-max", label: "Qwen Max" },
  // Custom
  { value: "custom", label: "Custom (input manual)" },
]

// Helper function to get models based on provider
const getModelsForProvider = (provider: string) => {
  if (provider === "vercel-gateway") {
    return VERCEL_GATEWAY_MODELS
  }
  return OPENROUTER_MODELS
}

const PROVIDER_OPTIONS = [
  { value: "vercel-gateway", label: "Vercel AI Gateway" },
  { value: "openrouter", label: "OpenRouter" },
]

interface AIProviderConfig {
  _id: Id<"aiProviderConfigs">
  name: string
  description?: string
  primaryProvider: string
  primaryModel: string
  fallbackProvider: string
  fallbackModel: string
  temperature: number
  topP?: number
  maxTokens?: number
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

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  // Primary provider (default: Vercel Gateway)
  const [primaryProvider, setPrimaryProvider] = useState("vercel-gateway")
  const [primaryModel, setPrimaryModel] = useState("gemini-2.5-flash-lite")
  const [primaryModelPreset, setPrimaryModelPreset] = useState("gemini-2.5-flash-lite")
  const [primaryApiKey, setPrimaryApiKey] = useState("")

  // Fallback provider (default: OpenRouter)
  const [fallbackProvider, setFallbackProvider] = useState("openrouter")
  const [fallbackModel, setFallbackModel] = useState("google/gemini-2.5-flash-lite")
  const [fallbackModelPreset, setFallbackModelPreset] = useState("google/gemini-2.5-flash-lite")
  const [fallbackApiKey, setFallbackApiKey] = useState("")

  // AI settings
  const [temperature, setTemperature] = useState(0.7)
  const [topP, setTopP] = useState<number | undefined>(undefined)
  const [maxTokens, setMaxTokens] = useState<number | undefined>(undefined)

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
        // API keys: tidak di-populate (security)
        setPrimaryApiKey("")
        setFallbackApiKey("")
      } else {
        // Create mode: reset to defaults
        setName("")
        setDescription("")
        setPrimaryProvider("vercel-gateway")
        setPrimaryModel("gemini-2.5-flash-lite") // Vercel Gateway format
        setPrimaryModelPreset("gemini-2.5-flash-lite")
        setPrimaryApiKey("")
        setFallbackProvider("openrouter")
        setFallbackModel("google/gemini-2.5-flash-lite") // OpenRouter format
        setFallbackModelPreset("google/gemini-2.5-flash-lite")
        setFallbackApiKey("")
        setTemperature(0.7)
        setTopP(undefined)
        setMaxTokens(undefined)
      }
      // Reset validation state
      setPrimaryValidation("idle")
      setFallbackValidation("idle")
      setCompatibilityResult(null)
    }
  }, [open, config])

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
    }
  }

  const handleFallbackModelPresetChange = (value: string) => {
    setFallbackModelPreset(value)
    if (value !== "custom") {
      setFallbackModel(value)
    }
    setCompatibilityResult(null) // Reset compatibility when model changes
  }

  const handleTestPrimary = async () => {
    if (!primaryProvider || !primaryModel || !primaryApiKey) {
      toast.error("Lengkapi semua field primary provider terlebih dahulu")
      return
    }

    setIsTestingPrimary(true)
    setPrimaryValidation("idle")

    try {
      const response = await fetch("/api/admin/validate-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: primaryProvider,
          model: primaryModel,
          apiKey: primaryApiKey,
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
    if (!fallbackProvider || !fallbackModel || !fallbackApiKey) {
      toast.error("Lengkapi semua field fallback provider terlebih dahulu")
      return
    }

    setIsTestingFallback(true)
    setFallbackValidation("idle")

    try {
      const response = await fetch("/api/admin/validate-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: fallbackProvider,
          model: fallbackModel,
          apiKey: fallbackApiKey,
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
    if (!fallbackModel || !fallbackApiKey) {
      toast.error("Lengkapi fallback model dan API key terlebih dahulu")
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
          apiKey: fallbackApiKey,
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

    if (!primaryApiKey.trim() && !isEditing) {
      toast.error("Primary API key tidak boleh kosong")
      return
    }

    if (!fallbackApiKey.trim() && !isEditing) {
      toast.error("Fallback API key tidak boleh kosong")
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
        }

        // Only update fields that changed
        if (name !== config.name) updateArgs.name = name
        if (description !== (config.description ?? "")) updateArgs.description = description
        if (primaryProvider !== config.primaryProvider) updateArgs.primaryProvider = primaryProvider
        if (primaryModel !== config.primaryModel) updateArgs.primaryModel = primaryModel
        if (fallbackProvider !== config.fallbackProvider) updateArgs.fallbackProvider = fallbackProvider
        if (fallbackModel !== config.fallbackModel) updateArgs.fallbackModel = fallbackModel

        // API keys: only if changed (not empty)
        if (primaryApiKey.trim()) updateArgs.primaryApiKey = primaryApiKey
        if (fallbackApiKey.trim()) updateArgs.fallbackApiKey = fallbackApiKey

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
          primaryApiKey,
          fallbackProvider,
          fallbackModel,
          fallbackApiKey,
          temperature,
          topP,
          maxTokens,
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
    primaryApiKey.trim() !== "" ||
    fallbackApiKey.trim() !== ""
    : name.trim() !== "" && primaryApiKey.trim() !== "" && fallbackApiKey.trim() !== ""

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit Config: ${config.name}` : "Buat Config Baru"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update konfigurasi AI provider. API key kosong = gunakan key yang sudah ada."
              : "Buat konfigurasi baru untuk AI provider. Wajib test connection sebelum save."}
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
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Tervalidasi</span>
                    </div>
                  )}
                  {primaryValidation === "error" && (
                    <div className="flex items-center gap-1 text-destructive text-sm">
                      <XCircle className="h-4 w-4" />
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
                  <SelectTrigger id="primaryModelPreset" disabled={isLoading}>
                    <SelectValue />
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

            <div className="space-y-2">
              <Label htmlFor="primaryApiKey">
                API Key {isEditing && "(kosongkan jika tidak ingin ubah)"}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="primaryApiKey"
                  type="password"
                  value={primaryApiKey}
                  onChange={(e) => setPrimaryApiKey(e.target.value)}
                  placeholder={isEditing ? "Kosongkan untuk tetap pakai key lama" : "sk-..."}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestPrimary}
                  disabled={isLoading || isTestingPrimary || !primaryApiKey.trim()}
                >
                  {isTestingPrimary ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Test"
                  )}
                </Button>
              </div>
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
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Tervalidasi</span>
                    </div>
                  )}
                  {fallbackValidation === "error" && (
                    <div className="flex items-center gap-1 text-destructive text-sm">
                      <XCircle className="h-4 w-4" />
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
                  <SelectTrigger id="fallbackModelPreset" disabled={isLoading}>
                    <SelectValue />
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

            <div className="space-y-2">
              <Label htmlFor="fallbackApiKey">
                API Key {isEditing && "(kosongkan jika tidak ingin ubah)"}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="fallbackApiKey"
                  type="password"
                  value={fallbackApiKey}
                  onChange={(e) => setFallbackApiKey(e.target.value)}
                  placeholder={isEditing ? "Kosongkan untuk tetap pakai key lama" : "sk-..."}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestFallback}
                  disabled={isLoading || isTestingFallback || !fallbackApiKey.trim()}
                >
                  {isTestingFallback ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Test"
                  )}
                </Button>
              </div>
            </div>

            {/* Tool Compatibility Verification (OpenRouter only) */}
            {fallbackProvider === "openrouter" && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleVerifyCompatibility}
                    disabled={isLoading || isVerifyingCompatibility || !fallbackApiKey.trim() || fallbackValidation !== "success"}
                    className="w-full"
                  >
                    {isVerifyingCompatibility ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    {compatibilityResult.compatibility.level === "incompatible" && (
                      <ShieldX className="h-4 w-4" />
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
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-red-500" />
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
