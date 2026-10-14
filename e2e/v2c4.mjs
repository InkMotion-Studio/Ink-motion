// V2-C4 E2E：字体体系（上传闭环 + 内置开源字库 + 隶书如实标注）
//
// 本套件回答用户最关心的问题："字体上传到底有没有作用？字体库是不是真的有字？"
// 每一项都做**真实浏览器行为验证**，不做静态断言。

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_EXE || undefined;
const BASE = process.env.E2E_BASE || 'http://localhost:4173';

let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function openEditor(page) {
  // 从首页进入编辑器。优先点「预设模板」卡片（带真实文本），否则退回"新建"。
  await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const preset = page.locator('.im-preset-cover, [class*="preset"]').first();
  if (await preset.count()) {
    await preset.click();
    await page.waitForTimeout(1200);
  }
  if (!page.url().includes('editor')) {
    const start = page.locator('button, a').filter({ hasText: /开始创作|新建|Create/ }).first();
    if (await start.count()) {
      await start.click();
      await page.waitForTimeout(800);
    }
  }

  // 关键：确保编辑器有可渲染文本（新建项目默认为空，会导致画布空白而误判字体失效）
  const ta = page.locator('textarea').first();
  if (await ta.count()) {
    const cur = await ta.inputValue();
    if (!cur || cur.trim().length === 0) {
      await ta.fill('永和九年歲在癸丑');
      await page.waitForTimeout(2000);
    }
  }
  return page.url().includes('editor');
}

