# 墨演 InkMotion

> 纯前端古典中文风格视频生成器：竖排右起、逐笔书写动画、宣纸 / 竹简载体、自动滚动、本地生成 WebM / MP4。**文本与项目永不离开你的浏览器。**

## 技术基线（来自 IM-BASELINE-001）

- **纯前端**：无服务端、无数据库、无 HTTP API、无账号系统。所有数据存于浏览器 IndexedDB + Cache API。
- **渲染分期**：Canvas2D（MVP / V1.0）；Three.js / WebGL（V2.0）。
- **笔画三路径**：楷体 = Hanzi Writer 精确笔顺；宋体 = 整字显现；古文字 = 骨架化（V1.0，受字体资产阻塞）。
- **导出**：WebM（MediaRecorder）保底先行；MP4（WebCodecs H.264）增强，可用时自动启用。
- **许可**：Arphic PL 须可见署名；开源小篆 OFL（待发布）。

## 本地运行

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器 (http://localhost:5173)
npm run build    # 类型检查 + 生产构建到 dist/
npm run preview  # 本地预览构建产物
npm test         # 运行单元测试
```

## 目录结构

```
src/
  styles/     设计 Token 与全局样式 (N1.1)
  components/ 基础组件库 (N1.2)
  db/         Dexie 存储层 (N1.3)
  store/      Zustand 状态层 (N3.2 预备)
  pages/      首页 / 编辑器 / 我的项目 / 设置 / 关于
  lib/        字体加载、资产清单、导出等工具
  engine/     核心引擎（C2 检查点落地）
docs/         13 份规划与设计文档
public/       静态资产（字体 / 纹理占位）
```

## 检查点进度

| 检查点 | 节点 | 状态 |
|---|---|---|
| C1 工程地基与基础设施 | N0.1–N0.4、N1.1–N1.4 | ✅ 当前 |
| C2 核心引擎 Demo（M1） | N2.1–N2.6 | ⏳ 待启动 |
| C3 MVP UI 集成（M2） | N3.1–N3.5 | ⏳ |
| C4 测试与优化（M3） | N4.1–N4.4 | ⏳ |
| C5 上线（M4） | N5.1–N5.3 | ⏳ |

## 规划文档

完整 13 份规划文档见 `docs/`，索引见 `docs/InkMotion-规划索引.md`。
