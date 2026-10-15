# InkMotion V2-C7 · C2 交付说明：运行时三层查表 + 脱离 CDN（根除 BUG-003）

> 检查点：C2（C1 已「通过」）
> 交付日期：2026-10-14
> 验收动作：用户回复「通过」后进入 C3（轮廓兜底引擎：outline.ts 按笔顺切分笔画生成逐笔轨迹）

---

## 1. C2 目标与边界

**目标**：把楷体笔顺的唯一数据源从 hanzi-writer 外部 CDN，切换为 C1 已内置的本地权威笔顺表（cnchar 导出，依据《现代汉语通用字笔顺规范》GF 3002-1999 及《通用规范汉字表》），并对预加载加 CJK 守卫，**根除 BUG-003（hanzi-writer CDN 404 泛洪）**。

**边界（严格限定，不越界）**：
- C2 **只解决数据源与 404 根因**，不重新实现「逐笔中线轨迹」——那是 C3 的职责（按笔顺切分字体轮廓生成运笔轨迹）。
- C2 阶段 kai 路径在绘制时以「整字显现」降级（按真实笔数节奏分段淡入），保证**不出现静默无输出**；C3 将替换为真正的逐笔轮廓动画。
- 三层查表中的 C 层（用户定制）在 C4 接入，C2 仅预留 `source: 'authority' | 'user'` 字段与 `StrokeOrderResult` 结构。

---

## 2. 改动清单

| 文件 | 改动 |
|---|---|
| `src/engine/stroke.ts` | 删除 `HW_CDN` 常量与 `fetch(HW_CDN + char + '.json')`；`loadStrokeData` 改为从 `getStrokeOrder`（本地权威表）取笔顺，返回 `StrokeOrderResult { order, strokeCount, source }`；新增 `isCjkWithOrder(ch)` 守卫与 `preloadStrokeData` 同步声明 |
| `src/engine/types.ts` | 新增 `StrokeOrderResult` 类型（order=26字母序列、strokeCount、source）；保留 `HanziStrokeData` 仅作历史兼容注释 |
| `src/engine/scene.ts` | 预加载循环加 `isCjkWithOrder` 守卫——仅对 CJK 且可能拥有本地笔顺的字发起查表；标点/字母/数字/生僻字**不再请求任何网络资源**；计时线改用 `order.length` 作为真实笔数；kai 绘制分支标注 C3 接入点 |
| `src/lib/fonts.ts` | `path: 'hanzi-writer'` → `path: 'kai'`；删除 `HANZI_WRITER_CDN` 导出常量 |
| `src/db/types.ts` | `FontFormat` 移除 `'hanzi-writer-data'`（仅保留 truetype/opentype/woff2） |
| `src/lib/licenses.ts` | 移除 Hanzi Writer 运行期归因；新增 cnchar（构建期导出笔顺，MIT）归因 |
| `src/engine/__tests__/carrier-stroke.test.ts` | 新增 C2 权威笔顺加载用例（本地 mock fetch 验证查表逻辑 + 断言零 hanzi-writer CDN 请求）；保留 `drawKaiGlyph` 接口契约测试（供 C3 用） |
| `src/lib/__tests__/lib.test.ts` | `kai.path` 期望值 `'hanzi-writer'` → `'kai'` |
| `src/lib/__tests__/v1c4.test.ts` | 字体目录路径断言 `'hanzi-writer'` → `'kai'` |

---

## 3. 质量门禁结果

| 门禁 | 结果 |
|---|---|
| `tsc --noEmit` 类型检查 | ✅ 通过（0 error） |
| `vitest run` 单元测试 | ✅ 210 passed / 210（全量） |
| `eslint` 增量检查 | ✅ 0 warning / 0 error |
| `vite build` 生产构建 | ✅ 主包 gzip **131.81 KB** < 200 KB 门禁 |
| `check:i18n` | ✅ zh/en 281 键一致，无硬编码 |
| **真实浏览器验证（Playwright + 系统 Chromium）** | ✅ 见下 |

### 真实浏览器验证（关键证据）
- 进入 `/editor` 新建项目，输入混合文本：`永和九年，岁在癸丑。ABC 123 𰻞𰻞 test 中华人民共和国！`
- 监听网络：`hanziWriterCdnRequests = []` → **零个 hanzi-writer CDN 请求**
- 监听错误：`failedOrErrors = []` → 无 404、无请求失败、无控制台 error
- 视频预览正常渲染（kai 路径整字显现降级可用，无静默无输出）

> **结论：BUG-003 根因（对每字发起 `cdn.jsdelivr.net/npm/hanzi-writer-data` 请求，标点/字母/生僻字批量 404）已彻底根除。**

---

## 4. 残留与技术债（明确移交 C3/C5）

1. **C2 阶段 kai 为整字显现降级**：逐笔「运笔轨迹」尚未实现（drawKaiGlyph 接口保留，C3 将基于 outline.ts 按笔顺切分轮廓生成中线）。当前 kai 与 song 视觉上均为整字淡入，仅计时按真实笔数分段。这是**预期过渡态**，非缺陷。
2. **`package.json` dependencies 仍列 `hanzi-writer`**：源码已无任何 import（已 grep 确认），npm 包可保留至 C5 整合时统一清理，避免本次改动面过大。
3. **`drawKaiGlyph` 当前未被 scene 调用**：供 C3 接入，属预留公共 API，保留在 `engine/index.ts` 导出。

---

## 5. 下一步（待用户「通过」）

**C3 · 轮廓兜底引擎**：基于 `src/engine/outline.ts` 的 glyf 解析能力，按 C2 拿到的权威笔顺 `order`（笔画类型序列），将字形轮廓切分为对应笔画段，生成每笔的中线/路径，接入 `drawKaiGlyph` 实现真正的「任意字体逐笔动画」。届时 kai 路径从整字显现升级为逐笔书写，彻底「发挥书写能力」。

> 用户原始诉求重申：*「不要总在 hanzi-writer 上纠结」「深入探究汉字书写的底层实现技术，以便能完美支持用户选用任何字体都能完成逐笔动画的集成」*——C3 即落地「笔顺（顺序）来自规范、形态（轨迹）来自字体轮廓」的解耦方案。
