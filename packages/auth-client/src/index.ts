export { createAuthClient } from './client';
export type { AuthClient } from './client';

export { createAuthCore } from './core';
export type { AuthCore } from './core';

export { createApiAuth } from './apiAuth';
export type { ApiAuth } from './apiAuth';

export { buildBaseProfile, enrichProfile } from './enrich';
export { isCandidate, isCompany, isAdmin } from './roles';

export type {
  AuthUser,
  Profile,
  UserRole,
  AuthClientConfig,
  SignUpParams,
  SignInParams,
} from './types';