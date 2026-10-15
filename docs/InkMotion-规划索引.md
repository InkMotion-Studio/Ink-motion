# 墨演 InkMotion — 规划索引与项目记忆

> 本文为项目总控索引与记忆存档。生成日期：2026-10-13。所有规划文档已落入 `/workspace`，并经 zip 打包供备份。

## 一、项目定位（基线）

- **墨演 InkMotion**：纯前端浏览器应用，生成古典中文风格视频（竖排右起、逐笔书写动画、宣纸/竹简等载体渲染、自动滚动、MP4/WebM 导出）。
- **纯前端铁律**：无服务端、无数据库、无 HTTP API、无账号系统。用户文本/项目/字体仅本地（IndexedDB + Cache API）。
- **渲染分期**：Canvas2D 为 MVP/V1.0；Three.js/WebGL 为 V2.0。
- **笔画三路径**：楷体=本地权威笔顺逐笔（V2-C7 C3 起由字体轮廓生成运笔轨迹，已脱离 hanzi-writer CDN）；宋体=整字显现；古文字=受限字库整字显现。

## 二、完整文档体系（13 份）

| 编号 | 文档 | 版本 | 状态 |
|---|---|---|---|
| IM-PROJ-001 | 项目立项书 | v1.2 | ✅ 已批准 |
| IM-SRS-001 | 需求规格说明书 | v1.1 | ✅ 已批准 |
| IM-PRD-001 | 产品需求文档 | v1.1 | ✅ 已批准 |
| IM-TECH-001 | 技术方案文档 | v1.1 | ✅ 已批准 |
| IM-ARCH-001 | 系统架构设计 | v1.1 | ✅ 已批准 |
| IM-DB-001 | 数据库设计 | v1.1 | ✅ 已批准 |
| IM-API-001 | API 接口设计 | v1.1 | ✅ 已批准 |
| IM-UI-001 | UI/UX 设计规范 | v1.0 | ✅ 已批准 |
| IM-BASELINE-001 | 可执行基线修正版 | — | ✅ 已生成 |
| **IM-PLAN-001** | **项目计划与排期** | v1.0 | ✅ 本次生成，待批准 |
| **IM-RISK-001** | **风险管理计划** | v1.0 | ✅ 本次生成，待批准 |
| **IM-TEST-001** | **测试计划** | v1.0 | ✅ 本次生成，待批准 |
| **IM-OPS-001** | **部署与运维文档** | v1.0 | ✅ 本次生成，待批准 |

## 三、规划要点（关键决策）

### 3.1 MVP 最小可发布集
- 字体：楷体（精确）+ 宋体（整字）
- 载体：宣纸卷轴、竹简
- 导出：**WebM（MediaRecorder）保底先行；MP4（WebCodecs H.264）增强**（详见 §3.3 风险）
- 页面：首页、编辑器（三栏）、我的项目、设置
- 隐私：零上传；Arphic PL 可见署名
- 主题/语言：仅浅色、仅中文

### 3.2 阶段与节点（27 节点，IM-PLAN-001 §5）
- 阶段 0 环境（4）：N0.1~N0.4（含 N0.4 资产与 CDN 流水线）
- 阶段 1 基础设施（4）：N1.1~N1.4（含 N1.4 许可合规基线）
- 阶段 2 核心引擎（6）：N2.1~N2.6（N2.3 古文字标 [V1.0，阻塞：字体资产]）
- 阶段 3 UI 集成（5）：N3.1~N3.5
- 阶段 4 测试优化（4）：N4.1~N4.4
- 阶段 5 上线（3）：N5.1~N5.3
- 贯穿：RK-0 风险登记与周度复盘
- **MVP 工期估算 ≈ 37 人周 / 18–22 周（1.5–2 人团队）**

### 3.3 关键风险（IM-RISK-001）
- **R-01（高）** 开源小篆未发布 → 古文字路径阻塞，推 V2.0 备选
- **R-03（高）** 骨架化质量 R&D 风险 → 阶段 2 前置 Spike
- **R-09/R-10（中高）** Hanzi Writer 覆盖率/体积；Safari WebM 弱支持
- **R-06（中）** 许可署名 → 致谢页 + 发布检查单 C2/O5
- 导出决策矩阵：WebCodecs H.264 MP4（Chromium/Safari 26+ 首选）→ MediaRecorder（Chromium→WebM；Safari→MP4；Firefox→WebM）

### 3.4 质量门禁（M1 引擎 Demo + M3 发布）
- M1：端到端跑通"一首诗→排版→笔画→载体→导出"
- M3/MVP：零上传隐私、Arphic PL 署名、导出降级矩阵、5000 字拦截、三路径一致、无障碍 AA、性能预算（IM-PLAN-001 §9、IM-TEST-001 §7）

## 四、后续执行约定
- 待用户批准 IM-PLAN-001 后，自 N0.1 起逐节点落地，保证 MVP 完整交付。
- 每个开发节点落地时，遵循对应已批准文档的接口/约束（API/DB/UI）。
- 风险跟踪由 RK-0 贯穿；高风险（R-01/R-03）触发调范围机制。

## 五、V1.0 阶段规划（2026-10-13 启动）

> MVP 五个检查点（C1–C5，27 节点）已全部交付并验收通过。用户指示"进入下一阶段规划，与 MVP 基本一致的方式向前推进"，故启动 V1.0 规划，方式与 MVP 一致：**先出规划文档体系 → 用户批准 → 逐检查点落地（每点一个 zip）**。

### 5.1 V1.0 规划文档体系（4 份）

| 编号 | 文档 | 版本 | 状态 |
|---|---|---|---|
| **IM-GLYPH-001** | 古文字可行性重评估 | v1.0 | ✅ 已批准 |
| **IM-PLAN-V1-001** | V1.0 项目计划与排期（核心） | v1.0 | ✅ 已批准 |
| **IM-RISK-V1-001** | V1.0 风险管理计划 | v1.0 | ✅ 已批准 |
| **IM-TEST-V1-001** | V1.0 测试计划 | v1.0 | ✅ 已批准 |

