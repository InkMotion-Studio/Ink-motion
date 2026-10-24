# 墨演 InkMotion — 执行日志（逐检查点落地）

> 本文件为执行进度记忆存档，与 `docs/InkMotion-规划索引.md` 配套。每个检查点完成即更新状态，并打包 zip 供本地验证。

## 检查点状态总览

| 检查点 | 覆盖节点 | 状态 | 交付 zip |
|---|---|---|---|
| **C1 工程地基与基础设施** | N0.1–N0.4、N1.1–N1.4 | ✅ 完成（已验证通过） | `InkMotion-C1-工程地基与基础设施-20261013.zip` |
| **C2 核心引擎 Demo（M1 闸门）** | N2.1–N2.6 | ✅ 完成（已验证通过） | `InkMotion-C2-核心引擎-20261013.zip` |
| **C3 MVP UI 集成（M2）** | N3.1–N3.5 | ✅ 完成（已验证通过） | `InkMotion-C3-MVP-UI集成-20261013.zip` |
| **C4 测试与优化（M3）** | N4.1–N4.4 | ✅ 完成（已验证通过） | `InkMotion-C4-测试与优化-20261013.zip` |
| **C5 上线（M4）** | N5.1–N5.3 | ✅ 完成（已验证通过） | `InkMotion-C5-上线-20261013.zip` |

> **MVP 全部 5 个检查点已完成并验收通过。已启动 V1.0 规划（见文末）。**

---

## C1 落地明细（2026-10-13）

### 已交付
- **N0.1 仓库初始化**：仓库根目录、Apache-2.0 LICENSE、`.gitignore`、目录骨架（`src/`、`docs/`、`public/`）。
- **N0.2 工程脚手架**：Vite 5 + React 18 + TypeScript（strict）+ `@vitejs/plugin-react`；ESLint / Prettier 配置；`@/*` 路径别名。
- **N0.3 CI/CD**：`.github/workflows/deploy.yml` —— 纯静态构建 + GitHub Pages 发布，无后端、无密钥。
- **N0.4 资产与 CDN 流水线**：`src/lib/assets.ts` —— 命名空间 `inkmotion-assets-v1`、资产清单（版本化）、`fetchAssetCached`（Cache API 版本化缓存）、`precacheAssets`。
- **N1.1 设计系统与 Token**：`src/styles/tokens.css` —— 墨/宣纸/竹/朱砂/金语义色板、字体、间距、圆角、阴影、动效；深色主题变量预留（V1.0）。
- **N1.2 基础组件库**：`src/components/` —— Button / Input / Select / Slider / Modal / Toast / Card，含 WCAG 可见焦点环、`prefers-reduced-motion` 支持。
- **N1.3 存储层（IndexedDB）**：`src/db/` —— Dexie 封装，`projects / fonts / exports / settings` 四表；5000 字硬上限校验；项目 CRUD + 导出记录 + 设置读写。
- **N1.4 字体许可合规基线**：`src/lib/fonts.ts` —— 字体目录（楷 ArphicPL / 宋 OFL / 古文字 OFL 阻塞）；`src/pages/About.tsx` 致谢页展示可见署名与许可链接。
- **应用壳与路由**：`App.tsx`（顶栏导航 + HashRouter）、`main.tsx`（启动初始化设置 + 预缓存资产 + Toast 容器）。
- **页面**：首页（3 预设 + 最近项目）、编辑器三栏（文本 / 预览占位 / 参数面板，状态已接 Zustand）、我的项目（CRUD + 删除确认）、设置（偏好 / 隐私 / 存储估算）、关于与致谢。

### 验证结果
- `npm run build`：类型检查通过，构建成功（JS 288KB / gzip 96KB）。
- 静态托管冒烟测试：`/` 与 JS 资源均返回 200，标题正确。

### 已知占位 / 后续检查点衔接
- 编辑器"实时预览"为占位，**C2 接入核心引擎**（排版 / 笔画 / 载体 / 导出）。
- 古文字路径在 UI 中显式禁用并标注阻塞（IM-RISK-001 R-01）。
- 字体二进制资产（楷/宋 woff2、纹理 png）尚未真实放入 `public/`，当前走系统字体 + 纹理 CSS 占位；CDN 前缀经 `VITE_ASSET_CDN` 可配置（N5.1 落地）。

---

## C2 落地明细（2026-10-13）

### 已交付
- **N2.1 排版引擎** `src/engine/layout.ts`：竖排右起、列优先书写顺序（右→左、上→下）、标点识别、换行强制换列、按画布高自动分列。
- **N2.2 笔画引擎-精确** `src/engine/stroke.ts`：Hanzi Writer 笔画数据按字懒加载 + Cache；沿中线逐笔揭示（圆头笔迹）；数据缺失自动整字显现降级。
- **N2.3 笔画引擎-骨架化**：**[V1.0，阻塞：字体资产]** 未实现（IM-RISK-001 R-01）。
- **N2.4 载体抽象层** `src/engine/carrier.ts`：`CarrierPlugin` 契约 + 分发器，预留 V2.0 WebGL 泛化。
- **N2.5 宣纸 + 竹简**：程序化载体渲染（宣纸卷轴轴杆/内框/纤维；竹简 14 片/编绳/竖纹），确定性伪随机保证导出一致。
- **N2.6 导出引擎** `src/engine/exporter.ts`：能力探测 + **WebM 保底（MediaRecorder）** + **MP4 增强（WebCodecs H.264 + mp4-muxer）** + 自动降级。
- **场景编排** `src/engine/scene.ts`：整合排版+笔画+载体，时间线、自动滚动、逐帧渲染（预览/导出共用）。
- **UI 接入**：`PreviewCanvas`（实时预览 + 播放/暂停/重播/进度）、`ExportDialog`（能力显示/进度/下载）。

### 验证结果
- 单元测试 `vitest`：**7/7 通过**（排版右起/列优先、换行换列、标点、时间线、速度缩放、宋体计时）。
- Node 侧引擎校验：40 字→3 列、x 序列 909/779/649（右起向左）、书写顺序正确；楷体预加载后时间线 9620ms→3020ms 重算正确；宋体降级场景无异常。
- 构建：`npm run build` 通过（JS 332KB / gzip 110KB）。
- 详见 `docs/C2-引擎自检报告.md`。

### 已知限制
- 古文字路径阻塞（V1.0）；MP4 真机编码需用户浏览器实测（C4）；字体二进制/纹理待 C5 资产落地；MVP 主线程渲染（Worker 池 1）。

---

## C3 落地明细（2026-10-13）

### 已交付
- **N3.4 参数面板完整化** `OptionsPanel`：按 IM-UI-001 §6.2.5 分 5 组（载体/字体/书写/滚动/画布与导出）；新增墨色与载体底色取色器（切载体自动同步推荐底色）、画布规格三档、各组复位。
- **N3.3 预览升级**：`PreviewCanvas` 改造为 `forwardRef` 组件（seek/pause/restart/snapshot/durationMs），支持导出逐帧联动预览；播完自动切"重播"。
- **缩略图** `Scene.snapshot()`：场景就绪自动生成 JPEG 缩略图写入项目，首页与项目页卡片展示。
- **N3.5 项目页增强**：标题/正文搜索、按修改/创建/标题排序、一键复制副本、删除确认。
- **工程导入/导出** `lib/projectIO.ts`：纯本地 JSON 备份迁移（格式校验 + 5000 字上限回填默认项）。
- **编辑器体验**：Ctrl/Cmd+S 保存、aria-live 保存状态、导出时暂停预览。
- **MVP 单测补全**：存储层 CRUD/级联删除/5000 拦截、工程导入导出、预设、字体许可、能力探测。

### 验证结果
- 单测 **22/22 通过**（引擎排版 7、存储层 6、业务库 9）。
- 构建：`npm run build` 通过（JS 338KB / gzip 112KB）。
- 端到端回归 **8/8 通过，零页面错误**：参数 5 组、切竹简底色同步 #c9b083、Ctrl+S 保存、8624 墨迹像素、导出对话框能力文案（推荐 MP4 / WebM 可用）、项目卡片含缩略图、搜索框。

### 已知限制（移交 C4/C5）
- MP4 真机编码需用户浏览器实测确认；字体二进制/纹理资产待 C5；性能预算与无障碍系统性审计在 C4。

---

## C4 落地明细（2026-10-13）

### 已交付
- **N4.1 单元+集成测试补全**：新增引擎载体/笔画/场景、性能策略、无障碍组件共 **52 用例**（7 个文件）。
- **N4.2 E2E 测试** `e2e/run.mjs`（Playwright，**22 项**）：核心旅程 + **零上传隐私断言** + 5000 字拦截 + 导出降级信息 + 无障碍基本检查。
- **N4.3 性能优化** `src/lib/perf.ts`：长文自动降帧（>300→24–30fps）与分块（>1500 字每 200 字让出主线程）；字体按需加载天然子集化提示；构建 gzip 113KB。
- **N4.4 兼容性与无障碍**：Modal 焦点陷阱/Esc/焦点归位、跳转主内容链接、`aria-live`/`aria-invalid`/`role=alert`、`prefers-reduced-motion`、对比度 14:1（超 AA）。

