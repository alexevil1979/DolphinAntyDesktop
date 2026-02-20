import { ProxyManager } from '../src/main/core/proxy-manager';
import type { ProxyConfig } from '../src/shared/types';

describe('ProxyManager', () => {
  let manager: ProxyManager;

  beforeEach(() => {
    manager = new ProxyManager();
  });

  test('addProxy() creates a proxy with correct properties', () => {
    const proxy = manager.addProxy({
      host: '127.0.0.1',
      port: 8080,
      type: 'http',
      name: 'Test Proxy',
    });

    expect(proxy.id).toBeTruthy();
    expect(proxy.host).toBe('127.0.0.1');
    expect(proxy.port).toBe(8080);
    expect(proxy.type).toBe('http');
    expect(proxy.name).toBe('Test Proxy');
    expect(proxy.status).toBe('unchecked');
  });

  test('addProxy() generates name from host:port when not provided', () => {
    const proxy = manager.addProxy({ host: '192.168.1.1', port: 3128, type: 'socks5' });
    expect(proxy.name).toBe('192.168.1.1:3128');
  });

  test('addProxy() stores login and password', () => {
    const proxy = manager.addProxy({
      host: '10.0.0.1',
      port: 1080,
      type: 'socks5',
      login: 'user',
      password: 'pass',
    });

    expect(proxy.login).toBe('user');
    expect(proxy.password).toBe('pass');
  });

  test('listProxies() returns all proxies', () => {
    manager.addProxy({ host: '1.1.1.1', port: 80, type: 'http' });
    manager.addProxy({ host: '2.2.2.2', port: 80, type: 'https' });
    manager.addProxy({ host: '3.3.3.3', port: 1080, type: 'socks5' });

    expect(manager.listProxies().length).toBe(3);
  });

  test('removeProxy() removes a proxy', () => {
    const proxy = manager.addProxy({ host: '1.1.1.1', port: 80, type: 'http' });
    expect(manager.listProxies().length).toBe(1);

    const removed = manager.removeProxy(proxy.id);
    expect(removed).toBe(true);
    expect(manager.listProxies().length).toBe(0);
  });

  test('removeProxy() returns false for non-existent id', () => {
    expect(manager.removeProxy('non-existent')).toBe(false);
  });

  test('getProxy() returns the correct proxy', () => {
    const proxy = manager.addProxy({ host: '5.5.5.5', port: 3128, type: 'http' });
    const found = manager.getProxy(proxy.id);
    expect(found).toBeDefined();
    expect(found!.host).toBe('5.5.5.5');
  });

  test('getProxy() returns undefined for non-existent id', () => {
    expect(manager.getProxy('non-existent')).toBeUndefined();
  });

  test('updateProxy() updates proxy fields', () => {
    const proxy = manager.addProxy({ host: '1.1.1.1', port: 80, type: 'http' });
    const updated = manager.updateProxy(proxy.id, { name: 'Updated', port: 9090 });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Updated');
    expect(updated!.port).toBe(9090);
    expect(updated!.host).toBe('1.1.1.1');
  });

  test('updateProxy() returns null for non-existent id', () => {
    expect(manager.updateProxy('non-existent', { name: 'X' })).toBeNull();
  });

  test('toPuppeteerArgs() generates correct args for HTTP proxy', () => {
    const proxy = manager.addProxy({ host: 'proxy.example.com', port: 3128, type: 'http' });
    const args = manager.toPuppeteerArgs(proxy);
    expect(args).toEqual(['--proxy-server=proxy.example.com:3128']);
  });

  test('toPuppeteerArgs() generates correct args for SOCKS5 proxy', () => {
    const proxy = manager.addProxy({ host: '10.0.0.1', port: 1080, type: 'socks5' });
    const args = manager.toPuppeteerArgs(proxy);
    expect(args).toEqual(['--proxy-server=socks5://10.0.0.1:1080']);
  });

  test('getAuthCredentials() returns credentials when available', () => {
    const proxy = manager.addProxy({
      host: '1.1.1.1',
      port: 80,
      type: 'http',
      login: 'admin',
      password: 'secret',
    });

    const creds = manager.getAuthCredentials(proxy);
    expect(creds).toEqual({ username: 'admin', password: 'secret' });
  });

  test('getAuthCredentials() returns null when no credentials', () => {
    const proxy = manager.addProxy({ host: '1.1.1.1', port: 80, type: 'http' });
    expect(manager.getAuthCredentials(proxy)).toBeNull();
  });

  test('importFromString() parses host:port format', () => {
    const text = '1.1.1.1:8080\n2.2.2.2:3128\n3.3.3.3:1080';
    const imported = manager.importFromString(text, 'http');

    expect(imported.length).toBe(3);
    expect(imported[0].host).toBe('1.1.1.1');
    expect(imported[0].port).toBe(8080);
    expect(imported[1].host).toBe('2.2.2.2');
    expect(imported[2].host).toBe('3.3.3.3');
  });

  test('importFromString() parses host:port:login:password format', () => {
    const text = '1.1.1.1:8080:user1:pass1\n2.2.2.2:3128:user2:pass2';
    const imported = manager.importFromString(text, 'socks5');

    expect(imported.length).toBe(2);
    expect(imported[0].login).toBe('user1');
    expect(imported[0].password).toBe('pass1');
    expect(imported[0].type).toBe('socks5');
  });

  test('importFromString() skips invalid lines', () => {
    const text = 'invalid\n1.1.1.1:8080\n::\n2.2.2.2:abc';
    const imported = manager.importFromString(text);
    expect(imported.length).toBe(1);
  });

  test('loadAll() replaces all proxies', () => {
    manager.addProxy({ host: '1.1.1.1', port: 80, type: 'http' });
    expect(manager.listProxies().length).toBe(1);

    const newProxies: ProxyConfig[] = [
      { id: 'p1', name: 'P1', host: '10.0.0.1', port: 80, type: 'http', status: 'unchecked' },
      { id: 'p2', name: 'P2', host: '10.0.0.2', port: 80, type: 'https', status: 'active' },
    ];
    manager.loadAll(newProxies);
    expect(manager.listProxies().length).toBe(2);
    expect(manager.getProxy('p1')).toBeDefined();
  });
});
