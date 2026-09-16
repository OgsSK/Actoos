'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';

// Admins autorisés par email (fallback rapide en attendant le fix JWT)
const ADMIN_EMAILS = [
  'contact@actoos.com',
];

export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // 1) Check par email (rapide, ne nécessite pas de JWT valide)
    if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      console.log('[useIsAdmin] Admin par email:', user.email);
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    // 2) Fallback : check en base (nécessite un JWT valide)
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn('[useIsAdmin] query error:', error.message);
          setIsAdmin(false);
        } else {
          setIsAdmin(Boolean(data));
        }
      } catch (err) {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, user?.email, authLoading]);

  return { isAdmin, loading };
}