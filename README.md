# DolphinAnty Desktop

Полнофункциональный десктопный антидетект-браузер для мультиаккаунтинга под Windows 10 (x64).
Аналог Dolphin Anty Pro с поддержкой 100+ профилей.

## Возможности

### Управление профилями
- Создание, редактирование, удаление браузерных профилей
- Уникальный fingerprint для каждого профиля (UserAgent, Canvas, WebGL, AudioContext, Fonts, WebRTC и др.)
- Группировка и тегирование профилей
- Поиск и фильтрация
- Массовое создание профилей (batch)
- Импорт/экспорт профилей

### Fingerprint подмена
- User-Agent
- Canvas fingerprint (noise injection)
- WebGL vendor/renderer
- AudioContext fingerprint
- Screen resolution
- Hardware concurrency / Device memory
- Timezone
- Language
- WebRTC (отключение/подмена)
- Media devices
- Fonts
- Plugins
- Navigator.platform

### Прокси-менеджмент
- Поддержка HTTP, HTTPS, SOCKS4, SOCKS5
- Импорт списком (host:port:login:password)
- Проверка прокси (ping, определение IP/страны)
- Авторизация (login/password)

### Автоматизация (Сценарии)
- Визуальный конструктор сценариев
- Поддерживаемые действия: navigate, click, type, wait, scroll, screenshot, evaluate JS, keypress, select, hover, cookie management, loops
- Запуск сценариев на множественных профилях
- Обработка ошибок (stop/skip/retry)

### Cookie Robot
- Автоматический фарминг cookies
- Настройка URL-списков
- Прокрутка страниц и клик по случайным ссылкам
- Настройка задержек и warmup

### Синхронизатор
- Дублирование действий с master-профиля на slave-профили
- Синхронизация: мышь, клавиатура, навигация, прокрутка
- Настраиваемые задержки

### Bulk-операции
- Массовый запуск/остановка профилей
- Массовое удаление
- Массовая смена прокси
- Очистка cookies
- Обновление fingerprint
- Добавление тегов
- Запуск сценариев

### REST API
- Полный API для управления профилями, прокси, сценариями
- Поддержка интеграции с внешними инструментами
- Документация по эндпоинтам

### Безопасность
- AES-256 шифрование данных профилей
- Шифрование на уровне базы данных (SQLite)
- Раздельные директории для каждого профиля

## Технический стек

- **Electron** — десктопное приложение
- **React** + **TypeScript** — UI
- **Puppeteer Core** — управление Chromium
- **puppeteer-extra-plugin-stealth** — обход антибот-систем
- **better-sqlite3** — локальная база данных
- **CryptoJS** — шифрование данных
- **Express** — REST API сервер
- **Webpack** — сборка renderer
- **Jest** — тестирование

## Структура проекта

```
DolphinAntyDesktop/
├── src/
│   ├── main/                       # Electron main process
│   │   ├── main.ts                 # Точка входа Electron
│   │   ├── preload.ts              # Preload script (contextBridge)
│   │   ├── ipc-handlers.ts         # IPC обработчики
│   │   ├── core/                   # Ядро приложения
│   │   │   ├── profile-manager.ts  # Управление профилями
│   │   │   ├── browser-launcher.ts # Запуск Chromium
│   │   │   ├── fingerprint-engine.ts # Генерация/подмена fingerprint
│   │   │   ├── proxy-manager.ts    # Управление прокси
│   │   │   ├── scenario-engine.ts  # Движок сценариев
│   │   │   ├── cookie-robot.ts     # Cookie Robot
│   │   │   ├── synchronizer.ts     # Синхронизатор
│   │   │   ├── bulk-actions.ts     # Массовые операции
│   │   │   └── crypto-utils.ts     # Шифрование
│   │   ├── database/
│   │   │   └── database.ts         # SQLite база данных
│   │   └── api/
│   │       └── api-server.ts       # REST API сервер
│   ├── renderer/                   # UI (React)
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ProfileTable.tsx
│   │   │   ├── ProxyManager.tsx
│   │   │   ├── ScenarioBuilder.tsx
│   │   │   ├── CookieRobotView.tsx
│   │   │   ├── SyncView.tsx
│   │   │   └── SettingsView.tsx
│   │   └── styles/
│   │       └── global.css
│   └── shared/
│       └── types.ts                # Общие типы данных
├── tests/                          # Тесты (Jest)
├── package.json
├── tsconfig.main.json
├── webpack.renderer.js
├── jest.config.js
└── electron-builder.yml
```

## Установка и запуск

### Требования
- Node.js 18+
- npm 9+
- Windows 10 (x64)
- Google Chrome или Chromium установлен в системе

### Установка

```bash
# Клонировать репозиторий
cd DolphinAntyDesktop

# Установить зависимости
npm install
```

### Режим разработки

```bash
# Сборка и запуск
npm start

# Или с DevTools
npm start -- --dev
```

### Сборка

```bash
# Сборка main + renderer
npm run build

# Упаковка в установщик Win10
npm run package
```

### Тесты

```bash
npm test
```

## REST API

API доступен на `http://127.0.0.1:3001` (включается в настройках).

### Эндпоинты

| Метод  | Путь                        | Описание                    |
|--------|-----------------------------|-----------------------------|
| GET    | /api/v1/profiles            | Список профилей             |
| POST   | /api/v1/profiles            | Создать профиль             |
| PATCH  | /api/v1/profiles/:id        | Обновить профиль            |
| DELETE | /api/v1/profiles/:id        | Удалить профиль             |
| POST   | /api/v1/profiles/:id/start  | Запустить профиль           |
| POST   | /api/v1/profiles/:id/stop   | Остановить профиль          |
| GET    | /api/v1/proxies             | Список прокси               |
| POST   | /api/v1/proxies             | Добавить прокси             |
| DELETE | /api/v1/proxies/:id         | Удалить прокси              |
| POST   | /api/v1/proxies/:id/check   | Проверить прокси            |
| GET    | /api/v1/scenarios           | Список сценариев            |
| POST   | /api/v1/scenarios           | Создать сценарий            |
| POST   | /api/v1/scenarios/:id/run   | Запустить сценарий          |
| POST   | /api/v1/bulk                | Выполнить массовое действие |
| GET    | /api/v1/status              | Статус приложения           |

### Пример запроса

```bash
# Создать профиль
curl -X POST http://127.0.0.1:3001/api/v1/profiles \
  -H "Content-Type: application/json" \
  -d '{"name": "My Profile", "tags": ["test"]}'

# Запустить профиль
curl -X POST http://127.0.0.1:3001/api/v1/profiles/<id>/start

# Массовый запуск
curl -X POST http://127.0.0.1:3001/api/v1/bulk \
  -H "Content-Type: application/json" \
  -d '{"type": "launch", "profileIds": ["id1", "id2", "id3"]}'
```

## Настройки

Настройки хранятся в SQLite базе данных в `%APPDATA%/dolphin-anty-desktop/`.

| Параметр                | Описание                           | По умолчанию |
|-------------------------|------------------------------------|--------------|
| chromiumPath            | Путь к Chrome/Chromium             | Авто-определение |
| maxConcurrentProfiles   | Макс. одновременных профилей       | 10           |
| apiEnabled              | Включить REST API                  | false        |
| apiPort                 | Порт API сервера                   | 3001         |
| encryptionEnabled       | Шифрование данных                  | true         |
| theme                   | Тема интерфейса (dark/light)       | dark         |
| language                | Язык интерфейса (ru/en)            | ru           |

## Лицензия

Проект предназначен для образовательных целей.
