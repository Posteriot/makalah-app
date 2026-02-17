import { describe, it, expect } from "vitest";

const ARTIFACT_SUMMARY_CHAR_LIMIT = 500;

function formatArtifactSummary(
  artifactContent: string,
  stageLabel: string
): string {
  const truncated = artifactContent.length > ARTIFACT_SUMMARY_CHAR_LIMIT
    ? artifactContent.slice(0, ARTIFACT_SUMMARY_CHAR_LIMIT) + "..."
    : artifactContent;
  return `- [${stageLabel}] "${truncated}"`;
}

function formatArtifactSummaries(
  artifacts: Array<{ stageLabel: string; content: string }>
): string {
  if (artifacts.length === 0) return "";

  const summaries = artifacts
    .map((a) => formatArtifactSummary(a.content, a.stageLabel));

  return `RINGKASAN ARTIFACT TAHAP SELESAI:\n${summaries.join("\n")}`;
}

describe("formatArtifactSummaries", () => {
  it("should format artifacts with stage labels", () => {
    const artifacts = [
      { stageLabel: "Gagasan Paper", content: "Ide tentang AI pendidikan" },
      { stageLabel: "Menyusun Outline", content: "BAB 1: Pendahuluan" },
    ];

    const result = formatArtifactSummaries(artifacts);

    expect(result).toContain("RINGKASAN ARTIFACT TAHAP SELESAI:");
    expect(result).toContain("[Gagasan Paper]");
    expect(result).toContain("[Menyusun Outline]");
  });

  it("should truncate long content to 500 chars", () => {
    const longContent = "x".repeat(800);
    const artifacts = [
      { stageLabel: "Abstrak", content: longContent },
    ];

    const result = formatArtifactSummaries(artifacts);

    expect(result).not.toContain("x".repeat(501));
    expect(result).toContain("...");
  });

  it("should return empty string for no artifacts", () => {
    const result = formatArtifactSummaries([]);
    expect(result).toBe("");
  });
});
