import { ProfileManager } from '../src/main/core/profile-manager';
import type { BrowserProfile } from '../src/shared/types';

describe('ProfileManager', () => {
  let manager: ProfileManager;

  beforeEach(() => {
    manager = new ProfileManager();
  });

  test('createProfile() creates a profile with all fields', () => {
    const profile = manager.createProfile({ name: 'Test Profile' });

    expect(profile.id).toBeTruthy();
    expect(profile.name).toBe('Test Profile');
    expect(profile.status).toBe('stopped');
    expect(profile.fingerprint).toBeDefined();
    expect(profile.fingerprint.userAgent).toBeTruthy();
    expect(profile.tags).toEqual([]);
    expect(profile.notes).toBe('');
    expect(profile.cookies).toBe('[]');
    expect(profile.createdAt).toBeTruthy();
    expect(profile.updatedAt).toBeTruthy();
  });

  test('createProfile() applies optional params', () => {
    const profile = manager.createProfile({
      name: 'Pro Profile',
      proxyId: 'proxy-123',
      tags: ['social', 'main'],
      notes: 'Important profile',
      group: 'Facebook',
    });

    expect(profile.proxyId).toBe('proxy-123');
    expect(profile.tags).toEqual(['social', 'main']);
    expect(profile.notes).toBe('Important profile');
    expect(profile.group).toBe('Facebook');
  });

  test('listProfiles() returns all profiles', () => {
    manager.createProfile({ name: 'P1' });
    manager.createProfile({ name: 'P2' });
    manager.createProfile({ name: 'P3' });

    expect(manager.listProfiles().length).toBe(3);
  });

  test('getProfile() returns the correct profile', () => {
    const created = manager.createProfile({ name: 'Find Me' });
    const found = manager.getProfile(created.id);

    expect(found).toBeDefined();
    expect(found!.name).toBe('Find Me');
  });

  test('getProfile() returns undefined for non-existent id', () => {
    expect(manager.getProfile('non-existent')).toBeUndefined();
  });

  test('updateProfile() updates specified fields', () => {
    const profile = manager.createProfile({ name: 'Original' });
    const updated = manager.updateProfile(profile.id, {
      name: 'Updated',
      tags: ['new'],
      notes: 'Changed',
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Updated');
    expect(updated!.tags).toEqual(['new']);
    expect(updated!.notes).toBe('Changed');
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(profile.updatedAt).getTime()
    );
  });

  test('updateProfile() returns null for non-existent id', () => {
    expect(manager.updateProfile('non-existent', { name: 'X' })).toBeNull();
  });

  test('deleteProfile() removes a profile', () => {
    const profile = manager.createProfile({ name: 'Delete Me' });
    expect(manager.listProfiles().length).toBe(1);

    const deleted = manager.deleteProfile(profile.id);
    expect(deleted).toBe(true);
    expect(manager.listProfiles().length).toBe(0);
  });

  test('deleteProfile() returns false for non-existent id', () => {
    expect(manager.deleteProfile('non-existent')).toBe(false);
  });

  test('deleteMultiple() removes multiple profiles', () => {
    const p1 = manager.createProfile({ name: 'P1' });
    const p2 = manager.createProfile({ name: 'P2' });
    manager.createProfile({ name: 'P3' });

    const count = manager.deleteMultiple([p1.id, p2.id]);
    expect(count).toBe(2);
    expect(manager.listProfiles().length).toBe(1);
  });

  test('setStatus() changes profile status', () => {
    const profile = manager.createProfile({ name: 'Status Test' });
    manager.setStatus(profile.id, 'running');

    const found = manager.getProfile(profile.id);
    expect(found!.status).toBe('running');
    expect(found!.lastUsedAt).toBeTruthy();
  });

  test('updateCookies() changes profile cookies', () => {
    const profile = manager.createProfile({ name: 'Cookie Test' });
    manager.updateCookies(profile.id, '[{"name":"test"}]');

    const found = manager.getProfile(profile.id);
    expect(found!.cookies).toBe('[{"name":"test"}]');
  });

  test('regenerateFingerprint() creates new fingerprint', () => {
    const profile = manager.createProfile({ name: 'FP Test' });
    const oldFP = { ...profile.fingerprint };

    const updated = manager.regenerateFingerprint(profile.id);
    expect(updated).not.toBeNull();
    expect(updated!.fingerprint.canvas.seed).not.toBe(oldFP.canvas.seed);
  });

  test('duplicateProfile() creates a copy with new id and fingerprint', () => {
    const original = manager.createProfile({
      name: 'Original',
      tags: ['test'],
      notes: 'Some notes',
    });

    const copy = manager.duplicateProfile(original.id, 'Copy');
    expect(copy).not.toBeNull();
    expect(copy!.id).not.toBe(original.id);
    expect(copy!.name).toBe('Copy');
    expect(copy!.tags).toEqual(['test']);
    expect(copy!.notes).toBe('Some notes');
    expect(copy!.status).toBe('stopped');
    expect(copy!.fingerprint.canvas.seed).not.toBe(original.fingerprint.canvas.seed);
  });

  test('duplicateProfile() returns null for non-existent id', () => {
    expect(manager.duplicateProfile('non-existent')).toBeNull();
  });

  test('searchProfiles() filters by name', () => {
    manager.createProfile({ name: 'Facebook Account 1' });
    manager.createProfile({ name: 'Instagram Account' });
    manager.createProfile({ name: 'Facebook Account 2' });

    const results = manager.searchProfiles('facebook');
    expect(results.length).toBe(2);
  });

  test('searchProfiles() filters by tags', () => {
    manager.createProfile({ name: 'P1', tags: ['social'] });
    manager.createProfile({ name: 'P2', tags: ['ads'] });

    const results = manager.searchProfiles('social');
    expect(results.length).toBe(1);
  });

  test('getProfilesByGroup() returns profiles in a group', () => {
    manager.createProfile({ name: 'P1', group: 'Facebook' });
    manager.createProfile({ name: 'P2', group: 'Instagram' });
    manager.createProfile({ name: 'P3', group: 'Facebook' });

    const results = manager.getProfilesByGroup('Facebook');
    expect(results.length).toBe(2);
  });

  test('getGroups() returns unique groups', () => {
    manager.createProfile({ name: 'P1', group: 'Facebook' });
    manager.createProfile({ name: 'P2', group: 'Instagram' });
    manager.createProfile({ name: 'P3', group: 'Facebook' });
    manager.createProfile({ name: 'P4' });

    const groups = manager.getGroups();
    expect(groups).toContain('Facebook');
    expect(groups).toContain('Instagram');
    expect(groups.length).toBe(2);
  });

  test('exportProfiles() exports selected profiles', () => {
    const p1 = manager.createProfile({ name: 'P1' });
    manager.createProfile({ name: 'P2' });
    const p3 = manager.createProfile({ name: 'P3' });

    const exported = manager.exportProfiles([p1.id, p3.id]);
    expect(exported.length).toBe(2);
  });

  test('exportProfiles() exports all when no ids provided', () => {
    manager.createProfile({ name: 'P1' });
    manager.createProfile({ name: 'P2' });

    const exported = manager.exportProfiles();
    expect(exported.length).toBe(2);
  });

  test('importProfiles() imports new profiles', () => {
    const profiles: BrowserProfile[] = [
      {
        id: 'import-1', name: 'Imported 1', status: 'running',
        fingerprint: {} as any, tags: [], notes: '', cookies: '[]',
        extensions: [], userDataDir: '', createdAt: '', updatedAt: '',
      },
    ];

    const count = manager.importProfiles(profiles);
    expect(count).toBe(1);
    const found = manager.getProfile('import-1');
    expect(found).toBeDefined();
    expect(found!.status).toBe('stopped');
  });

  test('importProfiles() skips duplicates', () => {
    const profile = manager.createProfile({ name: 'Existing' });
    const profiles: BrowserProfile[] = [
      { ...profile, name: 'Different Name' },
    ];

    const count = manager.importProfiles(profiles);
    expect(count).toBe(0);
  });

  test('getCount() returns profile count', () => {
    expect(manager.getCount()).toBe(0);
    manager.createProfile({ name: 'P1' });
    manager.createProfile({ name: 'P2' });
    expect(manager.getCount()).toBe(2);
  });

  test('handles batch creation of 100+ profiles', () => {
    for (let i = 0; i < 120; i++) {
      manager.createProfile({ name: `Profile ${i}` });
    }
    expect(manager.getCount()).toBe(120);

    const all = manager.listProfiles();
    const ids = new Set(all.map((p) => p.id));
    expect(ids.size).toBe(120);
  });
});
