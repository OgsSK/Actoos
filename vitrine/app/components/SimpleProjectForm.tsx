'use client';

import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';
import { Send, User, Mail, FileText, Layers, DollarSign } from 'lucide-react';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      newErrors.projectTitle = isFr ? 'Veuillez donner un titre à votre projet' : 'Please enter a project title';
    }
    if (!form.description.trim()) {
      newErrors.description = isFr ? 'Veuillez décrire votre projet' : 'Please describe your project';
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
      const saveRes = await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/handle-request', {
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
      });

      if (!saveRes.ok) throw new Error('Erreur sauvegarde');

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://actoos.com';
      const link = `${baseUrl}/client/${token}`;

      await fetch('/api/send-project-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: form.email,
          subject: language === 'en' ? 'Your project link' : 'Votre lien projet',
          title: language === 'en' ? '✨ Project received' : '✨ Projet bien reçu',
          message: language === 'en'
            ? `Hello ${form.name},<br/><br/>Your project "<strong>${form.projectTitle}</strong>" has been received.<br/><br/>You can track its progress here:<br/><br/><strong><a href="${link}" target="_blank">${link}</a></strong><br/><br/>We will get back to you shortly.`
            : `Bonjour ${form.name},<br/><br/>Votre projet "<strong>${form.projectTitle}</strong>" a bien été reçu.<br/><br/>Vous pouvez suivre son avancement ici :<br/><br/><strong><a href="${link}" target="_blank">${link}</a></strong><br/><br/>Nous vous répondrons rapidement.`,
          buttonText: language === 'en' ? 'Track my project' : 'Suivre mon projet',
          buttonUrl: link,
          language,
        }),
      });

      setClientToken(token);
      setSubmitted(true);
    } catch (error) {
      console.error('Erreur:', error);
      setErrors({ global: language === 'en' ? 'An error occurred. Please try again.' : 'Une erreur est survenue. Veuillez réessayer.' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://actoos.com';
    const link = `${baseUrl}/client/${clientToken}`;

    return (
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-3xl shadow-xl text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-slate-900">
          {language === 'en' ? 'Project submitted successfully!' : 'Projet soumis avec succès !'}
        </h2>
        <p className="text-slate-600 mt-2">
          {language === 'en'
            ? 'Your project has been received. You can track its progress here:'
            : 'Votre projet a été reçu. Vous pouvez suivre son avancement ici :'}
        </p>
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border-2 border-[#D4AF37]/30 break-all font-mono text-sm">
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] font-bold underline hover:text-amber-600">
            {link}
          </a>
        </div>
        <p className="text-sm text-slate-400 mt-3">
          {language === 'en'
            ? 'An email has also been sent to your address.'
            : 'Un email vous a également été envoyé.'}
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm({ name: '', email: '', projectTitle: '', description: '', projectType: '', budget: '' });
            setClientToken('');
            setErrors({});
          }}
          className="mt-6 px-6 py-2 bg-slate-200 text-slate-700 rounded-full font-bold hover:bg-slate-300 transition"
        >
          {language === 'en' ? 'Submit another project' : 'Soumettre un autre projet'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
      <div className="bg-gradient-to-r from-[#D4AF37] to-amber-500 px-8 py-6">
        <h2 className="text-2xl font-black text-white">
          {language === 'en' ? 'Start your project' : 'Lancez votre projet'}
        </h2>
        <p className="text-white/80 text-sm mt-1">
          {language === 'en'
            ? 'Fill in the form below and get a personalized tracking link.'
            : 'Remplissez le formulaire et recevez un lien de suivi personnalisé.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-8 space-y-5">
        {errors.global && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {errors.global}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              {language === 'en' ? 'Full name *' : 'Nom complet *'}
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition ${
                  errors.name ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-[#D4AF37]'
                }`}
                placeholder={language === 'en' ? 'John Doe' : 'Jean Dupont'}
              />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              {language === 'en' ? 'Email address *' : 'Adresse email *'}
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition ${
                  errors.email ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-[#D4AF37]'
                }`}
                placeholder="you@example.com"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            {language === 'en' ? 'Project title *' : 'Titre du projet *'}
          </label>
          <div className="relative">
            <FileText size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="projectTitle"
              value={form.projectTitle}
              onChange={handleChange}
              className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition ${
                errors.projectTitle ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-[#D4AF37]'
              }`}
              placeholder={language === 'en' ? 'My awesome project' : 'Mon super projet'}
            />
          </div>
          {errors.projectTitle && <p className="text-red-500 text-xs mt-1">{errors.projectTitle}</p>}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            {language === 'en' ? 'Project description *' : 'Description du projet *'}
          </label>
          <textarea
            name="description"
            rows={4}
            value={form.description}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition resize-none ${
              errors.description ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-[#D4AF37]'
            }`}
            placeholder={language === 'en' ? 'Describe your project in detail...' : 'Décrivez votre projet en détail...'}
          />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              {language === 'en' ? 'Project type' : 'Type de projet'}
            </label>
            <div className="relative">
              <Layers size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                name="projectType"
                value={form.projectType}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition appearance-none bg-white"
              >
                <option value="">{language === 'en' ? 'Select...' : 'Sélectionner...'}</option>
                {PROJECT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {language === 'en' ? type.labelEn : type.labelFr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              {language === 'en' ? 'Estimated budget (€)' : 'Budget estimé (€)'}
            </label>
            <div className="relative">
              <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="budget"
                value={form.budget}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition"
                placeholder={language === 'en' ? 'e.g. 5000' : 'ex. 5000'}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white py-4 rounded-xl font-bold text-base hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {language === 'en' ? 'Sending...' : 'Envoi en cours...'}
            </span>
          ) : (
            <>
              <Send size={18} />
              {language === 'en' ? 'Send my project' : 'Envoyer mon projet'}
            </>
          )}
        </button>

        <p className="text-xs text-slate-400 text-center">
          {language === 'en'
            ? 'By submitting, you agree to our terms and privacy policy.'
            : 'En soumettant, vous acceptez nos conditions et notre politique de confidentialité.'}
        </p>
      </form>
    </div>
  );
}