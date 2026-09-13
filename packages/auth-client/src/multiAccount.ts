// Multi-account with hybrid storage:
// - Metadata (email, name, avatar) → Supabase table "linked_accounts" (persistent, cross-device)
// - Tokens (access, refresh) → cookie ".actoos.com" (chunked, cross-domain for SSO)
// - Active account ID → localStorage (per browser)

export const MAX_LINKED_ACCOUNTS = 2;

export interface LinkedAccount {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  addedAt: number;
  lastUsedAt: number;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

interface LinkedAccountRow {
  linked_user_id: string;
  linked_email: string;
  linked_first_name: string | null;
  linked_last_name: string | null;
  linked_avatar_url: string | null;
  created_at: string;
  last_used_at: string;
}

const ACTIVE_KEY = 'actoos-active-account-id';
const PENDING_LINK_KEY = 'actoos-pending-link';

// Metadata cookie (without tokens)
const META_COOKIE_BASE = 'actoos-linked-meta';
const META_COUNT_KEY = `${META_COOKIE_BASE}-count`;

// Tokens cookie (chunked dynamically)
const TOKENS_COOKIE_BASE = 'actoos-linked-tokens';
const TOKENS_COUNT_KEY = `${TOKENS_COOKIE_BASE}-count`;

const MAX_ENCODED_CHUNK = 3500;
const EXPIRY_DAYS = 365;

// ==================== Utilities ====================

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

function setCookie(name: string, value: string, days: number): boolean {
  if (typeof document === 'undefined') return false;
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
  return document.cookie.indexOf(`${name}=`) !== -1;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  const domain = getCookieDomain();
  const parts = [`${name}=`, 'expires=Thu, 01 Jan 1970 00:00:00 GMT', 'path=/'];
  if (domain) parts.push(`domain=${domain}`);
  document.cookie = parts.join('; ');
}

// Chunked cookie reader
function readChunkedCookie(base: string, countKey: string): string | null {
  const countStr = getCookie(countKey);
  if (!countStr) return null;
  const count = parseInt(countStr, 10);
  if (!count || count < 0 || count > 100) return null;
  let json = '';
  for (let i = 0; i < count; i++) {
    const chunk = getCookie(`${base}.${i}`);
    if (!chunk) return null;
    json += chunk;
  }
  return json;
}

// Chunked cookie writer (with verification)
function writeChunkedCookie(
  base: string,
  countKey: string,
  json: string
): void {
  const chunks: string[] = [];
  let current = '';
  for (const char of json) {
    const test = current + char;
    if (encodeURIComponent(test).length > MAX_ENCODED_CHUNK) {
      chunks.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) chunks.push(current);
  if (chunks.length === 0) chunks.push('[]');

  // Clear old chunks
  const oldCount = getCookie(countKey);
  const oldNum = oldCount ? parseInt(oldCount, 10) : 0;
  for (let i = 0; i < oldNum + 5; i++) {
    deleteCookie(`${base}.${i}`);
  }
  deleteCookie(countKey);

  // Write new chunks
  chunks.forEach((chunk, i) => {
    const name = `${base}.${i}`;
    const ok = setCookie(name, chunk, EXPIRY_DAYS);
    if (!ok) {
      throw new Error(`[multiAccount] Cookie ${name} not written`);
    }
  });

  const countOk = setCookie(countKey, String(chunks.length), EXPIRY_DAYS);
  if (!countOk) {
    throw new Error('[multiAccount] Cookie count not written');
  }
}

// ==================== Metadata: cookie + Supabase ====================

function loadMetadataFromCookie(): LinkedAccount[] {
  const json = readChunkedCookie(META_COOKIE_BASE, META_COUNT_KEY);
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMetadataToCookie(accounts: LinkedAccount[]): void {
  try {
    writeChunkedCookie(META_COOKIE_BASE, META_COUNT_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('[multiAccount] Failed to save metadata to cookie:', e);
  }
}

function loadMetadataFromLocalStorage(): LinkedAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('actoos-linked-meta-ls');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMetadataToLocalStorage(accounts: LinkedAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('actoos-linked-meta-ls', JSON.stringify(accounts));
  } catch {}
}

// ==================== Tokens: cookie only ====================

function loadTokensFromCookie(): Record<string, SessionTokens> {
  const json = readChunkedCookie(TOKENS_COOKIE_BASE, TOKENS_COUNT_KEY);
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveTokensToCookie(tokensByUser: Record<string, SessionTokens>): void {
  try {
    writeChunkedCookie(TOKENS_COOKIE_BASE, TOKENS_COUNT_KEY, JSON.stringify(tokensByUser));
  } catch (e) {
    console.warn('[multiAccount] Failed to save tokens to cookie:', e);
  }
}

// ==================== Public API: metadata ====================

/**
 * Récupère les comptes liés depuis Supabase (source de vérité unique).
 * Plus de lecture cookie/localStorage : toujours frais, toujours cohérent.
 * Si Supabase échoue, renvoie [] — le caller fera un upsertAccountInList avec le compte courant.
 */
export async function getLinkedAccounts(
  supabase: any,
  currentUserId?: string
): Promise<LinkedAccount[]> {
  // Toujours lire depuis Supabase (source de vérité unique)
  if (supabase && currentUserId) {
    try {
      const { data, error } = await supabase
        .from('linked_accounts')
        .select('*')
        .eq('user_id', currentUserId)
        .order('last_used_at', { ascending: false });

      if (!error && data) {
        return (data as LinkedAccountRow[]).map(row => ({
          userId: row.linked_user_id,
          email: row.linked_email,
          firstName: row.linked_first_name || undefined,
          lastName: row.linked_last_name || undefined,
          avatarUrl: row.linked_avatar_url || undefined,
          addedAt: new Date(row.created_at).getTime(),
          lastUsedAt: new Date(row.last_used_at).getTime(),
        }));
      }
    } catch (e) {
      console.warn('[multiAccount] Supabase fetch failed:', e);
    }
  }
  return [];
}

/**
 * Save linked accounts to cookie + Supabase.
 * Supabase insert is best-effort (doesn't block).
 */
export async function saveLinkedAccounts(
  accounts: LinkedAccount[],
  supabase?: any,
  currentUserId?: string
): Promise<void> {
  // Local always
  saveMetadataToCookie(accounts);
  saveMetadataToLocalStorage(accounts);

  // Supabase: sync (upsert)
  if (supabase && currentUserId) {
    try {
      for (const acc of accounts) {
        await supabase
          .from('linked_accounts')
          .upsert(
            {
              user_id: currentUserId,
              linked_user_id: acc.userId,
              linked_email: acc.email,
              linked_first_name: acc.firstName || null,
              linked_last_name: acc.lastName || null,
              linked_avatar_url: acc.avatarUrl || null,
              last_used_at: new Date(acc.lastUsedAt).toISOString(),
            },
            { onConflict: 'user_id,linked_user_id' }
          );
      }
    } catch (e) {
      console.warn('[multiAccount] Supabase upsert failed:', e);
    }
  }
}

/**
 * Link account A and B (both directions) via Supabase RPC.
 */
export async function linkAccount(
  supabase: any,
  userA: string,
  userB: string
): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.rpc('link_accounts', {
      p_user_a: userA,
      p_user_b: userB,
    });
    if (error) throw error;
  } catch (e) {
    console.warn('[multiAccount] link_accounts RPC failed:', e);
  }
}

/**
 * Unlink account via Supabase delete.
 * Supprime TOUS les liens impliquant linkedUserId (avec n'importe qui)
 * pour éviter les liens croisés résiduels qui font "revenir" le compte.
 */
export async function unlinkAccount(
  supabase: any,
  currentUserId: string,
  linkedUserId: string
): Promise<void> {
  if (!supabase) return;
  try {
    // Supprimer TOUS les liens impliquant linkedUserId (radical)
    await supabase
      .from('linked_accounts')
      .delete()
      .or(`user_id.eq.${linkedUserId},linked_user_id.eq.${linkedUserId}`);
  } catch (e) {
    console.warn('[multiAccount] unlink failed:', e);
  }
}

/**
 * S'assure que l'utilisateur est dans sa propre liste de comptes liés.
 * Appelé à chaque login pour éviter qu'un compte disparaisse.
 */
export async function ensureSelfLink(
  supabase: any,
  account: LinkedAccount
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from('linked_accounts')
      .upsert(
        {
          user_id: account.userId,
          linked_user_id: account.userId,
          linked_email: account.email,
          linked_first_name: account.firstName || null,
          linked_last_name: account.lastName || null,
          linked_avatar_url: account.avatarUrl || null,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,linked_user_id' }
      );
  } catch (e) {
    console.warn('[multiAccount] ensureSelfLink failed:', e);
  }
}

// ==================== Public API: tokens ====================

export function saveTokens(userId: string, tokens: SessionTokens): void {
  const all = loadTokensFromCookie();
  all[userId] = tokens;
  saveTokensToCookie(all);
}

export function getTokens(userId: string): SessionTokens | null {
  const all = loadTokensFromCookie();
  return all[userId] || null;
}

export function removeTokens(userId: string): void {
  const all = loadTokensFromCookie();
  delete all[userId];
  saveTokensToCookie(all);
}

export function clearAllTokens(): void {
  try {
    writeChunkedCookie(TOKENS_COOKIE_BASE, TOKENS_COUNT_KEY, '{}');
  } catch (e) {
    console.warn('[multiAccount] clear tokens failed:', e);
  }
}

// ==================== Public API: active account ====================

export function getActiveAccountId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveAccountId(userId: string | null): void {
  if (typeof window === 'undefined') return;
  if (userId) localStorage.setItem(ACTIVE_KEY, userId);
  else localStorage.removeItem(ACTIVE_KEY);
}

// ==================== Public API: pending link ====================

export function setPendingLink(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PENDING_LINK_KEY, userId);
}

export function getPendingLink(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PENDING_LINK_KEY);
}

