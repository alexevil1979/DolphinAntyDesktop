import React, { useState, useEffect } from 'react';
import type { AppSettings } from '../../shared/types';

const defaultSettings: AppSettings = {
  encryptionEnabled: false,
  apiPort: 8080,
  apiEnabled: false,
  chromiumPath: '',
  maxConcurrentProfiles: 10,
  theme: 'dark',
  language: 'ru',
  autoUpdate: true,
  cloudSyncEnabled: false,
};

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    window.electronAPI.settings
      .get()
      .then((data) => {
        if (!cancelled) setSettings({ ...defaultSettings, ...data });
      })
      .catch(() => {
        if (!cancelled) setSettings(defaultSettings);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setMessage(null);
    setSaving(true);
    try {
      await window.electronAPI.settings.update(settings);
      setMessage({ type: 'ok', text: 'Настройки сохранены' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Ошибка сохранения',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="content-area">
        <div className="empty-state">
          <span className="empty-state-text">Загрузка настроек…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 'var(--radius-md)',
            background: message.type === 'ok' ? 'var(--success-light)' : 'var(--danger-light)',
            color: message.type === 'ok' ? 'var(--success)' : 'var(--danger)',
          }}
        >
          {message.text}
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2 className="card-title">Общие настройки</h2>
        </div>
        <div className="form-group">
          <label className="form-label">Путь к Chromium</label>
          <input
            type="text"
            className="input"
            value={settings.chromiumPath}
            onChange={(e) => update('chromiumPath', e.target.value)}
            placeholder="Пусто = системный по умолчанию"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Макс. одновременных профилей</label>
          <input
            type="number"
            className="input"
            min={1}
            value={settings.maxConcurrentProfiles}
            onChange={(e) => update('maxConcurrentProfiles', parseInt(e.target.value, 10) || 1)}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Язык</label>
            <select
              className="select"
              value={settings.language}
              onChange={(e) => update('language', e.target.value as 'ru' | 'en')}
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Тема</label>
            <select
              className="select"
              value={settings.theme}
              onChange={(e) => update('theme', e.target.value as 'dark' | 'light')}
            >
              <option value="dark">Тёмная</option>
              <option value="light">Светлая</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              className="checkbox"
              checked={settings.encryptionEnabled}
              onChange={(e) => update('encryptionEnabled', e.target.checked)}
            />
            <span className="form-label" style={{ marginBottom: 0 }}>Шифрование данных</span>
          </label>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2 className="card-title">API</h2>
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              className="checkbox"
              checked={settings.apiEnabled}
              onChange={(e) => update('apiEnabled', e.target.checked)}
            />
            <span className="form-label" style={{ marginBottom: 0 }}>Включить API</span>
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">Порт API</label>
          <input
            type="number"
            className="input"
            min={1}
            max={65535}
            value={settings.apiPort}
            onChange={(e) => update('apiPort', parseInt(e.target.value, 10) || 8080)}
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2 className="card-title">Облачная синхронизация</h2>
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              className="checkbox"
              checked={settings.cloudSyncEnabled}
              onChange={(e) => update('cloudSyncEnabled', e.target.checked)}
            />
            <span className="form-label" style={{ marginBottom: 0 }}>Включить облачную синхронизацию</span>
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">URL облака</label>
          <input
            type="text"
            className="input"
            value={settings.cloudSyncUrl ?? ''}
            onChange={(e) => update('cloudSyncUrl', e.target.value || undefined)}
            placeholder="https://..."
          />
        </div>
        <div className="form-group">
          <label className="form-label">Токен</label>
          <input
            type="password"
            className="input"
            value={settings.cloudSyncToken ?? ''}
            onChange={(e) => update('cloudSyncToken', e.target.value || undefined)}
            placeholder="Токен авторизации"
          />
        </div>
      </div>

      <div className="toolbar">
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? 'Сохранение…' : 'Сохранить настройки'}
        </button>
      </div>
    </div>
  );
};
