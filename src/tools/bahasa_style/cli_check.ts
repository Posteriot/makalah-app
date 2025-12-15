import { BahasaStyle } from './index';
import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);

if (args.length === 0) {
    console.error(`
Usage:
  1. Direct Text:   npx tsx src/tools/bahasa_style/cli_check.ts "Text anda disini..."
  2. File Path:     npx tsx src/tools/bahasa_style/cli_check.ts path/to/file.txt
    `);
    process.exit(1);
}

let inputText = args[0];

// Check if input is a file path
if (fs.existsSync(inputText)) {
    try {
        inputText = fs.readFileSync(inputText, 'utf-8');
        console.log(`\n📄 Reading file: ${args[0]}`);
    } catch (e) {
        console.error("Error reading file:", e);
        process.exit(1);
    }
} else {
    console.log(`\n📝 Analyzing input text...`);
}

const result = BahasaStyle.validate(inputText);

console.log("\n---------------------------------------------------");
console.log(`📊 STYLE SCORE: ${result.score}/100`);
console.log(`✅ Valid: ${result.isValid}`);
console.log("---------------------------------------------------\n");

if (result.issues.length === 0) {
    console.log("🎉 Perfect! No style violations found.");
} else {
    console.log("⚠️  ISSUES FOUND:");
    result.issues.forEach((i, idx) => {
        const icon = i.severity === 'CRITICAL' ? '🔴' : '🟡';
        console.log(`\n${idx + 1}. ${icon} [${i.type}]`);
        console.log(`   Message: ${i.message}`);
        console.log(`   Snippet: "${i.snippet}"`);
        if (i.suggestion) console.log(`   💡 Tip:  ${i.suggestion}`);
    });
}
console.log("\n---------------------------------------------------");
