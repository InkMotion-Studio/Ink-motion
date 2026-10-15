/**
 * V1-C4 N4.2 统一 E2E 套件入口
 * 按序执行：MVP 回归 → V1-C1 → V1-C2 → V1-C3 → 发布检查单，汇总通过率。
 * 运行：先启动服务（dev:5173 / preview:4173），再 `node e2e/all.mjs`
 * 各子套件自行决定 BASE_URL；本脚本只负责编排与汇总。
 */
import { spawn } from 'node:child_process';

const CHROME = process.env.CHROME_EXE;

// 套件定义：名称 / 脚本 / 期望服务（dev=5173, preview=4173）
const SUITES = [
  { name: 'MVP 回归（run.mjs）', script: 'e2e/run.mjs', base: 'dev' },
  { name: 'V1-C1 古文字字库', script: 'e2e/v1c1.mjs', base: 'dev' },
  { name: 'V2-C1 篆书字源分层扩展', script: 'e2e/v2c1.mjs', base: 'dev' },
  { name: 'V2-C2 隶书路径与描边动画', script: 'e2e/v2c2.mjs', base: 'dev' },
  { name: 'V2-C3 国际化深化', script: 'e2e/v2c3.mjs', base: 'dev' },
  { name: 'V2-C4 字体体系（上传闭环+内置字库）', script: 'e2e/v2c4.mjs', base: 'preview' },
  { name: 'V2-C5 核心功能与界面重构', script: 'e2e/v2c5.mjs', base: 'preview' },
  { name: 'V1-C2 主题/多语言/内容页', script: 'e2e/v1c2.mjs', base: 'preview' },
  { name: 'V1-C3 字体上传/4K/取消', script: 'e2e/v1c3.mjs', base: 'preview' },
  { name: 'V1-C5 上线（资产 v2/许可/发布）', script: 'e2e/v1c5.mjs', base: 'preview' },
  { name: '发布检查单', script: 'e2e/release-check.mjs', base: 'preview' },
  { name: 'V2-C7 C5 书写引擎与观感', script: 'e2e/v2c7c5.mjs', base: 'preview' },
  { name: 'V2-C7 C6 载体体系重构', script: 'e2e/v2c7c6.mjs', base: 'preview' },
  { name: 'V2-C7 C7 整合回归（缺陷修复）', script: 'e2e/v2c7c7.mjs', base: 'preview' },
  { name: '无障碍审计（明/暗双主题）', script: 'e2e/a11y.mjs', base: 'preview' },
];

function runScript(script, env) {
  return new Promise((resolve) => {
    const child = spawn('node', [script], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (out += d.toString()));
    child.on('close', (code) => resolve({ code, out }));
  });
}

// 从子套件输出中提取 "X/Y 通过" 或 "N/N 通过"
function parseCount(out) {
  const m = out.match(/(\d+)\/(\d+)\s*通过/);
  if (m) return { pass: Number(m[1]), total: Number(m[2]) };
  return null;
}

const results = [];
let failed = 0;

console.log('===== InkMotion 统一 E2E 套件 =====\n');
if (!CHROME) console.log('提示：未设置 CHROME_EXE，将使用 Playwright 默认浏览器\n');

for (const s of SUITES) {
  process.stdout.write(`▶ ${s.name} … `);
  const env = CHROME ? { CHROME_EXE: CHROME } : {};
  const { code, out } = await runScript(s.script, env);
  const count = parseCount(out);
  const ok = code === 0;
  if (!ok) failed++;
  results.push({ name: s.name, ok, count, code });
  console.log(ok ? `✓ 通过${count ? `（${count.pass}/${count.total}）` : ''}` : `✗ 失败（exit ${code}）`);
  if (!ok) {
    // 打印失败套件的尾部输出，便于定位
    console.log(out.split('\n').slice(-12).join('\n'));
  }
}

console.log('\n===== 汇总 =====');
for (const r of results) {
  console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.count ? ` — ${r.count.pass}/${r.count.total}` : ''}`);
}
const totalPass = results.reduce((a, r) => a + (r.count?.pass ?? 0), 0);
const totalAll = results.reduce((a, r) => a + (r.count?.total ?? 0), 0);
console.log(`\n套件：${results.length - failed}/${results.length} 通过 · 用例：${totalPass}/${totalAll}`);
process.exit(failed === 0 ? 0 : 1);
