// V1-C5 N5.3：应用版本单一真源（About 页展示 / 遥测上报 / 发布检查单断言）。
// 注意：修改此处须同步 package.json 的 version 字段（单测 v1c5 会校验一致性）。

export const APP_VERSION = '1.0.0';
export const APP_NAME = '墨演 InkMotion';
/** 发行通道：stable（V1.0 正式发布）。 */
export const APP_CHANNEL = 'stable';

/** 完整版本串，如 `1.0.0`（stable 省略后缀）。 */
export function versionString(): string {
  return APP_CHANNEL === 'stable' ? APP_VERSION : `${APP_VERSION}-${APP_CHANNEL}`;
}
