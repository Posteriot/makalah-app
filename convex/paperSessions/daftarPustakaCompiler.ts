export const DAFTAR_PUSTAKA_SOURCE_STAGES = [
  "gagasan",
  "topik",
  "outline",
  "abstrak",
  "pendahuluan",
  "tinjauan_literatur",
  "metodologi",
  "hasil",
  "diskusi",
  "kesimpulan",
] as const;

export interface DaftarPustakaCompileCandidate {
  title?: string;
  authors?: string;
  year?: number;
  url?: string;
  publishedAt?: number;
  doi?: string;
  inTextCitation?: string;
  fullReference?: string;
}

export interface DaftarPustakaCompileStageInput {
  stage: string;
  validatedAt?: number;
  invalidatedByRewind?: boolean;
  references: DaftarPustakaCompileCandidate[];
}

export interface DaftarPustakaCompiledEntry {
  title: string;
  authors?: string;
  year?: number;
  url?: string;
  publishedAt?: number;
  doi?: string;
  inTextCitation?: string;
  fullReference?: string;
  sourceStage?: string;
  isComplete?: boolean;
}

export interface DaftarPustakaCompileResult {
  compiled: {
    entries: DaftarPustakaCompiledEntry[];
    totalCount: number;
    incompleteCount: number;
    duplicatesMerged: number;
  };
  stats: {
    rawCount: number;
    approvedStageCount: number;
    skippedStageCount: number;
  };
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toCleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = compactWhitespace(value);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function normalizeUrlForBibliographyDedup(raw?: string): string | undefined {
  const clean = toCleanString(raw);
  if (!clean) return undefined;

  try {
    const u = new URL(clean);
    for (const key of Array.from(u.searchParams.keys())) {
      if (/^utm_/i.test(key)) u.searchParams.delete(key);
    }
    u.hash = "";
    const normalized = u.toString();
    return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  } catch {
    return clean;
  }
}

export function normalizeDoiForDedup(raw?: string): string | undefined {
  const clean = toCleanString(raw);
  if (!clean) return undefined;
  return clean
    .toLowerCase()
    .replace(/^https?:\/\/doi\.org\//, "")
    .replace(/^doi:\s*/i, "")
    .trim();
}

function normalizeKeyPart(value?: string): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\p{P}\p{S}]+/gu, "")
    .trim();
}

