import { APP_CONFIG } from './appConfig';

type AuthDebugLevel = 'info' | 'warn' | 'error';

function shouldLog() {
  return APP_CONFIG.AUTH_DEBUG;
}

export function authDebug(level: AuthDebugLevel, event: string, details?: Record<string, unknown>) {
  if (!shouldLog()) return;
  const message = `[auth:${event}]`;
  if (level === 'error') {
    console.error(message, details || {});
    return;
  }
  if (level === 'warn') {
    console.warn(message, details || {});
    return;
  }
  console.info(message, details || {});
}
