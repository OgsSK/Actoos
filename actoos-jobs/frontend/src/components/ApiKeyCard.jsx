import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Trash2 } from 'lucide-react';
import { cn, formatRelative } from '../lib/utils';

const ApiKeyCard = ({ keyData, onRevoke }) => {
  const { t } = useTranslation();
  const { id, name, key_prefix, scopes, environment, rate_limit_per_minute,
          created_at, last_used_at, revoked_at } = keyData;

  return (
    <Card className={cn('border-slate-200', revoked_at && 'opacity-60')}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-900">{name}</span>
              <Badge className={revoked_at ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                {revoked_at
                  ? t('apiPage.revoked', 'Révoquée')
                  : t('apiPage.active', 'Active')}
              </Badge>
              <Badge className="bg-slate-100 text-slate-600 border-0">
                {environment === 'live' ? 'Live' : 'Test'}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
              <code className="bg-slate-100 px-2 py-0.5 rounded font-mono">
                {key_prefix}...
              </code>
              <span>{rate_limit_per_minute} req/min</span>
              {(scopes || []).map((s) => (
                <Badge key={s} className="bg-blue-50 text-blue-700 border-0 text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>

            <p className="text-xs text-slate-400 mt-1">
              {t('apiPage.created', 'Créée')} {formatRelative(created_at)}
              {last_used_at && ` · ${t('apiPage.lastUsed', 'Dernière utilisation')} ${formatRelative(last_used_at)}`}
            </p>
          </div>

          {!revoked_at && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50 border-red-200 shrink-0"
              onClick={() => onRevoke(id)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {t('apiPage.revoke', 'Révoquer')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeyCard;