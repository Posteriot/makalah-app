import type { PaperStageId } from "../../../convex/paperSessions/constants";
import { STAGE_KEY_WHITELIST } from "../../../convex/paperSessions/stageDataWhitelist";
import { estimateEnglishConfidence } from "./stage-skill-language";

const MANDATORY_SECTIONS = [
    "Objective",
    "Input Context",
    "Tool Policy",
    "Output Contract",
    "Guardrails",
    "Done Criteria",
];

const ACTIVE_SEARCH_STAGES: PaperStageId[] = [
    "gagasan",
    "topik",
    "pendahuluan",
    "tinjauan_literatur",
    "metodologi",
    "diskusi",
];

type ValidationIssue = {
    code: string;
    message: string;
};

export type StageSkillValidationResult = {
    ok: boolean;
    issues: ValidationIssue[];
    metadata: {
        englishConfidence: number;
        declaredSearchPolicy?: "active" | "passive";
        outputKeys: string[];
    };
};

export type StageSkillValidationInput = {
    stageScope: PaperStageId;
    skillId: string;
    name: string;
    description: string;
    content: string;
};

function escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasSection(body: string, sectionName: string): boolean {
    const pattern = new RegExp(`^##\\s+${escapeRegExp(sectionName)}\\s*$`, "im");
    return pattern.test(body);
}

function getSection(body: string, sectionName: string): string {
    const headingPattern = new RegExp(`^##\\s+${escapeRegExp(sectionName)}\\s*$`, "im");
    const match = headingPattern.exec(body);
    if (!match || match.index === undefined) return "";

    const fromHeading = body.slice(match.index + match[0].length);
    const nextHeadingMatch = /^##\s+/m.exec(fromHeading);
    if (!nextHeadingMatch || nextHeadingMatch.index === undefined) {
        return fromHeading.trim();
    }

    return fromHeading.slice(0, nextHeadingMatch.index).trim();
}

function extractOutputKeys(outputContractSection: string): string[] {
    const keys = new Set<string>();
    const lines = outputContractSection.split("\n");

    for (const line of lines) {
        const match = line.match(/^\s*-\s*([a-zA-Z_][a-zA-Z0-9_]*)\b/);
        if (match?.[1]) {
            keys.add(match[1]);
        }
    }

    return Array.from(keys);
}

