# Stage Skills Package

This folder contains implementation-ready skill documents for all 13 paper workflow stages.

## Structure

Each stage skill follows the `skills.sh` directory convention:
- `<stage>-skill/SKILL.md`

## Included Skills

1. gagasan-skill
2. topik-skill
3. outline-skill
4. abstrak-skill
5. pendahuluan-skill
6. tinjauan-literatur-skill
7. metodologi-skill
8. hasil-skill
9. diskusi-skill
10. kesimpulan-skill
11. daftar-pustaka-skill
12. lampiran-skill
13. judul-skill

## Authoring Rules Applied

1. Full English skill content.
2. Mandatory YAML frontmatter (`name`, `description`).
3. Stage-specific objective, tool policy, output contract, guardrails, and done criteria.
4. Search policy alignment with runtime stage policy (active/passive).
5. Output keys aligned with stage data schema.
6. `compileDaftarPustaka` policy alignment:
   - all stages may use `mode: "preview"` for cross-stage bibliography audit.
   - only `daftar-pustaka-skill` may use `mode: "persist"` for final bibliography compilation and persistence.
7. Living Outline Checklist alignment:
   - `outline-skill` treats outline as a living checklist (auto-check, rewind reset, minor edit lifecycle).
   - post-outline stage skills read checklist status (`checkedAt`, `checkedBy`, `editHistory`) when available.

## Verification Report

See:
- `verification-audit.md`
- `../2026-02-26-design-doc-pemakaian-skill-13-stage.md`
- `../README.md`
