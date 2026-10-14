// V1-C5 测试：N5.1 资产命名空间与缓存迁移 / N5.2 许可登记 / N5.3 版本一致性
// 覆盖发布检查单新增项：V1-C2（OFL 署名与随包许可）、V1-C10（资产版本化）、运维 O2（缓存版本化）。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ASSET_CACHE_NAME,
  ASSET_MANIFEST,
  ASSET_NAMESPACE,
  LEGACY_ASSET_CACHE_NAMES,
  assetUrl,
  getAssetEntry,
  isCdnMode,
  listAssetCaches,
  precacheAssets,
  purgeLegacyAssetCaches,
} from '@/lib/assets';
import { SEAL_FONT_URL, SEAL_MAP_URL, SEAL_OFL_URL, getSealFontSource } from '@/lib/seal';
import {
  APP_LICENSE,
  THIRD_PARTY_LICENSES,
  attributionRequiredEntries,
  bundledLicenseFiles,
} from '@/lib/licenses';
import { APP_VERSION, versionString } from '@/lib/version';
import { MESSAGES_ZH, loadLang } from '@/lib/i18n';

// —— 内存版 Cache API（jsdom 不提供 caches） ——
type Store = Map<string, Map<string, Response>>;
let store: Store;

function installCaches(initial: string[] = []): Store {
  store = new Map();
  for (const n of initial) store.set(n, new Map());
  const cacheFor = (name: string) => ({
    async match(url: string) {
      return store.get(name)?.get(url);
    },
    async put(url: string, res: Response) {
      store.get(name)?.set(url, res);
    },
    async add() {
      /* 未使用 */
    },
    async keys() {
      return [...(store.get(name)?.keys() ?? [])];
    },
  });
  const cachesMock = {
    async keys() {
      return [...store.keys()];
    },
    async open(name: string) {
      if (!store.has(name)) store.set(name, new Map());
      return cacheFor(name);
    },
    async has(name: string) {
      return store.has(name);
    },
    async delete(name: string) {
      return store.delete(name);
    },
  };
  vi.stubGlobal('caches', cachesMock);
  return store;
}

describe('V1-C5 N5.1 资产命名空间与缓存版本化', () => {
  beforeEach(() => installCaches());
  afterEach(() => vi.unstubAllGlobals());

  it('TC-V1-OPS-01 资产命名空间与缓存名升至 v2', () => {
    expect(ASSET_NAMESPACE).toBe('inkmotion-assets-v2');
    expect(ASSET_CACHE_NAME).toBe('inkmotion-assets-v2');
    expect(LEGACY_ASSET_CACHE_NAMES).toContain('inkmotion-assets-v1');
  });

  it('TC-V1-OPS-02 资产清单登记小篆字库三项（字体/字表/许可）', () => {
    const keys = ASSET_MANIFEST.map((a) => a.key);
    expect(keys).toEqual(expect.arrayContaining(['seal-font', 'seal-map', 'seal-license']));
    const font = getAssetEntry('seal-font');
    expect(font?.kind).toBe('font');
    expect(font?.path).toBe('fonts/seal/LXGWSeal-Glyphs.woff2');
    expect(getAssetEntry('seal-license')?.path).toBe('fonts/seal/OFL.txt');
  });

  it('TC-V1-OPS-03 回退 TTF 不参与预缓存（大体积按需加载）', () => {
    expect(getAssetEntry('seal-font-fallback')?.precache).toBe(false);
  });

  it('TC-V1-OPS-04 同源模式：资产 URL 为站点相对路径（零上传红线）', () => {
    expect(isCdnMode()).toBe(false);
    expect(assetUrl('seal-font')).toBe('/fonts/seal/LXGWSeal-Glyphs.woff2');
    expect(assetUrl('seal-map')).toBe('/fonts/seal/seal-map.json');
    expect(assetUrl('texture-paper')).toBe('/textures/paper.png');
    // 无协议/无外域，确保不产生跨域请求
    for (const a of ASSET_MANIFEST) {
      expect(assetUrl(a.key).startsWith('/')).toBe(true);
    }
  });

  it('TC-V1-OPS-05 未知资产键抛错（清单为单一真源）', () => {
    expect(() => assetUrl('not-exist')).toThrow();
    expect(getAssetEntry('not-exist')).toBeUndefined();
  });

  it('TC-V1-OPS-06 篆书 URL 由资产清单派生（seal.ts 与 assets.ts 一致）', () => {
    expect(SEAL_FONT_URL).toBe(assetUrl('seal-font'));
    expect(SEAL_MAP_URL).toBe(assetUrl('seal-map'));
    expect(SEAL_OFL_URL).toBe(assetUrl('seal-license'));
  });

  it('TC-V1-OPS-07 版本升级清理历史缓存（v1 删除、v2 保留）', async () => {
    installCaches(['inkmotion-assets-v1', 'inkmotion-assets-v2']);
    const removed = await purgeLegacyAssetCaches();
    expect(removed).toEqual(['inkmotion-assets-v1']);
    const left = await listAssetCaches();
    expect(left).toContain('inkmotion-assets-v2');
    expect(left).not.toContain('inkmotion-assets-v1');
  });

  it('TC-V1-OPS-08 当前版本缓存永不被清理', async () => {
    installCaches(['inkmotion-assets-v2']);
    const removed = await purgeLegacyAssetCaches(['inkmotion-assets-v2']);
    expect(removed).toEqual([]);
  });

  it('TC-V1-OPS-09 precacheAssets 预缓存全部 precache 条目并先清理旧缓存', async () => {
    installCaches(['inkmotion-assets-v1']);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/fonts/seal/OFL.txt') return new Response('SIL OPEN FONT LICENSE', { status: 200 });
        return new Response('x', { status: 200 });
      }),
    );
    const ok = await precacheAssets();
    const expected = ASSET_MANIFEST.filter((a) => a.precache !== false).length;
    expect(ok).toBe(expected);
    // 旧缓存已被清理
    expect(await listAssetCaches()).not.toContain('inkmotion-assets-v1');
    expect(store.get('inkmotion-assets-v2')?.has('/fonts/seal/LXGWSeal-Glyphs.woff2')).toBe(true);
  });

  it('TC-V1-OPS-10 单个资产失败不阻断其余（可选增强降级）', async () => {
    installCaches();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/textures/bamboo.png') return new Response('', { status: 404 });
        return new Response('x', { status: 200 });
      }),
    );
    const ok = await precacheAssets();
    const expected = ASSET_MANIFEST.filter((a) => a.precache !== false).length;
    expect(ok).toBe(expected - 1);
  });
});

