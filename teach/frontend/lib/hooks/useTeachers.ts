'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

// ════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════

export interface RefCity {
  id: string;
  name: string;
}

export interface RefSubject {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string;
}

export interface RefLevel {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string;
}

export interface FeaturedTeacher {
  id: string;
  headline: string | null;
  hourly_rate: number | null;
  rate_period: string | null;
  teaching_mode: string | null;
  profile_photo_url: string | null;
  cover_url: string | null;
  experience_years: number | null;
  rating_avg: number;
  rating_count: number;
  user: { first_name: string | null; last_name: string | null } | null;
  city: { id: string; name: string } | null;
  subjects: { id: string; name_fr: string; name_en: string }[];
}

export interface TeacherListItem extends Omit<FeaturedTeacher, 'subjects'> {
  bio: string | null;
  is_verified: boolean | null;
  city_id: string | null;
  saved_count: number;
  subjects: { id: string; name_fr: string; name_en: string }[];
  levels: { id: string; name_fr: string; name_en: string }[];
}

export type UseTeacherListParams = {
  search?: string;
  subject?: string;
  level?: string;
  city?: string;
  mode?: string;
  rating?: string;
};

// ════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════

function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

// ════════════════════════════════════════════
// REFERENTIELS
// ════════════════════════════════════════════

