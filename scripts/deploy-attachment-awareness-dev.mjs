import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ADMIN_ID = "jn755zs64zgafr0mn4qhrghzwn7x6y48";
const DEV_DEPLOYMENT_URL = "https://wary-ferret-59.convex.cloud";
const SKILL_CHANGE_NOTE = "Add attachment awareness handling (2026-04-10)";
const PROMPT_CHANGE_NOTE = "Add attachment awareness directive (2026-04-10)";
const SOURCE_DIR = ".references/system-prompt-skills-active/updated-4";

const SKILLS = [
  { fileName: "01-gagasan-skill.md", stageScope: "gagasan" },
  { fileName: "02-topik-skill.md", stageScope: "topik" },
  { fileName: "03-outline-skill.md", stageScope: "outline" },
  { fileName: "04-abstrak-skill.md", stageScope: "abstrak" },
  { fileName: "05-pendahuluan-skill.md", stageScope: "pendahuluan" },
  { fileName: "06-tinjauan-literatur-skill.md", stageScope: "tinjauan_literatur" },
  { fileName: "07-metodologi-skill.md", stageScope: "metodologi" },
  { fileName: "08-hasil-skill.md", stageScope: "hasil" },
  { fileName: "09-diskusi-skill.md", stageScope: "diskusi" },
  { fileName: "10-kesimpulan-skill.md", stageScope: "kesimpulan" },
  { fileName: "11-pembaruan-abstrak-skill.md", stageScope: "pembaruan_abstrak" },
  { fileName: "12-daftar-pustaka-skill.md", stageScope: "daftar_pustaka" },
  { fileName: "13-lampiran-skill.md", stageScope: "lampiran" },
  { fileName: "14-judul-skill.md", stageScope: "judul" },
];

function convexRun(functionName, args) {
  const stdout = execFileSync(
    "npx",
    ["convex", "run", functionName, JSON.stringify(args)],
    { encoding: "utf8" }
  );
  return JSON.parse(stdout);
}

function stripMarkdownTitle(rawContent) {
  if (!rawContent.startsWith("# ")) return rawContent.trim();
  const firstBreak = rawContent.indexOf("\n");
  return rawContent.slice(firstBreak + 1).trim();
}

function assertDevDeployment() {
  const envLocal = readFileSync(".env.local", "utf8");
  const match = envLocal.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m);
  if (!match) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL not found in .env.local");
  }
  if (match[1].trim() !== DEV_DEPLOYMENT_URL) {
    throw new Error(`Active deployment is ${match[1].trim()}, expected ${DEV_DEPLOYMENT_URL}`);
  }
}

function writeProgress(progressPath, payload) {
  writeFileSync(progressPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function main() {
  assertDevDeployment();
  mkdirSync("snapshots", { recursive: true });

  const timestamp = new Date().toISOString();
  const fileTimestamp = timestamp.replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z");
  const progressPath = join("snapshots", `deployment-progress-${fileTimestamp}.json`);

  const progress = {
    timestamp,
    target: "wary-ferret-59",
    systemPrompt: { status: "pending" },
    stageSkills: [],
    verification: { status: "pending" },
  };
  writeProgress(progressPath, progress);

  const localSystemPrompt = readFileSync(join(SOURCE_DIR, "system-prompt.md"), "utf8").trim();
  const activeSystemPrompt = convexRun("systemPrompts:getActiveSystemPrompt", {});
  const promptUpdate = convexRun("systemPrompts:updateSystemPrompt", {
    requestorUserId: ADMIN_ID,
    promptId: activeSystemPrompt._id,
    content: localSystemPrompt,
    description: PROMPT_CHANGE_NOTE,
  });
  progress.systemPrompt = {
    status: "updated",
    previousPromptId: activeSystemPrompt._id,
    newPromptId: promptUpdate.promptId,
    version: promptUpdate.version,
  };
  writeProgress(progressPath, progress);

  for (const skill of SKILLS) {
    const localPath = join(SOURCE_DIR, skill.fileName);
    const localContent = stripMarkdownTitle(readFileSync(localPath, "utf8"));
    const current = convexRun("stageSkills:getActiveByStage", { stageScope: skill.stageScope });
    if (!current) {
      throw new Error(`No active skill found for ${skill.stageScope}`);
    }

    const draft = convexRun("stageSkills:createOrUpdateDraft", {
      requestorUserId: ADMIN_ID,
      stageScope: skill.stageScope,
      name: current.name,
      description: current.description,
      contentBody: localContent,
      changeNote: SKILL_CHANGE_NOTE,
      allowedTools: current.allowedTools,
    });
    convexRun("stageSkills:publishVersion", {
      requestorUserId: ADMIN_ID,
      skillId: draft.skillId,
      version: draft.version,
    });
    convexRun("stageSkills:activateVersion", {
      requestorUserId: ADMIN_ID,
      skillId: draft.skillId,
      version: draft.version,
    });

    progress.stageSkills.push({
      stageScope: skill.stageScope,
      skillId: draft.skillId,
      version: draft.version,
      status: "active",
    });
    writeProgress(progressPath, progress);
  }

  for (const skill of SKILLS) {
    const localPath = join(SOURCE_DIR, skill.fileName);
    const expectedContent = stripMarkdownTitle(readFileSync(localPath, "utf8"));
    const active = convexRun("stageSkills:getActiveByStage", { stageScope: skill.stageScope });
    if (!active || active.content !== expectedContent) {
      throw new Error(`Verification failed for ${skill.stageScope}`);
    }
  }

  const verifiedPrompt = convexRun("systemPrompts:getActiveSystemPrompt", {});
  if (!verifiedPrompt || verifiedPrompt.content !== localSystemPrompt) {
    throw new Error("System prompt verification failed");
  }

  const dryRun = convexRun("stageSkills:runPreActivationDryRun", {
    requestorUserId: ADMIN_ID,
  });

  progress.verification = {
    status: "complete",
    dryRun,
  };
  writeProgress(progressPath, progress);

  console.log(
    JSON.stringify(
      {
        ok: true,
        target: "wary-ferret-59",
        progressPath,
        skillsDeployed: progress.stageSkills.length,
        systemPromptVersion: verifiedPrompt.version,
        dryRunPassedStages: dryRun.passedStages,
        dryRunTotalStages: dryRun.totalStages,
      },
      null,
      2
    )
  );
}

main();
