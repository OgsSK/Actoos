'use client';

import { Check } from 'lucide-react';

export type Availability = {
  [day: string]: string[];
};

const DAYS = [
  { key: 'mon', fr: 'Lundi', en: 'Monday', shortFr: 'Lun', shortEn: 'Mon' },
  { key: 'tue', fr: 'Mardi', en: 'Tuesday', shortFr: 'Mar', shortEn: 'Tue' },
  { key: 'wed', fr: 'Mercredi', en: 'Wednesday', shortFr: 'Mer', shortEn: 'Wed' },
  { key: 'thu', fr: 'Jeudi', en: 'Thursday', shortFr: 'Jeu', shortEn: 'Thu' },
  { key: 'fri', fr: 'Vendredi', en: 'Friday', shortFr: 'Ven', shortEn: 'Fri' },
  { key: 'sat', fr: 'Samedi', en: 'Saturday', shortFr: 'Sam', shortEn: 'Sat' },
  { key: 'sun', fr: 'Dimanche', en: 'Sunday', shortFr: 'Dim', shortEn: 'Sun' },
];

const PERIODS = [
  { key: 'morning', fr: 'Matin', en: 'Morning', hintFr: '8h – 12h', hintEn: '8am – 12pm' },
  { key: 'afternoon', fr: 'Après-midi', en: 'Afternoon', hintFr: '12h – 17h', hintEn: '12pm – 5pm' },
  { key: 'evening', fr: 'Soir', en: 'Evening', hintFr: '17h – 21h', hintEn: '5pm – 9pm' },
];

export default function AvailabilityPicker({
  value,
  onChange,
  isFr,
}: {
  value: Availability;
  onChange: (v: Availability) => void;
  isFr: boolean;
}) {
  function toggle(day: string, period: string) {
    const current = value[day] || [];
    const isSelected = current.includes(period);

    const next = isSelected
      ? current.filter(p => p !== period)
      : [...current, period];

    const newValue = { ...value };

    if (next.length === 0) {
      delete newValue[day];
    } else {
      newValue[day] = next;
    }

    onChange(newValue);
  }

  function isSelected(day: string, period: string) {
    return (value[day] || []).includes(period);
  }

  function selectAllWeekdays() {
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const newValue = { ...value };
    weekdays.forEach(day => {
      newValue[day] = ['morning', 'afternoon', 'evening'];
    });
    onChange(newValue);
  }

  function selectWeekends() {
    const newValue = { ...value };
    ['sat', 'sun'].forEach(day => {
      newValue[day] = ['morning', 'afternoon', 'evening'];
    });
    onChange(newValue);
  }

  function clearAll() {
    onChange({});
  }

  const hasAnySelection = Object.keys(value).length > 0;

  return (
    <div className="space-y-4">

      {/* Raccourcis */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAllWeekdays}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          {isFr ? 'En semaine' : 'Weekdays'}
        </button>
        <button
          type="button"
          onClick={selectWeekends}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          {isFr ? 'Weekends' : 'Weekends'}
        </button>
        {hasAnySelection && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:border-red-300 hover:text-red-500 transition-colors"
          >
            {isFr ? 'Tout effacer' : 'Clear all'}
          </button>
        )}
      </div>

      {/* Grille des jours */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        {DAYS.map((day, dayIndex) => {
          const daySelected = value[day.key] || [];
          const isLast = dayIndex === DAYS.length - 1;

          return (
            <div
              key={day.key}
              className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 ${
                !isLast ? 'border-b border-slate-100' : ''
              }`}
            >
              {/* Nom du jour */}
              <div className="shrink-0 sm:w-28">
                <p className="text-sm font-semibold text-slate-900">
                  <span className="hidden sm:inline">
                    {isFr ? day.fr : day.en}
                  </span>
                  <span className="sm:hidden">
                    {isFr ? day.fr : day.en}
                  </span>
                </p>
              </div>

              {/* Boutons de créneaux */}
              <div className="grid grid-cols-3 gap-2 flex-1">
                {PERIODS.map(period => {
                  const active = isSelected(day.key, period.key);

                  return (
                    <button
                      key={period.key}
                      type="button"
                      onClick={() => toggle(day.key, period.key)}
                      className={`group relative h-12 px-2 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-1.5 ${
                        active
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600'
                      }`}
                    >
                      {active && (
                        <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                          <Check size={10} className="text-white" strokeWidth={3} />
                        </span>
                      )}
                      <span className="text-xs font-medium truncate">
                        {isFr ? period.fr : period.en}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Compteur */}
      {hasAnySelection && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          {(() => {
            const slots = Object.values(value).reduce(
              (acc, periods) => acc + periods.length,
              0
            );
            const days = Object.keys(value).length;
            return isFr
              ? `${slots} créneau${slots > 1 ? 'x' : ''} sur ${days} jour${days > 1 ? 's' : ''}`
              : `${slots} slot${slots > 1 ? 's' : ''} across ${days} day${days > 1 ? 's' : ''}`;
          })()}
        </div>
      )}
    </div>
  );
}

export function formatAvailability(value: Availability, isFr: boolean): string {
  const parts: string[] = [];
  for (const d of DAYS) {
    const periods = value[d.key];
    if (!periods || periods.length === 0) continue;
    const dayLabel = isFr ? d.fr : d.en;
    const periodLabels = periods
      .map(p => {
        const found = PERIODS.find(x => x.key === p);
        return found ? (isFr ? found.fr : found.en) : p;
      })
      .join(', ');
    parts.push(`${dayLabel}: ${periodLabels}`);
  }
  return parts.join(' · ');
}