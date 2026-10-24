// 将 hanzi-writer-data（Arphic 许可的逐笔笔画数据集）复制到 public/hanzi-data/，
// 供运行时同源加载。这样楷体逐笔书写无需任何第三方 CDN，契合"零上传"承诺。
//
// 运行时机：npm install 后（postinstall 可选），以及 dev / build 前（predev / prebuild 已挂接）。
// 若数据已存在则跳过，避免重复复制。
import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
// 兼容两种包结构：hanzi-writer-data@2.x 把笔画 json 放在包根目录，
// 旧版/某些派生包可能放在 data/ 子目录。优先用 data/，不存在则回退根目录。
const base = join(root, 'node_modules', 'hanzi-writer-data');
const src = existsSync(join(base, 'data')) ? join(base, 'data') : base;
const dest = join(root, 'public', 'hanzi-data');

if (!existsSync(src)) {
  console.warn('[vendor:hanzi] 未找到 node_modules/hanzi-writer-data；请先运行 `npm install`。已跳过。');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });

const files = readdirSync(src).filter((f) => f.endsWith('.json'));
let copied = 0;
let skipped = 0;
for (const f of files) {
  const from = join(src, f);
  const to = join(dest, f);
  if (existsSync(to) && statSync(to).size === statSync(from).size) {
    skipped++;
    continue;
  }
  copyFileSync(from, to);
  copied++;
}
console.log(`[vendor:hanzi] 笔画数据已就绪：复制 ${copied} 个、跳过 ${skipped} 个 → public/hanzi-data/`);
