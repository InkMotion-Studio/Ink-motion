# 墨演 InkMotion

> 纯前端古典中文风格视频生成器：竖排右起、逐笔书写动画、宣纸 / 竹简载体、自动滚动、本地生成 WebM / MP4。**文本与项目永不离开你的浏览器。**
>
> **当前版本：1.0.0（stable，2026-10-14 发布）** — MVP 与 V1.0 共 10 个检查点全部交付并通过验收。

## 技术基线（来自 IM-BASELINE-001，V1.0 更新）

- **纯前端**：无服务端、无数据库、无 HTTP API、无账号系统。所有数据存于浏览器 IndexedDB + Cache API。
- **渲染分期**：Canvas2D（MVP / V1.0）；Three.js / WebGL（V2.0）。
- **笔画三路径**：楷体 = Hanzi Writer 精确笔顺；宋体 = 整字显现；**小篆 = 受限字库整字显现**（霞鹜篆书 LXGW Seal，165 篆字 / 238 今字映射，越界字符自动跳过并提示；不提供逐笔书写）。
- **导出**：WebM（MediaRecorder）保底；MP4（WebCodecs H.264）增强，可用时自动启用；支持进度显示与取消。**4K（2160×3840）以 Chromium 桌面版为验证目标**，内存受限设备建议改用 1080×1920。
- **许可**：应用代码 Apache-2.0；字体 Arphic PL / OFL 1.1 须可见署名，小篆 OFL.txt 随包分发。详见 `NOTICE` 与 `THIRD-PARTY-NOTICES.md`。

## 本地运行

```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器 (http://localhost:5173)
npm run build        # 类型检查 + 生产构建到 dist/
npm run preview      # 本地预览构建产物 (http://localhost:4173)
npm test             # 单元测试（126 项）
npm run test:e2e:all # 统一 E2E 套件（7 套件 / 118 用例，需先启动 dev + preview）
npm run test:release # 发布检查单（需先 preview）
```

## 目录结构

```
src/
  styles/     设计 Token 与全局样式（含深色主题）
  components/ 基础组件库
  db/         Dexie 存储层（项目 / 设置 / 字体）
  store/      Zustand 状态层
  pages/      首页 / 编辑器 / 我的项目 / 设置 / 关于 / 帮助
  lib/        字体与字体上传、资产清单（inkmotion-assets-v2）、i18n、许可登记、导出等
  engine/     核心引擎（排版 / 笔画 / 载体 / 导出）
docs/         规划与设计文档（含 IM-OPS-001 部署运维、V1C5 发布报告）
public/       静态资产（小篆字库子集 + OFL.txt、载体纹理）
e2e/          Playwright E2E 套件（run / v1c1 / v1c2 / v1c3 / v1c5 / release-check / a11y）
```

## 检查点进度

| 阶段 | 检查点 | 状态 |
|---|---|---|
| MVP | C1 工程地基与基础设施 → C5 上线 | ✅ 全部完成并通过验收 |
| V1.0 | V1-C1 古文字字库与受限字符集 | ✅ 完成（已验证通过） |
| V1.0 | V1-C2 主题、多语言与内容页 | ✅ 完成（已验证通过） |
| V1.0 | V1-C3 字体上传与画布规格 | ✅ 完成（已验证通过） |
| V1.0 | V1-C4 测试与优化 | ✅ 完成（已验证通过） |
| V1.0 | V1-C5 上线（部署 / 许可 / 发布） | ✅ 完成（V1.0 正式发布） |

## 质量门禁（V1.0 发布时实测）

单测 126/126 · 统一 E2E 7/7 套件、118/118 用例 · 发布检查单 22/22 · axe 明/暗双主题无障碍零违规 15/15 · ESLint 0 error · 主包 gzip 120.62KB。

## 规划文档

完整规划文档见 `docs/`，索引见 `docs/InkMotion-规划索引.md`；逐检查点实施记录见 `InkMotion-执行日志.md`。
