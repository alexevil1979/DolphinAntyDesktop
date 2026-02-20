import type { Scenario, ScenarioStep, ScenarioRunResult } from '../../shared/types';
import type { Page } from 'puppeteer-core';
import { BrowserLauncher } from './browser-launcher';
import { generateId } from './crypto-utils';

export class ScenarioEngine {
  private scenarios: Map<string, Scenario> = new Map();
  private activeRuns: Map<string, { abort: boolean }> = new Map();
  private launcher: BrowserLauncher;

  constructor(launcher: BrowserLauncher) {
    this.launcher = launcher;
  }

  listScenarios(): Scenario[] {
    return Array.from(this.scenarios.values());
  }

  getScenario(id: string): Scenario | undefined {
    return this.scenarios.get(id);
  }

  createScenario(name: string, description: string, steps: ScenarioStep[], tags: string[] = []): Scenario {
    const now = new Date().toISOString();
    const scenario: Scenario = {
      id: generateId(),
      name,
      description,
      steps,
      tags,
      createdAt: now,
      updatedAt: now,
    };
    this.scenarios.set(scenario.id, scenario);
    return scenario;
  }

  updateScenario(id: string, updates: Partial<Omit<Scenario, 'id' | 'createdAt'>>): Scenario | null {
    const scenario = this.scenarios.get(id);
    if (!scenario) return null;
    const updated = { ...scenario, ...updates, updatedAt: new Date().toISOString() };
    this.scenarios.set(id, updated);
    return updated;
  }

  deleteScenario(id: string): boolean {
    return this.scenarios.delete(id);
  }

  async runOnProfile(scenarioId: string, profileId: string): Promise<ScenarioRunResult> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);

    const page = this.launcher.getPage(profileId);
    if (!page) throw new Error(`Profile ${profileId} is not running`);

    const runId = `${scenarioId}_${profileId}_${Date.now()}`;
    this.activeRuns.set(runId, { abort: false });

    const result: ScenarioRunResult = {
      scenarioId,
      profileId,
      status: 'success',
      stepsCompleted: 0,
      totalSteps: scenario.steps.length,
      errors: [],
      startedAt: new Date().toISOString(),
      finishedAt: '',
      screenshots: [],
    };

    try {
      for (let i = 0; i < scenario.steps.length; i++) {
        const runState = this.activeRuns.get(runId);
        if (runState?.abort) {
          result.status = 'partial';
          break;
        }

        const step = scenario.steps[i];
        try {
          await this.executeStep(page, step);
          result.stepsCompleted++;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          result.errors.push(`Step ${i + 1} (${step.type}): ${errMsg}`);

          if (step.onError === 'stop') {
            result.status = 'error';
            break;
          } else if (step.onError === 'retry' && step.retryCount) {
            let retried = false;
            for (let r = 0; r < step.retryCount; r++) {
              try {
                await this.delay(1000);
                await this.executeStep(page, step);
                result.stepsCompleted++;
                retried = true;
                break;
              } catch {
                // retry failed
              }
            }
            if (!retried) {
              result.status = 'partial';
            }
          } else {
            result.stepsCompleted++;
          }
        }
      }
    } catch (err: unknown) {
      result.status = 'error';
      const errMsg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Fatal error: ${errMsg}`);
    } finally {
      result.finishedAt = new Date().toISOString();
      this.activeRuns.delete(runId);
    }

    return result;
  }

  async runOnMultipleProfiles(
    scenarioId: string,
    profileIds: string[],
    concurrency: number = 5
  ): Promise<ScenarioRunResult[]> {
    const results: ScenarioRunResult[] = [];
    const queue = [...profileIds];

    const worker = async (): Promise<void> => {
      while (queue.length > 0) {
        const profileId = queue.shift();
        if (!profileId) break;
        try {
          const result = await this.runOnProfile(scenarioId, profileId);
          results.push(result);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          results.push({
            scenarioId,
            profileId,
            status: 'error',
            stepsCompleted: 0,
            totalSteps: 0,
            errors: [errMsg],
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            screenshots: [],
          });
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, profileIds.length) }, () => worker());
    await Promise.allSettled(workers);
    return results;
  }

  stopRun(scenarioId: string, profileId: string): void {
    for (const [key, state] of this.activeRuns) {
      if (key.startsWith(`${scenarioId}_${profileId}_`)) {
        state.abort = true;
      }
    }
  }

  private async executeStep(page: Page, step: ScenarioStep): Promise<void> {
    const timeout = step.timeout || 30000;
    const params = step.params;

    switch (step.type) {
      case 'navigate':
        await page.goto(params.url as string, {
          waitUntil: (params.waitUntil as 'load' | 'networkidle0') || 'networkidle0',
          timeout,
        });
        break;

      case 'click':
        await page.waitForSelector(params.selector as string, { timeout });
        await page.click(params.selector as string);
        break;

      case 'type':
        await page.waitForSelector(params.selector as string, { timeout });
        await page.type(params.selector as string, params.text as string, {
          delay: (params.delay as number) || 50,
        });
        break;

      case 'wait':
        await this.delay((params.ms as number) || 1000);
        break;

      case 'waitForSelector':
        await page.waitForSelector(params.selector as string, { timeout });
        break;

      case 'screenshot': {
        const screenshotPath = (params.path as string) || `screenshot_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: !!params.fullPage });
        break;
      }

      case 'scroll':
        await page.evaluate((distance: number) => {
          window.scrollBy(0, distance);
        }, (params.distance as number) || 500);
        break;

      case 'evaluate':
        await page.evaluate(params.script as string);
        break;

      case 'keypress':
        await page.keyboard.press(params.key as any);
        break;

      case 'select':
        await page.select(params.selector as string, ...(params.values as string[]));
        break;

      case 'hover':
        await page.waitForSelector(params.selector as string, { timeout });
        await page.hover(params.selector as string);
        break;

      case 'cookie_set':
        await page.setCookie(...(params.cookies as any[]));
        break;

      case 'cookie_get': {
        await page.cookies();
        break;
      }

      case 'cookie_clear':
        const client = await page.createCDPSession();
        await client.send('Network.clearBrowserCookies');
        break;

      case 'loop': {
        const iterations = (params.iterations as number) || 1;
        const loopSteps = (params.steps as ScenarioStep[]) || [];
        for (let i = 0; i < iterations; i++) {
          for (const ls of loopSteps) {
            await this.executeStep(page, ls);
          }
        }
        break;
      }

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  loadAll(scenarios: Scenario[]): void {
    this.scenarios.clear();
    for (const s of scenarios) {
      this.scenarios.set(s.id, s);
    }
  }

  exportAll(): Scenario[] {
    return this.listScenarios();
  }
}
