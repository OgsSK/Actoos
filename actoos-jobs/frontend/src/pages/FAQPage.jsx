import React, { useState } from 'react';
import { Search, ChevronDown, HelpCircle } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

const FAQ_CATEGORIES = [
  {
    name: 'Général',
    questions: [
      {
        q: "Qu'est-ce qu'Actoos Jobs ?",
        a: "Actoos Jobs est la plateforme de recrutement leader au Mali et en Afrique de l'Ouest. Nous connectons les candidats qualifiés avec les entreprises locales et internationales. Vous pouvez rechercher des offres, postuler facilement, et suivre vos candidatures. Les recruteurs peuvent publier des offres, gérer les candidatures et planifier des entretiens, le tout gratuitement avec une option d'abonnement premium."
      },
      {
        q: "L'inscription est-elle gratuite ?",
        a: "Oui, l'inscription et l'utilisation de base sont entièrement gratuites pour les candidats. Les entreprises peuvent également créer un compte gratuitement et publier un nombre limité d'offres. Des plans payants sont disponibles pour des fonctionnalités avancées (plus d'offres, visibilité accrue, etc.)."
      },
      {
        q: "Comment créer un compte ?",
        a: "Cliquez sur 'S'inscrire' en haut à droite du site. Vous pouvez choisir un compte Candidat ou Entreprise. Remplissez le formulaire avec votre email et un mot de passe, ou connectez-vous rapidement avec Google. Votre compte sera créé instantanément."
      }
    ]
  },
  {
    name: 'Candidats',
    questions: [
      {
        q: "Comment postuler à une offre ?",
        a: "Parcourez les offres depuis la page 'Emplois'. Cliquez sur une offre pour voir les détails, puis sur 'Postuler'. Si vous n'avez pas encore complété votre profil, nous vous inviterons à le faire pour optimiser vos chances. Une fois votre candidature envoyée, l'entreprise est immédiatement notifiée."
      },
      {
        q: "Qu'est-ce que le score de matching ?",
        a: "C'est une estimation de la correspondance entre votre profil et une offre. Plus le score est élevé, plus vos compétences, votre expérience et vos préférences salariales correspondent à ce que recherche l'employeur. Il vous aide à identifier les offres les plus prometteuses pour vous."
      },
      {
        q: "Puis-je sauvegarder des offres pour plus tard ?",
        a: "Absolument. Cliquez sur le cœur en haut à droite de l'offre pour l'ajouter à vos favoris. Retrouvez-les dans votre tableau de bord, rubrique 'Offres sauvegardées'."
      },
      {
        q: "Comment fonctionnent les alertes emploi ?",
        a: "Depuis votre tableau de bord, accédez à 'Alertes emploi'. Définissez vos critères (mots-clés, ville, catégorie, salaire minimum, fréquence). Vous recevrez un email dès qu'une offre correspondante est publiée."
      },
      {
        q: "Que faire si je rencontre un problème technique ?",
        a: "Vous pouvez nous contacter via le formulaire de contact (page Contact) ou signaler un contenu inapproprié directement depuis l'offre. Notre équipe intervient rapidement."
      }
    ]
  },
  {
    name: 'Recruteurs / Entreprises',
    questions: [
      {
        q: "Comment créer un profil entreprise ?",
        a: "Après avoir créé un compte de type 'Entreprise', accédez à votre tableau de bord et cliquez sur 'Créer mon entreprise'. Remplissez les informations demandées (nom, secteur, description, logo, etc.). Votre entreprise sera soumise à validation par notre équipe. Une fois validée, vous pourrez publier des offres."
      },
      {
        q: "Pourquoi mon entreprise est-elle en attente de validation ?",
        a: "Pour garantir la qualité et la fiabilité des offres, nous vérifions manuellement chaque nouvelle entreprise. Cela prend généralement moins de 24 heures. Vous serez notifié par email dès la validation. En attendant, vous pouvez préparer vos offres en brouillon."
      },
      {
        q: "Combien d'offres puis-je publier ?",
        a: "Avec le plan gratuit, vous pouvez publier 1 offre active. Les plans Pro et Business permettent de publier plus d'offres simultanément. Vous pouvez toujours enregistrer des brouillons sans limite. Consultez la page 'Tarifs' pour plus de détails."
      },
      {
        q: "Comment gérer les candidatures reçues ?",
        a: "Dans votre tableau de bord, allez dans 'Candidatures'. Vous verrez toutes les candidatures classées par offre. Vous pouvez changer le statut (vue, présélectionnée, entretien, acceptée, refusée). Le candidat sera notifié automatiquement par email."
      },
      {
        q: "Puis-je planifier un entretien vidéo directement depuis la plateforme ?",
        a: "Oui, sur la page de détail d'une candidature, vous pouvez générer un lien de visioconférence Jitsi en un clic et l'envoyer par email au candidat. Vous pouvez aussi utiliser notre assistant IA pour préparer des questions d'entretien personnalisées."
      },
      {
        q: "Comment résilier mon abonnement payant ?",
        a: "Allez dans votre tableau de bord, dans la section abonnement, cliquez sur 'Résilier'. Vous pourrez indiquer la raison (optionnelle). Votre abonnement sera immédiatement rétrogradé en plan gratuit. Vous ne serez plus facturé."
      }
    ]
  },
  {
    name: 'Abonnements et Paiements',
    questions: [
      {
        q: "Quels sont les moyens de paiement acceptés ?",
        a: "Nous acceptons les cartes bancaires (Visa, Mastercard) via notre partenaire Stripe. Tous les paiements sont sécurisés et en francs CFA (XOF)."
      },
      {
        q: "Puis-je changer de plan à tout moment ?",
        a: "Oui, vous pouvez passer à un plan supérieur ou inférieur. La différence sera calculée au prorata. Les plans annuels offrent une réduction de 20%."
      },
      {
        q: "Que se passe-t-il après une résiliation ?",
        a: "Votre compte reste actif et vos offres publiées restent en ligne jusqu'à leur expiration. Vous repassez en plan gratuit et perdez l'accès aux fonctionnalités premium (offres supplémentaires, boosts, etc.)."
      }
    ]
  },
  {
    name: 'Sécurité et confidentialité',
    questions: [
      {
        q: "Mes données personnelles sont-elles protégées ?",
        a: "Oui. Nous appliquons une politique de confidentialité stricte. Vos informations ne sont jamais partagées sans votre consentement. Consultez notre page 'Confidentialité' pour plus de détails."
      },
      {
        q: "Comment signaler une offre frauduleuse ou un abus ?",
        a: "Sur chaque offre et chaque page entreprise, vous trouverez un bouton 'Signaler'. Sélectionnez le motif et décrivez le problème. Notre équipe de modération examine chaque signalement dans les plus brefs délais."
      },
      {
        q: "Puis-je supprimer mon compte ?",
        a: "Oui, contactez-nous via le formulaire de contact en indiquant votre demande. Nous procéderons à la suppression de votre compte et de toutes les données associées conformément à la réglementation."
      }
    ]
  }
];

