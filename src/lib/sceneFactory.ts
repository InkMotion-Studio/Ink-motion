import { Scene, type SceneOptions } from '@/engine';
import type { Project } from '@/db/types';

export function projectToScene(project: Project): Scene {
  const o = project.options;
  const opts: SceneOptions = {
    text: project.text,
    width: o.width,
    height: o.height,
    fontSize: o.fontSize,
    carrier: o.carrier,
    fontFamily: o.fontFamily,
    strokeColor: o.strokeColor,
    backgroundColor: o.backgroundColor,
    writingSpeed: o.writingSpeed,
    scrollEnabled: o.scrollEnabled,
    outlineAnimation: o.outlineAnimation,
    // V2-C7 C6：载体观感参数（导出与预览必须同源，否则导出结果与所见不一致）
    warmth: o.warmth,
    aging: o.aging,
    mountRatio: o.mountRatio,
    sealPos: o.sealPos,
  };
  return new Scene(opts);
}