### 测试驱动修复的真实缺陷
- **D1** `contentHeight` 未计入实际行数 → 重算并新增 `contentWidth`。
- **D2** 竖排滚动模型错误（误纵向）→ 改为**横向滚动**（内容自右向左）。
- **D3** `snapshot`/`drawFrame` 缺 canvas 上下文守卫 → 加空值保护。

### 验证结果
- 单元+集成 **52/52 通过**；E2E **22/22 通过**；构建通过（gzip 113KB）。
- 详见 `docs/C4-测试报告.md`。

### 未覆盖（移交 C5）
- MP4 真机编码、跨浏览器矩阵（沙箱仅 Chromium）、屏幕阅读器实测。

---

## C5 落地明细（2026-10-13）— MVP 完成

### 已交付
- **N5.1 部署配置**：`public/_headers`（缓存策略+安全头）、`netlify.toml`、`vercel.json`；生产纹理资产（宣纸/竹简 PNG）随包分发；`VITE_ASSET_CDN` 可切独立 CDN。
- **N2.5 增强**：载体渲染升级为真实 PNG 纹理平铺优先，失败回退程序化。
- **N5.2 前端可观测性** `lib/telemetry.ts`：错误捕获 → 本地环形缓冲；匿名上报**默认关闭**、须用户授权（IM-PRD-001 §5.2）；设置页新增"诊断"卡。
- **N5.3 发布**：`e2e/release-check.mjs` 对生产构建产物自动验证发布检查单。

### 验证结果（生产产物实测）
- **发布检查单 13/13 全绿**（C1 零上传、C2 Arphic 署名、C3 导出矩阵、C4 5000 拦截、C5 两路径渲染、C6 古文字阻塞、C7 无障碍、C8 体积、C9 缓存版本化、C10 错误上报）。
- 单测 52/52；构建 gzip 113.8KB；生产产物（含纹理）全部 200。
- 详见 `docs/C5-发布报告.md`。

### 已知边界
- 古文字路径阻塞（V1.0）；MP4 需联网真机确认；跨浏览器仅 Chromium 实测；i18n/深色为 V1.0。

---

## V1-C1 落地明细（2026-10-13）— 古文字字库与受限字符集

### 已交付（决策 D-V1-01 落地：受限字库 + 真实字形映射）
- **N1.1 篆字字形加载管线** `src/lib/seal.ts`：
  - `registerSealFont()` —— `FontFace('LXGW Seal', url(...woff2), {unicodeRange})` 注册；优先 `public/fonts/seal/LXGWSeal-Glyphs.woff2`（子集 165 篆字 + 标点，**42KB**），回退 `LXGWSeal-Regular.ttf`（223KB）。
  - `loadSealCharset()` —— 加载 `seal-map.json`（静态资源，构建期自官方 `table.md` 解析生成），解析出 `modernIndex`（今字→小篆码位）与 `glyphs`。
  - `transformToSeal(text, charset)` —— 今字自动映射为小篆码位字符，越界字符保留原字符（交由绘制层跳过）。
  - `loadSealStrokeData` / `loadSealCharsetSync` 同步访问器（供场景引擎在 `preload` 后重映射）。
- **N1.2 今字↔篆字映射表**：`public/fonts/seal/seal-map.json` —— 解析官方 `table.md` 得 **165 篆字、238 今字映射**（本字/简化/隶定/异体）；已实测核对 福→U+3D01E、开→U+3D285、礼→U+3D015。`OFL.txt` 随包。
- **N1.3 受限字符集 UI**：
  - `src/lib/useSeal.ts` `useSealOutOfRange(text, fontFamily)` —— 越界字符检测 Hook。
  - `src/pages/Editor.tsx` —— 古文字路径下实时显示越界提示（`aria-live`，如"以下字符不在小篆字库内，已自动跳过：寿宁龘"）。
  - `src/components/SealCharsetPanel.tsx` —— 字库浏览面板（239 字网格，越界字符红框标注），在字体=小篆时嵌入参数面板。
  - `src/components/OptionsPanel.tsx` —— 字体路径新增"小篆（受限字库整字显现）"选项（移除 MVP 期禁用标注）。
- **N1.4 古文字笔画路径适配** `src/engine/stroke.ts` + `src/engine/scene.ts`：
  - 新增 `drawSealGlyph`（整字淡入显现，按小篆码位 `fillText`）；`isBlockedPath` 恒返回 `false`（三路径均可用，D-V1-01）。
  - 场景引擎 `path` 支持 `'seal'`，preload 阶段确保字表加载并**重映射文本为篆码**后重建排版/时间线。

### 字体资产（已置入 `public/fonts/seal/`）
- `LXGWSeal-Regular.ttf`（223KB，回退）/ `LXGWSeal-Glyphs.woff2`（42KB，**子集，主用**）/ `seal-map.json`（映射）/ `OFL.txt`（许可）。子集经 fonttools `pyftsubset`（OFL 允许的 Web Font 用途特例，无需书面授权，IM-GLYPH-001 §5 红线满足）。

### 验证结果
- 单元测试 `vitest`：**59/59 通过**（新增 `seal.test.ts` 15 项 + 场景/字体/笔画旧用例适配 V1.0 语义）。
- V1-C1 专项 E2E `e2e/v1c1.mjs`：**8/8 通过** —— 小篆选项、字库面板 239 字、越界提示、画布渲染 4941 墨迹像素、**零对外 POST**。
- MVP 回归 E2E `e2e/run.mjs`：**22/22 通过**（未破坏）。
- 发布检查单 `e2e/release-check.mjs`：**17/17 通过**（新增 V1-C1-1~4：woff2 可达、map 可达、OFL 随包、关于页署名）。
- 构建 `npm run build`：通过，JS **346KB / gzip 115.19KB**（含古文字管线，仍 < 150KB 预算）；字体子集为静态资源不计入 JS。

### 已知边界（V1-C1）
- 小篆仅整字显现，**不提供逐笔书写**（篆字无 hanzi-writer 笔顺数据）；此预期已在选项提示与帮助链路明示（TC-V1-GLY 预期管理）。
- 字库覆盖约 165/238 字，超出部分自动跳过并提示，不报错。
- 霞鹜篆书**正式版不再维护**（VR-02 高）：渲染层已与单字体解耦（`registerSealFont` 可替换为备选字源），字表 JSON 版本化（`seal-2026.10-165`）。

---

## V1-C2 落地明细（2026-10-13）— 主题、多语言与内容页

### 已交付
- **N2.1 深色主题**：
  - `src/styles/tokens.css` —— 补全 `:root[data-theme='dark']` 变量块（新增载体 paper/bamboo、朱砂、金、success/warning/danger 等），确保深色下载体预览与强调色仍满足对比度。
  - `src/styles/global.css` —— 新增 `color-scheme: dark/light` 声明，原生控件（滚动条/表单）跟随主题。
  - `src/main.tsx` —— 启动时按设置写入 `<html data-theme>`，并订阅 store 变更实时切换；同时驱动 `<html lang>`。
  - `src/App.tsx` —— 顶栏新增主题切换按钮（☀/☾，含 `aria-label`）。
- **N2.2 i18n 骨架**：
  - `src/lib/i18n.ts` —— 消息字典（zh 主 / en 次），扁平命名空间，共 **60+ 词条**；`translate(key, lang)` 未登记键回退键名（开发期可见）。
  - `src/lib/useI18n.ts` —— `useT()` Hook，自动跟随设置语言切换。
  - 已抽取：`App` 导航、`Home` hero/模板/最近项目、`Editor`（标题/正文/预览/参数/保存/越界提示）、`Settings`（偏好/隐私/存储/诊断/关于）、`About`（版本/介绍）、`Help` 全文。
- **N2.3 模板库页**：`src/lib/presets.ts` 新增**小篆模板**（静夜思·宣纸小篆，`fontFamily: 'seal'`）；`Home.tsx` 首页"快速开始"升级为**模板库**区块，展示全部 4 个模板。
- **N2.4 帮助页**：新增 `src/pages/Help.tsx`（路由 `/help`，顶栏可见），说明三书写路径（楷精确笔顺 / 宋整字 / 小篆受限整字**不逐笔**）、越界跳过机制、隐私零上传、字体许可署名。
- **N2.5 设置页扩展**：`Settings.tsx` 主题与语言选项移除"V1.0 计划"占位标注，改为正式可用项；文案全量 i18n 化。

