# IM-OPS-001 部署与运维文档

**文档编号：IM-OPS-001**
**版本：v1.1**
**状态：已批准（V1.0 发布同步更新）**
**编制日期：2026-10-13**
**更新日期：2026-10-14（V1-C5 N5.1）**
**编制人：运维负责人 / AI 协作**
**上游文档：** IM-PROJ-001 v1.2、IM-ARCH-001 v1.1、IM-DB-001 v1.1、IM-API-001 v1.1、IM-UI-001 v1.0、IM-BASELINE-001、IM-PLAN-001 v1.0、IM-RISK-001 v1.0（均已批准/同步产出）

---

## 1. 修订历史

| 版本 | 日期 | 修订内容 | 修订人 |
|---|---|---|---|
| v1.0 | 2026-10-13 | 初稿。定义纯前端静态部署、CDN 资产托管与缓存版本化、前端错误上报替代服务端监控、回滚与许可交付 | 运维负责人 |
| v1.1 | 2026-10-14 | V1-C5 N5.1 更新：资产缓存命名空间升至 `inkmotion-assets-v2`（新增小篆字库资产）；补充资产清单、缓存迁移与清理、多平台缓存/安全头配置、CI 门禁（单测 + 随包许可校验）、发布检查单增项 | 运维负责人 / AI 协作 |

---

## 2. 引言

### 2.1 目的

本文档定义"墨演 InkMotion"的部署与运维方案。因项目为**纯前端应用（无服务端、无数据库、无账号）**（IM-ARCH-001 AC-01、IM-API-001 §2.2），运维模型与传统后端服务完全不同：**没有服务器指标可监控，没有数据库可备份**，运维重心转向静态资源托管、CDN 资产与前端可观测性。

### 2.2 运维范围

| 在范围内 | 不在范围内 |
|---|---|
| 静态构建与部署 | 服务端运维（无服务端） |
| CDN 资产托管与缓存版本化 | 数据库备份/容灾（无服务端库） |
| 前端错误上报与 CDN 可用性监控 | 用户数据合规审计（数据不出浏览器） |
| 回滚、发布检查单 | 扩容/负载均衡（静态托管自动） |

---

## 3. 部署架构

```
┌─────────────────────────────────────────────┐
│            用户浏览器（应用本体）              │
│  静态 HTML/CSS/JS（含引擎、UI、IndexedDB）    │
└───────────────────┬─────────────────────────┘
                    │ 仅静态资源请求
        ┌───────────┴────────────┐
        │   静态托管（GitHub      │
        │   Pages/Netlify/        │
        │   Vercel/CF Pages）     │
        │   - 应用外壳 + JS 包    │
        └───────────┬────────────┘
                    │ CDN 资产（字体/贴图/字库）
        ┌───────────┴────────────┐
        │   资产 CDN（独立域/路径）│
        │   inkmotion-assets-v1   │
        │   - TTF/OTF 字体        │
        │   - PNG 载体贴图        │
        │   - TXT 字库文件        │
        └─────────────────────────┘
```

> **无服务端、无 API 网关、无数据库**。所有持久化在用户浏览器本地（IM-DB-001 §2.2）。

---

## 4. 部署流程（CI/CD）

> 对应 IM-PLAN-001 N0.3 / N5.1。

| 阶段 | 动作 |
|---|---|
| 构建 | `vite build` → 静态产物（dist） |
| 校验 | 类型检查 + 单测/集成测（IM-TEST-001 §7 门禁）+ **i18n 校验（V2-C3 N3.3）** |
| 预览 | 部署预览环境（PR 预览） |
| 发布 | 推送到生产静态托管；原子切换（平台原生） |
| 资产 | 字体/贴图/字库同步到资产 CDN（`inkmotion-assets-v3`） |

