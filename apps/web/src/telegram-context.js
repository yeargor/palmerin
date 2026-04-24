export function resolveTelegramUserId({ tg, url, localStorageRef }) {
  void url;
  const fromTelegram = Number(tg?.initDataUnsafe?.user?.id);
  if (Number.isFinite(fromTelegram) && fromTelegram > 0) {
    return fromTelegram;
  }

  const fromStorage = Number(localStorageRef?.getItem('miniapp.debugTgUserId'));
  if (Number.isFinite(fromStorage) && fromStorage > 0) {
    return fromStorage;
  }

  return null;
}

export function resolveTelegramUsername({ tg, url, localStorageRef }) {
  void url;
  const fromTelegram = String(tg?.initDataUnsafe?.user?.username || '').trim();
  if (fromTelegram) {
    return fromTelegram.replace(/^@+/, '');
  }

  const fromStorage = String(localStorageRef?.getItem('miniapp.debugTgUsername') || '').trim();
  if (fromStorage) {
    return fromStorage.replace(/^@+/, '');
  }

  return null;
}

export function requireTelegramUserId(context) {
  const value = resolveTelegramUserId(context);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('telegram user id is required');
  }
  return value;
}
