import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PunchLocation } from '@/types/api';
import { getLocationNameCached, cleanTextForCSV } from '@/utils/locationService';
import { extractUserFromToken } from '@/lib/jwt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = extractUserFromToken(token);

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const userId = searchParams.get('user_id');

    // Verificar se usuário é admin para permitir exportar dados de outros usuários
    const { data: currentUser } = await supabase
      .from('users')
      .select('is_admin, full_name')
      .eq('id', decoded.userId)
      .single();

    let query = supabase
      .from('time_entries')
      .select(`
        *,
        users!inner(full_name, username),
        punch_locations (
          id,
          punch_type,
          latitude,
          longitude,
          accuracy,
          address,
          timestamp
        )
      `)
      .order('date', { ascending: false });

    // Filtrar por usuário (admin pode ver todos, usuário comum só os seus)
    if (userId && currentUser?.is_admin) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('user_id', decoded.userId);
    }

    // Filtros de data
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: timeEntries, error } = await query;

    if (error) {
      console.error('Fetch time entries error:', error);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    // Cabeçalho do CSV
    const csvHeaders = [
      'Data',
      'Nome do Funcionario',
      'Entrada',
      'Localizacao Entrada',
      'Intervalo',
      'Saida Almoco',
      'Localizacao Saida Almoco',
      'Volta Almoco',
      'Localizacao Volta Almoco',
      'Saida',
      'Localizacao Saida',
      'Total Horas',
      'Horas Extras',
      'Observacoes'
    ];

    // Processar dados e obter nomes dos locais
    const csvRows = [];
    
    for (const entry of timeEntries || []) {
      const user = entry.users;
      const locations = entry.punch_locations || [];
      
      // Buscar sessão de intervalo para esta data
      const { data: breakSession } = await supabase
        .from('break_sessions')
        .select('total_time_used')
        .eq('user_id', entry.user_id)
        .eq('date', entry.date)
        .single();
      
      // Calcular tempo de intervalo formatado
      const formatBreakTime = (totalTimeUsed: number): string => {
        const DAILY_BREAK_LIMIT_SECONDS = 30 * 60; // 30 minutos
        
        if (totalTimeUsed === 0) {
          return '00:00';
        }
        
        if (totalTimeUsed <= DAILY_BREAK_LIMIT_SECONDS) {
          // Dentro do limite - mostrar tempo usado
          const hours = Math.floor(totalTimeUsed / 3600);
          const minutes = Math.floor((totalTimeUsed % 3600) / 60);
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } else {
          // Excedeu o limite - mostrar excesso como negativo
          const excessSeconds = totalTimeUsed - DAILY_BREAK_LIMIT_SECONDS;
          const hours = Math.floor(excessSeconds / 3600);
          const minutes = Math.floor((excessSeconds % 3600) / 60);
          return `-${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      };
      
      const intervalTime = breakSession?.total_time_used 
        ? formatBreakTime(breakSession.total_time_used)
        : '00:00';

      // Obter localizações por tipo de ponto
      const getLocationByType = (type: string) => {
        return locations.find((loc: PunchLocation) => loc.punch_type === type);
      };

      const clockInLocation = getLocationByType('clock_in');
      const lunchOutLocation = getLocationByType('lunch_out');
      const lunchInLocation = getLocationByType('lunch_in');
      const clockOutLocation = getLocationByType('clock_out');

      // Obter nomes dos locais (com cache)
      const getLocationName = async (location: any) => {
        if (!location) return '';
        try {
          const name = await getLocationNameCached(location.latitude, location.longitude);
          return cleanTextForCSV(name);
        } catch {
          return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
        }
      };

      const clockInLocationName = clockInLocation ? await getLocationName(clockInLocation) : '';
      const lunchOutLocationName = lunchOutLocation ? await getLocationName(lunchOutLocation) : '';
      const lunchInLocationName = lunchInLocation ? await getLocationName(lunchInLocation) : '';
      const clockOutLocationName = clockOutLocation ? await getLocationName(clockOutLocation) : '';

      const row = [
        new Date(entry.date).toLocaleDateString('pt-PT'),
        cleanTextForCSV(user.full_name || user.username),
        entry.clock_in ? entry.clock_in.substring(0, 5) : '',
        clockInLocationName,
        intervalTime,
        entry.lunch_out ? entry.lunch_out.substring(0, 5) : '',
        lunchOutLocationName,
        entry.lunch_in ? entry.lunch_in.substring(0, 5) : '',
        lunchInLocationName,
        entry.clock_out ? entry.clock_out.substring(0, 5) : '',
        clockOutLocationName,
        entry.total_hours ? `${entry.total_hours.toFixed(2)}h` : '',
        entry.overtime_hours ? `${entry.overtime_hours.toFixed(2)}h` : '',
        cleanTextForCSV(entry.notes || '')
      ];

      csvRows.push(row);
    }

    // Gerar CSV
    const csvContent = [
      csvHeaders.join(';'),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    // Adicionar BOM para UTF-8 (para Excel reconhecer acentos)
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8; separator=;',
        'Content-Disposition': `attachment; filename="folha_ponto_${new Date().toISOString().slice(0, 7)}.csv"`
      }
    });

  } catch (error) {
    console.error('Export CSV error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}