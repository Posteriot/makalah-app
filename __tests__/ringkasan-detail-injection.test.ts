import { describe, it, expect } from "vitest";

const DETAIL_WINDOW_SIZE = 3;

function getDetailStages(
  completedStages: string[],
  currentStage: string
): string[] {
  // Return last N completed stages for detail injection
  return completedStages.slice(-DETAIL_WINDOW_SIZE);
}

describe("ringkasanDetail selective injection", () => {
  it("should only inject detail for last 3 completed stages", () => {
    const completed = ["gagasan", "topik", "outline", "abstrak", "pendahuluan"];

    const detailStages = getDetailStages(completed, "tinjauan_literatur");

    expect(detailStages).toEqual(["outline", "abstrak", "pendahuluan"]);
    expect(detailStages).not.toContain("gagasan");
    expect(detailStages).not.toContain("topik");
  });

  it("should return all when fewer than 3 completed", () => {
    const completed = ["gagasan", "topik"];

    const detailStages = getDetailStages(completed, "outline");

    expect(detailStages).toEqual(["gagasan", "topik"]);
  });
});
