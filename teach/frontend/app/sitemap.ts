import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kalanden.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ===== Pages statiques =====
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/teachers`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/parents`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // ===== Pages dynamiques : profils enseignants vérifiés =====
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: teachers, error } = await supabase
      .from('teacher_profiles')
      .select('id, updated_at')
      .eq('verification_status', 'verified')
      .eq('is_available', true)
      .not('headline', 'is', null);

    if (error) {
      console.warn('[sitemap] Supabase error:', error.message);
      return staticPages;
    }

    const teacherPages: MetadataRoute.Sitemap = (teachers || []).map(t => ({
      url: `${BASE_URL}/teachers/${t.id}`,
      lastModified: t.updated_at ? new Date(t.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [...staticPages, ...teacherPages];
  } catch (err) {
    console.error('[sitemap] error fetching teachers:', err);
    return staticPages;
  }
}