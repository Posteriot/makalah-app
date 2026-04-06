import { describe, it, expect } from "vitest";
import { formatStageData, type StageData } from "@/lib/ai/paper-stages/formatStageData";

describe("formatStageData - superseded digest filtering", () => {
  it("should cap active stage webSearchReferences to 5 items", () => {
    const webSearchReferences = Array.from({ length: 7 }, (_, i) => ({
      title: `Ref-${i + 1}`,
      url: `https://example.com/ref-${i + 1}`,
      publishedAt: Date.UTC(2024, 0, i + 1),
    }));

    const result = formatStageData(
      {
        topik: {
          definitif: "Topik AI pendidikan",
          webSearchReferences,
        },
      } as StageData,
      "topik"
    );

    expect(result).toContain(`"Ref-1"`);
    expect(result).toContain(`"Ref-5"`);
    expect(result).not.toContain(`"Ref-6"`);
    expect(result).toContain("and 2 more references");
  });

  it("should cap sitasiAPA to 5 and preserve URL visibility", () => {
    const sitasiAPA = Array.from({ length: 7 }, (_, i) => ({
      inTextCitation: `(Author${i + 1}, 2024)`,
      fullReference: `Author${i + 1}. (2024). Title ${i + 1}.`,
      url: `https://example.com/cite-${i + 1}`,
    }));

    const result = formatStageData(
      {
        pendahuluan: {
          latarBelakang: "Latar belakang penelitian",
          sitasiAPA,
        },
      } as StageData,
      "pendahuluan"
    );

    expect(result).toContain("Citations (showing 5/7)");
    expect(result).toContain("https://example.com/cite-1");
    expect(result).toContain("https://example.com/cite-5");
    expect(result).not.toContain("https://example.com/cite-6");
    expect(result).toContain("and 2 more citations");
  });
});