### 技术债清理（本检查点顺带完成）
- **统一字体枚举值**：`FontFamily` 与 `StrokePathKind` 由 `'ancient'` 正式改为 `'seal'`，同步修正 `fonts.ts`（FontMeta 改用 `FontFamily` 类型）、`scene.ts`（4 处）、`useSeal.ts`、`OptionsPanel.tsx`、`Editor.tsx` 及 3 处单测与 2 处 E2E 脚本——消除 V1-C1 遗留的"类型与字符串不一致"隐患。

### 验证结果
- 单元测试 `vitest`：**68/68 通过**（新增 `i18n.test.ts` 9 项：词条双语完整性、translate 行为、字体目录三路径、模板库含小篆）。
- V1-C2 专项 E2E `e2e/v1c2.mjs`：**16/16 通过** —— 深色切换生效、深色正文对比度 **14.38:1**（远超 AA 4.5:1）、帮助页三路径说明、语言切换 English 生效且 `html lang` 跟随、模板库含小篆、**零对外 POST**。
- 回归：V1-C1 E2E **8/8**、MVP E2E **22/22**、发布检查单 **17/17**。
- 构建 `npm run build`：通过，JS **353KB / gzip 117.34KB**（< 150KB 预算）。

### 已知边界（V1-C2）
- 英文 i18n 为**骨架占位**，未经母语审校（TBD-V1-05）；词条已结构化，审校只需替换 `MESSAGES[key].en`。
- 深色主题仅覆盖应用 UI；**导出视频画面**仍按用户设置的墨色/底色渲染（设计如此：视频成品不受 UI 主题影响）。
- 帮助页内容为中文主版，英文版随 i18n 骨架同步（未审校）。

---

## V1-C3 落地明细（2026-10-13）— 字体上传与画布规格

### 已交付
- **N3.1 字体上传** `src/lib/fontUpload.ts`：
  - 支持 `.ttf / .otf / .woff / .woff2 / .ttc`；`detectFormat` 格式识别、`validateFontFile` 校验（**8MB 上限**、空文件、未知格式均给出明确中文错误）。
  - `uploadFont(file, {family, license})`：FileReader 转 dataURL → `new FontFace(...).load()` 注册 → `putFont` 落库（`source: 'uploaded'`）；任一步失败返回结构化错误而非抛异常。
  - 内部 family 名加 `im-uploaded-` 前缀，避免与内置 kai/song/seal 冲突。
- **N3.2 字体管理** `src/components/FontManager.tsx` + `deleteFont()`（database.ts 新增）：
  - 上传入口（归属路径选择：楷/宋/小篆）+ 已上传列表（名称/格式/许可）+ 删除（确认后级联清库并刷新 store）。
  - 已接入设置页新增"字体"卡片；组件导出至 `components/index.ts`，配套样式 `im-font-mgr__*`。
- **N3.3 4K 画布规格**：
  - `OptionsPanel` 画布规格新增 **2160 × 3840（4K 竖屏）**；选中后显示内存提示（`im-options__note--warn`，实测"4K 画布占用约 32MB"）。
  - `perf.ts` 升级：`planPerformance(charCount, fps, canvas?)` 感知画布尺寸——**4K 自动限帧 ≤30fps**，超长文 + 4K 降为 24fps 且分块；新增 `estimateCanvasMemoryMB()`。保持不传 canvas 时行为不变（向后兼容）。
- **N3.4 导出增强（队列/取消）** `src/engine/exporter.ts`：
  - `ExportRequest` 新增 `signal?: AbortSignal`；新增 `ExportAbortError`；WebM 的 `tick()` 与 MP4 的帧循环均在中止点抛错。
  - `ExportDialog`：运行中显示**"取消导出"**按钮（AbortController），错误态显示**"重试"**，关闭对话框自动 abort；`planPerformance` 调用已传入画布尺寸。

### 验证结果
- 单元测试 `vitest`：**79/79 通过**（新增 `v1c3.test.ts` 11 项：格式识别/体积/空文件校验、画布内存估算、4K 限帧、向后兼容、取消错误类型）。
- V1-C3 专项 E2E `e2e/v1c3.mjs`：**16/16 通过** —— 字体面板与空态、上传入口与格式限制、4K 选项与 32MB 提示、降回 1080 提示消失、导出中"取消导出"按钮生效、取消后可重试、**零对外 POST**。
- 回归：V1-C2 E2E **16/16**、V1-C1 E2E **8/8**、MVP E2E **22/22**、发布检查单 **17/17**。
- 构建 `npm run build`：通过，JS **359KB / gzip 119.53KB**（< 150KB 预算）。

### 已知边界（V1-C3）
- 上传字体**仅登记与注册**，尚未在渲染路径中提供"选用上传字体"的下拉（渲染仍走内置三路径 kai/song/seal 的字体栈）。此衔接留待 V1-C4/V1-C5 与字体栈重构一并处理——属预期内的分阶段交付，不是遗漏。
- 4K 导出为**尽力而为**：UI 已提示内存占用与降级建议（降回 1080×1920）；WebCodecs 在部分浏览器对 2160×3840 编码有上限，失败时按既有矩阵降级 WebM（TBD-V1-04 待确认目标浏览器）。
- 导出取消为**协作式取消**（在中止检查点终止），非强制杀线程；MP4 路径在编码背压等待处也会响应。

---

## V1-C4 落地明细（2026-10-13）— 测试与优化

### 已交付
- **N4.1 单测与集成补全**：新增 `src/lib/__tests__/v1c4.test.ts`（23 项），覆盖偏好持久化（THEME-02/I18N-02）、上传字体生命周期（FONT-03/04/10）、4K 降级策略（EXP4K-02/05 策略层）、小篆映射正确率抽样（GLY-08，真实字表 50 字抽样 **100% ≥ 98%** 且码位唯一）、三路径互不干扰（GLY-10）、古文字限制告知（GLY-11）、导出记录查询（QUEUE-06）。**单测总数 79 → 104**（IM-TEST-V1-001 目标 103，已达标）。
- **N4.2 E2E 扩展与套件整合**：新增 `e2e/all.mjs` 统一入口，编排 6 个套件（MVP 回归 / V1-C1 / V1-C2 / V1-C3 / 发布检查单 / 无障碍审计）并汇总；`package.json` 新增 `test:e2e:all`、`test:release`。
- **N4.3 性能优化**：
  - **i18n 按需加载**：词典拆分为 `i18n.zh.ts`（静态，首屏）+ `i18n.en.ts`（**动态 import**，首屏不包含）；`loadLang()` 幂等加载、`useT` 在切英文时触发加载并刷新。实测产物新增独立 chunk `i18n.en.js`（3.85KB / gzip **1.64KB**），主包 gzip 119.16KB → 英文包不计入首屏（满足 TC-V1-I18N-06）。
  - **长文分块预加载落地**：`Scene.preload()` 改为每 200 字一批并让出主线程（此前 `iterateChunks` 仅为未被调用的死代码），避免 5000 字预加载时冻结 UI。
  - 4K 限帧策略（V1-C3）在本点完成回归验证。
- **N4.4 无障碍深化**：新增 `e2e/a11y.mjs`（axe-core 真实浏览器审计，**明/暗双主题 × 5 个页面**）。

### 审计发现并修复的真实缺陷（N4.4 的核心产出）
| 问题 | 严重级 | 修复 |
|---|---|---|
| 辅助文字 `--im-color-ink-faint` 对比度仅 **3.76:1**（浅色 #8a8175 / 深色同值） | serious ×1~5/页 | 浅色提深为 `#6f675c`、深色提亮为 `#a89e8c` |
| 深色下主/危险按钮白字于朱砂底仅 **2.92:1** | serious ×1/页 | 新增 `--im-color-on-vermilion` 变量（浅色 #fff / 深色 #1a1714），按钮前景改引用该变量（实测 **6.09:1**） |
| 字体上传 `file input` 无标签 | **critical** ×1 | 补 `aria-label="选择要上传的字体文件"`；Editor 导入工程 input 同步补 `aria-label` |
| Logo 可访问名与可见文本不匹配（axe `label-content-name-mismatch`，全站每页） | serious ×1/页 | 移除 `aria-label`，改为可见文本 + `sr-only` 后缀"首页"，使可访问名包含可见文本 |

### 验证结果
- 单元测试：**104/104 通过**。
- 统一 E2E 套件：**6/6 套件 · 94/94 用例通过**（MVP 22 + V1-C1 8 + V1-C2 16 + V1-C3 16 + 发布检查单 17 + 无障碍 15）。
- 无障碍 axe 审计：**明/暗双主题 × 5 页面零 critical/serious 违规**（15/15）。
- 构建：`npm run build` 通过，主包 **357KB / gzip 119.16KB** + 英文包独立 chunk（gzip 1.64KB，按需）。

### 已知边界（V1-C4）
- axe 审计仅覆盖 WCAG 2.1 A/AA 的 critical/serious 级；minor 级与 AAA 未纳入门禁。
- 分块预加载按 200 字一批让出主线程，属"缓解"而非"消除"：极端场景（5000 字 + 4K + 低速设备）仍可能耗时较长，UI 已有进度与取消。
- 英文包虽已按需加载，但英文文案仍为**骨架占位**（TBD-V1-05 未审校）。

