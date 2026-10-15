/**
 * V2-C1 E2E：篆书字源分层扩展端到端验证
 * 运行：先 `npm run dev`，再 `node e2e/v2c1.mjs`
 * 覆盖：
 *   1) L0 保底回归（V1-C1 行为保持：小篆渲染 + 越界提示 + 整字显现）
 *   2) 字源层级开关（L0 / L0L1 / all 三态存在于设置页并可切换，无运行时错误）
 *   3) 资产命名空间升至 v3（caches 当前为 inkmotion-assets-v3；旧 v2 历史缓存已清理）
 *   4) 零上传隐私断言（篆书路径无对外 POST、无非白名单外部请求）
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
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
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
const requests = [];
page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));

// ---- 1. L0 保底回归（小篆路径） ----
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.click('.im-grid-3 >> nth=0 >> text=用此模板');
await page.waitForTimeout(2500);

// 按选项内容定位字体下拉（不依赖分组索引，避免新增参数组导致漂移）
const fontSelect = page
  .locator('.im-options__group')
  .filter({ has: page.locator('option[value="seal"]') })
  .locator('select')
  .first();
await fontSelect.selectOption('seal');
await page.waitForTimeout(1500);
check('参数面板出现小篆选项', (await fontSelect.inputValue()) === 'seal');

const input = page.locator('textarea[aria-label="正文"]');
await input.fill('福寿康宁龘');
await page.waitForTimeout(4000); // 等待字表加载 + 字体注册 + 渲染

const hint = await page.textContent('.im-editor__seal-hint').catch(() => '');
check('越界字符提示出现（龘 越界）', /自动跳过|不在小篆字库内|越界/.test(hint || ''), (hint || '').slice(0, 40) || '无');
check('覆盖率信息随提示显示', /%/.test(hint || ''), (hint || '').match(/[\d]+%/)?.[0] || '未显示百分比');

const ink = await page.$eval('.im-preview__canvas', (c) => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] < 100 && d[i + 1] < 100 && d[i + 2] < 100) n++;
  return n;
});
check('预览画布渲染篆字墨迹（L0 保底）', ink > 500, `墨迹像素 ${ink}`);

// ---- 2. 字源层级开关 ----
await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const layersSelect = page.locator('select').filter({ has: page.locator('option[value="all"]') });
check('设置页出现篆书字源层级选择', (await layersSelect.count()) === 1);
// 三态可切换且均合法（selectOption 非法值会抛错）
await layersSelect.selectOption('L0L1');
await page.waitForTimeout(300);
check('可切换至 L0L1（霞鹜+敬峰）', (await layersSelect.inputValue()) === 'L0L1');
await layersSelect.selectOption('all');
await page.waitForTimeout(300);
check('可切换至 all（含全字库 L2）', (await layersSelect.inputValue()) === 'all');
await layersSelect.selectOption('L0');
await page.waitForTimeout(300);
check('可切回 L0（保底）', (await layersSelect.inputValue()) === 'L0');

// ---- 3. 资产命名空间升至 v3 ----
const cacheNames = await page.evaluate(async () => {
  try {
    return await caches.keys();
  } catch {
    return [];
  }
});
check('当前资产缓存为 v3 命名空间', cacheNames.includes('inkmotion-assets-v3'), cacheNames.join(', '));
check('旧 v2 历史缓存已被清理', !cacheNames.includes('inkmotion-assets-v2'));

// ---- 4. 零上传隐私断言 ----
const external = requests.filter(
  (r) => !r.url.startsWith(BASE) && !r.url.startsWith('data:') && !r.url.startsWith('blob:') &&
    !['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'].some((h) => r.url.includes(h)),
);
const posts = requests.filter((r) => r.method !== 'GET' && !r.url.startsWith(BASE));
check('篆书路径无非白名单外部请求', external.length === 0, external.map((r) => r.url).join(', ') || '无');
check('篆书路径无对外 POST', posts.length === 0);
check('页面无运行时错误', pageErrors.length === 0, pageErrors.join(' | ') || '无');

await browser.close();
console.log(`\n===== V2-C1 E2E 结果：${results.length - failed}/${results.length} 通过 =====`);
process.exit(failed === 0 ? 0 : 1);
