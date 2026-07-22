import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import {
  Loader2, Send, CheckCircle, Mail, Phone, MapPin,
  MessageSquare, User, AtSign, FileText
} from 'lucide-react';
import { toast } from 'sonner';

const BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8001'
  : 'https://actoos-jobs-api.onrender.com';

const ContactPage = () => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const abortControllerRef = useRef(null);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error(t('contact.toasts.fillAllFields'));
      return;
    }

    // Annuler une requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);

    // Timeout de 10 secondes
    const timeout = setTimeout(() => {
      controller.abort();
      toast.error(t('contact.toasts.timeout', 'La requête a pris trop de temps.'));
      setLoading(false);
    }, 10000);

    try {
      const response = await fetch(`${BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          language: i18n.language,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || t('contact.toasts.error'));
      }

      setSent(true);
      toast.success(t('contact.toasts.sent'));
    } catch (err) {
      if (err.name === 'AbortError') return; // Annulation silencieuse
      toast.error(err.message || t('contact.toasts.error'));
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
        <Card className="max-w-lg w-full bg-white shadow-xl rounded-3xl p-10 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {t('contact.success.title')}
          </h2>
          <p className="text-slate-600">{t('contact.success.message')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* Hero avec fond dégradé */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-blue-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-8 h-8 text-blue-200" />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            {t('contact.hero.title', 'Contactez-nous')}
          </h1>
          <p className="text-blue-100 text-lg max-w-xl mx-auto">
            {t('contact.hero.subtitle', 'Une question, une suggestion, ou simplement envie d\'échanger ? Nous sommes à votre écoute.')}
          </p>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Colonne de gauche : formulaire */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-xl rounded-3xl border-0">
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  {t('contact.form.title', 'Envoyez-nous un message')}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        {t('contact.labels.name')}
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder={t('contact.placeholders.name')}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <AtSign className="w-4 h-4 text-slate-400" />
                        {t('contact.labels.email')}
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={t('contact.placeholders.email')}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      {t('contact.labels.subject')}
                    </Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder={t('contact.placeholders.subject')}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message" className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      {t('contact.labels.message')}
                    </Label>
                    <textarea
                      id="message"
                      name="message"
                      rows="6"
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                      placeholder={t('contact.placeholders.message')}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-base font-semibold"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Send className="w-5 h-5 mr-2" />
                    )}
                    {t('contact.sendButton')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Colonne de droite : infos de contact */}
          <div className="space-y-6">
            <Card className="bg-white shadow-lg rounded-3xl border-0">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {t('contact.info.title', 'Nos coordonnées')}
                </h3>
                <div className="space-y-4">
                  <a
                    href="mailto:contact@actoos.com"
                    className="flex items-center gap-3 text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('contact.info.email')}</p>
                      <p className="text-xs text-slate-500">contact@actoos.com</p>
                    </div>
                  </a>

                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('contact.info.phone')}</p>
                      <p className="text-xs text-slate-500">+32 465743661</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-slate-600">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mt-0.5">
                      <MapPin className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('contact.info.address')}</p>
                      <p className="text-xs text-slate-500">Bruxelles, Belgique</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-0 shadow-lg rounded-3xl">
              <CardContent className="p-6 text-center">
                <MessageSquare className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h4 className="font-semibold text-slate-900 mb-2">
                  {t('contact.info.quickResponse', 'Réponse rapide')}
                </h4>
                <p className="text-sm text-slate-600">
                  {t('contact.info.quickResponseDesc', 'Nous répondons en moins de 24 heures ouvrées.')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;