---

## V1.0 规划阶段（2026-10-13）— 规划完成，已批准并启动

### 背景
MVP 交付后用户指示"进入下一阶段规划，与 MVP 基本一致的方式向前推进"，即：**先出规划文档体系 → 用户批准 → 逐检查点落地（每点打包 zip，验证通过再进入下一点）**。

### 关键前提变化（本轮规划的决定性输入）
- **Unicode 18.0 于 2026-09-16 发布**，新增 **Seal（小篆）区块 U+3D000–U+3FC3F，共 11,328 码位** → 篆字可按码位直接寻址。
- **霞鹜篆书 LXGW Seal 已以 SIL OFL 1.1 开源**（165 字，含今字映射，如 U+3ECA3↔獻/献）；正式版缩减为 200 余字且**完成后不再维护**。
- 备选字源：敬峰中山王篆（OFL，~2832 字）、全字库说文解字（开放授权，6721 字）。
- **决策 D-V1-01**：古文字路径从"骨架化模拟"**转为"受限字库 + 真实字形映射"**；**R-01 关闭、R-03 降级冻结**。

### 已交付（4 份规划文档，已批准）
| 文档 | 内容要点 |
|---|---|
| `docs/IM-GLYPH-001-古文字可行性重评估.md` | 字源事实核验、数据模型、三级映射策略、渲染方案（整字显现/可选轮廓描边，**不承诺笔顺**）、许可合规、覆盖率分层、GV-01~06 验证项 |
| `docs/IM-PLAN-V1-001-V1.0项目计划与排期.md` | 范围定义、里程碑 V1-M0~M3、WBS 5 检查点 / 20 节点（约 27 人周）、发布检查单 V1-C1~C10、5 项待确认 |
| `docs/IM-RISK-V1-001-V1.0风险管理计划.md` | R-01 关闭、R-03 降级、R-06 升中-高；新增 VR-01~VR-10；重绘风险矩阵 |
| `docs/IM-TEST-V1-001-V1.0测试计划.md` | 新增 `TC-V1-*` 用例 **68 项** + 沿袭 MVP 回归 **35 项** = **103 项**；明/暗双主题 axe 审计；零上传强化 |

### V1.0 检查点落地状态（2026-10-14 更新：5/5 全部完成并通过验收）
| 检查点 | 覆盖节点 | 状态 | 交付 zip |
|---|---|---|---|
| **V1-C1 古文字字库与受限字符集** | N1.1–N1.4 | ✅ 完成（已验证通过） | `InkMotion-V1-C1-古文字字库与受限字符集-20261013.zip` |
| **V1-C2 主题、多语言与内容页** | N2.1–N2.5 | ✅ 完成（已验证通过） | `InkMotion-V1-C2-主题多语言与内容页-20261013.zip` |
| **V1-C3 字体上传与画布规格** | N3.1–N3.4 | ✅ 完成（已验证通过） | `InkMotion-V1-C3-字体上传与画布规格-20261013.zip` |
| **V1-C4 测试与优化** | N4.1–N4.4 | ✅ 完成（已验证通过） | `InkMotion-V1-C4-测试与优化-20261013.zip` |
| **V1-C5 上线** | N5.1–N5.3 | ✅ 完成（已验证通过） | `InkMotion-V1-C5-上线-20261014.zip` |

### 待用户决策
`IM-PLAN-V1-001 §8` 五项：TBD-V1-01 字源选型（建议方案 B：霞鹜 + 敬峰）、TBD-V1-02 是否要轮廓描边动画、TBD-V1-03 隶书是否纳入 V1.0（V1.0 已按"不纳入"发布）、**TBD-V1-04 4K 目标浏览器（V1-C5 已决策：以 Chromium 桌面版为准，帮助页注明降级）**、TBD-V1-05 英文是否需审校（V1.0 按"骨架占位、未审校"发布）。

### 备份
`InkMotion-V1.0规划文档-20261013.zip`

---

## V1-C5 上线（2026-10-14）— ✅ 已完成，已验收通过（2026-10-14）

前序：V1-C4 于 2026-10-13 交付并由用户验收"通过"，随即启动 V1-C5（N5.1 部署更新 / N5.2 许可合规扩展 / N5.3 V1.0 发布）。

### N5.1 部署更新（资产命名空间 `inkmotion-assets-v2`）
| 变更 | 内容 |
|---|---|
| `src/lib/assets.ts` | 命名空间与缓存名升至 **v2**；登记小篆资产 4 项（`seal-font` 42KB woff2 / `seal-map` / `seal-license` OFL.txt / `seal-font-fallback` 223KB TTF 不预缓存）；新增 `purgeLegacyAssetCaches()`、`listAssetCaches()`、`getAssetEntry()`、`isCdnMode()` |
| **缺陷修复** | 同源部署时资产 URL 曾误拼为 `/inkmotion-assets-v1/...`（静态托管下 404、预缓存静默失败）→ 改为直接引用 `public/` 相对路径；CDN 模式才加命名空间前缀 |
| `src/lib/seal.ts` | 字体/字表/许可 URL 统一由资产清单派生；新增**子集 woff2 → 完整 TTF 回退**与 `getSealFontSource()` 诊断 |
| `src/lib/textures.ts` | 纹理 URL 同样改由资产清单提供（消除 CDN 前缀重复实现） |
| 平台配置 | `public/_headers`、`vercel.json`、`netlify.toml` 增补 `/fonts/seal/*` immutable 长缓存 + CORS + `Permissions-Policy`；`vite.config.ts` 明确 `assetsInlineLimit`（字体不内联） |
| 文档 | `docs/IM-OPS-001` 升 **v1.1**：缓存 v2 策略、资产清单表（§6.1）、同源/CDN 双模式（§6.2）、多平台配置（§6.3）、回滚补充、发布检查单 O1–O9 |

### N5.2 许可合规扩展
| 变更 | 内容 |
|---|---|
| `src/lib/licenses.ts`（新） | 第三方许可登记单一真源：3 种字体（ArphicPL / OFL×2，**须署名**）+ 6 类运行期组件 + 构建期工具；`attributionRequiredEntries()`、`bundledLicenseFiles()` |
| `src/pages/About.tsx` | 新增「随包许可文本」「第三方许可与致谢」「开源组件」三张卡片；版本行改为 `版本 1.0.0 · Apache-2.0`；OFL.txt 同源查阅入口 |
| 仓库文件 | 新增 `NOTICE`（Apache 惯例）与 `THIRD-PARTY-NOTICES.md`（字体/组件许可、署名动作、上传字体责任说明） |
| i18n | zh/en 各新增 10 条许可与兼容性词条；英文包键集合与中文完全一致 |
| `src/pages/Help.tsx` | 新增「浏览器与导出兼容性」章节，**关闭 TBD-V1-04**：4K 以 Chromium 桌面版为准，Safari→MP4、Firefox→WebM 保底，内存受限建议 1080×1920 |
| CI | `.github/workflows/deploy.yml` 增加 `npm run test` 与随包许可文件存在性校验 |

### N5.3 V1.0 发布
- 版本真源 `src/lib/version.ts`：`APP_VERSION = 1.0.0`、`APP_CHANNEL = stable`；`package.json` 同步 1.0.0；`telemetry.ts` 引用统一版本（单测防漂移）。
- 新测试：`src/lib/__tests__/v1c5.test.ts`（22 用例）；`e2e/v1c5.mjs`（19 用例，含构建包命名空间检查与缓存迁移验证）；`e2e/all.mjs` 纳入 V1-C5 套件；`e2e/release-check.mjs` 增 V1-C2-1~3 / V1-C10-1~2，C8 性能预算改为**动态计算 gzip**（不再硬编码），C9 改为真实断言。
- **修复 4 项 lint 阻断错误**（CI 门禁）：`Input`/`Select`/`Slider` 的 `useId` 条件调用（rules-of-hooks）→ 改为无条件调用；`scene.ts` `let renderText` → `const`。

### 验证结果（全绿）
- 单元测试：**126/126 通过**（新增 22）。
- 统一 E2E 套件：**7/7 套件 · 118/118 用例**（MVP 22 + V1-C1 8 + V1-C2 16 + V1-C3 16 + **V1-C5 19** + 发布检查单 22 + 无障碍 15）。
- 发布检查单：**22/22**（含新增 5 项 V1 门禁）。
- 无障碍 axe 审计：明/暗双主题**零违规**（15/15）。
- lint：**0 error**；`tsc --noEmit` 通过；构建主包 **362.81KB / gzip 120.62KB** + 英文包独立 chunk（gzip 2.03KB）。

