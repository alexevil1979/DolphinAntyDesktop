import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ProfileTable } from './components/ProfileTable';
import { ProxyManager } from './components/ProxyManager';
import { ScenarioBuilder } from './components/ScenarioBuilder';
import { CookieRobotView } from './components/CookieRobotView';
import { SyncView } from './components/SyncView';
import { SettingsView } from './components/SettingsView';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Дашборд',
  profiles: 'Профили',
  proxies: 'Прокси',
  scenarios: 'Сценарии',
  cookies: 'Cookie Robot',
  sync: 'Синхронизатор',
  settings: 'Настройки',
};

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');

  const renderContent = () => {
    switch (currentPage) {
      case 'profiles':
        return <ProfileTable />;
      case 'proxies':
        return <ProxyManager />;
      case 'scenarios':
        return <ScenarioBuilder />;
      case 'cookies':
        return <CookieRobotView />;
      case 'sync':
        return <SyncView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="main-content">
        <header className="topbar">
          <h1 className="topbar-title">{PAGE_TITLES[currentPage] ?? 'Дашборд'}</h1>
          <div className="topbar-actions" />
        </header>
        <div className="content-area">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
