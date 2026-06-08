# Запуск и развёртывание — Академия ТОП

## Часть 1. Локальный запуск (Windows / macOS / Linux)

### Требования

| Компонент | Версия |
|-----------|--------|
| Node.js | **20.x** или **22.x** (LTS) |
| npm | 10+ (идёт с Node.js) |
| Git | опционально |

Проверка:
```bash
node -v
npm -v
```

Скачать Node.js: https://nodejs.org/

---

### Шаг 1. Открыть папку проекта

```bash
cd C:\Projects\academiya
```

(или путь, куда вы скопировали проект)

---

### Шаг 2. Первоначальная установка (один раз)

```bash
npm run setup
```

Эта команда:
1. Устанавливает зависимости (`npm install`)
2. Генерирует Prisma-клиент
3. Создаёт SQLite-базу `apps/api/prisma/dev.db`
4. Заполняет демо-данными (ученики, расписание, чаты)

---

### Шаг 3. Запуск в режиме разработки

```bash
npm run dev
```

Запускаются два сервера:
| Сервис | URL |
|--------|-----|
| Фронтенд (Next.js) | http://localhost:3000 |
| API (NestJS) | http://localhost:3001/v1 |
| WebSocket (чат) | ws://localhost:3001/ws |

Откройте в браузере: **http://localhost:3000**

---

### Шаг 4. Вход в систему

Пароль для всех демо-аккаунтов: **`password123`**

| Email | @username | Роль |
|-------|-----------|------|
| student@top.ru | mafffiz | Ученик |
| student2@top.ru | kozlov_d | Ученик |
| teacher@top.ru | ivanov_teach | Преподаватель |
| admin@top.ru | — | Администратор |

---

### Частые проблемы (локально)

**Порт занят**
```bash
# Windows PowerShell — найти процесс на порту 3000/3001
netstat -ano | findstr :3000
taskkill /PID <номер> /F
```

**Ошибка Prisma после обновления схемы**
```bash
npm run db:push
npm run db:seed
```

**API не отвечает**
- Убедитесь, что в терминале нет ошибок у `[api]`
- Проверьте файл `apps/api/.env`

**Чат не подключается**
- Проверьте `apps/web/.env.local`:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:3001/v1
  NEXT_PUBLIC_WS_URL=http://localhost:3001
  ```

**ENOENT / vendor-chunks / lucide-react.js**
- Повреждённый кэш сборки. Выполните:
  ```bash
  cd apps/web
  npm run clean
  npm run dev
  ```
- Если проект лежит в **OneDrive** — перенесите в `C:\Projects\academiya` (OneDrive может удалять/блокировать файлы в `.next` во время сборки).

---

### Сборка production-версии (локально)

```bash
npm run build
npm run start -w @academy-top/api    # терминал 1
npm run start -w @academy-top/web    # терминал 2
```

---

## Часть 2. Можно ли разместить на Beget?

### Краткий ответ

| Тип хостинга Beget | Подходит? | Почему |
|--------------------|-----------|--------|
| **Виртуальный хостинг** (сайты + PHP) | ❌ **Нет** | Нет постоянного Node.js, нет WebSocket |
| **VPS / Cloud VPS** | ✅ **Да** | Полный доступ, можно запустить Node + PostgreSQL |
| **Выделенный сервер** | ✅ **Да** | Аналогично VPS |

Проект использует:
- **Node.js** (NestJS API + Next.js) — процессы должны работать 24/7
- **WebSocket** (Socket.io для чата) — нужен reverse proxy с поддержкой Upgrade
- **База данных** — PostgreSQL (рекомендуется на продакшене)

На обычном виртуальном хостинге Beget (где только PHP и MySQL) **разместить этот проект нельзя**.

На **VPS Beget** (от ~300–500 ₽/мес) — **можно**, ниже инструкция.

---

## Часть 3. Развёртывание на Beget VPS

### Что заказать на Beget

1. Зайдите на https://beget.com → **VPS** или **Облако**
2. Минимальная конфигурация для старта:
   - **2 GB RAM**, 1–2 CPU, 20 GB SSD
   - ОС: **Ubuntu 22.04**
3. Привяжите домен (например `cabinet.academy-top.ru`)

---

### Шаг 1. Подключение к серверу

```bash
ssh root@ВАШ_IP_СЕРВЕРА
```

---

### Шаг 2. Установка Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
apt install -y nodejs git nginx
node -v
```

