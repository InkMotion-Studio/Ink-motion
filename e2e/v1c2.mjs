/**
 * V1-C2 E2E 冒烟：主题（深色）、多语言（i18n）、内容页（模板库/帮助）
 * 运行：先 `npm run preview`，再 `node e2e/v1c2.mjs`
 * 覆盖：深色切换生效 + 对比度 AA、语言切换生效、帮助页可达且含书写路径说明、
 *       模板库含小篆模板、设置页主题/语言选项无 V1.0 占位标注、零上传
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

// 相对亮度与对比度（WCAG 2.1）
function lum(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const l1 = lum(a);
  const l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
const requests = [];
page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));

// 1. 首页：模板库含小篆模板
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const tplCount = await page.$$eval('.im-grid-3 .im-card__title', (els) => els.length);
check('首页模板库渲染', tplCount >= 4, `模板 ${tplCount} 个`);
const hasSealTpl = await page.textContent('body');
check('模板库含小篆模板', /小篆/.test(hasSealTpl), '含"小篆"字样');

// 2. 深色主题：顶栏按钮切换 → html[data-theme=dark]
const themeBtn = page.locator('.im-topnav__theme');
check('顶栏存在主题切换按钮', (await themeBtn.count()) === 1);
await themeBtn.click();
await page.waitForTimeout(500);
const theme = await page.getAttribute('html', 'data-theme');
check('切换到深色主题生效', theme === 'dark', `data-theme=${theme}`);

// 3. 深色对比度 AA：主文字 vs 背景
const darkColors = await page.evaluate(() => {
  const body = getComputedStyle(document.body);
  return { color: body.color, bg: body.backgroundColor };
});
const parse = (s) => (s.match(/\d+/g) || []).slice(0, 3).map(Number);
const cTxt = parse(darkColors.color);
const cBg = parse(darkColors.bg);
const ratio = contrast(cTxt, cBg);
check('深色主题正文对比度 ≥ 4.5:1（WCAG AA）', ratio >= 4.5, `${ratio.toFixed(2)}:1`);

// 4. 深色下切换回浅色
await themeBtn.click();
await page.waitForTimeout(400);
const themeBack = await page.getAttribute('html', 'data-theme');
check('可切回浅色主题', themeBack === 'light', `data-theme=${themeBack}`);

// 5. 帮助页可达且含书写路径说明
await page.click('.im-topnav__link:has-text("帮助")');
await page.waitForTimeout(700);
const helpTxt = await page.textContent('.im-main');
check('帮助页可达', /帮助/.test(helpTxt));
check('帮助页含三书写路径说明', /楷体/.test(helpTxt) && /宋体/.test(helpTxt) && /小篆/.test(helpTxt));
check('帮助页含隐私零上传说明', /不会上传|仅存储于本机|永不离开/.test(helpTxt));

// 6. 语言切换：设置页切 English → 导航文案变英文
await page.click('.im-topnav__link:has-text("设置")');
await page.waitForTimeout(600);
const settingsTxt = await page.textContent('.im-main');
check('设置页无"V1.0 计划"占位标注', !/V1\.0 计划/.test(settingsTxt), '已移除占位');
const langSelect = page.locator('.im-card__title:has-text("偏好") ~* select >> nth=1');
const selects = await page.$$('select');
// 语言选择为偏好卡片内第 2 个 select（主题/语言/默认载体）
await selects[1].selectOption('en');
await page.waitForTimeout(600);
const navTxt = await page.textContent('.im-topnav');
check('语言切换为 English 后导航文案变更', /Home|Projects|Help|Settings/.test(navTxt), navTxt.replace(/\s+/g, ' ').trim().slice(0, 60));
const htmlLang = await page.getAttribute('html', 'lang');
check('html lang 跟随语言切换', htmlLang === 'en', `lang=${htmlLang}`);

// 7. 切回中文
await selects[1].selectOption('zh');
await page.waitForTimeout(500);
const navZh = await page.textContent('.im-topnav');
check('可切回简体中文', /首页|我的项目/.test(navZh));

// 8. 零上传隐私
const posts = requests.filter((r) => r.method === 'POST');
check('零对外 POST（零上传隐私）', posts.length === 0, `POST ${posts.length} 次`);
const external = requests.filter(
  (r) => !r.url.startsWith(BASE) && !r.url.includes('cdn.jsdelivr.net') && !r.url.startsWith('data:'),
);
check('无白名单外外部请求', external.length === 0, external.map((e) => e.url).slice(0, 2).join(' '));

check('全流程无运行时错误', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | ') || '无');

await browser.close();
console.log(`\n===== V1-C2 E2E：${results.length - failed}/${results.length} 通过 =====`);
process.exit(failed === 0 ? 0 : 1);
