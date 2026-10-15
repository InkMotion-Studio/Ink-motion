import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomStrokeManager } from '@/components/CustomStrokeManager';
import { db, listCustomStrokes } from '@/db/database';
import { __resetCustomStrokes } from '@/engine/customStroke';

beforeEach(async () => {
  await db.customstrokes.clear();
  __resetCustomStrokes();
});

describe('V2-C7 C4 用户定制管理面板', () => {
  it('渲染标题与空态', () => {
    render(<CustomStrokeManager />);
    expect(screen.getByLabelText('字符')).toBeInTheDocument();
    expect(screen.getByLabelText('笔顺编码')).toBeInTheDocument();
  });

  it('录入合法定制后写入 DB 并出现在列表', async () => {
    render(<CustomStrokeManager />);
    fireEvent.change(screen.getByLabelText('字符'), { target: { value: '永' } });
    fireEvent.change(screen.getByLabelText('笔顺编码'), { target: { value: 'kresl' } });
    fireEvent.click(screen.getByRole('button', { name: '保存定制' }));
    await waitFor(async () => {
      const list = await listCustomStrokes();
      expect(list.length).toBe(1);
      expect(list[0].order).toBe('kresl');
    });
    // 解码提示（横折提·竖折·竖·撇·竖钩）
    await waitFor(() => {
      expect(screen.getAllByText(/横折提/).length).toBeGreaterThan(0);
    });
  });

  it('非法笔顺编码不写入', async () => {
    render(<CustomStrokeManager />);
    fireEvent.change(screen.getByLabelText('字符'), { target: { value: '永' } });
    fireEvent.change(screen.getByLabelText('笔顺编码'), { target: { value: 'ABC1' } });
    fireEvent.click(screen.getByRole('button', { name: '保存定制' }));
    await new Promise((r) => setTimeout(r, 50));
    expect((await listCustomStrokes()).length).toBe(0);
  });

  it('删除列表项后记录移除', async () => {
    render(<CustomStrokeManager />);
    fireEvent.change(screen.getByLabelText('字符'), { target: { value: '好' } });
    fireEvent.change(screen.getByLabelText('笔顺编码'), { target: { value: 'msjegj' } });
    fireEvent.click(screen.getByRole('button', { name: '保存定制' }));
    await waitFor(async () => expect((await listCustomStrokes()).length).toBe(1));
    fireEvent.click(screen.getByRole('button', { name: '删除' }));
    await waitFor(async () => expect((await listCustomStrokes()).length).toBe(0));
  });
});
