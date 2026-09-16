'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, ChevronDown, HelpCircle, Mail, ArrowRight,
} from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { BRAND } from '@/lib/constants';

// ═══════════════════════════════════════════════════════════
// CONTENU FAQ (FR + EN)
// ═══════════════════════════════════════════════════════════
interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  key: string;
  name: string;
  questions: FAQItem[];
}

const FAQ_CONTENT_FR: FAQCategory[] = [
  {
    key: 'general',
    name: 'Général',
    questions: [
      {
        q: `Qu'est-ce que ${BRAND.name} ?`,
        a: `${BRAND.name} est une plateforme qui met en relation les parents et les enseignants particuliers. Les parents peuvent rechercher des profs selon la matière, le niveau et la ville, échanger directement avec eux, et organiser des cours à domicile ou en ligne.`,
      },
      {
        q: 'Est-ce que la plateforme est gratuite ?',
        a: `Oui, l'utilisation de ${BRAND.name} est 100 % gratuite pour les parents : recherche, consultation des profils, échanges avec les enseignants et demandes de cours. Aucun abonnement, aucun frais caché.`,
      },
      {
        q: 'Dans quelles villes êtes-vous disponibles ?',
        a: 'Nous couvrons plusieurs villes, et la liste s\'agrandit régulièrement. Consultez les filtres de recherche sur la page des profs pour voir les villes disponibles près de chez vous.',
      },
      {
        q: 'Comment fonctionne la mise en relation ?',
        a: "Vous cherchez un prof qui correspond à vos besoins, vous lui envoyez une demande de cours via la plateforme. S'il accepte, vous recevez ses coordonnées pour organiser directement le premier cours avec lui.",
      },
    ],
  },
  {
    key: 'parents',
    name: 'Parents',
    questions: [
      {
        q: 'Comment créer un compte parent ?',
        a: `Cliquez sur "S'inscrire" en haut de la page, choisissez le rôle "Parent", remplissez vos informations (nom, prénom, email). Vous pourrez ensuite rechercher des profs et envoyer des demandes de cours.`,
      },
      {
        q: 'Comment ajouter mes enfants ?',
        a: "Depuis votre espace personnel, rendez-vous dans « Mon profil » puis « Gérer mes enfants ». Vous pouvez ajouter le prénom, la date de naissance, le niveau scolaire et l'école de chaque enfant. Ces informations aident les profs à mieux comprendre vos besoins.",
      },
      {
        q: 'Puis-je sauvegarder des profs pour plus tard ?',
        a: "Oui. Sur chaque profil d'enseignant, cliquez sur le cœur « Sauvegarder ». Vous retrouverez tous vos profs favoris dans l'onglet « Favoris » de votre espace personnel.",
      },
      {
        q: 'Comment contacter un prof ?',
        a: "Recherchez un prof, ouvrez son profil, puis cliquez sur « Demander un cours ». Décrivez brièvement vos besoins (matière, niveau, disponibilités). Si le prof accepte, ses coordonnées apparaîtront dans votre espace « Mes demandes ».",
      },
      {
        q: 'Que se passe-t-il si un prof refuse ma demande ?',
        a: "Vous recevrez un email de notification. Vous pourrez alors chercher un autre enseignant disponible. Un refus n'est jamais définitif : vous pouvez contacter d'autres profs de la plateforme à tout moment.",
      },
    ],
  },
  {
    key: 'teachers',
    name: 'Enseignants',
    questions: [
      {
        q: 'Comment devenir enseignant sur la plateforme ?',
        a: `Cliquez sur "S'inscrire", choisissez le rôle "Enseignant", puis complétez votre profil : titre, matières, niveaux, tarif horaire, disponibilités. Notre équipe vérifie ensuite votre profil avant validation.`,
      },
      {
        q: 'Combien de temps prend la validation de mon profil ?',
        a: "Notre équipe examine chaque profil manuellement. Le délai habituel est de 24 à 72 heures ouvrées. Vous recevrez un email dès que votre profil est validé ou si des informations complémentaires sont nécessaires.",
      },
      {
        q: 'Pourquoi mon profil a-t-il été refusé ?',
        a: "Les motifs les plus fréquents : informations incomplètes, titres ou diplômes non vérifiables, photo de profil inappropriée, ou description peu claire. Vous recevez un email détaillant la raison, et vous pouvez corriger puis soumettre à nouveau votre profil.",
      },
      {
        q: 'Comment recevoir des demandes de cours ?',
        a: "Une fois votre profil validé et marqué comme disponible, les parents peuvent vous trouver dans la recherche et vous envoyer des demandes. Vous recevez une notification par email à chaque nouvelle demande.",
      },
      {
        q: 'Puis-je définir mon propre tarif ?',
        a: "Oui, vous fixez librement votre tarif horaire (ou par séance, semaine, mois) dans votre profil. Les parents voient directement ce tarif lors de leur recherche.",
      },
      {
        q: 'Puis-je proposer à la fois des cours à domicile et en ligne ?',
        a: "Oui. Dans votre profil, sélectionnez le mode « À domicile », « En ligne » ou « Les deux ». Les parents peuvent filtrer leur recherche par mode d'enseignement.",
      },
    ],
  },
  {
    key: 'account',
    name: 'Compte & Sécurité',
    questions: [
      {
        q: 'Comment supprimer mon profil (parent ou enseignant) ?',
        a: "Depuis votre tableau de bord, ouvrez la carte « Zone de danger » en bas de la barre latérale. Cliquez sur « Supprimer mon profil » pour retirer le rôle concerné. Votre compte Actoos ID reste actif sur les autres produits (Jobs, Vitrine).",
      },
      {
        q: 'Puis-je avoir à la fois un profil parent et enseignant ?',
        a: "Oui, c'est tout à fait possible. Un même compte peut cumuler les deux rôles. Vous basculez d'un espace à l'autre via le sélecteur en haut du tableau de bord.",
      },
      {
        q: 'Que se passe-t-il si mon compte est suspendu ?',
        a: "Si votre compte est suspendu, vous serez redirigé vers une page dédiée vous indiquant la raison. Vous pouvez contacter notre équipe par email à contact@actoos.com pour contester la décision.",
      },
      {
        q: 'Comment modifier mon mot de passe ou mon email ?',
        a: "Utilisez le lien « Mot de passe oublié » sur la page de connexion, ou accédez aux paramètres du compte depuis le menu de votre espace personnel.",
      },
      {
        q: 'Mes données personnelles sont-elles protégées ?',
        a: "Oui. Vos données sont chiffrées et stockées sur des infrastructures sécurisées. Vos coordonnées personnelles (téléphone, email) ne sont visibles que par les utilisateurs avec qui vous avez un échange actif. Consultez notre politique de confidentialité pour plus de détails.",
      },
    ],
  },
  {
    key: 'reviews',
    name: 'Avis & Notation',
    questions: [
      {
        q: 'Puis-je laisser un avis sur un prof ?',
        a: "Oui, mais uniquement après avoir terminé un cours avec lui. Cette règle garantit que tous les avis proviennent de parents ayant réellement utilisé les services du prof.",
      },
      {
        q: 'Puis-je modifier ou supprimer mon avis ?',
        a: "Vous pouvez modifier votre avis dans les 7 jours suivant sa publication. Après ce délai, il devient définitif pour préserver la fiabilité du système de notation.",
      },
      {
        q: 'Comment signaler un avis inapproprié ?',
        a: "Sur chaque avis, cliquez sur l'icône de signalement (drapeau). Indiquez la raison si vous le souhaitez. Notre équipe de modération examinera le signalement rapidement.",
      },
      {
        q: 'Le prof peut-il répondre à mon avis ?',
        a: "Oui, les enseignants peuvent publier une réponse publique à chaque avis reçu. Cette réponse apparaît sous l'avis concerné et permet d'apporter des précisions ou un contexte.",
      },
    ],
  },
];