### 5.2 决定性前提变化（V1.0 规划的核心输入）

| 原判断（MVP 期） | 新事实（2026-10 核验） | 影响 |
|---|---|---|
| 古文字路径阻塞于字体资产（R-01 高） | **Unicode 18.0（2026-09-16）发布小篆区块 U+3D000–U+3FC3F（11,328 码位）** | 篆字可按码位直接寻址 |
| 需自研骨架化模拟（R-03 高 R&D 风险） | **霞鹜篆书 LXGW Seal 已以 OFL 1.1 开源**（165 字，含今字映射） | 骨架化退出主路径 |
| —— | 备选字源：敬峰中山王篆（OFL，~2832 字）、全字库说文解字（开放授权，6721 字） | 可分层扩展覆盖率 |

> **决策 D-V1-01：** 古文字路径从"骨架化模拟"**转为"受限字库 + 真实字形映射"**。与 IM-BASELINE-001 §1 修正项 1 方向一致。**R-01 关闭；R-03 降级为低（冻结）**。

### 5.3 V1.0 范围与节点（5 检查点 / 20 节点，约 27 人周）

- **V1-C1 古文字字库与受限字符集（4 节点）**：N1.1 篆字加载管线 / N1.2 今字↔篆字映射 / N1.3 受限字集 UI / N1.4 笔画路径适配
- **V1-C2 主题、多语言与内容页（5 节点）**：N2.1 深色主题 / N2.2 i18n 骨架 / N2.3 模板库页 / N2.4 帮助页 / N2.5 设置页扩展
- **V1-C3 字体上传与画布规格（4 节点）**：N3.1 字体上传 / N3.2 字体管理 / N3.3 4K 导出 / N3.4 导出增强（队列）
- **V1-C4 测试与优化（4 节点）**：N4.1 单测集成补全 / N4.2 E2E 扩展 / N4.3 性能优化 / N4.4 无障碍深化
- **V1-C5 上线（3 节点）**：N5.1 部署更新（`inkmotion-assets-v2`）/ N5.2 许可合规扩展 / N5.3 V1.0 发布

### 5.4 V1.0 质量门禁

发布检查单 **V1-C1~C10**（详见 IM-PLAN-V1-001 §7 / IM-TEST-V1-001 §8）：零上传隐私（含字体上传）、篆书 OFL 署名、越界跳过、映射正确率（≥98%）、深色对比度 AA、i18n 无硬编码残留、字体上传生命周期、4K 导出降级、三路径一致、性能预算。

### 5.5 V1.0 落地进度

| 检查点 | 覆盖节点 | 状态 | 交付 zip |
|---|---|---|---|
| **V1-C1 古文字字库与受限字符集** | N1.1–N1.4 | ✅ 完成（已验证通过） | `InkMotion-V1-C1-古文字字库与受限字符集-20261013.zip` |
| **V1-C2 主题、多语言与内容页** | N2.1–N2.5 | ✅ 完成（已验证通过） | `InkMotion-V1-C2-主题多语言与内容页-20261013.zip` |
| **V1-C3 字体上传与画布规格** | N3.1–N3.4 | ✅ 完成（已验证通过） | `InkMotion-V1-C3-字体上传与画布规格-20261013.zip` |
| **V1-C4 测试与优化** | N4.1–N4.4 | ✅ 完成（已验证通过） | `InkMotion-V1-C4-测试与优化-20261013.zip` |
| **V1-C5 上线** | N5.1–N5.3 | ✅ 完成（已验证通过） | `InkMotion-V1-C5-上线-20261014.zip` |

> **V1-C1 验证数据**：单测 59/59、V1-C1 专项 E2E 8/8、MVP 回归 E2E 22/22、发布检查单 17/17；构建 gzip 115.19KB（< 150KB 预算）；小篆子集字体 42KB（静态资源）。详见 `InkMotion-执行日志.md`。
>
> **V1-C4 验证数据**：单测 104/104（IM-TEST-V1-001 目标 103，达标）；统一 E2E 套件 6/6、94/94；axe 明/暗双主题审计零 critical/serious 违规（15/15）；构建主包 gzip 119.16KB + 英文包按需 chunk（gzip 1.64KB）。本点修复 4 类真实无障碍缺陷（含 1 项 critical），并落地长文分块预加载与 i18n 按需加载。
>
> **V1-C5 验证数据（V1.0 正式发布）**：单测 **126/126**；统一 E2E 套件 **7/7、118/118**（新增 V1-C5 19 项）；发布检查单 **22/22**；axe 明/暗双主题**零违规** 15/15；lint **0 error**；构建主包 **362.81KB / gzip 120.62KB** + 英文包 chunk（gzip 2.03KB）。**版本号 1.0.0（stable）**。

### 5.5.1 V1-C5 上线要点（2026-10-14）

| 节点 | 交付 |
|---|---|
| **N5.1 部署更新** | 资产命名空间与缓存名升至 `inkmotion-assets-v2`；资产清单登记小篆 4 项；**修复同源部署 URL 误拼缺陷**（原 `/inkmotion-assets-v1/...` 404）；新增历史缓存自动清理；`_headers`/`vercel.json`/`netlify.toml` 缓存与安全头；`IM-OPS-001` 升 v1.1 |
| **N5.2 许可合规扩展** | `src/lib/licenses.ts` 许可登记单一真源；关于页新增「随包许可文本 / 第三方许可与致谢 / 开源组件」；仓库新增 `NOTICE` 与 `THIRD-PARTY-NOTICES.md`；OFL.txt 同源查阅入口；i18n zh/en 各 +10 词条；帮助页落地 4K 兼容性结论 |
| **N5.3 V1.0 发布** | 版本真源 1.0.0（package.json / About / telemetry 统一）；CI 增单测与随包许可校验门禁；修复 4 项 lint 阻断；全量回归全绿 |

### 5.5 V1.0 主要风险（IM-RISK-V1-001）

