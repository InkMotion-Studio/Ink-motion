// V1-C1 N1.3：受限字库浏览面板
// 展示当前小篆字库可用今字（供用户参考"哪些字可渲染"），纯本地读取，无上传。
import { useEffect, useState } from 'react';
import { getSealCharset, computeOutOfRange } from '@/lib/useSeal';
import { useT } from '@/lib/useI18n';

export interface SealCharsetPanelProps {
  /** 当前文本，用于高亮"在库/越界"状态 */
  text?: string;
}

export function SealCharsetPanel({ text = '' }: SealCharsetPanelProps) {
  const t = useT();
  const [chars, setChars] = useState<string[]>([]);
  const [version, setVersion] = useState<string>('');
  const [outRange, setOutRange] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getSealCharset()
      .then((cs) => {
        if (cancelled) return;
        setVersion(cs.version);
        const list = Array.from(new Set(cs.glyphs.flatMap((g) => g.modernChars))).sort();
        setChars(list);
        setOutRange(new Set(computeOutOfRange(text, cs)));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <div className="im-seal-panel" aria-label={t('seal.panelTitle', { n: chars.length })}>
      <div className="im-seal-panel__head">
        <span>{t('seal.panelTitle', { n: chars.length })}</span>
        <span className="im-seal-panel__version">{version}</span>
      </div>
      <p className="im-seal-panel__tip">{t('seal.panelNote')}</p>
      <div className="im-seal-panel__grid" role="list">
        {chars.map((ch) => {
          const out = outRange.has(ch);
          return (
            <span
              key={ch}
              role="listitem"
              className={out ? 'im-seal-panel__cell im-seal-panel__cell--out' : 'im-seal-panel__cell'}
              title={out ? t('seal.panelOutOfRange', { ch }) : ch}
            >
              {ch}
            </span>
          );
        })}
      </div>
    </div>
  );
}
