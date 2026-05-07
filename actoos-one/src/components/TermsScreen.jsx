import { ArrowLeft } from 'lucide-react';

export function TermsScreen({ onBack }) {
  return (
    <div className="min-h-screen bg-white" data-testid="terms-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
            data-testid="terms-back-btn"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="font-semibold text-gray-900">Conditions Générales d'Utilisation</h1>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 prose prose-sm max-w-none">
        <p className="text-gray-500 text-sm mb-6">
          Dernière mise à jour : Décembre 2024
        </p>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">En-tête Légal</h2>
          <p className="text-gray-600 text-sm">
            L'application "Actoos" est éditée par :<br />
            <strong>[NOM_ENTREPRISE_LEGAL]</strong>
          </p>
          <p className="text-gray-600 text-sm mt-2">
            Siège Social :<br />
            <strong>[ADRESSE_SIEGE]</strong>
          </p>
          <p className="text-gray-600 text-sm mt-2">
            Registre du Commerce :<br />
            <strong>[NUMERO_REGISTRE]</strong>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Clause 1 — Validation de Livraison (Handshake OTP)
          </h2>
          <p className="text-gray-600 text-sm">
            Le transfert de responsabilité entre le Livreur et le Client est validé exclusivement 
            via le code de sécurité de livraison (OTP) généré par le système Actoos.
          </p>
          <p className="text-gray-600 text-sm mt-2">
            Une fois ce code confirmé dans l'application, la commande est réputée livrée et conforme.
          </p>
          <p className="text-gray-600 text-sm mt-2">
            Le Client est responsable de la confidentialité de son code de livraison.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Clause 2 — Wallet & PIN
          </h2>
          <p className="text-gray-600 text-sm">
            Toute transaction validée via le code PIN personnel de l'utilisateur est considérée 
            comme authentique et irrévocable.
          </p>
          <p className="text-gray-600 text-sm mt-2">
            En cas de perte ou de vol du téléphone, l'utilisateur doit immédiatement contacter 
            le support afin de bloquer son accès.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Clause 3 — Commandes en espèces & Caution Livreur
          </h2>
          <p className="text-gray-600 text-sm">
            Pour les commandes payées en espèces, le système peut débiter automatiquement le solde 
            virtuel du Livreur afin de reverser la part du Restaurant et la commission Actoos.
          </p>
          <p className="text-gray-600 text-sm mt-2">
            Le Livreur conserve les espèces physiques collectées auprès du Client.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Clause 4 — Données Personnelles
          </h2>
          <p className="text-gray-600 text-sm">
            Actoos collecte certaines données techniques, transactionnelles et de localisation afin :
          </p>
          <ul className="text-gray-600 text-sm mt-2 list-disc pl-5 space-y-1">
            <li>d'assurer le fonctionnement des livraisons,</li>
            <li>de prévenir la fraude,</li>
            <li>d'améliorer les algorithmes logistiques,</li>
            <li>et d'optimiser les futurs services financiers.</li>
          </ul>
          <p className="text-gray-600 text-sm mt-2">
            Ces données ne sont jamais revendues à des tiers non affiliés.
          </p>
        </section>

        <div className="bg-gray-100 rounded-2xl p-4 mt-8">
          <p className="text-xs text-gray-500 text-center">
            © 2024 ACTOOS ONE. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
}