| 平台选项 | 特点 |
|---|---|
| GitHub Pages | 免费、绑定仓库、自定义域 |
| Netlify | 预览部署、表单/重定向便利 |
| Vercel | 前端优化、边缘 |
| Cloudflare Pages | 全球 CDN、缓存控制强 |

---

## 5. 监控与告警（前端重定义）

> 对应 IM-PLAN-001 N5.2 / IM-RISK-001。传统"服务器监控"在此**不适用**，改为以下前端可观测性：

| 监控项 | 方案 | 告警 |
|---|---|---|
| 前端错误 | Sentry（或同类）捕获 `window.onerror` / unhandledrejection / InkMotionError | 错误率突增、新错误类型 |
| 性能 | Web Vitals（LCP/CLS/INP）+ 自定义 performance.mark（IM-TEST-001 §5.8） | 首屏 LCP 超阈值 |
| CDN 资产可用性 | CDN 健康检查 + 合成探测（字体/贴图 200） | 资产 4xx/5xx、回源失败 |
| 版本健康 | 当前部署版本上报（匿名、无用户数据） | 版本分布异常 |
| 兼容性 | 按 UA 统计导出降级分布（TC-EXP-01~03） | Firefox WebM 占比异常 |

> **禁止**将任何用户文本/项目/字体纳入监控上报（IM-API-001 §15.2、IM-DB-001 §11）。匿名指标亦不含文本内容。

---

## 6. CDN 与缓存版本化

> 对应 IM-DB-001 §6.3、IM-PLAN-001 N0.4、V1-C5 N5.1。

| 项 | 策略 |
|---|---|
| **当前缓存名** | **`inkmotion-assets-v2`**（V1.0 起；v1 已列入历史清单） |
| 命名空间 | `inkmotion-assets-v2`（CDN 模式下路径前缀；同源部署直取 `public/`） |
| 升级 | 新版本创建新缓存名（v(N+1)），启动时自动清理历史缓存（`purgeLegacyAssetCaches`） |
| 回源 | CDN 边缘缓存，源站为静态托管或对象存储 |
| 失效 | 文件名哈希 / 缓存名版本化，避免脏缓存 |
| 容量 | ≤ 200MB（IM-DB-001 §6.1） |
| LRU | 资产缓存按时间/容量淘汰（IM-DB-001 §6.4） |

### 6.1 资产清单（V1.0 / `src/lib/assets.ts` 为单一真源）

| 资产键 | 路径 | 类型 | 预缓存 |
|---|---|---|---|
| `texture-paper` | `textures/paper.png` | 纹理 | 是 |
| `texture-bamboo` | `textures/bamboo.png` | 纹理 | 是 |
| `seal-font` | `fonts/seal/LXGWSeal-Glyphs.woff2`（42KB 子集） | 字体 | 是 |
| `seal-map` | `fonts/seal/seal-map.json`（165 篆字 / 238 今字） | 数据 | 是 |
| `seal-license` | `fonts/seal/OFL.txt` | 许可 | 是 |
| `seal-font-fallback` | `fonts/seal/LXGWSeal-Regular.ttf`（223KB） | 字体 | 否（按需回退） |

### 6.2 同源部署与 CDN 模式

- **同源（默认）**：`VITE_ASSET_CDN` 留空，资产 URL 直接引用站点相对路径（`/fonts/seal/...`），由静态托管一并发布；**零外域请求**。
- **CDN 模式**：注入 `VITE_ASSET_CDN=https://cdn.example.com`，URL 变为 `<CDN>/inkmotion-assets-v2/<path>`；字体需 CORS 头（`Access-Control-Allow-Origin: *`）。

> V1-C5 修复：此前同源模式会误拼为 `/inkmotion-assets-v1/...` 导致预缓存 404（静默失败），现已修正为相对 `public/` 路径。

### 6.3 多平台缓存与安全头