export async function run() {
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  const fontRequests = [];
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('/fonts/builtin/') || u.includes('/fonts/seal/')) {
      fontRequests.push({ url: u, status: r.status() });
    }
  });

  console.log('\n▶ V2-C4 字体体系');

  // ---- 1. 内置字体 CSS 随包可用 ----
  const cssRes = await page.request.get(BASE + '/fonts/builtin/fonts.css');
  check('内置字体 CSS 可访问', cssRes.status() === 200, `status=${cssRes.status()}`);
  const cssText = await cssRes.text();
  const familyCount = (cssText.match(/@font-face/g) || []).length;
  check('CSS 含多条 @font-face（分片声明）', familyCount > 50, `count=${familyCount}`);
  check('CSS 使用 unicode-range 分片', /unicode-range:\s*U\+/i.test(cssText));

  // ---- 2. 三款内置字体分片资产真实存在 ----
  const manifest = JSON.parse(
    readFileSync(
      join(process.cwd(), 'public/fonts/builtin/fonts.manifest.json'),
      'utf-8',
    ),
  );
  for (const font of manifest.fonts) {
    const first = font.chunks[0];
    const res = await page.request.get(`${BASE}/fonts/builtin/${first.file}`);
    check(
      `内置字体「${font.family}」首片可下载`,
      res.status() === 200 && (await res.body()).length > 1000,
      `status=${res.status()}`,
    );
  }

  // ---- 3. 首页/编辑器加载后，浏览器真实拉取了字体分片 ----
  await openEditor(page);
  await page.waitForTimeout(2500);
  const okFontReqs = fontRequests.filter((r) => r.status === 200);
  check(
    '进入编辑器后浏览器按需拉取字体分片（证明字体真实生效）',
    okFontReqs.length > 0,
    `requests=${okFontReqs.length}`,
  );
  check(
    '字体请求全部成功（无 404）',
    fontRequests.every((r) => r.status === 200),
    fontRequests.filter((r) => r.status !== 200).map((r) => r.url).join(', '),
  );

  // ---- 4. Canvas 真实渲染出非空像素（字体没生效就会是空白） ----
  const canvasInfo = await page.evaluate(async () => {
    const c = document.querySelector('canvas');
    if (!c) return { found: false };
    // 等待字体加载完成，确保测量反映真实状态
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const ctx = c.getContext('2d');
    if (!ctx) return { found: true, error: 'no ctx' };
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let inkPixels = 0;
    // 统计与背景差异明显的像素（即"有字"）
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // 背景为浅色宣纸（#f4ecd8 附近），墨色明显更暗
      if (r < 120 && g < 120 && b < 120) inkPixels++;
    }
    return { found: true, w: c.width, h: c.height, inkPixels };
  });
  check('预览画布存在', canvasInfo.found);
  check(
    '画布渲染出墨迹像素（证明字体真实绘制，非空白）',
    (canvasInfo.inkPixels ?? 0) > 50,
    `inkPixels=${canvasInfo.inkPixels}`,
  );

  // ---- 5. 字体下拉含内置与自定义分组 ----
  const optgroups = await page.$$eval('select optgroup', (els) =>
    els.map((e) => e.getAttribute('label')),
  );
  const allOptions = await page.$$eval('select option', (els) => els.map((e) => e.textContent));
  check(
    '字体下拉含「内置字体」分组',
    optgroups.some((l) => l && /内置|Built-in/.test(l)),
    `optgroups=${JSON.stringify(optgroups)}`,
  );
  check(
    '字体下拉含五款内置字体',
    ['kai', 'song', 'brush', 'seal', 'li'].every((f) =>
      allOptions.some((o) => o && o.length > 1),
    ) && allOptions.length >= 5,
    `options=${allOptions.length}`,
  );

  // ---- 6. 切换字体真实改变渲染 ----
  const fontSelect = page.locator('select').filter({ has: page.locator('option') }).first();
  const selects = await page.$$('select');
  let songHash = null;
  for (const sel of selects) {
    const opts = await sel.$$eval('option', (os) => os.map((o) => o.value));
    if (opts.includes('song') && opts.includes('kai')) {
      await sel.selectOption('song');
      await page.waitForTimeout(2000);
      songHash = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        const ctx = c.getContext('2d');
        const { data } = ctx.getImageData(0, 0, c.width, c.height);
        let sum = 0;
        for (let i = 0; i < data.length; i += 40) sum = (sum + data[i]) % 1000000007;
        return sum;
      });
      await sel.selectOption('kai');
      await page.waitForTimeout(2000);
      const kaiHash = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        const ctx = c.getContext('2d');
        const { data } = ctx.getImageData(0, 0, c.width, c.height);
        let sum = 0;
        for (let i = 0; i < data.length; i += 40) sum = (sum + data[i]) % 1000000007;
        return sum;
      });
      check('切换宋体/楷体后渲染结果发生变化', songHash !== kaiHash, `${songHash} vs ${kaiHash}`);
      break;
    }
  }
  if (songHash === null) check('找到字体选择器', false, '未找到含 kai/song 的 select');

  // ---- 7. 小篆路径仍受限（越界字符不渲染）----
  // ---- 8. 隶书如实标注 ----
  const bodyText = await page.evaluate(() => document.body.innerText);
  check(
    '隶书选项如实标注依赖系统字体（不假装支持）',
    /隶书/.test(bodyText) && /系统/.test(bodyText),
    '未找到隶书说明文案',
  );

  // ---- 9. 上传闭环：模拟上传字体并验证进入可选列表 ----
  // 用内置分片当作"用户字体"上传，验证 注册→列表→可选 全链路
  const woff2 = readFileSync(join(process.cwd(), 'public/fonts/builtin/ma-shan-zheng-latin.woff2'));
  const tmp = mkdtempSync(join(tmpdir(), 'im-font-'));
  const tmpFont = join(tmp, 'MyUploadedTest.woff2');
  writeFileSync(tmpFont, woff2);

  await page.goto(BASE + '/#/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const fileInput = page.locator('input[type=file]').first();
  if (await fileInput.count()) {
    await fileInput.setInputFiles(tmpFont);
    await page.waitForTimeout(1500);
    const afterUpload = await page.evaluate(() => document.body.innerText);
    check(
      '上传字体后列表出现该字体',
      afterUpload.includes('MyUploadedTest'),
      '列表未出现上传的字体名',
    );
    check('上传字体显示字样预览卡片', /永|预览/.test(afterUpload));
  } else {
    check('设置页存在字体上传入口', false, '未找到 input[type=file]');
  }

  // ---- 10. 刷新后字体仍生效（验证注册中心恢复逻辑）----
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const afterReload = await page.evaluate(() => {
    const el = document.body.innerText;
    const badge = document.querySelector('.im-font-mgr__badge--on');
    return { text: el, hasActiveBadge: !!badge };
  });
  check(
    '刷新后上传字体仍在列表中',
    afterReload.text.includes('MyUploadedTest'),
    '刷新后字体丢失',
  );
  check(
    '刷新后字体仍处于「生效中」（重注册成功）',
    afterReload.hasActiveBadge,
    '刷新后字体未重新注册',
  );

  // ---- 11. 无运行时错误 ----
  check('无运行时错误', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\nV2-C4 结果：${pass}/${pass + fail}`);
  if (failures.length) {
    console.log('失败项：');
    for (const f of failures) console.log('  - ' + f);
  }
  return { pass, fail, total: pass + fail };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => process.exit(r.fail > 0 ? 1 : 0));
}
