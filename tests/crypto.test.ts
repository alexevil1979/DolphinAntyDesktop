import { encrypt, decrypt, hashPassword, generateId, generateRandomToken } from '../src/main/core/crypto-utils';

describe('Crypto Utils', () => {
  test('encrypt/decrypt roundtrip preserves data', () => {
    const original = 'Hello, World! Привет, Мир! 🌍';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(original);
  });

  test('encrypt produces different output for same input (random IV)', () => {
    const data = 'test data';
    const encrypted1 = encrypt(data);
    const encrypted2 = encrypt(data);

    expect(encrypted1).not.toBe(encrypted2);
    expect(decrypt(encrypted1)).toBe(data);
    expect(decrypt(encrypted2)).toBe(data);
  });

  test('encrypt/decrypt handles empty string', () => {
    const encrypted = encrypt('');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  test('encrypt/decrypt handles large data', () => {
    const large = JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Profile ${i}`,
      data: 'x'.repeat(100),
    })));

    const encrypted = encrypt(large);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(large);
  });

  test('encrypt/decrypt handles special characters', () => {
    const special = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`\n\t\r';
    const encrypted = encrypt(special);
    expect(decrypt(encrypted)).toBe(special);
  });

  test('encrypt/decrypt handles JSON objects', () => {
    const obj = { name: 'test', nested: { arr: [1, 2, 3] }, unicode: 'Тест' };
    const json = JSON.stringify(obj);
    const encrypted = encrypt(json);
    const decrypted = JSON.parse(decrypt(encrypted));
    expect(decrypted).toEqual(obj);
  });

  test('hashPassword returns consistent results', () => {
    const hash1 = hashPassword('mypassword');
    const hash2 = hashPassword('mypassword');
    expect(hash1).toBe(hash2);
  });

  test('hashPassword returns different hashes for different passwords', () => {
    const hash1 = hashPassword('password1');
    const hash2 = hashPassword('password2');
    expect(hash1).not.toBe(hash2);
  });

  test('hashPassword returns 64-character hex string (SHA-256)', () => {
    const hash = hashPassword('test');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('generateId returns valid UUID format', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
  });

  test('generateId returns unique values', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  test('generateRandomToken returns hex string of correct length', () => {
    const token = generateRandomToken(32);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  test('generateRandomToken returns unique values', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 50; i++) {
      tokens.add(generateRandomToken());
    }
    expect(tokens.size).toBe(50);
  });
});
