import { describe, it, expect } from "vitest";

const FIELD_CHAR_LIMIT = 2000;
const EXCLUDED_FIELDS = new Set([
    "ringkasan", "ringkasanDetail", "artifactId",
    "validatedAt", "revisionCount",
]);

function truncateStageDataFields(data: Record<string, unknown>): {
  truncated: Record<string, unknown>;
  warnings: string[];
} {
  const truncated = { ...data };
  const warnings: string[] = [];

  for (const [key, value] of Object.entries(truncated)) {
    if (typeof value !== "string") continue;
    if (EXCLUDED_FIELDS.has(key)) continue;

    if (value.length > FIELD_CHAR_LIMIT) {
      truncated[key] = value.slice(0, FIELD_CHAR_LIMIT);
      warnings.push(
        `Field '${key}' di-truncate dari ${value.length} ke ${FIELD_CHAR_LIMIT} karakter.`
      );
    }
  }

  return { truncated, warnings };
}

describe("truncateStageDataFields", () => {
  it("should truncate string fields exceeding 2000 chars", () => {
    const longText = "a".repeat(3000);
    const data = { analisis: longText, ideKasar: "short" };
    const { truncated, warnings } = truncateStageDataFields(data);
    expect((truncated.analisis as string).length).toBe(2000);
    expect(truncated.ideKasar).toBe("short");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("analisis");
  });

  it("should not truncate excluded fields like ringkasan", () => {
    const data = { ringkasan: "a".repeat(280) };
    const { truncated, warnings } = truncateStageDataFields(data);
    expect((truncated.ringkasan as string).length).toBe(280);
    expect(warnings).toHaveLength(0);
  });

  it("should not truncate non-string fields", () => {
    const data = {
      referensiAwal: [{ title: "A" }, { title: "B" }],
      revisionCount: 3,
    };
    const { truncated, warnings } = truncateStageDataFields(data);
    expect(truncated.referensiAwal).toEqual(data.referensiAwal);
    expect(warnings).toHaveLength(0);
  });

  it("should return empty warnings when nothing truncated", () => {
    const data = { ideKasar: "normal length" };
    const { warnings } = truncateStageDataFields(data);
    expect(warnings).toHaveLength(0);
  });
});
