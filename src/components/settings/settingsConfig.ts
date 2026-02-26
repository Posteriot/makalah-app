import {
  BadgeCheck,
  Shield,
  User as UserIcon,
} from "iconoir-react"
import type { ComponentType, SVGProps } from "react"

type IconoirIcon = ComponentType<SVGProps<SVGSVGElement>>

export interface SettingsSidebarItem {
  id: string
  label: string
  icon: IconoirIcon
  headerTitle: string
  headerDescription: string
}

export const SETTINGS_SIDEBAR_ITEMS: SettingsSidebarItem[] = [
  {
    id: "profile",
    label: "Profil",
    icon: UserIcon,
    headerTitle: "Profil",
    headerDescription: "Atur nama dan avatar akun Anda.",
  },
  {
    id: "security",
    label: "Keamanan",
    icon: Shield,
    headerTitle: "Keamanan",
    headerDescription: "Update password dan kontrol sesi.",
  },
  {
    id: "status",
    label: "Status Akun",
    icon: BadgeCheck,
    headerTitle: "Status Akun",
    headerDescription: "Ringkasan akses akun Anda di Makalah AI.",
  },
]

export type SettingsTabId = "profile" | "security" | "status"

const VALID_TABS: SettingsTabId[] = ["profile", "security", "status"]

export function resolveSettingsTab(tabParam: string | null): SettingsTabId {
  if (tabParam && VALID_TABS.includes(tabParam as SettingsTabId)) {
    return tabParam as SettingsTabId
  }
  return "profile"
}

export function findSettingsTabConfig(
  tabId: string
): SettingsSidebarItem | undefined {
  return SETTINGS_SIDEBAR_ITEMS.find((item) => item.id === tabId)
}
