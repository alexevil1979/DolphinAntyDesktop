import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { BrowserProfile, ProfileCreateParams, BulkAction } from '../../shared/types';

const REFRESH_INTERVAL_MS = 3000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseTagsInput(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const ProfileTable: React.FC = () => {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const fetchProfiles = useCallback(() => {
    setLoading(true);
    window.electronAPI.profiles
      .list()
      .then((list) => setProfiles(list))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProfiles();
    const interval = setInterval(fetchProfiles, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchProfiles]);

  const filteredProfiles = profiles.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const name = (p.name ?? '').toLowerCase();
    const group = (p.group ?? '').toLowerCase();
    const tags = (p.tags ?? []).join(' ').toLowerCase();
    return name.includes(q) || group.includes(q) || tags.includes(q);
  });

  const selectAllRef = useRef<HTMLInputElement>(null);
  const isAllSelected =
    filteredProfiles.length > 0 &&
    filteredProfiles.every((p) => selectedIds.has(p.id));
  const isSomeSelected = selectedIds.size > 0;

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = isSomeSelected && !isAllSelected;
  }, [isSomeSelected, isAllSelected]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProfiles.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulkAction = async (type: BulkAction['type'], params?: Record<string, unknown>) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      await window.electronAPI.bulk.execute({
        type,
        profileIds: Array.from(selectedIds),
        params,
      });
      setSelectedIds(new Set());
      fetchProfiles();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleLaunch = async (id: string) => {
    const result = await window.electronAPI.profiles.launch(id);
    if (result.success) fetchProfiles();
  };

  const handleStop = async (id: string) => {
    await window.electronAPI.profiles.stop(id);
    fetchProfiles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить профиль?')) return;
    await window.electronAPI.profiles.delete(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    fetchProfiles();
  };

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-search">
          <input
            type="text"
            className="input"
            placeholder="Поиск по имени, тегам, группе..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Создать профиль
        </button>
        {isSomeSelected && (
          <>
            <span className="toolbar-divider" />
            <button
              type="button"
              className="btn btn-success btn-sm"
              disabled={bulkLoading}
              onClick={() => runBulkAction('launch')}
            >
              Запустить
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={bulkLoading}
              onClick={() => runBulkAction('stop')}
            >
              Остановить
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={bulkLoading}
              onClick={() => {
                if (confirm(`Удалить выбранные профили (${selectedIds.size})?`)) {
                  runBulkAction('delete');
                }
              }}
            >
              Удалить
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={bulkLoading}
              onClick={() => runBulkAction('update_fingerprint')}
            >
              Обновить FP
            </button>
          </>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 13 }}>
          {filteredProfiles.length} {filteredProfiles.length === 1 ? 'профиль' : 'профилей'}
        </span>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-text">Загрузка...</div>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">Нет профилей</div>
            <div className="empty-state-text">
              {searchQuery ? 'По запросу ничего не найдено.' : 'Создайте первый профиль.'}
            </div>
            {!searchQuery && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Создать профиль
              </button>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th className="table-checkbox">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>#</th>
                <th>Имя</th>
                <th>Статус</th>
                <th>Платформа</th>
                <th>Прокси</th>
                <th>Теги</th>
                <th>Создан</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((profile, index) => (
                <tr key={profile.id}>
                  <td className="table-checkbox">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selectedIds.has(profile.id)}
                      onChange={() => toggleSelect(profile.id)}
                    />
                  </td>
                  <td>{index + 1}</td>
                  <td>{profile.name}</td>
                  <td>
                    <span className={`tag tag-${profile.status}`}>
                      {profile.status === 'running' ? 'Запущен' : profile.status === 'stopped' ? 'Остановлен' : 'Ошибка'}
                    </span>
                  </td>
                  <td>{profile.fingerprint?.platform ?? '—'}</td>
                  <td>{profile.proxyId ?? '—'}</td>
                  <td>
                    {(profile.tags ?? []).length
                      ? profile.tags!.slice(0, 3).join(', ') + (profile.tags!.length > 3 ? '…' : '')
                      : '—'}
                  </td>
                  <td>{formatDate(profile.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {profile.status === 'running' ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleStop(profile.id)}
                        >
                          Остановить
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => handleLaunch(profile.id)}
                        >
                          Запустить
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(profile.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <CreateProfileModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchProfiles();
          }}
        />
      )}
    </>
  );
};

interface CreateProfileModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateProfileModal: React.FC<CreateProfileModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Введите имя профиля.');
      return;
    }
    if (count < 1 || count > 100) {
      setError('Количество профилей: от 1 до 100.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const tags = parseTagsInput(tagsInput);
      const baseParams: ProfileCreateParams = {
        name: trimmedName,
        group: group.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tags.length ? tags : undefined,
      };
      for (let i = 0; i < count; i++) {
        const profileName = count === 1 ? trimmedName : `${trimmedName} ${i + 1}`;
        await window.electronAPI.profiles.create({
          ...baseParams,
          name: profileName,
        });
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания профиля.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Создать профиль</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 13 }}>{error}</div>
            )}
            <div className="form-group">
              <label className="form-label">Имя профиля</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Профиль 1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Группа</label>
              <input
                type="text"
                className="input"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder="Группа"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Заметки</label>
              <textarea
                className="textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Заметки"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Теги (через запятую)</label>
              <input
                type="text"
                className="input"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="тег1, тег2"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Кол-во профилей</label>
              <input
                type="number"
                className="input"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Создание…' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
