import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ToastContainer } from '@/components';
import { useSettingsStore } from '@/store/settings';
import { precacheAssets } from '@/lib/assets';
import { preloadTextures } from '@/lib/textures';
import { initTelemetry } from '@/lib/telemetry';
import './styles/global.css';
import './components/components.css';

// 应用启动：初始化错误上报（N5.2）→ 设置 → 预缓存资产与纹理（N0.4）→ 渲染
async function bootstrap() {
  await initTelemetry().catch(() => undefined);
  await useSettingsStore.getState().init();
  // 资产/纹理预加载失败不阻断首屏（纹理为可选增强，缺失时载体回退程序化渲染）
  precacheAssets().catch(() => undefined);
  preloadTextures().catch(() => undefined);

  const root = createRoot(document.getElementById('root')!);
  root.render(
    <StrictMode>
      <HashRouter>
        <App />
        <ToastContainer />
      </HashRouter>
    </StrictMode>,
  );
}

void bootstrap();
