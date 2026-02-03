---
description: Workflow to replicate website designs accurately and data-driven.
---

Use this workflow when you need to clone a target website design (e.g., dashboard, landing page) with 100% visual and functional accuracy.

1. **Preparation**: Ensure you have read `SKILL.md` in `.agent/skills/design-replicate/`.
2. **Audit**: Call `browser_subagent` to open the target URL.
   - Inject `scripts/extract_styles.js` into the console.
   - Extract variables, typography, and animations data.
3. **Documentation**: Fill out `references/audit-template.md` using the data from the audit.
4. **Asset Extraction**: Run `scripts/asset_downloader.py` to download all images/SVGs to the local `assets/` folder.
5. **Implementation**: Create a standalone `index.html`, `style.css`, and `script.js` based on the audit data.
6. **Verification**: Perform side-by-side screenshots to ensure visual precision and interaction accuracy.
