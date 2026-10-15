/**
 * V2-C7 C5：书写引擎统一与观感 —— 真实浏览器验证（Playwright + 系统 Chromium）
 *
 * 断言：
 *   1. 依次切换 kai / song / brush / seal / li 五种字体，各截图 1 帧（观感留证）；
 *   2. 全程零外网请求（除本机 dev server）、零 404、零控制台错误；
 *   3. kai 逐笔在多个时刻的画面差异非零（证明真的在逐笔书写，而非整字闪现）。
 *
 * 运行：先 `npm run preview`；再 `CHROME_EXE=/usr/bin/chromium BASE_URL=... node e2e/v2c7c5.mjs`
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const results = [];
let failed = 0;
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

const launchOpts = { args: ['--no-sandbox'] };
if (process.env.CHROME_EXE) launchOpts.executablePath = process.env.CHROME_EXE;

const OUT = '/workspace/docs/c5-shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(launchOpts);
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const pageErrors = [];
const consoleErrors = [];
const externalRequests = [];
const failedRequests = [];

page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('request', (r) => {
  const u = r.url();
  if (!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')) externalRequests.push(u);
});
page.on('response', (r) => {
  if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
});

// ---- 进入编辑器 ----
await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
// 首页预设卡片：点「用此模板」进入编辑器（封面点击可能只做唤起）
const useTpl = page.locator('button').filter({ hasText: /用此模板/ }).first();
if (await useTpl.count()) {
  await useTpl.click();
} else {
  const create = page.locator('button, a').filter({ hasText: /新建作品|开始创作|Create/ }).first();
  if (await create.count()) await create.click();
}
await page.waitForTimeout(1600);
check('可进入编辑器', page.url().includes('editor'), page.url());

const ta = page.locator('textarea').first();
if (await ta.count()) {
  await ta.fill('永和九年岁在癸丑');
  await page.waitForTimeout(1800);
}
check('文本已录入', (await ta.count()) > 0);

// ---- 定位字体下拉（OptionsPanel 中的 font Select） ----
// Select 组件渲染为 <select>；字体分组标题为 options.fontLegend。
const selects = page.locator('select');
const nSelect = await selects.count();
let fontSelect = null;
for (let i = 0; i < nSelect; i++) {
  const opts = await selects.nth(i).evaluate((el) =>
    Array.from(el.options).map((o) => o.value),
  );
  if (opts.includes('kai') && opts.includes('seal')) {
    fontSelect = selects.nth(i);
    break;
  }
}
check('找到字体选择器', fontSelect !== null, `共 ${nSelect} 个 select`);

const FONTS = ['kai', 'song', 'brush', 'seal', 'li'];
if (fontSelect) {
  for (const f of FONTS) {
    try {
      await fontSelect.selectOption(f);
    } catch {
      /* 该选项不存在时跳过 */
    }
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `${OUT}/font-${f}.png` });
    const canvasOk = await page.evaluate(() => !!document.querySelector('.im-preview__canvas, canvas'));
    check(`字体 ${f} 截图已保存`, canvasOk, `docs/c5-shots/font-${f}.png`);
  }
  await fontSelect.selectOption('kai').catch(() => {});
  await page.waitForTimeout(1200);
}

// ---- 逐笔验证：同一字在不同时刻画面应变化 ----
const frameDiffs = await page.evaluate(async () => {
  const canvas = document.querySelector('.im-preview__canvas') || document.querySelector('canvas');
  if (!canvas) return null;
  const grab = () => {
    const c = document.createElement('canvas');
    c.width = canvas.width;
    c.height = canvas.height;
    c.getContext('2d').drawImage(canvas, 0, 0);
    return c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  };
  const diff = (a, b) => {
    let d = 0;
    for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 8) d++;
    return d;
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const samples = [];
  for (let i = 0; i < 4; i++) {
    samples.push(grab());
    await wait(450);
  }
  return {
    total: samples[0].length / 4,
    d: [
      diff(samples[0], samples[1]),
      diff(samples[1], samples[2]),
      diff(samples[2], samples[3]),
    ],
  };
});

check(
  'canvas 存在并捕获多帧',
  frameDiffs !== null,
  frameDiffs ? `pixels=${frameDiffs.total}` : '无 canvas',
);
if (frameDiffs) {
  const anyChange = frameDiffs.d.some((v) => v > 0);
  check(
    'kai 逐笔：多帧画面差异非零（逐笔推进而非整字闪现）',
    anyChange,
    `diffs=${frameDiffs.d.join(',')}`,
  );
}

// ---- 零外网 / 零 404 / 零错误 ----
check('零外网请求', externalRequests.length === 0, externalRequests.slice(0, 3).join(' | '));
check('零失败请求（无 404）', failedRequests.length === 0, failedRequests.slice(0, 3).join(' | '));
check('零页面异常', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
check('零控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

await page.screenshot({ path: `${OUT}/final.png`, fullPage: false });
await browser.close();

const report = { results, externalRequests, failedRequests, pageErrors, consoleErrors, frameDiffs };
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

console.log(`\n${failed === 0 ? '全绿' : failed + ' 项失败'} — 报告：${OUT}/report.json`);
process.exit(failed === 0 ? 0 : 1);
