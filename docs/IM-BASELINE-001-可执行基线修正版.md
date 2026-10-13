# 墨演 InkMotion · 可执行基线（修正版）

**文档编号：IM-BASELINE-001**
**版本：v1.1（基于 13 份规划文档评审修正）**
**状态：可执行基线（待提交仓库）**

---

## 0. 修订背景

- **仓库现状**：GitHub `InkMotion-Studio/Ink-motion` 仅有 Initial commit（Apache-2.0 LICENSE），零代码。文档先行、代码未启动。
- **评审依据**：对原 13 份文档进行技术评审，并经事实核实（WebCodecs 浏览器支持、Hanzi Writer 数据来源与授权、开元小篆授权、古文字笔画数据现状）。
- **核心结论**：文档体系专业完整，问题集中在**技术规划与数据现实之间的脱节**。修正后可作为团队启动基线。

---

## 1. 六大修正项对照表

| # | 涉及文档 | 修正前 | 修正后（基线） |
|---|---|---|---|
| 1 | SRS FR-01 | "支持任意中文文本（≤5000字）" | 仅对**楷/宋等现代字体**成立；古字体（篆/金/甲/隶）改为**受限字库**（如《千字文》《诗经》高频 300–1000 字）+ 人工标注笔顺 |
| 2 | SRS FR-04 | MVP 规划 12 种载体 | MVP 仅做 **宣纸 + 竹简 2 种**；全部载体从第一天起**插件化** |
| 3 | 技术方案 4.2 | 渲染层 = Three.js（MVP 核心） | MVP 渲染层改为 **Canvas2D / SVG**；Three.js 移至 **V2**（仅用于甲骨/青铜/石碑等真正 3D 载体） |
| 4 | API 文档 7.1 | `POST /api/layout`、`/api/strokes`、`/api/export` 等 HTTP 端点 | **全部删除**。改为 4 个**内部模块接口**（同 §4），MVP 不依赖任何服务端 |
| 5 | 风险文档 IM-RISK-001 | 古文字笔顺数据缺失 = 中/中 | 升级为 **高概率 / 高影响**（项目差异化卖点即此处） |
| 6 | 授权合规（新增章节） | 仅笼统"优先 OFL 字体" | 增加 **Arphic Public License 署名要求** + **开元小篆 OFL 待发布跟踪**（详见 §6） |

---

## 2. 修订后的总体技术架构（MVP）

```
┌─────────────────────────────────────────┐
│            Web UI (React 18 + TS + Vite) │
├─────────────────────────────────────────┤
│   排版引擎 │  笔画引擎  │   载体引擎       │   ← 纯前端模块（无 HTTP）
│   Layout   │  Stroke   │   Carrier       │
├─────────────────────────────────────────┤
│      渲染层 (Canvas2D / SVG，MVP)         │
│      Three.js 仅 V2 用于 3D 载体          │
├─────────────────────────────────────────┤
│   字体层 (Hanzi Writer data + 自研骨架化)  │
├─────────────────────────────────────────┤
│   导出层 (WebCodecs H.264 主 / MediaRecorder 降级) │
├─────────────────────────────────────────┤
│   存储层 (IndexedDB via Dexie，纯前端)     │
└─────────────────────────────────────────┘
```

**关键变更**：MVP 阶段**无服务端**，所有计算在浏览器内完成；服务端（Node + PostgreSQL）推迟至 V2 开放 API 时再评估。

---

## 3. 修订后的核心模块接口（内部 TypeScript 接口，非 HTTP）

```typescript
// 排版引擎：竖排、从上到下、列从右到左
interface LayoutEngine {
  layout(text: string, config: LayoutConfig): GlyphPosition[]
}

// 笔画引擎：现代字用 Hanzi Writer 数据；古字用骨架化模拟
interface StrokeEngine {
  getStrokePath(char: string, font: Font): StrokePath[]
  animate(path: StrokePath, speed: number): Animation
}

// 载体引擎：Canvas2D 贴图合成，先做宣纸 + 竹简
interface CarrierEngine {
  render(carrier: CarrierType, ctx: CanvasRenderingContext2D): void
  getWritingArea(): Rect
  onScroll(callback: (offset: number) => void): void
}

// 导出引擎：WebCodecs 主路径，MediaRecorder 降级
interface ExportEngine {
  export(frames: FrameSource, config: ExportConfig): Promise<Blob>
}
```

---

## 4. 修订后的 MVP 路线

```
输入文本 → LayoutEngine (Canvas2D 竖排右起布局)
         → StrokeEngine (Hanzi Writer 楷体笔顺 / 古字骨架化模拟)
         → CarrierEngine (Canvas2D 贴图合成，先做宣纸 + 竹简)
         → ExportEngine (WebCodecs H.264 主路径，MediaRecorder 降级)
```

**2 周 Demo 交付标准**：一句诗 → 宣纸竖排逐笔书写 → 导出 1080P MP4，全程纯前端。

---

## 5. 修订后的范围与里程碑

