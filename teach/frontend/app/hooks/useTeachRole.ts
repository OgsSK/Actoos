'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface TeachRoleInfo {
  isTeacher: boolean;
  isParent: boolean;
  loading: boolean;
  teacherProfile: any | null;
  parentProfile: any | null;
}

export function useTeachRole(): TeachRoleInfo {
  const { user, loading: authLoading } = useAuth();
  const [isTeacher, setIsTeacher] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<any | null>(null);
  const [parentProfile, setParentProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (authLoading) return;
      if (!user?.id) {
        if (!cancelled) {
          setIsTeacher(false);
          setIsParent(false);
          setTeacherProfile(null);
          setParentProfile(null);
          setLoading(false);
        }
        return;
      }

      try {
        const [teacherRes, parentRes] = await Promise.all([
          supabase.from('teacher_profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase.from('parent_profiles').select('*').eq('id', user.id).maybeSingle(),
        ]);

        if (cancelled) return;

        setTeacherProfile(teacherRes.data);
        setParentProfile(parentRes.data);
        setIsTeacher(!!teacherRes.data);
        setIsParent(!!parentRes.data);
      } catch (err) {
        console.error('[useTeachRole]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  return { isTeacher, isParent, loading, teacherProfile, parentProfile };
}