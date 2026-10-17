import fs from 'node:fs/promises';
import path from 'node:path';
import { computeGlassParameters } from '../src/parameters.js';

const sizes = [
  { width: 120, height: 48 },
  { width: 180, height: 72 },
  { width: 240, height: 120 },
  { width: 300, height: 200 },
  { width: 420, height: 300 }
];

const themes = ['light', 'dark'];
const styles = ['regular', 'clear', 'subdued'];
const accessibility = [
  { reduceTransparency: false, increaseContrast: false },
  { reduceTransparency: true, increaseContrast: false },
  { reduceTransparency: false, increaseContrast: true },
  { reduceTransparency: true, increaseContrast: true }
];

const rows = [];
for (const size of sizes) {
  for (const theme of themes) {
    for (const style of styles) {
      for (const a11y of accessibility) {
        const values = computeGlassParameters({
          ...size,
          theme,
          style,
          ...a11y
        });

        rows.push({
          input: { ...size, theme, style, ...a11y },
          output: values,
          inferredNotes: [
            'blurRadius uses inferred CPU-side fit from handoff',
            'style/a11y multipliers are inferred approximations pending calibration capture'
          ]
        });
      }
    }
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  source: 'scripts/extract-values.mjs',
  count: rows.length,
  rows
};

const outDir = path.join(process.cwd(), 'artifacts');
await fs.mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, 'inferred-value-sweep.json');
await fs.writeFile(outFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(`Wrote ${rows.length} rows to ${outFile}`);
