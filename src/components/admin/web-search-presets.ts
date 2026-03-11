export const RETRIEVER_PRESETS = [
  { key: "perplexity",       label: "Perplexity Sonar",        modelId: "perplexity/sonar",   provider: "openrouter" },
  { key: "grok",             label: "Grok Mini",               modelId: "x-ai/grok-3-mini:online",   provider: "openrouter" },
  { key: "google-grounding", label: "Google Grounding Gemini",  modelId: "gemini-2.5-flash",   provider: "google-ai-studio" },
] as const

export function getPresetByKey(key: string) {
  return RETRIEVER_PRESETS.find((p) => p.key === key)
}

export function getModelIdForKey(key: string): string {
  return getPresetByKey(key)?.modelId ?? ""
}

export function getProviderLabelForKey(key: string): string {
  const preset = getPresetByKey(key)
  if (!preset) return ""
  return preset.provider === "openrouter" ? "OpenRouter" : "Google AI Studio (Direct)"
}
