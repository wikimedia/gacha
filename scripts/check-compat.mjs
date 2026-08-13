// Post-build guard against browser-compat regressions that have reached
// production artifacts before (see git history for both incidents):
//
//  - Regex lookbehind ("(?<=" / "(?<!"): a parse-time SyntaxError on
//    WebKit < 16.4 that takes down every module in the bundle. No build
//    target can transpile it away; the only fix is rewriting the regex.
//  - `color: color-mix(… currentcolor …)`: WebKit 16.x aborts while
//    applying the value (bad_variant_access in applyValueColor) and the
//    tab dies with "A problem repeatedly occurred". @supports guards do
//    not help: 16.x parses color-mix fine and crashes only on application.
//  - Media-query range syntax (`@media (height<=760px)`): WebKit < 16.4
//    cannot parse it and silently drops the full query with all rules in
//    it. The minifier rewrites min-/max- queries into this form unless
//    build.cssTarget sets an older engine (vite.config.ts).
//
// Scans the dist/ output rather than source so dependency upgrades
// (Tailwind, daisyUI) are covered too — the color-mix crash came from
// daisyUI's own CSS, which no source lint would have seen.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist/assets';
const failures = [];

for (const file of readdirSync(dist)) {
  const path = join(dist, file);
  if (file.endsWith('.js')) {
    const src = readFileSync(path, 'utf8');
    for (const m of src.matchAll(/\(\?<[=!]/g)) {
      failures.push(
        `${file} (offset ${m.index}): regex lookbehind — parse-time crash on WebKit < 16.4`
      );
    }
  } else if (file.endsWith('.css')) {
    const src = readFileSync(path, 'utf8');
    // Property must be exactly `color` ([{;] boundary excludes
    // background-color, scrollbar-color, custom properties, …).
    for (const m of src.matchAll(/[{;]color:\s*color-mix\([^;}]*currentcolor/gi)) {
      // Tailwind's preflight ::placeholder rule is known-unreachable on
      // WebKit 16.x (gated behind contain-intrinsic-size, a Safari 17+
      // feature, and 17 has the bug fixed).
      const before = src.slice(Math.max(0, m.index - 120), m.index);
      if (before.includes('::placeholder')) continue;
      failures.push(
        `${file}: color:color-mix(…currentcolor…) — renderer crash on WebKit 16.x`
      );
    }
    // Each `<` or `>` in an @media prelude is range syntax. This includes
    // the double form `(400px<=width<=800px)`. @container ranges are safe:
    // all engines with container queries can parse them.
    for (const m of src.matchAll(/@media[^{]*[<>]/g)) {
      failures.push(
        `${file} (offset ${m.index}): media range syntax — dropped by WebKit < 16.4; check build.cssTarget`
      );
    }
  }
}

if (failures.length > 0) {
  console.error('Browser-compat check FAILED:');
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('Browser-compat check: OK');
