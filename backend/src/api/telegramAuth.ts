import crypto from 'crypto';
import { executeQuery } from '../db/database';

/**
 * Валидация Telegram WebApp initData с помощью HMAC-SHA256
 * @param initData Сырая строка параметров от window.Telegram.WebApp.initData
 * @param customBotToken Опционально переданный токен бота
 */
export function validateTelegramInitData(initData: string, customBotToken?: string): { isValid: boolean; parsedData?: any; error?: string } {
  if (!initData || typeof initData !== 'string') {
    return { isValid: false, error: 'Empty initData provided' };
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) {
      return { isValid: false, error: 'No hash found in initData' };
    }

    // Получаем токен бота из базы данных BD ProTalk (bot_settings) или переменных окружения
    let botToken = customBotToken;
    if (!botToken) {
      const botSettings = executeQuery(`SELECT token FROM bot_settings WHERE id = 'main_bot' LIMIT 1`);
      botToken = botSettings?.[0]?.token || process.env.TELEGRAM_BOT_TOKEN || '8143249764:AAFFU1jS_G9xKk3Jq5F4gZz2bYqX1t_default';
    }

    // Сортировка пар параметров по алфавиту за исключением 'hash'
    const dataCheckArr: string[] = [];
    urlParams.forEach((val, key) => {
      if (key !== 'hash') {
        dataCheckArr.push(`${key}=${val}`);
      }
    });
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    // 1. Вычисляем секретный ключ: HMAC-SHA256("WebAppData", botToken)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // 2. Вычисляем итоговый HMAC-SHA256 от dataCheckString
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Проверяем совпадение хешей безопасным сравнением
    let isMatch = false;
    try {
      isMatch = crypto.timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(hash, 'hex'));
    } catch (e) {
      isMatch = (calculatedHash === hash);
    }

    // Парсим распарсенные данные для удобства
    const parsedData: Record<string, any> = {};
    urlParams.forEach((val, key) => {
      if (key === 'user' || key === 'receiver' || key === 'chat') {
        try {
          parsedData[key] = JSON.parse(val);
        } catch (e) {
          parsedData[key] = val;
        }
      } else {
        parsedData[key] = val;
      }
    });

    return {
      isValid: isMatch,
      parsedData,
      error: isMatch ? undefined : 'HMAC validation failed (hash mismatch)'
    };
  } catch (err: any) {
    return { isValid: false, error: err.message };
  }
}
