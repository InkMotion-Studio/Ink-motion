# InkMotion V2-C7 · 字体内置 + 书写公式提取与套用 · 落地计划

> 文档驱动 + 检查点交付模式。每检查点打包可运行 zip 供本地验证，用户回复「通过」后进入下一点。
> 本计划承接 [V2-C6 自测 Bug 清单] 与 [书写能力与载体体系方法论 V2-C7] 的诊断结论。

---

## 0. 一句话目标

把「书写能力」从「依赖单一楷体 + 运行时拉取 CDN」重构为 **内置字体在构建期离线提取「书写公式」(charData: 笔顺 + 每笔轮廓 + 中线) → 随包内置、按需分片加载 → 运行期用 `charDataLoader` 本地套用逐笔动画**。

由此一并根除：
- **BUG-003（默认路径 404 泛洪）**：不再对任意字符请求 `cdn.jsdelivr.net`。
- **「字体上传却无作用 / 书写能力未发挥」**：内置字体全部具备真正逐笔能力，而非整字淡入/填充。

---

## 1. 关键事实（已代码 + 调研双重确认）

| 事实 | 来源 |
|---|---|
| 「书写公式」标准结构 = Hanzi Writer `charData`：`strokes[]`(每笔 SVG path) + `medians[][][]`(每笔中线点序列) + 笔顺；坐标统一 1024×1024、y 轴向下 | 调研：makemeahanzi / hanzi-writer-data |
| Hanzi Writer 原生支持 self-host：`options.charDataLoader = (char, onLoad, onError)=>{}` | 调研：chanind/hanzi-writer API |
| 当前内置字体仅 **1 款可用**：`LXGWWenKaiLite`（usage=kai）；song/brush/seal/li 仅为渲染分支名，无对应字体数据 | `scripts/build-fonts.py` 的 `FONTS` 清单（实测仅 1 项） |
| 当前笔顺数据走 CDN：`HW_CDN = https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/` | `src/engine/stroke.ts:10` / `src/lib/fonts.ts:107` |
| 体积：约 3KB/字；GB2312(6763 字)≈18–20MB，可分片 + unicode-range 按需加载 | 调研 + `fonts.manifest.json` 现有分片同构 |
| hanzi-writer-data 源自 Arphic 开源字体，受 **Arphic Public License** 约束，须随包附带 `ARPHICPL.TXT` | 调研 + `src/lib/licenses.ts:114` 已登记 |

---

## 2. 三项已决决策（用户未回复问卷，按推荐给定）

1. **字体范围**：楷体 + 宋体 + 仿宋 三体。楷体直接复用 hanzi-writer-data（零成本）；宋体/仿宋用 `opentype.js` 重提取 `strokes` 轮廓 + 复用 Hanzi Writer `medians`/笔顺（按 unicode 映射，异体字脚本校验）。篆/隶本轮不纳入逐笔（形制特殊，另立项论证）。
2. **许可合规**：按 Arphic Public License 随包附带 `ARPHICPL.TXT`，并在署名页登记（现有 `licenses.ts` 已含 Hanzi Writer 条目，扩展说明数据来源）。
3. **上传字体**：本轮不接入逐笔，维持 V2-C4 已验收的整字渲染闭环；待内置体系稳定后单独立项（运行期轮廓描边兜底）。

---

## 3. 落地拆解（C1–C5 检查点）

### C1 · 公式资产构建管线（构建期）
- 新建 `scripts/build-char-data.mjs`：
  - **楷体**：从 `hanzi-writer-data` 直接拷贝 `charData`（按子集化后的字表过滤，仅含实际用到的码位）。
  - **宋体/仿宋**：`opentype.js` 解析对应 TTF → 逐字生成 `strokes`（SVG path，归一化到 1024 系）→ 复用 hanzi-writer-data 的 `medians` + 笔顺（按 unicode 映射）。
  - 异体字校验脚本：批量比对「楷体 medians 笔画数」与「目标字体字形预期笔画数」，输出差异清单（艹/凹/凸/必/及 等约 5–10%）供人工复核。
