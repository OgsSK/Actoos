import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Loader2, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';

const ContactPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error(t('contact.toasts.fillAllFields'));
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setSent(true);
      toast.success(t('contact.toasts.sent'));
    } catch (err) {
      toast.error(err.message || t('contact.toasts.error'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
        <Card className="max-w-lg w-full bg-white shadow-xl rounded-3xl p-10 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('contact.success.title')}</h2>
          <p className="text-slate-600">{t('contact.success.message')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{t('contact.title')}</h1>
          <p className="text-slate-600">{t('contact.subtitle')}</p>
        </div>

        <Card className="bg-white shadow-xl rounded-3xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('contact.labels.name')}</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder={t('contact.placeholders.name')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('contact.labels.email')}</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder={t('contact.placeholders.email')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">{t('contact.labels.subject')}</Label>
                <Input id="subject" name="subject" value={formData.subject} onChange={handleChange} placeholder={t('contact.placeholders.subject')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">{t('contact.labels.message')}</Label>
                <textarea
                  id="message"
                  name="message"
                  rows="6"
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder={t('contact.placeholders.message')}
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                {t('contact.sendButton')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContactPage;