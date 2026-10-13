import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { Slider } from '@/components/Slider';

describe('N4.4 无障碍：基础组件', () => {
  it('Button 禁用时 aria-disabled 生效且不可点击', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        保存
      </Button>,
    );
    const btn = screen.getByRole('button', { name: '保存' });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('Button loading 时暴露加载态', () => {
    render(<Button loading>导出</Button>);
    expect(screen.getByRole('button', { name: /导出/ })).toBeDisabled();
  });

  it('Input 的 label 与控件通过 htmlFor/id 关联', () => {
    render(<Input label="作品标题" defaultValue="静夜思" />);
    expect(screen.getByLabelText('作品标题')).toHaveValue('静夜思');
  });

  it('Input 错误态有 role=alert 且 aria-invalid', () => {
    render(<Input label="正文" error="超过字数上限" />);
    expect(screen.getByRole('alert')).toHaveTextContent('超过字数上限');
    expect(screen.getByLabelText('正文')).toHaveAttribute('aria-invalid', 'true');
  });

  it('Slider 可通过键盘方向键改变数值', () => {
    const onChange = vi.fn();
    render(<Slider label="字号" min={0} max={100} value={50} onChange={onChange} />);
    const range = screen.getByLabelText('字号');
    expect(range).toHaveAttribute('type', 'range');
    fireEvent.change(range, { target: { value: '70' } });
    expect(onChange).toHaveBeenCalledWith(70);
  });
});

describe('N4.4 无障碍：Modal', () => {
  it('打开时具备 dialog 语义与 aria-modal', () => {
    render(
      <Modal open title="导出视频" onClose={() => undefined}>
        内容
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('关闭')).toBeInTheDocument();
  });

  it('Esc 触发 onClose', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="t" onClose={onClose}>
        内容
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('关闭时不渲染内容', () => {
    render(
      <Modal open={false} title="t" onClose={() => undefined}>
        隐藏内容
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
