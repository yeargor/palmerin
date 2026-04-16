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

- `?startapp=club`
- `?startapp=ghost`

Также поддерживаются `start_param` и `profile`.

## Что реализовано

- Single-screen интерфейс
- Sticky блок персонажа
- Скроллируемый лог
- Автоскролл вниз при новых событиях
- Симуляция событий каждые 10 секунд
- Цвета: `#000000`, `#FFFFFF`, `#FE0F0E`
- Цветные щит и меч в ASCII-спрайте по `tamagotchi-ascii-art-skill.md`
