export type GoogleSearchToolUnavailableReason =
  | "import_failed"
  | "factory_missing"
  | "factory_init_failed"

export type GoogleSearchToolInitResult =
  | {
    status: "ready"
    tool: unknown
    reason: "ok"
  }
  | {
    status: "unavailable"
    tool: null
    reason: GoogleSearchToolUnavailableReason
    errorMessage?: string
  }

type GoogleModuleLike = {
  google?: {
    tools?: {
      googleSearch?: unknown
    }
  }
}

export async function initGoogleSearchTool(
  loader: () => Promise<unknown> = () => import("@ai-sdk/google")
): Promise<GoogleSearchToolInitResult> {
  try {
    const moduleLike = (await loader()) as GoogleModuleLike
    const toolFactory = moduleLike.google?.tools?.googleSearch

    if (!toolFactory) {
      return {
        status: "unavailable",
        tool: null,
        reason: "factory_missing",
      }
    }

    if (typeof toolFactory === "function") {
      try {
        return {
          status: "ready",
          tool: (toolFactory as (args: object) => unknown)({}),
          reason: "ok",
        }
      } catch (error) {
        return {
          status: "unavailable",
          tool: null,
          reason: "factory_init_failed",
          errorMessage: error instanceof Error ? error.message : String(error),
        }
      }
    }

    return {
      status: "ready",
      tool: toolFactory,
      reason: "ok",
    }
  } catch (error) {
    return {
      status: "unavailable",
      tool: null,
      reason: "import_failed",
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}

