import type { ProxyConfig, ProxyType } from '../../shared/types';
import { generateId } from './crypto-utils';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';

export class ProxyManager {
  private proxies: Map<string, ProxyConfig> = new Map();

  listProxies(): ProxyConfig[] {
    return Array.from(this.proxies.values());
  }

  addProxy(params: {
    name?: string;
    host: string;
    port: number;
    type: ProxyType;
    login?: string;
    password?: string;
  }): ProxyConfig {
    const proxy: ProxyConfig = {
      id: generateId(),
      name: params.name || `${params.host}:${params.port}`,
      type: params.type,
      host: params.host,
      port: params.port,
      login: params.login,
      password: params.password,
      status: 'unchecked',
    };
    this.proxies.set(proxy.id, proxy);
    return proxy;
  }

  removeProxy(id: string): boolean {
    return this.proxies.delete(id);
  }

  getProxy(id: string): ProxyConfig | undefined {
    return this.proxies.get(id);
  }

  updateProxy(id: string, updates: Partial<ProxyConfig>): ProxyConfig | null {
    const proxy = this.proxies.get(id);
    if (!proxy) return null;
    const updated = { ...proxy, ...updates };
    this.proxies.set(id, updated);
    return updated;
  }

  async checkProxy(id: string): Promise<ProxyConfig> {
    const proxy = this.proxies.get(id);
    if (!proxy) throw new Error(`Proxy ${id} not found`);

    try {
      const start = Date.now();
      const result = await this.testConnection(proxy);
      const responseTime = Date.now() - start;

      proxy.status = 'active';
      proxy.responseTime = responseTime;
      proxy.lastCheck = new Date().toISOString();
      proxy.ip = result.ip;
      proxy.country = result.country;
    } catch {
      proxy.status = 'dead';
      proxy.lastCheck = new Date().toISOString();
    }

    this.proxies.set(id, proxy);
    return proxy;
  }

  async checkAllProxies(): Promise<ProxyConfig[]> {
    const results = await Promise.allSettled(
      this.listProxies().map((p) => this.checkProxy(p.id))
    );
    return results
      .filter((r): r is PromiseFulfilledResult<ProxyConfig> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  toPuppeteerArgs(proxy: ProxyConfig): string[] {
    const args: string[] = [];
    if (proxy.type === 'socks5' || proxy.type === 'socks4') {
      args.push(`--proxy-server=socks5://${proxy.host}:${proxy.port}`);
    } else {
      args.push(`--proxy-server=${proxy.host}:${proxy.port}`);
    }
    return args;
  }

  getAuthCredentials(proxy: ProxyConfig): { username: string; password: string } | null {
    if (proxy.login && proxy.password) {
      return { username: proxy.login, password: proxy.password };
    }
    return null;
  }

  importFromString(text: string, type: ProxyType = 'http'): ProxyConfig[] {
    const lines = text.split('\n').filter((l) => l.trim());
    const imported: ProxyConfig[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const parts = trimmed.split(/[:\s@]+/);
      if (parts.length >= 2) {
        const host = parts[0];
        const port = parseInt(parts[1], 10);
        if (isNaN(port)) continue;

        const proxy = this.addProxy({
          host,
          port,
          type,
          login: parts[2] || undefined,
          password: parts[3] || undefined,
        });
        imported.push(proxy);
      }
    }
    return imported;
  }

  private async testConnection(proxy: ProxyConfig): Promise<{ ip: string; country?: string }> {
    return new Promise((resolve, reject) => {
      const timeout = 10000;

      if (proxy.type === 'http' || proxy.type === 'https') {
        const options: http.RequestOptions = {
          host: proxy.host,
          port: proxy.port,
          path: 'http://httpbin.org/ip',
          method: 'GET',
          timeout,
          headers: {
            Host: 'httpbin.org',
          },
        };

        if (proxy.login && proxy.password) {
          options.headers = {
            ...options.headers,
            'Proxy-Authorization':
              'Basic ' + Buffer.from(`${proxy.login}:${proxy.password}`).toString('base64'),
          };
        }

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve({ ip: json.origin || 'unknown' });
            } catch {
              resolve({ ip: 'unknown' });
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Connection timeout'));
        });
        req.end();
      } else {
        const socket = new net.Socket();
        socket.setTimeout(timeout);
        socket.connect(proxy.port, proxy.host, () => {
          socket.destroy();
          resolve({ ip: proxy.host });
        });
        socket.on('error', reject);
        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('Connection timeout'));
        });
      }
    });
  }

  loadAll(proxies: ProxyConfig[]): void {
    this.proxies.clear();
    for (const p of proxies) {
      this.proxies.set(p.id, p);
    }
  }

  exportAll(): ProxyConfig[] {
    return this.listProxies();
  }
}
