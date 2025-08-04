'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Coffee, LogOut, LogIn, AlertCircle, Lock, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getCurrentTime, getCurrentDate, formatTime } from '@/utils/timeCalculations';
import { PunchType } from '@/types';
import { timeEntryService } from '@/services/timeEntryService';
import { useAuth } from '@/hooks/useAuth';

const PUNCH_ACTIONS = [
  { type: 'clock_in' as PunchType, label: 'Entrada', color: 'bg-green-600 hover:bg-green-700', icon: LogIn },
  { type: 'lunch_out' as PunchType, label: 'Saída Almoço', color: 'bg-yellow-600 hover:bg-yellow-700', icon: Coffee },
  { type: 'lunch_in' as PunchType, label: 'Volta Almoço', color: 'bg-blue-600 hover:bg-blue-700', icon: Coffee },
  { type: 'clock_out' as PunchType, label: 'Saída', color: 'bg-red-600 hover:bg-red-700', icon: LogOut }
];

export function PunchCard() {
  const { todayEntry, refreshData: refreshTimeEntries } = useTimeEntries();
  const { location } = useGeolocation();
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingNotes, setIsSendingNotes] = useState(false);

  // Atualizar entrada do dia em tempo real
  useEffect(() => {
    if (todayEntry?.notes) {
      setNotes(todayEntry.notes);
    } else {
      setNotes('');
    }
  }, [todayEntry]);

  // Verificar se é um novo dia e resetar se necessário
  useEffect(() => {
    const checkNewDay = () => {
      const currentDate = getCurrentDate();
      const storedDate = localStorage.getItem('lastPunchDate');
      
      if (storedDate && storedDate !== currentDate) {
        localStorage.setItem('lastPunchDate', currentDate);
        toast.info('🌅 Novo dia! Você pode registrar novos pontos.');
      } else if (!storedDate) {
        localStorage.setItem('lastPunchDate', currentDate);
      }
    };

    checkNewDay();
    const interval = setInterval(checkNewDay, 60000);
    return () => clearInterval(interval);
  }, []);

  const handlePunch = async (type: PunchType) => {
    // Verificar se o ponto já foi batido
    if (todayEntry?.[type]) {
      toast.error(`${PUNCH_ACTIONS.find(a => a.type === type)?.label} já foi registrada hoje!`);
      return;
    }

    // Verificar se há localização disponível - AJUSTADO PARA 200M
    if (!location) {
      toast.error('Localização não disponível. Aguarde ou tente forçar nova localização.');
      return;
    }

    // Permitir ponto até 200m de precisão
    if (location.accuracy > 200) {
      toast.error(`Localização muito imprecisa (${location.accuracy.toFixed(0)}m). Tente obter uma localização mais precisa.`);
      return;
    }

    // Avisar se a precisão não é ideal, mas permitir
    if (location.accuracy > 50) {
      toast.warning(`Localização com precisão de ${location.accuracy.toFixed(0)}m. Ponto registrado.`);
    }

    setIsProcessing(true);

    try {
      const punchData = {
        punch_type: type,
        location: {
          latitude: location.lat,
          longitude: location.lng,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
        },
        notes: todayEntry?.notes || notes.trim() || undefined,
        punch_time_client: getCurrentTime(), // Enviar hora local do cliente
      };
      
      await timeEntryService.punchClock(punchData);
      
      const actionLabel = PUNCH_ACTIONS.find(a => a.type === type)?.label;
      toast.success(`${actionLabel} registrada às ${formatTime(getCurrentTime())}`);
      refreshTimeEntries();
    } catch (error: any) {
      console.error('Erro ao registrar ponto:', error);
      toast.error(error.message || 'Erro ao registrar ponto');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendNotes = async () => {
    if (!notes.trim()) {
      toast.error('Digite uma observação antes de enviar');
      return;
    }

    if (todayEntry?.notes) {
      toast.error('Já existe uma observação para hoje. Apenas uma observação por dia é permitida.');
      return;
    }
    
    setIsSendingNotes(true);

    try {
      await timeEntryService.addNotes(notes.trim());
      toast.success('📝 Observação adicionada com sucesso!');
      setNotes(notes.trim());
      refreshTimeEntries();
    } catch (error: any) {
      console.error('Erro ao salvar observação:', error);
      toast.error(error.message || 'Erro ao salvar observação');
    } finally {
      setIsSendingNotes(false);
    }
  };

  const canSendNotes = () => {
    return !todayEntry?.notes;
  };

  const getNextAction = (): PunchType | null => {
    if (!todayEntry?.clock_in) return 'clock_in';
    if (!todayEntry?.lunch_out) return 'lunch_out';
    if (!todayEntry?.lunch_in) return 'lunch_in';
    if (!todayEntry?.clock_out) return 'clock_out';
    return null;
  };

  const nextAction = getNextAction();
  const isLocationReady = location !== null && location.accuracy <= 200; // AJUSTADO PARA 200M

  // Se o usuário é admin, não mostrar o componente de ponto
  if (user?.is_admin) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Registrar Ponto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-blue-300 font-medium mb-2">Administrador</h3>
            <p className="text-blue-200 text-sm">
              Usuários administradores não registram ponto.
            </p>
            <p className="text-blue-300 text-xs mt-2">
              Acesse o painel de administração para gerenciar funcionários.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Registrar Ponto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isLocationReady && (
          <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {!location ? 'Aguardando localização' : 'Localização imprecisa'}
              </span>
            </div>
            <p className="text-xs text-yellow-300 mt-1">
              {!location 
                ? 'A localização é necessária para registrar o ponto'
                : `Precisão atual: ${location.accuracy.toFixed(0)}m (máximo: 200m)`
              }
            </p>
          </div>
        )}

        {/* Seção de Observações */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-slate-300 flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            Observação do Dia {todayEntry?.notes ? '(Já enviada)' : ''}
          </Label>
          <div className="flex space-x-2">
            <Input
              id="notes"
              placeholder={todayEntry?.notes ? "Observação já enviada hoje" : "Adicione uma observação..."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-slate-700 border-slate-600 text-slate-100 flex-1"
              disabled={!canSendNotes() || isSendingNotes || !!todayEntry?.notes}
            />
            <Button
              onClick={handleSendNotes}
              disabled={!notes.trim() || isSendingNotes || !canSendNotes() || !!todayEntry?.notes}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 px-3"
            >
              {isSendingNotes ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          {todayEntry?.notes && (
            <p className="text-xs text-green-400">
              ✅ Observação já enviada hoje (uma por dia)
            </p>
          )}
          {todayEntry?.notes && (
            <div className="bg-slate-700 rounded-lg p-2">
              <p className="text-xs text-slate-400">Observação atual:</p>
              <p className="text-sm text-slate-200">{todayEntry.notes}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PUNCH_ACTIONS.map((action) => {
            const Icon = action.icon;
            const isCompleted = todayEntry?.[action.type];
            const isNext = action.type === nextAction;
            const isDisabled = !isLocationReady || isProcessing || isCompleted || (!isNext && !isCompleted);

            return (
              <Button
                key={action.type}
                onClick={() => handlePunch(action.type)}
                disabled={isDisabled}
                className={`${
                  isCompleted 
                    ? 'bg-slate-600 hover:bg-slate-600 cursor-not-allowed' 
                    : action.color
                } text-white relative ${
                  isNext && !isCompleted ? 'ring-2 ring-yellow-400' : ''
                }`}
              >
                {isCompleted ? (
                  <Lock className="mr-2 h-4 w-4" />
                ) : (
                  <Icon className="mr-2 h-4 w-4" />
                )}
                {action.label}
                {isCompleted && (
                  <span className="ml-2">✓</span>
                )}
              </Button>
            );
          })}
        </div>

        {todayEntry && (
          <div className="bg-slate-700 rounded-lg p-3 space-y-2">
            <h4 className="text-sm font-medium text-slate-300">Registros de Hoje:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {todayEntry.clock_in && (
                <div>
                  <span className="text-slate-400">Entrada:</span>
                  <span className="text-green-400 ml-1">{formatTime(todayEntry.clock_in)}</span>
                </div>
              )}
              {todayEntry.lunch_out && (
                <div>
                  <span className="text-slate-400">Saída Almoço:</span>
                  <span className="text-yellow-400 ml-1">{formatTime(todayEntry.lunch_out)}</span>
                </div>
              )}
              {todayEntry.lunch_in && (
                <div>
                  <span className="text-slate-400">Volta Almoço:</span>
                  <span className="text-blue-400 ml-1">{formatTime(todayEntry.lunch_in)}</span>
                </div>
              )}
              {todayEntry.clock_out && (
                <div>
                  <span className="text-slate-400">Saída:</span>
                  <span className="text-red-400 ml-1">{formatTime(todayEntry.clock_out)}</span>
                </div>
              )}
            </div>
            {todayEntry.notes && (
              <div>
                <span className="text-slate-400 text-xs">Observações:</span>
                <p className="text-slate-300 text-xs mt-1">{todayEntry.notes}</p>
              </div>
            )}
            <div className="text-xs text-slate-500 mt-2">
              📅 {new Date(todayEntry.date).toLocaleDateString('pt-PT')} • Padrão: 9:30-19:30 (1:30 almoço)
            </div>
          </div>
        )}

        {/* Informação sobre localização */}
        <div className="bg-slate-700 rounded-lg p-2">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Clock className="h-3 w-3" /> 
            <span>Precisão máxima aceita: 200 metros</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}