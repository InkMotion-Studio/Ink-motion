# InkMotion V2.0 重建说明（以 main 为基线，回收 dev 增量，彻底替换 dev）

> 背景：经逐文件核对 `main`（V1.0.0，已发布）与 `dev`（V2 工作分支），结论为——**`main` 才是正确基线**：
> `main` 的楷体引擎是**真·逐笔**（消费 hanzi-writer 的 `medians` 中线，笔顺正确、矢量→4K 免费、跨浏览器免费）；
> `dev` 把这条正确实现换成了"整字轮廓按笔数等分 N 桶"的**弧长近似**（相对 main 的回退）。
> `dev` 唯一有价值的两点增量是：① 离线化（消除 main 每字拉 jsdelivr 的隐私缺口）、② 笔锋动态观感层（`draw.ts`）。
> 因此 V2.0 应为：**main 引擎 + 回收 dev 的离线化与笔锋 + 丢弃 dev 的 stroke 核心**。

## 本次实际改动（7 个文件）

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/engine/stroke.ts` | 改 | ① 笔画数据加载改为同源 `/hanzi-data/{ch}.json`（不再走 jsdelivr CDN，修正隐私缺口）；② `drawKaiGlyph` 改用 `drawTaperedPolyline` 渲染真·逐笔，带笔锋收细 + 墨色浓淡 + 书写感时间曲线 |
| `src/engine/draw.ts` | 新增 | 从 dev 的 C7 统一观感层回收：`InkStyle` / `strokeWidthAt` / `alphaAt` / `easeSinceWrite` / `progressByStyle` / `drawTaperedPolyline`（核心笔锋基元） |
| `src/engine/exporter.ts` | 改 | 修复两处真实缺陷：① `H264_CODEC` 硬编码 `avc1.4d0028`（Main@L4.0，上限 1080p）→ 改为 `pickH264Codec()` 按分辨率动态探测（覆盖 4K，High@5.1/5.0）；② MP4 的 `error` 回调 `throw e`（异步异常不进 catch，WebM 降级永不触发）→ 改为受控 `reject`，触发 `exportVideo` 的 WebM 降级 |
| `package.json` | 改 | `version` → `2.0.0`；新增依赖 `hanzi-writer-data`（本地内置笔画数据集）；新增 `vendor:hanzi` 脚本并挂接 `predev`/`prebuild` |
| `src/lib/version.ts` | 改 | `APP_VERSION` → `2.0.0`（与 package.json 同步，满足单测 v1c5 一致性断言） |
| `scripts/vendor-hanzi-data.mjs` | 新增 | 将 `hanzi-writer-data` 的逐字 JSON 复制到 `public/hanzi-data/`，供运行时同源加载（零第三方 CDN、不泄露"写了哪些字"） |
| `.gitignore` | 改 | 忽略 `public/hanzi-data/`（生成物不入库）与 `.workbuddy/`（代理内部状态） |

## 关键设计决策

1. **离线化走"本地内置 median 数据"，而非 dev 的"整字轮廓"**：dev 为离线化把数据换成整字 TrueType 轮廓（丢失逐笔几何），这是回退。正确做法是把 main 本就用、但走 CDN 的 hanzi-writer `medians` 数据**本地化**——`npm i hanzi-writer-data` + `vendor:hanzi` 复制到 `public/hanzi-data/`。这样既保留真·逐笔，又消除外部网络与隐私泄漏。
2. **笔锋动态叠加在正确的逐笔核心之上**：dev 的笔锋层（`draw.ts`）骑在错误的"整字弧长桶"上；此处把它移植到 main 的 median 引擎上，逐小段施加线宽/透明度调制，几何正确且观感一致。
3. **4K 跨浏览器导出不再被"核心"阻塞**：书写引擎是矢量、分辨率无关；4K 导出唯一真阻断是导出器的 H.264 码级硬编码与降级失效，现已修。剩余风险仅为 Safari/Firefox 的 4K 硬件编码支持差异（属诚实边界，应在发布说明标注，不阻塞发布）。

## 完成 dev 彻底替换的步骤（需联网 + 你明确批准 push）

当前本机环境**代理阻断了 git 对象下载**（blob 全部 fetch 失败），无法物化 main、也无法推送。
文件已落到本地工作区并完成一次**本地提交**（离线、可逆）。以下步骤在你网络恢复后执行：

```bash
# 方案 A（推荐，真正以 main 为历史基线）：
git fetch origin main
git checkout -B main origin/main
# 重新套用本仓库已包含的 7 个重建文件（它们已在工作区/本次提交中）
#   src/engine/{draw,stroke,exporter}.ts  package.json  src/lib/version.ts
#   scripts/vendor-hanzi-data.mjs  .gitignore
npm install && npm run vendor:hanzi
git add -A
git commit -m "rebuild(V2.0): base on main, recover offline + brush dynamics, fix exporter"
git branch -f dev HEAD
git push --force origin dev        # ⚠ 需你明确批准

# 方案 B（直接推送当前本地重建态，作为 dev 的整树替换）：
git add -A
git commit -m "rebuild(V2.0): main baseline + offline + brush + exporter fix" || true
git branch -f dev HEAD
git push --force origin dev        # ⚠ 需你明确批准
```

> 注：因 dev 远程已存在独立提交，`push --force` 会将其整树替换为新内容——即"彻底替换 dev"，与你的意图一致。任何一步前都可 `git reset` 撤销本地提交。
