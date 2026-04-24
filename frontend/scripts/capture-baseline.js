const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080';
const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots', 'baseline');

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 667 },
];

const routes = [
  { path: '/', name: 'homepage' },
  { path: '/blog', name: 'blog' },
];

async function captureScreenshots() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  for (const route of routes) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const url = `${BASE_URL}${route.path}`;

      // Light mode
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const lightPath = path.join(OUTPUT_DIR, `${route.name}-${viewport.name}-light.png`);
      await page.screenshot({ path: lightPath, fullPage: true });
      console.log(`Captured: ${lightPath}`);

      // Dark mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);
      const darkPath = path.join(OUTPUT_DIR, `${route.name}-${viewport.name}-dark.png`);
      await page.screenshot({ path: darkPath, fullPage: true });
      console.log(`Captured: ${darkPath}`);

      // Mobile hamburger menu opened (mobile only)
      if (viewport.name === 'mobile') {
        const burger = await page.$('.site-nav__toggle');
        if (burger) {
          const isVisible = await burger.isVisible().catch(() => false);
          if (isVisible) {
            await burger.click();
            await page.waitForTimeout(300);
            const menuPath = path.join(OUTPUT_DIR, `${route.name}-${viewport.name}-menu-open.png`);
            await page.screenshot({ path: menuPath, fullPage: true });
            console.log(`Captured: ${menuPath}`);
          } else {
            console.log(`SKIP: ${route.name}-${viewport.name}-menu-open (toggle not visible)`);
          }
        }
      }

      await page.close();
    }
  }

  await browser.close();
  console.log('All baseline screenshots captured.');
}

captureScreenshots().catch((err) => {
  console.error(err);
  process.exit(1);
});
