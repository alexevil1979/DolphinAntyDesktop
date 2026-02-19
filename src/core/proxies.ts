import http from 'http';
import https from 'https';

export interface ProxyConfig {
  id: string;
  host: string;
  port: number;
  type: 'http' | 'https' | 'socks5';
  login?: string;
  password?: string;
  lastCheck?: string;
  latency?: number;
  isAlive?: boolean;
}

export class ProxyManager {
  private proxies: Map<string, ProxyConfig> = new Map();

  listProxies(): ProxyConfig[] {
    return Array.from(this.proxies.values());
  }

  addProxy(config: Omit<ProxyConfig, 'id'>): ProxyConfig {
    const id = require('crypto').randomBytes(8).toString('hex');
    const proxy: ProxyConfig = { id, ...config };
    this.proxies.set(id, proxy);
    return proxy;
  }

  removeProxy(id: string): boolean {
    return this.proxies.delete(id);
  }

  getProxy(id: string): ProxyConfig | undefined {
    return this.proxies.get(id);
  }

  async checkProxy(id: string): Promise<{ alive: boolean; latency: number }> {
    const proxy = this.proxies.get(id);
    if (!proxy) throw new Error(`Proxy ${id} not found`);

    const start = Date.now();
    try {
      await this.testConnection(proxy);
      const latency = Date.now() - start;
      proxy.isAlive = true;
      proxy.latency = latency;
      proxy.lastCheck = new Date().toISOString();
      return { alive: true, latency };
    } catch {
      proxy.isAlive = false;
      proxy.lastCheck = new Date().toISOString();
      return { alive: false, latency: -1 };
    }
  }

  async checkAll(): Promise<Map<string, { alive: boolean; latency: number }>> {
    const results = new Map<string, { alive: boolean; latency: number }>();
    const checks = Array.from(this.proxies.keys()).map(async (id) => {
      const result = await this.checkProxy(id);
      results.set(id, result);
    });
    await Promise.allSettled(checks);
    return results;
  }

  toPuppeteerArg(id: string): string | null {
    const proxy = this.proxies.get(id);
    if (!proxy) return null;
    return `--proxy-server=${proxy.type}://${proxy.host}:${proxy.port}`;
  }

  private testConnection(proxy: ProxyConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: http.RequestOptions = {
        host: proxy.host,
        port: proxy.port,
        method: 'CONNECT',
        path: 'www.google.com:443',
        timeout: 10000,
      };

      if (proxy.login && proxy.password) {
        const auth = Buffer.from(`${proxy.login}:${proxy.password}`).toString('base64');
        options.headers = { 'Proxy-Authorization': `Basic ${auth}` };
      }

      const req = http.request(options);
      req.on('connect', (_res, socket) => {
        socket.destroy();
        resolve();
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Proxy connection timeout'));
      });
      req.end();
    });
  }
}
