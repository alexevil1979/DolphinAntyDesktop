export interface Fingerprint {
  userAgent: string;
  platform: string;
  screenResolution: string;
  language: string;
  timezone: string;
  webglVendor: string;
  webglRenderer: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  canvas: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
];

const PLATFORMS = ['Win32', 'MacIntel', 'Linux x86_64'];
const RESOLUTIONS = ['1920x1080', '2560x1440', '1366x768', '1536x864', '1440x900', '1680x1050'];
const LANGUAGES = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'ru-RU', 'ja-JP', 'zh-CN'];
const TIMEZONES = ['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Europe/Moscow'];

const WEBGL_VENDORS = ['Google Inc. (NVIDIA)', 'Google Inc. (Intel)', 'Google Inc. (AMD)'];
const WEBGL_RENDERERS = [
  'ANGLE (NVIDIA GeForce GTX 1080 Ti Direct3D11 vs_5_0)',
  'ANGLE (Intel(R) UHD Graphics 630 Direct3D11 vs_5_0)',
  'ANGLE (AMD Radeon RX 580 Direct3D11 vs_5_0)',
  'ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0)',
  'ANGLE (Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0)',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class FingerprintGenerator {
  generate(): Fingerprint {
    const crypto = require('crypto');
    return {
      userAgent: pickRandom(USER_AGENTS),
      platform: pickRandom(PLATFORMS),
      screenResolution: pickRandom(RESOLUTIONS),
      language: pickRandom(LANGUAGES),
      timezone: pickRandom(TIMEZONES),
      webglVendor: pickRandom(WEBGL_VENDORS),
      webglRenderer: pickRandom(WEBGL_RENDERERS),
      hardwareConcurrency: pickRandom([2, 4, 6, 8, 12, 16]),
      deviceMemory: pickRandom([2, 4, 8, 16]),
      canvas: crypto.randomBytes(32).toString('hex'),
    };
  }

  /**
   * Applies fingerprint overrides to a Puppeteer page via CDP.
   */
  async applyToPage(page: any, fingerprint: Fingerprint): Promise<void> {
    const cdp = await page.target().createCDPSession();

    await cdp.send('Network.setUserAgentOverride', {
      userAgent: fingerprint.userAgent,
      platform: fingerprint.platform,
      acceptLanguage: fingerprint.language,
    });

    await page.evaluateOnNewDocument((fp: Fingerprint) => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => fp.hardwareConcurrency });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => fp.deviceMemory });
      Object.defineProperty(navigator, 'language', { get: () => fp.language });
      Object.defineProperty(navigator, 'languages', { get: () => [fp.language, 'en'] });
      Object.defineProperty(screen, 'width', { get: () => parseInt(fp.screenResolution.split('x')[0]) });
      Object.defineProperty(screen, 'height', { get: () => parseInt(fp.screenResolution.split('x')[1]) });

      const origGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (param: number) {
        if (param === 0x9245) return fp.webglVendor;    // UNMASKED_VENDOR_WEBGL
        if (param === 0x9246) return fp.webglRenderer;   // UNMASKED_RENDERER_WEBGL
        return origGetParameter.call(this, param);
      };
    }, fingerprint);
  }
}
