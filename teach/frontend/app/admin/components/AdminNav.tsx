'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, GraduationCap, Users, Flag, Mail } from 'lucide-react';
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
    { href: '/admin/emails',    icon: Mail,            labelFr: 'Emails groupés', labelEn: 'Bulk emails' },
  ];

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          className="flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
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
                className={`group inline-flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all shrink-0 ${
                  active
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <Icon 
                  className={`w-4 h-4 transition-colors ${
                    active ? 'text-red-500' : 'text-slate-400 group-hover:text-slate-600'
                  }`} 
                />
                {isFr ? link.labelFr : link.labelEn}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}