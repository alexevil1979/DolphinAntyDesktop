import React, { useEffect, useState } from 'react';

interface AppStatus {
  profiles: number;
  running: number;
  proxies: number;
  scenarios: number;
  runningProfiles: string[];
}

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const NAV_ITEMS: { key: string; label: string; icon: string; section: string }[] = [
  { key: 'dashboard', label: 'Дашборд', icon: '◉', section: 'main' },
  { key: 'profiles', label: 'Профили', icon: '👤', section: 'main' },
  { key: 'proxies', label: 'Прокси', icon: '🔗', section: 'main' },
  { key: 'scenarios', label: 'Сценарии', icon: '📜', section: 'automation' },
  { key: 'cookies', label: 'Cookie Robot', icon: '🍪', section: 'automation' },
  { key: 'sync', label: 'Синхронизатор', icon: '🔄', section: 'automation' },
  { key: 'settings', label: 'Настройки', icon: '⚙', section: 'settings' },
];

const SECTIONS: { id: string; title: string }[] = [
  { id: 'main', title: 'Основное' },
  { id: 'automation', title: 'Автоматизация' },
  { id: 'settings', title: 'Настройки' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const [status, setStatus] = useState<AppStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.electronAPI.app.getStatus().then((data) => {
      if (!cancelled) setStatus(data);
    }).catch(() => {
      if (!cancelled) setStatus({ profiles: 0, running: 0, proxies: 0, scenarios: 0, runningProfiles: [] });
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">DolphinAnty</span>
        <span className="sidebar-version">Pro v1.0</span>
      </div>
      <nav className="sidebar-nav">
        {SECTIONS.map((section) => (
          <div key={section.id} className="sidebar-section">
            <div className="sidebar-section-title">{section.title}</div>
            {NAV_ITEMS.filter((item) => item.section === section.id).map((item) => (
              <button
                key={item.key}
                type="button"
                className={`sidebar-item ${currentPage === item.key ? 'active' : ''}`}
                onClick={() => onNavigate(item.key)}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-stats">
        {status !== null && (
          <>
            <div className="sidebar-stat">
              <span>Профили</span>
              <span className="sidebar-stat-value">{status.profiles}</span>
            </div>
            <div className="sidebar-stat">
              <span>Запущено</span>
              <span className="sidebar-stat-value">{status.running}</span>
            </div>
            <div className="sidebar-stat">
              <span>Прокси</span>
              <span className="sidebar-stat-value">{status.proxies}</span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
