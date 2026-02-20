import type { BrowserProfile, ProfileCreateParams, ProfileUpdateParams, Fingerprint } from '../../shared/types';
import { FingerprintEngine } from './fingerprint-engine';
import { generateId } from './crypto-utils';

export class ProfileManager {
  private profiles: Map<string, BrowserProfile> = new Map();
  private fingerprintEngine: FingerprintEngine;

  constructor() {
    this.fingerprintEngine = new FingerprintEngine();
  }

  listProfiles(): BrowserProfile[] {
    return Array.from(this.profiles.values());
  }

  getProfile(id: string): BrowserProfile | undefined {
    return this.profiles.get(id);
  }

  createProfile(params: ProfileCreateParams): BrowserProfile {
    const id = generateId();
    const now = new Date().toISOString();
    const fingerprint = this.fingerprintEngine.generate(params.fingerprintOverrides);

    const profile: BrowserProfile = {
      id,
      name: params.name,
      status: 'stopped',
      fingerprint,
      proxyId: params.proxyId,
      tags: params.tags || [],
      notes: params.notes || '',
      cookies: '[]',
      extensions: [],
      userDataDir: '',
      createdAt: now,
      updatedAt: now,
      group: params.group,
    };

    this.profiles.set(id, profile);
    return profile;
  }

  updateProfile(id: string, updates: ProfileUpdateParams): BrowserProfile | null {
    const profile = this.profiles.get(id);
    if (!profile) return null;

    const updated: BrowserProfile = {
      ...profile,
      ...updates,
      fingerprint: updates.fingerprint
        ? { ...profile.fingerprint, ...updates.fingerprint }
        : profile.fingerprint,
      tags: updates.tags ?? profile.tags,
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(id, updated);
    return updated;
  }

  deleteProfile(id: string): boolean {
    return this.profiles.delete(id);
  }

  deleteMultiple(ids: string[]): number {
    let count = 0;
    for (const id of ids) {
      if (this.profiles.delete(id)) count++;
    }
    return count;
  }

  setStatus(id: string, status: BrowserProfile['status']): void {
    const profile = this.profiles.get(id);
    if (profile) {
      profile.status = status;
      profile.updatedAt = new Date().toISOString();
      if (status === 'running') {
        profile.lastUsedAt = new Date().toISOString();
      }
    }
  }

  updateCookies(id: string, cookies: string): void {
    const profile = this.profiles.get(id);
    if (profile) {
      profile.cookies = cookies;
      profile.updatedAt = new Date().toISOString();
    }
  }

  regenerateFingerprint(id: string, overrides?: Partial<Fingerprint>): BrowserProfile | null {
    const profile = this.profiles.get(id);
    if (!profile) return null;

    profile.fingerprint = this.fingerprintEngine.generate(overrides);
    profile.updatedAt = new Date().toISOString();
    return profile;
  }

  duplicateProfile(id: string, newName?: string): BrowserProfile | null {
    const source = this.profiles.get(id);
    if (!source) return null;

    const newId = generateId();
    const now = new Date().toISOString();

    const duplicate: BrowserProfile = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      name: newName || `${source.name} (copy)`,
      status: 'stopped' as const,
      fingerprint: this.fingerprintEngine.generate(),
      createdAt: now,
      updatedAt: now,
      lastUsedAt: undefined,
    };

    this.profiles.set(newId, duplicate);
    return duplicate;
  }

  searchProfiles(query: string): BrowserProfile[] {
    const lower = query.toLowerCase();
    return this.listProfiles().filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.tags.some((t) => t.toLowerCase().includes(lower)) ||
        (p.group && p.group.toLowerCase().includes(lower)) ||
        p.notes.toLowerCase().includes(lower)
    );
  }

  getProfilesByGroup(group: string): BrowserProfile[] {
    return this.listProfiles().filter((p) => p.group === group);
  }

  getGroups(): string[] {
    const groups = new Set<string>();
    for (const p of this.profiles.values()) {
      if (p.group) groups.add(p.group);
    }
    return Array.from(groups);
  }

  exportProfiles(ids?: string[]): BrowserProfile[] {
    if (ids) {
      return ids
        .map((id) => this.profiles.get(id))
        .filter((p): p is BrowserProfile => !!p);
    }
    return this.listProfiles();
  }

  importProfiles(profiles: BrowserProfile[]): number {
    let imported = 0;
    for (const p of profiles) {
      if (!this.profiles.has(p.id)) {
        this.profiles.set(p.id, {
          ...p,
          status: 'stopped',
          updatedAt: new Date().toISOString(),
        });
        imported++;
      }
    }
    return imported;
  }

  loadAll(profiles: BrowserProfile[]): void {
    this.profiles.clear();
    for (const p of profiles) {
      this.profiles.set(p.id, p);
    }
  }

  getCount(): number {
    return this.profiles.size;
  }
}
