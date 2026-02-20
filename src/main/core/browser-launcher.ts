import type { BrowserProfile, ProxyConfig } from '../../shared/types';
import type { Browser, Page } from 'puppeteer-core';
import puppeteer from 'puppeteer-core';
import { FingerprintEngine } from './fingerprint-engine';
import { ProxyManager } from './proxy-manager';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

interface LaunchedBrowser {
  browser: Browser;
  page: Page;
  profileId: string;
}

export class BrowserLauncher {
  private browsers: Map<string, LaunchedBrowser> = new Map();
  private fingerprintEngine: FingerprintEngine;
  private proxyManager: ProxyManager;
  private chromiumPath: string;

  constructor(proxyManager: ProxyManager, chromiumPath?: string) {
    this.fingerprintEngine = new FingerprintEngine();
    this.proxyManager = proxyManager;
    this.chromiumPath = chromiumPath || this.detectChromiumPath();
  }

  private detectChromiumPath(): string {
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe'),
      'C:\\Program Files\\Chromium\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }

    return possiblePaths[0];
  }

  setChromiumPath(chromiumPath: string): void {
    this.chromiumPath = chromiumPath;
  }

  async launch(profile: BrowserProfile): Promise<{ success: boolean; error?: string }> {
    if (this.browsers.has(profile.id)) {
      return { success: false, error: 'Profile is already running' };
    }

    try {
      let userDataDir: string;
      try {
        userDataDir = path.join(app.getPath('userData'), 'browser_profiles', profile.id);
      } catch {
        userDataDir = path.join(process.cwd(), 'data', 'browser_profiles', profile.id);
      }

      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }

      const args = [
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-infobars',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        `--window-size=${profile.fingerprint.screenResolution.width},${profile.fingerprint.screenResolution.height}`,
        `--lang=${profile.fingerprint.language}`,
      ];

      let proxy: ProxyConfig | undefined;
      if (profile.proxyId) {
        proxy = this.proxyManager.getProxy(profile.proxyId);
        if (proxy) {
          args.push(...this.proxyManager.toPuppeteerArgs(proxy));
        }
      }

      if (profile.fingerprint.webRTC.mode === 'disabled') {
        args.push('--disable-webrtc-hw-encoding', '--disable-webrtc-hw-decoding');
      }

      const browser = await puppeteer.launch({
        executablePath: this.chromiumPath,
        userDataDir,
        headless: false,
        args,
        defaultViewport: {
          width: profile.fingerprint.screenResolution.width,
          height: profile.fingerprint.screenResolution.height - 100,
        },
        ignoreDefaultArgs: ['--enable-automation'],
      });

      const pages = await browser.pages();
      const page = pages[0] || await browser.newPage();

      if (proxy) {
        const creds = this.proxyManager.getAuthCredentials(proxy);
        if (creds) {
          await page.authenticate(creds);
        }
      }

      await this.fingerprintEngine.applyToPage(page, profile.fingerprint);

      if (profile.cookies) {
        try {
          const cookies = JSON.parse(profile.cookies);
          if (Array.isArray(cookies) && cookies.length > 0) {
            await page.setCookie(...cookies);
          }
        } catch {
          // Invalid cookies format, skip
        }
      }

      browser.on('disconnected', () => {
        this.browsers.delete(profile.id);
      });

      this.browsers.set(profile.id, { browser, page, profileId: profile.id });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async stop(profileId: string): Promise<boolean> {
    const entry = this.browsers.get(profileId);
    if (!entry) return false;

    try {
      await entry.browser.close();
    } catch {
      // Browser might already be closed
    }
    this.browsers.delete(profileId);
    return true;
  }

  async stopAll(): Promise<void> {
    const ids = Array.from(this.browsers.keys());
    await Promise.allSettled(ids.map((id) => this.stop(id)));
  }

  isRunning(profileId: string): boolean {
    return this.browsers.has(profileId);
  }

  getBrowser(profileId: string): Browser | undefined {
    return this.browsers.get(profileId)?.browser;
  }

  getPage(profileId: string): Page | undefined {
    return this.browsers.get(profileId)?.page;
  }

  getRunningCount(): number {
    return this.browsers.size;
  }

  getRunningProfileIds(): string[] {
    return Array.from(this.browsers.keys());
  }

  async getCookies(profileId: string): Promise<string> {
    const entry = this.browsers.get(profileId);
    if (!entry) return '[]';
    try {
      const cookies = await entry.page.cookies();
      return JSON.stringify(cookies);
    } catch {
      return '[]';
    }
  }

  async getNewPage(profileId: string): Promise<Page | null> {
    const entry = this.browsers.get(profileId);
    if (!entry) return null;
    const page = await entry.browser.newPage();
    await this.fingerprintEngine.applyToPage(page, {} as any);
    return page;
  }
}
