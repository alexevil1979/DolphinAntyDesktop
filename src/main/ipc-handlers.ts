import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type {
  ProfileCreateParams,
  ProfileUpdateParams,
  ProxyType,
  BulkAction,
  AppSettings,
  CookieRobotConfig,
  SyncSession,
} from '../shared/types';
import { ProfileManager } from './core/profile-manager';
import { ProxyManager } from './core/proxy-manager';
import { BrowserLauncher } from './core/browser-launcher';
import { ScenarioEngine } from './core/scenario-engine';
import { CookieRobot } from './core/cookie-robot';
import { Synchronizer } from './core/synchronizer';
import { BulkActions } from './core/bulk-actions';
import { AppDatabase } from './database/database';

export class IpcHandlerRegistry {
  private profileManager: ProfileManager;
  private proxyManager: ProxyManager;
  private launcher: BrowserLauncher;
  private scenarioEngine: ScenarioEngine;
  private cookieRobot: CookieRobot;
  private synchronizer: Synchronizer;
  private bulkActions: BulkActions;
  private database: AppDatabase;

  private constructor(database: AppDatabase) {
    this.database = database;
    this.profileManager = new ProfileManager();
    this.proxyManager = new ProxyManager();
    this.launcher = new BrowserLauncher(this.proxyManager);
    this.scenarioEngine = new ScenarioEngine(this.launcher);
    this.cookieRobot = new CookieRobot(this.launcher);
    this.synchronizer = new Synchronizer(this.launcher);
    this.bulkActions = new BulkActions(this.profileManager, this.launcher, this.scenarioEngine);
  }

  static async create(database: AppDatabase): Promise<IpcHandlerRegistry> {
    await database.ensureReady();
    const registry = new IpcHandlerRegistry(database);

    const settings = database.loadSettings();
    if (settings.chromiumPath) {
      registry.launcher.setChromiumPath(settings.chromiumPath);
    }

    registry.loadDataFromDb();
    return registry;
  }

  private loadDataFromDb(): void {
    const profiles = this.database.loadProfiles();
    this.profileManager.loadAll(profiles);

    const proxies = this.database.loadProxies();
    this.proxyManager.loadAll(proxies);

    const scenarios = this.database.loadScenarios();
    this.scenarioEngine.loadAll(scenarios);

    const cookieConfigs = this.database.loadCookieRobotConfigs();
    this.cookieRobot.loadAll(cookieConfigs);

    const syncSessions = this.database.loadSyncSessions();
    this.synchronizer.loadAll(syncSessions);
  }

  private persistProfiles(): void {
    this.database.saveProfiles(this.profileManager.listProfiles());
  }

  private persistProxies(): void {
    this.database.saveProxies(this.proxyManager.listProxies());
  }

  private persistScenarios(): void {
    this.database.saveScenarios(this.scenarioEngine.listScenarios());
  }

