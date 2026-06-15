"use client";

import { useState, useEffect } from "react";
import { Calendar, Loader2, X, Check } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { t } from "../../lib/translations";

interface BookingModalProps {
  clientName: string;
  clientEmail: string;
  projectName?: string;
  projectId?: string;
  onClose: () => void;
  onBooked?: () => void; // ⚡ nouvelle prop
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
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      setSelectedSlot("");
      return;
    }
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setError(null);
      try {
        const res = await fetch(
          `https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/get-available-slots?date=${date}`
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
        "https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/book-slot",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        if (onBooked) onBooked(); // ⚡ rafraîchir la page parente
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
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        {booked ? (
          <div className="text-center py-8">
            <Check size={48} className="text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-black mb-2">
              {t[language].bookingSuccessTitle}
            </h3>
            <p className="text-slate-500">
              {t[language].bookingSuccessMessage}
            </p>
            <button
              onClick={onClose}
              className="mt-6 bg-[#D4AF37] text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-500 transition-colors"
            >
              {t[language].bookingClose}
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <Calendar size={40} className="text-[#D4AF37] mx-auto mb-2" />
              <h3 className="text-xl font-black">{t[language].bookingTitle}</h3>
            </div>

            <label className="block text-sm font-bold mb-2">
              {t[language].bookingSelectDate}
            </label>
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 mb-6 outline-none focus:border-[#D4AF37]"
            >
              <option value="">--</option>
              {generateDates().map((d) => (
                <option key={d} value={d}>
                  {new Date(d).toLocaleDateString(
                    language === "fr" ? "fr-FR" : "en-US",
                    { weekday: "long", day: "numeric", month: "long" }
                  )}
                </option>
              ))}
            </select>

            {date && (
              <>
                <label className="block text-sm font-bold mb-2">
                  {t[language].bookingAvailableSlots}
                </label>
                {loadingSlots ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={24} className="animate-spin text-slate-400" />
                  </div>
                ) : slots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-3 rounded-xl text-sm font-bold border transition-colors ${
                          selectedSlot === slot
                            ? "bg-[#D4AF37] text-white border-[#D4AF37]"
                            : "border-slate-200 hover:border-[#D4AF37] text-slate-700"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mb-4">
                    {t[language].bookingNoSlots}
                  </p>
                )}
              </>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">
                {error} {t[language].bookingRetry}
              </div>
            )}

            <button
              onClick={handleBooking}
              disabled={!selectedSlot || booking}
              className="w-full bg-[#D4AF37] text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-amber-500 transition-colors"
            >
              {booking ? (
                <Loader2 size={18} className="animate-spin mx-auto" />
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