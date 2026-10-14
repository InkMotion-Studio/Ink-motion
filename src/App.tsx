import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { HomePage } from '@/pages/Home';
import { EditorPage } from '@/pages/Editor';
import { ProjectsPage } from '@/pages/Projects';
import { SettingsPage } from '@/pages/Settings';
import { AboutPage } from '@/pages/About';
import { HelpPage } from '@/pages/Help';
import { useSettingsStore } from '@/store/settings';
import { useT } from '@/lib/useI18n';
import './app.css';

const NAV = [
  { to: '/', labelKey: 'nav.home' as const, end: true },
  { to: '/projects', labelKey: 'nav.projects' as const },
  { to: '/help', labelKey: 'nav.help' as const },
  { to: '/settings', labelKey: 'nav.settings' as const },
  { to: '/about', labelKey: 'nav.about' as const },
];

export default function App() {
  const location = useLocation();
  const inEditor = location.pathname.startsWith('/editor');
  const t = useT();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  return (
    <div className="im-app">
      <a href="#im-main" className="im-skip-link">
        跳到主内容
      </a>
      <header className="im-topbar">
        {/* 不设 aria-label：可访问名由可见文本 + sr-only 后缀构成，
            避免与可见文本冲突（axe label-content-name-mismatch） */}
        <NavLink to="/" className="im-logo">
          <span className="im-logo__mark">墨</span>
          <span className="im-logo__name">墨演 InkMotion</span>
          <span className="im-sr-only">首页</span>
        </NavLink>
        {!inEditor && (
          <nav className="im-topnav" aria-label="主导航">
            {NAV.filter((n) => n.to !== '/').map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => 'im-topnav__link' + (isActive ? ' is-active' : '')}
              >
                {t(n.labelKey)}
              </NavLink>
            ))}
            <button
              type="button"
              className="im-topnav__theme"
              aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </nav>
        )}
      </header>

      <main id="im-main" className="im-main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/editor/:id" element={<EditorPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  );
}
