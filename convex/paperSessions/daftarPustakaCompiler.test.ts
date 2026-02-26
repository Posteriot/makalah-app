import { describe, expect, it } from "vitest";
import {
  compileDaftarPustakaFromStages,
  normalizeDoiForDedup,
  normalizeUrlForBibliographyDedup,
  type DaftarPustakaCompileStageInput,
} from "./daftarPustakaCompiler";

describe("daftarPustakaCompiler", () => {
  it("dedup berdasarkan normalized URL", () => {
    const stages: DaftarPustakaCompileStageInput[] = [
      {
        stage: "gagasan",
        validatedAt: 100,
        references: [
          { title: "Ref 1", url: "https://example.com/article?utm_source=abc" },
          { title: "Ref 2", url: "https://example.com/article#section" },
        ],
      },
    ];

    const result = compileDaftarPustakaFromStages({ stages });

    expect(result.compiled.totalCount).toBe(1);
    expect(result.compiled.duplicatesMerged).toBe(1);
    expect(result.compiled.entries[0]?.url).toBe("https://example.com/article");
  });

  it("dedup berdasarkan DOI", () => {
    const stages: DaftarPustakaCompileStageInput[] = [
      {
        stage: "topik",
        validatedAt: 100,
        references: [
          { title: "Doi Ref", doi: "https://doi.org/10.1000/xyz-123" },
          { title: "Doi Ref Duplicate", doi: "DOI:10.1000/xyz-123" },
        ],
      },
    ];

    const result = compileDaftarPustakaFromStages({ stages });

    expect(normalizeDoiForDedup("https://doi.org/10.1000/xyz-123")).toBe("10.1000/xyz-123");
    expect(result.compiled.totalCount).toBe(1);
    expect(result.compiled.duplicatesMerged).toBe(1);
    expect(result.compiled.entries[0]?.doi).toBe("10.1000/xyz-123");
  });

  it("dedup fallback title+authors+year ketika URL/DOI tidak ada", () => {
    const stages: DaftarPustakaCompileStageInput[] = [
      {
        stage: "pendahuluan",
        validatedAt: 100,
        references: [
          { title: "Machine Learning in Education", authors: "Supit", year: 2024 },
          { title: "Machine Learning in Education", authors: "Supit", year: 2024 },
        ],
      },
    ];

    const result = compileDaftarPustakaFromStages({ stages });

    expect(result.compiled.totalCount).toBe(1);
    expect(result.compiled.duplicatesMerged).toBe(1);
  });

  it("merge metadata memilih data lebih kaya saat duplikat", () => {
    const stages: DaftarPustakaCompileStageInput[] = [
      {
        stage: "tinjauan_literatur",
        validatedAt: 100,
        references: [
          { title: "Learning Science", url: "https://example.org/learning" },
          {
            title: "Learning Science",
            url: "https://example.org/learning?utm_campaign=test",
            authors: "Ryan & Deci",
            year: 2000,
            inTextCitation: "(Ryan & Deci, 2000)",
          },
        ],
      },
    ];

    const result = compileDaftarPustakaFromStages({ stages });
    const entry = result.compiled.entries[0];

    expect(result.compiled.totalCount).toBe(1);
    expect(entry?.authors).toBe("Ryan & Deci");
    expect(entry?.year).toBe(2000);
    expect(entry?.inTextCitation).toBe("(Ryan & Deci, 2000)");
    expect(entry?.url).toBe(normalizeUrlForBibliographyDedup("https://example.org/learning"));
  });

  it("hitung incompleteCount saat metadata minimum tidak memadai", () => {
    const stages: DaftarPustakaCompileStageInput[] = [
      {
        stage: "diskusi",
        validatedAt: 100,
        references: [
          { title: "Ref lengkap", url: "https://valid.example/ref" },
          { title: "Ref tidak lengkap" },
        ],
      },
    ];

    const result = compileDaftarPustakaFromStages({ stages });

    expect(result.compiled.totalCount).toBe(2);
    expect(result.compiled.incompleteCount).toBe(1);
    const incompleteEntry = result.compiled.entries.find((entry) => entry.title === "Ref tidak lengkap");
    expect(incompleteEntry?.isComplete).toBe(false);
  });

  it("skip stage invalidated/superseded dan stage belum validated", () => {
    const stages: DaftarPustakaCompileStageInput[] = [
      {
        stage: "gagasan",
        validatedAt: 100,
        references: [{ title: "Valid ref", url: "https://example.com/valid" }],
      },
      {
        stage: "topik",
        validatedAt: 90,
        invalidatedByRewind: true,
        references: [{ title: "Invalidated ref", url: "https://example.com/invalidated" }],
      },
      {
        stage: "outline",
        references: [{ title: "Draft ref", url: "https://example.com/draft" }],
      },
    ];

    const result = compileDaftarPustakaFromStages({ stages });

    expect(result.stats.approvedStageCount).toBe(1);
    expect(result.stats.skippedStageCount).toBe(2);
    expect(result.compiled.totalCount).toBe(1);
    expect(result.compiled.entries[0]?.title).toBe("Valid ref");
  });
});
