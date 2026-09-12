// Multi-comptes : gestion de plusieurs comptes connectés simultanément
// Stockage : localStorage (tokens + métadonnées)
// Sécurité : les tokens sont déjà exposés côté JS (cookies Supabase non httpOnly)

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

const STORAGE_KEY = 'actoos-linked-accounts';
const ACTIVE_KEY = 'actoos-active-account-id';

export function getLinkedAccounts(): LinkedAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLinkedAccounts(accounts: LinkedAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('[multiAccount] save failed:', e);
  }
}

export function getActiveAccountId(): string | null {
  if (typeof window === 'undefined') return null;
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
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACTIVE_KEY);
}

export function sortAccountsByUsage(accounts: LinkedAccount[]): LinkedAccount[] {
  return [...accounts].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
}