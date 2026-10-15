// V2-C7 C6-S4：载体体系专项测试
//
// 覆盖目标（对应 C6 计划的 S4 验收要求）：
//   1. 注册完整性：10 种插件全部注册、类型键与 CarrierType 对齐、CARRIER_ORDER 无遗漏无重复；
//   2. 均不抛错：在 mock ctx 上、多种尺寸/参数组合下渲染均不抛错；
//   3. 非「单层色块」：每种载体产生的绘制调用远多于 2 次（多层材质合成）；
//   4. 参数生效：色温 / 做旧 / 装裱边 / 钤印位 / 底色改变时，绘制调用序列发生变化；
//   5. 确定性：同 seed 两次渲染的调用序列完全一致；不同 seed 至少一种载体序列不同；
//   6. 契约：resolveParams 归一化正确，label 非空，supportsMount 仅声明者置真。

import { describe, it, expect } from 'vitest';
import { createMockCtx } from './helpers/mockCanvas';
import {
  CARRIER_PLUGINS,
  CARRIER_ORDER,
  getCarrierPlugin,
  renderCarrier,
  resolveParams,
} from '@/engine/carrier';
import type { CarrierType } from '@/db/types';
import type { CarrierParams } from '@/engine/carrier';

const BASE: CarrierParams = { backgroundColor: '#f4ecd8' };

/** 在给定参数下渲染并返回绘制调用总量。 */
function drawCount(type: CarrierType, width = 800, height = 1200, params: CarrierParams = BASE) {
  const c = createMockCtx();
  renderCarrier(c.ctx, type, width, height, params);
  return Object.values(c.counts).reduce((a, b) => a + b, 0);
}

/** 捕获「有区分度」的绘制调用序列（用于参数生效 / 确定性比对）。 */
function drawSignature(type: CarrierType, params: CarrierParams, seed?: number) {
  const c = createMockCtx();
  renderCarrier(c.ctx, type, 800, 1200, seed === undefined ? params : { ...params, seed });
  // 调用计数 + 渐变颜色串 + 样式赋值串（三者都随参数变化，排除不可比较的渐变对象本身）
  return JSON.stringify({ counts: c.counts, gradients: c.gradients, styles: c.styles });
}

