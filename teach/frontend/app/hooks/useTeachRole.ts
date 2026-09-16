'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface TeacherProfile {
  id: string;
  headline?: string | null;
  bio?: string | null;
  hourly_rate?: number | null;
  profile_photo_url?: string | null;
  verification_status?: string | null;
  rejected_reason?: string | null;
  verified_at?: string | null;
  [key: string]: any;
}

interface ParentProfile {
  id: string;
  phone?: string | null;
  bio?: string | null;
  profile_photo_url?: string | null;
  [key: string]: any;
}

export function useTeachRole() {
  const { user, loading: authLoading } = useAuth();
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [parentProfile, setParentProfile] = useState<ParentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setTeacherProfile(null);
      setParentProfile(null);
      setLoading(false);
      return;
    }

    try {
      const [tRes, pRes] = await Promise.all([
        supabase.from('teacher_profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('parent_profiles').select('*').eq('id', user.id).maybeSingle(),
      ]);

      setTeacherProfile(tRes.data || null);
      setParentProfile(pRes.data || null);
    } catch (err) {
      console.error('[useTeachRole]', err);
      setTeacherProfile(null);
      setParentProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  const isTeacher = !!teacherProfile;
  const isParent = !!parentProfile;
  const hasProfile = isTeacher || isParent;

  // ✨ Nouveaux champs dérivés
  const teacherStatus = teacherProfile?.verification_status || null;
  const isTeacherRejected = teacherStatus === 'rejected';
  const isTeacherVerified = teacherStatus === 'verified';
  const isTeacherPending = teacherStatus === 'pending';

  return {
    teacherProfile,
    parentProfile,
    isTeacher,
    isParent,
    hasProfile,
    // ✨ Nouveaux retours
    teacherStatus,
    isTeacherRejected,
    isTeacherVerified,
    isTeacherPending,
    loading: authLoading || loading,
    refresh: load,
  };
}