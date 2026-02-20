import type { BulkAction, BulkActionResult, BrowserProfile, Fingerprint } from '../../shared/types';
import { ProfileManager } from './profile-manager';
import { BrowserLauncher } from './browser-launcher';
import { ScenarioEngine } from './scenario-engine';
import { FingerprintEngine } from './fingerprint-engine';

export class BulkActions {
  private profileManager: ProfileManager;
  private launcher: BrowserLauncher;
  private scenarioEngine: ScenarioEngine;
  private fingerprintEngine: FingerprintEngine;

  constructor(
    profileManager: ProfileManager,
    launcher: BrowserLauncher,
    scenarioEngine: ScenarioEngine
  ) {
    this.profileManager = profileManager;
    this.launcher = launcher;
    this.scenarioEngine = scenarioEngine;
    this.fingerprintEngine = new FingerprintEngine();
  }

  async execute(action: BulkAction): Promise<BulkActionResult> {
    const result: BulkActionResult = {
      type: action.type,
      total: action.profileIds.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    switch (action.type) {
      case 'launch':
        await this.bulkLaunch(action.profileIds, result);
        break;
      case 'stop':
        await this.bulkStop(action.profileIds, result);
        break;
      case 'delete':
        this.bulkDelete(action.profileIds, result);
        break;
      case 'export':
        result.success = action.profileIds.length;
        break;
      case 'import':
        await this.bulkImport(action.params?.profiles as BrowserProfile[], result);
        break;
      case 'set_proxy':
        this.bulkSetProxy(action.profileIds, action.params?.proxyId as string, result);
        break;
      case 'clear_cookies':
        this.bulkClearCookies(action.profileIds, result);
        break;
      case 'run_scenario':
        await this.bulkRunScenario(
          action.profileIds,
          action.params?.scenarioId as string,
          result
        );
        break;
      case 'update_fingerprint':
        this.bulkUpdateFingerprint(action.profileIds, result);
        break;
      case 'add_tags':
        this.bulkAddTags(action.profileIds, action.params?.tags as string[], result);
        break;
    }

    return result;
  }

  private async bulkLaunch(profileIds: string[], result: BulkActionResult): Promise<void> {
    const concurrency = 5;
    const queue = [...profileIds];

    const worker = async (): Promise<void> => {
      while (queue.length > 0) {
        const id = queue.shift();
        if (!id) break;

        const profile = this.profileManager.getProfile(id);
        if (!profile) {
          result.failed++;
          result.errors.push({ profileId: id, error: 'Profile not found' });
          continue;
        }

        const res = await this.launcher.launch(profile);
        if (res.success) {
          this.profileManager.setStatus(id, 'running');
          result.success++;
        } else {
          result.failed++;
          result.errors.push({ profileId: id, error: res.error || 'Launch failed' });
        }

        await this.sleep(1000);
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, profileIds.length) }, () => worker());
    await Promise.allSettled(workers);
  }

  private async bulkStop(profileIds: string[], result: BulkActionResult): Promise<void> {
    for (const id of profileIds) {
      try {
        const stopped = await this.launcher.stop(id);
        if (stopped) {
          this.profileManager.setStatus(id, 'stopped');
          result.success++;
        } else {
          result.failed++;
          result.errors.push({ profileId: id, error: 'Profile not running' });
        }
      } catch (err: unknown) {
        result.failed++;
        const errMsg = err instanceof Error ? err.message : String(err);
        result.errors.push({ profileId: id, error: errMsg });
      }
    }
  }

  private bulkDelete(profileIds: string[], result: BulkActionResult): void {
    for (const id of profileIds) {
      if (this.launcher.isRunning(id)) {
        this.launcher.stop(id);
      }
      if (this.profileManager.deleteProfile(id)) {
        result.success++;
      } else {
        result.failed++;
        result.errors.push({ profileId: id, error: 'Profile not found' });
      }
    }
  }

  private async bulkImport(profiles: BrowserProfile[] | undefined, result: BulkActionResult): Promise<void> {
    if (!profiles) {
      result.failed = result.total;
      return;
    }
    const imported = this.profileManager.importProfiles(profiles);
    result.success = imported;
    result.failed = result.total - imported;
  }

  private bulkSetProxy(profileIds: string[], proxyId: string, result: BulkActionResult): void {
    for (const id of profileIds) {
      const updated = this.profileManager.updateProfile(id, { proxyId });
      if (updated) {
        result.success++;
      } else {
        result.failed++;
        result.errors.push({ profileId: id, error: 'Profile not found' });
      }
    }
  }

  private bulkClearCookies(profileIds: string[], result: BulkActionResult): void {
    for (const id of profileIds) {
      this.profileManager.updateCookies(id, '[]');
      result.success++;
    }
  }

  private async bulkRunScenario(
    profileIds: string[],
    scenarioId: string,
    result: BulkActionResult
  ): Promise<void> {
    const runResults = await this.scenarioEngine.runOnMultipleProfiles(scenarioId, profileIds);
    for (const r of runResults) {
      if (r.status === 'success') {
        result.success++;
      } else {
        result.failed++;
        result.errors.push({ profileId: r.profileId, error: r.errors.join('; ') });
      }
    }
  }

  private bulkUpdateFingerprint(profileIds: string[], result: BulkActionResult): void {
    for (const id of profileIds) {
      const updated = this.profileManager.regenerateFingerprint(id);
      if (updated) {
        result.success++;
      } else {
        result.failed++;
        result.errors.push({ profileId: id, error: 'Profile not found' });
      }
    }
  }

  private bulkAddTags(profileIds: string[], tags: string[], result: BulkActionResult): void {
    if (!tags) {
      result.failed = result.total;
      return;
    }
    for (const id of profileIds) {
      const profile = this.profileManager.getProfile(id);
      if (profile) {
        const newTags = [...new Set([...profile.tags, ...tags])];
        this.profileManager.updateProfile(id, { tags: newTags });
        result.success++;
      } else {
        result.failed++;
        result.errors.push({ profileId: id, error: 'Profile not found' });
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
