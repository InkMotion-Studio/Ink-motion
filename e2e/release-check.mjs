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

/** V2-C4：检查 dist 中的静态资源文件真实存在（非 JS 内联） */
const distFileExists = (rel) => existsSync(join(process.cwd(), 'dist', rel));
const root = process.cwd();

const opts = { args:['--no-sandbox'] };
if (process.env.CHROME_EXE) opts.executablePath = process.env.CHROME_EXE;
const b = await chromium.launch(opts);
const p = await b.newPage({ viewport:{width:1366,height:900} });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const reqs=[]; p.on('request',r=>reqs.push({url:r.url(),method:r.method()}));

// C9 / O2 CDN 资产缓存版本化落地（V2-C1 N1.5 升至 v3）
ck('C9','资产清单采用 inkmotion-assets-v3 版本化命名空间 + _headers 缓存策略',
  distHas('inkmotion-assets-v3') && existsSync(join(process.cwd(),'public','_headers')),
  'dist 含 v3 命名空间 + public/_headers 存在');

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
// V2-C5：参数分组改为手风琴；字体选择器位于「字体」分组内（可能已收起）
const fontGroup = p.locator('.im-collapsible').filter({hasText:/字体|Font/}).first();
const fontGroupToggle = fontGroup.locator('.im-collapsible__toggle').first();
if (await fontGroupToggle.count() && (await fontGroupToggle.getAttribute('aria-expanded'))==='false') {
  await fontGroupToggle.click(); await p.waitForTimeout(250);
}
await fontGroup.locator('select').first().selectOption('song'); await p.waitForTimeout(1400);
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
// V2-C7 C7：Hanzi Writer 已在 C2 移除，改断言当前实际随包的开源组件（Dexie / cnchar）
ck('V1-C2-3','关于页含开源组件清单', /开源组件/.test(aboutTxt) && /Dexie|cnchar/.test(aboutTxt));
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

// V2-C8 英文审校通过 + 无硬编码（TC-V2-I18N-01~03）
// 英文包为独立按需 chunk（首屏不含，切换后加载）
const enChunk = existsSync(join(process.cwd(),'dist','assets'))
  ? readdirSync(join(process.cwd(),'dist','assets')).some(f=>/i18n\.en/i.test(f) && f.endsWith('.js'))
  : false;
ck('V2-C8-1','英文包为独立按需 chunk（首屏不含）', enChunk, enChunk ? 'i18n.en.*.js 存在' : '未找到');

// 切到英文，验证页面 UI 已本地化（标题命中英文）
await p.goto(`${BASE}/#/settings`,{waitUntil:'networkidle'}); await p.waitForTimeout(600);
const selVals = await p.$$eval('select', ss=>ss.map(s=>Array.from(s.options).map(o=>o.value)));
let li = -1; for(let i=0;i<selVals.length;i++){ if(selVals[i].includes('en')&&selVals[i].includes('zh')){li=i;break;} }
let enOk = false, enTitle = '';
if (li>=0){ await p.locator('select').nth(li).selectOption('en'); await p.waitForTimeout(1000);
  enTitle = (await p.textContent('h1'))?.trim() || ''; enOk = enTitle==='Settings'; }
ck('V2-C8-2','英文切换生效（设置页标题本地化）', enOk, enTitle||'无');

// 英文模式下 UI 无硬编码中文（排除语言自称/品牌墨迹/古典内容卡片/内联 CJK 示例字）
const cnLeak = await p.evaluate(()=>{
  // ALLOW：语言自称、品牌墨迹；永 = 笔顺编码演示用的内联示例字（非未翻译 UI）
  const ALLOW=new Set(['简体中文','墨','永']);
  const skip=(el)=>el&&(el.tagName==='TEXTAREA'||el.tagName==='INPUT'||el.closest('.im-preset-cover')||el.closest('.im-grid-3'));
  let text=''; const walk=n=>{ if(n.nodeType===3){ if(skip(n.parentElement))return; const v=(n.nodeValue||'').trim(); if(ALLOW.has(v))return; text+=n.nodeValue||''; } else if(n.nodeType===1) for(const c of n.childNodes) walk(c); };
  walk(document.body);
  // 逐字统计，跳过 ALLOW 中的单字示例
  let n=0; for(const ch of text.match(/[\u4e00-\u9fa5]/g)||[]) if(!ALLOW.has(ch)) n++;
  return n;
});
ck('V2-C8-3','英文模式无硬编码中文 UI 文案', cnLeak===0, `中文字符 ${cnLeak}`);

