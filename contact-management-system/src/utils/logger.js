/**
 * Diagnostic logger that protects against logging credentials, passwords, or tokens.
 */

const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'authorization', 'secret', 'jwt'];

const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeData);

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeData(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

export const logger = {
  info: (message, meta) => {
    if (process.env.NODE_ENV !== 'test') {
      const cleanMeta = meta ? JSON.stringify(sanitizeData(meta)) : '';
      console.log(`[INFO] ${new Date().toISOString()} - ${message} ${cleanMeta}`.trim());
    }
  },
  warn: (message, meta) => {
    const cleanMeta = meta ? JSON.stringify(sanitizeData(meta)) : '';
    console.warn(`[WARN] ${new Date().toISOString()} - ${message} ${cleanMeta}`.trim());
  },
  error: (message, error) => {
    const errMessage = error instanceof Error ? error.message : String(error || '');
    console.error(`[ERROR] ${new Date().toISOString()} - ${message} : ${errMessage}`);
  }
};

export default logger;
