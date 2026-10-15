import { useEffect, useRef, useState } from 'react';
import { Button, Input, toast } from '@/components';
import { useT } from '@/lib/useI18n';
import {
  putCustomStroke,
  listCustomStrokes,
  deleteCustomStroke,
  exportCustomStrokes,
  importCustomStrokes,
} from '@/db/database';
import type { CustomStrokeRecord } from '@/db/types';
import {
  invalidateCustomStrokes,
  primeCustomStrokes,
} from '@/engine/customStroke';
import { invalidateStrokeDataCache } from '@/engine/stroke';
import { invalidateKaiOutlineCache } from '@/engine/outline';

// 26 字母笔顺编码 → 笔画名（与 public/strokeorder/strokeorder.manifest.json 的 encoding 一致）
const ENCODING: Record<string, string> = {
  a: '撇点', b: '横折竖', c: '卧钩', d: '点', e: '竖', f: '横折钩/横撇', g: '横折',
  h: '提', i: '竖折折', j: '横', k: '横折提', l: '竖钩', m: '竖折', n: '捺', o: '弯钩',
  p: '撇折', q: '横折弯钩', r: '竖折', s: '撇', t: '竖提', u: '竖弯钩', v: '竖弯',
  w: '横折弯', x: '斜钩', y: '竖弯', z: '横折折',
};
const ORDER_ALPHABET = /^[a-z]+$/;

function decodeOrder(order: string): string {
  return [...order].map((c) => ENCODING[c] ?? c).join('·');
}

const muted: React.CSSProperties = { color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' };

/**
 * V2-C7 C4：用户定制兜底层（C 层）管理面板。
 * 允许用户为任意字录入/覆盖笔顺（26 字母编码），作为最高优先级兜底，
 * 覆盖 A+B 权威表；亦可导出/导入整层定制数据。
 */
export function CustomStrokeManager() {
  const t = useT();
  const [records, setRecords] = useState<CustomStrokeRecord[]>([]);
  const [char, setChar] = useState('');
  const [order, setOrder] = useState('');
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const list = await listCustomStrokes();
    setRecords(list);
    // 同步引擎内存缓存（C 层生效）
    primeCustomStrokes(list);
    invalidateStrokeDataCache();
    invalidateKaiOutlineCache();
  };

  useEffect(() => {
    refresh().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAdd = async () => {
    const c = char.trim();
    const o = order.trim();
    if (c.length !== 1) {
      toast.error(t('custom.needChar'));
      return;
    }
    if (!ORDER_ALPHABET.test(o) || o.length === 0) {
      toast.error(t('custom.needOrder'));
      return;
    }
    try {
      await putCustomStroke({ char: c, order: o, note: note.trim() || undefined });
      setChar('');
      setOrder('');
      setNote('');
      await refresh();
      toast.success(t('custom.saved', { char: c }));
    } catch {
      toast.error(t('custom.saveFail'));
    }
  };

  const onDelete = async (ch: string) => {
    await deleteCustomStroke(ch);
    invalidateCustomStrokes();
    await refresh();
    toast.success(t('custom.deleted'));
  };

  const onExport = async () => {
    const json = await exportCustomStrokes();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inkmotion-customstrokes.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('custom.exported'));
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const res = await importCustomStrokes(text);
      invalidateCustomStrokes();
      await refresh();
      toast.success(t('custom.imported', { n: res.imported, skip: res.skipped }));
    } catch {
      toast.error(t('custom.importFail'));
    }
  };

  return (
    <div>
      <p style={{ ...muted, marginBottom: 'var(--im-space-3)' }}>{t('custom.hint')}</p>

      <div style={{ display: 'flex', gap: 'var(--im-space-3)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ width: 96 }}>
          <Input label={t('custom.char')} value={char} onChange={(e) => setChar(e.target.value)} maxLength={2} placeholder="永" />
        </div>
        <div style={{ width: 220 }}>
          <Input label={t('custom.order')} value={order} onChange={(e) => setOrder(e.target.value)} placeholder="kresl" />
        </div>
        <div style={{ width: 160 }}>
          <Input label={t('custom.note')} value={note} onChange={(e) => setNote(e.target.value)} placeholder="" />
        </div>
      </div>
      {order && ORDER_ALPHABET.test(order) && (
        <p style={{ ...muted, marginTop: 'var(--im-space-2)' }}>
          {t('custom.decode')}: {decodeOrder(order)}
        </p>
      )}

      <div style={{ display: 'flex', gap: 'var(--im-space-3)', marginTop: 'var(--im-space-3)', alignItems: 'center' }}>
        <Button variant="primary" size="sm" onClick={onAdd}>
          {t('custom.add')}
        </Button>
        <Button variant="secondary" size="sm" onClick={onExport} disabled={records.length === 0}>
          {t('custom.export')}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          {t('custom.import')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportFile(f);
            e.target.value = '';
          }}
        />
      </div>

      <div style={{ marginTop: 'var(--im-space-3)' }}>
        {records.length === 0 ? (
          <p style={muted}>{t('custom.empty')}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {records.map((r) => (
              <li
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--im-space-3)',
                  padding: 'var(--im-space-2) 0',
                  borderBottom: '1px solid var(--im-color-line-strong)',
                }}
              >
                <span style={{ fontSize: 'var(--im-fs-lg)', width: 32 }}>{r.char}</span>
                <span style={{ ...muted, flex: 1 }}>
                  {r.order ? decodeOrder(r.order) : ''}
                  {r.note ? ` （${r.note}）` : ''}
                </span>
                <Button variant="danger" size="sm" onClick={() => onDelete(r.char)}>
                  {t('custom.delete')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
