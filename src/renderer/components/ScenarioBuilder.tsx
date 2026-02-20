import React, { useState, useEffect, useCallback } from 'react';
import type {
  Scenario,
  ScenarioStep,
  ScenarioStepType,
  BrowserProfile,
  ScenarioRunResult,
} from '../../shared/types';

const STEP_TYPES: ScenarioStepType[] = [
  'navigate',
  'click',
  'type',
  'wait',
  'waitForSelector',
  'scroll',
  'evaluate',
  'screenshot',
  'keypress',
  'select',
  'hover',
  'cookie_set',
  'cookie_get',
  'cookie_clear',
  'condition',
  'loop',
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const ScenarioBuilder: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [showRunModal, setShowRunModal] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState<ScenarioStep | null>(null);

  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSteps, setEditSteps] = useState<ScenarioStep[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);

  const [stepType, setStepType] = useState<ScenarioStepType>('navigate');
  const [stepParams, setStepParams] = useState<Record<string, unknown>>({});
  const [stepSaveLoading, setStepSaveLoading] = useState(false);

  const [runProfileIds, setRunProfileIds] = useState<Set<string>>(new Set());
  const [runLoading, setRunLoading] = useState(false);
  const [runResults, setRunResults] = useState<ScenarioRunResult[] | null>(null);

  const fetchScenarios = useCallback(() => {
    window.electronAPI.scenarios
      .list()
      .then(setScenarios)
      .catch(() => setScenarios([]));
  }, []);

  const fetchProfiles = useCallback(() => {
    window.electronAPI.profiles
      .list()
      .then(setProfiles)
      .catch(() => setProfiles([]));
  }, []);

  useEffect(() => {
    fetchScenarios();
    fetchProfiles();
  }, [fetchScenarios, fetchProfiles]);

  useEffect(() => {
    if (selectedScenario) {
      setEditName(selectedScenario.name);
      setEditDescription(selectedScenario.description);
      setEditSteps(selectedScenario.steps ? [...selectedScenario.steps] : []);
    } else {
      setEditName('');
      setEditDescription('');
      setEditSteps([]);
    }
  }, [selectedScenario]);

  const handleCreateScenario = async () => {
    try {
      const created = await window.electronAPI.scenarios.create({
        name: 'Новый сценарий',
        description: '',
        steps: [],
      });
      setScenarios((prev) => [...prev, created]);
      setSelectedScenario(created);
    } catch {
      // ignore
    }
  };

  const handleSaveScenario = async () => {
    if (!selectedScenario) return;
    setSaveLoading(true);
    try {
      const updated = await window.electronAPI.scenarios.update(selectedScenario.id, {
        name: editName,
        description: editDescription,
        steps: editSteps,
      });
      if (updated) {
        setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setSelectedScenario(updated);
      }
    } catch {
      // ignore
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteScenario = async (id: string) => {
    try {
      const ok = await window.electronAPI.scenarios.delete(id);
      if (ok) {
        setScenarios((prev) => prev.filter((s) => s.id !== id));
        if (selectedScenario?.id === id) setSelectedScenario(null);
      }
    } catch {
      // ignore
    }
  };

  const openAddStep = () => {
    setEditingStep(null);
    setStepType('navigate');
    setStepParams({ url: '' });
    setShowStepModal(true);
  };

  const openEditStep = (step: ScenarioStep) => {
    setEditingStep(step);
    setStepType(step.type);
    setStepParams({ ...step.params });
    setShowStepModal(true);
  };

  const getDefaultParamsForType = (type: ScenarioStepType): Record<string, unknown> => {
    switch (type) {
      case 'navigate':
        return { url: '' };
      case 'click':
      case 'hover':
      case 'waitForSelector':
        return { selector: '' };
      case 'type':
        return { selector: '', text: '' };
      case 'wait':
        return { ms: 1000 };
      case 'scroll':
        return { distance: 300 };
      case 'evaluate':
        return { script: '' };
      default:
        return {};
    }
  };

  useEffect(() => {
    if (showStepModal && !editingStep) setStepParams(getDefaultParamsForType(stepType));
  }, [showStepModal, stepType, editingStep]);

  const handleStepTypeChange = (newType: ScenarioStepType) => {
    setStepType(newType);
    if (!editingStep) setStepParams(getDefaultParamsForType(newType));
  };

  const handleSaveStep = () => {
    const step: ScenarioStep = editingStep
      ? { ...editingStep, type: stepType, params: { ...stepParams } }
      : { id: generateId(), type: stepType, params: { ...stepParams } };
    if (editingStep) {
      setEditSteps((prev) => prev.map((s) => (s.id === editingStep.id ? step : s)));
    } else {
      setEditSteps((prev) => [...prev, step]);
    }
    setShowStepModal(false);
    setStepSaveLoading(false);
  };

  const handleRemoveStep = (id: string) => {
    setEditSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleRun = async () => {
    if (!selectedScenario || runProfileIds.size === 0) return;
    setRunLoading(true);
    setRunResults(null);
    try {
      const results = await window.electronAPI.scenarios.run(
        selectedScenario.id,
        Array.from(runProfileIds)
      );
      setRunResults(results);
    } catch {
      setRunResults([]);
    } finally {
      setRunLoading(false);
    }
  };

  const toggleRunProfile = (id: string) => {
    setRunProfileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderStepParamFields = () => {
    switch (stepType) {
      case 'navigate':
        return (
          <div className="form-group">
            <label className="form-label">URL</label>
            <input
              type="text"
              className="input"
              value={String(stepParams.url ?? '')}
              onChange={(e) => setStepParams((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        );
      case 'click':
      case 'hover':
      case 'waitForSelector':
        return (
          <div className="form-group">
            <label className="form-label">Селектор</label>
            <input
              type="text"
              className="input"
              value={String(stepParams.selector ?? '')}
              onChange={(e) => setStepParams((p) => ({ ...p, selector: e.target.value }))}
              placeholder="css selector"
            />
          </div>
        );
      case 'type':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Селектор</label>
              <input
                type="text"
                className="input"
                value={String(stepParams.selector ?? '')}
                onChange={(e) => setStepParams((p) => ({ ...p, selector: e.target.value }))}
                placeholder="css selector"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Текст</label>
              <input
                type="text"
                className="input"
                value={String(stepParams.text ?? '')}
                onChange={(e) => setStepParams((p) => ({ ...p, text: e.target.value }))}
                placeholder="Текст для ввода"
              />
            </div>
          </>
        );
      case 'wait':
        return (
          <div className="form-group">
            <label className="form-label">Задержка (мс)</label>
            <input
              type="number"
              className="input"
              value={Number(stepParams.ms ?? 1000)}
              onChange={(e) => setStepParams((p) => ({ ...p, ms: parseInt(e.target.value, 10) || 0 }))}
              min={0}
            />
          </div>
        );
      case 'scroll':
        return (
          <div className="form-group">
            <label className="form-label">Расстояние (px)</label>
            <input
              type="number"
              className="input"
              value={Number(stepParams.distance ?? 300)}
              onChange={(e) =>
                setStepParams((p) => ({ ...p, distance: parseInt(e.target.value, 10) || 0 }))
              }
            />
          </div>
        );
      case 'evaluate':
        return (
          <div className="form-group">
            <label className="form-label">Скрипт (JavaScript)</label>
            <textarea
              className="textarea"
              value={String(stepParams.script ?? '')}
              onChange={(e) => setStepParams((p) => ({ ...p, script: e.target.value }))}
              placeholder="return document.title;"
              rows={4}
            />
          </div>
        );
      default:
        return (
          <div className="form-group">
            <label className="form-label">Параметры (JSON)</label>
            <textarea
              className="textarea"
              value={JSON.stringify(stepParams, null, 2)}
              onChange={(e) => {
                try {
                  setStepParams(JSON.parse(e.target.value || '{}'));
                } catch {
                  // ignore
                }
              }}
              rows={3}
            />
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', gap: 24, height: '100%', minHeight: 0 }}>
      <div className="card" style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <span className="card-title">Сценарии</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateScenario}>
            Создать
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {scenarios.length === 0 ? (
            <p className="empty-state-text">Нет сценариев</p>
          ) : (
            <ul style={{ listStyle: 'none' }}>
              {scenarios.map((s) => (
                <li key={s.id} style={{ marginBottom: 4 }}>
                  <button
                    type="button"
                    className="sidebar-item"
                    style={{
                      width: '100%',
                      background: selectedScenario?.id === s.id ? 'var(--accent-light)' : undefined,
                      color: selectedScenario?.id === s.id ? 'var(--accent)' : undefined,
                    }}
                    onClick={() => setSelectedScenario(s)}
                  >
                    {s.name}
                  </button>
                  {selectedScenario?.id === s.id && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      style={{ marginTop: 4, marginLeft: 8 }}
                      onClick={() => handleDeleteScenario(s.id)}
                    >
                      Удалить
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!selectedScenario ? (
          <div className="empty-state">
            <p className="empty-state-title">Выберите сценарий</p>
            <p className="empty-state-text">Создайте или выберите сценарий из списка слева.</p>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Название</label>
              <input
                type="text"
                className="input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Название сценария"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Описание</label>
              <input
                type="text"
                className="input"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Описание"
              />
            </div>
            <div className="card-header" style={{ marginTop: 8 }}>
              <span className="card-title">Шаги</span>
              <button type="button" className="btn btn-primary btn-sm" onClick={openAddStep}>
                Добавить шаг
              </button>
            </div>
            <div className="table-container" style={{ flex: 1, minHeight: 120 }}>
              {editSteps.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <p className="empty-state-text">Нет шагов. Нажмите «Добавить шаг».</p>
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Тип</th>
                      <th>Параметры</th>
                      <th style={{ width: 100 }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editSteps.map((step) => (
                      <tr key={step.id}>
                        <td>{step.type}</td>
                        <td>
                          <code style={{ fontSize: 12 }}>
                            {JSON.stringify(step.params).slice(0, 80)}
                            {JSON.stringify(step.params).length > 80 ? '…' : ''}
                          </code>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => openEditStep(step)}
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRemoveStep(step.id)}
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
            <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveScenario}
                disabled={saveLoading}
              >
                {saveLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setRunResults(null);
                  setShowRunModal(true);
                }}
              >
                Запустить
              </button>
            </div>
          </>
        )}
      </div>

      {showStepModal && (
        <div className="modal-overlay" onClick={() => setShowStepModal(false)}>
          <div className="modal slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingStep ? 'Редактировать шаг' : 'Добавить шаг'}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowStepModal(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Тип шага</label>
                <select
                  className="select"
                  value={stepType}
                  onChange={(e) => handleStepTypeChange(e.target.value as ScenarioStepType)}
                >
                  {STEP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              {renderStepParamFields()}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setShowStepModal(false)}>
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setStepSaveLoading(true);
                  handleSaveStep();
                }}
                disabled={stepSaveLoading}
              >
                {editingStep ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRunModal && (
        <div className="modal-overlay" onClick={() => !runLoading && setShowRunModal(false)}>
          <div className="modal slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title">Запуск сценария</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => !runLoading && setShowRunModal(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="form-label">Выберите профили для запуска:</p>
              {profiles.length === 0 ? (
                <p className="empty-state-text">Нет профилей</p>
              ) : (
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {profiles.map((p) => (
                    <label
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 0',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={runProfileIds.has(p.id)}
                        onChange={() => toggleRunProfile(p.id)}
                      />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {runResults !== null && (
                <div className="card" style={{ marginTop: 16 }}>
                  <div className="card-title">Результаты</div>
                  {runResults.map((r, i) => (
                    <div key={`${r.profileId}-${i}`} style={{ fontSize: 12, marginTop: 8 }}>
                      <span className={r.status === 'success' ? 'tag tag-active' : 'tag tag-dead'}>
                        {r.status}
                      </span>
                      {' '}
                      {r.stepsCompleted}/{r.totalSteps}
                      {r.errors?.length ? ` — ${r.errors.join(', ')}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setShowRunModal(false)}>
                {runResults !== null ? 'Закрыть' : 'Отмена'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRun}
                disabled={runLoading || runProfileIds.size === 0}
              >
                {runLoading ? 'Запуск...' : 'Запустить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
