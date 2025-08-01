import { TimeEntry } from '@/types';

export function calculateHours(entry: TimeEntry): {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
} {
  // PRIORIDADE 1: Usar valores já calculados no banco de dados
  // Isso garante consistência total com os cálculos do backend
  if (entry.total_hours !== undefined && entry.total_hours !== null &&
      entry.regular_hours !== undefined && entry.regular_hours !== null &&
      entry.overtime_hours !== undefined && entry.overtime_hours !== null) {
    return {
      totalHours: parseFloat(entry.total_hours.toFixed(2)),
      regularHours: parseFloat(entry.regular_hours.toFixed(2)),
      overtimeHours: parseFloat(entry.overtime_hours.toFixed(2))
    };
  }

  // FALLBACK: Calcular no frontend se os dados do DB não estiverem disponíveis
  // Isso mantém a funcionalidade para casos onde o trigger do DB não foi executado
  if (!entry.clock_in || !entry.clock_out) {
    return { totalHours: 0, regularHours: 0, overtimeHours: 0 };
  }

  // Helper para converter HH:MM:SS para minutos a partir da meia-noite
  const timeToMinutes = (timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    return parts[0] * 60 + parts[1] + (parts[2] / 60 || 0);
  };

  // Helper para calcular sobreposição em minutos
  const getOvertimeOverlapMinutes = (
    workStart: number, workEnd: number,
    otWindowStart: number, otWindowEnd: number
  ): number => {
    const overlapStart = Math.max(workStart, otWindowStart);
    const overlapEnd = Math.min(workEnd, otWindowEnd);
    return Math.max(0, overlapEnd - overlapStart);
  };

  const entryDate = new Date(entry.date);
  const dayOfWeek = entryDate.getDay(); // 0 = Domingo, 6 = Sábado

  // Converter horários para minutos
  const clockInMinutes = timeToMinutes(entry.clock_in);
  let clockOutMinutes = timeToMinutes(entry.clock_out);
  if (clockOutMinutes < clockInMinutes) {
    clockOutMinutes += 24 * 60;
  }

  // Calcular duração do almoço
  let lunchDurationMinutes = 0;
  const MANDATORY_LUNCH_MINUTES = 90;

  if (entry.lunch_out && entry.lunch_in) {
    let lunchOutMinutes = timeToMinutes(entry.lunch_out);
    let lunchInMinutes = timeToMinutes(entry.lunch_in);
    if (lunchInMinutes < lunchOutMinutes) {
      lunchInMinutes += 24 * 60;
    }
    lunchDurationMinutes = lunchInMinutes - lunchOutMinutes;
  } else {
    lunchDurationMinutes = MANDATORY_LUNCH_MINUTES;
  }
  lunchDurationMinutes = Math.max(0, lunchDurationMinutes);

  // Calcular total de minutos trabalhados
  let totalWorkMinutes = (clockOutMinutes - clockInMinutes) - lunchDurationMinutes;
  totalWorkMinutes = Math.max(0, totalWorkMinutes);

  const totalHours = totalWorkMinutes / 60;
  let regularHours = 0;
  let overtimeHours = 0;

  // Sábado e Domingo: todas as horas são extras
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    overtimeHours = totalHours;
    regularHours = 0;
  } else {
    // Dia de semana: horas extras das 21:00 às 05:00
    const OVERTIME_WINDOW_START = timeToMinutes('21:00:00');
    const OVERTIME_WINDOW_END = timeToMinutes('05:00:00') + 24 * 60;

    // Calcular horas extras brutas
    let grossOvertimeMinutes = 0;
    grossOvertimeMinutes += getOvertimeOverlapMinutes(clockInMinutes, clockOutMinutes, OVERTIME_WINDOW_START, OVERTIME_WINDOW_END);

    // Descontar almoço que caiu na janela de hora extra
    let lunchOverlapWithOvertime = 0;
    if (entry.lunch_out && entry.lunch_in) {
      let lunchOutMinutes = timeToMinutes(entry.lunch_out);
      let lunchInMinutes = timeToMinutes(entry.lunch_in);
      if (lunchInMinutes < lunchOutMinutes) {
        lunchInMinutes += 24 * 60;
      }
      lunchOverlapWithOvertime = getOvertimeOverlapMinutes(lunchOutMinutes, lunchInMinutes, OVERTIME_WINDOW_START, OVERTIME_WINDOW_END);
    }

    const overtimeMinutes = grossOvertimeMinutes - lunchOverlapWithOvertime;
    const finalOvertimeMinutes = Math.max(0, overtimeMinutes);

    overtimeHours = finalOvertimeMinutes / 60;
    regularHours = totalHours - overtimeHours;
  }

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100
  };
}

