/**
 * Dispatch Board - Vue Kanban temps réel
 * Gestion des interventions par statut avec drag & drop
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTechniciens } from '../lib/supabaseHooks';
import { interventionsApi } from '../lib/supabaseApi';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { format, parseISO, isToday, isTomorrow, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatTime, getStatusLabel, getPriorityLabel } from '../lib/utils';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, User, Clock,
  MapPin, Loader2, GripVertical, Filter, MoreVertical, Phone, Mail,
  RefreshCw, AlertTriangle, CheckCircle, PlayCircle, PauseCircle, XCircle,
  Search, Eye, Edit, Trash2, UserPlus, Navigation
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

// Statuts pour le Kanban
const KANBAN_COLUMNS = [
  { id: 'planifie', label: 'Planifiées', color: 'bg-slate-100', textColor: 'text-slate-700', icon: CalendarIcon },
  { id: 'en_cours', label: 'En cours', color: 'bg-blue-100', textColor: 'text-blue-700', icon: PlayCircle },
  { id: 'termine', label: 'Terminées', color: 'bg-emerald-100', textColor: 'text-emerald-700', icon: CheckCircle },
  { id: 'annule', label: 'Annulées', color: 'bg-red-100', textColor: 'text-red-700', icon: XCircle },
];

// Carte d'intervention draggable
const InterventionCard = ({ 
  intervention, 
  onDragStart, 
  onDragEnd, 
  onClick,
  onAssign,
  onStatusChange,
  techniciens
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const isUrgent = intervention.priorite === 'urgente' || intervention.priorite === 'haute';
  const hasClient = intervention.client || intervention.client_nom;
  
  const clientName = intervention.client?.nom || intervention.client_nom || 'Client non défini';
  const clientPhone = intervention.client?.telephone || intervention.client_telephone;
  const technicienName = intervention.technicien?.nom 
    ? `${intervention.technicien.prenom || ''} ${intervention.technicien.nom}`.trim()
    : intervention.technicien_nom || null;

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', JSON.stringify({
      id: intervention.id,
      currentStatus: intervention.statut
    }));
    onDragStart?.(e, intervention);
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);
    onDragEnd?.(e);
  };

  const priorityBorder = {
    'urgente': 'border-l-red-500',
    'haute': 'border-l-orange-500',
    'normale': 'border-l-blue-500',
    'basse': 'border-l-slate-300'
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "group p-3 mb-2 rounded-lg cursor-grab active:cursor-grabbing",
        "border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300",
        "transition-all duration-150 shadow-sm hover:shadow-md",
        "border-l-4",
        priorityBorder[intervention.priorite] || priorityBorder['normale'],
        isDragging && "opacity-50 scale-95"
      )}
      data-testid={`dispatch-card-${intervention.id}`}
    >
      {/* Header avec grip et actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-500 cursor-grab" />
          <span className="text-xs font-medium text-blue-600">
            {formatTime(intervention.date_prevue)}
          </span>
          {isToday(parseISO(intervention.date_prevue)) && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700">
              Aujourd'hui
            </Badge>
          )}
          {isUrgent && (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onClick(intervention)}>
              <Eye className="w-4 h-4 mr-2" />
              Voir détails
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAssign(intervention)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Assigner technicien
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(intervention, 'en_cours')}>
              <PlayCircle className="w-4 h-4 mr-2" />
              Démarrer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(intervention, 'termine')}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Terminer
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onStatusChange(intervention, 'annule')}
              className="text-red-600"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Annuler
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Titre */}
      <h4 className="text-sm font-semibold text-slate-900 mb-1 line-clamp-2">
        {intervention.titre || 'Sans titre'}
      </h4>

      {/* Client */}
      <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
        <User className="w-3.5 h-3.5 text-slate-400" />
        <span className="truncate">{clientName}</span>
        {clientPhone && (
          <a href={`tel:${clientPhone}`} className="text-blue-500 hover:underline ml-auto">
            <Phone className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Adresse */}
      {intervention.adresse && (
        <div className="flex items-start gap-1.5 text-xs text-slate-500 mb-2">
          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-1">
            {intervention.adresse}
            {intervention.ville && `, ${intervention.ville}`}
          </span>
        </div>
      )}

      {/* Technicien assigné */}
      {technicienName ? (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-xs font-medium text-emerald-700">{technicienName}</span>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 h-7 text-xs text-slate-500 hover:text-blue-600 border border-dashed border-slate-200"
          onClick={(e) => {
            e.stopPropagation();
            onAssign(intervention);
          }}
        >
          <UserPlus className="w-3.5 h-3.5 mr-1" />
          Assigner
        </Button>
      )}
    </div>
  );
};

