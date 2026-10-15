// V2-C7 C6：载体参数与插件契约
//
// 向后兼容：CarrierParams 的扩展字段**全部可选**，缺省时行为与 V1/V2 旧版一致。

import type { CarrierType } from '@/db/types';

/** 钤印位（印章预留位置）。 */
export type SealPos = 'none' | 'tr' | 'br' | 'bl' | 'tl';

/** 载体渲染参数（取代旧版仅 backgroundColor 的 opts）。 */
export interface CarrierParams {
  /** 载体底色（用户可调） */
  backgroundColor: string;
  /** 色温 ∈ [-1,1]：-1 冷 / 0 中性 / 1 暖。缺省 0 */
  warmth?: number;
  /** 装裱边宽度比例 ∈ [0,0.15]（相对画布短边）。缺省按载体默认 */
  mountRatio?: number;
  /** 老化 / 做旧强度 ∈ [0,1]：斑驳、泛黄、边缘暗角。缺省 0.35 */
  aging?: number;
  /** 钤印位。缺省 'none' */
  sealPos?: SealPos;
  /** 确定性种子（导出一致性）。缺省按载体固定值 */
  seed?: number;
}

/** 兼容旧命名（V1/V2 时期的 opts 名为 CarrierRenderOpts）。 */
export type CarrierRenderOpts = CarrierParams;

export interface CarrierPlugin {
  type: CarrierType;
  /** 中文标签（i18n 键见 options.carrier.<type>） */
  label: string;
  /** 该载体是否提供装裱边参数（UI 据此决定是否显示控件） */
  supportsMount?: boolean;
  /** 该载体是否使用「底色」参数（如碑拓为黑底，底色仅影响纸面部分） */
  usesBackground?: boolean;
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    params: CarrierParams,
  ): void;
}

/** 参数归一化：填充缺省值，保证插件内部不必再判空。 */
export interface ResolvedParams {
  backgroundColor: string;
  warmth: number;
  aging: number;
  sealPos: SealPos;
  seed: number;
}

export function resolveParams(
  p: CarrierParams,
  defaults: { aging?: number; seed?: number } = {},
): ResolvedParams {
  return {
    backgroundColor: p.backgroundColor || '#f4ecd8',
    warmth: p.warmth ?? 0,
    aging: p.aging ?? defaults.aging ?? 0.35,
    sealPos: p.sealPos ?? 'none',
    seed: p.seed ?? defaults.seed ?? 20261014,
  };
}