export function clearPendingLink(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PENDING_LINK_KEY);
}

// ==================== Public API: helpers ====================

export function buildLinkedAccount(user: any, session: any): LinkedAccount {
  const meta = user.user_metadata || {};
  return {
    userId: user.id,
    email: user.email || '',
    firstName: meta.first_name,
    lastName: meta.last_name,
    avatarUrl: meta.avatar_url,
    addedAt: Date.now(),
    lastUsedAt: Date.now(),
  };
}

export function upsertAccountInList(
  accounts: LinkedAccount[],
  account: LinkedAccount
): LinkedAccount[] {
  const idx = accounts.findIndex(a => a.userId === account.userId);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...account };
  } else {
    accounts.push(account);
  }
  return accounts;
}

export function sortAccountsByUsage(accounts: LinkedAccount[]): LinkedAccount[] {
  return [...accounts].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
}

export function clearAll(): void {
  saveMetadataToCookie([]);
  saveMetadataToLocalStorage([]);
  clearAllTokens();
  setActiveAccountId(null);
  clearPendingLink();
}

/**
 * Lit directement depuis Supabase, sans passer par le cookie.
 * Utilisé après un linkAccount pour forcer la lecture à jour.
 */
export async function getLinkedAccountsFromSupabase(
  supabase: any,
  userId: string
): Promise<LinkedAccount[]> {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('linked_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false });
    if (error || !data) return [];
    return (data as LinkedAccountRow[]).map(row => ({
      userId: row.linked_user_id,
      email: row.linked_email,
      firstName: row.linked_first_name || undefined,
      lastName: row.linked_last_name || undefined,
      avatarUrl: row.linked_avatar_url || undefined,
      addedAt: new Date(row.created_at).getTime(),
      lastUsedAt: new Date(row.last_used_at).getTime(),
    }));
  } catch (e) {
    console.warn('[multiAccount] getLinkedAccountsFromSupabase failed:', e);
    return [];
  }
}