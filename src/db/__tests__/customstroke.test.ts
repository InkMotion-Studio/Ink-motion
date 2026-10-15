import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  db,
  putCustomStroke,
  getCustomStroke,
  listCustomStrokes,
  deleteCustomStroke,
  exportCustomStrokes,
  importCustomStrokes,
  isValidOrder,
} from '@/db/database';

beforeEach(async () => {
  await db.customstrokes.clear();
});

describe('V2-C7 C4 用户定制兜底层（C 层）存储', () => {
  it('写入后可读取，id 固定为字符（一字一条）', async () => {
    const r = await putCustomStroke({ char: '永', order: 'kresl' });
    expect(r.id).toBe('永');
    expect(r.char).toBe('永');
    const got = await getCustomStroke('永');
    expect(got?.order).toBe('kresl');
  });

  it('重复写入同字为覆盖（不新增记录）', async () => {
    await putCustomStroke({ char: '永', order: 'kresl' });
    await putCustomStroke({ char: '永', order: 'sl' });
    const all = await listCustomStrokes();
    expect(all.length).toBe(1);
    expect(all[0].order).toBe('sl');
  });

  it('笔顺编码非法时拒绝写入', async () => {
    await expect(putCustomStroke({ char: '永', order: 'ABC1' })).rejects.toThrow();
    await expect(putCustomStroke({ char: '永', order: 're' })).resolves.toBeTruthy(); // 合法小写字母
  });

  it('非单字符拒绝写入', async () => {
    await expect(putCustomStroke({ char: '永和', order: 's' })).rejects.toThrow();
  });

  it('删除后不可读取', async () => {
    await putCustomStroke({ char: '永', order: 'kresl' });
    await deleteCustomStroke('永');
    expect(await getCustomStroke('永')).toBeUndefined();
  });

  it('导出→导入闭环：记录可完整还原', async () => {
    await putCustomStroke({ char: '永', order: 'kresl', note: '测试' });
    await putCustomStroke({ char: '好', order: 'msjegj' });
    const json = await exportCustomStrokes();
    await db.customstrokes.clear();
    const res = await importCustomStrokes(json);
    expect(res.imported).toBe(2);
    expect(res.skipped).toBe(0);
    expect((await getCustomStroke('永'))?.order).toBe('kresl');
    expect((await getCustomStroke('好'))?.note).toBeUndefined();
  });

  it('导入时非法条目被跳过（不中断）', async () => {
    const bad = JSON.stringify({
      type: 'inkmotion-customstrokes',
      version: 1,
      records: [
        { char: '永', order: 'kresl' },
        { char: '好', order: 'INVALID!' }, // 非法编码
        { char: 'ab', order: 's' }, // 非单字符
        { char: '中', order: 'fcjf' },
      ],
    });
    const res = await importCustomStrokes(bad);
    expect(res.imported).toBe(2);
    expect(res.skipped).toBe(2);
  });

  it('导入非 JSON 抛错', async () => {
    await expect(importCustomStrokes('not json')).rejects.toThrow();
  });

  it('isValidOrder 校验 26 字母编码', () => {
    expect(isValidOrder('kresl')).toBe(true);
    expect(isValidOrder('a')).toBe(true);
    expect(isValidOrder('ABC')).toBe(false);
    expect(isValidOrder('')).toBe(false);
    expect(isValidOrder('a1')).toBe(false);
  });
});
