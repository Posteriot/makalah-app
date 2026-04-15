"use client"

import { UIMessage } from "ai"
import { EditPencil, Xmark, Send, CheckCircle, Copy, Check } from "iconoir-react"
import { QuickActions } from "./QuickActions"
import { ArtifactIndicator } from "./ArtifactIndicator"
import { SourcesIndicator } from "./SourcesIndicator"
import { useState, useRef, useMemo, useEffect } from "react"
import { Id } from "../../../convex/_generated/dataModel"
import { MarkdownRenderer } from "./MarkdownRenderer"
import { MessageAttachment } from "./MessageAttachment"
import { isEditAllowed, getMessageStage } from "@/lib/utils/paperPermissions"
import { UnifiedProcessCard, type ProcessTool, type SearchStatusData } from "./UnifiedProcessCard"
import { deriveTaskList } from "@/lib/paper/task-derivation"
import type { PaperStageId } from "../../../convex/paperSessions/constants"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { isImageType } from "@/lib/types/attached-file"
import { formatParagraphEndCitations } from "@/lib/citations/paragraph-citation-formatter"
import { extractLegacySourcesFromText } from "@/lib/citations/legacy-source-extractor"
import { splitInternalThought } from "@/lib/ai/internal-thought-separator"
import { JsonRendererChoiceBlock } from "./json-renderer/JsonRendererChoiceBlock"
import {
    parseChoiceSpecForRender,
    type JsonRendererChoiceRenderPayload,
    type JsonRendererChoiceSpec,
} from "@/lib/json-render/choice-payload"
import { SPEC_DATA_PART_TYPE, applySpecPatch } from "@json-render/core"
import type { Spec, JsonPatch } from "@json-render/core"

// Types for paper permission checking
interface StageDataEntry {
    validatedAt?: number;
    [key: string]: unknown;
}

interface PermissionMessage {
    createdAt: number;
    role?: string;
    [key: string]: unknown;
}

type AutoUserAction =
    | {
        kind: "approved";
        stageLabel: string;
        followupText: string;
    }
    | {
        kind: "revision";
        stageLabel: string;
        feedback: string;
    }
    | {
        kind: "choice";
        stageLabel: string;
        selectedOption: string;
        customNote?: string;
    }
    | null;

export type ArtifactSignal = {
    artifactId: Id<"artifacts">
    title: string
    status: "created" | "updated" | "read"
    version?: number
}

/** Persisted artifact from Convex (for post-refresh signal reconstruction) */
export interface PersistedArtifact {
    _id: Id<"artifacts">
    title: string
    version: number
    parentId?: Id<"artifacts">
    isRecall?: boolean
}

/** Map persisted artifacts to ArtifactSignal[] for post-refresh rendering.
 *  Exported for testing. */
export function mapPersistedToSignals(artifacts: PersistedArtifact[]): ArtifactSignal[] {
    return artifacts.map((a) => ({
        artifactId: a._id,
        title: a.title,
        status: a.isRecall ? "read" as const : a.parentId ? "updated" as const : "created" as const,
        ...(a.version > 1 ? { version: a.version } : {}),
    }))
}

type ChatSource = {
    sourceId?: string
    title: string
    url: string | null
    publishedAt?: number | null
    verificationStatus?: "verified_content" | "unverified_link" | "unavailable"
    documentKind?: "html" | "pdf" | "unknown"
    note?: string
}

type ReferenceInventoryPayload = {
    responseMode?: "synthesis" | "reference_inventory" | "mixed"
    introText?: string
    items?: ChatSource[]
}

function getReferenceInventoryStatusLabel(source: ChatSource): string {
    if (typeof source.url === "string" && source.url.trim().length > 0) {
        return source.verificationStatus === "verified_content"
            ? "Terverifikasi"
            : "Tautan belum diverifikasi"
    }

    return "URL tidak tersedia"
}

function buildReferenceInventoryQuickActionsContent(params: {
    introText: string
    items: ChatSource[]
}): string {
    const introLine = params.introText.trim()
    const itemLines = params.items.map((item, index) => {
        const lines = [
            `${index + 1}. ${item.title}`,
            `URL: ${typeof item.url === "string" && item.url.trim().length > 0 ? item.url : "Tidak tersedia"}`,
            `Status: ${getReferenceInventoryStatusLabel(item)}`,
        ]

        if (typeof item.note === "string" && item.note.trim().length > 0) {
            lines.push(`Catatan: ${item.note.trim()}`)
        }

        return lines.join("\n")
    })

    return [introLine, ...itemLines].filter((line) => line.trim().length > 0).join("\n\n").trim()
}

interface MessageBubbleProps {
    message: UIMessage
    onEdit?: (payload: {
        messageId: string
        newContent: string
        attachmentMode: "explicit" | "inherit"
        fileIds: string[]
        fileNames: string[]
        fileSizes: number[]
        fileTypes: string[]
    }) => void
    onArtifactSelect?: (artifactId: Id<"artifacts">) => void
    /** Keep process indicators visible until overall assistant response completes */
    persistProcessIndicators?: boolean
    // Paper mode edit permissions
    isPaperMode?: boolean
    messageIndex?: number
    currentStageStartIndex?: number
    allMessages?: PermissionMessage[]
    stageData?: Record<string, StageDataEntry>
    currentStage?: string
    /** Persisted artifacts matched to this message (survives page refresh) */
    persistedArtifacts?: PersistedArtifact[]
    /** File name lookup map (fileId → fileName) for history messages */
    fileNameMap?: Map<string, string>
    /** File metadata lookup map (fileId → name/size/type) for history messages */
    fileMetaMap?: Map<string, { name: string; size: number; type: string }>
    /** Callback to open the Sources sheet with the given sources */
    onOpenSources?: (sources: ChatSource[]) => void
    /** Whether the choice card for this message has already been submitted */
    isChoiceSubmitted?: boolean
    /** Callback when user submits a choice card selection */
    onChoiceSubmit?: (params: {
        sourceMessageId: string
        choicePartId: string
        payload: JsonRendererChoiceRenderPayload
        selectedOptionId: string
        customText?: string
    }) => void | Promise<void>
}

