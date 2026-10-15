#!/usr/bin/env python3
"""
墨演 InkMotion V2-C7 C3：楷体字形轮廓构建脚本。

目的：从完整楷体源字体（LXGW WenKai Lite，OFL 1.1）提取 CJK 基本区（U+4E00–U+9FFF）
      每个汉字的 glyf 轮廓坐标，输出与运行期 OutlineGlyph 同构的精简 JSON，
      按 512 码位分片存于 public/kaioutline/，供 C3「轮廓·笔顺驱动逐笔」动画零网络加载。

输出格式（每个字）：
  { "contours": [ [ {"x":int,"y":int,"on":bool}, ... ], ... ],
    "unitsPerEm": int, "xMin":int,"yMin":int,"xMax":int,"yMax":int }

分片：strokes-{start16}-{end16}.json（同 C1 风格）；kaioutline.manifest.json 记录分片与范围。

依赖：fonttools（pip install fonttools）
"""
import json
import os

from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "fonts-src", "LXGWWenKaiLite-Regular.ttf")
OUT_DIR = os.path.join(ROOT, "public", "kaioutline")
RANGE_START = 0x4E00
RANGE_END = 0x9FFF
CHUNK_SIZE = 512
SOURCE = "LXGW WenKai Lite (OFL 1.1) — 楷体字形轮廓，供 C3 轮廓·笔顺驱动逐笔动画"


def glyph_to_contours(glyph):
    """返回轮廓列表，每个轮廓为点序列 [{"x","y","on"}]。on=True 为曲线上点，False 为二次贝塞尔控制点。"""
    if glyph.numberOfContours == 0:
        return []
    coords = glyph.getCoordinates(None)
    pts, end_pts = coords[0], coords[1]
    flags = getattr(glyph, "flags", None)
    contours = []
    start = 0
    for end in end_pts:
        seg = []
        for i in range(start, end + 1):
            p = pts[i]
            x, y = (p[0], p[1]) if isinstance(p, (tuple, list)) else (p.x, p.y)
            on = bool(flags[i]) if flags is not None else True
            seg.append({"x": int(round(x)), "y": int(round(y)), "on": on})
        contours.append(seg)
        start = end + 1
    return contours


def contour_length(contour):
    """计算轮廓周长（直线段总长，曲线按控制点折线近似，仅用于 depict 均匀性）。"""
    n = len(contour)
    if n < 2:
        return 0
    total = 0.0
    for i in range(n):
        a = contour[i]
        b = contour[(i + 1) % n]
        total += ((a["x"] - b["x"]) ** 2 + (a["y"] - b["y"]) ** 2) ** 0.5
    return total


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    font = TTFont(SRC)
    glyf = font["glyf"]
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm

    total = 0
    chunks = []
    for base in range(RANGE_START, RANGE_END + 1, CHUNK_SIZE):
        end = min(base + CHUNK_SIZE - 1, RANGE_END)
        chunk = {}
        for cp in range(base, end + 1):
            if cp not in cmap:
                continue
            glyph_name = cmap[cp]
            g = glyf[glyph_name]
            contours = glyph_to_contours(g)
            if not contours:
                continue
            out_contours = []
            for c in contours:
                # 紧凑格式：points = [x,y,on, x,y,on, ...]；on 用 1/0
                flat = []
                for p in c:
                    flat.append(p["x"])
                    flat.append(p["y"])
                    flat.append(1 if p["on"] else 0)
                out_contours.append(
                    {"points": flat, "length": round(contour_length(c), 1)}
                )
            chunk[chr(cp)] = {
                "contours": out_contours,
                "unitsPerEm": upm,
                "xMin": g.xMin,
                "yMin": g.yMin,
                "xMax": g.xMax,
                "yMax": g.yMax,
            }
        if chunk:
            fname = f"strokes-{base:04X}-{end:04X}.json"
            with open(os.path.join(OUT_DIR, fname), "w", encoding="utf-8") as f:
                json.dump(chunk, f, ensure_ascii=False, separators=(",", ":"))
            chunks.append({"file": fname, "start": base, "end": end, "chars": len(chunk)})
            total += len(chunk)
            print(f"[build-kai-outline] 分片 {fname}: {len(chunk)} 字")
    manifest = {
        "source": SOURCE,
        "range": {"start": RANGE_START, "end": RANGE_END},
        "unitsPerEm": upm,
        "total": total,
        "chunks": chunks,
    }
    with open(os.path.join(OUT_DIR, "kaioutline.manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"[build-kai-outline] 完成：导出 {total} 字轮廓，{len(chunks)} 片 -> {OUT_DIR}")


if __name__ == "__main__":
    main()
