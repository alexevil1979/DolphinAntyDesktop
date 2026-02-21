# AI_CONTEXT — DolphinAnty Desktop

## Что это за проект

Десктопный антидетект-браузер для мультиаккаунтинга (аналог Dolphin Anty Pro).
Electron + React + TypeScript + Puppeteer Core + SQLite.

## Текущее состояние (2026-02-20)

### Статус: MVP готов, собирается и запускается

- **Git-ветка:** `feat/full-implementation` (запушена на origin)
- **Ветка `main` защищена** — PR ещё не вмержен: https://github.com/alexevil1979/DolphinAntyDesktop/pull/new/feat/full-implementation
- **Последний коммит:** `b74a755` — полная реализация всех модулей
- **Тесты:** 80/80 pass (fingerprint, profiles, proxies, scenarios, crypto)
- **Сборка:** TypeScript main — 0 ошибок, Webpack renderer — 0 ошибок
- **Запуск:** Electron стартует, UI рендерится, DevTools чист (только штатные предупреждения)

### Что реализовано

| Модуль | Файл | Статус |
|--------|------|--------|
| Типы данных | `src/shared/types.ts` | Готов |
| Шифрование (AES-256-CBC) | `src/main/core/crypto-utils.ts` | Готов, протестирован |
| Fingerprint-движок | `src/main/core/fingerprint-engine.ts` | Готов — UA, Canvas, WebGL, Audio, WebRTC, Timezone, Fonts, Plugins, MediaDevices |
| Управление профилями | `src/main/core/profile-manager.ts` | Готов — CRUD, группы, теги, поиск, дубли, import/export, batch 100+ |
| Запуск Chromium | `src/main/core/browser-launcher.ts` | Готов — Puppeteer Core, per-profile userDataDir, fingerprint injection, proxy auth |
| Прокси-менеджер | `src/main/core/proxy-manager.ts` | Готов — HTTP/HTTPS/SOCKS4/5, проверка, импорт строками |
| Сценарии | `src/main/core/scenario-engine.ts` | Готов — 16 типов шагов, retry/skip/stop, concurrency |
| Cookie Robot | `src/main/core/cookie-robot.ts` | Готов — фарм cookies, scroll, random clicks, delay |
| Синхронизатор | `src/main/core/synchronizer.ts` | Готов — master/slave, mouse, keyboard, navigation, scroll |
| Bulk-операции | `src/main/core/bulk-actions.ts` | Готов — 10 типов действий |
| База данных (SQLite) | `src/main/database/database.ts` | Готов — sql.js, шифрованное хранение, persist to disk |
| REST API | `src/main/api/api-server.ts` | Готов — Express, 15 эндпоинтов, CORS |
| IPC обработчики | `src/main/ipc-handlers.ts` | Готов — 30+ handlers, auto-persist |
| Electron main | `src/main/main.ts` | Готов — preload, contextBridge, async init |
| Preload | `src/main/preload.ts` | Готов — contextBridge API |
| UI: Sidebar | `src/renderer/components/Sidebar.tsx` | Готов |
| UI: Dashboard | `src/renderer/components/Dashboard.tsx` | Готов |
| UI: ProfileTable | `src/renderer/components/ProfileTable.tsx` | Готов — таблица, создание, bulk, поиск, auto-refresh |
| UI: ProxyManager | `src/renderer/components/ProxyManager.tsx` | Готов — CRUD, импорт, проверка |
| UI: ScenarioBuilder | `src/renderer/components/ScenarioBuilder.tsx` | Готов — визуальный конструктор, запуск на профилях |
| UI: CookieRobotView | `src/renderer/components/CookieRobotView.tsx` | Готов — конфигурация, прогресс |
| UI: SyncView | `src/renderer/components/SyncView.tsx` | Готов — master/slave, опции синхронизации |
| UI: SettingsView | `src/renderer/components/SettingsView.tsx` | Готов — все настройки |
| Стили | `src/renderer/styles/global.css` | Готов — тёмная тема, 611 строк |
| Тесты fingerprint | `tests/fingerprint.test.ts` | 9 тестов, pass |
| Тесты профилей | `tests/profile-manager.test.ts` | 22 теста, pass |
| Тесты прокси | `tests/proxy.test.ts` | 18 тестов, pass |
| Тесты сценариев | `tests/scenario.test.ts` | 14 тестов, pass |
| Тесты шифрования | `tests/crypto.test.ts` | 16 тестов, pass |
| README | `README.md` | Готов |
| FAQ | `FAQ.md` | Готов |

