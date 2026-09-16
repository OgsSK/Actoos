'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Send, Loader2, CheckCircle2, Mail, MessageSquare,
  User as UserIcon, AtSign, FileText, AlertCircle, Clock,
} from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/lib/constants';

type SendState = 'idle' | 'sending' | 'sent' | 'error';

export default function ContactPage() {
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [sendState, setSendState] = useState<SendState>('idle');
  const [error, setError] = useState('');

  const isSending = sendState === 'sending';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError(
        isFr
          ? 'Merci de remplir tous les champs.'
          : 'Please fill in all fields.'
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(
        isFr ? 'Adresse email invalide.' : 'Invalid email address.'
      );
      return;
    }

    if (message.trim().length < 10) {
      setError(
        isFr
          ? 'Votre message doit contenir au moins 10 caractères.'
          : 'Your message must be at least 10 characters.'
      );
      return;
    }

    setSendState('sending');

    try {
      const { error: fnErr } = await supabase.functions.invoke('kalanden-mail', {
        body: {
          action: 'contact',
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          lang: language,
        },
      });

      if (fnErr) {
        console.error('[Contact] edge function error:', fnErr);
        throw new Error(
          isFr
            ? "Erreur lors de l'envoi. Réessayez dans un instant."
            : 'Error sending. Please try again in a moment.'
        );
      }

      setSendState('sent');
    } catch (err: any) {
      console.error('[Contact] error:', err);
      setError(
        err?.message ||
          (isFr
            ? "Impossible d'envoyer votre message. Vérifiez votre connexion."
            : 'Unable to send your message. Check your connection.')
      );
      setSendState('error');
    }
  }

  function resetForm() {
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setError('');
    setSendState('idle');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ═══════════ HERO ═══════════ */}
      <div className="relative bg-slate-900 text-white overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.7) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.7) 1px, transparent 1px)
            `,
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, rgba(16,185,129,0) 70%)',
          }}
        />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link
            href="/"
            prefetch
            className="group inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {isFr ? "Retour à l'accueil" : 'Back to home'}
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-medium">
              {isFr ? 'Nous sommes à votre écoute' : 'We are listening'}
            </p>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            {isFr ? 'Contactez-nous' : 'Contact us'}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            {isFr
              ? `Une question sur ${BRAND.name}, une suggestion, ou simplement envie d'échanger ? Écrivez-nous.`
              : `A question about ${BRAND.name}, a suggestion, or simply want to chat? Write to us.`}
          </p>
        </div>
      </div>

      {/* ═══════════ CONTENU ═══════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* ═══ FORMULAIRE ═══ */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

              {sendState === 'sent' ? (
                /* ─── SUCCESS STATE ─── */
                <div className="p-8 sm:p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">
                    {isFr ? 'Message envoyé !' : 'Message sent!'}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto mb-8">
                    {isFr
                      ? `Merci ${name}. Nous avons bien reçu votre message et nous vous répondrons à l'adresse ${email}.`
                      : `Thanks ${name}. We have received your message and will respond at ${email}.`}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={resetForm}
                      className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      {isFr ? 'Envoyer un autre message' : 'Send another message'}
                    </button>
                    <Link
                      href="/"
                      prefetch
                      className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors"
                    >
                      {isFr ? "Retour à l'accueil" : 'Back to home'}
                    </Link>
                  </div>
                </div>
              ) : (
                /* ─── FORM ─── */
                <div className="p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">
                    {isFr ? 'Envoyez-nous un message' : 'Send us a message'}
                  </h2>
                  <p className="text-sm text-slate-500 mb-6">
                    {isFr
                      ? 'Remplissez le formulaire ci-dessous.'
                      : 'Fill in the form below.'}
                  </p>

                  {error && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Nom + Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          {isFr ? 'Nom complet' : 'Full name'}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder={isFr ? 'Ex : Amadou Diarra' : 'E.g. John Doe'}
                          disabled={isSending}
                          required
                          maxLength={100}
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                          <AtSign className="w-4 h-4 text-slate-400" />
                          {isFr ? 'Adresse email' : 'Email address'}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="exemple@email.com"
                          disabled={isSending}
                          required
                          autoComplete="email"
                          maxLength={200}
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors disabled:opacity-60"
                        />
                      </div>
                    </div>

                    {/* Sujet */}
                    <div>
                      <label htmlFor="subject" className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {isFr ? 'Sujet' : 'Subject'}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="subject"
                        type="text"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder={
                          isFr
                            ? 'Ex : Question sur un prof, problème technique…'
                            : 'E.g. Question about a teacher, technical issue…'
                        }
                        disabled={isSending}
                        required
                        maxLength={150}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors disabled:opacity-60"
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label htmlFor="message" className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        {isFr ? 'Message' : 'Message'}
                        <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="message"
                        rows={6}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder={
                          isFr
                            ? 'Décrivez votre demande en quelques phrases…'
                            : 'Describe your request in a few sentences…'
                        }
                        disabled={isSending}
                        required
                        maxLength={2000}
                        className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors disabled:opacity-60"
                      />
                      <p className="text-xs text-slate-400 mt-1 text-right">
                        {message.length} / 2000
                      </p>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isSending}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-60 disabled:cursor-wait"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {isFr ? 'Envoi en cours…' : 'Sending…'}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {isFr ? 'Envoyer le message' : 'Send message'}
                        </>
                      )}
                    </button>

                    <p className="text-xs text-slate-400 text-center">
                      {isFr
                        ? 'En envoyant ce message, vous acceptez notre politique de confidentialité.'
                        : 'By sending this message, you accept our privacy policy.'}
                    </p>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* ═══ SIDEBAR ═══ */}
          <div className="space-y-4">

            {/* Infos de contact */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">
                {isFr ? 'Nos coordonnées' : 'Our contact details'}
              </h3>

              <div className="space-y-4">
                <a
                  href="mailto:contact@actoos.com"
                  className="flex items-start gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                      Email
                    </p>
                    <p className="text-sm font-medium text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                      contact@actoos.com
                    </p>
                  </div>
                </a>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                      {isFr ? 'Délai habituel' : 'Usual delay'}
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {isFr ? '24 à 48 h ouvrées' : '24 to 48 business hours'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lien légal */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                {isFr
                  ? 'Pour toute question relative à vos données personnelles ou à nos conditions, consultez :'
                  : 'For any question about your personal data or our terms, see:'}
              </p>
              <div className="space-y-2">
                <Link
                  href="/privacy"
                  prefetch
                  className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {isFr ? 'Politique de confidentialité' : 'Privacy policy'}
                </Link>
                <Link
                  href="/legal"
                  prefetch
                  className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {isFr ? 'Mentions légales & CGU' : 'Legal & Terms'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}