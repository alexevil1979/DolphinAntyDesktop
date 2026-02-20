import React, { useEffect, useState } from 'react';

interface AppStatus {
  profiles: number;
  running: number;
  proxies: number;
  scenarios: number;
  runningProfiles: string[];
}

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
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

  const stats = status ?? { profiles: 0, running: 0, proxies: 0, scenarios: 0 };

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Всего профилей</div>
          <div className="stat-card-value">{stats.profiles}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Запущено</div>
          <div className="stat-card-value">{stats.running}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Прокси</div>
          <div className="stat-card-value">{stats.proxies}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Сценарии</div>
          <div className="stat-card-value">{stats.scenarios}</div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Быстрые действия</h2>
        </div>
        <div className="toolbar">
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('profiles')}>
            Профили
          </button>
          <button type="button" className="btn" onClick={() => onNavigate('proxies')}>
            Прокси
          </button>
          <button type="button" className="btn" onClick={() => onNavigate('scenarios')}>
            Сценарии
          </button>
          <button type="button" className="btn" onClick={() => onNavigate('cookies')}>
            Cookie Robot
          </button>
          <button type="button" className="btn" onClick={() => onNavigate('sync')}>
            Синхронизатор
          </button>
          <button type="button" className="btn" onClick={() => onNavigate('settings')}>
            Настройки
          </button>
        </div>
      </div>
    </>
  );
};
