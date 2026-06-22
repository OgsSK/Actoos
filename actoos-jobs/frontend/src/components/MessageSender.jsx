import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';

const MessageSender = ({ role }) => {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [expireValue, setExpireValue] = useState(30);
  const [expireUnit, setExpireUnit] = useState('days');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('role', role)
        .order('created_at', { ascending: false });
      setUsers(data || []);
    };
    fetchUsers();
  }, [role]);

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const durationUnits = [
    { value: 'minutes', label: t('messageSender.durationUnits.minutes') },
    { value: 'hours', label: t('messageSender.durationUnits.hours') },
    { value: 'days', label: t('messageSender.durationUnits.days') },
  ];

  const handleSend = async () => {
    if (!subject.trim() || !content.trim() || selectedIds.length === 0) {
      toast.error(t('messageSender.toasts.fillRequired'));
      return;
    }
    setSending(true);
    try {
      const res = await apiFetch('/api/admin/send-messages', {
        method: 'POST',
        body: JSON.stringify({
          recipient_ids: selectedIds,
          subject,
          content,
          expire_value: expireValue || 0,
          expire_unit: expireValue ? expireUnit : null,
          language: i18n.language,
        })
      });
      if (res.success) {
        if (res.errors && res.errors.length > 0) {
          toast.error(t('messageSender.toasts.partialError', { errors: res.errors.join(', ') }));
        }
        toast.success(t('messageSender.toasts.sentSuccess', { count: res.sent }));
        setSubject('');
        setContent('');
        setSelectedIds([]);
      } else {
        toast.error(t('messageSender.toasts.sendError'));
      }
    } catch (err) {
      console.error('Send error:', err);
      toast.error(err.message || t('messageSender.toasts.networkError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Liste des destinataires */}
      <Card className="lg:col-span-1 overflow-hidden">
        <CardHeader>
          <CardTitle>{t('messageSender.recipientsTitle', { role: t(`messageSender.roles.${role}`) })}</CardTitle>
          <Input
            placeholder={t('messageSender.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-2"
          />
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-y-auto">
          <div className="space-y-2">
            {filteredUsers.map(u => (
              <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(u.id)}
                  onChange={() => toggleUser(u.id)}
                  className="rounded border-slate-300"
                />
                <div>
                  <p className="text-sm font-medium">{u.first_name} {u.last_name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Composition du message */}
      <Card className="lg:col-span-2 overflow-hidden">
        <CardHeader>
          <CardTitle>{t('messageSender.composeTitle')}</CardTitle>
          <CardDescription>
            {t('messageSender.composeDescription', { count: selectedIds.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder={t('messageSender.subjectPlaceholder')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            rows={10}
            className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('messageSender.contentPlaceholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-600">
              {t('messageSender.durationLabel')}
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                placeholder={t('messageSender.durationValuePlaceholder')}
                value={expireValue}
                onChange={(e) => setExpireValue(Number(e.target.value))}
                className="w-24"
              />
              <select
                value={expireUnit}
                onChange={(e) => setExpireUnit(e.target.value)}
                className="h-10 border border-slate-200 rounded-xl px-3 bg-white"
              >
                {durationUnits.map(unit => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </select>
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={sending || selectedIds.length === 0 || !subject.trim() || !content.trim()}
            className="bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
            {t('messageSender.sendButton')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MessageSender;