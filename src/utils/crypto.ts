import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.DOLPHIN_ENCRYPTION_KEY || 'dolphin-anty-default-key-change-me';

export function encrypt(plainText: string): string {
  return CryptoJS.AES.encrypt(plainText, ENCRYPTION_KEY).toString();
}

export function decrypt(cipherText: string): string {
  const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString();
}

export function generateRandomToken(length: number = 32): string {
  return CryptoJS.lib.WordArray.random(length).toString();
}
