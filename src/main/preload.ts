import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

const api = {
  profiles: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_LIST),
    create: (params: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_CREATE, params),
    update: (id: string, params: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_UPDATE, id, params),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_DELETE, id),
    launch: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_LAUNCH, id),
    stop: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_STOP, id),
    export: (ids?: string[]) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_EXPORT, ids),
    import: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_IMPORT, data),
  },
  proxies: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROXIES_LIST),
    add: (params: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROXIES_ADD, params),
    update: (id: string, params: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROXIES_UPDATE, id, params),
    remove: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROXIES_REMOVE, id),
    check: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROXIES_CHECK, id),
    checkAll: () => ipcRenderer.invoke(IPC_CHANNELS.PROXIES_CHECK_ALL),
  },
  scenarios: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.SCENARIOS_LIST),
    create: (params: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SCENARIOS_CREATE, params),
    update: (id: string, params: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SCENARIOS_UPDATE, id, params),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SCENARIOS_DELETE, id),
    run: (id: string, profileIds: string[]) => ipcRenderer.invoke(IPC_CHANNELS.SCENARIOS_RUN, id, profileIds),
    stop: (id: string, profileId: string) => ipcRenderer.invoke(IPC_CHANNELS.SCENARIOS_STOP, id, profileId),
  },
  cookieRobot: {
    start: (config: unknown) => ipcRenderer.invoke(IPC_CHANNELS.COOKIE_ROBOT_START, config),
    stop: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.COOKIE_ROBOT_STOP, id),
    status: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.COOKIE_ROBOT_STATUS, id),
  },
  sync: {
    start: (params: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SYNC_START, params),
    stop: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SYNC_STOP, id),
    status: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SYNC_STATUS, id),
  },
  bulk: {
    execute: (action: unknown) => ipcRenderer.invoke(IPC_CHANNELS.BULK_EXECUTE, action),
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    update: (settings: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings),
  },
  app: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_STATUS),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