export function MessageBubble({
    message,
    onEdit,
    onArtifactSelect,
    persistProcessIndicators = false,
    isPaperMode = false,
    messageIndex = 0,
    currentStageStartIndex = 0,
    allMessages = [],
    stageData,
    currentStage,
    persistedArtifacts,
    fileNameMap,
    fileMetaMap,
    onOpenSources,
    isChoiceSubmitted,
    onChoiceSubmit,
}: MessageBubbleProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState("")
    const [isCopied, setIsCopied] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const editAreaRef = useRef<HTMLDivElement>(null)

    const isUser = message.role === 'user'
    const isAssistant = message.role === 'assistant'

    const parseAutoUserAction = (rawContent: string): AutoUserAction => {
        const approvedMatch = rawContent.match(/^\[Approved:\s*(.+?)\]\s*([\s\S]*)$/)
        if (approvedMatch) {
            return {
                kind: "approved",
                stageLabel: approvedMatch[1].trim(),
                followupText: (approvedMatch[2] ?? "").trim(),
            }
        }

        const revisionMatch = rawContent.match(/^\[Revisi untuk\s*(.+?)\]\s*([\s\S]*)$/)
        if (revisionMatch) {
            return {
                kind: "revision",
                stageLabel: revisionMatch[1].trim(),
                feedback: (revisionMatch[2] ?? "").trim(),
            }
        }

        const choiceMatch = rawContent.match(/^\[Choice:\s*(.+?)\]\s*([\s\S]*)$/)
        if (choiceMatch) {
            const stageLabel = choiceMatch[1].trim()
            const rest = (choiceMatch[2] ?? "").trim()
            const lines = rest.split("\n").map(l => l.trim()).filter(Boolean)
            const pilihan = lines.find(l => l.startsWith("Pilihan:"))
            const catatan = lines.find(l => l.startsWith("Catatan user:"))
            return {
                kind: "choice",
                stageLabel,
                selectedOption: pilihan ? pilihan.replace(/^Pilihan:\s*/, "") : rest,
                ...(catatan ? { customNote: catatan.replace(/^Catatan user:\s*/, "") } : {}),
            }
        }
        return null
    }

    // Calculate edit permission for this message
    const editPermission = useMemo(() => {
        // Only check permission for user messages
        if (message.role !== "user") {
            return { allowed: false, reason: "Hanya pesan user yang bisa diedit" }
        }

        // If no allMessages provided, fall back to allowing edit
        if (allMessages.length === 0) {
            return { allowed: true }
        }

        return isEditAllowed({
            messages: allMessages,
            messageIndex,
            isPaperMode,
            currentStageStartIndex,
            stageData,
        })
    }, [message.role, allMessages, messageIndex, isPaperMode, currentStageStartIndex, stageData])

    // Derive task summary for UnifiedProcessCard — use per-message plan snapshot when available,
    // falling back to global stageData._plan for messages without snapshot (backward compat).
    const taskSummary = useMemo(() => {
        if (!isPaperMode || !stageData || !currentStage || currentStage === "completed") return null

        // Determine which stage THIS message belongs to
        const messageCreatedAt = allMessages[messageIndex]?.createdAt ?? 0
        const messageStage = messageCreatedAt > 0
            ? getMessageStage(messageCreatedAt, stageData)
            : currentStage  // Streaming message (no createdAt yet) → use current stage

        // Per-message plan snapshot: if this message has a planSnapshot, overlay it onto
        // stageData so deriveTaskList reads the historical plan, not the latest global one.
        const msgPlanSnapshot = allMessages[messageIndex]?.planSnapshot
        if (msgPlanSnapshot) {
            const overlayStageData = {
                ...stageData,
                [messageStage]: {
                    ...(stageData[messageStage] ?? {}),
                    _plan: msgPlanSnapshot,
                },
            }
            return deriveTaskList(messageStage as PaperStageId, overlayStageData)
        }

        return deriveTaskList(messageStage as PaperStageId, stageData)
    }, [isPaperMode, stageData, currentStage, allMessages, messageIndex])


    const extractArtifactSignals = (uiMessage: UIMessage): ArtifactSignal[] => {
        const signals: ArtifactSignal[] = []

        for (const part of uiMessage.parts ?? []) {
            if (!part || typeof part !== "object") continue

            const maybeToolPart = part as unknown as {
                type?: unknown
                state?: unknown
                output?: unknown
                result?: unknown
            }

            const okState =
                maybeToolPart.state === "output-available" || maybeToolPart.state === "result"
            if (!okState) continue

            if (maybeToolPart.type === "tool-createArtifact") {
                const maybeOutput = (maybeToolPart.output ?? maybeToolPart.result) as unknown as {
                    success?: unknown
                    artifactId?: unknown
                    title?: unknown
                } | null

                if (!maybeOutput || maybeOutput.success !== true) continue
                if (typeof maybeOutput.artifactId !== "string") continue
                if (typeof maybeOutput.title !== "string") continue

                signals.push({
                    artifactId: maybeOutput.artifactId as Id<"artifacts">,
                    title: maybeOutput.title,
                    status: "created",
                })
                continue
            }

            if (maybeToolPart.type === "tool-updateArtifact") {
                const maybeOutput = (maybeToolPart.output ?? maybeToolPart.result) as unknown as {
                    success?: unknown
                    newArtifactId?: unknown
                    title?: unknown
                    version?: unknown
                } | null

                if (!maybeOutput || maybeOutput.success !== true) continue
                if (typeof maybeOutput.newArtifactId !== "string") continue

                const parsedVersion =
                    typeof maybeOutput.version === "number" && Number.isFinite(maybeOutput.version)
                        ? maybeOutput.version
                        : undefined
                const fallbackTitle = parsedVersion
                    ? `Artifak direvisi (v${parsedVersion})`
                    : "Artifak direvisi"

                signals.push({
                    artifactId: maybeOutput.newArtifactId as Id<"artifacts">,
                    title: typeof maybeOutput.title === "string" ? maybeOutput.title : fallbackTitle,
                    status: "updated",
                    ...(parsedVersion ? { version: parsedVersion } : {}),
                })
                continue
            }

            if (maybeToolPart.type === "tool-readArtifact") {
                const maybeOutput = (maybeToolPart.output ?? maybeToolPart.result) as unknown as {
                    success?: unknown
                    artifactId?: unknown
                    title?: unknown
                } | null

                if (!maybeOutput || maybeOutput.success !== true) continue
                if (typeof maybeOutput.artifactId !== "string") continue

                signals.push({
                    artifactId: maybeOutput.artifactId as Id<"artifacts">,
                    title: typeof maybeOutput.title === "string" ? maybeOutput.title : "Artifact",
                    status: "read",
                })
            }
        }

        return signals
    }

    const extractInProgressTools = (uiMessage: UIMessage) => {
        const tools: ProcessTool[] = []

        for (const part of uiMessage.parts ?? []) {
            if (!part || typeof part !== "object") continue

            const maybeToolPart = part as unknown as {
                type?: string
                state?: string
                args?: unknown
                output?: unknown
                result?: unknown
            }

            if (typeof maybeToolPart.type !== "string" || !maybeToolPart.type.startsWith("tool-")) continue

            // Keep completed state visible while response is still streaming to avoid flicker.
            const isCompletedState = maybeToolPart.state === "output-available" || maybeToolPart.state === "result"
            if (isCompletedState && !persistProcessIndicators) continue

            const toolName = maybeToolPart.type.replace("tool-", "")
            let errorText: string | undefined
            const normalizedState = isCompletedState && persistProcessIndicators
                ? "input-available"
                : (maybeToolPart.state || "unknown")

            if (normalizedState === "output-error" || normalizedState === "error") {
                const output = maybeToolPart.output ?? maybeToolPart.result
                if (typeof output === "string") {
                    errorText = output
                } else if (typeof output === "object" && output && "error" in output) {
                    errorText = String((output as { error: unknown }).error)
                }
            }

            tools.push({
                toolName,
                state: normalizedState,
                errorText
            })
        }

        return tools
    }

    const extractSearchStatus = (
        uiMessage: UIMessage
    ): SearchStatusData | null => {
        for (const part of uiMessage.parts ?? []) {
            if (!part || typeof part !== "object") continue
            const maybeDataPart = part as unknown as { type?: string; data?: unknown }
            if (maybeDataPart.type !== "data-search") continue

            const data = maybeDataPart.data as { status?: unknown; message?: unknown; sourceCount?: unknown } | null
            if (!data || typeof data !== "object") continue

            const status = data.status
            if (status === "searching" || status === "composing" || status === "done" || status === "off" || status === "error") {
                const sourceCount = typeof data.sourceCount === "number" ? data.sourceCount : undefined
                return {
                    status,
                    ...(typeof data.message === "string" && data.message.trim().length > 0
                        ? { message: data.message }
                        : {}),
                    ...(sourceCount !== undefined ? { sourceCount } : {}),
                }
            }
        }

        return null
    }

    const content = message.parts
        ? message.parts.filter(part => part.type === 'text').map(part => part.text).join('')
        : ''
    const autoUserAction = isUser ? parseAutoUserAction(content) : null

    const extractCitedText = (uiMessage: UIMessage): string | null => {
        for (const part of uiMessage.parts ?? []) {
            if (!part || typeof part !== "object") continue
            const maybeDataPart = part as unknown as { type?: string; data?: unknown }
            if (maybeDataPart.type !== "data-cited-text") continue
            const data = maybeDataPart.data as { text?: unknown } | null
            if (!data || typeof data !== "object") continue
            return typeof data.text === "string" ? data.text : null
        }
        return null
    }

    const extractCitedSources = (uiMessage: UIMessage): ChatSource[] | null => {
        for (const part of uiMessage.parts ?? []) {
            if (!part || typeof part !== "object") continue
            const maybeDataPart = part as unknown as { type?: string; data?: unknown }
            if (maybeDataPart.type !== "data-cited-sources") continue
            const data = maybeDataPart.data as { sources?: unknown } | null
            if (!data || typeof data !== "object") continue
            if (!Array.isArray(data.sources)) return null
            const out = data.sources
                .map((s) => {
                    const src = s as {
                        sourceId?: unknown
                        url?: unknown
                        title?: unknown
                        publishedAt?: unknown
                        verificationStatus?: unknown
                        documentKind?: unknown
                        note?: unknown
                    }
                    if (typeof src?.url !== "string" || typeof src?.title !== "string") return null
                    const publishedAt = typeof src.publishedAt === "number" && Number.isFinite(src.publishedAt) ? src.publishedAt : null
                    return {
                        ...(typeof src.sourceId === "string" ? { sourceId: src.sourceId } : {}),
                        url: src.url,
                        title: src.title,
                        ...(publishedAt ? { publishedAt } : {}),
                        ...(src.verificationStatus === "verified_content" || src.verificationStatus === "unverified_link" || src.verificationStatus === "unavailable"
                            ? { verificationStatus: src.verificationStatus }
                            : {}),
                        ...(src.documentKind === "html" || src.documentKind === "pdf" || src.documentKind === "unknown"
                            ? { documentKind: src.documentKind }
                            : {}),
                        ...(typeof src.note === "string" ? { note: src.note } : {}),
                    }
                })
                .filter(Boolean) as ChatSource[]
            return out.length > 0 ? out : null
        }
        return null
    }

    const extractReferenceInventory = (uiMessage: UIMessage): ReferenceInventoryPayload | null => {
        for (const part of uiMessage.parts ?? []) {
            if (!part || typeof part !== "object") continue
            const maybeDataPart = part as unknown as { type?: string; data?: unknown }
            if (maybeDataPart.type !== "data-reference-inventory") continue
            const data = maybeDataPart.data as ReferenceInventoryPayload | null
            if (!data || typeof data !== "object") continue
            if (
                data.responseMode !== undefined &&
                data.responseMode !== "synthesis" &&
                data.responseMode !== "reference_inventory" &&
                data.responseMode !== "mixed"
            ) {
                continue
            }
            if (!Array.isArray(data.items)) return null
            const items = data.items
                .map((item) => {
                    if (!item || typeof item !== "object") return null
                    const src = item as {
                        sourceId?: unknown
                        title?: unknown
                        url?: unknown
                        publishedAt?: unknown
                        verificationStatus?: unknown
                        documentKind?: unknown
                        note?: unknown
                    }

                    if (typeof src.title !== "string") return null

                    return {
                        ...(typeof src.sourceId === "string" ? { sourceId: src.sourceId } : {}),
                        title: src.title,
                        url: src.url === null ? null : (typeof src.url === "string" ? src.url : null),
                        ...(typeof src.publishedAt === "number" && Number.isFinite(src.publishedAt)
                            ? { publishedAt: src.publishedAt }
                            : {}),
                        ...(src.verificationStatus === "verified_content" || src.verificationStatus === "unverified_link" || src.verificationStatus === "unavailable"
                            ? { verificationStatus: src.verificationStatus }
                            : {}),
                        ...(src.documentKind === "html" || src.documentKind === "pdf" || src.documentKind === "unknown"
                            ? { documentKind: src.documentKind }
                            : {}),
                        ...(typeof src.note === "string" ? { note: src.note } : {}),
                    } satisfies ChatSource
                })
                .filter(Boolean) as ChatSource[]

            return {
                responseMode: data.responseMode,
                ...(typeof data.introText === "string" ? { introText: data.introText } : {}),
                items,
            }
        }

        return null
    }

    const extractInternalThoughtData = (uiMessage: UIMessage): string | null => {
        for (const part of uiMessage.parts ?? []) {
            if (!part || typeof part !== "object") continue
            const maybeDataPart = part as unknown as { type?: string; data?: unknown }
            if (maybeDataPart.type !== "data-internal-thought") continue

            const data = maybeDataPart.data as { text?: unknown } | null
            if (!data || typeof data !== "object") continue
            return typeof data.text === "string" ? data.text : null
        }

        return null
    }

    const extractChoiceSpec = (uiMessage: UIMessage): JsonRendererChoiceSpec | null => {
        let spec: Spec | null = null
        for (const part of uiMessage.parts ?? []) {
            if (!part || typeof part !== "object") continue
            const dataPart = part as unknown as { type?: string; data?: unknown }
            if (dataPart.type !== SPEC_DATA_PART_TYPE) continue
            const data = dataPart.data as { type?: string; spec?: Spec; patch?: unknown } | null
            if (!data || typeof data !== "object") continue
            if (data.type === "flat" && data.spec) {
                spec = data.spec
            } else if (data.type === "patch" && data.patch) {
                // Initialize empty spec on first patch — pipeYamlRender only emits patches during streaming
                if (!spec) spec = {} as Spec
                // pipeYamlRender emits single patch per chunk (not array)
                const patches = Array.isArray(data.patch) ? data.patch : [data.patch]
                for (const p of patches) {
                    try { spec = applySpecPatch(spec, p as JsonPatch) } catch { /* skip invalid patch */ }
                }
            }
        }

        if (!spec) {
            // Only log when spec-related parts exist but parsing failed (indicates a real problem)
            const hasSpecParts = (uiMessage.parts ?? []).some(p => (p as {type?:string})?.type === SPEC_DATA_PART_TYPE)
            if (hasSpecParts) {
                console.log("[F1-F6-TEST] extractChoiceSpec: no spec found", { messageId: uiMessage.id })
            }
            return null
        }

        const rawElements = (spec as unknown as Record<string, unknown>).elements
        const elementTypes = Object.entries(
            rawElements && typeof rawElements === "object" ? rawElements : {}
        )
            .map(([id, el]) => {
                const elementType =
                    el && typeof el === "object" && "type" in el
                        ? (el as { type?: string }).type
                        : "?"
                return `${id}:${elementType ?? "?"}`
            })
            .join(", ")
        const parsedSpec = parseChoiceSpecForRender(spec)
        if (!parsedSpec.success) {
            console.warn("[F1-F6-TEST] ChoiceSpec validation FAILED", { errors: parsedSpec.error.issues.map(i => `${i.path.join(".")}: ${i.message}`), elementTypes })
        } else {
            console.log("[F1-F6-TEST] extractChoiceSpec OK", { messageId: uiMessage.id, elementTypes, contractVersion: parsedSpec.contractVersion })
        }
        return parsedSpec.success ? parsedSpec.spec : null
    }

    const searchStatus = extractSearchStatus(message)
    const citedText = extractCitedText(message)
    const choiceSpec = extractChoiceSpec(message)
    const choiceBlockPayload = useMemo<JsonRendererChoiceRenderPayload | null>(() => {
        if (!choiceSpec) return null

        // Safety net: ensure ChoiceSubmitButton exists AND is reachable in root.children
        const elements = choiceSpec.elements ?? {}
        const choiceElements = Object.values(elements).filter(
            (el) => !!el && typeof el === "object"
        ) as Array<{ type?: string; props?: Record<string, unknown>; children?: string[] }>
        const hasOptionButtons = choiceElements.some((el) => el.type === "ChoiceOptionButton")
        const submitEntry = Object.entries(elements).find(
            ([, el]) => !!el && typeof el === "object" && (el as { type?: string }).type === "ChoiceSubmitButton"
        )
        const rootElement = elements[choiceSpec.root] as { children?: string[] } | undefined
        const rootChildren = Array.isArray(rootElement?.children) ? rootElement.children : []
        // Element exists AND is listed in root.children (not orphaned)
        const hasReachableSubmitButton = !!submitEntry && rootChildren.includes(submitEntry[0])

        let normalizedSpec = choiceSpec

        // Safety net 2: if ChoiceSubmitButton exists and reachable but has empty/missing label, fix it
        if (hasReachableSubmitButton && submitEntry) {
            const [submitKey, submitEl] = submitEntry
            const submitProps = (submitEl as { props?: Record<string, unknown> }).props ?? {}
            if (!submitProps.label || (typeof submitProps.label === "string" && submitProps.label.trim().length === 0)) {
                normalizedSpec = {
                    ...choiceSpec,
                    elements: {
                        ...elements,
                        [submitKey]: {
                            ...submitEl,
                            props: { ...submitProps, label: "Lanjutkan" },
                        },
                    },
                } as JsonRendererChoiceSpec
                console.warn("[F1-F6-TEST] ChoiceSubmitButton had empty label — set to 'Lanjutkan'")
            }
        }

        if (hasOptionButtons && !hasReachableSubmitButton) {
            const submitId = "injected-submit-btn"
            const updatedRootChildren = [...rootChildren, submitId]

            normalizedSpec = {
                ...choiceSpec,
                elements: {
                    ...elements,
                    [choiceSpec.root]: {
                        ...rootElement,
                        children: updatedRootChildren,
                    },
                    [submitId]: {
                        type: "ChoiceSubmitButton",
                        props: { label: "Lanjutkan", disabled: false },
                        children: [],
                        on: {
                            press: {
                                action: "submitChoice",
                                params: {
                                    selectedOptionId: { $state: "/selection/selectedOptionId" },
                                    customText: { $state: "/selection/customText" },
                                },
                            },
                        },
                    },
                },
            } as JsonRendererChoiceSpec
            const wasOrphan = !!submitEntry && !rootChildren.includes(submitEntry[0])
            console.warn(`[F1-F6-TEST] ChoiceSubmitButton ${wasOrphan ? "orphaned in spec" : "missing from model YAML"} — injected fallback`)
        }

        const specWithState = normalizedSpec as JsonRendererChoiceSpec & {
            state?: JsonRendererChoiceRenderPayload["initialState"]
        }

        return {
            spec: normalizedSpec,
            initialState: specWithState.state ?? {
                selection: {
                    selectedOptionId: null,
                    customText: "",
                },
            },
        }
    }, [choiceSpec])

    const startEditing = () => {
        setIsEditing(true)
        setEditContent(content)
        // Auto-focus and resize logic
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus()
                textareaRef.current.style.height = 'auto'
                textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
            }
        }, 0)
    }

    const handleSave = () => {
        // "Kirim" selalu trigger regeneration, bahkan jika konten tidak berubah
        // User mungkin ingin retry/regenerate AI response tanpa mengubah pesan
        const contentToSend = editContent.trim() || content // Fallback ke content original jika empty
        onEdit?.({
            messageId: message.id,
            newContent: contentToSend,
            attachmentMode: resolvedAttachmentMode,
            fileIds: resolvedAttachmentMode === "explicit" ? fileIds : [],
            fileNames: resolvedAttachmentMode === "explicit" ? fileNames : [],
            fileSizes: resolvedAttachmentMode === "explicit" ? fileSizes : [],
            fileTypes: resolvedAttachmentMode === "explicit" ? fileTypes : [],
        })
        setIsEditing(false)
    }

    const handleCancel = () => {
        setIsEditing(false)
        setEditContent(content)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSave()
        } else if (e.key === 'Escape') {
            handleCancel()
        }
    }

    const handleCopyUserMessage = async () => {
        try {
            await navigator.clipboard.writeText(content)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        } catch {
            alert("Failed to copy to clipboard")
        }
    }

    useEffect(() => {
        if (!isEditing) return

        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null
            if (!target) return
            if (editAreaRef.current?.contains(target)) return
            setIsEditing(false)
            setEditContent(content)
        }

        document.addEventListener("mousedown", handleClickOutside, true)
        document.addEventListener("touchstart", handleClickOutside, true)

        return () => {
            document.removeEventListener("mousedown", handleClickOutside, true)
            document.removeEventListener("touchstart", handleClickOutside, true)
        }
    }, [isEditing, content])

    const annotations = (message as {
        annotations?: {
            type?: string
            fileIds?: string[]
            fileNames?: string[]
            fileSizes?: number[]
            fileTypes?: string[]
        }[]
    }).annotations
    const fileAnnotations = annotations?.find((annotation) => annotation.type === "file_ids")
    const persistedFileIds = (message as { fileIds?: string[] }).fileIds ?? []

    const annotationFileIds = fileAnnotations?.fileIds ?? []
    const annotationFileNames = fileAnnotations?.fileNames ?? []
    const annotationFileSizes = fileAnnotations?.fileSizes ?? []
    const annotationFileTypes = fileAnnotations?.fileTypes ?? []

    const fileIds = persistedFileIds.length > 0 ? persistedFileIds : annotationFileIds
    const fileNames = fileIds.map((fileId, index) => {
        if (persistedFileIds.length > 0) {
            return fileMetaMap?.get(fileId)?.name ?? fileNameMap?.get(fileId) ?? annotationFileNames[index] ?? "file"
        }
        return annotationFileNames[index] ?? fileMetaMap?.get(fileId)?.name ?? fileNameMap?.get(fileId) ?? "file"
    })
    const fileSizes = fileIds.map((fileId, index) => {
        if (persistedFileIds.length > 0) {
            return fileMetaMap?.get(fileId)?.size ?? annotationFileSizes[index] ?? -1
        }
        return annotationFileSizes[index] ?? fileMetaMap?.get(fileId)?.size ?? -1
    })
    const fileTypes = fileIds.map((fileId, index) => {
        if (persistedFileIds.length > 0) {
            return fileMetaMap?.get(fileId)?.type ?? annotationFileTypes[index] ?? ""
        }
        return annotationFileTypes[index] ?? fileMetaMap?.get(fileId)?.type ?? ""
    })
    const rawAttachmentMode = (message as { attachmentMode?: unknown }).attachmentMode
    const resolvedAttachmentMode: "explicit" | "inherit" =
        rawAttachmentMode === "inherit"
            ? "inherit"
            : rawAttachmentMode === "explicit"
                ? "explicit"
                : (fileIds.length > 0 ? "explicit" : "inherit")
    const shouldRenderAttachmentChips = fileIds.length > 0 && resolvedAttachmentMode === "explicit"

    // Extract artifact tool output dari AI SDK v5 UIMessage (ada di message.parts)
    // Live signals from streaming take priority; persisted artifacts are fallback after refresh
    const liveArtifactSignals = extractArtifactSignals(message)
    const artifactSignals: ArtifactSignal[] = liveArtifactSignals.length > 0
        ? liveArtifactSignals
        : mapPersistedToSignals(persistedArtifacts ?? [])
    const inProgressTools = extractInProgressTools(message)
    const dedupedInProgressTools = inProgressTools.filter((tool, index, allTools) => {
        const normalizedErrorText = (tool.errorText ?? "").trim().toLowerCase() || "__no_error__"
        const firstIndex = allTools.findIndex((candidate) => {
            const candidateErrorText = (candidate.errorText ?? "").trim().toLowerCase() || "__no_error__"
            return (
                candidate.toolName === tool.toolName &&
                candidate.state === tool.state &&
                candidateErrorText === normalizedErrorText
            )
        })
        return firstIndex === index
    })

    // Permanent guard: suppress low-signal transient tool errors in completed messages.
    // This prevents noisy "unknown error" badges caused by stream abort/reload races.
    const hasAssistantRenderableContent = isAssistant && (
        content.trim().length > 0 ||
        citedText?.trim().length ||
        artifactSignals.length > 0
    )

    const visibleProcessTools = dedupedInProgressTools.filter((tool) => {
        const isErrorState = tool.state === "output-error" || tool.state === "error"
        if (!isErrorState) return true
        if (persistProcessIndicators) return true

        const normalizedError = (tool.errorText ?? "").trim().toLowerCase()
        const isLowSignalError =
            normalizedError.length === 0 ||
            normalizedError === "unknown" ||
            normalizedError === "tidak diketahui" ||
            normalizedError === "undefined" ||
            normalizedError === "null" ||
            normalizedError === "[object object]"

        if (isLowSignalError && hasAssistantRenderableContent) {
            return false
        }

        return true
    })

    const hasProcessError = visibleProcessTools.some((tool) => tool.state === "output-error" || tool.state === "error")
    const shouldShowProcessIndicators = !isEditing && isAssistant && (persistProcessIndicators || hasProcessError)
    const showUnifiedCard = isAssistant && (
        taskSummary !== null || shouldShowProcessIndicators
    )

    // Observability: log UnifiedProcessCard render state for E2E audit (last message only to avoid noise)
    const isLastAssistantMessage = isAssistant && allMessages && messageIndex === allMessages.length - 1
    const unifiedCardFirstShown = useRef(false)
    if (showUnifiedCard && taskSummary && isLastAssistantMessage) {
        const source = taskSummary.tasks[0]?.field?.startsWith("plan-") ? "model-driven" : "hardcoded-fallback"
        if (!unifiedCardFirstShown.current) {
            unifiedCardFirstShown.current = true
            console.info(`[UNIFIED-PROCESS-UI] FIRST-RENDER stage=${taskSummary.stageId} source=${source} progress=${taskSummary.completed}/${taskSummary.total} t=${Date.now()}`)
        }
        console.info(`[UNIFIED-PROCESS-UI] stage=${taskSummary.stageId} source=${source} progress=${taskSummary.completed}/${taskSummary.total} tasks=[${taskSummary.tasks.map(t => `${t.field}:${t.status}`).join(",")}] t=${Date.now()}`)
    }
    // Task 4.1: Extract sources (try annotations first, then fallback to property if we extend type)
    const sourcesFromAnnotation = (message as {
        annotations?: { type?: string; sources?: { url: string; title: string; publishedAt?: number | null }[] }[]
    }).annotations?.find((annotation) => annotation.type === "sources")?.sources
    const citedSources = extractCitedSources(message)
    const referenceInventory = extractReferenceInventory(message)
    const correctiveFindings = useMemo(() => {
        for (const part of message.parts ?? []) {
            if (!part || typeof part !== "object") continue
            const maybeDataPart = part as unknown as { type?: string; data?: unknown }
            if (maybeDataPart.type !== "data-corrective-findings") continue
            const data = maybeDataPart.data as {
                sources?: Array<{ title?: string; url?: string; citedText?: string }>
                sourceCount?: number
            } | null
            if (!data?.sources?.length) return null
            return data
        }
        return null
    }, [message.parts])
    const messageSources = (message as { sources?: { url: string; title: string; publishedAt?: number | null }[] }).sources
    const referenceInventorySources = referenceInventory?.items ?? []
    const persistedOrStreamedSources = citedSources || sourcesFromAnnotation || messageSources || []
    const sourceExtractionText = citedText && citedText.trim().length > 0 ? citedText : content
    const legacyExtractedSources = isAssistant && persistedOrStreamedSources.length === 0
        ? extractLegacySourcesFromText(sourceExtractionText)
        : []
    const sources = referenceInventorySources.length > 0
        ? referenceInventorySources
        : persistedOrStreamedSources.length > 0
        ? persistedOrStreamedSources
        : legacyExtractedSources
    const sourcesWithUrls = sources.filter((source): source is ChatSource & { url: string } => {
        return typeof source.url === "string" && source.url.trim().length > 0
    })
    const hasArtifactSignals = isAssistant && artifactSignals.length > 0 && Boolean(onArtifactSelect)
    const hasSources = isAssistant && sources.length > 0
    const hasQuickActions = !isEditing && isAssistant && !persistProcessIndicators
    const rawDisplayText = citedText ?? content
    const streamedInternalThought = extractInternalThoughtData(message)
    const fallbackSplitContent = splitInternalThought(rawDisplayText)
    const internalThoughtContent = streamedInternalThought?.trim()
        ? streamedInternalThought.trim()
        : fallbackSplitContent.internalThoughtContent
    const publicDisplayTextRaw = streamedInternalThought?.trim()
        ? (fallbackSplitContent.publicContent || rawDisplayText)
        : (fallbackSplitContent.publicContent || rawDisplayText)
    // Strip unfenced plan-spec YAML that leaked through streaming (model didn't use code fences)
    const publicDisplayText = publicDisplayTextRaw
        ?.replace(/```plan-spec[\s\S]*?```/g, "")
        .replace(/(?:^|\n)stage:\s*\w+\s*\nsummary:\s*.+\ntasks:\s*\n(?:\s*-\s*label:\s*.+\n\s*status:\s*(?:complete|in-progress|pending)\s*\n?)+/g, "")
        .replace(/\n{3,}/g, "\n\n").trim()
    const normalizedLegacyCitedText = (() => {
        if (!isAssistant) return null
        if (sources.length === 0) return null
        if (!publicDisplayText || !publicDisplayText.trim()) return null

        const hasInlineUrls = /\bhttps?:\/\/[^\s<>()\[\]{}"']+/i.test(publicDisplayText)

        const hasMidLineCitationMarkers = publicDisplayText
            .split("\n")
            .some((line) => {
                const matches = Array.from(line.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g))
                if (matches.length === 0) return false
                return matches.some((match) => {
                    const index = typeof match.index === "number" ? match.index : -1
                    if (index < 0) return false
                    const after = line.slice(index + match[0].length).trim()
                    return after.length > 0
                })
            })

        const sourceHosts = Array.from(new Set(
            sourcesWithUrls
                .map((source) => {
                    try {
                        return new URL(source.url).hostname.replace(/^www\./i, "").toLowerCase()
                    } catch {
                        return source.url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").toLowerCase()
                    }
                })
                .filter((host) => host.length > 0 && host.includes("."))
        ))
        const hasInlineSourceHostMentions = sourceHosts.some((host) => {
            const escapedHost = host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            const hostRegex = new RegExp(
                `(^|[\\s([{\"'` + "`" + `])(?:www\\.)?${escapedHost}(?=$|[\\s)\\]}\"'` + "`" + `.,;:!?])`,
                "i"
            )
            return hostRegex.test(publicDisplayText)
        })

        if (!hasInlineUrls && !hasMidLineCitationMarkers && !hasInlineSourceHostMentions) return null

        return formatParagraphEndCitations({
            text: publicDisplayText,
            sources: sourcesWithUrls,
            anchors: [],
        })
    })()
    const isInlineReferenceInventory = !isPaperMode && referenceInventory?.responseMode === "reference_inventory"
    const referenceInventoryIntroText = (() => {
        if (!isInlineReferenceInventory || !referenceInventory) return null
        if (typeof referenceInventory.introText === "string" && referenceInventory.introText.trim().length > 0) {
            return referenceInventory.introText.trim()
        }
        if (citedText && citedText.trim().length > 0) {
            return citedText.trim()
        }
        return "Berikut inventaris referensi yang ditemukan."
    })()
    const displayMarkdown = referenceInventoryIntroText ?? normalizedLegacyCitedText ?? publicDisplayText
    const referenceInventoryItems = isInlineReferenceInventory && Array.isArray(referenceInventory?.items)
        ? referenceInventory.items
        : null
    const quickActionsContent = referenceInventoryItems && referenceInventoryItems.length > 0 && referenceInventoryIntroText
        ? buildReferenceInventoryQuickActionsContent({
            introText: referenceInventoryIntroText,
            items: referenceInventoryItems,
        })
        : (displayMarkdown || content)

    // Get timestamp from allMessages if available

    return (
        <div
            className={cn(
                "group relative mb-4",
                // User messages aligned to right with edit button outside
                isUser && "flex justify-end items-start gap-2"
            )}
        >
            {/* Action Buttons - Outside bubble, to the left (for user messages) */}
            {!isEditing && isUser && (() => {
                const actionBtnStyle: React.CSSProperties = { color: "var(--chat-muted-foreground)" }
                const copiedBtnStyle: React.CSSProperties = { color: "var(--chat-success)" }
                const actionBtnClass = "p-1.5 rounded-action transition-colors hover:bg-[color:var(--chat-accent)]"
                const actionIconClass = "h-4 w-4"
                return (
                <div className="flex flex-col items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity pt-2">
                    {onEdit && (
                        editPermission.allowed ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button onClick={startEditing} className={actionBtnClass} style={actionBtnStyle} aria-label="Edit message">
                                        <EditPencil className={actionIconClass} strokeWidth={2} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left">Edit</TooltipContent>
                            </Tooltip>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button disabled className={`${actionBtnClass} opacity-40 cursor-not-allowed`} style={actionBtnStyle} aria-label="Edit message" aria-disabled="true">
                                        <EditPencil className={actionIconClass} strokeWidth={2} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[250px]">
                                    <p>{editPermission.reason}</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    )}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleCopyUserMessage}
                                className={actionBtnClass}
                                style={isCopied ? copiedBtnStyle : actionBtnStyle}
                                aria-label="Copy message"
                            >
                                {isCopied ? <Check className={actionIconClass} strokeWidth={2} /> : <Copy className={actionIconClass} strokeWidth={2} />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="left">{isCopied ? "Copied" : "Copy"}</TooltipContent>
                    </Tooltip>
                </div>
                )
            })()}

            {/* Message Container - User: bubble on right, Agent: no bubble */}
            <div
                className={cn(
                    "relative",
                    // User: card style, max-width, text align left
                    isUser && [
                        "rounded-shell",
                        isEditing ? "bg-[var(--chat-card)]" : "bg-[var(--chat-muted)]",
                        "border border-[color:var(--chat-border)]",
                        "transition-colors",
                        "max-w-[85%]",
                        // Keep edit state wide for better readability and stable layout.
                        isEditing && "w-full",
                    ],
                    // Agent: no bubble, full width
                    isAssistant && "w-full"
                )}
            >
                {/* Inner content with padding */}
                <div className={cn(
                    isUser ? "px-4 py-3" : "py-1"
                )}>
                    {/*
                      * File attachments — unified thumbnail cards.
                      * Two iteration sources (non-image chips from fileIds
                      * metadata + native SDK image parts from message.parts)
                      * render into a single vertical stack. The `mt-0.5` on
                      * the wrapper below compensates for the glyph
                      * half-leading inside the first markdown paragraph,
                      * mirroring the `[&>*:first-child]:mt-0` reset in
                      * `MarkdownRenderer.tsx`; keep them in sync when either
                      * changes.
                      */}
                    {(() => {
                        const nonImageChips = shouldRenderAttachmentChips
                            ? fileIds
                                  .map((fid: string, idx: number) => {
                                      const fileMeta = fileMetaMap?.get(fid)
                                      const name = fileNames[idx] || fileMeta?.name || fileNameMap?.get(fid) || "file"
                                      const fileType = fileTypes[idx] || fileMeta?.type || ""
                                      const isImage = (fileType ? isImageType(fileType) : false) || /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
                                      if (isImage) return null
                                      const rawSize =
                                          typeof fileSizes[idx] === "number" && fileSizes[idx] > 0
                                              ? fileSizes[idx]
                                              : typeof fileMeta?.size === "number" && fileMeta.size > 0
                                                  ? fileMeta.size
                                                  : undefined
                                      return { key: fid, name, size: rawSize, mimeType: fileType }
                                  })
                                  .filter((x): x is { key: string; name: string; size: number | undefined; mimeType: string } => x !== null)
                            : []

                        const imageParts = isUser
                            ? (message.parts ?? [])
                                  .map((part, i) => {
                                      if (
                                          part.type === "file" &&
                                          "mediaType" in part &&
                                          typeof (part as Record<string, unknown>).mediaType === "string" &&
                                          ((part as Record<string, unknown>).mediaType as string).startsWith("image/")
                                      ) {
                                          const filePart = part as Record<string, unknown>
                                          return {
                                              key: `img-${i}`,
                                              name: (filePart.filename as string) ?? "attachment",
                                              mimeType: (filePart.mediaType as string) ?? "",
                                              imageUrl: filePart.url as string,
                                          }
                                      }
                                      return null
                                  })
                                  .filter((x): x is { key: string; name: string; mimeType: string; imageUrl: string } => x !== null)
                            : []

                        const totalAttachments = nonImageChips.length + imageParts.length
                        if (totalAttachments === 0) return null

                        return (
                            <div className="mt-0.5 mb-3 flex flex-col gap-2">
                                {nonImageChips.map((item) => (
                                    <MessageAttachment
                                        key={item.key}
                                        name={item.name}
                                        size={item.size}
                                        mimeType={item.mimeType}
                                    />
                                ))}
                                {imageParts.map((item) => (
                                    <MessageAttachment
                                        key={item.key}
                                        name={item.name}
                                        mimeType={item.mimeType}
                                        imageUrl={item.imageUrl}
                                    />
                                ))}
                            </div>
                        )
                    })()}

                    {showUnifiedCard && (
                        <div className="mb-4">
                            <UnifiedProcessCard
                                taskSummary={taskSummary}
                                processTools={visibleProcessTools}
                                searchStatus={searchStatus}
                                persistProcessIndicators={persistProcessIndicators}
                                isStreaming={persistProcessIndicators}
                                defaultOpen={false}
                            />
                        </div>
                    )}

                    {/* Message Content */}
                    {isEditing ? (
                        <div ref={editAreaRef} className="flex flex-col gap-1.5">
                            <textarea
                                ref={textareaRef}
                                value={editContent}
                                onChange={(e) => {
                                    setEditContent(e.target.value)
                                    e.target.style.height = 'auto'
                                    e.target.style.height = e.target.scrollHeight + 'px'
                                }}
                                onKeyDown={handleKeyDown}
                                className="w-full min-h-[1.5rem] resize-none overflow-hidden bg-transparent p-0 text-sm leading-relaxed text-[var(--chat-foreground)] focus-visible:outline-none"
                                rows={1}
                                aria-label="Edit message content"
                            />
                            <div className="mt-0.5 flex items-center justify-end gap-1.5">
                                <button
                                    onClick={handleCancel}
                                    className="flex h-7 items-center gap-1 rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-2.5 text-[11px] font-mono text-[var(--chat-secondary-foreground)] transition-colors hover:border-[color:var(--chat-border)] hover:bg-[var(--chat-accent)] hover:text-[var(--chat-card-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)]"
                                    aria-label="Batalkan edit"
                                >
                                    <Xmark className="h-3 w-3" /> Batal
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex h-7 items-center gap-1 rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-2.5 text-[11px] font-mono font-semibold text-[var(--chat-secondary-foreground)] transition-colors hover:border-[color:var(--chat-border)] hover:bg-[var(--chat-accent)] hover:text-[var(--chat-card-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)]"
                                    aria-label="Kirim pesan yang diedit"
                                >
                                    <Send className="h-3 w-3" /> Kirim
                                </button>
                            </div>
                        </div>
                    ) : autoUserAction ? (
                        autoUserAction.kind === "approved" ? (
                            <div className="rounded-action bg-[var(--chat-muted)] px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-[var(--chat-muted-foreground)]" />
                                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wide text-[var(--chat-foreground)]">
                                        Tahap disetujui
                                    </span>
                                </div>
                                <div className="mt-1 text-[10px] font-mono text-[var(--chat-muted-foreground)]">
                                    Lifecycle artifak: terkunci
                                </div>
                                <div className="mt-1.5 text-sm font-semibold text-[var(--chat-foreground)]">
                                    {autoUserAction.stageLabel}
                                </div>
                                <div className="mt-0.5 text-xs font-mono text-[var(--chat-foreground)]">
                                    {autoUserAction.followupText || "Lanjut ke tahap berikutnya."}
                                </div>
                            </div>
                        ) : autoUserAction.kind === "choice" ? (
                            <div className="rounded-action bg-[var(--chat-muted)] px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-[var(--chat-muted-foreground)]" />
                                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wide text-[var(--chat-foreground)]">
                                        Pilihan dikonfirmasi
                                    </span>
                                </div>
                                <div className="mt-1.5 text-sm font-semibold text-[var(--chat-foreground)]">
                                    {autoUserAction.selectedOption}
                                </div>
                                {autoUserAction.customNote && (
                                    <div className="mt-0.5 whitespace-pre-wrap text-xs font-mono leading-relaxed text-[var(--chat-foreground)]">
                                        {autoUserAction.customNote}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-action bg-[var(--chat-muted)] px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                    <EditPencil className="h-4 w-4 text-[var(--chat-muted-foreground)]" />
                                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wide text-[var(--chat-foreground)]">
                                        Permintaan revisi
                                    </span>
                                </div>
                                <div className="mt-1 text-[10px] font-mono text-[var(--chat-muted-foreground)]">
                                    Lifecycle artifak: perlu update
                                </div>
                                <div className="mt-1.5 text-sm font-semibold text-[var(--chat-foreground)]">
                                    {autoUserAction.stageLabel}
                                </div>
                                <div className="mt-0.5 whitespace-pre-wrap text-xs font-mono leading-relaxed text-[var(--chat-foreground)]">
                                    {autoUserAction.feedback || "Feedback revisi telah dikirim. Agen akan memperbarui artifak pada tahap ini."}
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="space-y-3">
                            {displayMarkdown.trim().length > 0 && (
                                <div data-testid={referenceInventoryIntroText ? "reference-inventory-body" : undefined}>
                                    <MarkdownRenderer
                                        markdown={displayMarkdown}
                                        className="space-y-2 text-sm leading-relaxed text-[var(--chat-foreground)]"
                                        sources={sourcesWithUrls}
                                        context="chat"
                                    />
                                </div>
                            )}
                            {referenceInventoryItems && referenceInventoryItems.length > 0 && (
                                <div className="space-y-2" aria-label="Inventaris referensi">
                                    {referenceInventoryItems.map((item, index) => (
                                        <div
                                            key={item.sourceId ?? `${item.title}-${index}`}
                                            className="rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-card)] px-3 py-2.5"
                                        >
                                            <div className="text-sm font-medium text-[var(--chat-foreground)]">
                                                {item.title}
                                            </div>
                                            <div className="mt-1 space-y-1 text-xs font-mono text-[var(--chat-muted-foreground)]">
                                                {typeof item.url === "string" && item.url.trim().length > 0 ? (
                                                    <a
                                                        href={item.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-block break-all text-[var(--chat-info)] underline-offset-2 hover:underline"
                                                    >
                                                        {item.url}
                                                    </a>
                                                ) : (
                                                    <div>URL tidak tersedia</div>
                                                )}
                                                <div>{getReferenceInventoryStatusLabel(item)}</div>
                                                {typeof item.note === "string" && item.note.trim().length > 0 && (
                                                    <div>{item.note.trim()}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {correctiveFindings && (
                                <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                        Sumber yang ditemukan:
                                    </p>
                                    <ul className="space-y-1">
                                        {correctiveFindings.sources?.map((s, i) => (
                                            <li key={i} className="text-sm">
                                                {s.url ? (
                                                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                        {s.title || s.url}
                                                    </a>
                                                ) : (
                                                    <span>{s.title || "Source"}</span>
                                                )}
                                                {s.citedText && (
                                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.citedText}</p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {isAssistant && internalThoughtContent.trim().length > 0 && (
                                <div
                                    className="border-y border-[color:var(--chat-border)] py-2 text-xs italic leading-relaxed text-[var(--chat-muted-foreground)]"
                                    data-testid="internal-thought-block"
                                >
                                    {internalThoughtContent}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Assistant follow-up blocks: artifact output -> sources -> choice card -> quick actions */}
                    {isAssistant && !isEditing && (hasArtifactSignals || hasSources || hasQuickActions || choiceSpec) && (
                        <div className="mt-3 space-y-3">
                            {hasArtifactSignals && (
                                <section className="space-y-2 pt-2" aria-label="Hasil artifak">
                                    {artifactSignals.map((artifact) => (
                                        onArtifactSelect ? (
                                            <ArtifactIndicator
                                                key={artifact.artifactId}
                                                artifactId={artifact.artifactId}
                                                title={artifact.title}
                                                status={artifact.status}
                                                version={artifact.version}
                                                onSelect={onArtifactSelect}
                                            />
                                        ) : null
                                    ))}
                                </section>
                            )}

                            {hasSources && (
                                <section aria-label="Sumber referensi">
                                    <SourcesIndicator sources={sources} onOpenSheet={onOpenSources} />
                                </section>
                            )}

                            {choiceSpec && choiceBlockPayload && (
                                <JsonRendererChoiceBlock
                                    key={`${message.id}-choice-block`}
                                    payload={choiceBlockPayload}
                                    isSubmitted={isChoiceSubmitted}
                                    onSubmit={
                                        onChoiceSubmit
                                            ? async ({ selectedOptionId, customText }) => {
                                                  await onChoiceSubmit?.({
                                                      sourceMessageId: message.id,
                                                      choicePartId: `${message.id}-choice-spec`,
                                                      payload: choiceBlockPayload,
                                                      selectedOptionId,
                                                      customText,
                                                  })
                                              }
                                            : undefined
                                    }
                                />
                            )}

                            {hasQuickActions && <QuickActions content={quickActionsContent} />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
