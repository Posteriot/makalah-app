export const RETRIEVER_PRESETS = [
  { key: "perplexity",       label: "Perplexity Sonar",        modelId: "perplexity/sonar",   provider: "openrouter" },
  { key: "grok",             label: "Grok Mini",               modelId: "x-ai/grok-3-mini",   provider: "openrouter" },
  { key: "google-grounding", label: "Google Grounding Gemini",  modelId: "gemini-2.5-flash",   provider: "google-ai-studio" },
  { key: "openai-search",    label: "OpenAI GPT-4o Mini",      modelId: "openai/gpt-4o-mini", provider: "openrouter" },
] as const

export type RetrieverPresetKey = typeof RETRIEVER_PRESETS[number]["key"]

export function getPresetByKey(key: string) {
  return RETRIEVER_PRESETS.find((p) => p.key === key)
}

export function getModelIdForKey(key: string): string {
  return getPresetByKey(key)?.modelId ?? ""
}

export function getLabelForKey(key: string): string {
  return getPresetByKey(key)?.label ?? key
}