- 产物：`public/chardata/<fontKey>/<chunk>.json`，结构与 `hanzi-writer-data` 一致；同步生成 `chardata.manifest.json`（字体 → 分片映射，仿 `fonts.manifest.json`）。
- 许可：复制 `ARPHICPL.TXT` 至 `public/licenses/` 并在 `licenses.ts` 增补数据来源说明。
- **交付判定**：`node scripts/build-char-data.mjs --check` 通过；楷体全量、宋/仿宋抽样 50 字 `JSON` 字段齐全（strokes/medians 非空、坐标范围 [0,1024]）。

### C2 · 运行期 charDataLoader 本地套用（根除 BUG-003）
- 改造 `src/engine/stroke.ts`：移除 `HW_CDN` 硬编码；新增 `loadCharFormula(fontKey, char)`：
  - 按 `chardata.manifest.json` 定位分片 → 动态 `import()` 加载（按需、带缓存 Map）。
  - **未知字/未内置字** → 返回 `null` 并触发 `onError` 兜底（不再发网络请求）。
- 改造 `src/engine/scene.ts` 第 154–163 行的预加载循环：改为「仅对**已内置公式且为 CJK** 的字符请求本地公式」；非内置字体（如用户上传）走原有整字渲染，不再请求笔顺。
- **交付判定**：真实浏览器验证——输入含标点/数字/字母/生僻字文本，控制台 **0 个 404**；逐笔动画在楷/宋/仿宋三体均正常触发。

### C3 · 书写引擎统一与逐笔动画观感
- 抽象 `DrawGlyph` 接口，三体统一走「公式套用 → 逐笔 SVG 描边 + 填充渐显」；保留 C2 兜底。
- 笔触观感（可选增强，不阻塞主线）：起收笔方向由 medians 首尾点推出 `strokeType`，叠加笔锋/墨渗参数。
- **交付判定**：三体逐笔动画在竖排布局下正确，笔顺与字形一致（抽样 30 字人工目视）。

### C4 · 载体体系重构（承接方法论 V2-C7 第四节）
- 扩为 8–10 种实体中国传统形制：宣纸/绢帛/信笺/洒金笺（纸绢族）、竹简/木牍/碑拓/金文（简牍金石族）、立轴/手卷/团扇/册页/屏风（装裱形制族）。
- 改为**多层程序化材质合成**（去廉价平铺）：纸纹/纤维/装裱边/钤印位参数化。
- 暴露类型/色温/装裱边/钤印位参数到「载体」分组。
- **交付判定**：四断点响应式正确；8–10 种载体预览无平涂感（人工目视 + 截图对比 V2-C5 旧载体）。

### C5 · 整合回归 + 发布检查单（含 V2-C6 缺陷修复）
- 修复 V2-C6 全部 P1：BUG-001（暂停失效，加 `playing` 到缓动重绘 effect 依赖）、BUG-002（编辑自动保存：debounce + 路由离开拦截）、BUG-003（C2 已根除）。
- 质量门禁全绿：`tsc --noEmit` / `vitest run` / `lint` / `build`（主包 gzip < 200KB，公式资产不进首屏）/ `check-i18n.mjs` / `e2e/all.mjs` / `e2e/release-check.mjs`。
- 新增 E2E：使用「含标点/数字/中英混排」真实样本文本，断言无 404、逐笔触发、编辑自动保存。
- **交付判定**：41+ 发布检查单全绿；打包可运行 zip 供本地验证。

---

## 4. 风险与依赖

| 风险 | 应对 |
|---|---|
| 异体字 medians 复用误差（5–10%） | C1 校验脚本输出清单，人工复核关键字；误差字回退整字渲染 |
| 公式资产体积 | 仅子集化字表 + 分片按需加载；不进首屏 |
| Arphic 许可 | 随包 `ARPHICPL.TXT` + 署名页登记 |
| 宋/仿宋 strokes 还原度 | 抽样目视 + 与楷体同字叠比 |

---

## 5. 待用户批复
- 批复本计划（C1–C5）→ 从 **C1（公式资产构建管线）** 起点案例开始逐项落地。
- 若对「字体范围/许可/上传」三项决策有调整，先告知再启动 C1。
