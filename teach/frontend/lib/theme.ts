// ============================================================
// KALANDEN — Palette officielle
// ============================================================
// Règle : vert = accent unique, slate = base neutre
// ============================================================

export const THEME = {
  // Accent (actions, liens, badges positifs)
  accent: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-700',
    bgLight: 'bg-emerald-50',
    border: 'border-emerald-100',
    ring: 'focus:ring-emerald-600',
  },
  // Sombre (hero, CTA principaux, textes forts)
  dark: {
    bg: 'bg-slate-900',
    bgHover: 'hover:bg-slate-800',
    text: 'text-slate-900',
  },
  // Neutres
  neutral: {
    pageBg: 'bg-slate-50',
    cardBg: 'bg-white',
    border: 'border-slate-200',
    text: 'text-slate-700',
    textMuted: 'text-slate-500',
    textSoft: 'text-slate-400',
  },
} as const;