import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Select, toast } from '@/components';
import { useSettingsStore } from '@/store/settings';
import {
  clearErrorLog,
  getErrorLog,
  getTelemetryConfig,
  setTelemetry,
} from '@/lib/telemetry';

function useStorageEstimate(): string {
  const [info, setInfo] = useState('计算中…');
  useEffect(() => {
    const estimate = async () => {
      // 估算 IndexedDB 占用（navigator.storage.estimate 为近似值）
      if (navigator.storage?.estimate) {
        const { usage } = await navigator.storage.estimate();
        setInfo(usage ? `${(usage / 1024 / 1024).toFixed(2)} MB` : '未知');
      } else {
        setInfo('当前浏览器不支持存储估算');
      }
    };
    estimate();
  }, []);
  return info;
}

export function SettingsPage() {
  const s = useSettingsStore();
  const navigate = useNavigate();
  const storage = useStorageEstimate();
  const [reduced, setReduced] = useState(s.reduceMotion);
  const [telemetry, setTelemetryState] = useState(getTelemetryConfig());
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    setErrorCount(getErrorLog().length);
  }, []);

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 'var(--im-fs-2xl)' }}>设置</h1>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">偏好</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--im-space-4)' }}>
          <Select
            label="主题"
            value={s.theme}
            options={[
              { value: 'light', label: '浅色（MVP）' },
              { value: 'dark', label: '深色（V1.0 计划）' },
            ]}
            onChange={(v) => s.setTheme(v as 'light' | 'dark')}
            hint="深色主题将在 V1.0 启用"
          />
          <Select
            label="语言"
            value={s.language}
            options={[
              { value: 'zh', label: '简体中文（MVP）' },
              { value: 'en', label: 'English（V1.0 计划）' },
            ]}
            onChange={(v) => s.setLanguage(v as 'zh' | 'en')}
            hint="英文 i18n 将在 V1.0 启用"
          />
          <Select
            label="默认载体"
            value={s.defaultCarrier}
            options={[
              { value: 'paper', label: '宣纸卷轴' },
              { value: 'bamboo', label: '竹简' },
            ]}
            onChange={(v) => s.setDefaultCarrier(v as 'paper' | 'bamboo')}
          />
          <label style={{ fontSize: 'var(--im-fs-sm)', color: 'var(--im-color-ink-soft)' }}>
            <input
              type="checkbox"
              checked={reduced}
              onChange={(e) => {
                setReduced(e.target.checked);
                s.setReduceMotion(e.target.checked);
              }}
            />{' '}
            减少动画（尊重系统 prefers-reduced-motion）
          </label>
        </div>
      </Card>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">隐私</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          墨演是纯前端应用：你的文本、项目与字体仅存储于本机浏览器（IndexedDB + Cache
          API），不会上传到任何服务器。导出视频也完全在本地生成。如需彻底清除，可使用下方按钮。
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (window.confirm('确认清除全部本地数据（项目/导出/设置）？')) {
              indexedDB.deleteDatabase('inkmotion');
              toast.success('已请求清除，刷新后生效');
            }
          }}
        >
          清除本地数据
        </Button>
      </Card>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">存储</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          本地数据库占用估算：<strong>{storage}</strong>
        </p>
      </Card>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">诊断</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          错误日志仅保存在本机（不上传）。默认关闭匿名错误上报；开启后仅发送错误元数据（不含文本/项目内容）。
        </p>
        <p style={{ color: 'var(--im-color-ink-faint)', fontSize: 'var(--im-fs-xs)' }}>
          本地记录错误数：<strong>{errorCount}</strong>
        </p>
        <div style={{ display: 'flex', gap: 'var(--im-space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 'var(--im-fs-sm)', color: 'var(--im-color-ink-soft)' }}>
            <input
              type="checkbox"
              checked={telemetry.enabled}
              onChange={(e) => {
                void setTelemetry({ enabled: e.target.checked });
                setTelemetryState(getTelemetryConfig());
                toast.success(e.target.checked ? '已开启匿名错误上报' : '已关闭错误上报');
              }}
            />{' '}
            允许匿名错误上报（默认关闭）
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearErrorLog();
              setErrorCount(0);
              toast.success('已清空本地错误日志');
            }}
          >
            清空错误日志
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="im-card__title">关于与致谢</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          墨演 InkMotion · MVP。字体与开源组件遵循各自许可，详见
          <Button variant="ghost" size="sm" onClick={() => navigate('/about')}>
            关于与致谢
          </Button>
          页。
        </p>
      </Card>
    </div>
  );
}