### Структура проекта

```
src/
├── main/                          # Electron main process
│   ├── main.ts
│   ├── preload.ts
│   ├── ipc-handlers.ts
│   ├── core/                      # 9 модулей ядра
│   ├── database/database.ts
│   └── api/api-server.ts
├── renderer/                      # React UI
│   ├── App.tsx, index.tsx, index.html
│   ├── components/                # 8 компонентов
│   ├── styles/global.css
│   └── global.d.ts
└── shared/types.ts
tests/                             # 5 test suites, 80 тестов
```

### Технологии

- Electron 33, React 18, TypeScript 5.7
- Puppeteer Core 23, puppeteer-extra-plugin-stealth
- sql.js (SQLite без native-компиляции), CryptoJS (AES-256)
- Express 4 (REST API), Webpack 5 (bundler)
- Jest 29 + ts-jest (тестирование)

---

## Следующие шаги

### Приоритет 1 — Довести до production

1. **Вмержить PR в main** — открыть https://github.com/alexevil1979/DolphinAntyDesktop/pull/new/feat/full-implementation и создать PR
2. **Протестировать запуск профилей на реальном Chrome** — убедиться, что fingerprint подменяется на browserleaks.com, pixelscan.net
3. **Протестировать прокси** — добавить реальные прокси, проверить IP-утечки через whoer.net
4. **Протестировать сценарии** — создать сценарий посещения 5+ сайтов, запустить на 3–5 профилях

### Приоритет 2 — Улучшения UI/UX

5. **Редактирование профиля** — модалка/страница для изменения имени, прокси, fingerprint существующего профиля
6. **Drag-and-drop шагов** в ScenarioBuilder
7. **Уведомления (toast)** — успех/ошибка операций вместо alert
8. **Тема light** — реализовать переключение (CSS переменные уже готовы)
9. **Локализация en/ru** — вынести строки в JSON

### Приоритет 3 — Расширение функционала

10. **Расширения Chrome** — UI для добавления .crx файлов к профилям
11. **Облачная синхронизация** — подключение к внешнему серверу для бэкапа профилей
12. **Планировщик задач** — запуск сценариев по расписанию (cron)
13. **Логирование** — подробные логи действий для каждого профиля
14. **Electron auto-updater** — автообновление приложения

### Приоритет 4 — Стабильность

15. **E2E тесты** — Playwright/Spectron для тестирования UI
16. **CI/CD** — GitHub Actions для автосборки и тестов
17. **Electron-builder** — протестировать сборку .exe установщика (`npm run package`)
18. **Обработка edge cases** — потеря соединения с прокси, crash браузера, переполнение памяти

---

## Известные ограничения

- `puppeteer-extra-plugin-stealth` импортирован в зависимости, но ещё не подключен в browser-launcher (сейчас используется puppeteer-core напрямую)
- Облачная синхронизация — настройки есть в UI, бэкенд не реализован
- Тема light — переключатель в настройках есть, CSS только для dark
- Сборка .exe (`npm run package`) не протестирована на чистой машине
- REST API не защищён токеном (доступен только на 127.0.0.1)

## Полезные команды

```bash
npm start              # Собрать и запустить
npm start -- --dev     # С DevTools
npm test               # 80 тестов
npm run build          # Только сборка
npm run build:main     # Только main process
npm run build:renderer # Только React UI
npm run package        # Собрать .exe
```