| 等级 | 风险 |
|---|---|
| 高 | **VR-02 字库可持续性**（霞鹜篆书已声明停止维护） |
| 中-高 | R-06 许可署名（字源增至 3+）、R-10 导出兼容（4K/队列复杂度上升） |
| 中 | VR-01 覆盖率、VR-03 子集化体积、VR-04 字体上传安全、VR-05 i18n 回归、VR-06 4K 内存、VR-07 队列一致性、VR-08 深色对比度、VR-09 英文文案 |
| 已关闭 | R-01（字源依赖已满足） |
| 已降级/冻结 | R-03（骨架化退出主路径） |

### 5.6 V1.0 待确认事项（IM-PLAN-V1-001 §8）

| 编号 | 事项 |
|---|---|
| TBD-V1-01 | 篆书字源选型（建议方案 B：霞鹜 + 敬峰；全字库作 L2 可选加载） |
| TBD-V1-02 | 古文字是否需要"轮廓描边动画"（影响 N1.4 工期） |
| TBD-V1-03 | 隶书路径是否纳入 V1.0（V1.0 按"不纳入"发布，推 V1.1） |
| ~~TBD-V1-04~~ | 4K 导出目标浏览器 → **已决策（V1-C5）**：以 Chromium 桌面版为准；Safari→MP4、Firefox→WebM 保底；帮助页注明 1080×1920 降级建议 |
| TBD-V1-05 | 英文 i18n 是否需要翻译审校流程（V1.0 按"骨架占位、未审校"发布） |

> **V1.0 发布结论**：5 个检查点（20 节点）全部交付并通过验收，**版本号 1.0.0（stable）**，发布检查单 V1-C1~C10 与运维 O1–O9 全绿。**2026-10-14 用户验收通过，V1.0 正式结项**。

---

## 六、备份

### 6.1 MVP 规划
- 打包文件：`InkMotion-规划文档-20261013.zip`（含 IM-BASELINE-001 + 4 份规划文档）。

### 6.2 MVP 交付（C1–C5）
- `InkMotion-C1-工程地基与基础设施-20261013.zip`（131K）
- `InkMotion-C2-核心引擎-20261013.zip`（283K）
- `InkMotion-C3-MVP-UI集成-20261013.zip`（573K）
- `InkMotion-C4-测试与优化-20261013.zip`（1.2M）
- `InkMotion-C5-上线-20261013.zip`（2.4M）

### 6.3 V1.0 规划
- 打包文件：`InkMotion-V1.0规划文档-20261013.zip`（含 IM-GLYPH-001 + IM-PLAN-V1-001 + IM-RISK-V1-001 + IM-TEST-V1-001）。

### 6.4 V1.0 交付（C1–C5，全部验收通过）
- `InkMotion-V1-C1-古文字字库与受限字符集-20261013.zip`
- `InkMotion-V1-C2-主题多语言与内容页-20261013.zip`
- `InkMotion-V1-C3-字体上传与画布规格-20261013.zip`
- `InkMotion-V1-C4-测试与优化-20261013.zip`
- `InkMotion-V1-C5-上线-20261014.zip`（V1.0 正式发布：版本号 1.0.0）

### 6.5 随包许可与合规文件
- `LICENSE`（Apache-2.0）、`NOTICE`、`THIRD-PARTY-NOTICES.md`、`public/fonts/seal/OFL.txt`（小篆字体 OFL 1.1 全文，关于页可查阅）。

---

## 七、V2.0 规划（规划中，待批准）

> V1.0 于 2026-10-14 正式结项。V2.0 将 V1.0 全部遗留项（TBD-V1-01~05、VR-02、VR-06/VR-10）统一处理，沿用"先规划 → 批准 → 逐检查点交付 zip"方式推进。

### 7.1 V2.0 规划文档体系（2026-10-14，已批准执行）
- `docs/IM-GLYPH-V2-001-古文字能力深化可行性重评估.md`：多字源分层（L0 霞鹜 + L1 敬峰 + L2 全字库）、隶书、描边动画可行性
- `docs/IM-PLAN-V2-001-V2.0项目计划与排期.md`：范围、里程碑、5 检查点 / 18 节点、发布检查单 V2-C1~C10、待确认 TBD-V2-01~05
- `docs/IM-RISK-V2-001-V2.0风险管理计划.md`：承接 V1.0 风险状态，新增 VR2-01~06
- `docs/IM-TEST-V2-001-V2.0测试计划.md`：TC-V2-* 用例族、发布检查单验证方法

> **用户决策（2026-10-14 批准执行）：** ① **L2 全字库（6721 字）纳入 V2.0**（TBD-V2-01 关闭）；② **合规政策 D-V2-02**：V2.0 不再以资源合规为功能阻塞，对评估范围内字源一律采用，需授权字体统一登记「字体授权待办登记册」后续联系获取授权（TBD-V2-02 关闭、VR2-02 降级为已接受·低）。其余 TBD-V2-03~05 无异议。
>
> **用户决策（V2-C2 验收，2026-10-14）：** **D-V2-03 字体选型政策** —— 字体一律优先采用**开源社区的优秀项目**（OFL 等宽许可），"先抛开商用、以用起来为第一原则"；商用授权获取纳入「字体授权待办登记册」后置处理。V2-C1/V2-C2/V2-C3 及后续检查点字体选型均按此执行。

### 7.2 V2.0 检查点概览
| 检查点 | 覆盖节点 | 状态 |
|---|---|---|
| **V2-C1 篆书字源分层扩展** | N1.1–N1.5 | ✅ 完成（已验证通过） | `InkMotion-V2-C1-篆书字源分层扩展-20261014.zip` |
| **V2-C2 隶书路径与描边动画** | N2.1–N2.4 | ✅ 完成（待用户验收） | `InkMotion-V2-C2-隶书路径与描边动画-20261014.zip` |
| **V2-C3 国际化深化** | N3.1–N3.3 | ✅ 完成（已验证通过） | `InkMotion-V2-C3-国际化深化-20261014.zip` |
| **V2-C4 字体库扩展与上传闭环** | N4.1–N4.4 | ✅ 完成（已验证通过） | `InkMotion-V2-C4-字体库扩展与上传闭环-20261014.zip` |
| **V2-C5 核心功能与界面重构** | N5.1–N5.4 | ✅ 完成（待用户验收） | `InkMotion-V2-C5-核心功能与界面重构-20261014.zip` |

