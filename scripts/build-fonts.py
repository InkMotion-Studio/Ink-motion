#!/usr/bin/env python3
"""
V2-C4 N4.2：内置开源中文字体分片构建脚本。

用途：把完整字体按 unicode-range 切成若干片 woff2，配合 CSS `unicode-range`
      让浏览器**按需下载**（只拉包含页面实际用到的字符的那些片），
      从而在不牺牲字符覆盖的前提下，把首屏字体成本压到接近零。

用法：
    python3 scripts/build-fonts.py            # 使用 fonts-src/ 下的源字体
    python3 scripts/build-fonts.py --check    # 只校验现有产物完整性

源字体（需自行放入 fonts-src/，均为 OFL 1.1，见 THIRD-PARTY-NOTICES.md）：
    LXGWWenKaiLite-Regular.ttf   霞鹜文楷 Lite  https://github.com/lxgw/LxgwWenKai-Lite
    NotoSerifSC-Regular.ttf      思源宋体        https://github.com/adobe-fonts/source-han-serif
    MaShanZheng-Regular.ttf      马善政毛笔楷     https://github.com/googlefonts/mashanzheng

依赖：fonttools（pip install fonttools brotli）
"""

import argparse
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'fonts-src')
OUT_DIR = os.path.join(ROOT, 'public', 'fonts', 'builtin')

# 字体清单：源文件名 → 输出前缀 / CSS 家族名 / 渲染用途
FONTS = [
    {
        'src': 'LXGWWenKaiLite-Regular.ttf',
        'prefix': 'lxgw-wenkai-lite',
        'family': 'LXGW WenKai',
        'usage': 'kai',
    },
    {
        'src': 'NotoSerifSC-Regular.ttf',
        'prefix': 'noto-serif-sc',
        'family': 'Noto Serif SC',
        'usage': 'song',
    },
    {
        'src': 'MaShanZheng-Regular.ttf',
        'prefix': 'ma-shan-zheng',
        'family': 'Ma Shan Zheng',
        'usage': 'brush',
    },
]


def build_chunks(cmap_keys):
    """生成分片定义：[起始码位, 结束码位, 标签]。

    策略：非汉字区（拉丁/标点/全角）各自单独成片；汉字区按 1000 码位切分；
    CJK 扩展 A 字形较密，按 500 码位细分为多片，避免单片体积过大影响按需下载体验。
    这样一篇常见中文文本通常只触发 2–4 片下载。
    """
    chunks = [
        (0x0020, 0x00FF, 'latin'),
        (0x2000, 0x206F, 'punct'),
        (0x3000, 0x303F, 'cjkpunct'),
        (0xFF00, 0xFFEF, 'fullwidth'),
    ]
    for a in range(0x4E00, 0xA000, 1000):
        chunks.append((a, min(a + 999, 0x9FFF), f'cjk{a:04X}'))
    # 扩展 A 按 500 码位细分（字形密集，需控制单片体积）
    for a in range(0x3400, 0x4DC0, 500):
        chunks.append((a, min(a + 499, 0x4DBF), f'cjkA{a:04X}'))
    return chunks


def build_font(spec):
    from fontTools.ttLib import TTFont

    src_path = os.path.join(SRC_DIR, spec['src'])
    if not os.path.exists(src_path):
        print(f'  [跳过] 源字体不存在：{src_path}')
        return None

    font = TTFont(src_path)
    cmap = set(font.getBestCmap().keys())
    print(f"  源字体 {spec['src']}：{len(cmap)} 字形")

    manifest = []
    for start, end, tag in build_chunks(cmap):
        chars = ''.join(chr(cp) for cp in range(start, end + 1) if cp in cmap)
        if not chars:
            continue
        txt = os.path.join(OUT_DIR, f'.tmp-{tag}.txt')
        with open(txt, 'w', encoding='utf-8') as fh:
            fh.write(chars)
        out = os.path.join(OUT_DIR, f"{spec['prefix']}-{tag}.woff2")
        subprocess.run(
            [
                'pyftsubset', src_path, f'--text-file={txt}', f'--output-file={out}',
                '--flavor=woff2', '--layout-features=', '--no-hinting', '--desubroutinize',
            ],
            check=True, capture_output=True,
        )
        os.remove(txt)
        size = os.path.getsize(out)
        manifest.append({
            'file': os.path.basename(out),
            'start': start, 'end': end,
            'chars': len(chars), 'bytes': size,
        })

    total = sum(m['bytes'] for m in manifest)
    print(f"  → {len(manifest)} 片，合计 {total / 1024 / 1024:.2f}MB")
    return {
        'prefix': spec['prefix'],
        'family': spec['family'],
        'usage': spec['usage'],
        'source': spec['src'],
        'chunks': manifest,
        'totalBytes': total,
    }


def check_manifest():
    """校验产物完整性：manifest 中每个文件都存在且非空。"""
    path = os.path.join(OUT_DIR, 'fonts.manifest.json')
    if not os.path.exists(path):
        print('未找到 fonts.manifest.json，请先运行构建。')
        return 1
    data = json.load(open(path, encoding='utf-8'))
    bad = 0
    for font in data['fonts']:
        for chunk in font['chunks']:
            fp = os.path.join(OUT_DIR, chunk['file'])
            if not os.path.exists(fp) or os.path.getsize(fp) == 0:
                print(f'  缺失/空文件：{chunk["file"]}')
                bad += 1
    if bad:
        print(f'校验失败：{bad} 个文件有问题')
        return 1
    print(f"校验通过：{len(data['fonts'])} 款字体，产物完整")
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true', help='只校验产物完整性')
    args = parser.parse_args()

    if args.check:
        sys.exit(check_manifest())

    os.makedirs(OUT_DIR, exist_ok=True)
    result = {'generatedBy': 'scripts/build-fonts.py', 'fonts': []}
    for spec in FONTS:
        print(f"[构建] {spec['family']}")
        entry = build_font(spec)
        if entry:
            result['fonts'].append(entry)

    if not result['fonts']:
        print('\n没有构建任何字体。请把源 TTF 放入 fonts-src/ 后重试。')
        sys.exit(1)

    out = os.path.join(OUT_DIR, 'fonts.manifest.json')
    with open(out, 'w', encoding='utf-8') as fh:
        json.dump(result, fh, ensure_ascii=False, indent=2)
    grand = sum(f['totalBytes'] for f in result['fonts'])
    print(f"\n完成：{len(result['fonts'])} 款字体，总体积 {grand / 1024 / 1024:.2f}MB")
    print(f'清单：{out}')


if __name__ == '__main__':
    main()
