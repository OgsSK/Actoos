'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import ReportModal from './ReportModal';

interface ReportButtonProps {
  reportedUserId: string;
  reportedUserName?: string;
  context?: 'profile' | 'message' | 'request';
  contextId?: string;
  variant?: 'icon' | 'text' | 'both';
  className?: string;
}

export default function ReportButton({
  reportedUserId,
  reportedUserName,
  context = 'profile',
  contextId,
  variant = 'icon',
  className = '',
}: ReportButtonProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const isFr = language === 'fr';

  const label = isFr ? 'Signaler' : 'Report';

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 text-slate-400 hover:text-red-500 transition-colors ${className}`}
        title={label}
        aria-label={label}
      >
        <Flag className="w-4 h-4" />
        {variant === 'text' && <span className="text-xs font-medium">{label}</span>}
        {variant === 'both' && <span className="text-xs font-medium">{label}</span>}
      </button>

      <ReportModal
        isOpen={open}
        onClose={() => setOpen(false)}
        reportedUserId={reportedUserId}
        reportedUserName={reportedUserName}
        context={context}
        contextId={contextId}
      />
    </>
  );
}