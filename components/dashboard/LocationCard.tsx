'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, RefreshCw, Zap, ExternalLink } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getAccuracyLevel, formatCoordinates, getGoogleMapsUrl } from '@/utils/geolocationUtils';

export function LocationCard() {
  const { 
    location, 
    isLoading, 
    error, 
    attempts, 
    lastUpdate, 
    getCurrentLocation, 
    forceNewLocation,
    isWatching 
  } = useGeolocation();

  const accuracyInfo = location ? getAccuracyLevel(location.accuracy) : null;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">
          Localização Atual
        </CardTitle>
        <MapPin className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center space-x-2 text-yellow-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">
              {isWatching ? 'Rastreando...' : 'Obtendo localização...'}
            </span>
          </div>
        )}

        {error && (
          <div className="space-y-2">
            <p className="text-sm text-red-400">{error}</p>
            <p className="text-xs text-slate-500">Tentativas: {attempts}</p>
          </div>
        )}

        {location && (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Coordenadas:</p>
              <p className="text-sm font-mono text-slate-200">
                {formatCoordinates(location.lat, location.lng)}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Precisão:</p>
                <p className={`text-sm font-medium ${accuracyInfo?.color}`}>
                  {location.accuracy.toFixed(0)}m ({accuracyInfo?.label})
                </p>
              </div>
              {location.altitude && (
                <div className="text-right">
                  <p className="text-xs text-slate-400">Altitude:</p>
                  <p className="text-sm text-slate-200">
                    {location.altitude.toFixed(0)}m
                  </p>
                </div>
              )}
            </div>

            {location.speed && location.speed > 0 && (
              <div>
                <p className="text-xs text-slate-400">Velocidade:</p>
                <p className="text-sm text-slate-200">
                  {(location.speed * 3.6).toFixed(1)} km/h
                </p>
              </div>
            )}

            {lastUpdate && (
              <p className="text-xs text-slate-500">
                Última atualização: {lastUpdate.toLocaleTimeString()}
              </p>
            )}

            <div className="bg-slate-700 rounded-lg p-2">
              <p className="text-xs text-slate-400 mb-1">Status da Localização:</p>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  location.accuracy <= 20 ? 'bg-green-400' :
                  location.accuracy <= 50 ? 'bg-blue-400' :
                  location.accuracy <= 200 ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
                <span className="text-xs text-slate-300">
                  {location.accuracy <= 20 ? 'Excelente para registro de ponto' :
                   location.accuracy <= 50 ? 'Boa para registro de ponto' :
                   location.accuracy <= 200 ? 'Aceitável para registro de ponto' :
                   'Precisão baixa - mas ainda permite registro'}
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                asChild
              >
                <a href={getGoogleMapsUrl(location)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver no Mapa
                </a>
              </Button>
            </div>
          </div>
        )}

        <div className="flex space-x-2 mt-3">
          <Button
            onClick={() => getCurrentLocation()}
            size="sm"
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={forceNewLocation}
            size="sm"
            variant="outline"
            className="flex-1 border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-slate-900"
            disabled={isLoading}
          >
            <Zap className="h-3 w-3 mr-1" />
            Forçar Nova
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}