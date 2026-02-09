export type DocListItem = {
  text: string
  subItems?: string[]
}

export type DocList = {
  variant: "bullet" | "numbered"
  items: DocListItem[]
}

export type DocBlock =
  | {
    type: "infoCard"
    title: string
    description?: string
    items: string[]
  }
  | {
    type: "ctaCards"
    items: Array<{
      title: string
      description: string
      targetSection: string
      ctaText: string
      icon?: string
    }>
  }
  | {
    type: "section"
    title: string
    description?: string
    paragraphs?: string[]
    list?: DocList
  }

export type DocumentationSection = {
  _id: string
  slug: string
  title: string
  group: string
  order: number
  icon?: string
  headerIcon?: string
  summary?: string
  blocks: DocBlock[]
  searchText: string
}

export type SearchRecord = {
  id: string
  title: string
  text: string
  stemTitle: string
  stemText: string
}

export type NavigationGroup = {
  title: string
  items: DocumentationSection[]
}
