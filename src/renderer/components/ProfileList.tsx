import React, { useEffect, useState } from 'react';

const { ipcRenderer } = window.require('electron');

interface Profile {
  id: string;
  name: string;
  status: 'stopped' | 'running';
  fingerprint: {
    userAgent: string;
    platform: string;
  };
  proxy?: string;
  createdAt: string;
}

export const ProfileList: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles(): Promise<void> {
    try {
      const list = await ipcRenderer.invoke('profiles:list');
      setProfiles(list);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(): Promise<void> {
    const name = `Profile ${profiles.length + 1}`;
    await ipcRenderer.invoke('profiles:create', name);
    await loadProfiles();
  }

  async function handleDelete(id: string): Promise<void> {
    await ipcRenderer.invoke('profiles:delete', id);
    await loadProfiles();
  }

  async function handleLaunch(id: string): Promise<void> {
    await ipcRenderer.invoke('profiles:launch', id);
    await loadProfiles();
  }

  if (loading) {
    return <div style={styles.loading}>Загрузка профилей...</div>;
  }

  return (
    <div>
      <div style={styles.toolbar}>
        <button style={styles.createButton} onClick={handleCreate}>
          + Создать профиль
        </button>
        <span style={styles.count}>{profiles.length} профилей</span>
      </div>

      {profiles.length === 0 ? (
        <div style={styles.empty}>
          Нет профилей. Нажмите «Создать профиль» для начала работы.
        </div>
      ) : (
        <div style={styles.grid}>
          {profiles.map((profile) => (
            <div key={profile.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardName}>{profile.name}</span>
                <span
                  style={{
                    ...styles.status,
                    color: profile.status === 'running' ? '#66bb6a' : '#78909c',
                  }}
                >
                  {profile.status === 'running' ? 'Запущен' : 'Остановлен'}
                </span>
              </div>
              <div style={styles.cardInfo}>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Platform:</span>
                  <span>{profile.fingerprint.platform}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Proxy:</span>
                  <span>{profile.proxy || 'Нет'}</span>
                </div>
              </div>
              <div style={styles.cardActions}>
                <button style={styles.launchButton} onClick={() => handleLaunch(profile.id)}>
                  Запустить
                </button>
                <button style={styles.deleteButton} onClick={() => handleDelete(profile.id)}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    color: '#546e7a',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  createButton: {
    background: '#1e88e5',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  count: {
    color: '#78909c',
    fontSize: 14,
  },
  empty: {
    textAlign: 'center' as const,
    padding: 48,
    color: '#546e7a',
    fontSize: 15,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#162029',
    border: '1px solid #1e2d3d',
    borderRadius: 12,
    padding: 20,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#e0e6ed',
  },
  status: {
    fontSize: 12,
    fontWeight: 500,
  },
  cardInfo: {
    marginBottom: 16,
  },
  infoRow: {
    display: 'flex',
    gap: 8,
    fontSize: 13,
    color: '#8a9bb0',
    marginBottom: 4,
  },
  infoLabel: {
    color: '#546e7a',
    minWidth: 70,
  },
  cardActions: {
    display: 'flex',
    gap: 8,
  },
  launchButton: {
    flex: 1,
    background: '#1b5e20',
    color: '#a5d6a7',
    border: 'none',
    padding: '8px 12px',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  deleteButton: {
    background: '#b71c1c22',
    color: '#ef5350',
    border: '1px solid #ef535033',
    padding: '8px 12px',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
};
