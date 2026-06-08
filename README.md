# Академия ТОП — Личный кабинет

Полнофункциональный модуль личного кабинета: ученик, преподаватель, администратор.

## Быстрый старт

### Требования
- **Node.js 20+** — https://nodejs.org/

### Первый запуск (или после переноса папки)

```powershell
cd C:\Projects\academiya
.\scripts\setup-windows.ps1
```

Или вручную:

```powershell
cd C:\Projects\academiya
npm run setup
```

### Каждый день

```powershell
cd C:\Projects\academiya
npm run dev
```

Откройте **http://localhost:3000**

### Демо-аккаунты (пароль: `password123`)

| Email | @username | Роль |
|-------|-----------|------|
| student@top.ru | mafffiz | Ученик |
| student2@top.ru | kozlov_d | Ученик |
| teacher@top.ru | ivanov_teach | Преподаватель |
| admin@top.ru | — | Администратор |

📖 **Полная инструкция по запуску:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)  
📖 **Где захостить для диплома (для чайника):** [docs/HOSTING_DIPLOMA.md](docs/HOSTING_DIPLOMA.md)

## Возможности

- **Ученик:** дашборд, расписание, оценки, посещаемость, мессенджер (групповой + личный чат)
- **Мессенджер:** добавление друзей по @username, личные сообщения, real-time через Socket.io
- **Преподаватель:** ведомость (оценки + посещаемость), журнал, чат с модерацией
- **Админ:** пользователи, конструктор расписания, аналитика

## Стек

- Frontend: Next.js 15, Tailwind 4, Framer Motion, TanStack Query
- Backend: NestJS, Prisma, SQLite (dev) / PostgreSQL (prod)
- Real-time: Socket.io

## Структура

```
apps/
  api/     — NestJS REST + WebSocket
  web/     — Next.js frontend
docs/      — Техническое задание
```

## PostgreSQL (опционально)

```bash
docker compose up -d
```

Измените `apps/api/.env`:
```
DATABASE_URL="postgresql://academy:academy@localhost:5432/academy_top"
```

Затем: `npm run db:push && npm run db:seed`
