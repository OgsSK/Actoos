/**
 * Supabase peut retourner une relation jointe en objet OU en tableau
 * selon la détection. Ce helper normalise : on prend toujours le premier élément.
 */
export function first<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/**
 * Normalise une relation en tableau (utile pour les collections).
 */
export function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}