### 7.3 V2.0 待确认事项（TBD-V2-01~05）
- ~~TBD-V2-01~~：L2 全字库纳入 V2.0 → **已决策：纳入**（2026-10-14）
- ~~TBD-V2-02~~：隶书字源合规确认 → **已决策（D-V2-02）：一律采用 + 授权待办登记**（2026-10-14）
- ~~TBD-V2-03~~：描边动画默认开关与性能预算 → **已决策（V2-C2）：默认 false、仅 seal/li、关闭零解析、自研解析 +~2.75KB gzip**（2026-10-14）
- TBD-V2-04：敬峰/全字库子集化体积与缓存容量
- ~~TBD-V2-05~~：英文审校执行方式 → **已决策（V2-C3）：母语级人工审校 + 脚本辅助门禁**（`check:i18n` 三重静态校验入 CI，审校记录见 `docs/IM-I18N-V2-001`）（2026-10-14）

> 用户已批准 V2 规划（2026-10-14），按"逐检查点交付 zip"方式落地；首个落地检查点为 **V2-C1 篆书字源分层扩展**。
>
> **范围调整（2026-10-14，用户反馈后）：** 用户对 V2-C3 评价"勉强通过，核心功能毫无进展"，直接指出 **"字体上传却无任何作用"**，要求 ① 字体库扩展、② 核心功能与界面重新核实优化。据此调整 V2 后半程范围：
> - **V2-C4** 由原"导出兼容深化"**改为"字体库扩展与上传闭环"**（N4.1 上传闭环修复 / N4.2 内置开源字库 / N4.3 隶书如实处理 / N4.4 字体管理器升级）；
> - **V2-C5** 由原"测试与 V2.0 发布"**改为"核心功能与界面重构"**（N5.1 编辑器中栏重排与预览等比缩放 / N5.2 参数面板手风琴折叠 / N5.3「声称 vs 实测」核心功能自查表 / N5.4 响应式与状态统一）；
> - 原"导出兼容深化"与"V2.0 发布"顺延至 C5 之后。
> - **交付节奏（用户决策）**：C4 与 C5 **分两次交付**，每步单独验收。

---

## 八、V2.0 落地阶段（2026-10-14 起，逐检查点）

> V2.0 落地明细（逐检查点）统一记入 `InkMotion-执行日志.md`（文末）。每点全量回归（单测 / E2E / lint / tsc / build）全绿后打包 zip 交付，用户回复"通过"进入下一点。

### 8.1 V2-C1 篆书字源分层扩展（2026-10-14 — ✅ 已完成，待用户验收）

**节点 N1.1–N1.5 全交付**，核心产出：

- **N1.1 分层架构**：`src/lib/seal.ts` 重构为 L0 霞鹜（保底，OFL）/ L1 敬峰（主力，OFL）/ L2 全字库（OpenGov-TW）三层，均映射 Unicode 18.0 小篆码位 U+3D000+；采用"动态字体回退栈"（L1→L0→L2 组成 ctx.font 字体族，浏览器自动选首个含该字形码位的字源），零侵入实现优先级回退。
- **N1.2 合并映射与覆盖率**：`loadSealRegistry()`（优先级去重合并索引）、`mergedSealCharset()`（向后兼容）、`estimateSealCoverage()`（GV-V2-04）；`useSeal.ts` 新增 `useSealCoverage` / `useSealOutOfRange`（基于合并注册表）。
- **N1.3 集成脚手架与授权登记**：L1/L2 资产按 D-V2-02 登记于 `assets.ts` 资产清单（`precache:false`，缺失静默跳过）；新建 `PENDING-LICENSES.md` 授权待办登记册；`licenses.ts` 新增 `pendingAuthorization` 字段与 `pendingAuthorizationEntries()`。
- **N1.4 层级 UI 与覆盖率显示**：`Settings.tsx` 新增"篆书字源层级"三态开关（L0/L0L1/all，持久化 IndexedDB）；`Editor.tsx` 篆书提示区显示覆盖率百分比；`About.tsx` 新增"授权待办登记册"卡片。
- **N1.5 资产命名空间升 v3**：`assets.ts` 命名空间/缓存名升 `inkmotion-assets-v3`，`LEGACY_ASSET_CACHE_NAMES` 纳入 v2；启动自动清理旧缓存。

**验证（全绿）**：单测 **136/136 通过**（新增 `seal-v2.test.ts` 10 项、`v1c5.test.ts` 同步 v3 语义）；E2E **V2-C1 13/13 + V1-C1 8/8 + MVP 22/22**；lint 0 error；`tsc --noEmit` 通过；构建成功（主包 368.86KB / gzip 122.30KB + 英文包独立 chunk）。

**交付 zip**：`InkMotion-V2-C1-篆书字源分层扩展-20261014.zip`

### 8.2 V2-C2 隶书路径与古文字描边动画（2026-10-14 — ✅ 已完成，待用户验收）

**节点 N2.1–N2.4 全交付**，核心产出：

