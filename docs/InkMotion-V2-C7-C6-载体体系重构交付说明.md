# InkMotion V2-C7 C6 交付说明 — 载体体系重构（实体中国传统形制）

> 检查点：V2-C7 C6 ｜ 日期：2026-10-14 ｜ 状态：✅ 已完成，待用户验收
> 前置：C5 书写引擎统一与观感（已验收通过）

---

## 1. 本检查点目标（承接 C5 交付说明中声明的 C6 范围）

> 「扩为 8–10 种实体中国传统形制（宣纸/绢帛/信笺/洒金笺/竹简/木牍/碑拓/立轴/手卷/团扇等），
> 多层程序化材质合成，去廉价平铺；暴露类型/色温/装裱边/钤印位参数。」

## 2. 核心产出

### 2.1 载体引擎目录化（删除单文件 `src/engine/carrier.ts`）

```
src/engine/carrier/
├── index.ts      # 注册表 CARRIER_PLUGINS(10) / CARRIER_ORDER / getCarrierPlugin / renderCarrier
├── types.ts      # CarrierParams{backgroundColor,warmth,mountRatio,aging,sealPos,seed} /
│                 # CarrierPlugin{type,label,supportsMount,usesBackground,render} / resolveParams
├── noise.ts      # mulberry32 / valueNoise2 / fbm2 / hash2 / applyWarmth / shade / rgba
│                 # （全部确定性随机——同 seed 渲染序列逐位一致，保证导出一致性）
├── material.ts   # 材质基元：baseFill / fiberWeave / laidLines / grain / edgeStain /
│                 # vignette / softShadow / blob / sealHint / paperLayers
└── plugins/
    ├── paperFamily.ts   # 宣纸卷轴 / 绢帛 / 信笺(朱丝栏) / 洒金笺(金箔)
    ├── solidFamily.ts   # 竹简(弧度·竹节·编绳) / 木牍(年轮·木节·裂纹) / 碑拓(石面·斑驳)
    └── mountFamily.ts   # 立轴(天头地脚·绫边·轴杆) / 手卷(引首·拖尾·卷边) / 团扇(扇骨·玉坠)
```

### 2.2 十种载体（全部多层程序化合成，零外网、零纹理资产依赖）

| # | 载体 | 形制特征 | 特有参数 |
|---|------|----------|----------|
| 1 | 宣纸卷轴 paper | 纤维交织+帘纹+上下轴杆+内框 | — |
| 2 | 立轴 scroll | 天头地脚+绫边+心子投影+轴杆 | 装裱边 |
| 3 | 手卷 handscroll | 引首+画心+拖尾+卷边 | 装裱边 |
| 4 | 绢帛 silk | 经纬细密交织+斜向丝光泽 | 装裱边 |
| 5 | 信笺 letter | 朱丝栏（红色界格） | — |
| 6 | 洒金笺 gold | 金箔碎点（大小/明暗两簇） | — |
| 7 | 竹简 bamboo | 竹片高低错落+竹节+三道编绳 | — |
| 8 | 木牍 wood | 年轮+木节+裂纹 | — |
| 9 | 碑拓 rubbing | 石面颗粒+褶皱+斑驳剥落 | — |
| 10 | 团扇 fan | 圆扇面+14 放射扇骨+扇柄+玉坠 | — |

### 2.3 全载体通用观感参数（`ProjectOptions` 新增，UI「参数→载体」分组）

- **色温 warmth ∈ [-1,1]**：冷↔暖整体色调调制（材质基元 `applyWarmth` 全层生效）；
- **做旧 aging ∈ [0,1]**：斑驳、泛黄、边缘暗角强度（缺省 0.35）；
- **装裱边 mountRatio ∈ [0,0.15]**：仅 `supportsMount` 载体（立轴/手卷/绢帛）显示控件；
- **钤印位 sealPos**：无/右上/右下/左下/左上，`sealHint` 基元按位预留印章位置；
- **seed**：确定性种子，导出与预览同 seed 逐位一致。

### 2.4 UI / i18n 接线

- `OptionsPanel.tsx`：载体下拉改为 `CARRIER_ORDER`（10 项）+ 新增 4 个参数控件
  （色温/做旧 Slider、装裱边 Slider（按载体显隐）、钤印位 Select）；
