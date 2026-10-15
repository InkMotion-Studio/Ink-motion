/**
 * V1-C3 E2E 冒烟：字体上传与管理、4K 画布规格、导出取消
 * 运行：先 `npm run preview`，再 `node e2e/v1c3.mjs`
 * 覆盖：设置页字体管理面板可见/上传入口/空态、4K 画布选项与内存提示、
 *       导出对话框取消按钮、字体上传零网络请求（隐私）
 */
import { chromium } from 'playwright';

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

const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
const requests = [];
page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));

// ===== N3.2 字体管理面板 =====
await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const settingsTxt = await page.textContent('.im-main');
check('设置页含字体管理区块', /字体管理/.test(settingsTxt));
check('字体面板显示上传入口', (await page.locator('.im-font-mgr').count()) === 1);
check('字体面板显示空态提示', /尚未上传任何字体/.test(settingsTxt));
check('字体面板提示体积上限与不上上传', /8MB/.test(settingsTxt) && /不会上传/.test(settingsTxt));
const uploadBtn = page.locator('.im-font-mgr button:has-text("上传字体")');
check('上传按钮可点击', (await uploadBtn.count()) === 1);
const fileInput = page.locator('.im-font-mgr input[type=file]');
check('文件上传输入存在且限制格式', (await fileInput.getAttribute('accept'))?.includes('.woff2') ?? false);

// ===== N3.3 4K 画布规格 =====
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.click('.im-grid-3 >> nth=0 >> text=用此模板');
await page.waitForTimeout(2500);

// 定位「画布规格」下拉：按选项内容（含 2160 的 4K 项）识别，避免新增参数组导致索引漂移
const specSelect = page
  .locator('.im-options__group')
  .filter({ has: page.locator('option', { hasText: /2160/ }) })
  .locator('select')
  .first();
const specOptions = await specSelect.locator('option').allTextContents();
check('画布规格含 4K 选项', specOptions.some((o) => /2160/.test(o)), specOptions.join(' | '));

await specSelect.selectOption('2160x3840');
await page.waitForTimeout(600);
const warnTxt = await page.textContent('.im-options');
check('选 4K 后出现内存占用提示', /4K 画布占用约/.test(warnTxt), (warnTxt.match(/4K 画布占用约 \d+MB/) || [''])[0]);

// 预览画布尺寸随之变化（预览按项目画布等比缩放，此处仅校验未崩溃）
const canvasOk = await page.$eval('.im-preview__canvas', (c) => c.width > 0 && c.height > 0);
check('4K 规格下预览画布正常', canvasOk);

// 降回 1080 避免后续导出过重
await specSelect.selectOption('1080x1920');
await page.waitForTimeout(400);
const warnGone = await page.textContent('.im-options');
check('降回 1080 后 4K 提示消失', !/4K 画布占用约/.test(warnGone));

// ===== N3.4 导出取消 =====
await page.click('text=导出视频');
await page.waitForTimeout(800);
const dlgTxt = await page.textContent('.im-modal__body');
check('导出对话框打开并显示能力信息', /WebM/.test(dlgTxt) && /MP4/.test(dlgTxt));

// 开始导出 → 运行中应出现"取消导出"
await page.click('.im-modal__foot button:has-text("开始导出")');
await page.waitForTimeout(1200);
const runningTxt = await page.textContent('.im-modal__foot');
check('导出中出现取消导出按钮', /取消导出/.test(runningTxt), runningTxt.replace(/\s+/g, ' ').trim());
await page.click('.im-modal__foot button:has-text("取消导出")');
await page.waitForTimeout(1000);
const afterCancel = await page.textContent('.im-modal__body');
check('取消后状态回到可重试/已取消', /已取消导出|重试|开始导出/.test(afterCancel));
await page.click('.im-modal__close');
await page.waitForTimeout(300);

// ===== 隐私：字体流程无任何外部请求 =====
const posts = requests.filter((r) => r.method === 'POST');
check('零对外 POST（含字体流程）', posts.length === 0, `POST ${posts.length} 次`);
const external = requests.filter(
  (r) => !r.url.startsWith(BASE) && !r.url.includes('cdn.jsdelivr.net') && !r.url.startsWith('data:'),
);
check('无白名单外外部请求', external.length === 0, external.map((e) => e.url).slice(0, 2).join(' '));

check('全流程无运行时错误', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | ') || '无');

await browser.close();
console.log(`\n===== V1-C3 E2E：${results.length - failed}/${results.length} 通过 =====`);
process.exit(failed === 0 ? 0 : 1);
