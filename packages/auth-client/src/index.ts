export { createAuthClient } from './client.js';
export type { AuthClient } from './client.js';

export { createAuthCore } from './core.js';
export type { AuthCore } from './core.js';

export { createApiAuth } from './apiAuth.js';
export type { ApiAuth } from './apiAuth.js';

export { buildBaseProfile, enrichProfile } from './enrich.js';
export { isCandidate, isCompany, isAdmin } from './roles.js';

export type {
  AuthUser,
  Profile,
  UserRole,
  AuthClientConfig,
  SignUpParams,
  SignInParams,
} from './types.js';