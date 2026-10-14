// N2.6 导出引擎：WebM（MediaRecorder）保底 + MP4（WebCodecs H.264）增强 + 自动降级。
// 决策矩阵（IM-API-001 §4.4.3）：优先 MP4（可用且用户偏好时），否则 WebM 保底；
// 任一失败均降级到 WebM，并回传实际格式。
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export interface ExportCapabilities {
  webm: boolean;
  webcodecsMp4: boolean;
  recommended: 'webm' | 'mp4';
}

export function detectCapabilities(): ExportCapabilities {
  const webm =
    typeof MediaRecorder !== 'undefined' &&
    (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ||
      MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ||
      MediaRecorder.isTypeSupported('video/webm'));
  const webcodecsMp4 =
    typeof window !== 'undefined' &&
    'VideoEncoder' in window &&
    typeof Muxer !== 'undefined';
  return { webm, webcodecsMp4, recommended: webcodecsMp4 ? 'mp4' : 'webm' };
}

export interface ExportRequest {
  canvas: HTMLCanvasElement;
  fps: number;
  durationMs: number;
  render: (ctx: CanvasRenderingContext2D, t: number) => void;
  preferMp4?: boolean;
  onProgress?: (p: number) => void;
  /** V1-C3 N3.4：取消信号（abort 时抛出 AbortError） */
  signal?: AbortSignal;
}

/** 导出被取消时抛出的错误（调用方据此区分"用户取消"与"失败"） */
export class ExportAbortError extends Error {
  constructor() {
    super('导出已取消');
    this.name = 'ExportAbortError';
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new ExportAbortError();
}

export interface ExportResult {
  blob: Blob;
  format: 'webm' | 'mp4';
  sizeBytes: number;
  durationMs: number;
}

const BITRATE = 8_000_000;
const H264_CODEC = 'avc1.4d0028'; // Main Profile, Level 4.0（兼容 1080×1920）

function pickWebmMime(): string {
  const cands = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const c of cands) if (MediaRecorder.isTypeSupported(c)) return c;
  return 'video/webm';
}

export async function exportVideo(req: ExportRequest): Promise<ExportResult> {
  const caps = detectCapabilities();
  const wantMp4 = req.preferMp4 && caps.webcodecsMp4;
  if (wantMp4) {
    try {
      return await exportMp4(req);
    } catch (e) {
      console.warn('[exporter] MP4 编码失败，降级 WebM：', e);
      if (!caps.webm) throw e;
    }
  }
  if (caps.webm) return await exportWebm(req);
  throw new Error('当前浏览器不支持 WebM（MediaRecorder）与 MP4（WebCodecs），无法导出。');
}

// ===== WebM 保底：MediaRecorder 采样 canvas.captureStream =====
function exportWebm(req: ExportRequest): Promise<ExportResult> {
  const { canvas, fps, durationMs, render, onProgress } = req;
  const ctx = canvas.getContext('2d')!;
  const mime = pickWebmMime();
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: BITRATE });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const done = new Promise<ExportResult>((resolve) => {
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      resolve({ blob, format: 'webm', sizeBytes: blob.size, durationMs });
    };
  });
  const start = performance.now();
  rec.start(100);
  const tick = () => {
    throwIfAborted(req.signal); // V1-C3 N3.4：取消导出
    const elapsed = performance.now() - start;
    const t = Math.min(durationMs, elapsed);
    render(ctx, t);
    onProgress?.(t / durationMs);
    if (elapsed < durationMs) {
      requestAnimationFrame(tick);
    } else {
      render(ctx, durationMs);
      rec.stop();
    }
  };
  tick();
  return done;
}

// ===== MP4 增强：WebCodecs VideoEncoder + mp4-muxer =====
async function exportMp4(req: ExportRequest): Promise<ExportResult> {
  const { canvas, fps, durationMs, render, onProgress } = req;
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height, frameRate: fps },
    fastStart: 'in-memory',
  });
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      throw e;
    },
  });
  encoder.configure({ codec: H264_CODEC, width, height, bitrate: BITRATE, framerate: fps });

  const totalFrames = Math.max(1, Math.ceil((durationMs / 1000) * fps));
  for (let i = 0; i < totalFrames; i++) {
    throwIfAborted(req.signal); // V1-C3 N3.4：取消导出
    const t = (i / totalFrames) * durationMs;
    render(ctx, t);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps) });
    encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();
    onProgress?.(i / totalFrames);
    // 背压：编码队列过长时让出
    if (encoder.encodeQueueSize > 10) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  await encoder.flush();
  muxer.finalize();
  const { buffer } = muxer.target as ArrayBufferTarget;
  const blob = new Blob([buffer], { type: 'video/mp4' });
  return { blob, format: 'mp4', sizeBytes: blob.size, durationMs };
}
