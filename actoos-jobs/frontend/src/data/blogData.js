import { FileText, Target, TrendingUp, Lightbulb, Briefcase, Users } from 'lucide-react';

export const blogArticles = [
  {
    id: 1,
    title: 'Comment rédiger un CV qui se démarque en 2026',
    excerpt: 'Découvrez les meilleures pratiques pour créer un CV moderne et efficace qui attirera l\'attention des recruteurs.',
    content: `
      <h2>Introduction</h2>
      <p>Un CV bien rédigé est votre passeport pour décrocher un entretien. Voici les règles d'or pour 2026.</p>
      <h3>1. Personnalisez votre CV pour chaque offre</h3>
      <p>Adaptez le titre, les compétences et l'expérience en fonction de l'annonce.</p>
      <h3>2. Soignez la forme</h3>
      <p>Utilisez une mise en page aérée, une police lisible et un format PDF.</p>
      <h3>3. Mettez en avant vos réalisations</h3>
      <p>Quantifiez vos résultats : "Augmentation de 20% du chiffre d'affaires".</p>
      <p>Appliquez ces conseils et vous augmenterez vos chances d'être repéré.</p>
    `,
    category: 'Conseils CV',
    readTime: '5 min',
    author: 'Équipe Actoos',
    date: '25 Mai 2026',
    icon: 'FileText',
    color: 'blue',
  },
  {
    id: 2,
    title: 'Les 10 erreurs à éviter en entretien d\'embauche',
    excerpt: 'Préparez-vous au mieux pour vos entretiens en évitant ces erreurs courantes que font la plupart des candidats.',
    content: `
      <h2>Les erreurs fatales en entretien</h2>
      <p>Voici les pièges à éviter pour faire bonne impression.</p>
      <h3>1. Arriver en retard</h3>
      <p>Prévoyez une marge de 15 minutes.</p>
      <h3>2. Ne pas se renseigner sur l'entreprise</h3>
      <p>Montrez que vous connaissez leur activité et leurs valeurs.</p>
      <h3>3. Parler uniquement de soi</h3>
      <p>Posez des questions pertinentes sur le poste.</p>
      <p>Éviter ces erreurs vous aidera à réussir votre entretien.</p>
    `,
    category: 'Entretien',
    readTime: '7 min',
    author: 'Équipe Actoos',
    date: '23 Mai 2026',
    icon: 'Target',
    color: 'red',
  },
  {
    id: 3,
    title: 'Négocier son salaire : guide complet',
    excerpt: 'Apprenez à négocier votre salaire avec confiance et obtenez la rémunération que vous méritez.',
    content: `
      <h2>Pourquoi négocier ?</h2>
      <p>La négociation salariale est une étape cruciale. Voici comment vous y prendre.</p>
      <h3>1. Connaître sa valeur sur le marché</h3>
      <p>Utilisez des outils comme Glassdoor ou PayScale.</p>
      <h3>2. Attendre le bon moment</h3>
      <p>Abordez le sujet après avoir prouvé votre valeur.</p>
      <h3>3. Proposer une fourchette</h3>
      <p>Donnez une fourchette réaliste et justifiez-la.</p>
      <p>Avec ces conseils, vous maximiserez votre rémunération.</p>
    `,
    category: 'Salaire',
    readTime: '8 min',
    author: 'Équipe Actoos',
    date: '20 Mai 2026',
    icon: 'TrendingUp',
    color: 'green',
  },
  {
    id: 4,
    title: 'Reconversion professionnelle : par où commencer ?',
    excerpt: 'Vous souhaitez changer de carrière ? Voici les étapes clés pour réussir votre reconversion professionnelle.',
    content: `
      <h2>Bilan de compétences</h2>
      <p>Identifiez vos forces et vos aspirations.</p>
      <h3>1. Faire un point sur sa situation</h3>
      <p>Qu'est-ce qui vous motive vraiment ?</p>
      <h3>2. Se former</h3>
      <p>Explorez les formations disponibles, en ligne ou en présentiel.</p>
      <h3>3. Réseauter</h3>
      <p>Rencontrez des professionnels du secteur visé.</p>
      <p>Une reconversion réussie demande du temps et de la méthode.</p>
    `,
    category: 'Carrière',
    readTime: '10 min',
    author: 'Équipe Actoos',
    date: '18 Mai 2026',
    icon: 'Lightbulb',
    color: 'yellow',
  },
  {
    id: 5,
    title: 'Secteurs qui recrutent en 2026',
    excerpt: 'Découvrez les secteurs d\'activité les plus dynamiques et les métiers les plus recherchés cette année.',
    content: `
      <h2>Top secteurs porteurs</h2>
      <ul>
        <li>Technologie (IA, cybersécurité)</li>
        <li>Santé (soins à domicile, télémédecine)</li>
        <li>Énergies renouvelables</li>
        <li>Logistique et e-commerce</li>
      </ul>
      <p>Ces secteurs offrent de nombreuses opportunités partout dans le monde.</p>
    `,
    category: 'Marché emploi',
    readTime: '6 min',
    author: 'Équipe Actoos',
    date: '15 Mai 2026',
    icon: 'Briefcase',
    color: 'purple',
  },
  {
    id: 6,
    title: 'Développer son réseau professionnel efficacement',
    excerpt: 'Le networking est essentiel pour votre carrière. Voici comment construire et entretenir votre réseau.',
    content: `
      <h2>L'importance du réseau</h2>
      <p>Un bon réseau ouvre des portes. Voici comment le développer.</p>
      <h3>1. Participer à des événements</h3>
      <p>Conférences, meetups, salons professionnels.</p>
      <h3>2. Utiliser LinkedIn</h3>
      <p>Optimisez votre profil et interagissez régulièrement.</p>
      <h3>3. Donner avant de recevoir</h3>
      <p>Aidez les autres, partagez des ressources.</p>
    `,
    category: 'Networking',
    readTime: '5 min',
    author: 'Équipe Actoos',
    date: '12 Mai 2026',
    icon: 'Users',
    color: 'indigo',
  },
];

export const getArticleById = (id) => blogArticles.find(article => article.id === id) || null;