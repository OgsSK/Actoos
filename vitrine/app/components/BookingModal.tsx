'use client';
import { SUPABASE_FUNCTIONS_URL } from '../../lib/supabase-functions';
import { useState, useEffect } from 'react';
import { Calendar, Loader2, X, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';

interface BookingModalProps {
  clientName: string;
  clientEmail: string;
  projectName?: string;
  projectId?: string;
  onClose: () => void;
  onBooked?: () => void;
}

export default function BookingModal({
  clientName,
  clientEmail,
  projectName,
  projectId,
  onClose,
  onBooked,
}: BookingModalProps) {
  const { language } = useLanguage();
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      setSelectedSlot('');
      return;
    }
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setError(null);
      try {
        const res = await fetch(
          `${SUPABASE_FUNCTIONS_URL}/get-available-slots?date=${date}`
        );
        const data = await res.json();
        setSlots(data?.[0]?.slots || []);
      } catch (err) {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [date]);

  const handleBooking = async () => {
    if (!selectedSlot || !date) return;
    setBooking(true);
    setError(null);
    try {
      const res = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/book-slot`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            time: selectedSlot,
            client_name: clientName,
            client_email: clientEmail,
            project_name: projectName,
            project_id: projectId,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setBooked(true);
        if (onBooked) onBooked();
      } else {
        setError(data.error || t[language].bookingError);
      }
    } catch (err) {
      setError(t[language].bookingError);
    } finally {
      setBooking(false);
    }
  };

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 md:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {booked ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Check size={22} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {t[language].bookingSuccessTitle}
            </h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              {t[language].bookingSuccessMessage}
            </p>
            <button
              onClick={onClose}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors"
            >
              {t[language].bookingClose}
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-7">
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Calendar size={20} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {t[language].bookingTitle}
              </h3>
            </div>

            {/* Sélection de la date */}
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t[language].bookingSelectDate}
            </label>
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm mb-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors bg-white cursor-pointer"
            >
              <option value="">—</option>
              {generateDates().map((d) => (
                <option key={d} value={d}>
                  {new Date(d).toLocaleDateString(
                    language === 'fr' ? 'fr-FR' : 'en-US',
                    { weekday: 'long', day: 'numeric', month: 'long' }
                  )}
                </option>
              ))}
            </select>

            {/* Créneaux */}
            {date && (
              <>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {t[language].bookingAvailableSlots}
                </label>
                {loadingSlots ? (
                  <div className="flex justify-center py-6">
                    <Loader2 size={20} className="animate-spin text-slate-400" />
                  </div>
                ) : slots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                          selectedSlot === slot
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mb-6">
                    {t[language].bookingNoSlots}
                  </p>
                )}
              </>
            )}

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs mb-4">
                {error} {t[language].bookingRetry}
              </div>
            )}

            {/* Bouton confirmer */}
            <button
              onClick={handleBooking}
              disabled={!selectedSlot || booking}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              {booking ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {language === 'en' ? 'Booking…' : 'Réservation…'}
                </>
              ) : (
                t[language].bookingConfirm
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}