import { chromium } from 'playwright';
const EXE = '/root/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell';
const b = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] });
const p = await b.newPage({ viewport:{width:1280,height:900} });
const errs=[];
p.on('pageerror', e=>errs.push('pageerror: '+e.message));
p.on('console', m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
await p.goto('http://localhost:5173/', { waitUntil:'networkidle' });
await p.waitForTimeout(500);
console.log('首页标题:', await p.textContent('.im-logo__name'));
await p.screenshot({ path:'/tmp/home.png' });
await p.click('.im-grid-3 >> nth=0 >> text=用此模板');
await p.waitForTimeout(3000);
const canvas = await p.$('.im-preview__canvas');
console.log('预览画布存在:', !!canvas);
if (canvas) {
  const dim = await canvas.evaluate(c=>({w:c.width,h:c.height}));
  console.log('画布内部分辨率:', JSON.stringify(dim));
  // 取画布像素，验证确有墨迹（非空白）
  const stat = await canvas.evaluate(c=>{
    const ctx=c.getContext('2d'); const d=ctx.getImageData(0,0,c.width,c.height).data;
    let dark=0; for(let i=0;i<d.length;i+=4){ if(d[i]<100&&d[i+1]<100&&d[i+2]<100) dark++; }
    return dark;
  });
  console.log('深色（墨）像素数:', stat, stat>500?'→ 有可见墨迹 ✓':'→ 疑似空白 ✗');
}
await p.screenshot({ path:'/tmp/editor.png', fullPage:false });
console.log('ERRORS:', errs.length? errs.join(' | ') : 'none');
await b.close();
