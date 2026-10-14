import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ToastContainer } from '@/components';
import { useSettingsStore } from '@/store/settings';
import { precacheAssets } from '@/lib/assets';
import { preloadTextures } from '@/lib/textures';
import { initTelemetry } from '@/lib/telemetry';
import { registerSealFont } from '@/lib/seal';
import { registerLiFont } from '@/lib/lishu';
import './styles/global.css';
import './components/components.css';

// 应用启动：初始化错误上报（N5.2）→ 设置 → 预缓存资产与纹理（N0.4）→ 渲染
async function bootstrap() {
  await initTelemetry().catch(() => undefined);
  await useSettingsStore.getState().init();
  // 资产/纹理预加载失败不阻断首屏（纹理为可选增强，缺失时载体回退程序化渲染）
  precacheAssets().catch(() => undefined);
  preloadTextures().catch(() => undefined);
  // V1-C1：注册小篆字体（纯本地静态资源；失败降级，不阻断首屏）
  registerSealFont().catch(() => undefined);
  // V2-C2：注册隶书字体（资产待提供，缺失时静默跳过；失败不阻断首屏）
  registerLiFont().catch(() => undefined);

  // V1-C2 N2.1：主题驱动 <html data-theme>，并订阅后续切换
  const applyTheme = (theme: string) => {
    document.documentElement.dataset.theme = theme;
  };
  applyTheme(useSettingsStore.getState().theme);
  useSettingsStore.subscribe((s) => applyTheme(s.theme));
  // V1-C2 N2.2：语言驱动 <html lang>
  const applyLang = (lang: string) => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  };
  applyLang(useSettingsStore.getState().language);
  useSettingsStore.subscribe((s) => applyLang(s.language));

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
