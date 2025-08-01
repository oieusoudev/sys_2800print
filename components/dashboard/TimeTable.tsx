'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, History, MapPin } from 'lucide-react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { calculateHours, formatTime } from '@/utils/timeCalculations';
import { LocationModal } from './LocationModal';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { timeEntryService } from '@/services/timeEntryService';
import { breakService } from '@/services/breakService';
import { TimeEntry } from '@/types/api';

export function TimeTable() {
  const { entries: hookEntries, refreshData } = useTimeEntries();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [dailyBreakTimes, setDailyBreakTimes] = useState<Record<string, number>>({});
  const [isLoadingBreakTimes, setIsLoadingBreakTimes] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    location: any;
    punchType: string;
    punchTime: string;
    date: string;
  } | null>(null);

  // Atualizar entradas quando o hook atualizar
  useEffect(() => {
    const loadEntries = async () => {
      try {
        const currentMonthEntries = await timeEntryService.getCurrentMonthEntries();
        setEntries(currentMonthEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (error) {
        console.error('Error loading entries:', error);
        setEntries([]);
      }
    };

    loadEntries();
  }, [hookEntries, refreshData]);

  // Buscar tempos de intervalo para todas as entradas
  useEffect(() => {
    const loadBreakTimes = async () => {
      if (entries.length === 0) return;
      
      setIsLoadingBreakTimes(true);
      const newBreakTimes: Record<string, number> = { ...dailyBreakTimes };
      
      // Buscar apenas para datas que ainda não temos dados
      const datesToFetch = entries
        .map(entry => entry.date)
        .filter(date => !(date in newBreakTimes));
      
      // Remover duplicatas
      const uniqueDates = [...new Set(datesToFetch)];
      
      for (const date of uniqueDates) {
        try {
          const breakSession = await breakService.getBreakSessionByDate(date);
          newBreakTimes[date] = breakSession?.total_time_used || 0;
        } catch (error) {
          console.error(`Error fetching break time for ${date}:`, error);
          newBreakTimes[date] = 0;
        }
      }
      
      setDailyBreakTimes(newBreakTimes);
      setIsLoadingBreakTimes(false);
    };
    
    loadBreakTimes();
  }, [entries]);

  // Função para obter tempo de intervalo diário formatado
  const getDailyBreakTime = (date: string): string => {
    const totalSeconds = dailyBreakTimes[date];
    
    if (totalSeconds === undefined) {
      return isLoadingBreakTimes ? '...' : '00:00';
    }
    
    if (totalSeconds === 0) {
      return '00:00';
    }
    
    // Limite diário de intervalo: 30 minutos = 1800 segundos
    const DAILY_BREAK_LIMIT_SECONDS = 30 * 60;
    
    // Calcular diferença em relação ao limite
    // Se totalSeconds > limite, mostrar como negativo (excesso)
    // Se totalSeconds <= limite, mostrar como positivo (tempo restante ou usado)
    const differenceSeconds = DAILY_BREAK_LIMIT_SECONDS - totalSeconds;
    
    const isNegative = differenceSeconds < 0; // Excedeu o limite
    const absoluteSeconds = Math.abs(differenceSeconds);
    const hours = Math.floor(absoluteSeconds / 3600);
    const minutes = Math.floor((absoluteSeconds % 3600) / 60);
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    if (isNegative) {
      // Excedeu o limite - mostrar como negativo (tempo em excesso)
      return `-${timeString}`;
    } else if (totalSeconds === 0) {
      // Não usou intervalo
      return '00:00';
    } else {
      // Dentro do limite - mostrar tempo usado
      const usedHours = Math.floor(totalSeconds / 3600);
      const usedMinutes = Math.floor((totalSeconds % 3600) / 60);
      return `${usedHours.toString().padStart(2, '0')}:${usedMinutes.toString().padStart(2, '0')}`;
    }
  };

  const exportToCSV = async () => {
    if (entries.length === 0) {
      toast.error('Nenhum registro para exportar');
      return;
    }

    setIsExporting(true);
    toast.info('Preparando exportação... Isso pode levar alguns segundos.');

    try {
      const csvBlob = await timeEntryService.exportToCSV();

      const link = document.createElement('a');
      const url = URL.createObjectURL(csvBlob);
      link.setAttribute('href', url);
      
      const currentMonth = new Date().toISOString().slice(0, 7);
      const userData = localStorage.getItem('current_user');
      const user = userData ? JSON.parse(userData) : null;
      const userName = user?.full_name?.replace(/\s+/g, '_') || user?.username || 'Funcionario';
      const fileName = `folha_ponto_${userName}_${currentMonth}.csv`;
      link.setAttribute('download', fileName);
      
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Erro na exportação:', error);
      toast.error('Erro ao exportar relatório. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const LocationButton = ({ 
    location, 
    label, 
    punchType, 
    punchTime, 
    date 
  }: { 
    location: any; 
    label: string; 
    punchType: string; 
    punchTime: string; 
    date: string; 
  }) => {
    if (!location) return <span className="text-slate-500">-</span>;
    
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedLocation({
        location,
        punchType,
        punchTime,
        date
      });
    };
    
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center justify-center w-8 h-8 p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
        title={`Ver detalhes da localização do ${label}`}
        type="button"
      >
        <MapPin className="h-4 w-4" />
      </button>
    );
  };
  
  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center">
            <History className="mr-2 h-5 w-5" />
            Histórico do Mês
          </CardTitle>
          <Button
            onClick={exportToCSV}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            disabled={entries.length === 0 || isExporting}
          >
            <Download className={`mr-2 h-4 w-4 ${isExporting ? 'animate-spin' : ''}`} />
            {isExporting ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Data</TableHead>
                  <TableHead className="text-slate-300">Entrada</TableHead>
                  <TableHead className="text-slate-300">Local</TableHead>
                  <TableHead className="text-slate-300">Intervalo</TableHead>
                  <TableHead className="text-slate-300">Saída Almoço</TableHead>
                  <TableHead className="text-slate-300">Local</TableHead>
                  <TableHead className="text-slate-300">Volta Almoço</TableHead>
                  <TableHead className="text-slate-300">Local</TableHead>
                  <TableHead className="text-slate-300">Saída</TableHead>
                  <TableHead className="text-slate-300">Local</TableHead>
                  <TableHead className="text-slate-300">Total</TableHead>
                  <TableHead className="text-slate-300">Extras</TableHead>
                  <TableHead className="text-slate-300">Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center text-slate-400 py-8">
                      Nenhum registro encontrado para este mês
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => {
                    const { totalHours, overtimeHours } = calculateHours(entry);
                    const dailyBreakTime = getDailyBreakTime(entry.date);
                    const isBreakNegative = dailyBreakTime.includes('-');
                    const isBreakZero = dailyBreakTime === '00:00';
                    
                    return (
                      <TableRow key={entry.id} className="border-slate-700">
                        <TableCell className="text-slate-300">
                          {new Date(entry.date).toLocaleDateString('pt-PT')}
                        </TableCell>
                        <TableCell className="text-green-400">
                          {entry.clock_in ? formatTime(entry.clock_in) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <LocationButton 
                            location={entry.punch_locations?.find(p => p.punch_type === 'clock_in')}
                            label="entrada"
                            punchType="clock_in"
                            punchTime={entry.clock_in ? formatTime(entry.clock_in) : ''}
                            date={entry.date}
                          />
                        </TableCell>
                        <TableCell className={
                          isBreakNegative ? 'text-red-400' : 
                          isBreakZero ? 'text-slate-400' : 
                          'text-green-400'
                        }>
                          {dailyBreakTime}
                        </TableCell>
                        <TableCell className="text-yellow-400">
                          {entry.lunch_out ? formatTime(entry.lunch_out) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <LocationButton 
                            location={entry.punch_locations?.find(p => p.punch_type === 'lunch_out')}
                            label="saída almoço"
                            punchType="lunch_out"
                            punchTime={entry.lunch_out ? formatTime(entry.lunch_out) : ''}
                            date={entry.date}
                          />
                        </TableCell>
                        <TableCell className="text-blue-400">
                          {entry.lunch_in ? formatTime(entry.lunch_in) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <LocationButton 
                            location={entry.punch_locations?.find(p => p.punch_type === 'lunch_in')}
                            label="volta almoço"
                            punchType="lunch_in"
                            punchTime={entry.lunch_in ? formatTime(entry.lunch_in) : ''}
                            date={entry.date}
                          />
                        </TableCell>
                        <TableCell className="text-red-400">
                          {entry.clock_out ? formatTime(entry.clock_out) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <LocationButton 
                            location={entry.punch_locations?.find(p => p.punch_type === 'clock_out')}
                            label="saída"
                            punchType="clock_out"
                            punchTime={entry.clock_out ? formatTime(entry.clock_out) : ''}
                            date={entry.date}
                          />
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {entry.total_hours !== undefined && entry.total_hours !== null ? `${entry.total_hours.toFixed(2)}h` : '-'}
                        </TableCell>
                        <TableCell className="text-yellow-400">
                          {entry.overtime_hours !== undefined && entry.overtime_hours !== null ? `${entry.overtime_hours.toFixed(2)}h` : '-'}
                        </TableCell>
                        <TableCell className="text-slate-400 max-w-32 truncate" title={entry.notes}>
                          {entry.notes || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Modal de Localização */}
      <LocationModal
        isOpen={!!selectedLocation}
        onClose={() => setSelectedLocation(null)}
        location={selectedLocation?.location || null}
        punchType={selectedLocation?.punchType || ''}
        punchTime={selectedLocation?.punchTime || ''}
        date={selectedLocation?.date || ''}
      />
    </>
  );
}