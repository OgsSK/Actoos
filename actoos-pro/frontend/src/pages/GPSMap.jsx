/**
 * GPS Map - Carte des techniciens et interventions
 * Position live des techniciens, géolocalisation des interventions
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTechniciens } from '../lib/supabaseHooks';
import { interventionsApi } from '../lib/supabaseApi';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '../components/ui/sheet';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { format, parseISO, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MapPin, User, Navigation, Phone, Mail, Clock, Calendar,
  Loader2, RefreshCw, Filter, Layers, Route, Target,
  ChevronRight, AlertTriangle, CheckCircle, PlayCircle, XCircle,
  Maximize2, Minimize2, List, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const createIcon = (color, isCircle = false) => {
  const svg = isCircle
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
       </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="40">
        <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" fill="${color}" stroke="white" stroke-width="1"/>
       </svg>`;
  
  return L.divIcon({
    html: svg,
    className: 'custom-marker',
    iconSize: [32, isCircle ? 32 : 40],
    iconAnchor: [16, isCircle ? 16 : 40],
    popupAnchor: [0, isCircle ? -16 : -40],
  });
};

const technicianIcon = createIcon('#10b981', true); // Green circle
const interventionPlanifieIcon = createIcon('#64748b'); // Gray pin
const interventionEnCoursIcon = createIcon('#3b82f6'); // Blue pin
const interventionTermineIcon = createIcon('#10b981'); // Green pin
const interventionUrgentIcon = createIcon('#ef4444'); // Red pin

// Map center component
const MapController = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  
  return null;
};

// Technician marker with live position
const TechnicianMarker = ({ technician, onClick }) => {
  if (!technician.latitude || !technician.longitude) return null;
  
  const position = [technician.latitude, technician.longitude];
  const name = `${technician.prenom || ''} ${technician.nom || ''}`.trim() || technician.email;
  const lastUpdate = technician.position_updated_at 
    ? format(parseISO(technician.position_updated_at), 'HH:mm', { locale: fr })
    : null;
  
  return (
    <Marker position={position} icon={technicianIcon}>
      <Popup>
        <div className="min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <User className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">{name}</p>
              <p className="text-xs text-slate-500">Technicien</p>
            </div>
          </div>
          
          {lastUpdate && (
            <p className="text-xs text-slate-500 mb-2">
              <Clock className="w-3 h-3 inline mr-1" />
              Dernière position: {lastUpdate}
            </p>
          )}
          
          <div className="flex gap-2">
            {technician.telephone && (
              <a href={`tel:${technician.telephone}`} className="text-blue-500 hover:underline text-xs">
                <Phone className="w-3 h-3 inline mr-1" />
                Appeler
              </a>
            )}
            <button 
              onClick={() => onClick(technician)}
              className="text-blue-500 hover:underline text-xs"
            >
              <Eye className="w-3 h-3 inline mr-1" />
              Détails
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

// Intervention marker
const InterventionMarker = ({ intervention, onClick }) => {
  // Try to get coordinates from intervention or client address
  const lat = intervention.latitude || intervention.client?.latitude;
  const lng = intervention.longitude || intervention.client?.longitude;
  
  if (!lat || !lng) return null;
  
  const position = [lat, lng];
  const isUrgent = intervention.priorite === 'urgente' || intervention.priorite === 'haute';
  
  let icon = interventionPlanifieIcon;
  if (isUrgent) icon = interventionUrgentIcon;
  else if (intervention.statut === 'en_cours') icon = interventionEnCoursIcon;
  else if (intervention.statut === 'termine') icon = interventionTermineIcon;
  
  const clientName = intervention.client?.nom || intervention.client_nom || 'Client';
  const time = intervention.date_prevue 
    ? format(parseISO(intervention.date_prevue), 'HH:mm', { locale: fr })
    : '';
  
  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <div className="min-w-[220px]">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-semibold text-sm">{intervention.titre || 'Intervention'}</p>
              <p className="text-xs text-slate-500">{clientName}</p>
            </div>
            {isUrgent && (
              <Badge variant="destructive" className="text-[10px]">Urgent</Badge>
            )}
          </div>
          
          <div className="space-y-1 mb-3">
            <p className="text-xs text-slate-600">
              <Clock className="w-3 h-3 inline mr-1" />
              {time} - {intervention.duree_estimee || 60} min
            </p>
            <p className="text-xs text-slate-600">
              <MapPin className="w-3 h-3 inline mr-1" />
              {intervention.adresse || intervention.client?.adresse || 'Adresse non définie'}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => onClick(intervention)}
              className="text-blue-500 hover:underline text-xs"
            >
              <Eye className="w-3 h-3 inline mr-1" />
              Voir détails
            </button>
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-xs"
            >
              <Navigation className="w-3 h-3 inline mr-1" />
              Itinéraire
            </a>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

// Main Component
const GPSMap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: techniciens, loading: techsLoading } = useTechniciens(user?.entreprise_id);
  
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState([48.8566, 2.3522]); // Paris default
  const [mapZoom, setMapZoom] = useState(12);
  
  // Filters
  const [showTechnicians, setShowTechnicians] = useState(true);
  const [showInterventions, setShowInterventions] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTechnician, setFilterTechnician] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Side panel
  const [selectedItem, setSelectedItem] = useState(null);
  const [showList, setShowList] = useState(false);
  
  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapContainerRef = useRef(null);

  // Load interventions
  const loadInterventions = useCallback(async () => {
    if (!user?.entreprise_id) return;
    
    try {
      setLoading(true);
      
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          client:clients(id, nom, prenom, telephone, email, adresse, ville, latitude, longitude),
          technicien:users!interventions_technicien_id_fkey(id, nom, prenom, email, telephone, latitude, longitude, position_updated_at)
        `)
        .eq('entreprise_id', user.entreprise_id)
        .gte('date_prevue', startDate.toISOString())
        .lte('date_prevue', endDate.toISOString())
        .neq('statut', 'annule')
        .order('date_prevue', { ascending: true });
      
      if (error) throw error;
      setInterventions(data || []);
      
      // Auto-center map on first intervention with coordinates
      const firstWithCoords = (data || []).find(i => 
        (i.latitude && i.longitude) || (i.client?.latitude && i.client?.longitude)
      );
      if (firstWithCoords) {
        const lat = firstWithCoords.latitude || firstWithCoords.client?.latitude;
        const lng = firstWithCoords.longitude || firstWithCoords.client?.longitude;
        if (lat && lng) {
          setMapCenter([lat, lng]);
        }
      }
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

  // Realtime subscription for technician positions
  useEffect(() => {
    if (!user?.entreprise_id) return;

    const channel = supabase
      .channel(`gps_${user.entreprise_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `entreprise_id=eq.${user.entreprise_id}`,
        },
        (payload) => {
          // Technician position updated - refresh will happen via hook
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interventions',
          filter: `entreprise_id=eq.${user.entreprise_id}`,
        },
        () => {
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
    if (filterStatus !== 'all' && i.statut !== filterStatus) return false;
    if (filterTechnician !== 'all') {
      if (filterTechnician === 'unassigned' && i.technicien_id) return false;
      if (filterTechnician !== 'unassigned' && i.technicien_id !== filterTechnician) return false;
    }
    return true;
  });

  // Get technicians with positions
  const techniciansWithPosition = (techniciens || []).filter(t => t.latitude && t.longitude);

  // Counts
  const counts = {
    technicians: techniciansWithPosition.length,
    interventions: filteredInterventions.length,
    planifie: filteredInterventions.filter(i => i.statut === 'planifie').length,
    enCours: filteredInterventions.filter(i => i.statut === 'en_cours').length,
    termine: filteredInterventions.filter(i => i.statut === 'termine').length,
  };

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Center on item
  const centerOnItem = (item) => {
    const lat = item.latitude || item.client?.latitude;
    const lng = item.longitude || item.client?.longitude;
    if (lat && lng) {
      setMapCenter([lat, lng]);
      setMapZoom(15);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'en_cours': return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case 'termine': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'annule': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col" data-testid="gps-map">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">
            Carte GPS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Position des techniciens et interventions en temps réel
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadInterventions} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowList(true)}>
            <List className="w-4 h-4 mr-2" />
            Liste
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Date */}
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-[160px] h-9"
        />

        {/* Status Filter */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-9">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="planifie">Planifiées</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="termine">Terminées</SelectItem>
          </SelectContent>
        </Select>

        {/* Technician Filter */}
        <Select value={filterTechnician} onValueChange={setFilterTechnician}>
          <SelectTrigger className="w-[180px] h-9">
            <User className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Technicien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="unassigned">Non assignées</SelectItem>
            {(techniciens || []).map((tech) => (
              <SelectItem key={tech.id} value={tech.id}>
                {tech.prenom} {tech.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Toggle buttons */}
        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-2">
            <Switch 
              id="show-techs" 
              checked={showTechnicians} 
              onCheckedChange={setShowTechnicians}
            />
            <Label htmlFor="show-techs" className="text-sm cursor-pointer">
              Techniciens ({counts.technicians})
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              id="show-interventions" 
              checked={showInterventions} 
              onCheckedChange={setShowInterventions}
            />
            <Label htmlFor="show-interventions" className="text-sm cursor-pointer">
              Interventions ({counts.interventions})
            </Label>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-3 flex items-center gap-3">
            <User className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xl font-bold text-emerald-700">{counts.technicians}</p>
              <p className="text-xs text-emerald-600">Techniciens actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-slate-600" />
            <div>
              <p className="text-xl font-bold text-slate-700">{counts.planifie}</p>
              <p className="text-xs text-slate-600">Planifiées</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3 flex items-center gap-3">
            <PlayCircle className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xl font-bold text-blue-700">{counts.enCours}</p>
              <p className="text-xs text-blue-600">En cours</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-3 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xl font-bold text-emerald-700">{counts.termine}</p>
              <p className="text-xs text-emerald-600">Terminées</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <div 
        ref={mapContainerRef}
        className="flex-1 rounded-xl overflow-hidden border border-slate-200 relative"
        style={{ minHeight: '400px' }}
      >
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapController center={mapCenter} zoom={mapZoom} />
          
          {/* Technician markers */}
          {showTechnicians && techniciansWithPosition.map((tech) => (
            <TechnicianMarker
              key={tech.id}
              technician={tech}
              onClick={(t) => {
                setSelectedItem({ type: 'technician', data: t });
                setShowList(true);
              }}
            />
          ))}
          
          {/* Intervention markers */}
          {showInterventions && filteredInterventions.map((intervention) => (
            <InterventionMarker
              key={intervention.id}
              intervention={intervention}
              onClick={(i) => navigate(`/dashboard/interventions/${i.id}`)}
            />
          ))}
        </MapContainer>

        {/* Fullscreen button */}
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-3 right-3 z-[1000] shadow-md"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </Button>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-md">
          <p className="text-xs font-medium text-slate-700 mb-2">Légende</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></div>
              <span>Technicien</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-slate-500"></div>
              <span>Planifiée</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>En cours</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Urgente</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side panel - List */}
      <Sheet open={showList} onOpenChange={setShowList}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Interventions du jour</SheetTitle>
            <SheetDescription>
              {filteredInterventions.length} intervention(s) pour le {format(new Date(selectedDate), 'd MMMM yyyy', { locale: fr })}
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-150px)] mt-4">
            <div className="space-y-3 pr-4">
              {filteredInterventions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Aucune intervention pour cette date
                </div>
              ) : (
                filteredInterventions.map((intervention) => {
                  const hasCoords = intervention.latitude || intervention.client?.latitude;
                  return (
                    <Card 
                      key={intervention.id} 
                      className={cn(
                        "cursor-pointer hover:bg-slate-50 transition-colors",
                        !hasCoords && "opacity-60"
                      )}
                      onClick={() => {
                        if (hasCoords) {
                          centerOnItem(intervention);
                          setShowList(false);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusIcon(intervention.statut)}
                              <span className="text-sm font-medium">
                                {format(parseISO(intervention.date_prevue), 'HH:mm', { locale: fr })}
                              </span>
                              {(intervention.priorite === 'urgente' || intervention.priorite === 'haute') && (
                                <Badge variant="destructive" className="text-[10px]">
                                  {intervention.priorite === 'urgente' ? 'Urgent' : 'Haute'}
                                </Badge>
                              )}
                            </div>
                            <p className="font-semibold text-slate-900">{intervention.titre || 'Sans titre'}</p>
                            <p className="text-sm text-slate-600">{intervention.client?.nom || 'Client'}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              <MapPin className="w-3 h-3 inline mr-1" />
                              {intervention.adresse || intervention.client?.adresse || 'Adresse non définie'}
                            </p>
                            {intervention.technicien && (
                              <p className="text-xs text-emerald-600 mt-1">
                                <User className="w-3 h-3 inline mr-1" />
                                {intervention.technicien.prenom} {intervention.technicien.nom}
                              </p>
                            )}
                          </div>
                          {hasCoords && (
                            <Button variant="ghost" size="sm" className="ml-2">
                              <Target className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {!hasCoords && (
                          <p className="text-xs text-amber-600 mt-2">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            Pas de coordonnées GPS
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default GPSMap;