| 阶段 | 目标 | 关键变更 |
|---|---|---|
| MVP（2 个月） | 楷体 + 宣纸/竹简 + 竖排右起 + 逐笔 + MP4 导出 | 渲染改 Canvas2D；载体缩至 2 种；古字走受限字库 |
| V1.0（4 个月） | 增加帛书/线装书；接入开元小篆（待发行） | 古字需先解决笔顺标注 |
| V2.0（6 个月） | 甲骨/青铜/石碑（Three.js 3D）；AI 笔锋；批量 | Three.js 与 AI 笔锋预研从 MVP 起并行 |

> 注：古文字"逐笔书写"在数据层无法直接实现，V1/V2 的古字体能力**取决于受限字库的人工标注进度**，不得承诺"任意文本"。

---

## 6. 授权合规清单（新增，必读）

| 资源 | 授权 | 合规要求 | 状态 |
|---|---|---|---|
| Hanzi Writer 笔顺数据（Make Me a Hanzi → Arphic） | **Arphic Public License** | **产品内必须保留 Arphic 版权署名**；允许再分发与修改 | ✅ MVP 可用 |
| 开元小篆 | **SIL Open Font License 1.1** | 仅使用公版底本《说文解字》影印本，不引用受限现代字体/Unicode 码表图 | ⚠️ **尚未正式发行**（11,328 码位，校样审核中），需跟踪发布进度 |
| 楷体/宋体系统字体 | 视运行环境而定 | 导出视频涉及字体嵌入时须确认授权 | 待评估 |
| CODH 篆書字体データセット | 见其授权条款 | 提供**字形图像**（13,213 文字种、10 万+ 图像），**非笔顺路径**；仅作参考底本 | 研究用 |
| 汉语多功能字库 | 见其授权条款 | 提供甲骨文/金文/楚简/小篆**字形出处索引**，非笔顺 | 研究用 |

**合规红线**：
1. 凡使用 Hanzi Writer 数据，UI/关于页/导出水印须含 Arphic 署名。
2. 开元小篆在**正式发行前不得打包进产品**；发行后按 OFL 1.1 署名使用。
3. 任何古文字字形参考须限定公版底本，避免引入受限现代字体版权。

---

## 7. 修订后的风险登记（节选）

| 风险 | 概率 | 影响 | 应对 |
|---|---|---|---|
| 古文字笔顺数据缺失 | **高** | **高** | 受限字库 + 骨架化模拟 + 高频字人工标注（唯一可靠路径） |
| 开元小篆未发行 | 中 | 中 | 跟踪发布；MVP 先用楷体验证端到端，古字后置 |
| WebCodecs 兼容性（Firefox Android 不支持；Safari <26 部分） | 中 | 中 | **MediaRecorder + canvas.captureStream() 降级为必要路径**；ffmpeg.wasm 仅兜底极端场景 |
| 渲染层过度设计 | 已消解 | — | MVP 改 Canvas2D/SVG，Three.js 移至 V2 |
| 范围爆炸（12 载体） | 已消解 | — | MVP 限 2 种 + 插件化 |
| Arphic 署名遗漏 | 低 | 中 | 产品内统一署名组件，合规自检 |

---

## 8. 文档修订状态总览

| 原文档 | 修正状态 |
|---|---|
| IM-PROJ-001 立项书 | 兼容，无需改 |
| IM-SRS-001 需求规格 | **需改**：FR-01（任意文本→受限字库）、FR-04（12→2 载体）、FR-05（古字受限） |
| IM-PRD-001 产品需求 | 兼容（载体选择器改为插件化卡片） |
| IM-TECH-001 技术方案 | **需改**：4.2 渲染层 MVP 改 Canvas2D/SVG，Three.js 移 V2 |
| IM-ARCH-001 系统架构 | **需改**：5.2 接口改为内部模块（非 HTTP） |
| IM-DB-001 数据库设计 | 精简：MVP 仅 IndexedDB，删除服务端表（V2 再议） |
| IM-API-001 接口设计 | **需改**：删除 7.1 HTTP 端点，改为内部模块接口；7.2 开放 API 推迟 V2 |
| IM-UI-001 UI/UX | 兼容 |
| IM-TEST-001 测试计划 | 增补：古字骨架化视觉对比、Arphic 署名合规检查 |
| IM-PLAN-001 项目计划 | 兼容（里程碑不变，实现手段调整） |
| IM-RISK-001 风险管理 | **需改**：古文字笔顺升为高/高 |
| IM-OPS-001 部署运维 | 简化：MVP 纯静态前端（Vercel/CF Pages），暂去后端监控 |

---

## 9. 下一步建议（按落地顺序）

1. **提交本基线文档**至仓库 `docs/IM-BASELINE-001.md`，作为团队启动依据。
2. **MVP 代码骨架**（2 周 Demo）：React + Vite + TS + Canvas2D + Hanzi Writer + Zustand + Dexie，打通"诗句 → 宣纸竖排逐笔 → 1080P MP4"。
3. **古文字笔画可行性 spike**：骨架化算法 + 高频字（如《千字文》）人工标注流程，验证 V1 古字体路线。
4. **授权跟踪**：建立开元小篆发行进度看板；产品中落地 Arphic 统一署名组件。

---
*本基线为原 13 份文档的修正汇总，不替代原文档；原文档按 §8 状态逐项修订后与本基线合并。*