- `i18n.zh.ts` / `i18n.en.ts`：新增 8 载体名 + 4 参数名 + 5 钤印位 = **317 键**对齐；
- `db/types.ts`：`CarrierType` 扩为 10 值联合，`ProjectOptions` 扩展 4 参数。

### 2.5 接线缺陷修复（本轮 e2e 发现并修复）

`PreviewCanvas.tsx` 与 `lib/sceneFactory.ts` 构造 `Scene` 时**漏传 warmth/aging/mountRatio/sealPos**，
导致 UI 调节载体参数无效、导出与预览不同源。已补传，并在 `scene.test.ts` 增加回归守卫
（给定参数与缺省参数的绘制序列必须不同）。

## 3. 测试与验证（全绿）

### 3.1 单元测试（新增 27 项，总 280）

- `carrier.test.ts`（26 项，C6-S4 专项）：
  - 注册完整性：10 插件键值一致、`CARRIER_ORDER` 无遗漏无重复、label 非空；
  - 契约：`supportsMount` 仅立轴/手卷/绢帛；`resolveParams` 缺省填充与显式覆盖；
  - 多尺寸（400×600 → 1600×2560 及极端方形）× 极端参数组合均不抛错；
  - **非单层色块**：每载体绘制调用 >5（宣纸 fillRect 7 万+ 次、竹简竹片多矩形、团扇放射线）；
  - **参数生效**：色温/做旧/装裱边/钤印位/底色各自改变绘制序列（比对 counts+gradients+styles）；
  - **确定性**：同 seed 全载体两次渲染序列逐位一致；不同 seed 序列不同。
- `scene.test.ts` 新增 1 项：载体观感参数透传回归守卫（§2.5）。

### 3.2 质量门禁

```
tsc --noEmit        ✅ 0 error
vitest run          ✅ 280 passed / 280（新增 27）
eslint              ✅ 0 warning / 0 error
vite build           ✅ 主包 gzip 141.23KB < 200KB 门禁
check:i18n           ✅ zh/en 317 键一致
```

### 3.3 真实浏览器验证（Playwright + 系统 Chromium，e2e/v2c7c6.mjs）

```
✅ 载体下拉含全部 10 种载体（缺失: 无）
✅ 10 载体逐一切换截图 → docs/c6-shots/carrier-*.png
✅ 各载体画面互不相同（像素抽样比对 9/9 对不同）
✅ 色温参数生效（画面 diff=63048）
✅ 做旧参数生效（画面 diff=189；修复前为 0）
✅ 零外网请求 / 零 404 / 零页面异常 / 零控制台错误
```

## 4. 诚实取舍与已知边界

1. **程序化材质为风格化近似**：竹简灰调、碑拓斑驳等为多层噪声合成，非实物扫描贴图；
   用户可用「载体底色+色温+做旧」组合逼近偏好质感。
2. **预览缩放下笔画极细**：与 C5 相同的既有表现（C5 截图同样如此），字形在 1080×1920
   预览缩到 ~230px 宽时笔画细微；属 C7 整合回归时的观察项，非 C6 引入。
3. **texture 资产仅作叠加增强**：本轮全部程序化生成，未引入任何位图资产（保持零依赖与包体）。
4. V2-C6 自测清单中的 BUG-001（暂停失效）/BUG-002（编辑无自动保存）/BUG-004（关于页硬编码）/
   BUG-005（纯生僻字静默）/BUG-006（大文本无进度）按计划移交 **C7 整合回归** 一并修复。

## 5. 交付物

- **完整工程覆盖包**：`InkMotion-V2-C7-C6-完整工程覆盖包-20261014.zip`
  （含全部源码/public 产物/构建脚本/package-lock.json/覆盖说明，解压即可整体覆盖）
- **交付说明**：`docs/InkMotion-V2-C7-C6-载体体系重构交付说明.md`（本文档）
- **覆盖说明**：`覆盖说明-C6.md`（包根目录）
- **观感留证**：`docs/c6-shots/carrier-*.png`（10 载体）+ `report.json`

## 6. 下一步

> 待用户「通过」后进入 **C7（整合回归 + 发布检查单，含 V2-C6 遗留缺陷修复）**——
> V2-C7 的最后一个检查点。
