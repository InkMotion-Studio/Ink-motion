#!/usr/bin/env node
// V2-C3 N3.2/N3.3：i18n 校验脚本（TC-V2-I18N-02/03 门禁）
//
// 职责（全部为"存在性/一致性"静态检查，不依赖运行时）：
//   1. zh/en 键集合完全一致（无缺漏、无多余）；
//   2. 每键 zh/en 取值均非空；
//   3. 同一键的 {占位符} 集合在中英两侧一致（避免插值错位）；
//   4. 硬编码扫描：页面/组件 JSX 文本、placeholder、aria-label、title 中不应残留中文，
//      除非该字符串位于 t() 调用、注释或字符串常量白名单内。
//
// 退出码：0=全绿；1=有违规（打印明细）。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const errors = [];
const warnings = [];

/** 提取 `'key': 'value'` 形式的对象字面量键值对。 */
function parsePack(file) {
  const src = readFileSync(file, 'utf8');
  const out = new Map();
  const re = /^\s*'([^']+)':\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'),?\s*$/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    out.set(m[1], (m[2] ?? m[3] ?? '').replace(/\\'/g, "'").replace(/\\"/g, '"'));
  }
  return out;
}

const zh = parsePack(join(ROOT, 'src/lib/i18n.zh.ts'));
const en = parsePack(join(ROOT, 'src/lib/i18n.en.ts'));

// 1. 键集合一致
for (const k of zh.keys()) if (!en.has(k)) errors.push(`EN 缺键：${k}`);
for (const k of en.keys()) if (!zh.has(k)) errors.push(`ZH 缺键：${k}`);

// 2. 取值非空
for (const [k, v] of zh) if (!v.trim()) errors.push(`ZH 空值：${k}`);
for (const [k, v] of en) if (!v.trim()) errors.push(`EN 空值：${k}`);

// 3. 占位符一致
const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort().join(',');
for (const [k, zv] of zh) {
  const ev = en.get(k);
  if (ev !== undefined && ph(zv) !== ph(ev)) {
    errors.push(`占位符不一致：${k}（zh={${ph(zv)}} en={${ph(ev)}}）`);
  }
}

// 4. 硬编码扫描（JSX 文本 / placeholder / aria-label / title 中的中文）
// 白名单：注释行、t() 内、含「」的模板拼接（越界提示走 t() + 变量，属正常）
const SCAN_DIRS = ['src/pages', 'src/components'];
const SKIP_FILE = /(__tests__|\.test\.|\.css$)/;
const CN = /[\u4e00-\u9fa5]/;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === '__tests__') continue;
      walk(full);
    } else if (/\.(tsx|ts)$/.test(name) && !SKIP_FILE.test(name)) {
      scanFile(full);
    }
  }
}

function scanFile(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    // JSX 直出中文（>中文< 或 纯文本行），排除 t('...') 与表达式
    const jsxText = line.match(/>\s*([^<>{]*[\u4e00-\u9fa5][^<>{]*)\s*</);
    // 属性形式的硬编码
    const attr = line.match(/(placeholder|aria-label|title)="([^"]*[\u4e00-\u9fa5][^"]*)"/);
    // 独立中文串（对象字面量等）——仅告警，不阻断（可能为数据而非 UI 文案）
    const bareCn = line.match(/(label|hint|message):\s*'([^']*[\u4e00-\u9fa5][^']*)'/);
    if (jsxText && !/t\(/.test(line)) {
      errors.push(`硬编码文案 ${relative(ROOT, file)}:${i + 1} → ${jsxText[1].trim()}`);
    }
    if (attr && !/t\(/.test(line)) {
      errors.push(`硬编码属性 ${relative(ROOT, file)}:${i + 1} → ${attr[1]}="${attr[2]}"`);
    }
    if (bareCn && !/t\(/.test(line)) {
      warnings.push(`疑似硬编码 ${relative(ROOT, file)}:${i + 1} → ${bareCn[1]}: '${bareCn[2]}'`);
    }
  });
}

for (const d of SCAN_DIRS) walk(join(ROOT, d));

// 输出
console.log(`i18n 校验：zh ${zh.size} 键 / en ${en.size} 键`);
if (warnings.length) {
  console.log(`\n告警（${warnings.length}）：`);
  warnings.forEach((w) => console.log('  ⚠ ' + w));
}
if (errors.length) {
  console.log(`\n错误（${errors.length}）：`);
  errors.forEach((e) => console.log('  ✗ ' + e));
  process.exit(1);
}
console.log('\n✓ i18n 校验通过：键集合一致、取值非空、占位符对齐、无硬编码 UI 文案');
