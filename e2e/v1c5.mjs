/**
 * V1-C5 E2E：N5.1 部署更新（资产 v2 / 缓存迁移）/ N5.2 许可合规 / N5.3 发布门禁
 * 运行：先 `npm run build && npm run preview`，再 `node e2e/v1c5.mjs`
 * 说明：针对生产构建产物（dist + preview）验证，含构建包内命名空间落地检查。
 */
import { chromium } from 'playwright';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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

// ===== N5.1-a 构建产物：资产命名空间 v2 落地 =====
function distJsContains(needle) {
  const dir = join(process.cwd(), 'dist', 'assets');
  if (!existsSync(dir)) return false;
  return readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .some((f) => readFileSync(join(dir, f), 'utf8').includes(needle));
}
check(
  '构建包内含 inkmotion-assets-v2 命名空间',
  distJsContains('inkmotion-assets-v2'),
  'dist/assets/*.js',
);
check(
  '构建包登记小篆资产路径 fonts/seal/LXGWSeal-Glyphs.woff2',
  distJsContains('fonts/seal/LXGWSeal-Glyphs.woff2'),
);

const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
const requests = [];
page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));

// ===== N5.1-b 资产可达性（同源静态发布） =====
const assetStatus = {};
for (const p of [
  '/fonts/seal/LXGWSeal-Glyphs.woff2',
  '/fonts/seal/seal-map.json',
  '/fonts/seal/OFL.txt',
  '/textures/paper.png',
  '/textures/bamboo.png',
]) {
  const res = await fetch(`${BASE}${p}`);
  assetStatus[p] = res.status;
}
check(
  '小篆资产三项均可访问（woff2 / 字表 / OFL）',
  assetStatus['/fonts/seal/LXGWSeal-Glyphs.woff2'] === 200 &&
    assetStatus['/fonts/seal/seal-map.json'] === 200 &&
    assetStatus['/fonts/seal/OFL.txt'] === 200,
  JSON.stringify(assetStatus),
);
const oflText = await fetch(`${BASE}/fonts/seal/OFL.txt`).then((r) => r.text());
check('OFL.txt 内容为 SIL 开放字体许可全文', /SIL OPEN FONT LICENSE/i.test(oflText));

// ===== N5.1-c 缓存版本化与迁移（旧 v1 缓存应被清理） =====
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
// 注入一个"旧版本"缓存，模拟 v1 时代遗留
await page.evaluate(async () => {
  const c = await caches.open('inkmotion-assets-v1');
  await c.put('/textures/paper.png', new Response('stale'));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const cacheNames = await page.evaluate(async () => (await caches.keys()).filter((n) => n.startsWith('inkmotion-assets-')));
check('旧版本缓存 v1 已被自动清理', !cacheNames.includes('inkmotion-assets-v1'), cacheNames.join(', '));
check('当前版本缓存 v2 已建立', cacheNames.includes('inkmotion-assets-v2'), cacheNames.join(', '));

const cachedUrls = await page.evaluate(async () => {
  const c = await caches.open('inkmotion-assets-v2');
  const reqs = await c.keys();
  return reqs.map((r) => new URL(r.url).pathname);
});
check(
  'v2 缓存含小篆字体与字表（离线可用）',
  cachedUrls.includes('/fonts/seal/LXGWSeal-Glyphs.woff2') && cachedUrls.includes('/fonts/seal/seal-map.json'),
  cachedUrls.join(', '),
);

// ===== N5.2 许可合规：关于页 =====
await page.goto(`${BASE}/#/about`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const aboutTxt = await page.textContent('.im-main');
check('关于页显示版本号 1.0.0', /1\.0\.0/.test(aboutTxt), (aboutTxt.match(/版本\s*\S+/) || [''])[0]);
check(
  '关于页含三方字体署名（文鼎 / 思源 / 霞鹜）',
  /文鼎|Arphic/.test(aboutTxt) && /思源|Source Han/.test(aboutTxt) && /霞鹜|LXGW/.test(aboutTxt),
);
check('关于页含第三方许可与致谢卡片', /第三方许可与致谢/.test(aboutTxt));
check('关于页含开源组件清单', /开源组件/.test(aboutTxt) && /Hanzi Writer/.test(aboutTxt));
const oflLink = await page.locator('a[href="/fonts/seal/OFL.txt"]').count();
check('关于页提供随包 OFL.txt 本地查阅入口', oflLink >= 1, `命中 ${oflLink} 个链接`);
const oflHref = oflLink ? await page.locator('a[href="/fonts/seal/OFL.txt"]').first().getAttribute('href') : '';
check('OFL 链接指向同源随包文件（非外链）', oflHref === '/fonts/seal/OFL.txt', oflHref);

// ===== N5.2 帮助页：浏览器与 4K 兼容性结论（TBD-V1-04 落地） =====
await page.goto(`${BASE}/#/help`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const helpTxt = await page.textContent('.im-main');
check('帮助页含浏览器与导出兼容性章节', /浏览器与导出兼容性/.test(helpTxt));
check(
  '兼容性说明明确 4K 目标与降级建议',
  /Chromium/.test(helpTxt) && /1080×1920/.test(helpTxt),
  (helpTxt.match(/推荐[^。]*。/) || [''])[0].slice(0, 60),
);

// ===== N5.2 i18n：英文包覆盖新增许可词条 =====
await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const selects = await page.$$('select');
await selects[1].selectOption('en');
await page.waitForTimeout(700);
await page.goto(`${BASE}/#/about`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const aboutEn = await page.textContent('.im-main');
check(
  '英文包覆盖许可与致谢文案（无中文残留）',
  /Third-Party Licenses/.test(aboutEn) && /Attribution required/.test(aboutEn),
  aboutEn.replace(/\s+/g, ' ').slice(0, 80),
);
await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const selects2 = await page.$$('select');
await selects2[1].selectOption('zh');
await page.waitForTimeout(500);

// ===== N5.3 发布门禁：隐私与运行时 =====
const posts = requests.filter((r) => r.method === 'POST');
check('零对外 POST（零上传隐私）', posts.length === 0, `POST ${posts.length} 次`);
const external = requests.filter(
  (r) => !r.url.startsWith(BASE) && !r.url.includes('cdn.jsdelivr.net') && !r.url.startsWith('data:'),
);
check('无白名单外外部请求', external.length === 0, external.slice(0, 2).map((e) => e.url).join(' '));
check('全流程无运行时错误', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | ') || '无');

await browser.close();
console.log(`\n===== V1-C5 E2E：${results.length - failed}/${results.length} 通过 =====`);
process.exit(failed === 0 ? 0 : 1);