// Colonne Kanban
const KanbanColumn = ({ 
  column, 
  interventions, 
  onDrop, 
  onCardClick,
  onAssign,
  onStatusChange,
  techniciens
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const Icon = column.icon;
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e) => {
    // Only set to false if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.currentStatus !== column.id) {
        onDrop(data.id, column.id);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <div
      className={cn(
        "flex-1 min-w-[280px] max-w-[350px] flex flex-col rounded-xl",
        column.color,
        isDragOver && "ring-2 ring-blue-400 ring-offset-2"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={`dispatch-column-${column.id}`}
    >
      {/* Header */}
      <div className={cn("px-4 py-3 rounded-t-xl", column.color)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("w-5 h-5", column.textColor)} />
            <h3 className={cn("font-semibold text-sm", column.textColor)}>
              {column.label}
            </h3>
          </div>
          <Badge variant="secondary" className={cn("text-xs font-bold", column.color, column.textColor)}>
            {interventions.length}
          </Badge>
        </div>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-0">
          {interventions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Aucune intervention
            </div>
          ) : (
            interventions.map((intervention) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                onClick={onCardClick}
                onAssign={onAssign}
                onStatusChange={onStatusChange}
                techniciens={techniciens}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Main Component
const DispatchBoard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: techniciens, loading: techsLoading } = useTechniciens(user?.entreprise_id);
  
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterTechnicien, setFilterTechnicien] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Assignment dialog
  const [assignDialog, setAssignDialog] = useState({ open: false, intervention: null });
  const [selectedTechnicien, setSelectedTechnicien] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Load interventions
  const loadInterventions = useCallback(async () => {
    if (!user?.entreprise_id) return;
    
    try {
      setLoading(true);
      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);
      
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          client:clients(id, nom, prenom, telephone, email, adresse, ville),
          technicien:users!interventions_technicien_id_fkey(id, nom, prenom, email)
        `)
        .eq('entreprise_id', user.entreprise_id)
        .gte('date_prevue', start.toISOString())
        .lte('date_prevue', end.toISOString())
        .order('date_prevue', { ascending: true });
      
      if (error) throw error;
      setInterventions(data || []);
    } catch (error) {
      console.error('Error loading interventions:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user?.entreprise_id, selectedDate]);

  useEffect(() => {
    loadInterventions();
  }, [loadInterventions]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.entreprise_id) return;

    const channel = supabase
      .channel(`dispatch_${user.entreprise_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interventions',
          filter: `entreprise_id=eq.${user.entreprise_id}`,
        },
        (payload) => {
          // Reload on any change
          loadInterventions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.entreprise_id, loadInterventions]);

  // Filter interventions
  const filteredInterventions = interventions.filter((i) => {
    if (filterTechnicien !== 'all' && i.technicien_id !== filterTechnicien) return false;
    if (filterPriority !== 'all' && i.priorite !== filterPriority) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchTitle = i.titre?.toLowerCase().includes(search);
      const matchClient = i.client?.nom?.toLowerCase().includes(search);
      const matchAddress = i.adresse?.toLowerCase().includes(search);
      if (!matchTitle && !matchClient && !matchAddress) return false;
    }
    return true;
  });

  // Group by status
  const groupedByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.id] = filteredInterventions.filter(i => i.statut === col.id);
    return acc;
  }, {});

  // Handle status change via drag & drop
  const handleDrop = async (interventionId, newStatus) => {
    try {
      await interventionsApi.update(interventionId, { statut: newStatus });
      toast.success(`Statut mis à jour: ${getStatusLabel(newStatus)}`);
      loadInterventions();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Handle status change via menu
  const handleStatusChange = async (intervention, newStatus) => {
    if (intervention.statut === newStatus) return;
    await handleDrop(intervention.id, newStatus);
  };

  // Handle assignment
  const handleAssign = async () => {
    if (!assignDialog.intervention || !selectedTechnicien) return;
    
    setAssigning(true);
    try {
      await interventionsApi.update(assignDialog.intervention.id, {
        technicien_id: selectedTechnicien === 'none' ? null : selectedTechnicien
      });
      toast.success('Technicien assigné');
      setAssignDialog({ open: false, intervention: null });
      setSelectedTechnicien('');
      loadInterventions();
    } catch (error) {
      console.error('Error assigning technician:', error);
      toast.error('Erreur lors de l\'assignation');
    } finally {
      setAssigning(false);
    }
  };

  // Navigation dates
  const goToPreviousDay = () => setSelectedDate(d => new Date(d.setDate(d.getDate() - 1)));
  const goToNextDay = () => setSelectedDate(d => new Date(d.setDate(d.getDate() + 1)));
  const goToToday = () => setSelectedDate(new Date());

  const dateLabel = isToday(selectedDate) 
    ? "Aujourd'hui" 
    : isTomorrow(selectedDate)
    ? "Demain"
    : format(selectedDate, 'EEEE d MMMM', { locale: fr });

  if (loading && interventions.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="dispatch-board">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">
            Dispatch Board
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez vos interventions en temps réel
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadInterventions} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Actualiser
          </Button>
          <Button size="sm" onClick={() => navigate('/dashboard/interventions/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
          <Button variant="ghost" size="sm" onClick={goToPreviousDay} className="h-8 w-8 p-0">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant={isToday(selectedDate) ? "default" : "ghost"}
            size="sm"
            onClick={goToToday}
            className="h-8 px-3 text-sm font-medium"
          >
            {dateLabel}
          </Button>
          <Button variant="ghost" size="sm" onClick={goToNextDay} className="h-8 w-8 p-0">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Technicien Filter */}
        <Select value={filterTechnicien} onValueChange={setFilterTechnicien}>
          <SelectTrigger className="w-[180px] h-9">
            <User className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Technicien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les techniciens</SelectItem>
            <SelectItem value="unassigned">Non assignées</SelectItem>
            {(techniciens || []).map((tech) => (
              <SelectItem key={tech.id} value={tech.id}>
                {tech.prenom} {tech.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[150px] h-9">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
            <SelectItem value="haute">Haute</SelectItem>
            <SelectItem value="normale">Normale</SelectItem>
            <SelectItem value="basse">Basse</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {KANBAN_COLUMNS.map((col) => {
          const count = groupedByStatus[col.id]?.length || 0;
          const Icon = col.icon;
          return (
            <Card key={col.id} className={cn("border-0", col.color)}>
              <CardContent className="p-3 flex items-center gap-3">
                <Icon className={cn("w-5 h-5", col.textColor)} />
                <div>
                  <p className={cn("text-2xl font-bold", col.textColor)}>{count}</p>
                  <p className={cn("text-xs", col.textColor)}>{col.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-max">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              interventions={groupedByStatus[column.id] || []}
              onDrop={handleDrop}
              onCardClick={(i) => navigate(`/dashboard/interventions/${i.id}`)}
              onAssign={(i) => {
                setAssignDialog({ open: true, intervention: i });
                setSelectedTechnicien(i.technicien_id || '');
              }}
              onStatusChange={handleStatusChange}
              techniciens={techniciens || []}
            />
          ))}
        </div>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={assignDialog.open} onOpenChange={(open) => !open && setAssignDialog({ open: false, intervention: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner un technicien</DialogTitle>
            <DialogDescription>
              {assignDialog.intervention?.titre}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Technicien</Label>
              <Select value={selectedTechnicien} onValueChange={setSelectedTechnicien}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un technicien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {(techniciens || []).map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        {tech.prenom} {tech.nom}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog({ open: false, intervention: null })}>
              Annuler
            </Button>
            <Button onClick={handleAssign} disabled={assigning}>
              {assigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Assigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DispatchBoard;