- **N2.1 Spike 与授权登记**：`docs/IM-SPIKE-V2-C2-隶书字源结论.md` 闭环 TBD-V2-02（结论=采用，承 D-V2-02）；`PENDING-LICENSES.md` / `licenses.ts` 登记隶书字源。
- **N2.2 隶书映射与渲染**：新建 `src/lib/lishu.ts`（镜像 `seal.ts` 单层机制）、`src/lib/useLi.ts`、`src/components/LiCharsetPanel.tsx`；`FontFamily`/`StrokePathKind` 并行追加 `'li'`；`stroke.ts` 抽象 `drawRestrictedGlyph` + 新增 `drawLiGlyph`；`scene.ts` 隶书 preload/绘制分支；`OptionsPanel` 读 `FONT_CATALOG` + 隶书面板 + 末尾「动画」分组；**字表/字体缺失时恒等映射 + 系统隶书族兜底，不造假不阻塞**。
- **N2.3 矢量轮廓描边动画**：新建 `src/engine/outline.ts`——**自研轻量 TrueType 解析**（`glyf/loca/cmap/head/maxp`，支持简单/复合轮廓，cmap format 4/12），**否决 opentype.js** 以守 gzip<200KB 门禁；`stroke.ts` 新增 `drawGlyphOutline`（**累计弧长截断**，规避 Canvas2D 无 lineDashOffset）；`scene.ts` 预解析缓存 + 描边分派（仅 seal/li 生效）。
- **N2.4 性能与回退**：`outlineAnimation` 默认 false；关闭/非受限路径**零解析开销**；解析失败静默降级整字填充（`console.debug` 非 error）；修复 `release-check.mjs` C9 断言 v2→v3 漂移。

**验证（全绿）**：单测 **170/170 通过（18 文件）**——V2-C2 新增 `lishu.test.ts` 10 + `stroke-li.test.ts` 5 + `outline.test.ts` 8（含真实合成 TTF fixture）+ `stroke-outline.test.ts` 6 + `outline-perf.test.ts` 5；E2E `e2e/v2c2.mjs` 13 项（接入 all.mjs）；lint 0 error；`tsc --noEmit` 通过；构建成功（首屏 gzip **126.70KB**，自研解析仅 +~2.75KB，守 200KB 门禁）。

**交付 zip**：`InkMotion-V2-C2-隶书路径与描边动画-20261014.zip`

### 8.3 V2-C6 全功能逐项自测与 Bug 清单（2026-10-14 — ✅ 已完成，待用户验收）

**方法**：4 批次共 96 项真实浏览器自测用例（audit1–audit4 + probe1–probe14 逐项核实），检出 **6 项真实缺陷**：

| 编号 | 严重度 | 缺陷 | 根因 |
|---|---|---|---|
| BUG-001 | P1 | 预览暂停失效（按钮变播放但进度继续） | PreviewCanvas 两套 rAF 并存，缓动重绘 effect 依赖不含 playing |
| BUG-002 | P1 | 编辑无自动保存，离开即丢失 | setText/setTitle 只写内存不落库，无 debounce/路由拦截 |
| BUG-003 | P1 | 默认路径即 404 泛洪 | scene.ts 预加载对每个字符请求 hanzi-writer CDN，无 CJK 过滤 |
| BUG-004 | P2 | 关于页「开源组件」说明硬编码中文 | licenses.ts 16 处 usage 中文字面量，check-i18n 未扫 src/lib |
| BUG-005 | P2 | 纯生僻字静默无输出 | 扩展 B 区字符 ink=0 且无提示 |
| BUG-006 | P3 | 5000 字渲染约 4s 无进度反馈 | 分块让出后单批仍停顿，无 loading 态 |

> 6 项初判失败经逐项复核确认为脚本误报已排除（含首页死 i18n 键、Tab 首焦点、导出对话框等）。
> 详见 `docs/InkMotion-V2-C6-自测Bug清单.md`。

### 8.4 V2-C7 书写笔顺内置与逐笔动画（2026-10-14 起，逐检查点）

> 用户批注（原话）：「不要在单一老外项目上纠结；汉字笔顺是公开确定性规范，直接内置新华字典/通用规范汉字表级数据源；**A+B+C 三层并用、以用户定制兜底才是正道**；**使用我国最权威版本**。」

**总体计划**：`docs/InkMotion-V2-C7-书写笔顺内置计划.md`（C1–C7）
**核心路线**：笔顺（顺序）内置权威规范表（A+B） + 用户定制（C）兜底；运笔轨迹由字体轮廓（outline.ts）实时生成。彻底脱离 hanzi-writer CDN。

#### 8.4.1 V2-C7 C1 笔顺数据源内置（A+B 层 · 权威版）— ✅ 已完成，待用户验收

**核心产出**：
- `scripts/build-strokeorder.mjs`：构建期从 **cnchar**（国产权威汉字库，依据《现代汉语通用字笔顺规范》GF 3002-1999 及《通用规范汉字表》）提取笔顺为静态 JSON；支持 `--check`。
- `public/strokeorder/`：**6939 字笔顺数据**，按 512 码位分 41 片，共 204KB，按需加载、不进首屏主包。
- `src/engine/strokeOrder.ts`：运行期零依赖查表接口（getStrokeOrder / preloadStrokeOrder / decodeStrokeOrder）。

**验证（全绿）**：
```
[build-strokeorder] 导出 6939 字笔顺，缺失 14053，分 41 片
[check] 抽样 6939 字 | 非法编码 0 | 期望对比不符 0 | 覆盖 6939 字
```
抽样笔顺正确：水=gesl、永=kresl、好=msjegj、中=fcjf、国=fcjjfjkj、爱=skksdejsel；运行期查表逻辑独立验证通过（汉字返回序列、字母/标点返回 null）。
> 注：缺失 14053 为 cnchar 未收录的极生僻/异体/古字部件，属 A+B+C 体系设计的 C 层/轮廓兜底范围，非缺陷。

**交付 zip**：`InkMotion-V2-C7-C1-笔顺数据源内置-20261014.zip`
**交付说明**：`docs/InkMotion-V2-C7-C1-笔顺数据内置交付说明.md`

> 待用户「通过」后进入 **C2（运行时三层查表 + 脱离 CDN，根除 BUG-003）**。

#### 8.4.2 V2-C7 C2 运行时三层查表 + 脱离 CDN（根除 BUG-003）— ✅ 已完成，待用户验收

