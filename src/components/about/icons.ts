import { Mail, Suitcase } from "iconoir-react"

export const ICON_MAP = {
  Briefcase: Suitcase,
  Mail,
} as const

export type IconName = keyof typeof ICON_MAP

export function getIcon(iconName: IconName) {
  return ICON_MAP[iconName]
}
