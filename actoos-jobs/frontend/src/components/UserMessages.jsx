import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Mail, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const UserMessages = ({ userId }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchMessages();
  }, [userId]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_messages')
      .select('*')
      .eq('recipient_id', userId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('sent_at', { ascending: false });

    if (!error) setMessages(data || []);
    setLoading(false);
  };

  const handleMarkAsRead = async (id) => {
    const { error } = await supabase
      .from('admin_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, read_at: new Date().toISOString() } : m));
      toast.success(t('userMessages.markedAsReadToast'));
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('admin_messages').delete().eq('id', id);
    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== id));
      toast.success(t('userMessages.deletedToast'));
    }
  };

  if (loading) return <div className="text-center py-4 text-sm text-slate-500">{t('userMessages.loading')}</div>;
  if (messages.length === 0) return <div className="text-center py-4 text-sm text-slate-500">{t('userMessages.noMessages')}</div>;

  return (
    <div className="space-y-4">
      {messages.map(msg => (
        <Card key={msg.id} className={msg.read_at ? 'opacity-70' : 'border-blue-200 bg-blue-50/30'}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">{msg.subject}</CardTitle>
            <div className="flex items-center gap-2">
              {!msg.read_at && <Badge className="bg-blue-100 text-blue-700">{t('userMessages.new')}</Badge>}
              {msg.updated_at && (
                <Badge className="bg-amber-100 text-amber-700 ml-2">
                  {t('userMessages.modifiedAt', { date: new Date(msg.updated_at).toLocaleString('fr-FR') })}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(msg.id)}>
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500"
                onClick={() => handleDelete(msg.id)}
                disabled={!msg.read_at}
                title={!msg.read_at ? t('userMessages.deleteDisabledTitle') : t('userMessages.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 whitespace-pre-line">{msg.content}</p>
            <p className="text-xs text-slate-400 mt-2">
              {new Date(msg.sent_at).toLocaleString('fr-FR')}
              {msg.expires_at && ` – ${t('userMessages.expiresAt', { date: new Date(msg.expires_at).toLocaleDateString('fr-FR') })}`}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UserMessages;