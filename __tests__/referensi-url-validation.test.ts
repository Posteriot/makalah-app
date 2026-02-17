import { describe, it, expect } from "vitest";

// Test the validation logic in isolation
function validateReferensiUrls(data: Record<string, unknown>): {
  missingUrlCount: number;
  totalCount: number;
  field: string;
} | null {
  const referensiFields = [
    "referensiAwal", "referensiPendukung", "referensi",
    "sitasiAPA", "sitasiTambahan"
  ];

  for (const field of referensiFields) {
    if (Array.isArray(data[field])) {
      const items = data[field] as Array<Record<string, unknown>>;
      const total = items.length;
      const missingUrl = items.filter(
        (item) => !item.url || (typeof item.url === "string" && item.url.trim() === "")
      ).length;

      if (missingUrl > 0) {
        return { missingUrlCount: missingUrl, totalCount: total, field };
      }
    }
  }
  return null;
}

describe("validateReferensiUrls", () => {
  it("should detect referensi without URL", () => {
    const data = {
      referensiAwal: [
        { title: "Paper A", url: "https://example.com", year: 2024 },
        { title: "Paper B hallucinated", year: 2023 },
      ],
    };
    const result = validateReferensiUrls(data);
    expect(result).not.toBeNull();
    expect(result!.missingUrlCount).toBe(1);
    expect(result!.totalCount).toBe(2);
  });

  it("should pass when all referensi have URLs", () => {
    const data = {
      referensiAwal: [
        { title: "Paper A", url: "https://example.com" },
        { title: "Paper B", url: "https://other.com" },
      ],
    };
    const result = validateReferensiUrls(data);
    expect(result).toBeNull();
  });

  it("should detect empty string URL as missing", () => {
    const data = {
      referensiPendukung: [
        { title: "Paper C", url: "" },
      ],
    };
    const result = validateReferensiUrls(data);
    expect(result).not.toBeNull();
    expect(result!.missingUrlCount).toBe(1);
  });

  it("should check sitasiAPA and sitasiTambahan fields too", () => {
    const data = {
      sitasiAPA: [
        { inTextCitation: "(Smith, 2024)", fullReference: "Smith...", url: "" },
      ],
    };
    const result = validateReferensiUrls(data);
    expect(result).not.toBeNull();
  });

  it("should return null for non-referensi data", () => {
    const data = {
      ideKasar: "Some idea",
      analisis: "Some analysis",
    };
    const result = validateReferensiUrls(data);
    expect(result).toBeNull();
  });
});
