'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}) {
  const router = useRouter();

  // Style commun pour le bouton/lien "retour"
  const backClasses = 'group inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors';

  return (
    <div className="mb-6 sm:mb-8">
      {/* Ligne retour + action */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {backHref ? (
          // ✅ Lien avec prefetch → navigation instantanée
          <Link href={backHref} prefetch className={backClasses}>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>{backLabel || 'Retour'}</span>
          </Link>
        ) : (
          // Fallback : router.back() quand on n'a pas d'URL fixe
          <button
            onClick={() => router.back()}
            className={backClasses}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>{backLabel || 'Retour'}</span>
          </button>
        )}
        {action}
      </div>

      {/* Titre + sous-titre */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}