### 已知边界（V1.0）
- 4K 导出仅在 Chromium 桌面版验证；Safari/Firefox 未做 4K 验证（已在帮助页注明降级建议）。
- 英文文案仍为骨架占位、未经母语审校（TBD-V1-05）；本次新增许可/兼容性文案同样未经审校。
- 古文字仍为受限字库（165 篆字 / 238 今字映射），字源已停止维护（VR-02 持续跟踪）。

### 验收与结项（2026-10-14）
- 用户于 2026-10-14 对 V1-C5 回复"**通过**"，**V1.0 正式结项**。
- V1.0 全量门禁（单测 126/126、E2E 7 套件 118/118、发布检查单 22/22、axe 15/15、lint 0 error、构建 gzip 120.62KB）均在交付时实测全绿，验收无需复测即确认。
- 待确认事项现状：TBD-V1-01（字源选型）、TBD-V1-02（轮廓描边动画）、TBD-V1-03（隶书，推 V1.1）、TBD-V1-05（英文审校）均按"V1.0 不纳入/骨架占位"发布，作为 V1.1 候选；TBD-V1-04 已于 V1-C5 决策闭环。

### 备份
`InkMotion-V1-C5-上线-20261014.zip`（V1.0 最终结项版，含本验收结论）

---

## V2.0 规划阶段（2026-10-14）— 已批准执行

### 背景
V1.0 于 2026-10-14 正式结项（用户回复"通过"）。用户指示将 V1.0 全部遗留项（TBD-V1-01~05、VR-02、VR-06/VR-10）**统一并入 V2.0** 处理，沿用"先规划 → 批准 → 逐检查点交付 zip"方式推进。

### 关键前提与决策
- **Unicode 18.0 小篆区块 U+3D000–U+3FC3F** 已发布 → 三层字源均按该码位寻址，得以用"动态字体回退栈"实现零侵入优先级回退。
- **用户决策（2026-10-14 批准执行）**：
  1. **L2 全字库（6721 字）纳入 V2.0** —— TBD-V2-01 关闭。
  2. **合规政策 D-V2-02** —— V2.0 不再以资源合规为功能阻塞，对评估范围内字源**一律采用**；需授权字体统一登记「字体授权待办登记册」（本仓库 `PENDING-LICENSES.md`）后续联系获取授权 —— TBD-V2-02 关闭、VR2-02 降级为"已接受·低"。

### 已交付（4 份规划文档，已批准执行）
| 文档 | 内容要点 |
|---|---|
| `docs/IM-GLYPH-V2-001-古文字能力深化可行性重评估.md`（v1.1） | 多字源分层（L0 霞鹜 + L1 敬峰 + L2 全字库）、隶书、描边动画可行性；L2 已纳入、隶书依 D-V2-02 改"一律采用+登记" |
| `docs/IM-PLAN-V2-001-V2.0项目计划与排期.md`（v1.1） | 范围、里程碑、5 检查点 / 18 节点（约 30 人周）、发布检查单 V2-C1~C10、TBD-V2-01~05（两项已决策关闭） |
| `docs/IM-RISK-V2-001-V2.0风险管理计划.md`（v1.1） | 承接 V1.0 风险；VR2-02 由"合规·高·阻塞"降级为"已接受·低（D-V2-02）"，残留跟踪指向登记册 |
| `docs/IM-TEST-V2-001-V2.0测试计划.md` | TC-V2-* 用例族、发布检查单验证方法 |

### 备份
`InkMotion-V2.0规划文档-20261014.zip`

---

## V2-C1 落地明细（2026-10-14）— 篆书字源分层扩展 ✅ 已完成（待用户验收）

前序：V1.0 于 2026-10-14 结项；当日用户批准 V2 规划并决策 L2 纳入 + D-V2-02，随即启动 V2-C1（N1.1–N1.5）。

### N1.1 分层篆书引擎（`src/lib/seal.ts` 重构）
- 三层配置 `SEAL_LAYERS`：L0 霞鹜（保底，OFL-1.1，必装）/ L1 敬峰（主力，OFL，~2832 字，按需）/ L2 全字库（OpenGov-TW，6721 字，按需）。
- 三层均映射 Unicode 18.0 小篆码位 U+3D000+；**动态字体回退栈**：`getSealFontStack()` 按优先级 L1→L0→L2 组成 ctx.font 字体族，浏览器自动选取首个含该字形码位的字源，零侵入实现优先级回退，避免逐字试绘成本。
- `loadSealCharset(layer)` 按层加载，资产缺失返回 `null`（静默跳过该层）；`loadSealRegistry(setting)` 按 `layersForSetting` 加载启用层并**优先级去重**合并索引（L1 优先于 L0）；`mergedSealCharset()` 产出向后兼容的 `SealCharset`。
- 保留全部 V1.0 向后兼容导出（常量、函数签名），既有渲染/测试不受影响。

### N1.2 合并映射与覆盖率预估引擎
- `estimateSealCoverage(text, reg)`：返回 `{total, covered, ratio, layers}`（GV-V2-04）。
- `src/lib/useSeal.ts`：`useSealCoverage` / `useSealOutOfRange`（基于合并注册表，替代旧单字表逻辑）；`computeOutOfRangeV2`。

### N1.3 L1/L2 字源集成脚手架与授权登记册
- `src/lib/assets.ts`：资产清单新增 L1/L2 资产（`seal-font-l1/-l1-fallback/-map-l1`、`seal-font-l2/-l2-fallback/-map-l2`，均 `precache:false`，缺失静默跳过）。
- 新建 `PENDING-LICENSES.md`（字体授权待办登记册）：敬峰中山王篆(L1) / 全字库说文解字(L2) / 隶书(V2-C2) 三项待授权，含 D-V2-02 说明与跟进机制。
- `src/lib/licenses.ts`：`LicenseId` 扩展 `'OFL' | 'OpenGov-TW'`；`LicenseEntry` 新增 `pendingAuthorization`；新增 `pendingAuthorizationEntries()` 查询；`THIRD_PARTY_LICENSES` 登记 L1/L2。

### N1.4 字源层级 UI 与覆盖率显示
- `src/store/settings.ts`：新增 `sealLayers`（默认 `'L0'`）与持久化。
- `src/pages/Settings.tsx`：偏好卡新增"篆书字源层级"三态 Select（L0/L0L1/all），切换后 `registerSealFont(next)` 按需注册（缺失静默）。
- `src/pages/Editor.tsx`：篆书提示区新增覆盖率百分比（`已覆盖/总字数`）。
- `src/pages/About.tsx`：新增"授权待办登记册"卡片（待授权列表 + `/PENDING-LICENSES.md` 链接）。
- i18n（zh/en）：新增 `settings.sealLayers*` / `seal.coverage*` / `seal.layers.active` / `about.pendingLicense*` 等词条，英文包键集合与中文一致。

### N1.5 资产命名空间升 v3 与旧缓存清理
- `src/lib/assets.ts`：`ASSET_NAMESPACE`/`ASSET_CACHE_NAME` 升 `inkmotion-assets-v3`；`LEGACY_ASSET_CACHE_NAMES` 纳入 `'inkmotion-assets-v2'`（启动自动清理）。
- 平台配置（`public/_headers`/`vercel.json`/`netlify.toml`/`vite.config.ts`）注释同步至 v3；路径通配符 `/fonts/seal/*` 已覆盖新字源。

### 验证结果（全绿）
- **单元测试 `vitest`：136/136 通过**（新增 `src/lib/__tests__/seal-v2.test.ts` 10 项：层级解析 / 合并优先级去重 / 覆盖率 / 字体栈静默跳过；`v1c5.test.ts` 同步 v3 语义 22 项；`seal.test.ts`/`scene.test.ts` 适配 `loadSealCharset` 返回 `null`）。
- **E2E**：`e2e/v2c1.mjs` 新增并接入 `e2e/all.mjs` —— **V2-C1 13/13**（L0 回归渲染 + 层级三态切换 + v3 命名空间 + 旧 v2 缓存清理 + 零上传）；回归 **V1-C1 8/8**、**MVP 22/22** 均通过，确认分层改造未破坏既有行为。
- **lint**：0 error；`tsc --noEmit` 通过。
- **构建**：主包 368.86KB / gzip 122.30KB + 英文包独立 chunk（`i18n.en` gzip 2.36KB，按需）。

### 已知边界（V2-C1）
- L1 敬峰 / L2 全字库字源二进制与映射表**尚未随包提供**（资产待按 D-V2-02 采用并登记）；当前仅 L0 保底生效，L1/L2 加载失败静默跳过（架构就绪、资产补齐即自动生效，无需改代码）。
- 三层共用 U+3D000 码位 + 字体回退栈：若某字同时被多层覆盖，渲染取**已注册字体中优先级最高**的字形（L1→L0→L2）；覆盖统计按合并索引去重（L1 优先）。
- 切换字源层级后需字体注册生效：设置页切换已即时 `registerSealFont(next)`，但真实字形生效依赖对应 woff2 资产可用（当前仅 L0）。