export function calculateMonthlyStats(entries: TimeEntry[]) {
  let totalHours = 0;
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let validEntries = 0;

  entries.forEach(entry => {
    // Priorizar dados do banco de dados se disponíveis
    if (entry.total_hours !== undefined && entry.total_hours !== null &&
        entry.regular_hours !== undefined && entry.regular_hours !== null &&
        entry.overtime_hours !== undefined && entry.overtime_hours !== null) {
      // Usar valores já calculados no DB
      totalHours += entry.total_hours;
      totalRegularHours += entry.regular_hours;
      totalOvertimeHours += entry.overtime_hours;
      validEntries++;
    } else if (entry.clock_in && entry.clock_out) {
      // Fallback: calcular no frontend
      const { totalHours: entryTotal, regularHours, overtimeHours } = calculateHours(entry);
      
      if (!isNaN(entryTotal) && entryTotal >= 0) {
        totalHours += entryTotal;
        totalRegularHours += regularHours;
        totalOvertimeHours += overtimeHours;
        validEntries++;
      }
    }
  });

  // Calcular pagamento de horas extras (€7 por hora)
  const overtimePay = totalOvertimeHours * 7;

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalRegularHours: Math.round(totalRegularHours * 100) / 100,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    workingDays: validEntries
  };
}

// Função auxiliar para verificar se uma entrada tem dados calculados do DB
export function hasCalculatedHours(entry: TimeEntry): boolean {
  return entry.total_hours !== undefined && entry.total_hours !== null &&
         entry.regular_hours !== undefined && entry.regular_hours !== null &&
         entry.overtime_hours !== undefined && entry.overtime_hours !== null;
}

// Função para forçar recálculo (útil para debugging)
export function forceRecalculateHours(entry: TimeEntry): {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
} {
  // Criar uma cópia da entrada sem os valores calculados para forçar o recálculo
  const entryWithoutCalculated = {
    ...entry,
    total_hours: undefined,
    regular_hours: undefined,
    overtime_hours: undefined
  };
  
  return calculateHours(entryWithoutCalculated);
}

// Função para comparar cálculos do DB vs Frontend (útil para debugging)
export function compareCalculations(entry: TimeEntry): {
  database: { totalHours: number; regularHours: number; overtimeHours: number } | null;
  frontend: { totalHours: number; regularHours: number; overtimeHours: number };
  isConsistent: boolean;
} {
  const database = hasCalculatedHours(entry) ? {
    totalHours: entry.total_hours!,
    regularHours: entry.regular_hours!,
    overtimeHours: entry.overtime_hours!
  } : null;
  
  const frontend = forceRecalculateHours(entry);
  
  const isConsistent = database ? (
    Math.abs(database.totalHours - frontend.totalHours) < 0.01 &&
    Math.abs(database.regularHours - frontend.regularHours) < 0.01 &&
    Math.abs(database.overtimeHours - frontend.overtimeHours) < 0.01
  ) : true;
  
  return { database, frontend, isConsistent };
}

export function formatTime(time: string): string {
  return time.substring(0, 5);
}

export function getCurrentTime(): string {
  return new Date().toTimeString().substring(0, 5);
}

export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function calculateLunchBreakTime(entry: TimeEntry): number {
  if (!entry.lunch_out || !entry.lunch_in) {
    return 0;
  }

  const lunchOutTime = entry.lunch_out.length === 5 ? `${entry.lunch_out}:00` : entry.lunch_out;
  const lunchInTime = entry.lunch_in.length === 5 ? `${entry.lunch_in}:00` : entry.lunch_in;
  
  const lunchOut = new Date(`${entry.date}T${lunchOutTime}`);
  const lunchIn = new Date(`${entry.date}T${lunchInTime}`);
  
  if (isNaN(lunchOut.getTime()) || isNaN(lunchIn.getTime())) {
    return 0;
  }
  
  let breakMinutes = (lunchIn.getTime() - lunchOut.getTime()) / (1000 * 60);
  
  // Se lunchIn for menor que lunchOut, assumir que passou da meia-noite
  if (breakMinutes < 0) {
    breakMinutes += 24 * 60;
  }
  
  // Retornar em horas
  return Math.round((breakMinutes / 60) * 100) / 100;
}