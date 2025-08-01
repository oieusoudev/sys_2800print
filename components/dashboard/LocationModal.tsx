'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink, Clock, Target, Navigation } from 'lucide-react';
import { getLocationNameCached } from '@/utils/locationService';
import { getGoogleMapsUrl, formatCoordinates, getAccuracyLevel } from '@/utils/geolocationUtils';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
    punchType: string;
  } | null;
  punchType: string;
  punchTime: string;
  date: string;
}

export function LocationModal({ 
  isOpen, 
  onClose, 
  location, 
  punchType, 
  punchTime, 
  date 
}: LocationModalProps) {
  const [locationName, setLocationName] = useState<string>('Carregando...');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    if (location && isOpen) {
      setIsLoadingLocation(true);
      getLocationNameCached(location.lat, location.lng)
        .then(name => {
          setLocationName(name);
        })
        .catch(() => {
          setLocationName('Não foi possível obter o endereço');
        })
        .finally(() => {
          setIsLoadingLocation(false);
        });
    }
  }, [location, isOpen]);

  if (!location) return null;

  const accuracyInfo = getAccuracyLevel(location.accuracy);
  const punchTypeLabels: Record<string, string> = {
    clockIn: 'Entrada',
    lunchOut: 'Saída Almoço',
    lunchIn: 'Volta Almoço',
    clockOut: 'Saída'
  };

  const punchTypeColors: Record<string, string> = {
    clockIn: 'text-green-400',
    lunchOut: 'text-yellow-400',
    lunchIn: 'text-blue-400',
    clockOut: 'text-red-400'
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('Modal state changing:', open); // Debug
      if (!open) onClose();
    }}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-400" />
            <span>Confirmação de Localização</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Ponto */}
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Tipo de Ponto:</span>
              <span className={`font-medium ${punchTypeColors[punchType]}`}>
                {punchTypeLabels[punchType]}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Horário:</span>
              <span className="text-white font-mono">{punchTime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Data:</span>
              <span className="text-white">{new Date(date).toLocaleDateString('pt-PT')}</span>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Navigation className="h-4 w-4 text-blue-400" />
              <span className="text-slate-400 text-sm">Endereço:</span>
            </div>
            <p className="text-white text-sm">
              {isLoadingLocation ? (
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span>Carregando endereço...</span>
                </span>
              ) : (
                locationName
              )}
            </p>
          </div>

          {/* Coordenadas */}
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-4 w-4 text-green-400" />
              <span className="text-slate-400 text-sm">Coordenadas:</span>
            </div>
            <p className="text-white font-mono text-sm">
              {formatCoordinates(location.lat, location.lng)}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
            </p>
          </div>

          {/* Precisão */}
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Precisão:</span>
              <span className={`font-medium ${accuracyInfo.color}`}>
                {location.accuracy.toFixed(0)}m ({accuracyInfo.label})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                location.accuracy <= 20 ? 'bg-green-400' :
                location.accuracy <= 50 ? 'bg-blue-400' :
                location.accuracy <= 100 ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-xs text-slate-400">
                {location.accuracy <= 20 ? 'Excelente precisão' :
                 location.accuracy <= 50 ? 'Boa precisão' :
                 location.accuracy <= 100 ? 'Precisão razoável' :
                 'Precisão baixa'}
              </span>
            </div>
          </div>

          {/* Timestamp */}
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-400" />
              <span className="text-slate-400 text-sm">Registrado em:</span>
            </div>
            <p className="text-white text-sm">
              {new Date(location.timestamp).toLocaleString('pt-PT')}
            </p>
          </div>

          {/* Botões */}
          <div className="flex space-x-2 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              type="button"
            >
              Fechar
            </Button>
            <Button
              asChild
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <a 
                href={getGoogleMapsUrl(location)} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Ver no Mapa
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}