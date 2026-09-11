import type { AuthClient } from './client';

async function fetchWithRetry(
  url: string,
  opts: RequestInit,
  retries = 2,
  timeoutMs = 45000
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (e: any) {
      clearTimeout(timer);
      console.warn(`[apiAuth] Attempt ${i + 1} failed:`, e.message);
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw new Error('Unreachable');
}

export function createApiAuth(client: AuthClient, baseUrl: string) {
  const { supabase } = client;

  const apiFetchAuth = async (
    path: string,
    options: RequestInit = {}
  ): Promise<any> => {
    let {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      const { data: refreshed, error: refreshError } =
        await supabase.auth.refreshSession();
      if (refreshError || !refreshed.session) {
        throw new Error('Session expired, please sign in again');
      }
      session = refreshed.session;
    }

    const expiresAt = (session.expires_at || 0) * 1000;
    if (Date.now() >= expiresAt - 60_000) {
      const { data: refreshed, error: refreshError } =
        await supabase.auth.refreshSession();
      if (refreshError || !refreshed.session) {
        throw new Error('Session expired, please sign in again');
      }
      session = refreshed.session;
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {}),
    };

    const res = await fetchWithRetry(`${baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let payload: any = {};
      try {
        payload = await res.json();
      } catch {
        /* non-JSON */
      }
      throw new Error(
        payload.message || payload.error || `Error ${res.status}`
      );
    }

    if (res.status === 204) return null;
    return res.json();
  };

  return { apiFetchAuth };
}

export type ApiAuth = ReturnType<typeof createApiAuth>;