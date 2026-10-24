# 字体源文件目录（fonts-src）

此目录存放**字体构建的源文件**，不随交付包分发（已加入 `.gitignore`）。

## 用途

`scripts/build-fonts.py` 从这里读取完整字体，按 unicode-range 切成 woff2 分片，
输出到 `public/fonts/builtin/`（该目录的产物**随包交付**）。

## 需要的文件

| 文件名 | 字体 | 许可 | 下载地址 |
|---|---|---|---|
| `LXGWWenKaiLite-Regular.ttf` | 霞鹜文楷 Lite | SIL OFL 1.1 | https://github.com/lxgw/LxgwWenKai-Lite/releases |
| `NotoSerifSC-Regular.ttf` | 思源宋体 | SIL OFL 1.1 | https://github.com/adobe-fonts/source-han-serif/releases |
| `MaShanZheng-Regular.ttf` | 马善政毛笔楷 | SIL OFL 1.1 | https://github.com/googlefonts/mashanzheng |
| `AlimamaDaoLiTi.ttf`（可选） | 阿里妈妈刀隶体（**真隶书**） | 免费商用 | https://www.alimama.com/ （仅官网发布，需手动下载） |

## 构建步骤

```bash
# 1. 把上述字体放入本目录
# 2. 安装依赖
pip install fonttools brotli

# 3. 构建分片（输出到 public/fonts/builtin/）
python3 scripts/build-fonts.py

# 4. 校验产物完整性
python3 scripts/build-fonts.py --check
```

## 新增字体

在 `scripts/build-fonts.py` 的 `FONTS` 列表中追加一项：

```python
{
    'src': 'AlimamaDaoLiTi.ttf',
    'prefix': 'alimama-dao-li-ti',
    'family': 'Alimama Dao Li Ti',   # 必须与 src/lib/fontRegistry.ts 中 BUILTIN_FONT_STACKS 的键对应
    'usage': 'li',
},
```

同时更新 `src/lib/fontRegistry.ts` 的 `BUILTIN_FONT_STACKS` 与 `src/lib/fonts.ts` 的 `FONT_CATALOG`
（含 i18n 键 `options.font.*` / `font.attr.*` / `font.note.*`，中英双包都要加，否则 `check:i18n` 会拦）。

## 关于隶书

公开渠道**没有可直接下载的合规开源隶书字体**。真隶书候选「阿里妈妈刀隶体」
（GB2312 覆盖 6763 字、官方声明免费商用）**仅通过阿里妈妈平台发布**，无公开 CDN。

当前隶书**回退系统已装隶书字体**，UI 已如实标注该限制。
如需真实接入：下载刀隶体到本目录 → 按上述步骤加进 `FONTS` → 重新构建即可。
