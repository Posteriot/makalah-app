import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STAGES = [
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

function convexRun(functionName, args, extraFlags = []) {
  const stdout = execFileSync(
    "npx",
    ["convex", "run", ...extraFlags, functionName, JSON.stringify(args)],
    { encoding: "utf8" }
  );
  return JSON.parse(stdout);
}

function buildSnapshot({ sourceDatabase, outputPrefix = "pre-deployment", convexFlags = [] }) {
  const timestamp = new Date().toISOString();
  const fileTimestamp = timestamp.replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z");

  const stageSkills = STAGES.map((stageScope) => {
    const active = convexRun("stageSkills:getActiveByStage", { stageScope }, convexFlags);
    if (!active) {
      throw new Error(`No active skill for stage "${stageScope}"`);
    }

    return {
      stageScope,
      skillId: active.skillId,
      activeVersion: active.version,
      activeContent: active.content,
      name: active.name,
      description: active.description,
      allowedTools: active.allowedTools,
    };
  });

  const systemPrompt = convexRun("systemPrompts:getActiveSystemPrompt", {}, convexFlags);
  if (!systemPrompt) {
    throw new Error("No active system prompt found");
  }

  return {
    outputPath: join("snapshots", `${outputPrefix}-${fileTimestamp}.json`),
    payload: {
      timestamp,
      sourceDatabase,
      stageSkills,
      systemPrompt: {
        promptId: systemPrompt._id,
        version: systemPrompt.version,
        name: systemPrompt.name,
        content: systemPrompt.content,
        description: systemPrompt.description,
      },
    },
  };
}

function verifySnapshot(snapshotPath) {
  const parsed = JSON.parse(readFileSync(snapshotPath, "utf8"));
  if (!Array.isArray(parsed.stageSkills) || parsed.stageSkills.length !== STAGES.length) {
    throw new Error(`Expected ${STAGES.length} stage skills, got ${parsed.stageSkills?.length ?? "unknown"}`);
  }

  const scopes = new Set(parsed.stageSkills.map((entry) => entry.stageScope));
  for (const stageScope of STAGES) {
    if (!scopes.has(stageScope)) {
      throw new Error(`Missing stage scope "${stageScope}"`);
    }
  }

  for (const entry of parsed.stageSkills) {
    if (typeof entry.activeContent !== "string" || !entry.activeContent.trim()) {
      throw new Error(`Empty activeContent for "${entry.stageScope}"`);
    }
  }

  if (typeof parsed.systemPrompt?.content !== "string" || !parsed.systemPrompt.content.trim()) {
    throw new Error("Empty system prompt content");
  }

  return parsed;
}

function main() {
  const target = process.argv[2] ?? "dev";
  const config =
    target === "prod"
      ? {
          sourceDatabase: "basic-oriole-337",
          outputPrefix: "pre-deployment-prod",
          convexFlags: ["--prod"],
        }
      : {
          sourceDatabase: "wary-ferret-59",
          outputPrefix: "pre-deployment",
          convexFlags: [],
        };

  mkdirSync("snapshots", { recursive: true });

  const { outputPath, payload } = buildSnapshot(config);
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

  const verified = verifySnapshot(outputPath);
  console.log(
    JSON.stringify(
      {
        ok: true,
        outputPath,
        sourceDatabase: verified.sourceDatabase,
        stageCount: verified.stageSkills.length,
        systemPromptVersion: verified.systemPrompt.version,
      },
      null,
      2
    )
  );
}

main();
