# 墨演 InkMotion — 执行日志（逐检查点落地）

> 本文件为执行进度记忆存档，与 `docs/InkMotion-规划索引.md` 配套。每个检查点完成即更新状态，并打包 zip 供本地验证。

## 检查点状态总览

| 检查点 | 覆盖节点 | 状态 | 交付 zip |
|---|---|---|---|
| **C1 工程地基与基础设施** | N0.1–N0.4、N1.1–N1.4 | ✅ 完成（已验证通过） | `InkMotion-C1-工程地基与基础设施-20261013.zip` |
| **C2 核心引擎 Demo（M1 闸门）** | N2.1–N2.6 | ✅ 完成（已验证通过） | `InkMotion-C2-核心引擎-20261013.zip` |
| **C3 MVP UI 集成（M2）** | N3.1–N3.5 | ✅ 完成（已验证通过） | `InkMotion-C3-MVP-UI集成-20261013.zip` |
| **C4 测试与优化（M3）** | N4.1–N4.4 | ✅ 完成（已验证通过） | `InkMotion-C4-测试与优化-20261013.zip` |
| **C5 上线（M4）** | N5.1–N5.3 | ✅ 完成（待用户验证） | `InkMotion-C5-上线-20261013.zip` |

> **MVP 全部 5 个检查点已完成。**

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
每个检查点交付 zip（不含 `node_modules` / `dist` / `.git`）。本地验证：
```bash
unzip InkMotion-Cx-*.zip
cd inkmotion
npm install
npm run dev      # http://localhost:5173
```
验证通过后回复"通过"，即进入下一检查点。