**核心产出**（彻底脱离 hanzi-writer CDN）：
- `src/engine/stroke.ts`：删除 `HW_CDN` 与 `fetch(HW_CDN+char)`；`loadStrokeData` 改为从 C1 的本地权威表 `getStrokeOrder` 取笔顺，返回 `StrokeOrderResult{order,strokeCount,source}`；新增 `isCjkWithOrder` 守卫。
- `src/engine/scene.ts`：预加载循环加 CJK 守卫——仅对 CJK 且本地有笔顺的字查表；**标点/字母/数字/生僻字不再发起任何网络请求**（BUG-003 根因根除）；计时线改用真实笔数 `order.length`。
- `src/lib/fonts.ts`：`path: 'hanzi-writer'` → `'kai'`，删除 `HANZI_WRITER_CDN` 常量。
- `src/db/types.ts`：`FontFormat` 移除 `'hanzi-writer-data'`。
- `src/lib/licenses.ts`：移除 Hanzi Writer 运行期归因，新增 cnchar（构建期笔顺导出，MIT）归因。

**验证（全绿）**：
```
tsc --noEmit        ✅ 0 error
vitest run          ✅ 210 passed / 210（全量）
eslint（增量）       ✅ 0 warning / 0 error
vite build           ✅ 主包 gzip 131.81KB < 200KB 门禁
check:i18n           ✅ zh/en 281 键一致
真实浏览器(Playwright) ✅ 输入「永和九年，岁在癸丑。ABC 123 𰻞𰻞 test 中华人民共和国！」
                       → hanziWriterCdnRequests=[]（零 CDN 请求）
                       → failedOrErrors=[]（无 404 / 无控制台错误）
                       → 视频预览正常渲染
```
> **BUG-003 根除确认**：原每字向 `cdn.jsdelivr.net/npm/hanzi-writer-data` 发请求、标点/字母/生僻字批量 404 的根因已彻底消除；C2 阶段 kai 走整字显现降级（按真实笔数节奏分段），无静默无输出。

**技术债（移交 C3/C5）**：
1. C2 阶段 kai 为整字显现降级，逐笔运笔轨迹由 **C3** 基于 outline.ts 按笔顺切分轮廓生成（drawKaiGlyph 接口已保留）。
2. `package.json` 仍列 `hanzi-writer` 依赖（源码已零 import），**C5** 整合时统一清理。

**交付 zip**：`InkMotion-V2-C7-C2-完整工程覆盖包-20261014.zip`（完整可直接覆盖的工程快照）
**交付说明**：`docs/InkMotion-V2-C7-C2-脱离CDN接入本地权威笔顺交付说明.md`

#### 8.4.3 V2-C7 C3 轮廓兜底引擎（任意字体逐笔动画）— ✅ 已完成，待用户验收

**核心产出**（基于权威笔顺 + 本地楷体轮廓实现真实逐笔，彻底脱离 hanzi-writer 中线）：
- `scripts/build-kai-outline.py`（新增）：从完整楷体源 `fonts-src/LXGWWenKaiLite-Regular.ttf`（OFL 1.1）提取
  CJK 基本区 glyf 轮廓，输出与运行期 `OutlineGlyph` 同构的精简 JSON，按 512 码位分片存 `public/kaioutline/`（41 片 + manifest，**18430 字**）。
  紧凑数组格式 `points=[x,y,on,...]`，体积由初版 110MB 压至 **42MB**（按需分片，运行期流量极小）。
- `src/engine/outline.ts`：新增 `getKaiOutline(ch)`——仿 strokeorder 分片加载，直接构造 `OutlineGlyph`（零网络、按码位缓存）。
- `src/engine/stroke.ts`：新增 `buildStrokePaths(outline, strokeCount)`——整字轮廓展平为直线段，按**权威笔顺笔画数 N** 均匀切分为 N 段；
  重写 `drawKaiGlyph(ctx, glyph, paths, progress, color)`——第 i 笔在 `[i/N,(i+1)/N]` 内按局部进度沿轮廓描出（圆头描边 + 弧长截断）。
- `src/engine/scene.ts`：`preloadOutlines` 对 kai 路径**无条件**预加载轮廓；`drawFrame` kai 分支 → `buildStrokePaths` + `drawKaiGlyph` 真实逐笔，缺失则整字降级。

**验证（全绿）**：
```
tsc --noEmit        ✅ 0 error
vitest run          ✅ 213 passed / 213（新增 C3 单测 5 项）
eslint（增量）       ✅ 0 warning / 0 error
vite build           ✅ 主包 gzip 132.69KB < 200KB 门禁
check:i18n           ✅ zh/en 281 键一致
真实浏览器(Playwright) ✅ 编辑器输入「永和九年岁在癸丑中华人民共和国」
                       → kaiOutlineChunksLoaded=9（楷体轮廓分片实际加载，逐笔生效）
                       → externalOrCdnRequests=[]（零 CDN / 零外网请求）
                       → failedOrErrors=[]（无 404 / 无控制台错误）
```

**技术取舍（诚实标注）**：采用「轮廓等弧长分段 + 笔顺驱动揭示」而非像素级标准笔形还原——
真正支持任意 TTF/OTF 字体逐笔动画（兑现用户「任一字体都能逐笔动画」诉求）；
段边界按弧长均匀，未必恰好落在真实笔形交界处（视觉连贯、节奏正确，非标准笔形分割）。

**交付说明**：`docs/InkMotion-V2-C7-C3-轮廓兜底引擎交付说明.md`

#### 8.4.4 V2-C7 C4 用户定制兜底层（C 层）— ✅ 已完成，待用户验收

**核心产出**（落地「A+B+C 三层，以用户定制兜底」）：
- `src/db/types.ts`：新增 `CustomStrokeRecord { id; char; order?; outline?: CustomOutline; note?; createdAt; updatedAt }`
  与 `CustomOutline { contours; unitsPerEm; xMin; yMin; xMax; yMax }`。
- `src/db/database.ts`：Dexie `version(2).stores({ customstrokes: 'id, char, updatedAt' })` 增量升级（不破坏既有表）；
  新增 `putCustomStroke`（id=char，一字一条覆盖，非法抛错）、`getCustomStroke`、`listCustomStrokes`、
  `deleteCustomStroke`、`exportCustomStrokes`、`importCustomStrokes`（逐条校验，非法跳过返回 `{imported, skipped}`）。
