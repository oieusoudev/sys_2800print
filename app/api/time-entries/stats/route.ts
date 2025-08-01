import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const userId = searchParams.get('user_id');

    // Verificar se usuário é admin para permitir ver stats de outros usuários
    const { data: currentUser } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', decoded.userId)
      .single();

    const targetUserId = (userId && currentUser?.is_admin) ? userId : decoded.userId;

    // Usar função do banco para calcular estatísticas
    const { data: stats, error } = await supabase
      .rpc('get_monthly_stats', {
        p_user_id: targetUserId,
        p_year: year,
        p_month: month
      });

    if (error) {
      console.error('Get monthly stats error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to get statistics' },
        { status: 500 }
      );
    }

    // Formatar resposta
    const monthlyStats = stats?.[0] || {
      total_hours: 0,
      regular_hours: 0,
      overtime_hours: 0,
      overtime_pay: 0,
      working_days: 0,
      break_time_used: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        total_hours: parseFloat(monthlyStats.total_hours) || 0,
        regular_hours: parseFloat(monthlyStats.regular_hours) || 0,
        overtime_hours: parseFloat(monthlyStats.overtime_hours) || 0,
        overtime_pay: parseFloat(monthlyStats.overtime_pay) || 0,
        working_days: parseInt(monthlyStats.working_days) || 0,
        break_time_used: parseInt(monthlyStats.break_time_used) || 0
      }
    });

  } catch (error) {
    console.error('Get monthly stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}