# Развёртывание «Академия ТОП» на Amvera.ru (для защиты диплома)

**Для кого:** пошаговая инструкция без опыта Linux и серверов.  
**Цель:** открыть проект по ссылке `https://ваш-проект.amvera.io` на защите.  
**Оплата:** картой РФ, от ~0 ₽ (пробный период) до ~300–600 ₽/мес.

Официальная документация Amvera: https://docs.amvera.ru/

---

## 1. Что такое Amvera и почему он подходит

[Amvera](https://amvera.ru) — российское облако для приложений на Node.js, Python, Docker и т.д.

| Плюс | Минус |
|------|-------|
| Интерфейс на русском | Monorepo нужно разбить на **3 проекта** |
| Оплата картой РФ | Бесплатный тариф ограничен |
| PostgreSQL одной кнопкой | Next.js требует хитрости с переменными при сборке |
| HTTPS-домен бесплатно | WebSocket иногда капризничает — держите запасной план |

**Не подходит:** обычный виртуальный хостинг (Beget «Сайты», Timeweb shared) — там нет Node.js.

---

## 2. Что нужно создать на Amvera

Ваш проект — **monorepo** (папки `apps/api` и `apps/web`). На Amvera правило: **один проект = один процесс**.

Создаёте **3 отдельных проекта**:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  academy-db     │     │  academy-api    │     │  academy-web    │
│  PostgreSQL     │◄────│  NestJS :3001   │◄────│  Next.js :3000  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

| № | Тип на Amvera | Название (пример) | Зачем |
|---|---------------|-------------------|-------|
| 1 | PostgreSQL | `academy-db` | База: ученики, оценки, чаты |
| 2 | Приложение (Node) | `academy-api` | API + WebSocket (чат) |
| 3 | Приложение (Node) | `academy-web` | Сайт в браузере |

---

## 3. Подготовка проекта на компьютере

### 3.1. Переключить базу на PostgreSQL

Откройте `apps/api/prisma/schema.prisma` и замените:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

на:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

> Локально для разработки можно оставить SQLite в отдельной ветке. Для облака — только PostgreSQL.

### 3.2. Залить код на GitHub

1. Зарегистрируйтесь на https://github.com
2. Создайте репозиторий `academy-top`
3. Загрузите проект из `C:\Projects\academiya`

**Не загружайте:**
- `node_modules/`
- `apps/web/.next/`
- `apps/api/prisma/dev.db`
- `.env` с секретами

### 3.3. Две ветки для деплоя (важно!)

В одном репозитории может быть только **один** файл `amvera.yml` в корне.  
Поэтому для API и сайта используем **две ветки**:

| Ветка | Что в корне | Какой проект Amvera |
|-------|-------------|---------------------|
| `deploy-api` | `amvera.yml` для API | `academy-api` |
| `deploy-web` | `amvera.yml` для сайта | `academy-web` |

В проекте уже лежат готовые шаблоны:
- `deploy/amvera/api.amvera.yml` → скопировать в корень как `amvera.yml` на ветке `deploy-api`
- `deploy/amvera/web.amvera.yml` → скопировать в корень как `amvera.yml` на ветке `deploy-web`

**Команды (один раз):**

```powershell
cd C:\Projects\academiya

# Ветка для API
git checkout -b deploy-api
copy deploy\amvera\api.amvera.yml amvera.yml
git add amvera.yml
git commit -m "Amvera: конфиг API"
git push origin deploy-api

# Ветка для сайта
git checkout main
git checkout -b deploy-web
copy deploy\amvera\web.amvera.yml amvera.yml
git add amvera.yml
git commit -m "Amvera: конфиг Web"
git push origin deploy-web
```

---

## 4. Регистрация на Amvera

1. Откройте https://amvera.ru
2. Нажмите **Регистрация**
3. Подтвердите email
4. При необходимости привяжите карту (для платных тарифов; часто есть пробный баланс)

---

## 5. Шаг 1 — PostgreSQL

1. На главной панели → **PostgreSQL** → **Создать базу данных**
2. Заполните:
   - **Название проекта:** `academy-db`
   - **Тариф:** «Начальный» или выше (на бесплатном PostgreSQL может быть нестабильно)
   - **Имя БД:** `academy_top` (нельзя `postgres`)
   - **Имя пользователя:** `academy` (нельзя `postgres`)
   - **Пароль:** придумайте и **сохраните**
3. Нажмите **Завершить**, дождитесь статуса **«PostgreSQL запущен»**
4. Откройте вкладку **Инфо** → скопируйте **внутреннее доменное имя** для чтения/записи:

   Пример: `amvera-ivanov-cnpg-academy-db-rw`

5. Соберите строку подключения:

```
postgresql://academy:ВАШ_ПАРОЛЬ@amvera-ivanov-cnpg-academy-db-rw:5432/academy_top
```

> Хост — **внутреннее** имя (без `https://`). Порт обычно `5432`.

---

## 6. Шаг 2 — API (бэкенд)

### 6.1. Создать проект

1. **Создать проект** → тип **Приложение**
2. Название: `academy-api`
3. Тариф: **Начальный** (минимум для стабильной работы)

### 6.2. Привязать GitHub

1. Вкладка **Репозиторий** → **Подключить GitHub**
2. Укажите репозиторий `academy-top`
3. **Ветка:** `deploy-api` (не `main`!)
4. Настройте Webhook по подсказкам на экране (URL + Secret из Amvera)

Альтернатива без GitHub — встроенный Git Amvera:

```powershell
git remote add amvera-api https://git.amvera.ru/ВАШ_ЛОГИН/academy-api
git checkout deploy-api
git push amvera-api deploy-api:master
```

### 6.3. Переменные окружения

Вкладка **Переменные** → добавьте:

| Имя | Тип | Значение |
|-----|-----|----------|
| `DATABASE_URL` | Секрет | `postgresql://academy:ПАРОЛЬ@amvera-...-rw:5432/academy_top` |
| `JWT_SECRET` | Секрет | длинная случайная строка, напр. `diplom2026SecretKey32chars!!` |
| `JWT_EXPIRES_IN` | Обычная | `7d` |
| `PORT` | Обычная | `3001` |
| `CORS_ORIGIN` | Обычная | пока `*` (потом URL сайта) |

### 6.4. Домен для API

1. **Настройки** → **Добавить доменное имя**
2. Тип: **Бесплатный домен Amvera** + **HTTPS**
3. Подождите 1–2 минуты
4. Скопируйте URL, например: `https://academy-api-ivanov.amvera.io`

### 6.5. Сборка и запуск

После push в ветку `deploy-api` Amvera сама:
1. Выполнит `npm install` в корне monorepo
2. Соберёт API (`prisma generate` + `nest build`)
3. При старте: `prisma db push` + `seed` + запуск сервера

Статус должен стать **«Успешно развернуто»**.

**Проверка:** откройте в браузере  
`https://academy-api-ivanov.amvera.io/v1/auth/login`  
Должна быть ошибка метода (GET вместо POST) — значит API живой.

---

## 7. Шаг 3 — Сайт (фронтенд)

### 7.1. Важно про Next.js и переменные

Amvera **не передаёт** переменные из панели на этапе **сборки**.  
А Next.js вшивает `NEXT_PUBLIC_*` именно при `npm run build`.

**Решение:** перед деплоем сайта создайте файл `apps/web/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://academy-api-ivanov.amvera.io/v1
NEXT_PUBLIC_WS_URL=https://academy-api-ivanov.amvera.io
```

Подставьте **ваш** URL API. Закоммитьте в ветку `deploy-web`:

```powershell
git checkout deploy-web
# создайте apps/web/.env.production с URL выше
git add apps/web/.env.production amvera.yml
git commit -m "Amvera: URL API для production-сборки"
git push origin deploy-web
```

> Это публичные URL, не секреты. Секреты (`JWT_SECRET`, пароль БД) в репозиторий не кладите.

### 7.2. Создать проект

1. **Создать проект** → **Приложение**
2. Название: `academy-web`
3. Привязать GitHub, ветка **`deploy-web`**

### 7.3. Переменные (на всякий случай)

Дублируйте в панели (для runtime, если понадобится):

| Имя | Значение |
|-----|----------|
| `NEXT_PUBLIC_API_URL` | `https://academy-api-ivanov.amvera.io/v1` |
| `NEXT_PUBLIC_WS_URL` | `https://academy-api-ivanov.amvera.io` |
| `PORT` | `3000` |

### 7.4. Домен для сайта

**Настройки** → **Бесплатный домен Amvera** + HTTPS  
Пример: `https://academy-web-ivanov.amvera.io`

### 7.5. Проверка

1. Откройте URL сайта
2. Войдите: `student@top.ru` / `password123`
3. Проверьте: расписание, оценки, чат

---

## 8. Шаг 4 — Настроить CORS

1. Проект `academy-api` → **Переменные**
2. Измените `CORS_ORIGIN`:

```
https://academy-web-ivanov.amvera.io
```

3. Сохраните — API перезапустится

---

## 9. Схема работы (для отчёта / защиты)

```
Пользователь
    │
    ▼
https://academy-web-....amvera.io  (Next.js)
    │ REST API
    ▼
https://academy-api-....amvera.io/v1  (NestJS)
    │ Prisma
    ▼
PostgreSQL (внутреннее имя amvera-...-rw)
    ▲
    └── WebSocket /ws (Socket.io) — тот же API-домен
```

**Что сказать комиссии:**

> «Приложение развёрнуто в облаке Amvera (РФ).  
> Фронтенд — Next.js, бэкенд — NestJS, СУБД — PostgreSQL,  
> чат — Socket.io по WebSocket.  
> Адрес: https://academy-web-....amvera.io»

---

## 10. Стоимость (ориентир)

| Компонент | Тариф | Примерно |
|-----------|-------|----------|
| PostgreSQL | Начальный | ~100–200 ₽/мес |
| API | Начальный | ~100–200 ₽/мес |
| Сайт | Начальный | ~100–200 ₽/мес |
| **Итого** | | **~300–600 ₽/мес** |

На защиту диплома хватит 1–2 месяцев. После защиты проекты можно **поставить на паузу** в панели Amvera.

---

## 11. Чеклист перед защитой

- [ ] PostgreSQL в статусе «запущен»
- [ ] API: «Успешно развернуто», `/v1/auth/login` отвечает
- [ ] Сайт: «Успешно развернуто», вход работает
- [ ] `CORS_ORIGIN` = точный URL сайта (без `/` в конце)
- [ ] В `apps/web/.env.production` правильные URL API
- [ ] Чат отправляет сообщения
- [ ] Ссылка открывается с телефона (мобильный интернет, не только Wi‑Fi)
- [ ] На ноутбуке готов запасной план: `npm run dev` → `localhost:3000`

---

## 12. Частые проблемы

| Симптом | Причина | Решение |
|---------|---------|---------|
| **502 Bad Gateway** | Сервер слушает только `localhost` | В `main.ts` API: `await app.listen(port, '0.0.0.0')` |
| **Network Error** при входе | Неверный URL API на фронте | Проверьте `apps/web/.env.production`, пересоберите сайт |
| **CORS error** в консоли F12 | Неверный `CORS_ORIGIN` | Укажите точный `https://...amvera.io` сайта |
| **Чат не подключается** | Неверный WS URL | `NEXT_PUBLIC_WS_URL` = URL API **без** `/v1` |
| **Пустая база** | Seed не выполнился | Логи API → перезапуск; в `amvera.yml` есть `db:seed` |
| **Сборка падает** | Нет `amvera.yml` в корне | Файл должен быть в корне ветки `deploy-api` / `deploy-web` |
| **Сборка Web без API** | Нет `.env.production` | Создайте файл **до** push (см. раздел 7.1) |
| **БД не подключается** | Внешний хост вместо внутреннего | Используйте `amvera-...-rw`, не публичный URL |
| Зависла «Сборка» | Ошибка в конфиге | **Конфигурация** → Лог сборки |

**Логи:** вкладки **Лог сборки** и **Лог приложения** (могут появляться с задержкой 5–10 мин).

**Поддержка:** support@amvera.ru — укажите логин Amvera и название проекта.

---

## 13. Запасной план на день защиты

Если облако подведёт:

```powershell
cd C:\Projects\academiya
npm run dev
```

Откройте `http://localhost:3000` на ноутбуке.  
Для диплома это **нормально** — главное показать работающий продукт.

---

## 14. Краткий план (если некогда читать всё)

1. `schema.prisma` → `postgresql`
2. GitHub: репозиторий + ветки `deploy-api` и `deploy-web` с `amvera.yml`
3. Amvera: PostgreSQL → скопировать `DATABASE_URL`
4. Amvera: проект API, ветка `deploy-api`, переменные, домен
5. Создать `apps/web/.env.production` с URL API
6. Amvera: проект Web, ветка `deploy-web`, домен
7. Обновить `CORS_ORIGIN` на API
8. Проверить вход и чат

**Время:** 2–3 часа в первый раз.

---

## 15. Сравнение: Amvera vs Render

| | Amvera | Render (free) |
|---|--------|---------------|
| Оплата РФ | ✅ | ❌ (зарубежная карта) |
| Русский интерфейс | ✅ | ❌ |
| «Засыпание» | Обычно нет на платном | Да, 15 мин |
| Сложность monorepo | 2 ветки | 2 Web Service |
| Цена для диплома | ~300–600 ₽/мес | 0 ₽ |

---

*Если застряли на конкретном шаге — напишите, на каком проекте Amvera и что в логах сборки.*
