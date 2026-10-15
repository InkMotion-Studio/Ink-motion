# 墨演 InkMotion V2-C7 C4 交付说明：用户定制兜底层（C 层）

> 检查点：C4（承接 C3 轮廓兜底引擎）
> 目标：兑现用户诉求「A+B+C 三层并用，以其一为主，最终以用户定制做兜底才是正道」——
>       在 A（规范表）+ B（新华级）权威内置之上，提供用户自定义笔顺/字形的最高优先级兜底层。

## 一、C4 做了什么

### 1. 数据层：用户定制存储（IndexedDB）
- `src/db/types.ts` 新增 `CustomStrokeRecord`（`char`/`order`/`outline`/`note`/时间戳）与 `CustomOutline`。
- `src/db/database.ts`：Dexie **升 version(2)**，新增 `customstrokes` 表（增量升级，不动既有表）；
  提供 CRUD `putCustomStroke`/`getCustomStroke`/`listCustomStrokes`/`deleteCustomStroke`，
  以及 `exportCustomStrokes`/`importCustomStrokes`（逐条校验、非法跳过不中断）与 `isValidOrder` 校验。

### 2. 查表接入：三层优先级落地
- `src/engine/customStroke.ts`（新增）：C 层引擎侧读取封装——内存缓存 + 失效通知 + 安全降级
  （无 IndexedDB 环境自动退化为「无定制」）。热路径不直接 await IndexedDB。
- `src/engine/stroke.ts`：`loadStrokeData` 优先级 **C(用户定制) > A+B(权威内置)**；
  命中定制时 `source='user'`；新增 `invalidateStrokeDataCache()`。
- `src/engine/outline.ts`：`getKaiOutline` 优先级 **C(用户定制字形) > C3 内置楷体轮廓**；
  新增 `invalidateKaiOutlineCache()`。
- `src/main.tsx`：应用启动注入 C 层数据源（`setCustomStrokeLoader(() => listCustomStrokes())`）。

### 3. UI：用户定制管理面板
- `src/components/CustomStrokeManager.tsx`（新增）：录入「字符 + 笔顺编码 + 备注」→ 保存/覆盖；
  26 字母编码实时解码为笔画名（如 `kresl` → 横折提·竖折·竖·撇·竖钩）；列表展示与删除；
  导出/导入 JSON（备份与分享）。保存后自动失效引擎缓存，C 层即时生效。
- `src/pages/Settings.tsx`：新增「用户定制笔顺（C 层）」卡片。
- i18n：zh/en 各新增 `custom.*` 19 键（共 300 键，保持对齐）。

## 二、验证结果（全部通过）

| 门禁 | 结果 |
|---|---|
| tsc / vitest / eslint | ✅ 0 error，**229 测试全过**（新增 C4 单测：数据层 9 + C 层优先级 3 + 组件 4） |
| vite build | ✅ 主包 gzip **134.79 KB** < 200KB 门禁 |
| check:i18n | ✅ zh/en 300 键一致 |
| 真实浏览器（Playwright + 系统 Chromium） | ✅ 设置页卡片渲染 → 录入「永=sl」成功入列表 → 进编辑器输入「永和九年」 |
| · 控制台错误 / 404 / 网络失败 | ✅ 0 |

## 三、三层查表最终形态

```
C  用户定制（IndexedDB，最高优先级）   ← C4 本层
B  新华字典级增强（并入权威内置表）      ← C1
A  《通用规范汉字表》(GF 3002-1999)     ← C1
── 以上均无 ──
C3 字体轮廓兜底（按笔顺切分轮廓逐笔）    ← C3
整字显现降级（标点/字母/无轮廓）        ← 兜底
```

## 四、文件清单

- 新增：`src/engine/customStroke.ts`、`src/components/CustomStrokeManager.tsx`、
  `src/db/__tests__/customstroke.test.ts`、`src/components/__tests__/CustomStrokeManager.test.tsx`
- 修改：`src/db/types.ts`、`src/db/database.ts`、`src/engine/stroke.ts`、`src/engine/outline.ts`、
  `src/engine/index.ts`、`src/main.tsx`、`src/pages/Settings.tsx`、`src/lib/i18n.zh.ts`、`src/lib/i18n.en.ts`、
  `src/engine/__tests__/carrier-stroke.test.ts`

## 五、下一步

**C5（书写引擎统一与观感）**：统一 kai/song/brush/seal/li 各路径的书写观感（笔锋、速度曲线、
墨迹浓淡），拉齐逐笔动画品质；并清理 `package.json` 中已无引用的 `hanzi-writer` 依赖。

回复「通过」后进入 C5。
