import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { encrypt, decrypt } from '../core/crypto-utils';
import type {
  BrowserProfile,
  ProxyConfig,
  Scenario,
  CookieRobotConfig,
  SyncSession,
  AppSettings,
} from '../../shared/types';

export class AppDatabase {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private encryptionEnabled: boolean = true;
  private initPromise: Promise<void>;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || this.getDefaultDbPath();
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.initPromise = this.initialize();
  }

  private getDefaultDbPath(): string {
    try {
      return path.join(app.getPath('userData'), 'dolphin_anty.db');
    } catch {
      return path.join(process.cwd(), 'data', 'dolphin_anty.db');
    }
  }

  private async initialize(): Promise<void> {
    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS proxies (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cookie_robot_configs (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sync_sessions (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    this.persist();
  }

  async ensureReady(): Promise<void> {
    await this.initPromise;
  }

  private getDb(): SqlJsDatabase {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  private persist(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  setEncryption(enabled: boolean): void {
    this.encryptionEnabled = enabled;
  }

  private encode(data: unknown): string {
    const json = JSON.stringify(data);
    return this.encryptionEnabled ? encrypt(json) : json;
  }

  private decode<T>(data: string): T {
    try {
      const json = this.encryptionEnabled ? decrypt(data) : data;
      return JSON.parse(json) as T;
    } catch {
      return JSON.parse(data) as T;
    }
  }

  // ================ PROFILES ================

  saveProfile(profile: BrowserProfile): void {
    const db = this.getDb();
    db.run(
      'INSERT OR REPLACE INTO profiles (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [profile.id, this.encode(profile), profile.createdAt, profile.updatedAt]
    );
    this.persist();
  }

  saveProfiles(profiles: BrowserProfile[]): void {
    const db = this.getDb();
    for (const p of profiles) {
      db.run(
        'INSERT OR REPLACE INTO profiles (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [p.id, this.encode(p), p.createdAt, p.updatedAt]
      );
    }
    this.persist();
  }

  loadProfiles(): BrowserProfile[] {
    const db = this.getDb();
    const results = db.exec('SELECT data FROM profiles ORDER BY updated_at DESC');
    if (results.length === 0) return [];
    return results[0].values.map((row) => this.decode<BrowserProfile>(row[0] as string));
  }

  deleteProfileFromDb(id: string): void {
    this.getDb().run('DELETE FROM profiles WHERE id = ?', [id]);
    this.persist();
  }

  // ================ PROXIES ================

  saveProxy(proxy: ProxyConfig): void {
    this.getDb().run(
      'INSERT OR REPLACE INTO proxies (id, data) VALUES (?, ?)',
      [proxy.id, this.encode(proxy)]
    );
    this.persist();
  }

  saveProxies(proxies: ProxyConfig[]): void {
    const db = this.getDb();
    for (const p of proxies) {
      db.run('INSERT OR REPLACE INTO proxies (id, data) VALUES (?, ?)', [p.id, this.encode(p)]);
    }
    this.persist();
  }

  loadProxies(): ProxyConfig[] {
    const results = this.getDb().exec('SELECT data FROM proxies');
    if (results.length === 0) return [];
    return results[0].values.map((row) => this.decode<ProxyConfig>(row[0] as string));
  }

  deleteProxyFromDb(id: string): void {
    this.getDb().run('DELETE FROM proxies WHERE id = ?', [id]);
    this.persist();
  }

  // ================ SCENARIOS ================

  saveScenario(scenario: Scenario): void {
    this.getDb().run(
      'INSERT OR REPLACE INTO scenarios (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [scenario.id, this.encode(scenario), scenario.createdAt, scenario.updatedAt]
    );
    this.persist();
  }

  saveScenarios(scenarios: Scenario[]): void {
    const db = this.getDb();
    for (const s of scenarios) {
      db.run(
        'INSERT OR REPLACE INTO scenarios (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [s.id, this.encode(s), s.createdAt, s.updatedAt]
      );
    }
    this.persist();
  }

  loadScenarios(): Scenario[] {
    const results = this.getDb().exec('SELECT data FROM scenarios ORDER BY updated_at DESC');
    if (results.length === 0) return [];
    return results[0].values.map((row) => this.decode<Scenario>(row[0] as string));
  }

  deleteScenarioFromDb(id: string): void {
    this.getDb().run('DELETE FROM scenarios WHERE id = ?', [id]);
    this.persist();
  }

  // ================ COOKIE ROBOT ================

  saveCookieRobotConfig(config: CookieRobotConfig): void {
    this.getDb().run(
      'INSERT OR REPLACE INTO cookie_robot_configs (id, data) VALUES (?, ?)',
      [config.id, this.encode(config)]
    );
    this.persist();
  }

  loadCookieRobotConfigs(): CookieRobotConfig[] {
    const results = this.getDb().exec('SELECT data FROM cookie_robot_configs');
    if (results.length === 0) return [];
    return results[0].values.map((row) => this.decode<CookieRobotConfig>(row[0] as string));
  }

  // ================ SYNC SESSIONS ================

  saveSyncSession(session: SyncSession): void {
    this.getDb().run(
      'INSERT OR REPLACE INTO sync_sessions (id, data) VALUES (?, ?)',
      [session.id, this.encode(session)]
    );
    this.persist();
  }

  loadSyncSessions(): SyncSession[] {
    const results = this.getDb().exec('SELECT data FROM sync_sessions');
    if (results.length === 0) return [];
    return results[0].values.map((row) => this.decode<SyncSession>(row[0] as string));
  }

  // ================ SETTINGS ================

  saveSetting(key: string, value: unknown): void {
    this.getDb().run(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, JSON.stringify(value)]
    );
    this.persist();
  }

  loadSetting<T>(key: string, defaultValue: T): T {
    const stmt = this.getDb().prepare('SELECT value FROM settings WHERE key = ?');
    stmt.bind([key]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      try {
        return JSON.parse(row.value as string) as T;
      } catch {
        return defaultValue;
      }
    }
    stmt.free();
    return defaultValue;
  }

  loadSettings(): AppSettings {
    return {
      encryptionEnabled: this.loadSetting('encryptionEnabled', true),
      apiPort: this.loadSetting('apiPort', 3001),
      apiEnabled: this.loadSetting('apiEnabled', false),
      chromiumPath: this.loadSetting('chromiumPath', ''),
      defaultProxyId: this.loadSetting('defaultProxyId', undefined),
      maxConcurrentProfiles: this.loadSetting('maxConcurrentProfiles', 10),
      theme: this.loadSetting('theme', 'dark'),
      language: this.loadSetting('language', 'ru'),
      autoUpdate: this.loadSetting('autoUpdate', true),
      cloudSyncEnabled: this.loadSetting('cloudSyncEnabled', false),
      cloudSyncUrl: this.loadSetting('cloudSyncUrl', undefined),
      cloudSyncToken: this.loadSetting('cloudSyncToken', undefined),
    };
  }

  saveSettings(settings: Partial<AppSettings>): void {
    for (const [key, value] of Object.entries(settings)) {
      this.saveSetting(key, value);
    }
  }

  // ================ UTILITIES ================

  close(): void {
    if (this.db) {
      this.persist();
      this.db.close();
      this.db = null;
    }
  }

  getStats(): { profiles: number; proxies: number; scenarios: number } {
    const db = this.getDb();

    const getCount = (table: string): number => {
      const result = db.exec(`SELECT COUNT(*) as count FROM ${table}`);
      if (result.length === 0) return 0;
      return result[0].values[0][0] as number;
    };

    return {
      profiles: getCount('profiles'),
      proxies: getCount('proxies'),
      scenarios: getCount('scenarios'),
    };
  }
}
