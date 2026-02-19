import { ipcMain } from 'electron';
import { ProfileManager } from '../core/profiles';
import { ProxyManager } from '../core/proxies';
import { FingerprintGenerator } from '../core/fingerprint';

const profileManager = new ProfileManager();
const proxyManager = new ProxyManager();
const fingerprintGenerator = new FingerprintGenerator();

export function registerIpcHandlers(): void {
  ipcMain.handle('profiles:list', async () => {
    return profileManager.listProfiles();
  });

  ipcMain.handle('profiles:create', async (_event, name: string) => {
    const fingerprint = fingerprintGenerator.generate();
    return profileManager.createProfile(name, fingerprint);
  });

  ipcMain.handle('profiles:delete', async (_event, id: string) => {
    return profileManager.deleteProfile(id);
  });

  ipcMain.handle('profiles:launch', async (_event, id: string) => {
    return profileManager.launchProfile(id);
  });

  ipcMain.handle('proxies:list', async () => {
    return proxyManager.listProxies();
  });

  ipcMain.handle('proxies:add', async (_event, proxy: { host: string; port: number; type: string; login?: string; password?: string }) => {
    return proxyManager.addProxy(proxy);
  });

  ipcMain.handle('proxies:remove', async (_event, id: string) => {
    return proxyManager.removeProxy(id);
  });

  ipcMain.handle('proxies:check', async (_event, id: string) => {
    return proxyManager.checkProxy(id);
  });
}
