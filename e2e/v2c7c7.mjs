/**
 * V2-C7 C7 · 整合回归 E2E（真实浏览器）
 *
 * 针对 V2-C6 Bug 清单暴露的「测试样本不真实 / 只测确定路径」流程缺陷，
 * 本脚本统一使用**真实样本文本**（含中文标点 / 数字 / 中英混排 / 生僻字）
 * 与**默认路径**（不显式保存即离开 / 不点保存看是否落库）。
 *
 * 用法：BASE_URL=http://localhost:4173 CHROME_EXE=/usr/bin/chromium node e2e/v2c7c7.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const rows = [];
let fail = 0;
const ck = (id, name, ok, detail = '') => {
  rows.push({ id, name, ok, detail });
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
};

const opts = { args: ['--no-sandbox'] };
if (process.env.CHROME_EXE) opts.executablePath = process.env.CHROME_EXE;

const b = await chromium.launch(opts);
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();

const pageErrors = [];
const reqs = [];
p.on('pageerror', (e) => pageErrors.push(e.message));
p.on('request', (r) => reqs.push(r.url()));
p.on('response', (r) => {
  if (r.status() === 404) reqs.push('__404__' + r.url());
});

/** 进入编辑器：首页 → 用此模板 */
async function enterEditor() {
  await p.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  const btn = p.locator('button').filter({ hasText: /用此模板/ }).first();
  if (await btn.count()) await btn.click();
  await p.waitForTimeout(1800);
}

try {
  // ============ BUG-003：真实样本文本（含标点/数字/中英混排）零 404 ============
  await enterEditor();
  const realText = '床前明月光，疑是地上霜。2024 年 10 月 14 日，ABC 测试；《静夜思》！？';
  const ta = p.locator('textarea').first();
  await ta.fill(realText);
  await p.waitForTimeout(2600); // 等预加载完成
  const fours = reqs.filter((u) => u.startsWith('__404__'));
  ck('BUG-003', '真实文本（标点/数字/中英混排）渲染零 404', fours.length === 0,
    fours.length ? fours.slice(0, 5).join(', ') : '零 404');
  // 画面确有墨迹（非空白）
  const ink1 = await p.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return -1;
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 20) n++;
    return n;
  });
  ck('BUG-003b', '真实文本画面有墨迹输出', ink1 > 0, `ink=${ink1}`);

  // ============ BUG-001：暂停后进度静止 ============
  const pctText = () => p.locator('.im-preview__pct').first().textContent();
  const readPct = async () => {
    const t = (await pctText()) || '0%';
    return parseInt(t.replace('%', ''), 10) || 0;
  };
  // 触发从头播放
  const pauseBtn = p.locator('.im-preview__controls button').first();
  await pauseBtn.click(); // 暂停
  await p.waitForTimeout(400);
  const a1 = await readPct();
  await p.waitForTimeout(900);
  const a2 = await readPct();
  await p.waitForTimeout(900);
  const a3 = await readPct();
  ck('BUG-001', '点击暂停后进度条静止（三次采样不变）', a1 === a2 && a2 === a3,
    `暂停后: ${a1}% → ${a2}% → ${a3}%`);

  // ============ BUG-002：编辑后不点保存，数据自动落库（直接读 IndexedDB 断言）============
  await enterEditor();
  const ta2 = p.locator('textarea').first();
  const stamp = 'C7AUTO' + Date.now().toString().slice(-6);
  await ta2.fill(stamp);
  // 等待 debounce(800ms) + 写库；全程不点保存。
  // 轮询而非单次等待：完整套件连跑时机器负载高，落库可能超过 1.6s。
  const readDb = async (s) =>
    p.evaluate(async (needle) => {
      const req = indexedDB.open('inkmotion');
      const db = await new Promise((res, rej) => {
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      const tx = db.transaction('projects', 'readonly');
      const all = await new Promise((res) => {
        const g = tx.objectStore('projects').getAll();
        g.onsuccess = () => res(g.result);
      });
      return all.some((x) => (x.text || '').includes(needle));
    }, s);
  let persisted = false;
  for (let i = 0; i < 15 && !persisted; i++) {
    await p.waitForTimeout(400);
    persisted = await readDb(stamp);
  }
  ck('BUG-002', '编辑后不点保存，正文已自动落库（IndexedDB 直读）', persisted,
    persisted ? `含「${stamp}」` : '未落库');

  // ============ BUG-005：纯生僻字给出缺字提示（不再静默） ============
  await enterEditor();
  const ta3 = p.locator('textarea').first();
  await ta3.fill('𠀀𠀁𠀂');
  await p.waitForTimeout(2600);
  const hintText = await p.locator('.im-editor__font-hint').first().textContent().catch(() => '');
  ck('BUG-005', '纯生僻字（扩展 B 区）给出「当前字体不支持」提示',
    !!hintText && /不支持|unsupported/i.test(hintText),
    hintText ? hintText.slice(0, 40) : '(无提示)');

  // ============ BUG-006：长文出现「正在准备」进度 ============
  await enterEditor();
  const ta4 = p.locator('textarea').first();
  // 用**多种不同汉字**（去重后字符数多）才能触发多批次加载与进度上报
  const varied = Array.from({ length: 2500 }, (_, i) => String.fromCodePoint(0x4e00 + (i % 1500))).join('');
  await ta4.fill(varied);
  // 探测准备态（预加载分批需要时间）
  let sawPrep = false;
  for (let i = 0; i < 60; i++) {
    const prep = await p.locator('.im-preview__prep').count();
    if (prep > 0) {
      sawPrep = true;
      break;
    }
    await p.waitForTimeout(50);
  }
  await p.waitForTimeout(4000);
  const ink4 = await p.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return -1;
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4 * 131) if (d[i] > 20) n++;
    return n;
  });
  ck('BUG-006', '长文（2500 字·多字符）预加载出现「正在准备」进度且最终有输出',
    sawPrep && ink4 > 0, `prep=${sawPrep} ink=${ink4}`);

  // ============ 全局：零页面异常 ============
  ck('GLOBAL', '全程零未捕获页面异常', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  // 截图留证
  await p.screenshot({ path: 'docs/c7-shots/c7-regression-final.png' });
} catch (e) {
  ck('EXCEPTION', '脚本执行异常', false, String(e && e.message ? e.message : e));
}

await b.close();

const passed = rows.filter((r) => r.ok).length;
console.log(`\n===== C7 整合回归：${passed}/${rows.length} 通过 =====`);
process.exit(fail ? 1 : 0);
