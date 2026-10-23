# 第三方组件与数据署名（THIRD-PARTY NOTICES）

本项目为「纯前端」应用，所有数据均在浏览器本地加载、文本永不离开用户设备。

## 楷体逐笔笔顺数据：hanzi-writer-data / Make Me a Hanzi

- 来源仓库：<https://github.com/chanind/hanzi-writer-data>（上游 <https://github.com/skishore/makemeahanzi>）
- 用途：`src/engine/kaiStrokeData.ts`（KaiAdaptor）在运行时加载，提供楷体每字的真实笔顺几何
  （`strokes` 独立轮廓 + `medians` 中轴线，按正确笔顺排序），实现「真·逐笔书写」。
- 数据派生自 **Arphic PL KaitiM GB / Arphic PL UKai** 字体（文鼎科技 Arphic Technology，1999 年以宽松许可发布），
  并依据 Unihan / CJKlib 字典数据。
- 许可：图形数据（graphics.txt）沿用 Arphic 公共许可；字典数据（dictionary.txt）沿用 Unihan / CJKlib 许可。
  使用、再分发、修改须保留上述版权与许可声明（本文件即为其署名载体）。

> 备注：V2-C5 曾移除 hanzi-writer 依赖并改用「本地笔顺表 + 字体轮廓等分」近似；本文件对应的
> hanzi-writer-data 以**本地依赖（npm）+ 同源静态文件**形式重新引入，仅用于提供更高保真度的楷体真笔顺，
> 不引入任何运行时外部 CDN 请求。