| 平台 | 配置文件 | 关键策略 |
|---|---|---|
| Netlify | `public/_headers`（+ `netlify.toml` 重定向） | `/assets/*`、`/fonts/seal/*` immutable 长缓存；安全头 + Permissions-Policy |
| Vercel | `vercel.json` | 同源策略（headers 段） |
| Cloudflare Pages | `public/_headers` | 同 Netlify |
| GitHub Pages | 平台默认 | 无自定义头；依赖文件名哈希与 Cache API |

---

## 7. 回滚策略

| 场景 | 回滚方式 |
|---|---|
| 应用构建缺陷 | 静态托管平台一键回滚到上一部署（原子切换） |
| 资产损坏 | 资产 CDN 回滚到上一缓存版本（`inkmotion-assets-v(N-1)`）；同源部署回滚上一构建即可 |
| 缓存异常 | 用户端清缓存：应用启动时自动清理历史版本缓存；必要时用户手动清除站点数据 |
| 紧急停服 | 部署"维护页"占位（极少用） |

> 因无状态服务端，回滚成本极低、无数据迁移风险。**回滚不涉及用户本地数据**（IndexedDB 由用户持有）。

---

## 8. 许可交付与致谢

> 对应 IM-RISK-001 R-06、IM-PLAN-001 §9 C2、V1-C5 N5.2。真源：`src/lib/licenses.ts` 与仓库 `THIRD-PARTY-NOTICES.md`。

| 字体 / 组件 | 许可 | 交付要求 | 状态 |
|---|---|---|---|
| 楷体（Arphic UKai） | **Arphic PL** | **必须可见署名**（关于页）；保留版权声明 | ✅ 已署名 |
| 宋体（Source Han Serif） | **OFL 1.1** | 关于页署名；随分发保留 OFL | ✅ 已署名 |
| 小篆（霞鹜篆书 LXGW Seal） | **OFL 1.1** | 关于页署名 + **随包分发 `fonts/seal/OFL.txt`** + 关于页本地查阅入口 | ✅ V1-C5 新增 |
| Hanzi Writer（含笔顺数据） | MIT | 开源组件清单致谢 | ✅ |
| Dexie.js | Apache-2.0 | 开源组件清单致谢 | ✅ |
| React / Zustand / React Router / mp4-muxer | MIT | 开源组件清单致谢 | ✅ |

**发布检查单必含**：关于页含 Arphic PL 与 OFL 署名（IM-UI-001 §6.5.1）；随包许可文件在 CI 中校验存在（`NOTICE`、`THIRD-PARTY-NOTICES.md`、`public/fonts/seal/OFL.txt`）。

---

## 8bis. i18n 审校流程固化（V2-C3 N3.3）

> 对应 IM-TEST-V2-001 §5.4、IM-RISK-V2-001 VR2-04、IM-I18N-V2-001。目标：**文案变更须过审校门禁**，防止英文质量回退。

### 8bis.1 门禁命令

```bash
npm run check:i18n   # 键集合一致性 + 取值非空 + 占位符对齐 + 硬编码扫描
```

退出码：`0`=通过；`1`=有违规（打印明细）。已接入：
- **CI 门禁**（`.github/workflows/deploy.yml`）：`npm run check:i18n` 在 `npm run build` 之前执行，失败即阻断发布；
- **本地门禁**：提交前建议执行 `npm run lint && npm run check:i18n && npm run test`。

### 8bis.2 脚本检查项

| 检查 | 说明 |
|---|---|
| 键集合一致 | `i18n.zh.ts` 与 `i18n.en.ts` 键集合必须完全相同（无缺漏/无多余） |
| 取值非空 | 每条 zh/en 取值非空字符串 |
| 占位符对齐 | 同键 `{var}` 占位符集合在 zh/en 两侧一致（防插值错位） |
| 硬编码扫描 | `src/pages`、`src/components` 的 JSX 文本 / `placeholder` / `aria-label` / `title` 不得含未走 `t()` 的中文 |

### 8bis.3 文案变更约定

