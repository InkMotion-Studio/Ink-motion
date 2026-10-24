// 引擎出口（N2.x 汇总）
export * from './types';
export { layoutText } from './layout';
export type { LayoutInput } from './layout';
export {
  loadStrokeData,
  preloadStrokeData,
  drawKaiGlyph,
  drawSongGlyph,
  isBlockedPath,
} from './stroke';
export { renderCarrier, CARRIER_PLUGINS } from './carrier';
export type { CarrierPlugin, CarrierRenderOpts } from './carrier';
export { Scene } from './scene';
export type { SceneOptions } from './scene';
export {
  detectCapabilities,
  exportVideo,
  ExportAbortError,
} from './exporter';
export type { ExportCapabilities, ExportRequest, ExportResult } from './exporter';
export { drawSealGlyph } from './stroke';
