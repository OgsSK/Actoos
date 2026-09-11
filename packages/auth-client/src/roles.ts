import type { Profile } from './types';

export function isCandidate(profile: Profile | null): boolean {
  return profile?.role === 'candidate' && !profile?.hasCompanies;
}

export function isCompany(profile: Profile | null): boolean {
  return profile?.role === 'company' || !!profile?.hasCompanies;
}

export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === 'admin';
}