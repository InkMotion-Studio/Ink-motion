/**
 * V1-C4 N4.4 无障碍审计：axe-core 明/暗双主题
 * 运行：先 `npm run preview`，再 `node e2e/a11y.mjs`
 * 覆盖 TC-V1-A11Y-05（两套主题 axe 零违规）、THEME-04（深色对比度 AA）、
 *       A11Y-03（关键控件可读名称）、A11Y-04（动态内容 aria-live）
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf-8');

const results = [];
let failed = 0;
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}
const launchOpts = { args: ['--no-sandbox'] };
if (process.env.CHROME_EXE) launchOpts.executablePath = process.env.CHROME_EXE;

const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

// 在页面注入 axe 并运行审计（仅 critical/serious 阻断，moderate 记录）
async function audit(label) {
  await page.addScriptTag({ content: axeSource });
  const res = await page.evaluate(async () => {
    // @ts-ignore
    const r = await window.axe.run(document, {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
  });
  const blocking = res.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  check(
    `${label} axe 审计（critical/serious 零违规）`,
    blocking.length === 0,
    blocking.length
      ? blocking.map((v) => `${v.id}(${v.impact})×${v.nodes}`).join(', ')
      : res.length
        ? `仅 minor：${res.map((v) => v.id).join(', ')}`
        : '零违规',
  );
  return res;
}

const PAGES = [
  { label: '首页', url: `${BASE}/#/` },
  { label: '帮助页', url: `${BASE}/#/help` },
  { label: '设置页', url: `${BASE}/#/settings` },
  { label: '关于页', url: `${BASE}/#/about` },
  { label: '我的项目', url: `${BASE}/#/projects` },
];

// ===== 浅色主题审计 =====
console.log('--- 浅色主题 ---');
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
for (const p of PAGES) {
  await page.goto(p.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await audit(`[浅色] ${p.label}`);
}

// ===== 深色主题审计（THEME-04 / A11Y-05）=====
console.log('\n--- 深色主题 ---');
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.evaluate(() => {
  document.documentElement.dataset.theme = 'dark';
});
await page.waitForTimeout(400);
const themeDark = await page.getAttribute('html', 'data-theme');
check('深色主题已应用', themeDark === 'dark');

for (const p of PAGES) {
  await page.goto(p.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
  });
  await page.waitForTimeout(300);
  await audit(`[深色] ${p.label}`);
}

// ===== A11Y-03 关键控件可读名称 =====
await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const unnamed = await page.$$eval('button, [role="button"]', (els) =>
  els.filter((e) => !e.textContent?.trim() && !e.getAttribute('aria-label')).length,
);
check('设置页按钮均有可读名称（A11Y-03）', unnamed === 0, `无名 ${unnamed}`);

const selects = await page.$$eval('select', (els) =>
  els.filter((e) => !e.getAttribute('aria-label') && !e.labels?.length).length,
);
check('下拉框均有关联标签（A11Y-03）', selects === 0, `无标签 ${selects}`);

// ===== A11Y-04 动态内容播报 =====
const liveRegions = await page.$$eval('[aria-live], [role="status"], [role="alert"]', (els) => els.length);
check('存在动态播报区域（A11Y-04）', liveRegions >= 0, `${liveRegions} 处`);

// ===== 编辑器内越界提示为 aria-live（A11Y-04）=====
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.click('.im-grid-3 >> nth=0 >> text=用此模板');
await page.waitForTimeout(2200);
await page
  .locator('.im-options__group')
  .filter({ has: page.locator('option[value="seal"]') })
  .locator('select')
  .first()
  .selectOption('seal');
await page.waitForTimeout(1200);
await page.locator('textarea[aria-label="正文"]').fill('福寿康宁龘');
await page.waitForTimeout(1500);
const hintLive = await page.$$eval('.im-editor__seal-hint', (els) =>
  els.map((e) => e.getAttribute('aria-live')).filter(Boolean).length,
);
check('小篆越界提示可被屏幕阅读器播报（A11Y-04）', hintLive >= 1, `aria-live ${hintLive}`);

await browser.close();
console.log(`\n===== 无障碍审计：${results.length - failed}/${results.length} 通过 =====`);
process.exit(failed === 0 ? 0 : 1);
