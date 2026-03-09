export type DomainTier =
  | "academic"
  | "institutional"
  | "news-major"
  | "news-local"
  | "unknown"
  | "blocked"

export const BASE_SCORES: Record<DomainTier, number> = {
  academic: 90,
  institutional: 80,
  "news-major": 70,
  "news-local": 50,
  unknown: 40,
  blocked: 0,
}

export const MIN_QUALITY_SCORE = 30

export const ACADEMIC_DOMAINS = [
  "scholar.google.com",
  "pubmed.ncbi.nlm.nih.gov",
  "arxiv.org",
  "jstor.org",
  "researchgate.net",
  "semanticscholar.org",
  "sciencedirect.com",
  "springer.com",
  "nature.com",
  "wiley.com",
  "ieee.org",
  "acm.org",
  "plos.org",
  "doi.org",
]

export const INSTITUTIONAL_DOMAINS = [
  "who.int",
  "worldbank.org",
  "un.org",
  "imf.org",
  "oecd.org",
  "bps.go.id",
  "bi.go.id",
]

export const MAJOR_NEWS_DOMAINS = [
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "nytimes.com",
  "theguardian.com",
  "washingtonpost.com",
  "ft.com",
  "bloomberg.com",
  "economist.com",
  "kompas.com",
  "tempo.co",
  "cnnindonesia.com",
]
