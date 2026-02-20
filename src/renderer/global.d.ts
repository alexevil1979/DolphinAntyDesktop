import type {
  BrowserProfile,
  ProfileCreateParams,
  ProfileUpdateParams,
  ProxyConfig,
  ProxyType,
  Scenario,
  ScenarioRunResult,
  CookieRobotConfig,
  SyncSession,
  BulkAction,
  BulkActionResult,
  AppSettings,
} from '../shared/types';

interface ElectronAPI {
  profiles: {
    list(): Promise<BrowserProfile[]>;
    create(params: ProfileCreateParams): Promise<BrowserProfile>;
    update(id: string, params: ProfileUpdateParams): Promise<BrowserProfile | null>;
    delete(id: string): Promise<boolean>;
    launch(id: string): Promise<{ success: boolean; error?: string }>;
    stop(id: string): Promise<boolean>;
    export(ids?: string[]): Promise<BrowserProfile[]>;
    import(data: BrowserProfile[]): Promise<number>;
  };
  proxies: {
    list(): Promise<ProxyConfig[]>;
    add(params: { name?: string; host: string; port: number; type: ProxyType; login?: string; password?: string }): Promise<ProxyConfig>;
    update(id: string, params: Partial<ProxyConfig>): Promise<ProxyConfig | null>;
    remove(id: string): Promise<boolean>;
    check(id: string): Promise<ProxyConfig>;
    checkAll(): Promise<ProxyConfig[]>;
  };
  scenarios: {
    list(): Promise<Scenario[]>;
    create(params: { name: string; description: string; steps: any[]; tags?: string[] }): Promise<Scenario>;
    update(id: string, params: Partial<Scenario>): Promise<Scenario | null>;
    delete(id: string): Promise<boolean>;
    run(id: string, profileIds: string[]): Promise<ScenarioRunResult[]>;
    stop(id: string, profileId: string): Promise<boolean>;
  };
  cookieRobot: {
    start(config: Omit<CookieRobotConfig, 'id' | 'status'>): Promise<CookieRobotConfig>;
    stop(id: string): Promise<boolean>;
    status(id: string): Promise<CookieRobotConfig | undefined>;
  };
  sync: {
    start(params: Omit<SyncSession, 'id' | 'status'>): Promise<SyncSession>;
    stop(id: string): Promise<boolean>;
    status(id: string): Promise<SyncSession | undefined>;
  };
  bulk: {
    execute(action: BulkAction): Promise<BulkActionResult>;
  };
  settings: {
    get(): Promise<AppSettings>;
    update(settings: Partial<AppSettings>): Promise<AppSettings>;
  };
  app: {
    getStatus(): Promise<{
      profiles: number;
      running: number;
      proxies: number;
      scenarios: number;
      runningProfiles: string[];
    }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
