/**
 * V1-C1 E2E 冒烟：古文字（小篆）受限字库路径端到端验证
 * 运行：先 `npm run dev`，再 `node e2e/v1c1.mjs`
 * 覆盖：选小篆字体 → 输入（在库+越界混合）→ 越界提示出现 → 画布渲染篆字 → 零上传
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

// 1. 首页 → 编辑器
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.click('.im-grid-3 >> nth=0 >> text=用此模板');
await page.waitForTimeout(2500);

// 2. 选择小篆（古文字）字体
const fontSelect = page.locator('.im-options__group >> nth=1 >> select');
await fontSelect.selectOption('seal');
await page.waitForTimeout(1500);
check('参数面板出现小篆选项', (await fontSelect.inputValue()) === 'seal');

// 3. 字库浏览面板出现
check('受限字库浏览面板渲染', (await page.$('.im-seal-panel')) !== null);
const cellCount = await page.$$eval('.im-seal-panel__cell', (els) => els.length);
check('字库面板列出可用字', cellCount > 100, `可用字 ${cellCount}`);

// 4. 输入混合文本：福(在库) 寿(在库) 龘(越界)
const input = page.locator('textarea[aria-label="正文"]');
await input.fill('福寿康宁龘');
await page.waitForTimeout(4000); // 等待字表加载 + 字体注册 + 渲染

// 5. 越界提示出现（role=status / aria-live）
const hint = await page.textContent('.im-editor__seal-hint').catch(() => '');
check('越界字符提示出现', /不在小篆字库内|自动跳过/.test(hint || ''), hint?.slice(0, 40) || '无');

// 6. 画布渲染出墨迹（整字显现）
const ink = await page.$eval('.im-preview__canvas', (c) => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] < 100 && d[i + 1] < 100 && d[i + 2] < 100) n++;
  return n;
});
check('预览画布渲染篆字墨迹', ink > 500, `墨迹像素 ${ink}`);

// 7. 零上传断言
const external = requests.filter(
  (r) => !r.url.startsWith(BASE) && !r.url.startsWith('data:') && !r.url.startsWith('blob:') &&
    !['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'].some((h) => r.url.includes(h)),
);
const posts = requests.filter((r) => r.method !== 'GET' && !r.url.startsWith(BASE));
check('小篆路径无非白名单外部请求', external.length === 0, external.map((r) => r.url).join(', ') || '无');
check('小篆路径无对外 POST', posts.length === 0);
check('页面无运行时错误', pageErrors.length === 0, pageErrors.join(' | ') || '无');

await browser.close();
console.log(`\n===== V1-C1 E2E 结果：${results.length - failed}/${results.length} 通过 =====`);
process.exit(failed === 0 ? 0 : 1);
