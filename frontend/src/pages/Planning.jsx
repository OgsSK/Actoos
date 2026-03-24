import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatTime, getStatusLabel, getPriorityLabel, priorityColors } from '../lib/utils';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, User, Clock,
  MapPin, Loader2, GripVertical, Filter
} from 'lucide-react';
import { toast } from 'sonner';

// Draggable Intervention Card
const DraggableIntervention = ({ intervention, onDragStart, onDragEnd, onClick }) => {
  const isUrgent = intervention.priorite === 'urgente' || intervention.priorite === 'haute';
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, intervention)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(intervention)}
      className={`
        group p-2 mb-1 rounded-md cursor-grab active:cursor-grabbing
        border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300
        transition-all duration-150 shadow-sm hover:shadow
        ${isUrgent ? 'border-l-4 border-l-red-500' : ''}
      `}
      data-testid={`planning-intervention-${intervention.id}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs font-medium text-blue-600">
              {formatTime(intervention.date_prevue)}
            </span>
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 status-${intervention.statut}`}>
              {getStatusLabel(intervention.statut)}
            </Badge>
          </div>
          <p className="text-sm font-medium text-slate-900 truncate">{intervention.titre}</p>
          {intervention.client && (
            <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3" />
              {intervention.client.nom}
            </p>
          )}
          {intervention.technicien_nom && (
            <p className="text-xs text-slate-400 truncate mt-0.5">
              → {intervention.technicien_nom}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Day Column Component
const DayColumn = ({ date, interventions, isToday, onDrop, onInterventionClick, onDragStart, onDragEnd }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(date);
  };
  
  const dayName = format(date, 'EEEE', { locale: fr });
  const dayNumber = format(date, 'd');
  const monthName = format(date, 'MMM', { locale: fr });
  
  return (
    <div
      className={`
        flex-1 min-w-[160px] border-r border-slate-200 last:border-r-0
        ${isDragOver ? 'bg-blue-50' : ''}
        ${isToday ? 'bg-amber-50/50' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={`planning-day-${format(date, 'yyyy-MM-dd')}`}
    >
      {/* Day Header */}
      <div className={`
        sticky top-0 z-10 px-2 py-3 text-center border-b border-slate-200
        ${isToday ? 'bg-amber-100' : 'bg-slate-50'}
      `}>
        <p className="text-xs font-medium text-slate-500 uppercase">{dayName}</p>
        <p className={`text-lg font-bold ${isToday ? 'text-amber-700' : 'text-slate-900'}`}>
          {dayNumber}
        </p>
        <p className="text-xs text-slate-400">{monthName}</p>
      </div>
      
      {/* Interventions */}
      <div className="p-2 min-h-[400px]">
        {interventions.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-slate-400 text-center">
              Aucune<br/>intervention
            </p>
          </div>
        ) : (
          interventions
            .sort((a, b) => new Date(a.date_prevue) - new Date(b.date_prevue))
            .map((intervention) => (
              <DraggableIntervention
                key={intervention.id}
                intervention={intervention}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onClick={onInterventionClick}
              />
            ))
        )}
      </div>
    </div>
  );
};

// Reschedule Dialog
const RescheduleDialog = ({ intervention, newDate, techniciens, onConfirm, onCancel }) => {
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [selectedTechnicien, setSelectedTechnicien] = useState(intervention?.technicien_id || 'none');
  
  const timeSlots = [];
  for (let h = 7; h <= 19; h++) {
    timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  
  useEffect(() => {
    if (intervention) {
      const currentTime = formatTime(intervention.date_prevue);
      setSelectedTime(currentTime || '09:00');
      setSelectedTechnicien(intervention.technicien_id || 'none');
    }
  }, [intervention]);
  
  const handleConfirm = () => {
    const [hours, minutes] = selectedTime.split(':');
    const newDateTime = new Date(newDate);
    newDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    onConfirm({
      date_prevue: newDateTime.toISOString(),
      technicien_id: selectedTechnicien === 'none' ? null : selectedTechnicien
    });
  };
  
  if (!intervention) return null;
  
  return (
    <Dialog open={!!intervention} onOpenChange={() => onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replanifier l'intervention</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="font-medium text-slate-900">{intervention.titre}</p>
            <p className="text-sm text-slate-500">
              {intervention.client?.nom} {intervention.client?.prenom}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nouvelle date</Label>
              <div className="p-2 bg-slate-100 rounded-md text-sm font-medium">
                {format(newDate, 'EEEE d MMMM', { locale: fr })}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Heure</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger data-testid="reschedule-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Technicien assigné</Label>
            <Select value={selectedTechnicien} onValueChange={setSelectedTechnicien}>
              <SelectTrigger data-testid="reschedule-technicien">
                <SelectValue placeholder="Non assigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non assigné</SelectItem>
                {techniciens.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.prenom} {tech.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={handleConfirm} data-testid="reschedule-confirm">
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main Planning Component
export const PlanningPage = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [interventions, setInterventions] = useState([]);
  const [techniciens, setTechniciens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTechnicien, setFilterTechnicien] = useState('all');
  const [filterStatut, setFilterStatut] = useState('all');
  
  // Drag state
  const [draggedIntervention, setDraggedIntervention] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({ intervention: null, newDate: null });
  
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const today = new Date();
  
  // Load data
  useEffect(() => {
    loadData();
  }, [currentWeekStart]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const dateDebut = format(currentWeekStart, 'yyyy-MM-dd');
      const dateFin = format(weekEnd, 'yyyy-MM-dd');
      
      const [interventionsRes, usersRes] = await Promise.all([
        api.get('/interventions', { params: { date_debut: dateDebut, date_fin: dateFin } }),
        api.get('/users')
      ]);
      
      // Add technicien names
      const users = usersRes.data;
      const interventionsWithNames = interventionsRes.data.map(i => ({
        ...i,
        technicien_nom: i.technicien_id 
          ? users.find(u => u.id === i.technicien_id)?.prenom + ' ' + users.find(u => u.id === i.technicien_id)?.nom
          : null
      }));
      
      setInterventions(interventionsWithNames);
      setTechniciens(users.filter(u => u.role === 'tech' && u.statut === 'actif'));
    } catch (error) {
      console.error('Error loading planning data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  };
  
  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };
  
  const handleToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };
  
  const handleDragStart = (e, intervention) => {
    setDraggedIntervention(intervention);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', intervention.id);
  };
  
  const handleDragEnd = () => {
    setDraggedIntervention(null);
  };
  
  const handleDrop = (targetDate) => {
    if (!draggedIntervention) return;
    
    // Check if dropped on the same day
    const currentDate = parseISO(draggedIntervention.date_prevue);
    if (isSameDay(currentDate, targetDate)) {
      setDraggedIntervention(null);
      return;
    }
    
    // Open reschedule dialog
    setRescheduleData({
      intervention: draggedIntervention,
      newDate: targetDate
    });
  };
  
  const handleRescheduleConfirm = async (updateData) => {
    try {
      await api.put(`/interventions/${rescheduleData.intervention.id}`, updateData);
      toast.success('Intervention replanifiée');
      setRescheduleData({ intervention: null, newDate: null });
      setDraggedIntervention(null);
      loadData();
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast.error('Erreur lors de la replanification');
    }
  };
  
  const handleInterventionClick = (intervention) => {
    navigate(`/dashboard/interventions/${intervention.id}`);
  };
  
  // Filter interventions
  const filteredInterventions = interventions.filter(i => {
    if (filterTechnicien !== 'all' && i.technicien_id !== filterTechnicien) return false;
    if (filterStatut !== 'all' && i.statut !== filterStatut) return false;
    return true;
  });
  
  // Group interventions by day
  const getInterventionsForDay = (date) => {
    return filteredInterventions.filter(i => 
      isSameDay(parseISO(i.date_prevue), date)
    );
  };
  
  const weekLabel = `${format(currentWeekStart, 'd MMM', { locale: fr })} - ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`;
  
  return (
    <div className="space-y-4" data-testid="planning-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Planning</h1>
          <p className="text-slate-500">Organisez les interventions de la semaine</p>
        </div>
        <Button onClick={() => navigate('/dashboard/interventions/new')} data-testid="new-intervention-btn">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle intervention
        </Button>
      </div>
      
      {/* Controls */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePreviousWeek} data-testid="prev-week">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Aujourd'hui
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextWeek} data-testid="next-week">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="ml-2 font-medium text-slate-900">{weekLabel}</span>
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select value={filterTechnicien} onValueChange={setFilterTechnicien}>
                <SelectTrigger className="w-[160px]" data-testid="filter-technicien">
                  <SelectValue placeholder="Technicien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les techniciens</SelectItem>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {techniciens.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.prenom} {tech.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterStatut} onValueChange={setFilterStatut}>
                <SelectTrigger className="w-[140px]" data-testid="filter-statut">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="planifiee">Planifiée</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="terminee">Terminée</SelectItem>
                  <SelectItem value="annulee">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Calendar Grid */}
      <Card className="border-slate-200 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="flex min-w-[1000px]">
                {weekDays.map((day) => (
                  <DayColumn
                    key={day.toISOString()}
                    date={day}
                    interventions={getInterventionsForDay(day)}
                    isToday={isSameDay(day, today)}
                    onDrop={handleDrop}
                    onInterventionClick={handleInterventionClick}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></div>
          Aujourd'hui
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-l-4 border-l-red-500 border border-slate-200"></div>
          Urgente / Haute priorité
        </span>
        <span className="flex items-center gap-1">
          <GripVertical className="w-3 h-3" />
          Glisser-déposer pour replanifier
        </span>
      </div>
      
      {/* Reschedule Dialog */}
      <RescheduleDialog
        intervention={rescheduleData.intervention}
        newDate={rescheduleData.newDate}
        techniciens={techniciens}
        onConfirm={handleRescheduleConfirm}
        onCancel={() => setRescheduleData({ intervention: null, newDate: null })}
      />
    </div>
  );
};

export default PlanningPage;