  register(): void {
    // ================ PROFILES ================
    ipcMain.handle(IPC_CHANNELS.PROFILES_LIST, () => {
      return this.profileManager.listProfiles();
    });

    ipcMain.handle(IPC_CHANNELS.PROFILES_CREATE, (_e, params: ProfileCreateParams) => {
      const profile = this.profileManager.createProfile(params);
      this.database.saveProfile(profile);
      return profile;
    });

    ipcMain.handle(IPC_CHANNELS.PROFILES_UPDATE, (_e, id: string, params: ProfileUpdateParams) => {
      const profile = this.profileManager.updateProfile(id, params);
      if (profile) this.database.saveProfile(profile);
      return profile;
    });

    ipcMain.handle(IPC_CHANNELS.PROFILES_DELETE, (_e, id: string) => {
      const deleted = this.profileManager.deleteProfile(id);
      if (deleted) this.database.deleteProfileFromDb(id);
      return deleted;
    });

    ipcMain.handle(IPC_CHANNELS.PROFILES_LAUNCH, async (_e, id: string) => {
      const profile = this.profileManager.getProfile(id);
      if (!profile) return { success: false, error: 'Profile not found' };
      const result = await this.launcher.launch(profile);
      if (result.success) {
        this.profileManager.setStatus(id, 'running');
        this.persistProfiles();
      }
      return result;
    });

    ipcMain.handle(IPC_CHANNELS.PROFILES_STOP, async (_e, id: string) => {
      const cookies = await this.launcher.getCookies(id);
      this.profileManager.updateCookies(id, cookies);
      await this.launcher.stop(id);
      this.profileManager.setStatus(id, 'stopped');
      this.persistProfiles();
      return true;
    });

    ipcMain.handle(IPC_CHANNELS.PROFILES_EXPORT, (_e, ids?: string[]) => {
      return this.profileManager.exportProfiles(ids);
    });

    ipcMain.handle(IPC_CHANNELS.PROFILES_IMPORT, (_e, profiles: any[]) => {
      const count = this.profileManager.importProfiles(profiles);
      this.persistProfiles();
      return count;
    });

    // ================ PROXIES ================
    ipcMain.handle(IPC_CHANNELS.PROXIES_LIST, () => {
      return this.proxyManager.listProxies();
    });

    ipcMain.handle(IPC_CHANNELS.PROXIES_ADD, (_e, params: { name?: string; host: string; port: number; type: ProxyType; login?: string; password?: string }) => {
      const proxy = this.proxyManager.addProxy(params);
      this.database.saveProxy(proxy);
      return proxy;
    });

    ipcMain.handle(IPC_CHANNELS.PROXIES_UPDATE, (_e, id: string, params: any) => {
      const proxy = this.proxyManager.updateProxy(id, params);
      if (proxy) this.database.saveProxy(proxy);
      return proxy;
    });

    ipcMain.handle(IPC_CHANNELS.PROXIES_REMOVE, (_e, id: string) => {
      const deleted = this.proxyManager.removeProxy(id);
      if (deleted) this.database.deleteProxyFromDb(id);
      return deleted;
    });

    ipcMain.handle(IPC_CHANNELS.PROXIES_CHECK, async (_e, id: string) => {
      const proxy = await this.proxyManager.checkProxy(id);
      this.database.saveProxy(proxy);
      return proxy;
    });

    ipcMain.handle(IPC_CHANNELS.PROXIES_CHECK_ALL, async () => {
      const results = await this.proxyManager.checkAllProxies();
      this.persistProxies();
      return results;
    });

    // ================ SCENARIOS ================
    ipcMain.handle(IPC_CHANNELS.SCENARIOS_LIST, () => {
      return this.scenarioEngine.listScenarios();
    });

    ipcMain.handle(IPC_CHANNELS.SCENARIOS_CREATE, (_e, params: { name: string; description: string; steps: any[]; tags?: string[] }) => {
      const scenario = this.scenarioEngine.createScenario(params.name, params.description, params.steps, params.tags);
      this.database.saveScenario(scenario);
      return scenario;
    });

    ipcMain.handle(IPC_CHANNELS.SCENARIOS_UPDATE, (_e, id: string, params: any) => {
      const scenario = this.scenarioEngine.updateScenario(id, params);
      if (scenario) this.database.saveScenario(scenario);
      return scenario;
    });

    ipcMain.handle(IPC_CHANNELS.SCENARIOS_DELETE, (_e, id: string) => {
      const deleted = this.scenarioEngine.deleteScenario(id);
      if (deleted) this.database.deleteScenarioFromDb(id);
      return deleted;
    });

    ipcMain.handle(IPC_CHANNELS.SCENARIOS_RUN, async (_e, scenarioId: string, profileIds: string[]) => {
      return this.scenarioEngine.runOnMultipleProfiles(scenarioId, profileIds);
    });

    ipcMain.handle(IPC_CHANNELS.SCENARIOS_STOP, (_e, scenarioId: string, profileId: string) => {
      this.scenarioEngine.stopRun(scenarioId, profileId);
      return true;
    });

    // ================ COOKIE ROBOT ================
    ipcMain.handle(IPC_CHANNELS.COOKIE_ROBOT_START, async (_e, config: Omit<CookieRobotConfig, 'id' | 'status'>) => {
      const created = this.cookieRobot.createConfig(config);
      this.database.saveCookieRobotConfig(created);
      this.cookieRobot.startJob(created.id);
      return created;
    });

    ipcMain.handle(IPC_CHANNELS.COOKIE_ROBOT_STOP, (_e, id: string) => {
      this.cookieRobot.stopJob(id);
      return true;
    });

    ipcMain.handle(IPC_CHANNELS.COOKIE_ROBOT_STATUS, (_e, id: string) => {
      return this.cookieRobot.getStatus(id);
    });

    // ================ SYNCHRONIZER ================
    ipcMain.handle(IPC_CHANNELS.SYNC_START, async (_e, params: Omit<SyncSession, 'id' | 'status'>) => {
      const session = this.synchronizer.createSession(params);
      this.database.saveSyncSession(session);
      await this.synchronizer.start(session.id);
      return session;
    });

    ipcMain.handle(IPC_CHANNELS.SYNC_STOP, (_e, id: string) => {
      this.synchronizer.stop(id);
      return true;
    });

    ipcMain.handle(IPC_CHANNELS.SYNC_STATUS, (_e, id: string) => {
      return this.synchronizer.getSession(id);
    });

    // ================ BULK ACTIONS ================
    ipcMain.handle(IPC_CHANNELS.BULK_EXECUTE, async (_e, action: BulkAction) => {
      const result = await this.bulkActions.execute(action);
      this.persistProfiles();
      return result;
    });

    // ================ SETTINGS ================
    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
      return this.database.loadSettings();
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, (_e, settings: Partial<AppSettings>) => {
      this.database.saveSettings(settings);
      if (settings.chromiumPath) {
        this.launcher.setChromiumPath(settings.chromiumPath);
      }
      return this.database.loadSettings();
    });

    // ================ APP STATUS ================
    ipcMain.handle(IPC_CHANNELS.APP_GET_STATUS, () => {
      return {
        ...this.database.getStats(),
        running: this.launcher.getRunningCount(),
        runningProfiles: this.launcher.getRunningProfileIds(),
      };
    });
  }

  getManagers() {
    return {
      profileManager: this.profileManager,
      proxyManager: this.proxyManager,
      launcher: this.launcher,
      scenarioEngine: this.scenarioEngine,
      bulkActions: this.bulkActions,
    };
  }

  async shutdown(): Promise<void> {
    this.persistProfiles();
    this.persistProxies();
    this.persistScenarios();
    await this.launcher.stopAll();
    this.database.close();
  }
}