- `src/engine/customStroke.ts`（新增）：C 层引擎读取封装——`setCustomStrokeLoader` / `ensureLoaded` /
  `invalidateCustomStrokes` / `primeCustomStrokes` / `getCustomStrokeOrder` / `getCustomOutline` / `__resetCustomStrokes`；
  无 loader / 无 IndexedDB 时安全降级（返回 null，不抛错）。
- `src/engine/stroke.ts`：`loadStrokeData` 优先级改为 **C（用户定制）> A+B（权威内置表）**，命中定制时 `source:'user'`；
  新增 `invalidateStrokeDataCache()`。
- `src/engine/outline.ts`：`getKaiOutline(ch)` 前先探 `getCustomOutline(ch)`（C 层自定义轮廓优先于内置楷体轮廓）；
  新增 `invalidateKaiOutlineCache()`。
- `src/components/CustomStrokeManager.tsx`（新增）：录入字符 + 笔顺编码 + 备注 → 保存；26 字母编码实时解码笔画名；
  列表 / 删除；导出 / 导入 JSON；保存后联动 `invalidateCustomStrokes` + `invalidateStrokeDataCache` + `invalidateKaiOutlineCache`。
- `src/pages/Settings.tsx`：字体卡片后新增「用户定制笔顺（C 层）」卡片；`src/main.tsx` bootstrap 注入 loader。
- `src/lib/i18n.zh.ts` / `i18n.en.ts`：新增 `custom.*` 19 键（zh/en 共 **300 键**对齐）。

**三层查表最终形态**：
```
C  用户定制（IndexedDB，最高优先级）   ← C4 本层
B  新华字典级增强（并入权威内置表）      ← C1
A  《通用规范汉字表》(GF 3002-1999)     ← C1
── 以上均无 ──
C3 字体轮廓兜底（按笔顺切分轮廓逐笔）    ← C3
整字显现降级（标点/字母/无轮廓）        ← 兜底
```

**验证（全绿）**：
```
tsc --noEmit        ✅ 0 error
vitest run          ✅ 229 passed / 229（新增数据层 9 + C 层优先级 3 + 组件 4）
eslint（增量）       ✅ 0 warning / 0 error
vite build           ✅ 主包 gzip 134.79KB < 200KB 门禁
check:i18n           ✅ zh/en 300 键一致
真实浏览器(Playwright) ✅ 设置页「用户定制笔顺（C 层）」卡片渲染
                       → 录入「永=sl」成功入列表（listItems=1）
                       → failedOrErrors=[]（无 404 / 无控制台错误）
```

**交付 zip**：`InkMotion-V2-C7-C4-完整工程覆盖包-20261014.zip`（完整可直接覆盖的工程快照）
**交付说明**：`docs/InkMotion-V2-C7-C4-用户定制兜底层交付说明.md`

#### 8.4.5 V2-C7 C5 书写引擎统一与观感 — ✅ 已完成，待用户验收

**核心产出**（五路径统一书写基元 + 观感参数化 + 清理 hanzi-writer）：
- `src/engine/draw.ts`（新增）：全工程唯一的「设计坐标 → 画布方块」变换 `applyGlyphTransform`
  与观感参数体系 `InkStyle { taper 笔锋, inkFlow 墨迹浓淡, speedCurve 速度曲线, widthRatio, round }`；
  书写感时间重映射 `easeSinceWrite`（起笔迟滞→行笔加速→收笔略顿，端点严格 0/1）；
  线宽/透明度曲线 `strokeWidthAt` / `alphaAt`；三套缺省观感（逐笔/整字/轮廓描边）。
- `src/engine/stroke.ts`：`drawKaiGlyph` 接入笔锋/浓淡/速度曲线（去「铁丝描红」）；
  `StrokePaths` 新增 `box`（消除 drawKaiGlyph 与 drawGlyphOutline 包围盒口径不一致，删 `currentOutlineBox`）；
  合并重复的 `drawSongGlyph`/`drawRestrictedGlyph` → `drawWholeGlyph`，整字淡入升级为「墨渗渐显」；
  旧函数保留薄包装（签名不变向后兼容）。
- `src/engine/scene.ts`：**计时线统一**——song/brush/自定义字体不再恒为 220ms，
  全路径按 `max(220, 笔画数×110)/speed`（无笔顺数据用 8 画估算），同文本切字体时长不跳变；
  `path` 提升为构造期字段，修复 brush/自定义字体在 `preloadOutlines` 的误判。
- **残留清理**：`package.json`/`package-lock.json` 移除 `hanzi-writer`（源码 C2 起已零 import）；
  `types.ts` 删除 `HanziStrokeData`（零引用遗留结构）；`THIRD-PARTY-NOTICES.md` 将
  Hanzi Writer 移出运行期组件表、新增「构建期数据来源」表（cnchar / fonttools）。

**验证（全绿）**：
```
tsc --noEmit        ✅ 0 error
vitest run          ✅ 253 passed / 253（新增 C5 观感/变换/竖排/计时 24 项）
eslint（增量）       ✅ 0 warning / 0 error
vite build           ✅ 主包 gzip 135.30KB < 200KB 门禁
check:i18n           ✅ zh/en 300 键一致
真实浏览器(Playwright) ✅ 五字体（kai/song/brush/seal/li）切换截图（docs/c5-shots/）
                       → kai 逐笔多帧差异非零（diffs=4,2,2，逐笔推进而非整字闪现）
                       → 零外网请求 / 零 404 / 零页面异常 / 零控制台错误
```

**诚实取舍**：笔锋为参数化近似（线宽两端收细），非毛笔物理仿真；整字显现路径
（song/brush/自定义字体）仍无逐笔（无本地轮廓数据），本轮统一的是观感与计时口径；
墨迹浓淡为透明度调制，不做渗墨扩散（属 C6 载体材质范畴）。