### 交付 zip（待用户验收）
`InkMotion-V2-C1-篆书字源分层扩展-20261014.zip`

> **验收结果**：用户回复"通过"（2026-10-14），V2-C1 结项。

---

## V2-C2 落地明细（2026-10-14）— 隶书路径与古文字描边动画 ✅ 已完成（待用户验收）

前序：V2-C1 于 2026-10-14 验收通过；用户指示"继续你未完成的工作"，随即启动 V2-C2（N2.1–N2.4）。

### N2.1 隶书字源 Spike 与授权登记 ✅
- `docs/IM-SPIKE-V2-C2-隶书字源结论.md`：闭环 TBD-V2-02，**结论=采用**（承 D-V2-02 合规政策），资产待提供。
- `PENDING-LICENSES.md` 第 3 项更名「隶书字源（Li）」并补 Spike 结论；`src/lib/licenses.ts` 追加隶书条目（OFL / pendingAuthorization）。

### N2.2 隶书映射与渲染 ✅
- 新建 `src/lib/lishu.ts`（镜像 `seal.ts` 单层机制，**不改写** V2-C1 既有测试与导出签名）：`loadLiCharset()`→`Promise<LiCharset|null>`（404→null）、`registerLiFont()`、`getLiFontStack()`、`transformToLi(text, charset|null)`（**null 时恒等映射**）、`estimateLiCoverage`。
- 新建 `src/lib/useLi.ts`（`useLiOutOfRange` / `useLiCoverage`）、`src/components/LiCharsetPanel.tsx`（类前缀 `im-li-panel`；字表存在→网格，缺失→信息性提示）。
- 枚举并行扩展：`FontFamily`（db/types.ts）与 `StrokePathKind`（engine/types.ts）同步追加 `'li'`；`ProjectOptions.outlineAnimation?: boolean` 可选（默认 false）→ 构造期回填默认。
- `stroke.ts` 抽象通用 `drawRestrictedGlyph`；`drawSealGlyph` 委托之（**签名不变**）；新增 `drawLiGlyph`。
- `scene.ts`：隶书 preload 分支（`loadLiCharset`→`transformToLi`→按需重排 path:'li'）；drawFrame 隶书分派。
- `OptionsPanel`：字体下拉改读 `FONT_CATALOG`（自动含隶书）；隶书面板；**末尾新增第 6 个「动画」分组**（保持 nth=1 字体 / nth=4 画布 E2E 选择器不变）；`Editor.tsx` 并行隶书提示块（role=status, aria-live=polite）。
- `fonts.ts`（隶书项 OFL / `li-restricted`）、`assets.ts`（li-font/li-map/li-font-fallback，precache:false）、`main.tsx`（启动注册）、`sceneFactory`/`PreviewCanvas`（透传 outlineAnimation）、`Help.tsx`/`presets.ts`（新增 `preset-jingyesi-li`，模板 4→5）、i18n 中英词条。
- **向后兼容**：枚举**追加**而非替换；隶书字表/字体缺失时恒等映射 + 系统隶书族（`LiSu`/`STLiti`）+ 衬线兜底，UI 信息性提示，**不造假不阻塞**。

### N2.3 矢量轮廓描边动画 ✅
- 新建 `src/engine/outline.ts`：**自研轻量 TrueType 解析**（`glyf/loca/cmap/head/maxp`；支持简单轮廓 + 复合字形平移/缩放；cmap format 4/12）。
  - **否决 opentype.js**：其 ~80KB（gzip 前）会突破 V2 门禁（gzip<200KB）→ 守门禁自研。
  - `parseGlyphOutline(fontUrl, codePoint)`→`Promise<OutlineGlyph|null>`；缓存 + `WeakMap` 表解析缓存；递归深度限制（防损坏字体死循环）。
  - 导出 `OutlineGlyph`/`OutlineContour`/`OutlinePoint`、`hasOutline`、`totalOutlineLength`、`getCachedOutline`、`__clearOutlineCache`。
- `stroke.ts` 新增 `drawGlyphOutline(ctx, glyph, outline, progress, color, opts?)`：**Canvas2D 无 lineDashOffset 的通用/导出一致能力 → 采用累计弧长截断**；轮廓展平为直线段（二次贝塞尔按 10 段采样），在最后一段内插值收尾。
- `scene.ts`：`SceneOptions.outlineAnimation`；`preloadOutlines()`（仅 seal/li 且开关开启时预解析，按 100 字分块让出主线程）；`getGlyphOutline`；drawFrame 描边分派（`useOutline` 判定）。

### N2.4 描边性能与回退 ✅
- 开关关闭 / 非受限路径 → **零解析开销**。
- 解析失败静默降级整字填充，日志 `console.debug`（**非 error**，不污染控制台）。
- 修复既有漂移：`e2e/release-check.mjs` C9 断言 `v2`→`v3`（与源码命名空间一致）。

### 验证（全绿）
- **类型**：`npx tsc --noEmit` ✅ 通过。
- **单测**：`npx vitest run` —— **18 文件 / 170 测试全绿**（V2-C2 新增 `lishu.test.ts` 10 + `stroke-li.test.ts` 5 + `outline.test.ts` 8 + `stroke-outline.test.ts` 6 + `outline-perf.test.ts` 5）。
  - `outline.test.ts` 含**真实合成 TTF fixture**（`fixtures/synthetic.ttf`），校验 bbox(100/600/0/700)、周长(2400)、二次贝塞尔曲线展平。
- **Lint**：`npm run lint` ✅ 无警告/错误。
- **构建**：`npm run build` ✅ —— 首屏 gzip **126.70KB**（自研解析 +~2.75KB，守 200KB 门禁）。
- **E2E**：`e2e/v2c2.mjs`（13 项；接入 `e2e/all.mjs`，base:dev）。

### 已知边界（V2-C2）
- 隶书字体二进制与字表**尚未随包提供**（待按 D-V2-02 采用并登记）；当前隶书回退系统隶书族 + 衬线，字表缺失时恒等映射（架构就绪、资产补齐即自动生效，无需改代码）。
- 描边动画**仅 seal/li 受限路径生效**，默认关闭；仅支持 TrueType（CFF/OTF/TTC 返回 null → 降级整字填充）。
- 描边为**一次性轮廓描绘**（无笔顺承诺，与 D-V1-01 一致）。

### 交付 zip（待用户验收）
`InkMotion-V2-C2-隶书路径与描边动画-20261014.zip`

> **验收结果**：用户回复"通过"（2026-10-14），并附**字体选型政策 D-V2-03**："字体请使用开源社区的优秀项目，抛开商用先以使用为主。" V2-C2 结项。

---

## V2-C3 落地明细（2026-10-14）— 国际化深化 ✅ 已完成（待用户验收）

前序：V2-C2 于 2026-10-14 验收通过（附 D-V2-03 字体选型政策）；用户指示"继续"，随即启动 V2-C3（N3.1–N3.3）。

### N3.1 英文文案母语审校 ✅
- `src/lib/i18n.en.ts` **全量重写**：与 zh-CN 对齐 **252 键**（V1.0 仅 117 键，多为一词骨架占位）。
- 母语级修订要点：
  - `app.tagline` → "browser-only…never leaves your device"（贴合产品声明与隐私卖点）。
  - `help.seal` → "about 165 of 238 characters…**no stroke-by-stroke writing**"（原 "no stroke animation" 语义过宽，会误导描边动画已支持篆书）。
  - `options.font.kai` → "precise stroke order"；`export.capNote` → "with automatic downgrade"；`projects.deleteBody` 等含插值句法自然化。
- `docs/IM-I18N-V2-001-英文审校记录.md`：审校目标 / 执行方式（闭环 **TBD-V2-05**） / 主要修订样例表 / 术语统一表 / TC-V2-I18N-01~04 验证结果 / 结论（TBD-V1-05 与 TBD-V2-05 同步关闭）。

### N3.2 多语言包完善与硬编码清理 ✅
- `src/lib/i18n.ts`：新增 `interpolate(template, params)`；`translate` 签名扩展为 `(key, lang, params?)`，zh/en 两分支均走插值 → 插值行为跨语言一致。
- `src/lib/useI18n.ts`：`t` 返回 `(key, params?) => translate(key, lang, params)`；`useCallback` deps 修正（消除 lint 未用依赖告警）。
- `src/lib/fonts.ts`：`FontMeta` 新增 `labelKey` / `attributionKey` / `noteKey?`（保留原 `label`/`attribution`/`note` 作中文兜底，**向后兼容**）；`FONT_CATALOG` 四项补全。
- 硬编码清理覆盖：`Home` / `Projects` / `Editor` / `Help` / `About` / `Settings` 六页 + `OptionsPanel` / `FontManager` / `SealCharsetPanel` / `LiCharsetPanel` / `ExportDialog` / `Modal` / `Toast` / `PreviewCanvas` / `App` 九个组件。
- **不翻译边界（设计原则，写入 `i18n.ts` 头注）**：业务内容（用户文本/模板古典正文/诗文标题）、语言自称（`简体中文`）、品牌墨迹符号（`墨`）——由 E2E 与脚本白名单排除，避免误报。

