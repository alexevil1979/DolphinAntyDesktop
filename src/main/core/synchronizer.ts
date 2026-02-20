import type { SyncSession } from '../../shared/types';
import type { Page } from 'puppeteer-core';
import { BrowserLauncher } from './browser-launcher';
import { generateId } from './crypto-utils';

interface SyncAction {
  type: 'mouse' | 'keyboard' | 'navigation' | 'scroll';
  data: Record<string, unknown>;
  timestamp: number;
}

export class Synchronizer {
  private sessions: Map<string, SyncSession> = new Map();
  private activeListeners: Map<string, boolean> = new Map();
  private launcher: BrowserLauncher;

  constructor(launcher: BrowserLauncher) {
    this.launcher = launcher;
  }

  createSession(params: Omit<SyncSession, 'id' | 'status'>): SyncSession {
    const session: SyncSession = {
      ...params,
      id: generateId(),
      status: 'idle',
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string): SyncSession | undefined {
    return this.sessions.get(id);
  }

  listSessions(): SyncSession[] {
    return Array.from(this.sessions.values());
  }

  deleteSession(id: string): boolean {
    this.stop(id);
    return this.sessions.delete(id);
  }

  async start(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    if (session.status === 'running') return;

    const masterPage = this.launcher.getPage(session.masterProfileId);
    if (!masterPage) throw new Error('Master profile is not running');

    session.status = 'running';
    this.activeListeners.set(sessionId, true);

    await this.setupMasterListeners(session, masterPage);
  }

  stop(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'stopped';
    }
    this.activeListeners.set(sessionId, false);
  }

  private async setupMasterListeners(session: SyncSession, masterPage: Page): Promise<void> {
    const client = await masterPage.createCDPSession();

    if (session.syncMouse) {
      await client.send('Input.setInterceptDrags', { enabled: true }).catch(() => {});

      masterPage.on('console', async (msg) => {
        const text = msg.text();
        if (text.startsWith('SYNC_MOUSE:')) {
          const data = JSON.parse(text.replace('SYNC_MOUSE:', ''));
          await this.replicateAction(session, {
            type: 'mouse',
            data,
            timestamp: Date.now(),
          });
        }
      });

      await masterPage.evaluate(() => {
        document.addEventListener('click', (e: MouseEvent) => {
          console.log('SYNC_MOUSE:' + JSON.stringify({
            action: 'click',
            x: e.clientX,
            y: e.clientY,
            button: e.button,
          }));
        });

        document.addEventListener('mousemove', (() => {
          let lastEmit = 0;
          return (e: MouseEvent) => {
            if (Date.now() - lastEmit < 100) return;
            lastEmit = Date.now();
            console.log('SYNC_MOUSE:' + JSON.stringify({
              action: 'move',
              x: e.clientX,
              y: e.clientY,
            }));
          };
        })());
      });
    }

    if (session.syncKeyboard) {
      masterPage.on('console', async (msg) => {
        const text = msg.text();
        if (text.startsWith('SYNC_KB:')) {
          const data = JSON.parse(text.replace('SYNC_KB:', ''));
          await this.replicateAction(session, {
            type: 'keyboard',
            data,
            timestamp: Date.now(),
          });
        }
      });

      await masterPage.evaluate(() => {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
          console.log('SYNC_KB:' + JSON.stringify({
            action: 'keydown',
            key: e.key,
            code: e.code,
          }));
        });

        document.addEventListener('keyup', (e: KeyboardEvent) => {
          console.log('SYNC_KB:' + JSON.stringify({
            action: 'keyup',
            key: e.key,
            code: e.code,
          }));
        });
      });
    }

    if (session.syncNavigation) {
      masterPage.on('framenavigated', async (frame) => {
        if (frame === masterPage.mainFrame()) {
          await this.replicateAction(session, {
            type: 'navigation',
            data: { url: frame.url() },
            timestamp: Date.now(),
          });
        }
      });
    }

    if (session.syncScroll) {
      masterPage.on('console', async (msg) => {
        const text = msg.text();
        if (text.startsWith('SYNC_SCROLL:')) {
          const data = JSON.parse(text.replace('SYNC_SCROLL:', ''));
          await this.replicateAction(session, {
            type: 'scroll',
            data,
            timestamp: Date.now(),
          });
        }
      });

      await masterPage.evaluate(() => {
        let lastEmit = 0;
        window.addEventListener('scroll', () => {
          if (Date.now() - lastEmit < 150) return;
          lastEmit = Date.now();
          console.log('SYNC_SCROLL:' + JSON.stringify({
            x: window.scrollX,
            y: window.scrollY,
          }));
        });
      });
    }
  }

  private async replicateAction(session: SyncSession, action: SyncAction): Promise<void> {
    if (!this.activeListeners.get(session.id)) return;

    const delay = this.randomDelay(session.delay.min, session.delay.max);

    for (const slaveId of session.slaveProfileIds) {
      const slavePage = this.launcher.getPage(slaveId);
      if (!slavePage) continue;

      await this.sleep(delay);

      try {
        switch (action.type) {
          case 'mouse':
            if (action.data.action === 'click') {
              await slavePage.mouse.click(
                action.data.x as number,
                action.data.y as number,
                { button: (action.data.button as 'left' | 'right') || 'left' }
              );
            } else if (action.data.action === 'move') {
              await slavePage.mouse.move(action.data.x as number, action.data.y as number);
            }
            break;

          case 'keyboard':
            if (action.data.action === 'keydown') {
              await slavePage.keyboard.down(action.data.key as any);
            } else if (action.data.action === 'keyup') {
              await slavePage.keyboard.up(action.data.key as any);
            }
            break;

          case 'navigation':
            await slavePage.goto(action.data.url as string, {
              waitUntil: 'networkidle0',
              timeout: 30000,
            }).catch(() => {});
            break;

          case 'scroll':
            await slavePage.evaluate(
              (x, y) => window.scrollTo(x, y),
              action.data.x as number,
              action.data.y as number
            );
            break;
        }
      } catch {
        // Silently skip failed replications
      }
    }
  }

  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  loadAll(sessions: SyncSession[]): void {
    this.sessions.clear();
    for (const s of sessions) {
      s.status = 'idle';
      this.sessions.set(s.id, s);
    }
  }
}
