import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { HomePage } from '@/pages/Home';
import { EditorPage } from '@/pages/Editor';
import { ProjectsPage } from '@/pages/Projects';
import { SettingsPage } from '@/pages/Settings';
import { AboutPage } from '@/pages/About';
import './app.css';

const NAV = [
  { to: '/', label: '首页', end: true },
  { to: '/projects', label: '我的项目' },
  { to: '/settings', label: '设置' },
  { to: '/about', label: '关于' },
];

export default function App() {
  const location = useLocation();
  const inEditor = location.pathname.startsWith('/editor');

  return (
    <div className="im-app">
      <a href="#im-main" className="im-skip-link">
        跳到主内容
      </a>
      <header className="im-topbar">
        <NavLink to="/" className="im-logo" aria-label="墨演首页">
          <span className="im-logo__mark">墨</span>
          <span className="im-logo__name">墨演 InkMotion</span>
        </NavLink>
        {!inEditor && (
          <nav className="im-topnav" aria-label="主导航">
            {NAV.filter((n) => n.to !== '/').map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => 'im-topnav__link' + (isActive ? ' is-active' : '')}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main id="im-main" className="im-main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/editor/:id" element={<EditorPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  );
}
