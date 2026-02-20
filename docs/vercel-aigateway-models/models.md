# Vercel AI Gateway — Model List

> **Source:** https://vercel.com/ai-gateway/models
> **Last crawled:** 2026-02-20
> **Format:** Model ID menggunakan Gateway format (tanpa provider prefix). Untuk OpenRouter, tambahkan prefix provider (e.g., `google/gemini-2.5-flash`).
> **Note:** Context window dan max output bisa bervariasi tergantung provider endpoint. Angka di bawah adalah yang ditampilkan di halaman Gateway.

---

## Text Models

### Anthropic

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `claude-opus-4.6` | 1M | 128K | |
| `claude-sonnet-4.6` | 1M | 64K | |
| `claude-sonnet-4.5` | 1M | 64K | |
| `claude-haiku-4.5` | 1M | 66K | |
| `claude-opus-4.5` | 1M | 65K | |
| `claude-opus-4.1` | 1M | 66K | |
| `claude-opus-4` | 1M | 131K | |
| `claude-sonnet-4` | 164K | 66K | |
| `claude-3.7-sonnet` | 1M | 128K | |
| `claude-3.5-sonnet` | 1M | 128K | |
| `claude-3.5-sonnet-20240620` | 1M | 131K | |
| `claude-3.5-haiku` | 1M | 66K | |
| `claude-3-haiku` | 1M | 66K | |
| `claude-3-opus` | 1M | 131K | |

### Google

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `gemini-3-flash` | 1M | 65K | |
| `gemini-3.1-pro-preview` | 400K | 128K | Preview |
| `gemini-3-pro-preview` | 1M | 64K | Preview |
| `gemini-3-pro-image` | — | — | Image generation capable |
| `gemini-2.5-pro` | 1M | 64K | |
| `gemini-2.5-flash` | 1M | 66K | **Current primary model** |
| `gemini-2.5-flash-lite` | 1M | 66K | |
| `gemini-2.0-flash` | 1M | 64K | |
| `gemini-2.0-flash-lite` | 1M | 64K | |

### OpenAI

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `gpt-5.2` | 400K | 128K | |
| `gpt-5.2-codex` | 1M | 128K | Code |
| `gpt-5.2-chat` | 2M | 30K | |
| `gpt-5.2-pro` | 1M | 8K | |
| `gpt-5.1-thinking` | 1M | 64K | Reasoning |
| `gpt-5.1-instant` | 1M | 64K | |
| `gpt-5.1-codex` | 1M | 33K | Code |
| `gpt-5.1-codex-max` | — | — | Code |
| `gpt-5.1-codex-mini` | — | — | Code |
| `gpt-5` | 400K | 128K | |
| `gpt-5-chat` | 1M | 64K | |
| `gpt-5-mini` | 400K | 128K | |
| `gpt-5-nano` | 1M | 8K | |
| `gpt-5-pro` | 262K | 128K | |
| `gpt-5-codex` | 400K | 128K | Code |
| `gpt-4o` | 1M | 131K | |
| `gpt-4o-mini` | 1M | 66K | |
| `gpt-4-turbo` | 131K | 66K | |
| `gpt-4.1` | 128K | 16K | |
| `gpt-4.1-mini` | 128K | 16K | |
| `gpt-4.1-nano` | — | — | |
| `gpt-3.5-turbo` | 131K | 131K | Legacy |
| `gpt-3.5-turbo-instruct` | 262K | 262K | Legacy |
| `o4-mini` | 128K | 16K | Reasoning |
| `o3` | 200K | 100K | Reasoning |
| `o3-mini` | 131K | 128K | Reasoning |
| `o3-pro` | 131K | 128K | Reasoning |
| `o3-deep-research` | 66K | 33K | Research |
| `o1` | 128K | 64K | Reasoning |

### Meta (Llama)

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `llama-4-maverick` | 128K | 33K | |
| `llama-4-scout` | 131K | 8K | |
| `llama-3.3-70b` | 128K | 16K | |
| `llama-3.2-90b` | 1M | 33K | |
| `llama-3.2-11b` | 1M | 33K | |
| `llama-3.2-3b` | 128K | 4K | |
| `llama-3.2-1b` | 131K | 128K | |
| `llama-3.1-70b` | 128K | 16K | |
| `llama-3.1-8b` | 1M | 66K | |

