import { FingerprintEngine } from '../src/main/core/fingerprint-engine';
import type { Fingerprint } from '../src/shared/types';

describe('FingerprintEngine', () => {
  let engine: FingerprintEngine;

  beforeEach(() => {
    engine = new FingerprintEngine();
  });

  test('generate() returns a complete fingerprint', () => {
    const fp = engine.generate();

    expect(fp.userAgent).toBeTruthy();
    expect(fp.platform).toBeTruthy();
    expect(fp.screenResolution).toBeDefined();
    expect(fp.screenResolution.width).toBeGreaterThan(0);
    expect(fp.screenResolution.height).toBeGreaterThan(0);
    expect(fp.colorDepth).toBeGreaterThanOrEqual(24);
    expect(fp.timezone).toBeTruthy();
    expect(fp.language).toBeTruthy();
    expect(fp.languages).toBeInstanceOf(Array);
    expect(fp.languages.length).toBeGreaterThanOrEqual(1);
    expect(fp.hardwareConcurrency).toBeGreaterThanOrEqual(2);
    expect(fp.deviceMemory).toBeGreaterThanOrEqual(2);
    expect(fp.webglVendor).toBeTruthy();
    expect(fp.webglRenderer).toBeTruthy();
    expect(fp.canvas).toBeDefined();
    expect(fp.canvas.noise).toBeGreaterThanOrEqual(0);
    expect(fp.canvas.seed).toBeGreaterThan(0);
    expect(fp.audioContext).toBeDefined();
    expect(fp.fonts).toBeInstanceOf(Array);
    expect(fp.fonts.length).toBeGreaterThan(0);
    expect(fp.plugins).toBeInstanceOf(Array);
    expect(fp.touchSupport).toBeDefined();
    expect(fp.webRTC).toBeDefined();
    expect(fp.mediaDevices).toBeDefined();
  });

  test('generate() produces unique fingerprints', () => {
    const fingerprints: Fingerprint[] = [];
    for (let i = 0; i < 50; i++) {
      fingerprints.push(engine.generate());
    }

    const canvasSeeds = new Set(fingerprints.map((f) => f.canvas.seed));
    expect(canvasSeeds.size).toBeGreaterThan(30);

    const audioSeeds = new Set(fingerprints.map((f) => f.audioContext.seed));
    expect(audioSeeds.size).toBeGreaterThan(30);

    const userAgents = new Set(fingerprints.map((f) => f.userAgent));
    expect(userAgents.size).toBeGreaterThan(1);
  });

  test('generate() applies overrides', () => {
    const fp = engine.generate({
      userAgent: 'Custom/1.0',
      platform: 'TestPlatform',
      hardwareConcurrency: 99,
    });

    expect(fp.userAgent).toBe('Custom/1.0');
    expect(fp.platform).toBe('TestPlatform');
    expect(fp.hardwareConcurrency).toBe(99);
    expect(fp.webglVendor).toBeTruthy();
  });

  test('each fingerprint has valid UserAgent format', () => {
    for (let i = 0; i < 20; i++) {
      const fp = engine.generate();
      expect(fp.userAgent).toMatch(/Mozilla\/5\.0/);
    }
  });

  test('screen resolutions are reasonable', () => {
    for (let i = 0; i < 20; i++) {
      const fp = engine.generate();
      expect(fp.screenResolution.width).toBeGreaterThanOrEqual(1024);
      expect(fp.screenResolution.width).toBeLessThanOrEqual(3840);
      expect(fp.screenResolution.height).toBeGreaterThanOrEqual(768);
      expect(fp.screenResolution.height).toBeLessThanOrEqual(2160);
    }
  });

  test('canvas noise is within valid range', () => {
    for (let i = 0; i < 50; i++) {
      const fp = engine.generate();
      expect(fp.canvas.noise).toBeGreaterThanOrEqual(0);
      expect(fp.canvas.noise).toBeLessThan(0.1);
    }
  });

  test('audio context noise is within valid range', () => {
    for (let i = 0; i < 50; i++) {
      const fp = engine.generate();
      expect(fp.audioContext.noise).toBeGreaterThanOrEqual(0);
      expect(fp.audioContext.noise).toBeLessThan(0.0001);
    }
  });

  test('webRTC defaults to disabled', () => {
    const fp = engine.generate();
    expect(fp.webRTC.mode).toBe('disabled');
  });

  test('language format is correct', () => {
    for (let i = 0; i < 20; i++) {
      const fp = engine.generate();
      expect(fp.language).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      expect(fp.languages[0]).toBe(fp.language);
    }
  });
});
