import React, { useState } from 'react';
import { ProfileList } from './components/ProfileList';

type Tab = 'profiles' | 'proxies' | 'scenarios';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('profiles');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profiles', label: 'Профили' },
    { key: 'proxies', label: 'Прокси' },
    { key: 'scenarios', label: 'Сценарии' },
  ];

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <h2 style={styles.logoText}>Dolphin Anty</h2>
        </div>
        <nav style={styles.nav}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              style={{
                ...styles.navButton,
                ...(activeTab === tab.key ? styles.navButtonActive : {}),
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.headerTitle}>
            {tabs.find((t) => t.key === activeTab)?.label}
          </h1>
        </header>

        <div style={styles.content}>
          {activeTab === 'profiles' && <ProfileList />}
          {activeTab === 'proxies' && <div style={styles.placeholder}>Прокси-менеджер (в разработке)</div>}
          {activeTab === 'scenarios' && <div style={styles.placeholder}>Редактор сценариев (в разработке)</div>}
        </div>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
  },
  sidebar: {
    width: 220,
    background: '#162029',
    borderRight: '1px solid #1e2d3d',
    display: 'flex',
    flexDirection: 'column',
  },
  logo: {
    padding: '24px 20px',
    borderBottom: '1px solid #1e2d3d',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: '#4fc3f7',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 8px',
    gap: 4,
  },
  navButton: {
    background: 'transparent',
    border: 'none',
    color: '#8a9bb0',
    fontSize: 14,
    padding: '10px 16px',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 0.15s',
  },
  navButtonActive: {
    background: '#1e3a5f',
    color: '#4fc3f7',
    fontWeight: 600,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 32px',
    borderBottom: '1px solid #1e2d3d',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 600,
    color: '#e0e6ed',
  },
  content: {
    flex: 1,
    padding: 32,
    overflowY: 'auto' as const,
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    fontSize: 16,
    color: '#546e7a',
  },
};

export default App;
