# Telegram Mini App Demo (Auto-Battler UI)

Демо-проект вынесен в отдельную папку: `telegram-miniapp-demo`.

## Режим удобной проверки интерфейса

### 1) Локальный предпросмотр для вас (комп + телефон)

```bash
cd /home/yahor/telegram-miniapp-demo
npm install
npm run preview:mobile
```

Скрипт делает следующее:
- запускает локальный сервер на `4173`
- выводит URL для компьютера и телефона (в той же Wi-Fi сети)
- автоматически открывает страницу на компьютере (если доступен `xdg-open`)

Остановка: `Ctrl+C`

### 2) Автоскриншоты мобильных вьюпортов (для ревью правок)

В отдельном терминале, пока работает `preview:mobile`:

```bash
cd /home/yahor/telegram-miniapp-demo
npm run capture:mobile
```

Скриншоты будут в `artifacts/mobile/`:
- `iphone13-club.png`
- `iphone13-ghost.png`
- `pixel7-club.png`
- `pixel7-ghost.png`

## Параметр профиля (для QR/deep-link демо)

- `/apps/web/index.html?startapp=club`
- `/apps/web/index.html?startapp=ghost`

Также поддерживаются `start_param` и `profile`.

## Что реализовано

- Single-screen интерфейс
- Sticky блок персонажа
- Скроллируемый лог
- Автоскролл вниз при новых событиях
- Симуляция событий каждые 10 секунд
- Цвета: `#000000`, `#FFFFFF`, `#FE0F0E`
- Цветные щит и меч в ASCII-спрайте по `tamagotchi-ascii-art-skill.md`

## Деплой фронтенда на GitHub Pages

1. Запушить репозиторий на GitHub в рабочую ветку Pages workflow (сейчас `master`).
2. В репозитории включить Pages: `Settings -> Pages -> Source: GitHub Actions`.
3. Workflow уже добавлен: `.github/workflows/deploy-pages.yml`.
4. После первого деплоя фронт будет доступен по `https://<user>.github.io/<repo>/`.

Важно для API:
- Во фронте прописан `miniapp:api-base = https://palmerin.ru` (`apps/web/index.html`).
- На backend в `CORS_ALLOWED_ORIGINS` нужно добавить origin GitHub Pages:
  - `https://<user>.github.io`
- Для route-страниц без query-аргументов используются отдельные entrypoints:
  - `/palmerin/index.html`
  - `/palmerin/admin.html`
  - `/palmerin/profiles.html`
  - `/palmerin/live.html`

Важно для Telegram Mini App:
- В BotFather web app URL должен быть HTTPS URL GitHub Pages или ваш кастомный домен на Pages.
