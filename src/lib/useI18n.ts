// V1-C2 N2.2 i18n Hook / V1-C4 N4.3 按需加载
// 返回 t(key) 函数，自动跟随设置中的语言切换；切换到英文时动态加载英文包。
import { useCallback, useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/settings';
import { translate, loadLang } from '@/lib/i18n';

export function useT() {
  const lang = useSettingsStore((s) => s.language);
  const [packReady, setPackReady] = useState(lang === 'zh');

  useEffect(() => {
    let cancelled = false;
    if (lang === 'zh') {
      setPackReady(true);
      return;
    }
    setPackReady(false);
    loadLang(lang)
      .then(() => {
        if (!cancelled) setPackReady(true);
      })
      .catch(() => {
        // 加载失败：回退中文，不阻断 UI
        if (!cancelled) setPackReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  // packReady 变化时重建 t，确保英文包加载完成后文案刷新
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((key: string) => translate(key, lang), [lang, packReady]);
}
