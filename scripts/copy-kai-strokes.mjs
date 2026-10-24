// 将 hanzi-writer-data（npm 依赖）复制到 public/strokes/kai/，供运行时同源离线加载。
// 文件名使用 encodeURIComponent(字)，避免 Unicode 文件名在不同文件系统 / 静态服务器上的兼容问题。
// 由 package.json 的 predev / prebuild 自动调用。
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.resolve(root, 'node_modules/hanzi-writer-data');
const outDir = path.resolve(root, 'public/strokes/kai');

async function main() {
  let files;
  try {
    files = await fs.readdir(srcDir);
  } catch {
    // 找不到依赖时容错退出：绝不阻断 dev / build。
    // 运行时 KaiAdaptor 的 fetch 会 404 → 返回 null → 回落轮廓方案，项目仍可正常启动。
    console.warn(
      '[copy-kai-strokes] 未找到 node_modules/hanzi-writer-data，已跳过复制。\n' +
      '                  kai 将临时回落「轮廓近似」方案；请先 `npm install` 以启用楷体真笔顺。',
    );
    process.exit(0);
  }
  await fs.mkdir(outDir, { recursive: true });
  let count = 0;
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const ch = f.slice(0, -'.json'.length);
    const data = await fs.readFile(path.join(srcDir, f), 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      continue;
    }
    if (!parsed || !Array.isArray(parsed.medians) || parsed.medians.length === 0) continue;
    await fs.writeFile(path.join(outDir, encodeURIComponent(ch) + '.json'), data);
    count++;
  }
  console.log(`[copy-kai-strokes] 已导出 ${count} 个楷体逐笔数据到 public/strokes/kai/`);
}

main();