### Mistral

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `devstral-2` | 128K | 16K | Code |
| `devstral-small-2` | 128K | 8K | Code |
| `devstral-small` | 128K | 16K | Code |
| `mistral-large-3` | 131K | 128K | |
| `mistral-medium` | 128K | 16K | |
| `mistral-small` | 131K | 131K | |
| `mistral-nemo` | 128K | 4K | |
| `ministral-14b` | 131K | 128K | |
| `ministral-8b` | 128K | 16K | |
| `ministral-3b` | 256K | 256K | |
| `codestral` | — | — | Code |
| `magistral-small` | 200K | 8K | |
| `magistral-medium` | 131K | 66K | |
| `pixtral-12b` | 131K | 128K | Vision |
| `pixtral-large` | 128K | 4K | Vision |

### Alibaba (Qwen)

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `qwen3-max` | 262K | 33K | |
| `qwen3-max-thinking` | 262K | 32K | Reasoning |
| `qwen3-max-preview` | 262K | 128K | Preview |
| `qwen3-coder` | 1M | 66K | Code |
| `qwen3-coder-next` | 400K | 128K | Code |
| `qwen3-coder-plus` | 262K | 66K | Code |
| `qwen3-coder-30b-a3b` | 128K | 16K | Code |
| `qwen3.5-plus` | 128K | 33K | |
| `qwen3-next-80b-a3b-instruct` | 1M | 128K | |
| `qwen3-next-80b-a3b-thinking` | 131K | 128K | Reasoning |
| `qwen-3-235b` | 128K | 16K | |
| `qwen-3-32b` | 131K | 128K | |
| `qwen-3-30b` | 128K | 33K | |
| `qwen-3-14b` | 1M | 33K | |
| `qwen3-vl-instruct` | 200K | 8K | Vision |
| `qwen3-vl-thinking` | 131K | 128K | Vision |

### DeepSeek

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `deepseek-v3.2` | 128K | 8K | |
| `deepseek-v3.2-thinking` | 128K | 33K | Reasoning |
| `deepseek-v3.1` | 1M | 64K | |
| `deepseek-v3.1-terminus` | 128K | 33K | |
| `deepseek-v3` | 1M | 66K | |
| `deepseek-r1` | 128K | 16K | Reasoning |

### Zhipu (GLM)

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `glm-5` | 128K | 16K | |
| `glm-4.7` | 200K | 64K | |
| `glm-4.7-flash` | 200K | 64K | |
| `glm-4.7-flashx` | 128K | 16K | |
| `glm-4.6` | 128K | 4K | |
| `glm-4.6v` | 131K | 128K | Vision |
| `glm-4.6v-flash` | 131K | 131K | Vision |
| `glm-4.5` | 131K | 128K | |
| `glm-4.5-air` | 1M | 128K | |
| `glm-4.5v` | 200K | 8K | Vision |

### Moonshotai (Kimi)

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `kimi-k2.5` | 262K | 262K | |
| `kimi-k2-thinking` | 200K | 8K | Reasoning |
| `kimi-k2-0905` | 200K | 8K | |
| `kimi-k2` | 262K | 32K | |
| `kimi-k2-turbo` | 128K | 4K | |
| `kimi-k2-thinking-turbo` | 128K | 33K | Reasoning |

### Perplexity

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `sonar` | 127K | 8K | Web search built-in |
| `sonar-pro` | 127K | 8K | Web search built-in |
| `sonar-reasoning` | 1M | 131K | Web search + reasoning |
| `sonar-reasoning-pro` | 164K | 16K | Web search + reasoning |

### XAI (Grok)

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `grok-4` | 256K | 256K | |
| `grok-4.1-fast-reasoning` | 128K | 16K | Reasoning |
| `grok-4.1-fast-non-reasoning` | 128K | 33K | |
| `grok-4-fast-reasoning` | 205K | 200K | Reasoning |
| `grok-4-fast-non-reasoning` | 164K | 66K | |
| `grok-3` | 262K | 32K | |
| `grok-3-fast` | 1M | 64K | |
| `grok-3-mini` | 400K | 128K | |
| `grok-3-mini-fast` | 262K | 128K | |
| `grok-2-vision` | 200K | 64K | Vision |
| `grok-code-fast-1` | 128K | 16K | Code |

### Cohere

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `command-a` | 1M | 33K | |

### Minimax

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `minimax-m2.5` | 128K | 16K | |
| `minimax-m2.1` | 131K | 128K | |
| `minimax-m2.1-lightning` | 262K | 262K | |
| `minimax-m2` | 262K | 128K | |

### Amazon (Nova)

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `nova-pro` | 300K | — | |
| `nova-lite` | 300K | — | |
| `nova-micro` | 300K | — | |
| `nova-2-lite` | 300K | — | |

