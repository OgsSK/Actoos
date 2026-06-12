import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Mail, Loader2, Edit, Trash2, X } from 'lucide-react';

const MessageManager = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);   // <-- ajouté
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ subject: '', content: '', expire_value: 30, expire_unit: 'days' });

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('admin_messages')
        .select('*')
        .order('sent_at', { ascending: false });

      if (messagesError) throw messagesError;

      const enriched = await Promise.all(
        (messagesData || []).map(async (msg) => {
          const { data: userData } = await supabase
            .from('users')
            .select('email, first_name, last_name')
            .eq('id', msg.recipient_id)
            .maybeSingle();
          return { ...msg, recipient: userData || { email: 'Inconnu' } };
        })
      );

      setMessages(enriched);
    } catch (err) {
      console.error('Erreur chargement messages:', err);
      setError(err.message);
      toast.error('Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMessages(); }, []);

  const handleEdit = (msg) => {
    setEditingId(msg.id);
    setEditForm({
      subject: msg.subject,
      content: msg.content,
      expire_value: msg.expires_at
        ? Math.ceil((new Date(msg.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
        : 0,
      expire_unit: 'days'
    });
  };

  const handleUpdate = async () => {
    try {
      await apiFetch(`/api/admin/messages/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({
          subject: editForm.subject,
          content: editForm.content,
          expire_value: editForm.expire_value || 0,
          expire_unit: editForm.expire_unit
        })
      });
      toast.success('Message mis à jour');
      setEditingId(null);
      fetchMessages();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce message définitivement ?')) return;
    try {
      await apiFetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
      toast.success('Message supprimé');
      fetchMessages();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  if (error) return <div className="text-center py-8 text-red-600">Erreur : {error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Tous les messages envoyés ({messages.length})</h2>
      {messages.length === 0 ? (
        <p className="text-center text-slate-500 py-8">Aucun message envoyé pour le moment.</p>
      ) : (
        messages.map(msg => (
          <Card key={msg.id} className={msg.updated_at ? 'border-amber-200' : ''}>
            <CardContent className="p-4">
              {editingId === msg.id ? (
                <div className="space-y-3">
                  <Input
                    value={editForm.subject}
                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    placeholder="Sujet"
                  />
                  <textarea
                    rows={4}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none"
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Valeur"
                      value={editForm.expire_value}
                      onChange={(e) => setEditForm({ ...editForm, expire_value: Number(e.target.value) })}
                      className="w-24"
                    />
                    <select
                      value={editForm.expire_unit}
                      onChange={(e) => setEditForm({ ...editForm, expire_unit: e.target.value })}
                      className="h-10 border border-slate-200 rounded-xl px-3 bg-white"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Heures</option>
                      <option value="days">Jours</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdate}>Enregistrer</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{msg.subject}</h3>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(msg)}><Edit className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" className="text-red-500" onClick={() => handleDelete(msg.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{msg.content}</p>
                  <div className="flex gap-2 mt-2 text-xs text-slate-500">
                    <span>À : {msg.recipient?.email || 'Inconnu'}</span>
                    <span>Envoyé le {new Date(msg.sent_at).toLocaleString('fr-FR')}</span>
                    {msg.updated_at && <Badge className="bg-amber-100 text-amber-700">Modifié le {new Date(msg.updated_at).toLocaleString('fr-FR')}</Badge>}
                    {msg.expires_at && <span>Expire le {new Date(msg.expires_at).toLocaleDateString('fr-FR')}</span>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default MessageManager;