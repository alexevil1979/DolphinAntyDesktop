import { ScenarioEngine } from '../src/main/core/scenario-engine';
import type { ScenarioStep } from '../src/shared/types';

const mockLauncher = {
  getPage: jest.fn(),
  getBrowser: jest.fn(),
  launch: jest.fn(),
  stop: jest.fn(),
  isRunning: jest.fn(),
  getRunningCount: jest.fn(),
  getRunningProfileIds: jest.fn(),
  getCookies: jest.fn(),
  stopAll: jest.fn(),
  setChromiumPath: jest.fn(),
  getNewPage: jest.fn(),
};

describe('ScenarioEngine', () => {
  let engine: ScenarioEngine;

  beforeEach(() => {
    engine = new ScenarioEngine(mockLauncher as any);
    jest.clearAllMocks();
  });

  test('createScenario() creates a scenario with correct fields', () => {
    const steps: ScenarioStep[] = [
      { id: 's1', type: 'navigate', params: { url: 'https://example.com' } },
      { id: 's2', type: 'wait', params: { ms: 1000 } },
    ];

    const scenario = engine.createScenario('Test Scenario', 'A test', steps, ['test']);

    expect(scenario.id).toBeTruthy();
    expect(scenario.name).toBe('Test Scenario');
    expect(scenario.description).toBe('A test');
    expect(scenario.steps.length).toBe(2);
    expect(scenario.tags).toEqual(['test']);
    expect(scenario.createdAt).toBeTruthy();
  });

  test('listScenarios() returns all scenarios', () => {
    engine.createScenario('S1', '', []);
    engine.createScenario('S2', '', []);
    engine.createScenario('S3', '', []);

    expect(engine.listScenarios().length).toBe(3);
  });

  test('getScenario() returns the correct scenario', () => {
    const created = engine.createScenario('Find Me', '', []);
    const found = engine.getScenario(created.id);

    expect(found).toBeDefined();
    expect(found!.name).toBe('Find Me');
  });

  test('getScenario() returns undefined for non-existent id', () => {
    expect(engine.getScenario('non-existent')).toBeUndefined();
  });

  test('updateScenario() updates scenario fields', () => {
    const scenario = engine.createScenario('Original', 'Desc', []);
    const updated = engine.updateScenario(scenario.id, {
      name: 'Updated',
      description: 'New desc',
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Updated');
    expect(updated!.description).toBe('New desc');
  });

  test('updateScenario() returns null for non-existent id', () => {
    expect(engine.updateScenario('non-existent', { name: 'X' })).toBeNull();
  });

  test('deleteScenario() removes a scenario', () => {
    const scenario = engine.createScenario('Delete Me', '', []);
    expect(engine.listScenarios().length).toBe(1);

    const deleted = engine.deleteScenario(scenario.id);
    expect(deleted).toBe(true);
    expect(engine.listScenarios().length).toBe(0);
  });

  test('deleteScenario() returns false for non-existent id', () => {
    expect(engine.deleteScenario('non-existent')).toBe(false);
  });

  test('runOnProfile() throws when scenario not found', async () => {
    await expect(engine.runOnProfile('bad-id', 'profile-1'))
      .rejects.toThrow('Scenario bad-id not found');
  });

  test('runOnProfile() throws when profile not running', async () => {
    const scenario = engine.createScenario('Test', '', [
      { id: 's1', type: 'navigate', params: { url: 'https://example.com' } },
    ]);
    mockLauncher.getPage.mockReturnValue(null);

    await expect(engine.runOnProfile(scenario.id, 'profile-1'))
      .rejects.toThrow('Profile profile-1 is not running');
  });

  test('runOnProfile() executes navigate step', async () => {
    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
    };
    mockLauncher.getPage.mockReturnValue(mockPage);

    const scenario = engine.createScenario('Nav Test', '', [
      { id: 's1', type: 'navigate', params: { url: 'https://example.com' } },
    ]);

    const result = await engine.runOnProfile(scenario.id, 'profile-1');

    expect(result.status).toBe('success');
    expect(result.stepsCompleted).toBe(1);
    expect(result.totalSteps).toBe(1);
    expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object));
  });

  test('runOnProfile() handles step errors with skip', async () => {
    const mockPage = {
      goto: jest.fn().mockRejectedValue(new Error('Navigation failed')),
    };
    mockLauncher.getPage.mockReturnValue(mockPage);

    const scenario = engine.createScenario('Error Test', '', [
      { id: 's1', type: 'navigate', params: { url: 'https://bad.com' }, onError: 'skip' },
      { id: 's2', type: 'navigate', params: { url: 'https://good.com' }, onError: 'skip' },
    ]);

    const result = await engine.runOnProfile(scenario.id, 'profile-1');

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.stepsCompleted).toBe(2);
  });

  test('runOnProfile() handles step errors with stop', async () => {
    const mockPage = {
      goto: jest.fn().mockRejectedValue(new Error('Navigation failed')),
    };
    mockLauncher.getPage.mockReturnValue(mockPage);

    const scenario = engine.createScenario('Stop Test', '', [
      { id: 's1', type: 'navigate', params: { url: 'https://bad.com' }, onError: 'stop' },
      { id: 's2', type: 'navigate', params: { url: 'https://never.com' } },
    ]);

    const result = await engine.runOnProfile(scenario.id, 'profile-1');

    expect(result.status).toBe('error');
    expect(result.stepsCompleted).toBe(0);
    expect(mockPage.goto).toHaveBeenCalledTimes(1);
  });

  test('loadAll() replaces all scenarios', () => {
    engine.createScenario('S1', '', []);
    expect(engine.listScenarios().length).toBe(1);

    engine.loadAll([
      { id: 'l1', name: 'Loaded 1', description: '', steps: [], createdAt: '', updatedAt: '', tags: [] },
      { id: 'l2', name: 'Loaded 2', description: '', steps: [], createdAt: '', updatedAt: '', tags: [] },
    ]);

    expect(engine.listScenarios().length).toBe(2);
    expect(engine.getScenario('l1')).toBeDefined();
  });

  test('exportAll() returns all scenarios', () => {
    engine.createScenario('S1', '', []);
    engine.createScenario('S2', '', []);

    const exported = engine.exportAll();
    expect(exported.length).toBe(2);
  });
});
