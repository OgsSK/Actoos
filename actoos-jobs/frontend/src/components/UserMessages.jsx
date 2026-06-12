import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Mail, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const UserMessages = ({ userId }) => {
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
      toast.success('Message marqué comme lu');
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('admin_messages').delete().eq('id', id);
    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== id));
      toast.success('Message supprimé');
    }
  };

  if (loading) return <div className="text-center py-4 text-sm text-slate-500">Chargement des messages...</div>;
  if (messages.length === 0) return <div className="text-center py-4 text-sm text-slate-500">Aucun message</div>;

  return (
    <div className="space-y-4">
      {messages.map(msg => (
        <Card key={msg.id} className={msg.read_at ? 'opacity-70' : 'border-blue-200 bg-blue-50/30'}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">{msg.subject}</CardTitle>
            <div className="flex items-center gap-2">
              {!msg.read_at && <Badge className="bg-blue-100 text-blue-700">Nouveau</Badge>}
              {msg.updated_at && (
                <Badge className="bg-amber-100 text-amber-700 ml-2">
                  Modifié le {new Date(msg.updated_at).toLocaleString('fr-FR')}
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
                title={!msg.read_at ? "Marquez le message comme lu avant de le supprimer" : "Supprimer"}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 whitespace-pre-line">{msg.content}</p>
            <p className="text-xs text-slate-400 mt-2">
              {new Date(msg.sent_at).toLocaleString('fr-FR')}
              {msg.expires_at && ` – Expire le ${new Date(msg.expires_at).toLocaleDateString('fr-FR')}`}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UserMessages;