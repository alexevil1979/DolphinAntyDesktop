import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'crypto';
import { Fingerprint } from './fingerprint';
import { encrypt, decrypt } from '../utils/crypto';

export interface BrowserProfile {
  id: string;
  name: string;
  status: 'stopped' | 'running';
  fingerprint: Fingerprint;
  proxy?: string;
  cookies?: string;
  createdAt: string;
  updatedAt: string;
}

export class ProfileManager {
  private profiles: Map<string, BrowserProfile> = new Map();
  private storagePath: string;

  constructor() {
    try {
      this.storagePath = path.join(app.getPath('userData'), 'profiles');
    } catch {
      this.storagePath = path.join(process.cwd(), 'data', 'profiles');
    }
    this.loadFromDisk();
  }

  listProfiles(): BrowserProfile[] {
    return Array.from(this.profiles.values());
  }

  createProfile(name: string, fingerprint: Fingerprint): BrowserProfile {
    const id = this.generateId();
    const now = new Date().toISOString();
    const profile: BrowserProfile = {
      id,
      name,
      status: 'stopped',
      fingerprint,
      createdAt: now,
      updatedAt: now,
    };
    this.profiles.set(id, profile);
    this.saveToDisk();
    return profile;
  }

  deleteProfile(id: string): boolean {
    const deleted = this.profiles.delete(id);
    if (deleted) {
      this.saveToDisk();
    }
    return deleted;
  }

  getProfile(id: string): BrowserProfile | undefined {
    return this.profiles.get(id);
  }

  updateProfile(id: string, updates: Partial<BrowserProfile>): BrowserProfile | null {
    const profile = this.profiles.get(id);
    if (!profile) return null;

    const updated = { ...profile, ...updates, updatedAt: new Date().toISOString() };
    this.profiles.set(id, updated);
    this.saveToDisk();
    return updated;
  }

  async launchProfile(id: string): Promise<boolean> {
    const profile = this.profiles.get(id);
    if (!profile) return false;

    this.updateProfile(id, { status: 'running' });
    // Puppeteer launch logic will be here
    return true;
  }

  private generateId(): string {
    const bytes = require('crypto').randomBytes(16);
    return bytes.toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
  }

  private loadFromDisk(): void {
    try {
      const fs = require('fs');
      const dataFile = path.join(this.storagePath, 'profiles.enc');
      if (!fs.existsSync(dataFile)) return;

      const encrypted = fs.readFileSync(dataFile, 'utf-8');
      const json = decrypt(encrypted);
      const data: BrowserProfile[] = JSON.parse(json);
      data.forEach((p) => this.profiles.set(p.id, p));
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  }

  private saveToDisk(): void {
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
      }
      const json = JSON.stringify(this.listProfiles(), null, 2);
      const encrypted = encrypt(json);
      fs.writeFileSync(path.join(this.storagePath, 'profiles.enc'), encrypted, 'utf-8');
    } catch (err) {
      console.error('Failed to save profiles:', err);
    }
  }
}
