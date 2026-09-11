'use client';
import { SUPABASE_FUNCTIONS_URL } from '../../lib/supabase-functions';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';
import { Send, User, Mail, FileText, Layers, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const PROJECT_TYPES = [
  { value: 'site-vitrine', labelFr: 'Site vitrine', labelEn: 'Showcase website' },
  { value: 'e-commerce', labelFr: 'E-commerce', labelEn: 'E-commerce' },
  { value: 'application-mobile', labelFr: 'Application mobile', labelEn: 'Mobile app' },
  { value: 'application-web', labelFr: 'Application web', labelEn: 'Web app' },
  { value: 'logiciel-saas', labelFr: 'Logiciel SaaS', labelEn: 'SaaS software' },
  { value: 'autre', labelFr: 'Autre', labelEn: 'Other' },
];

export default function SimpleProjectForm() {
  const { language } = useLanguage();
  const [form, setForm] = useState({
    name: '',
    email: '',
    projectTitle: '',
    description: '',
    projectType: '',
    budget: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [clientToken, setClientToken] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const isFr = language === 'fr';

    if (!form.name.trim()) {
      newErrors.name = isFr ? 'Veuillez indiquer votre nom' : 'Please enter your name';
    }

    if (!form.email.trim()) {
      newErrors.email = isFr ? 'Veuillez indiquer votre email' : 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = isFr ? 'Email invalide' : 'Invalid email address';
    }

    if (!form.projectTitle.trim()) {
      newErrors.projectTitle = isFr ? 'Veuillez indiquer un titre' : 'Please enter a title';
    }

    if (!form.description.trim()) {
      newErrors.description = isFr
        ? 'Veuillez décrire votre projet'
        : 'Please describe your project';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    const token = generateUUID();

    try {
      const saveRes = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/handle-request`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save-project',
            client_name: form.name,
            client_email: form.email,
            client_message: form.description,
            project_name: form.projectTitle,
            project_type: form.projectType,
            budget: form.budget,
            client_token: token,
            conversation: [],
            language,
          }),
        }
      );

      if (!saveRes.ok) throw new Error('Erreur sauvegarde');

      const baseUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://actoos.com';

      const link = `${baseUrl}/client/${token}`;

      await fetch('/api/send-project-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: form.email,
          subject:
            language === 'en'
              ? 'Your project link'
              : 'Votre lien projet',
          title:
            language === 'en'
              ? 'Project received'
              : 'Projet reçu',
          message:
            language === 'en'
              ? `Hello ${form.name},<br/><br/>Your project "<strong>${form.projectTitle}</strong>" has been received.<br/><br/>You can track its progress here:<br/><br/><strong><a href="${link}" target="_blank">${link}</a></strong><br/><br/>We will get back to you shortly.`
              : `Bonjour ${form.name},<br/><br/>Votre projet "<strong>${form.projectTitle}</strong>" a bien été reçu.<br/><br/>Vous pouvez suivre son avancement ici :<br/><br/><strong><a href="${link}" target="_blank">${link}</a></strong><br/><br/>Nous vous répondrons rapidement.`,
          buttonText:
            language === 'en'
              ? 'Track my project'
              : 'Suivre mon projet',
          buttonUrl: link,
          language,
        }),
      });

      setClientToken(token);
      setSubmitted(true);
    } catch {
      setErrors({
        global:
          language === 'en'
            ? 'An error occurred. Please try again.'
            : 'Une erreur est survenue. Veuillez réessayer.',
      });
    } finally {
      setLoading(false);
    }
  };

  // ========== CONFIRMATION ==========
  if (submitted) {
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://actoos.com';

    const link = `${baseUrl}/client/${clientToken}`;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
            {language === 'en' ? 'Project received' : 'Projet reçu'}
          </h2>

          <p className="text-slate-500 text-sm mb-7 max-w-md mx-auto">
            {language === 'en'
              ? 'Your project has been registered. Track its progress and communicate with our team through the link below.'
              : 'Votre projet est enregistré. Suivez son avancement et échangez avec notre équipe via le lien ci-dessous.'}
          </p>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-5">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 break-all"
            >
              {link}
            </a>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            {language === 'en'
              ? 'This link was also sent to your email address.'
              : 'Ce lien vous a également été envoyé par email.'}
          </p>

          <button
            onClick={() => {
              setSubmitted(false);
              setForm({
                name: '',
                email: '',
                projectTitle: '',
                description: '',
                projectType: '',
                budget: '',
              });
              setClientToken('');
              setErrors({});
            }}
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            {language === 'en'
              ? 'Submit another project'
              : 'Soumettre un autre projet'}
          </button>
        </div>
      </div>
    );
  }

  // ========== FORMULAIRE ==========
  return (
    <div className="max-w-2xl mx-auto">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-5"
      >
        {errors.global && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {errors.global}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {language === 'en' ? 'Full name' : 'Nom complet'}
            </label>

            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border transition-colors outline-none ${
                  errors.name
                    ? 'border-red-300 focus:border-red-400 bg-red-50/30'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white'
                }`}
                placeholder={
                  language === 'en' ? 'John Doe' : 'Jean Dupont'
                }
              />
            </div>

            {errors.name && (
              <p className="text-red-500 text-xs mt-1.5">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {language === 'en' ? 'Email address' : 'Adresse email'}
            </label>

            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border transition-colors outline-none ${
                  errors.email
                    ? 'border-red-300 focus:border-red-400 bg-red-50/30'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white'
                }`}
                placeholder="you@example.com"
              />
            </div>

            {errors.email && (
              <p className="text-red-500 text-xs mt-1.5">
                {errors.email}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            {language === 'en' ? 'Project title' : 'Titre du projet'}
          </label>

          <div className="relative">
            <FileText
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              name="projectTitle"
              value={form.projectTitle}
              onChange={handleChange}
              className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border transition-colors outline-none ${
                errors.projectTitle
                  ? 'border-red-300 focus:border-red-400 bg-red-50/30'
                  : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white'
              }`}
              placeholder={
                language === 'en'
                  ? 'E.g. Client portal for a logistics company'
                  : 'Ex. Portail client pour une société de logistique'
              }
            />
          </div>

          {errors.projectTitle && (
            <p className="text-red-500 text-xs mt-1.5">
              {errors.projectTitle}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            {language === 'en' ? 'Description' : 'Description'}
          </label>

          <textarea
            name="description"
            rows={4}
            value={form.description}
            onChange={handleChange}
            className={`w-full px-3 py-2.5 text-sm rounded-lg border transition-colors outline-none resize-none ${
              errors.description
                ? 'border-red-300 focus:border-red-400 bg-red-50/30'
                : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white'
            }`}
            placeholder={
              language === 'en'
                ? 'Describe your need, your context, and your goals.'
                : 'Décrivez votre besoin, votre contexte et vos objectifs.'
            }
          />

          {errors.description && (
            <p className="text-red-500 text-xs mt-1.5">
              {errors.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {language === 'en' ? 'Project type' : 'Type de projet'}
            </label>

            <div className="relative">
              <Layers
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />

              <select
                name="projectType"
                value={form.projectType}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white transition-colors outline-none appearance-none cursor-pointer"
              >
                <option value="">
                  {language === 'en' ? 'Select…' : 'Sélectionner…'}
                </option>

                {PROJECT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {language === 'en'
                      ? type.labelEn
                      : type.labelFr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {language === 'en'
                ? 'Estimated budget (€)'
                : 'Budget estimé (€)'}
            </label>

            <div className="relative">
              <input
                type="text"
                name="budget"
                value={form.budget}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white transition-colors outline-none"
                placeholder={
                  language === 'en' ? 'e.g. 5000' : 'ex. 5000'
                }
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>

                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>

              {language === 'en' ? 'Sending…' : 'Envoi…'}
            </>
          ) : (
            <>
              <Send size={15} />

              {language === 'en'
                ? 'Submit project'
                : 'Soumettre le projet'}
            </>
          )}
        </button>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-slate-400" />

            <span>
              {language === 'en'
                ? 'Reply within 24 business hours'
                : 'Réponse sous 24h ouvrées'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-slate-400" />

            <span>
              {language === 'en'
                ? 'Confidential'
                : 'Confidentiel'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <CheckCircle2
              size={13}
              className="text-slate-400"
            />

            <span>
              {language === 'en'
                ? 'Free quote'
                : 'Devis gratuit'}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}