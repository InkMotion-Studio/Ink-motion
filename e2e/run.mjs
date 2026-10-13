/**
 * N4.2 E2E 测试（Playwright）
 * 覆盖：核心用户旅程、零上传隐私断言、5000 字拦截、导出降级分支、无障碍基本检查。
 *
 * 运行：先 `npm run dev`，再 `node e2e/run.mjs`
 * 环境变量：BASE_URL（默认 http://localhost:5173）、CHROME_EXE（可选，指定 chromium 路径）
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

// 记录所有出站请求，用于零上传断言
const requests = [];
page.on('request', (r) => requests.push({ url: r.url(), method: r.method(), type: r.resourceType() }));

// ---- 1. 首页 ----
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
check('首页加载并显示品牌', (await page.textContent('.im-logo__name')) === '墨演 InkMotion');
check('首页有 3 个预设模板', (await page.$$('.im-grid-3 .im-card')).length >= 3);
check('存在跳到主内容的链接', (await page.$('.im-skip-link')) !== null);

// ---- 2. 进入编辑器 ----
await page.click('.im-grid-3 >> nth=0 >> text=用此模板');
await page.waitForTimeout(2500);
check('编辑器三栏渲染', (await page.$$('.im-editor__pane')).length === 3);
const dark = await page.$eval('.im-preview__canvas', (c) => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] < 100 && d[i + 1] < 100 && d[i + 2] < 100) n++;
  return n;
});
check('预览画布可见墨迹', dark > 500, `墨迹像素 ${dark}`);

// ---- 3. 参数交互 ----
await page.selectOption('.im-options__group >> nth=0 >> select', 'bamboo');
await page.waitForTimeout(800);
const bg = await page.inputValue('.im-options__group >> nth=0 >> input[type=color]');
check('切换竹简同步载体底色', bg.toLowerCase() === '#c9b083', bg);
check('参数面板分为 5 组', (await page.$$('.im-options__group')).length === 5);

// ---- 4. 5000 字硬上限拦截 ----
const longText = '永'.repeat(5200);
await page.fill('textarea[aria-label="正文"]', longText);
await page.waitForTimeout(500);
const actualLen = await page.$eval('textarea[aria-label="正文"]', (t) => t.value.length);
check('正文受 maxLength 限制在 5000 内', actualLen <= 5000, `实际 ${actualLen}`);

// ---- 5. Ctrl+S 保存 ----
await page.keyboard.press('Control+s');
await page.waitForTimeout(700);
check('保存后状态显示已保存', (await page.textContent('.im-editor__bar span[aria-live]')).includes('已保存'));

// ---- 6. 导出对话框与降级信息 ----
await page.click('text=导出视频');
await page.waitForTimeout(600);
const body = await page.textContent('.im-modal__body');
check('导出对话框显示推荐格式', /推荐格式/.test(body));
check('导出对话框显示能力（WebM/MP4）', /WebM/.test(body) && /MP4/.test(body));
check('超长文显示降帧提示', /降帧|分块/.test(body));
await page.click('.im-modal__close');
await page.waitForTimeout(300);

// ---- 7. 项目页 ----
await page.goto(`${BASE}/#/projects`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
check('项目页显示卡片', (await page.$$('.im-card')).length >= 1);
check('项目卡片含缩略图', (await page.$$('.im-proj-thumb')).length >= 1);
check('搜索框可用', (await page.$('input[aria-label="搜索项目"]')) !== null);

// ---- 8. 零上传隐私断言（核心）----
const external = requests.filter((r) => {
  const u = r.url;
  if (u.startsWith(BASE)) return false;
  if (u.startsWith('data:') || u.startsWith('blob:')) return false;
  // 允许公共 CDN 的静态字体/笔画数据（只读 GET，不含用户数据）
  const allowed = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];
  return !allowed.some((h) => u.includes(h));
});
const anyPostToExternal = requests.filter(
  (r) => r.method !== 'GET' && !r.url.startsWith(BASE) && !r.url.startsWith('blob:'),
);
check('无非白名单外部请求', external.length === 0, external.map((r) => r.url).join(', ') || '无');
check('无对外 POST（用户数据不外发）', anyPostToExternal.length === 0);
check('页面无运行时错误', pageErrors.length === 0, pageErrors.join(' | ') || '无');

// ---- 9. 无障碍基本检查 ----
const imgAltMissing = await page.$$eval('img', (imgs) => imgs.filter((i) => !i.alt).length);
check('所有图片有 alt', imgAltMissing === 0);
const btnNoName = await page.$$eval('button', (bs) =>
  bs.filter((b) => !b.textContent?.trim() && !b.getAttribute('aria-label')).length,
);
check('所有按钮有可访问名称', btnNoName === 0);
const lang = await page.getAttribute('html', 'lang');
check('html 声明语言', lang === 'zh-CN', lang || '缺失');

// ---- 10. 设置页隐私声明 ----
await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const settings = await page.textContent('.im-main');
check('设置页含隐私声明', /不会上传|仅存储于本机/.test(settings));

await browser.close();

console.log(`\n===== E2E 结果：${results.length - failed}/${results.length} 通过 =====`);
process.exit(failed === 0 ? 0 : 1);
