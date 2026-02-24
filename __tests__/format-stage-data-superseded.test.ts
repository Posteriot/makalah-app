import { describe, it, expect } from "vitest";
import { formatStageData } from "@/lib/ai/paper-stages/formatStageData";

describe("formatStageData - superseded digest filtering", () => {
  it("should exclude superseded entries from ringkasan output", () => {
    const stageData = {
      gagasan: {
        ringkasan: "Ide tentang AI pendidikan",
        validatedAt: 1000,
      },
      topik: {
        ringkasan: "Topik lama yang di-rewind",
        validatedAt: 2000,
        superseded: true,
      },
    };

    const result = formatStageData(stageData as any, "outline");

    expect(result).toContain("Ide tentang AI pendidikan");
    expect(result).not.toContain("Topik lama yang di-rewind");
  });

  it("should include non-superseded entries normally", () => {
    const stageData = {
      gagasan: {
        ringkasan: "Ide final",
        validatedAt: 1000,
      },
      topik: {
        ringkasan: "Topik definitif",
        validatedAt: 3000,
      },
    };

    const result = formatStageData(stageData as any, "outline");

    expect(result).toContain("Ide final");
    expect(result).toContain("Topik definitif");
  });

  it("should cap active stage webSearchReferences to 5 items", () => {
    const webSearchReferences = Array.from({ length: 7 }, (_, i) => ({
      title: `Ref-${i + 1}`,
      url: `https://example.com/ref-${i + 1}`,
      publishedAt: Date.UTC(2024, 0, i + 1),
    }));

    const result = formatStageData(
      {
        topik: {
          ringkasan: "Topik aktif",
          definitif: "Topik AI pendidikan",
          webSearchReferences,
        },
      } as any,
      "topik"
    );

    expect(result).toContain(`"Ref-1"`);
    expect(result).toContain(`"Ref-5"`);
    expect(result).not.toContain(`"Ref-6"`);
    expect(result).toContain("... dan 2 referensi lainnya");
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
          ringkasan: "Pendahuluan aktif",
          latarBelakang: "Latar belakang penelitian",
          sitasiAPA,
        },
      } as any,
      "pendahuluan"
    );

    expect(result).toContain("Daftar Sitasi (ditampilkan 5/7)");
    expect(result).toContain("https://example.com/cite-1");
    expect(result).toContain("https://example.com/cite-5");
    expect(result).not.toContain("https://example.com/cite-6");
    expect(result).toContain("... dan 2 sitasi lainnya");
  });

  it("should inject ringkasanDetail only for the last 3 completed stages", () => {
    const result = formatStageData(
      {
        gagasan: {
          ringkasan: "Ringkasan gagasan",
          ringkasanDetail: "DETAIL_GAGASAN",
          validatedAt: 1,
        },
        topik: {
          ringkasan: "Ringkasan topik",
          ringkasanDetail: "DETAIL_TOPIK",
          validatedAt: 2,
        },
        outline: {
          ringkasan: "Ringkasan outline",
          ringkasanDetail: "DETAIL_OUTLINE",
          validatedAt: 3,
        },
        abstrak: {
          ringkasan: "Ringkasan abstrak",
          ringkasanDetail: "DETAIL_ABSTRAK",
          validatedAt: 4,
        },
        pendahuluan: {
          ringkasan: "Ringkasan pendahuluan",
          ringkasanDetail: "DETAIL_PENDAHULUAN",
          validatedAt: 5,
        },
      } as any,
      "tinjauan_literatur"
    );

    expect(result).toContain("DETAIL_OUTLINE");
    expect(result).toContain("DETAIL_ABSTRAK");
    expect(result).toContain("DETAIL_PENDAHULUAN");
    expect(result).not.toContain("DETAIL_GAGASAN");
    expect(result).not.toContain("DETAIL_TOPIK");
  });
});
