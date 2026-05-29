import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, ChevronLeft, Bell, Check, Trash2 } from 'lucide-react';
import { formatRelative } from '../lib/utils';
import { toast } from 'sonner';

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
  };

  const markAllAsRead = async () => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
    toast.success('Toutes les notifications sont marquées comme lues');
  };

  const deleteNotification = async (id) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (loading) return <div className="pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard"><Button variant="ghost"><ChevronLeft className="w-4 h-4 mr-2" />Retour</Button></Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
              {unreadCount > 0 && <p className="text-sm text-slate-500">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-2" /> Tout marquer comme lu
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-slate-300" />Aucune notification.
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <Card key={notif.id} className={!notif.is_read ? 'border-blue-200 bg-blue-50/50' : ''}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!notif.is_read && <span className="w-2 h-2 bg-blue-600 text-white rounded-full"></span>}
                      <h3 className="font-medium text-slate-900">{notif.title}</h3>
                    </div>
                    <p className="text-sm text-slate-600">{notif.message}</p>
                    <span className="text-xs text-slate-400 mt-1 block">{formatRelative(notif.created_at)}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!notif.is_read && (
                      <Button variant="ghost" size="icon" onClick={() => markAsRead(notif.id)} title="Marquer comme lu">
                        <Check className="w-4 h-4 text-blue-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteNotification(notif.id)} title="Supprimer">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
