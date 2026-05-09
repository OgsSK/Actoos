import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  ArrowRight, ArrowLeft, Check, Wrench, Zap, Snowflake, 
  Sparkles, HardHat, Settings, Key, Leaf, Droplets,
  Sun, Wind, Paintbrush, Hammer, Truck
} from 'lucide-react';

const SectorsPage = () => {
  const navigate = useNavigate();

  const sectors = [
    {
      id: "plomberie",
      name: "Plomberie",
      icon: Droplets,
      color: "from-blue-500 to-blue-600",
      description: "Interventions de plomberie, dépannage, installation sanitaire",
      checklist: [
        "Vérification arrivée d'eau",
        "Test de pression",
        "Contrôle évacuation",
        "Photo avant/après",
        "Signature client"
      ],
      useCases: [
        "Réparation fuite",
        "Débouchage canalisation",
        "Installation chauffe-eau",
        "Remplacement robinetterie"
      ]
    },
    {
      id: "electricite",
      name: "Électricité",
      icon: Zap,
      color: "from-yellow-500 to-orange-500",
      description: "Travaux électriques, dépannage, mise aux normes",
      checklist: [
        "Coupure disjoncteur",
        "Test de tension",
        "Vérification terre",
        "Conformité NF C 15-100",
        "Photo tableau"
      ],
      useCases: [
        "Panne électrique",
        "Installation tableau",
        "Mise aux normes",
        "Pose prises/interrupteurs"
      ]
    },
    {
      id: "climatisation",
      name: "Climatisation",
      icon: Snowflake,
      color: "from-cyan-500 to-blue-500",
      description: "Installation, maintenance et dépannage climatisation",
      checklist: [
        "Niveau de gaz",
        "Nettoyage filtres",
        "Test température",
        "Vérification compresseur",
        "Contrôle évacuation"
      ],
      useCases: [
        "Installation clim",
        "Maintenance annuelle",
        "Recharge gaz",
        "Dépannage"
      ]
    },
    {
      id: "nettoyage",
      name: "Nettoyage",
      icon: Sparkles,
      color: "from-emerald-500 to-teal-500",
      description: "Nettoyage professionnel, bureaux, copropriétés",
      checklist: [
        "État des lieux avant",
        "Zones traitées",
        "Produits utilisés",
        "État des lieux après",
        "Validation client"
      ],
      useCases: [
        "Nettoyage bureaux",
        "Remise en état",
        "Vitres",
        "Parties communes"
      ]
    },
    {
      id: "btp",
      name: "BTP",
      icon: HardHat,
      color: "from-orange-500 to-red-500",
      description: "Chantiers, travaux de construction et rénovation",
      checklist: [
        "Sécurité chantier",
        "Matériaux livrés",
        "Avancement travaux",
        "Photos journalières",
        "Rapport de chantier"
      ],
      useCases: [
        "Rénovation",
        "Extension",
        "Maçonnerie",
        "Second œuvre"
      ]
    },
    {
      id: "maintenance",
      name: "Maintenance",
      icon: Settings,
      color: "from-slate-500 to-slate-700",
      description: "Maintenance préventive et curative, multi-technique",
      checklist: [
        "Inspection visuelle",
        "Tests fonctionnels",
        "Relevé compteurs",
        "Actions correctives",
        "Planning prochain passage"
      ],
      useCases: [
        "Contrat annuel",
        "Maintenance préventive",
        "Dépannage urgent",
        "Audit technique"
      ]
    },
    {
      id: "serrurerie",
      name: "Serrurerie",
      icon: Key,
      color: "from-amber-500 to-yellow-600",
      description: "Ouverture de porte, installation serrures, blindage",
      checklist: [
        "Type d'intervention",
        "Marque serrure",
        "Méthode ouverture",
        "Pièces remplacées",
        "Test fermeture"
      ],
      useCases: [
        "Ouverture porte",
        "Changement serrure",
        "Blindage porte",
        "Double de clés"
      ]
    },
    {
      id: "jardinage",
      name: "Espaces verts",
      icon: Leaf,
      color: "from-green-500 to-emerald-600",
      description: "Entretien jardins, espaces verts, élagage",
      checklist: [
        "Surface traitée",
        "Travaux effectués",
        "Évacuation déchets",
        "État végétation",
        "Prochaine intervention"
      ],
      useCases: [
        "Tonte pelouse",
        "Taille haies",
        "Élagage",
        "Entretien saisonnier"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-icon-site.png" alt="ACTOOS" className="h-9 w-9" />
            <span className="font-bold text-lg text-slate-900 hidden sm:inline">ACTOOS PRO</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Connexion
            </Button>
            <Button onClick={() => navigate('/signup')} className="bg-blue-600 hover:bg-blue-700">
              Essai gratuit
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <Button 
            variant="ghost" 
            className="mb-6 text-slate-500"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
          
          <Badge className="mb-6 bg-emerald-100 text-emerald-700">Secteurs d'activité</Badge>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            Un logiciel adapté à votre métier
          </h1>
          
          <p className="text-xl text-slate-600 mb-8">
            Actoos s'adapte à votre secteur avec des checklists, 
            workflows et formulaires spécifiques à chaque métier.
          </p>
        </div>
      </section>

      {/* Sectors Grid */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {sectors.map((sector) => {
              const Icon = sector.icon;
              return (
                <Card 
                  key={sector.id} 
                  className="overflow-hidden border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all group"
                >
                  <CardHeader className={`bg-gradient-to-r ${sector.color} text-white`}>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-white">{sector.name}</CardTitle>
                        <CardDescription className="text-white/80">
                          {sector.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                      {/* Checklist */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          Checklist type
                        </h4>
                        <ul className="space-y-2">
                          {sector.checklist.map((item, idx) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Use Cases */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">
                          Types d'interventions
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {sector.useCases.map((useCase, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary"
                              className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                            >
                              {useCase}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Multi-catégorie info */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-blue-100 text-blue-700">Flexibilité</Badge>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            Combinez plusieurs activités
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Votre entreprise fait de la plomberie ET de l'électricité ? 
            Pas de problème ! Avec le plan Pro, combinez jusqu'à 4 catégories. 
            En Entreprise, toutes les catégories sont disponibles.
          </p>
          
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            <Card className="border-slate-200">
              <CardContent className="p-6 text-center">
                <p className="text-4xl font-bold text-slate-900 mb-2">1</p>
                <p className="text-sm text-slate-600">catégorie</p>
                <p className="font-medium text-slate-700 mt-2">Plan Startup</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-6 text-center">
                <p className="text-4xl font-bold text-blue-600 mb-2">4</p>
                <p className="text-sm text-slate-600">catégories</p>
                <p className="font-medium text-blue-700 mt-2">Plan Pro</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-6 text-center">
                <p className="text-4xl font-bold text-purple-600 mb-2">∞</p>
                <p className="text-sm text-slate-600">catégories</p>
                <p className="font-medium text-purple-700 mt-2">Plan Entreprise</p>
              </CardContent>
            </Card>
          </div>

          <Button 
            size="lg" 
            onClick={() => navigate('/pricing')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Voir les tarifs
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Votre secteur n'est pas listé ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Actoos est entièrement personnalisable. Créez vos propres 
            catégories et checklists adaptées à votre métier.
          </p>
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-blue-50"
            onClick={() => navigate('/signup')}
          >
            Essayer gratuitement
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-slate-900 text-center">
        <p className="text-slate-400 text-sm">© {new Date().getFullYear()} Actoos. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

export default SectorsPage;
