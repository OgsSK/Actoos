'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Suggestion {
  type: 'product' | 'brand';
  label: string;
  slug: string;
}

const supabase = createClient();

export default function SearchBar({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('search_suggestions', {
          p_query: query.trim(),
          p_limit: 5,
        });
        if (!error && Array.isArray(data)) {
          setSuggestions(data as Suggestion[]);
          setOpen(true);
        }
      } catch (err) {
        console.warn('[SearchBar] suggestions error', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Ferme au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSuggestionClick = (s: Suggestion) => {
    setOpen(false);
    setQuery('');
    if (s.type === 'product') {
      router.push(`/p/${s.slug}`);
    } else {
      router.push(`/brand/${s.slug}`);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  };

  const isDesktop = variant === 'desktop';

  return (
    <div ref={wrapperRef} className={`relative ${isDesktop ? 'flex-1 max-w-md' : 'w-full'}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={isDesktop ? 'Rechercher un produit, une marque…' : 'Rechercher…'}
          className="w-full bg-slate-100 border border-transparent rounded-lg pl-10 pr-10 py-2.5 text-sm outline-none focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-900/5 transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X size={14} />
          </button>
        )}
      </form>

      {/* Dropdown suggestions */}
      {open && (suggestions.length > 0 || loading) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
          {loading && suggestions.length === 0 ? (
            <div className="p-4 flex items-center justify-center text-slate-400">
              <Loader2 size={16} className="animate-spin" />
            </div>
          ) : (
            <ul>
              {suggestions.map((s, i) => (
                <li key={`${s.type}-${s.slug}-${i}`}>
                  <button
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700 truncate flex-1">
                      {s.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 shrink-0">
                      {s.type === 'product' ? 'Produit' : 'Marque'}
                    </span>
                  </button>
                </li>
              ))}
              <li className="border-t border-slate-100">
                <button
                  onClick={() => handleSubmit(new Event('submit') as any)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-900"
                >
                  Voir tous les résultats pour « {query} »
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}