describe('C6-S4 载体注册完整性', () => {
  it('10 种载体全部注册，键与 type 字段一致', () => {
    const keys = Object.keys(CARRIER_PLUGINS) as CarrierType[];
    expect(keys).toHaveLength(10);
    for (const k of keys) {
      expect(CARRIER_PLUGINS[k].type).toBe(k);
    }
  });

  it('CARRIER_ORDER 覆盖全部插件且无重复', () => {
    expect(new Set(CARRIER_ORDER).size).toBe(CARRIER_ORDER.length);
    expect([...CARRIER_ORDER].sort()).toEqual(
      (Object.keys(CARRIER_PLUGINS) as CarrierType[]).sort(),
    );
  });

  it('每种载体都有非空中文 label', () => {
    for (const k of CARRIER_ORDER) {
      const label = CARRIER_PLUGINS[k].label;
      expect(typeof label).toBe('string');
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it('getCarrierPlugin 对未知类型回退到纸（不抛错）', () => {
    const p = getCarrierPlugin('nonexistent' as CarrierType);
    expect(p.type).toBe('paper');
  });

  it('supportsMount 仅立轴/手卷/绢帛声明', () => {
    const withMount = CARRIER_ORDER.filter((k) => CARRIER_PLUGINS[k].supportsMount);
    expect([...withMount].sort()).toEqual(['handscroll', 'scroll', 'silk'].sort());
  });

  it('usesBackground：纸绢类与硬质载体均声明使用底色参数', () => {
    // 十种载体全部以用户底色为基色（硬质载体如碑拓则底色作用于拓面），故均置真。
    const withBg = CARRIER_ORDER.filter((k) => CARRIER_PLUGINS[k].usesBackground);
    expect(withBg).toHaveLength(10);
  });
});

describe('C6-S4 渲染不抛错', () => {
  const sizes: [number, number][] = [
    [400, 600],
    [800, 1200],
    [1600, 2560],
    [300, 300], // 极端方形
  ];
  for (const [w, h] of sizes) {
    it(`${w}×${h} 全载体不抛错`, () => {
      for (const k of CARRIER_ORDER) {
        expect(() => renderCarrier(createMockCtx().ctx, k, w, h, BASE)).not.toThrow();
      }
    });
  }

  it('极端参数（色温±1 / 做旧 0..1 / 装裱边 0..0.15 / 各钤印位）均不抛错', () => {
    const variants: CarrierParams[] = [
      { backgroundColor: '#fff', warmth: -1, aging: 0, mountRatio: 0, sealPos: 'none' },
      { backgroundColor: '#000', warmth: 1, aging: 1, mountRatio: 0.15, sealPos: 'tr' },
      { backgroundColor: '#f4ecd8', warmth: 0.5, aging: 0.8, mountRatio: 0.1, sealPos: 'br' },
      { backgroundColor: '#e8dcc0', warmth: -0.5, aging: 0.2, mountRatio: 0.05, sealPos: 'bl' },
      { backgroundColor: '#cbbf9f', warmth: 0, aging: 0.5, mountRatio: 0.08, sealPos: 'tl' },
    ];
    for (const k of CARRIER_ORDER) {
      for (const v of variants) {
        expect(() => renderCarrier(createMockCtx().ctx, k, 800, 1200, v)).not.toThrow();
      }
    }
  });
});

describe('C6-S4 非「单层色块」', () => {
  it('每种载体的绘制调用远多于 2 次（多层材质合成）', () => {
    for (const k of CARRIER_ORDER) {
      expect(drawCount(k), `${k} 绘制调用过少`).toBeGreaterThan(5);
    }
  });

  it('纸张族材质同时使用路径填充与描边（非纯单次整幅填充）', () => {
    const c = createMockCtx();
    renderCarrier(c.ctx, 'paper', 800, 1200, BASE);
    // 纸纹由大量细颗粒/纤维条带绘制而成，而非一次整幅铺色
    expect(c.counts.fillRect ?? 0).toBeGreaterThan(20);
    expect(c.counts.beginPath ?? 0).toBeGreaterThan(2);
  });

  it('硬质载体（竹简）绘制多个独立竹片（rect/fill 调用量大）', () => {
    const c = createMockCtx();
    renderCarrier(c.ctx, 'bamboo', 800, 1200, BASE);
    const rectLike = (c.counts.fillRect ?? 0) + (c.counts.fill ?? 0) + (c.counts.rect ?? 0);
    expect(rectLike).toBeGreaterThan(8);
  });

  it('团扇使用放射状扇骨（大量 lineTo/rotate/arc）', () => {
    const c = createMockCtx();
    renderCarrier(c.ctx, 'fan', 800, 1200, BASE);
    expect(c.counts.lineTo + (c.counts.rotate ?? 0) + (c.counts.arc ?? 0)).toBeGreaterThan(10);
  });
});

describe('C6-S4 参数生效', () => {
  it('色温改变影响绘制序列（纸张）', () => {
    const cool = drawSignature('paper', { backgroundColor: '#f4ecd8', warmth: -1 });
    const warm = drawSignature('paper', { backgroundColor: '#f4ecd8', warmth: 1 });
    expect(cool).not.toBe(warm);
  });

  it('做旧强度改变影响绘制序列（绢帛，做旧产生斑驳层）', () => {
    const clean = drawSignature('silk', { backgroundColor: '#efe4cf', aging: 0 });
    const aged = drawSignature('silk', { backgroundColor: '#efe4cf', aging: 1 });
    expect(clean).not.toBe(aged);
  });

  it('装裱边宽度改变影响绘制序列（立轴）', () => {
    const thin = drawSignature('scroll', { backgroundColor: '#efe6d2', mountRatio: 0.02 });
    const thick = drawSignature('scroll', { backgroundColor: '#efe6d2', mountRatio: 0.14 });
    expect(thin).not.toBe(thick);
  });

  it('钤印位改变影响绘制序列（信笺）', () => {
    const none = drawSignature('letter', { backgroundColor: '#f7f1e2', sealPos: 'none' });
    const tr = drawSignature('letter', { backgroundColor: '#f7f1e2', sealPos: 'tr' });
    expect(none).not.toBe(tr);
  });

  it('底色改变影响绘制序列（纸）', () => {
    const a = drawSignature('paper', { backgroundColor: '#ffffff' });
    const b = drawSignature('paper', { backgroundColor: '#3a2f20' });
    expect(a).not.toBe(b);
  });
});

describe('C6-S4 确定性（导出一致性）', () => {
  it('同 seed 两次渲染调用序列完全一致（抽样全部载体）', () => {
    for (const k of CARRIER_ORDER) {
      const s1 = drawSignature(k, BASE, 12345);
      const s2 = drawSignature(k, BASE, 12345);
      expect(s1, `${k} 非确定性`).toBe(s2);
    }
  });

  it('未指定 seed 时使用载体固定种子，亦保持确定性', () => {
    for (const k of CARRIER_ORDER) {
      expect(drawSignature(k, BASE)).toBe(drawSignature(k, BASE));
    }
  });

  it('不同 seed 至少对一种载体产生不同序列（种子确实参与合成）', () => {
    const differs = CARRIER_ORDER.some(
      (k) => drawSignature(k, BASE, 1) !== drawSignature(k, BASE, 999999),
    );
    expect(differs).toBe(true);
  });
});

describe('C6-S4 resolveParams 契约', () => {
  it('缺省填充：warmth=0 / aging=0.35 / sealPos=none / seed=载体默认', () => {
    const r = resolveParams({ backgroundColor: '#abc' }, { seed: 77 });
    expect(r.backgroundColor).toBe('#abc');
    expect(r.warmth).toBe(0);
    expect(r.aging).toBe(0.35);
    expect(r.sealPos).toBe('none');
    expect(r.seed).toBe(77);
  });

  it('显式值优先于默认值', () => {
    const r = resolveParams(
      { backgroundColor: '#000', warmth: 1, aging: 0.9, sealPos: 'br', seed: 5 },
      { seed: 77, aging: 0.1 },
    );
    expect(r.warmth).toBe(1);
    expect(r.aging).toBe(0.9);
    expect(r.sealPos).toBe('br');
    expect(r.seed).toBe(5);
  });

  it('空底色回退到宣纸暖白', () => {
    expect(resolveParams({ backgroundColor: '' }).backgroundColor).toBe('#f4ecd8');
  });
});