export function useCities() {
  return useQuery({
    queryKey: queryKeys.referentials.cities,
    queryFn: async (): Promise<RefCity[]> => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useSubjects() {
  return useQuery({
    queryKey: queryKeys.referentials.subjects,
    queryFn: async (): Promise<RefSubject[]> => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, slug, name_fr, name_en')
        .order('order_index');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useLevels() {
  return useQuery({
    queryKey: queryKeys.referentials.levels,
    queryFn: async (): Promise<RefLevel[]> => {
      const { data, error } = await supabase
        .from('levels')
        .select('id, slug, name_fr, name_en')
        .order('order_index');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 60 * 1000,
  });
}

// ════════════════════════════════════════════
// FEATURED TEACHERS (home)
// ════════════════════════════════════════════

export function useFeaturedTeachers(limit = 6) {
  return useQuery({
    queryKey: queryKeys.teachers.featured(limit),
    queryFn: async (): Promise<FeaturedTeacher[]> => {
      const { data: profiles, error } = await supabase
        .from('teacher_profiles')
        .select(`
          id, headline, hourly_rate, rate_period, teaching_mode,
          profile_photo_url, cover_url, experience_years, city_id, created_at,
          rating_avg, rating_count
        `)
        .eq('is_available', true)
        .eq('verification_status', 'verified')
        .not('headline', 'is', null)
        .order('rating_avg', { ascending: false })
        .order('rating_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      const ids = profiles.map(p => p.id);
      const cityIds = profiles.map(p => p.city_id).filter(Boolean);

      const [usersRes, citiesRes, subjRes] = await Promise.all([
        supabase.from('users').select('id, first_name, last_name').in('id', ids),
        cityIds.length
          ? supabase.from('cities').select('id, name').in('id', cityIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('teacher_subjects')
          .select('teacher_id, subjects(id, name_fr, name_en)')
          .in('teacher_id', ids),
      ]);

      const users = usersRes.data ?? [];
      const cities = citiesRes.data ?? [];
      const subs = subjRes.data ?? [];

      return profiles.map(p => ({
        id: p.id,
        headline: p.headline,
        hourly_rate: p.hourly_rate,
        rate_period: p.rate_period,
        teaching_mode: p.teaching_mode,
        profile_photo_url: p.profile_photo_url,
        cover_url: p.cover_url,
        experience_years: p.experience_years,
        rating_avg: Number(p.rating_avg ?? 0),
        rating_count: Number(p.rating_count ?? 0),
        user: users.find((u: any) => u.id === p.id) ?? null,
        city: p.city_id ? cities.find((c: any) => c.id === p.city_id) ?? null : null,
        subjects: subs
          .filter((t: any) => t.teacher_id === p.id)
          .flatMap((t: any) => asArray(t.subjects))
          .filter(Boolean),
      }));
    },
    staleTime: 3 * 60 * 1000,
  });
}

// ════════════════════════════════════════════
// TEACHER LIST (/teachers)
// ════════════════════════════════════════════

export function useTeacherList() {
  return useQuery({
    queryKey: queryKeys.teachers.list(),
    queryFn: async (): Promise<TeacherListItem[]> => {
      const { data: profiles, error } = await supabase
        .from('teacher_profiles')
        .select(`
          id, headline, bio, hourly_rate, rate_period, teaching_mode,
          profile_photo_url, cover_url, is_verified, experience_years,
          city_id, rating_avg, rating_count
        `)
        .eq('is_available', true)
        .eq('verification_status', 'verified')
        .not('headline', 'is', null)
        .order('rating_avg', { ascending: false })
        .order('rating_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      const ids = profiles.map(p => p.id);
      const cityIds = profiles.map(p => p.city_id).filter(Boolean);

      const [usersRes, citiesRes, subsRes, lvlsRes, savesRes] = await Promise.all([
        supabase.from('users').select('id, first_name, last_name').in('id', ids),
        cityIds.length
          ? supabase.from('cities').select('id, name').in('id', cityIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('teacher_subjects')
          .select('teacher_id, subjects(id, name_fr, name_en)')
          .in('teacher_id', ids),
        supabase
          .from('teacher_levels')
          .select('teacher_id, levels(id, name_fr, name_en)')
          .in('teacher_id', ids),
        supabase.from('saved_teachers').select('teacher_id').in('teacher_id', ids),
      ]);

      const users = usersRes.data ?? [];
      const cities = citiesRes.data ?? [];
      const subs = subsRes.data ?? [];
      const lvls = lvlsRes.data ?? [];
      const saves = savesRes.data ?? [];

      const savesByTeacher = new Map<string, number>();
      saves.forEach((s: any) =>
        savesByTeacher.set(s.teacher_id, (savesByTeacher.get(s.teacher_id) || 0) + 1)
      );

      return profiles.map(p => ({
        id: p.id,
        headline: p.headline,
        bio: p.bio,
        hourly_rate: p.hourly_rate,
        rate_period: p.rate_period,
        teaching_mode: p.teaching_mode,
        profile_photo_url: p.profile_photo_url,
        cover_url: p.cover_url,
        is_verified: p.is_verified,
        experience_years: p.experience_years,
        city_id: p.city_id,
        rating_avg: Number(p.rating_avg ?? 0),
        rating_count: Number(p.rating_count ?? 0),
        saved_count: savesByTeacher.get(p.id) || 0,
        user: users.find((u: any) => u.id === p.id) ?? null,
        city: p.city_id ? cities.find((c: any) => c.id === p.city_id) ?? null : null,
        subjects: subs
          .filter((t: any) => t.teacher_id === p.id)
          .flatMap((t: any) => asArray(t.subjects))
          .filter(Boolean),
        levels: lvls
          .filter((t: any) => t.teacher_id === p.id)
          .flatMap((t: any) => asArray(t.levels))
          .filter(Boolean),
      }));
    },
    staleTime: 3 * 60 * 1000,
  });
}

// ════════════════════════════════════════════
// TEACHER DETAIL
// ════════════════════════════════════════════

export function useTeacherDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.teachers.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) throw new Error('Missing id');
      const { data, error } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 3 * 60 * 1000,
  });
}

// ════════════════════════════════════════════
// TEACHER REVIEWS
// ════════════════════════════════════════════

export function useTeacherReviews(teacherId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.teachers.reviews(teacherId ?? ''),
    enabled: Boolean(teacherId),
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from('teacher_ratings')
        .select(`
          id, parent_id, rating, comment, created_at, updated_at,
          teacher_reply, teacher_reply_at,
          users:parent_id(first_name, last_name)
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        parent_first_name: r.users?.first_name ?? null,
        parent_last_name: r.users?.last_name ?? null,
      }));
    },
    staleTime: 60 * 1000,
  });
}

// ════════════════════════════════════════════
// SAVED TEACHERS
// ════════════════════════════════════════════

export function useSavedTeachers(parentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.teachers.saved(parentId ?? ''),
    enabled: Boolean(parentId),
    queryFn: async (): Promise<string[]> => {
      if (!parentId) return [];
      const { data, error } = await supabase
        .from('saved_teachers')
        .select('teacher_id')
        .eq('parent_id', parentId);
      if (error) throw error;
      return (data ?? []).map(s => s.teacher_id);
    },
  });
}

// ════════════════════════════════════════════
// TOGGLE SAVE (optimistic)
// ════════════════════════════════════════════

export function useToggleSave() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parentId,
      teacherId,
      isSaved,
    }: {
      parentId: string;
      teacherId: string;
      isSaved: boolean;
    }) => {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_teachers')
          .delete()
          .eq('parent_id', parentId)
          .eq('teacher_id', teacherId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_teachers')
          .insert({ parent_id: parentId, teacher_id: teacherId });
        if (error) throw error;
      }
    },
    onMutate: async ({ parentId, teacherId, isSaved }) => {
      await qc.cancelQueries({ queryKey: queryKeys.teachers.saved(parentId) });
      const prev = qc.getQueryData<string[]>(queryKeys.teachers.saved(parentId));
      qc.setQueryData<string[]>(queryKeys.teachers.saved(parentId), (old = []) =>
        isSaved ? old.filter(id => id !== teacherId) : [...old, teacherId]
      );
      return { prev };
    },
    onError: (_err, vars, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKeys.teachers.saved(vars.parentId), context.prev);
      }
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.teachers.saved(vars.parentId) });
      qc.invalidateQueries({ queryKey: queryKeys.teachers.all });
    },
  });
}