---

### Шаг 3. Установка PostgreSQL

```bash
apt install -y postgresql postgresql-contrib

sudo -u postgres psql -c "CREATE USER academy WITH PASSWORD 'НАДЁЖНЫЙ_ПАРОЛЬ';"
sudo -u postgres psql -c "CREATE DATABASE academy_top OWNER academy;"
```

---

### Шаг 4. Загрузка проекта на сервер

**Вариант A — через Git:**
```bash
cd /var/www
git clone <ваш-репозиторий> academiya
cd academiya
npm install
```

**Вариант B — через SFTP:**
- Загрузите папку проекта в `/var/www/academiya` через FileZilla / WinSCP

---

### Шаг 5. Настройка переменных окружения

**`/var/www/academiya/apps/api/.env`**
```env
DATABASE_URL="postgresql://academy:НАДЁЖНЫЙ_ПАРОЛЬ@localhost:5432/academy_top"
JWT_SECRET="случайная-длинная-строка-минимум-32-символа"
JWT_EXPIRES_IN="7d"
PORT=3001
CORS_ORIGIN="https://cabinet.ваш-домен.ru"
UPLOAD_DIR="/var/www/academiya/uploads"
```

**`/var/www/academiya/apps/api/prisma/schema.prisma`** — смените провайдер:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**`/var/www/academiya/apps/web/.env.local`**
```env
NEXT_PUBLIC_API_URL=https://cabinet.ваш-домен.ru/api/v1
NEXT_PUBLIC_WS_URL=https://cabinet.ваш-домен.ru
```

---

### Шаг 6. База данных и сборка

```bash
cd /var/www/academiya

# После смены provider на postgresql:
npm run db:generate
npm run db:push
npm run db:seed

npm run build
```

---

### Шаг 7. PM2 — автозапуск процессов

```bash
npm install -g pm2

cd /var/www/academiya
pm2 start apps/api/dist/main.js --name academy-api
pm2 start npm --name academy-web -- run start -w @academy-top/web
pm2 save
pm2 startup
```

---

### Шаг 8. Nginx — reverse proxy + SSL

Файл `/etc/nginx/sites-available/academy`:

```nginx
server {
    listen 80;
    server_name cabinet.ваш-домен.ru;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cabinet.ваш-домен.ru;

    ssl_certificate     /etc/letsencrypt/live/cabinet.ваш-домен.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cabinet.ваш-домен.ru/privkey.pem;

    # Next.js фронтенд
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket для чата
    location /ws/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Активация:
```bash
ln -s /etc/nginx/sites-available/academy /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

**SSL (бесплатно):**
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d cabinet.ваш-домен.ru
```

---

### Шаг 9. Обновление JWT_SECRET и паролей

На продакшене **обязательно** замените:
- `JWT_SECRET` — случайная строка 64+ символов
- Пароли демо-аккаунтов или удалите seed и создайте реальных пользователей через админку
- `password123` — только для разработки!

---

## Часть 4. Альтернативы Beget (если VPS сложно)

| Платформа | Сложность | Примечание |
|-----------|-----------|------------|
| **Beget VPS** | Средняя | Полный контроль, ~500 ₽/мес |
| **Timeweb Cloud** | Средняя | Аналог VPS |
| **Railway / Render** | Низкая | Node.js из коробки, есть бесплатный tier |
| **Vercel** (только фронт) + **Railway** (API) | Низкая | Раздельный деплой |

---

## Чеклист перед продакшеном

- [ ] PostgreSQL вместо SQLite
- [ ] Уникальный `JWT_SECRET`
- [ ] HTTPS (SSL-сертификат)
- [ ] Сменены демо-пароли
- [ ] `CORS_ORIGIN` указывает на ваш домен
- [ ] PM2 или systemd для автозапуска
- [ ] Резервное копирование БД (cron + pg_dump)

---

## Быстрые команды (шпаргалка)

```bash
# Локально — первый запуск
npm run setup && npm run dev

# Локально — только API
npm run dev -w @academy-top/api

# Локально — только фронт
npm run dev -w @academy-top/web

# Пересоздать БД с демо-данными
npm run db:push && npm run db:seed

# Production-сборка
npm run build
```
