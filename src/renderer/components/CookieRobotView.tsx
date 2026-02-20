import React, { useState, useEffect, useCallback } from 'react';
import type { CookieRobotConfig, BrowserProfile } from '../../shared/types';

const POLL_INTERVAL_MS = 2000;

function statusTag(status: CookieRobotConfig['status']): string {
  if (status === 'running') return 'tag tag-running';
  if (status === 'paused') return 'tag tag-unchecked';
  if (status === 'completed') return 'tag tag-active';
  return 'tag tag-stopped';
}

function statusLabel(status: CookieRobotConfig['status']): string {
  const map: Record<CookieRobotConfig['status'], string> = {
    idle: 'Ожидание',
    running: 'Запущен',
    paused: 'Приостановлен',
    completed: 'Завершён',
  };
  return map[status];
}

export const CookieRobotView: React.FC = () => {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [config, setConfig] = useState<CookieRobotConfig | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [urlsText, setUrlsText] = useState('');
  const [profileIds, setProfileIds] = useState<Set<string>>(new Set());
  const [maxVisitsPerUrl, setMaxVisitsPerUrl] = useState(3);
  const [delayMin, setDelayMin] = useState(2000);
  const [delayMax, setDelayMax] = useState(5000);
  const [scrollPage, setScrollPage] = useState(true);
  const [clickRandomLinks, setClickRandomLinks] = useState(false);
  const [maxLinksPerPage, setMaxLinksPerPage] = useState(5);
  const [warmupDuration, setWarmupDuration] = useState(5000);

  const fetchProfiles = useCallback(() => {
    window.electronAPI.profiles
      .list()
      .then(setProfiles)
      .catch(() => setProfiles([]));
  }, []);

  const fetchStatus = useCallback(() => {
    if (!config?.id) return;
    window.electronAPI.cookieRobot
      .status(config.id)
      .then((c) => setConfig(c))
      .catch(() => setConfig(undefined));
  }, [config?.id]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    if (!config?.id || (config.status !== 'running' && config.status !== 'paused')) return;
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [config?.id, config?.status, fetchStatus]);

  const urls = urlsText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const toggleProfile = (id: string) => {
    setProfileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStart = async () => {
    setError('');
    if (!name.trim()) {
      setError('Укажите название.');
      return;
    }
    if (urls.length === 0) {
      setError('Укажите хотя бы один URL (по одному на строку).');
      return;
    }
    if (profileIds.size === 0) {
      setError('Выберите хотя бы один профиль.');
      return;
    }
    if (delayMin < 0 || delayMax < delayMin) {
      setError('Корректный диапазон задержки: min ≤ max.');
      return;
    }
    setLoading(true);
    try {
      const created = await window.electronAPI.cookieRobot.start({
        name: name.trim(),
        urls,
        profileIds: Array.from(profileIds),
        maxVisitsPerUrl,
        delayBetweenVisits: { min: delayMin, max: delayMax },
        scrollPage,
        clickRandomLinks,
        maxLinksPerPage,
        warmupDuration,
      });
      setConfig(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка запуска');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!config?.id) return;
    setLoading(true);
    try {
      const ok = await window.electronAPI.cookieRobot.stop(config.id);
      if (ok) fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const isRunning = config?.status === 'running' || config?.status === 'paused';

  return (
    <div className="content-area">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Статус</div>
          <div className="stat-card-value">
            {config ? (
              <span className={statusTag(config.status)}>{statusLabel(config.status)}</span>
            ) : (
              <span className="tag tag-stopped">Нет сессии</span>
            )}
          </div>
        </div>
        {config?.progress && (
          <>
            <div className="stat-card">
              <div className="stat-card-label">Всего визитов</div>
              <div className="stat-card-value">{config.progress.totalVisits}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Собрано cookies</div>
              <div className="stat-card-value">{config.progress.cookiesCollected}</div>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2 className="card-title">Конфигурация Cookie Robot</h2>
        </div>
        {error && (
          <div style={{ marginBottom: 16, color: 'var(--danger)' }}>{error}</div>
        )}
        <div className="form-group">
          <label className="form-label">Название</label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название задачи"
            disabled={isRunning}
          />
        </div>
        <div className="form-group">
          <label className="form-label">URL (по одному на строку)</label>
          <textarea
            className="textarea"
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder={'https://example.com\nhttps://example.org'}
            rows={4}
            disabled={isRunning}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Профили</label>
          <div className="table-container">
            <div style={{ padding: 12, maxHeight: 200, overflowY: 'auto' }}>
              {profiles.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <span className="empty-state-text">Нет профилей</span>
                </div>
              ) : (
                profiles.map((p) => (
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
                      checked={profileIds.has(p.id)}
                      onChange={() => toggleProfile(p.id)}
                      disabled={isRunning}
                    />
                    <span>{p.name}</span>
                    <span className="tag tag-stopped" style={{ marginLeft: 'auto' }}>
                      {p.status}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Макс. визитов на URL</label>
            <input
              type="number"
              className="input"
              min={1}
              value={maxVisitsPerUrl}
              onChange={(e) => setMaxVisitsPerUrl(parseInt(e.target.value, 10) || 1)}
              disabled={isRunning}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Задержка между визитами (мс): min / max</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                className="input"
                min={0}
                value={delayMin}
                onChange={(e) => setDelayMin(parseInt(e.target.value, 10) || 0)}
                disabled={isRunning}
              />
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
        </div>
        <div className="form-row">
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isRunning ? 'default' : 'pointer' }}>
              <input
                type="checkbox"
                className="checkbox"
                checked={scrollPage}
                onChange={(e) => setScrollPage(e.target.checked)}
                disabled={isRunning}
              />
              <span className="form-label" style={{ marginBottom: 0 }}>Прокручивать страницу</span>
            </label>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isRunning ? 'default' : 'pointer' }}>
              <input
                type="checkbox"
                className="checkbox"
                checked={clickRandomLinks}
                onChange={(e) => setClickRandomLinks(e.target.checked)}
                disabled={isRunning}
              />
              <span className="form-label" style={{ marginBottom: 0 }}>Кликать случайные ссылки</span>
            </label>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Макс. ссылок на страницу</label>
            <input
              type="number"
              className="input"
              min={0}
              value={maxLinksPerPage}
              onChange={(e) => setMaxLinksPerPage(parseInt(e.target.value, 10) || 0)}
              disabled={isRunning}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Прогрев (мс)</label>
            <input
              type="number"
              className="input"
              min={0}
              value={warmupDuration}
              onChange={(e) => setWarmupDuration(parseInt(e.target.value, 10) || 0)}
              disabled={isRunning}
            />
          </div>
        </div>
        <div className="toolbar" style={{ marginTop: 16 }}>
          {!isRunning ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading}
              onClick={handleStart}
            >
              Запустить
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

      {config?.progress && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Прогресс</h2>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-label">Профиль (индекс)</div>
              <div className="stat-card-value">{config.progress.currentProfileIndex + 1}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">URL (индекс)</div>
              <div className="stat-card-value">{config.progress.currentUrlIndex + 1}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Всего визитов</div>
              <div className="stat-card-value">{config.progress.totalVisits}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Cookies собрано</div>
              <div className="stat-card-value">{config.progress.cookiesCollected}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
