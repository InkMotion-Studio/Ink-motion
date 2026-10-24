import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// 纯前端应用：无服务端。构建产物为静态文件，可托管于任意静态空间。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5173,
    host: true,
  },
  // 资源版本化：字体/纹理/字库经 CDN 以 inkmotion-assets-v3 命名空间托管（N1.5 / IM-DB-001 §6.3）
  // 未配置 VITE_ASSET_CDN 时，资产清单直接引用 public/ 同源路径（见 src/lib/assets.ts）。
  assetsDir: 'assets',
  // 字体/字库一律不内联为 data URI：体积大且需独立缓存与许可随附（OFL.txt）
  assetsInlineLimit: 4096,
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
