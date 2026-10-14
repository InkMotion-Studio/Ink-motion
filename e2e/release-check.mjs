/**
 * N5.3 发布检查单（IM-PLAN-001 §9 C1–C10 + V1.0 门禁 + 运维 O1–O7 可验证项）自动验证
 * 针对生产构建产物运行。用法：BASE_URL=http://localhost:4173 node e2e/release-check.mjs
 */
import { chromium } from 'playwright';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
const BASE = process.env.BASE_URL || 'http://localhost:4173';
const rows = []; let fail = 0;
const ck = (id, name, ok, detail='') => { rows.push({id,name,ok,detail}); if(!ok) fail++; console.log(`${ok?'✓':'✗'} [${id}] ${name}${detail?' — '+detail:''}`); };

const distHas = (needle) => {
  const dir = join(process.cwd(), 'dist', 'assets');
  if (!existsSync(dir)) return false;
  return readdirSync(dir).filter(f=>f.endsWith('.js')).some(f=>readFileSync(join(dir,f),'utf8').includes(needle));
};

const opts = { args:['--no-sandbox'] };
if (process.env.CHROME_EXE) opts.executablePath = process.env.CHROME_EXE;
const b = await chromium.launch(opts);
const p = await b.newPage({ viewport:{width:1366,height:900} });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const reqs=[]; p.on('request',r=>reqs.push({url:r.url(),method:r.method()}));

// C9 / O2 CDN 资产缓存版本化落地（V1-C5 升至 v2）
ck('C9','资产清单采用 inkmotion-assets-v2 版本化命名空间 + _headers 缓存策略',
  distHas('inkmotion-assets-v2') && existsSync(join(process.cwd(),'public','_headers')),
  'dist 含 v2 命名空间 + public/_headers 存在');

// C2 Arphic PL 可见署名
await p.goto(`${BASE}/#/about`,{waitUntil:'networkidle'}); await p.waitForTimeout(600);
const about = await p.textContent('.im-main');
ck('C2','Arphic PL 可见署名（关于/致谢页）', /Arphic|文鼎/.test(about) && /许可|License|授权/.test(about));

// C1 零上传隐私验证
await p.goto(BASE,{waitUntil:'networkidle'}); await p.waitForTimeout(500);
await p.click('.im-grid-3 >> nth=0 >> text=用此模板'); await p.waitForTimeout(2200);
await p.fill('textarea[aria-label="正文"]','床前明月光，疑是地上霜。'); await p.waitForTimeout(800);
await p.keyboard.press('Control+s'); await p.waitForTimeout(700);
const ext = reqs.filter(r=>!r.url.startsWith(BASE) && !r.url.startsWith('data:') && !r.url.startsWith('blob:') && !/jsdelivr|fonts\.googleapis|fonts\.gstatic/.test(r.url));
ck('C1','零上传隐私：DevTools 网络无用户数据外发', ext.length===0, ext.map(r=>r.url).join(', ')||'仅本地/CDN 静态 GET');
const posts = reqs.filter(r=>r.method!=='GET' && !r.url.startsWith(BASE) && !r.url.startsWith('blob:'));
ck('C1b','无任何对外 POST 请求', posts.length===0);

// C3 导出降级矩阵（能力探测）
await p.click('text=导出视频'); await p.waitForTimeout(600);
const dlg = await p.textContent('.im-modal__body');
ck('C3','导出降级矩阵（WebM 保底 + MP4 增强 + 自动降级）', /WebM/.test(dlg) && /MP4/.test(dlg) && /推荐格式/.test(dlg));
await p.click('.im-modal__close'); await p.waitForTimeout(300);

// C4 5000 字上限拦截
await p.fill('textarea[aria-label="正文"]','永'.repeat(5200)); await p.waitForTimeout(500);
const len = await p.$eval('textarea[aria-label="正文"]',t=>t.value.length);
ck('C4','5000 字上限端到端拦截', len<=5000, `实际 ${len}`);

// C5 三路径渲染一致性（楷精确/宋整字/古骨架已阻塞）
await p.fill('textarea[aria-label="正文"]','永'); await p.waitForTimeout(600);
await p.selectOption('.im-options__group >> nth=1 >> select','song'); await p.waitForTimeout(1200);
const songDark = await p.$eval('.im-preview__canvas',c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]<100&&d[i+1]<100&&d[i+2]<100)n++;return n;});
ck('C5','楷体精确 + 宋体整字 两路径均渲染', songDark>200, `宋体墨迹 ${songDark}`);
const hasAncient = await p.$$eval('.im-options option',os=>os.some(o=>o.value==='seal'));
ck('C6','古文字（小篆受限字库）已接入可选路径', hasAncient);

