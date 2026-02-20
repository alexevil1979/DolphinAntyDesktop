import React, { useState, useEffect, useCallback } from 'react';
import type { ProxyConfig, ProxyType } from '../../shared/types';

const PROXY_TYPES: ProxyType[] = ['http', 'https', 'socks4', 'socks5'];

function formatLastCheck(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(status: ProxyConfig['status']): string {
  if (status === 'active') return 'tag tag-active';
  if (status === 'dead') return 'tag tag-dead';
  return 'tag tag-unchecked';
}

function statusLabel(status: ProxyConfig['status']): string {
  if (status === 'active') return 'Активен';
  if (status === 'dead') return 'Мёртв';
  return 'Не проверен';
}

export const ProxyManager: React.FC = () => {
  const [proxies, setProxies] = useState<ProxyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState<ProxyType>('http');
  const [addHost, setAddHost] = useState('');
  const [addPort, setAddPort] = useState('');
  const [addLogin, setAddLogin] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const [importText, setImportText] = useState('');
  const [importType, setImportType] = useState<ProxyType>('http');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');

  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkAllLoading, setCheckAllLoading] = useState(false);

  const fetchProxies = useCallback(() => {
    setLoading(true);
    window.electronAPI.proxies
      .list()
      .then(setProxies)
      .catch(() => setProxies([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  const filteredProxies = proxies.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (p.name ?? '').toLowerCase().includes(q) ||
      (p.host ?? '').toLowerCase().includes(q) ||
      (p.ip ?? '').toLowerCase().includes(q)
    );
  });

  const handleAddProxy = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const port = parseInt(addPort, 10);
    if (!addHost.trim() || isNaN(port) || port < 1 || port > 65535) {
      setAddError('Укажите хост и корректный порт (1–65535).');
      return;
    }
    setAddLoading(true);
    try {
      const created = await window.electronAPI.proxies.add({
        name: addName.trim() || undefined,
        type: addType,
        host: addHost.trim(),
        port,
        login: addLogin.trim() || undefined,
        password: addPassword || undefined,
      });
      setProxies((prev) => [...prev, created]);
      setShowAddModal(false);
      setAddName('');
      setAddHost('');
      setAddPort('');
      setAddLogin('');
      setAddPassword('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Ошибка добавления прокси');
    } finally {
      setAddLoading(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    const lines = importText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setImportError('Вставьте список в формате host:port или host:port:login:password');
      return;
    }
    setImportLoading(true);
    try {
      const added: ProxyConfig[] = [];
      for (const line of lines) {
        const parts = line.split(':');
        const host = parts[0]?.trim() ?? '';
        const port = parseInt(parts[1]?.trim() ?? '0', 10);
        if (!host || isNaN(port) || port < 1 || port > 65535) continue;
        const login = parts[2]?.trim();
        const password = parts[3]?.trim();
        const name = `${host}:${port}`;
        const created = await window.electronAPI.proxies.add({
          name,
          type: importType,
          host,
          port,
          login: login || undefined,
          password: password || undefined,
        });
        added.push(created);
      }
      setProxies((prev) => [...prev, ...added]);
      setShowImportModal(false);
      setImportText('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Ошибка импорта');
    } finally {
      setImportLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const ok = await window.electronAPI.proxies.remove(id);
      if (ok) setProxies((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // ignore
    }
  };

  const handleCheck = async (id: string) => {
    setCheckingId(id);
    try {
      const updated = await window.electronAPI.proxies.check(id);
      setProxies((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch {
      // leave as is or could set status to dead
    } finally {
      setCheckingId(null);
    }
  };

  const handleCheckAll = async () => {
    setCheckAllLoading(true);
    try {
      const list = await window.electronAPI.proxies.checkAll();
      setProxies(list);
    } catch {
      // ignore
    } finally {
      setCheckAllLoading(false);
    }
  };

  return (
    <>
      <div className="toolbar">
        <input
          type="text"
          className="input toolbar-search"
          placeholder="Поиск по имени, хосту, IP..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="toolbar-divider" />
        <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          Добавить прокси
        </button>
        <button type="button" className="btn" onClick={() => setShowImportModal(true)}>
          Импорт списком
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleCheckAll}
          disabled={checkAllLoading || proxies.length === 0}
        >
          {checkAllLoading ? 'Проверка...' : 'Проверить все'}
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="empty-state">
            <p className="empty-state-text">Загрузка...</p>
          </div>
        ) : filteredProxies.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">Нет прокси</p>
            <p className="empty-state-text">
              Добавьте прокси вручную или импортируйте списком.
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th className="table-checkbox" />
                <th>Имя</th>
                <th>Тип</th>
                <th>Хост:Порт</th>
                <th>Статус</th>
                <th>Время отклика</th>
                <th>IP</th>
                <th>Последняя проверка</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredProxies.map((p) => (
                <tr key={p.id}>
                  <td className="table-checkbox">
                    <input type="checkbox" className="checkbox" readOnly disabled />
                  </td>
                  <td>{p.name || '—'}</td>
                  <td>{p.type}</td>
                  <td>{`${p.host}:${p.port}`}</td>
                  <td>
                    <span className={statusClass(p.status)}>{statusLabel(p.status)}</span>
                  </td>
                  <td>{p.responseTime != null ? `${p.responseTime} мс` : '—'}</td>
                  <td>{p.ip || '—'}</td>
                  <td>{formatLastCheck(p.lastCheck)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => handleCheck(p.id)}
                      disabled={checkingId === p.id}
                    >
                      {checkingId === p.id ? '…' : 'Проверить'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleRemove(p.id)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => !addLoading && setShowAddModal(false)}>
          <div className="modal slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Добавить прокси</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => !addLoading && setShowAddModal(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddProxy}>
              <div className="modal-body">
                {addError && (
                  <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{addError}</p>
                )}
                <div className="form-group">
                  <label className="form-label">Имя</label>
                  <input
                    type="text"
                    className="input"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Опционально"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Тип</label>
                  <select
                    className="select"
                    value={addType}
                    onChange={(e) => setAddType(e.target.value as ProxyType)}
                  >
                    {PROXY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Хост</label>
                    <input
                      type="text"
                      className="input"
                      value={addHost}
                      onChange={(e) => setAddHost(e.target.value)}
                      placeholder="host или IP"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Порт</label>
                    <input
                      type="number"
                      className="input"
                      value={addPort}
                      onChange={(e) => setAddPort(e.target.value)}
                      placeholder="8080"
                      min={1}
                      max={65535}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Логин</label>
                  <input
                    type="text"
                    className="input"
                    value={addLogin}
                    onChange={(e) => setAddLogin(e.target.value)}
                    placeholder="Опционально"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Пароль</label>
                  <input
                    type="password"
                    className="input"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Опционально"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowAddModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? 'Добавление...' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div
          className="modal-overlay"
          onClick={() => !importLoading && setShowImportModal(false)}
        >
          <div className="modal slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Импорт списком</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => !importLoading && setShowImportModal(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleImport}>
              <div className="modal-body">
                {importError && (
                  <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{importError}</p>
                )}
                <div className="form-group">
                  <label className="form-label">Тип прокси</label>
                  <select
                    className="select"
                    value={importType}
                    onChange={(e) => setImportType(e.target.value as ProxyType)}
                  >
                    {PROXY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Список (каждая строка: host:port или host:port:login:password)</label>
                  <textarea
                    className="textarea"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="192.168.1.1:8080&#10;proxy.example.com:3128:user:pass"
                    rows={8}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowImportModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={importLoading}>
                  {importLoading ? 'Импорт...' : 'Импортировать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
