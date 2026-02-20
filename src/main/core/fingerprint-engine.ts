import type { Fingerprint, WebRTCConfig } from '../../shared/types';
import type { Page } from 'puppeteer-core';

const USER_AGENTS: string[] = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 OPR/113.0.0.0',
];

const PLATFORMS = ['Win32'];

const SCREEN_RESOLUTIONS = [
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1600, height: 900 },
  { width: 1680, height: 1050 },
  { width: 3840, height: 2160 },
];

const TIMEZONES = [
  'Europe/Moscow', 'Europe/London', 'America/New_York', 'America/Chicago',
  'America/Los_Angeles', 'Europe/Berlin', 'Europe/Paris', 'Asia/Tokyo',
  'Asia/Shanghai', 'Australia/Sydney', 'America/Sao_Paulo', 'Asia/Kolkata',
];

const LANGUAGES = ['en-US', 'en-GB', 'ru-RU', 'de-DE', 'fr-FR', 'es-ES', 'pt-BR', 'ja-JP', 'zh-CN'];

const WEBGL_VENDORS = [
  'Google Inc. (NVIDIA)',
  'Google Inc. (AMD)',
  'Google Inc. (Intel)',
];

const WEBGL_RENDERERS = [
  'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
];

const FONT_SETS = [
  ['Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS', 'Impact', 'Comic Sans MS'],
  ['Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana', 'Calibri', 'Cambria', 'Consolas'],
  ['Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana', 'Segoe UI', 'Tahoma', 'Lucida Console'],
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class FingerprintEngine {
  generate(overrides?: Partial<Fingerprint>): Fingerprint {
    const language = randomElement(LANGUAGES);
    const baseLanguage = language.split('-')[0];

    const fingerprint: Fingerprint = {
      userAgent: randomElement(USER_AGENTS),
      platform: randomElement(PLATFORMS),
      screenResolution: randomElement(SCREEN_RESOLUTIONS),
      colorDepth: randomElement([24, 32]),
      timezone: randomElement(TIMEZONES),
      language,
      languages: [language, baseLanguage],
      hardwareConcurrency: randomElement([2, 4, 6, 8, 12, 16]),
      deviceMemory: randomElement([2, 4, 8, 16, 32]),
      webglVendor: randomElement(WEBGL_VENDORS),
      webglRenderer: randomElement(WEBGL_RENDERERS),
      canvas: {
        noise: Math.random() * 0.1,
        seed: randomInt(1, 999999),
      },
      audioContext: {
        noise: Math.random() * 0.0001,
        seed: randomInt(1, 999999),
      },
      fonts: randomElement(FONT_SETS),
      plugins: this.generatePlugins(),
      doNotTrack: randomElement([null, '1']),
      touchSupport: { maxTouchPoints: 0, touchEvent: false },
      webRTC: { mode: 'disabled' },
      mediaDevices: {
        audioinput: randomInt(1, 3),
        videoinput: randomInt(0, 2),
        audiooutput: randomInt(1, 3),
      },
    };

    if (overrides) {
      return { ...fingerprint, ...overrides };
    }
    return fingerprint;
  }

  private generatePlugins(): string[] {
    const allPlugins = [
      'PDF Viewer', 'Chrome PDF Viewer', 'Chromium PDF Viewer',
      'Microsoft Edge PDF Viewer', 'WebKit built-in PDF',
    ];
    const count = randomInt(2, allPlugins.length);
    const shuffled = [...allPlugins].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  async applyToPage(page: Page, fingerprint: Fingerprint): Promise<void> {
    await page.evaluateOnNewDocument((fp: Fingerprint) => {
      // Navigator overrides
      Object.defineProperty(navigator, 'userAgent', { get: () => fp.userAgent });
      Object.defineProperty(navigator, 'platform', { get: () => fp.platform });
      Object.defineProperty(navigator, 'language', { get: () => fp.language });
      Object.defineProperty(navigator, 'languages', { get: () => Object.freeze([...fp.languages]) });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => fp.hardwareConcurrency });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => fp.deviceMemory });
      Object.defineProperty(navigator, 'doNotTrack', { get: () => fp.doNotTrack });
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => fp.touchSupport.maxTouchPoints });

      // Screen override
      Object.defineProperty(screen, 'width', { get: () => fp.screenResolution.width });
      Object.defineProperty(screen, 'height', { get: () => fp.screenResolution.height });
      Object.defineProperty(screen, 'availWidth', { get: () => fp.screenResolution.width });
      Object.defineProperty(screen, 'availHeight', { get: () => fp.screenResolution.height - 40 });
      Object.defineProperty(screen, 'colorDepth', { get: () => fp.colorDepth });
      Object.defineProperty(screen, 'pixelDepth', { get: () => fp.colorDepth });

      // WebGL spoofing
      const getParameterOrig = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (param: number) {
        const UNMASKED_VENDOR = 0x9245;
        const UNMASKED_RENDERER = 0x9246;
        if (param === UNMASKED_VENDOR) return fp.webglVendor;
        if (param === UNMASKED_RENDERER) return fp.webglRenderer;
        return getParameterOrig.call(this, param);
      };

      const getParameterOrig2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function (param: number) {
        const UNMASKED_VENDOR = 0x9245;
        const UNMASKED_RENDERER = 0x9246;
        if (param === UNMASKED_VENDOR) return fp.webglVendor;
        if (param === UNMASKED_RENDERER) return fp.webglRenderer;
        return getParameterOrig2.call(this, param);
      };

      // Canvas fingerprint noise
      const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (type?: string, quality?: number) {
        const ctx = this.getContext('2d');
        if (ctx && this.width > 0 && this.height > 0) {
          const imageData = ctx.getImageData(0, 0, this.width, this.height);
          const data = imageData.data;
          let seed = fp.canvas.seed;
          for (let i = 0; i < data.length; i += 4) {
            seed = (seed * 9301 + 49297) % 233280;
            const noise = (seed / 233280.0) * fp.canvas.noise;
            data[i] = Math.min(255, Math.max(0, data[i] + noise * 2 - fp.canvas.noise));
          }
          ctx.putImageData(imageData, 0, 0);
        }
        return origToDataURL.call(this, type, quality);
      };

      // AudioContext fingerprint noise
      const origGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function (channel: number) {
        const data = origGetChannelData.call(this, channel);
        let seed = fp.audioContext.seed;
        for (let i = 0; i < data.length; i++) {
          seed = (seed * 9301 + 49297) % 233280;
          data[i] += (seed / 233280.0) * fp.audioContext.noise * 2 - fp.audioContext.noise;
        }
        return data;
      };

      // Media devices spoofing
      const origEnumerateDevices = navigator.mediaDevices?.enumerateDevices?.bind(navigator.mediaDevices);
      if (navigator.mediaDevices && typeof origEnumerateDevices === 'function') {
        navigator.mediaDevices.enumerateDevices = async () => {
          const devices: MediaDeviceInfo[] = [];
          const kinds: Array<{ kind: MediaDeviceKind; count: number }> = [
            { kind: 'audioinput', count: fp.mediaDevices.audioinput },
            { kind: 'videoinput', count: fp.mediaDevices.videoinput },
            { kind: 'audiooutput', count: fp.mediaDevices.audiooutput },
          ];
          for (const { kind, count } of kinds) {
            for (let i = 0; i < count; i++) {
              devices.push({
                deviceId: '',
                groupId: '',
                kind,
                label: '',
                toJSON() { return {}; },
              });
            }
          }
          return devices;
        };
      }

      // Timezone override
      const origDateTimeFormat = Intl.DateTimeFormat;
      const proxy = new Proxy(origDateTimeFormat, {
        construct(target, args) {
          if (!args[1]) args[1] = {};
          if (typeof args[1] === 'object') {
            (args[1] as Record<string, unknown>).timeZone = fp.timezone;
          }
          return new target(...args);
        },
      });
      (window as unknown as Record<string, unknown>).Intl = { ...Intl, DateTimeFormat: proxy };

      // WebRTC spoofing
      if (fp.webRTC.mode === 'disabled') {
        Object.defineProperty(window, 'RTCPeerConnection', { value: undefined });
        Object.defineProperty(window, 'webkitRTCPeerConnection', { value: undefined });
        Object.defineProperty(window, 'mozRTCPeerConnection', { value: undefined });
      }
    }, fingerprint);
  }
}
