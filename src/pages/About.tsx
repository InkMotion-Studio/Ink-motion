import { Card } from '@/components';
import { FONT_CATALOG } from '@/lib/fonts';

export function AboutPage() {
  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 'var(--im-fs-2xl)' }}>关于与致谢</h1>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">墨演 InkMotion</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          纯前端古典中文风格视频生成器。竖排右起、逐笔书写、宣纸竹简载体，本地生成 WebM / MP4，文本永不离开浏览器。
        </p>
        <p style={{ color: 'var(--im-color-ink-faint)', fontSize: 'var(--im-fs-xs)' }}>
          版本 0.1.0 · 许可 Apache-2.0（应用代码）
        </p>
      </Card>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">字体许可与署名（IM-UI-001 §6.5.1 / IM-API-001 §5.1）</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {FONT_CATALOG.map((f) => (
            <li
              key={f.family}
              style={{
                padding: 'var(--im-space-3) 0',
                borderBottom: '1px solid var(--im-color-line)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{f.label}</strong>
                <span
                  style={{
                    fontSize: 'var(--im-fs-xs)',
                    color: f.available ? 'var(--im-color-success)' : 'var(--im-color-danger)',
                  }}
                >
                  {f.available ? f.license : '阻塞·未就绪'}
                </span>
              </div>
              <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)', margin: '4px 0' }}>
                {f.attribution}
              </p>
              <a href={f.licenseUrl} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--im-fs-xs)' }}>
                许可文本 ↗
              </a>
              {f.note && (
                <p style={{ color: 'var(--im-color-danger)', fontSize: 'var(--im-fs-xs)', margin: '4px 0 0' }}>
                  {f.note}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="im-card__title">开源依赖</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          本应用使用 React、Zustand、Dexie、Hanzi Writer、Vite 等开源项目，遵循各自许可。完整规划文档见仓库
          <code style={{ fontFamily: 'var(--im-font-mono)' }}> docs/</code> 目录。
        </p>
      </Card>
    </div>
  );
}
