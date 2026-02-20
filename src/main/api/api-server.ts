import express from 'express';
import type { Server } from 'http';
import type { ProfileManager } from '../core/profile-manager';
import type { ProxyManager } from '../core/proxy-manager';
import type { BrowserLauncher } from '../core/browser-launcher';
import type { ScenarioEngine } from '../core/scenario-engine';
import type { BulkActions } from '../core/bulk-actions';
import type { ApiResponse } from '../../shared/types';

export class ApiServer {
  private app: express.Application;
  private server: Server | null = null;
  private profileManager: ProfileManager;
  private proxyManager: ProxyManager;
  private launcher: BrowserLauncher;
  private scenarioEngine: ScenarioEngine;
  private bulkActions: BulkActions;

  constructor(
    profileManager: ProfileManager,
    proxyManager: ProxyManager,
    launcher: BrowserLauncher,
    scenarioEngine: ScenarioEngine,
    bulkActions: BulkActions
  ) {
    this.profileManager = profileManager;
    this.proxyManager = proxyManager;
    this.launcher = launcher;
    this.scenarioEngine = scenarioEngine;
    this.bulkActions = bulkActions;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });
  }

  private setupRoutes(): void {
    // ========== PROFILES ==========
    this.app.get('/api/v1/profiles', (_req, res) => {
      this.respond(res, () => this.profileManager.listProfiles());
    });

    this.app.get('/api/v1/profiles/:id', (req, res) => {
      this.respond(res, () => {
        const profile = this.profileManager.getProfile(req.params.id);
        if (!profile) throw new Error('Profile not found');
        return profile;
      });
    });

    this.app.post('/api/v1/profiles', (req, res) => {
      this.respond(res, () => this.profileManager.createProfile(req.body));
    });

    this.app.patch('/api/v1/profiles/:id', (req, res) => {
      this.respond(res, () => {
        const result = this.profileManager.updateProfile(req.params.id, req.body);
        if (!result) throw new Error('Profile not found');
        return result;
      });
    });

    this.app.delete('/api/v1/profiles/:id', (req, res) => {
      this.respond(res, () => {
        if (!this.profileManager.deleteProfile(req.params.id)) {
          throw new Error('Profile not found');
        }
        return { deleted: true };
      });
    });

    this.app.post('/api/v1/profiles/:id/start', async (req, res) => {
      await this.respondAsync(res, async () => {
        const profile = this.profileManager.getProfile(req.params.id);
        if (!profile) throw new Error('Profile not found');
        const result = await this.launcher.launch(profile);
        if (!result.success) throw new Error(result.error);
        this.profileManager.setStatus(req.params.id, 'running');
        return { started: true };
      });
    });

    this.app.post('/api/v1/profiles/:id/stop', async (req, res) => {
      await this.respondAsync(res, async () => {
        await this.launcher.stop(req.params.id);
        this.profileManager.setStatus(req.params.id, 'stopped');
        return { stopped: true };
      });
    });

    // ========== PROXIES ==========
    this.app.get('/api/v1/proxies', (_req, res) => {
      this.respond(res, () => this.proxyManager.listProxies());
    });

    this.app.post('/api/v1/proxies', (req, res) => {
      this.respond(res, () => this.proxyManager.addProxy(req.body));
    });

    this.app.delete('/api/v1/proxies/:id', (req, res) => {
      this.respond(res, () => {
        if (!this.proxyManager.removeProxy(req.params.id)) {
          throw new Error('Proxy not found');
        }
        return { deleted: true };
      });
    });

    this.app.post('/api/v1/proxies/:id/check', async (req, res) => {
      await this.respondAsync(res, () => this.proxyManager.checkProxy(req.params.id));
    });

    // ========== SCENARIOS ==========
    this.app.get('/api/v1/scenarios', (_req, res) => {
      this.respond(res, () => this.scenarioEngine.listScenarios());
    });

    this.app.post('/api/v1/scenarios', (req, res) => {
      this.respond(res, () => {
        const { name, description, steps, tags } = req.body;
        return this.scenarioEngine.createScenario(name, description, steps, tags);
      });
    });

    this.app.post('/api/v1/scenarios/:id/run', async (req, res) => {
      await this.respondAsync(res, () => {
        const { profileIds } = req.body;
        return this.scenarioEngine.runOnMultipleProfiles(req.params.id, profileIds);
      });
    });

    // ========== BULK ==========
    this.app.post('/api/v1/bulk', async (req, res) => {
      await this.respondAsync(res, () => this.bulkActions.execute(req.body));
    });

    // ========== STATUS ==========
    this.app.get('/api/v1/status', (_req, res) => {
      this.respond(res, () => ({
        profiles: this.profileManager.getCount(),
        running: this.launcher.getRunningCount(),
        proxies: this.proxyManager.listProxies().length,
        scenarios: this.scenarioEngine.listScenarios().length,
      }));
    });
  }

  private respond<T>(res: express.Response, fn: () => T): void {
    try {
      const data = fn();
      const response: ApiResponse<T> = { success: true, data };
      res.json(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const response: ApiResponse = { success: false, error: message };
      res.status(400).json(response);
    }
  }

  private async respondAsync<T>(res: express.Response, fn: () => Promise<T>): Promise<void> {
    try {
      const data = await fn();
      const response: ApiResponse<T> = { success: true, data };
      res.json(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const response: ApiResponse = { success: false, error: message };
      res.status(400).json(response);
    }
  }

  start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, '127.0.0.1', () => {
          console.log(`API server running on http://127.0.0.1:${port}`);
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