### N3.3 审校流程固化 ✅（门禁入 CI）
- **新建 `scripts/check-i18n.mjs`** —— 四重静态校验，退出码 0/1：
  1. zh-CN 与 en 键集合**完全一致**；
  2. 取值非空（防回退为骨架）；
  3. 同键 `{占位符}` 集合**跨语言一致**（防插值错位）；
  4. 扫描 `src/pages` + `src/components` 的 JSX 文本 / `placeholder` / `aria-label` / `title` 中的**硬编码中文**（排除已 `t()` 包裹者）。
- `package.json` 新增脚本 `"check:i18n": "node scripts/check-i18n.mjs"`。
- `.github/workflows/deploy.yml`：在 `npm run test` 之后、`npm run build` 之前插入 `npm run check:i18n` —— **文案变更不通过门禁则无法构建发布**。
- `docs/IM-OPS-001-部署与运维文档.md`：新增 **§8bis「i18n 审校流程固化」**（门禁命令 / 检查项 / 变更约定 / 合规依据）；发布检查单新增 **O10**。
- 变更约定：新增/修改 UI 文案须**同步登记中英双语**并跑 `npm run check:i18n`；涉及对外语义的英文措辞须走母语级复核并记入 `IM-I18N-V2-001`。

### 验证（全绿）
- **类型**：`npx tsc --noEmit` ✅ 通过。
- **单测**：`npx vitest run` —— **173/173 全绿**（i18n 新增 3 项：插值中英一致 / 占位符集合一致 / N3.2 抽取词条双语登记）。
- **Lint**：`npm run lint` ✅ 0 error / 0 warning。
- **i18n 门禁**：`node scripts/check-i18n.mjs` ✅ 通过（252 键对齐、占位符一致、无硬编码中文残留）。
- **构建**：`npm run build` ✅ —— 首屏 gzip **128.29KB**（守 200KB 门禁）；英文包独立 chunk `i18n.en-*.js`（14.53KB / gzip 5.01KB，**首屏不含**）。
- **E2E**：`e2e/v2c3.mjs` **12/12**（语言切换 / 五页英文无残留 / 导航本地化 / 参数分组本地化 / 无横向溢出 / 英文独立 chunk / 无运行时错误）；接入 `e2e/all.mjs`；回归 **10 套件 / 159 项全绿**。
- **发布检查单**：`e2e/release-check.mjs` 新增 V2-C8-1（英文独立 chunk）/ V2-C8-2（英文切换生效）/ V2-C8-3（英文模式无硬编码中文）→ **25/25 全绿**。

### 已知边界（V2-C3）
- 英文**已按母语级审校**，但非英语母语者长期驻场评审；后续若新增功能文案，须按 §8bis 约定走复核。
- 语言仍为 **zh-CN + en 双语**；第 3 语言（如 ja）不在 V2.0 范围，`translate` 架构已预留扩展点（新增 pack 文件 + 注册即可）。
- 古典内容（模板正文/诗文标题）**有意保留中文原文**，不随界面语言切换 —— 属产品设计，非缺陷。

### 交付 zip（待用户验收）
`InkMotion-V2-C3-国际化深化-20261014.zip`

> **验收结果**：用户回复"勉强通过，核心功能毫无进展"，并提出两项立即执行要求：① 字体库扩展；② 核心功能与界面重新核实优化。V2-C3 结项，转入 V2-C4。

---

## V2-C4 落地明细（2026-10-14）— 字体库扩展与上传闭环 🔧 进行中（C4 已交付待验收）

前序：用户对 V2-C3 评价"勉强通过，核心功能毫无进展"，明确指出**"字体上传却无任何作用"**并要求自检后给出规划。

### 自检结论（基于真实代码，非推测）——三个"看起来有、实际没通"的断点

**断点 1：字体上传是死路（最严重）**
- `uploadFont()` 只做「校验 → FontFace 注册 → 写 IndexedDB」，**没有任何消费方**：
  - `ProjectOptions.fontFamily` 只有 `kai/song/seal/li` 四个枚举，**无承载自定义字体的字段**；
  - `scene.ts` 渲染分派是四路硬编码分支；`stroke.ts` 楷/宋路径**写死**字体栈；
  - `refreshFonts()` 只读记录、**从不重注册 FontFace** → 刷新后彻底失效。
- 即"登记台"：登记完就结束，既进不了渲染管线，重启后连登记态都失效。

**断点 2："字体库扩展"名不副实**
- 楷体依赖 **CDN**（hanzi-writer-data）取笔画数据，离线不可用；
- 宋体**无字体文件**，靠系统 `Songti SC/SimSun` 兜底 → Linux 直接退化；
- 小篆仅 **165/6721 字（2.5%）**；
- 隶书**纯空壳**，`public/fonts/` 下无任何隶书文件；
- 多层字源 L1/L2 资产**从未提供**，永远空跑。

**断点 3：编辑器布局不合理**
- `320px 1fr 300px` 三栏，1080px 以下塌成一列；预览区无等比缩放，竖屏 1080×1920 被压到不足半屏；参数面板 6 分组冗长溢出。

### 用户决策（2026-10-14）
1. **内置字库规模**：精选 2–3 款 + 子集化（推荐项）；
2. **隶书处理**：找合规开源隶书接入（推荐项）；
3. **交付节奏**：C4 与 C5 分两次交付（推荐项）。
4. 补充决策：**D-V2-03 字体选型政策**（承 V2-C2）——优先开源社区优秀项目，以"先用起来"为第一原则。

### N4.1 打通字体上传闭环 ✅
- **新建 `src/lib/fontRegistry.ts`（字体注册中心）**：统一管理内置+上传字体的 FontFace 注册、`restoreFonts()` 启动恢复、`unregisterFont()` 删除注销、字体栈解析。
- **`ProjectOptions` 新增 `customFontId?: string`**：承载"当前使用的自定义字体"。
- **`restoreFonts()` 接入 `refreshFonts()`**：每次拉取列表后幂等重注册 → **修复"刷新即失效"**。
- **新建 `src/lib/fontResolve.ts`**：`resolveFontStack(customFontId, records)` 把项目选项解析为**可直接拼进 `ctx.font` 的字体栈**（含兜底族）；`isCustomFontUsable()` 供 UI 显示生效状态。
- `stroke.ts`：`drawSongGlyph` 增可选 `fontStack` 参数（**向后兼容**，签名扩展非替换），不再写死字体栈。
- `scene.ts`：`SceneOptions.customFontStack`；自定义字体与内置宋体/毛笔楷统一走「整字显现」路径；`drawFrame` 按 family 取对应内置栈。
- `fontUpload.ts`：改为「**先落库拿 id → 再按记录注册**」（支持按 fontId 索引/恢复/注销）；注册失败**回滚删除**（不留下"已上传却不可用"的记录）；错误文案**改为 i18n 错误码**（`font.err.*`）。
- `Select.tsx`：新增 `group?: string` 支持原生 `<optgroup>`（**向后兼容**）。
- `OptionsPanel`：字体下拉分「内置字体」「我的字体」两组；`custom:<id>` 与内置 family 双向映射；受限字库提示仅在非自定义字体时显示。

### N4.2 内置开源中文字库 ✅
- **接入三款 OFL 1.1 开源字体，全部随包提供**：

| 字体 | 字形数 | 用途 | 分片 |
|---|---|---|---|
| 霞鹜文楷 LXGW WenKai Lite | 25694 | 楷体路径 | 39 片 |
| 思源宋体 Noto Serif SC | 30928 | 宋体路径 | 39 片 |
| 马善政毛笔楷 Ma Shan Zheng | 5959 | 书法体（新增 family `brush`） | 25 片 |

- **新建 `scripts/build-fonts.py`（字体分片构建脚本）**：把完整 TTF 按 **unicode-range 切成 103 片 woff2**（单片最大 304KB），生成 `fonts.css` + `fonts.manifest.json`；支持 `--check` 校验产物完整性。
- 浏览器**按需下载**：一篇常见文本只触发 2–4 片 → 首屏字体成本≈0，**体积总量 13.89MB 但不进首屏**。
- `index.html` 引用 `/fonts/builtin/fonts.css`；`FONT_CATALOG` 全面重写（楷体由文鼎 UKai 改为霞鹜文楷，新增 `brush`）；`FontFamily` 枚举**追加** `'brush'`（向后兼容）。

