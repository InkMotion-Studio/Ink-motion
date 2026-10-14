# 第三方许可与致谢（THIRD-PARTY NOTICES）

> 墨演 InkMotion V1.0 · 应用代码采用 **Apache-2.0**（见 `LICENSE` 与 `NOTICE`）。
> 本文件列出随包分发或运行期依赖的第三方字体与开源组件，遵循各自许可。真源：`src/lib/licenses.ts`（关于页同表渲染）。
> 更新日期：2026-10-14（V1-C5 N5.2）

## 一、字体（须可见署名）

| 字体 | 许可 | 用途 | 许可全文 | 随包许可文件 |
|---|---|---|---|---|
| 文鼎楷体 UKai（Arphic UKai） | Arphic Public License | 楷体路径字形；Hanzi Writer 笔顺数据来源 | https://www.arphic.com.tw/ | 否（系统/CDN 提供） |
| 思源宋体 Source Han Serif | SIL OFL 1.1 | 宋体路径字形（缺失回退系统衬线） | https://scripts.sil.org/OFL | 否（缺失时回退） |
| 霞鹜篆书 LXGW Seal | SIL OFL 1.1 | 小篆路径字形（受限字库，Unicode 18.0 小篆码位 U+3D000+） | https://scripts.sil.org/OFL | **是** — `public/fonts/seal/OFL.txt` |

**合规动作（已完成）：**

1. 「关于」页字体许可卡片逐条展示字体、许可标识与署名文案（IM-UI-001 §6.5.1）。
2. 「关于」页「随包许可文本」卡片提供 OFL.txt 本地查阅入口（随分发保留许可全文）。
3. 霞鹜篆书保留字体名称「霞鹜 / LXGW」，不作改名分发（OFL 保留字体名要求）。
4. 字库子集化产物 `LXGWSeal-Glyphs.woff2`（42KB）由完整 TTF（223KB）经 pyftsubset 生成，仍属同一 OFL 授权的衍生使用。

## 二、运行期开源组件

| 组件 | 许可 | 用途 |
|---|---|---|
| Hanzi Writer（含 hanzi-writer-data） | MIT | 楷体逐笔书写动画与笔顺数据加载 |
| Dexie.js | Apache-2.0 | IndexedDB 封装（项目/设置/字体本地持久化） |
| React / React DOM | MIT | UI 框架 |
| Zustand | MIT | 状态管理 |
| React Router | MIT | 前端路由（HashRouter） |
| mp4-muxer | MIT | MP4 封装（WebCodecs 导出路径） |

## 三、构建/测试期工具（不随包分发）

Vite、Vitest、TypeScript、ESLint、Prettier、Playwright、axe-core（均为 MIT / Apache-2.0 系许可）。

## 四、用户上传字体（许可责任说明）

用户通过「设置 → 字体」上传的字体仅存储于本机浏览器（IndexedDB），不会上传至任何服务器。
字体文件的再分发与商用许可由用户自行确认；应用不对上传字体的授权状态负责。

## 五、纯前端隐私声明

无服务端、无数据库、无 HTTP API、无账号系统。用户文本、项目与字体仅存于本机浏览器；导出视频亦在本地生成。
