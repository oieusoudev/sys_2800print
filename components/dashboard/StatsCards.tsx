'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar, Zap, Euro } from 'lucide-react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { timeEntryService } from '@/services/timeEntryService';
import { MonthlyStats } from '@/types/api';
import { useState, useEffect, useCallback } from 'react';

export function StatsCards() {
  const { refreshData: refreshTimeEntries } = useTimeEntries();
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    total_hours: 0,
    regular_hours: 0,
    overtime_hours: 0,
    overtime_pay: 0,
    working_days: 0,
    break_time_used: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchMonthlyStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const stats = await timeEntryService.getMonthlyStats();
      setMonthlyStats(stats);
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Stats fetched from backend:', stats);
      }
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      setMonthlyStats({
        total_hours: 0, 
        regular_hours: 0, 
        overtime_hours: 0, 
        overtime_pay: 0, 
        working_days: 0, 
        break_time_used: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Atualizar estatísticas em tempo real
  useEffect(() => {
    fetchMonthlyStats();
  }, [fetchMonthlyStats, refreshTimeEntries]);

  const currentMonth = new Date().toLocaleDateString('pt-PT', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">
            Horas Totais
          </CardTitle>
          <Clock className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white"> 
            {monthlyStats.total_hours.toFixed(1)}h
          </div>
          <p className="text-xs text-slate-500" title={`${monthlyStats.regular_hours.toFixed(1)}h regulares`}>
            {monthlyStats.working_days} dias • 8.5h/dia padrão
          </p>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">
            Histórico
          </CardTitle>
          <Calendar className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            {currentMonth}
          </div>
          <p className="text-xs text-slate-500">
            Mês atual
          </p>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">
            Horas Extras
          </CardTitle>
          <Zap className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-400"> 
            {monthlyStats.overtime_hours.toFixed(1)}h
          </div>
          <p className="text-xs text-slate-500" title="Horas além das 8.5h diárias padrão">
            Além das 8.5h diárias (após 21:00)
          </p>
        </CardContent>
      </Card>

      {/* Debug info - só em desenvolvimento */} 
      {process.env.NODE_ENV === 'development' && monthlyStats && (
        <div className="col-span-full bg-slate-700 rounded-lg p-3 text-xs text-slate-300">
          <strong>Debug Info:</strong> Total: {monthlyStats.total_hours.toFixed(2)}h | Regular: {monthlyStats.regular_hours.toFixed(2)}h | 
          Extra: {monthlyStats.overtime_hours.toFixed(2)}h | Pagamento: €{monthlyStats.overtime_pay.toFixed(2)} | Dias: {monthlyStats.working_days}
        </div>
      )}
    </div>
  );
}