**交付 zip**：`InkMotion-V2-C7-C5-完整工程覆盖包-20261014.zip`（完整可直接覆盖的工程快照）
**交付说明**：`docs/InkMotion-V2-C7-C5-书写引擎统一与观感交付说明.md`

#### 8.4.6 V2-C7 C6 载体体系重构（实体中国传统形制）— ✅ 已完成，待用户验收

**核心产出**（10 种真实形制 + 多层程序化材质 + 观感参数）：
- `src/engine/carrier/` 目录化（删除单文件 `carrier.ts`）：
  `index.ts`（注册表 10 插件 / CARRIER_ORDER / renderCarrier）、`types.ts`（CarrierParams/CarrierPlugin/resolveParams）、
  `noise.ts`（确定性噪声 fbm/mulberry32/applyWarmth/shade/rgba）、`material.ts`（纤维/帘纹/颗粒/边缘污渍/暗角/投影/钤印基元）、
  `plugins/{paperFamily,solidFamily,mountFamily}.ts`。
- **十种载体**：宣纸卷轴 / 立轴 / 手卷 / 绢帛 / 信笺(朱丝栏) / 洒金笺(金箔) / 竹简(竹节编绳) /
  木牍(年轮裂纹) / 碑拓(石面斑驳) / 团扇(扇骨玉坠)。全部程序化合成，零位图资产、零外网。
- **观感参数**（`ProjectOptions` 扩展）：色温 warmth / 做旧 aging / 装裱边 mountRatio（按载体显隐）/ 钤印位 sealPos / seed。
- **UI/i18n**：载体下拉改 `CARRIER_ORDER`（10 项）+ 4 参数控件；zh/en **317 键**对齐。
- **缺陷修复**：`PreviewCanvas.tsx` 与 `lib/sceneFactory.ts` 漏传 4 载体参数（UI 调节无效、导出与预览不同源）→ 补传 + 回归守卫。

**验证（全绿）**：
```
tsc --noEmit        ✅ 0 error
vitest run          ✅ 280 passed / 280（新增 carrier 专项 26 + 透传回归 1）
eslint              ✅ 0 warning / 0 error
vite build           ✅ 主包 gzip 141.23KB < 200KB 门禁
check:i18n           ✅ zh/en 317 键一致
真实浏览器(Playwright) ✅ 10 载体逐一切换截图（docs/c6-shots/）
                       → 下拉含全部 10 载体；各载体画面互不相同（9/9 对不同）
                       → 色温 diff=63048 / 做旧 diff=189（参数生效）
                       → 零外网 / 零 404 / 零页面异常 / 零控制台错误
```

**诚实取舍**：程序化材质为风格化近似（非实物扫描）；预览缩放下笔画极细（与 C5 同样的既有表现，属 C7 观察项）。

**交付 zip**：`InkMotion-V2-C7-C6-完整工程覆盖包-20261014.zip`（完整可直接覆盖的工程快照）
**交付说明**：`docs/InkMotion-V2-C7-C6-载体体系重构交付说明.md`

#### 8.4.7 V2-C7 C7 整合回归 + 发布检查单（含 V2-C6 遗留缺陷修复）— ✅ 已完成，待用户验收

**核心产出（缺陷清零 + 首次完整 E2E 套件跑通）**：
- **BUG-001 预览暂停失效**：`PreviewCanvas` 删除与播放循环并存的第二条 rAF「缓动重绘」链（不看 `playing`），
  唯一动画驱动源收敛到播放循环。实测暂停后 `26% → 26% → 26%`。
- **BUG-002 编辑无自动保存**：editor store 三个 mutator 内置 **800ms debounce 自动落库** + `flush()`；
  Editor 在卸载/路由离开/pagehide 三处兜底。实测不点保存 600ms 内 IndexedDB 已含新正文。
- **BUG-003**（C2 根除，本轮复核）：本地权威笔顺表 + 码位守卫，`src/` 零 CDN 引用，真实混排文本零 404。
- **BUG-004 关于页硬编码中文**：`licenses.ts` `usage` → `key`/`usageKey` 走 i18n（新增 15 条 `license.*.usage`）；
  `check-i18n` 扫描纳入 `src/lib` + licenses 专项校验；顺带清除 `fonts.ts` 中从未渲染的中文死字段。
- **BUG-005 生僻字静默无输出**：新增 `useFontCoverage`（读字体分片码位区间），编辑器给出「当前字体不支持以下字符」提示。
- **BUG-006 长文无进度反馈**：`Scene.onProgress(loaded,total)` 分块上报 + 预览「正在准备… N%」覆盖层（`aria-live`）。
- **首次跑通完整 E2E 套件**：修复 **10 处测试自身失效/过时**（受控控件直写绕过 React、索引漂移、
  Hanzi Writer 残留断言、示例字「永」误判、6→7 分组硬断言、5000 字场景等待过窄）。

**验证（全绿）**：
```
tsc --noEmit            ✅ 0 error
vitest run              ✅ 297 passed / 297（新增 C7 缺陷回归 17 项）
eslint                  ✅ 0 warning / 0 error
vite build              ✅ 主包 gzip 142.00KB < 200KB
check:i18n              ✅ zh/en 335 键一致
真实浏览器(Playwright)   ✅ e2e/all.mjs：15/15 套件 · 185/185 用例
                          （发布检查单 41/41、C7 缺陷回归 7/7、无障碍 15/15）
```

**诚实取舍**：BUG-006 是「准备」进度非渲染进度；BUG-005 覆盖判定为保守下界；
**5000 字场景主线程阻塞约 3.6s**（数据不丢、状态翻转滞后），彻底优化需排版移出主线程，建议列后续专项。

**交付 zip**：`InkMotion-V2-C7-C7-完整工程覆盖包-20261014.zip`（完整可直接覆盖的工程快照）
**交付说明**：`docs/InkMotion-V2-C7-C7-整合回归与发布检查单交付说明.md`

> **V2-C7 全部 7 个检查点（C1~C7）完成**——待用户「通过」后本轮 V2-C7 收官，可按发布检查单进入发布流程。
