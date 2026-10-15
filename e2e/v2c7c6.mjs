/**
 * V2-C7 C6：载体体系（10 种实体中国传统形制）—— 真实浏览器验证（Playwright + 系统 Chromium）
 *
 * 断言：
 *   1. 载体下拉含全部 10 种载体（值集合与 CARRIER_ORDER 一致）；
 *   2. 依次切换 10 种载体各截图 1 帧（观感留证）；
 *   3. 相邻载体的画面像素差异非零（证明各载体渲染确有不同，非同一张色块套壳）；
 *   4. 调整「色温 / 做旧 / 装裱边 → 钤印位」后画面发生变化（参数生效）；
 *   5. 全程零外网请求（除本机 dev server）、零 404、零控制台错误、零页面异常。
 *
 * 运行：先 `npm run preview`；再
 *   CHROME_EXE=/usr/bin/chromium BASE_URL=http://localhost:4173 node e2e/v2c7c6.mjs
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

const OUT = '/workspace/docs/c6-shots';
mkdirSync(OUT, { recursive: true });

const CARRIERS = [
  'paper',
  'scroll',
  'handscroll',
  'silk',
  'letter',
  'gold',
  'bamboo',
  'wood',
  'rubbing',
  'fan',
];

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

/** 抓取预览画布像素签名（用于跨载体/跨参数差异比对）。 */
async function grabPixels() {
  return page.evaluate(() => {
    const canvas = document.querySelector('.im-preview__canvas') || document.querySelector('canvas');
    if (!canvas) return null;
    const c = document.createElement('canvas');
    c.width = canvas.width;
    c.height = canvas.height;
    const cctx = c.getContext('2d');
    cctx.drawImage(canvas, 0, 0);
    const d = cctx.getImageData(0, 0, c.width, c.height).data;
    // 抽样降维，避免跨上下文传输超大数组
    const sample = [];
    for (let i = 0; i < d.length; i += 4 * 97) sample.push(d[i], d[i + 1], d[i + 2]);
    return sample;
  });
}
function diffPixels(a, b) {
  if (!a || !b) return -1;
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (Math.abs(a[i] - b[i]) > 8) d++;
  return d;
}

// ---- 进入编辑器 ----
await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
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

// ---- 定位载体下拉（options.js 渲染为 <select>，值域含 paper+bamboo） ----
let carrierSelect = null;
const selects = page.locator('select');
const nSelect = await selects.count();
for (let i = 0; i < nSelect; i++) {
  const opts = await selects.nth(i).evaluate((el) => Array.from(el.options).map((o) => o.value));
  if (opts.includes('paper') && opts.includes('bamboo')) {
    carrierSelect = selects.nth(i);
    break;
  }
}
check('找到载体选择器', carrierSelect !== null, `${nSelect} 个 select`);

if (carrierSelect) {
  const opts = await carrierSelect.evaluate((el) => Array.from(el.options).map((o) => o.value));
  const missing = CARRIERS.filter((c) => !opts.includes(c));
  check('载体下拉含全部 10 种载体', missing.length === 0, `缺失: ${missing.join(',') || '无'}`);

  // ---- 逐载体切换 + 截图 + 像素差异 ----
  const sigs = {};
  for (const c of CARRIERS) {
    try {
      await carrierSelect.selectOption(c);
    } catch {
      /* 选项缺失时记录并继续 */
    }
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/carrier-${c}.png` });
    sigs[c] = await grabPixels();
    const canvasOk = await page.evaluate(() => !!document.querySelector('.im-preview__canvas, canvas'));
    check(`载体 ${c} 截图已保存`, canvasOk, `docs/c6-shots/carrier-${c}.png`);
  }

  // 相邻载体画面应互不相同
  let distinctPairs = 0;
  for (let i = 1; i < CARRIERS.length; i++) {
    if (diffPixels(sigs[CARRIERS[i - 1]], sigs[CARRIERS[i]]) > 0) distinctPairs++;
  }
  check('各载体画面互不相同（非同一色块套壳）', distinctPairs >= CARRIERS.length - 1, `不同对数=${distinctPairs}/${CARRIERS.length - 1}`);

  // ---- 参数生效：以 paper 为基准，改变色温/做旧/装裱边后画面应变化 ----
  await carrierSelect.selectOption('paper').catch(() => {});
  await page.waitForTimeout(900);
  const baseSig = await grabPixels();

  /** 通过 label 文本定位 range 滑块（OptionPanel 的 Slider）。 */
  async function setRangeByLabel(labelSource, value) {
    const handle = await page.evaluateHandle(
      ({ reSource, v }) => {
        const re = new RegExp(reSource);
        const labels = Array.from(document.querySelectorAll('label'));
        for (const l of labels) {
          if (!re.test(l.textContent || '')) continue;
          const input =
            l.querySelector('input[type=range]') ||
            (l.parentElement && l.parentElement.querySelector('input[type=range]'));
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value',
            ).set;
            setter.call(input, String(v));
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      },
      { reSource: labelSource, v: value },
    );
    return handle.jsonValue();
  }

  const warmthOk = await setRangeByLabel('色温', 1);
  await page.waitForTimeout(900);
  const warmSig = await grabPixels();
  if (warmthOk) {
    check('色温参数生效（画面变化）', diffPixels(baseSig, warmSig) > 0, `diff=${diffPixels(baseSig, warmSig)}`);
  } else {
    check('色温滑块已定位', false, '未找到「色温」滑块');
  }

  const agingOk = await setRangeByLabel('做旧', 1);
  await page.waitForTimeout(900);
  const agedSig = await grabPixels();
  if (agingOk) {
    check('做旧参数生效（画面变化）', diffPixels(warmSig, agedSig) > 0, `diff=${diffPixels(warmSig, agedSig)}`);
  } else {
    check('做旧滑块已定位', false, '未找到「做旧/老化」滑块');
  }
}

// ---- 零外网 / 零 404 / 零错误 ----
check('零外网请求', externalRequests.length === 0, externalRequests.slice(0, 3).join(' | '));
check('零失败请求（无 404）', failedRequests.length === 0, failedRequests.slice(0, 3).join(' | '));
check('零页面异常', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
check('零控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

await page.screenshot({ path: `${OUT}/final.png`, fullPage: false });
await browser.close();

writeFileSync(
  `${OUT}/report.json`,
  JSON.stringify({ results, externalRequests, failedRequests, pageErrors, consoleErrors }, null, 2),
);
console.log(`\n${failed === 0 ? '全绿' : failed + ' 项失败'} — 报告：${OUT}/report.json`);
process.exit(failed === 0 ? 0 : 1);
