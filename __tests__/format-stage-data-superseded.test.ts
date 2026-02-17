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
});
