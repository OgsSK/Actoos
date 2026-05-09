import { useState, useMemo } from 'react';
import { Clock, Calendar, ChevronRight, Check } from 'lucide-react';

// Générer les créneaux horaires basés sur les horaires d'ouverture
export function generateTimeSlots(openingHours, maxDays = 7) {
  const slots = [];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  
  // Pour chaque jour (aujourd'hui + X jours)
  for (let dayOffset = 0; dayOffset < maxDays; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    const dayOfWeek = date.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const dayHours = openingHours[dayName];
    
    if (!dayHours || dayHours.closed) continue;
    
    const daySlots = [];
    
    // Pour chaque période d'ouverture du jour
    dayHours.periods.forEach(period => {
      const [openHour, openMin] = period.open.split(':').map(Number);
      const [closeHour, closeMin] = period.close.split(':').map(Number);
      
      // Générer créneaux de 30 min
      let slotHour = openHour;
      let slotMin = openMin;
      
      // Ajouter 30 min de marge après ouverture pour la préparation
      slotMin += 30;
      if (slotMin >= 60) {
        slotMin -= 60;
        slotHour += 1;
      }
      
      while (slotHour < closeHour || (slotHour === closeHour && slotMin < closeMin)) {
        // Pour aujourd'hui, filtrer les créneaux passés
        if (dayOffset === 0) {
          if (slotHour < currentHour || (slotHour === currentHour && slotMin <= currentMinutes + 30)) {
            // Créneau passé ou trop proche
            slotMin += 30;
            if (slotMin >= 60) {
              slotMin -= 60;
              slotHour += 1;
            }
            continue;
          }
        }
        
        const timeString = `${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}`;
        daySlots.push({
          time: timeString,
          hour: slotHour,
          minute: slotMin,
        });
        
        slotMin += 30;
        if (slotMin >= 60) {
          slotMin -= 60;
          slotHour += 1;
        }
      }
    });
    
    if (daySlots.length > 0) {
      slots.push({
        date: date,
        dayOffset,
        dayLabel: getDayLabel(dayOffset, date),
        dateLabel: date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        slots: daySlots,
      });
    }
  }
  
  return slots;
}

function getDayLabel(dayOffset, date) {
  if (dayOffset === 0) return "Aujourd'hui";
  if (dayOffset === 1) return "Demain";
  return date.toLocaleDateString('fr-FR', { weekday: 'long' });
}

// Obtenir le prochain créneau disponible
export function getNextAvailableSlot(openingHours) {
  const slots = generateTimeSlots(openingHours, 3);
  if (slots.length > 0 && slots[0].slots.length > 0) {
    return {
      day: slots[0],
      slot: slots[0].slots[0],
    };
  }
  return null;
}

// Vérifier si le restaurant est actuellement ouvert
export function isRestaurantOpen(openingHours) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinutes;
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  const dayHours = openingHours[dayName];
  
  if (!dayHours || dayHours.closed) return false;
  
  return dayHours.periods.some(period => {
    const [openHour, openMin] = period.open.split(':').map(Number);
    const [closeHour, closeMin] = period.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    return currentTime >= openTime && currentTime < closeTime;
  });
}

// Obtenir le prochain horaire d'ouverture
export function getNextOpeningTime(openingHours) {
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // Chercher dans les 7 prochains jours
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + i);
    const dayOfWeek = checkDate.getDay();
    const dayName = dayNames[dayOfWeek];
    const dayHours = openingHours[dayName];
    
    if (!dayHours || dayHours.closed) continue;
    
    const firstPeriod = dayHours.periods[0];
    if (!firstPeriod) continue;
    
    const [openHour, openMin] = firstPeriod.open.split(':').map(Number);
    
    // Pour aujourd'hui, vérifier si l'heure d'ouverture est dans le futur
    if (i === 0) {
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const openTime = openHour * 60 + openMin;
      if (openTime <= currentTime) continue; // Déjà passé aujourd'hui
    }
    
    return {
      dayOffset: i,
      dayLabel: i === 0 ? "aujourd'hui" : i === 1 ? "demain" : checkDate.toLocaleDateString('fr-FR', { weekday: 'long' }),
      time: firstPeriod.open,
    };
  }
  
  return null;
}

