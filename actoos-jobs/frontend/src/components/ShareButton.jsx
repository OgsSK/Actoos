import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2, Check } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const ShareButton = ({ url, title, text }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Erreur partage:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success(t('share.copied', 'Lien copié dans le presse-papier !'));
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error(t('share.copyError', 'Impossible de copier le lien.'));
      }
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare} className="gap-1">
      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {copied ? t('share.copiedShort', 'Copié') : t('share.share', 'Partager')}
    </Button>
  );
};

export default ShareButton;