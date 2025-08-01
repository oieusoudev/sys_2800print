import { useState, useEffect, useCallback } from 'react';
import { BreakSession } from '@/types/api';
import { breakService } from '@/services/breakService';
import { toast } from 'sonner';
import { getCurrentDate } from '@/utils/timeCalculations';

interface BreakTimerState {
  isActive: boolean;
  isPaused: boolean;
  timeUsed: number; // tempo usado em segundos
  startTime: number | null;
  pausedTime: number; // tempo total pausado
  lastActiveTime: number | null;
}

const DAILY_BREAK_LIMIT = 30 * 60; // 30 minutos em segundos

export function useBreakTimer() {
  const [timer, setTimer] = useState<BreakTimerState>({
    isActive: false,
    isPaused: false,
    timeUsed: 0,
    startTime: null,
    pausedTime: 0,
    lastActiveTime: null
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load today's break session
  const loadTodaySession = useCallback(async () => {
    try {
      const session = await breakService.getTodayBreakSession();
      if (session) {
        // Calcular timeUsed baseado no total_time_used e estado atual
        let currentTimeUsed = session.total_time_used;
        
        // Se a sessão está ativa e não pausada, calcular tempo adicional desde lastActiveTime
        if (session.sessions_data.isActive && 
            !session.sessions_data.isPaused && 
            session.sessions_data.lastActiveTime) {
          const timeSinceLastActive = Math.floor((Date.now() - session.sessions_data.lastActiveTime) / 1000);
          currentTimeUsed += timeSinceLastActive;
        }
        
        setTimer({
          isActive: session.sessions_data.isActive || false,
          isPaused: session.sessions_data.isPaused || false,
          timeUsed: currentTimeUsed,
          startTime: session.sessions_data.startTime || null,
          pausedTime: session.sessions_data.pausedTime || 0,
          lastActiveTime: session.sessions_data.lastActiveTime || null
        });
      } else {
        // If no session for today, reset to initial state
        setTimer({
          isActive: false, 
          isPaused: false, 
          timeUsed: 0, 
          startTime: null, 
          pausedTime: 0, 
          lastActiveTime: null
        });
      }
    } catch (error) {
      console.error('Error loading break session:', error);
    }
  }, []);

  // Start/Resume timer (botão único)
  const toggleTimer = useCallback(async () => {
    setIsLoading(true);
    try {
      let session;
      
      if (!timer.isActive) {
        // Iniciar timer
        session = await breakService.startBreak();
        toast.success('⏱️ Intervalo iniciado!');
      } else if (timer.isPaused) {
        // Retomar timer
        session = await breakService.resumeBreak();
        toast.info('▶️ Intervalo retomado');
      } else {
        // Pausar timer
        session = await breakService.pauseBreak();
        toast.info('⏸️ Intervalo pausado');
      }
      
      // Atualizar estado local com dados do backend
      setTimer({
        isActive: session.sessions_data.isActive || false,
        isPaused: session.sessions_data.isPaused || false,
        timeUsed: session.total_time_used,
        startTime: session.sessions_data.startTime || null,
        pausedTime: session.sessions_data.pausedTime || 0,
        lastActiveTime: session.sessions_data.lastActiveTime || null
      });
      
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar estado do intervalo');
    } finally {
      setIsLoading(false);
    }
  }, [timer.isActive, timer.isPaused]);

  // Timer tick effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timer.isActive && !timer.isPaused) {
      interval = setInterval(() => {
        setTimer(prev => {
          const newTimeUsed = prev.timeUsed + 1;
          
          // Update backend every 30 seconds
          if (newTimeUsed % 30 === 0) {
            breakService.updateBreakSession(newTimeUsed, {
              isActive: prev.isActive,
              isPaused: prev.isPaused,
              startTime: prev.startTime,
              pausedTime: prev.pausedTime,
              lastActiveTime: Date.now()
            }).catch(console.error);
          }
          
          // Notifications
          if (newTimeUsed === DAILY_BREAK_LIMIT) {
            toast.warning('⏰ Seus 30 minutos de intervalo foram consumidos!');
          } else if (newTimeUsed > DAILY_BREAK_LIMIT) {
            const extraTime = newTimeUsed - DAILY_BREAK_LIMIT;
            if (extraTime % 300 === 0) { // A cada 5 minutos extras
              const minutesOver = Math.floor(extraTime / 60);
              toast.error(`⚠️ Você está ${minutesOver} minutos além do intervalo permitido!`);
            }
          }

          return {
            ...prev,
            timeUsed: newTimeUsed,
            lastActiveTime: Date.now()
          };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isActive, timer.isPaused]);

  // Load initial data
  useEffect(() => {
    loadTodaySession();
  }, [loadTodaySession]);

  // Daily reset logic
  useEffect(() => {
    const checkAndResetDaily = async () => {
      const currentDate = getCurrentDate();
      const lastLoadedDate = localStorage.getItem('lastLoadedBreakDate');

      if (lastLoadedDate !== currentDate) {
        console.log('New day detected, reloading break session...');
        localStorage.setItem('lastLoadedBreakDate', currentDate);
        await loadTodaySession();
      }
    };
    
    checkAndResetDaily();
    const interval = setInterval(checkAndResetDaily, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [loadTodaySession]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimeRemaining = (): number => {
    if (timer.timeUsed <= DAILY_BREAK_LIMIT) {
      return DAILY_BREAK_LIMIT - timer.timeUsed;
    }
    return 0;
  };

  const getTimerColor = (): string => {
    if (timer.timeUsed < DAILY_BREAK_LIMIT) {
      const remaining = getTimeRemaining();
      if (remaining > 300) return 'text-green-400';
      return 'text-yellow-400';
    } else if (timer.timeUsed === DAILY_BREAK_LIMIT) {
      return 'text-orange-400';
    }
    return 'text-red-400';
  };

  const getProgressPercentage = (): number => {
    const percentage = (timer.timeUsed / DAILY_BREAK_LIMIT) * 100;
    return Math.min(100, Math.max(0, percentage));
  };

  const getButtonText = (): string => {
    if (!timer.isActive) {
      return timer.timeUsed > 0 ? 'Continuar Intervalo' : 'Iniciar Intervalo';
    } else if (timer.isPaused) {
      return 'Retomar';
    } else {
      return 'Pausar';
    }
  };

  const getButtonColor = (): string => {
    if (!timer.isActive || timer.isPaused) {
      return 'bg-green-600 hover:bg-green-700';
    } else {
      return 'bg-yellow-600 hover:bg-yellow-700';
    }
  };

  return {
    timer,
    isLoading,
    toggleTimer,
    formatTime,
    getTimeRemaining,
    getTimerColor,
    getProgressPercentage,
    getButtonText,
    getButtonColor,
    refreshData: loadTodaySession
  };
}