// Composant TimeSlotPicker
export function TimeSlotPicker({ 
  openingHours, 
  selectedSlot, 
  onSelectSlot, 
  onSelectAsap,
  isAsap = true,
  maxDays = 7 
}) {
  const [selectedDay, setSelectedDay] = useState(0);
  const timeSlots = useMemo(() => generateTimeSlots(openingHours, maxDays), [openingHours, maxDays]);
  
  const currentDaySlots = timeSlots[selectedDay]?.slots || [];

  return (
    <div className="space-y-4">
      {/* Option ASAP */}
      <button
        onClick={onSelectAsap}
        className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
          isAsap 
            ? 'border-[#FF5A00] bg-[#FF5A00]/5' 
            : 'border-gray-200 hover:border-gray-300'
        }`}
        data-testid="select-asap"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isAsap ? 'bg-[#FF5A00] text-white' : 'bg-gray-100 text-gray-500'
        }`}>
          <Clock className="w-6 h-6" />
        </div>
        <div className="flex-1 text-left">
          <p className={`font-semibold ${isAsap ? 'text-[#FF5A00]' : 'text-gray-900'}`}>
            Dès que possible
          </p>
          <p className="text-sm text-gray-500">30-45 min</p>
        </div>
        {isAsap && <Check className="w-6 h-6 text-[#FF5A00]" />}
      </button>

      {/* Option Programmer */}
      <div className={`rounded-2xl border-2 transition-all ${
        !isAsap ? 'border-[#FF5A00]' : 'border-gray-200'
      }`}>
        <button
          onClick={() => {
            if (isAsap && currentDaySlots.length > 0) {
              onSelectSlot(timeSlots[0], currentDaySlots[0]);
            }
          }}
          className="w-full p-4 flex items-center gap-4"
          data-testid="select-scheduled"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            !isAsap ? 'bg-[#FF5A00] text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            <Calendar className="w-6 h-6" />
          </div>
          <div className="flex-1 text-left">
            <p className={`font-semibold ${!isAsap ? 'text-[#FF5A00]' : 'text-gray-900'}`}>
              Programmer pour plus tard
            </p>
            {selectedSlot && !isAsap ? (
              <p className="text-sm text-[#FF5A00]">
                {selectedSlot.day.dayLabel} à {selectedSlot.slot.time}
              </p>
            ) : (
              <p className="text-sm text-gray-500">Choisir une date et heure</p>
            )}
          </div>
          {!isAsap && <Check className="w-6 h-6 text-[#FF5A00]" />}
        </button>

        {/* Sélection jour/heure si programmé */}
        {!isAsap && (
          <div className="border-t border-gray-100 p-4 space-y-4">
            {/* Sélection du jour */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {timeSlots.map((day, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedDay(index)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    selectedDay === index
                      ? 'bg-[#FF5A00] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  data-testid={`day-${index}`}
                >
                  {day.dayLabel}
                </button>
              ))}
            </div>

            {/* Créneaux horaires */}
            <div className="grid grid-cols-4 gap-2">
              {currentDaySlots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => onSelectSlot(timeSlots[selectedDay], slot)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                    selectedSlot?.slot?.time === slot.time && selectedSlot?.day?.dayOffset === timeSlots[selectedDay].dayOffset
                      ? 'bg-[#FF5A00] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  data-testid={`slot-${slot.time}`}
                >
                  {slot.time}
                </button>
              ))}
            </div>

            {currentDaySlots.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Aucun créneau disponible ce jour
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Composant simplifié pour afficher le créneau sélectionné
export function SelectedTimeSlotBadge({ isAsap, selectedSlot }) {
  if (isAsap) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Clock className="w-4 h-4" />
        <span>Dès que possible (30-45 min)</span>
      </div>
    );
  }
  
  if (selectedSlot) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#FF5A00] font-medium">
        <Calendar className="w-4 h-4" />
        <span>{selectedSlot.day.dayLabel} à {selectedSlot.slot.time}</span>
      </div>
    );
  }
  
  return null;
}
