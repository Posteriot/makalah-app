#!/usr/bin/env python3
"""Deploy stage skills + system prompt from updated-7 to dev DB (wary-ferret-59)."""
import json
import subprocess
import sys
import os

ADMIN_ID = "jn755zs64zgafr0mn4qhrghzwn7x6y48"
CHANGE_NOTE = "updated-7: rollback capability + fallback choice card improvements"
SRC_DIR = ".references/system-prompt-skills-active/updated-7"

SKILLS = [
    ("01-gagasan-skill.md", "gagasan-skill"),
    ("02-topik-skill.md", "topik-skill"),
    ("03-outline-skill.md", "outline-skill"),
    ("04-abstrak-skill.md", "abstrak-skill"),
    ("05-pendahuluan-skill.md", "pendahuluan-skill"),
    ("06-tinjauan-literatur-skill.md", "tinjauan-literatur-skill"),
    ("07-metodologi-skill.md", "metodologi-skill"),
    ("08-hasil-skill.md", "hasil-skill"),
    ("09-diskusi-skill.md", "diskusi-skill"),
    ("10-kesimpulan-skill.md", "kesimpulan-skill"),
    ("11-pembaruan-abstrak-skill.md", "pembaruan-abstrak-skill"),
    ("12-daftar-pustaka-skill.md", "daftar-pustaka-skill"),
    ("13-lampiran-skill.md", "lampiran-skill"),
    ("14-judul-skill.md", "judul-skill"),
]


def convex_run(fn, args):
    result = subprocess.run(
        ["npx", "convex", "run", fn, json.dumps(args)],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"{fn} failed: {result.stderr.strip()}")
    return json.loads(result.stdout)


def strip_header(text):
    """Strip '# Title\n' header if present, keep from ## Objective onward."""
    if text.startswith("# "):
        idx = text.find("\n")
        if idx >= 0:
            text = text[idx + 1:].lstrip("\n")
    return text


DEV_DEPLOYMENT_URL = "https://wary-ferret-59.convex.cloud"


def assert_dev_deployment():
    """Safety guard: abort if active Convex deployment is not the dev DB."""
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
    if not os.path.exists(env_path):
        raise RuntimeError(f"Cannot find .env.local at {env_path} — cannot verify deployment target.")
    with open(env_path) as f:
        for line in f:
            if line.startswith("NEXT_PUBLIC_CONVEX_URL="):
                url = line.strip().split("=", 1)[1]
                if url != DEV_DEPLOYMENT_URL:
                    raise RuntimeError(
                        f"ABORT: Active deployment is {url}, expected {DEV_DEPLOYMENT_URL}. "
                        f"This script is dev-only. Do NOT run against production."
                    )
                print(f"  ✓ Deployment target verified: {url}")
                return
    raise RuntimeError("NEXT_PUBLIC_CONVEX_URL not found in .env.local — cannot verify deployment target.")


def main():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    # --- Safety Check ---
    print("=== Safety Check ===")
    assert_dev_deployment()

    # --- System Prompt ---
    print("=== System Prompt ===")
    prompt_content = open(f"{SRC_DIR}/system-prompt.md").read()
    active = convex_run("systemPrompts:getActiveSystemPrompt", {})
    prompt_id = active["_id"]
    result = convex_run("systemPrompts:updateSystemPrompt", {
        "requestorUserId": ADMIN_ID,
        "promptId": prompt_id,
        "content": prompt_content,
        "description": CHANGE_NOTE,
    })
    print(f"  v{result['version']} active ({result['message']})")

    # --- Stage Skills ---
    print("\n=== Stage Skills ===")
    success = 0
    fail = 0
    for filename, skill_id in SKILLS:
        filepath = f"{SRC_DIR}/{filename}"
        if not os.path.exists(filepath):
            print(f"  SKIP {skill_id} — file not found")
            fail += 1
            continue

        content = strip_header(open(filepath).read())

        try:
            # Create draft
            draft = convex_run("stageSkills:createDraftVersion", {
                "requestorUserId": ADMIN_ID,
                "skillId": skill_id,
                "content": content,
                "changeNote": CHANGE_NOTE,
            })
            version = draft["version"]

            # Activate
            convex_run("stageSkills:activateVersion", {
                "requestorUserId": ADMIN_ID,
                "skillId": skill_id,
                "version": version,
            })
            print(f"  {skill_id}: v{version} active")
            success += 1

            # Archive stale drafts — prevents dry run from picking abandoned drafts
            # over the active version (dry run prioritizes latestDraft over active).
            try:
                history = convex_run("stageSkills:getVersionHistory", {
                    "requestorUserId": ADMIN_ID,
                    "skillId": skill_id,
                })
                stale_drafts = [
                    v for v in history["versions"]
                    if v["status"] == "draft" and v["version"] != version
                ]
                for stale in stale_drafts:
                    convex_run("stageSkills:archiveVersion", {
                        "requestorUserId": ADMIN_ID,
                        "skillId": skill_id,
                        "version": stale["version"],
                    })
                    print(f"    archived stale draft v{stale['version']}")
            except Exception:
                pass  # non-critical — stale drafts don't break activation

        except RuntimeError as e:
            print(f"  {skill_id}: FAIL — {e}")
            fail += 1

    # --- Verification ---
    print(f"\n=== Result: {success} OK, {fail} FAIL ===")

    print("\n=== Dry Run Verification ===")
    try:
        dr = convex_run("stageSkills:runPreActivationDryRun", {
            "requestorUserId": ADMIN_ID,
        })
        print(f"  Passed: {dr['passedStages']}/{dr['totalStages']}")
        for r in dr["results"]:
            if not r["ok"]:
                print(f"  FAIL: {r['stageScope']} — {', '.join(r['issues'])}")
    except Exception as e:
        print(f"  Verification error: {e}")


if __name__ == "__main__":
    main()