const FAQPage = () => {
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState({});
  const [activeCategory, setActiveCategory] = useState('Toutes');

  const toggleItem = (key) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const filteredCategories = FAQ_CATEGORIES.filter(cat => {
    if (activeCategory !== 'Toutes' && cat.name !== activeCategory) return false;
    if (!search) return true;
    return cat.questions.some(
      q => q.q.toLowerCase().includes(search.toLowerCase()) ||
           q.a.toLowerCase().includes(search.toLowerCase())
    );
  }).map(cat => ({
    ...cat,
    questions: search
      ? cat.questions.filter(q =>
          q.q.toLowerCase().includes(search.toLowerCase()) ||
          q.a.toLowerCase().includes(search.toLowerCase())
        )
      : cat.questions
  })).filter(cat => cat.questions.length > 0);

  const categoriesList = ['Toutes', ...FAQ_CATEGORIES.map(c => c.name)];

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Foire Aux Questions</h1>
          <p className="text-slate-600 max-w-lg mx-auto">
            Trouvez rapidement des réponses à vos questions sur Actoos Jobs.
          </p>
        </div>

        {/* Barre de recherche améliorée */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <Input
            placeholder="Rechercher une question..."
            value={search}
            onChange={handleSearch}
            className="pl-12 pr-4 py-3 text-lg bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
          />
        </div>

        {/* Filtres de catégories */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categoriesList.map(cat => (
            <Badge
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'cursor-pointer px-4 py-2 text-sm font-medium rounded-full border transition-colors',
                activeCategory === cat
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Résultats */}
        {filteredCategories.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-300 bg-white/50">
            <CardContent className="p-8 text-center">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg">
                Aucune question trouvée pour "{search}"
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Essayez avec d'autres mots-clés ou parcourez les catégories.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCategories.map((cat) => (
            <div key={cat.name} className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">{cat.name}</h2>
              <div className="space-y-3">
                {cat.questions.map((item, idx) => {
                  const key = `${cat.name}-${idx}`;
                  const isOpen = openItems[key];
                  return (
                    <Card key={key} className="border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <span className="font-medium text-slate-900 pr-4">{item.q}</span>
                        <ChevronDown
                          className={cn(
                            'w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0',
                            isOpen ? 'rotate-180' : ''
                          )}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-4 text-slate-600 leading-relaxed text-sm whitespace-pre-line">
                          {item.a}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FAQPage;