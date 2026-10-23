// 引擎出口（N2.x 汇总）
export * from './types';
export { layoutText } from './layout';
export type { LayoutInput } from './layout';
export {
  loadStrokeData,
  preloadStrokeData,
  invalidateStrokeDataCache,
  drawKaiGlyph,
  drawSongGlyph,
  buildStrokePaths,
  isBlockedPath,
} from './stroke';
export type { StrokePaths, FlatSeg } from './stroke';
// C5：统一书写基元（观感层）
export {
  DEFAULT_INK_STYLE,
  WHOLE_GLYPH_INK_STYLE,
  OUTLINE_INK_STYLE,
  inkStyle,
  easeSinceWrite,
  linearProgress,
  progressByStyle,
  strokeWidthAt,
  alphaAt,
  computeGlyphTransform,
  applyGlyphTransform,
  outlineBox,
  designLineWidth,
} from './draw';
export type { InkStyle, GlyphTransform } from './draw';
export {
  setCustomStrokeLoader,
  getCustomStrokeOrder,
  getCustomOutline,
  invalidateCustomStrokes,
  primeCustomStrokes,
} from './customStroke';
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
export { drawSealGlyph, drawStrokeGlyph } from './stroke';
export type { StrokePaths, FlatSeg } from './stroke';
export { getKaiStrokeGlyph, invalidateKaiStrokeCache } from './kaiStrokeData';
export type { StrokeGlyph, StrokeSegment, StrokeFidelity } from './types';
