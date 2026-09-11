import type { AuthUser, Profile, UserRole } from './types';
import type { AuthClient } from './client';

export function buildBaseProfile(authUser: AuthUser | null): Profile | null {
  if (!authUser) return null;
  return {
    id: authUser.id,
    email: authUser.email,
    role: (authUser.user_metadata?.role as UserRole) || 'candidate',
    first_name: authUser.user_metadata?.first_name || '',
    last_name: authUser.user_metadata?.last_name || '',
    avatar_url: null,
    candidate_profile: null,
    subscription_plan: 'free',
    hasCompanies: false,
    is_active: true,
    is_banned: false,
    language: authUser.user_metadata?.language || 'fr',
  };
}

export async function enrichProfile(
  client: AuthClient,
  authUser: AuthUser | null,
  currentProfile: Profile | null
): Promise<Profile | null> {
  if (!authUser || !currentProfile) return currentProfile;

  const { supabase } = client;

  try {
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    const roleFromDb = userData?.role as UserRole | undefined;

    if (userData && !userData.language) {
      const browserLang =
        typeof navigator !== 'undefined'
          ? navigator.language?.split('-')[0] || 'fr'
          : 'fr';
      await supabase
        .from('users')
        .update({ language: browserLang })
        .eq('id', authUser.id);
      userData.language = browserLang;
    }

    if (roleFromDb && roleFromDb !== authUser.user_metadata?.role) {
      await supabase.auth.updateUser({ data: { role: roleFromDb } });
    }

    const { data: candidateData } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .maybeSingle();

    let subscriptionPlan: Profile['subscription_plan'] = 'free';
    let billingCycle: 'monthly' | 'annual' | null = null;

    const { data: companyData } = await supabase
      .from('companies')
      .select('subscription_plan, billing_cycle')
      .eq('owner_id', authUser.id)
      .maybeSingle();

    if (companyData) {
      subscriptionPlan = companyData.subscription_plan || 'free';
      billingCycle = companyData.billing_cycle || null;
    }

    const { count: ownedCount } = await supabase
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', authUser.id);

    const { count: memberCount } = await supabase
      .from('company_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authUser.id);

    const hasCompanies = (ownedCount || 0) + (memberCount || 0) > 0;

    return {
      ...currentProfile,
      ...(userData || {}),
      role: roleFromDb || currentProfile.role,
      candidate_profile: candidateData || null,
      subscription_plan: subscriptionPlan,
      billing_cycle: billingCycle,
      hasCompanies,
    };
  } catch (err) {
    console.warn('[auth-client] enrichProfile failed:', err);
    return currentProfile;
  }
}