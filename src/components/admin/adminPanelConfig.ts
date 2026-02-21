import {
  Computer,
  Dashboard,
  Group,
  Page,
  Cpu,
  EditPencil,
  StatsReport,
  DesignNib,
} from "iconoir-react"
import type { ComponentType, SVGProps } from "react"

type IconoirIcon = ComponentType<SVGProps<SVGSVGElement>>

export interface AdminSidebarItem {
  id: string
  label: string
  icon: IconoirIcon
  headerTitle: string
  headerDescription: string
  headerIcon: IconoirIcon
  /** External route link — renders as <Link> instead of tab button */
  href?: string
}

export const ADMIN_SIDEBAR_ITEMS: AdminSidebarItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: Dashboard,
    headerTitle: "Admin Panel",
    headerDescription: "Kelola pengguna dan lihat statistik aplikasi",
    headerIcon: Computer,
  },
  {
    id: "users",
    label: "User Management",
    icon: Group,
    headerTitle: "User Management",
    headerDescription: "Kelola pengguna dan hak akses",
    headerIcon: Group,
  },
  {
    id: "prompts",
    label: "System Prompts",
    icon: Page,
    headerTitle: "System Prompts",
    headerDescription: "Kelola system prompt untuk AI",
    headerIcon: Page,
  },
  {
    id: "providers",
    label: "AI Providers",
    icon: Cpu,
    headerTitle: "AI Providers",
    headerDescription: "Konfigurasi provider dan model AI",
    headerIcon: Cpu,
  },
  {
    id: "refrasa",
    label: "Refrasa",
    icon: EditPencil,
    headerTitle: "Refrasa",
    headerDescription: "Kelola style constitution untuk tool Refrasa",
    headerIcon: EditPencil,
  },
  {
    id: "stats",
    label: "Statistik",
    icon: StatsReport,
    headerTitle: "Statistik",
    headerDescription: "Lihat statistik penggunaan aplikasi",
    headerIcon: StatsReport,
  },
  {
    id: "cms",
    label: "Content Manager",
    icon: DesignNib,
    headerTitle: "Content Manager",
    headerDescription: "Kelola konten halaman marketing",
    headerIcon: DesignNib,
    href: "/cms",
  },
]

export type AdminTabId = (typeof ADMIN_SIDEBAR_ITEMS)[number]["id"]