const FAQ_CONTENT_EN: FAQCategory[] = [
  {
    key: 'general',
    name: 'General',
    questions: [
      {
        q: `What is ${BRAND.name}?`,
        a: `${BRAND.name} is a platform that connects parents and private teachers. Parents can search for teachers by subject, level, and city, chat with them directly, and organize lessons at home or online.`,
      },
      {
        q: 'Is the platform free?',
        a: `Yes, using ${BRAND.name} is 100% free for parents: search, view profiles, chat with teachers, and send lesson requests. No subscription, no hidden fees.`,
      },
      {
        q: 'In which cities are you available?',
        a: 'We cover several cities, and the list keeps growing. Check the search filters on the teachers page to see the cities available near you.',
      },
      {
        q: 'How does the connection work?',
        a: 'You find a teacher that fits your needs, and send them a lesson request through the platform. If they accept, you receive their contact details to organize the first lesson directly with them.',
      },
    ],
  },
  {
    key: 'parents',
    name: 'Parents',
    questions: [
      {
        q: 'How do I create a parent account?',
        a: `Click "Sign up" at the top of the page, choose the "Parent" role, fill in your information (first name, last name, email). You can then search for teachers and send lesson requests.`,
      },
      {
        q: 'How do I add my children?',
        a: 'From your personal space, go to "My profile" then "Manage my children". You can add the first name, birth date, school level, and school of each child. This information helps teachers better understand your needs.',
      },
      {
        q: 'Can I save teachers for later?',
        a: 'Yes. On each teacher profile, click the heart icon "Save". You will find all your favorite teachers in the "Favorites" tab of your personal space.',
      },
      {
        q: 'How do I contact a teacher?',
        a: 'Search for a teacher, open their profile, then click "Request a lesson". Briefly describe your needs (subject, level, availability). If the teacher accepts, their contact details will appear in your "My requests" space.',
      },
      {
        q: 'What happens if a teacher declines my request?',
        a: 'You will receive an email notification. You can then search for another available teacher. A decline is never final: you can contact other teachers on the platform at any time.',
      },
    ],
  },
  {
    key: 'teachers',
    name: 'Teachers',
    questions: [
      {
        q: 'How do I become a teacher on the platform?',
        a: `Click "Sign up", choose the "Teacher" role, then complete your profile: headline, subjects, levels, hourly rate, availability. Our team then verifies your profile before validation.`,
      },
      {
        q: 'How long does profile validation take?',
        a: 'Our team reviews each profile manually. The usual delay is 24 to 72 business hours. You will receive an email as soon as your profile is validated or if additional information is needed.',
      },
      {
        q: 'Why was my profile rejected?',
        a: 'The most common reasons: incomplete information, unverifiable titles or diplomas, inappropriate profile photo, or unclear description. You receive an email detailing the reason, and you can fix it then resubmit your profile.',
      },
      {
        q: 'How do I receive lesson requests?',
        a: 'Once your profile is validated and marked as available, parents can find you in search and send you requests. You receive an email notification for each new request.',
      },
      {
        q: 'Can I set my own rate?',
        a: 'Yes, you freely set your hourly rate (or per session, week, month) in your profile. Parents see this rate directly during their search.',
      },
      {
        q: 'Can I offer both home and online lessons?',
        a: 'Yes. In your profile, select the mode "At home", "Online", or "Both". Parents can filter their search by teaching mode.',
      },
    ],
  },
  {
    key: 'account',
    name: 'Account & Security',
    questions: [
      {
        q: 'How do I delete my profile (parent or teacher)?',
        a: 'From your dashboard, open the "Danger zone" card at the bottom of the sidebar. Click "Delete my profile" to remove the role in question. Your Actoos ID account remains active on other products (Jobs, Vitrine).',
      },
      {
        q: 'Can I have both a parent and teacher profile?',
        a: 'Yes, absolutely. A single account can hold both roles. You switch from one space to the other via the selector at the top of the dashboard.',
      },
      {
        q: 'What happens if my account is suspended?',
        a: 'If your account is suspended, you will be redirected to a dedicated page showing the reason. You can contact our team by email at contact@actoos.com to appeal the decision.',
      },
      {
        q: 'How do I change my password or email?',
        a: 'Use the "Forgot password" link on the login page, or access the account settings from your personal space menu.',
      },
      {
        q: 'Is my personal data protected?',
        a: 'Yes. Your data is encrypted and stored on secure infrastructure. Your personal contact details (phone, email) are only visible to users with whom you have an active exchange. See our privacy policy for more details.',
      },
    ],
  },
  {
    key: 'reviews',
    name: 'Reviews & Rating',
    questions: [
      {
        q: 'Can I leave a review about a teacher?',
        a: 'Yes, but only after completing a lesson with them. This rule ensures that all reviews come from parents who have actually used the teacher\'s services.',
      },
      {
        q: 'Can I edit or delete my review?',
        a: 'You can edit your review within 7 days of publication. After this period, it becomes final to preserve the reliability of the rating system.',
      },
      {
        q: 'How do I report an inappropriate review?',
        a: 'On each review, click the report icon (flag). Indicate the reason if you wish. Our moderation team will review the report quickly.',
      },
      {
        q: 'Can the teacher reply to my review?',
        a: 'Yes, teachers can post a public reply to each review received. This reply appears under the review and allows them to provide clarifications or context.',
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════
export default function FAQPage() {
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<string>('__all__');

  const FAQ_CONTENT = isFr ? FAQ_CONTENT_FR : FAQ_CONTENT_EN;
  const ALL_LABEL = isFr ? 'Toutes' : 'All';

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredCategories = useMemo(() => {
    const kw = search.trim().toLowerCase();

    return FAQ_CONTENT
      .map(cat => ({
        ...cat,
        questions: cat.questions.filter(q =>
          !kw ||
          q.q.toLowerCase().includes(kw) ||
          q.a.toLowerCase().includes(kw)
        ),
      }))
      .filter(cat => {
        if (activeCategory !== '__all__' && cat.key !== activeCategory) return false;
        return cat.questions.length > 0;
      });
  }, [FAQ_CONTENT, activeCategory, search]);

  const totalResults = useMemo(
    () => filteredCategories.reduce((sum, c) => sum + c.questions.length, 0),
    [filteredCategories]
  );

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
              <HelpCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-medium">
              {isFr ? 'Aide & Support' : 'Help & Support'}
            </p>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            {isFr ? 'Foire aux questions' : 'Frequently asked questions'}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            {isFr
              ? `Trouvez rapidement une réponse à vos questions sur ${BRAND.name}.`
              : `Quickly find an answer to your questions about ${BRAND.name}.`}
          </p>
        </div>
      </div>

      {/* ═══════════ CONTENU ═══════════ */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

        {/* Barre de recherche */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={
              isFr
                ? 'Rechercher une question…'
                : 'Search a question…'
            }
            className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-colors"
          />
        </div>

        {/* Badges catégories */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          <button
            onClick={() => setActiveCategory('__all__')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activeCategory === '__all__'
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-600'
            }`}
          >
            {ALL_LABEL}
          </button>
          {FAQ_CONTENT.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeCategory === cat.key
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Compteur résultats */}
        {search.trim() && (
          <p className="text-xs text-slate-500 text-center mb-6">
            {isFr
              ? `${totalResults} résultat${totalResults > 1 ? 's' : ''} pour "${search}"`
              : `${totalResults} result${totalResults !== 1 ? 's' : ''} for "${search}"`}
          </p>
        )}

        {/* ═══ RÉSULTATS ═══ */}
        {filteredCategories.length === 0 ? (
          /* ─── EMPTY STATE ─── */
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-10 text-center">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-700 text-base font-medium mb-2">
              {isFr
                ? `Aucun résultat pour "${search}"`
                : `No result for "${search}"`}
            </p>
            <p className="text-slate-500 text-sm">
              {isFr
                ? 'Essayez avec d\'autres mots-clés ou parcourez les catégories.'
                : 'Try other keywords or browse the categories.'}
            </p>
            <button
              onClick={() => {
                setSearch('');
                setActiveCategory('__all__');
              }}
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {isFr ? 'Réinitialiser la recherche' : 'Reset search'}
            </button>
          </div>
        ) : (
          filteredCategories.map(cat => (
            <div key={cat.key} className="mb-8">
              <h2 className="text-base font-semibold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-emerald-500 rounded-full" />
                {cat.name}
              </h2>

              <div className="space-y-2">
                {cat.questions.map((item, idx) => {
                  const key = `${cat.key}-${idx}`;
                  const isOpen = Boolean(openItems[key]);
                  return (
                    <div
                      key={key}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors"
                    >
                      <button
                        onClick={() => toggleItem(key)}
                        aria-expanded={isOpen}
                        className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                      >
                        <span className="font-medium text-slate-900 text-sm leading-snug">
                          {item.q}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-emerald-600' : ''
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed whitespace-pre-line border-t border-slate-100">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* ═══ CONTACT CTA ═══ */}
        {!search.trim() && filteredCategories.length > 0 && (
          <div className="mt-12 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/40 p-6 sm:p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {isFr
                ? 'Vous ne trouvez pas votre réponse ?'
                : 'Can\'t find your answer?'}
            </h3>
            <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
              {isFr
                ? 'Écrivez-nous directement, nous vous répondrons dès que possible.'
                : 'Write to us directly, we will reply as soon as possible.'}
            </p>
            <Link
              href="/contact"
              prefetch
              className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors"
            >
              {isFr ? 'Nous contacter' : 'Contact us'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}