describe('V1-C5 N5.2 许可合规登记', () => {
  it('TC-V1-LIC-01 三种字体均要求可见署名（ArphicPL / OFL×2）', () => {
    const req = attributionRequiredEntries();
    expect(req.length).toBeGreaterThanOrEqual(3);
    const names = req.map((l) => l.name);
    expect(names.some((n) => /Arphic|文鼎/.test(n))).toBe(true);
    expect(names.some((n) => /Source Han|思源/.test(n))).toBe(true);
    expect(names.some((n) => /LXGW|霞鹜/.test(n))).toBe(true);
    for (const l of req) {
      expect(l.license).toBeTruthy();
      expect(l.url).toMatch(/^https:\/\//);
      expect(l.usage.length).toBeGreaterThan(0);
    }
  });

  it('TC-V1-LIC-02 OFL 许可文本随包分发（bundled 指向 OFL.txt）', () => {
    const bundled = bundledLicenseFiles();
    expect(bundled.length).toBeGreaterThanOrEqual(1);
    expect(bundled[0].path).toBe('/fonts/seal/OFL.txt');
    expect(bundled[0].name).toMatch(/LXGW|霞鹜/);
  });

  it('TC-V1-LIC-03 许可条目字段完整（名称/许可/链接/用途/分类）', () => {
    for (const l of THIRD_PARTY_LICENSES) {
      expect(l.name).toBeTruthy();
      expect(l.license).toBeTruthy();
      expect(l.url).toMatch(/^https:\/\//);
      expect(l.usage).toBeTruthy();
      expect(['font', 'runtime', 'build']).toContain(l.category);
    }
  });

  it('TC-V1-LIC-04 应用自身许可为 Apache-2.0', () => {
    expect(APP_LICENSE.license).toBe('Apache-2.0');
    expect(APP_LICENSE.url).toContain('apache.org');
  });

  it('TC-V1-LIC-05 仓库随附 NOTICE 与 THIRD-PARTY-NOTICES.md', () => {
    const notice = readFileSync(resolve(process.cwd(), 'NOTICE'), 'utf8');
    expect(notice).toContain('墨演 InkMotion');
    expect(notice).toContain('Apache');
    const tp = readFileSync(resolve(process.cwd(), 'THIRD-PARTY-NOTICES.md'), 'utf8');
    expect(tp).toContain('OFL');
    expect(tp).toContain('Arphic');
  });

  it('TC-V1-LIC-06 OFL.txt 实际存在于 public/fonts/seal/', () => {
    const ofl = readFileSync(resolve(process.cwd(), 'public/fonts/seal/OFL.txt'), 'utf8');
    expect(ofl).toMatch(/SIL OPEN FONT LICENSE|Copyright/i);
  });
});

describe('V1-C5 N5.3 版本一致性', () => {
  it('TC-V1-REL-01 应用版本与 package.json 一致（防漂移）', () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
      version: string;
    };
    expect(APP_VERSION).toBe(pkg.version);
  });

  it('TC-V1-REL-02 版本串格式正确（stable 通道输出 x.y.z）', () => {
    expect(versionString()).toMatch(/^\d+\.\d+\.\d+$/);
    expect(APP_VERSION).toBe('1.0.0');
  });

  it('TC-V1-REL-03 无 FontFace 环境下小篆字体来源标记为 none（jsdom 守卫）', () => {
    expect(getSealFontSource()).toBe('none');
  });
});

describe('V1-C5 i18n 新增词条完整性', () => {
  const NEW_KEYS = [
    'about.appLicense',
    'about.licenses',
    'about.licenses.note',
    'about.attribution',
    'about.licenseText',
    'about.bundledLicense',
    'about.thirdParty',
    'about.thirdParty.note',
    'help.browsers',
    'help.browsers.body',
  ];

  it('TC-V1-I18N-11 中文包含全部新增键', () => {
    for (const k of NEW_KEYS) expect(MESSAGES_ZH[k], `缺失 ${k}`).toBeTruthy();
  });

  it('TC-V1-I18N-12 英文包键集合与中文一致（无遗漏）', async () => {
    const en = await loadLang('en');
    expect(en).not.toBeNull();
    const zhKeys = Object.keys(MESSAGES_ZH).sort();
    const enKeys = Object.keys(en ?? {}).sort();
    expect(enKeys).toEqual(zhKeys);
    for (const k of NEW_KEYS) expect((en ?? {})[k], `英文缺失 ${k}`).toBeTruthy();
  });

  it('TC-V1-I18N-13 帮助页浏览器兼容性结论已落地（TBD-V1-04）', () => {
    expect(MESSAGES_ZH['help.browsers.body']).toMatch(/Chromium/);
    expect(MESSAGES_ZH['help.browsers.body']).toMatch(/1080×1920/);
  });
});
