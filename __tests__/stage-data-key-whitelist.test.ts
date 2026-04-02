import { describe, expect, it } from "vitest";

import {
  STAGE_KEY_WHITELIST,
  validateStageDataKeys,
} from "../convex/paperSessions/stageDataWhitelist";

describe("validateStageDataKeys (W4 — Dropped Keys)", () => {
  it("returns empty array when all keys are valid", () => {
    const data = { ideKasar: "ide", analisis: "ok" };
    const result = validateStageDataKeys("gagasan", data);
    expect(result).toEqual([]);
  });

  it("detects unknown keys", () => {
    const data = {
      ideKasar: "ide",
      unknownField: "should be dropped",
      anotherBadKey: 42,
    };
    const result = validateStageDataKeys("gagasan", data);
    expect(result).toEqual(["unknownField", "anotherBadKey"]);
  });

  it("returns empty array for unknown stage so other guards can handle it", () => {
    const data = { anything: "goes" };
    const result = validateStageDataKeys("nonexistent_stage", data);
    expect(result).toEqual([]);
  });

  it("validates keys per stage correctly", () => {
    const data = { definitif: "topik definitif" };
    expect(validateStageDataKeys("topik", data)).toEqual([]);
    expect(validateStageDataKeys("gagasan", data)).toEqual(["definitif"]);
  });

  it("allows common operational fields across all stages", () => {
    const commonFields = {
      webSearchReferences: [],
      artifactId: "abc123",
      validatedAt: 1234567890,
      revisionCount: 2,
    };

    for (const stage of Object.keys(STAGE_KEY_WHITELIST)) {
      const result = validateStageDataKeys(stage, commonFields);
      expect(result).toEqual([]);
    }
  });

  it("catches AI hallucinated keys like summary or references", () => {
    const aiHallucinatedData = {
      ideKasar: "valid",
      summary: "AI sent English key",
      references: [{ url: "https://example.com" }],
      notes: "extra field",
    };
    const result = validateStageDataKeys("gagasan", aiHallucinatedData);
    expect(result).toContain("summary");
    expect(result).toContain("references");
    expect(result).toContain("notes");
    expect(result).not.toContain("ideKasar");
  });

  it("handles empty data object", () => {
    const result = validateStageDataKeys("gagasan", {});
    expect(result).toEqual([]);
  });

  it("keeps all 14 paper stages defined in the whitelist", () => {
    const expectedStages = [
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
      "pembaruan_abstrak",
      "daftar_pustaka",
      "lampiran",
      "judul",
    ];

    for (const stage of expectedStages) {
      expect(STAGE_KEY_WHITELIST[stage]).toBeDefined();
      expect(STAGE_KEY_WHITELIST[stage].length).toBeGreaterThan(0);
    }
  });
});
