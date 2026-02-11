/**
 * Design Replicate Helper: style_extractor.js
 * Run this in the browser console to extract technical data from elements.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in browser console
const styleExtractor = {
    // 1. Get all CSS Variables from :root
    getVariables: () => {
        const vars = {};
        for (let i = 0; i < document.styleSheets.length; i++) {
            try {
                const sheet = document.styleSheets[i];
                for (let j = 0; j < sheet.cssRules.length; j++) {
                    const rule = sheet.cssRules[j];
                    if (rule.selectorText === ':root') {
                        const cssText = rule.cssText;
                        const matches = cssText.match(/--[\w-]+:\s*[^;]+;/g);
                        if (matches) {
                            matches.forEach(m => {
                                const [name, value] = m.split(':');
                                vars[name.trim()] = value.replace(';', '').trim();
                            });
                        }
                    }
                }
            } catch { /* Cross-origin stylesheet skip */ }
        }
        return vars;
    },

    // 2. Get Computed Styles for a specific element
    getElementDetails: (selector) => {
        const el = document.querySelector(selector);
        if (!el) return "Element not found";
        const styles = getComputedStyle(el);
        return {
            typography: {
                fontFamily: styles.fontFamily,
                fontSize: styles.fontSize,
                fontWeight: styles.fontWeight,
                lineHeight: styles.lineHeight,
                color: styles.color
            },
            box: {
                backgroundColor: styles.backgroundColor,
                padding: styles.padding,
                margin: styles.margin,
                borderRadius: styles.borderRadius,
                border: styles.border,
                boxShadow: styles.boxShadow
            },
            animation: {
                transition: styles.transition,
                animation: styles.animation
            }
        };
    },

    // 3. Trace Animations (Keyframes)
    getAnimations: () => {
        const keyframes = [];
        for (let i = 0; i < document.styleSheets.length; i++) {
            try {
                const rules = document.styleSheets[i].cssRules;
                for (let j = 0; j < rules.length; j++) {
                    if (rules[j].type === CSSRule.KEYFRAMES_RULE) {
                        keyframes.push(rules[j].cssText);
                    }
                }
            } catch { }
        }
        return keyframes;
    }
};

console.log("🚀 Style Extractor Ready!");
console.log("Use: styleExtractor.getVariables()");
console.log("Use: styleExtractor.getElementDetails('.your-selector')");
console.log("Use: styleExtractor.getAnimations()");
