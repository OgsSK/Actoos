'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, GraduationCap, Users, Flag } from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';

export default function AdminNav() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const isFr = language === 'fr';

    const links = [
    { href: '/admin',           icon: LayoutDashboard, labelFr: 'Tableau de bord', labelEn: 'Dashboard', exact: true },
    { href: '/admin/teachers',  icon: GraduationCap,   labelFr: 'Professeurs',    labelEn: 'Teachers' },
    { href: '/admin/users',     icon: Users,           labelFr: 'Utilisateurs',   labelEn: 'Users' },
    { href: '/admin/reports',   icon: Flag,            labelFr: 'Signalements',   labelEn: 'Reports' },
  ];

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1 overflow-x-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch
                className={`inline-flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                  active
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {isFr ? link.labelFr : link.labelEn}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}