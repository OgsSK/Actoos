import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { BRAND } from '@/lib/brand';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      {/* Newsletter haut */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-white font-bold text-lg mb-1">
                Recevez nos nouveautés en avant-première
              </h3>
              <p className="text-sm text-slate-400">
                Nouvelles collections, restocks, promos exclusives.
              </p>
            </div>
            <form className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="votre@email.com"
                className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-500 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-emerald-600 transition-colors whitespace-nowrap"
              >
                S'inscrire
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">

          {/* Colonne logo */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="inline-flex items-center mb-4">
              <span className="text-2xl font-black text-white tracking-tight">
                {BRAND.name}
              </span>
              <span className="ml-1 w-2 h-2 rounded-full bg-emerald-500" />
            </Link>
            <p className="text-sm leading-relaxed text-slate-400 mb-6 max-w-md">
              Boutique en ligne de football. Maillots, chaussures et équipements
              authentiques. Livraison Belgique & Mali.
            </p>

            {/* Contact */}
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-emerald-500 shrink-0" />
                <a
                  href="mailto:contact@strykos.com"
                  className="hover:text-white transition-colors"
                >
                  contact@strykos.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-emerald-500 shrink-0" />
                <span>Bruxelles, Belgique</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-emerald-500 shrink-0" />
                <span>+32 (à préciser)</span>
              </li>
            </ul>
          </div>

          {/* Boutique */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-wider">
              Boutique
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/c/maillots" className="hover:text-white transition-colors">Maillots</Link></li>
              <li><Link href="/c/chaussures" className="hover:text-white transition-colors">Chaussures</Link></li>
              <li><Link href="/c/equipements" className="hover:text-white transition-colors">Équipements</Link></li>
              <li><Link href="/c/maillots-clubs" className="hover:text-white transition-colors">Clubs</Link></li>
              <li><Link href="/c/maillots-selections" className="hover:text-white transition-colors">Sélections</Link></li>
            </ul>
          </div>

          {/* Aide */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-wider">
              Aide
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/livraison" className="hover:text-white transition-colors">Livraison</Link></li>
              <li><Link href="/retours" className="hover:text-white transition-colors">Retours & remboursements</Link></li>
              <li><Link href="/track" className="hover:text-white transition-colors">Suivre ma commande</Link></li>
              <li><Link href="/guide-tailles" className="hover:text-white transition-colors">Guide des tailles</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-wider">
              Légal
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/cgv" className="hover:text-white transition-colors">CGV</Link></li>
              <li><Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link></li>
              <li><Link href="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link></li>
              <li><Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link></li>
              <li><Link href="/authenticite" className="hover:text-white transition-colors">Authenticité</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mentions paiement + copyright */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            © {year} {BRAND.name}. Tous droits réservés. Boutique indépendante — non affiliée aux marques distribuées.
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Paiement sécurisé</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-white">VISA</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-white">MC</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-white">Stripe</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}