### N4.3 隶书字源如实处理 ✅
- **检索结论（如实汇报）**：公开渠道**无合规开源隶书直链**。真隶书候选「阿里妈妈刀隶体」（GB2312 覆盖 6763 字，免费商用）**仅通过阿里妈妈平台发布**，无公开 CDN，沙箱内无法自动获取。
- **处理方式**：保留隶书选项，但 **UI 如实标注**"当前依赖系统已安装的隶书字体；未安装时显示为普通衬线体"，**绝不假装支持**。
- 登记「字体授权待办登记册」第 3 项为**待手动取件**：下载后放入 `fonts-src/` + 运行 `scripts/build-fonts.py` 即可真实接入（代码路径已就绪）。

### N4.4 字体管理器升级 ✅
- 上传字体卡片新增**字样预览**（用已注册字体真实渲染「永 和 九 年」）+ **生效状态徽标**（生效中/未生效）。
- 删除字体时同步 `unregisterFont()`，避免残留字族。
- 上传目标路径新增「毛笔楷路径」。

### 验证（全绿）
- **类型**：`npx tsc --noEmit` ✅ 通过。
- **单测**：`npx vitest run` —— **20 文件 / 190 测试全绿**（新增 `v2c4-font.test.ts` 8 项 + `v2c4-fonts.test.ts` 9 项）。
- **Lint**：`npm run lint` ✅ 0 error / 0 warning。
- **i18n 门禁**：`node scripts/check-i18n.mjs` ✅ 274 键对齐。
- **构建**：`npm run build` ✅ 首屏 gzip **130.06KB**（守 200KB 门禁）；**103 片字体资产全部进入 dist**。
- **E2E**：新增 `e2e/v2c4.mjs` **19/19**（接入 `e2e/all.mjs`，base:preview）——**真实浏览器行为验证**：
  - 内置字体 CSS 可访问、103 条 @font-face、unicode-range 分片；
  - 三款字体首片真实可下载（200）；
  - 进入编辑器后**浏览器真实按需拉取字体分片**（证明字体生效）；
  - **画布渲染出墨迹像素**（证明字体真实绘制，非空白）；
  - **切换宋体/楷体后渲染结果变化**（证明字体选择真实生效）；
  - **上传字体 → 列表出现 → 字样预览 → 刷新后仍在且「生效中」**（全链路闭环）。
- **发布检查单**：`e2e/release-check.mjs` 新增 **V2-C4-1~6** → **31/31 全绿**。
- **全量回归**：`node e2e/all.mjs` —— **11 套件 / 162 用例全绿**。

### 已知边界（V2-C4）
- 隶书**仍无内置字源**（已如实标注 + 登记待手动取件）；真隶书接入需手动提供字体文件。
- 内置字体为 **Regular 单字重**；粗体/细体未内置（可按 `scripts/build-fonts.py` 扩展）。
- 字体分片总量 13.89MB，**不进首屏**（按需下载），但完整离线使用时浏览器会缓存必要分片。

### 交付 zip（待用户验收）
`InkMotion-V2-C4-字体库扩展与上传闭环-20261014.zip`

---

每个检查点交付 zip（不含 `node_modules` / `dist` / `.git`）。本地验证：
```bash
unzip InkMotion-Cx-*.zip
cd inkmotion
npm install
npm run dev      # http://localhost:5173
```
验证通过后回复"通过"，即进入下一检查点。

---

## V2-C5 核心功能与界面重构（2026-10-14 — ✅ 已完成，待用户验收）

> 对应节点 **N5.1–N5.4**。交付背景：用户指出「**布局是否合理？**」并要求「**重点、核心功能及界面重新核实与优化**」。
> 本检查点以「**先自检、再重构、逐项实测**」为方法论：先把界面上"声称"的核心功能逐项验证（N5.3 自查表），
> 在过程中发现并修复一个真实产品缺陷（暂停态参数变化不可见），再完成三栏重排与预览等比缩放（N5.1）、
> 参数手风琴（N5.2）、响应式与状态统一（N5.4）。

### N5.3「声称 vs 实测」核心功能自查表 ✅（先于重构执行）
- **方法**：真实 Chromium + 生产构建产物，统一判定标准为「**操作控件 → 观测可证伪的客观变化**」，
  不接受「控件存在即通过」。产出归档为 `docs/IM-SELFCHECK-V2-C5-001-声称vs实测自查表.md`。
- **结论**：**9/9 项核心功能均真实生效**（字体×3 / 上传 / 载体 / 墨色 / 速度 / 字号 / 画布规格 / 滚动 / 导出降级）。
- **过程中发现并修复一个真实缺陷**：**暂停态下参数变化不可见**——场景按新参数重建后只重绘一帧，
  画布停在"刚起步"的状态，体感上就是"改了参数没反应"（与"字体上传无作用"同类：功能在、呈现断）。
  修复：`PreviewCanvas` 新增缓动重绘副作用（场景切换后按真实时间轴持续重绘至结束）。
  证据：字号 48px→160px 的墨迹像素由"差异被首帧掩盖（15643 vs 15643）"变为"真实单调增长（3794 → 43553）"。
- **测试方法教训（记录在案）**：受控 range input 直接写 `.value` 会被 React 复原，
  E2E 必须走真实交互（键盘方向键）驱动 onChange，否则得到"参数无效"的假结论。

### N5.1 编辑器三栏重排与预览等比缩放 ✅
- **预览等比缩放**：新增 `src/lib/useElementSize.ts`（ResizeObserver 实测容器）+ `containSize()`
  （按画布真实宽高比等比内接）。修复旧版 `aspect-ratio:9/16 + max-width:360px` 写死导致的两个问题：
  横屏 16:9 被强塞竖屏框、大屏预览过小。舞台居中（`place-items:center`），`data-ratio` 暴露真实比例。
- **三栏重排**：`320px | 1fr | 320px`（≥1440 放宽 360，1200–1440 收窄 288）；
  断点 **1440 / 1200 / 900**：≤1200 预览置顶两栏（grid-template-areas），≤900 单栏堆叠。
- **左右栏可折叠**：收起为 56px 竖排窄轨（`writing-mode: vertical-rl`），
  **栅格真实重排**（中栏吃掉释放空间），折叠态持久化（localStorage）+ `aria-expanded` 可达。
- **截图留档**：`docs/shot-1440.png`（三栏）/ `shot-1440-collapsed.png`（折叠窄轨）/
  `shot-1100-two-col.png`（两栏）/ `shot-820-single.png`（单栏）。

### N5.2 参数面板手风琴折叠 ✅
- 新增 `src/components/Collapsible.tsx`：原生 button + `aria-expanded/aria-controls`（键盘可达），
  **收起用 `hidden` 而非卸载子树**（避免 Select/Slider 焦点与取值重置，E2E 专门断言）。
- 六个分组（载体/字体/书写/滚动/画布/动画）全部折叠化，**标题右侧显示当前取值摘要**（收起也可读）；
  分组展开态由编辑器页统一持有，跨渲染保持。
- **受限字库提示内联低位**：篆书/隶书字库面板收进「字体」分组低位，不再独立占块。
- **向后兼容**：`Collapsible` 支持 `legacyFieldset`，外层保留 `fieldset.im-options__group` + legend，
  使既有 E2E 的 `.im-options__group >> nth=N >> select` 定位语义不变（12 套件全量回归验证通过）。

### N5.4 响应式与状态统一 ✅
- **四断点实测**（1440/1280/1024/820）：预览均等比、不溢出（E2E 逐点断言）。
- **状态统一**：错误态（不存在的项目给出明确提示，非空白页）、空态（正文为空显示占位提示且画布不崩溃）。
- 无障碍延续：折叠开关 `aria-expanded`、竖条可聚焦、
  `a11y.mjs` 明/暗双主题 15/15 保持全绿。

### 验证（全绿）
- **类型**：`npx tsc --noEmit` ✅。
- **单测**：`npx vitest run` —— **21 文件 / 208 测试全绿**（新增 `v2c5-ui.test.ts` 18 项：
  containSize 数学性质 / 三栏与断点 CSS / Collapsible 语义 / 手风琴六组 / 折叠不卸载子树）。
- **Lint**：`npm run lint` ✅ 0 警告。**i18n**：zh/en **281 键**对齐（+7 键：折叠/展开/摘要/开/关等）。
- **构建**：主包 gzip **131.81KB**（< 200KB 门禁；C4 为 130.06KB，+1.75KB 来自三栏/手风琴/等比缩放逻辑）。
- **E2E 全量**：`e2e/all.mjs` —— **12 套件 / 178 用例全绿**（新增 `e2e/v2c5.mjs` **39/39**）。
- **发布检查单**：`release-check.mjs` —— **41/41**（新增 V2-C5-1~9）。

### 已知边界（如实记录）
- 移动端触控手势（缩放/平移）未实现；折叠无过渡动画（避免与 ResizeObserver 抖动）；
  参数面板无搜索（组数增长时需补）；横屏画布仍标注「实验」。

### 交付 zip
- `InkMotion-V2-C5-核心功能与界面重构-20261014.zip`