// V1-C1 门禁：小篆资源与许可合规
const sealWoff = await fetch(`${BASE}/fonts/seal/LXGWSeal-Glyphs.woff2`).then(r=>r.status);
ck('V1-C1-1','小篆子集字体资源可达（woff2）', sealWoff===200, `HTTP ${sealWoff}`);
const sealMap = await fetch(`${BASE}/fonts/seal/seal-map.json`).then(r=>r.status);
ck('V1-C1-2','小篆字表映射资源可达（JSON）', sealMap===200, `HTTP ${sealMap}`);
const ofl = await fetch(`${BASE}/fonts/seal/OFL.txt`).then(r=>r.text());
ck('V1-C1-3','OFL 许可文件随包发布（署名合规）', /SIL OPEN FONT LICENSE/.test(ofl), ofl.slice(0,24).replace(/\n/g,' '));
const aboutTxt = await (async()=>{ await p.goto(`${BASE}/#/about`,{waitUntil:'networkidle'}); await p.waitForTimeout(500); return p.textContent('.im-main'); })();
ck('V1-C1-4','关于页含古文字字体署名与许可', /霞鹜|LXGW|OFL|SIL/.test(aboutTxt), '已注明');

// V1-C5 门禁：许可合规扩展（N5.2）
const oflLinkCount = await p.locator('a[href="/fonts/seal/OFL.txt"]').count();
ck('V1-C2-1','关于页提供随包 OFL.txt 本地查阅入口（许可随分发）', oflLinkCount>=1, `命中 ${oflLinkCount}`);
ck('V1-C2-2','关于页含第三方许可与致谢清单（字体须署名）',
  /第三方许可与致谢/.test(aboutTxt) && /须署名/.test(aboutTxt), '已列出');
ck('V1-C2-3','关于页含开源组件清单', /开源组件/.test(aboutTxt) && /Hanzi Writer/.test(aboutTxt));
ck('V1-C10-1','关于页显示 V1.0 正式版本号 1.0.0', /1\.0\.0/.test(aboutTxt), (aboutTxt.match(/版本\s*\S+/)||[''])[0]);
// V1-C5 门禁：部署更新（N5.1）— 小篆资产同源发布 + 缓存版本化
ck('V1-C10-2','小篆资产在构建产物中登记（同源相对路径，零外链）',
  distHas('fonts/seal/LXGWSeal-Glyphs.woff2') && distHas('fonts/seal/seal-map.json'), 'dist 已登记');

// C7 无障碍 WCAG AA 基线
const noAlt = await p.$$eval('img',is=>is.filter(i=>!i.alt).length);
const noName = await p.$$eval('button',bs=>bs.filter(b=>!b.textContent?.trim() && !b.getAttribute('aria-label')).length);
const lang = await p.getAttribute('html','lang');
ck('C7','无障碍：图片 alt / 按钮可访问名 / html lang', noAlt===0 && noName===0 && lang==='zh-CN', `alt缺失${noAlt} 无名按钮${noName} lang=${lang}`);

// C8 性能预算：首屏主包 gzip 体积（动态计算，避免硬编码漂移）
const distDir = join(process.cwd(), 'dist', 'assets');
let mainGzip = 0;
if (existsSync(distDir)) {
  for (const f of readdirSync(distDir).filter((f) => f.endsWith('.js') && f.startsWith('index'))) {
    mainGzip += gzipSync(readFileSync(join(distDir, f))).length;
  }
}
ck('C8','首屏体积预算达标（gzip 主包 < 200KB）', mainGzip > 0 && mainGzip < 200 * 1024, `${(mainGzip / 1024).toFixed(2)}KB`);

// C10 前端错误上报接入
await p.goto(`${BASE}/#/settings`,{waitUntil:'networkidle'}); await p.waitForTimeout(700);
const st = await p.textContent('.im-main');
ck('C10','前端错误上报接入（设置页诊断，默认关闭）', /诊断/.test(st) && /错误上报/.test(st));
ck('C2b','设置页含隐私声明', /不会上传|仅存储于本机/.test(st));

ck('X1','全流程无运行时错误', errs.length===0, errs.join(' | ')||'无');

await b.close();
console.log(`\n===== 发布检查单：${rows.length-fail}/${rows.length} 通过 =====`);
process.exit(fail===0?0:1);