1. 新增 UI 文案：**先在两包同时登记** `'key': '...'`（键集合一致），再在组件中 `t('key')`；
2. 带变量文案：使用 `{name}` 占位，`t('key', { name })`——两包占位符必须一致；
3. 语言自称（如 `简体中文`）、品牌墨迹符号（`墨`）、**古典中文内容**（模板正文/标题）**不翻译**，扫描时按白名单排除；
4. 英文文案修改视为「需审校变更」：须更新 `docs/IM-I18N-V2-001-英文审校记录.md` 的样例表，并过 `check:i18n`。

### 8bis.4 合规依据

- TC-V2-I18N-01（母语审校通过）、TC-V2-I18N-02（词条完整性）、TC-V2-I18N-03（无硬编码）、TC-V2-I18N-04（布局适配）；
- 发布检查单新增 **V2-C8-1/2/3**（英文独立 chunk / 切换生效 / 无硬编码中文）。

---

## 9. 安全与隐私运维

| 项 | 措施 |
|---|---|
| 传输 | 全站 HTTPS（静态托管默认） |
| 隐私 | 用户数据不出浏览器；隐私声明可见（IM-DB-001 §11.4） |
| 资产 | CDN 防盗链/签名（可选）；不托管用户数据 |
| 依赖 | SBOM + 锁版本 + 定期审计（IM-RISK-001 R-11） |
| 供应链 | 构建产物完整性校验 |

---

## 10. 发布检查单（运维侧）

| # | 检查项 | 来源 | V1.0 状态 |
|---|---|---|---|
| O1 | 静态部署上线，HTTPS 可用 | N5.1 | ✅ 静态产物 + 多平台配置就绪 |
| O2 | 资产缓存版本化落地（`inkmotion-assets-v2`）+ 历史缓存清理 | N0.4、§6 | ✅ E2E 验证迁移 |
| O3 | 前端错误上报接入（本地环形缓冲 + 可选匿名上报，默认关闭） | N5.2、§5 | ✅ 设置页诊断 |
| O4 | 资产合成探测通过（字体/字表/OFL/纹理均 200） | §5 | ✅ `e2e/v1c5.mjs` |
| O5 | Arphic PL / OFL 署名页随发 + 随包许可文件 | §8、C2 | ✅ 关于页 + OFL.txt |
| O6 | 回滚预案验证（平台一键回滚可用；无状态无迁移） | §7 | ✅ 文档化 |
| O7 | 零上传验证（监控不含用户数据；无对外 POST） | §5、IM-TEST-001 §5.5 | ✅ E2E 断言 |
| O8 | CI 门禁：lint + 单测（126）+ 构建 + 随包许可校验 | V1-C5 N5.3 | ✅ `.github/workflows/deploy.yml` |
| O9 | 多平台缓存与安全响应头配置（Netlify/Vercel/CF） | §6.3 | ✅ `_headers` / `vercel.json` / `netlify.toml` |
| O10 | i18n 审校门禁：`npm run check:i18n` 纳入 CI（文案变更须过检） | V2-C3 N3.3 | ✅ §8bis + `deploy.yml` |

---

## 11. 附录

### 11.1 运维文档索引

IM-PLAN-001（发布节点 N5.1/N5.2/N5.3）、IM-PLAN-V1-001（V1-C5 N5.1~N5.3）、IM-RISK-001 / IM-RISK-V1-001（R-06/R-10）、IM-TEST-001 / IM-TEST-V1-001（§5.5 隐私、§7/§8 门禁）、IM-DB-001（§6 缓存、§11 隐私）、IM-API-001（§15.2 无网络）、THIRD-PARTY-NOTICES.md（许可交付）。

### 11.2 相关文档

IM-PROJ-001 v1.2、IM-ARCH-001 v1.1、IM-BASELINE-001、IM-PLAN-001 v1.0、IM-RISK-001 v1.0、IM-TEST-001 v1.0。

---

**文档结束。**
