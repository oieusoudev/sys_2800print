import { useState, useEffect, useCallback } from 'react';
import { LocationData, GeolocationState } from '@/types';

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    isLoading: false,
    error: null,
    attempts: 0,
    lastUpdate: null
  });

  const [watchId, setWatchId] = useState<number | null>(null);

  const updateLocation = useCallback((position: GeolocationPosition) => {
    const newLocation: LocationData = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      altitude: position.coords.altitude || undefined,
      speed: position.coords.speed || undefined
    };

    setState(prev => ({
      ...prev,
      location: newLocation,
      isLoading: false,
      error: null,
      lastUpdate: new Date()
    }));

    console.log('📍 Nova localização obtida:', {
      coords: `${newLocation.lat.toFixed(6)}, ${newLocation.lng.toFixed(6)}`,
      accuracy: `${newLocation.accuracy}m`,
      timestamp: new Date(newLocation.timestamp).toLocaleTimeString(),
      altitude: newLocation.altitude ? `${newLocation.altitude}m` : 'N/A'
    });
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Erro desconhecido na geolocalização';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Permissão de localização negada. Ative a localização nas configurações do navegador.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Localização indisponível. Verifique se o GPS está ativo.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Timeout na obtenção da localização. Tentando novamente...';
        break;
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      error: errorMessage,
      attempts: prev.attempts + 1
    }));

    console.error('❌ Erro de geolocalização:', {
      code: error.code,
      message: errorMessage,
      originalMessage: error.message
    });
  }, []);

  const getCurrentLocation = useCallback(async (forceNew = false) => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocalização não suportada neste navegador',
        isLoading: false
      }));
      return;
    }

    // Limpar watch anterior se existir
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      attempts: forceNew ? 0 : prev.attempts
    }));

    // Configurações otimizadas para máxima precisão
    const highAccuracyOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // 15 segundos
      maximumAge: 0 // Sempre buscar nova localização
    };

    const fallbackOptions: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 10000, // 10 segundos
      maximumAge: 0 // Sempre buscar nova localização
    };

    try {
      console.log('🔍 Iniciando obtenção de localização com alta precisão...');
      
      // Primeira tentativa: alta precisão
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Localização obtida com alta precisão');
          updateLocation(position);
        },
        (error) => {
          // Se permissão negada, não tentar outras abordagens
          if (error.code === error.PERMISSION_DENIED) {
            console.log('❌ Permissão de localização negada - parando tentativas');
            handleError(error);
            return;
          }
          
          console.log('⚠️ Falha na alta precisão, tentando com precisão normal...');
          
          // Segunda tentativa: precisão normal
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('✅ Localização obtida com precisão normal');
              updateLocation(position);
            },
            (error) => {
              // Se permissão negada, não tentar watchPosition
              if (error.code === error.PERMISSION_DENIED) {
                console.log('❌ Permissão de localização negada - parando tentativas');
                handleError(error);
                return;
              }
              
              console.log('⚠️ Falha na precisão normal, iniciando monitoramento contínuo...');
              
              // Terceira tentativa: monitoramento contínuo
              const id = navigator.geolocation.watchPosition(
                (position) => {
                  console.log('✅ Localização obtida via monitoramento contínuo');
                  updateLocation(position);
                  
                  // Para o watch se conseguir uma precisão aceitável (≤ 200m)
                  if (position.coords.accuracy <= 200) {
                    console.log('🎯 Precisão aceitável alcançada (≤200m), parando monitoramento');
                    navigator.geolocation.clearWatch(id);
                    setWatchId(null);
                  }
                },
                (watchError) => {
                  console.log('❌ Falha no monitoramento contínuo');
                  handleError(watchError);
                  navigator.geolocation.clearWatch(id);
                  setWatchId(null);
                },
                {
                  enableHighAccuracy: true,
                  timeout: 60000, // 60 segundos para cada tentativa
                  maximumAge: 0 // Sempre buscar nova localização
                }
              );
              
              setWatchId(id);
              
              // Timeout de segurança para parar o watch após 2 minutos
              setTimeout(() => {
                if (id) {
                  console.log('⏰ Timeout do monitoramento contínuo');
                  navigator.geolocation.clearWatch(id);
                  setWatchId(null);
                  setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: prev.location ? null : 'Não foi possível obter uma localização precisa'
                  }));
                }
              }, 120000); // 2 minutos
            },
            fallbackOptions
          );
        },
        highAccuracyOptions
      );
    } catch (error) {
      console.error('❌ Erro inesperado na geolocalização:', error);
      handleError(error as GeolocationPositionError);
    }
  }, [updateLocation, handleError, watchId]);

  const clearWatch = useCallback(() => {
    if (watchId) {
      console.log('🛑 Parando monitoramento de localização');
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  const forceNewLocation = useCallback(() => {
    console.log('🔄 Forçando nova localização...');
    clearWatch();
    getCurrentLocation(true);
  }, [clearWatch, getCurrentLocation]);

  // Inicializar geolocalização automaticamente
  useEffect(() => {
    console.log('🚀 Inicializando geolocalização automática...');
    getCurrentLocation();
  }, []);

  // Auto-update a cada 10 minutos (reduzido de 5 para economizar bateria)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!state.isLoading && !watchId) {
        console.log('🔄 Atualização automática de localização...');
        getCurrentLocation();
      }
    }, 600000); // 10 minutos

    return () => clearInterval(interval);
  }, [getCurrentLocation, state.isLoading, watchId]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Limpando recursos de geolocalização...');
      clearWatch();
    };
  }, [clearWatch]);

  return {
    ...state,
    getCurrentLocation,
    forceNewLocation,
    clearWatch,
    isWatching: watchId !== null
  };
}