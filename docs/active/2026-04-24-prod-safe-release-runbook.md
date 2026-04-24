# Production Safe Release Runbook (VPS + SQLite + systemd)

Дата: 2026-04-24

Цель: обновить backend + frontend без потери пользователей/данных и без двойного writer боевого тика.

## 1) Что уже сделано в репо (можно выполнять локально до VPS)

- Добавлен скрипт cache-bust фронта:
  - `scripts/bump-web-bundle.mjs`
  - npm script: `npm run web:bump-bundle`
- Скрипт:
  - создает новый bundle `apps/web/app.vN.js` из `apps/web/app.js`;
  - автоматически переключает `index.html`, `admin.html`, `profiles.html`, `live.html` на новый `app.vN.js`.

Это безопасная замена ручному чередованию `app/app.v2`.

## 2) Что выполнить вам на VPS (строго по шагам)

Важно: во время переключения должен быть только один writer battle tick.

### 2.1 Подготовка и snapshot

1. Зайти на VPS:

```bash
ssh <user>@<vps-host>
```

2. Параметры (проверить пути):

```bash
export APP_DIR=/opt/palmerin
export DB_PATH=/var/lib/palmerin/prod.sqlite
export BACKUP_DIR=/var/backups/palmerin
sudo mkdir -p "$BACKUP_DIR"
```

3. Backup SQLite + проверка целостности:

```bash
TS="$(date +%F-%H%M%S)"
sudo sqlite3 "$DB_PATH" ".timeout 5000" ".backup '$BACKUP_DIR/predeploy-$TS.sqlite'"
sudo sqlite3 "$BACKUP_DIR/predeploy-$TS.sqlite" "PRAGMA integrity_check;"
```

Ожидаемый результат: `ok`.

4. Зафиксировать контрольные счетчики до релиза:

```bash
sudo sqlite3 "$DB_PATH" "select count(*) as users from users;"
sudo sqlite3 "$DB_PATH" "select count(*) as characters from characters;"
```

### 2.2 Обновить backend без потери данных

1. Обновить код и зависимости:

```bash
cd "$APP_DIR"
git fetch --all --tags
git checkout master
git pull --ff-only
sudo -u palmerin -H bash -lc "cd $APP_DIR && npm ci --omit=dev"
```

2. Миграции:

```bash
sudo -u palmerin -H bash -lc "cd $APP_DIR && source /etc/palmerin.env && npm run db:migrate"
```

3. Перезапустить backend:

```bash
sudo systemctl restart palmerin
sudo systemctl status palmerin --no-pager
```

4. Проверки health:

```bash
curl -fsS https://palmerin.ru/healthz
curl -fsS https://palmerin.ru/readyz
```

5. Проверка CORS (если фронт на Pages):

```bash
curl -i -H 'Origin: https://yeargor.github.io' https://palmerin.ru/readyz
```

### 2.3 Обновить frontend и принудительно сбросить кеш Telegram WebView

Это делается локально в репо перед пушем в `master`:

```bash
cd /home/yahor/telegram-miniapp-demo
npm run web:bump-bundle
```

Дальше пуш `master` (GitHub Pages деплой). После выкладки Telegram будет тянуть новый `app.vN.js`.

## 3) Пост-проверки после релиза

1. Проверить, что пользователи не потерялись:

```bash
sudo sqlite3 "$DB_PATH" "select count(*) as users from users;"
sudo sqlite3 "$DB_PATH" "select count(*) as characters from characters;"
```

Должно быть не меньше значений до релиза.

2. Проверить API:

```bash
curl -fsS https://palmerin.ru/api/leaderboard | head -c 500
curl -fsS https://palmerin.ru/api/system/config | head -c 500
```

3. Проверить логи сервиса (5-10 минут):

```bash
sudo journalctl -u palmerin -n 200 --no-pager
sudo journalctl -u palmerin -f
```

## 4) Rollback (если что-то не так)

1. Вернуть предыдущий стабильный коммит/тег в `/opt/palmerin`.
2. `npm ci --omit=dev`.
3. `sudo systemctl restart palmerin`.
4. Если проблема в данных (редко):

```bash
sudo systemctl stop palmerin
sudo cp "$BACKUP_DIR/predeploy-<timestamp>.sqlite" "$DB_PATH"
sudo chown palmerin:palmerin "$DB_PATH"
sudo systemctl start palmerin
```

## 5) Почему это безопасно для БД

- есть pre-deploy backup;
- есть проверка `integrity_check`;
- есть контрольные счетчики до/после;
- нет параллельных разных runtime процессов записи в SQLite вне одного `palmerin.service`.