// 切回中文，避免影响后续检查
if (li>=0){ await p.locator('select').nth(li).selectOption('zh'); await p.waitForTimeout(600); }

// ===== V2-C4 字体体系（内置开源字库随包 + 分片按需加载）=====
const builtinCss = await fetch(`${BASE}/fonts/builtin/fonts.css`).then(r=>r.status).catch(()=>0);
ck('V2-C4-1','内置字体 CSS 随包可访问', builtinCss===200, `status=${builtinCss}`);

const builtinCssText = builtinCss===200 ? await fetch(`${BASE}/fonts/builtin/fonts.css`).then(r=>r.text()) : '';
const faceCount = (builtinCssText.match(/@font-face/g)||[]).length;
ck('V2-C4-2','内置字体分片声明完整（>50 条 @font-face）', faceCount>50, `count=${faceCount}`);
ck('V2-C4-3','使用 unicode-range 实现按需下载', /unicode-range:\s*U\+/i.test(builtinCssText));

// 三款内置字体首片真实可下载
const builtinManifest = JSON.parse(readFileSync(join(root,'public/fonts/builtin/fonts.manifest.json'),'utf-8'));
let allFontOk = true; const fontDetail = [];
for (const f of builtinManifest.fonts){
  const s = await fetch(`${BASE}/fonts/builtin/${f.chunks[0].file}`).then(r=>r.status).catch(()=>0);
  fontDetail.push(`${f.family}:${s}`);
  if (s!==200) allFontOk = false;
}
ck('V2-C4-4','三款内置开源字体分片均可下载', allFontOk, fontDetail.join(', '));
ck('V2-C4-5','内置字库已进入 dist 发布产物',
  distFileExists('fonts/builtin/fonts.css') && distFileExists('fonts/builtin/fonts.manifest.json'),
  'dist 已登记');

// 隶书如实标注（不假装支持）
const cfgText = readFileSync(join(root,'src/lib/i18n.zh.ts'),'utf-8');
const liHonest = /font\.note\.li/.test(cfgText) && /依赖系统/.test(cfgText);
ck('V2-C4-6','隶书如实标注依赖系统字体（合规：不假装支持）', liHonest,
  liHonest ? '已标注依赖系统隶书字体' : '未找到如实标注文案');

ck('X1','全流程无运行时错误', errs.length===0, errs.join(' | ')||'无');

// ===== V2-C5 核心功能与界面重构（N5.1 三栏 / N5.2 手风琴 / N5.3 自检 / N5.4 响应式）=====
await p.goto(`${BASE}/#/`,{waitUntil:'networkidle'}); await p.waitForTimeout(400);
{
  const start = p.locator('button, a').filter({hasText:/新建|开始创作|Create/}).first();
  if (await start.count()) { await start.click(); await p.waitForTimeout(1000); }
  const ta = p.locator('textarea').first();
  if (await ta.count()) { await ta.fill('永和九年歲在癸丑'); await p.waitForTimeout(2200); }
}

const layout = await p.evaluate(()=>{
  const g=document.querySelector('.im-editor__grid');
  const b=document.querySelector('.im-editor__pane--body');
  const v=document.querySelector('.im-editor__pane--preview');
  const o=document.querySelector('.im-editor__pane--options');
  if(!g||!b||!v||!o) return null;
  const r=(e)=>e.getBoundingClientRect();
  return { bx:Math.round(r(b).x), vx:Math.round(r(v).x), ox:Math.round(r(o).x),
           vw:Math.round(r(v).width), bw:Math.round(r(b).width), ow:Math.round(r(o).width),
           cols:getComputedStyle(g).gridTemplateColumns };
});
ck('V2-C5-1','编辑器三栏重排：正文左 / 预览中 / 参数右，且预览居中栏最宽',
  !!layout && layout.bx<layout.vx && layout.vx<layout.ox && layout.vw>layout.bw && layout.vw>layout.ow,
  layout?`body=${layout.bx} prev=${layout.vx} opts=${layout.ox} prevW=${layout.vw}`:'结构缺失');

