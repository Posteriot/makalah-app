import { Mail, Suitcase } from "iconoir-react"

const ICON_MAP = {
  Briefcase: Suitcase,
  Mail,
} as const

type IconName = keyof typeof ICON_MAP

export function getIcon(iconName: IconName) {
  return ICON_MAP[iconName]
}
