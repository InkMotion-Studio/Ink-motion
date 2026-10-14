/**
 * V2-C2 E2E：隶书路径 + 描边动画端到端验证
 * 运行：先 `npm run dev`，再 `node e2e/v2c2.mjs`
 * 覆盖：
 *   1) 隶书路径可选并渲染（整字显现，字体栈兜底，墨迹 > 0）
 *   2) 隶书字表面板（字表缺失时显示"待提供"信息性提示，不报错）
 *   3) 描边动画开关：仅受限字库可用；默认关闭；开启后仍渲染且无错误
 *   4) 关闭开关时行为与 V1.0 一致（无回归）
 *   5) 零上传断言
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

const inkCount = () =>
  page.$eval('.im-preview__canvas', (c) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 100 && d[i + 1] < 100 && d[i + 2] < 100) n++;
    return n;
  });

// 1. 首页 → 编辑器
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.click('.im-grid-3 >> nth=0 >> text=用此模板');
await page.waitForTimeout(2500);

// 2. 字体下拉应含隶书选项（下拉改为读 FONT_CATALOG）
const fontSelect = page.locator('.im-options__group >> nth=1 >> select');
const options = await page.$$eval('.im-options__group >> nth=1 >> select >> option', (os) =>
  os.map((o) => o.value),
);
check('字体下拉含隶书选项 li', options.includes('li'), options.join(','));

// 3. 选隶书 → 渲染
await fontSelect.selectOption('li');
await page.waitForTimeout(2500);
check('可切换到隶书路径', (await fontSelect.inputValue()) === 'li');

const input = page.locator('textarea[aria-label="正文"]');
await input.fill('永和九年，岁在癸丑。');
await page.waitForTimeout(2500);

const liHint = await page.textContent('.im-editor__li-hint').catch(() => '');
check('隶书提示区渲染', (liHint || '').length > 0, (liHint || '').slice(0, 30) || '无');

const liInk = await inkCount();
check('隶书路径渲染墨迹（字体栈兜底）', liInk > 500, `墨迹像素 ${liInk}`);

// 4. 隶书字表面板（字表缺失 → "待提供"提示；存在 → 网格）
const liPanel = await page.$('.im-li-panel');
check('隶书字表面板渲染', liPanel !== null);
const liPanelTxt = await page.textContent('.im-li-panel').catch(() => '');
check('隶书面板提示可见（待提供或字库计数）', /待提供|字库（\d+ 字）/.test(liPanelTxt || ''), (liPanelTxt || '').slice(0, 40));

// 5. 描边动画开关：仅受限字库可用，默认关闭
//     动画分组必须位于末尾（分组数从 5 → 6），不影响字体(nth=1)/画布(nth=4)
const groupCount = await page.$$eval('.im-options__group', (gs) => gs.length);
check('参数面板新增动画分组（共 6 组）', groupCount === 6, `实际 ${groupCount} 组`);

const outlineChk = page.locator('.im-options__group >> nth=5 >> input[type=checkbox]');
check('隶书路径下描边开关可用', (await outlineChk.isEnabled()) === true);
check('描边开关默认关闭', (await outlineChk.isChecked()) === false);

// 开启描边：仍渲染，无错误
await outlineChk.check();
await page.waitForTimeout(2500);
const outlineInk = await inkCount();
check('开启描边后仍渲染（不白屏）', outlineInk > 200, `墨迹像素 ${outlineInk}`);
check('开启描边后无运行时错误', pageErrors.length === 0, pageErrors.join(' | ') || '无');

// 关闭描边：恢复整字填充（与 V1.0 一致）
await outlineChk.uncheck();
await page.waitForTimeout(2000);
const offInk = await inkCount();
check('关闭描边后整字显现（无回归）', offInk > 500, `墨迹像素 ${offInk}`);

// 6. 切到楷体：描边开关应禁用（仅受限字库路径支持）
await fontSelect.selectOption('kai');
await page.waitForTimeout(1500);
const outlineChk2 = page.locator('.im-options__group >> nth=5 >> input[type=checkbox]');
check('楷体路径下描边开关禁用', (await outlineChk2.isEnabled()) === false);

// 7. 零上传断言
const external = requests.filter(
  (r) => !r.url.startsWith(BASE) && !r.url.startsWith('data:') && !r.url.startsWith('blob:') &&
    !['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'].some((h) => r.url.includes(h)),
);
const posts = requests.filter((r) => r.method !== 'GET' && !r.url.startsWith(BASE));
check('隶书路径无非白名单外部请求', external.length === 0, external.map((r) => r.url).join(', ') || '无');
check('隶书路径无对外 POST', posts.length === 0);
check('全流程无运行时错误', pageErrors.length === 0, pageErrors.join(' | ') || '无');

await browser.close();
console.log(`\n===== V2-C2 E2E 结果：${results.length - failed}/${results.length} 通过 =====`);
process.exit(failed === 0 ? 0 : 1);
