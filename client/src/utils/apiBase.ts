import { APP_CONFIG } from './appConfig';

function stripApiSuffix(value: string) {
  return value.replace(/\/api(?:\/v1)?\/?$/i, '');
}

function collapseSlashes(value: string) {
  return value.replace(/\/{2,}/g, '/');
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function resolveApiV1Base() {
  return APP_CONFIG.API_URL;
}

export function normalizeApiPath(path: string) {
  const raw = String(path || '').trim();
  if (!raw || isAbsoluteUrl(raw)) return raw;
  const prefixed = raw.startsWith('/') ? raw : `/${raw}`;
  const withoutApiPrefix = prefixed.replace(/^\/api(?:\/v1)?/i, '');
  const normalized = collapseSlashes(withoutApiPrefix || '/');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function resolveApiRoot() {
  return stripApiSuffix(resolveApiV1Base());
}

export function resolveSsoMeUrl() {
  return `${resolveApiRoot()}/api/auth/sso/me`;
}

export function resolveBrowserHostname() {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
}

export function resolveGtOneBase() {
  return APP_CONFIG.SSO_LOGIN_URL.replace(/\/login$/, '');
}

export function resolveCurrentAppDashboardUrl() {
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/dashboard`;
  }
  return `http://${resolveBrowserHostname()}:5173/dashboard`;
}
