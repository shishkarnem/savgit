/**
 * Helper to generate and persist an 11-digit numeric unique UID for all visitors/guests,
 * or prioritize the user's authentic Telegram ID / registered ID.
 */
// Comprehensive helper to resolve, cache and persist the authentic user UID across all visits
export function generate11DigitUID(): string {
  const min = 10000000000;
  const max = 99999999999;
  const num = Math.floor(min + Math.random() * (max - min + 1));
  return String(num);
}

function cleanNumericUid(val: any): string | null {
  if (!val) return null;
  const str = String(val).trim();
  const base = str.replace(/_tz$/i, '').trim();
  if (/^\d{5,15}$/.test(base)) {
    return base;
  }
  return null;
}

export function getOrGenerateUID(telegramProfile?: { telegram_id?: number | string; id?: number | string } | null): string {
  if (typeof window === 'undefined') return generate11DigitUID();

  try {
    // 1. Direct telegram profile passed as parameter
    const directId = cleanNumericUid(telegramProfile?.telegram_id) || cleanNumericUid(telegramProfile?.id);
    if (directId) {
      persistUidAcrossStorages(directId);
      return directId;
    }

    // 2. Telegram WebApp initData user id
    const tgWebAppData = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const tgWebId = cleanNumericUid(tgWebAppData);
    if (tgWebId) {
      persistUidAcrossStorages(tgWebId);
      return tgWebId;
    }

    // 3. In-memory cached window reference
    const winCached = cleanNumericUid((window as any).__sav_user_uid);
    if (winCached) {
      persistUidAcrossStorages(winCached);
      return winCached;
    }

    // 4. Check URL query parameters (?uid=... or ?user_id=... or ?chat_id=... or ?tg_id=...)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlUid = cleanNumericUid(urlParams.get('uid') || urlParams.get('user_id') || urlParams.get('chat_id') || urlParams.get('tg_id'));
      if (urlUid) {
        persistUidAcrossStorages(urlUid);
        return urlUid;
      }
    } catch {}

    // 5. Stored telegram profile in localStorage
    const storedTg = localStorage.getItem('sav_telegram_profile');
    if (storedTg) {
      try {
        const parsed = JSON.parse(storedTg);
        const parsedId = cleanNumericUid(parsed?.telegram_id) || cleanNumericUid(parsed?.id);
        if (parsedId) {
          persistUidAcrossStorages(parsedId);
          return parsedId;
        }
      } catch {}
    }

    // 6. Inspect all standard cached localStorage and sessionStorage keys in priority order
    const candidateKeys = [
      'sav_user_uid',
      'sav_cached_uid',
      'sav-user-uid',
      'sav_user_id',
      'user_id',
      'telegram_id',
      'sav_telegram_id',
      'sav_client_id'
    ];

    for (const key of candidateKeys) {
      const localVal = cleanNumericUid(localStorage.getItem(key));
      if (localVal) {
        persistUidAcrossStorages(localVal);
        return localVal;
      }
      const sessionVal = cleanNumericUid(sessionStorage.getItem(key));
      if (sessionVal) {
        persistUidAcrossStorages(sessionVal);
        return sessionVal;
      }
    }

    // 7. Check stored calculator state or audit state if they contain a saved UID
    try {
      const rawCalc = sessionStorage.getItem('sav-calculator-data') || localStorage.getItem('sav_calculator_data');
      if (rawCalc) {
        const parsed = JSON.parse(rawCalc);
        const stateUid = cleanNumericUid(parsed?.uid) || cleanNumericUid(parsed?.userUid) || cleanNumericUid(parsed?.telegram_id);
        if (stateUid) {
          persistUidAcrossStorages(stateUid);
          return stateUid;
        }
      }
    } catch {}

    // 8. Generate and persist new stable UID
    const newUid = generate11DigitUID();
    persistUidAcrossStorages(newUid);
    return newUid;
  } catch {
    return generate11DigitUID();
  }
}

function persistUidAcrossStorages(uid: string) {
  try {
    (window as any).__sav_user_uid = uid;
    localStorage.setItem('sav_user_uid', uid);
    localStorage.setItem('sav_cached_uid', uid);
    sessionStorage.setItem('sav_user_uid', uid);
    sessionStorage.setItem('sav_cached_uid', uid);
  } catch {}
}

export function getUserUid(telegramProfile?: { telegram_id?: number | string; id?: number | string } | null): string {
  return getOrGenerateUID(telegramProfile);
}
