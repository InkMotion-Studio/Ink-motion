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
  };
  return new Scene(opts);
}
