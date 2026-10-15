// V2-C7 C6：载体引擎出口（10 种实体中国传统形制）
//
// 契约：CarrierPlugin 仅负责背景绘制（前景字形由场景层叠加）。
// 全部为程序化材质合成（多层），零外网依赖；纹理资产若存在仅作叠加增强。
//
// 兼容：原 `src/engine/carrier.ts` 已重构为目录，入口签名保持
//   renderCarrier(ctx, type, width, height, opts) 不变。

import type { CarrierType } from '@/db/types';
import { paper, silk, letter, gold } from './plugins/paperFamily';
import { bamboo, wood, rubbing } from './plugins/solidFamily';
import { scroll, handscroll, fan } from './plugins/mountFamily';
import type { CarrierParams, CarrierPlugin } from './types';

export type { CarrierParams, CarrierPlugin, CarrierRenderOpts, SealPos, ResolvedParams } from './types';
export { resolveParams } from './types';

/** 全部载体插件注册表（类型键不变者向后兼容）。 */
export const CARRIER_PLUGINS: Record<CarrierType, CarrierPlugin> = {
  paper,
  bamboo,
  silk,
  letter,
  gold,
  wood,
  rubbing,
  scroll,
  handscroll,
  fan,
};

/** 载体展示顺序（UI 下拉按此序）。 */
export const CARRIER_ORDER: CarrierType[] = [
  'paper',
  'scroll',
  'handscroll',
  'silk',
  'letter',
  'gold',
  'bamboo',
  'wood',
  'rubbing',
  'fan',
];

export function getCarrierPlugin(type: CarrierType): CarrierPlugin {
  return CARRIER_PLUGINS[type] ?? CARRIER_PLUGINS.paper;
}

export function renderCarrier(
  ctx: CanvasRenderingContext2D,
  type: CarrierType,
  width: number,
  height: number,
  opts: CarrierParams,
): void {
  getCarrierPlugin(type).render(ctx, width, height, opts);
}