function parseDeclaredSearchPolicy(content: string): "active" | "passive" | undefined {
    const explicit = content.match(/searchPolicy:\s*(active|passive)\b/i)?.[1]?.toLowerCase();
    if (explicit === "active" || explicit === "passive") return explicit;

    const bodySignal = content.match(/google_search\s*\((active|passive)\s+mode/i)?.[1]?.toLowerCase();
    if (bodySignal === "active" || bodySignal === "passive") return bodySignal;

    return undefined;
}

function getExpectedSearchPolicy(stageScope: PaperStageId): "active" | "passive" {
    return ACTIVE_SEARCH_STAGES.includes(stageScope) ? "active" : "passive";
}

function hasPersistCompileInstruction(content: string): boolean {
    return /compileDaftarPustaka\s*\(\s*\{[^}]*mode\s*:\s*["']persist["']/i.test(content)
        || /mode\s*:\s*["']persist["']/i.test(content);
}

function hasDangerousOverridePhrase(content: string): boolean {
    const dangerousPatterns = [
        /\bignore\s+stage\s+lock\b/i,
        /\bbypass\s+stage\s+lock\b/i,
        /\boverride\s+tool\s+routing\b/i,
        /\bignore\s+tool\s+routing\b/i,
        /\bcall\s+google_search\s+and\s+updateStageData\s+in\s+the\s+same\s+turn\b/i,
        /\bsubmit\s+without\s+ringkasan\b/i,
        /\bsubmit\s+without\s+user\s+confirmation\b/i,
    ];

    return dangerousPatterns.some((pattern) => pattern.test(content));
}

export function validateStageSkillContent(input: StageSkillValidationInput): StageSkillValidationResult {
    const issues: ValidationIssue[] = [];
    const content = input.content.trim();

    if (!content) {
        issues.push({
            code: "empty_content",
            message: "Skill content tidak boleh kosong.",
        });
    }

    for (const sectionName of MANDATORY_SECTIONS) {
        if (!hasSection(content, sectionName)) {
            issues.push({
                code: `missing_section_${sectionName.toLowerCase().replace(/\s+/g, "_")}`,
                message: `Section wajib "${sectionName}" tidak ditemukan.`,
            });
        }
    }

    if (!input.name.trim() || !input.description.trim()) {
        issues.push({
            code: "missing_metadata",
            message: "Field name dan description wajib terisi.",
        });
    }

    const english = estimateEnglishConfidence([input.name, input.description, content].join("\n"));
    if (!english.ok) {
        issues.push({
            code: "non_english_content",
            message: `Konten skill wajib full English (confidence ${english.confidence.toFixed(2)}).`,
        });
    }

    const outputSection = getSection(content, "Output Contract");
    const outputKeys = extractOutputKeys(outputSection);
    const allowedKeys = STAGE_KEY_WHITELIST[input.stageScope] ?? [];
    const unknownOutputKeys = outputKeys.filter((key) => !allowedKeys.includes(key));
    if (unknownOutputKeys.length > 0) {
        issues.push({
            code: "output_keys_not_whitelisted",
            message: `Output Contract memuat key yang tidak ada di whitelist stage "${input.stageScope}": ${unknownOutputKeys.join(", ")}.`,
        });
    }

    const declaredSearchPolicy = parseDeclaredSearchPolicy(content);
    const expectedSearchPolicy = getExpectedSearchPolicy(input.stageScope);
    if (declaredSearchPolicy && declaredSearchPolicy !== expectedSearchPolicy) {
        issues.push({
            code: "search_policy_mismatch",
            message: `searchPolicy "${declaredSearchPolicy}" tidak sesuai matrix stage "${input.stageScope}" (expected "${expectedSearchPolicy}").`,
        });
    }

    const hasPersistInstruction = hasPersistCompileInstruction(content);
    if (input.stageScope !== "daftar_pustaka" && hasPersistInstruction) {
        issues.push({
            code: "persist_compile_forbidden",
            message: `Stage "${input.stageScope}" dilarang menginstruksikan compileDaftarPustaka mode persist.`,
        });
    }
    if (input.stageScope === "daftar_pustaka" && !hasPersistInstruction) {
        issues.push({
            code: "persist_compile_required",
            message: "Stage daftar_pustaka wajib menginstruksikan compileDaftarPustaka mode persist.",
        });
    }

    if (hasDangerousOverridePhrase(content)) {
        issues.push({
            code: "forbidden_phrase_detected",
            message: "Konten skill mengandung instruksi override guard runtime (stage lock/tool routing/submit guard).",
        });
    }

    if (input.stageScope === "outline") {
        const outlineGuard = /checkedAt/i.test(content) && /checkedBy/i.test(content) && /editHistory/i.test(content);
        if (!outlineGuard) {
            issues.push({
                code: "outline_living_checklist_missing",
                message: "outline-skill wajib menyebut checklist lifecycle (checkedAt, checkedBy, editHistory).",
            });
        }
    }

    const postOutlineStages: PaperStageId[] = [
        "abstrak",
        "pendahuluan",
        "tinjauan_literatur",
        "metodologi",
        "hasil",
        "diskusi",
        "kesimpulan",
        "daftar_pustaka",
        "lampiran",
        "judul",
    ];
    if (postOutlineStages.includes(input.stageScope)) {
        const hasLivingOutlineContext = /living outline|checkedAt|checkedBy|editHistory/i.test(content);
        if (!hasLivingOutlineContext) {
            issues.push({
                code: "post_outline_context_missing",
                message: `Stage "${input.stageScope}" wajib menyebut pembacaan living outline checklist context.`,
            });
        }
    }

    return {
        ok: issues.length === 0,
        issues,
        metadata: {
            englishConfidence: english.confidence,
            declaredSearchPolicy,
            outputKeys,
        },
    };
}
