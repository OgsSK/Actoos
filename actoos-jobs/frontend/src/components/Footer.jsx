import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import FooterPreferences from '../components/FooterPreferences';

const Footer = () => {
  const { t } = useTranslation();
  const { isCandidate, isCompany, isAdmin, user, activeCompanyId } = useAuth();

  // --- Liens dynamiques pour la section Candidats ---
  const candidateDashboardLink = user
    ? (isCandidate
        ? '/dashboard/candidat'
        : isCompany
          ? '/inscription'            // entreprise → création compte candidat
          : '/admin')                 // admin → dashboard admin (ou changer si souhaité)
    : '/connexion';

  // --- Liens dynamiques pour la section Entreprises ---
  const companyPublishLink = user && isCompany
    ? (activeCompanyId ? '/dashboard/entreprise/offres/nouvelle' : '/dashboard/entreprise/creer')
    : '/inscription?type=entreprise';

  const companyDashboardLink = user && isCompany
    ? (activeCompanyId ? '/dashboard/entreprise' : '/dashboard/entreprise/creer')
    : '/inscription?type=entreprise';

  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Logo et description */}
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="text-2xl font-bold text-slate-900">
              Actoos <span className="text-blue-600">Jobs</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Section Candidats */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {t('footer.sections.candidates.title')}
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link to="/emplois" className="text-slate-500 transition-colors hover:text-slate-900">
                  {t('footer.sections.candidates.links.search')}
                </Link>
              </li>
              {!user && (
                <li>
                  <Link to="/inscription" className="text-slate-500 transition-colors hover:text-slate-900">
                    {t('footer.sections.candidates.links.createAccount')}
                  </Link>
                </li>
              )}
              <li>
                <Link to={candidateDashboardLink} className="text-slate-500 transition-colors hover:text-slate-900">
                  {t('footer.sections.candidates.links.dashboard')}
                </Link>
              </li>
              {isCandidate && (
                <li>
                  <Link to="/blog" className="text-slate-500 transition-colors hover:text-slate-900">
                    {t('footer.sections.candidates.links.careerTips')}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Section Entreprises */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {t('footer.sections.companies.title')}
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link to={companyPublishLink} className="text-slate-500 transition-colors hover:text-slate-900">
                  {t('footer.sections.companies.links.publishOffer')}
                </Link>
              </li>
              <li>
                <Link to={companyDashboardLink} className="text-slate-500 transition-colors hover:text-slate-900">
                  {t('footer.sections.companies.links.dashboard')}
                </Link>
              </li>
              {isCompany && (
                <li>
                  <Link to="/tarifs" className="text-slate-500 transition-colors hover:text-slate-900">
                    {t('footer.sections.companies.links.pricing')}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Section Informations */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {t('footer.sections.info.title')}
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li><Link to="/a-propos" className="text-slate-500 transition-colors hover:text-slate-900">{t('footer.sections.info.links.about')}</Link></li>
              <li><Link to="/faq" className="text-slate-500 transition-colors hover:text-slate-900">{t('footer.sections.info.links.faq')}</Link></li>
              <li><Link to="/cgu" className="text-slate-500 transition-colors hover:text-slate-900">{t('footer.sections.info.links.cgu')}</Link></li>
              <li><Link to="/confidentialite" className="text-slate-500 transition-colors hover:text-slate-900">{t('footer.sections.info.links.privacy')}</Link></li>
              <li><Link to="/cookies" className="text-slate-500 transition-colors hover:text-slate-900">{t('footer.sections.info.links.cookies')}</Link></li>
            </ul>
          </div>
        </div>

        {/* Contact et sélecteurs sur la même ligne */}
        <div className="mt-12 border-t border-slate-100 pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {t('footer.contact.title')}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {t('footer.contact.description')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
  to="/contact"
  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition-colors duration-200 hover:border-blue-600 hover:text-blue-600 hover:bg-slate-50 whitespace-nowrap"
>
  {t('footer.contact.button')}
</Link>
            <FooterPreferences variant="light" />
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6 flex flex-col items-center text-center gap-2 sm:flex-row sm:justify-between sm:items-center sm:text-left">
  <p className="text-sm text-slate-400">
    {t('footer.copyright', { year: new Date().getFullYear() })}
  </p>

  <p className="text-xs text-slate-400">
    v1.0.0
  </p>
</div>
      </div>
    </footer>
  );
};

export default Footer;