// V2-C2 N2.2：隶书受限字库浏览面板
// 展示隶书字表可用今字（供用户参考"哪些字可渲染"），纯本地读取、无上传。
// 字表未随包（待提供）时，展示信息性提示而非空面板。
import { useEffect, useState } from 'react';
import { getLiCharset, computeLiOutOfRange } from '@/lib/useLi';
import { useT } from '@/lib/useI18n';

export interface LiCharsetPanelProps {
  /** 当前文本，用于高亮"在库/越界"状态 */
  text?: string;
}

export function LiCharsetPanel({ text = '' }: LiCharsetPanelProps) {
  const t = useT();
  const [chars, setChars] = useState<string[]>([]);
  const [version, setVersion] = useState<string>('');
  const [available, setAvailable] = useState<boolean>(true);
  const [outRange, setOutRange] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getLiCharset()
      .then((cs) => {
        if (cancelled) return;
        setAvailable(cs !== null);
        setVersion(cs?.version ?? '');
        const list = cs ? Array.from(new Set(cs.glyphs.flatMap((g) => g.modernChars))).sort() : [];
        setChars(list);
        setOutRange(new Set(computeLiOutOfRange(text, cs)));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <div className="im-li-panel" aria-label={available ? t('li.panelTitle', { n: chars.length }) : t('li.panelTitlePending')}>
      <div className="im-li-panel__head">
        <span>{available ? t('li.panelTitle', { n: chars.length }) : t('li.panelTitlePending')}</span>
        <span className="im-li-panel__version">{version}</span>
      </div>
      {available ? (
        <>
          <p className="im-li-panel__tip">{t('li.panelNote')}</p>
          <div className="im-li-panel__grid" role="list">
            {chars.map((ch) => {
              const out = outRange.has(ch);
              return (
                <span
                  key={ch}
                  role="listitem"
                  className={out ? 'im-li-panel__cell im-li-panel__cell--out' : 'im-li-panel__cell'}
                  title={out ? t('li.panelOutOfRange', { ch }) : ch}
                >
                  {ch}
                </span>
              );
            })}
          </div>
        </>
      ) : (
        <p className="im-li-panel__tip im-li-panel__tip--pending" role="status">
          {t('li.panelPending')}
        </p>
      )}
    </div>
  );
}
