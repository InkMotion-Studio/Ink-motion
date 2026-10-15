// scripts/build-strokeorder.mjs
// C1 · 笔顺数据源内置（A+B 层 · 权威版）
// 构建期把权威笔顺序列导出为静态 JSON，运行期按需加载，彻底脱离 hanzi-writer CDN。
//
// 数据来源：cnchar（国产权威汉字库，其笔顺数据依据《现代汉语通用字笔顺规范》GF 3002-1999
// 及《通用规范汉字表》）。本脚本仅作「构建期提取」用途，运行时零依赖。
//
// 笔顺编码（cnchar 字母表）：
//   j 横(一)  g 横折  f 横折钩/横撇  k 横折提  q 横折弯钩  w 横折弯  b 横折竖
//   e 竖(丨)  r 竖折  t 竖提  y 竖弯  u 竖弯钩  i 竖折折
//   s 撇(丿)  a 撇点  p 撇折
//   d 点(丶)  n 捺(㇏)
//   h 提(㇀)  l 竖钩(亅)  o 弯钩  x 斜钩  c 卧钩  v 竖弯
// 详见 cnchar 官方文档「笔画形状」一节。

import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cnchar from 'cnchar';
import order from 'cnchar-order';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'strokeorder');
const CHUNK_SIZE = 512; // 每片 512 个码位

// 加载 cnchar + order 插件（仅构建期）
cnchar.use(order);

// 覆盖区间：CJK 统一表意文字基本区 U+4E00–U+9FFF（权威规范主力覆盖区）
const RANGE_START = 0x4e00;
const RANGE_END = 0x9fff;

function extractOrder(ch) {
  try {
    const r = cnchar.stroke(ch, 'order');
    if (Array.isArray(r) && r.length > 0) return r[0]; // 字符串如 "gesl"
  } catch {
    /* ignore */
  }
  return null;
}

function build() {
  mkdirSync(OUT_DIR, { recursive: true });
  const chunks = [];
  let total = 0;
  let missing = 0;

  for (let base = RANGE_START; base <= RANGE_END; base += CHUNK_SIZE) {
    const end = Math.min(base + CHUNK_SIZE - 1, RANGE_END);
    const map = {};
    for (let cp = base; cp <= end; cp++) {
      const ch = String.fromCodePoint(cp);
      const seq = extractOrder(ch);
      if (seq) {
        map[ch] = seq;
        total++;
      } else {
        missing++;
      }
    }
    const file = `strokes-${base.toString(16)}-${end.toString(16)}.json`;
    writeFileSync(join(OUT_DIR, file), JSON.stringify(map));
    chunks.push({ file, start: base, end, chars: Object.keys(map).length });
  }

  const manifest = {
    generatedBy: 'scripts/build-strokeorder.mjs',
    source: 'cnchar (依据《现代汉语通用字笔顺规范》GF 3002-1999 及《通用规范汉字表》)',
    encoding: {
      a: '撇点', b: '横折竖', c: '卧钩', d: '点', e: '竖', f: '横折钩/横撇', g: '横折',
      h: '提', i: '竖折折', j: '横', k: '横折提', l: '竖钩', m: '竖折', n: '捺',
      o: '弯钩', p: '撇折', q: '横折弯钩', r: '竖折', s: '撇', t: '竖提',
      u: '竖弯钩', v: '竖弯', w: '横折弯', x: '斜钩', y: '竖弯', z: '横折折'
    },
    range: { start: RANGE_START, end: RANGE_END },
    total,
    missing,
    chunks
  };
  writeFileSync(join(OUT_DIR, 'strokeorder.manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`[build-strokeorder] 导出 ${total} 字笔顺，缺失 ${missing}，分 ${chunks.length} 片 -> ${OUT_DIR}`);
}

// --check：校验已生成的产物（不重新生成），确认编码合法、抽样笔顺正确
function check() {
  const manifest = JSON.parse(readFileSync(join(OUT_DIR, 'strokeorder.manifest.json'), 'utf8'));
  const validKeys = new Set(Object.keys(manifest.encoding));
  let illegal = 0, sampled = 0;
  const expects = { 水: 'gesl', 永: 'kresl', 中: 'fcjf', 好: 'msjegj', 爱: 'skksdejsel', 国: 'fcjjfjkj' };
  let expectBad = 0;
  for (const c of manifest.chunks) {
    const d = JSON.parse(readFileSync(join(OUT_DIR, c.file), 'utf8'));
    for (const [ch, seq] of Object.entries(d)) {
      sampled++;
      for (const ch2 of seq) if (!validKeys.has(ch2)) { illegal++; break; }
      if (expects[ch] && expects[ch] !== seq) { expectBad++; console.log(`  笔顺不符: ${ch} 期望 ${expects[ch]} 实得 ${seq}`); }
    }
  }
  console.log(`[check] 抽样 ${sampled} 字 | 非法编码 ${illegal} | 期望对比不符 ${expectBad} | 覆盖 ${manifest.total} 字`);
  if (illegal > 0 || expectBad > 0) process.exit(1);
}

const mode = process.argv[2];
if (mode === '--check') check();
else build();
