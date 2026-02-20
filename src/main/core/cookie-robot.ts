import type { CookieRobotConfig, CookieRobotProgress } from '../../shared/types';
import type { Page } from 'puppeteer-core';
import { BrowserLauncher } from './browser-launcher';
import { generateId } from './crypto-utils';

export class CookieRobot {
  private configs: Map<string, CookieRobotConfig> = new Map();
  private activeJobs: Map<string, { abort: boolean }> = new Map();
  private launcher: BrowserLauncher;
  private onProgress?: (configId: string, progress: CookieRobotProgress) => void;

  constructor(launcher: BrowserLauncher) {
    this.launcher = launcher;
  }

  setProgressCallback(cb: (configId: string, progress: CookieRobotProgress) => void): void {
    this.onProgress = cb;
  }

  createConfig(params: Omit<CookieRobotConfig, 'id' | 'status'>): CookieRobotConfig {
    const config: CookieRobotConfig = {
      ...params,
      id: generateId(),
      status: 'idle',
    };
    this.configs.set(config.id, config);
    return config;
  }

  getConfig(id: string): CookieRobotConfig | undefined {
    return this.configs.get(id);
  }

  listConfigs(): CookieRobotConfig[] {
    return Array.from(this.configs.values());
  }

  deleteConfig(id: string): boolean {
    this.stopJob(id);
    return this.configs.delete(id);
  }

  async startJob(configId: string): Promise<void> {
    const config = this.configs.get(configId);
    if (!config) throw new Error(`Config ${configId} not found`);
    if (config.status === 'running') throw new Error('Job already running');

    config.status = 'running';
    this.activeJobs.set(configId, { abort: false });

    const progress: CookieRobotProgress = {
      currentProfileIndex: 0,
      currentUrlIndex: 0,
      totalVisits: 0,
      cookiesCollected: 0,
    };
    config.progress = progress;

    try {
      for (let pi = 0; pi < config.profileIds.length; pi++) {
        const jobState = this.activeJobs.get(configId);
        if (jobState?.abort) break;

        const profileId = config.profileIds[pi];
        progress.currentProfileIndex = pi;

        const page = this.launcher.getPage(profileId);
        if (!page) continue;

        for (let ui = 0; ui < config.urls.length; ui++) {
          const jobState2 = this.activeJobs.get(configId);
          if (jobState2?.abort) break;

          progress.currentUrlIndex = ui;
          const url = config.urls[ui];

          for (let visit = 0; visit < config.maxVisitsPerUrl; visit++) {
            const jobState3 = this.activeJobs.get(configId);
            if (jobState3?.abort) break;

            try {
              await this.visitUrl(page, url, config);
              progress.totalVisits++;

              const cookies = await page.cookies();
              progress.cookiesCollected = cookies.length;

              this.onProgress?.(configId, { ...progress });
            } catch {
              // Skip failed visits
            }

            const delay = this.randomDelay(config.delayBetweenVisits.min, config.delayBetweenVisits.max);
            await this.sleep(delay);
          }
        }
      }

      config.status = 'completed';
    } catch {
      config.status = 'idle';
    } finally {
      this.activeJobs.delete(configId);
    }
  }

  stopJob(configId: string): void {
    const job = this.activeJobs.get(configId);
    if (job) {
      job.abort = true;
    }
    const config = this.configs.get(configId);
    if (config) {
      config.status = 'idle';
    }
  }

  getStatus(configId: string): CookieRobotConfig | undefined {
    return this.configs.get(configId);
  }

  private async visitUrl(page: Page, url: string, config: CookieRobotConfig): Promise<void> {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    if (config.warmupDuration > 0) {
      await this.sleep(config.warmupDuration);
    }

    if (config.scrollPage) {
      await this.randomScroll(page);
    }

    if (config.clickRandomLinks && config.maxLinksPerPage > 0) {
      await this.clickRandomLinks(page, config.maxLinksPerPage);
    }
  }

  private async randomScroll(page: Page): Promise<void> {
    const scrollCount = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < scrollCount; i++) {
      const distance = Math.floor(Math.random() * 500) + 100;
      await page.evaluate((d) => window.scrollBy(0, d), distance);
      await this.sleep(Math.floor(Math.random() * 2000) + 500);
    }
  }

  private async clickRandomLinks(page: Page, maxLinks: number): Promise<void> {
    try {
      const links = await page.$$('a[href]');
      const shuffled = links.sort(() => Math.random() - 0.5).slice(0, maxLinks);

      for (const link of shuffled) {
        try {
          const href = await page.evaluate((el) => el.getAttribute('href'), link);
          if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
            await link.click();
            await this.sleep(Math.floor(Math.random() * 3000) + 1000);
            await page.goBack({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
          }
        } catch {
          // Skip problematic links
        }
      }
    } catch {
      // No links found or page error
    }
  }

  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  loadAll(configs: CookieRobotConfig[]): void {
    this.configs.clear();
    for (const c of configs) {
      c.status = 'idle';
      this.configs.set(c.id, c);
    }
  }

  exportAll(): CookieRobotConfig[] {
    return this.listConfigs();
  }
}
