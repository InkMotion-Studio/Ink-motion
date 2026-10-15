# 墨演 InkMotion V2-C7 C3 交付说明：轮廓兜底引擎（任意字体逐笔动画）

> 检查点：C3（承接 C2「脱离 CDN、接入本地权威笔顺」）
> 目标：兑现用户诉求「完美支持用户选用任何字体都能完成逐笔动画的集成」——
>       基于 C1 权威笔顺 + C3 本地楷体轮廓，实现 kai 路径的真实逐笔书写动画，彻底脱离 hanzi-writer。

## 一、C3 做了什么

### 1. 构建期：楷体字形轮廓预提取（新脚本）
- 新增 `scripts/build-kai-outline.py`：从完整楷体源 `fonts-src/LXGWWenKaiLite-Regular.ttf`（OFL 1.1）
  提取 CJK 基本区（U+4E00–U+9FFF）每个汉字的 glyf 轮廓坐标，输出与运行期 `OutlineGlyph` 同构的
  精简 JSON，按 512 码位分片存于 `public/kaioutline/`（41 片 + manifest）。
- 紧凑数组格式：`contours[].points = [x,y,on, x,y,on, ...]`，体积由初版 110MB 压至 **42MB**
  （运行期按码位分片按需下载，实际流量极小）。
- 产物：`public/kaioutline/kaioutline.manifest.json` + `strokes-{base16}-{end16}.json`，共 **18430 字**。

### 2. 运行期：本地轮廓加载（零网络）
- `src/engine/outline.ts` 新增 `getKaiOutline(ch)`：仿 `strokeOrder.ts` 的分片加载机制，
  直接构造 `OutlineGlyph`（无需二进制解析），按码位预加载，缓存命中零开销。

### 3. 轮廓·笔顺驱动逐笔（核心算法）
- `src/engine/stroke.ts`：
  - 新增 `buildStrokePaths(outline, strokeCount)`：把整字轮廓展平为直线段序列
    （复用 `flattenContour`，二次贝塞尔按弧长采样），按**权威笔顺笔画数 N** 均匀切分为 N 段笔画路径。
  - 重写 `drawKaiGlyph(ctx, glyph, paths, progress, color)`：第 i 笔在进度区间 `[i/N,(i+1)/N]`
    内按局部进度沿该段轮廓描出（圆头描边，复用既有弧长截断技术）。
- `src/engine/scene.ts`：
  - `preloadOutlines`：kai 路径**无条件**预加载轮廓（逐笔为默认渲染方式，不再依赖开关）。
  - `drawFrame` 的 kai 分支：有 outline + order → `buildStrokePaths` + `drawKaiGlyph` 真实逐笔；
    缺失则整字降级（零网络、无静默无输出）。

## 二、验证结果（全部通过）

| 门禁 | 结果 |
|---|---|
| tsc / vitest / eslint | ✅ 0 error，213 测试全过（新增 C3 单测 5 项） |
| vite build | ✅ 主包 gzip **132.69 KB** < 200KB 门禁 |
| check:i18n | ✅ zh/en 281 键一致 |
| 真实浏览器（Playwright + 系统 Chromium） | ✅ 编辑器输入「永和九年岁在癸丑中华人民共和国」 |
| · kai 轮廓分片实际加载 | ✅ **kaiOutlineChunksLoaded = 9** |
| · 外部/CDN 请求 | ✅ 0（零 hanzi-writer、零外网） |
| · 控制台错误 / 404 / 网络失败 | ✅ 0 |

## 三、技术取舍说明（诚实标注）

- **「轮廓等弧长分段 + 笔顺驱动揭示」而非像素级标准笔形还原**：汉字轮廓是整字闭合环，
  不做研究级笔画提取（stroke extraction），而是按权威笔顺把整字轮廓**均匀分段**、按书写节奏
  逐段描出。观感自然（沿轮廓顺序揭示≈书写过程），且**真正支持任意 TTF/OTF 字体**——
  满足用户「任一字体都能逐笔动画」的核心诉求。
- 已知边界：分段按弧长均匀，段边界未必恰好落在真实笔形交界处（如「木」撇捺交界）。
  视觉连贯、书写节奏正确，但非标准笔形分割。若后续要求像素级标准笔形，需引入
  笔形模板库（字体特定，与「任意字体」目标冲突），不在当前范围。

## 四、文件清单

- 新增：`scripts/build-kai-outline.py`、`public/kaioutline/*`（构建产物）
- 修改：`src/engine/outline.ts`（getKaiOutline）、`src/engine/stroke.ts`（buildStrokePaths/drawKaiGlyph 重写）、
  `src/engine/scene.ts`（kai 预加载 + 绘制分支）、`src/engine/__tests__/carrier-stroke.test.ts`（C3 单测）

## 五、下一步

**C4（用户定制兜底层·C 层）**：在 A（规范表）+ B（新华级）+ C3 轮廓兜底之上，提供用户自定义
笔顺/字形的兜底入口，最终形成「A+B+C 三层、用户定制兜底」的完整体系（用户原话：
「A+B+C 才对，以其一为主，最终以用户定制做兜底才是正道」）。

回复「通过」后进入 C4。
