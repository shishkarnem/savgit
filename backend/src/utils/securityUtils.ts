/**
 * Security utilities for token masking, sensitive data redaction,
 * and access control across BD ProTalk APIs and administrative endpoints.
 */

export const RESTRICTED_SYSTEM_TABLES = new Set([
  'telegram_bot_config',
  'protalk_config',
  'system_secrets',
  'admin_users',
  'telegram_bots',
  'protalk_bots',
  'sav_crm_admins'
]);

// Sensitive keys that must always be masked
const SENSITIVE_KEY_PATTERNS = [
  'token',
  'secret',
  'password',
  'api_key',
  'auth',
  'private_key',
  'access_token',
  'refresh_token',
  'bot_token',
  'api_token'
];

/**
 * Masks a string secret completely so zero characters are leaked to the browser
 */
export function maskSecretString(val: string): string {
  if (!val || typeof val !== 'string') return val;
  return '••••••••';
}

/**
 * Redacts any known token patterns inside free text or JSON strings
 */
export function redactTokensInText(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    // ProTalk bot token format (e.g. BIUTUa499JhVgwmcsY6tRLy4WExXuSX6)
    .replace(/(BIUTU[a-zA-Z0-9_-]{8,})/g, '••••••••')
    // Telegram Bot token format (e.g. 123456789:ABCDefgh-IJKlmno...)
    .replace(/(\b\d{8,10}:[a-zA-Z0-9_-]{25,}\b)/g, '••••:••••••••')
    // Generic Bearer tokens
    .replace(/(Bearer\s+)[a-zA-Z0-9_.-]{12,}/gi, '$1••••••••');
}

/**
 * Recursively masks sensitive fields in an object
 */
export function maskSensitiveObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveObject(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEY_PATTERNS.some(pat => lowerKey.includes(pat));

    if (isSensitive) {
      if (typeof value === 'string' && value.length > 0) {
        sanitized[key] = maskSecretString(value);
      } else {
        sanitized[key] = value;
      }
    } else if (typeof value === 'string') {
      // Check if it's a JSON string containing tokens or text with tokens
      if (value.includes('BIUTU') || value.includes('token') || value.includes('secret')) {
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed === 'object' && parsed !== null) {
            sanitized[key] = JSON.stringify(maskSensitiveObject(parsed));
            continue;
          }
        } catch {
          // not JSON, apply text redaction
        }
        sanitized[key] = redactTokensInText(value);
      } else {
        sanitized[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = maskSensitiveObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitizes a list of database rows
 */
export function sanitizeRows(rows: any[]): any[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(row => maskSensitiveObject(row));
}
