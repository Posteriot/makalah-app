export type ArtifactSource = {
  url: string;
  title: string;
  publishedAt?: number;
};

export function hasValidArtifactSources(
  sources: ArtifactSource[] | undefined
): boolean {
  if (!Array.isArray(sources) || sources.length === 0) return false;
  return sources.every(
    (source) =>
      typeof source.url === "string" &&
      source.url.trim().length > 0 &&
      typeof source.title === "string" &&
      source.title.trim().length > 0
  );
}

export function enforceArtifactSourcesPolicy(params: {
  hasRecentSourcesInDb: boolean;
  sources: ArtifactSource[] | undefined;
  operation: "createArtifact" | "updateArtifact";
}): { allowed: boolean; error?: string } {
  if (!params.hasRecentSourcesInDb) {
    return { allowed: true };
  }

  if (hasValidArtifactSources(params.sources)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    error: `Parameter 'sources' wajib diisi untuk ${params.operation} karena tersedia AVAILABLE_WEB_SOURCES di percakapan ini.`,
  };
}