function ensurePeriod(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function extractYearFromText(value?: string): number | undefined {
  if (!value) return undefined;
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : undefined;
}

function deriveTitleFromUrl(raw?: string): string | undefined {
  const normalized = normalizeUrlForBibliographyDedup(raw);
  if (!normalized) return undefined;

  try {
    const url = new URL(normalized);
    const path = url.pathname.replace(/\/+$/, "");
    if (path && path !== "/") {
      const lastPart = path.split("/").filter(Boolean).at(-1);
      if (lastPart) {
        return lastPart
          .replace(/[-_]+/g, " ")
          .replace(/\.[a-z0-9]+$/i, "")
          .replace(/\b\w/g, (char) => char.toUpperCase());
      }
    }
    return url.hostname;
  } catch {
    return undefined;
  }
}

function pickBetterString(current?: string, incoming?: string): string | undefined {
  const a = toCleanString(current);
  const b = toCleanString(incoming);
  if (!a) return b;
  if (!b) return a;
  return b.length > a.length ? b : a;
}

function pickBetterNumber(current?: number, incoming?: number): number | undefined {
  if (typeof current === "number") return current;
  return typeof incoming === "number" ? incoming : undefined;
}

function isWeakInTextCitation(value?: string): boolean {
  const clean = toCleanString(value);
  if (!clean) return true;
  return /\(".*", n\.d\.\)/i.test(clean) || /\(unknown,\s*n\.d\.\)/i.test(clean);
}

function isWeakFullReference(value?: string): boolean {
  const clean = toCleanString(value);
  if (!clean) return true;
  return /unknown author/i.test(clean) || /\(n\.d\.\)/i.test(clean);
}

function extractPrimaryAuthorSurname(authors?: string): string | undefined {
  const value = toCleanString(authors);
  if (!value) return undefined;

  const firstAuthorChunk = value.split("&")[0]?.split(",")[0]?.trim();
  return firstAuthorChunk && firstAuthorChunk.length > 0 ? firstAuthorChunk : undefined;
}

function formatInTextCitation(entry: {
  authors?: string;
  year?: number;
  title: string;
}): string {
  const yearLabel = entry.year ? String(entry.year) : "n.d.";
  const surname = extractPrimaryAuthorSurname(entry.authors);

  if (surname) return `(${surname}, ${yearLabel})`;
  return `("${entry.title}", ${yearLabel})`;
}

function formatFullReference(entry: {
  title: string;
  authors?: string;
  year?: number;
  url?: string;
  doi?: string;
}): string {
  const authors = toCleanString(entry.authors) ?? "Unknown author";
  const yearLabel = entry.year ? String(entry.year) : "n.d.";
  const title = ensurePeriod(entry.title);
  const normalizedDoi = normalizeDoiForDedup(entry.doi);

  if (normalizedDoi) {
    return `${authors} (${yearLabel}). ${title} https://doi.org/${normalizedDoi}`;
  }

  const url = normalizeUrlForBibliographyDedup(entry.url);
  if (url) {
    return `${authors} (${yearLabel}). ${title} ${url}`;
  }

  return `${authors} (${yearLabel}). ${title}`;
}

function isCompleteEntry(entry: {
  authors?: string;
  year?: number;
  url?: string;
  doi?: string;
}): boolean {
  const hasAuthorYear = Boolean(toCleanString(entry.authors)) && typeof entry.year === "number";
  const hasLocator = Boolean(normalizeUrlForBibliographyDedup(entry.url) || normalizeDoiForDedup(entry.doi));
  return hasAuthorYear || hasLocator;
}

function buildDedupKey(entry: {
  title: string;
  authors?: string;
  year?: number;
  url?: string;
  doi?: string;
}): string {
  const normalizedUrl = normalizeUrlForBibliographyDedup(entry.url);
  if (normalizedUrl) return `url:${normalizedUrl}`;

  const normalizedDoi = normalizeDoiForDedup(entry.doi);
  if (normalizedDoi) return `doi:${normalizedDoi}`;

  const normalizedTitle = normalizeKeyPart(entry.title);
  const normalizedAuthors = normalizeKeyPart(entry.authors);
  const normalizedYear = typeof entry.year === "number" ? String(entry.year) : "n.d.";
  return `meta:${normalizedTitle}|${normalizedAuthors}|${normalizedYear}`;
}

function normalizeCandidate(candidate: DaftarPustakaCompileCandidate): Omit<DaftarPustakaCompiledEntry, "sourceStage" | "isComplete"> {
  const titleFromCandidate = toCleanString(candidate.title);
  const titleFromFullReference = toCleanString(candidate.fullReference);
  const titleFromUrl = deriveTitleFromUrl(candidate.url);
  const title = titleFromCandidate ?? titleFromFullReference ?? titleFromUrl ?? "Untitled source";

  const yearFromCandidate = typeof candidate.year === "number"
    ? candidate.year
    : extractYearFromText(candidate.fullReference);

  const normalized: Omit<DaftarPustakaCompiledEntry, "sourceStage" | "isComplete"> = {
    title,
    ...(toCleanString(candidate.authors) ? { authors: toCleanString(candidate.authors) } : {}),
    ...(typeof yearFromCandidate === "number" ? { year: yearFromCandidate } : {}),
    ...(normalizeUrlForBibliographyDedup(candidate.url) ? { url: normalizeUrlForBibliographyDedup(candidate.url) } : {}),
    ...(typeof candidate.publishedAt === "number" ? { publishedAt: candidate.publishedAt } : {}),
    ...(normalizeDoiForDedup(candidate.doi) ? { doi: normalizeDoiForDedup(candidate.doi) } : {}),
    ...(toCleanString(candidate.inTextCitation) ? { inTextCitation: toCleanString(candidate.inTextCitation) } : {}),
    ...(toCleanString(candidate.fullReference) ? { fullReference: toCleanString(candidate.fullReference) } : {}),
  };

  if (!normalized.inTextCitation) {
    normalized.inTextCitation = formatInTextCitation({
      authors: normalized.authors,
      year: normalized.year,
      title: normalized.title,
    });
  }

  if (!normalized.fullReference) {
    normalized.fullReference = formatFullReference({
      title: normalized.title,
      authors: normalized.authors,
      year: normalized.year,
      url: normalized.url,
      doi: normalized.doi,
    });
  }

  return normalized;
}

interface EntryAccumulator {
  entry: Omit<DaftarPustakaCompiledEntry, "sourceStage" | "isComplete">;
  sourceStages: Set<string>;
}

function mergeEntry(existing: EntryAccumulator, incoming: Omit<DaftarPustakaCompiledEntry, "sourceStage" | "isComplete">, stage: string): EntryAccumulator {
  const mergedInTextCitation = (() => {
    const current = toCleanString(existing.entry.inTextCitation);
    const next = toCleanString(incoming.inTextCitation);
    if (!current) return next;
    if (!next) return current;
    if (isWeakInTextCitation(current) && !isWeakInTextCitation(next)) return next;
    return pickBetterString(current, next);
  })();

  const mergedFullReference = (() => {
    const current = toCleanString(existing.entry.fullReference);
    const next = toCleanString(incoming.fullReference);
    if (!current) return next;
    if (!next) return current;
    if (isWeakFullReference(current) && !isWeakFullReference(next)) return next;
    return pickBetterString(current, next);
  })();

  existing.entry = {
    title: pickBetterString(existing.entry.title, incoming.title) ?? existing.entry.title,
    authors: pickBetterString(existing.entry.authors, incoming.authors),
    year: pickBetterNumber(existing.entry.year, incoming.year),
    url: pickBetterString(existing.entry.url, incoming.url),
    publishedAt: pickBetterNumber(existing.entry.publishedAt, incoming.publishedAt),
    doi: pickBetterString(existing.entry.doi, incoming.doi),
    inTextCitation: mergedInTextCitation,
    fullReference: mergedFullReference,
  };

  if (!existing.entry.inTextCitation) {
    existing.entry.inTextCitation = formatInTextCitation({
      authors: existing.entry.authors,
      year: existing.entry.year,
      title: existing.entry.title,
    });
  }

  if (!existing.entry.fullReference) {
    existing.entry.fullReference = formatFullReference({
      title: existing.entry.title,
      authors: existing.entry.authors,
      year: existing.entry.year,
      url: existing.entry.url,
      doi: existing.entry.doi,
    });
  }

  existing.sourceStages.add(stage);
  return existing;
}

export function compileDaftarPustakaFromStages(input: {
  stages: DaftarPustakaCompileStageInput[];
}): DaftarPustakaCompileResult {
  const eligibleStages = input.stages.filter(
    (stage) => Boolean(stage.validatedAt) && !stage.invalidatedByRewind
  );

  const skippedStageCount = input.stages.length - eligibleStages.length;

  const rawReferences = eligibleStages.flatMap((stage) =>
    stage.references.map((candidate) => ({
      stage: stage.stage,
      candidate,
    }))
  );

  const dedupedMap = new Map<string, EntryAccumulator>();

  for (const item of rawReferences) {
    const normalized = normalizeCandidate(item.candidate);
    const dedupKey = buildDedupKey(normalized);
    const existing = dedupedMap.get(dedupKey);

    if (!existing) {
      dedupedMap.set(dedupKey, {
        entry: normalized,
        sourceStages: new Set([item.stage]),
      });
      continue;
    }

    dedupedMap.set(dedupKey, mergeEntry(existing, normalized, item.stage));
  }

  const entries = Array.from(dedupedMap.values())
    .map((value): DaftarPustakaCompiledEntry => {
      const sourceStages = Array.from(value.sourceStages).sort();
      const entry: DaftarPustakaCompiledEntry = {
        ...value.entry,
        ...(sourceStages.length > 0 ? { sourceStage: sourceStages.join(",") } : {}),
      };

      entry.isComplete = isCompleteEntry({
        authors: entry.authors,
        year: entry.year,
        url: entry.url,
        doi: entry.doi,
      });

      return entry;
    })
    .sort((a, b) => {
      const aKey = (a.fullReference ?? a.title).toLowerCase();
      const bKey = (b.fullReference ?? b.title).toLowerCase();
      return aKey.localeCompare(bKey);
    });

  const rawCount = rawReferences.length;
  const duplicatesMerged = Math.max(rawCount - entries.length, 0);
  const incompleteCount = entries.filter((entry) => entry.isComplete === false).length;

  return {
    compiled: {
      entries,
      totalCount: entries.length,
      incompleteCount,
      duplicatesMerged,
    },
    stats: {
      rawCount,
      approvedStageCount: eligibleStages.length,
      skippedStageCount,
    },
  };
}
