import CryptoJS from 'crypto-js';
import * as crypto from 'crypto';

const DEFAULT_KEY = 'dolphin-anty-desktop-v1-secure-key';

let encryptionKey: string = process.env.DOLPHIN_ENCRYPTION_KEY || DEFAULT_KEY;

export function setEncryptionKey(key: string): void {
  encryptionKey = key;
}

export function encrypt(plainText: string): string {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(plainText, CryptoJS.enc.Utf8.parse(padKey(encryptionKey)), {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return iv.toString() + ':' + encrypted.toString();
}

export function decrypt(cipherText: string): string {
  const parts = cipherText.split(':');
  if (parts.length < 2) {
    return CryptoJS.AES.decrypt(cipherText, encryptionKey).toString(CryptoJS.enc.Utf8);
  }
  const iv = CryptoJS.enc.Hex.parse(parts[0]);
  const encrypted = parts.slice(1).join(':');
  const decrypted = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Utf8.parse(padKey(encryptionKey)), {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString();
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

function padKey(key: string): string {
  if (key.length >= 32) return key.slice(0, 32);
  return key.padEnd(32, '0');
}
