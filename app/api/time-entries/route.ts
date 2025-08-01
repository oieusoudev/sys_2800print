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
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const userId = searchParams.get('user_id');

    let query = supabase
      .from('time_entries')
      .select(`
        *,
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
    if (userId && decoded.isAdmin) {
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

    return NextResponse.json({
      success: true,
      data: timeEntries || []
    });

  } catch (error) {
    console.error('Get time entries error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}