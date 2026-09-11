export type UserRole = 'candidate' | 'company' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    role?: UserRole;
    first_name?: string;
    last_name?: string;
    language?: string;
  };
}

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  candidate_profile: any | null;
  subscription_plan: 'free' | 'pro' | 'business' | 'enterprise';
  billing_cycle?: 'monthly' | 'annual' | null;
  hasCompanies: boolean;
  is_active: boolean;
  is_banned: boolean;
  language?: string;
  preferences?: Record<string, any>;
  [key: string]: any;
}

export interface AuthClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appName: string;
  apiUrl?: string;
}

export interface SignUpParams {
  email: string;
  password: string;
  role?: UserRole;
  firstName: string;
  lastName: string;
  language?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}