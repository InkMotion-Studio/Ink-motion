// N5.2 前端可观测性（替代服务端监控，IM-OPS-001 §4）
// 纯前端铁律：不上传任何用户数据（文本/项目/字体）。仅上报匿名错误元数据。
// 默认「本地模式」：错误写入 IndexedDB 环形缓冲，供用户自查；Sentry 类接入须显式开启且用户授权。

import { setSetting, getSetting } from '@/db/database';

export interface ErrorReport {
  id: string;
  ts: number;
  message: string;
  stack?: string;
  source: 'error' | 'unhandledrejection' | 'manual';
  /** 环境信息（不含用户数据） */
  ua: string;
  url: string;
  appVersion: string;
}

export interface TelemetryConfig {
  /** 是否允许匿名错误上报（默认 false，须用户显式授权，IM-PRD-001 §5.2） */
  enabled: boolean;
  /** 上报端点（Sentry DSN 或自建 collector）；为空则仅本地留存 */
  endpoint?: string;
  maxLocal: number;
}

const APP_VERSION = '0.1.0';
const LOCAL_KEY = 'errorLog';
const DEFAULT_CFG: TelemetryConfig = { enabled: false, maxLocal: 50 };

let cfg: TelemetryConfig = { ...DEFAULT_CFG };
const buffer: ErrorReport[] = [];

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'e-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function initTelemetry(): Promise<void> {
  const saved = await getSetting<Partial<TelemetryConfig>>('telemetry', {});
  cfg = { ...DEFAULT_CFG, ...saved };
  const persisted = (await getSetting<ErrorReport[]>(LOCAL_KEY, [])) ?? [];
  buffer.push(...persisted.slice(-cfg.maxLocal));

  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    record({
      message: e.message,
      stack: e.error?.stack,
      source: 'error',
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason as { message?: string; stack?: string } | undefined;
    record({
      message: reason?.message ?? String(e.reason),
      stack: reason?.stack,
      source: 'unhandledrejection',
    });
  });
}

export function record(input: {
  message: string;
  stack?: string;
  source: ErrorReport['source'];
  /** 用户数据一律不得传入本函数 */
}): ErrorReport {
  const report: ErrorReport = {
    id: uuid(),
    ts: Date.now(),
    message: input.message.slice(0, 500), // 截断，避免误带长文本
    stack: input.stack?.slice(0, 2000),
    source: input.source,
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    url: typeof location !== 'undefined' ? location.origin + location.pathname : '',
    appVersion: APP_VERSION,
  };
  buffer.push(report);
  if (buffer.length > cfg.maxLocal) buffer.splice(0, buffer.length - cfg.maxLocal);
  // 本地留存（异步，不阻塞）
  void setSetting(LOCAL_KEY, buffer.slice(-cfg.maxLocal));
  // 仅在用户显式开启且配置端点时才外发（默认关闭）
  if (cfg.enabled && cfg.endpoint) {
    void flush([report]);
  }
  return report;
}

async function flush(reports: ErrorReport[]): Promise<void> {
  if (!cfg.endpoint) return;
  try {
    await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reports }),
      keepalive: true,
    });
  } catch {
    // 上报失败静默（不得影响用户体验）
  }
}

export function getErrorLog(): ErrorReport[] {
  return [...buffer];
}

export async function setTelemetry(patch: Partial<TelemetryConfig>): Promise<void> {
  cfg = { ...cfg, ...patch };
  await setSetting('telemetry', cfg);
}

export function getTelemetryConfig(): TelemetryConfig {
  return { ...cfg };
}

export function clearErrorLog(): void {
  buffer.length = 0;
  void setSetting(LOCAL_KEY, []);
}
