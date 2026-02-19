import { FingerprintGenerator, Fingerprint } from '../src/core/fingerprint';

describe('FingerprintGenerator', () => {
  const generator = new FingerprintGenerator();

  test('should generate a valid fingerprint', () => {
    const fp = generator.generate();

    expect(fp).toHaveProperty('userAgent');
    expect(fp).toHaveProperty('platform');
    expect(fp).toHaveProperty('screenResolution');
    expect(fp).toHaveProperty('language');
    expect(fp).toHaveProperty('timezone');
    expect(fp).toHaveProperty('webglVendor');
    expect(fp).toHaveProperty('webglRenderer');
    expect(fp).toHaveProperty('hardwareConcurrency');
    expect(fp).toHaveProperty('deviceMemory');
    expect(fp).toHaveProperty('canvas');
  });

  test('should generate unique fingerprints', () => {
    const fp1 = generator.generate();
    const fp2 = generator.generate();

    // Canvas hashes should differ (random)
    expect(fp1.canvas).not.toEqual(fp2.canvas);
  });

  test('should have valid screen resolution format', () => {
    const fp = generator.generate();
    expect(fp.screenResolution).toMatch(/^\d+x\d+$/);
  });

  test('should have valid hardware concurrency', () => {
    const fp = generator.generate();
    expect(fp.hardwareConcurrency).toBeGreaterThanOrEqual(2);
    expect(fp.hardwareConcurrency).toBeLessThanOrEqual(16);
  });

  test('should have valid device memory', () => {
    const fp = generator.generate();
    expect([2, 4, 8, 16]).toContain(fp.deviceMemory);
  });
});

describe('Crypto Utils', () => {
  // Dynamic import to avoid electron dependency issues in test
  const CryptoJS = require('crypto-js');

  test('AES encrypt/decrypt roundtrip', () => {
    const key = 'test-key';
    const text = 'secret profile data';
    const encrypted = CryptoJS.AES.encrypt(text, key).toString();
    const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
    expect(decrypted).toEqual(text);
  });
});
