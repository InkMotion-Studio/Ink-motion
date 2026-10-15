# InkMotion V2-C7 C5 · 书写引擎统一与观感 · 交付说明

> 日期：2026-10-14
> 范围：把 kai / song / brush / seal / li 五条渲染路径统一到同一书写基元与观感参数体系；
> 统一计时口径；清理 `hanzi-writer` 全部残留。
> 性质：**重构 + 观感增强**（对外行为兼容，内部实现收敛）

---

## 一、交付内容

### 1.1 统一书写基元 `src/engine/draw.ts`（新增）

全工程**唯一**的设计坐标变换与观感曲线实现：

| 导出 | 职责 |
| --- | --- |
| `applyGlyphTransform` / `computeGlyphTransform` | 设计坐标 → 画布方块变换（居中 + y 轴翻转 + 边距），消除此前三处重复且包围盒来源不一致的实现 |
| `InkStyle` | 观感参数：`taper` 笔锋 / `inkFlow` 墨迹浓淡 / `speedCurve` 速度曲线 / `widthRatio` / `round` |
| `DEFAULT_INK_STYLE` | 楷体逐笔缺省：scribe 速度曲线 + taper 0.55 + inkFlow 0.45 |
| `WHOLE_GLYPH_INK_STYLE` | 整字显现：无笔锋（taper=0）+ 墨渗渐显 |
| `OUTLINE_INK_STYLE` | 受限字库轮廓描边：弱笔锋 0.25 |
| `easeSinceWrite(u)` | 书写感时间重映射：起笔略迟滞 → 行笔加速 → 收笔略顿（端点严格 f(0)=0, f(1)=1） |
| `strokeWidthAt(u, style)` | 笔内进度 → 线宽系数（两端收细至 1−0.75×taper，中段饱满） |
| `alphaAt(u, style)` | 笔内进度 → 不透明度系数（两端略淡，入纸感） |

### 1.2 五路径统一 `src/engine/stroke.ts`

- **`drawKaiGlyph`（楷体逐笔）**：每笔在 `[i/N,(i+1)/N]` 内先经 `progressByStyle`（scribe）重映射，
  再按 `strokeWidthAt` 分段调线宽（笔锋）、`alphaAt` 调浓淡——**去「铁丝描红」**。
- **`StrokePaths` 新增 `box` 字段**：`buildStrokePaths` 直接携带源字形设计框（`outlineBox`），
  `drawKaiGlyph` 与 `drawGlyphOutline` 的居中/缩放口径**完全一致**；删除 `currentOutlineBox` 实时估算。
- **`drawGlyphOutline`（seal/li 轮廓描边）**：改走统一变换 + InkStyle（笔锋/浓淡逐段生效）。
- **合并 `drawSongGlyph` / `drawRestrictedGlyph` → `drawWholeGlyph`**：
  两者函数体原本几乎完全重复（仅字号系数 0.92 vs 0.95）；现合并为单一基元，
  整字淡入升级为「墨渗渐显」（smoothstep 透明度 + 0.985→1 微缩放），
  旧函数保留为薄包装（签名不变，向后兼容）。

### 1.3 计时线统一 `src/engine/scene.ts`

- **C5 前缺陷**：song/brush/自定义字体恒为 `WHOLE_MS=220ms`，楷体按真实笔数——
  同一文本切换字体**总时长跳变**。
- **C5 统一口径**：所有路径 `dur = max(WHOLE_MS, 笔画数×PER_STROKE_MS)/speed`；
  有本地笔顺用真实笔数，无则 `ESTIMATED_STROKE_COUNT=8` 估算。
- **`path` 提升为构造期字段**：修复 `preloadOutlines` 用 `fontFamily!=='kai'` 误判
  brush/自定义字体的问题（现以 `this.path` 为准）。

### 1.4 残留清理

| 项 | 处理 |
| --- | --- |
| `package.json` 的 `hanzi-writer` 依赖 | **移除**；`package-lock.json` 同步更新（`grep hanzi-writer` = 0） |
| `node_modules/hanzi-writer` | 已随 `npm install` 消失 |
| `src/engine/types.ts` 的 `HanziStrokeData` | **删除**（hanzi-writer 数据结构，全仓零引用） |
| `THIRD-PARTY-NOTICES.md` | Hanzi Writer 移出运行期组件表；新增「构建期数据来源」表登记 cnchar（MIT，笔顺导出）与 fonttools |
| `src/lib/licenses.ts` | 保留 C2 决策注释（历史记录，非运行期归因） |

---

## 二、质量门禁（全绿，本轮实测）

```
tsc --noEmit    ✅ 0 error
vitest run      ✅ 253 passed / 253（新增 C5 观感/变换/竖排/计时 24 项）
eslint          ✅ 0 warning / 0 error
vite build      ✅ 主包 gzip 135.30 KB < 200KB 门禁
check:i18n      ✅ zh/en 300 键一致
Playwright      ✅ 全绿（详见下）
```

### 真实浏览器验证（Playwright + 系统 Chromium）

| 断言 | 结果 |
| --- | --- |
| 首页「用此模板」进入编辑器 | ✅ |
| 文本录入「永和九年岁在癸丑」 | ✅ |
| 依次切换 kai/song/brush/seal/li 并截图 | ✅ 5 张（`docs/c5-shots/font-*.png`） |
| kai 逐笔：多帧画面差异非零 | ✅ diffs=4,2,2（逐笔推进而非整字闪现） |
| 零外网请求 / 零 404 / 零页面异常 / 零控制台错误 | ✅ 全零 |

---

## 三、诚实取舍（如实声明）

1. **笔锋是参数化近似，不是毛笔物理仿真**：`taper` 只做线宽两端收细（sin 形状），
   不做笔肚压力形变、不做飞白纹理。观感明显提升，但书法级笔锋需要轮廓面积/法线场分析，属后续深化。
2. **整字显现路径（song/brush/自定义字体）仍无逐笔**：这些字体没有本地轮廓数据。
   C5 统一的是观感参数与计时口径，**不是**把整字显现变成逐笔。
3. **速度曲线是每笔内时间重映射**，不是整字级运笔节奏规划。
4. **墨迹浓淡是透明度调制**，不做宣纸渗墨扩散模拟（属 C6 载体材质范畴）。

---

## 四、文件清单

- 新增：`src/engine/draw.ts`、`src/engine/__tests__/c5-draw.test.ts`（24 项）、`e2e/v2c7c5.mjs`
- 修改：`src/engine/stroke.ts`、`src/engine/scene.ts`、`src/engine/types.ts`、`src/engine/index.ts`、
  `src/engine/__tests__/stroke-li.test.ts`（mock 补 translate/scale）、
  `src/engine/__tests__/layout.test.ts` 与 `scene.test.ts`（C5 计时口径断言更新）、
  `package.json` / `package-lock.json`（移除 hanzi-writer）、`THIRD-PARTY-NOTICES.md`

## 五、下一步

**C6（载体体系重构）**：扩为 8–10 种实体中国传统形制（宣纸/绢帛/信笺/洒金笺/竹简/木牍/碑拓/立轴/手卷/团扇等），
多层程序化材质合成，去廉价平铺；暴露类型/色温/装裱边/钤印位参数。

回复「通过」后进入 C6。