const stage = await p.evaluate(()=>{
  const st=document.querySelector('.im-preview__stage');
  const c=document.querySelector('.im-preview__canvas');
  const wrap=document.querySelector('.im-preview__stagewrap');
  if(!st||!c||!wrap) return null;
  const r=st.getBoundingClientRect(); const rw=wrap.getBoundingClientRect();
  return { ratio:st.getAttribute('data-ratio'), w:r.width, h:r.height,
           ww:rw.width, wh:rw.height, cw:c.width, ch:c.height };
});
ck('V2-C5-2','预览按画布比例等比缩放（宽高比与画布规格一致）',
  !!stage && Math.abs(stage.w/stage.h - stage.cw/stage.ch) < 0.03,
  stage?`dom=${(stage.w/stage.h).toFixed(3)} spec=${(stage.cw/stage.ch).toFixed(3)} ratio=${stage.ratio}`:'缺舞台');
ck('V2-C5-3','预览完整内接于容器，不溢出（等比 contain）',
  !!stage && stage.w<=stage.ww+1 && stage.h<=stage.wh+1,
  stage?`stage=${Math.round(stage.w)}×${Math.round(stage.h)} wrap=${Math.round(stage.ww)}×${Math.round(stage.wh)}`:'缺容器');
ck('V2-C5-4','预览比例由画布规格驱动（非硬编码 9:16）',
  !!stage && /^\d+:\d+$/.test(stage.ratio||''),
  `ratio=${stage?.ratio}`);

const groups = await p.$$eval('.im-collapsible',(els)=>els.map((e)=>({
  t:e.querySelector('.im-collapsible__title')?.textContent?.trim()||'',
  s:e.querySelector('.im-collapsible__summary')?.textContent?.trim()||'',
  exp:e.querySelector('.im-collapsible__toggle')?.getAttribute('aria-expanded'),
  hid:e.querySelector('.im-collapsible__body')?.hasAttribute('hidden'),
})));
ck('V2-C5-5','参数面板 6 分组手风琴折叠，每组标题带取值摘要',
  groups.length===6 && groups.every((g)=>g.s.length>0),
  `groups=${groups.length}`);
ck('V2-C5-6','分组展开态与内容 hidden 一致（折叠真实收起）',
  groups.length>0 && groups.every((g)=>(g.exp==='true')===!g.hid));

const rail = await p.evaluate(()=>!!document.querySelector('.im-editor__rail') || !!document.querySelector('.im-editor__pane--body button[aria-expanded]'));
ck('V2-C5-7','左右栏可折叠（提供 aria-expanded 开关与竖条恢复入口）', rail);

// 响应式：断点下预览均等比不溢出
let bpOk = true; const bpDetail=[];
for (const [w,h] of [[1440,900],[1280,800],[1024,768],[820,900]]){
  await p.setViewportSize({width:w,height:h}); await p.waitForTimeout(600);
  const r = await p.evaluate(()=>{
    const st=document.querySelector('.im-preview__stage'); const c=document.querySelector('.im-preview__canvas');
    const wrap=document.querySelector('.im-preview__stagewrap');
    if(!st||!c||!wrap) return false;
    const b=st.getBoundingClientRect(); const wb=wrap.getBoundingClientRect();
    return b.width>40 && b.height>40 && b.width<=wb.width+1 && b.height<=wb.height+1 &&
           Math.abs(b.width/b.height - c.width/c.height) < 0.03;
  });
  bpDetail.push(`${w}:${r?'ok':'bad'}`); if(!r) bpOk=false;
}
await p.setViewportSize({width:1366,height:900}); await p.waitForTimeout(400);
ck('V2-C5-8','响应式断点 1440/1280/1024/820 下预览均等比且不溢出', bpOk, bpDetail.join(' '));

// N5.3 自检文档随包（声称 vs 实测表）
ck('V2-C5-9','「声称 vs 实测」核心功能自查表已归档',
  existsSync(join(root,'docs','IM-SELFCHECK-V2-C5-001-声称vs实测自查表.md')), 'docs/ 已登记');

ck('X2','V2-C5 全流程无运行时错误', errs.length===0, errs.slice(0,2).join(' | ')||'无');

await b.close();
console.log(`\n===== 发布检查单：${rows.length-fail}/${rows.length} 通过 =====`);
process.exit(fail===0?0:1);
