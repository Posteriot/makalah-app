import {
  Activity,
  Brain,
  Code,
  Dashboard,
  List,
  Page,
  StatsReport,
  Timer,
  WarningTriangle,
} from "iconoir-react"
import type { ComponentType, SVGProps } from "react"

type IconoirIcon = ComponentType<SVGProps<SVGSVGElement>>

export interface AiOpsSidebarChild {
  id: string
  label: string
  icon: IconoirIcon
  headerTitle: string
  headerDescription: string
  headerIcon: IconoirIcon
}

export interface AiOpsSidebarItem {
  id: string
  label: string
  icon: IconoirIcon
  headerTitle: string
  headerDescription: string
  headerIcon: IconoirIcon
  children?: AiOpsSidebarChild[]
  defaultChildId?: string
}

export const AI_OPS_SIDEBAR_ITEMS: AiOpsSidebarItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: Dashboard,
    headerTitle: "AI Ops Dashboard",
    headerDescription: "Ringkasan kesehatan paper workflow dan model AI",
    headerIcon: Dashboard,
  },
  {
    id: "paper",
    label: "Paper Workflow",
    icon: Page,
    headerTitle: "Paper Workflow",
    headerDescription: "Observability paper sessions, memory, dan artefak",
    headerIcon: Page,
    defaultChildId: "paper.sessions",
    children: [
      {
        id: "paper.sessions",
        label: "Sesi",
        icon: List,
        headerTitle: "Sesi Paper",
        headerDescription: "Daftar sesi paper workflow dan detail per sesi",
        headerIcon: List,
      },
      {
        id: "paper.memory",
        label: "Memory",
        icon: Brain,
        headerTitle: "Memory Health",
        headerDescription: "Kesehatan memory digest dan dropped keys",
        headerIcon: Brain,
      },
      {
        id: "paper.artifacts",
        label: "Artefak",
        icon: Code,
        headerTitle: "Artifact Sync",
        headerDescription: "Status sinkronisasi artefak paper",
        headerIcon: Code,
      },
    ],
  },
  {
    id: "model",
    label: "Model Health",
    icon: Activity,
    headerTitle: "Model Health",
    headerDescription: "Monitoring kesehatan provider AI, tool, dan latensi",
    headerIcon: Activity,
    defaultChildId: "model.overview",
    children: [
      {
        id: "model.overview",
        label: "Ringkasan",
        icon: StatsReport,
        headerTitle: "Ringkasan Model",
        headerDescription: "Overview stats dan kesehatan per provider",
        headerIcon: StatsReport,
      },
      {
        id: "model.tools",
        label: "Tool & Latensi",
        icon: Timer,
        headerTitle: "Tool & Latensi",
        headerDescription: "Kesehatan per tool dan distribusi latensi",
        headerIcon: Timer,
      },
      {
        id: "model.failures",
        label: "Kegagalan",
        icon: WarningTriangle,
        headerTitle: "Kegagalan & Failover",
        headerDescription: "Riwayat kegagalan dan timeline perpindahan server",
        headerIcon: WarningTriangle,
      },
    ],
  },
]

export type AiOpsTabId =
  | "overview"
  | "paper.sessions"
  | "paper.memory"
  | "paper.artifacts"
  | "model.overview"
  | "model.tools"
  | "model.failures"

export function findAiOpsTabConfig(
  tabId: string
): AiOpsSidebarItem | AiOpsSidebarChild | undefined {
  for (const item of AI_OPS_SIDEBAR_ITEMS) {
    if (item.id === tabId) return item
    if (item.children) {
      const child = item.children.find((c) => c.id === tabId)
      if (child) return child
    }
  }
  return undefined
}

export function resolveAiOpsTabId(tabId: string): AiOpsTabId {
  const item = AI_OPS_SIDEBAR_ITEMS.find((i) => i.id === tabId)
  if (item?.defaultChildId) {
    return item.defaultChildId as AiOpsTabId
  }
  return tabId as AiOpsTabId
}
