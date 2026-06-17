import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Plus, Trash2, Edit, Check, X, Globe } from 'lucide-react';

const EditableLinks = ({ links = [], onChange }) => {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState(null);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [addMode, setAddMode] = useState(false);

  // Normalise l'URL : ajoute https:// si aucun protocole n'est présent
  const normalizeUrl = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  };

  const handleAdd = () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    const newLinks = [...links, { id: Date.now().toString(), label: newLabel.trim(), url: normalizeUrl(newUrl.trim()) }];
    onChange(newLinks);
    setNewLabel('');
    setNewUrl('');
    setAddMode(false);
  };

  const handleUpdate = (id) => {
    const updated = links.map((link) =>
      link.id === id ? { ...link, label: newLabel, url: normalizeUrl(newUrl) } : link
    );
    onChange(updated);
    setEditingId(null);
    setNewLabel('');
    setNewUrl('');
  };

  const handleDelete = (id) => {
    const filtered = links.filter((link) => link.id !== id);
    onChange(filtered);
  };

  const startEdit = (link) => {
    setEditingId(link.id);
    setNewLabel(link.label);
    setNewUrl(link.url);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewLabel('');
    setNewUrl('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-700">{t('profile.links.title')}</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setAddMode(true); setEditingId(null); setNewLabel(''); setNewUrl(''); }}
        >
          <Plus className="w-4 h-4 mr-1" /> {t('profile.links.addLink')}
        </Button>
      </div>

      {links.map((link) => (
        <div key={link.id} className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
          {editingId === link.id ? (
            <>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={t('profile.links.namePlaceholder')}
                className="w-1/3"
              />
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder={t('profile.links.urlPlaceholder')}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => handleUpdate(link.id)}>
                <Check className="w-4 h-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="icon" onClick={cancelEdit}>
                <X className="w-4 h-4 text-red-500" />
              </Button>
            </>
          ) : (
            <>
              <Globe className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{link.label}</p>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate block"
                >
                  {link.url}
                </a>
              </div>
              <Button variant="ghost" size="icon" onClick={() => startEdit(link)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(link.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </>
          )}
        </div>
      ))}

      {addMode && (
        <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-3 border border-blue-200">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={t('profile.links.namePlaceholder')}
            className="w-1/3"
          />
          <Input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder={t('profile.links.urlPlaceholder')}
            className="flex-1"
          />
          <Button variant="ghost" size="icon" onClick={handleAdd}>
            <Check className="w-4 h-4 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setAddMode(false)}>
            <X className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default EditableLinks;