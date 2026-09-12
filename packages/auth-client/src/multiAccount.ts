// Multi-comptes avec stockage en cookie partagé (.actoos.com)
// Utilise le chunking pour rester sous la limite de ~4 KB par cookie.
// Fallback localStorage en local (dev).

export interface LinkedAccount {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  addedAt: number;
  lastUsedAt: number;
}

const COOKIE_BASE = 'actoos-linked-accounts';
const COOKIE_COUNT = `${COOKIE_BASE}-count`;
const ACTIVE_KEY = 'actoos-active-account-id';
const LS_FALLBACK = 'actoos-linked-accounts-ls';
const CHUNK_SIZE = 3500;
const EXPIRY_DAYS = 30;

function isProd(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return !host.includes('localhost') && !host.includes('127.0.0.1');
}

function getCookieDomain(): string | undefined {
  return isProd() ? '.actoos.com' : undefined;
}

function canUseCookie(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    document.cookie = '__test__=1; path=/';
    const ok = document.cookie.indexOf('__test__=') !== -1;
    document.cookie = '__test__=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    return ok;
  } catch {
    return false;
  }
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  const domain = getCookieDomain();
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `expires=${expires}`,
    'path=/',
    'SameSite=Lax',
  ];
  if (domain) parts.push(`domain=${domain}`);
  if (isProd()) parts.push('Secure');
  document.cookie = parts.join('; ');
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  const domain = getCookieDomain();
  const parts = [`${name}=`, 'expires=Thu, 01 Jan 1970 00:00:00 GMT', 'path=/'];
  if (domain) parts.push(`domain=${domain}`);
  document.cookie = parts.join('; ');
}

function clearAllChunks(): void {
  const countStr = getCookie(COOKIE_COUNT);
  const count = countStr ? parseInt(countStr, 10) : 0;
  for (let i = 0; i < count + 5; i++) {
    deleteCookie(`${COOKIE_BASE}.${i}`);
  }
  deleteCookie(COOKIE_COUNT);
}

function loadFromCookie(): LinkedAccount[] {
  const countStr = getCookie(COOKIE_COUNT);
  if (!countStr) return [];
  const count = parseInt(countStr, 10);
  if (!count || count < 0 || count > 100) return [];

  let json = '';
  for (let i = 0; i < count; i++) {
    const chunk = getCookie(`${COOKIE_BASE}.${i}`);
    if (!chunk) return []; // chunk manquant = corrompu
    json += chunk;
  }
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToCookie(accounts: LinkedAccount[]): void {
  const json = JSON.stringify(accounts);
  const chunks: string[] = [];
  for (let i = 0; i < json.length; i += CHUNK_SIZE) {
    chunks.push(json.substring(i, i + CHUNK_SIZE));
  }

  clearAllChunks();

  chunks.forEach((chunk, i) => {
    setCookie(`${COOKIE_BASE}.${i}`, chunk, EXPIRY_DAYS);
  });
  setCookie(COOKIE_COUNT, String(chunks.length), EXPIRY_DAYS);
}

function loadFromLocalStorage(): LinkedAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_FALLBACK);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(accounts: LinkedAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_FALLBACK, JSON.stringify(accounts));
  } catch {}
}

// ============ API publique ============

export function getLinkedAccounts(): LinkedAccount[] {
  if (canUseCookie()) {
    const fromCookie = loadFromCookie();
    if (fromCookie.length > 0) return fromCookie;
  }
  return loadFromLocalStorage();
}

function saveLinkedAccounts(accounts: LinkedAccount[]): void {
  if (canUseCookie()) {
    try {
      saveToCookie(accounts);
    } catch (e) {
      console.warn('[multiAccount] cookie save failed, falling back to localStorage:', e);
      saveToLocalStorage(accounts);
    }
  } else {
    saveToLocalStorage(accounts);
  }
}

export function getActiveAccountId(): string | null {
  if (typeof window === 'undefined') return null;
  // On lit depuis localStorage (par domaine) car le compte actif est unique
  // par navigateur, pas besoin de le partager
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveAccountId(userId: string | null): void {
  if (typeof window === 'undefined') return;
  if (userId) localStorage.setItem(ACTIVE_KEY, userId);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function buildLinkedAccount(user: any, session: any): LinkedAccount {
  const meta = user.user_metadata || {};
  return {
    userId: user.id,
    email: user.email || '',
    firstName: meta.first_name,
    lastName: meta.last_name,
    avatarUrl: meta.avatar_url,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    addedAt: Date.now(),
    lastUsedAt: Date.now(),
  };
}

export function upsertLinkedAccount(account: LinkedAccount): LinkedAccount[] {
  const accounts = getLinkedAccounts();
  const idx = accounts.findIndex(a => a.userId === account.userId);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...account };
  } else {
    accounts.push(account);
  }
  saveLinkedAccounts(accounts);
  return accounts;
}

export function removeLinkedAccount(userId: string): LinkedAccount[] {
  const accounts = getLinkedAccounts().filter(a => a.userId !== userId);
  saveLinkedAccounts(accounts);
  if (getActiveAccountId() === userId) setActiveAccountId(null);
  return accounts;
}

export function clearAllLinkedAccounts(): void {
  if (typeof window === 'undefined') return;
  if (canUseCookie()) clearAllChunks();
  localStorage.removeItem(LS_FALLBACK);
  localStorage.removeItem(ACTIVE_KEY);
}

export function sortAccountsByUsage(accounts: LinkedAccount[]): LinkedAccount[] {
  return [...accounts].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
}