### Meituan (Longcat)

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `longcat-flash-chat` | — | — | |
| `longcat-flash-thinking` | — | — | |
| `longcat-flash-thinking-2601` | — | — | |

### Arcee AI

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `trinity-large-preview` | 128K | 16K | |
| `trinity-mini` | 262K | 262K | |

### Morph

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `morph-v3-fast` | — | — | |
| `morph-v3-large` | — | — | |

### Kwaipilot

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `kat-coder-pro-v1` | 256K | 32K | Code |

### NVIDIA (Nemotron)

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `nemotron-nano-12b-v2-vl` | — | — | Vision |
| `nemotron-nano-9b-v2` | — | — | |
| `nemotron-3-nano-30b-a3b` | — | — | |

### Xiaomi (MIMO)

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `mimo-v2-flash` | — | — | |

### Prime Intellect

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `intellect-3` | — | — | |

### Bytedance (Seed)

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `seed-1.8` | — | — | |
| `seed-1.6` | — | — | |

### Inception

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `mercury-coder-small` | — | — | Code |

### Vercel

| Model ID | Context | Max Output | Notes |
|----------|---------|------------|-------|
| `v0-1.5-md` | 131K | 131K | |
| `v0-1.0-md` | 131K | 131K | |

---

## Embedding Models

| Model ID | Provider | Context |
|----------|----------|---------|
| `text-embedding-3-small` | OpenAI | 131K |
| `text-embedding-3-large` | OpenAI | 131K |
| `text-embedding-ada-002` | OpenAI | 200K |
| `gemini-embedding-001` | Google | 2K |
| `text-embedding-005` | Google | 400K |
| `text-multilingual-embedding-002` | Google | 66K |
| `qwen3-embedding-8b` | Alibaba | 128K |
| `qwen3-embedding-4b` | Alibaba | 131K |
| `qwen3-embedding-0.6b` | Alibaba | 128K |
| `mistral-embed` | Mistral | 1M |
| `codestral-embed` | Mistral | 128K |
| `voyage-3.5` | Voyage | 262K |
| `voyage-3.5-lite` | Voyage | 128K |
| `voyage-3-large` | Voyage | 131K |
| `voyage-code-3` | Voyage | 128K |
| `voyage-code-2` | Voyage | 128K |
| `voyage-law-2` | Voyage | 131K |
| `voyage-finance-2` | Voyage | 131K |
| `titan-embed-text-v2` | Amazon | 200K |
| `embed-v4.0` | Cohere | — |

---

## Image Generation Models

| Model ID | Provider |
|----------|----------|
| `flux-2-max` | Black Forest Labs |
| `flux-2-pro` | Black Forest Labs |
| `flux-2-flex` | Black Forest Labs |
| `flux-2-klein-9b` | Black Forest Labs |
| `flux-2-klein-4b` | Black Forest Labs |
| `flux-pro-1.1-ultra` | Black Forest Labs |
| `flux-pro-1.1` | Black Forest Labs |
| `flux-pro-1.0-fill` | Black Forest Labs |
| `flux-kontext-pro` | Black Forest Labs |
| `flux-kontext-max` | Black Forest Labs |
| `imagen-4.0-generate-001` | Google |
| `imagen-4.0-ultra-generate-001` | Google |
| `imagen-4.0-fast-generate-001` | Google |
| `recraft-v4-pro` | Recraft |
| `recraft-v4` | Recraft |
| `recraft-v3` | Recraft |
| `recraft-v2` | Recraft |
| `grok-imagine-image` | XAI |
| `grok-imagine-image-pro` | XAI |

---

## Video Generation Models

| Model ID | Provider |
|----------|----------|
| `veo-3.1-generate-001` | Google |
| `veo-3.1-fast-generate-001` | Google |
| `veo-3.0-generate-001` | Google |
| `veo-3.0-fast-generate-001` | Google |
| `kling-v3.0-t2v` | Klingai |
| `kling-v3.0-i2v` | Klingai |
| `kling-v2.6-t2v` | Klingai |
| `kling-v2.6-i2v` | Klingai |
| `kling-v2.5-turbo-t2v` | Klingai |
| `kling-v2.5-turbo-i2v` | Klingai |
| `wan-v2.6-t2v` | Alibaba |
| `wan-v2.6-i2v` | Alibaba |
| `wan-v2.6-i2v-flash` | Alibaba |
| `wan-v2.6-r2v` | Alibaba |
| `wan-v2.6-r2v-flash` | Alibaba |
| `wan-v2.5-t2v-preview` | Alibaba |
| `grok-imagine-video` | XAI |
