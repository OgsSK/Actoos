'use client';

import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Header */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <a href="/" className="flex items-center space-x-3">
            <img src="/logo-icon.png" alt="Actoos" className="h-10 w-10 object-contain" />
            <div className="flex flex-col">
              <span className="font-black text-xl md:text-2xl tracking-tighter uppercase leading-none">
                ACTOOS<span className="text-[#D4AF37]">.</span>
              </span>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 hidden sm:block">
                Technology Group
              </span>
            </div>
          </a>
          <a 
            href="/"
            className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold"
          >
            <ArrowLeft size={18} />
            <span>Retour</span>
          </a>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
          Politique de Confidentialité<span className="text-[#D4AF37]">.</span>
        </h1>
        <p className="text-slate-400 text-sm mb-12">Dernière mise à jour : Janvier 2026</p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">1. Introduction</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              ACTOOS Group (&quot;nous&quot;, &quot;notre&quot;, &quot;nos&quot;) s&apos;engage à protéger la vie privée des utilisateurs 
              de nos services. Cette politique de confidentialité explique comment nous collectons, utilisons, 
              partageons et protégeons vos informations personnelles.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Cette politique s&apos;applique à tous nos produits et services, y compris Actoos Pro, Actoos One 
              et Actoos Pay.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">2. Données Collectées</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Nous collectons les types de données suivants :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li><strong>Données d&apos;identification</strong> : nom, prénom, adresse email, numéro de téléphone</li>
              <li><strong>Données professionnelles</strong> : nom de l&apos;entreprise, fonction, secteur d&apos;activité</li>
              <li><strong>Données techniques</strong> : adresse IP, type de navigateur, pages visitées</li>
              <li><strong>Données de transaction</strong> : historique des commandes, informations de paiement</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">3. Utilisation des Données</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Vos données sont utilisées pour :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Fournir et améliorer nos services</li>
              <li>Personnaliser votre expérience utilisateur</li>
              <li>Communiquer avec vous concernant nos services</li>
              <li>Assurer la sécurité de nos plateformes</li>
              <li>Respecter nos obligations légales</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">4. Cookies</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Nous utilisons des cookies pour :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li><strong>Cookies essentiels</strong> : nécessaires au fonctionnement du site</li>
              <li><strong>Cookies analytiques</strong> : comprendre comment les visiteurs utilisent notre site</li>
              <li><strong>Cookies de préférences</strong> : mémoriser vos choix et paramètres</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-4">
              Vous pouvez gérer vos préférences de cookies via le bandeau de consentement affiché lors de votre première visite.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">5. Partage des Données</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos données avec :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Nos prestataires de services (hébergement, paiement, analytics)</li>
              <li>Les autorités légales sur demande officielle</li>
              <li>Nos partenaires commerciaux avec votre consentement</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">6. Vos Droits (RGPD)</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li><strong>Droit d&apos;accès</strong> : obtenir une copie de vos données</li>
              <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
              <li><strong>Droit à l&apos;effacement</strong> : demander la suppression de vos données</li>
              <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong>Droit d&apos;opposition</strong> : vous opposer au traitement de vos données</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-4">
              Pour exercer ces droits, contactez-nous à : <a href="mailto:privacy@actoos.com" className="text-[#D4AF37] hover:underline">privacy@actoos.com</a>
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">7. Sécurité</h2>
            <p className="text-slate-600 leading-relaxed">
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger 
              vos données : chiffrement SSL/TLS, authentification forte, audits réguliers, et formation 
              de notre personnel.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-black tracking-tight mb-4">8. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              Pour toute question concernant cette politique ou vos données personnelles :<br /><br />
              <strong>ACTOOS Group</strong><br />
              Email : <a href="mailto:privacy@actoos.com" className="text-[#D4AF37] hover:underline">privacy@actoos.com</a><br />
              Adresse : Bruxelles, Belgique
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 py-8 px-6 border-t border-slate-100">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
          <p>© 2026 Actoos Group. All rights reserved.</p>
          <div className="flex space-x-8">
            <span className="text-slate-600">Privacy</span>
            <a href="/legal" className="hover:text-black transition-colors">Legal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
