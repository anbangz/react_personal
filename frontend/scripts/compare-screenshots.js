const fs = require('fs');
const path = require('path');
const pixelmatch = require('pixelmatch').default || require('pixelmatch');
const { PNG } = require('pngjs');

const BASELINE_DIR = path.join(__dirname, '..', 'screenshots', 'baseline');
const AFTER_DIR = path.join(__dirname, '..', 'screenshots', 'after');
const DIFF_DIR = path.join(__dirname, '..', 'screenshots', 'diff');

function ensureDirectoryExists(dirPath, label) {
  if (!fs.existsSync(dirPath)) {
    console.error(`Missing ${label} directory: ${dirPath}`);
    process.exit(1);
  }
  if (!fs.statSync(dirPath).isDirectory()) {
    console.error(`${label} path is not a directory: ${dirPath}`);
    process.exit(1);
  }
}

ensureDirectoryExists(BASELINE_DIR, 'baseline screenshots');
ensureDirectoryExists(AFTER_DIR, 'after screenshots');

const baselineFiles = fs.readdirSync(BASELINE_DIR).filter(f => f.endsWith('.png'));
const afterFiles = fs.readdirSync(AFTER_DIR).filter(f => f.endsWith('.png'));

let totalDiffPixels = 0;
let failed = false;

if (!fs.existsSync(DIFF_DIR)) {
  fs.mkdirSync(DIFF_DIR, { recursive: true });
}

// Detect extra files in after dir
const baselineSet = new Set(baselineFiles);
for (const file of afterFiles) {
  if (!baselineSet.has(file)) {
    console.error(`UNEXPECTED: ${file} exists in after/ but not in baseline/`);
    failed = true;
  }
}

for (const file of baselineFiles) {
  const baselinePath = path.join(BASELINE_DIR, file);
  const afterPath = path.join(AFTER_DIR, file);

  if (!fs.existsSync(afterPath)) {
    console.error(`MISSING: ${file} (no after screenshot)`);
    failed = true;
    continue;
  }

  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const after = PNG.sync.read(fs.readFileSync(afterPath));

  if (baseline.width !== after.width || baseline.height !== after.height) {
    console.error(`SIZE MISMATCH: ${file} — ${baseline.width}x${baseline.height} vs ${after.width}x${after.height}`);
    failed = true;
    continue;
  }

  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const diffPixels = pixelmatch(baseline.data, after.data, diff.data, baseline.width, baseline.height, {
    threshold: 0.1,
    includeAA: false,
  });

  if (diffPixels > 0) {
    const diffPath = path.join(DIFF_DIR, file);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    console.error(`DIFF: ${file} — ${diffPixels} pixels differ`);
    totalDiffPixels += diffPixels;
    failed = true;
  } else {
    console.log(`PASS: ${file}`);
  }
}

if (failed) {
  console.error(`\nVisual regression FAILED. Total differing pixels: ${totalDiffPixels}`);
  console.error(`Diff images saved to: ${DIFF_DIR}`);
  process.exit(1);
} else {
  console.log('\nVisual regression PASSED. All screenshots identical.');
  process.exit(0);
}
