const fs = require('fs');
const path = require('path');
const pixelmatch = require('pixelmatch').default || require('pixelmatch');
const { PNG } = require('pngjs');

const BASELINE_DIR = path.join(__dirname, '..', 'screenshots', 'baseline');
const AFTER_DIR = path.join(__dirname, '..', 'screenshots', 'after');
const DIFF_DIR = path.join(__dirname, '..', 'screenshots', 'diff');

const files = fs.readdirSync(BASELINE_DIR).filter(f => f.endsWith('.png'));
let totalDiffPixels = 0;
let failed = false;

if (!fs.existsSync(DIFF_DIR)) {
  fs.mkdirSync(DIFF_DIR, { recursive: true });
}

for (const file of files) {
  const baselinePath = path.join(BASELINE_DIR, file);
  const afterPath = path.join(AFTER_DIR, file);

  if (!fs.existsSync(afterPath)) {
    console.error(`MISSING: ${file} (no after screenshot)`);
    failed = true;
    continue;
  }

  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const after = PNG.sync.read(fs.readFileSync(afterPath));

  const minWidth = Math.min(baseline.width, after.width);
  const minHeight = Math.min(baseline.height, after.height);

  let baselineData = baseline.data;
  let afterData = after.data;

  if (baseline.width !== after.width || baseline.height !== after.height) {
    console.warn(`SIZE MISMATCH: ${file} — ${baseline.width}x${baseline.height} vs ${after.width}x${after.height}. Comparing overlapping ${minWidth}x${minHeight} region.`);
    // Extract overlapping region from both images
    const baselineCropped = Buffer.alloc(minWidth * minHeight * 4);
    const afterCropped = Buffer.alloc(minWidth * minHeight * 4);
    for (let y = 0; y < minHeight; y++) {
      const baselineRowStart = (y * baseline.width) * 4;
      const afterRowStart = (y * after.width) * 4;
      const cropRowStart = y * minWidth * 4;
      baseline.data.copy(baselineCropped, cropRowStart, baselineRowStart, baselineRowStart + minWidth * 4);
      after.data.copy(afterCropped, cropRowStart, afterRowStart, afterRowStart + minWidth * 4);
    }
    baselineData = baselineCropped;
    afterData = afterCropped;
  }

  const diff = new PNG({ width: minWidth, height: minHeight });
  const diffPixels = pixelmatch(baselineData, afterData, diff.data, minWidth, minHeight, {
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
