import {
  Computer,
  Dashboard,
  Group,
  Page,
  Cpu,
  EditPencil,
  CreditCard,
  Mail,
  StatsReport,
  DesignNib,
  Clock,
  List,
  Settings,
  WarningCircle,
} from "iconoir-react"
import type { ComponentType, SVGProps } from "react"

type IconoirIcon = ComponentType<SVGProps<SVGSVGElement>>

export interface AdminSidebarChild {
  id: string
  label: string
  icon: IconoirIcon
  headerTitle: string
  headerDescription: string
  headerIcon: IconoirIcon
}

export interface AdminSidebarItem {
  id: string
  label: string
  icon: IconoirIcon
  headerTitle: string
  headerDescription: string
  headerIcon: IconoirIcon
  /** External route link — renders as <Link> instead of tab button */
  href?: string
  /** Sub-items rendered under parent when active */
  children?: AdminSidebarChild[]
  /** Default child to navigate to when parent is clicked */
  defaultChildId?: string
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
    id: "stage-skills",
    label: "Stage Skills",
    icon: Page,
    headerTitle: "Stage Skills",
    headerDescription: "Kelola skill prompt per stage paper workflow",
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
    id: "payment",
    label: "Payment Provider",
    icon: CreditCard,
    headerTitle: "Payment Provider",
    headerDescription: "Kelola pengaturan Xendit dan metode pembayaran checkout",
    headerIcon: CreditCard,
  },
  {
    id: "waitlist",
    label: "Waitlist",
    icon: Clock,
    headerTitle: "Waiting List",
    headerDescription: "Kelola pendaftar waiting list dan kirim undangan",
    headerIcon: Clock,
    defaultChildId: "waitlist.entries",
    children: [
      {
        id: "waitlist.entries",
        label: "Daftar Tunggu",
        icon: List,
        headerTitle: "Daftar Tunggu",
        headerDescription: "Kelola pendaftar waiting list dan kirim undangan",
        headerIcon: List,
      },
      {
        id: "waitlist.settings",
        label: "Pengaturan",
        icon: Settings,
        headerTitle: "Pengaturan Waitlist",
        headerDescription: "Konfigurasi mode waitlist dan teks tampilan",
        headerIcon: Settings,
      },
    ],
  },
  {
    id: "technical-report",
    label: "Technical Report",
    icon: WarningCircle,
    headerTitle: "Technical Report",
    headerDescription: "Kelola laporan teknis chat dari user",
    headerIcon: WarningCircle,
  },
  {
    id: "email-templates",
    label: "Email Templates",
    icon: Mail,
    headerTitle: "Email Templates",
    headerDescription: "Kelola template email yang dikirim ke pengguna",
    headerIcon: Mail,
    defaultChildId: "email-templates.brand",
    children: [
      {
        id: "email-templates.brand",
        label: "Brand Settings",
        icon: Settings,
        headerTitle: "Email Brand Settings",
        headerDescription: "Atur branding global untuk semua email",
        headerIcon: Settings,
      },
      {
        id: "email-templates.auth",
        label: "Auth Emails",
        icon: Mail,
        headerTitle: "Auth Emails",
        headerDescription: "Template email autentikasi (verifikasi, magic link, 2FA, dll)",
        headerIcon: Mail,
      },
      {
        id: "email-templates.payment",
        label: "Payment Emails",
        icon: CreditCard,
        headerTitle: "Payment Emails",
        headerDescription: "Template email pembayaran berhasil dan gagal",
        headerIcon: CreditCard,
      },
      {
        id: "email-templates.notification",
        label: "Notification Emails",
        icon: WarningCircle,
        headerTitle: "Notification Emails",
        headerDescription: "Template email notifikasi (waitlist, technical report)",
        headerIcon: WarningCircle,
      },
    ],
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

/** All valid tab IDs including child IDs */
export type AdminTabId =
  | "overview"
  | "users"
  | "prompts"
  | "stage-skills"
  | "providers"
  | "refrasa"
  | "payment"
  | "waitlist"
  | "waitlist.entries"
  | "waitlist.settings"
  | "technical-report"
  | "email-templates"
  | "email-templates.brand"
  | "email-templates.auth"
  | "email-templates.payment"
  | "email-templates.notification"
  | "stats"
  | "cms"

/**
 * Find tab config by ID — searches both top-level items and children.
 * Returns the matching item/child config or undefined.
 */
export function findTabConfig(
  tabId: string
): AdminSidebarItem | AdminSidebarChild | undefined {
  for (const item of ADMIN_SIDEBAR_ITEMS) {
    if (item.id === tabId) return item
    if (item.children) {
      const child = item.children.find((c) => c.id === tabId)
      if (child) return child
    }
  }
  return undefined
}

/**
 * Resolve parent tab IDs to their default child.
 * e.g. "waitlist" → "waitlist.entries" (backward compat)
 */
export function resolveTabId(tabId: string): AdminTabId {
  const item = ADMIN_SIDEBAR_ITEMS.find((i) => i.id === tabId)
  if (item?.defaultChildId) {
    return item.defaultChildId as AdminTabId
  }
  return tabId as AdminTabId
}
