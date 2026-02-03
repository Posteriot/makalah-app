# Skill: design-replicate

This skill is used to replicate website designs into 100% accurate and functional HTML/CSS/JS mockups.

## Methodology

Follow this workflow sequentially. NEVER estimate if technical data can be extracted from the browser.

### 1. Technical Audit (Research)
Use `browser_subagent` as the primary engine for crawling. Provide specific instructions to the subagent to:
- **Injection**: Inject the code from `scripts/extract_styles.js` into the target browser console.
- **Data Capture**: Execute `styleExtractor.getVariables()`, `styleExtractor.getElementDetails()`, and `styleExtractor.getAnimations()` on key elements.
- **Reporting**: Summarize the results into a format consistent with `references/audit-template.md`.

### 2. Animation & Behavior Analysis
To capture the "vibe" of web interactions:
- **CSS Trace**: Find `@keyframes` and `transition` properties in computed styles or stylesheet links.
- **Event Inspection**: Use `getEventListeners(element)` in the browser console to identify JavaScript triggers (e.g., slide-in on scroll, hover effects via JS class toggle).
- **UI States**: Capture screenshots of different states (Normal, Hover, Active, Sticky) for comparison.

### 3. Asset Extraction
- Use `scripts/asset_downloader.py` to download all static assets (SVG, PNG, JPG).
- **IMPORTANT**: Do not use external links. All assets must be stored in the local `assets/` folder.
- For complex SVGs (e.g., noise textures, gradient backgrounds), extract the code directly from the DOM.

### 4. Implementation (Build)
- **Standalone Mode**: Ensure the mockup works offline (local fonts & local assets).
- **CSS Strategy**: Use Tailwind CDN if the target uses Tailwind, or vanilla CSS if it's more efficient.
- **Logic Mirroring**: Replicate original JS behavior minimally but functionally (e.g., menu toggle, carousel scroll).

### 5. Verification
- Compare the mockup with the original website using side-by-side screenshots.
- Check interactions (animations & behaviors) to ensure they feel identical to the original.

## Reference Files
- [audit-template.md](file:///Users/eriksupit/Desktop/makalahapp/.agent/skills/design-replicate/references/audit-template.md): Use this to document audit results.
- [extract_styles.js](file:///Users/eriksupit/Desktop/makalahapp/.agent/skills/design-replicate/scripts/extract_styles.js): Helper script for browser console.
