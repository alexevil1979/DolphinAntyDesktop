import React, { useState, useEffect, useCallback } from 'react';
import type { SyncSession, BrowserProfile } from '../../shared/types';

const POLL_INTERVAL_MS = 2000;

function statusTag(status: SyncSession['status']): string {
  if (status === 'running') return 'tag tag-running';
  if (status === 'stopped') return 'tag tag-dead';
  return 'tag tag-stopped';
}

function statusLabel(status: SyncSession['status']): string {
  const map: Record<SyncSession['status'], string> = {
    idle: 'Ожидание',
    running: 'Синхронизация',
    stopped: 'Остановлен',
  };
  return map[status];
}

export const SyncView: React.FC = () => {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [session, setSession] = useState<SyncSession | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [masterProfileId, setMasterProfileId] = useState('');
  const [slaveProfileIds, setSlaveProfileIds] = useState<Set<string>>(new Set());
  const [syncMouse, setSyncMouse] = useState(true);
  const [syncKeyboard, setSyncKeyboard] = useState(true);
  const [syncNavigation, setSyncNavigation] = useState(true);
  const [syncScroll, setSyncScroll] = useState(true);
  const [delayMin, setDelayMin] = useState(0);
  const [delayMax, setDelayMax] = useState(100);

  const runningProfiles = profiles.filter((p) => p.status === 'running');

  const fetchProfiles = useCallback(() => {
    window.electronAPI.profiles
      .list()
      .then(setProfiles)
      .catch(() => setProfiles([]));
  }, []);

  const fetchStatus = useCallback(() => {
    if (!session?.id) return;
    window.electronAPI.sync
      .status(session.id)
      .then((s) => setSession(s))
      .catch(() => setSession(undefined));
  }, [session?.id]);

  useEffect(() => {
    fetchProfiles();
    const interval = setInterval(fetchProfiles, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchProfiles]);

  useEffect(() => {
    if (!session?.id || session.status !== 'running') return;
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [session?.id, session?.status, fetchStatus]);

  useEffect(() => {
    if (runningProfiles.length > 0 && !masterProfileId) {
      setMasterProfileId(runningProfiles[0].id);
    }
  }, [runningProfiles.length, masterProfileId]);

  const toggleSlave = (id: string) => {
    if (id === masterProfileId) return;
    setSlaveProfileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStart = async () => {
    setError('');
    if (!masterProfileId) {
      setError('Выберите мастер-профиль.');
      return;
    }
    if (slaveProfileIds.size === 0) {
      setError('Выберите хотя бы один ведомый профиль.');
      return;
    }
    if (slaveProfileIds.has(masterProfileId)) {
      setError('Мастер не может быть в списке ведомых.');
      return;
    }
    if (delayMin < 0 || delayMax < delayMin) {
      setError('Корректный диапазон задержки: min ≤ max.');
      return;
    }
    setLoading(true);
    try {
      const created = await window.electronAPI.sync.start({
        masterProfileId,
        slaveProfileIds: Array.from(slaveProfileIds),
        syncMouse,
        syncKeyboard,
        syncNavigation,
        syncScroll,
        delay: { min: delayMin, max: delayMax },
      });
      setSession(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка запуска синхронизации');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!session?.id) return;
    setLoading(true);
    try {
      const ok = await window.electronAPI.sync.stop(session.id);
      if (ok) fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const isRunning = session?.status === 'running';

  return (
    <div className="content-area">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Статус синхронизации</div>
          <div className="stat-card-value">
            {session ? (
              <span className={statusTag(session.status)}>{statusLabel(session.status)}</span>
            ) : (
              <span className="tag tag-stopped">Нет сессии</span>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2 className="card-title">Настройки синхронизации</h2>
        </div>
        {error && (
          <div style={{ marginBottom: 16, color: 'var(--danger)' }}>{error}</div>
        )}
        <div className="form-group">
          <label className="form-label">Мастер-профиль (источник)</label>
          <select
            className="select"
            value={masterProfileId}
            onChange={(e) => setMasterProfileId(e.target.value)}
            disabled={isRunning}
          >
            <option value="">— Выберите профиль —</option>
            {runningProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {runningProfiles.length === 0 && (
            <div className="form-label" style={{ marginTop: 6, color: 'var(--text-muted)' }}>
              Запустите хотя бы один профиль
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Ведомые профили (куда синхронизировать)</label>
          <div className="table-container">
            <div style={{ padding: 12, maxHeight: 200, overflowY: 'auto' }}>
              {runningProfiles.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <span className="empty-state-text">Нет запущенных профилей</span>
                </div>
              ) : (
                runningProfiles
                  .filter((p) => p.id !== masterProfileId)
                  .map((p) => (
                    <label
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 0',
                        cursor: isRunning ? 'default' : 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={slaveProfileIds.has(p.id)}
                        onChange={() => toggleSlave(p.id)}
                        disabled={isRunning}
                      />
                      <span>{p.name}</span>
                    </label>
                  ))
              )}
            </div>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Что синхронизировать</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isRunning ? 'default' : 'pointer' }}>
              <input
                type="checkbox"
                className="checkbox"
                checked={syncMouse}
                onChange={(e) => setSyncMouse(e.target.checked)}
                disabled={isRunning}
              />
              <span>Мышь</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isRunning ? 'default' : 'pointer' }}>
              <input
                type="checkbox"
                className="checkbox"
                checked={syncKeyboard}
                onChange={(e) => setSyncKeyboard(e.target.checked)}
                disabled={isRunning}
              />
              <span>Клавиатура</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isRunning ? 'default' : 'pointer' }}>
              <input
                type="checkbox"
                className="checkbox"
                checked={syncNavigation}
                onChange={(e) => setSyncNavigation(e.target.checked)}
                disabled={isRunning}
              />
              <span>Навигация</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isRunning ? 'default' : 'pointer' }}>
              <input
                type="checkbox"
                className="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
                disabled={isRunning}
              />
              <span>Прокрутка</span>
            </label>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Задержка (мс): min</label>
            <input
              type="number"
              className="input"
              min={0}
              value={delayMin}
              onChange={(e) => setDelayMin(parseInt(e.target.value, 10) || 0)}
              disabled={isRunning}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Задержка (мс): max</label>
            <input
              type="number"
              className="input"
              min={0}
              value={delayMax}
              onChange={(e) => setDelayMax(parseInt(e.target.value, 10) || 0)}
              disabled={isRunning}
            />
          </div>
        </div>
        <div className="toolbar" style={{ marginTop: 16 }}>
          {!isRunning ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading || runningProfiles.length < 2}
              onClick={handleStart}
            >
              Запустить синхронизацию
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-danger"
              disabled={loading}
              onClick={handleStop}
            >
              Остановить
            </button>
          )}
        </div>
      </div>

      {session && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Текущая сессия</h2>
            <span className={statusTag(session.status)}>{statusLabel(session.status)}</span>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-label">Мастер</div>
              <div className="stat-card-value">
                {profiles.find((p) => p.id === session.masterProfileId)?.name ?? session.masterProfileId}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Ведомых</div>
              <div className="stat-card-value">{session.slaveProfileIds.length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
