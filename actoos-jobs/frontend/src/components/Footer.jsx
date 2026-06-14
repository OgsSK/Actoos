import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Phone } from 'lucide-react';
import FooterPreferences from '../components/FooterPreferences'; // 👈 Import ajouté

const Footer = () => {
  const { t } = useTranslation();
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
              {t('footer.brand.tagline')}
            </p>
          </div>

          {/* Candidats */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.sections.candidates.title')}</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/emplois" className="hover:text-white transition-colors">
                  {t('footer.sections.candidates.links.search')}
                </Link>
              </li>
              <li>
                <Link to="/inscription" className="hover:text-white transition-colors">
                  {t('footer.sections.candidates.links.createAccount')}
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  {t('footer.sections.candidates.links.dashboard')}
                </Link>
              </li>
              {isCandidate && (
                <li>
                  <Link to="/blog" className="hover:text-white transition-colors">
                    {t('footer.sections.candidates.links.careerTips')}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Entreprises */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.sections.companies.title')}</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/inscription?type=entreprise" className="hover:text-white transition-colors">
                  {t('footer.sections.companies.links.publishOffer')}
                </Link>
              </li>
              <li>
                <Link to="/dashboard/entreprise" className="hover:text-white transition-colors">
                  {t('footer.sections.companies.links.dashboard')}
                </Link>
              </li>
              {isCompany && (
                <li>
                  <Link to="/tarifs" className="hover:text-white transition-colors">
                    {t('footer.sections.companies.links.pricing')}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Informations */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.sections.info.title')}</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/a-propos" className="hover:text-white transition-colors">
                  {t('footer.sections.info.links.about')}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  {t('footer.sections.info.links.faq')}
                </Link>
              </li>
              <li>
                <Link to="/cgu" className="hover:text-white transition-colors">
                  {t('footer.sections.info.links.cgu')}
                </Link>
              </li>
              <li>
                <Link to="/confidentialite" className="hover:text-white transition-colors">
                  {t('footer.sections.info.links.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-white transition-colors">
                  {t('footer.sections.info.links.cookies')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-white font-semibold text-lg mb-2">{t('footer.contact.title')}</h3>
              <p className="text-slate-400 text-sm max-w-md">
                {t('footer.contact.description')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-6 text-sm text-slate-300">
                <a href={`mailto:${t('footer.contact.email')}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail className="w-5 h-5 text-blue-400" />
                  {t('footer.contact.email')}
                </a>
                <a href={`tel:${t('footer.contact.phone').replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="w-5 h-5 text-blue-400" />
                  {t('footer.contact.phone')}
                </a>
              </div>
              {/* Sélecteur de préférences placé à côté des liens de contact */}
              <FooterPreferences />
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {t('footer.contact.button')}
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;