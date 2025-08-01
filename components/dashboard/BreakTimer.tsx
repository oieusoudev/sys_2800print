'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coffee, Play, Pause, Clock } from 'lucide-react';
import { useBreakTimer } from '@/hooks/useBreakTimer';

const DAILY_BREAK_LIMIT = 30 * 60; // 30 minutos em segundos (constant for display)

export function BreakTimer() {
  const {
    timer,
    isLoading,
    toggleTimer,
    formatTime,
    getTimeRemaining,
    getTimerColor,
    getProgressPercentage,
    getButtonText,
    getButtonColor,
    refreshData
  } = useBreakTimer();

  const timeRemaining = getTimeRemaining();
  const isTimeUp = timer.timeUsed > DAILY_BREAK_LIMIT;
  const isExactLimit = timer.timeUsed === DAILY_BREAK_LIMIT;
  const excessTime = timer.timeUsed > DAILY_BREAK_LIMIT ? timer.timeUsed - DAILY_BREAK_LIMIT : 0;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">
          Intervalo Diário (30min)
        </CardTitle>
        <Coffee className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className={`text-4xl font-mono font-bold ${getTimerColor()}`}>
            {isTimeUp ? 
              `-${formatTime(excessTime)}` : 
              formatTime(timeRemaining)
            }
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isTimeUp ? 'Tempo excedido' : 
             isExactLimit ? 'Tempo esgotado' : 
             'Tempo restante hoje'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-1000 ${
              isTimeUp ? 'bg-red-500' : 
              isExactLimit ? 'bg-orange-500' :
              timeRemaining <= 300 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>

        {/* Status */}
        <div className="text-center">
          {timer.isActive && (
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                timer.isPaused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'
              }`} />
              <span className="text-xs text-slate-400">
                {timer.isPaused ? 'Pausado' : 'Em andamento'}
              </span>
            </div>
          )}
        </div>

        {/* Botão Único */}
        <div className="flex space-x-2">
          <Button
            onClick={toggleTimer}
            className={`flex-1 text-white ${getButtonColor()}`}
            disabled={isLoading}
          >
            {timer.isPaused ? (
              <Play className="h-4 w-4 mr-2" />
            ) : timer.isActive ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {getButtonText()}
          </Button>
        </div>

        {/* Info */}
        <div className="bg-slate-700 rounded-lg p-3 space-y-2">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            <span>Intervalo diário: 30 minutos</span>
          </div>
          
          <div className="text-xs text-slate-300">
            <div>Tempo usado hoje: {formatTime(timer.timeUsed)}</div>
            {isExactLimit && (
              <div className="text-orange-400">⚠️ Limite de 30 minutos atingido</div>
            )}
            {isTimeUp && (
              <div className="text-red-400">⚠️ Excedeu em {formatTime(excessTime)}</div>
            )}
            {timer.pausedTime > 0 && (
              <div className="text-slate-500">
                Tempo pausado: {formatTime(Math.floor(timer.pausedTime / 1000))}
              </div>
            )}
          </div>
          
          {timer.startTime && (
            <div className="text-xs text-slate-500"> 
              Primeiro uso hoje: {new Date(timer.startTime).toLocaleTimeString()}
            </div>
          )}
          
          <div className="text-xs text-slate-500">
            🌅 Reseta automaticamente a cada novo dia
          </div>
        </div>
      </CardContent>
    </Card>
  );
}