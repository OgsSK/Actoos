/**
 * Toutes les query keys de l'app au même endroit.
 * Permet l'invalidation ciblée et évite les typos.
 */
export const queryKeys = {
  teachers: {
    all: ['teachers'] as const,
    list: (filters?: object) => ['teachers', 'list', filters ?? {}] as const,
    featured: (limit = 6) => ['teachers', 'featured', limit] as const,
    detail: (id: string) => ['teachers', 'detail', id] as const,
    reviews: (id: string) => ['teachers', 'reviews', id] as const,
    saved: (parentId: string) => ['teachers', 'saved', parentId] as const,
  },
  parents: {
    all: ['parents'] as const,
    publicProfile: (id: string) => ['parents', 'public', id] as const,
  },
  teacherDashboard: (userId: string) => ['dashboard', 'teacher', userId] as const,
  parentDashboard: (userId: string) => ['dashboard', 'parent', userId] as const,
  requests: {
    teacher: (teacherId: string) => ['requests', 'teacher', teacherId] as const,
    teacherDetail: (id: string) => ['requests', 'teacher', 'detail', id] as const,
    parent: (parentId: string) => ['requests', 'parent', parentId] as const,
    parentDetail: (id: string) => ['requests', 'parent', 'detail', id] as const,
  },
  admin: {
    stats: ['admin', 'stats'] as const,
    teachers: (filters?: object) => ['admin', 'teachers', filters ?? {}] as const,
    teacherDetail: (id: string) => ['admin', 'teachers', 'detail', id] as const,
    parents: (filters?: object) => ['admin', 'parents', filters ?? {}] as const,
    reports: (status?: string) => ['admin', 'reports', status ?? 'all'] as const,
  },
  referentials: {
    cities: ['ref', 'cities'] as const,
    subjects: ['ref', 'subjects'] as const,
    levels: ['ref', 'levels'] as const,
  },
} as const;