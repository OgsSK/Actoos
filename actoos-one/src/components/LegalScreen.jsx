import { ArrowLeft } from 'lucide-react';

export function LegalScreen({ onBack }) {
  return (
    <div className="min-h-screen bg-white" data-testid="legal-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
            data-testid="legal-back-btn"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="font-semibold text-gray-900">Mentions Légales</h1>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Éditeur de l'application</h2>
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">Raison sociale :</span><br />
              [NOM_ENTREPRISE_LEGAL]
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">Forme juridique :</span><br />
              [FORME_JURIDIQUE]
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">Capital social :</span><br />
              [CAPITAL] FCFA
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">Siège social :</span><br />
              [ADRESSE_COMPLETE]<br />
              Bamako, Mali
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">RCCM :</span><br />
              [NUMERO_RCCM]
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">NIF :</span><br />
              [NUMERO_NIF]
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Directeur de la publication</h2>
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-sm text-gray-600">
              [NOM_DIRECTEUR_PUBLICATION]<br />
              [FONCTION]
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Hébergement</h2>
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">Hébergeur :</span><br />
              Supabase Inc.
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">Adresse :</span><br />
              970 Toa Payoh North, Singapore 318992
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Contact</h2>
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">Email :</span><br />
              contact@actoos.com
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">Téléphone :</span><br />
              +223 XX XX XX XX
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Propriété intellectuelle</h2>
          <p className="text-sm text-gray-600">
            L'ensemble des contenus (textes, images, graphismes, logo, icônes, sons, logiciels, etc.) 
            présents sur l'application Actoos sont protégés par le droit d'auteur et le droit des marques.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Toute reproduction, représentation, modification, publication, adaptation de tout ou partie 
            des éléments de l'application, quel que soit le moyen ou le procédé utilisé, est interdite, 
            sauf autorisation écrite préalable.
          </p>
        </section>

        <div className="bg-gray-100 rounded-2xl p-4 mt-8">
          <p className="text-xs text-gray-500 text-center">
            ACTOOS ONE tout droit réservé
          </p>
        </div>
      </div>
    </div>
  );
}
