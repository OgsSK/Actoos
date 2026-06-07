import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Phone } from 'lucide-react';

const Footer = () => {
  const { isCandidate, isCompany } = useAuth();

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="text-2xl font-bold text-white">
              Actoos <span className="text-blue-500">Jobs</span>
            </Link>
            <p className="mt-4 text-sm text-slate-400">
              La plateforme de recrutement nouvelle génération. Trouvez votre emploi idéal ou recrutez les meilleurs talents.
            </p>
          </div>

          {/* Candidats */}
          <div>
            <h3 className="text-white font-semibold mb-4">Candidats</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/emplois" className="hover:text-white transition-colors">
                  Rechercher un emploi
                </Link>
              </li>
              <li>
                <Link to="/inscription" className="hover:text-white transition-colors">
                  Créer mon compte
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  Mon espace candidat
                </Link>
              </li>
              {isCandidate && (
                <li>
                  <Link to="/blog" className="hover:text-white transition-colors">
                    Conseils carrière
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Entreprises */}
          <div>
            <h3 className="text-white font-semibold mb-4">Entreprises</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/inscription?type=entreprise" className="hover:text-white transition-colors">
                  Publier une offre
                </Link>
              </li>
              <li>
                <Link to="/dashboard/entreprise" className="hover:text-white transition-colors">
                  Espace recruteur
                </Link>
              </li>
              {isCompany && (
                <li>
                  <Link to="/tarifs" className="hover:text-white transition-colors">
                    Tarifs
                  </Link>
                </li>
              )}
              {/* Lien "Nous contacter" supprimé d'ici */}
            </ul>
          </div>

          {/* Informations (inclut FAQ) */}
          <div>
            <h3 className="text-white font-semibold mb-4">Informations</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/a-propos" className="hover:text-white transition-colors">
                  À propos
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/cgu" className="hover:text-white transition-colors">
                  CGU
                </Link>
              </li>
              <li>
                <Link to="/confidentialite" className="hover:text-white transition-colors">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-white transition-colors">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact amélioré – explicite et engageant */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-white font-semibold text-lg mb-2">Une question ?</h3>
              <p className="text-slate-400 text-sm max-w-md">
                Notre équipe est là pour vous aider. Consultez notre FAQ ou contactez-nous directement.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-6 text-sm text-slate-300">
                <a href="mailto:contact@actoos.com" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail className="w-5 h-5 text-blue-400" />
                  contact@actoos.com
                </a>
                <a href="tel:+32465743661" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="w-5 h-5 text-blue-400" />
                  +32 465 74 36 61
                </a>
              </div>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Nous contacter
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Actoos Jobs. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;