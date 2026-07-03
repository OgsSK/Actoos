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
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 xl:grid-cols-4">
          {/* Logo et description */}
          <div>
            <Link to="/" className="text-2xl font-semibold tracking-tight text-white">
              Actoos <span className="text-blue-500">Jobs</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Section Candidats */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
              {t('footer.sections.candidates.title')}
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li>
                <Link to="/emplois" className="transition-colors hover:text-white">
                  {t('footer.sections.candidates.links.search')}
                </Link>
              </li>
              {!user && (
                <li>
                  <Link to="/inscription" className="transition-colors hover:text-white">
                    {t('footer.sections.candidates.links.createAccount')}
                  </Link>
                </li>
              )}
              <li>
                <Link to={candidateDashboardLink} className="transition-colors hover:text-white">
                  {t('footer.sections.candidates.links.dashboard')}
                </Link>
              </li>
              {isCandidate && (
                <li>
                  <Link to="/blog" className="transition-colors hover:text-white">
                    {t('footer.sections.candidates.links.careerTips')}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Section Entreprises */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
              {t('footer.sections.companies.title')}
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li>
                <Link to={companyPublishLink} className="transition-colors hover:text-white">
                  {t('footer.sections.companies.links.publishOffer')}
                </Link>
              </li>
              <li>
                <Link to={companyDashboardLink} className="transition-colors hover:text-white">
                  {t('footer.sections.companies.links.dashboard')}
                </Link>
              </li>
              {isCompany && (
                <li>
                  <Link to="/tarifs" className="transition-colors hover:text-white">
                    {t('footer.sections.companies.links.pricing')}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Section Informations */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
              {t('footer.sections.info.title')}
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li><Link to="/a-propos" className="transition-colors hover:text-white">{t('footer.sections.info.links.about')}</Link></li>
              <li><Link to="/faq" className="transition-colors hover:text-white">{t('footer.sections.info.links.faq')}</Link></li>
              <li><Link to="/cgu" className="transition-colors hover:text-white">{t('footer.sections.info.links.cgu')}</Link></li>
              <li><Link to="/confidentialite" className="transition-colors hover:text-white">{t('footer.sections.info.links.privacy')}</Link></li>
              <li><Link to="/cookies" className="transition-colors hover:text-white">{t('footer.sections.info.links.cookies')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 border-t border-slate-800 pt-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <div>
            <h3 className="text-base font-semibold text-white">
              {t('footer.contact.title')}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              {t('footer.contact.description')}
            </p>
          </div>

          <div className="space-y-4">
            <Link
              to="/contact"
              className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 sm:w-auto"
            >
              {t('footer.contact.button')}
            </Link>

            <FooterPreferences />
          </div>
        </div>

        <div className="mt-8 border-t border-slate-800 pt-6 text-sm text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
  <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
  <p className="text-xs text-slate-600">v1.0.0</p>
</div>
      </div>
    </footer>
  );
};

export default Footer;