// ==================== FINGERPRINT ====================

export interface Fingerprint {
  userAgent: string;
  platform: string;
  screenResolution: { width: number; height: number };
  colorDepth: number;
  timezone: string;
  language: string;
  languages: string[];
  hardwareConcurrency: number;
  deviceMemory: number;
  webglVendor: string;
  webglRenderer: string;
  canvas: { noise: number; seed: number };
  audioContext: { noise: number; seed: number };
  fonts: string[];
  plugins: string[];
  doNotTrack: string | null;
  touchSupport: { maxTouchPoints: number; touchEvent: boolean };
  webRTC: WebRTCConfig;
  mediaDevices: { audioinput: number; videoinput: number; audiooutput: number };
}

export interface WebRTCConfig {
  mode: 'real' | 'disabled' | 'manual';
  publicIp?: string;
  localIp?: string;
}

// ==================== PROXY ====================

export type ProxyType = 'http' | 'https' | 'socks4' | 'socks5';

export interface ProxyConfig {
  id: string;
  name: string;
  type: ProxyType;
  host: string;
  port: number;
  login?: string;
  password?: string;
  lastCheck?: string;
  status: 'unchecked' | 'active' | 'dead';
  responseTime?: number;
  country?: string;
  ip?: string;
}

// ==================== PROFILE ====================

export type ProfileStatus = 'stopped' | 'running' | 'error';

export interface BrowserProfile {
  id: string;
  name: string;
  status: ProfileStatus;
  fingerprint: Fingerprint;
  proxyId?: string;
  tags: string[];
  notes: string;
  cookies: string;
  extensions: string[];
  userDataDir: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  group?: string;
}

export interface ProfileCreateParams {
  name: string;
  proxyId?: string;
  tags?: string[];
  notes?: string;
  fingerprintOverrides?: Partial<Fingerprint>;
  group?: string;
}

export interface ProfileUpdateParams {
  name?: string;
  proxyId?: string;
  tags?: string[];
  notes?: string;
  fingerprint?: Partial<Fingerprint>;
  cookies?: string;
  extensions?: string[];
  group?: string;
}

// ==================== SCENARIO ====================

export type ScenarioStepType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'wait'
  | 'waitForSelector'
  | 'screenshot'
  | 'scroll'
  | 'evaluate'
  | 'keypress'
  | 'select'
  | 'hover'
  | 'cookie_set'
  | 'cookie_get'
  | 'cookie_clear'
  | 'condition'
  | 'loop';

export interface ScenarioStep {
  id: string;
  type: ScenarioStepType;
  params: Record<string, unknown>;
  description?: string;
  onError?: 'stop' | 'skip' | 'retry';
  retryCount?: number;
  timeout?: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface ScenarioRunResult {
  scenarioId: string;
  profileId: string;
  status: 'success' | 'error' | 'partial';
  stepsCompleted: number;
  totalSteps: number;
  errors: string[];
  startedAt: string;
  finishedAt: string;
  screenshots: string[];
}

// ==================== COOKIE ROBOT ====================

export interface CookieRobotConfig {
  id: string;
  name: string;
  urls: string[];
  profileIds: string[];
  maxVisitsPerUrl: number;
  delayBetweenVisits: { min: number; max: number };
  scrollPage: boolean;
  clickRandomLinks: boolean;
  maxLinksPerPage: number;
  warmupDuration: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
  progress?: CookieRobotProgress;
}

export interface CookieRobotProgress {
  currentProfileIndex: number;
  currentUrlIndex: number;
  totalVisits: number;
  cookiesCollected: number;
}

// ==================== SYNCHRONIZER ====================

export interface SyncSession {
  id: string;
  masterProfileId: string;
  slaveProfileIds: string[];
  status: 'idle' | 'running' | 'stopped';
  syncMouse: boolean;
  syncKeyboard: boolean;
  syncNavigation: boolean;
  syncScroll: boolean;
  delay: { min: number; max: number };
}

// ==================== BULK ACTIONS ====================

export type BulkActionType =
  | 'launch'
  | 'stop'
  | 'delete'
  | 'export'
  | 'import'
  | 'set_proxy'
  | 'clear_cookies'
  | 'run_scenario'
  | 'update_fingerprint'
  | 'add_tags';

export interface BulkAction {
  type: BulkActionType;
  profileIds: string[];
  params?: Record<string, unknown>;
}

export interface BulkActionResult {
  type: BulkActionType;
  total: number;
  success: number;
  failed: number;
  errors: Array<{ profileId: string; error: string }>;
}

// ==================== API ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================== APP SETTINGS ====================

export interface AppSettings {
  encryptionEnabled: boolean;
  apiPort: number;
  apiEnabled: boolean;
  chromiumPath: string;
  defaultProxyId?: string;
  maxConcurrentProfiles: number;
  theme: 'dark' | 'light';
  language: 'ru' | 'en';
  autoUpdate: boolean;
  cloudSyncEnabled: boolean;
  cloudSyncUrl?: string;
  cloudSyncToken?: string;
}

// ==================== IPC CHANNELS ====================

export const IPC_CHANNELS = {
  PROFILES_LIST: 'profiles:list',
  PROFILES_CREATE: 'profiles:create',
  PROFILES_UPDATE: 'profiles:update',
  PROFILES_DELETE: 'profiles:delete',
  PROFILES_LAUNCH: 'profiles:launch',
  PROFILES_STOP: 'profiles:stop',
  PROFILES_EXPORT: 'profiles:export',
  PROFILES_IMPORT: 'profiles:import',

  PROXIES_LIST: 'proxies:list',
  PROXIES_ADD: 'proxies:add',
  PROXIES_UPDATE: 'proxies:update',
  PROXIES_REMOVE: 'proxies:remove',
  PROXIES_CHECK: 'proxies:check',
  PROXIES_CHECK_ALL: 'proxies:checkAll',

  SCENARIOS_LIST: 'scenarios:list',
  SCENARIOS_CREATE: 'scenarios:create',
  SCENARIOS_UPDATE: 'scenarios:update',
  SCENARIOS_DELETE: 'scenarios:delete',
  SCENARIOS_RUN: 'scenarios:run',
  SCENARIOS_STOP: 'scenarios:stop',

  COOKIE_ROBOT_START: 'cookieRobot:start',
  COOKIE_ROBOT_STOP: 'cookieRobot:stop',
  COOKIE_ROBOT_STATUS: 'cookieRobot:status',

  SYNC_START: 'sync:start',
  SYNC_STOP: 'sync:stop',
  SYNC_STATUS: 'sync:status',

  BULK_EXECUTE: 'bulk:execute',

  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  APP_GET_STATUS: 'app:getStatus',
} as const;
